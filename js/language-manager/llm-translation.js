export const LLM_TRANSLATION_MODE_ONE_BY_ONE = 'one-by-one';
export const LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON = 'all-in-one-json';

export function normalizeLlmTranslationMode(mode, fallback = LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON) {
    const value = String(mode || '').trim().toLowerCase();
    if (value === LLM_TRANSLATION_MODE_ONE_BY_ONE || value === LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON) {
        return value;
    }
    return fallback;
}

function getLlmTranslationConfig({
    localStorageRef,
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings
}) {
    const settings = loadSuggestionSettings(localStorageRef);
    const provider = normalizeSuggestionProvider(settings?.provider);
    const model = String(settings?.models?.[provider] || '').trim();
    const baseUrl = String(settings?.baseUrls?.[provider] || '').trim();
    const apiKey = String(settings?.apiKeys?.[provider] || '').trim();
    return { provider, model, baseUrl, apiKey, ...getSuggestionLlmRoutingSettings(settings) };
}

function getTranslationCandidates({
    currentLangData,
    getBaseLanguage,
    flattenObject,
    includeExisting
}) {
    if (!currentLangData) return [];
    const baseFlat = flattenObject(getBaseLanguage().en || {});
    const targetFlat = flattenObject(currentLangData.data?.[currentLangData.code] || {});
    const out = [];

    Object.keys(baseFlat).forEach((key) => {
        const sourceRaw = baseFlat[key];
        if (typeof sourceRaw !== 'string') return;
        const sourceText = String(sourceRaw);
        if (!sourceText.trim()) return;
        if (key.endsWith('.flag')) return;

        const targetText = String(targetFlat[key] ?? '');
        const isMissing = !targetText.trim() || targetText.trim() === sourceText.trim();
        if (!includeExisting && !isMissing) return;

        out.push({ key, sourceText });
    });

    return out;
}

function applyTranslatedEntries({
    currentLangData,
    entries,
    translationMap,
    getNestedValue,
    setNestedValue,
    onSyncAllTranslations
}) {
    if (!currentLangData || !Array.isArray(entries)) return 0;
    if (!currentLangData.data[currentLangData.code]) {
        currentLangData.data[currentLangData.code] = {};
    }

    let changed = 0;
    entries.forEach((entry) => {
        const key = String(entry?.key || '').trim();
        if (!key) return;
        const sourceText = String(entry?.sourceText || '');
        const translatedRaw = translationMap ? translationMap[key] : '';
        if (typeof translatedRaw !== 'string') return;
        const nextValue = String(translatedRaw || sourceText);
        const prevValue = String(getNestedValue(currentLangData.data[currentLangData.code], key) || '');
        if (prevValue === nextValue) return;
        setNestedValue(currentLangData.data[currentLangData.code], key, nextValue);
        changed += 1;
    });

    onSyncAllTranslations?.(currentLangData.code, currentLangData.data[currentLangData.code]);
    return changed;
}

export async function translateMissingKeysWithLlm({
    buttonEl,
    currentLangData,
    emubro,
    i18nRef,
    localStorageRef,
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings,
    getBaseLanguage,
    flattenObject,
    getNestedValue,
    setNestedValue,
    onRenderEditorKeys,
    onUpdateUILanguage,
    onSetStatus,
    onSyncAllTranslations,
    getTranslationMode,
    shouldRetranslateExistingTranslations,
    getTranslationStyleHint
}) {
    if (!currentLangData) return;
    if (!emubro || typeof emubro.invoke !== 'function') {
        onSetStatus(i18nRef.t('language.translateLlmNoApi'), 'error');
        return;
    }

    const {
        provider,
        model,
        baseUrl,
        apiKey,
        llmMode,
        relayHostUrl,
        relayAuthToken,
        relayPort
    } = getLlmTranslationConfig({
        localStorageRef,
        loadSuggestionSettings,
        normalizeSuggestionProvider,
        getSuggestionLlmRoutingSettings
    });

    if (llmMode === 'client' && !relayHostUrl) {
        onSetStatus('Set a relay host URL first in Settings -> AI / LLM.', 'error');
        return;
    }
    if (llmMode !== 'client' && !model) {
        onSetStatus(i18nRef.t('language.translateLlmNeedModel'), 'error');
        return;
    }
    if (llmMode !== 'client' && !baseUrl) {
        onSetStatus(i18nRef.t('language.translateLlmNeedBaseUrl'), 'error');
        return;
    }
    if (llmMode !== 'client' && (provider === 'openai' || provider === 'gemini') && !apiKey) {
        onSetStatus(i18nRef.t('language.translateLlmNeedApiKey'), 'error');
        return;
    }

    const retranslateExisting = !!shouldRetranslateExistingTranslations();
    const candidates = getTranslationCandidates({
        currentLangData,
        getBaseLanguage,
        flattenObject,
        includeExisting: retranslateExisting
    });
    if (!candidates.length) {
        onSetStatus(
            i18nRef.t(retranslateExisting ? 'language.translateLlmNothingEligible' : 'language.translateLlmNothingMissing'),
            'success'
        );
        return;
    }

    const targetName = String(currentLangData?.data?.[currentLangData.code]?.language?.name || currentLangData.code).trim();
    const total = candidates.length;
    let translatedCount = 0;
    const translationMode = getTranslationMode();
    const translationStyleHint = getTranslationStyleHint();
    const progressKey = retranslateExisting ? 'language.translateLlmProgressGeneric' : 'language.translateLlmProgress';
    const progressAllInOneKey = retranslateExisting ? 'language.translateLlmProgressAllInOneGeneric' : 'language.translateLlmProgressAllInOne';

    if (buttonEl) buttonEl.disabled = true;
    try {
        if (translationMode === LLM_TRANSLATION_MODE_ALL_IN_ONE_JSON) {
            onSetStatus(i18nRef.t(progressAllInOneKey, { total }), 'info');
            const response = await emubro.invoke('suggestions:translate-locale-missing', {
                provider,
                mode: translationMode,
                model,
                baseUrl,
                apiKey,
                llmMode,
                relayHostUrl,
                relayAuthToken,
                relayPort,
                sourceLanguageCode: 'en',
                targetLanguageCode: currentLangData.code,
                targetLanguageName: targetName,
                styleHint: translationStyleHint,
                retranslateExisting,
                sourceLocaleObject: getBaseLanguage().en || {},
                targetLocaleObject: currentLangData.data?.[currentLangData.code] || {},
                entries: candidates.map((entry) => ({ key: entry.key, text: entry.sourceText }))
            });

            if (!response?.success || !response?.translations || typeof response.translations !== 'object') {
                throw new Error(response?.message || i18nRef.t('language.translateLlmInvalidResponse'));
            }

            translatedCount += applyTranslatedEntries({
                currentLangData,
                entries: candidates,
                translationMap: response.translations,
                getNestedValue,
                setNestedValue,
                onSyncAllTranslations
            });
        } else {
            for (let idx = 0; idx < total; idx += 1) {
                const entry = candidates[idx];
                const done = idx + 1;
                onSetStatus(i18nRef.t(progressKey, { done, total }), 'info');

                // eslint-disable-next-line no-await-in-loop
                const response = await emubro.invoke('suggestions:translate-locale-missing', {
                    provider,
                    mode: translationMode,
                    model,
                    baseUrl,
                    apiKey,
                    llmMode,
                    relayHostUrl,
                    relayAuthToken,
                    relayPort,
                    sourceLanguageCode: 'en',
                    targetLanguageCode: currentLangData.code,
                    targetLanguageName: targetName,
                    styleHint: translationStyleHint,
                    retranslateExisting,
                    entries: [{ key: entry.key, text: entry.sourceText }]
                });

                if (!response?.success || !response?.translations || typeof response.translations !== 'object') {
                    throw new Error(response?.message || i18nRef.t('language.translateLlmInvalidResponse'));
                }

                translatedCount += applyTranslatedEntries({
                    currentLangData,
                    entries: [entry],
                    translationMap: response.translations,
                    getNestedValue,
                    setNestedValue,
                    onSyncAllTranslations
                });
            }
        }

        onRenderEditorKeys?.(String(document.getElementById('lang-search-keys')?.value || ''));
        if (i18nRef.getLanguage() === currentLangData.code) {
            onUpdateUILanguage?.();
        }

        onSetStatus(i18nRef.t('language.translateLlmDone', { count: translatedCount }), 'success');
    } catch (error) {
        console.error('translateMissingKeysWithLlm failed:', error);
        onSetStatus(i18nRef.t('language.translateLlmFailed', { message: String(error?.message || error) }), 'error');
    } finally {
        if (buttonEl) buttonEl.disabled = false;
    }
}
