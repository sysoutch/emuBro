function resolveFunctionOption(options, key, fallback) {
    return typeof options?.[key] === 'function' ? options[key] : fallback;
}

export function resolveLibrarySettingsModalOptions(options = {}) {
    return {
        emubro: options.emubro,
        getLibraryPathSettings: resolveFunctionOption(
            options,
            'getLibraryPathSettings',
            async () => ({ scanFolders: [], gameFolders: [], emulatorFolders: [] })
        ),
        saveLibraryPathSettings: resolveFunctionOption(options, 'saveLibraryPathSettings', async () => {}),
        normalizePathList: resolveFunctionOption(
            options,
            'normalizePathList',
            (values = []) => Array.from(
                new Set(
                    (Array.isArray(values) ? values : [])
                        .map((value) => String(value || '').trim())
                        .filter(Boolean)
                )
            )
        ),
        normalizeLibrarySection: resolveFunctionOption(
            options,
            'normalizeLibrarySection',
            (section) => String(section || 'all').trim().toLowerCase() || 'all'
        ),
        getActiveLibrarySection: resolveFunctionOption(options, 'getActiveLibrarySection', () => 'all'),
        setActiveLibrarySectionState: resolveFunctionOption(options, 'setActiveLibrarySectionState', () => {}),
        isLibraryTopSection: resolveFunctionOption(options, 'isLibraryTopSection', () => true),
        confirmDisableLlmHelpersFlow: resolveFunctionOption(options, 'confirmDisableLlmHelpersFlow', () => true),
        setLlmHelpersEnabled: resolveFunctionOption(options, 'setLlmHelpersEnabled', () => {}),
        setLlmAllowUnknownTagsEnabled: resolveFunctionOption(options, 'setLlmAllowUnknownTagsEnabled', () => {}),
        openThemeManager: resolveFunctionOption(options, 'openThemeManager', () => {}),
        openLanguageManager: resolveFunctionOption(options, 'openLanguageManager', () => {}),
        openProfileModal: resolveFunctionOption(options, 'openProfileModal', async () => {}),
        runBrowseSearch: resolveFunctionOption(options, 'runBrowseSearch', async () => {}),
        getBrowseScopeSelection: resolveFunctionOption(options, 'getBrowseScopeSelection', () => 'both'),
        openFooterPanel: resolveFunctionOption(options, 'openFooterPanel', () => {}),
        addFooterNotification: resolveFunctionOption(options, 'addFooterNotification', () => {}),
        setActiveViewButton: resolveFunctionOption(options, 'setActiveViewButton', () => {}),
        setActiveLibrarySection: resolveFunctionOption(options, 'setActiveLibrarySection', async () => {}),
        loadSuggestionSettings: resolveFunctionOption(options, 'loadSuggestionSettings', () => ({})),
        saveSuggestionSettings: resolveFunctionOption(options, 'saveSuggestionSettings', null),
        refreshGamesAfterImport: resolveFunctionOption(options, 'refreshGamesAfterImport', async () => {}),
        initialTab: String(options.initialTab || '').trim().toLowerCase(),
        LLM_HELPERS_ENABLED_KEY: String(options.llmHelpersEnabledKey || 'emuBro.llmHelpersEnabled'),
        LLM_ALLOW_UNKNOWN_TAGS_KEY: String(options.llmAllowUnknownTagsKey || 'emuBro.llmAllowUnknownTags'),
        SUGGESTED_SECTION_KEY: String(options.suggestedSectionKey || 'suggested')
    };
}
