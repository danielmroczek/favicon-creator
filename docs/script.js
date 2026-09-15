// Alpine.js component for Favicon Creator.
//
// Architecture note: ALL canonical-favicon assembly lives in lib/favicon.js
// (buildFaviconSvg) and lib/path-lib.js (shape→path conversion + transform
// baking). This component only collects Lucide/upload shapes, normalizes
// them into subpath lists, and delegates. Preview and download render THE
// SAME STRING, so they can never drift apart.
function faviconCreator() {
    return {
        color1: '#3b82f6',
        color2: '#8b5cf6',
        gradientAngle: 315,
        borderRadius: 4,
        iconColor: '#f5f5f5',
        strokeWidth: 2,
        strokeLinecap: 'round',
        iconX: 5,
        iconY: 5,
        iconSize: 22,
        iconRotation: 0,
        iconSearch: '',
        currentIcon: 'house',
        customIconSubpaths: null,
        allLucideIcons: [],
        popularIcons: ['house', 'heart', 'star', 'user', 'mail', 'phone', 'globe', 'settings'],

        get displayedIcons() {
            const searchTerm = this.iconSearch.toLowerCase().trim();
            if (searchTerm === '') return this.popularIcons;
            return this.getAllLucideIcons().filter(icon => icon.toLowerCase().includes(searchTerm));
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
                iconRotation: this.iconRotation,
                strokeSubpaths,
                fillSubpaths,
            });
        },

        init() {
            this.getAllLucideIcons();
            this.$watch('previewSvg', () => this.updateFavicon());
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

        getIconHtml(iconName) {
            const svgContent = this.getLucideIconSvg(iconName);
            return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>`;
        },

        selectIcon(iconName) {
            this.currentIcon = iconName;
            this.customIconSubpaths = null;
        },

        centerIcon() {
            this.iconX = (32 - this.iconSize) / 2;
            this.iconY = (32 - this.iconSize) / 2;
        },

        /**
         * Collect the subpath lists for the currently selected icon source.
         * Returns { strokeSubpaths, fillSubpaths } — plain `d` strings in the
         * icon's local 24-unit coordinate space, transforms already baked.
         */
        currentIconSubpaths() {
            if (this.customIconSubpaths) return this.customIconSubpaths;

            // Lucide icon markup → converted shapes → baked subpath lists.
            const inner = this.getLucideIconSvg(this.currentIcon);
            return this.subpathsFromSvgMarkup(inner);
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
                const localD = window.faviconPathLib.shapeElementToD(shape);
                if (!localD) return;

                // Stroke vs fill classification: a shape is stroke-based when
                // it carries no fill of its own OR fill="none". Inherited fill
                // from an ancestor <g fill="..."> counts as filled — walk the
                // ancestors so Lucide icons (fill="none" on the wrapper svg)
                // and normal uploads both classify correctly.
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

        handleFileUpload(event) {
            const files = event.target.files;
            if (files.length > 0) this.processFile(files[0]);
        },

        handleFileDrop(event) {
            event.currentTarget.classList.remove('dragover');
            const files = event.dataTransfer.files;
            if (files.length > 0) this.processFile(files[0]);
        },

        processFile(file) {
            if (file.type !== 'image/svg+xml') {
                alert('Please upload only SVG files.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const warnings = this.collectFaviconWarnings(e.target.result);

                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;

                if (svgElement.tagName !== 'svg') {
                    alert('Invalid SVG file.');
                    return;
                }

                const shapeCount = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon').length;
                if (shapeCount === 0) {
                    alert('SVG must contain at least one drawable element.');
                    return;
                }

                // Store the SUBPATH LISTS (converted + baked) rather than raw
                // markup — component state mirrors what buildFaviconSvg consumes.
                this.customIconSubpaths = this.subpathsFromSvgMarkup(svgElement.innerHTML);

                if (warnings.length > 0) {
                    alert('Uploaded SVG has patterns that may not survive extraction:\n\n' +
                        warnings.map(w => `• ${w}`).join('\n'));
                } else {
                    alert('Custom SVG uploaded successfully!');
                }
            };
            reader.readAsText(file);
        },

        /**
         * Mirror the portfolio's check-favicon.mjs rules for patterns the
         * canonical format rejects — surfaced at upload time so problems are
         * caught before the download.
         */
        collectFaviconWarnings(svgText) {
            const warnings = [];
            if (/<style[\s>]/i.test(svgText)) warnings.push('<style> blocks — CSS will not be inlined; use presentation attributes.');
            if (/\sclass="/i.test(svgText)) warnings.push('class="..." attributes reference stripped CSS and will be lost.');
            if (/var\(/i.test(svgText)) warnings.push('var(...) color references will not resolve — use literal hex colors.');
            if (/\sstyle="/i.test(svgText)) warnings.push('style="..." attributes are ignored — move declarations into presentation attributes.');
            if (/currentColor/i.test(svgText)) warnings.push('currentColor will not resolve to white — use #fff.');
            const nestedSvg = (svgText.match(/<svg[\s>]/gi) || []).length - 1;
            if (nestedSvg > 0) warnings.push(`${nestedSvg} nested <svg> element(s) — they will be flattened.`);
            return warnings;
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
