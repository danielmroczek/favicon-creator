// Canonical favicon string builder — the SINGLE seam between the UI state and
// the canonical favicon format (danielmroczek.github.io/docs/favicon-format.md).
//
// The same string this module returns is used for the live preview AND the
// download, so the two can never drift apart. Keeping it isolated (pure
// function, no Alpine, no DOM) also makes either pairing swappable later.
//
// Emitted structure contract:
//   <svg ... width="32" height="32" viewBox="0 0 32 32">
//     <linearGradient id="gradient">...          (always present)
//     <rect ... fill="url(#gradient)"/>          (full-screen background)
//     <path id="icon" .../>                      (merged stroke subpaths — one path)
//     <path .../> <path .../>                    (filled shapes, unmerged, unmarked)
//   </svg>
(function () {
  'use strict';

  // Matrix helpers come from lib/path-lib.js (loaded first in index.html).
  // Keep ONE implementation of affine math — a second copy here would let the
  // two modules drift.
  const pathLib = (typeof window !== 'undefined' && window.faviconPathLib) || null;
  if (!pathLib) {
    console.warn('faviconPathLib not loaded — lib/path-lib.js must be included before lib/favicon.js.');
  }
  const compose = (outer, inner) =>
    pathLib ? pathLib.compose(outer, inner) : inner;
  const composeAll = (list) => list.reduce((acc, m) => compose(acc, m), [1, 0, 0, 1, 0, 0]);

  /** 2D rotation matrix composed about (cx, cy). */
  function rotationMatrix(degrees, cx, cy) {
    const rad = (degrees * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rot = [cos, sin, -sin, cos, 0, 0];
    return compose(compose([1, 0, 0, 1, cx, cy], rot), [1, 0, 0, 1, -cx, -cy]);
  }

  /** Gradient angle (degrees) → the x1/y1/x2/y2 component stops. */
  function gradientStops(angle) {
    const radians = (angle - 90) * Math.PI / 180;
    const x1 = Math.round((1 + Math.cos(radians)) * 50);
    const y1 = Math.round((1 + Math.sin(radians)) * 50);
    const x2 = Math.round((1 - Math.cos(radians)) * 50);
    const y2 = Math.round((1 - Math.sin(radians)) * 50);
    return { x1, y1, x2, y2 };
  }

  /**
   * Build the canonical favicon SVG string.
   *
   * @param {object} state
   *   color1/color2       gradient stop colors
   *   gradientAngle       degrees 0–360
   *   borderRadius        background rect rx
   *   strokeWidth         user's stroke-width (in 24-unit lucide basis)
   *   strokeLinecap       'round' | 'square' | 'butt'
   *   iconX/iconY/iconSize  icon placement on the 32×32 canvas
   *   iconRotation        degrees, about the icon's center
   *   strokeSubpaths      array of `d` strings (stroke-based, merged to ONE path)
   *   fillSubpaths        array of `d` strings (filled, kept as separate shapes)
   * @returns {string} full SVG text
   */
  function buildFaviconSvg(state) {
    const {
      color1, color2, gradientAngle, borderRadius,
      strokeWidth, strokeLinecap,
      iconX, iconY, iconSize, iconRotation,
      strokeSubpaths = [], fillSubpaths = [],
    } = state;

    // Scale factor from the 24-unit lucide basis to the on-canvas icon size.
    const scale = iconSize / 24;
    const bakedStrokeWidth = strokeWidth / scale;

    // Combined transform: place the icon (translate + scale its 24-unit
    // coordinate space onto the canvas), then rotate about its center.
    // Every matrix is baked into the path data — canonical favicons never
    // carry a transform attribute (format rule 6).
    const cx = iconX + iconSize / 2;
    const cy = iconY + iconSize / 2;
    const matrix = composeAll([
      rotationMatrix(iconRotation, cx, cy),
      translateScale(iconX, iconY, scale),
    ]);

    const { x1, y1, x2, y2 } = gradientStops(gradientAngle);

    const parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">');
    parts.push(
      `<defs><linearGradient id="gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">` +
      `<stop stop-color="${color1}"/>` +
      `<stop offset="1" stop-color="${color2}"/>` +
      `</linearGradient></defs>`
    );
    parts.push(`<rect width="32" height="32" rx="${borderRadius}" fill="url(#gradient)"/>`);

    // Marker owner: the merged stroke path if present, else the first filled
    // shape. Exactly ONE element carries id="icon" (format rule 8) — when an
    // icon mixes stroke and filled shapes the filled ones stay unmarked so
    // the extractor never sees a duplicate marker.
    const hasIconContent = strokeSubpaths.length > 0 || fillSubpaths.length > 0;

    // Stroke icons: merge every subpath into ONE <path> — the whole point of
    // the simplification the portfolio generator relies on.
    if (strokeSubpaths.length > 0) {
      const merged = strokeSubpaths
        .map((d) => bakeSubpath(d, matrix))
        .filter(Boolean)
        .join('');
      parts.push(
        `<path${hasIconContent ? ' id="icon"' : ''} fill="none" stroke="${state.iconColor || '#f5f5f5'}" ` +
        `stroke-width="${round(bakedStrokeWidth)}" stroke-linecap="${strokeLinecap}" ` +
        `stroke-linejoin="round" d="${merged}"/>`
      );
    }

    // Filled shapes: kept SEPARATE so overlapping subpaths don't change the
    // rendered silhouette (nonzero fill-rule hole-punching). The first shape
    // carries id="icon" only when no stroke path claimed the marker; the rest
    // stay unmarked extra artwork that the extractor ignores.
    fillSubpaths.forEach((d, index) => {
      const isMarkerOwner = strokeSubpaths.length === 0 && index === 0 && hasIconContent;
      parts.push(
        `<path${isMarkerOwner ? ' id="icon"' : ''} fill="${state.iconColor || '#f5f5f5'}" ` +
        `d="${bakeSubpath(d, matrix)}"/>`
      );
    });

    parts.push('</svg>');
    return parts.join('');
  }

  function bakeSubpath(d, matrix) {
    const svgpath = (typeof window !== 'undefined' && window.svgpath) || null;
    if (!svgpath) {
      // Degraded mode: matrix not applied. Warn HERE as well as in the
      // callers — a silent non-bake would render the icon unscaled at the
      // origin with no way to notice.
      console.warn('svgpath not loaded — transform NOT baked into path data; output will be wrong.');
      return d;
    }
    try {
      return svgpath(d).matrix(matrix).round(4).toString();
    } catch (error) {
      console.warn('bakeSubpath failed:', error);
      return d;
    }
  }

  /** translate + uniform scale matrix (applied to a 24-unit local space). */
  function translateScale(tx, ty, s) {
    return [s, 0, 0, s, tx, ty];
  }

  const round = (value) => Number(value.toFixed(4));

  window.faviconLib = { buildFaviconSvg, rotationMatrix, composeAll };
})();
