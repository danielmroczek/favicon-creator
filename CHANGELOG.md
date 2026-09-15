# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Material color palette picker: all three colors (Start, End, Icon) are now
  chosen from a swatch grid built from the Material Colors palette
  (vendored at `docs/lib/material-colors.js`, shades 100–900 only), with
  white and black as neutral extras (`tests/palette-lib.test.mjs`).
- Shared swatch grid in a new "Colors" section: three color-target rows
  (ring marks the active target) write to one shared grid.
- 🎲 Random palette button + randomized defaults: background pair is drawn
  from one chromatic hue, exactly two shade steps apart (direction limited
  to valid shades); Icon Color is never randomized.
- Role badges on swatches: a swatch already assigned to a color target shows
  a small `S` (Start), `E` (End) and/or `I` (Icon) letter.
- **Mouse mode** (default on load): with no color target pinned, a swatch
  click uses the mouse button to pick the target — left = Start, right =
  End, middle = Icon. Pinned-mode (click a target row) still writes only to
  that target; clicking it again releases back to mouse mode.

### Changed
- **BREAKING**: Native free-form color pickers (`<input type="color">`) have
  been removed — colors are limited to the vendored Material palette plus
  white/black. Custom hex values are no longer selectable.
- Default `iconColor` changed from `#f5f5f5` to `#ffffff` (neutral white).
- Default background colors are now randomized on every page load instead of
  fixed to blue/violet.
- White/black neutral extras now appear **last** in the swatch grid (was
  first).
- Color target rows are compact side-by-side buttons labelled Start / End /
  Icon; an active target is highlighted with the primary ring.
