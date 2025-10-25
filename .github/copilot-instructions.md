# Favicon Creator - AI Coding Instructions

## Project Overview
Browser-based SVG favicon generator built with vanilla JavaScript. Single-page application with no build process - all files in `docs/` are served directly via GitHub Pages.

## Architecture

### Core Components
- **`docs/index.html`**: Main UI structure using Pico CSS framework
- **`docs/script.js`**: All application logic (icon management, SVG generation, file upload)
- **`docs/styles.css`**: Custom styles extending Pico CSS base

### Key Design Patterns

**1. SVG Generation & Manipulation**
- Preview SVG is dynamically built in `updatePreview()` using template strings
- Gradient angles calculated via trigonometry: `(angle - 90) * Math.PI / 180`
- Custom uploaded SVGs are parsed, stripped of fills, and re-styled with stroke properties

**2. Icon System (Lucide Integration)**
- Uses Lucide UMD library loaded from `https://unpkg.com/lucide@latest/dist/umd/lucide.js`
- All icons available in-memory via `lucide.icons` object (instant, no HTTP requests)
- Icon names converted from kebab-case to PascalCase for Lucide API: `arrow-right` → `ArrowRight`
- SVG content rendered directly from icon data structure `[tag, attrs, children]`
- `getAllLucideIcons()` extracts all icon names from `lucide.icons` and converts to kebab-case
- Popular icons (`popularIcons` array) shown by default; full search via debounced input
- Search debounce: 300ms timeout prevents excessive re-rendering
- **Instant loading**: No HTTP requests, all icons rendered from in-memory library
- **No caching needed**: Icon data already in memory, rendering is synchronous

**3. Stroke Width Scaling**
- Maintains visual consistency across different icon sizes
- Lucide icons (24x24 viewBox): `adjustedStrokeWidth = strokeWidth / (iconSize / 24)`
- Custom SVGs: `adjustedStrokeWidth = strokeWidth / scaleFactor` where scaleFactor preserves aspect ratio

**4. File Upload Flow**
```javascript
// Custom SVG upload sanitization:
1. Parse SVG with DOMParser
2. Extract only drawable elements (path, circle, rect, etc.)
3. Strip all fill/stroke attributes
4. Store in customIconSvg = { viewBox, elements }
5. Re-apply user-controlled stroke properties in updatePreview()
```

## Development Workflows

### Local Development
- **No build step required** - open `docs/index.html` directly in browser
- For testing: Use Python server `python -m http.server 8000` or VS Code Live Server extension
- All external dependencies loaded via CDN (Pico CSS, SVGO, Lucide)

### Deployment
- Automatic via GitHub Pages from `docs/` directory
- Update demo URL in `README.md` after forking/renaming repo

### Testing New Icons
1. Add icon name to `popularIcons` array for permanent inclusion
2. Or test via search functionality (uses Lucide CDN directly)

## Coding Conventions

### JavaScript
- **No module system**: All code in single `script.js` file with IIFE initialization
- **Async/await**: Used for icon loading (`getLucideIconSvg`, `getAllLucideIcons`)
- **Error handling**: Try-catch blocks with console warnings for failed icon loads
- **DOM refs**: All element references declared at top (e.g., `const previewSvg = ...`)

### SVG Construction
- Use template literals with proper XML namespacing
- Always include `xmlns="http://www.w3.org/2000/svg"` for embedded SVGs
- Rotation via transform attribute: `transform="rotate(${angle} ${centerX} ${centerY})"`

### State Management
- Current icon state: `currentIcon` (string) or `customIconSvg` (object)
- `customIconSvg = null` when switching back to Lucide icons
- All UI controls trigger `updatePreview()` + `updateValueDisplays()`

## External Dependencies

```javascript
// CDN-loaded libraries (defined in index.html):
- Pico CSS v2: Base styling framework
- SVGO v3: SVG optimization for download (with fallback if fails)
- Lucide: Icon system (loaded but icons fetched individually from unpkg.com)
```

## Common Tasks

### Adding New Icon Sources
Modify `getLucideIconSvg()` to support additional icon libraries. Ensure 24x24 viewBox or adjust stroke scaling logic.

### Changing Default Settings
Edit initial input values in `index.html`:
```html
<input type="color" id="color1" value="#3b82f6">  <!-- Default gradient start -->
<input type="range" id="icon-size" min="4" max="28" value="16">  <!-- Default icon size -->
```

### Modifying Download Format
Edit `downloadBtn` click handler in `script.js`. Current implementation:
- Optimizes with SVGO if available
- Falls back to raw SVG on error
- Downloads as `favicon.svg`

## Important Constraints

- **No TypeScript/Transpilation**: Pure vanilla JS for zero-config deployment
- **Browser Compatibility**: Relies on modern JS (async/await, template literals, fetch API)
- **CORS**: Icon fetching depends on CDN CORS policies (Lucide/unpkg allows cross-origin)

## File Locations

- **Source code**: `docs/` (directly served, not a build output)
- **No package.json**: Project has no Node dependencies
- **No tests**: Manual browser testing only
- **No CI/CD**: Deployment automatic via GitHub Pages settings
