// Alpine.js component for Favicon Creator.
//
// Architecture note: ALL canonical-favicon assembly lives in lib/favicon.js
// (buildFaviconSvg) and lib/path-lib.js (shape→path conversion + transform
// baking). This component collects Lucide/Tabler shapes, normalizes
// them into subpath lists, and delegates (Tabler markup is fetched per-icon
// from the Iconify Tabler collection (loaded once from jsDelivr into the
// in-memory tablerCollection) — naming/URL helpers live in lib/tabler-lib.js). Preview and download render THE
// SAME STRING, so they can never drift apart.
function faviconCreator() {
    // Material shade axis for the color grid — 100–900 only (no 50,
    // no a100–a700 accents). See CONTEXT.md ("Shade").
    const SHADES = [100, 200, 300, 400, 500, 600, 700, 800, 900];
    // Lucide's "paint dot" circles use r=".5" — a 1-unit diameter dot. In the
    // 24-unit icon space that's sub-pixel on a 32px canvas (~0.4px at the
    // default 24px icon size), so the palette swatches render as a near-
    // invisible smudge. Small FILLED circles are bumped up to a minimum radius
    // so decorative dots stay legible at favicon scale. The minimum tracks the
    // Stroke Width slider (see minDotRadius()) so dots grow and shrink with
    // the outline. Stroke-based shapes are untouched.
    // Palette Random draws its background pair from window.materialColors
    // (vendored lib/material-colors.js, loaded before this script). The
    // palette logic itself lives in lib/palette-lib.js (window.faviconPaletteLib,
    // loaded before this script) — the shared seam also used by the
    // portfolio's project generator.
    const palette = (typeof window !== 'undefined' && window.materialColors) || {};
    // The component keeps its paletteLib seam (tests and UI reach it through
    // ctx.paletteLib.*) by delegating to the shared lib.
    const sharedLib = (typeof window !== 'undefined' && window.faviconPaletteLib) || null;
    const paletteLib = sharedLib ? {
        SHADES,
        neutralExtras: sharedLib.neutralExtras,
        buildGrid: (p) => sharedLib.buildGrid(p),
        chromaticHues: (p) => sharedLib.chromaticHues(p),
        pick: sharedLib.pick,
        randomPair: (p, opts) => sharedLib.randomPair(p, opts),
    } : null;

    /**
     * Split a family-prefixed icon id ("lucide:heart", "tabler:star") into
     * { family, bare }. A legacy un-prefixed id is treated as Lucide. Single
     * home of the id convention — used by the grid, selection and metadata.
     */
    const parseIconId = (iconId) => {
        const sep = iconId.indexOf(':');
        return sep === -1
            ? { family: 'lucide', bare: iconId }
            : { family: iconId.slice(0, sep), bare: iconId.slice(sep + 1) };
    };

    return {
        color1: '#2196f3',   // replaced by randomPalette() in init()
        color2: '#1e88e5',
        gradientAngle: 0,    // user-facing 0° = top-left → bottom-right diagonal (default)
        borderRadius: 4,
        iconColor: '#ffffff',  // Neutral Extras white — never randomized
        strokeWidth: 2,
        strokeLinecap: 'round',
        // X/Y are OFFSETS from the canvas center (−24..24 px): 0 keeps the
        // icon perfectly centered on the 32×32 canvas — no separate "center"
        // action needed. iconSize is the icon's MAXIMUM dimension (longer
        // side); non-square artwork keeps its aspect ratio (lib/favicon.js).
        iconX: 0,
        iconY: 0,
        iconSize: 21,
        iconRotation: 0,
        iconSearch: '',
        currentIcon: 'lucide:house',
        allLucideIcons: [],
        popularIcons: ['house', 'heart', 'star', 'user', 'mail', 'phone', 'globe', 'settings'],
        // Tabler (second icon family — see lib/tabler-lib.js): the FULL
        // collection JSON is fetched ONCE from jsDelivr into memory (same
        // architecture as Lucide's bundled UMD), then everything renders
        // synchronously — no per-icon requests, no rate limits. Combined
        // grid shows BOTH families at once (lucide:*/tabler:* ids), no
        // family switcher. Tabler SVGs are stroke-based in a 24×24
        // viewBox — the Stroke Width slider drives the real stroke, same
        // as Lucide. In-memory only (no localStorage).
        tablerCollection: null,     // loaded @iconify-json/tabler JSON (icons + aliases with bodies)
        tablerSearchTimer: null,    // 300ms debounce for catalog search
        tablerSearchResults: [],    // latest debounced tabler matches
        lastTablerSubpaths: null,   // keep-last-rendered while the collection loads (no preview flicker)
        activeTarget: null,   // null = mouse mode (default): the mouse button picks the target (left=Start, right=End, middle=Icon); click a target row to pin writes to it alone
        swatchGrid: [],       // built once in init() — see allLucideIcons pattern

        /**
         * Material-pattern color palette seam — see CONTEXT.md ("Color
         * Target", "Swatch", "Neutral Extras", "Shade", "Palette Random").
         * Implementation lives in lib/palette-lib.js (shared with the
         * portfolio generator); this facade keeps the UI/test surface
         * unchanged. Pure helpers: no `this`, no DOM.
         */
        paletteLib,

        get displayedIcons() {
            const searchTerm = this.iconSearch.toLowerCase().trim();
            // Combined grid: Lucide (sync, in-memory) + Tabler (bare names
            // from the Iconify catalog, loaded async). Empty query → popular
            // subset of BOTH families side by side — directly comparable.
            const lucideIds = (searchTerm === ''
                ? this.popularIcons
                : this.getAllLucideIcons().filter(icon => icon.toLowerCase().includes(searchTerm))
            ).map(name => `lucide:${name}`);
            const tablerIds = (searchTerm === ''
                ? ((window.faviconTablerLib && window.faviconTablerLib.popularTablerIcons) || [])
                : this.tablerSearchResults
            ).filter(name => this.tablerCollection).map(name => `tabler:${name}`);
            return [...lucideIds, ...tablerIds];
        },

        /**
         * The canonical favicon string. Rendered for the preview AND
         * downloaded verbatim — one source of truth (lib/favicon.js).
         */
        get previewSvg() {
            if (!window.faviconLib) {
                console.warn('faviconLib not loaded — check lib/*.js script tags');
                return '';
            }
            const { strokeSubpaths, fillSubpaths } = this.currentIconSubpaths();
            return window.faviconLib.buildFaviconSvg({
                color1: this.color1,
                color2: this.color2,
                gradientAngle: this.gradientAngle,
                borderRadius: this.borderRadius,
                iconColor: this.iconColor,
                strokeWidth: this.strokeWidth,
                strokeLinecap: this.strokeLinecap,
                iconX: this.iconX,
                iconY: this.iconY,
                iconSize: this.iconSize,
                iconBasis: null,
                iconRotation: this.iconRotation,
                iconFamily: this.currentIconFamily(),
                iconName: this.currentIconBareName(),
                strokeSubpaths,
                fillSubpaths,
            });
        },

        init() {
            this.getAllLucideIcons();
            this.loadTablerCollection();
            // Randomize hue-row order on every load (shades stay
            // sorted 100–900 within each row; white/black extras are
            // rendered separately and always last — see index.html).
            const grid = this.paletteLib.buildGrid(palette);
            for (let i = grid.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [grid[i], grid[j]] = [grid[j], grid[i]];
            }
            this.swatchGrid = grid;
            this.$watch('previewSvg', () => this.updateFavicon());
            this.randomPalette();   // Palette Random defaults at load
        },

        targetLabel(targetName) {
            return { color1: 'Start Color', color2: 'End Color', iconColor: 'Icon Color' }[targetName];
        },

        shortTargetLabel(targetName) {
            return { color1: 'Start', color2: 'End', iconColor: 'Icon' }[targetName];
        },

        /**
         * Which targets currently use this hex? Returns letter codes
         * for the swatch badges: S (Start), E (End), I (Icon).
         */
        swatchRoles(hex) {
            const roles = [];
            if (this.color1 === hex) roles.push('S');
            if (this.color2 === hex) roles.push('E');
            if (this.iconColor === hex) roles.push('I');
            return roles;
        },

        /**
         * Single-target mode: write the color to the Active Target.
         * Mouse mode (activeTarget === null): the mouse button picks the
         * target — left = Start, right = End, middle = Icon.
         */
        selectSwatch(hex, button = 0) {
            if (this.activeTarget === null) {
                const byButton = { 0: 'color1', 1: 'iconColor', 2: 'color2' };
                this[byButton[button] || 'color1'] = hex;
            } else {
                this[this.activeTarget] = hex;
            }
        },

        /**
         * Clicking the Active Target again deselects it — back to
         * all-three mouse mode (the default state on page load).
         */
        toggleTarget(targetName) {
            this.activeTarget = (this.activeTarget === targetName) ? null : targetName;
        },

        /**
         * Palette Random (CONTEXT.md): randomize ONLY the background pair —
         * same chromatic hue, end shade exactly two steps away, direction
         * chosen from the allowed directions. Icon Color never changes.
         */
        randomPalette() {
            const pair = this.paletteLib.randomPair(palette);
            this.color1 = pair.startHex;
            this.color2 = pair.endHex;
        },

        getLucideIconSvg(iconName) {
            try {
                if (typeof lucide === 'undefined') {
                    console.warn('Lucide library not loaded');
                    return '<circle cx="12" cy="12" r="10"/>';
                }

                const pascalName = iconName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
                const IconConstructor = lucide[pascalName];

                if (!IconConstructor) {
                    console.warn(`Icon ${iconName} not found`);
                    return '<circle cx="12" cy="12" r="10"/>';
                }

                const tempDiv = document.createElement('div');
                const iconElement = lucide.createElement(IconConstructor);
                tempDiv.appendChild(iconElement);

                const svgElement = tempDiv.querySelector('svg');
                if (svgElement) return svgElement.innerHTML;

                return '<circle cx="12" cy="12" r="10"/>';
            } catch (error) {
                console.warn(`Failed to load icon ${iconName}:`, error);
                return '<circle cx="12" cy="12" r="10"/>';
            }
        },

        getAllLucideIcons() {
            if (this.allLucideIcons.length > 0) return this.allLucideIcons;

            try {
                if (typeof lucide === 'undefined') {
                    console.warn('Lucide library not loaded');
                    return this.popularIcons;
                }

                const excludedProps = ['createElement', 'icons', 'createIcons', 'default'];
                this.allLucideIcons = Object.keys(lucide)
                    .filter(key => !excludedProps.includes(key) && typeof lucide[key] === 'object')
                    .map(pascalName => pascalName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, ''))
                    .sort();

                return this.allLucideIcons;
            } catch (error) {
                console.warn('Failed to get icon list:', error);
                return this.popularIcons;
            }
        },

        tablerLib() {
            if (!window.faviconTablerLib) {
                console.warn('faviconTablerLib not loaded — check lib/*.js script tags');
            }
            return window.faviconTablerLib;
        },

        getIconHtml(iconName) {
            // iconName may be a family-prefixed id ("lucide:heart" /
            // "tabler:star"). Both render SYNCHRONOUSLY from in-memory
            // data (Lucide UMD; the Tabler collection JSON loaded once at
            // startup). Tiles of BOTH families mirror the current Stroke
            // Width so the grid previews the real outline thickness.
            const { family, bare } = parseIconId(iconName);
            const badge = family === 'tabler' ? 'T' : 'L';
            let inner;
            if (family === 'tabler') {
                const lib = this.tablerLib();
                // stripStrokeWidth removes the INLINE stroke-width="2" from
                // Tabler bodies — without it the wrapper's inherited value
                // (this.strokeWidth) is overridden and tiles are pinned to 2.
                inner = (lib && lib.stripStrokeWidth(lib.resolveMarkup(this.tablerCollection, bare)))
                    || '<circle cx="12" cy="12" r="9"/>';
            } else {
                inner = this.getLucideIconSvg(bare);
            }
            // Shared wrapper: identical geometry and stroke handling for both
            // families — only the badge letter and inner markup differ.
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${this.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
                + `<span class="icon-family-badge" aria-hidden="true">${badge}</span>`;
        },

        selectIcon(iconName) {
            this.currentIcon = iconName;
        },

        /**
         * Collect the subpath lists for the currently selected icon source.
         * Returns { strokeSubpaths, fillSubpaths } — plain `d` strings in the
         * icon's local 24-unit coordinate space, transforms already baked.
         * Tabler markup is stroke-based in a 24×24 viewBox, so it flows
         * through the SAME path as Lucide: Stroke Width drives the real
         * stroke, and stroke subpaths merge. While the collection JSON is
         * still downloading, the PREVIOUS rendered state is kept (no
         * flicker); `tablerCollection` arriving re-runs previewSvg.
         */
        currentIconSubpaths() {
            if (this.currentIconFamily() === 'tabler') {
                const lib = this.tablerLib();
                if (!lib) return { strokeSubpaths: [], fillSubpaths: [] };
                const name = this.currentIconBareName();
                const markup = lib.resolveMarkup(this.tablerCollection, name);
                if (!markup) {
                    // Collection still loading (or unknown name — e.g. a
                    // `-filled` variant that never enters the catalog): keep
                    // the last good state instead of flashing an empty icon.
                    return this.lastTablerSubpaths || { strokeSubpaths: [], fillSubpaths: [] };
                }
                const subpaths = this.subpathsFromSvgMarkup(
                    lib.stripStrokeWidth(markup),
                );
                this.lastTablerSubpaths = subpaths;
                return subpaths;
            }

            // Lucide icon markup → converted shapes → baked subpath lists.
            const inner = this.getLucideIconSvg(this.currentIconBareName());
            return this.subpathsFromSvgMarkup(inner);
        },

        /** Family part of the current icon id: 'lucide' | 'tabler'. */
        currentIconFamily() {
            return parseIconId(this.currentIcon).family;
        },

        /** Bare name (no family prefix) of the current icon id. */
        currentIconBareName() {
            return parseIconId(this.currentIcon).bare;
        },

        // ── Tabler family (jsDelivr collection, loaded once) ─────────────

        /**
         * Load the FULL Tabler collection JSON once from jsDelivr (same
         * resource pattern as Lucide's bundled UMD). After this resolves,
         * every tile and preview renders synchronously from memory — no
         * per-icon requests, no rate limits.
         */
        async loadTablerCollection() {
            const lib = this.tablerLib();
            if (!lib) return;
            try {
                const res = await fetch(lib.collectionUrl());
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const collection = await res.json();
                if (!collection || !collection.icons) {
                    throw new Error('payload is not an Iconify collection JSON');
                }
                this.tablerCollection = collection;
                this.scheduleTablerSearch();
            } catch (error) {
                console.warn('Tabler collection unavailable — showing Lucide results only:', error);
            }
        },

        /** Debounced (300ms) refresh of the tabler search results. */
        scheduleTablerSearch() {
            const lib = window.faviconTablerLib;
            if (!lib) return;
            clearTimeout(this.tablerSearchTimer);
            this.tablerSearchTimer = setTimeout(() => {
                const term = this.iconSearch.toLowerCase().trim();
                this.tablerSearchResults = term === ''
                    ? [...lib.popularTablerIcons]
                    : lib.searchNames(lib.catalogNames(this.tablerCollection), term);
            }, 300);
        },

        /**
         * Target radius (in the 24-unit local space) for a small filled dot
         * so it renders like Lucide's decorative "paint dots". On lucide.dev
         * those circles carry BOTH fill (currentColor) and the inherited
         * stroke (currentColor, stroke-width 2), so their rendered diameter
         * is `2r + strokeWidth` — for r=".5" and stroke 2 that is 3 units.
         * Our output has no stroke on filled paths, so we grow the radius to
         * `r + strokeWidth / 2` to reach the same diameter, keeping the dot
         * tracking the Stroke Width slider. At the default (stroke 2) that is
         * 1.5 for Lucide's r=".5" dots.
         */
        minDotRadius(originalRadius) {
            return (originalRadius || 0) + this.strokeWidth / 2;
        },

        /**
         * Bump a small filled circle up to minDotRadius(). Lucide's
         * decorative "paint dots" (e.g. the palette swatches) are r=".5" — a
         * 1-unit dot that is sub-pixel on a 32px favicon and renders blank.
         * Only circles that are FILL-based with a small radius are touched:
         * stroke-based shapes, filled shapes with no radius, and anything
         * already bigger are left as-is so we never alter real artwork.
         */
        clampTinyFilledDot(shape) {
            if (shape.tagName.toLowerCase() !== 'circle') return;
            const r = parseFloat(shape.getAttribute('r'));
            if (!Number.isFinite(r) || r <= 0) return;
            // Match Lucide's rendered size: on lucide.dev these dots also
            // inherit stroke, so 2r + strokeWidth is the effective diameter.
            const targetR = this.minDotRadius(r);
            if (r >= targetR) return;
            // Dots that carry their own stroke already render 2r + strokeWidth
            // (that's exactly the Lucide look) — leave them untouched. The
            // extractor normalizes filled shapes to white with no stroke, so a
            // stroke-less filled dot must grow so its FILLED diameter equals
            // Lucide's stroked diameter: 2r + strokeWidth → r' = r + sw/2.
            const fill = (shape.getAttribute('fill') || '').toLowerCase();
            const stroke = (shape.getAttribute('stroke') || '').toLowerCase();
            const isStrokedDot = stroke !== '' && stroke !== 'none';
            const isStrokeBased = fill === 'none' || (fill === '' && isStrokedDot);
            if (isStrokeBased || isStrokedDot) return;
            shape.setAttribute('r', String(targetR));
        },

        /**
         * Parse an SVG fragment and extract stroke/fill subpath lists.
         * Every shape element is converted to path data; element and ancestor
         * transforms are baked into the coordinates via lib/path-lib.js.
         */
        subpathsFromSvgMarkup(markup) {
            const strokeSubpaths = [];
            const fillSubpaths = [];

            if (!window.faviconPathLib) {
                console.warn('faviconPathLib not loaded — check lib/*.js script tags');
                return { strokeSubpaths, fillSubpaths };
            }

            const wrapped = `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`;
            const doc = new DOMParser().parseFromString(wrapped, 'image/svg+xml');
            const shapes = doc.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');

            shapes.forEach(shape => {
                // Bump tiny filled circles (Lucide "paint dots", r=".5") up to
                // a legible minimum in the 24-unit icon space. Done on the
                // parsed node before conversion so the resulting arc path picks
                // up the larger radius. Stroke-based dots are left alone.
                this.clampTinyFilledDot(shape);
                const localD = window.faviconPathLib.shapeElementToD(shape);
                if (!localD) return;

                // Stroke vs fill classification: a shape is stroke-based when
                // it carries no fill of its own OR fill="none". Inherited fill
                // from an ancestor <g fill="..."> counts as filled — walk the
                // ancestors so both icon families classify correctly.
                let declaredFill = shape.getAttribute('fill');
                if (declaredFill === null) {
                    let ancestor = shape.parentElement;
                    while (ancestor && ancestor.tagName.toLowerCase() !== 'svg') {
                        const inherited = ancestor.getAttribute('fill');
                        if (inherited !== null) { declaredFill = inherited; break; }
                        ancestor = ancestor.parentElement;
                    }
                    // The wrapping <svg> fragment itself (Lucide sets fill="none" there).
                    if (declaredFill === null && ancestor) {
                        declaredFill = ancestor.getAttribute('fill');
                    }
                }
                const fillValue = (declaredFill || '').toLowerCase();
                const isStrokeBased = fillValue === '' || fillValue === 'none';

                // Bake accumulated ancestor + local transforms into the coords.
                // Both icon families use the canonical 24-unit local basis, so
                // no viewBox normalization is needed.
                const matrix = window.faviconPathLib.accumulatedMatrix(shape);
                const { d: baked, baked: ok } = window.faviconPathLib.bakeMatrix(localD, matrix);
                if (!ok) {
                    console.warn('Could not bake transform into path — svgpath unavailable; output may be wrong.');
                }
                const d = baked || localD;

                if (isStrokeBased) {
                    strokeSubpaths.push(d);
                } else {
                    // Filled shapes stay separate so merging can't change their
                    // silhouette. The extractor normalizes their color to white.
                    fillSubpaths.push(d);
                }
            });

            return { strokeSubpaths, fillSubpaths };
        },

        /**
         * Download the canonical SVG — the exact same string as the preview.
         * No SVGO: external optimization strips the viewBox/dimensions the
         * canonical format REQUIRES.
         */
        downloadFavicon() {
            const svg = this.previewSvg;
            if (!svg) return;
            this.downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'favicon.svg');
        },

        downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        updateFavicon() {
            const favicon = document.getElementById('dynamic-favicon');
            if (!favicon) return;

            const svgString = this.previewSvg;
            if (!svgString) return;
            const base64 = btoa(unescape(encodeURIComponent(svgString)));
            favicon.href = `data:image/svg+xml;base64,${base64}`;
        }
    };
}
