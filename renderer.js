import './scss/styles.scss';             // Webpack will compile SASS and inject it

const { ipcRenderer } = require('electron');
const log = require('electron-log');
const communityThemes = require('./community-themes');

let platforms = [];
let games = [];
let emulators = [];
let remoteCommunityThemes = null;

async function fetchCommunityThemes() {
    if (remoteCommunityThemes) return remoteCommunityThemes;

    try {
        const repoOwner = 'sysoutch';
        const repoName = 'emuBro-themes';
        const themesPath = 'community-themes';
        
        // 1. Get the list of directories in community-themes
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${themesPath}`);
        if (!response.ok) throw new Error('Failed to fetch themes list');
        
        const contents = await response.json();
        const themeDirs = contents.filter(item => item.type === 'dir');
        
        const fetchedThemes = [];

        // 2. For each directory, fetch the theme.json
        // Note: The repo uses 'master' as the default branch based on the API response urls
        const branch = 'master'; 

        for (const dir of themeDirs) {
            try {
                const themeRes = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${themesPath}/${dir.name}/theme.json`);
                if (themeRes.ok) {
                    const theme = await themeRes.json();
                    
                    // Fix image path if it exists
                    if (theme.background && theme.background.image && !theme.background.image.startsWith('http') && !theme.background.image.startsWith('data:')) {
                        theme.background.image = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${themesPath}/${dir.name}/${theme.background.image}`;
                    }
                    
                    fetchedThemes.push(theme);
                }
            } catch (err) {
                log.error(`Failed to fetch theme from ${dir.name}:`, err);
            }
        }

        remoteCommunityThemes = fetchedThemes;
        return fetchedThemes;
    } catch (error) {
        log.error('Error fetching community themes:', error);
        return [];
    }
}

async function renderMarketplace() {
    const container = document.getElementById('marketplace-list');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">Fetching themes from GitHub...</div>';

    const themes = await fetchCommunityThemes();
    container.innerHTML = '';

    if (themes.length === 0) {
        container.innerHTML = '<div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger-color);">Could not load themes. Please check your connection or try again later.</div>';
        return;
    }

    themes.forEach(theme => {
        const card = document.createElement('div');
        card.className = 'marketplace-card';
        
        const hasBgImage = theme.background && theme.background.image;
        const bgPreviewStyle = hasBgImage 
            ? `background-image: url('${theme.background.image}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(135deg, ${theme.colors.bgPrimary}, ${theme.colors.bgSecondary});`;

        card.innerHTML = `
            <div class="marketplace-card-header" style="${bgPreviewStyle} height: 120px; border-radius: 6px; margin-bottom: 10px; position: relative; border: 1px solid var(--border-color); overflow: hidden;">
                <span class="author-tag" style="position: absolute; bottom: 8px; right: 8px; margin: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">By ${theme.author}</span>
            </div>
            <div class="theme-item-info">
                <span class="theme-item-name" style="font-weight: bold; font-size: 1.1rem;">${theme.name}</span>
            </div>
            <div class="theme-preview" style="margin: 10px 0;">
                <div class="theme-color-dot" style="background-color: ${theme.colors.bgPrimary}" title="Background"></div>
                <div class="theme-color-dot" style="background-color: ${theme.colors.accentColor}" title="Accent"></div>
                <div class="theme-color-dot" style="background-color: ${theme.colors.textPrimary}" title="Text"></div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="action-btn small preview-btn" style="flex: 1; background: var(--bg-tertiary);">Preview</button>
                <button class="action-btn launch-btn small add-btn" data-id="${theme.id}" style="flex: 1;">Add</button>
            </div>
        `;

        card.querySelector('.preview-btn').addEventListener('click', () => {
            applyCustomTheme(theme);
            // We don't update currentTheme or localStorage, so it's temporary
        });

        card.querySelector('.add-btn').addEventListener('click', () => {
            const newTheme = { ...theme, id: 'custom_' + Date.now() };
            saveCustomTheme(newTheme);
            alert(`"${theme.name}" has been added to your themes!`);
        });

        container.appendChild(card);
    });
}

ipcRenderer.on('window-moved', (event, position, screenGoal) => {
    const { x, y } = position;
    const { screenGoalX, screenGoalY } = screenGoal;
    const gameGrid = document.querySelector('main.game-grid');
    // const img = document.querySelector('main.game-grid img');
    // console.log('has image?', img);
    if (gameGrid) {
        // screenGoalX - x - image width / 2;
        const bgX = screenGoalX - x - (window.innerWidth / 2);
        const bgY = screenGoalY - y - (window.innerHeight / 2);
        gameGrid.style.backgroundPosition = `${bgX}px ${bgY}px`;
        // img.style.left = (screenGoalX - x) + 'px';
        // img.style.top = (screenGoalY - y) + 'px';
    }
    // console.log(`Moving window to: (${x}, ${y})`);
});

// ===== i18n (Internationalization) Setup =====
// Load translations from the global scope (set by translations-loader.js)
if (typeof allTranslations !== 'undefined') {
    i18n.loadTranslations(allTranslations);
}

// Function to update UI text based on i18n data attributes
function updateUILanguage() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n.t(key);
    });

    // Update placeholder text
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = i18n.t(key);
    });

    // Update option elements in selects
    document.querySelectorAll('option[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = i18n.t(key);
    });
}

// Listen for language changes
i18n.onChange(() => {
    updateUILanguage();
    // Re-render current view
    if (typeof renderGames === 'function') {
        renderGames(filteredGames);
    }
    if (typeof renderThemeManager === 'function') {
        renderThemeManager();
    }
});

// ===== DOM Elements =====
const gamesContainer = document.getElementById('games-container');
const userNameElement = document.getElementById('user-name');
const userAvatarElement = document.getElementById('user-avatar');
const totalGamesElement = document.getElementById('total-games');
const playTimeElement = document.getElementById('play-time');
const themeSelect = document.getElementById('theme-select');
const themeManagerBtn = document.getElementById('theme-manager-btn');
const themeManagerModal = document.getElementById('theme-manager-modal');
const closeThemeManagerBtn = document.getElementById('close-theme-manager');
const closeGameDetailsBtn = document.getElementById('close-game-details');
const pinFooterBtn = document.getElementById('pin-footer-btn');

// Current state
let filteredGames = [];
let currentFilter = 'all';
let currentSort = 'name';
let currentTheme = 'dark';
let editingThemeId = null;

// Theme Management
function initializeTheme() {
    // Load saved theme from localStorage
    const savedTheme = localStorage.getItem('theme') || 'dark';
    currentTheme = savedTheme;
    setTheme(savedTheme);
    
    if (themeSelect) {
        updateThemeSelector();
        themeSelect.addEventListener('change', (e) => {
            setTheme(e.target.value);
            localStorage.setItem('theme', e.target.value);
        });
    }
    
    // Language selector setup
    populateLanguageSelector();
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            i18n.setLanguage(e.target.value);
        });
    }
    
    // Theme toggle button listener
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Invert colors button listener
    const invertBtn = document.getElementById('invert-colors-btn');
    if (invertBtn) {
        invertBtn.addEventListener('click', invertColors);
    }
    
    // Theme manager button listener
    if (themeManagerBtn) {
        themeManagerBtn.addEventListener('click', openThemeManager);
    }
    
    if (closeThemeManagerBtn) {
        closeThemeManagerBtn.addEventListener('click', closeThemeManager);
    }
    
    // Close modal when clicking outside
    if (themeManagerModal) {
        themeManagerModal.addEventListener('click', (e) => {
            if (e.target === themeManagerModal) {
                closeThemeManager();
            }
        });
    }
}

const searchInput = document.querySelector('.search-bar input');
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    filteredGames = games.filter(game => 
        game.name.toLowerCase().includes(searchTerm) ||
        game.platform.toLowerCase().includes(searchTerm)
    );
    renderGames(filteredGames);
});

function toggleTheme() {
    if (currentTheme === 'dark') {
        setTheme('light');
        localStorage.setItem('theme', 'light');
        themeSelect.value = 'light';
    } else if (currentTheme === 'light') {
        setTheme('dark');
        localStorage.setItem('theme', 'dark');
        themeSelect.value = 'dark';
    } else {
        // Custom or generated theme: Flip Lightness
        const current = getCurrentThemeColors();
        const flipped = {
            bgPrimary: flipLightness(current.bgPrimary),
            textPrimary: flipLightness(current.textPrimary),
            bgSecondary: flipLightness(current.bgSecondary),
            textSecondary: flipLightness(current.textSecondary),
            // Keep accent hue but ensure visibility? Usually standard is keep accent.
            // But if accent is dark on dark, it might be dark on light.
            // Let's flip lightness of accent too to be safe, or just keep it.
            // User asked "pick opposite colors... turn dark to light".
            // Light mode usually has same brand color.
            // But if brand color is white/black, it needs flip.
            // Let's assume accent is colored.
            accentColor: current.accentColor, 
            borderColor: flipLightness(current.borderColor)
        };

        const tempTheme = {
            id: 'temp_flipped_' + Date.now(),
            name: 'Flipped Theme',
            colors: flipped,
            background: null, // Could carry over background if we wanted
            cardEffects: { glassEffect: true }
        };
        
        applyCustomTheme(tempTheme);
        // We don't save temp themes to localStorage 'customThemes' list
        // But we update currentTheme to allow toggling back
        currentTheme = tempTheme.id;
    }
}

function invertColors() {
    const current = getCurrentThemeColors();
    const inverted = {
        bgPrimary: invertHex(current.bgPrimary),
        textPrimary: invertHex(current.textPrimary),
        bgSecondary: invertHex(current.bgSecondary),
        textSecondary: invertHex(current.textSecondary),
        accentColor: invertHex(current.accentColor),
        borderColor: invertHex(current.borderColor)
    };
    
    const tempTheme = {
        id: 'temp_inverted_' + Date.now(),
        name: 'Inverted Theme',
        colors: inverted,
        background: null,
        cardEffects: { glassEffect: true }
    };
    
    applyCustomTheme(tempTheme);
    currentTheme = tempTheme.id;
}

function getCurrentThemeColors() {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    
    const getVar = (name) => {
        const val = styles.getPropertyValue(name).trim();
        return parseColorToHex(val) || '#000000';
    };

    return {
        bgPrimary: getVar('--bg-primary'),
        textPrimary: getVar('--text-primary'),
        bgSecondary: getVar('--bg-secondary'),
        textSecondary: getVar('--text-secondary'),
        accentColor: getVar('--accent-color'),
        borderColor: getVar('--border-color')
    };
}

function parseColorToHex(color) {
    if (!color) return '#000000';
    if (color.startsWith('#')) return color;
    
    // Handle rgb(r, g, b)
    const rgbMatch = color.match(/\d+/g);
    if (rgbMatch && rgbMatch.length >= 3) {
        return rgbToHex(parseInt(rgbMatch[0]), parseInt(rgbMatch[1]), parseInt(rgbMatch[2]));
    }
    
    // Fallback using canvas for named colors
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = color;
    return ctx.fillStyle;
}

// Color Utilities
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

function rgbToHex(r, g, b) {
    const toHex = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function invertHex(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, l };
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
}

function flipLightness(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    // Invert lightness: 1.0 - l
    const newRgb = hslToRgb(hsl.h, hsl.s, 1.0 - hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

function updateThemeSelector() {
    const customThemes = getCustomThemes();
    const options = [
        { value: 'dark', label: 'Dark Theme' },
        { value: 'light', label: 'Light Theme' },
        ...customThemes.map(t => ({ value: t.id, label: t.name }))
    ];
    
    const currentValue = themeSelect.value;
    themeSelect.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        themeSelect.appendChild(option);
    });
    themeSelect.value = currentValue;
}

function setTheme(theme) {
    currentTheme = theme;
    const root = document.documentElement;

    // 1. Reset all custom style properties first
    root.removeAttribute('style'); 

    // 2. Clear fixed background tracking
    disableFixedBackgroundTracking();

    if (theme === 'dark' || theme === 'light') {
        // Preset Themes: Apply the data-theme attribute
        root.setAttribute('data-theme', theme);
    } else {
        // Custom Themes: Apply specific colors
        const customThemes = getCustomThemes();
        const customTheme = customThemes.find(t => t.id === theme);
        if (customTheme) {
            applyCustomTheme(customTheme);
        }
    }
    
    // 3. Force the Theme Manager to refresh its active state
    if (themeManagerModal.classList.contains('active')) {
        renderThemeManager();
    }
}

let shouldUseAccentColorForBrand = true;

function applyCustomTheme(theme) {
    document.documentElement.removeAttribute('data-theme');
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.colors.bgPrimary);
    root.style.setProperty('--bg-secondary', theme.colors.bgSecondary);
    // Use tertiary if available, else fallback to secondary
    const tertiary = theme.colors.bgTertiary || theme.colors.bgSecondary;
    root.style.setProperty('--bg-tertiary', tertiary);
    // Quaternary is usually lighter/different than tertiary, but using tertiary as base for now if not specified
    // Ideally we'd have a bgQuaternary too, but tertiary is the requested one.
    root.style.setProperty('--bg-quaternary', tertiary); 
    
    root.style.setProperty('--text-primary', theme.colors.textPrimary);
    root.style.setProperty('--text-secondary', theme.colors.textSecondary);
    root.style.setProperty('--text-tertiary', '#999');
    root.style.setProperty('--border-color', theme.colors.borderColor);
    root.style.setProperty('--accent-color', theme.colors.accentColor);
    root.style.setProperty('--accent-light', theme.colors.accentColor);
    
    if (theme.colors.successColor) root.style.setProperty('--success-color', theme.colors.successColor);
    if (theme.colors.dangerColor) root.style.setProperty('--danger-color', theme.colors.dangerColor);
    if (shouldUseAccentColorForBrand) {
        const darkerColor = darkenHex(theme.colors.accentColor, 30);
        root.style.setProperty('--brand-color', darkerColor);
    }
    // Apply background image if present
    if (theme.background && theme.background.image) {
        applyBackgroundImage(theme.background);
    } else {
        // Remove background image if no image is set
        disableFixedBackgroundTracking();
        const gameGrid = document.querySelector('main.game-grid');
        if (gameGrid) {
            gameGrid.style.backgroundImage = 'none';
        }
    }
    
    // Apply or remove glass effect based on theme setting
    const enableGlass = !theme.cardEffects || theme.cardEffects.glassEffect !== false;
    applyGlassEffect(enableGlass);

    // Apply corner style
    applyCornerStyle(theme.cornerStyle || 'rounded');
}

function applyCornerStyle(style) {
    const root = document.documentElement;
    if (style === 'sharp') {
        root.style.setProperty('--radius-btn', '0px');
        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-sm', '0px');
    } else if (style === 'semi-rounded') {
        root.style.setProperty('--radius-btn', '4px');
        root.style.setProperty('--radius-input', '4px');
        root.style.setProperty('--radius-card', '4px');
        root.style.setProperty('--radius-sm', '2px');
    } else {
        // rounded (default) - explicit set might be needed if switching from sharp
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    }
}

function darkenHex(hex, percent) {
    // Remove the hash if it exists
    hex = hex.replace('#', '');
    
    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Darken each channel
    r = Math.floor(r * (1 - percent / 100));
    g = Math.floor(g * (1 - percent / 100));
    b = Math.floor(b * (1 - percent / 100));

    // Convert back to hex and pad with zeros if needed
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function applyBackgroundImage(bgConfig) {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return;
    
    const image = bgConfig.image;
    const position = bgConfig.position || 'centered';
    const repeat = bgConfig.repeat || 'no-repeat';
    const scale = bgConfig.scale || 'crop';
    
    gameGrid.style.backgroundImage = `url('${image}')`;
    gameGrid.style.backgroundRepeat = 'no-repeat';
    gameGrid.style.backgroundAttachment = 'scroll';
    
    // If fixed position is selected, we'll handle it with JavaScript to keep it fixed to the monitor
    if (position === 'fixed') {
        enableFixedBackgroundTracking(gameGrid);
    } else {
        disableFixedBackgroundTracking(gameGrid);
    }
    
    // Set background repeat based on repeat option
    gameGrid.style.backgroundRepeat = repeat;
    
    // Set background size based on scale mode
    switch (scale) {
        case 'original':
            gameGrid.style.backgroundSize = 'auto';
            break;
        case 'stretch':
            gameGrid.style.backgroundSize = '100% 100%';
            break;
        case 'crop':
            gameGrid.style.backgroundSize = 'cover';
            break;
        case 'zoom':
            gameGrid.style.backgroundSize = 'contain';
            break;
        default:
            gameGrid.style.backgroundSize = scale;
    }
    
    // Set background position
    gameGrid.style.backgroundPosition = position === 'centered' ? 'center' : 'center';
}

function applyGlassEffect(enable) {
    if (enable) {
        document.documentElement.setAttribute('data-glass-effect', 'enabled');
    } else {
        document.documentElement.removeAttribute('data-glass-effect');
    }
    log.info(`Glass effect: ${enable ? 'ON' : 'OFF'}`);
}

function getCustomThemes() {
    const themes = localStorage.getItem('customThemes');
    return themes ? JSON.parse(themes) : [];
}

function saveCustomTheme(theme) {
    const customThemes = getCustomThemes();
    const index = customThemes.findIndex(t => t.id === theme.id);
    
    if (index >= 0) {
        customThemes[index] = theme;
    } else {
        customThemes.push(theme);
    }
    
    localStorage.setItem('customThemes', JSON.stringify(customThemes));
    updateThemeSelector();
    renderThemeManager();
}

function deleteCustomTheme(id) {
    const customThemes = getCustomThemes();
    const theme = customThemes.find(t => t.id === id);
    const themeName = theme ? theme.name : 'this theme';

    const confirmDelete = confirm(i18n.t('messages.confirmDeleteTheme', { name: themeName }) || `Are you sure you want to delete "${themeName}"?`);
    if (!confirmDelete) return;

    const filtered = customThemes.filter(t => t.id !== id);
    localStorage.setItem('customThemes', JSON.stringify(filtered));
    
    // If the deleted theme was the current one, switch to dark
    if (currentTheme === id) {
        setTheme('dark');
        localStorage.setItem('theme', 'dark');
        if (themeSelect) themeSelect.value = 'dark';
    }

    updateThemeSelector();
    renderThemeManager();
}

// Theme Manager UI
function openThemeManager() {
    renderThemeManager();
    themeManagerModal.classList.add('active');
}

function closeThemeManager() {
    if (hasUnsavedChanges) {
        const confirmClose = confirm(i18n.t('messages.unsavedChanges') || "You have unsaved changes. Are you sure you want to close?");
        if (!confirmClose) return; // Stop if they want to stay
    }
    themeManagerModal.classList.remove('active');
    hideThemeForm();
    hasUnsavedChanges = false;
}

function renderThemeManager() {
    const presetContainer = document.getElementById('preset-themes');
    const customContainer = document.getElementById('custom-themes');
    const customThemes = getCustomThemes();
    
    // Render preset themes
    presetContainer.innerHTML = '';
    ['dark', 'light'].forEach(theme => {
        const isActive = currentTheme === theme;
        const item = createThemeItem(
            theme,
            theme.charAt(0).toUpperCase() + theme.slice(1) + ' Theme',
            'preset',
            isActive,
            theme
        );
        presetContainer.appendChild(item);
    });
    
    // Render custom themes
    customContainer.innerHTML = '';
    customThemes.forEach(theme => {
        const isActive = currentTheme === theme.id;
        const item = createThemeItem(
            theme.id,
            theme.name,
            'custom',
            isActive,
            theme
        );
        customContainer.appendChild(item);
    });
}

// Tab Switching Logic
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.dataset.tab;
        
        // Update Buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Update Content
        if (target === 'marketplace') {
            document.getElementById('local-themes-view').style.display = 'none';
            document.getElementById('marketplace-view').style.display = 'block';
            renderMarketplace();
        } else {
            document.getElementById('local-themes-view').style.display = 'block';
            document.getElementById('marketplace-view').style.display = 'none';
        }
    });
});

function createThemeItem(id, name, type, isActive, themeData) {
    const item = document.createElement('div');
    item.className = `theme-item ${isActive ? 'active' : ''}`;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    
    // Determine which colors to show in the dots
    let dots = [];
    if (type === 'preset') {
        dots = id === 'dark' 
            ? ['#1e1e1e', '#ffffff', '#66ccff'] 
            : ['#f5f5f5', '#1a1a1a', '#0099cc'];
    } else {
        // Show Background, Text, and Accent for custom themes
        dots = [
            themeData.colors.bgPrimary, 
            themeData.colors.textPrimary, 
            themeData.colors.accentColor
        ];
    }
    
    dots.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'theme-color-dot';
        dot.style.backgroundColor = color;
        dot.style.boxShadow = `0 0 5px ${color}44`; // Subtle glow
        preview.appendChild(dot);
    });
    
    item.appendChild(preview);
    
    item.innerHTML += `
        <div class="theme-item-info">
            <span class="theme-item-name">${name}</span>
            <span class="theme-item-type">${type === 'preset' ? 'Official' : 'Custom'}</span>
        </div>
    `;

    // Re-attach the click listener
    item.addEventListener('click', () => {
        setTheme(id);
        localStorage.setItem('theme', id);
        if (themeSelect) themeSelect.value = id;
        renderThemeManager();
    });

    // Add action buttons for custom themes
    if (type === 'custom') {
        const actions = document.createElement('div');
        actions.className = 'theme-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn small';
        editBtn.innerHTML = '✎'; // Edit Icon
        editBtn.onclick = (e) => { e.stopPropagation(); editTheme(themeData); };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn remove-btn small';
        deleteBtn.innerHTML = '×'; // Delete Icon
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteCustomTheme(id); };
        
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
    }
    
    return item;
}

let hasUnsavedChanges = false;

// setupLivePreview removed - logic moved to setupColorPickerListeners

function showThemeForm() {
    document.getElementById('theme-form').style.display = 'flex';
}

function hideThemeForm() {
    document.getElementById('theme-form').style.display = 'none';
    editingThemeId = null;
    setTheme(currentTheme); 
}

function resetThemeForm() {
    document.getElementById('theme-name').value = '';
    document.getElementById('color-bg-primary').value = '#1e1e1e';
    document.getElementById('color-text-primary').value = '#ffffff';
    document.getElementById('color-text-secondary').value = '#cccccc';
    document.getElementById('color-accent').value = '#66ccff';
    document.getElementById('color-bg-secondary').value = '#2d2d2d';
    document.getElementById('color-border').value = '#444444';
    document.getElementById('color-bg-header').value = '#2d2d2d';
    document.getElementById('color-bg-sidebar').value = '#333333';
    document.getElementById('color-bg-actionbar').value = '#252525';
    document.getElementById('color-bg-tertiary').value = '#333333';
    document.getElementById('color-success').value = '#4caf50';
    document.getElementById('color-danger').value = '#f44336';
    document.getElementById('bg-position').value = 'centered';
    document.getElementById('bg-scale').value = 'crop';
    document.getElementById('bg-background-repeat').value = 'no-repeat';
    document.getElementById('glass-effect-toggle').checked = true;
    document.getElementById('corner-style').value = 'rounded';
    clearBackgroundImage();
    window.currentBackgroundImage = null;
}

function editTheme(theme) {
    editingThemeId = theme.id;
    document.getElementById('form-title').textContent = 'Edit Theme';
    document.getElementById('theme-name').value = theme.name;
    document.getElementById('color-bg-primary').value = theme.colors.bgPrimary;
    document.getElementById('color-text-primary').value = theme.colors.textPrimary;
    document.getElementById('color-text-secondary').value = theme.colors.textSecondary;
    document.getElementById('color-accent').value = theme.colors.accentColor;
    document.getElementById('color-bg-secondary').value = theme.colors.bgSecondary;
    document.getElementById('color-border').value = theme.colors.borderColor;
    
    // New colors
    document.getElementById('color-bg-header').value = theme.colors.bgHeader || theme.colors.bgSecondary;
    document.getElementById('color-bg-sidebar').value = theme.colors.bgSidebar || theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-bg-actionbar').value = theme.colors.bgActionbar || theme.colors.bgQuaternary || theme.colors.bgSecondary;
    document.getElementById('color-bg-tertiary').value = theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-success').value = theme.colors.successColor || '#4caf50';
    document.getElementById('color-danger').value = theme.colors.dangerColor || '#f44336';

    // Set background properties
    if (theme.background) {
        document.getElementById('bg-position').value = theme.background.position || 'centered';
        document.getElementById('bg-scale').value = theme.background.scale || 'crop';
        document.getElementById('bg-background-repeat').value = theme.background.repeat || 'no-repeat';
        
        if (theme.background.image) {
            window.currentBackgroundImage = theme.background.image;
            document.getElementById('bg-preview-img').src = theme.background.image;
            document.getElementById('bg-preview').style.display = 'block';
            document.getElementById('bg-image-name').textContent = 'Background image loaded';
            document.getElementById('clear-bg-image-btn').style.display = 'inline-block';
        } else {
            clearBackgroundImage();
        }
    }
    
    // Set card effects properties
    if (theme.cardEffects) {
        document.getElementById('glass-effect-toggle').checked = theme.cardEffects.glassEffect !== false;
    } else {
        document.getElementById('glass-effect-toggle').checked = true;
    }
    
    // Set corner style
    document.getElementById('corner-style').value = theme.cornerStyle || 'rounded';

    updateColorTexts();
    showThemeForm();
    setupBackgroundImageListeners();
    setupColorPickerListeners();
}

function updateColorTexts() {
    const pickers = document.querySelectorAll('.color-picker');
    pickers.forEach(picker => {
        const textInput = picker.parentElement.querySelector('.color-text');
        if (textInput) {
            textInput.value = picker.value.toUpperCase();
        }
    });
}

// Initialize the app
async function initializeApp() {
    try {
        // Initialize theme first
        initializeTheme();
        
        // Update UI language
        updateUILanguage();
        
        // Load user info
        const userInfo = await ipcRenderer.invoke('get-user-info');
        updateUserInfo(userInfo);
        
        // Load library stats
        const stats = await ipcRenderer.invoke('get-library-stats');
        updateLibraryStats(stats);
        
        // Load games
        games = await ipcRenderer.invoke('get-games');
        filteredGames = [...games];
        renderGames(filteredGames);

        initializePlatformFilterOptions();

        // Load emulators
        emulators = await ipcRenderer.invoke('get-emulators');
        
        // Populate drive selector
        populateDriveSelector();
        
        // Set up event listeners
        setupEventListeners();
        setupThemeManagerListeners();
        
        log.info('App initialized successfully');
    } catch (error) {
        log.error('Failed to initialize app:', error);
        alert(i18n.t('messages.initializationFailed'));
    }
}

function setupThemeManagerListeners() {
    const createBtn = document.getElementById('create-theme-btn');
    const saveBtn = document.getElementById('save-theme-btn');
    const cancelBtn = document.getElementById('cancel-theme-btn');
    const bgImageInput = document.getElementById('bg-image-input');
    const clearBgImageBtn = document.getElementById('clear-bg-image-btn');
    const resetDefaultsBtn = document.getElementById('reset-theme-defaults');
    
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            editingThemeId = null;
            document.getElementById('form-title').textContent = 'Create New Theme';
            resetThemeForm();
            showThemeForm();
            setupColorPickerListeners();
            setupBackgroundImageListeners();
        });
    }

    if (resetDefaultsBtn) {
        resetDefaultsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Reset to Dark Theme values as the baseline
            resetThemeForm();
            // Trigger live preview update immediately
            const event = new Event('input');
            document.querySelectorAll('.color-picker').forEach(p => p.dispatchEvent(event));
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', saveTheme);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideThemeForm);
    }

    if (bgImageInput) {
        bgImageInput.addEventListener('change', handleBackgroundImageUpload);
    }

    if (clearBgImageBtn) {
        clearBgImageBtn.addEventListener('click', clearBackgroundImage);
    }

    // Live Preview for Background Options
    const updateLiveBackground = () => {
        hasUnsavedChanges = true;
        if (window.currentBackgroundImage) {
            const bgConfig = {
                image: window.currentBackgroundImage,
                position: document.getElementById('bg-position').value,
                scale: document.getElementById('bg-scale').value,
                repeat: document.getElementById('bg-background-repeat').value
            };
            applyBackgroundImage(bgConfig);
        }
    };

    const bgPositionInput = document.getElementById('bg-position');
    const bgScaleInput = document.getElementById('bg-scale');
    const bgRepeatInput = document.getElementById('bg-background-repeat');

    if (bgPositionInput) bgPositionInput.addEventListener('change', updateLiveBackground);
    if (bgScaleInput) bgScaleInput.addEventListener('change', updateLiveBackground);
    if (bgRepeatInput) bgRepeatInput.addEventListener('change', updateLiveBackground);

    // Live Preview for Corner Style
    const cornerStyleSelect = document.getElementById('corner-style');
    if (cornerStyleSelect) {
        cornerStyleSelect.addEventListener('change', (e) => {
            hasUnsavedChanges = true;
            applyCornerStyle(e.target.value);
        });
    }

    // Live Preview for Glass Effect
    const glassEffectToggle = document.getElementById('glass-effect-toggle');
    if (glassEffectToggle) {
        glassEffectToggle.addEventListener('change', (e) => {
            hasUnsavedChanges = true;
            applyGlassEffect(e.target.checked);
        });
    }
}

function setupColorPickerListeners() {
    const root = document.documentElement;
    const colorMap = {
        'color-bg-primary': '--bg-primary',
        'color-text-primary': '--text-primary',
        'color-text-secondary': '--text-secondary',
        'color-accent': '--accent-color',
        'color-bg-secondary': '--bg-secondary',
        'color-border': '--border-color',
        'color-bg-header': '--bg-header',
        'color-bg-sidebar': '--bg-sidebar',
        'color-bg-actionbar': '--bg-actionbar',
        'color-bg-tertiary': '--bg-tertiary',
        'color-success': '--success-color',
        'color-danger': '--danger-color'
    };

    document.querySelectorAll('.color-picker').forEach(picker => {
        // Remove old listeners to avoid duplicates
        const newPicker = picker.cloneNode(true);
        picker.parentNode.replaceChild(newPicker, picker);
        
        // Update text input on change/input
        const handleUpdate = (e) => {
            updateColorTexts();
            
            // Live Preview Logic
            hasUnsavedChanges = true;
            const color = e.target.value;
            const id = newPicker.id;
            
            if (colorMap[id]) {
                root.style.setProperty(colorMap[id], color);
                
                // If it's the accent color, update brand color too
                if (id === 'color-accent') {
                    root.style.setProperty('--brand-color', darkenHex(color, 30));
                }
            }
        };

        newPicker.addEventListener('change', handleUpdate);
        newPicker.addEventListener('input', handleUpdate);
    });
}

function setupBackgroundImageListeners() {
    const bgImageInput = document.getElementById('bg-image-input');
    if (bgImageInput) {
        bgImageInput.addEventListener('change', handleBackgroundImageUpload);
    }
}

function handleBackgroundImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const imageData = e.target.result;
        window.currentBackgroundImage = imageData;
        
        // Show preview
        const preview = document.getElementById('bg-preview');
        const previewImg = document.getElementById('bg-preview-img');
        previewImg.src = imageData;
        preview.style.display = 'block';
        
        // Update filename display
        document.getElementById('bg-image-name').textContent = `Selected: ${file.name}`;
        document.getElementById('clear-bg-image-btn').style.display = 'inline-block';

        // Apply Live Preview
        hasUnsavedChanges = true;
        const bgConfig = {
            image: imageData,
            position: document.getElementById('bg-position').value,
            scale: document.getElementById('bg-scale').value,
            repeat: document.getElementById('bg-background-repeat').value
        };
        applyBackgroundImage(bgConfig);
    };
    reader.readAsDataURL(file);
}

function clearBackgroundImage() {
    window.currentBackgroundImage = null;
    document.getElementById('bg-image-input').value = '';
    document.getElementById('bg-preview').style.display = 'none';
    document.getElementById('bg-image-name').textContent = '';
    document.getElementById('clear-bg-image-btn').style.display = 'none';

    // Clear Live Preview
    hasUnsavedChanges = true;
    const gameGrid = document.querySelector('main.game-grid');
    if (gameGrid) {
        gameGrid.style.backgroundImage = 'none';
    }
    disableFixedBackgroundTracking();
}

function saveTheme() {
    const name = document.getElementById('theme-name').value.trim();
    if (!name) {
        alert(i18n.t('messages.enterThemeName'));
        return;
    }
    
    const theme = {
        id: editingThemeId || 'custom_' + Date.now(),
        name: name,
        colors: {
            bgPrimary: document.getElementById('color-bg-primary').value,
            textPrimary: document.getElementById('color-text-primary').value,
            textSecondary: document.getElementById('color-text-secondary').value,
            accentColor: document.getElementById('color-accent').value,
            bgSecondary: document.getElementById('color-bg-secondary').value,
            borderColor: document.getElementById('color-border').value,
            bgHeader: document.getElementById('color-bg-header').value,
            bgSidebar: document.getElementById('color-bg-sidebar').value,
            bgActionbar: document.getElementById('color-bg-actionbar').value,
            bgTertiary: document.getElementById('color-bg-tertiary').value,
            successColor: document.getElementById('color-success').value,
            dangerColor: document.getElementById('color-danger').value
        },
        background: {
            image: window.currentBackgroundImage || null,
            position: document.getElementById('bg-position').value,
            scale: document.getElementById('bg-scale').value,
            repeat: document.getElementById('bg-background-repeat').value
        },
        cardEffects: {
            glassEffect: document.getElementById('glass-effect-toggle').checked
        },
        cornerStyle: document.getElementById('corner-style').value
    };
    
    saveCustomTheme(theme);
    hasUnsavedChanges = false;
    hideThemeForm();
    alert(i18n.t('theme.saved'));
}

// Update user info in the UI
function updateUserInfo(userInfo) {
    userNameElement.textContent = userInfo.username;
    userAvatarElement.src = userInfo.avatar;
}

// Update library stats in the UI
function updateLibraryStats(stats) {
    totalGamesElement.textContent = stats.totalGames;
    playTimeElement.textContent = stats.totalPlayTime;
}

// Populate drive selector with available drives
async function populateDriveSelector() {
    try {
        const drives = await ipcRenderer.invoke('get-drives');
        const driveSelector = document.getElementById('drive-selector');
        
        // Clear existing options
        driveSelector.innerHTML = '<option value="">Select Drive</option>';
        
        // Add drive options
        drives.forEach(drive => {
            const option = document.createElement('option');
            option.value = drive;
            option.textContent = drive;
            driveSelector.appendChild(option);
        });
    } catch (error) {
        log.error('Failed to populate drive selector:', error);
    }
}

// Set up event listeners
function setupEventListeners() {
    // Platform filter
    const platformFilter = document.getElementById('platform-filter');
    platformFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        applyFilters();
    });
    
    // Sort filter
    const sortFilter = document.getElementById('sort-filter');
    sortFilter.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFilters();
    });
    
    // Tool selection
    const toolsList = document.getElementById('tools-list');
    toolsList.addEventListener('click', (e) => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const tool = e.target.getAttribute('data-tool');
            loadTool(tool);
        }
    });
    
    // Search games functionality
    const searchGamesBtn = document.getElementById('search-games-btn');
    if (searchGamesBtn) {
        searchGamesBtn.addEventListener('click', searchForGamesAndEmulators);
    }
    
    // Close game details footer
    if (closeGameDetailsBtn) {
        closeGameDetailsBtn.addEventListener('click', () => {
            document.getElementById('game-details-footer').style.display = 'none';
        });
    }

    // Pin footer button
    if (pinFooterBtn) {
        pinFooterBtn.addEventListener('click', toggleFooterPin);
    }
}

function toggleFooterPin() {
    const footer = document.getElementById('game-details-footer');
    const isPinned = footer.classList.toggle('pinned');
    
    // Toggle glass effect
    if (isPinned) {
        footer.classList.remove('glass');
        pinFooterBtn.classList.add('active');
        pinFooterBtn.innerHTML = '🔒'; // Lock icon for pinned
        pinFooterBtn.title = "Unpin Footer";
    } else {
        footer.classList.add('glass');
        pinFooterBtn.classList.remove('active');
        pinFooterBtn.innerHTML = '📌'; // Pin icon
        pinFooterBtn.title = "Pin Footer";
    }
}

// Apply filters and sorting
function applyFilters() {
    filteredGames = [...games];
    
    // Apply platform filter
    if (currentFilter !== 'all') {
        filteredGames = filteredGames.filter(game => game.platformShortName.toLowerCase() === currentFilter);
    }
    
    // Apply sorting
    switch (currentSort) {
        case 'rating':
            filteredGames.sort((a, b) => b.rating - a.rating);
            break;
        case 'price':
            filteredGames.sort((a, b) => a.price - b.price);
            break;
        case 'platform':
            filteredGames.sort((a, b) => (a.platformName || a.platformShortName || 'Unknown').localeCompare(b.platformName || b.platformShortName || 'Unknown'));
            break;
        default: // sort by name
            filteredGames.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    renderGames(filteredGames);
}

// Render games to the UI
function renderGames(gamesToRender) {
    gamesContainer.innerHTML = '';
    
    if (gamesToRender.length === 0) {
        gamesContainer.innerHTML = '<p>No games found.</p>';
        return;
    }
    
    // Check current view mode
    const activeView = document.querySelector('.view-btn.active').dataset.view;
    
    if (activeView === 'table') {
        renderGamesAsTable(gamesToRender);
    } else if (activeView === 'list') {
        renderGamesAsList(gamesToRender);
    } else if (activeView === 'slideshow') {
        renderGamesAsSlideshow(gamesToRender);
    } else if (activeView === 'random') {
        renderGamesAsRandom(gamesToRender);
    } else {
        // Default to cover view
        gamesToRender.forEach(game => {
            const gameCard = createGameCard(game);
            gamesContainer.appendChild(gameCard);
        });
    }
}

function initializePlatformFilterOptions() {
    const platformFilter = document.getElementById('platform-filter');
    // Clear existing options except "All Platforms"
    platformFilter.innerHTML = '<option value="all">All Platforms</option>';
    const platforms = new Set(games.map(game => game.platformShortName.toLowerCase()));
    platforms.forEach(platform => {
        const option = document.createElement('option');
        option.value = platform;
        option.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);
        platformFilter.appendChild(option);
    });
}

function addPlatformFilterOption(platformShortName) {
    const platformFilter = document.getElementById('platform-filter');
    const exists = Array.from(platformFilter.options).some(option => option.value === platformShortName.toLowerCase());
    if (!exists) {
        const option = document.createElement('option');
        option.value = platformShortName;
        option.textContent = platformShortName;
        platformFilter.appendChild(option);
    }
}

// Render games as a table view
function renderGamesAsTable(gamesToRender) {
    const table = document.createElement('table');
    table.className = 'games-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Cover</th>
                <th>Game</th>
                <th>Genre</th>
                <th>Rating</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${gamesToRender.map(game => {
                let gameImageToUse = game.image;
                const platformShortName = game.platformShortName.toLowerCase();
                if (!gameImageToUse) {
                    gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
                }
                const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
                return `
                <tr>
                    <td class="table-image-cell"><img src="${gameImageToUse}" alt="${game.name}" class="table-game-image" loading="lazy" /></td>
                    <td>${game.name}</td>
                    <td>${game.genre}</td>
                    <td>★ ${game.rating}</td>
                    <td class="table-image-cell"><img src="${platformIcon}" alt="${game.platformShortName}" class="table-platform-image" loading="lazy" /></td>
                    <td>${game.isInstalled ? 'Installed' : 'Not Installed'}</td>
                    <td>
                        <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                        <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
                    </td>
                </tr>
            `;}).join('')}
        </tbody>
    `;
    
    gamesContainer.appendChild(table);
    
    // Add event listeners to buttons in the table
    const buttons = table.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', handleGameAction);
    });
}

// Render games as a list view (single column)
function renderGamesAsList(gamesToRender) {
    const listContainer = document.createElement('div');
    listContainer.className = 'games-list';
    
    gamesToRender.forEach(game => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        
        let gameImageToUse = game.image;
        if (!gameImageToUse && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        
        const platformShortName = game.platformShortName.toLowerCase();
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        
        listItem.innerHTML = `
            <img src="${gameImageToUse}" alt="${game.name}" class="list-item-image" loading="lazy" />
            <div class="list-item-info">
                <h3 class="list-item-title">${game.name}</h3>
                <span class="list-item-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="list-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platformName || game.platformShortName || 'Unknown'}</span>
                </span>
                <p class="list-item-genre">${game.genre}</p>
                <div class="list-item-meta">
                    <span class="list-item-rating">★ ${game.rating}</span>
                    <span class="list-item-status">${game.isInstalled ? 'Installed' : 'Not Installed'}</span>
                </div>
            </div>
            <div class="list-item-actions">
                <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
            </div>
        `;
        
        // Add event listeners to buttons
        const buttons = listItem.querySelectorAll('.action-btn');
        buttons.forEach(button => {
            button.addEventListener('click', handleGameAction);
        });
        
        listContainer.appendChild(listItem);
    });
    
    gamesContainer.appendChild(listContainer);
}

// Render games as a slideshow view (horizontal carousel)
function renderGamesAsSlideshow(gamesToRender) {
    const slideshowContainer = document.createElement('div');
    slideshowContainer.className = 'slideshow-container';
    
    let currentIndex = 0;
    
    const carouselWrapper = document.createElement('div');
    carouselWrapper.className = 'slideshow-carousel-wrapper';
    
    const carouselInner = document.createElement('div');
    carouselInner.className = 'slideshow-carousel-inner';
    
    function getGameImage(game) {
        let gameImageToUse = game.image;
        if (!gameImageToUse && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        return gameImageToUse;
    }
    
    function updateSlideshow() {
        carouselInner.innerHTML = '';
        
        // Previous game (faded)
        const prevIndex = (currentIndex - 1 + gamesToRender.length) % gamesToRender.length;
        const prevGame = gamesToRender[prevIndex];
        const prevCard = document.createElement('div');
        prevCard.className = 'slideshow-card slideshow-card-prev';
        prevCard.innerHTML = `
            <img src="${getGameImage(prevGame)}" alt="${prevGame.name}" class="slideshow-image" loading="lazy" />
            <div class="slideshow-card-label">Previous</div>
        `;
        carouselInner.appendChild(prevCard);
        
        // Current game (main)
        const game = gamesToRender[currentIndex];
        const formattedPrice = game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free';
        const platformShortName = game.platformShortName.toLowerCase();
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        const gameCard = document.createElement('div');
        gameCard.className = 'slideshow-card slideshow-card-current';
        gameCard.innerHTML = `
            <img src="${getGameImage(game)}" alt="${game.name}" class="slideshow-image" loading="lazy" />
            <div class="slideshow-info">
                <h2 class="slideshow-title">${game.name}</h2>
                <span class="slideshow-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="slideshow-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platformName || game.platformShortName || 'Unknown'}</span>
                </span>
                <p class="slideshow-genre">${game.genre}</p>
                <div class="slideshow-meta">
                    <span class="slideshow-rating">★ ${game.rating}</span>
                <p class="slideshow-status">${game.isInstalled ? 'Installed' : 'Not Installed'}</p>
                <div class="slideshow-actions">
                    <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                    <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
                </div>
            </div>
            <div class="slideshow-counter">${currentIndex + 1} / ${gamesToRender.length}</div>
        `;
        
        const buttons = gameCard.querySelectorAll('.action-btn');
        buttons.forEach(button => {
            button.addEventListener('click', handleGameAction);
        });
        carouselInner.appendChild(gameCard);
        
        // Next game (faded)
        const nextIndex = (currentIndex + 1) % gamesToRender.length;
        const nextGame = gamesToRender[nextIndex];
        const nextCard = document.createElement('div');
        nextCard.className = 'slideshow-card slideshow-card-next';
        nextCard.innerHTML = `
            <img src="${getGameImage(nextGame)}" alt="${nextGame.name}" class="slideshow-image" loading="lazy" />
            <div class="slideshow-card-label">Next</div>
        `;
        carouselInner.appendChild(nextCard);
    }
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'slideshow-controls';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'slideshow-btn prev-btn';
    prevBtn.textContent = '❮ Previous';
    prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + gamesToRender.length) % gamesToRender.length;
        updateSlideshow();
    });
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'slideshow-btn next-btn';
    nextBtn.textContent = 'Next ❯';
    nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % gamesToRender.length;
        updateSlideshow();
    });
    
    updateSlideshow();
    carouselWrapper.appendChild(carouselInner);
    slideshowContainer.appendChild(carouselWrapper);
    controlsContainer.appendChild(prevBtn);
    controlsContainer.appendChild(nextBtn);
    slideshowContainer.appendChild(controlsContainer);
    gamesContainer.appendChild(slideshowContainer);
}

// Render games as a random view (shuffle and suggest)
function renderGamesAsRandom(gamesToRender) {
    const randomContainer = document.createElement('div');
    randomContainer.className = 'random-container';
    
    let currentIndex = 0;
    let isShuffling = false;
    let shuffleInterval = null;
    
    const gameDisplay = document.createElement('div');
    gameDisplay.className = 'random-display';
    
    function updateRandomDisplay() {
        const game = gamesToRender[currentIndex];
        const formattedPrice = game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free';
        let gameImageToUse = game.image;
        if (!gameImageToUse && game.platformShortName) {
            const platformShortName = game.platformShortName.toLowerCase();
            gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        }
        
        const platformShortName = game.platformShortName.toLowerCase();
        const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`;
        
        gameDisplay.innerHTML = `
            <img src="${gameImageToUse}" alt="${game.name}" class="random-image" loading="lazy" />
            <div class="random-info">
                <h2 class="random-title">${game.name}</h2>
                <span class="random-platform-badge">
                    <img src="${platformIcon}" alt="${game.platformShortName}" class="random-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                    <span>${game.platformName || game.platformShortName || 'Unknown'}</span>
                </span>
                <p class="random-genre">${game.genre}</p>
                <div class="random-meta">
                    <span class="random-rating">★ ${game.rating}</span>
            </div>
        `;
    }
    
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'random-controls';
    
    const shuffleBtn = document.createElement('button');
    shuffleBtn.className = 'action-btn random-shuffle-btn';
    shuffleBtn.textContent = '🎲 Shuffle & Suggest';
    shuffleBtn.addEventListener('click', () => {
        if (isShuffling) {
            // Stop shuffling and show final suggestion
            isShuffling = false;
            shuffleBtn.textContent = '🎲 Shuffle & Suggest';
            clearInterval(shuffleInterval);
        } else {
            // Start shuffling
            isShuffling = true;
            shuffleBtn.textContent = 'Stop ⏹';
            let shuffleCount = 0;
            const maxShuffles = 30;
            
            shuffleInterval = setInterval(() => {
                currentIndex = Math.floor(Math.random() * gamesToRender.length);
                updateRandomDisplay();
                shuffleCount++;
                
                if (shuffleCount >= maxShuffles) {
                    // Stop and show final suggestion
                    isShuffling = false;
                    shuffleBtn.textContent = '🎲 Shuffle & Suggest';
                    clearInterval(shuffleInterval);
                    
                    // Show success message
                    const msgEl = document.createElement('p');
                    msgEl.className = 'random-suggestion';
                    msgEl.textContent = `Why not play "${gamesToRender[currentIndex].name}" now?`;
                    randomContainer.appendChild(msgEl);
                    
                    // Remove message after 3 seconds
                    setTimeout(() => {
                        msgEl.remove();
                    }, 3000);
                }
            }, 100);
        }
    });
    
    updateRandomDisplay();
    controlsContainer.appendChild(shuffleBtn);
    
    randomContainer.appendChild(gameDisplay);
    randomContainer.appendChild(controlsContainer);
    gamesContainer.appendChild(randomContainer);
}

// Create a game card element
function createGameCard(game) {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.dataset.gameId = game.id;
    
    // Format price
    const formattedPrice = game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free';
    let gameImageToUse = game.image;
    const platformShortName = game.platformShortName.toLowerCase();
    if (!gameImageToUse) {
        // get shortname of platform from game
        gameImageToUse = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`; // Default image
        // Find emulator for the platform
        // const emulator = emulators.find(emu => emu.supportedPlatforms.map(p => p.toLowerCase()).includes(platformShortName));
        // const emulatorShortName = emulator ? emulator.shortName : 'pcsx2';
        // if (emulator && emulator.image) {
        //     gameImageToUse = emulator.image;
        // }
        // if (!gameImageToUse) {
        //     gameImageToUse = `emubro-resources/emulators/pcsx2.png`; // Default image
        // }
    }
    const platformIcon = `emubro-resources/platforms/${platformShortName}/logos/default.png`; // Default image
    card.innerHTML = `
        <img src="${gameImageToUse}" alt="${game.name}" class="game-image" loading="lazy" />
        <div class="game-info">
            <h3 class="game-title">${game.name}</h3>
            <span class="game-platform-badge">
                <img src="${platformIcon}" alt="${game.platformShortName}" class="game-platform-icon" loading="lazy" onerror="this.style.display='none'" />
                <span>${game.platformName || game.platformShortName || 'Unknown'}</span>
            </span>
            <div class="game-more">
                <div class="game-rating">★ ${game.rating}</div>
                <p class="game-genre">${game.genre}</p>
                <div class="game-actions">
                    <button class="action-btn launch-btn" data-game-id="${game.id}" data-action="launch">Launch</button>
                    <button class="action-btn remove-btn" data-game-id="${game.id}" data-action="remove">Remove</button>
                </div>
            </div>
        </div>
    `;
    
    // Add event listeners to buttons
    const buttons = card.querySelectorAll('.action-btn');
    buttons.forEach(button => {
        button.addEventListener('click', handleGameAction);
    });
    
    // Add click event to show game details in footer
    card.addEventListener('click', () => {
        showGameDetails(game);
    });
    
    return card;
}

// Handle game actions (install, uninstall, launch)
async function handleGameAction(event) {
    const button = event.currentTarget;
    const gameId = parseInt(button.dataset.gameId);
    const action = button.dataset.action;
    
    try {
        switch (action) {
            case 'uninstall':
                await removeGame(gameId);
                break;
            case 'launch':
                await launchGame(gameId);
                break;
        }
    } catch (error) {
        log.error(`Failed to ${action} game ${gameId}:`, error);
        alert(`Failed to ${action} the game. Please check the logs for more information.`);
    }
}

async function removeGame(gameId) {
    const result = await ipcRenderer.invoke('remove-game', gameId);
    if (result.success) {
        // Update UI to show install button
        const gameCard = document.querySelector(`[data-game-id="${gameId}"]`);
        if (gameCard) {
            // Create new button element instead of modifying innerHTML
            const actionsContainer = gameCard.querySelector('.game-actions');
            actionsContainer.innerHTML = '';
            
            const installButton = document.createElement('button');
            installButton.className = 'action-btn install-btn';
            installButton.textContent = 'Install';
            installButton.dataset.gameId = gameId;
            installButton.dataset.action = 'install';
            installButton.addEventListener('click', handleGameAction);
            
            actionsContainer.appendChild(installButton);
        }
        
        alert(i18n.t('messages.removalStarted'));
    } else {
        alert(i18n.tf('messages.removalFailed', { message: result.message }));
    }
}

// Launch a game
async function launchGame(gameId) {
    console.log('Launching game with ID:', gameId);
    const result = await ipcRenderer.invoke('launch-game', gameId);
    if (result.success) {
        // alert(i18n.t('messages.gameLaunched'));
    } else {
        alert(i18n.tf('messages.launchFailed', { message: result.message }));
    }
}

// ===== Drag and Drop Handlers =====
function setupDragDrop() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    // We use a counter to handle children elements correctly
    let dragCounter = 0;

    mainContent.addEventListener('dragenter', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        mainContent.classList.add('drag-over');
    });

    mainContent.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
    });

    mainContent.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        
        // If counter hits 0, we've left the container and its children
        // If e.screenX/Y are 0, it usually means we left the window entirely
        if (dragCounter === 0 || e.screenX === 0) {
            mainContent.classList.remove('drag-over');
        }
    });

    // Handle dropping
    mainContent.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Reset counter and UI
        dragCounter = 0;
        mainContent.classList.remove('drag-over');

        try {
            const files = e.dataTransfer.files;
            if (!files || files.length === 0) return;

            for (const file of files) {
                // file.path is unique to Electron/Webview for OS files
                const filePath = file.path; 
                
                if (!filePath) continue;

                const result = await ipcRenderer.invoke('check-path-type', filePath);
                if (result.isDirectory) {
                    await handleFolderDrop(filePath);
                } else {
                    await handleFileDrop(filePath, file.name, file.type);
                }
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    });

    // ESC Key still works as a safety net
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            dragCounter = 0;
            mainContent.classList.remove('drag-over');
        }
    });
}

async function handleFolderDrop(folderPath) {
    try {
        log.info('Folder dropped:', folderPath);

        // Call the existing browse-games-and-emus function with the real path
        const result = await ipcRenderer.invoke('browse-games-and-emus', folderPath);
        if (result.success) {
            platforms = [...platforms, ...result.platforms];
            games = [...games, ...result.games];
            filteredGames = [...games];
            renderGames(filteredGames);
            for (const platform in platforms) {
                addPlatformFilterOption(platform);
            }
            alert(i18n.tf('messages.foundGames', { count: result.games.length }));
        } else {
            alert(i18n.tf('messages.searchFailed', { message: result.message }));
        }
    } catch (error) {
        log.error('Failed to process dropped folder:', error);
        alert(`Failed to process folder: ${error.message}`);
    }
}

async function handleFileDrop(filePath, fileName, fileType) {
    try {
        log.info('File dropped:', fileName, fileType, filePath);
        
        // TODO: Implement file drop handler
        // This could be for:
        // - Importing ROM files directly
        // - Importing custom themes (JSON)
        // - Importing cover art
        // etc.
        if (fileName.endsWith('.exe')) {
            // call processEmulatorExe in main.js
            await ipcRenderer.invoke('process-emulator-exe', filePath);
            return;
        }
        alert(`File dropped: ${fileName}\n\nFile handling not yet implemented.`);
    } catch (error) {
        log.error('Failed to process dropped file:', error);
        alert(`Failed to process file: ${error.message}`);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    addViewListeners();
    addToolsListeners();
    setupThemeManagerListeners();
    setupDragDrop();
    // setupLivePreview(); // Logic moved to setupColorPickerListeners
    
    // Add event listener for the search games button
    const searchGamesBtn = document.getElementById('search-games-btn');
    if (searchGamesBtn) {
        searchGamesBtn.addEventListener('click', searchForGamesAndEmulators);
    }
});
function handleViewToggle(event) {
    const viewBtn = event.currentTarget;
    const view = viewBtn.dataset.view;
    
    // Update active button
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    viewBtn.classList.add('active');
    
    // Update container class and re-render games
    const gamesContainer = document.getElementById('games-container');
    gamesContainer.className = 'games-container ' + view + '-view';
    
    // Re-render games with the new view
    renderGames(filteredGames);
}

// Add event listeners for view buttons
function addViewListeners() {
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', handleViewToggle);
    });
}

// Search for games and emulators on the selected drive
async function searchForGamesAndEmulators() {
    try {
        const searchBtn = document.getElementById('search-games-btn');
        const driveSelector = document.getElementById('drive-selector');
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = 'Searching...';
        }
        
        const selectedDrive = driveSelector ? driveSelector.value : '';
        const result = await ipcRenderer.invoke('browse-games-and-emus', selectedDrive);
        if (result.success) {
            platforms = [...platforms, ...result.platforms];
            games = [...games, ...result.games];
            filteredGames = [...games];
            renderGames(filteredGames);
            for (const platform of platforms) {
                addPlatformFilterOption(platform);
            }
            alert(i18n.tf('messages.foundGames', { count: result.games.length }));
        } else {
            alert(i18n.tf('messages.searchFailed', { message: result.message }));
        }
    } catch (error) {
        log.error('Failed to search for games and emulators:', error);
        alert(i18n.t('messages.failedToInitialize'));
    } finally {
        // Re-enable the button
        const searchBtn = document.getElementById('search-games-btn');
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.textContent = 'Search Games And Emulators';
        }
    }
}

// Add event listeners for tools navigation
function addToolsListeners() {
    const toolLinks = document.querySelectorAll('[data-tool]');
    toolLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tool = e.currentTarget.dataset.tool;
            showToolView(tool);
        });
    });
}

// Show the selected tool view
function showToolView(tool) {
    // Update active navigation item
    document.querySelectorAll('[data-tool]').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    
    // Update header
    document.getElementById('games-header').textContent = tool.charAt(0).toUpperCase() + tool.slice(1).replace('-', ' ');
    
    // Clear games container
    gamesContainer.innerHTML = '';
    
    // Render tool-specific content
    switch(tool) {
        case 'memory-card':
            renderMemoryCardTool();
            break;
        case 'rom-ripper':
            renderRomRipperTool();
            break;
        case 'game-database':
            renderGameDatabaseTool();
            break;
        case 'cheat-codes':
            renderCheatCodesTool();
            break;
        default:
            gamesContainer.innerHTML = '<p>Tool not implemented yet.</p>';
    }
}

// Render Memory Card Reader tool
function renderMemoryCardTool() {
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>Memory Card Reader</h3>
        <p>This tool allows you to read and write data to memory cards.</p>
        <div class="tool-controls">
            <button id="read-memory-btn" class="action-btn">Read Memory Card</button>
            <button id="write-memory-btn" class="action-btn">Write Memory Card</button>
        </div>
        <div id="memory-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    // Add event listeners for memory card buttons
    document.getElementById('read-memory-btn').addEventListener('click', () => {
        alert('Memory card reading functionality would be implemented here.');
    });
    document.getElementById('write-memory-btn').addEventListener('click', () => {
        alert('Memory card writing functionality would be implemented here.');
    });
}

// Render ROM Ripper tool
function renderRomRipperTool() {
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>ROM Ripper</h3>
        <p>This tool allows you to rip ROMs from optical media.</p>
        <div class="tool-controls">
            <button id="rip-rom-btn" class="action-btn">Start ROM Rip</button>
        </div>
        <div id="rom-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    // Add event listener for ROM rip button
    document.getElementById('rip-rom-btn').addEventListener('click', () => {
        alert('ROM ripping functionality would be implemented here.');
    });
}

// Render Game Database tool
function renderGameDatabaseTool() {
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>Game Database</h3>
        <p>This tool allows you to search and manage your game database.</p>
        <div class="tool-controls">
            <input type="text" id="db-search" placeholder="Search games..." />
            <button id="search-db-btn" class="action-btn">Search</button>
        </div>
        <div id="db-results" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    // Add event listener for database search button
    document.getElementById('search-db-btn').addEventListener('click', () => {
        alert('Database search functionality would be implemented here.');
    });
}

// Render Cheat Codes tool
function renderCheatCodesTool() {
    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <h3>Cheat Codes</h3>
        <p>This tool allows you to manage and apply cheat codes to your games.</p>
        <div class="tool-controls">
            <select id="game-select">
                <option value="">Select a game</option>
                <option value="game1">Game 1</option>
                <option value="game2">Game 2</option>
                <option value="game3">Game 3</option>
            </select>
            <button id="apply-cheat-btn" class="action-btn">Apply Cheat</button>
        </div>
        <div id="cheat-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    // Add event listener for cheat button
    document.getElementById('apply-cheat-btn').addEventListener('click', () => {
        alert('Cheat code functionality would be implemented here.');
    });
}

// Load a specific tool
function loadTool(tool) {
    // Remove active class from all tools
    const toolLinks = document.querySelectorAll('#tools-list li a');
    toolLinks.forEach(link => link.classList.remove('active'));
    
    // Add active class to clicked tool
    event.target.classList.add('active');
    
    // Hide all tool content
    const toolContent = document.querySelectorAll('.tool-content');
    toolContent.forEach(content => content.style.display = 'none');
    
    // Show the selected tool content
    if (tool === 'memory-card') {
        showMemoryCardReader();
    } else if (tool === 'rom-ripper') {
        showRomRipper();
    } else if (tool === 'game-database') {
        showGameDatabase();
    } else if (tool === 'cheat-codes') {
        showCheatCodes();
    }
}

// Show memory card reader tool
function showMemoryCardReader() {
    // Create memory card reader UI if it doesn't exist
    let memoryCardReader = document.getElementById('memory-card-reader');
    
    if (!memoryCardReader) {
        memoryCardReader = document.createElement('div');
        memoryCardReader.id = 'memory-card-reader';
        memoryCardReader.className = 'tool-content';
        memoryCardReader.innerHTML = `
            <h2>Memory Card Reader</h2>
            <div class="memory-card-controls">
                <div class="drive-selector">
                    <label for="drive-selector">Select Drive:</label>
                    <select id="drive-selector">
                        <option value="">Select Drive</option>
                    </select>
                    <button id="search-memory-cards">Search for Memory Cards</button>
                </div>
                <div class="memory-card-list">
                    <h3>Found Memory Cards</h3>
                    <div id="memory-cards-container"></div>
                </div>
                <div class="memory-card-details">
                    <h3>Memory Card Details</h3>
                    <div id="memory-card-details-content"></div>
                </div>
            </div>
        `;
        
        // Insert after the games container
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.parentNode.insertBefore(memoryCardReader, gamesContainer.nextSibling);
    }
    
    // Show the memory card reader
    memoryCardReader.style.display = 'block';
    
    // Set up event listeners for memory card reader
    setupMemoryCardReader();
}

// Set up memory card reader event listeners
function setupMemoryCardReader() {
    const searchBtn = document.getElementById('search-memory-cards');
    searchBtn.addEventListener('click', searchMemoryCards);
    
    // Set up drive selector
    populateDriveSelector();
}

// Search for memory cards
async function searchMemoryCards() {
    const driveSelector = document.getElementById('drive-selector');
    const selectedDrive = driveSelector.value;
    
    try {
        const result = await ipcRenderer.invoke('browse-memory-cards', selectedDrive);
        
        if (result.success) {
            displayMemoryCards(result.cards);
        } else {
            alert('Failed to search for memory cards: ' + result.message);
        }
    } catch (error) {
        log.error('Error searching for memory cards:', error);
        alert('Error searching for memory cards: ' + error.message);
    }
}

// Display found memory cards
function displayMemoryCards(cards) {
    const container = document.getElementById('memory-cards-container');
    
    if (cards.length === 0) {
        container.innerHTML = '<p>No memory cards found.</p>';
        return;
    }
    
    let html = '<ul class="memory-cards-list">';
    cards.forEach(card => {
        html += `
            <li class="memory-card-item" data-path="${card.path}">
                <h4>${card.name}</h4>
                <p>Size: ${card.size} bytes</p>
                <p>Modified: ${card.modified.toLocaleString()}</p>
                <button class="view-card-btn" data-path="${card.path}">View Details</button>
            </li>
        `;
    });
    html += '</ul>';
    
    container.innerHTML = html;
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-card-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const cardPath = e.target.getAttribute('data-path');
            readMemoryCard(cardPath);
        });
    });
}

// Read a specific memory card
async function readMemoryCard(cardPath) {
    try {
        const result = await ipcRenderer.invoke('read-memory-card', cardPath);
        
        if (result.success) {
            displayMemoryCardDetails(result.data);
        } else {
            alert('Failed to read memory card: ' + result.message);
        }
    } catch (error) {
        log.error('Error reading memory card:', error);
        alert('Error reading memory card: ' + error.message);
    }
}

// Display memory card details
function displayMemoryCardDetails(data) {
    const container = document.getElementById('memory-card-details-content');
    
    if (data.raw) {
        container.innerHTML = `
            <pre>${data.raw}</pre>
        `;
    } else {
        container.innerHTML = `
            <div class="memory-card-data">
                <h4>Memory Card Data</h4>
                <p><strong>Format:</strong> JSON</p>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
        `;
    }
}

// Show ROM ripper tool
function showRomRipper() {
    // Create ROM ripper UI if it doesn't exist
    let romRipper = document.getElementById('rom-ripper');
    
    if (!romRipper) {
        romRipper = document.createElement('div');
        romRipper.id = 'rom-ripper';
        romRipper.className = 'tool-content';
        romRipper.innerHTML = `
            <h2>ROM Ripper</h2>
            <p>ROM Ripper functionality would be implemented here.</p>
        `;
        
        // Insert after the games container
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.parentNode.insertBefore(romRipper, gamesContainer.nextSibling);
    }
    
    // Show the ROM ripper
    romRipper.style.display = 'block';
}

// Show game database tool
function showGameDatabase() {
    // Create game database UI if it doesn't exist
    let gameDatabase = document.getElementById('game-database');
    
    if (!gameDatabase) {
        gameDatabase = document.createElement('div');
        gameDatabase.id = 'game-database';
        gameDatabase.className = 'tool-content';
        gameDatabase.innerHTML = `
            <h2>Game Database</h2>
            <p>Game Database functionality would be implemented here.</p>
        `;
        
        // Insert after the games container
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.parentNode.insertBefore(gameDatabase, gamesContainer.nextSibling);
    }
    
    // Show the game database
    gameDatabase.style.display = 'block';
}

// Show cheat codes tool
function showCheatCodes() {
    // Create cheat codes UI if it doesn't exist
    let cheatCodes = document.getElementById('cheat-codes');
    
    if (!cheatCodes) {
        cheatCodes = document.createElement('div');
        cheatCodes.id = 'cheat-codes';
        cheatCodes.className = 'tool-content';
        cheatCodes.innerHTML = `
            <h2>Cheat Codes</h2>
            <p>Cheat Codes functionality would be implemented here.</p>
        `;
        
        // Insert after the games container
        const gamesContainer = document.getElementById('games-container');
        gamesContainer.parentNode.insertBefore(cheatCodes, gamesContainer.nextSibling);
    }
    
    // Show the cheat codes
    cheatCodes.style.display = 'block';
}

// Show game details in footer
function showGameDetails(game) {
    // Hide all .game-more elements first
    document.querySelectorAll('.game-more').forEach(el => {
        el.style.display = 'none';
    });
    // get .game-more from the game card of this game
    const gameMore = document.querySelector(`.game-card[data-game-id="${game.id}"] .game-more`);
    gameMore.style.display = 'block';
    // Update the details with game information
    document.getElementById('selected-game-title').textContent = game.name;
    
    // Update game details info
    const detailsInfo = document.getElementById('game-details-info');
    detailsInfo.innerHTML = `
        <div class="game-detail-row">
            <img id="detail-game-image" src="" alt="${game.name}" class="detail-game-image" />
        </div>
        <div class="game-detail-row">
            <p><strong>Platform:</strong> ${game.platformName || game.platformShortName || 'Unknown'}</p>
            <p><strong>Rating:</strong> ${game.rating}</p>
            <p><strong>Genre:</strong> ${game.genre}</p>
            <p><strong>Price:</strong> ${game.price > 0 ? `$${game.price.toFixed(2)}` : 'Free'}</p>
        </div>
    `;
    
    // Set the image if available
    const gameImage = document.getElementById('detail-game-image');
    if (game.image) {
        gameImage.src = game.image;
        gameImage.alt = game.name;
    } else {
        // Use default image
        const platformShortName = game.platformShortName.toLowerCase();
        gameImage.src = `emubro-resources/platforms/${platformShortName}/covers/default.jpg`;
        gameImage.alt = game.name;
    }
    
    // Show the details footer
    document.getElementById('game-details-footer').style.display = 'block';
}

let fixedBackgroundTracking = null;

function enableFixedBackgroundTracking(gameGrid) {
    // Stop any existing tracking first
    disableFixedBackgroundTracking();
    
    // Use CSS background-attachment: fixed with additional scroll compensation
    gameGrid.style.backgroundAttachment = 'fixed';
    gameGrid.style.backgroundPosition = 'center';
    
    // Store that we're tracking
    fixedBackgroundTracking = {
        gameGrid: gameGrid
    };
}

function disableFixedBackgroundTracking() {
    if (fixedBackgroundTracking && fixedBackgroundTracking.gameGrid) {
        fixedBackgroundTracking.gameGrid.style.backgroundAttachment = 'scroll';
    }
    fixedBackgroundTracking = null;
}

function populateLanguageSelector() {
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect || typeof allTranslations === 'undefined') return;

    languageSelect.innerHTML = '';
    const languages = Object.keys(allTranslations);

    languages.forEach(langCode => {
        const langData = allTranslations[langCode].language;
        if (langData) {
            const option = document.createElement('option');
            option.value = langCode;
            const flag = langData.flag || '';
            const name = langData.name || langCode;
            option.textContent = `${flag} ${name}`.trim();
            languageSelect.appendChild(option);
        }
    });

    languageSelect.value = i18n.getLanguage();
}
