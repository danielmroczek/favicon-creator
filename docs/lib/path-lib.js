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

  /**
   * Bounding box { x, y, w, h } of a path's ACTUAL geometry — measured, not
   * taken from any declared viewBox. Lines/beziers/arcs are included via
   * svgpath segment iteration (curves sampled at 8 points per segment, arcs
   * via their center-parameterization extrema + samples), so a small glyph
   * drawn inside a large viewBox reports its true size. Control points are
   * NOT counted (that would overestimate); sampling error stays under ~0.5%.
   * Returns null for empty/invalid paths.
   */
  function pathBBox(d) {
    const svgpath = typeof window !== 'undefined' ? window.svgpath : null;
    if (!svgpath || !d) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const take = (x, y) => {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    };
    // Sample a cubic curve segment [p0, c1, c2, p1].
    const sampleCubic = (p0, c1, c2, p1) => {
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const mt = 1 - t;
        take(
          mt * mt * mt * p0[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t * t * t * p1[0],
          mt * mt * mt * p0[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t * t * t * p1[1]
        );
      }
    };
    // Sample a quadratic segment [p0, c, p1].
    const sampleQuad = (p0, c, p1) => {
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const mt = 1 - t;
        take(
          mt * mt * p0[0] + 2 * mt * t * c[0] + t * t * p1[0],
          mt * mt * p0[1] + 2 * mt * t * c[1] + t * t * p1[1]
        );
      }
    };
    // Elliptical arc (endpoint parameterization, per SVG spec): include the
    // axis-aligned extrema of the swept arc plus sampled points between them.
    const sampleArc = (p0, seg) => {
      const [, rx0, ry0, xRot, largeArc, sweep, x1, y1] = seg;
      const phi = (xRot * Math.PI) / 180;
      const cosP = Math.cos(phi), sinP = Math.sin(phi);
      // Convert to center parameterization (F.6.5).
      const dx2 = (p0[0] - x1) / 2, dy2 = (p0[1] - y1) / 2;
      const x1p = cosP * dx2 + sinP * dy2;
      const y1p = -sinP * dx2 + cosP * dy2;
      const rx = Math.abs(rx0), ry = Math.abs(ry0);
      const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      const rxUse = lambda > 1 ? Math.sqrt(lambda) * rx : rx;
      const ryUse = lambda > 1 ? Math.sqrt(lambda) * ry : ry;
      const sign = largeArc !== sweep ? 1 : -1;
      const num = rxUse * rxUse * ryUse * ryUse - rxUse * rxUse * y1p * y1p - ryUse * ryUse * x1p * x1p;
      const den = rxUse * rxUse * y1p * y1p + ryUse * ryUse * x1p * x1p;
      const co = sign * Math.sqrt(Math.max(0, num / den));
      const cxp = (co * rxUse * y1p) / ryUse;
      const cyp = (-co * ryUse * x1p) / rxUse;
      const cx = cosP * cxp - sinP * cyp + (p0[0] + x1) / 2;
      const cy = sinP * cxp + cosP * cyp + (p0[1] + y1) / 2;
      const theta1 = Math.atan2((y1p - cyp) / ryUse, (x1p - cxp) / rxUse);
      const theta2 = Math.atan2((-y1p - cyp) / ryUse, (-x1p - cxp) / rxUse);
      let dTheta = theta2 - theta1;
      if (!sweep && dTheta > 0) dTheta -= 2 * Math.PI;
      if (sweep && dTheta < 0) dTheta += 2 * Math.PI;
      // Axis-aligned extrema of the ellipse in user space occur at angles
      // where the derivative flips sign — check them and sampled points.
      const pts = (angle) => {
        const ex = rxUse * Math.cos(angle), ey = ryUse * Math.sin(angle);
        return [cosP * ex - sinP * ey + cx, sinP * ex + cosP * ey + cy];
      };
      for (let i = 0; i <= 16; i++) take(...pts(theta1 + (dTheta * i) / 16));
      for (let k = 0; k < 4; k++) {
        const t = theta1 + ((k * Math.PI) / 2) * (dTheta >= 0 ? 1 : -1);
        if ((t - theta1) * (t - theta2) <= 0 || Math.abs(dTheta) >= 2 * Math.PI) take(...pts(t));
      }
      take(x1, y1);
    };
    try {
      // Work on ABSOLUTE segments and track the previous control points so
      // S/T reflections are resolved exactly (svgpath.abs() alone doesn't
      // rewrite S/T into C/Q).
      let lastC2 = null;   // second control point of the last C
      let lastQc = null;   // control point of the last Q
      let cur = [0, 0];
      const toCubic = (seg) => {           // normalize S → C
        if (seg[0] === 'S') {
          const refl = lastC2 ? [2 * cur[0] - lastC2[0], 2 * cur[1] - lastC2[1]] : [...cur];
          lastC2 = [seg[3], seg[4]];
          return ['C', refl[0], refl[1], seg[1], seg[2], seg[3], seg[4]];
        }
        lastC2 = [seg[3], seg[4]];
        return seg;
      };
      const toQuad = (seg) => {            // normalize T → Q
        if (seg[0] === 'T') {
          const refl = lastQc ? [2 * cur[0] - lastQc[0], 2 * cur[1] - lastQc[1]] : [...cur];
          lastQc = [seg[1], seg[2]];
          return ['Q', refl[0], refl[1], seg[1], seg[2]];
        }
        lastQc = [seg[1], seg[2]];
        return seg;
      };
      svgpath(d).abs().iterate((seg, index) => {
        const [cmd, ...args] = seg;
        switch (cmd) {
          case 'M': case 'L':
            take(args[0], args[1]);
            cur = [args[0], args[1]];
            break;
          case 'H':
            take(args[0], cur[1]);
            cur = [args[0], cur[1]];
            break;
          case 'V':
            take(cur[0], args[0]);
            cur = [cur[0], args[0]];
            break;
          case 'C':
          case 'S':
          case 'Q':
          case 'T': {
            // Normalize S→C and T→Q, then sample exactly like direct C/Q.
            const norm = cmd === 'S' ? toCubic(seg) : cmd === 'T' ? toQuad(seg) : seg;
            if (norm[0] === 'C') {
              sampleCubic(cur, [norm[1], norm[2]], [norm[3], norm[4]], [norm[5], norm[6]]);
              cur = [norm[5], norm[6]];
            } else {
              sampleQuad(cur, [norm[1], norm[2]], [norm[3], norm[4]]);
              cur = [norm[3], norm[4]];
            }
            break;
          }
          case 'A':
            sampleArc(cur, seg);
            cur = [args[5], args[6]];
            break;
          case 'Z':
            break;
        }
      });
    } catch (error) {
      console.warn('pathBBox failed:', error);
      return null;
    }
    if (minX === Infinity) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  window.faviconPathLib = {
    compose,
    parseTransform,
    accumulatedMatrix,
    shapeElementToD,
    bakeMatrix,
    pathBBox,
    isIdentity,
  };
})();
