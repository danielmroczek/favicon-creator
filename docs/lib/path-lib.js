// Pure path helpers for the canonical favicon output.
//
// This module is the seam between the UI (Alpine component) and the canonical
// favicon format (danielmroczek.github.io/docs/favicon-format.md). It is
// deliberately DOM-light (only walking uploaded SVG nodes) and dependency-free
// except for window.svgpath, which is loaded from a CDN in index.html.
//
// Contract rules implemented here:
//   - every shape (path/circle/rect/ellipse/line/polyline/polygon) becomes
//     path data, so subpaths can be merged into ONE <path> element;
//   - transforms (on the element itself and every ancestor <g>/<svg>) are
//     computed as a matrix and BAKED into the coordinates — canonical
//     favicons carry no transform attributes (format rule 6).
//
// Exposed as window.faviconPathLib so tests can exercise the same code the
// Alpine component uses.
(function () {
  'use strict';

  /** True when the matrix is the identity (nothing to bake). */
  const isIdentity = (m) =>
    m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

  /** Compose two matrices: (outer ∘ inner) — outer applied after inner. */
  function compose(outer, inner) {
    const [ao, bo, co, do_, eo, fo] = outer;
    const [ai, bi, ci, di, ei, fi] = inner;
    return [
      ao * ai + co * bi,
      bo * ai + do_ * bi,
      ao * ci + co * di,
      bo * ci + do_ * di,
      ao * ei + co * fi + eo,
      bo * ei + do_ * fi + fo,
    ];
  }

  /**
   * Parse a transform attribute into a single matrix. The attribute may hold
   * several components (translate/scale/rotate/skew/matrix), applied
   * left-to-right, so the leftmost component ends up outermost.
   */
  function parseTransform(transformText) {
    let result = [1, 0, 0, 1, 0, 0];
    const componentRegex = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
    let match;
    while ((match = componentRegex.exec(transformText)) !== null) {
      const [, name, rawArgs] = match;
      const args = rawArgs.trim().split(/[\s,]+/).map(parseFloat);
      let m = null;
      if (name === 'matrix' && args.length >= 6) {
        m = args.slice(0, 6);
      } else if (name === 'translate' && args.length >= 1) {
        m = [1, 0, 0, 1, args[0], args[1] || 0];
      } else if (name === 'scale' && args.length >= 1) {
        m = [args[0], 0, 0, args[1] !== undefined ? args[1] : args[0], 0, 0];
      } else if (name === 'rotate' && args.length >= 1) {
        const rad = (args[0] * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        m = [cos, sin, -sin, cos, 0, 0];
        if (args.length >= 3) {
          // rotate(a cx cy) == translate(cx cy) ∘ rotate(a) ∘ translate(-cx -cy)
          m = compose(compose([1, 0, 0, 1, args[1], args[2]], m), [1, 0, 0, 1, -args[1], -args[2]]);
        }
      } else if (name === 'skewX' && args.length >= 1) {
        m = [1, 0, Math.tan((args[0] * Math.PI) / 180), 1, 0, 0];
      } else if (name === 'skewY' && args.length >= 1) {
        m = [1, Math.tan((args[0] * Math.PI) / 180), 0, 1, 0, 0];
      }
      // Components compose left × right (leftmost is outermost), so the
      // running result is always the outer side of the next component.
      if (m) result = compose(result, m);
    }
    return result;
  }

  /**
   * Accumulated transform matrix for an element, including its own transform
   * attribute and every ancestor carrying one. Identity means "nothing to bake".
   */
  function accumulatedMatrix(element) {
    let result = [1, 0, 0, 1, 0, 0];
    let node = element;
    while (node && node.nodeType === 1) {
      const transform = node.getAttribute && node.getAttribute('transform');
      if (transform) result = compose(parseTransform(transform), result);
      node = node.parentNode;
    }
    return result;
  }

  /** circle → path data (two arcs). */
  const circleToD = (cx, cy, r) =>
    `M ${cx - r} ${cy} A ${r} ${r} 0 1 1 ${cx + r} ${cy} A ${r} ${r} 0 1 1 ${cx - r} ${cy}`;

  /**
   * Convert one SVG shape element into path `d` data for its LOCAL
   * coordinate system. Returns '' for unknown or degenerate shapes.
   */
  function shapeElementToD(element) {
    const tag = element.tagName.toLowerCase();
    const attr = (name) => parseFloat(element.getAttribute(name));
    const attrOr = (name, fallback) => {
      const value = attr(name);
      return Number.isFinite(value) ? value : fallback;
    };

    switch (tag) {
      case 'path':
        return element.getAttribute('d') || '';
      case 'circle':
        return Number.isFinite(attr('r'))
          ? circleToD(attrOr('cx', 0), attrOr('cy', 0), attr('r'))
          : '';
      case 'ellipse': {
        const cx = attrOr('cx', 0);
        const cy = attrOr('cy', 0);
        const rx = attr('rx');
        const ry = attr('ry');
        if (!Number.isFinite(rx) || !Number.isFinite(ry)) return '';
        return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`;
      }
      case 'rect': {
        const width = attr('width');
        const height = attr('height');
        if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return '';
        const x = attrOr('x', 0);
        const y = attrOr('y', 0);
        return `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z`;
      }
      case 'line':
        return `M ${attrOr('x1', 0)} ${attrOr('y1', 0)} L ${attrOr('x2', 0)} ${attrOr('y2', 0)}`;
      case 'polyline':
      case 'polygon': {
        const points = (element.getAttribute('points') || '').trim();
        return points ? `M ${points}${tag === 'polygon' ? ' Z' : ''}` : '';
      }
      default:
        return '';
    }
  }

  /**
   * Bake a transform matrix into path data, producing new plain coordinates.
   * Requires svgpath (CDN-loaded in index.html). Returns:
   *   { d, baked }  where baked=false means the matrix could NOT be applied
   *   (svgpath missing) — the caller must then warn and preserve the
   *   transform separately rather than emit a silently-wrong icon.
   */
  function bakeMatrix(d, matrix) {
    if (isIdentity(matrix)) return { d, baked: true };
    const svgpath = typeof window !== 'undefined' ? window.svgpath : null;
    if (!svgpath) return { d, baked: false };
    try {
      const baked = svgpath(d).matrix(matrix).round(4).toString();
      return { d: baked, baked: true };
    } catch (error) {
      console.warn('path baking failed:', error);
      return { d, baked: false };
    }
  }

  window.faviconPathLib = {
    compose,
    parseTransform,
    accumulatedMatrix,
    shapeElementToD,
    bakeMatrix,
    isIdentity,
  };
})();
