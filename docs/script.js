// Updated icon data - now using official Lucide icon names
const popularIcons = [
    'house', 'heart', 'star', 'user', 'mail', 'phone', 'globe', 'settings'
];

let currentIcon = popularIcons[0];
let customIconSvg = null;
let allLucideIcons = []; // Cache for all available icons

// Elements
const previewSvg = document.getElementById('preview-svg');
const color1Input = document.getElementById('color1');
const color2Input = document.getElementById('color2');
const gradientAngleInput = document.getElementById('gradient-angle');
const borderRadiusInput = document.getElementById('border-radius');
const iconColorInput = document.getElementById('icon-color');
const strokeWidthInput = document.getElementById('stroke-width');
const strokeLinecapInput = document.getElementById('stroke-linecap');
const iconXInput = document.getElementById('icon-x');
const iconYInput = document.getElementById('icon-y');
const iconSizeInput = document.getElementById('icon-size');
const iconRotationInput = document.getElementById('icon-rotation');
const iconSearchInput = document.getElementById('icon-search');
const iconGrid = document.getElementById('icon-grid');
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const downloadBtn = document.getElementById('download-btn');
const centerIconBtn = document.getElementById('center-icon');

// Value display elements
const angleValue = document.getElementById('angle-value');
const radiusValue = document.getElementById('radius-value');
const xValue = document.getElementById('x-value');
const yValue = document.getElementById('y-value');
const sizeValue = document.getElementById('size-value');
const strokeValue = document.getElementById('stroke-value');
const rotationValue = document.getElementById('rotation-value');

// Get Lucide icon SVG content from the loaded library (instant, no HTTP request)
function getLucideIconSvg(iconName) {
    try {
        // Check if lucide library is loaded
        if (typeof lucide === 'undefined') {
            console.warn('Lucide library not loaded');
            return '<circle cx="12" cy="12" r="10"/>';
        }
        
        // Convert kebab-case to PascalCase (e.g., 'arrow-right' -> 'ArrowRight')
        const pascalName = iconName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
        
        // Get icon constructor from lucide
        const IconConstructor = lucide[pascalName];
        
        if (!IconConstructor) {
            console.warn(`Icon ${iconName} (${pascalName}) not found in Lucide library`);
            return '<circle cx="12" cy="12" r="10"/>';
        }
        
        // Create a temporary container to render the icon
        const tempDiv = document.createElement('div');
        
        // Use lucide.createElement to create the icon element
        const iconElement = lucide.createElement(IconConstructor);
        tempDiv.appendChild(iconElement);
        
        // Get the SVG element and extract its inner HTML
        const svgElement = tempDiv.querySelector('svg');
        if (svgElement) {
            return svgElement.innerHTML;
        }
        
        return '<circle cx="12" cy="12" r="10"/>';
    } catch (error) {
        console.warn(`Failed to load icon ${iconName}:`, error);
        return '<circle cx="12" cy="12" r="10"/>';
    }
}

// Get all available Lucide icons from the loaded library (instant)
function getAllLucideIcons() {
    if (allLucideIcons.length > 0) {
        return allLucideIcons; // Return cached list
    }
    
    try {
        // Check if lucide library is loaded
        if (typeof lucide === 'undefined') {
            console.warn('Lucide library not loaded, using popular icons only');
            return popularIcons;
        }
        
        // Get all icon names from lucide object (exclude non-icon properties)
        const excludedProps = ['createElement', 'icons', 'createIcons', 'default'];
        allLucideIcons = Object.keys(lucide)
            .filter(key => !excludedProps.includes(key) && typeof lucide[key] === 'object')
            .map(pascalName => {
                // Convert PascalCase to kebab-case (e.g., 'ArrowRight' -> 'arrow-right')
                return pascalName
                    .replace(/([A-Z])/g, '-$1')
                    .toLowerCase()
                    .replace(/^-/, ''); // Remove leading dash
            })
            .sort();
        
        return allLucideIcons;
    } catch (error) {
        console.warn('Failed to get icon list, using popular icons only:', error);
        return popularIcons;
    }
}

// Update favicon dynamically
function updateFavicon() {
    const svgString = previewSvg.outerHTML;
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    const dataUrl = `data:image/svg+xml;base64,${base64}`;
    
    const favicon = document.getElementById('dynamic-favicon');
    favicon.href = dataUrl;
}

// Center icon functionality
centerIconBtn.addEventListener('click', () => {
    const iconSize = parseInt(iconSizeInput.value);
    const centerX = (32 - iconSize) / 2;
    const centerY = (32 - iconSize) / 2;
    
    iconXInput.value = centerX;
    iconYInput.value = centerY;
    
    updateValueDisplays();
    updatePreview();
});

// Initialize icon grid function
function initIconGrid() {
    iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Loading icons...</div>';
    
    try {
        // Get all icons list (instant, from loaded library)
        const allIcons = getAllLucideIcons();
        
        // Show popular icons first (create all immediately)
        iconGrid.innerHTML = '';
        popularIcons.forEach((iconName, index) => {
            createIconElement(iconName, index === 0);
        });
    } catch (error) {
        console.error('Failed to initialize icon grid:', error);
        iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Failed to load icons</div>';
    }
}

let searchTimeout;

// Search icons
iconSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce the search
    searchTimeout = setTimeout(() => {
        if (searchTerm === '') {
            // Show popular icons when search is empty
            iconGrid.innerHTML = '';
            popularIcons.forEach((iconName, index) => {
                createIconElement(iconName, index === 0);
            });
            return;
        }
        
        // Show loading state
        iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Searching...</div>';
        
        try {
            const allIcons = getAllLucideIcons();
            const filteredIcons = allIcons.filter(iconName => 
                iconName.toLowerCase().includes(searchTerm)
            );
            
            iconGrid.innerHTML = '';
            
            if (filteredIcons.length === 0) {
                iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">No icons found</div>';
                return;
            }
            
            // Show all results without limit (instant with in-memory icons)
            filteredIcons.forEach((iconName) => {
                createIconElement(iconName, false);
            });
            
            if (filteredIcons.length > 100) {
                const infoDiv = document.createElement('div');
                infoDiv.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 0.5rem; color: #666; font-size: 0.8rem;';
                infoDiv.textContent = `Showing ${filteredIcons.length} icons`;
                iconGrid.appendChild(infoDiv);
            }
        } catch (error) {
            console.error('Search failed:', error);
            iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Search failed. Please try again.</div>';
        }
    }, 300); // 300ms debounce
});

// Helper function to create icon elements (instant, no async needed)
function createIconElement(iconName, isSelected = false) {
    const iconElement = document.createElement('div');
    iconElement.className = 'icon-item';
    if (isSelected) iconElement.classList.add('selected');
    
    // Create SVG wrapper for the path content
    const svgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgWrapper.setAttribute('width', '20');
    svgWrapper.setAttribute('height', '20');
    svgWrapper.setAttribute('viewBox', '0 0 24 24');
    svgWrapper.setAttribute('fill', 'none');
    svgWrapper.setAttribute('stroke', 'currentColor');
    svgWrapper.setAttribute('stroke-width', '2');
    svgWrapper.setAttribute('stroke-linecap', 'round');
    svgWrapper.setAttribute('stroke-linejoin', 'round');
    
    // Load SVG content instantly from in-memory library
    const svgContent = getLucideIconSvg(iconName);
    svgWrapper.innerHTML = svgContent;
    
    iconElement.appendChild(svgWrapper);
    
    iconElement.addEventListener('click', () => {
        document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
        iconElement.classList.add('selected');
        currentIcon = iconName;
        customIconSvg = null;
        updatePreview();
    });
    
    iconGrid.appendChild(iconElement);
}

// Update preview
function updatePreview() {
    const angle = parseInt(gradientAngleInput.value);
    const radius = parseInt(borderRadiusInput.value);
    const color1 = color1Input.value;
    const color2 = color2Input.value;
    const iconColor = iconColorInput.value;
    const strokeWidth = parseFloat(strokeWidthInput.value);
    const strokeLinecap = strokeLinecapInput.value;
    const iconX = parseInt(iconXInput.value);
    const iconY = parseInt(iconYInput.value);
    const iconSize = parseInt(iconSizeInput.value);
    const iconRotation = parseInt(iconRotationInput.value);

    // Calculate gradient coordinates based on angle
    const radians = (angle - 90) * Math.PI / 180;
    const x1 = Math.round((1 + Math.cos(radians)) * 50);
    const y1 = Math.round((1 + Math.sin(radians)) * 50);
    const x2 = Math.round((1 - Math.cos(radians)) * 50);
    const y2 = Math.round((1 - Math.sin(radians)) * 50);

    let iconContent = '';
    if (customIconSvg) {
        // For custom SVG, create a new SVG element with current controls applied
        const centerX = iconX + iconSize / 2;
        const centerY = iconY + iconSize / 2;
        const rotationTransform = iconRotation !== 0 ? `rotate(${iconRotation} ${centerX} ${centerY})` : '';
        
        // Calculate the scaling factor based on original viewBox vs current size
        const originalViewBox = customIconSvg.viewBox.split(' ');
        const originalWidth = parseFloat(originalViewBox[2]);
        const originalHeight = parseFloat(originalViewBox[3]);
        const scaleFactor = Math.min(iconSize / originalWidth, iconSize / originalHeight);
        
        // Calculate stroke width that maintains constant absolute thickness
        const adjustedStrokeWidth = strokeWidth / scaleFactor;
        
        // Apply all stroke properties to custom SVG elements
        let processedElements = customIconSvg.elements;
        
        // Remove existing stroke and fill attributes
        processedElements = processedElements.replace(
            /stroke="[^"]*"/g, ''
        ).replace(
            /stroke-width="[^"]*"/g, ''
        ).replace(
            /stroke-linecap="[^"]*"/g, ''
        ).replace(
            /stroke-linejoin="[^"]*"/g, ''
        ).replace(
            /fill="[^"]*"/g, ''
        );
        
        // Apply new stroke properties with adjusted stroke width
        processedElements = processedElements.replace(
            /(<(path|circle|rect|ellipse|line|polyline|polygon)[^>]*)/g, 
            `$1 stroke="${iconColor}" stroke-width="${adjustedStrokeWidth}" stroke-linecap="${strokeLinecap}" stroke-linejoin="round" fill="none"`
        );
        
        iconContent = `
            <svg x="${iconX}" y="${iconY}" 
                 width="${iconSize}" height="${iconSize}" 
                 viewBox="${customIconSvg.viewBox}"
                 fill="none"
                 ${rotationTransform ? `transform="${rotationTransform}"` : ''}
                 xmlns="http://www.w3.org/2000/svg">
                ${processedElements}
            </svg>
        `;
    } else {
        // For Lucide icons, calculate adjusted stroke width based on 24x24 viewBox
        const baseLucideSize = 24;
        const scaleFactor = iconSize / baseLucideSize;
        const adjustedStrokeWidth = strokeWidth / scaleFactor;
        
        const pathContent = getLucideIconSvg(currentIcon);
        const centerX = iconX + iconSize / 2;
        const centerY = iconY + iconSize / 2;
        const rotationTransform = iconRotation !== 0 ? `rotate(${iconRotation} ${centerX} ${centerY})` : '';
        
        iconContent = `
            <svg x="${iconX}" y="${iconY}" 
                 width="${iconSize}" height="${iconSize}" 
                 viewBox="0 0 24 24"
                 fill="none"
                 stroke="${iconColor}"
                 stroke-width="${adjustedStrokeWidth}"
                 stroke-linecap="${strokeLinecap}"
                 stroke-linejoin="round"
                 ${rotationTransform ? `transform="${rotationTransform}"` : ''}
                 xmlns="http://www.w3.org/2000/svg">
                ${pathContent}
            </svg>
        `;
    }

    previewSvg.innerHTML = `
        <defs>
            <linearGradient id="gradient" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
                <stop stop-color="${color1}"/>
                <stop offset="1" stop-color="${color2}"/>
            </linearGradient>
        </defs>
        <rect width="32" height="32" rx="${radius}" fill="url(#gradient)"/>
        ${iconContent}
    `;
    
    updateFavicon();
}

// Update value displays
function updateValueDisplays() {
    angleValue.textContent = gradientAngleInput.value + '°';
    radiusValue.textContent = borderRadiusInput.value;
    xValue.textContent = iconXInput.value;
    yValue.textContent = iconYInput.value;
    sizeValue.textContent = iconSizeInput.value;
    strokeValue.textContent = strokeWidthInput.value;
    rotationValue.textContent = iconRotationInput.value + '°';
}

// Event listeners
[color1Input, color2Input, gradientAngleInput, borderRadiusInput, 
 iconColorInput, strokeWidthInput, strokeLinecapInput, iconXInput, iconYInput, iconSizeInput, iconRotationInput].forEach(input => {
    input.addEventListener('input', () => {
        updatePreview();
        updateValueDisplays();
    });
});

// File upload
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

function handleFileUpload(file) {
    // Only accept SVG files
    if (file.type !== 'image/svg+xml') {
        alert('Please upload only SVG files.');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const svgContent = e.target.result;
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;
        
        // Check for parsing errors
        if (svgElement.tagName !== 'svg') {
            alert('Invalid SVG file.');
            return;
        }
        
        // Extract only path elements (excluding metadata like title, desc, etc.)
        const pathElements = svgElement.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
        
        if (pathElements.length === 0) {
            alert('SVG must contain at least one drawable element (path, circle, rect, etc.).');
            return;
        }
        
        // Create a new SVG with extracted elements, removing fills and ensuring stroke styling
        let elementsContent = '';
        pathElements.forEach(element => {
            const elementClone = element.cloneNode(true);
            
            // Remove any fill attributes to make it transparent
            elementClone.removeAttribute('fill');
            elementClone.setAttribute('fill', 'none');
            
            // Remove existing stroke attributes so they can be controlled
            elementClone.removeAttribute('stroke');
            elementClone.removeAttribute('stroke-width');
            elementClone.removeAttribute('stroke-linecap');
            elementClone.removeAttribute('stroke-linejoin');
            
            elementsContent += elementClone.outerHTML;
        });
        
        // Get the original viewBox or use default
        const originalViewBox = svgElement.getAttribute('viewBox') || '0 0 24 24';
        
        // Store the clean elements content for use in updatePreview
        customIconSvg = {
            viewBox: originalViewBox,
            elements: elementsContent
        };
        
        updatePreview();
        alert('Custom SVG uploaded successfully!');
    };
    reader.readAsText(file);
}

// Download functionality
downloadBtn.addEventListener('click', async () => {
    const svgString = previewSvg.outerHTML;
    
    try {
        // Minify with SVGO
        const optimizedSvg = SVGO.optimize(svgString, {
            plugins: [
                'preset-default',
                'removeViewBox',
                'removeDimensions'
            ]
        });
        
        const blob = new Blob([optimizedSvg.data], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'favicon.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        // Fallback without SVGO
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'favicon.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});

// Initialize
(() => {
    initIconGrid();
    updatePreview();
    updateValueDisplays();
})();
