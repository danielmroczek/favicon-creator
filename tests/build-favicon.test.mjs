// Tests for `buildFaviconSvg` — the single seam that produces the canonical
// favicon string used for BOTH the preview and the download.
//
// The expected output shapes are hand-written literals from the canonical
// format contract (danielmroczek.github.io/docs/favicon-format.md), not
// recomputed from the implementation — so a regression in assembly order,
// attribute names, or the id="icon" marker fails loudly.
//
// Run:  node tests/build-favicon.test.mjs
import assert from 'node:assert/strict';

// ── Browser shims ────────────────────────────────────────────────────────────
const mainWindow = { svgpath: undefined };
globalThis.window = mainWindow;

// Stub svgpath: identity for our tests (record and pass d through). Baking is
// exercised separately in tests/path-lib.test.mjs.
mainWindow.svgpath = function (d) {
  return {
    matrix() { return this; },
    round() { return this; },
    toString() { return d; },
  };
};

await import('../docs/lib/path-lib.js');
await import('../docs/lib/favicon.js');
const { buildFaviconSvg } = mainWindow.faviconLib;
assert.ok(typeof buildFaviconSvg === 'function', 'favicon lib did not expose buildFaviconSvg');

// ── Gradient + rect + single icon path ──────────────────────────────────────
{
  const svg = buildFaviconSvg({
    color1: '#33691e',
    color2: '#558b2f',
    gradientAngle: 315,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 22,
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2', 'M3 3L4 4'],
    fillSubpaths: [],
  });

  assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">'), 'root element must be 32x32 with viewBox');
  assert.ok(svg.includes('<linearGradient id="gradient"'), 'exactly one gradient def');
  assert.ok(svg.includes('stop-color="#33691e"'), 'start color present');
  assert.ok(svg.includes('stop-color="#558b2f"'), 'end color present');
  assert.ok(svg.includes('<rect width="32" height="32" rx="4" fill="url(#gradient)"/>'), 'full-screen background rect');
  assert.ok(svg.includes('id="icon"'), 'icon marker present');
  assert.ok(svg.includes('fill="none" stroke="'), 'stroke-based icon carries fill="none"');
  assert.ok(svg.includes('stroke-linecap="round"'), 'stroke-linecap carried through');
  // Exactly one <path> for a stroke-only icon (merged subpaths).
  assert.equal(svg.match(/<path\b/g).length, 1, 'exactly one path element for stroke icon');
  // iconSize 22 → scale 22/24 → stroke-width 2/(22/24) ≈ 2.1818 (compensation).
  assert.equal((svg.match(/<path\b[^>]*>/g) || [''])[0], '<path id="icon" fill="none" stroke="#f5f5f5" stroke-width="2.1818" stroke-linecap="round" stroke-linejoin="round" d="M1 1L2 2M3 3L4 4"/>', 'merged subpaths concatenate directly in d');
  // Ends with the closed root tag.
  assert.ok(svg.endsWith('</svg>'), 'root element closed');
}

// ── Filled icons stay separate shapes ───────────────────────────────────────
{
  const svg = buildFaviconSvg({
    color1: '#000000',
    color2: '#000000',
    gradientAngle: 315,
    borderRadius: 0,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 22,
    iconRotation: 0,
    strokeSubpaths: [],
    fillSubpaths: ['M6 14 12 6l6 8z', 'M22 22h6v6h-6z'],
  });

  // Rule 3: every icon shape has explicit white fill. Rule 8: only one
  // element marked id="icon" — the first shape (the thumbnail), the rest
  // remain unmarked extra artwork.
  const paths = svg.match(/<path\b[^>]*d="[^"]+"/g) || [];
  assert.equal(paths.length, 2, 'filled shapes stay separate (no risky merge)');
  assert.ok(paths[0].includes('id="icon"'), 'first filled shape carries the marker');
  assert.ok(!paths[1].includes('id="icon"'), 'subsequent filled shapes unmarked');
  assert.ok(!svg.includes('fill="none"'), 'filled icons do not carry fill="none"');
}

// ── Mixed stroke + fill exactly ONE id="icon" ───────────────────────────────
{
  // Format rule 8: the marker must appear on EXACTLY one element. A mixed
  // icon used to emit it twice (stroke path AND first filled shape).
  const svg = buildFaviconSvg({
    color1: '#000000',
    color2: '#000000',
    gradientAngle: 315,
    borderRadius: 0,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 22,
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: ['M6 14 12 6l6 8z'],
  });
  const markers = (svg.match(/\bid="icon"/g) || []).length;
  assert.equal(markers, 1, 'mixed stroke+fill icon marks exactly one element');
  const strokePath = svg.match(/<path[^>]*fill="none"[^>]*>/)[0];
  assert.ok(strokePath.includes('id="icon"'), 'stroke path claims the marker when present');
}

// ── Rotation bakes into the transform-free output via matrix application ────
{
  // The rotation matrix (computed by the caller) is applied to each subpath
  // by svgpath. Our canonical output must NOT carry a transform attribute.
  const svg = buildFaviconSvg({
    color1: '#000',
    color2: '#000',
    gradientAngle: 0,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 22,
    iconRotation: 90,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });
  assert.ok(!/transform=/.test(svg), 'canonical output never contains transform attributes');
}

// ── Stroke width scales with icon size (24-unit Lucide basis) ───────────────
{
  const svg = buildFaviconSvg({
    color1: '#000',
    color2: '#000',
    gradientAngle: 0,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 24, // scale factor 1 → stroke stays 2
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('stroke-width="2"'), '24-unit icon keeps 1:1 stroke width');
}

{
  const svg = buildFaviconSvg({
    color1: '#000',
    color2: '#000',
    gradientAngle: 0,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 12, // scale factor 0.5 → stroke doubled, then baked via matrix convention
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('stroke-width="4"'), 'downscaled icon gets proportionally thicker stroke');
}

console.log('tests/build-favicon.test.mjs — all assertions passed');
