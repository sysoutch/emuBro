import './scss/styles.scss';

const emubro = window.emubro;
const log = console;

if (!emubro) {
    throw new Error('preload API missing: window.emubro is not available');
}

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

// ===== IPC Listeners (via preload) =====
emubro.onWindowMoved((position, screenGoal) => {
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
        // Let CSS target OS-specific chrome effects (frameless window frame, etc).
        if (emubro.platform) {
            document.documentElement.setAttribute('data-os', String(emubro.platform));
        }

        // Deep-link launches (emubro://launch?...)
        emubro.onLaunch((data) => {
            console.log('Launch game request:', data);
            // TODO: map {platform,name,code} to an installed game and trigger launch.
        });

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
        await initI18n(() => {
            renderGames(getFilteredGames());
            renderThemeManager();
        });
        updateUILanguage();
        populateLanguageSelector();
        initLanguageManager();
        initDocking();

        // Old select listener removed as it is now custom dropdown handled in i18n-manager

        // Load data
        const userInfo = await emubro.invoke('get-user-info');
        if (userNameElement) userNameElement.textContent = userInfo.username;
        if (userAvatarElement) userAvatarElement.src = userInfo.avatar;
        
        const stats = await emubro.invoke('get-library-stats');
        if (totalGamesElement) totalGamesElement.textContent = stats.totalGames;
        if (playTimeElement) playTimeElement.textContent = stats.totalPlayTime;
        
        const games = await emubro.invoke('get-games');
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
        const drives = await emubro.invoke('get-drives');
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
    setupSidebarRail();

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

    // Header Navigation
    const navLinks = document.querySelectorAll('.navigation a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
            
            const text = e.target.textContent.toLowerCase();
            if (text === 'tools') {
                showToolView(); // Show overview
            } else if (text === 'library') {
                // Return to library view
                document.getElementById('games-header').textContent = i18n.t('views.featuredGames') || 'Featured Games';
                renderGames(getFilteredGames());
            }
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
    setupWindowControls();
}

function setupWindowControls() {
    const minBtn = document.getElementById('win-min-btn');
    const maxBtn = document.getElementById('win-max-btn');
    const closeBtn = document.getElementById('win-close-btn');
    const header = document.querySelector('header.header');

    // If the build uses native frame, these buttons can be hidden via CSS later.
    if (minBtn) minBtn.addEventListener('click', () => emubro.invoke('window:minimize'));
    if (closeBtn) closeBtn.addEventListener('click', () => emubro.invoke('window:close'));
    if (maxBtn) maxBtn.addEventListener('click', async () => {
        await emubro.invoke('window:toggle-maximize');
        updateMaxIcon();
    });

    const setWindowStateAttr = (isMax) => {
        try {
            document.documentElement.setAttribute('data-window-state', isMax ? 'maximized' : 'normal');
        } catch (_e) {}
    };

    const updateMaxIcon = async (forcedIsMax) => {
        if (!maxBtn) return;
        try {
            const isMax = (typeof forcedIsMax === 'boolean')
                ? forcedIsMax
                : await emubro.invoke('window:is-maximized');
            maxBtn.textContent = isMax ? '❐' : '▢';
            maxBtn.title = isMax ? 'Restore' : 'Maximize';
            maxBtn.setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
            setWindowStateAttr(isMax);
        } catch (_e) {}
    };

    updateMaxIcon();

    // Update state when OS changes maximize (Win+Up, dragging to top, etc).
    if (typeof emubro.onWindowMaximizedChanged === 'function') {
        emubro.onWindowMaximizedChanged((isMax) => updateMaxIcon(!!isMax));
    }

    // Double click the header background to toggle maximize (common Windows behavior).
    if (header) {
        header.addEventListener('dblclick', async (e) => {
            // Ignore dblclick on interactive controls
            if (e.target.closest('button, input, select, textarea, a, .custom-select, .options-list')) return;
            await emubro.invoke('window:toggle-maximize');
            updateMaxIcon();
        });
    }
}

function setupSidebarRail() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggleBtn) return;

    const stored = localStorage.getItem('emuBro.sidebarExpanded');
    const initialExpanded = stored === null ? false : stored === 'true';

    const setExpanded = (expanded) => {
        sidebar.classList.toggle('sidebar--expanded', expanded);
        sidebar.classList.toggle('sidebar--collapsed', !expanded);
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggleBtn.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
        localStorage.setItem('emuBro.sidebarExpanded', expanded ? 'true' : 'false');
    };

    setExpanded(initialExpanded);

    toggleBtn.addEventListener('click', () => {
        const expanded = sidebar.classList.contains('sidebar--expanded');
        setExpanded(!expanded);
    });

    const railButtons = document.querySelectorAll('.rail-btn.rail-nav[data-rail-target]');
    railButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            railButtons.forEach(b => b.classList.remove('is-active'));
            btn.classList.add('is-active');

            const target = btn.dataset.railTarget;
            if (target === 'tools') {
                showToolView();
                return;
            }

            if (target === 'settings') {
                openThemeManager();
                return;
            }

            // Default: return to library view
            const gamesHeader = document.getElementById('games-header');
            if (gamesHeader) {
                gamesHeader.textContent = i18n.t('views.featuredGames') || 'Featured Games';
            }
            renderGames(getFilteredGames());
        });
    });
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

    const isFileDrag = (e) => {
        const dt = e && e.dataTransfer;
        if (!dt) return false;

        // Most reliable across OS/file managers: DataTransfer.types contains "Files"
        try {
            const types = Array.from(dt.types || []);
            if (types.includes('Files')) return true;
        } catch (_e) {}

        // Some environments expose file items directly.
        try {
            const items = Array.from(dt.items || []);
            if (items.some(it => it && it.kind === 'file')) return true;
        } catch (_e) {}

        // Fallback: if files list exists, treat as file drag (length can be 0 during dragenter).
        if (dt.files) return true;

        return false;
    };

    // Prevent default browser navigation on drop (especially in packaged builds).
    document.addEventListener('dragover', (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
    }, true);
    document.addEventListener('drop', (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
    }, true);

    const onEnter = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        dragCounter++;
        mainContent.classList.add('drag-over');
    };

    const onLeave = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            mainContent.classList.remove('drag-over');
        }
    };

    const onOver = (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
    };

    async function getPlatformsCached() {
        if (window.__emubroPlatforms) return window.__emubroPlatforms;
        const platforms = await emubro.invoke('get-platforms');
        window.__emubroPlatforms = Array.isArray(platforms) ? platforms : [];
        return window.__emubroPlatforms;
    }

    function createModal({ title, body, buttons }) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'display:flex',
                'position:fixed',
                'inset:0',
                'background:rgba(0,0,0,0.55)',
                'z-index:3000',
                'align-items:center',
                'justify-content:center',
                'padding:16px'
            ].join(';');

            const content = document.createElement('div');
            content.className = 'glass';
            content.style.cssText = [
                'background:var(--bg-secondary)',
                'border:1px solid var(--border-color)',
                'border-radius:12px',
                'max-width:720px',
                'width:100%',
                'box-shadow:0 8px 24px rgba(0,0,0,0.35)',
                'padding:16px'
            ].join(';');

            const header = document.createElement('div');
            header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;';
            const h = document.createElement('div');
            h.textContent = title || 'emuBro';
            h.style.cssText = 'font-size:18px;font-weight:700;';
            header.appendChild(h);

            const closeBtn = document.createElement('button');
            closeBtn.className = 'close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => {
                overlay.remove();
                resolve({ canceled: true });
            });
            header.appendChild(closeBtn);

            const bodyWrap = document.createElement('div');
            if (body) bodyWrap.appendChild(body);

            const footer = document.createElement('div');
            footer.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap;';
            (buttons || []).forEach((b) => {
                const btn = document.createElement('button');
                btn.className = 'action-btn';
                btn.textContent = b.label;
                if (b.primary) btn.classList.add('launch-btn');
                btn.addEventListener('click', async () => {
                    const val = await (b.onClick ? b.onClick() : null);
                    if (val && val.keepOpen) return;
                    overlay.remove();
                    resolve(val ?? { canceled: false });
                });
                footer.appendChild(btn);
            });

            content.appendChild(header);
            content.appendChild(bodyWrap);
            content.appendChild(footer);
            overlay.appendChild(content);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.remove();
                    resolve({ canceled: true });
                }
            });
            document.body.appendChild(overlay);
        });
    }

    async function promptPlatformForFiles(filePaths) {
        const platforms = await getPlatformsCached();

        const wrap = document.createElement('div');
        wrap.innerHTML = `
            <div style="margin-bottom:10px;font-weight:600;">Platform unknown</div>
            <div style="opacity:0.9;margin-bottom:10px;">Select the platform for these files and import them.</div>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:10px;">
                <label style="min-width:120px;">Platform</label>
            </div>
            <div style="max-height:240px;overflow:auto;border:1px solid var(--border-color);border-radius:8px;padding:10px;">
                ${filePaths.map(p => `<div style="font-family:monospace;font-size:12px;opacity:0.9;">${p}</div>`).join('')}
            </div>
        `;

        const select = document.createElement('select');
        select.className = 'glass-dropdown';
        select.style.cssText = 'min-width:260px;';
        select.innerHTML = `<option value="">Select platform...</option>` + platforms.map(p => `<option value="${p.shortName}">${p.name} (${p.shortName})</option>`).join('');
        wrap.children[2].appendChild(select);

        const res = await createModal({
            title: 'Import Files',
            body: wrap,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                {
                    label: 'Import',
                    primary: true,
                    onClick: async () => {
                        const psn = String(select.value || '').trim();
                        if (!psn) {
                            alert('Please select a platform.');
                            return { keepOpen: true };
                        }
                        return { canceled: false, platformShortName: psn };
                    }
                }
            ]
        });

        return res;
    }

    async function promptExeImport(exePath) {
        const det = await emubro.invoke('detect-emulator-exe', exePath);
        const platforms = await getPlatformsCached();

        const wrap = document.createElement('div');
        const fileName = exePath.split(/[\\/]/).pop();

        const emuDefault = det && det.success && det.matched;
        const emuPlatformDefault = det && det.success && det.platformShortName ? String(det.platformShortName) : '';

        wrap.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:10px;">
                <div><strong>File:</strong> <span style="font-family:monospace;">${fileName}</span></div>
                <div style="opacity:0.9;">
                    ${emuDefault ? `Detected as emulator for <strong>${det.platformName}</strong> (${det.platformShortName}).` : `Not sure if this .exe is an emulator or a game.`}
                </div>
                <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;margin-top:6px;">
                    <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="exe-add-emu" /> Add as Emulator</label>
                    <label style="display:flex;gap:8px;align-items:center;"><input type="checkbox" id="exe-add-game" /> Add as Game</label>
                </div>
                <div id="emu-platform-row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <label style="min-width:120px;">Emulator platform</label>
                </div>
                <div id="game-platform-row" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
                    <label style="min-width:120px;">Game platform</label>
                </div>
            </div>
        `;

        const addEmu = wrap.querySelector('#exe-add-emu');
        const addGame = wrap.querySelector('#exe-add-game');

        const emuSelect = document.createElement('select');
        emuSelect.className = 'glass-dropdown';
        emuSelect.style.cssText = 'min-width:260px;';
        emuSelect.innerHTML = `<option value="">Select platform...</option>` + platforms.map(p => `<option value="${p.shortName}">${p.name} (${p.shortName})</option>`).join('');
        if (emuPlatformDefault) emuSelect.value = emuPlatformDefault;
        wrap.querySelector('#emu-platform-row').appendChild(emuSelect);

        const gameSelect = document.createElement('select');
        gameSelect.className = 'glass-dropdown';
        gameSelect.style.cssText = 'min-width:260px;';
        gameSelect.innerHTML = platforms.map(p => `<option value="${p.shortName}">${p.name} (${p.shortName})</option>`).join('');
        gameSelect.value = 'pc';
        wrap.querySelector('#game-platform-row').appendChild(gameSelect);

        addEmu.checked = !!emuDefault;
        addGame.checked = false;

        const updateRows = () => {
            wrap.querySelector('#emu-platform-row').style.opacity = addEmu.checked ? '1' : '0.45';
            emuSelect.disabled = !addEmu.checked;
            wrap.querySelector('#game-platform-row').style.opacity = addGame.checked ? '1' : '0.45';
            gameSelect.disabled = !addGame.checked;
        };
        addEmu.addEventListener('change', updateRows);
        addGame.addEventListener('change', updateRows);
        updateRows();

        const res = await createModal({
            title: 'Import .exe',
            body: wrap,
            buttons: [
                { label: 'Cancel', onClick: () => ({ canceled: true }) },
                {
                    label: 'Import',
                    primary: true,
                    onClick: async () => {
                        if (!addEmu.checked && !addGame.checked) {
                            alert('Select Emulator and/or Game.');
                            return { keepOpen: true };
                        }
                        if (addEmu.checked && !String(emuSelect.value || '').trim()) {
                            alert('Select the emulator platform.');
                            return { keepOpen: true };
                        }
                        return {
                            canceled: false,
                            addEmulator: addEmu.checked,
                            emulatorPlatformShortName: String(emuSelect.value || '').trim(),
                            addGame: addGame.checked,
                            gamePlatformShortName: String(gameSelect.value || '').trim() || 'pc'
                        };
                    }
                }
            ]
        });

        return res;
    }

    async function importAndRefresh(paths, recursive) {
        const result = await emubro.importPaths(paths, { recursive });

        // Unknown/unmatched: offer platform picker for direct file drops.
        const unmatched = (result?.skipped || []).filter(s => s && s.reason === 'unmatched').map(s => s.path).filter(Boolean);
        if (unmatched.length > 0) {
            const pick = await promptPlatformForFiles(unmatched);
            if (pick && !pick.canceled && pick.platformShortName) {
                await emubro.invoke('import-files-as-platform', unmatched, pick.platformShortName);
            }
        }

        const noMatches = (result?.skipped || []).filter(s => s && s.reason === 'no_matches').map(s => s.path).filter(Boolean);
        if (noMatches.length > 0) {
            alert(`No supported games/emulators found in:\n\n${noMatches.join('\n')}`);
        }

        // Reload library from main process DB.
        const updatedGames = await emubro.invoke('get-games');
        setGames(updatedGames);
        setFilteredGames([...updatedGames]);
        renderGames(getFilteredGames());
        initializePlatformFilterOptions();

        return result;
    }

    const onDrop = async (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        dragCounter = 0;
        mainContent.classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files || []);
        const rawPaths = files.map(f => f.path).filter(Boolean);
        if (rawPaths.length === 0) return;

        // Ask once about recursion if a folder is included.
        let recursive = true;
        try {
            const typeChecks = await Promise.all(rawPaths.map(p => emubro.invoke('check-path-type', p)));
            const firstDir = typeChecks.find(t => t && t.isDirectory && t.path)?.path;
            if (firstDir) {
                const prompt = await emubro.promptScanSubfolders(firstDir);
                if (prompt && prompt.canceled) return;
                if (prompt && typeof prompt.recursive === 'boolean') recursive = prompt.recursive;
            }
        } catch (err) {
            console.error('Failed to determine dropped path types:', err);
        }

        // Handle .exe drops with an explicit prompt (emulator/game/both).
        const exePaths = rawPaths.filter(p => String(p).toLowerCase().endsWith('.exe'));
        const otherPaths = rawPaths.filter(p => !String(p).toLowerCase().endsWith('.exe'));

        try {
            for (const exePath of exePaths) {
                const choice = await promptExeImport(exePath);
                if (choice?.canceled) continue;
                const res = await emubro.invoke('import-exe', {
                    path: exePath,
                    addEmulator: !!choice.addEmulator,
                    emulatorPlatformShortName: choice.emulatorPlatformShortName,
                    addGame: !!choice.addGame,
                    gamePlatformShortName: choice.gamePlatformShortName
                });
                if (!res?.success) {
                    alert(`Import failed for ${exePath}:\n${res?.message || 'Unknown error'}`);
                }
            }

            if (otherPaths.length > 0) {
                await importAndRefresh(otherPaths, recursive);
            } else {
                // Still refresh after importing executables.
                const updatedGames = await emubro.invoke('get-games');
                setGames(updatedGames);
                setFilteredGames([...updatedGames]);
                renderGames(getFilteredGames());
                initializePlatformFilterOptions();
            }
        } catch (err) {
            console.error('Import failed:', err);
            alert(`Import failed: ${err?.message || err}`);
        }
    };

    // Bind to document (capture) so dropping works even if a child element intercepts events.
    document.addEventListener('dragenter', onEnter, true);
    document.addEventListener('dragleave', onLeave, true);
    document.addEventListener('dragover', onOver, true);
    document.addEventListener('drop', onDrop, true);
}

document.addEventListener('DOMContentLoaded', initializeApp);
