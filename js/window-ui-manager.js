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

    const themeCompactQuery = createHeaderWidthQuery(1460);
    const languageCompactQuery = createHeaderWidthQuery(1260);

    let densityRaf = null;

    const applyHeaderDensityMode = () => {
        if (!root || !header) return;

        const headerWidth = getHeaderWidth();
        const userActionsEl = header.querySelector('.user-actions');
        const navList = header.querySelector('.navigation ul');
        const navOverflow = !!(navList && navList.scrollWidth > (navList.clientWidth + 8));
        const actionsOverflow = !!(userActionsEl && userActionsEl.scrollWidth > (userActionsEl.clientWidth + 8));

        let density = 'normal';
        if (themeCompactQuery.matches || navOverflow || headerWidth <= 1380) density = 'compact';
        if (languageCompactQuery.matches || actionsOverflow || headerWidth <= 1180) density = 'tiny';
        if (density === 'compact' && actionsOverflow) density = 'tiny';
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

    const initCompactWrapper = ({
        wrapperSelector,
        toggleId,
        compactQuery,
        menuAriaLabel,
        buildBlocks,
        closeOnChangeElement = null
    }) => {
        const wrapper = document.querySelector(wrapperSelector);
        const toggleBtn = document.getElementById(toggleId);
        if (!wrapper || !toggleBtn || typeof buildBlocks !== 'function') {
            return { close: () => {}, isOpen: () => false, rerender: () => {} };
        }

        let floatingMenuEl = null;

        const createOptionButton = ({ label, active = false, onClick }) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-pair-compact-option';
            if (active) btn.classList.add('is-active');
            btn.textContent = String(label || '').trim();
            btn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof onClick === 'function') onClick();
            });
            return btn;
        };

        const createCompactBlock = (title, options = []) => {
            const normalizedOptions = Array.isArray(options) ? options : [];
            if (normalizedOptions.length === 0) return null;

            const block = document.createElement('div');
            block.className = 'filter-pair-compact-block';

            const label = document.createElement('div');
            label.className = 'filter-pair-compact-label';
            label.textContent = String(title || 'Options');
            block.appendChild(label);

            const optionsWrap = document.createElement('div');
            optionsWrap.className = 'filter-pair-compact-options';
            normalizedOptions.forEach((entry) => {
                const btn = createOptionButton(entry);
                if (!btn.textContent) return;
                optionsWrap.appendChild(btn);
            });

            if (optionsWrap.childElementCount === 0) return null;
            block.appendChild(optionsWrap);
            return block;
        };

        const destroyFloatingMenu = () => {
            if (!floatingMenuEl) return;
            try {
                floatingMenuEl.remove();
            } catch (_error) {}
            floatingMenuEl = null;
        };

        const positionFloatingMenu = () => {
            if (!floatingMenuEl || !toggleBtn) return;
            const rect = toggleBtn.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const margin = 8;

            const maxWidth = Math.max(220, viewportWidth - (margin * 2));
            const preferredWidth = Math.max(240, Math.min(560, Math.round(rect.width + 240)));
            floatingMenuEl.style.width = `${Math.min(preferredWidth, maxWidth)}px`;
            floatingMenuEl.style.maxWidth = `${maxWidth}px`;

            floatingMenuEl.style.left = `${Math.max(margin, rect.left)}px`;
            floatingMenuEl.style.top = `${Math.max(margin, rect.bottom + 6)}px`;

            const menuRect = floatingMenuEl.getBoundingClientRect();
            let left = rect.left;
            if (left + menuRect.width > viewportWidth - margin) {
                left = viewportWidth - margin - menuRect.width;
            }
            if (left < margin) left = margin;

            let top = rect.bottom + 6;
            if (top + menuRect.height > viewportHeight - margin) {
                top = rect.top - menuRect.height - 6;
            }
            if (top < margin) top = margin;

            floatingMenuEl.style.left = `${Math.round(left)}px`;
            floatingMenuEl.style.top = `${Math.round(top)}px`;
        };

        const setOpenState = (open) => {
            const shouldOpen = !!open && compactQuery.matches;
            wrapper.classList.toggle('is-open', shouldOpen);
            toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            if (shouldOpen) {
                const menu = document.createElement('div');
                menu.className = 'filter-pair-floating-menu header-compact-floating-menu';
                menu.setAttribute('role', 'dialog');
                menu.setAttribute('aria-label', String(menuAriaLabel || 'Options'));

                const blocks = buildBlocks({
                    close: () => setOpenState(false),
                    createCompactBlock
                });
                (Array.isArray(blocks) ? blocks : []).forEach((block) => {
                    if (block) menu.appendChild(block);
                });

                if (menu.childElementCount === 0) {
                    wrapper.classList.remove('is-open');
                    toggleBtn.setAttribute('aria-expanded', 'false');
                    destroyFloatingMenu();
                    return;
                }

                destroyFloatingMenu();
                document.body.appendChild(menu);
                floatingMenuEl = menu;
                positionFloatingMenu();
            } else {
                destroyFloatingMenu();
            }
        };

        const closePanel = () => setOpenState(false);
        const rerenderPanel = () => {
            if (!wrapper.classList.contains('is-open')) return;
            setOpenState(true);
        };

        toggleBtn.addEventListener('click', (event) => {
            if (!compactQuery.matches) return;
            event.preventDefault();
            event.stopPropagation();
            setOpenState(!wrapper.classList.contains('is-open'));
        });

        document.addEventListener('click', (event) => {
            if (!compactQuery.matches || !wrapper.classList.contains('is-open')) return;
            if (wrapper.contains(event.target)) return;
            if (floatingMenuEl && floatingMenuEl.contains(event.target)) return;
            closePanel();
        });

        if (closeOnChangeElement) {
            closeOnChangeElement.addEventListener('change', closePanel);
            closeOnChangeElement.addEventListener('change', rerenderPanel);
        }

        window.addEventListener('resize', () => {
            if (!wrapper.classList.contains('is-open')) return;
            if (!compactQuery.matches) {
                closePanel();
                return;
            }
            positionFloatingMenu();
        });

        window.addEventListener('scroll', () => {
            if (!wrapper.classList.contains('is-open')) return;
            positionFloatingMenu();
        }, true);

        return {
            close: closePanel,
            isOpen: () => wrapper.classList.contains('is-open'),
            rerender: rerenderPanel
        };
    };

    const themePanelController = initCompactWrapper({
        wrapperSelector: '.theme-toggle-wrapper',
        toggleId: 'theme-controls-toggle',
        compactQuery: themeCompactQuery,
        menuAriaLabel: 'Theme options',
        buildBlocks: ({ close, createCompactBlock }) => {
            const blocks = [];
            const themeOptions = Array.from(themeSelect?.options || [])
                .map((optionEl) => ({
                    value: String(optionEl.value || '').trim(),
                    label: String(optionEl.textContent || '').trim()
                }))
                .filter((entry) => entry.value && entry.label);

            if (themeOptions.length > 0) {
                const currentValue = String(themeSelect?.value || '').trim();
                const themeBlock = createCompactBlock(
                    'Theme',
                    themeOptions.map((entry) => ({
                        label: entry.label,
                        active: currentValue === entry.value,
                        onClick: () => {
                            if (!themeSelect) {
                                close();
                                return;
                            }
                            if (themeSelect.value === entry.value) {
                                close();
                                return;
                            }
                            themeSelect.value = entry.value;
                            themeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            close();
                        }
                    }))
                );
                if (themeBlock) blocks.push(themeBlock);
            }

            const actionOptions = [];
            if (themeToggleBtn) {
                actionOptions.push({
                    label: 'Toggle Light/Dark',
                    active: false,
                    onClick: () => {
                        themeToggleBtn.click();
                        close();
                    }
                });
            }
            if (invertColorsBtn) {
                actionOptions.push({
                    label: String(invertColorsBtn.title || 'Invert Colors'),
                    active: false,
                    onClick: () => {
                        invertColorsBtn.click();
                        close();
                    }
                });
            }
            if (themeManagerBtn) {
                actionOptions.push({
                    label: 'Manage Themes',
                    active: false,
                    onClick: () => {
                        themeManagerBtn.click();
                        close();
                    }
                });
            }
            const actionsBlock = createCompactBlock('Actions', actionOptions);
            if (actionsBlock) blocks.push(actionsBlock);

            return blocks;
        },
        closeOnChangeElement: themeSelect
    });
    const languagePanelController = initCompactWrapper({
        wrapperSelector: '.language-controls-wrapper',
        toggleId: 'language-controls-toggle',
        compactQuery: languageCompactQuery,
        menuAriaLabel: 'Language options',
        buildBlocks: ({ close, createCompactBlock }) => {
            const blocks = [];
            const i18nRef = (() => {
                if (typeof window !== 'undefined' && window.i18n) return window.i18n;
                try {
                    // eslint-disable-next-line no-undef
                    return typeof i18n !== 'undefined' ? i18n : null;
                } catch (_e) {
                    return null;
                }
            })();
            const currentLanguage = String(
                i18nRef?.getLanguage?.()
                || localStorage.getItem('language')
                || ''
            ).trim().toLowerCase();

            const languageEntries = Array.from(languageOptions?.querySelectorAll?.('li[data-value]') || [])
                .map((li) => {
                    const value = String(li.dataset.value || '').trim().toLowerCase();
                    const nameNode = li.querySelector('span:last-child');
                    const label = String(nameNode?.textContent || li.textContent || '').trim();
                    return { value, label, node: li };
                })
                .filter((entry) => entry.value && entry.label);

            if (languageEntries.length > 0) {
                const languageBlock = createCompactBlock(
                    'Language',
                    languageEntries.map((entry) => ({
                        label: entry.label,
                        active: currentLanguage === entry.value,
                        onClick: () => {
                            if (currentLanguage === entry.value) {
                                close();
                                return;
                            }
                            if (i18nRef && typeof i18nRef.setLanguage === 'function') {
                                i18nRef.setLanguage(entry.value);
                            } else if (entry.node) {
                                entry.node.click();
                            }
                            close();
                        }
                    }))
                );
                if (languageBlock) blocks.push(languageBlock);
            }

            if (languageManagerBtn) {
                const actionsBlock = createCompactBlock('Actions', [{
                    label: 'Manage Languages',
                    active: false,
                    onClick: () => {
                        languageManagerBtn.click();
                        close();
                    }
                }]);
                if (actionsBlock) blocks.push(actionsBlock);
            }

            return blocks;
        }
    });

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
