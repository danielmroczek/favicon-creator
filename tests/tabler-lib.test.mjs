// Tests for lib/tabler-lib.js — the Tabler (Iconify) integration helpers.
//
// Tabler is the SECOND icon family alongside Lucide. The FULL collection
// (@iconify-json/tabler) is fetched ONCE from jsDelivr into memory — the
// same architecture as Lucide's bundled UMD (one resource, in-memory
// after). No per-icon requests: no rate limits, no CORS-opaque 429s, no
// retry storms. SVG bodies are stroke-based with stroke-width="2" in a
// 24×24 viewBox — the same basis as Lucide, so the Stroke Width slider
// drives the REAL stroke directly and path merging works exactly like
// Lucide. `-filled` names are excluded from the catalog (fill-baked
// contours ignore the Stroke Width slider).
//
// Run:  node tests/tabler-lib.test.mjs
import assert from 'node:assert/strict';

const mainWindow = {};
globalThis.window = mainWindow;

await import('../docs/lib/tabler-lib.js');
const lib = mainWindow.faviconTablerLib;
assert.ok(lib, 'library did not expose window.faviconTablerLib');

// ── collectionUrl: one big JSON from jsDelivr (CORS: *, gzip ~400KB) ────────
{
  assert.equal(
    lib.collectionUrl(),
    'https://cdn.jsdelivr.net/npm/@iconify-json/tabler@1/icons.json',
    'pinned jsDelivr collection URL',
  );
}

// ── catalogNames: icons + aliases, minus `-filled`, sorted ──────────────────
{
  const json = {
    icons: {
      star: { body: '<path.../>' },
      'star-filled': { body: '<path.../>' },
      home: { body: '<path.../>' },
    },
    aliases: {
      'star-badge': { parent: 'star' },
      'custom-filled': { parent: 'star' },
      // Alias whose NAME does not end in `-filled` but whose parent IS a
      // filled icon: fill-baked contours — must also be excluded.
      'star-badge-soft': { parent: 'star-filled' },
      // Alias pointing at a filled parent but carrying its OWN stroke-based
      // body: the override wins, it stays searchable.
      'star-badge-plus': { parent: 'star-filled', body: '<path stroke-width="2" d="..."/>' },
    },
  };
  assert.deepEqual(
    lib.catalogNames(json),
    ['home', 'star', 'star-badge', 'star-badge-plus'],
    'icon names + alias names; `-filled` excluded by name AND by resolved parent, sorted',
  );
  assert.deepEqual(lib.catalogNames(null), [], 'missing collection → empty');
}

// ── resolveMarkup: body lookup across icons and aliases ─────────────────────
{
  const json = {
    icons: {
      star: { body: '<path stroke-width="2" d="..."/>' },
      home: { body: '<g stroke-width="2">...</g>' },
    },
    aliases: {
      // Alias that only points at a parent icon (no own body)
      'star-badge': { parent: 'star' },
      // Alias with its OWN body override
      'home-2': { parent: 'home', body: '<path d="custom"/>' },
    },
  };
  assert.equal(lib.resolveMarkup(json, 'star'), json.icons.star.body, 'plain icon → own body');
  assert.equal(lib.resolveMarkup(json, 'star-badge'), json.icons.star.body, 'parent-only alias → parent body');
  assert.equal(lib.resolveMarkup(json, 'home-2'), '<path d="custom"/>', 'alias with own body → own body wins');
  assert.equal(lib.resolveMarkup(json, 'nope'), undefined, 'unknown name → undefined');
  assert.equal(lib.resolveMarkup(null, 'star'), undefined, 'collection not loaded → undefined');
}

// ── stripStrokeWidth: inline attribute must not override inheritance ────────
{
  const body = '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.5 12.6L12 20"/>';
  assert.equal(
    lib.stripStrokeWidth(body),
    '<path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M19.5 12.6L12 20"/>',
    'removes the inline stroke-width="2" (real Iconify body shape)',
  );
  assert.equal(lib.stripStrokeWidth('<g stroke-width="1.5"><path stroke-width="2"/></g>'),
    '<g><path/></g>', 'removes every occurrence, not just the first');
  assert.equal(lib.stripStrokeWidth('<path fill="none"/>'), '<path fill="none"/>',
    'markup without stroke-width is unchanged');
  assert.equal(lib.stripStrokeWidth(undefined), '', 'undefined → empty string (caller falls back)');
  // End-to-end through resolveMarkup: an alias with its own body override
  // (which may carry an inline stroke-width) gets stripped just like a
  // direct icon body.
  const json = {
    icons: { star: { body } },
    aliases: { 'star-badge': { parent: 'star' }, custom: { parent: 'star', body: '<path stroke-width="2" d="z"/>' } },
  };
  for (const name of ['star', 'star-badge', 'custom']) {
    assert.ok(
      !lib.stripStrokeWidth(lib.resolveMarkup(json, name)).includes('stroke-width'),
      `${name}: resolved+stripped markup carries no inline stroke-width`,
    );
  }
}

console.log('tests/tabler-lib.test.mjs — all assertions passed');
