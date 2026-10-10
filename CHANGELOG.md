# Changelog

## 2026-10-10

- **Added: load favicons back into the creator.** A new **Load favicon.svg**
  button (next to Download) and drag-and-drop onto the preview restore a
  previously generated favicon: every slider, color and the icon itself are
  read from the `fc:*` `<metadata>` embedded in the file (ADR 0007).
  Icons of the Lucide/Tabler families are restored exactly; `custom` family
  files restore only colors/geometry (their source is no longer in the
  catalog). Files without favicon-creator metadata change nothing.
- **Removed: custom SVG upload.** The "Custom Icon Upload" section
  (click/drag-and-drop file input) is gone; the app now works exclusively
  with the built-in Lucide + Tabler icon families. `fc:iconFamily` values
  `custom` remain valid in the canonical format (readers keep working) but
  the UI no longer produces them.
- **Gradient Angle zero reindex** (breaking for metadata readers): the
  user-facing 0° is now the classic diagonal (top-left → bottom-right —
  formerly displayed as 315°). Same visuals, same layout, just a friendlier
  zero point; the slider's default value is 0 and `fc:gradientAngle` is
  omitted from metadata only at 0. Values emitted in metadata keep their
  user-facing meaning.
- Fixed: Tabler tiles in the icon search grid ignored the Stroke Width
  slider. Tabler bodies carry an INLINE `stroke-width="2"` attribute which
  overrides the grid wrapper's inherited value; the new
  `faviconTablerLib.stripStrokeWidth()` helper removes it before rendering,
  so tiles AND previews of both families now track the slider.

- **Stroke Width is always ABSOLUTE** (breaking): the "Absolute Stroke
  Width" checkbox is gone — the stroke-width attribute is now written to
  the output as-is, a constant canvas thickness regardless of Icon Size
  (the old default behaviour scaled the stroke with the icon). The Stroke
  Width slider now steps in **0.25** increments (min 0.5, max 4). Metadata
  field `fc:absoluteStrokeWidth` removed (ADR 0007).
- **Center-based icon placement** (breaking): the icon is always centered on
  the 32×32 canvas; the X/Y sliders are now **offsets from the center**
  (−24..24 px, default 0 = perfectly centered — the slider's midpoint). The
  "Center Icon" button and the two-column X/Y layout are gone (full-width
  sliders instead).
- **Icon Size = artwork's MAXIMUM dimension** (breaking): the fit target is the
  **measured bounding box of the actual artwork** (new `pathBBox` in
  `lib/path-lib.js`), not the declared viewBox — Tabler `-small`/`-xs` glyphs
  (drawn intentionally tiny inside the 24×24 grid) now fill the slider value,
  and non-square artwork keeps its aspect ratio around the center (2:3 logo at
  24 renders 16×24, centered). The contract is GEOMETRIC: the bounding box of
  the artwork's path data is sized to the slider value — stroke ink (round/
  square linecaps, thick strokes on tiny glyphs) can extend up to half a stroke
  width past the box and is not part of the fit. Lucide/Tabler regular icons are
  unaffected (full-
  24 artwork → same scale as before). Fallback to the declared `viewBox`
  (`iconBasis` from `parseViewBoxBasis`) when artwork measurement is impossible.
- Metadata `fc:iconX`/`fc:iconY` defaults changed from `4` to `0`
  (offset semantics) — serialized only when non-zero, as before (ADR 0007).

## 2026-10-02

- Icon metadata expanded: nine edit-state fields (`gradientAngle`, `borderRadius`, `strokeWidth`, `strokeLinecap`, `absoluteStrokeWidth`, `iconX`, `iconY`, `iconSize`, `iconRotation`) are now emitted in `<metadata>` **only when they differ from the UI default**, keeping metadata compact for the common case (ADR 0007).

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
