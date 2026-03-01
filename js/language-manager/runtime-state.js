export function createRuntimeStateController({
    invalidateFlagCache,
    getTranslationsSnapshot,
    setTranslationsSnapshot,
    i18nRef,
    populateLanguageSelector,
    updateUILanguage,
    windowRef = window
} = {}) {
    let baseLanguageCache = null;

    function getBaseLanguage() {
        if (baseLanguageCache) return baseLanguageCache;

        const translations = getTranslationsSnapshot?.();
        if (translations && translations.en) {
            baseLanguageCache = { en: translations.en };
            return baseLanguageCache;
        }

        baseLanguageCache = { en: {} };
        return baseLanguageCache;
    }

    async function refreshLanguageRuntimeState() {
        baseLanguageCache = null;
        invalidateFlagCache?.();

        try {
            if (windowRef?.emubro && typeof windowRef.emubro.getAllTranslations === 'function') {
                const nextTranslations = await windowRef.emubro.getAllTranslations();
                setTranslationsSnapshot?.(nextTranslations);
            }
        } catch (error) {
            console.error('Failed to refresh translation cache:', error);
        }

        try {
            const translations = getTranslationsSnapshot?.();
            if (typeof i18nRef?.loadTranslations === 'function' && translations) {
                i18nRef.loadTranslations(translations);
            }
        } catch (_error) {}

        try {
            populateLanguageSelector?.();
        } catch (_error) {}

        try {
            updateUILanguage?.();
        } catch (_error) {}
    }

    return {
        getBaseLanguage,
        refreshLanguageRuntimeState
    };
}
