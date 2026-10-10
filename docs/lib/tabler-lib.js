// Tabler icon family helpers — the second icon family alongside Lucide.
//
// The FULL Tabler collection (@iconify-json/tabler, ~2 MB / ~400 KB gzipped)
// is fetched ONCE from jsDelivr into memory — the same architecture as
// Lucide's bundled UMD (one resource, in-memory afterwards). There are NO
// per-icon requests, which eliminates the whole class of problems the
// per-icon Iconify endpoint had: rate limits (Cloudflare 429), CORS-opaque
// error responses, retry storms, tiles stuck on placeholders.
//
// Tabler SVG bodies are stroke-based with stroke-width="2" in a 24×24
// viewBox — identical basis to Lucide. Bodies MUST be passed through
// stripStrokeWidth() before rendering: every shape carries an INLINE
// stroke-width="2" attribute that would override the wrapper's inherited
// attrs (see lib/favicon.js stroke-ink contract), pinning both tiles and
// previews to thickness 2. Stripping it lets the Stroke Width slider drive
// the stroke for BOTH families. `-filled` names are excluded from the
// catalog (fill-baked contours ignore the Stroke Width slider).
//
// Exposed as window.faviconTablerLib so tests exercise the same code the
// Alpine component uses.
(function () {
  'use strict';

  const POPULAR = [
    'home',
    'heart',
    'star',
    'user',
    'mail',
    'phone',
    'world',
    'settings',
  ];

  /** jsDelivr collection JSON (pinned major — stable, CORS: *). */
  function collectionUrl() {
    return 'https://cdn.jsdelivr.net/npm/@iconify-json/tabler@1/icons.json';
  }

  /** True when the RESOLVED rendering for `name` is fill-baked: either the
   * name itself ends in `-filled`, or it is an alias (without its own body)
   * whose resolved parent is a `-filled` icon. Fill-baked contours ignore
   * the Stroke Width slider, so they never enter the searchable catalog. */
  function isFillBaked(collectionJson, name) {
    if (/-filled$/.test(name)) return true;
    const entry = (collectionJson.aliases || {})[name];
    if (!entry || entry.body) return false;
    return /-filled$/.test(entry.parent || '');
  }

  /**
   * Searchable catalog from a collection JSON: icon names + alias names,
   * EXCLUDING fill-baked entries, sorted. Aliases are tabler's alternative
   * names for the same icons (e.g. historical renames) — searchable, but
   * resolution goes through resolveMarkup.
   */
  function catalogNames(collectionJson) {
    if (!collectionJson) return [];
    const iconNames = Object.keys(collectionJson.icons || {});
    const aliasNames = Object.keys(collectionJson.aliases || {});
    return [...iconNames, ...aliasNames]
      .filter((n) => !isFillBaked(collectionJson, n))
      .sort();
  }

  /**
   * Inner SVG markup for one bare name: the icon's body, a parent-only
   * alias's parent body, or an alias's own body override (aliases may
   * carry a customized body). undefined when the name doesn't resolve.
   */
  function resolveMarkup(collectionJson, name) {
    if (!collectionJson || !name) return undefined;
    const entry = (collectionJson.icons || {})[name]
      || (collectionJson.aliases || {})[name];
    if (!entry) return undefined;
    if (entry.body) return entry.body;
    const parent = entry.parent;
    return parent ? (collectionJson.icons || {})[parent]?.body : undefined;
  }

  /**
   * Strip the INLINE stroke-width attribute from Tabler markup so wrapper
   * inheritance drives the stroke (Lucide inner markup carries no such
   * attribute — see lib/favicon.js stroke-ink contract).
   */
  function stripStrokeWidth(markup) {
    return (markup || '').replace(/ stroke-width="[^"]*"/g, '');
  }

  /** Case-insensitive substring search over bare names. Empty query → []. */
  function searchNames(bareNamesList, query) {
    const term = (query || '').toLowerCase().trim();
    if (term === '') return [];
    return bareNamesList.filter((n) => n.toLowerCase().includes(term));
  }

  window.faviconTablerLib = {
    popularTablerIcons: POPULAR,
    collectionUrl,
    catalogNames,
    resolveMarkup,
    stripStrokeWidth,
    searchNames,
  };
})();
