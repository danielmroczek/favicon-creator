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

// Get Lucide icon SVG content from CDN
async function getLucideIconSvg(iconName) {
    try {
        const response = await fetch(`https://unpkg.com/lucide-static/icons/${iconName}.svg`);
        if (!response.ok) {
            throw new Error(`Icon ${iconName} not found`);
        }
        const svgText = await response.text();
        // Extract just the inner content (paths, circles, etc.)
        const match = svgText.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
        return match ? match[1] : '<circle cx="12" cy="12" r="10"/>';
    } catch (error) {
        console.warn(`Failed to load icon ${iconName}:`, error);
        return '<circle cx="12" cy="12" r="10"/>';
    }
}

// Get all available Lucide icons
async function getAllLucideIcons() {
    if (allLucideIcons.length > 0) {
        return allLucideIcons; // Return cached list
    }
    
    try {
        // Fetch the icon list from Lucide's package.json or a known endpoint
        const response = await fetch('https://api.github.com/repos/lucide-icons/lucide/contents/icons');
        if (!response.ok) {
            throw new Error('Failed to fetch icon list');
        }
        const files = await response.json();
        
        // Extract icon names (remove .svg extension)
        allLucideIcons = files
            .filter(file => file.name.endsWith('.svg'))
            .map(file => file.name.replace('.svg', ''))
            .sort();
        
        return allLucideIcons;
    } catch (error) {
        console.warn('Failed to fetch all icons, using popular icons only:', error);
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
async function initIconGrid() {
    iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Loading icons...</div>';
    
    try {
        // Preload all icons list in background
        getAllLucideIcons();
        
        // Show popular icons first
        iconGrid.innerHTML = '';
        for (let i = 0; i < popularIcons.length; i++) {
            const iconName = popularIcons[i];
            await createIconElement(iconName, i === 0);
        }
    } catch (error) {
        console.error('Failed to initialize icon grid:', error);
        iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Failed to load icons</div>';
    }
}

let searchTimeout;

// Search icons
iconSearchInput.addEventListener('input', async (e) => {
    const searchTerm = e.target.value.toLowerCase().trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce the search
    searchTimeout = setTimeout(async () => {
        if (searchTerm === '') {
            // Show popular icons when search is empty
            iconGrid.innerHTML = '';
            for (let i = 0; i < popularIcons.length; i++) {
                const iconName = popularIcons[i];
                await createIconElement(iconName, i === 0);
            }
            return;
        }
        
        // Show loading state
        iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Searching...</div>';
        
        try {
            const allIcons = await getAllLucideIcons();
            const filteredIcons = allIcons.filter(iconName => 
                iconName.toLowerCase().includes(searchTerm)
            );
            
            iconGrid.innerHTML = '';
            
            if (filteredIcons.length === 0) {
                iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">No icons found</div>';
                return;
            }
            
            // Limit results to prevent UI lag
            const maxResults = 50;
            const iconsToShow = filteredIcons.slice(0, maxResults);
            
            for (const iconName of iconsToShow) {
                await createIconElement(iconName, false);
            }
            
            if (filteredIcons.length > maxResults) {
                const moreDiv = document.createElement('div');
                moreDiv.style.cssText = 'text-align: center; padding: 0.5rem; color: #666; font-size: 0.8rem;';
                moreDiv.textContent = `+${filteredIcons.length - maxResults} more icons...`;
                iconGrid.appendChild(moreDiv);
            }
        } catch (error) {
            console.error('Search failed:', error);
            iconGrid.innerHTML = '<div style="text-align: center; padding: 1rem; color: #666;">Search failed. Please try again.</div>';
        }
    }, 300); // 300ms debounce
});

// Helper function to create icon elements
async function createIconElement(iconName, isSelected = false) {
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
    
    try {
        svgWrapper.innerHTML = await getLucideIconSvg(iconName);
    } catch (error) {
        // Fallback for failed icons
        svgWrapper.innerHTML = '<circle cx="12" cy="12" r="10"/>';
    }
    
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
async function updatePreview() {
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
        
        const pathContent = await getLucideIconSvg(currentIcon);
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
(async () => {
    await initIconGrid();
    await updatePreview();
    updateValueDisplays();
})();
