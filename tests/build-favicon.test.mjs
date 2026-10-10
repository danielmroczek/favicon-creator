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
import { loadVendoredSvgpath } from './lib/load-svgpath.mjs';

// ── Real svgpath — loaded from the vendored browser bundle ───────────────
// (see tests/lib/load-svgpath.mjs; keeps baked-coordinate literals below
// meaningful — the old identity stub passed path data through UNBAKED).
const mainWindow = {};
globalThis.window = mainWindow;
mainWindow.svgpath = loadVendoredSvgpath();

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
    // Artwork spans the full 24-unit basis → measured bbox = (0,0,24,24),
    // so scale = 22/24 exactly like the classic iconSize/24 ratio.
    strokeSubpaths: ['M0 0L24 24', 'M0 24L24 0'],
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
  // Stroke Width is ABSOLUTE: stroke-width attribute = strokeWidth as-is
  // (2), lives in final canvas units and does NOT scale with iconSize.
  // Icon center (12,12) maps to (16+5, 16+5): corners 0→10, 24→32.
  assert.equal((svg.match(/<path\b[^>]*>/g) || [''])[0], '<path id="icon" fill="none" stroke="#f5f5f5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10 10L32 32M10 32L32 10"/>', 'merged subpaths concatenate in baked coordinates (absolute stroke 2, 22px icon at offsets 5,5)');
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

// ── Stroke width is ABSOLUTE: constant canvas units regardless of iconSize ──
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
    iconSize: 24,
    iconRotation: 0,
    // Artwork spans the full 24-unit basis → measured scale = 24/24 = 1.
    strokeSubpaths: ['M0 0L24 24'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('stroke-width="2"'), '24-unit icon keeps stroke-width 2');
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
    iconSize: 12, // scale 0.5 — stroke stays 2 canvas units (absolute)
    iconRotation: 0,
    // Artwork spans the full 24-unit basis → measured scale = 12/24 = 0.5.
    strokeSubpaths: ['M0 0L24 24'],
    fillSubpaths: [],
  });
  // No transform attribute exists, so stroke-width lives in FINAL canvas
  // units; absolute semantics mean it is written as-is (2) regardless of
  // the 0.5 scale — a constant canvas thickness at any icon size.
  assert.ok(svg.includes('stroke-width="2"'), 'downscaled icon keeps constant (absolute) stroke width');
}

// ── Absolute stroke at extreme downscale + fractional step values ─────────
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
    iconSize: 4, // extreme downscale — stroke still emits strokeWidth
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('stroke-width="2"'), 'absolute stroke ignores iconSize entirely');
}

{
  // The slider step is 0.25 (min 0.5): fractional values carry through.
  const svg = buildFaviconSvg({
    color1: '#000',
    color2: '#000',
    gradientAngle: 0,
    borderRadius: 4,
    strokeWidth: 0.75,
    strokeLinecap: 'round',
    iconX: 5,
    iconY: 5,
    iconSize: 12,
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('stroke-width="0.75"'), 'fractional stroke width (0.75) written as-is');
  assert.ok(svg.includes('<fc:strokeWidth>0.75</fc:strokeWidth>'), 'non-default fractional strokeWidth in metadata');
}

// ── Metadata: always-emitted fields, conditional fields omitted at defaults ─
{
  // All values at their UI defaults → only the 5 always-emitted fields.
  const svg = buildFaviconSvg({
    color1: '#3b82f6',
    color2: '#1d4ed8',
    gradientAngle: 315,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 0,
    iconY: 0,
    iconSize: 24,
    iconRotation: 0,
    iconFamily: 'lucide',
    iconName: 'arrow-right',
    iconColor: '#ffffff',
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });

  const ns = 'https://danielmroczek.github.io/favicon-creator';
  assert.ok(svg.includes('<metadata'), 'metadata element present');
  assert.ok(svg.includes(`xmlns:fc="${ns}"`), 'favicon-creator namespace declared');

  // Always-emitted fields.
  assert.ok(svg.includes('<fc:iconFamily>lucide</fc:iconFamily>'), 'iconFamily element');
  assert.ok(svg.includes('<fc:iconName>arrow-right</fc:iconName>'), 'iconName element');
  assert.ok(svg.includes('<fc:gradientStart>#3b82f6</fc:gradientStart>'), 'gradientStart element');
  assert.ok(svg.includes('<fc:gradientEnd>#1d4ed8</fc:gradientEnd>'), 'gradientEnd element');
  assert.ok(svg.includes('<fc:iconColor>#ffffff</fc:iconColor>'), 'iconColor element');

  // Conditional fields NOT emitted when at defaults.
  assert.ok(!svg.includes('fc:gradientAngle'), 'default gradientAngle not in metadata');
  assert.ok(!svg.includes('fc:borderRadius'), 'default borderRadius not in metadata');
  assert.ok(!svg.includes('fc:strokeWidth'), 'default strokeWidth not in metadata');
  assert.ok(!svg.includes('fc:strokeLinecap'), 'default strokeLinecap not in metadata');
  assert.ok(!svg.includes('fc:iconX'), 'default iconX not in metadata');
  assert.ok(!svg.includes('fc:iconY'), 'default iconY not in metadata');
  assert.ok(!svg.includes('fc:iconSize'), 'default iconSize not in metadata');
  assert.ok(!svg.includes('fc:iconRotation'), 'default iconRotation not in metadata');

  // Metadata appears before <defs> — first child of <svg>.
  const metaIdx = svg.indexOf('<metadata');
  const defsIdx = svg.indexOf('<defs>');
  assert.ok(metaIdx < defsIdx, 'metadata comes before defs');
}

// ── Metadata: conditional fields emitted when non-default ───────────────────
{
  const svg = buildFaviconSvg({
    color1: '#000',
    color2: '#333',
    gradientAngle: 90,
    borderRadius: 8,
    strokeWidth: 1.5,
    strokeLinecap: 'square',
    iconX: 2,
    iconY: 6,
    iconSize: 20,
    iconRotation: 45,
    iconFamily: 'custom',
    iconName: null,
    iconColor: '#f5f5f5',
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });

  // Always-emitted.
  assert.ok(svg.includes('<fc:iconFamily>custom</fc:iconFamily>'), 'custom icon family');
  assert.ok(svg.includes('<fc:iconName></fc:iconName>'), 'null iconName → empty element');

  // Conditional fields — all non-default, all present.
  assert.ok(svg.includes('<fc:gradientAngle>90</fc:gradientAngle>'), 'non-default gradientAngle');
  assert.ok(svg.includes('<fc:borderRadius>8</fc:borderRadius>'), 'non-default borderRadius');
  assert.ok(svg.includes('<fc:strokeWidth>1.5</fc:strokeWidth>'), 'non-default strokeWidth');
  assert.ok(svg.includes('<fc:strokeLinecap>square</fc:strokeLinecap>'), 'non-default strokeLinecap');
  assert.ok(svg.includes('<fc:iconX>2</fc:iconX>'), 'non-default iconX');
  assert.ok(svg.includes('<fc:iconY>6</fc:iconY>'), 'non-default iconY');
  assert.ok(svg.includes('<fc:iconSize>20</fc:iconSize>'), 'non-default iconSize');
  assert.ok(svg.includes('<fc:iconRotation>45</fc:iconRotation>'), 'non-default iconRotation');
}

// ── Metadata: always emitted even without iconFamily/iconName ───────────────
{
  const svg = buildFaviconSvg({
    color1: '#000',
    color2: '#000',
    gradientAngle: 0,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    // No iconFamily / iconName → defaults to null (empty element)
    iconX: 0,
    iconY: 0,
    iconSize: 24,
    iconRotation: 0,
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });

  assert.ok(svg.includes('<metadata'), 'metadata element always emitted');
  assert.ok(svg.includes('<fc:iconFamily></fc:iconFamily>'), 'null iconFamily → empty element');
  assert.ok(svg.includes('<fc:iconName></fc:iconName>'), 'null iconName → empty element');
  // gradientAngle=0 is non-default (315), so it should appear.
  assert.ok(svg.includes('<fc:gradientAngle>0</fc:gradientAngle>'), 'gradientAngle=0 is non-default, emitted');
}

console.log('tests/build-favicon.test.mjs — all assertions passed');

// ── Metadata: tabler family carried through (second icon family) ────────────
{
  const svg = buildFaviconSvg({
    color1: '#3b82f6',
    color2: '#1d4ed8',
    gradientAngle: 315,
    borderRadius: 4,
    strokeWidth: 2,
    strokeLinecap: 'round',
    iconX: 0,
    iconY: 0,
    iconSize: 24,
    iconRotation: 0,
    iconFamily: 'tabler',
    iconName: 'heart',
    iconColor: '#ffffff',
    strokeSubpaths: ['M1 1L2 2'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('<fc:iconFamily>tabler</fc:iconFamily>'), 'tabler family in metadata');
  assert.ok(svg.includes('<fc:iconName>heart</fc:iconName>'), 'tabler icon name in metadata');
  assert.ok(!/transform=/.test(svg), 'canonical output stays transform-free');
}

// ── Icon Size = MAXIMUM dimension; non-square basis keeps aspect ratio ──────
{
  // A 2:3 basis at Icon Size 24 must render 16×24, CENTERED on the canvas
  // (x: 16−8=8, y: 16−12=4 — a point at the local (0,0) corner maps there).
  const svg = buildFaviconSvg({
    color1: '#000', color2: '#000', gradientAngle: 315,
    strokeWidth: 2, strokeLinecap: 'round',
    iconX: 0, iconY: 0, iconSize: 24, iconRotation: 0,
    // Artwork drawn in a 16×24 box (2:3) → renders 16×24, centered:
    // box corners (0,0) → (8,4), (16,24) → (24,28).
    strokeSubpaths: ['M0 0L16 24 4 6Z'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('d="M8 4L24 28 12 10Z"'), '2:3 artwork at size 24 renders 16×24, centered');
  assert.ok(!svg.includes('fc:iconX'), 'centered offsets are the metadata default');
}

// ── Centered by default (old top-left model would put the icon at 0,0) ──────
{
  const svg = buildFaviconSvg({
    color1: '#000', color2: '#000', gradientAngle: 315,
    strokeWidth: 2, strokeLinecap: 'round',
    iconX: 0, iconY: 0, iconSize: 24, iconRotation: 0,
    // Artwork spans the full 24-unit basis → scale 1, centered:
    // (0,0) → (4,4), (12,24) → (16,28), (24,0) → (28,4).
    strokeSubpaths: ['M0 0L12 24 24 0Z'],
    fillSubpaths: [],
  });
  // 24-unit artwork, scale 1, centered → local (0,0) lands at (4,4).
  assert.ok(svg.includes('d="M4 4L16 28 28 4Z"'), 'X/Y=0 centers the icon on the canvas');
  assert.ok(!/transform=/.test(svg), 'canonical output stays transform-free');
}

// ── X/Y offsets are relative to the canvas CENTER ───────────────────────────
{
  const svg = buildFaviconSvg({
    color1: '#000', color2: '#000', gradientAngle: 315,
    strokeWidth: 2, strokeLinecap: 'round',
    iconX: 4, iconY: -6, iconSize: 24, iconRotation: 0,
    // Full-basis artwork, scale 1: centered corner (4,4) + offset (4,−6).
    strokeSubpaths: ['M0 0L12 24 24 0Z'],
    fillSubpaths: [],
  });
  // Centered position (4,4) shifted by (+4, −6) → (8,−2).
  assert.ok(svg.includes('d="M8-2L20 22 32-2Z"'), 'offsets shift the icon from the centered position');
  assert.ok(svg.includes('<fc:iconX>4</fc:iconX>'), 'non-zero iconX in metadata');
  assert.ok(svg.includes('<fc:iconY>-6</fc:iconY>'), 'negative iconY in metadata');
}

// ── Fallback: declared basis is the fit target when measurement fails ──────
{
  // A degenerate point has NO measurable extent: pathBBox returns w=0,h=0
  // and the fit picker filters it out → fitX/fitY/fitW/fitH fall back to
  // the DECLARED basis. A "12 12 24 24" basis maps its center (24,24) to
  // the canvas center (16,16) at scale 24/24 = 1, so the corner (12,12)
  // maps to (4,4) — proving the fallback (not the artwork) drove the math.
  const svg = buildFaviconSvg({
    color1: '#000', color2: '#000', gradientAngle: 315,
    strokeWidth: 2, strokeLinecap: 'round',
    iconX: 0, iconY: 0, iconSize: 24, iconRotation: 0,
    iconBasis: { vx: 12, vy: 12, vw: 24, vh: 24 },
    strokeSubpaths: ['M12 12'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('d="M4 4"'), 'unmeasurable artwork falls back to the declared viewBox for fit + centering');
  // Sanity: with zero artwork the assembler emits no icon path at all.
  const empty = buildFaviconSvg({
    color1: '#000', color2: '#000', gradientAngle: 315,
    strokeWidth: 2, strokeLinecap: 'round',
    iconX: 0, iconY: 0, iconSize: 24, iconRotation: 0,
    strokeSubpaths: [],
    fillSubpaths: [],
  });
  assert.ok(!empty.includes('<path'), 'no artwork → no icon path element');
}

// ── Non-zero viewBox origin honored for MEASURED artwork ───────────────────
{
  // Artwork drawn inside a "12 12 24 24" basis: measured bbox (12,12)-(36,36)
  // centers (24,24) on (16,16), so (12,12) → (4,4).
  const svg = buildFaviconSvg({
    color1: '#000', color2: '#000', gradientAngle: 315,
    strokeWidth: 2, strokeLinecap: 'round',
    iconX: 0, iconY: 0, iconSize: 24, iconRotation: 0,
    iconBasis: { vx: 12, vy: 12, vw: 24, vh: 24 },
    strokeSubpaths: ['M12 12L24 36 36 12Z'],
    fillSubpaths: [],
  });
  assert.ok(svg.includes('d="M4 4L16 28 28 4Z"'), 'viewBox origin offset is respected when centering');
}

console.log('tests/build-favicon.test.mjs — all assertions passed');
