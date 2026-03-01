export function bindCoreModalHandlers({
    modal,
    closeModal,
    setActiveTab,
    render,
    generalDraft,
    importDraft,
    normalizeLibrarySection,
    confirmDisableLlmHelpersFlow,
    suggestedSectionKey,
    openThemeManager,
    openLanguageManager,
    openProfileModal,
    runBrowseSearch,
    getBrowseScopeSelection,
    openFooterPanel,
    openLauncherImportModal,
    normalizeInputBindingProfile,
    platformGamepadDraft
}) {
    const closeButtons = modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach((button) => button.addEventListener('click', closeModal));

    modal.querySelectorAll('[data-settings-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            setActiveTab(String(button.dataset.settingsTab || 'general'));
            render();
        });
    });

    const defaultSectionSelect = modal.querySelector('[data-setting="default-section"]');
    if (defaultSectionSelect) {
        defaultSectionSelect.addEventListener('change', () => {
            generalDraft.defaultSection = normalizeLibrarySection(defaultSectionSelect.value || 'all');
        });
    }

    const defaultViewSelect = modal.querySelector('[data-setting="default-view"]');
    if (defaultViewSelect) {
        defaultViewSelect.addEventListener('change', () => {
            generalDraft.defaultView = String(defaultViewSelect.value || 'cover').toLowerCase();
        });
    }

    const showIndicatorToggle = modal.querySelector('[data-setting="show-load-indicator"]');
    if (showIndicatorToggle) {
        showIndicatorToggle.addEventListener('change', () => {
            generalDraft.showLoadIndicator = !!showIndicatorToggle.checked;
        });
    }

    const autoOpenFooterToggle = modal.querySelector('[data-setting="auto-open-footer"]');
    if (autoOpenFooterToggle) {
        autoOpenFooterToggle.addEventListener('change', () => {
            generalDraft.autoOpenFooter = !!autoOpenFooterToggle.checked;
        });
    }

    const llmHelpersToggle = modal.querySelector('[data-setting="llm-helpers-enabled"]');
    if (llmHelpersToggle) {
        llmHelpersToggle.addEventListener('change', () => {
            const shouldEnable = !!llmHelpersToggle.checked;
            if (!shouldEnable) {
                const confirmed = confirmDisableLlmHelpersFlow();
                if (!confirmed) {
                    llmHelpersToggle.checked = true;
                    generalDraft.llmHelpersEnabled = true;
                    return;
                }
            }
            generalDraft.llmHelpersEnabled = shouldEnable;
            if (!generalDraft.llmHelpersEnabled && generalDraft.defaultSection === suggestedSectionKey) {
                generalDraft.defaultSection = 'all';
            }
            render();
        });
    }

    const llmAllowUnknownTagsToggle = modal.querySelector('[data-setting="llm-allow-unknown-tags"]');
    if (llmAllowUnknownTagsToggle) {
        llmAllowUnknownTagsToggle.addEventListener('change', () => {
            generalDraft.llmAllowUnknownTags = !!llmAllowUnknownTagsToggle.checked;
        });
    }

    const preferCopyToggle = modal.querySelector('[data-setting="prefer-copy-external"]');
    if (preferCopyToggle) {
        preferCopyToggle.addEventListener('change', () => {
            importDraft.preferCopyExternal = !!preferCopyToggle.checked;
        });
    }

    const networkScanToggle = modal.querySelector('[data-setting="enable-network-scan"]');
    if (networkScanToggle) {
        networkScanToggle.addEventListener('change', () => {
            importDraft.enableNetworkScan = !!networkScanToggle.checked;
        });
    }

    modal.querySelectorAll('[data-launcher-store]').forEach((input) => {
        input.addEventListener('change', () => {
            const key = String(input.dataset.launcherStore || '').trim().toLowerCase();
            if (!key) return;
            importDraft.launcherStores[key] = !!input.checked;
        });
    });

    const launcherDiscoverySelect = modal.querySelector('[data-launcher-discovery]');
    if (launcherDiscoverySelect) {
        launcherDiscoverySelect.addEventListener('change', () => {
            importDraft.launcherDiscoveryMode = String(launcherDiscoverySelect.value || 'filesystem').toLowerCase();
        });
    }

    const launcherScanButton = modal.querySelector('[data-launcher-scan]');
    if (launcherScanButton) {
        launcherScanButton.addEventListener('click', async () => {
            await openLauncherImportModal();
        });
    }

    const openThemeButton = modal.querySelector('[data-settings-open-theme]');
    if (openThemeButton) openThemeButton.addEventListener('click', () => openThemeManager());

    const openLanguageButton = modal.querySelector('[data-settings-open-language]');
    if (openLanguageButton) openLanguageButton.addEventListener('click', () => openLanguageManager());

    const openProfileButton = modal.querySelector('[data-settings-open-profile]');
    if (openProfileButton) openProfileButton.addEventListener('click', () => openProfileModal());

    const quickSearchButton = modal.querySelector('[data-settings-quick-search]');
    if (quickSearchButton) {
        quickSearchButton.addEventListener('click', async () => runBrowseSearch('quick', { scope: getBrowseScopeSelection() }));
    }

    const customSearchButton = modal.querySelector('[data-settings-custom-search]');
    if (customSearchButton) {
        customSearchButton.addEventListener('click', async () => runBrowseSearch('custom', { scope: getBrowseScopeSelection() }));
    }

    const openBrowseTabButton = modal.querySelector('[data-settings-open-browse-tab]');
    if (openBrowseTabButton) {
        openBrowseTabButton.addEventListener('click', () => {
            closeModal();
            openFooterPanel('browse');
        });
    }

    modal.querySelectorAll('[data-platform-gamepad-input]').forEach((input) => {
        input.addEventListener('input', () => {
            const platformShortName = String(input.dataset.platformGamepadInput || '').trim().toLowerCase();
            const action = String(input.dataset.platformGamepadAction || '').trim();
            const channel = String(input.dataset.platformGamepadChannel || '').trim().toLowerCase();
            if (!platformShortName || !action || (channel !== 'keyboard' && channel !== 'gamepad')) return;

            const nextBindings = normalizeInputBindingProfile(platformGamepadDraft[platformShortName] || {});
            const value = String(input.value || '').trim();
            if (value) nextBindings[channel][action] = value;
            else delete nextBindings[channel][action];

            platformGamepadDraft[platformShortName] = normalizeInputBindingProfile(nextBindings);
            const nextProfile = platformGamepadDraft[platformShortName];
            const hasKeyboardBindings = Object.keys(nextProfile.keyboard || {}).length > 0;
            const hasGamepadBindings = Object.keys(nextProfile.gamepad || {}).length > 0;
            if (!hasKeyboardBindings && !hasGamepadBindings) {
                delete platformGamepadDraft[platformShortName];
            }
        });
    });

    modal.querySelectorAll('[data-platform-gamepad-clear]').forEach((button) => {
        button.addEventListener('click', () => {
            const platformShortName = String(button.dataset.platformGamepadClear || '').trim().toLowerCase();
            if (!platformShortName) return;
            delete platformGamepadDraft[platformShortName];
            render();
        });
    });
}
