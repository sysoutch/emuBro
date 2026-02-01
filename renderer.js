import './scss/styles.scss';

const { ipcRenderer } = require('electron');
const log = require('electron-log');

import { initI18n, populateLanguageSelector, updateUILanguage } from './js/i18n-manager';
import { initLanguageManager, openLanguageManager } from './js/language-manager';
import { 
    setTheme, 
    updateThemeSelector, 
    renderMarketplace, 
    toggleTheme, 
    invertColors, 
    saveTheme, 
    hideThemeForm, 
    setupColorPickerListeners, 
    setupBackgroundImageListeners,
    getHasUnsavedChanges,
    setHasUnsavedChanges,
    renderThemeManager,
    resetThemeForm,
    applyCornerStyle,
    getCurrentTheme,
    makeDraggable,
    openThemeManager
} from './js/theme-manager';
import { initDocking, toggleDock, removeFromDock, completelyRemoveFromDock } from './js/docking-manager';
import { 
    getGames, 
    setGames, 
    getFilteredGames, 
    setFilteredGames, 
    renderGames, 
    applyFilters, 
    initializePlatformFilterOptions, 
    addPlatformFilterOption,
    searchForGamesAndEmulators
} from './js/game-manager';
import { showToolView } from './js/tools-manager';

// ===== Global State & Elements =====
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

// ===== IPC Listeners =====
ipcRenderer.on('window-moved', (event, position, screenGoal) => {
    const { x, y } = position;
    const { screenGoalX, screenGoalY } = screenGoal;
    const gameGrid = document.querySelector('main.game-grid');
    if (gameGrid) {
        const bgX = screenGoalX - x - (window.innerWidth / 2);
        const bgY = screenGoalY - y - (window.innerHeight / 2);
        gameGrid.style.backgroundPosition = `${bgX}px ${bgY}px`;
    }
});

// ===== Initialization =====
async function initializeApp() {
    try {
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        updateThemeSelector();
        if (themeSelect) {
            themeSelect.value = savedTheme;
            themeSelect.addEventListener('change', (e) => {
                setTheme(e.target.value);
                localStorage.setItem('theme', e.target.value);
            });
        }

        // Initialize i18n
        initI18n(() => {
            renderGames(getFilteredGames());
            renderThemeManager();
        });
        updateUILanguage();
        populateLanguageSelector();
        initLanguageManager();
        initDocking();

        // Old select listener removed as it is now custom dropdown handled in i18n-manager

        // Load data
        const userInfo = await ipcRenderer.invoke('get-user-info');
        if (userNameElement) userNameElement.textContent = userInfo.username;
        if (userAvatarElement) userAvatarElement.src = userInfo.avatar;
        
        const stats = await ipcRenderer.invoke('get-library-stats');
        if (totalGamesElement) totalGamesElement.textContent = stats.totalGames;
        if (playTimeElement) playTimeElement.textContent = stats.totalPlayTime;
        
        const games = await ipcRenderer.invoke('get-games');
        setGames(games);
        setFilteredGames([...games]);
        renderGames(getFilteredGames());
        initializePlatformFilterOptions();

        // Populate drive selector
        populateDriveSelector();
        
        // Set up event listeners
        setupEventListeners();
        
        log.info('App initialized successfully');
    } catch (error) {
        log.error('Failed to initialize app:', error);
    }
}

async function populateDriveSelector() {
    try {
        const drives = await ipcRenderer.invoke('get-drives');
        const driveSelector = document.getElementById('drive-selector');
        if (driveSelector) {
            driveSelector.innerHTML = '<option value="">Select Drive</option>';
            drives.forEach(drive => {
                const option = document.createElement('option');
                option.value = drive;
                option.textContent = drive;
                driveSelector.appendChild(option);
            });
        }
    } catch (error) {
        log.error('Failed to populate drive selector:', error);
    }
}

function setupEventListeners() {
    // Search
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = getGames().filter(game => 
                game.name.toLowerCase().includes(searchTerm) ||
                game.platform.toLowerCase().includes(searchTerm)
            );
            setFilteredGames(filtered);
            renderGames(filtered);
        });
    }

    // Filters
    const platformFilter = document.getElementById('platform-filter');
    if (platformFilter) platformFilter.addEventListener('change', applyFilters);
    
    const sortFilter = document.getElementById('sort-filter');
    if (sortFilter) sortFilter.addEventListener('change', applyFilters);

    // Theme Actions
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) themeToggleBtn.addEventListener('click', toggleTheme);

    const invertBtn = document.getElementById('invert-colors-btn');
    if (invertBtn) invertBtn.addEventListener('click', invertColors);
    
    if (themeManagerBtn) themeManagerBtn.addEventListener('click', () => {
        openThemeManager();
    });

    const languageManagerBtn = document.getElementById('language-manager-btn');
    if (languageManagerBtn) {
        languageManagerBtn.addEventListener('click', () => {
            openLanguageManager();
        });
    }
    
    if (closeThemeManagerBtn) closeThemeManagerBtn.addEventListener('click', () => {
        if (getHasUnsavedChanges()) {
            if (!confirm(i18n.t('messages.unsavedChanges'))) return;
        }
        themeManagerModal.classList.remove('active');
        themeManagerModal.style.display = 'none';
        
        // If it was docked, completely remove it from the dock Set as well
        if (themeManagerModal.classList.contains('docked-right')) {
            completelyRemoveFromDock('theme-manager-modal');
        } else {
            removeFromDock('theme-manager-modal');
        }
        
        hideThemeForm();
        setHasUnsavedChanges(false);
    });

    const pinThemeManagerBtn = document.getElementById('pin-theme-manager');
    if (pinThemeManagerBtn) {
        pinThemeManagerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDock('theme-manager-modal', 'pin-theme-manager');
        });
    }

    const pinLanguageManagerBtn = document.getElementById('pin-language-manager');
    if (pinLanguageManagerBtn) {
        pinLanguageManagerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDock('language-manager-modal', 'pin-language-manager');
        });
    }

    if (themeManagerModal) {
        themeManagerModal.addEventListener('click', (e) => {
            if (e.target === themeManagerModal) {
                if (getHasUnsavedChanges()) {
                    if (!confirm(i18n.t('messages.unsavedChanges'))) return;
                }
                themeManagerModal.classList.remove('active');
                hideThemeForm();
                setHasUnsavedChanges(false);
            }
        });
    }

    // Global Theme Settings
    const globalCornerStyle = document.getElementById('global-corner-style');
    if (globalCornerStyle) {
        globalCornerStyle.value = localStorage.getItem('globalCornerStyle') || 'rounded';
        globalCornerStyle.addEventListener('change', (e) => {
            const style = e.target.value;
            localStorage.setItem('globalCornerStyle', style);
            applyCornerStyle(style);
        });
    }

    const globalOverrideBg = document.getElementById('global-override-background');
    if (globalOverrideBg) {
        globalOverrideBg.checked = localStorage.getItem('globalOverrideBackground') === 'true';
        globalOverrideBg.addEventListener('change', (e) => {
            localStorage.setItem('globalOverrideBackground', e.target.checked);
            // Re-apply current theme to respect new override setting
            setTheme(getCurrentTheme());
        });
    }

    // Theme Form Actions
    const createThemeBtn = document.getElementById('create-theme-btn');
    if (createThemeBtn) createThemeBtn.addEventListener('click', () => {
        document.getElementById('form-title').textContent = i18n.t('theme.createTitle');
        resetThemeForm();
        document.getElementById('theme-form').style.display = 'flex';
        setupColorPickerListeners();
        setupBackgroundImageListeners();
    });

    const saveThemeBtn = document.getElementById('save-theme-btn');
    if (saveThemeBtn) saveThemeBtn.addEventListener('click', saveTheme);

    const cancelThemeBtn = document.getElementById('cancel-theme-btn');
    if (cancelThemeBtn) cancelThemeBtn.addEventListener('click', hideThemeForm);

    const refreshThemesBtn = document.getElementById('refresh-themes-btn');
    if (refreshThemesBtn) {
        refreshThemesBtn.addEventListener('click', () => {
            renderMarketplace(true);
        });
    }

    // Marketplace Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

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

    // View Toggles
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            gamesContainer.className = 'games-container ' + e.currentTarget.dataset.view + '-view';
            renderGames(getFilteredGames());
        });
    });

    // Tools
    document.querySelectorAll('[data-tool]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showToolView(e.currentTarget.dataset.tool);
        });
    });

    const searchGamesBtn = document.getElementById('search-games-btn');
    if (searchGamesBtn) searchGamesBtn.addEventListener('click', searchForGamesAndEmulators);

    if (closeGameDetailsBtn) {
        closeGameDetailsBtn.addEventListener('click', () => {
            document.getElementById('game-details-footer').style.display = 'none';
        });
    }

    if (pinFooterBtn) {
        pinFooterBtn.addEventListener('click', () => {
            const footer = document.getElementById('game-details-footer');
            const isPinned = footer.classList.toggle('pinned');
            if (isPinned) {
                footer.classList.remove('glass');
                pinFooterBtn.classList.add('active');
                pinFooterBtn.innerHTML = '🔒';
            } else {
                footer.classList.add('glass');
                pinFooterBtn.classList.remove('active');
                pinFooterBtn.innerHTML = '📌';
            }
        });
    }

    setupDragDrop();
    setupWindowResizeHandler();
}

let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;

function setupWindowResizeHandler() {
    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        // Check if window is getting smaller (width or height decreased)
        const isGettingSmaller = currentWidth < lastWindowWidth || currentHeight < lastWindowHeight;
        
        // Update last dimensions
        lastWindowWidth = currentWidth;
        lastWindowHeight = currentHeight;

        // Only proceed if getting smaller
        if (!isGettingSmaller) return;

        const modals = ['theme-manager-modal', 'language-manager-modal'];
        
        modals.forEach(id => {
            const modal = document.getElementById(id);
            if (!modal || !modal.classList.contains('active') || modal.classList.contains('docked-right')) {
                return;
            }

            const rect = modal.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // Calculate overlap area
            const visibleLeft = Math.max(0, rect.left);
            const visibleRight = Math.min(windowWidth, rect.right);
            const visibleTop = Math.max(0, rect.top);
            const visibleBottom = Math.min(windowHeight, rect.bottom);

            const visibleWidth = Math.max(0, visibleRight - visibleLeft);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);
            
            const totalArea = rect.width * rect.height;
            const visibleArea = visibleWidth * visibleHeight;

            // If more than 50% is outside (visible area < 50%)
            if (visibleArea < totalArea * 0.5) {
                // Add smooth class
                modal.classList.add('smooth-reset');
                
                // Reset to center
                modal.style.top = '';
                modal.style.left = '';
                modal.style.transform = ''; // Remove inline transform (if any from drag)
                modal.classList.remove('moved');
                
                // Remove smooth class after transition
                setTimeout(() => {
                    modal.classList.remove('smooth-reset');
                }, 800);
            }
        });
    });
}

function setupDragDrop() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;

    let dragCounter = 0;
    mainContent.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        mainContent.classList.add('drag-over');
    });

    mainContent.addEventListener('dragover', (e) => e.preventDefault());

    mainContent.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) mainContent.classList.remove('drag-over');
    });

    mainContent.addEventListener('drop', async (e) => {
        e.preventDefault();
        dragCounter = 0;
        mainContent.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        for (const file of files) {
            const filePath = file.path;
            if (!filePath) continue;
            const result = await ipcRenderer.invoke('check-path-type', filePath);
            if (result.isDirectory) {
                const searchRes = await ipcRenderer.invoke('browse-games-and-emus', filePath);
                if (searchRes.success) {
                    const newGames = [...getGames(), ...searchRes.games];
                    setGames(newGames);
                    setFilteredGames(newGames);
                    renderGames(newGames);
                    searchRes.platforms.forEach(addPlatformFilterOption);
                }
            } else if (file.name.endsWith('.exe')) {
                await ipcRenderer.invoke('process-emulator-exe', filePath);
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', initializeApp);
