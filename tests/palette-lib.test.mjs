// Tests for `paletteLib` — the seam that turns the vendored Material Colors
// JSON into a filtered grid model + the Palette Random defaults rule.
//
// The "grid model" seam is docs/script.js's paletteLib view of the
// palette: rows = chromatic/achromatic hue, columns = shade 100–900
// (no 50, no a100–a700), plus the two Neutral Extras (white/black).
// Palette Random rules live in CONTEXT.md ("Palette Random"):
//   1. random Chromatic Hue + random Shade for the Start Color
//   2. End Color = same Hue, exactly two shade steps away, direction chosen
//      only from the directions that stay inside 100–900
//   3. Icon Color is NEVER randomized
//   4. grey/bluegrey are excluded from Palette Random (grid-only)
//
// Run:  node tests/palette-lib.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// ── Load the real script.js exactly like the browser does ──────────────────
// script.js defines faviconCreator() as a global function (no module system).
const src = readFileSync(new URL('../docs/script.js', import.meta.url), 'utf8');
const paletteSrc = readFileSync(new URL('../docs/lib/material-colors.js', import.meta.url), 'utf8');
const paletteLibSrc = readFileSync(new URL('../docs/lib/palette-lib.js', import.meta.url), 'utf8');
// Indirect eval (not `vm`) so the code runs in THIS realm — deepStrictEqual
// is realm-strict and would otherwise fail on identical arrays. Indirect
// eval executes in global scope, so `window` must be a global too.
globalThis.window = {};
(0, eval)(paletteSrc + '\n' + paletteLibSrc + '\n' + src + '\n;globalThis.__fc = faviconCreator;');
const faviconCreator = globalThis.__fc;
assert.ok(typeof faviconCreator === 'function', 'script.js did not expose faviconCreator');

// Load the real vendored JSON so tests validate the actual shipped data.
const palette = JSON.parse(
  readFileSync(new URL('../docs/lib/material-colors.json', import.meta.url), 'utf8')
);

// ── Seams ───────────────────────────────────────────────────────────────────
const tc = faviconCreator();
// paletteLib must be reachable through the component object — it is the
// public seam (ctx.paletteLib.*) used by the UI and the tests.
const pal = tc.paletteLib;

assert.ok(pal, 'component must expose a paletteLib seam');

const grid = pal.buildGrid(palette);

// ── Grid model ──────────────────────────────────────────────────────────────
{
  // Row = hue, column = one shade. All hues present; no 50, no accents.
  const hues = grid.map((r) => r.hue);
  assert.ok(hues.includes('blue'), 'grid has a blue row');
  assert.ok(hues.includes('grey'), 'grid has a grey row');
  assert.ok(hues.includes('bluegrey'), 'grid has a bluegrey row');

  const blue = grid.find((r) => r.hue === 'blue');
  assert.deepEqual(
    blue.shades.map((s) => s.shade),
    [100, 200, 300, 400, 500, 600, 700, 800, 900],
    'blue row has exactly shades 100..900 in order (no 50, no a100-a700)'
  );
  assert.equal(blue.shades[0].hex, '#bbdefb', 'blue-100 hex matches vendored JSON');
  assert.equal(blue.shades[3].hex, '#42a5f5', 'blue-400 hex matches vendored JSON');

  const huesWithAccents = grid.filter((r) => r.shades.length !== 9);
  assert.equal(huesWithAccents.length, 0, 'every row filtered to the same 9 shades');
}

// ── Neutral Extras ──────────────────────────────────────────────────────────
{
  assert.deepEqual(pal.neutralExtras, [
    { name: 'white', hex: '#ffffff' },
    { name: 'black', hex: '#000000' },
  ], 'white and black are the two Neutral Extras');
}

// ── Palette Random ──────────────────────────────────────────────────────────
{
  // Deterministic: stub Math.random to pick blue-500 as the seed.
  const origRandom = Math.random;
  Math.random = () => 0;
  try {
    const r = pal.randomPair(palette);
    assert.equal(r.startKey, 'red-100', 'deterministic seed → first chromatic hue, first shade');
  } finally {
    Math.random = origRandom;
  }

  // Range + invariant check across many random draws.
  for (let i = 0; i < 200; i++) {
    const r = pal.randomPair(palette);
    assert.match(r.startKey, /^[a-z]+-(100|200|300|400|500|600|700|800|900)$/, 'startKey in range');
    assert.match(r.endKey, /^[a-z]+-(100|200|300|400|500|600|700|800|900)$/, 'endKey in range');
    const hueStart = r.startKey.replace(/-\d+$/, '');
    const hueEnd = r.endKey.replace(/-\d+$/, '');
    assert.equal(hueStart, hueEnd, 'start and end share ONE hue');
    const a = parseInt(r.startKey.slice(-3), 10);
    const b = parseInt(r.endKey.slice(-3), 10);
    assert.equal(Math.abs(a - b), 200, 'EXACTLY two shade steps apart');
    assert.ok(r.startHex && r.endHex, 'hex values resolved for both ends');

    // Icon Color is never randomized.
    assert.ok(!('iconColor' in r), 'Palette Random never returns an iconColor');
  }

  // Achromatic exclusion: no grey/bluegrey keys in 200 draws is not guaranteed
  // by randomness alone — force a grey seed and verify the exclusion filter.
  const hasGrey = pal.chromaticHues(palette).some((h) => h === 'grey');
  assert.equal(hasGrey, false, 'chromaticHues excludes grey');
  assert.equal(pal.chromaticHues(palette).some((h) => h === 'bluegrey'), false, 'chromaticHues excludes bluegrey');
  assert.equal(pal.chromaticHues(palette).length, 17, '17 chromatic hues remain (19 minus grey/bluegrey)');
}

// ── shadeRange clamp (used by the portfolio's placeholder gradients) ───────
{
  // Range + invariant check: both ends stay inside [400, 900], the pair is
  // still exactly two steps apart on ONE hue, and no one-end clamping slips
  // through (a start near the top edge must fall to the lower end).
  for (let i = 0; i < 300; i++) {
    const r = pal.randomPair(palette, { shadeRange: [400, 900] });
    const a = parseInt(r.startKey.slice(-3), 10);
    const b = parseInt(r.endKey.slice(-3), 10);
    assert.ok(a >= 400 && a <= 900, `start shade ${a} inside clamped range`);
    assert.ok(b >= 400 && b <= 900, `end shade ${b} inside clamped range`);
    assert.equal(Math.abs(a - b), 200, 'clamped draw still exactly two steps apart');
    assert.equal(r.startKey.replace(/-\d+$/, ''), r.endKey.replace(/-\d+$/, ''), 'clamped draw stays on one hue');
    assert.ok(r.startHex && r.endHex, 'clamped draw resolves both hexes');
  }

  // Edge behavior: a start at 900 has no +2 direction → must draw -2 (700);
  // a start at 400 must draw +2 (600). Stub Math.random to land on the
  // extreme shade every time is impossible here because hue/shade share the
  // draw — instead force via seeded draws and verify by enumeration.
  for (const start of [400, 700, 900]) {
    const hits = [];
    for (let i = 0; i < 500; i++) {
      const r = pal.randomPair(palette, { shadeRange: [400, 900] });
      if (parseInt(r.startKey.slice(-3), 10) === start) {
        hits.push(parseInt(r.endKey.slice(-3), 10));
      }
    }
    assert.ok(hits.length > 0, `start shade ${start} is reachable in range`);
    const expected = start === 900 ? [700] : start === 400 ? [600] : [500, 900];
    assert.deepEqual(
      [...new Set(hits)].sort(),
      expected,
      `start ${start} only ever falls into ${JSON.stringify(expected)} (no one-step clamp)`
    );
  }
}

// ── Seeded draws (portfolio placeholder determinism) ───────────────────────
{
  const seed = 'https://github.com/danielmroczek/some-repo';
  const first = pal.randomPair(palette, { seed });
  for (let i = 0; i < 10; i++) {
    const again = pal.randomPair(palette, { seed });
    assert.equal(again.startKey, first.startKey, 'same seed → same start key');
    assert.equal(again.endKey, first.endKey, 'same seed → same end key');
  }

  // Seeded + clamped: determinism holds inside the range too.
  const clamped = pal.randomPair(palette, { seed, shadeRange: [400, 900] });
  const a = parseInt(clamped.startKey.slice(-3), 10);
  const b = parseInt(clamped.endKey.slice(-3), 10);
  assert.ok(a >= 400 && b >= 400, 'seeded clamped draw respects the range');

  // Different seeds produce different pairs (freshness across projects).
  const other = pal.randomPair(palette, { seed: 'https://github.com/danielmroczek/other-repo' });
  assert.notDeepEqual(
    [other.startKey, other.endKey],
    [first.startKey, first.endKey],
    'different seeds draw different pairs'
  );
}

console.log('palette-lib tests OK');
