# Changelog

## 2026-09-30

- Favicons now embed icon metadata in a `<metadata>` element (namespaced XML, `fc:` prefix): `iconFamily`, `iconName`, `gradientStart`, `gradientEnd`, `iconColor`. Informational only (ADR 0007).
- Added metadata assertions to the tests (XML namespace, null handling).

## 2026-09-25

- Fixed stroke width scaling: shrinking the icon made the stroke look proportionally thicker (double compensation — the attribute was pre-divided by the scale factor even though the baked matrix already scales it). The baked stroke is now `strokeWidth · scale` canvas units; `minDotRadius` follows the same convention.
- New **Absolute Stroke Width** toggle (like Lucide's): constant canvas stroke thickness regardless of Icon Size. Default off — the stroke scales with the icon.
- Updated README with the stroke scaling convention.

## 2026-09-19

- Layout rework: sticky app header and dashboard-style grid.

## 2026-09-18

- Swatch grid hue row order is shuffled on every page load (shades stay sorted 100–900 within each row; neutrals always last).

## 2026-09-17

- Palette logic extracted to `docs/lib/palette-lib.js` (IIFE, like the other `lib/*.js` files). `randomPair` gained `shadeRange` (clamped) and `seed` (deterministic FNV-1a draw) options; the UI keeps the default full range. The lib is also consumed externally by the portfolio's project generator.

## 2026-09-16

- Pretty-print emitted SVG: one element per line.
- 🎲 random palette button moved into the "Colors" section header as a compact icon button.
- Clamped tiny filled circles to a minimum radius for favicon legibility.

## 2026-09-15

- Emit the canonical favicon format: a single `<path id="icon">` with all transforms baked into the path data.
- Default icon size 24, centered on the 32x32 canvas.
- Colors chosen from a vendored Material Colors palette instead of free-form color pickers (**breaking**: custom hex values no longer available). Shared swatch grid for three color targets, role badges (S/E/I), mouse mode (left/right/middle click when no target is pinned) and a 🎲 button drawing the background pair from one hue. White/black neutrals always last.
- Default icon color changed to `#ffffff`; background randomized on every page load.
- Added agent instructions: issue tracking, triage labels, domain docs.

## 2025-10-25

- Refactor to Alpine.js: reactive state, computed preview SVG and filtered icon list, icon positioning controls.
- Optimized SVG loading from the Lucide library; README updated.

## 2025-07-26

- Icon search placeholder now mentions Lucide icons.

## 2025-07-03

- Added a README with features and usage instructions.

## 2025-06-28

- Minor code cleanup.

## 2025-06-27

- Fixes for uploaded-SVG controls and `stroke-linecap`.

## 2025-06-26

- Custom SVG upload with path extraction.
- Fixes: SVG upload and rotation, stroke width and fill for uploaded SVGs, Lucide icon color and `stroke-linecap`.

## 2025-06-22

- Refactor: use Lucide icon references.

## 2025-06-21

- Initial favicon generator (started from vite_react_shadcn_ts).
- Fixes: color preview visibility and icon centering.
- Enhanced icon customization and preview.
