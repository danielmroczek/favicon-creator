# Context — Favicon Creator

## Glossary

### Color Target
One of the three color destinations in the UI: **Start Color** (`color1`),
**End Color** (`color2`), and **Icon Color** (`iconColor`). Each holds exactly
one color, always chosen from the Material Palette or the Neutral Extras.

### Active Target
The Color Target that the shared Swatch Grid currently writes to. Clicking a
target's row makes it active (shown by a ring); clicking it again releases it.
When **no** target is active (the default on page load), the grid runs in
*mouse mode*: each swatch click targets a color by mouse button — left =
Start Color, right = End Color, middle = Icon Color.

### Role Badge
The small letter(s) shown inside a Swatch that is already in use: `S`
(Start Color), `E` (End Color), `I` (Icon Color). Letters are joined tightly
(e.g. `SEI` when all three targets share one color) so the grid never
reflows.

### Swatch
A single square color cell in the grid. Its value comes either from the
Material Palette (a Hue + Shade) or from the Neutral Extras. Hovering shows
the underlying name (e.g. `blue-500`).

### Neutral Extras
White (`#ffffff`) and black (`#000000`) — the two swatches that sit outside
the formal Material Palette, displayed last in the grid. Icon Color defaults
to white.

### Hue Row Order
The vertical order of hue rows in the Swatch Grid is shuffled at random on
every page load (shades within each row stay sorted 100–900, and the Neutral
Extras always stay last) so the palette never presents the same layout twice.

### Shade
A Material lightness level. The grid offers only `100–900` in steps of 100 —
no `50` and no accent levels (`a100`–`a700`).

### Chromatic Hue
A Material hue with saturation (anything except `grey` and `bluegrey`).
Achromatic hues appear in the grid but are excluded from Palette Random.

### Material Palette
The vendored color set from the Carbon Material Colors JSON, reduced to the
`100–900` shades. Stored locally in `docs/lib/` (no runtime fetch).

### Palette Random
Randomizes **only** the background pair (Start + End Color), never the Icon
Color. Rules:

1. Pick a random Chromatic Hue and a random Shade for the Start Color.
2. The End Color is the **same** Hue, two Shade steps away (e.g. `blue-600`
   → `blue-400`), with the up/down direction chosen randomly from the
   directions that keep the result within `100–900`.

### Icon Metadata
An optional `<metadata>` element in the generated SVG carrying namespaced
XML children (`fc:` prefix, namespace `https://danielmroczek.github.io/favicon-creator`)
with icon genesis and edit-state information. Five fields are always emitted
(`iconFamily`, `iconName`, `gradientStart`, `gradientEnd`, `iconColor`);
eight conditional fields (`gradientAngle`, `borderRadius`, `strokeWidth`,
`strokeLinecap`, `iconX`, `iconY`, `iconSize`,
`iconRotation`) are emitted only when non-default. Informational only — not
a round-trip contract (ADR `0007` in danielmroczek.github.io).
_Avoid_: Favicon metadata, SVG metadata, icon info

### Icon Family
The icon source family of the current selection: `lucide` (bundled UMD,
in-memory), `tabler` (full Iconify collection JSON fetched once from jsDelivr,
then in-memory), or `custom`
(uploaded SVG). Grid identifiers are family-prefixed (`lucide:heart`,
`tabler:heart`) so both families can share one search grid without name
collisions; tiles carry an `L`/`T` badge and, for Tabler, preview the current
Stroke Width. Recorded in the favicon metadata as `fc:iconFamily`. Only the
bare name is recorded — the outline thickness comes from the Stroke Width
slider at render time, from the real stroke (Tabler markup is stroke-based
in a 24×24 viewBox, so no weight variants or normalization are involved).
_Avoid_: Icon library, icon source, icon set
