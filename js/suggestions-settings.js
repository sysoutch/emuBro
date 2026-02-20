const SUGGESTIONS_SETTINGS_KEY = 'emuBro.suggestionsSettings.v1';

function getStorage(localStorageRef) {
    if (localStorageRef) return localStorageRef;
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    return null;
}

export function normalizeSuggestionProvider(provider) {
    const value = String(provider || '').trim().toLowerCase();
    if (value === 'openai' || value === 'gemini') return value;
    return 'ollama';
}

export function normalizeSuggestionScope(scope) {
    const value = String(scope || '').trim().toLowerCase();
    if (value === 'library-only' || value === 'library-plus-missing') return value;
    return 'library-plus-missing';
}

export function getDefaultSuggestionPromptTemplate() {
    return [
        "You are emuBro's game recommendation assistant.",
        "Mode: {{mode}}",
        "User mood/preferences: {{query}}",
        "Platform constraint: {{platformConstraint}}",
        "",
        "Return valid JSON only with this exact shape:",
        "{",
        '  "summary": "short explanation",',
        '  "libraryMatches": [',
        '    {"name":"", "platform":"", "reason":""}',
        "  ],",
        '  "missingSuggestions": [',
        '    {"name":"", "platform":"", "reason":""}',
        "  ]",
        "}",
        "",
        "Rules:",
        "- Provide up to {{limit}} items in libraryMatches.",
        '- Provide up to {{limit}} items in missingSuggestions only when mode is "library-plus-missing".',
        '- If mode is "library-only", missingSuggestions must be an empty array.',
        "- For libraryMatches, prefer exact names from the supplied library list.",
        "- Keep reasons concise (under 20 words).",
        "",
        "Library games JSON:",
        "{{libraryJson}}"
    ].join('\n');
}

export function getDefaultSuggestionSettings() {
    return {
        provider: 'ollama',
        scope: 'library-plus-missing',
        query: '',
        promptTemplate: getDefaultSuggestionPromptTemplate(),
        selectedPlatformOnly: false,
        models: {
            ollama: 'llama3.1',
            openai: 'gpt-4o-mini',
            gemini: 'gemini-1.5-flash'
        },
        baseUrls: {
            ollama: 'http://127.0.0.1:11434',
            openai: 'https://api.openai.com/v1',
            gemini: 'https://generativelanguage.googleapis.com/v1beta'
        },
        apiKeys: {
            openai: '',
            gemini: ''
        }
    };
}

export function loadSuggestionSettings(localStorageRef, storageKey = SUGGESTIONS_SETTINGS_KEY) {
    const defaults = getDefaultSuggestionSettings();
    const storage = getStorage(localStorageRef);
    try {
        const raw = storage?.getItem(storageKey);
        if (!raw) return defaults;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return defaults;
        const provider = normalizeSuggestionProvider(parsed.provider);
        return {
            provider,
            scope: normalizeSuggestionScope(parsed.scope),
            query: String(parsed.query || ''),
            promptTemplate: String(parsed.promptTemplate || defaults.promptTemplate || '').trim() || defaults.promptTemplate,
            selectedPlatformOnly: !!parsed.selectedPlatformOnly,
            models: {
                ...defaults.models,
                ...(parsed.models && typeof parsed.models === 'object' ? parsed.models : {})
            },
            baseUrls: {
                ...defaults.baseUrls,
                ...(parsed.baseUrls && typeof parsed.baseUrls === 'object' ? parsed.baseUrls : {})
            },
            apiKeys: {
                ...defaults.apiKeys,
                ...(parsed.apiKeys && typeof parsed.apiKeys === 'object' ? parsed.apiKeys : {})
            }
        };
    } catch (_error) {
        return defaults;
    }
}

export function saveSuggestionSettings(settings, localStorageRef, storageKey = SUGGESTIONS_SETTINGS_KEY) {
    const defaults = getDefaultSuggestionSettings();
    const provider = normalizeSuggestionProvider(settings?.provider);
    const payload = {
        provider,
        scope: normalizeSuggestionScope(settings?.scope),
        query: String(settings?.query || ''),
        promptTemplate: String(settings?.promptTemplate || defaults.promptTemplate || '').trim() || defaults.promptTemplate,
        selectedPlatformOnly: !!settings?.selectedPlatformOnly,
        models: {
            ...defaults.models,
            ...(settings?.models && typeof settings.models === 'object' ? settings.models : {})
        },
        baseUrls: {
            ...defaults.baseUrls,
            ...(settings?.baseUrls && typeof settings.baseUrls === 'object' ? settings.baseUrls : {})
        },
        apiKeys: {
            ...defaults.apiKeys,
            ...(settings?.apiKeys && typeof settings.apiKeys === 'object' ? settings.apiKeys : {})
        }
    };
    const storage = getStorage(localStorageRef);
    try {
        storage?.setItem(storageKey, JSON.stringify(payload));
    } catch (_error) {}
    return payload;
}
