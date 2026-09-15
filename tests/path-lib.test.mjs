// Tests for lib/path-lib.js — the pure path helpers behind the canonical
// favicon output. These exercise the public seam (window.faviconPathLib)
// exactly as the Alpine component uses it.
//
// Zero dependencies. Uses a minimal DOM node stub (getAttribute only) —
// real SVG elements are not needed because the lib only reads attributes
// and walks parentNode chains.
//
// Run:  node tests/path-lib.test.mjs
import assert from 'node:assert/strict';

// ── Minimal browser shims ────────────────────────────────────────────────────
// path-lib reads `element.tagName`, `element.getAttribute`, and walks
// `node.parentNode` / `node.nodeType`. A tiny stub satisfies all three.

const mainWindow = { svgpath: undefined };
globalThis.window = mainWindow;

// Load the library (an IIFE that attaches to window).
await import('../docs/lib/path-lib.js');
const {
  compose,
  parseTransform,
  accumulatedMatrix,
  shapeElementToD,
  bakeMatrix,
  isIdentity,
} = mainWindow.faviconPathLib;
assert.ok(shapeElementToD, 'library did not expose its API');

/** Build a node-chain: [root, ..., deepest]. Each entry is {attrs, parent}. */
function chain(steps) {
  const nodes = [];
  let parent = null;
  for (const attrs of steps) {
    const node = {
      nodeType: 1,
      tagName: attrs.tagName,
      attrs,
      getAttribute(name) {
        return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
      },
      get parentNode() {
        return parent;
      },
    };
    if (nodes.length > 0) Object.defineProperty(node, 'parentNode', { value: nodes[nodes.length - 1] });
    nodes.push(node);
  }
  return nodes;
}

// ── parseTransform ───────────────────────────────────────────────────────────
{
  const m = parseTransform('translate(4 4)');
  assert.deepEqual(m, [1, 0, 0, 1, 4, 4], 'translate(4 4) should map e,f = 4,4');
}
{
  const m = parseTransform('scale(2)');
  assert.deepEqual(m, [2, 0, 0, 2, 0, 0], 'scale(2) uniform');
}
{
  const m = parseTransform('scale(2 3)');
  assert.deepEqual(m, [2, 0, 0, 3, 0, 0], 'scale(2 3) anisotropic');
}
{
  const m = parseTransform('matrix(1 0 0 1 5 7)');
  assert.deepEqual(m, [1, 0, 0, 1, 5, 7], 'matrix passthrough');
}
{
  // rotate(a cx cy) is the three-component form; scaling by 4 and rotating 90°
  // around (8,8) maps point (8,8) to itself.
  const m = parseTransform('rotate(90 8 8)');
  const [a, b, c, d, e, f] = m;
  const px = a * 8 + c * 8 + e;
  const py = b * 8 + d * 8 + f;
  assert.ok(Math.abs(px - 8) < 1e-9 && Math.abs(py - 8) < 1e-9, 'rotate about (8,8) keeps (8,8) fixed');
  assert.ok(Math.abs(a) < 1e-9 || Math.abs(b) < 1e-9, 'rotate 90 has one zero axis component');
}
{
  // Multi-component attribute: leftmost is outermost.
  const m = parseTransform('translate(2 0) scale(3)');
  // apply to point (1,1): scale first (3,3), then translate (5,3) — so
  // the combined matrix is x' = 3x + 2 (e=2, not 6).
  const [a, b, c, d, e, f] = m;
  assert.deepEqual([a, b, c, d, e, f], [3, 0, 0, 3, 2, 0]);
}

// ── accumulatedMatrix ────────────────────────────────────────────────────────
{
  const [svg, g, shape] = chain([
    { tagName: 'svg' },
    { tagName: 'g', transform: 'translate(4 4)' },
    { tagName: 'path' },
  ]);
  const m = accumulatedMatrix(shape);
  assert.deepEqual(m, [1, 0, 0, 1, 4, 4], 'single parent transform is picked up');
}
{
  // Nested g transforms compose: translate(2,0) ∘ scale(3) applied to the
  // path — but the path itself has no transform, so result = product of ancestors.
  const [, , shape] = chain([
    { tagName: 'svg' },
    { tagName: 'g', transform: 'scale(3)' },
    { tagName: 'g', transform: 'translate(2 0)' },
    { tagName: 'path' },
  ]);
  const m = accumulatedMatrix(shape);
  // inner translate then outer scale: x' = 3*(x+2)
  assert.deepEqual(m, [3, 0, 0, 3, 6, 0], 'nested transforms compose');
}
{
  const [, , shape] = chain([
    { tagName: 'svg' },
    { tagName: 'g' },
    { tagName: 'path' },
  ]);
  assert.equal(isIdentity(accumulatedMatrix(shape)), true, 'no transforms means identity');
}

// ── shapeElementToD ─────────────────────────────────────────────────────────
function el(tagName, attrs) {
  return {
    nodeType: 1,
    tagName,
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
  };
}

{
  const d = shapeElementToD(el('circle', { cx: 12, cy: 12, r: 10 }));
  assert.ok(d.startsWith('M 2 12') && d.includes('A 10 10'), `circle → arc path, got: ${d}`);
}
{
  const d = shapeElementToD(el('rect', { x: 2, y: 3, width: 6, height: 4 }));
  assert.equal(d, 'M 2 3 H 8 V 7 H 2 Z', 'rect → rectilinear path');
}
{
  const d = shapeElementToD(el('rect', { width: 0, height: 5 }));
  assert.equal(d, '', 'degenerate rect → empty d');
}
{
  const d = shapeElementToD(el('line', { x1: 1, y1: 2, x2: 3, y2: 4 }));
  assert.equal(d, 'M 1 2 L 3 4', 'line');
}
{
  const d = shapeElementToD(el('polygon', { points: '1,2 3,4 5,6' }));
  assert.ok(d.includes('Z'), 'polygon closes');
}
{
  const d = shapeElementToD(el('polyline', { points: '1,2 3,4' }));
  assert.ok(!d.includes('Z'), 'polyline does not close');
}
{
  const d = shapeElementToD(el('text', {}));
  assert.equal(d, '', 'unsupported tag → empty d');
}
{
  const d = shapeElementToD(el('path', { d: 'M1 1L2 2' }));
  assert.equal(d, 'M1 1L2 2', 'path passes through');
}

// ── bakeMatrix ──────────────────────────────────────────────────────────────
{
  // Identity matrix → d unchanged, nothing to bake.
  const result = bakeMatrix('M1 1L2 2', [1, 0, 0, 1, 0, 0]);
  assert.equal(result.d, 'M1 1L2 2');
  assert.equal(result.baked, true);
}
{
  // Without svgpath, non-identity transforms report baked=false so the caller
  // can warn rather than emit a wrong icon.
  mainWindow.svgpath = undefined;
  const result = bakeMatrix('M1 1L2 2', [2, 0, 0, 2, 0, 0]);
  assert.equal(result.baked, false, 'missing svgpath → not baked');
  assert.equal(result.d, 'M1 1L2 2', 'input unchanged when not baked');
}
{
  // Minimal svgpath stub: parses absolute coordinates, applies matrix.
  // Enough to prove that bakeMatrix actually calls the library.
  let receivedMatrix = null;
  mainWindow.svgpath = function (d) {
    let coords = d.match(/-?\d+(\.\d+)?/g).map(Number);
    return {
      matrix(m) {
        receivedMatrix = m;
        coords = coords.map(() => 0); // placeholder
        return this;
      },
      round() {
        return this;
      },
      toString() {
        return 'M0 0L0 0'; // deterministic stub output
      },
    };
  };
  const result = bakeMatrix('M1 1L2 2', [1, 0, 0, 1, 5, 6]);
  assert.deepEqual(receivedMatrix, [1, 0, 0, 1, 5, 6], 'matrix forwarded to svgpath');
  assert.equal(result.baked, true);
  mainWindow.svgpath = undefined;
}

console.log('tests/path-lib.test.mjs — all assertions passed');
