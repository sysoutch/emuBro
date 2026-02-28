let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;

export function setupWindowControls(options = {}) {
    const emubro = options.emubro;
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === 'function'
        ? options.openLibraryPathSettingsModal
        : async () => {};
    const openAboutDialog = typeof options.openAboutDialog === 'function'
        ? options.openAboutDialog
        : async () => {};
    if (!emubro) return;

    const minBtn = document.getElementById('win-min-btn');
    const maxBtn = document.getElementById('win-max-btn');
    const closeBtn = document.getElementById('win-close-btn');
    const updateBtn = document.getElementById('win-update-btn');
    const aboutBtn = document.getElementById('win-about-btn');
    const header = document.querySelector('header.header');
    let appUpdateAvailable = false;
    let resourcesUpdateAvailable = false;
    const isUpdateFlagTrue = (value) => {
        if (value === true) return true;
        if (value === false || value == null) return false;
        if (typeof value === 'number') return value > 0;
        const normalized = String(value).trim().toLowerCase();
        return normalized === 'true'
            || normalized === '1'
            || normalized === 'yes'
            || normalized === 'available'
            || normalized === 'downloaded'
            || normalized === 'update_available';
    };

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

    const syncUpdateBadge = () => {
        if (!updateBtn) return;
        const hasUpdate = appUpdateAvailable || resourcesUpdateAvailable;
        updateBtn.hidden = !hasUpdate;
        updateBtn.classList.toggle('has-update', hasUpdate);
        if (!hasUpdate) {
            updateBtn.removeAttribute('title');
            updateBtn.setAttribute('aria-label', 'Updates');
            return;
        }

        let label = 'Updates available';
        if (appUpdateAvailable && resourcesUpdateAvailable) label = 'App and resources updates available';
        else if (appUpdateAvailable) label = 'App update available';
        else if (resourcesUpdateAvailable) label = 'Resources update available';
        updateBtn.title = label;
        updateBtn.setAttribute('aria-label', label);
    };

    updateMaxIcon();
    syncUpdateBadge();

    if (typeof emubro.onWindowMaximizedChanged === 'function') {
        emubro.onWindowMaximizedChanged((isMax) => updateMaxIcon(!!isMax));
    }

    if (updateBtn) {
        updateBtn.addEventListener('click', async () => {
            await openLibraryPathSettingsModal({ initialTab: 'updates' });
        });
    }
    if (aboutBtn) {
        aboutBtn.addEventListener('click', async () => {
            await openAboutDialog();
        });
    }

    if (typeof emubro.onUpdateStatus === 'function') {
        emubro.onUpdateStatus((payload = {}) => {
            appUpdateAvailable = isUpdateFlagTrue(payload?.available) || isUpdateFlagTrue(payload?.downloaded);
            syncUpdateBadge();
        });
    }

    if (typeof emubro.onResourcesUpdateStatus === 'function') {
        emubro.onResourcesUpdateStatus((payload = {}) => {
            resourcesUpdateAvailable = isUpdateFlagTrue(payload?.available);
            syncUpdateBadge();
        });
    }

    Promise.resolve(emubro?.updates?.getState?.())
        .then((state) => {
            appUpdateAvailable = isUpdateFlagTrue(state?.available) || isUpdateFlagTrue(state?.downloaded);
            syncUpdateBadge();
        })
        .catch(() => {});

    Promise.resolve(emubro?.resourcesUpdates?.getState?.())
        .then((state) => {
            resourcesUpdateAvailable = isUpdateFlagTrue(state?.available);
            syncUpdateBadge();
        })
        .catch(() => {});

    if (header) {
        header.addEventListener('dblclick', async (event) => {
            if (event.target.closest('button, input, select, textarea, a, .custom-select, .options-list')) return;
            await emubro.invoke('window:toggle-maximize');
            updateMaxIcon();
        });
    }
}

export function setupHeaderThemeControlsToggle(options = {}) {
    const root = document.documentElement;
    const header = document.querySelector('header.header');
    const themeSelect = options.themeSelect || document.getElementById('theme-select');
    const themeManagerBtn = document.getElementById('theme-manager-btn');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const invertColorsBtn = document.getElementById('invert-colors-btn');
    const languageManagerBtn = document.getElementById('language-manager-btn');
    const languageOptions = document.getElementById('language-options');

    const getHeaderWidth = () => {
        if (!header) return Number(window?.innerWidth || 0);
        return Math.max(0, Math.round(header.getBoundingClientRect().width || 0));
    };

    const createHeaderWidthQuery = (maxWidth) => {
        const listeners = new Set();
        let match = getHeaderWidth() <= Number(maxWidth || 0);

        const evaluate = () => {
            const next = getHeaderWidth() <= Number(maxWidth || 0);
            if (next === match) return;
            match = next;
            listeners.forEach((listener) => {
                try {
                    listener({ matches: match });
                } catch (_error) {}
            });
        };

        return {
            get matches() {
                return !!match;
            },
            addEventListener(type, listener) {
                if (type !== 'change' || typeof listener !== 'function') return;
                listeners.add(listener);
            },
            removeEventListener(type, listener) {
                if (type !== 'change') return;
                listeners.delete(listener);
            },
            addListener(listener) {
                if (typeof listener !== 'function') return;
                listeners.add(listener);
            },
            removeListener(listener) {
                listeners.delete(listener);
            },
            evaluate
        };
    };

    const themeCompactQuery = createHeaderWidthQuery(1500);
    const languageCompactQuery = createHeaderWidthQuery(1320);

    let densityRaf = null;

    const applyHeaderDensityMode = () => {
        if (!root || !header) return;

        const headerWidth = getHeaderWidth();
        const userActionsEl = header.querySelector('.user-actions');
        const navList = header.querySelector('.navigation ul');
        
        // Simple, robust density detection
        let density = 'normal';
        
        if (headerWidth <= 1500) {
            density = 'compact';
        }
        
        if (headerWidth <= 1320) {
            density = 'tiny';
        }

        // Secondary check for content overflow if width is borderline
        if (density === 'normal') {
            const navOverflow = !!(navList && navList.scrollWidth > (navList.clientWidth + 8));
            if (navOverflow) density = 'compact';
        }
        
        if (density === 'compact') {
            const actionsOverflow = !!(userActionsEl && userActionsEl.scrollWidth > (userActionsEl.clientWidth + 8));
            if (actionsOverflow) density = 'tiny';
        }

        if (root.getAttribute('data-header-density') !== density) {
            root.setAttribute('data-header-density', density);
        }
    };

    const scheduleHeaderDensityMode = () => {
        if (densityRaf !== null) return;
        densityRaf = window.requestAnimationFrame(() => {
            densityRaf = null;
            themeCompactQuery.evaluate();
            languageCompactQuery.evaluate();
            applyHeaderDensityMode();
        });
    };

    const initSimpleToggle = (wrapperSelector, toggleSelector, compactQuery) => {
        const wrapper = document.querySelector(wrapperSelector);
        const toggleBtn = document.querySelector(toggleSelector);
        if (!wrapper || !toggleBtn) return { close: () => {} };

        const setOpen = (open) => {
            wrapper.classList.toggle('is-open', !!open);
            toggleBtn.setAttribute('aria-expanded', !!open ? 'true' : 'false');
        };

        toggleBtn.addEventListener('click', (e) => {
            if (!compactQuery.matches) return;
            e.stopPropagation();
            setOpen(!wrapper.classList.contains('is-open'));
        });

        document.addEventListener('click', (e) => {
            if (!wrapper.classList.contains('is-open')) return;
            if (!wrapper.contains(e.target)) {
                setOpen(false);
            }
        });

        return { close: () => setOpen(false) };
    };

    const themePanelController = initSimpleToggle('.theme-toggle-wrapper', '#theme-controls-toggle', themeCompactQuery);
    const languagePanelController = initSimpleToggle('.language-controls-wrapper', '#language-controls-toggle', languageCompactQuery);

    if (languageOptions) {
        languageOptions.addEventListener('click', (event) => {
            if (!event.target?.closest?.('li')) return;
            languagePanelController.close();
        });
    }
    if (languageManagerBtn) {
        languageManagerBtn.addEventListener('click', () => {
            languagePanelController.close();
        });
    }

    const themeToggle = document.getElementById('theme-controls-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            languagePanelController.close();
        });
    }
    const languageToggle = document.getElementById('language-controls-toggle');
    if (languageToggle) {
        languageToggle.addEventListener('click', () => {
            themePanelController.close();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        themePanelController.close();
        languagePanelController.close();
    });

    const syncLayout = () => {
        if (!themeCompactQuery.matches) {
            themePanelController.close();
        }
        if (!languageCompactQuery.matches) {
            languagePanelController.close();
        }
    };

    if (typeof themeCompactQuery.addEventListener === 'function') {
        themeCompactQuery.addEventListener('change', syncLayout);
    } else if (typeof themeCompactQuery.addListener === 'function') {
        themeCompactQuery.addListener(syncLayout);
    }

    if (typeof languageCompactQuery.addEventListener === 'function') {
        languageCompactQuery.addEventListener('change', syncLayout);
    } else if (typeof languageCompactQuery.addListener === 'function') {
        languageCompactQuery.addListener(syncLayout);
    }

    applyHeaderDensityMode();
    window.addEventListener('resize', scheduleHeaderDensityMode, { passive: true });
    window.addEventListener('emubro:layout-width-changed', scheduleHeaderDensityMode);

}

export function setupSidebarRail(options = {}) {
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};
    const showToolView = typeof options.showToolView === 'function' ? options.showToolView : () => {};
    const showSupportView = typeof options.showSupportView === 'function' ? options.showSupportView : () => {};
    const showCommunityView = typeof options.showCommunityView === 'function' ? options.showCommunityView : () => {};
    const setActiveRailTarget = typeof options.setActiveRailTarget === 'function' ? options.setActiveRailTarget : () => {};
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === 'function'
        ? options.openLibraryPathSettingsModal
        : async () => {};
    const openProfileModal = typeof options.openProfileModal === 'function' ? options.openProfileModal : async () => {};
    const setActiveLibrarySection = typeof options.setActiveLibrarySection === 'function'
        ? options.setActiveLibrarySection
        : async () => {};
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function'
        ? options.getActiveLibrarySection
        : () => 'all';

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggleBtn) return;

    const stored = localStorage.getItem('emuBro.sidebarExpanded');
    const initialExpanded = stored === null ? false : stored === 'true';

    const setExpanded = (expanded) => {
        sidebar.classList.toggle('sidebar--expanded', expanded);
        sidebar.classList.toggle('sidebar--collapsed', !expanded);
        document.body.classList.toggle('sidebar-is-expanded', expanded);
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggleBtn.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
        localStorage.setItem('emuBro.sidebarExpanded', expanded ? 'true' : 'false');
        try {
            window.dispatchEvent(new CustomEvent('emubro:layout-width-changed', {
                detail: { sidebarExpanded: !!expanded }
            }));
        } catch (_error) {}
    };

    setExpanded(initialExpanded);

    toggleBtn.addEventListener('click', () => {
        const expanded = sidebar.classList.contains('sidebar--expanded');
        setExpanded(!expanded);
    });

    const railButtons = document.querySelectorAll('.rail-btn.rail-nav[data-rail-target]');
    railButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
            const target = btn.dataset.railTarget;
            if (target === 'tools') {
                setAppMode('tools');
                showToolView();
                return;
            }

            if (target === 'support') {
                setAppMode('support');
                showSupportView();
                return;
            }

            if (target === 'community') {
                setAppMode('community');
                showCommunityView();
                return;
            }

            if (target === 'settings') {
                setActiveRailTarget('settings');
                await openLibraryPathSettingsModal();
                return;
            }

            if (target === 'profile') {
                setActiveRailTarget('profile');
                await openProfileModal();
                return;
            }

            setAppMode('library');
            await setActiveLibrarySection(getActiveLibrarySection() || 'all');
        });
    });
}

export function setupWindowResizeHandler(options = {}) {
    const recenterManagedModalIfMostlyOutOfView = typeof options.recenterManagedModalIfMostlyOutOfView === 'function'
        ? options.recenterManagedModalIfMostlyOutOfView
        : () => {};

    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        const isGettingSmaller = currentWidth < lastWindowWidth || currentHeight < lastWindowHeight;

        lastWindowWidth = currentWidth;
        lastWindowHeight = currentHeight;

        if (!isGettingSmaller) return;

        const modals = [
            'theme-manager-modal',
            'language-manager-modal',
            'game-info-modal',
            'emulator-info-modal'
        ];

        modals.forEach((id) => {
            recenterManagedModalIfMostlyOutOfView(id, {
                visibleThreshold: 0.5,
                smooth: true
            });
        });
    });
}
