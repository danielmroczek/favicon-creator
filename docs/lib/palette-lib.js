// Palette lib: the Material-palette grid model + Palette Random rule,
// shared between the Favicon Creator UI and the portfolio's project
// generator (which loads this file from raw.githubusercontent.com "like a
// CDN" and runs it in Node).
//
// Pure functions over a palette passed in (key→hex map, e.g. the vendored
// window.materialColors) — no DOM, no dependency on the vendored JSON, so
// the same file works in the browser and under Node.
//
// IIFE, no module system: sets window.faviconPaletteLib.
(() => {
  "use strict";

  // Material shade axis — 100–900 only (no 50, no a100–a700).
  // See favicon-creator CONTEXT.md ("Shade").
  const SHADES = [100, 200, 300, 400, 500, 600, 700, 800, 900];

  /** The two swatches outside the formal palette, displayed last. */
  const neutralExtras = [
    { name: "white", hex: "#ffffff" },
    { name: "black", hex: "#000000" },
  ];

  /**
   * Grid model: one row per hue, columns = shades 100–900.
   * @param {object} palette key→hex map (vendored material colors)
   */
  const buildGrid = (palette) => {
    const rows = new Map();
    for (const [key, hex] of Object.entries(palette)) {
      const m = key.match(/^(.*)-(\d+)$/);
      if (!m) continue;
      const [, hue, shadeStr] = m;
      const shade = Number.parseInt(shadeStr, 10);
      if (!SHADES.includes(shade)) continue; // no 50, no accents
      if (!rows.has(hue)) rows.set(hue, []);
      rows.get(hue).push({ shade, hex });
    }
    return [...rows.keys()]
      .sort()
      .map((hue) => ({
        hue,
        shades: rows.get(hue).sort((a, b) => a.shade - b.shade),
      }));
  };

  /**
   * Hue names with saturation (excludes grey/bluegrey) — the pool
   * Palette Random draws from.
   */
  const chromaticHues = (palette) =>
    [...new Set(Object.keys(palette)
      .filter((k) => /^.*-\d+$/.test(k))
      .map((k) => k.replace(/-\d+$/, "")))]
      .filter((hue) => hue !== "grey" && hue !== "bluegrey");

  const pick = (entries) => entries[Math.floor(Math.random() * entries.length)];

  /**
   * FNV-1a 32-bit hash — documented, stable across engines. Used to turn
   * a seed string into uniform index draws without a full RNG.
   */
  const fnv1a = (str) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  };

  /** Uniform index into [0, n) from a seeded draw name. */
  const seededIndex = (seed, name, n) => fnv1a(`${seed}:${name}`) % n;

  /**
   * Palette Random: same hue, start shade ± exactly TWO steps, direction
   * drawn only from directions that keep BOTH ends inside the shade range —
   * never clamped to a one-step draw.
   *
   * @param {object} palette key→hex map
   * @param {object} [opts]
   * @param {[number, number]} [opts.shadeRange=[100,900]] clamp BOTH colors
   *   to this inclusive shade range; the start is drawn only from shades in
   *   range and the end must also stay inside it.
   * @param {string} [opts.seed] deterministic seed (e.g. a repo URL). With a
   *   seed the draw is reproducible — same seed, same pair. Without one,
   *   Math.random() is used (browser Palette Random behavior).
   * @returns {{startKey,startHex,endKey,endHex}} resolved pair.
   *   Icon Color is never randomized.
   */
  const randomPair = (
    palette,
    { shadeRange = [SHADES[0], SHADES.at(-1)], seed } = {},
  ) => {
    const hueList = chromaticHues(palette);
    const shadeList = SHADES.filter((s) => s >= shadeRange[0] && s <= shadeRange[1]);
    if (hueList.length === 0 || shadeList.length === 0) {
      throw new Error(`palette-lib: empty hue or shade list for range ${JSON.stringify(shadeRange)}`);
    }

    const hasSeed = typeof seed === "string" && seed.length > 0;

    let hue, shadeIdx;
    if (hasSeed) {
      hue = hueList[seededIndex(seed, "hue", hueList.length)];
      shadeIdx = seededIndex(seed, "shade", shadeList.length);
    } else {
      hue = pick(hueList);
      shadeIdx = Math.floor(Math.random() * shadeList.length);
    }

    const dirs = [];
    if (shadeIdx + 2 < shadeList.length) dirs.push(+1);
    if (shadeIdx - 2 >= 0) dirs.push(-1);
    // A range holding at least 3 shades always leaves one valid direction.
    const dirIdx = dirs.length
      ? (hasSeed
        ? seededIndex(seed, "dir", dirs.length)
        : Math.floor(Math.random() * dirs.length))
      : 0;

    const startShade = shadeList[shadeIdx];
    const endShade = shadeList[shadeIdx + dirs[dirIdx] * 2];

    const startKey = `${hue}-${startShade}`;
    const endKey = `${hue}-${endShade}`;
    return { startKey, startHex: palette[startKey], endKey, endHex: palette[endKey] };
  };

  window.faviconPaletteLib = {
    SHADES,
    neutralExtras,
    buildGrid,
    chromaticHues,
    pick,
    randomPair,
    fnv1a,
  };
})();
