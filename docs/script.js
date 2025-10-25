// Alpine.js component for Favicon Creator
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
        customIconSvg: null,
        allLucideIcons: [],
        popularIcons: ['house', 'heart', 'star', 'user', 'mail', 'phone', 'globe', 'settings'],
        
        get displayedIcons() {
            const searchTerm = this.iconSearch.toLowerCase().trim();
            if (searchTerm === '') return this.popularIcons;
            return this.getAllLucideIcons().filter(icon => icon.toLowerCase().includes(searchTerm));
        },
        
        get previewSvg() {
            const radians = (this.gradientAngle - 90) * Math.PI / 180;
            const x1 = Math.round((1 + Math.cos(radians)) * 50);
            const y1 = Math.round((1 + Math.sin(radians)) * 50);
            const x2 = Math.round((1 - Math.cos(radians)) * 50);
            const y2 = Math.round((1 - Math.sin(radians)) * 50);

            let iconContent = '';
            if (this.customIconSvg) {
                const centerX = this.iconX + this.iconSize / 2;
                const centerY = this.iconY + this.iconSize / 2;
                const rotationTransform = this.iconRotation !== 0 ? `rotate(${this.iconRotation} ${centerX} ${centerY})` : '';
                const originalViewBox = this.customIconSvg.viewBox.split(' ');
                const originalWidth = parseFloat(originalViewBox[2]);
                const originalHeight = parseFloat(originalViewBox[3]);
                const scaleFactor = Math.min(this.iconSize / originalWidth, this.iconSize / originalHeight);
                const adjustedStrokeWidth = this.strokeWidth / scaleFactor;
                
                let processedElements = this.customIconSvg.elements;
                processedElements = processedElements.replace(/stroke="[^"]*"/g, '')
                    .replace(/stroke-width="[^"]*"/g, '')
                    .replace(/stroke-linecap="[^"]*"/g, '')
                    .replace(/stroke-linejoin="[^"]*"/g, '')
                    .replace(/fill="[^"]*"/g, '');
                processedElements = processedElements.replace(
                    /(<(path|circle|rect|ellipse|line|polyline|polygon)[^>]*)/g, 
                    `$1 stroke="${this.iconColor}" stroke-width="${adjustedStrokeWidth}" stroke-linecap="${this.strokeLinecap}" stroke-linejoin="round" fill="none"`
                );
                
                iconContent = `<svg x="${this.iconX}" y="${this.iconY}" width="${this.iconSize}" height="${this.iconSize}" viewBox="${this.customIconSvg.viewBox}" fill="none" ${rotationTransform ? `transform="${rotationTransform}"` : ''} xmlns="http://www.w3.org/2000/svg">${processedElements}</svg>`;
            } else {
                const baseLucideSize = 24;
                const scaleFactor = this.iconSize / baseLucideSize;
                const adjustedStrokeWidth = this.strokeWidth / scaleFactor;
                const pathContent = this.getLucideIconSvg(this.currentIcon);
                const centerX = this.iconX + this.iconSize / 2;
                const centerY = this.iconY + this.iconSize / 2;
                const rotationTransform = this.iconRotation !== 0 ? `rotate(${this.iconRotation} ${centerX} ${centerY})` : '';
                
                iconContent = `<svg x="${this.iconX}" y="${this.iconY}" width="${this.iconSize}" height="${this.iconSize}" viewBox="0 0 24 24" fill="none" stroke="${this.iconColor}" stroke-width="${adjustedStrokeWidth}" stroke-linecap="${this.strokeLinecap}" stroke-linejoin="round" ${rotationTransform ? `transform="${rotationTransform}"` : ''} xmlns="http://www.w3.org/2000/svg">${pathContent}</svg>`;
            }

            return `<defs><linearGradient id="gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%"><stop stop-color="${this.color1}"/><stop offset="1" stop-color="${this.color2}"/></linearGradient></defs><rect width="32" height="32" rx="${this.borderRadius}" fill="url(#gradient)"/>${iconContent}`;
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
            this.customIconSvg = null;
        },
        
        centerIcon() {
            this.iconX = (32 - this.iconSize) / 2;
            this.iconY = (32 - this.iconSize) / 2;
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
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(e.target.result, 'image/svg+xml');
                const svgElement = svgDoc.documentElement;
                
                if (svgElement.tagName !== 'svg') {
                    alert('Invalid SVG file.');
                    return;
                }
                
                const pathElements = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
                if (pathElements.length === 0) {
                    alert('SVG must contain at least one drawable element.');
                    return;
                }
                
                let elementsContent = '';
                pathElements.forEach(element => {
                    const elementClone = element.cloneNode(true);
                    elementClone.removeAttribute('fill');
                    elementClone.setAttribute('fill', 'none');
                    elementClone.removeAttribute('stroke');
                    elementClone.removeAttribute('stroke-width');
                    elementClone.removeAttribute('stroke-linecap');
                    elementClone.removeAttribute('stroke-linejoin');
                    elementsContent += elementClone.outerHTML;
                });
                
                this.customIconSvg = {
                    viewBox: svgElement.getAttribute('viewBox') || '0 0 24 24',
                    elements: elementsContent
                };
                
                alert('Custom SVG uploaded successfully!');
            };
            reader.readAsText(file);
        },
        
        async downloadFavicon() {
            const svgElement = document.getElementById('preview-svg');
            const svgString = svgElement.outerHTML;
            
            try {
                const optimizedSvg = SVGO.optimize(svgString, {
                    plugins: ['preset-default', 'removeViewBox', 'removeDimensions']
                });
                this.downloadBlob(new Blob([optimizedSvg.data], { type: 'image/svg+xml' }), 'favicon.svg');
            } catch (error) {
                this.downloadBlob(new Blob([svgString], { type: 'image/svg+xml' }), 'favicon.svg');
            }
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
            const svgElement = document.getElementById('preview-svg');
            if (!svgElement) return;
            
            const svgString = svgElement.outerHTML;
            const base64 = btoa(unescape(encodeURIComponent(svgString)));
            const dataUrl = `data:image/svg+xml;base64,${base64}`;
            
            const favicon = document.getElementById('dynamic-favicon');
            if (favicon) favicon.href = dataUrl;
        }
    };
}
