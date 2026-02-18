/**
 * Theme Manager
 */

import { 
    parseColorToHex, 
    rgbToHex, 
    hexToRgb, 
    invertHex, 
    rgbToHsl, 
    hslToRgb, 
    flipLightness, 
    darkenHex 
} from './ui-utils';
import { isPanelDocked } from './docking-manager';

const emubro = window.emubro;
const log = console;

let remoteCommunityThemes = null;
let currentTheme = 'dark';
let editingThemeId = null;
let hasUnsavedChanges = false;
let shouldUseAccentColorForBrand = true;
let fixedBackgroundTracking = null;

// Draggable state
let isDragging = false;
let startX, startY;
let modalInitialX, modalInitialY;

function normalizeGradientAngle(value, fallback = '160deg') {
    const raw = String(value ?? '').trim();
    const defaultNum = Number.parseInt(String(fallback).replace(/deg$/i, ''), 10);
    const fallbackNum = Number.isFinite(defaultNum) ? defaultNum : 160;
    let num = Number.parseInt(raw.replace(/deg$/i, ''), 10);
    if (!Number.isFinite(num)) num = fallbackNum;
    num = Math.max(0, Math.min(360, num));
    return `${num}deg`;
}

function updateGradientAngleValueLabel(angleText) {
    const label = document.getElementById('gradient-angle-value');
    if (label) label.textContent = angleText;
}

function setGradientAngleInputFromValue(angleText) {
    const input = document.getElementById('gradient-angle');
    if (!input) return;
    const num = Number.parseInt(String(angleText).replace(/deg$/i, ''), 10);
    input.value = String(Number.isFinite(num) ? num : 160);
}

function applyGradientAnglePreview(angleText) {
    document.documentElement.style.setProperty('--app-gradient-angle', normalizeGradientAngle(angleText));
}

export function makeDraggable(modalId, headerId) {
    const modal = document.getElementById(modalId);
    const header = document.getElementById(headerId);
    
    if (!modal || !header) return;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
        // If user clicked a button or input inside the header, don't drag
        if (e.target.closest('button, input, select, textarea')) return;

        // If it's a collapsed accordion panel, clicking it should expand it
        if (modal.classList.contains('accordion-collapsed')) {
            import('./docking-manager').then(m => m.activatePanel(modalId));
            return;
        }

        // If it's docked, we don't allow dragging/undocking by clicking/moving the header
        if (modal.classList.contains('docked-right')) {
            return;
        }

        isDragging = true;
        
        // Get the current position of the modal
        const rect = modal.getBoundingClientRect();
        
        // If modal has translate(-50%, -50%) and top/left 50%, we need to convert it to absolute pixels
        // to avoid jumping when we start setting left/top
        modal.style.transform = 'none';
        modal.style.top = rect.top + 'px';
        modal.style.left = rect.left + 'px';
        modal.style.margin = '0';
        
        startX = e.clientX;
        startY = e.clientY;
        modalInitialX = rect.left;
        modalInitialY = rect.top;

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        modal.style.left = (modalInitialX + dx) + 'px';
        modal.style.top = (modalInitialY + dy) + 'px';
    }

    function onMouseUp() {
        isDragging = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }
}

export async function fetchCommunityThemes(forceRefresh = false) {
    if (remoteCommunityThemes && !forceRefresh) return remoteCommunityThemes;

    try {
        const repoOwner = 'sysoutch';
        const repoName = 'emuBro-themes';
        const themesPath = 'community-themes';
        
        // 1. Get the list of files in the folder
        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${themesPath}`);
        if (!response.ok) throw new Error('Failed to fetch themes list');
        
        const contents = await response.json();
        
        // 2. Filter for files that end in .json (dynamic names like theme_user.json)
        const themeFiles = contents.filter(item => 
            item.type === 'file' && 
            item.name.endsWith('.json')
        );
        
        const fetchedThemes = [];

        // 3. Fetch each JSON file dynamically
        for (const file of themeFiles) {
            try {
                // Using the download_url provided by the API is safer than manual string building
                const themeRes = await fetch(file.download_url);
                
                if (themeRes.ok) {
                    const theme = await themeRes.json();
                    
                    // 4. Image Logic
                    // Since images are no longer in the repo, we assume the JSON 
                    // contains a full URL. If it's a relative path, it will likely break.
                    if (theme.background?.image) {
                        const img = theme.background.image;
                        // Optional: Validation check to ensure it's a valid remote URL
                        if (!img.startsWith('http') && !img.startsWith('data:')) {
                            console.warn(`Theme ${file.name} has a relative image path which may no longer exist.`);
                        }
                    }
                    
                    fetchedThemes.push(theme);
                }
            } catch (err) {
                log.error(`Failed to fetch theme file ${file.name}:`, err);
            }
        }

        remoteCommunityThemes = fetchedThemes;
        return fetchedThemes;
    } catch (error) {
        log.error('Error fetching community themes:', error);
        return [];
    }
}

export function applyGlassEffect(enable) {
    if (enable) {
        document.documentElement.setAttribute('data-glass-effect', 'enabled');
    } else {
        document.documentElement.removeAttribute('data-glass-effect');
    }
    log.info(`Glass effect: ${enable ? 'ON' : 'OFF'}`);
}

export function applyCornerStyle(style) {
    const root = document.documentElement;
    if (style === 'sharp') {
        root.style.setProperty('--radius-btn', '0px');
        root.style.setProperty('--radius-btn-top-left', '0px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '0px');

        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-input-top-left', '0px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '0px');

        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-sm', '0px');
    } else if (style === 'semi-rounded') {
        root.style.setProperty('--radius-btn', '4px');
        root.style.setProperty('--radius-btn-top-left', '4px');
        root.style.setProperty('--radius-btn-top-right', '4px');
        root.style.setProperty('--radius-btn-bottom-left', '4px');
        root.style.setProperty('--radius-btn-bottom-right', '4px');
        
        root.style.setProperty('--radius-input', '4px');
        root.style.setProperty('--radius-input-top-left', '4px');
        root.style.setProperty('--radius-input-top-right', '4px');
        root.style.setProperty('--radius-input-bottom-left', '4px');
        root.style.setProperty('--radius-input-bottom-right', '4px');

        root.style.setProperty('--radius-card', '4px');
        root.style.setProperty('--radius-sm', '2px');
    } else if (style === 'futuristic') {
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-btn-top-left', '20px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '20px');
        
        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-input-top-left', '20px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '20px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    } else {
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-btn-top-left', '20px');
        root.style.setProperty('--radius-btn-top-right', '20px');
        root.style.setProperty('--radius-btn-bottom-left', '20px');
        root.style.setProperty('--radius-btn-bottom-right', '20px');
        
        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-input-top-left', '20px');
        root.style.setProperty('--radius-input-top-right', '20px');
        root.style.setProperty('--radius-input-bottom-left', '20px');
        root.style.setProperty('--radius-input-bottom-right', '20px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    }
}

export function disableFixedBackgroundTracking() {
    if (fixedBackgroundTracking && fixedBackgroundTracking.gameGrid) {
        fixedBackgroundTracking.gameGrid.style.backgroundAttachment = 'scroll';
    }
    fixedBackgroundTracking = null;
}

export function enableFixedBackgroundTracking(gameGrid) {
    disableFixedBackgroundTracking();
    gameGrid.style.backgroundAttachment = 'fixed';
    gameGrid.style.backgroundPosition = 'center';
    fixedBackgroundTracking = { gameGrid: gameGrid };
}

export function applyBackgroundImage(bgConfig) {
    const gameGrid = document.querySelector('main.game-grid');
    if (!gameGrid) return;
    
    const image = bgConfig.image;
    const position = bgConfig.position || 'centered';
    const repeat = bgConfig.repeat || 'no-repeat';
    const scale = bgConfig.scale || 'crop';
    
    gameGrid.style.backgroundImage = `url('${image}')`;
    gameGrid.style.backgroundRepeat = 'no-repeat';
    gameGrid.style.backgroundAttachment = 'scroll';
    
    if (position === 'fixed') {
        enableFixedBackgroundTracking(gameGrid);
    } else {
        disableFixedBackgroundTracking();
    }
    
    gameGrid.style.backgroundRepeat = repeat;
    
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
    
    gameGrid.style.backgroundPosition = 'center';
}

export function applyCustomTheme(theme) {
    document.documentElement.removeAttribute('data-theme');
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', theme.colors.bgPrimary);
    root.style.setProperty('--bg-secondary', theme.colors.bgSecondary);
    const tertiary = theme.colors.bgTertiary || theme.colors.bgSecondary;
    root.style.setProperty('--bg-tertiary', tertiary);
    root.style.setProperty('--bg-quaternary', theme.colors.bgQuaternary || tertiary);
    
    if (theme.colors.bgHeader) root.style.setProperty('--bg-header', theme.colors.bgHeader);
    if (theme.colors.bgSidebar) root.style.setProperty('--bg-sidebar', theme.colors.bgSidebar);
    if (theme.colors.bgActionbar) root.style.setProperty('--bg-actionbar', theme.colors.bgActionbar);
    root.style.setProperty('--app-gradient-a', theme.colors.appGradientA || theme.colors.bgPrimary || '#0b1528');
    root.style.setProperty('--app-gradient-b', theme.colors.appGradientB || theme.colors.bgSecondary || '#0f2236');
    root.style.setProperty('--app-gradient-c', theme.colors.appGradientC || tertiary || '#1d2f4a');
    root.style.setProperty('--app-gradient-angle', normalizeGradientAngle(theme.colors.appGradientAngle || '160deg'));

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
    
    // Check for global background override
    const overrideBg = localStorage.getItem('globalOverrideBackground') === 'true';
    if (!overrideBg && theme.background && theme.background.image) {
        applyBackgroundImage(theme.background);
    } else if (!overrideBg) {
        disableFixedBackgroundTracking();
        const gameGrid = document.querySelector('main.game-grid');
        if (gameGrid) {
            gameGrid.style.backgroundImage = 'none';
        }
    }
    
    const enableGlass = !theme.cardEffects || theme.cardEffects.glassEffect !== false;
    applyGlassEffect(enableGlass);

    // Apply global corner style instead of theme-specific one
    const globalStyle = localStorage.getItem('globalCornerStyle') || 'rounded';
    applyCornerStyle(globalStyle);
}

export function getCustomThemes() {
    const themes = localStorage.getItem('customThemes');
    return themes ? JSON.parse(themes) : [];
}

export function saveCustomTheme(theme) {
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

export function setTheme(theme) {
    currentTheme = theme;
    const root = document.documentElement;
    const themeManagerModal = document.getElementById('theme-manager-modal');

    root.removeAttribute('style'); 
    disableFixedBackgroundTracking();

    if (theme === 'dark' || theme === 'light') {
        root.setAttribute('data-theme', theme);
    } else {
        const customThemes = getCustomThemes();
        const customTheme = customThemes.find(t => t.id === theme);
        if (customTheme) {
            applyCustomTheme(customTheme);
        }
    }
    
    if (themeManagerModal && themeManagerModal.classList.contains('active')) {
        renderThemeManager();
    }
}

export function openThemeManager() {
    const modal = document.getElementById('theme-manager-modal');
    if (!modal) return;
    
    renderThemeManager();
    
    if (modal.classList.contains('docked-right')) {
        // Use toggleDock to "re-dock" and trigger all logic
        import('./docking-manager').then(m => m.toggleDock('theme-manager-modal', 'pin-theme-manager', true));
    } else {
        modal.classList.add('active');
        modal.style.display = 'flex';
        
        if (modal.style.top || modal.style.left) {
            modal.classList.add('moved');
        } else {
            modal.classList.remove('moved');
        }
    }
    
    makeDraggable('theme-manager-modal', 'theme-manager-header');
}

export function updateThemeSelector() {
    const themeSelect = document.getElementById('theme-select');
    if (!themeSelect) return;

    const safeThemeLabel = (key, fallback) => {
        const translated = i18n.t(key);
        if (!translated || translated === key) return fallback;
        return translated;
    };

    const customThemes = getCustomThemes();
    const options = [
        { value: 'dark', label: safeThemeLabel('theme.darkTheme', 'Dark Theme') },
        { value: 'light', label: safeThemeLabel('theme.lightTheme', 'Light Theme') },
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

function getThemeDisplayName(themeId) {
    const normalizedId = String(themeId || '').toLowerCase();
    if (normalizedId === 'dark') {
        const label = i18n.t('theme.darkTheme');
        return (!label || label === 'theme.darkTheme') ? 'Dark Theme' : label;
    }
    if (normalizedId === 'light') {
        const label = i18n.t('theme.lightTheme');
        return (!label || label === 'theme.lightTheme') ? 'Light Theme' : label;
    }
    return String(themeId || '');
}

export function deleteCustomTheme(id) {
    const customThemes = getCustomThemes();
    const theme = customThemes.find(t => t.id === id);
    const themeName = theme ? theme.name : 'this theme';

    const confirmDelete = confirm(i18n.t('messages.confirmDeleteTheme', { name: themeName }) || `Are you sure you want to delete "${themeName}"?`);
    if (!confirmDelete) return;

    const filtered = customThemes.filter(t => t.id !== id);
    localStorage.setItem('customThemes', JSON.stringify(filtered));
    
    if (currentTheme === id) {
        setTheme('dark');
        localStorage.setItem('theme', 'dark');
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = 'dark';
    }

    updateThemeSelector();
    renderThemeManager();
}

export function renderThemeManager() {
    const presetContainer = document.getElementById('preset-themes');
    const customContainer = document.getElementById('custom-themes');
    const customThemes = getCustomThemes();
    
    if (!presetContainer || !customContainer) return;

    // Render preset themes
    presetContainer.innerHTML = '';
    ['dark', 'light'].forEach(theme => {
        const isActive = currentTheme === theme;
        const item = createThemeItem(
            theme,
            getThemeDisplayName(theme),
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

function createThemeItem(id, name, type, isActive, themeData) {
    const item = document.createElement('div');
    item.className = `theme-item ${isActive ? 'active' : ''}`;
    
    const preview = document.createElement('div');
    preview.className = 'theme-preview';
    
    let dots = [];
    if (type === 'preset') {
        dots = id === 'dark' 
            ? ['#1e1e1e', '#ffffff', '#66ccff'] 
            : ['#f5f5f5', '#1a1a1a', '#0099cc'];
    } else {
        dots = [
            themeData.colors.appGradientA || themeData.colors.bgPrimary,
            themeData.colors.appGradientB || themeData.colors.bgSecondary,
            themeData.colors.accentColor
        ];
    }
    
    dots.forEach(color => {
        const dot = document.createElement('div');
        dot.className = 'theme-color-dot';
        dot.style.backgroundColor = color;
        dot.style.boxShadow = `0 0 5px ${color}44`; 
        preview.appendChild(dot);
    });
    
    item.appendChild(preview);
    
    item.innerHTML += `
        <div class="theme-item-info">
            <span class="theme-item-name">${name}</span>
            <span class="theme-item-type">${type === 'preset' ? i18n.t('theme.official') : i18n.t('theme.custom')}</span>
        </div>
    `;

    item.addEventListener('click', () => {
        setTheme(id);
        localStorage.setItem('theme', id);
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) themeSelect.value = id;
        renderThemeManager();
    });

    if (type === 'custom') {
        const actions = document.createElement('div');
        actions.className = 'theme-item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn small';
        editBtn.innerHTML = `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M14 4 20 10 11 19H5v-6L14 4Z"></path>
                    <path d="M14 4 17 7"></path>
                </svg>
            </span>
        `;
        editBtn.onclick = (e) => {
        e.stopPropagation();
            
            // 1. Load the data into the form
            editTheme(themeData); 
            
            // 2. Scroll smoothly to the form
            const formElement = document.getElementById("form-title");
            if (formElement) {
                formElement.scrollIntoView({ 
                behavior: "smooth", 
                block: "start" 
                });
            }
        };

        const uploadBtn = document.createElement('button');
        uploadBtn.className = 'action-btn small';
        uploadBtn.innerHTML = 'Up'; 
        uploadBtn.onclick = (e) => {
        e.stopPropagation();
            uploadTheme(themeData);
        };
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn remove-btn small';
        deleteBtn.innerHTML = 'Ã—'; 
        deleteBtn.onclick = (e) => { e.stopPropagation(); deleteCustomTheme(id); };
        
        actions.appendChild(editBtn);
        actions.appendChild(uploadBtn);
        actions.appendChild(deleteBtn);
        item.appendChild(actions);
    }
    
    return item;
}

async function askForWebhookUrl() {
    // Show the modal
    const modal = document.getElementById('webhook-modal');
    const input = document.getElementById('webhook-input');
    const saveBtn = document.getElementById('webhook-save-btn');
    const cancelBtn = document.getElementById('webhook-cancel-btn');
    
    if (!modal) {
        console.error("Webhook modal not found");
        return null;
    }

    // Reset input
    input.value = '';
    modal.style.display = 'flex';

    // Wait for user interaction
    const webhookUrl = await new Promise((resolve) => {
        const cleanup = () => {
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
        };

        const onSave = () => {
            const url = input.value.trim();
            const webhookDefaultUrl = 'https://discord.com/api/webhooks/';
            if (!url.startsWith(webhookDefaultUrl)) {
                const errorMsg = i18n.t('webhook.invalidUrl', { url: webhookDefaultUrl }) ;
                alert(errorMsg);
                return; // Don't close, let user fix
            }
            localStorage.setItem('discordWebhookUrl', url);
            modal.style.display = 'none';
            cleanup();
            resolve(url);
        };

        const onCancel = () => {
            modal.style.display = 'none';
            cleanup();
            resolve(null);
        };

        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', onCancel);
    });

    return webhookUrl;
}

async function uploadTheme(theme) {
    let webhookUrl = localStorage.getItem('discordWebhookUrl');
    
    if (!webhookUrl) {
        webhookUrl = await askForWebhookUrl();
        if (!webhookUrl) return; // User cancelled
    }

    const userInfo = await emubro.invoke('get-user-info');

    // Get the image name from the stored property or the UI if available
    let imageName = window.currentBackgroundImageName || 'background';
    
    // If it's a generic "background", try to guess the extension from the base64 string
    if (imageName === 'background' && theme.background && theme.background.image && theme.background.image.startsWith('data:')) {
        const mimeType = theme.background.image.split(';base64,')[0].split(':')[1];
        const extension = mimeType.split('/')[1];
        imageName = `background.${extension}`;
    }

    // Create a copy of the theme object to modify it without affecting the original
    const themeToUpload = JSON.parse(JSON.stringify(theme));
    if (themeToUpload.background && themeToUpload.background.image) {
        // Replace the base64 image with the image name in the JSON
        themeToUpload.background.image = imageName;
    }

    const success = await emubro.invoke('upload-theme', {
        author: userInfo.username,
        name: theme.name, 
        themeObject: themeToUpload, // The JSON with image name
        base64Image: theme.background.image, // The original Base64 string
        webhookUrl: webhookUrl
    });

    if (success) {
        console.info("Theme and image uploaded successfully!");
    } else {
        log.error("Theme upload failed. Webhook might be invalid.");
        localStorage.removeItem('discordWebhookUrl');
        alert(i18n.t('webhook.uploadFailed') || "Upload failed. Please check your webhook URL and try again.");
        
        // Ask for a new webhook URL and retry if the user provides one
        const newWebhookUrl = await askForWebhookUrl();
        if (newWebhookUrl) {
            await uploadTheme(theme);
        }
    }
}

export function editTheme(theme) {
    editingThemeId = theme.id;
    document.getElementById('form-title').textContent = i18n.t('theme.editTheme');
    document.getElementById('theme-name').value = theme.name;
    document.getElementById('color-bg-primary').value = theme.colors.bgPrimary;
    document.getElementById('color-text-primary').value = theme.colors.textPrimary;
    document.getElementById('color-text-secondary').value = theme.colors.textSecondary;
    document.getElementById('color-accent').value = theme.colors.accentColor;
    document.getElementById('color-bg-secondary').value = theme.colors.bgSecondary;
    document.getElementById('color-border').value = theme.colors.borderColor;
    
    document.getElementById('color-bg-header').value = theme.colors.bgHeader || theme.colors.bgSecondary;
    document.getElementById('color-bg-sidebar').value = theme.colors.bgSidebar || theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-bg-actionbar').value = theme.colors.bgActionbar || theme.colors.bgQuaternary || theme.colors.bgSecondary;
    document.getElementById('color-bg-tertiary').value = theme.colors.bgTertiary || theme.colors.bgSecondary;
    document.getElementById('color-success').value = theme.colors.successColor || '#4caf50';
    document.getElementById('color-danger').value = theme.colors.dangerColor || '#f44336';
    document.getElementById('color-app-gradient-a').value = theme.colors.appGradientA || theme.colors.bgPrimary || '#0b1528';
    document.getElementById('color-app-gradient-b').value = theme.colors.appGradientB || theme.colors.bgSecondary || '#0f2236';
    document.getElementById('color-app-gradient-c').value = theme.colors.appGradientC || theme.colors.bgTertiary || '#1d2f4a';
    const gradientAngle = normalizeGradientAngle(theme.colors.appGradientAngle || '160deg');
    setGradientAngleInputFromValue(gradientAngle);
    updateGradientAngleValueLabel(gradientAngle);

    if (theme.background) {
        document.getElementById('bg-position').value = theme.background.position || 'centered';
        document.getElementById('bg-scale').value = theme.background.scale || 'crop';
        document.getElementById('bg-background-repeat').value = theme.background.repeat || 'no-repeat';
        
        if (theme.background.image) {
            window.currentBackgroundImage = theme.background.image;
            // Try to recover filename if it's not a base64 string
            if (!theme.background.image.startsWith('data:')) {
                window.currentBackgroundImageName = theme.background.image;
            } else {
                window.currentBackgroundImageName = 'background';
            }
            
            document.getElementById('bg-preview-img').src = theme.background.image;
            document.getElementById('bg-preview').style.display = 'block';
            document.getElementById('bg-image-name').textContent = window.currentBackgroundImageName === 'background' ? i18n.t('theme.backgroundImageLoaded') : `${window.currentBackgroundImageName}`;
            document.getElementById('clear-bg-image-btn').style.display = 'inline-block';
        } else {
            clearBackgroundImage();
        }
    }
    
    if (theme.cardEffects) {
        document.getElementById('glass-effect-toggle').checked = theme.cardEffects.glassEffect !== false;
    } else {
        document.getElementById('glass-effect-toggle').checked = true;
    }
    
    updateColorTexts();
    showThemeForm();
    setupBackgroundImageListeners();
    setupColorPickerListeners();
}

export function updateColorTexts() {
    const pickers = document.querySelectorAll('.color-picker');
    pickers.forEach(picker => {
        const textInput = picker.parentElement.querySelector('.color-text');
        if (textInput) {
            textInput.value = picker.value.toUpperCase();
        }
    });
}

export function showThemeForm() {
    document.getElementById('theme-form').style.display = 'flex';
}

export function hideThemeForm() {
    document.getElementById('theme-form').style.display = 'none';
    editingThemeId = null;
    setTheme(currentTheme); 
}

export function resetThemeForm() {
    const themeNameInput = document.getElementById('theme-name');
    if (themeNameInput) themeNameInput.value = '';
    
    const defaults = {
        'color-bg-primary': '#1e1e1e',
        'color-text-primary': '#ffffff',
        'color-text-secondary': '#cccccc',
        'color-accent': '#66ccff',
        'color-bg-secondary': '#2d2d2d',
        'color-border': '#444444',
        'color-bg-header': '#2d2d2d',
        'color-bg-sidebar': '#333333',
        'color-bg-actionbar': '#252525',
        'color-bg-tertiary': '#333333',
        'color-success': '#4caf50',
        'color-danger': '#f44336',
        'color-app-gradient-a': '#0b1528',
        'color-app-gradient-b': '#0f2236',
        'color-app-gradient-c': '#1d2f4a'
    };
    for (const [id, val] of Object.entries(defaults)) {
        const el = document.getElementById(id);
        if (el) el.value = val;
    }
    
    const bgPos = document.getElementById('bg-position');
    if (bgPos) bgPos.value = 'centered';
    
    const bgScale = document.getElementById('bg-scale');
    if (bgScale) bgScale.value = 'crop';
    
    const bgRepeat = document.getElementById('bg-background-repeat');
    if (bgRepeat) bgRepeat.value = 'no-repeat';
    
    const glassToggle = document.getElementById('glass-effect-toggle');
    if (glassToggle) glassToggle.checked = true;

    setGradientAngleInputFromValue('160deg');
    updateGradientAngleValueLabel('160deg');
    applyGradientAnglePreview('160deg');
    
    clearBackgroundImage();
}

export function clearBackgroundImage() {
    window.currentBackgroundImage = null;
    const bgInput = document.getElementById('bg-image-input');
    if (bgInput) bgInput.value = '';
    
    const bgPreview = document.getElementById('bg-preview');
    if (bgPreview) bgPreview.style.display = 'none';
    
    const bgName = document.getElementById('bg-image-name');
    if (bgName) bgName.textContent = '';
    
    const clearBtn = document.getElementById('clear-bg-image-btn');
    if (clearBtn) clearBtn.style.display = 'none';

    const gameGrid = document.querySelector('main.game-grid');
    if (gameGrid) {
        gameGrid.style.backgroundImage = 'none';
    }
    disableFixedBackgroundTracking();
}

export function setupColorPickerListeners() {
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
        'color-danger': '--danger-color',
        'color-app-gradient-a': '--app-gradient-a',
        'color-app-gradient-b': '--app-gradient-b',
        'color-app-gradient-c': '--app-gradient-c'
    };

    document.querySelectorAll('.color-picker').forEach(picker => {
        const newPicker = picker.cloneNode(true);
        picker.parentNode.replaceChild(newPicker, picker);
        
        const handleUpdate = (e) => {
            updateColorTexts();
            hasUnsavedChanges = true;
            const color = e.target.value;
            const id = newPicker.id;
            
            if (colorMap[id]) {
                root.style.setProperty(colorMap[id], color);
                if (id === 'color-accent') {
                    root.style.setProperty('--brand-color', darkenHex(color, 30));
                }
            }
        };

        newPicker.addEventListener('change', handleUpdate);
        newPicker.addEventListener('input', handleUpdate);
    });

    const gradientAngleInput = document.getElementById('gradient-angle');
    if (gradientAngleInput) {
        const replacement = gradientAngleInput.cloneNode(true);
        gradientAngleInput.parentNode.replaceChild(replacement, gradientAngleInput);

        const handleAngleUpdate = (event) => {
            const angle = normalizeGradientAngle(`${event.target.value}deg`);
            updateGradientAngleValueLabel(angle);
            applyGradientAnglePreview(angle);
            hasUnsavedChanges = true;
        };

        replacement.addEventListener('input', handleAngleUpdate);
        replacement.addEventListener('change', handleAngleUpdate);

        const currentAngle = normalizeGradientAngle(`${replacement.value || '160'}deg`);
        setGradientAngleInputFromValue(currentAngle);
        updateGradientAngleValueLabel(currentAngle);
        applyGradientAnglePreview(currentAngle);
    }
}

export function setupBackgroundImageListeners() {
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
        window.currentBackgroundImageName = file.name;
        
        const preview = document.getElementById('bg-preview');
        const previewImg = document.getElementById('bg-preview-img');
        previewImg.src = imageData;
        preview.style.display = 'block';
        
        document.getElementById('bg-image-name').textContent = `Selected: ${file.name}`;
        document.getElementById('clear-bg-image-btn').style.display = 'inline-block';

        hasUnsavedChanges = true;
        const bgConfig = {
            image: imageData,
            imagePath: file.path,
            position: document.getElementById('bg-position').value,
            scale: document.getElementById('bg-scale').value,
            repeat: document.getElementById('bg-background-repeat').value
        };
        applyBackgroundImage(bgConfig);
    };
    reader.readAsDataURL(file);
}

export function getCurrentThemeColors() {
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
        borderColor: getVar('--border-color'),
        bgTertiary: getVar('--bg-tertiary'),
        bgQuaternary: getVar('--bg-quaternary'),
        bgHeader: getVar('--bg-header'),
        bgSidebar: getVar('--bg-sidebar'),
        bgActionbar: getVar('--bg-actionbar'),
        appGradientA: getVar('--app-gradient-a'),
        appGradientB: getVar('--app-gradient-b'),
        appGradientC: getVar('--app-gradient-c'),
        appGradientAngle: normalizeGradientAngle(styles.getPropertyValue('--app-gradient-angle').trim() || '160deg'),
        successColor: getVar('--success-color'),
        dangerColor: getVar('--danger-color')
    };
}

export function saveTheme() {
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
            appGradientA: document.getElementById('color-app-gradient-a').value,
            appGradientB: document.getElementById('color-app-gradient-b').value,
            appGradientC: document.getElementById('color-app-gradient-c').value,
            appGradientAngle: normalizeGradientAngle(`${document.getElementById('gradient-angle').value}deg`),
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
        }
    };
    
    saveCustomTheme(theme);
    hasUnsavedChanges = false;
    hideThemeForm();
    alert(i18n.t('theme.saved'));
}

export async function renderMarketplace(forceRefresh = false) {
    const container = document.getElementById('marketplace-list');
    if (!container) return;
    
    container.innerHTML = `<div class="loading-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">${i18n.t('theme.fetchingThemes')}</div>`;

    const themes = await fetchCommunityThemes(forceRefresh);
    container.innerHTML = '';

    if (themes.length === 0) {
        container.innerHTML = `<div class="error-message" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger-color);">${i18n.t('theme.loadThemesError')}</div>`;
        return;
    }

    const customThemes = getCustomThemes();

    themes.forEach(theme => {
        const card = document.createElement('div');
        card.className = 'marketplace-card';
        
        // Check if theme with same name and author is already installed
        const isInstalled = customThemes.some(t => t.name === theme.name && (t.author === theme.author || !t.author));
        const installedTheme = customThemes.find(t => t.name === theme.name && (t.author === theme.author || !t.author));

        const hasBgImage = theme.background && theme.background.image;
        const gradientAngle = normalizeGradientAngle(theme.colors.appGradientAngle || '145deg');
        const gradientA = theme.colors.appGradientA || theme.colors.bgPrimary;
        const gradientB = theme.colors.appGradientB || theme.colors.bgSecondary;
        const gradientC = theme.colors.appGradientC || theme.colors.bgPrimary;
        const bgPreviewStyle = hasBgImage 
            ? `background-image: url('${theme.background.image}'); background-size: cover; background-position: center;`
            : `background: linear-gradient(${gradientAngle}, ${gradientA}, ${gradientB}, ${gradientC});`;

        card.innerHTML = `
            <div class="marketplace-card-header" style="${bgPreviewStyle} height: 120px; border-radius: 6px; margin-bottom: 10px; position: relative; border: 1px solid var(--border-color); overflow: hidden;">
                <span class="author-tag" style="position: absolute; bottom: 8px; right: 8px; margin: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);">${i18n.t('theme.by', {author: theme.author})}</span>
            </div>
            <div class="theme-item-info">
                <span class="theme-item-name" style="font-weight: bold; font-size: 1.1rem;">${theme.name}</span>
            </div>
            <div class="theme-preview" style="margin: 10px 0;">
                <div class="theme-color-dot" style="background-color: ${gradientA}" title="Gradient A"></div>
                <div class="theme-color-dot" style="background-color: ${gradientB}" title="Gradient B"></div>
                <div class="theme-color-dot" style="background-color: ${theme.colors.accentColor}" title="Accent"></div>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="action-btn small preview-btn" style="flex: 1; background: var(--bg-tertiary);">${i18n.t('theme.preview')}</button>
                ${isInstalled 
                    ? `<button class="action-btn remove-btn small marketplace-remove-btn" data-id="${installedTheme.id}" style="flex: 1;">${i18n.t('theme.remove')}</button>`
                    : `<button class="action-btn launch-btn small add-btn" data-id="${theme.id}" style="flex: 1;">${i18n.t('theme.add')}</button>`
                }
            </div>
        `;

        card.querySelector('.preview-btn').addEventListener('click', () => {
            applyCustomTheme(theme);
        });

        if (isInstalled) {
            card.querySelector('.marketplace-remove-btn').addEventListener('click', () => {
                deleteCustomTheme(installedTheme.id);
                renderMarketplace(); // Refresh marketplace to show "Add" button again
            });
        } else {
            card.querySelector('.add-btn').addEventListener('click', () => {
                const newTheme = { ...theme, id: 'custom_' + Date.now() };
                saveCustomTheme(newTheme);
                alert(i18n.t('theme.addedToThemes', {name: theme.name}));
                renderMarketplace(); // Refresh marketplace to show "Remove" button
            });
        }

        container.appendChild(card);
    });
}

export function getCurrentTheme() {
    return currentTheme;
}

export function getEditingThemeId() {
    return editingThemeId;
}

export function getHasUnsavedChanges() {
    return hasUnsavedChanges;
}

export function setHasUnsavedChanges(val) {
    hasUnsavedChanges = val;
}

export function toggleTheme() {
    const currentColors = getCurrentThemeColors();
    const invertedColors = {};
    const flip = (hex) => flipLightness(hex);

    invertedColors.bgPrimary = flip(currentColors.bgPrimary);
    invertedColors.bgSecondary = flip(currentColors.bgSecondary);
    invertedColors.bgTertiary = flip(currentColors.bgTertiary);
    invertedColors.bgQuaternary = flip(currentColors.bgQuaternary);
    
    invertedColors.textPrimary = flip(currentColors.textPrimary);
    invertedColors.textSecondary = flip(currentColors.textSecondary);
    
    invertedColors.borderColor = flip(currentColors.borderColor);
    invertedColors.accentColor = flip(currentColors.accentColor);
    
    invertedColors.bgHeader = flip(currentColors.bgHeader);
    invertedColors.bgSidebar = flip(currentColors.bgSidebar);
    invertedColors.bgActionbar = flip(currentColors.bgActionbar);
    invertedColors.appGradientA = flip(currentColors.appGradientA);
    invertedColors.appGradientB = flip(currentColors.appGradientB);
    invertedColors.appGradientC = flip(currentColors.appGradientC);
    invertedColors.appGradientAngle = currentColors.appGradientAngle || '160deg';
    
    invertedColors.successColor = flip(currentColors.successColor);
    invertedColors.dangerColor = flip(currentColors.dangerColor);

    // Try to preserve background image
    let currentBgImage = window.currentBackgroundImage;
    if (!currentBgImage) {
        const gameGrid = document.querySelector('main.game-grid');
        if (gameGrid) {
            const bgStyle = getComputedStyle(gameGrid).backgroundImage;
            if (bgStyle && bgStyle !== 'none') {
                const match = bgStyle.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) {
                    currentBgImage = match[1];
                }
            }
        }
    }

    // Create temporary theme object
    const invertedTheme = {
        id: 'temp_inverted',
        name: 'Inverted (Temporary)',
        colors: invertedColors,
        background: {
             image: currentBgImage || null,
             position: 'centered', // Defaults
             scale: 'crop',
             repeat: 'no-repeat'
        },
        cardEffects: {
             glassEffect: document.documentElement.getAttribute('data-glass-effect') === 'enabled'
        }
    };
    
    // Apply without saving to localStorage (temporal)
    applyCustomTheme(invertedTheme);
    
    // Update currentTheme locally so we know state changed, but don't persist it
    currentTheme = 'temp_inverted';
}

export function invertColors() {
    const root = document.documentElement;
    const currentFilter = root.style.filter || '';
    if (currentFilter.includes('invert(1)')) {
        root.style.filter = currentFilter.replace('invert(1)', '').trim();
    } else {
        root.style.filter = (currentFilter + ' invert(1)').trim();
    }
}
