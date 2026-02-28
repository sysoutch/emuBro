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

    const createCompactChipBlock = (title, options = []) => {
        const block = document.createElement('div');
        block.className = 'filter-pair-compact-block';

        const label = document.createElement('div');
        label.className = 'filter-pair-compact-label';
        label.textContent = String(title || '');
        block.appendChild(label);

        const optionsWrap = document.createElement('div');
        optionsWrap.className = 'filter-pair-compact-options';

        options.forEach((entry) => {
            if (!entry || !entry.label) return;
            const optionBtn = document.createElement('button');
            optionBtn.type = 'button';
            optionBtn.className = 'filter-pair-compact-option';
            if (entry.isActive) optionBtn.classList.add('is-active');
            optionBtn.textContent = String(entry.label);
            optionBtn.addEventListener('click', () => {
                try {
                    entry.onSelect?.();
                } catch (_error) {}
            });
            optionsWrap.appendChild(optionBtn);
        });

        block.appendChild(optionsWrap);
        return block;
    };

    const initCompactChipToggle = ({
        wrapperSelector,
        toggleSelector,
        compactQuery,
        menuAriaLabel,
        buildBlocks
    }) => {
        const wrapper = document.querySelector(wrapperSelector);
        const toggleBtn = document.querySelector(toggleSelector);
        if (!wrapper || !toggleBtn) {
            return { close: () => {}, isOpen: () => false, rerender: () => {} };
        }

        let floatingMenuEl = null;

        const destroyFloatingMenu = () => {
            if (!floatingMenuEl) return;
            try {
                floatingMenuEl.remove();
            } catch (_error) {}
            floatingMenuEl = null;
        };

        const positionFloatingMenu = () => {
            if (!floatingMenuEl) return;
            const rect = toggleBtn.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
            const margin = 8;

            const maxWidth = Math.max(240, viewportWidth - (margin * 2));
            const preferredWidth = Math.max(280, Math.min(620, Math.round(rect.width + 320)));
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

        const isOpen = () => wrapper.classList.contains('is-open');

        const renderFloatingMenu = () => {
            if (!compactQuery.matches) return;
            destroyFloatingMenu();

            const menu = document.createElement('div');
            menu.className = 'filter-pair-floating-menu header-compact-floating-menu';
            menu.setAttribute('role', 'dialog');
            menu.setAttribute('aria-label', menuAriaLabel);

            const builtBlocks = buildBlocks?.();
            const blocks = Array.isArray(builtBlocks) ? builtBlocks : [];
            blocks.forEach((block) => {
                if (block) menu.appendChild(block);
            });

            document.body.appendChild(menu);
            floatingMenuEl = menu;
            positionFloatingMenu();
        };

        const setOpen = (open) => {
            const shouldOpen = !!open && compactQuery.matches;
            wrapper.classList.toggle('is-open', shouldOpen);
            toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
            if (shouldOpen) renderFloatingMenu();
            else destroyFloatingMenu();
        };

        toggleBtn.addEventListener('click', (event) => {
            if (!compactQuery.matches) return;
            event.preventDefault();
            event.stopPropagation();
            setOpen(!isOpen());
        });

        document.addEventListener('click', (event) => {
            if (!compactQuery.matches || !isOpen()) return;
            if (wrapper.contains(event.target)) return;
            if (floatingMenuEl && floatingMenuEl.contains(event.target)) return;
            setOpen(false);
        });

        window.addEventListener('resize', () => {
            if (!isOpen()) return;
            if (!compactQuery.matches) {
                setOpen(false);
                return;
            }
            positionFloatingMenu();
        });

        window.addEventListener('scroll', () => {
            if (!isOpen()) return;
            positionFloatingMenu();
        }, true);

        return {
            close: () => setOpen(false),
            isOpen,
            rerender: () => {
                if (isOpen()) renderFloatingMenu();
            }
        };
    };

    const themePanelController = initCompactChipToggle({
        wrapperSelector: '.theme-toggle-wrapper',
        toggleSelector: '#theme-controls-toggle',
        compactQuery: themeCompactQuery,
        menuAriaLabel: 'Theme controls',
        buildBlocks: () => {
            const blocks = [];

            if (themeSelect) {
                const themeOptions = Array.from(themeSelect.options || [])
                    .map((optionEl) => {
                        const value = String(optionEl.value || '').trim();
                        const label = String(optionEl.textContent || '').trim();
                        if (!value || !label) return null;
                        return {
                            label,
                            isActive: String(themeSelect.value || '') === value,
                            onSelect: () => {
                                if (String(themeSelect.value || '') === value) {
                                    themePanelController.close();
                                    return;
                                }
                                themeSelect.value = value;
                                themeSelect.dispatchEvent(new Event('change', { bubbles: true }));
                                themePanelController.close();
                            }
                        };
                    })
                    .filter(Boolean);

                if (themeOptions.length > 0) {
                    blocks.push(createCompactChipBlock('Theme', themeOptions));
                }
            }

            const actionOptions = [];
            if (themeToggleBtn) {
                actionOptions.push({
                    label: 'Toggle',
                    onSelect: () => {
                        themeToggleBtn.click();
                        themePanelController.close();
                    }
                });
            }
            if (invertColorsBtn) {
                actionOptions.push({
                    label: 'Invert',
                    onSelect: () => {
                        invertColorsBtn.click();
                        themePanelController.close();
                    }
                });
            }
            if (themeManagerBtn) {
                actionOptions.push({
                    label: 'Manage',
                    onSelect: () => {
                        themeManagerBtn.click();
                        themePanelController.close();
                    }
                });
            }
            if (actionOptions.length > 0) {
                blocks.push(createCompactChipBlock('Actions', actionOptions));
            }

            return blocks;
        }
    });

    const languagePanelController = initCompactChipToggle({
        wrapperSelector: '.language-controls-wrapper',
        toggleSelector: '#language-controls-toggle',
        compactQuery: languageCompactQuery,
        menuAriaLabel: 'Language controls',
        buildBlocks: () => {
            const blocks = [];
            const currentLanguage = String(localStorage.getItem('language') || 'en').trim().toLowerCase();
            const languageEntries = Array.from(languageOptions?.querySelectorAll?.('li[data-value]') || [])
                .map((li) => {
                    const value = String(li.dataset.value || '').trim().toLowerCase();
                    if (!value) return null;
                    const label = String(
                        li.querySelector('span:last-child')?.textContent
                        || li.textContent
                        || value
                    ).trim();
                    if (!label) return null;
                    return { value, label };
                })
                .filter(Boolean);

            if (languageEntries.length > 0) {
                blocks.push(createCompactChipBlock('Language', languageEntries.map((entry) => ({
                    label: entry.label,
                    isActive: entry.value === currentLanguage,
                    onSelect: () => {
                        if (entry.value === currentLanguage) {
                            languagePanelController.close();
                            return;
                        }
                        const targetOption = Array.from(languageOptions?.querySelectorAll?.('li[data-value]') || [])
                            .find((li) => String(li.dataset.value || '').trim().toLowerCase() === entry.value);
                        if (targetOption) {
                            targetOption.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        }
                        languagePanelController.close();
                    }
                }))));
            }

            if (languageManagerBtn) {
                blocks.push(createCompactChipBlock('Actions', [{
                    label: 'Manage',
                    onSelect: () => {
                        languageManagerBtn.click();
                        languagePanelController.close();
                    }
                }]));
            }

            return blocks;
        }
    });

    if (languageOptions) {
        languageOptions.addEventListener('click', () => {
            if (!languagePanelController.isOpen()) return;
            languagePanelController.rerender();
        });
    }

    if (themeManagerBtn) {
        themeManagerBtn.addEventListener('click', () => {
            themePanelController.close();
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
