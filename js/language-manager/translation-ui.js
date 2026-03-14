import {
    saveTranslationStylePreset as saveTranslationStylePresetControl,
    deleteTranslationStylePreset as deleteTranslationStylePresetControl
} from './translation-controls.js';

export function setLanguageManagerTranslateStatus({
    documentRef = document,
    message = '',
    level = 'info'
} = {}) {
    const statusEl = documentRef.getElementById('lang-translate-llm-status');
    if (!statusEl) return;
    statusEl.textContent = String(message || '');
    statusEl.classList.remove('is-success', 'is-error');
    if (level === 'success') statusEl.classList.add('is-success');
    if (level === 'error') statusEl.classList.add('is-error');
}

export function saveTranslationStylePresetWithStatus({
    documentRef = document,
    storage = localStorage,
    i18nRef,
    onSetStatus
} = {}) {
    const result = saveTranslationStylePresetControl({
        translationStyleHintInput: documentRef.getElementById('lang-translate-llm-style-hint'),
        translationStyleHintPresets: documentRef.getElementById('lang-translate-llm-style-hint-presets'),
        storage
    });

    if (!result.ok) {
        const message = result.reason === 'empty'
            ? i18nRef.t('language.translateStylePresetEmpty', 'Enter a translation style preset first.')
            : i18nRef.t('language.translateStylePresetSaveFailed', 'Could not save the translation style preset.');
        onSetStatus?.(message, 'error');
        return result;
    }

    const message = result.reason === 'existing'
        ? i18nRef.t('language.translateStylePresetAlreadySaved', 'Translation style preset already saved.')
        : i18nRef.t('language.translateStylePresetSaved', 'Translation style preset saved.');
    onSetStatus?.(message, 'success');
    return result;
}

export function deleteTranslationStylePresetWithStatus({
    documentRef = document,
    storage = localStorage,
    i18nRef,
    onSetStatus
} = {}) {
    const result = deleteTranslationStylePresetControl({
        translationStyleHintInput: documentRef.getElementById('lang-translate-llm-style-hint'),
        translationStyleHintPresets: documentRef.getElementById('lang-translate-llm-style-hint-presets'),
        storage
    });

    if (!result.ok) {
        const message = result.reason === 'empty'
            ? i18nRef.t('language.translateStylePresetEmpty', 'Enter a translation style preset first.')
            : i18nRef.t('language.translateStylePresetMissing', 'This translation style preset is not saved.');
        onSetStatus?.(message, 'error');
        return result;
    }

    onSetStatus?.(
        i18nRef.t('language.translateStylePresetDeleted', 'Translation style preset removed.'),
        'success'
    );
    return result;
}

export async function translatePromptTemplateForCurrentLanguage({
    buttonEl,
    currentLangData,
    documentRef = document,
    emubro,
    i18nRef,
    localStorageRef = localStorage,
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings,
    getTranslationPromptTemplate,
    onSetStatus
} = {}) {
    if (!currentLangData) return;
    if (!emubro || typeof emubro.invoke !== 'function') {
        onSetStatus?.(i18nRef.t('language.translateLlmNoApi'), 'error');
        return;
    }

    const promptInput = documentRef.getElementById('lang-translate-llm-prompt-template');
    const sourcePrompt = String(promptInput?.value || '').trim();
    if (!sourcePrompt) {
        onSetStatus?.(i18nRef.t('language.translatePromptEmpty', 'Translation prompt is empty.'), 'error');
        return;
    }

    const suggestionSettings = loadSuggestionSettings(localStorageRef);
    const {
        llmMode,
        relayHostUrl,
        relayAuthToken,
        relayPort
    } = getSuggestionLlmRoutingSettings(suggestionSettings);

    const routingProvider = normalizeSuggestionProvider(suggestionSettings?.provider);
    const activeModel = String(suggestionSettings?.models?.[routingProvider] || '').trim();
    const activeBaseUrl = String(suggestionSettings?.baseUrls?.[routingProvider] || '').trim();
    const activeApiKey = String(suggestionSettings?.apiKeys?.[routingProvider] || '').trim();

    if (llmMode === 'client' && !relayHostUrl) {
        onSetStatus?.('Set a relay host URL first in Settings -> AI / LLM.', 'error');
        return;
    }
    if (llmMode !== 'client' && !activeModel) {
        onSetStatus?.(i18nRef.t('language.translateLlmNeedModel'), 'error');
        return;
    }
    if (llmMode !== 'client' && !activeBaseUrl) {
        onSetStatus?.(i18nRef.t('language.translateLlmNeedBaseUrl'), 'error');
        return;
    }
    if (llmMode !== 'client' && (routingProvider === 'openai' || routingProvider === 'gemini') && !activeApiKey) {
        onSetStatus?.(i18nRef.t('language.translateLlmNeedApiKey'), 'error');
        return;
    }

    if (buttonEl) buttonEl.disabled = true;
    try {
        onSetStatus?.(i18nRef.t('language.translatePromptProgress', 'Translating prompt template...'));
        const response = await emubro.invoke('suggestions:translate-locale-missing', {
            provider: routingProvider,
            mode: 'one-by-one',
            model: activeModel,
            baseUrl: activeBaseUrl,
            apiKey: activeApiKey,
            llmMode,
            relayHostUrl,
            relayAuthToken,
            relayPort,
            sourceLanguageCode: 'en',
            targetLanguageCode: currentLangData.code,
            targetLanguageName: String(currentLangData?.data?.[currentLangData.code]?.language?.name || currentLangData.code).trim(),
            styleHint: 'This is an internal LLM prompt template. Translate the natural-language instructions, but preserve all placeholder tokens exactly, including {{sourceLanguageCode}}, {{targetLanguageCode}}, {{targetLanguageName}}, {{styleHintBlock}}, {{entriesJson}}, {{sourceLocaleContextBlock}}, {{targetLocaleContextBlock}}, {{styleHint}}, {{sourceLocaleJson}}, {{targetLocaleJson}}.',
            promptTemplate: getTranslationPromptTemplate(),
            includeExistingTranslationsInPrompt: false,
            retranslateExisting: true,
            sourceLocaleObject: {},
            targetLocaleObject: {},
            entries: [{ key: '__prompt_template__', text: sourcePrompt }]
        });

        const translatedPrompt = String(response?.translations?.__prompt_template__ || '').trim();
        if (!response?.success || !translatedPrompt) {
            throw new Error(response?.message || i18nRef.t('language.translateLlmInvalidResponse'));
        }

        promptInput.value = translatedPrompt;
        promptInput.dispatchEvent(new Event('input', { bubbles: true }));
        onSetStatus?.(
            i18nRef.t('language.translatePromptDone', 'Translation prompt translated for the current language.'),
            'success'
        );
    } catch (error) {
        console.error('translatePromptTemplateForCurrentLanguage failed:', error);
        onSetStatus?.(
            i18nRef.t('language.translateLlmFailed', { message: String(error?.message || error) }),
            'error'
        );
    } finally {
        if (buttonEl) buttonEl.disabled = false;
    }
}
