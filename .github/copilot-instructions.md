# Favicon Creator - AI Coding Instructions

## Project Overview
Browser-based SVG favicon generator built with **Alpine.js** and vanilla JavaScript. Single-page application with no build process - all files in `docs/` are served directly via GitHub Pages.

## Architecture

### Core Components
- **`docs/index.html`**: Main UI structure using Pico CSS framework with Alpine.js directives
- **`docs/script.js`**: Alpine.js component (`faviconCreator()`) with reactive state and methods
- **`docs/styles.css`**: Custom styles extending Pico CSS base
- **`docs/lib/path-lib.js`**: Pure path helpers — shape→path conversion, transform parsing, matrix baking (via svgpath)
- **`docs/lib/favicon.js`**: Canonical favicon string builder (`buildFaviconSvg`) — the single seam used by BOTH preview and download

### Key Design Patterns

**1. Alpine.js Reactive State**
- Main container uses `x-data="faviconCreator()"` to initialize the component
- All state properties are reactive (color1, color2, gradientAngle, iconSize, etc.)
- Computed properties: `displayedIcons` (filtered icon list), `previewSvg` (SVG generation)
- `$watch` automatically updates favicon when previewSvg changes
- No manual DOM manipulation - Alpine.js handles all updates

**2. Canonical SVG Generation (see ADR 0004 in danielmroczek.github.io)**
- `previewSvg` computed property delegates to `buildFaviconSvg()` in `lib/favicon.js`
- Output is a canonical favicon: 32×32 root, one `<linearGradient>`, background `<rect>`, and a single `<path id="icon">` with ALL transforms baked into path data (no `transform` attributes — the format forbids them)
- Stroke-based Lucide icons merge into ONE path (subpaths concatenated in `d`); filled shapes stay separate so merging can't change their silhouette
- The preview renders the exact string the download writes — they can never drift
- Canonical assembly lives in `lib/` — `script.js` only collects and classifies shapes
- Transform baking uses the vendored `svgpath.min.js` IIFE (upstream has no UMD build, so it cannot be CDN-loaded)

**3. Icon System (Lucide Integration)**
- Uses Lucide UMD library loaded from `https://unpkg.com/lucide@latest/dist/umd/lucide.js`
- All icons available in-memory via `lucide.icons` object (instant, no HTTP requests)
- Icon names converted from kebab-case to PascalCase for Lucide API: `arrow-right` → `ArrowRight`
- SVG content rendered directly from icon data structure `[tag, attrs, children]`
- `getAllLucideIcons()` extracts all icon names from `lucide.icons` and converts to kebab-case
- Popular icons (`popularIcons` array) shown by default; full search via reactive `iconSearch` property
- **Icon grid**: Uses `x-for` template to render icons from `displayedIcons` computed property
- **Instant loading**: No HTTP requests, all icons rendered from in-memory library
- **No debouncing needed**: Alpine.js reactivity is fast enough for instant search

**4. Stroke Width Scaling**
- Maintains visual consistency across different icon sizes
- Lucide icons (24x24 viewBox): `adjustedStrokeWidth = strokeWidth / (iconSize / 24)`
- Custom SVGs: `adjustedStrokeWidth = strokeWidth / scaleFactor` where scaleFactor preserves aspect ratio

**5. Alpine.js Directives Used**
- `x-data`: Initialize component state on main container
- `x-model`: Two-way binding for all input controls (colors, sliders, select)
- `x-model.number`: Numeric bindings for range inputs
- `x-text`: Display reactive values (e.g., `x-text="gradientAngle + '°'"`)
- `x-html`: Render dynamic SVG content (`previewSvg`, icon grid items)
- `@click`: Handle click events (icon selection, center button, download)
- `@input`: Removed (not needed with x-model)
- `@change`: Removed (not needed with x-model)
- `@dragover.prevent`, `@dragleave`, `@drop.prevent`: File upload drag-and-drop
- `x-ref`: Reference file input element for programmatic click
- `x-for`: Loop through displayedIcons to render icon grid
- `x-show`: Conditionally show "no icons" message or icon count
- `:class`: Dynamically toggle 'selected' class on icons
- `$watch`: Monitor previewSvg changes to update favicon

## Development Workflows

### Local Development
- **No build step required** - open `docs/index.html` directly in browser
- For testing: Use Python server `python -m http.server 8000` or VS Code Live Server extension
- External dependencies via CDN (Pico CSS, Lucide, Alpine.js); svgpath is vendored as an IIFE at `docs/svgpath.min.js` (no upstream UMD build exists, so it cannot be CDN-loaded). SVGO was removed — its `removeViewBox`/`removeDimensions` plugins strip attributes the canonical favicon format requires (ADR 0004 in danielmroczek.github.io).
- Alpine.js devtools available in browser for debugging reactive state

### Deployment
- Automatic via GitHub Pages from `docs/` directory
- Update demo URL in `README.md` after forking/renaming repo

### Testing New Icons
1. Add icon name to `popularIcons` array for permanent inclusion
2. Or test via search functionality (uses Lucide CDN directly)

## Coding Conventions

### Alpine.js
- **Component structure**: Single `faviconCreator()` function returns object with state and methods
- **Reactive properties**: Declared at top level of returned object
- **Computed properties**: Use getters (`get displayedIcons()`, `get previewSvg()`)
- **Methods**: Regular functions on the returned object
- **Initialization**: Use `init()` method for setup and watchers
- **No template refs**: Alpine.js manages DOM updates automatically
- **State access**: Use `this.propertyName` in component methods

### JavaScript
- **No module system**: All code in single `script.js` file (Alpine.js component function)
- **No async for icon loading**: Lucide icons loaded synchronously from in-memory library
- **Error handling**: Try-catch blocks with console warnings for failed icon loads
- **Computed SVG**: Template literals with proper XML namespacing

### HTML with Alpine.js
- Use `x-model` for all form inputs (not id-based selection)
- Use `x-for` for dynamic lists (icon grid)
- Use `x-html` for rendering dynamic HTML content
- Use `@event` shorthand instead of `x-on:event`
- Use `:attribute` shorthand instead of `x-bind:attribute`

### SVG Construction
- Use template literals with proper XML namespacing
- Always include `xmlns="http://www.w3.org/2000/svg"` for embedded SVGs
- NEVER emit `transform` attributes — all placement/rotation/scale is baked into path coordinates via `lib/` (canonical format rule 6)

### State Management
- Current icon state: `currentIcon` (string) or `customIconSubpaths` (object with `{strokeSubpaths, fillSubpaths}`)
- `customIconSubpaths = null` when switching back to Lucide icons
- All UI controls automatically trigger preview updates via Alpine.js reactivity

## External Dependencies

```javascript
// CDN-loaded libraries (defined in index.html):
- Pico CSS v2: Base styling framework
- Lucide UMD: Icon system (all icons loaded in-memory)
- Alpine.js 3.x: Reactive framework for UI and state management
// Vendored (docs/svgpath.min.js — no upstream UMD build):
- svgpath: bakes transform matrices into path data
```

## Common Tasks

### Adding New Icon Sources
Modify `getLucideIconSvg()` to support additional icon libraries. Ensure 24x24 viewBox or adjust stroke scaling logic.

### Changing Default Settings
Edit initial property values in `faviconCreator()` function:
```javascript
return {
    color1: '#3b82f6',  // Default gradient start
    iconSize: 22,       // Default icon size
    // ...
}
```

### Modifying Download Format
Edit `downloadFavicon()` method in `script.js`. Current implementation:
- Optimizes with SVGO if available
- Falls back to raw SVG on error
- Downloads as `favicon.svg`

### Adding New Reactive Properties
1. Add property to component's return object
2. Use `x-model` in HTML for two-way binding
3. Property automatically triggers preview updates via `$watch`

## Important Constraints

- **No TypeScript/Transpilation**: Pure vanilla JS with Alpine.js for zero-config deployment
- **Browser Compatibility**: Requires modern JS (ES6+ for Alpine.js, getters, template literals)
- **CORS**: Icon fetching depends on CDN CORS policies (Lucide/unpkg allows cross-origin)
- **Alpine.js Version**: Using v3.x from CDN with `defer` attribute

## File Locations

- **Source code**: `docs/` (directly served, not a build output)
- **No package.json**: Project has no Node dependencies
- **No tests**: Manual browser testing only
- **No CI/CD**: Deployment automatic via GitHub Pages settings
- **Backup**: `docs/script-vanilla.js` contains original vanilla JS implementation
