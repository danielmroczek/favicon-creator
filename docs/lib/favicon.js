// Canonical favicon string builder — the SINGLE seam between the UI state and
// the canonical favicon format (danielmroczek.github.io/docs/favicon-format.md).
//
// The same string this module returns is used for the live preview AND the
// download, so the two can never drift apart. Keeping it isolated (pure
// function, no Alpine, no DOM) also makes either pairing swappable later.
//
// Emitted structure contract:
//   <svg ... width="32" height="32" viewBox="0 0 32 32">
//       <metadata xmlns:fc="...">             (always present, icon genesis XML)
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
   *   strokeWidth         the user's stroke-width — written to the output
   *                       AS-IS in CANVAS units (absolute thickness); it
   *                       does NOT scale with iconSize
   *   strokeLinecap       'round' | 'square' | 'butt'
  *   iconX/iconY         pixel offsets from the canvas CENTER (−24..24);
  *                       0 = the icon stays perfectly centered
  *   iconSize            the icon's MAXIMUM on-canvas dimension (longer
  *                       side of the scaled icon)
  *   iconBasis           the icon's local viewBox {vx, vy, vw, vh};
  *                       defaults to {0, 0, 24, 24} (Lucide/Tabler basis)
   *   iconRotation        degrees, about the icon's center
   *   strokeSubpaths      array of `d` strings (stroke-based, merged to ONE path)
   *   fillSubpaths        array of `d` strings (filled, kept as separate shapes)
   *   iconFamily          icon source family (e.g. 'lucide', 'custom'), null if unknown
   *   iconName            icon name within the family (kebab-case), null if unknown
   * @returns {string} full SVG text
   */
  function buildFaviconSvg(state) {
    const {
      color1, color2, gradientAngle, borderRadius,
      strokeWidth, strokeLinecap,
      iconX, iconY, iconSize, iconRotation, iconBasis,
      strokeSubpaths = [], fillSubpaths = [],
      iconFamily, iconName,
    } = state;

    // The icon's declared local viewBox. Lucide/Tabler live in the square
    // 24×24 basis; custom uploads may declare any viewBox.
    const { vx = 0, vy = 0, vw = 24, vh = 24 } = iconBasis || {};

    // Icon Size is the icon's MAXIMUM dimension (user contract): 2:3
    // artwork at size 24 renders 16×24. The fit target is the artwork's
    // MEASURED bounding box, not the declared viewBox — Tabler's -small/‑xs
    // glyphs are drawn intentionally tiny inside the 24×24 grid, so fitting
    // the declared box would render them at a fraction of the slider value.
    // When measurement is impossible (svgpath missing, degenerate geometry)
    // we fall back to the declared viewBox.
    let fitX = vx, fitY = vy, fitW = vw, fitH = vh;
    const boxes = [...strokeSubpaths, ...fillSubpaths]
      .map((d) => (pathLib ? pathLib.pathBBox(d) : null))
      .filter(Boolean)
      .filter((b) => b.w > 0 || b.h > 0);
    if (boxes.length > 0) {
      const minX = Math.min(...boxes.map((b) => b.x));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxX = Math.max(...boxes.map((b) => b.x + b.w));
      const maxY = Math.max(...boxes.map((b) => b.y + b.h));
      fitX = minX; fitY = minY; fitW = maxX - minX; fitH = maxY - minY;
    }

    // Scale factor from the measured artwork box to the on-canvas icon size.
    const scale = iconSize / Math.max(fitW, fitH);
    // The matrix is baked into the path data (no transform attribute), so
    // the stroke-width attribute lives in FINAL canvas units. Stroke Width
    // is ABSOLUTE: it is written to the output as-is — a constant canvas
    // thickness no matter how big the icon is rendered (the separate
    // "Absolute Stroke Width" toggle was removed; this is now the only
    // behavior).
    const bakedStrokeWidth = strokeWidth;

    // Combined transform: the scaled icon is CENTERED on the 32×32 canvas
    // (its local center — including a non-zero viewBox origin — maps to
    // (16,16)), then nudged by the iconX/iconY offsets, and rotated about
    // that same (offset) center. Every matrix is baked into the path
    // data — canonical favicons never carry a transform attribute (rule 6).
    const cx = 16 + iconX;
    const cy = 16 + iconY;
    const tx = cx - scale * (fitX + fitW / 2);
    const ty = cy - scale * (fitY + fitH / 2);
    const matrix = composeAll([
      rotationMatrix(iconRotation, cx, cy),
      translateScale(tx, ty, scale),
    ]);

    const { x1, y1, x2, y2 } = gradientStops(gradientAngle);

    // Pretty-printed output: one element per line. The canonical format doc
    // (favicon-format.md) is itself written this way, the portfolio extractor
    // parses with whitespace-tolerant regexes/serializers, so newlines are
    // cosmetic only and safe in preview, download, and data-URI alike.
    const parts = [];
    parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">');
    parts.push('');

    // Metadata: always emitted as the first child of <svg> (before <defs>).
    // XML elements with a namespace — informational, not a round-trip
    // contract (see ADR 0007).
    //
    // "Always" fields (icon provenance + colours) are emitted regardless
    // of value.  All other edit-state fields are emitted only when they
    // differ from the UI default — this keeps the metadata compact while
    // still capturing every non-default tweak for future "load back into
    // the generator" functionality.
    const metaNs = 'https://danielmroczek.github.io/favicon-creator';
    const metaElements = [];
    const metaPush = (tag, value) => metaElements.push(`    <fc:${tag}>${value}</fc:${tag}>`);

    // Always-emitted fields.
    metaPush('iconFamily', iconFamily ?? '');
    metaPush('iconName', iconName ?? '');
    metaPush('gradientStart', color1);
    metaPush('gradientEnd', color2);
    metaPush('iconColor', state.iconColor ?? '#f5f5f5');

    // Conditional fields: emitted only when non-default.
    if (gradientAngle !== 315) metaPush('gradientAngle', gradientAngle);
    if (borderRadius !== 4)    metaPush('borderRadius', borderRadius);
    if (strokeWidth !== 2)     metaPush('strokeWidth', strokeWidth);
    if (strokeLinecap !== 'round') metaPush('strokeLinecap', strokeLinecap);
    if (iconX !== 0)           metaPush('iconX', iconX);
    if (iconY !== 0)           metaPush('iconY', iconY);
    if (iconSize !== 24)       metaPush('iconSize', iconSize);
    if (iconRotation !== 0)    metaPush('iconRotation', iconRotation);

    parts.push(`  <metadata xmlns:fc="${metaNs}">`);
    parts.push(metaElements.join('\n'));
    parts.push(`  </metadata>`);
    parts.push('');

    parts.push(`  <defs>`);
    parts.push(
      `    <linearGradient id="gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">`
    );
    parts.push(`      <stop stop-color="${color1}"/>`);
    parts.push(`      <stop offset="1" stop-color="${color2}"/>`);
    parts.push(`    </linearGradient>`);
    parts.push(`  </defs>`);
    parts.push('');
    parts.push(`  <rect width="32" height="32" rx="${borderRadius}" fill="url(#gradient)"/>`);
    parts.push('');

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

      parts.push(`  <path${hasIconContent ? ' id="icon"' : ''} fill="none" stroke="${state.iconColor || '#f5f5f5'}" ` +
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
      parts.push(`  <path${isMarkerOwner ? ' id="icon"' : ''} fill="${state.iconColor || '#f5f5f5'}" ` +
        `d="${bakeSubpath(d, matrix)}"/>`
      );
    });

    parts.push('');
    parts.push('</svg>');
    return parts.join('\n');
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
