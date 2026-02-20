import { renderSuggestionResults as renderSuggestionResultsView } from '../suggested-results-view';
import {
    normalizeSuggestionProvider,
    normalizeSuggestionScope,
    getDefaultSuggestionPromptTemplate,
    loadSuggestionSettings,
    saveSuggestionSettings
} from '../suggestions-settings';
import {
    buildSuggestionLibraryPayloadFromRows,
    mapSuggestionLibraryMatchesToGames
} from '../suggestions-core';

export function createSuggestionsPanelController(options = {}) {
    const emubro = options.emubro;
    const getGames = typeof options.getGames === 'function' ? options.getGames : () => [];
    const setSuggestedCoverGames = typeof options.setSuggestedCoverGames === 'function' ? options.setSuggestedCoverGames : () => {};
    const renderGames = typeof options.renderGames === 'function' ? options.renderGames : () => {};
    const getSectionFilteredGames = typeof options.getSectionFilteredGames === 'function' ? options.getSectionFilteredGames : () => [];
    const getActiveTopSection = typeof options.getActiveTopSection === 'function' ? options.getActiveTopSection : () => 'library';
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function' ? options.getActiveLibrarySection : () => 'all';
    const isLlmHelpersEnabled = typeof options.isLlmHelpersEnabled === 'function' ? options.isLlmHelpersEnabled : () => true;
    const suggestedSectionKey = String(options.suggestedSectionKey || 'suggested');
    const escapeHtml = typeof options.escapeHtml === 'function'
        ? options.escapeHtml
        : (value) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

    let suggestionsRequestInFlight = false;
    let lastSuggestionsResult = null;
    let suggestedCoverGames = [];
    const ollamaModelsCacheByUrl = new Map();

    if (!emubro) {
        return {
            updateSuggestedPanelVisibility: () => {}
        };
    }

async function fetchOllamaModels(baseUrl, options = {}) {
    const normalizedBaseUrl = String(baseUrl || '').trim();
    if (!normalizedBaseUrl) return { success: false, models: [], message: 'Set an Ollama API URL first.' };

    const cacheKey = normalizedBaseUrl.toLowerCase();
    if (!options.force && ollamaModelsCacheByUrl.has(cacheKey)) {
        return {
            success: true,
            baseUrl: normalizedBaseUrl,
            models: [...(ollamaModelsCacheByUrl.get(cacheKey) || [])]
        };
    }

    const result = await emubro.invoke('suggestions:list-ollama-models', { baseUrl: normalizedBaseUrl });
    if (!result?.success) {
        return {
            success: false,
            baseUrl: normalizedBaseUrl,
            models: [],
            message: String(result?.message || 'Failed to fetch Ollama models.')
        };
    }

    const models = (Array.isArray(result.models) ? result.models : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean);

    ollamaModelsCacheByUrl.set(cacheKey, models);
    return {
        success: true,
        baseUrl: normalizedBaseUrl,
        models
    };
}

function buildSuggestionLibraryPayload(query = '', options = {}) {
    return buildSuggestionLibraryPayloadFromRows(getGames(), query, options);
}

function applySuggestionSearchTerm(rawValue) {
    const term = String(rawValue || '').trim();
    if (!term) return;
    const searchInput = document.querySelector('.search-bar input');
    if (!searchInput) return;
    searchInput.value = term;
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
}

function getSelectedPlatformContext() {
    const platformFilter = document.getElementById('platform-filter');
    if (!platformFilter) return { value: '', label: '' };
    const value = String(platformFilter.value || '').trim().toLowerCase();
    if (!value || value === 'all') return { value: '', label: '' };
    const selectedOption = platformFilter.options?.[platformFilter.selectedIndex];
    const label = String(selectedOption?.textContent || value).trim();
    return { value, label };
}

async function runSuggestionsFromPanel(panel) {
    if (!panel || suggestionsRequestInFlight) return;

    const providerSelect = panel.querySelector('[data-suggest-provider]');
    const scopeSelect = panel.querySelector('[data-suggest-scope]');
    const modelSelect = panel.querySelector('[data-suggest-model-select]');
    const modelInput = panel.querySelector('[data-suggest-model]');
    const baseUrlInput = panel.querySelector('[data-suggest-base-url]');
    const apiKeyInput = panel.querySelector('[data-suggest-api-key]');
    const promptInput = panel.querySelector('[data-suggest-prompt]');
    const platformOnlyToggle = panel.querySelector('[data-suggest-platform-only]');
    const status = panel.querySelector('[data-suggest-status]');
    const runBtn = panel.querySelector('[data-suggest-run]');

    if (!providerSelect || !scopeSelect || !modelInput || !baseUrlInput || !apiKeyInput || !promptInput || !status || !runBtn || !platformOnlyToggle) return;

    const provider = normalizeSuggestionProvider(providerSelect.value);
    const selectedModel = provider === 'ollama'
        ? String(modelSelect?.value || modelInput.value || '').trim()
        : String(modelInput.value || '').trim();
    const platformContext = getSelectedPlatformContext();
    const nextSettings = loadSuggestionSettings();
    nextSettings.provider = provider;
    nextSettings.scope = normalizeSuggestionScope(scopeSelect.value);
    nextSettings.query = String(panel.querySelector('[data-suggest-query]')?.value || '').trim();
    nextSettings.promptTemplate = String(promptInput.value || '').trim() || getDefaultSuggestionPromptTemplate();
    nextSettings.selectedPlatformOnly = !!platformOnlyToggle.checked;
    nextSettings.models = {
        ...nextSettings.models,
        [provider]: selectedModel || nextSettings.models[provider]
    };
    nextSettings.baseUrls = {
        ...nextSettings.baseUrls,
        [provider]: String(baseUrlInput.value || '').trim() || nextSettings.baseUrls[provider]
    };
    if (provider !== 'ollama') {
        nextSettings.apiKeys = {
            ...nextSettings.apiKeys,
            [provider]: String(apiKeyInput.value || '').trim()
        };
    }
    saveSuggestionSettings(nextSettings);

    const model = String(nextSettings.models?.[provider] || '').trim();
    const baseUrl = String(nextSettings.baseUrls?.[provider] || '').trim();
    const apiKey = String(nextSettings.apiKeys?.[provider] || '').trim();
    const libraryGames = buildSuggestionLibraryPayload(nextSettings.query, {
        selectedPlatformOnly: nextSettings.selectedPlatformOnly,
        selectedPlatform: platformContext.value
    });

    if (!model) {
        status.textContent = 'Set a model first.';
        return;
    }
    if (!baseUrl) {
        status.textContent = 'Set a provider URL first.';
        return;
    }
    if ((provider === 'openai' || provider === 'gemini') && !apiKey) {
        status.textContent = 'API key is required for this provider.';
        return;
    }
    if (nextSettings.selectedPlatformOnly && !platformContext.value) {
        status.textContent = 'Choose a platform in the top filter first, then run again.';
        return;
    }
    if (!libraryGames.length) {
        status.textContent = nextSettings.selectedPlatformOnly
            ? 'No games found for the selected platform.'
            : 'No games found in your library yet.';
        return;
    }

    suggestionsRequestInFlight = true;
    runBtn.disabled = true;
    status.textContent = 'Generating suggestions...';

    try {
        const response = await emubro.invoke('suggestions:recommend-games', {
            provider,
            mode: nextSettings.scope,
            query: nextSettings.query,
            promptTemplate: nextSettings.promptTemplate,
            model,
            baseUrl,
            apiKey,
            limit: 8,
            libraryGames,
            selectedPlatformOnly: nextSettings.selectedPlatformOnly,
            selectedPlatform: platformContext.value
        });

        if (!response?.success) {
            status.textContent = String(response?.message || 'Suggestion request failed.');
            return;
        }

        lastSuggestionsResult = response;
        suggestedCoverGames = mapSuggestionLibraryMatchesToGames(response, getGames(), {
            selectedPlatform: nextSettings.selectedPlatformOnly ? platformContext.value : ''
        });
        setSuggestedCoverGames(suggestedCoverGames);
        status.textContent = String(response?.summary || 'Suggestions ready.');
        renderSuggestionResultsView(panel, response, {
            escapeHtml,
            onSearch: applySuggestionSearchTerm
        });
        if (getActiveTopSection() === 'library' && getActiveLibrarySection() === suggestedSectionKey) {
            renderGames(getSectionFilteredGames());
        }
    } catch (error) {
        status.textContent = String(error?.message || error || 'Suggestion request failed.');
    } finally {
        suggestionsRequestInFlight = false;
        runBtn.disabled = false;
    }
}

function renderSuggestedPanel() {
    const panel = document.getElementById('suggested-panel');
    if (!panel) return;

    const settings = loadSuggestionSettings();
    const provider = normalizeSuggestionProvider(settings.provider);
    const model = String(settings.models?.[provider] || '');
    const baseUrl = String(settings.baseUrls?.[provider] || '');
    const apiKey = String(settings.apiKeys?.[provider] || '');
    const promptTemplate = String(settings.promptTemplate || getDefaultSuggestionPromptTemplate());

    panel.classList.remove('is-hidden');
    panel.innerHTML = `
        <h3 class="suggested-panel-title">Suggested</h3>
        <p class="suggested-panel-subtitle">Use an LLM provider to recommend games from your library or titles you do not have yet.</p>
        <div class="suggested-panel-form">
            <div class="form-group">
                <label for="suggest-provider">Provider</label>
                <select id="suggest-provider" data-suggest-provider>
                    <option value="ollama"${provider === 'ollama' ? ' selected' : ''}>Ollama</option>
                    <option value="openai"${provider === 'openai' ? ' selected' : ''}>ChatGPT (OpenAI)</option>
                    <option value="gemini"${provider === 'gemini' ? ' selected' : ''}>Gemini</option>
                </select>
            </div>
            <div class="form-group">
                <label for="suggest-scope">Mode</label>
                <select id="suggest-scope" data-suggest-scope>
                    <option value="library-only"${normalizeSuggestionScope(settings.scope) === 'library-only' ? ' selected' : ''}>Suggest from my library only</option>
                    <option value="library-plus-missing"${normalizeSuggestionScope(settings.scope) === 'library-plus-missing' ? ' selected' : ''}>Suggest from library + missing titles</option>
                </select>
            </div>
            <div class="form-group">
                <label class="suggested-checkbox-label" for="suggest-platform-only">
                    <input id="suggest-platform-only" data-suggest-platform-only type="checkbox"${settings.selectedPlatformOnly ? ' checked' : ''} />
                    <span>From Selected Platform only</span>
                </label>
                <small class="suggested-panel-hint">Uses the platform selected in the top filter.</small>
            </div>
            <div class="form-group">
                <label for="suggest-model">Model</label>
                <div class="suggested-model-row" data-suggest-model-select-wrap>
                    <select id="suggest-model-select" data-suggest-model-select>
                        <option value="${escapeHtml(model || '')}" selected>${escapeHtml(model || 'Select model...')}</option>
                    </select>
                    <button class="action-btn small" type="button" data-suggest-refresh-models>Refresh</button>
                </div>
                <input id="suggest-model" data-suggest-model type="text" value="${escapeHtml(model)}" data-suggest-model-input />
            </div>
            <div class="form-group">
                <label for="suggest-base-url">API URL</label>
                <input id="suggest-base-url" data-suggest-base-url type="text" value="${escapeHtml(baseUrl)}" />
            </div>
            <div class="form-group" data-suggest-api-key-wrap>
                <label for="suggest-api-key">API Key</label>
                <input id="suggest-api-key" data-suggest-api-key type="password" value="${escapeHtml(apiKey)}" autocomplete="off" />
            </div>
            <div class="form-group">
                <label for="suggest-query">Mood / Preferences</label>
                <input id="suggest-query" data-suggest-query type="text" value="${escapeHtml(settings.query || '')}" placeholder="Example: short platform games for relaxed evening sessions" />
            </div>
            <div class="form-group suggested-panel-form-group--wide">
                <label for="suggest-prompt">Prompt Template</label>
                <textarea id="suggest-prompt" data-suggest-prompt rows="9">${escapeHtml(promptTemplate)}</textarea>
                <small class="suggested-panel-hint">Placeholders: {{mode}}, {{query}}, {{limit}}, {{platformConstraint}}, {{selectedPlatform}}, {{libraryJson}}</small>
            </div>
            <div class="suggested-panel-actions">
                <button class="action-btn launch-btn" type="button" data-suggest-run>Generate Suggestions</button>
            </div>
        </div>
        <p class="suggested-panel-status" data-suggest-status></p>
        <div class="suggested-panel-results" data-suggest-results></div>
    `;

    const providerSelect = panel.querySelector('[data-suggest-provider]');
    const modelSelect = panel.querySelector('[data-suggest-model-select]');
    const modelSelectWrap = panel.querySelector('[data-suggest-model-select-wrap]');
    const refreshModelsBtn = panel.querySelector('[data-suggest-refresh-models]');
    const modelInput = panel.querySelector('[data-suggest-model]');
    const modelInputWrap = panel.querySelector('[data-suggest-model-input]');
    const baseUrlInput = panel.querySelector('[data-suggest-base-url]');
    const apiKeyInput = panel.querySelector('[data-suggest-api-key]');
    const apiKeyWrap = panel.querySelector('[data-suggest-api-key-wrap]');
    const queryInput = panel.querySelector('[data-suggest-query]');
    const promptInput = panel.querySelector('[data-suggest-prompt]');
    const scopeSelect = panel.querySelector('[data-suggest-scope]');
    const platformOnlyToggle = panel.querySelector('[data-suggest-platform-only]');
    const status = panel.querySelector('[data-suggest-status]');
    const runBtn = panel.querySelector('[data-suggest-run]');

    const populateOllamaModelSelect = (models = [], currentValue = '') => {
        if (!modelSelect) return;
        const current = String(currentValue || '').trim();
        const deduped = [];
        const seen = new Set();
        (Array.isArray(models) ? models : []).forEach((name) => {
            const value = String(name || '').trim();
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            deduped.push(value);
        });

        if (current && !deduped.some((name) => name.toLowerCase() === current.toLowerCase())) {
            deduped.unshift(current);
        }
        if (deduped.length === 0) {
            deduped.push(current || 'llama3.1');
        }

        modelSelect.innerHTML = deduped
            .map((name) => {
                const selected = current && name.toLowerCase() === current.toLowerCase();
                return `<option value="${escapeHtml(name)}"${selected ? ' selected' : ''}>${escapeHtml(name)}</option>`;
            })
            .join('');

        if (!current) {
            modelSelect.value = deduped[0];
            modelInput.value = deduped[0];
        }
    };

    const refreshOllamaModels = async (force = false) => {
        const currentProvider = normalizeSuggestionProvider(providerSelect.value);
        if (currentProvider !== 'ollama') return;
        const currentModel = String(modelInput.value || '').trim();
        const baseUrl = String(baseUrlInput.value || '').trim();
        if (refreshModelsBtn) refreshModelsBtn.disabled = true;
        if (status) status.textContent = 'Loading Ollama models...';

        try {
            const result = await fetchOllamaModels(baseUrl, { force });
            if (!result?.success) {
                populateOllamaModelSelect([], currentModel || 'llama3.1');
                if (status) status.textContent = String(result?.message || 'Failed to fetch Ollama models.');
                return;
            }

            populateOllamaModelSelect(result.models, currentModel || result.models?.[0] || 'llama3.1');
            if (!modelInput.value && modelSelect?.value) {
                modelInput.value = modelSelect.value;
            }
            if (status) status.textContent = `Loaded ${result.models.length} Ollama model(s).`;
        } catch (error) {
            populateOllamaModelSelect([], currentModel || 'llama3.1');
            if (status) status.textContent = String(error?.message || 'Failed to fetch Ollama models.');
        } finally {
            if (refreshModelsBtn) refreshModelsBtn.disabled = false;
        }
    };

    const syncProviderFields = () => {
        const nextSettings = loadSuggestionSettings();
        const nextProvider = normalizeSuggestionProvider(providerSelect.value);
        providerSelect.value = nextProvider;
        modelInput.value = String(nextSettings.models?.[nextProvider] || '');
        baseUrlInput.value = String(nextSettings.baseUrls?.[nextProvider] || '');
        apiKeyInput.value = String(nextSettings.apiKeys?.[nextProvider] || '');
        apiKeyWrap.style.display = nextProvider === 'ollama' ? 'none' : 'flex';
        if (modelSelectWrap) {
            modelSelectWrap.style.display = nextProvider === 'ollama' ? 'grid' : 'none';
        }
        if (modelInputWrap) {
            modelInputWrap.style.display = nextProvider === 'ollama' ? 'none' : 'block';
        }
        if (nextProvider === 'ollama') {
            refreshOllamaModels(true);
        }
    };

    const persistInputs = () => {
        const current = loadSuggestionSettings();
        const currentProvider = normalizeSuggestionProvider(providerSelect.value);
        current.provider = currentProvider;
        current.scope = normalizeSuggestionScope(scopeSelect.value);
        current.query = String(queryInput.value || '').trim();
        current.promptTemplate = String(promptInput.value || '').trim() || getDefaultSuggestionPromptTemplate();
        current.selectedPlatformOnly = !!platformOnlyToggle?.checked;
        const selectedModel = currentProvider === 'ollama'
            ? String(modelSelect?.value || modelInput.value || '').trim()
            : String(modelInput.value || '').trim();
        current.models = {
            ...current.models,
            [currentProvider]: selectedModel || current.models[currentProvider]
        };
        current.baseUrls = {
            ...current.baseUrls,
            [currentProvider]: String(baseUrlInput.value || '').trim() || current.baseUrls[currentProvider]
        };
        if (currentProvider !== 'ollama') {
            current.apiKeys = {
                ...current.apiKeys,
                [currentProvider]: String(apiKeyInput.value || '').trim()
            };
        }
        saveSuggestionSettings(current);
    };

    if (modelSelect) {
        modelSelect.addEventListener('change', () => {
            modelInput.value = String(modelSelect.value || '').trim();
            persistInputs();
        });
    }

    if (refreshModelsBtn) {
        refreshModelsBtn.addEventListener('click', async () => {
            await refreshOllamaModels(true);
            persistInputs();
        });
    }

    providerSelect.addEventListener('change', () => {
        const current = loadSuggestionSettings();
        current.provider = normalizeSuggestionProvider(providerSelect.value);
        saveSuggestionSettings(current);
        syncProviderFields();
    });

    [scopeSelect, modelInput, baseUrlInput, apiKeyInput, queryInput, promptInput, platformOnlyToggle].forEach((element) => {
        element.addEventListener('change', persistInputs);
        element.addEventListener('blur', persistInputs);
    });

    baseUrlInput.addEventListener('change', async () => {
        if (normalizeSuggestionProvider(providerSelect.value) !== 'ollama') return;
        await refreshOllamaModels(true);
    });

    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            await runSuggestionsFromPanel(panel);
        });
    }

    syncProviderFields();
    if (lastSuggestionsResult) {
        renderSuggestionResultsView(panel, lastSuggestionsResult, {
            escapeHtml,
            onSearch: applySuggestionSearchTerm
        });
        const status = panel.querySelector('[data-suggest-status]');
        if (status) {
            status.textContent = String(lastSuggestionsResult.summary || 'Suggestions ready.');
        }
    }
}

function updateSuggestedPanelVisibility() {
    const panel = document.getElementById('suggested-panel');
    if (!panel) return;
    const shouldShow = isLlmHelpersEnabled() && getActiveTopSection() === 'library' && getActiveLibrarySection() === suggestedSectionKey;
    if (!shouldShow) {
        panel.classList.add('is-hidden');
        panel.innerHTML = '';
        return;
    }
    renderSuggestedPanel();
}

    return {
        updateSuggestedPanelVisibility
    };
}
