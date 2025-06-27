// Updated icon data - now using official Lucide icon names
const popularIcons = [
    'home', 'heart', 'star', 'user', 'mail', 'phone', 'globe', 'settings',
    'search', 'plus', 'minus', 'check', 'x', 'menu', 'arrow-right', 'arrow-left',
    'arrow-up', 'arrow-down', 'download', 'upload', 'eye', 'camera', 'image',
    'music', 'video', 'lock', 'key', 'shield', 'bookmark', 'calendar', 'clock',
    'map-pin', 'shopping-cart', 'gift', 'code', 'database', 'wifi', 'cpu',
    'server', 'folder', 'file', 'layers', 'trending-up', 'trending-down',
    'activity', 'zap', 'palette', 'sun', 'moon', 'cloud', 'umbrella', 'coffee',
    'car', 'plane', 'gamepad-2'
];

let currentIcon = popularIcons[0];
let customIconSvg = null;

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

// Get Lucide icon SVG content with proper fallback
function getLucideIconSvg(iconName) {
    // Simple fallback icons if Lucide is not available
    const fallbackIcons = {
        'home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><polyline points="9,22 9,12 15,12 15,22"/>',
        'heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
        'star': '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>',
        'user': '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        'mail': '<path d="m4 4 16 0 0 16-16 0z"/><polyline points="22,6 12,13 2,6"/>',
        'phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
        'globe': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        'settings': '<circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17-4a4 4 0 0 0-8 0 4 4 0 0 0 8 0zM7 21a4 4 0 0 0 8 0 4 4 0 0 0-8 0z"/>',
        'search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
        'plus': '<path d="M12 5v14m-7-7h14"/>',
        'minus': '<path d="M5 12h14"/>',
        'check': '<polyline points="20,6 9,17 4,12"/>',
        'x': '<path d="m18 6-12 12M6 6l12 12"/>',
        'menu': '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
        'arrow-right': '<path d="M5 12h14m-7-7 7 7-7 7"/>',
        'arrow-left': '<path d="M19 12H5m7 7-7-7 7-7"/>',
        'arrow-up': '<path d="M12 19V5m-7 7 7-7 7 7"/>',
        'arrow-down': '<path d="M12 5v14m7-7-7 7-7-7"/>',
        'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>',
        'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    };

    try {
        if (typeof lucide !== 'undefined' && lucide.icons && lucide.icons[iconName]) {
            const iconData = lucide.icons[iconName];
            const svgString = iconData.toSvg();
            // Parse the SVG to extract just the path content
            const parser = new DOMParser();
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const paths = doc.querySelectorAll('path, circle, rect, ellipse, line, polyline, polygon');
            let pathContent = '';
            paths.forEach(path => {
                pathContent += path.outerHTML;
            });
            return pathContent;
        }
    } catch (error) {
        console.warn(`Lucide icon ${iconName} failed to load, using fallback`);
    }
    
    // Use fallback icon or simple circle
    return fallbackIcons[iconName] || '<circle cx="12" cy="12" r="10"/>';
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
    iconGrid.innerHTML = '';
    popularIcons.forEach((iconName, index) => {
        const iconElement = document.createElement('div');
        iconElement.className = 'icon-item';
        if (index === 0) iconElement.classList.add('selected');
        
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
        svgWrapper.innerHTML = getLucideIconSvg(iconName);
        iconElement.appendChild(svgWrapper);
        
        iconElement.addEventListener('click', () => {
            document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
            iconElement.classList.add('selected');
            currentIcon = iconName;
            customIconSvg = null;
            updatePreview();
        });
        
        iconGrid.appendChild(iconElement);
    });
}

// Search icons
iconSearchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filteredIcons = popularIcons.filter(iconName => 
        iconName.toLowerCase().includes(searchTerm)
    );
    
    iconGrid.innerHTML = '';
    filteredIcons.forEach(iconName => {
        const iconElement = document.createElement('div');
        iconElement.className = 'icon-item';
        
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
        svgWrapper.innerHTML = getLucideIconSvg(iconName);
        iconElement.appendChild(svgWrapper);
        
        iconElement.addEventListener('click', () => {
            document.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
            iconElement.classList.add('selected');
            currentIcon = iconName;
            customIconSvg = null;
            updatePreview();
        });
        
        iconGrid.appendChild(iconElement);
    });
});

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
initIconGrid();
updatePreview();
updateValueDisplays();
