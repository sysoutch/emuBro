export function bindSaveSettingsHandler({
    modal,
    saveLibraryPathSettings,
    draft,
    generalDraft,
    importDraft,
    llmDraft,
    platformGamepadDraft,
    savePlatformGamepadBindingsMap,
    saveSuggestionSettings,
    emubro,
    normalizeRelayPort,
    normalizeRelayAccessMode,
    normalizeRelayAddressList,
    normalizeLibrarySection,
    setActiveLibrarySectionState,
    setActiveViewButton,
    isLibraryTopSection,
    setActiveLibrarySection,
    closeModal,
    addFooterNotification,
    setLlmHelpersEnabled,
    setLlmAllowUnknownTagsEnabled,
    onRelaySyncResult
}) {
    const saveButton = modal.querySelector('[data-save-settings]');
    if (!saveButton) return;

    saveButton.addEventListener('click', async () => {
        try {
            await saveLibraryPathSettings(draft);
            localStorage.setItem('emuBro.defaultLibrarySection', generalDraft.defaultSection);
            localStorage.setItem('emuBro.defaultLibraryView', generalDraft.defaultView);
            localStorage.setItem('emuBro.showLoadIndicator', generalDraft.showLoadIndicator ? 'true' : 'false');
            localStorage.setItem('emuBro.autoOpenFooter', generalDraft.autoOpenFooter ? 'true' : 'false');
            setLlmHelpersEnabled(generalDraft.llmHelpersEnabled, { persist: true, rerender: false });
            setLlmAllowUnknownTagsEnabled(generalDraft.llmAllowUnknownTags, { persist: true });
            localStorage.setItem('emuBro.preferCopyExternal', importDraft.preferCopyExternal ? 'true' : 'false');
            localStorage.setItem('emuBro.enableNetworkScan', importDraft.enableNetworkScan ? 'true' : 'false');
            localStorage.setItem('emuBro.launcherImportSteam', importDraft.launcherStores.steam ? 'true' : 'false');
            localStorage.setItem('emuBro.launcherImportEpic', importDraft.launcherStores.epic ? 'true' : 'false');
            localStorage.setItem('emuBro.launcherImportGog', importDraft.launcherStores.gog ? 'true' : 'false');
            localStorage.setItem('emuBro.launcherImportMode', importDraft.launcherDiscoveryMode || 'filesystem');
            savePlatformGamepadBindingsMap(platformGamepadDraft, localStorage);

            if (typeof saveSuggestionSettings === 'function') {
                saveSuggestionSettings(llmDraft);
            }

            try {
                const relaySyncResult = await emubro.invoke('suggestions:relay:sync-host-settings', {
                    provider: llmDraft.provider,
                    models: llmDraft.models,
                    baseUrls: llmDraft.baseUrls,
                    apiKeys: llmDraft.apiKeys,
                    relay: {
                        enabled: !!llmDraft.relay?.enabled,
                        port: normalizeRelayPort(llmDraft.relay?.port, 42141),
                        authToken: String(llmDraft.relay?.authToken || '').trim(),
                        accessMode: normalizeRelayAccessMode(llmDraft.relay?.accessMode),
                        whitelist: normalizeRelayAddressList(llmDraft.relay?.whitelist),
                        blacklist: normalizeRelayAddressList(llmDraft.relay?.blacklist)
                    }
                });
                if (relaySyncResult?.success) {
                    onRelaySyncResult?.(relaySyncResult);
                }
            } catch (_error) {}

            const activeLibrarySection = normalizeLibrarySection(generalDraft.defaultSection || 'all');
            setActiveLibrarySectionState(activeLibrarySection);
            setActiveViewButton(generalDraft.defaultView || 'cover');
            if (isLibraryTopSection()) {
                await setActiveLibrarySection(activeLibrarySection);
            }

            closeModal();
            addFooterNotification('Settings saved.', 'success');
        } catch (error) {
            alert(error?.message || 'Failed to save settings.');
        }
    });
}
