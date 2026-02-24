import { renderSuggestionResults as renderSuggestionResultsView } from '../suggested-results-view';
import {
    normalizeSuggestionProvider,
    normalizeSuggestionScope,
    getDefaultSuggestionPromptTemplate,
    loadSuggestionSettings,
    saveSuggestionSettings,
    getSuggestionLlmRoutingSettings
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
            .replace(/&/g, '&')
            .replace(/</g, '<')
            .replace(/>/g, '>')
            .replace(/"/g, '"')
            .replace(/'/g, '&#39;');

    function applyTemplate(input, data = {}) {
        let text = String(input ?? '');
        Object.keys(data || {}).forEach((key) => {
            const value = String(data[key] ?? '');
            text = text
                .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
                .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value);
        });
        return text;
    }

    function t(key, fallback, data = {}) {
        const i18nRef = (typeof i18n !== 'undefined' && i18n && typeof i18n.t === 'function')
            ? i18n
            : (window?.i18n && typeof window.i18n.t === 'function' ? window.i18n : null);
        if (i18nRef && typeof i18nRef.t === 'function') {
            const translated = i18nRef.t(key, data);
            if (translated && translated !== key) return String(translated);
        }
        return applyTemplate(String(fallback || key), data);
    }

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
        const routing = options?.routing || {};
        const llmMode = String(routing?.llmMode || 'host').trim().toLowerCase() === 'client' ? 'client' : 'host';
        const relayHostUrl = String(routing?.relayHostUrl || '').trim();
        const relayPort = Number(routing?.relayPort || 42141);

        if (llmMode === 'client' && !relayHostUrl) {
            return { success: false, models: [], message: t('support.status.missingRelayHost', 'Set a relay host URL first in Settings -> AI / LLM.') };
        }
        if (llmMode !== 'client' && !normalizedBaseUrl) {
            return { success: false, models: [], message: t('suggested.status.setOllamaUrlFirst', 'Set an Ollama API URL first.') };
        }

        const cacheKey = [
            normalizedBaseUrl.toLowerCase(),
            llmMode,
            relayHostUrl.toLowerCase(),
            String(relayPort)
        ].join('::');
        if (!options.force && ollamaModelsCacheByUrl.has(cacheKey)) {
            return {
                success: true,
                baseUrl: normalizedBaseUrl,
                models: [...(ollamaModelsCacheByUrl.get(cacheKey) || [])]
            };
        }

        const result = await emubro.invoke('suggestions:list-ollama-models', {
            baseUrl: normalizedBaseUrl,
            ...routing
        });
        if (!result?.success) {
            return {
                success: false,
                baseUrl: normalizedBaseUrl,
                models: [],
                message: String(result?.message || t('suggested.status.failedFetchOllamaModels', 'Failed to fetch Ollama models.'))
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
        const searchInput = document.getElementById('global-game-search') || document.querySelector('.search-bar input');
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

        const scopeSelect = panel.querySelector('[data-suggest-scope]');
        const modelSelect = panel.querySelector('[data-suggest-model-select]');
        const modelInput = panel.querySelector('[data-suggest-model]');
        const promptInput = panel.querySelector('[data-suggest-prompt]');
        const platformOnlyToggle = panel.querySelector('[data-suggest-platform-only]');
        const sendLibraryToggle = panel.querySelector('[data-suggest-send-library]');
        const status = panel.querySelector('[data-suggest-status]');
        const runBtn = panel.querySelector('[data-suggest-run]');
        const outputTextarea = panel.querySelector('[data-suggest-output]');
        const limitInput = panel.querySelector('[data-suggest-limit]');

        if (!scopeSelect || !promptInput || !status || !runBtn || !platformOnlyToggle) return;

        const currentSettings = loadSuggestionSettings();
        const provider = normalizeSuggestionProvider(currentSettings.provider);
        
        // Use local override if available, otherwise fall back to settings
        let selectedModel = '';
        if (provider === 'ollama' && modelSelect) {
            selectedModel = String(modelSelect.value || '').trim();
        } else if (modelInput) {
            selectedModel = String(modelInput.value || '').trim();
        }
        if (!selectedModel) selectedModel = String(currentSettings.models?.[provider] || '').trim();

        const platformContext = getSelectedPlatformContext();
        const nextSettings = { ...currentSettings };
        
        nextSettings.scope = normalizeSuggestionScope(scopeSelect.value);
        nextSettings.query = String(panel.querySelector('[data-suggest-query]')?.value || '').trim();
        nextSettings.promptTemplate = promptInput.value;
        nextSettings.selectedPlatformOnly = !!platformOnlyToggle.checked;
        nextSettings.limit = Math.max(1, Math.min(50, Number(limitInput?.value) || 8));
        
        if (selectedModel) {
            nextSettings.models = {
                ...nextSettings.models,
                [provider]: selectedModel
            };
        }
        
        saveSuggestionSettings(nextSettings);

        const model = selectedModel;
        const baseUrl = String(nextSettings.baseUrls?.[provider] || '').trim();
        const apiKey = String(nextSettings.apiKeys?.[provider] || '').trim();
        const routing = getSuggestionLlmRoutingSettings(nextSettings);
        
        const shouldSendLibrary = !!sendLibraryToggle?.checked;
        const libraryGames = shouldSendLibrary 
            ? buildSuggestionLibraryPayload(nextSettings.query, {
                selectedPlatformOnly: nextSettings.selectedPlatformOnly,
                selectedPlatform: platformContext.value
            })
            : [];

        if (routing.llmMode === 'client' && !routing.relayHostUrl) {
            status.textContent = t('support.status.missingRelayHost', 'Set a relay host URL first in Settings -> AI / LLM.');
            return;
        }
        if (routing.llmMode !== 'client' && !model) {
            status.textContent = t('suggested.status.setModelFirst', 'Set a model first.');
            return;
        }
        if (routing.llmMode !== 'client' && !baseUrl) {
            status.textContent = t('suggested.status.setProviderUrlFirst', 'Set a provider URL first.');
            return;
        }
        if (routing.llmMode !== 'client' && (provider === 'openai' || provider === 'gemini') && !apiKey) {
            status.textContent = t('suggested.status.apiKeyRequired', 'API key is required for this provider.');
            return;
        }
        if (nextSettings.selectedPlatformOnly && !platformContext.value) {
            status.textContent = t('suggested.status.choosePlatformFirst', 'Choose a platform in the top filter first, then run again.');
            return;
        }

        suggestionsRequestInFlight = true;
        runBtn.disabled = true;
        status.textContent = t('suggested.status.generatingSuggestions', 'Generating suggestions...');
        if (outputTextarea) outputTextarea.value = t('suggested.status.running', 'Running...');

        try {
            const response = await emubro.invoke('suggestions:recommend-games', {
                provider,
                mode: nextSettings.scope,
                query: nextSettings.query,
                promptTemplate: nextSettings.promptTemplate || getDefaultSuggestionPromptTemplate(),
                model,
                baseUrl,
                apiKey,
                ...routing,
                limit: nextSettings.limit,
                libraryGames,
                selectedPlatformOnly: nextSettings.selectedPlatformOnly,
                selectedPlatform: platformContext.label || platformContext.value
            });

            if (outputTextarea) {
                outputTextarea.value = JSON.stringify(response, null, 2);
            }

            if (!response?.success) {
                status.textContent = String(response?.message || t('suggested.status.requestFailed', 'Suggestion request failed.'));
                return;
            }

            lastSuggestionsResult = response;
            suggestedCoverGames = mapSuggestionLibraryMatchesToGames(response, getGames(), {
                selectedPlatform: nextSettings.selectedPlatformOnly ? platformContext.value : ''
            });
            setSuggestedCoverGames(suggestedCoverGames);
            status.textContent = String(response?.summary || t('suggested.status.ready', 'Suggestions ready.'));
            renderSuggestionResultsView(panel, response, {
                escapeHtml,
                onSearch: applySuggestionSearchTerm
            });
            if (getActiveTopSection() === 'library' && getActiveLibrarySection() === suggestedSectionKey) {
                renderGames(getSectionFilteredGames());
            }
        } catch (error) {
            status.textContent = String(error?.message || error || t('suggested.status.requestFailed', 'Suggestion request failed.'));
            if (outputTextarea) outputTextarea.value = `Error: ${String(error?.message || error)}`;
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
        const promptTemplate = String(settings.promptTemplate || getDefaultSuggestionPromptTemplate());
        const limit = Number(settings.limit) || 8;
        const isOllama = provider === 'ollama';
        const totalGamesCount = getGames().length;
        const shouldSendLibraryDefault = totalGamesCount < 50;

        panel.classList.remove('is-hidden');
        panel.innerHTML = `
            <h3 class="suggested-panel-title">${t('sidebar.suggested', 'Suggested')}</h3>
            <p class="suggested-panel-subtitle">${t('suggested.subtitle', 'Use an LLM provider to recommend games from your library or titles you do not have yet.')}</p>
            
            <div class="suggested-panel-form" style="display:flex;flex-direction:column;gap:12px;">
                
                <div style="display:flex;flex-direction:column;gap:4px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-end;">
                        <label for="suggest-model" style="margin:0;font-size:0.85rem;font-weight:600;color:var(--text-secondary);">
                            ${t('suggested.modelOverride', 'Model Override')} <span style="font-weight:400;opacity:0.8;">(${escapeHtml(provider)})</span>
                        </label>
                        <button class="action-btn small" type="button" data-suggest-open-settings style="font-size:0.75rem;padding:2px 8px;height:22px;opacity:0.8;">${t('buttons.configure', 'Configure')}</button>
                    </div>
                    ${isOllama ? `
                    <div class="suggested-model-row" data-suggest-model-select-wrap style="display:grid;grid-template-columns:1fr auto;gap:8px;">
                        <select id="suggest-model-select" data-suggest-model-select style="width:100%;">
                            <option value="${escapeHtml(model || '')}" selected>${escapeHtml(model || t('suggested.selectModel', 'Select model...'))}</option>
                        </select>
                        <button class="action-btn small" type="button" data-suggest-refresh-models title="${t('suggested.refreshModels', 'Refresh Models')}" style="width:36px;display:flex;align-items:center;justify-content:center;">
                            <span class="icon-svg"><svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path></svg></span>
                        </button>
                    </div>
                    ` : `
                    <input id="suggest-model" data-suggest-model type="text" value="${escapeHtml(model)}" placeholder="${escapeHtml(t('suggested.modelPlaceholder', 'e.g. gpt-4o-mini'))}" style="width:100%;" />
                    `}
                </div>

                <div style="display:flex;gap:12px;width:100%;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:4px;">
                        <label for="suggest-scope" style="margin:0;font-size:0.85rem;font-weight:600;color:var(--text-secondary);">${t('suggested.mode', 'Mode')}</label>
                        <select id="suggest-scope" data-suggest-scope style="width:100%;">
                            <option value="library-only"${normalizeSuggestionScope(settings.scope) === 'library-only' ? ' selected' : ''}>${t('suggested.scopeLibraryOnly', 'My Library Only')}</option>
                            <option value="library-plus-missing"${normalizeSuggestionScope(settings.scope) === 'library-plus-missing' ? ' selected' : ''}>${t('suggested.scopeLibraryPlusRecommendations', 'Library + Recommendations')}</option>
                        </select>
                    </div>
                    <div style="width:80px;display:flex;flex-direction:column;gap:4px;">
                        <label for="suggest-limit" style="margin:0;font-size:0.85rem;font-weight:600;color:var(--text-secondary);">${t('suggested.limit', 'Limit')}</label>
                        <input id="suggest-limit" data-suggest-limit type="number" min="1" max="50" value="${limit}" style="width:100%;" />
                    </div>
                </div>

                <div style="display:flex;flex-wrap:wrap;gap:16px;background:var(--bg-secondary);padding:10px;border-radius:8px;border:1px solid var(--border-color);">
                    <div style="display:flex;flex-direction:column;gap:2px;">
                        <label class="suggested-checkbox-label" for="suggest-platform-only" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">
                            <input id="suggest-platform-only" data-suggest-platform-only type="checkbox"${settings.selectedPlatformOnly ? ' checked' : ''} style="cursor:pointer;" />
                            <span style="font-size:0.9rem;">${t('suggested.selectedPlatformOnly', 'Selected Platform Only')}</span>
                        </label>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:2px;">
                        <label class="suggested-checkbox-label" for="suggest-send-library" style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:0;">
                            <input id="suggest-send-library" data-suggest-send-library type="checkbox"${shouldSendLibraryDefault ? ' checked' : ''} style="cursor:pointer;" />
                            <span style="font-size:0.9rem;">${t('suggested.sendLibraryContext', 'Send Library Context')}</span>
                        </label>
                    </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:4px;">
                    <label for="suggest-query" style="margin:0;font-size:0.85rem;font-weight:600;color:var(--text-secondary);">${t('suggested.moodPreferences', 'Mood / Preferences')}</label>
                    <input id="suggest-query" data-suggest-query type="text" value="${escapeHtml(settings.query || '')}" placeholder="${escapeHtml(t('suggested.queryPlaceholder', 'Example: short platform games for relaxed evening sessions'))}" style="width:100%;padding:8px 10px;" />
                </div>

                <div style="border-top:1px solid var(--border-color);padding-top:12px;">
                    <details>
                        <summary style="cursor:pointer;user-select:none;font-size:0.85rem;color:var(--accent-color);margin-bottom:6px;font-weight:600;">${t('suggested.advancedPromptTemplate', 'Advanced: Prompt Template')}</summary>
                        <div style="margin-top:8px;display:flex;flex-direction:column;gap:10px;">
                        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-color);margin-bottom:4px;">
                            <div style="display:flex;gap:4px;">
                                <button type="button" class="action-btn small active" data-prompt-tab="edit">${t('suggested.editTemplate', 'Edit Template')}</button>
                                <button type="button" class="action-btn small" data-prompt-tab="view">${t('suggested.viewRendered', 'View Rendered')}</button>
                            </div>
                            <button type="button" class="action-btn small" data-prompt-reset title="${t('suggested.resetToDefaultTemplate', 'Reset to default template')}">${t('suggested.resetToDefault', 'Reset to Default')}</button>
                        </div>
                            <div data-prompt-pane="edit">
                                <textarea id="suggest-prompt" data-suggest-prompt rows="8" style="width:100%;font-family:monospace;font-size:0.82rem;line-height:1.4;padding:8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:6px;">${escapeHtml(promptTemplate)}</textarea>
                                <small class="suggested-panel-hint" style="font-size:0.75rem;opacity:0.7;">${t('suggested.availableTokens', 'Available: {{mode}}, {{query}}, {{limit}}, {{platformConstraint}}, {{selectedPlatform}}, {{libraryJson}}')}</small>
                            </div>
                            <div data-prompt-pane="view" style="display:none;">
                                <textarea data-suggest-prompt-rendered rows="8" readonly style="width:100%;font-family:monospace;font-size:0.82rem;line-height:1.4;padding:8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:6px;opacity:0.9;"></textarea>
                                <small class="suggested-panel-hint" style="font-size:0.75rem;opacity:0.7;">${t('suggested.copyHint', 'Copy this to ChatGPT or other tools.')}</small>
                            </div>
                        </div>
                    </details>
                </div>

                <div style="border-top:1px solid var(--border-color);padding-top:12px;">
                    <details>
                        <summary style="cursor:pointer;user-select:none;font-size:0.85rem;color:var(--accent-color);margin-bottom:6px;font-weight:600;">${t('suggested.debugLlmOutput', 'Debug: LLM Output JSON')}</summary>
                        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
                            <textarea id="suggest-output" data-suggest-output rows="8" style="width:100%;font-family:monospace;font-size:0.82rem;line-height:1.4;padding:8px;background:var(--bg-primary);color:var(--text-primary);border:1px solid var(--border-color);border-radius:6px;"></textarea>
                            <div style="display:flex;justify-content:flex-end;">
                                <button type="button" class="action-btn small" data-suggest-refresh-ui>${t('suggested.refreshFromJson', 'Refresh Suggestions from JSON')}</button>
                            </div>
                        </div>
                    </details>
                </div>

                <div class="suggested-panel-actions" style="margin-top:8px;display:flex;justify-content:flex-end;">
                    <button class="action-btn launch-btn" type="button" data-suggest-run style="padding:10px 24px;font-size:1rem;">${t('suggested.generateSuggestions', 'Generate Suggestions')}</button>
                </div>
            </div>
            <p class="suggested-panel-status" data-suggest-status></p>
            <div class="suggested-panel-results" data-suggest-results></div>
        `;

        const openSettingsBtn = panel.querySelector('[data-suggest-open-settings]');
        const queryInput = panel.querySelector('[data-suggest-query]');
        const promptInput = panel.querySelector('[data-suggest-prompt]');
        const scopeSelect = panel.querySelector('[data-suggest-scope]');
        const limitInput = panel.querySelector('[data-suggest-limit]');
        const platformOnlyToggle = panel.querySelector('[data-suggest-platform-only]');
        const status = panel.querySelector('[data-suggest-status]');
        const runBtn = panel.querySelector('[data-suggest-run]');
        const modelSelect = panel.querySelector('[data-suggest-model-select]');
        const modelInput = panel.querySelector('[data-suggest-model]');
        const refreshModelsBtn = panel.querySelector('[data-suggest-refresh-models]');
        const sendLibraryToggle = panel.querySelector('[data-suggest-send-library]');
        const outputTextarea = panel.querySelector('[data-suggest-output]');

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
            }
        };

        const refreshOllamaModels = async (force = false) => {
            const currentSettings = loadSuggestionSettings();
            const currentProvider = normalizeSuggestionProvider(currentSettings.provider);
            if (currentProvider !== 'ollama') return;
            
            const currentModel = String(modelSelect?.value || currentSettings.models?.ollama || '').trim();
            const baseUrl = String(currentSettings.baseUrls?.ollama || '').trim();
            const routing = getSuggestionLlmRoutingSettings(currentSettings);
            
            if (refreshModelsBtn) refreshModelsBtn.disabled = true;
            if (status) status.textContent = t('suggested.status.loadingOllamaModels', 'Loading Ollama models...');

            try {
                const result = await fetchOllamaModels(baseUrl, { force, routing });
                if (!result?.success) {
                    populateOllamaModelSelect([], currentModel || 'llama3.1');
                    if (status) status.textContent = String(result?.message || t('suggested.status.failedFetchOllamaModels', 'Failed to fetch Ollama models.'));
                    return;
                }

                populateOllamaModelSelect(result.models, currentModel || result.models?.[0] || 'llama3.1');
                if (status) status.textContent = t('suggested.status.loadedOllamaModels', 'Loaded {{count}} Ollama model(s).', { count: result.models.length });
            } catch (error) {
                populateOllamaModelSelect([], currentModel || 'llama3.1');
                if (status) status.textContent = String(error?.message || t('suggested.status.failedFetchOllamaModels', 'Failed to fetch Ollama models.'));
            } finally {
                if (refreshModelsBtn) refreshModelsBtn.disabled = false;
            }
        };

        if (provider === 'ollama') {
            refreshOllamaModels(false);
        }

        const persistInputs = () => {
            const current = loadSuggestionSettings();
            current.scope = normalizeSuggestionScope(scopeSelect.value);
            current.query = String(queryInput.value || '').trim();
            current.limit = Math.max(1, Math.min(50, Number(limitInput?.value) || 8));
            current.promptTemplate = promptInput.value;
            current.selectedPlatformOnly = !!platformOnlyToggle?.checked;
            
            if (provider === 'ollama' && modelSelect) {
                current.models['ollama'] = modelSelect.value;
            } else if (modelInput) {
                current.models[provider] = modelInput.value;
            }
            
            saveSuggestionSettings(current);
        };

        if (openSettingsBtn) {
            openSettingsBtn.addEventListener('click', () => {
                const settingsBtn = document.getElementById('settings-btn');
                if (settingsBtn) settingsBtn.click();
            });
        }
        
        if (refreshModelsBtn) {
            refreshModelsBtn.addEventListener('click', () => refreshOllamaModels(true));
        }

        [scopeSelect, limitInput, queryInput, promptInput, platformOnlyToggle, sendLibraryToggle, modelSelect, modelInput].forEach((element) => {
            element?.addEventListener('change', persistInputs);
            element?.addEventListener('blur', persistInputs);
        });

        if (runBtn) {
            runBtn.addEventListener('click', async () => {
                await runSuggestionsFromPanel(panel);
            });
        }

        const refreshUiBtn = panel.querySelector('[data-suggest-refresh-ui]');
        if (refreshUiBtn) {
            refreshUiBtn.addEventListener('click', () => {
                const rawJson = outputTextarea?.value || '';
                try {
                    const response = JSON.parse(rawJson);
                    if (response) {
                        lastSuggestionsResult = response;
                        suggestedCoverGames = mapSuggestionLibraryMatchesToGames(response, getGames(), {
                            selectedPlatform: platformOnlyToggle?.checked ? getSelectedPlatformContext().value : ''
                        });
                        setSuggestedCoverGames(suggestedCoverGames);
                        renderSuggestionResultsView(panel, response, {
                            escapeHtml,
                            onSearch: applySuggestionSearchTerm
                        });
                        if (getActiveTopSection() === 'library' && getActiveLibrarySection() === suggestedSectionKey) {
                            renderGames(getSectionFilteredGames());
                        }
                    }
                } catch (e) {
                    alert(t('suggested.invalidJsonOutput', 'Invalid JSON in output area.'));
                }
            });
        }

    const resetPromptBtn = panel.querySelector('[data-prompt-reset]');
    if (resetPromptBtn) {
        resetPromptBtn.addEventListener('click', () => {
            if (confirm(t('suggested.confirmResetPromptTemplate', 'Reset prompt template to default?'))) {
                const defaultTmpl = getDefaultSuggestionPromptTemplate();
                if (promptInput) promptInput.value = defaultTmpl;
                persistInputs();
                // If on view tab, refresh it
                const activeTab = panel.querySelector('[data-prompt-tab].active')?.dataset.promptTab;
                if (activeTab === 'view') {
                    panel.querySelector('[data-prompt-tab="view"]')?.click();
                }
            }
        });
    }

    const promptTabs = panel.querySelectorAll('[data-prompt-tab]');
    promptTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.promptTab;
                promptTabs.forEach(b => b.classList.toggle('active', b === btn));
                panel.querySelector('[data-prompt-pane="edit"]').style.display = tab === 'edit' ? 'block' : 'none';
                panel.querySelector('[data-prompt-pane="view"]').style.display = tab === 'view' ? 'block' : 'none';
                
                if (tab === 'view') {
                    const viewTextarea = panel.querySelector('[data-suggest-prompt-rendered]');
                    if (viewTextarea) {
                        const currentSettings = loadSuggestionSettings();
                        const platformContext = getSelectedPlatformContext();
                        const libraryGames = sendLibraryToggle?.checked ? buildSuggestionLibraryPayload(currentSettings.query, {
                            selectedPlatformOnly: !!platformOnlyToggle?.checked,
                            selectedPlatform: platformContext.value
                        }) : [];
                        
                        const payload = {
                            mode: normalizeSuggestionScope(scopeSelect.value),
                            query: queryInput.value,
                            limit: Number(limitInput?.value) || 8,
                            selectedPlatformOnly: !!platformOnlyToggle?.checked,
                            selectedPlatform: platformContext.label || platformContext.value,
                            libraryGames: libraryGames,
                            promptTemplate: promptInput.value
                        };
                        
                        // This needs to match the backend buildPrompt logic very closely
                        let prompt = promptInput.value || getDefaultSuggestionPromptTemplate();
                        let platformConstraint = "";
                        if (payload.selectedPlatformOnly && payload.selectedPlatform) {
                            platformConstraint = `Only suggest games for platform "${payload.selectedPlatform}".`;
                        } else {
                            platformConstraint = "Suggest games for platforms supported by emuBro (NES, SNES, N64, GameCube, Wii, Switch, GameBoy, GBA, DS, 3DS, PS1, PS2, PS3, PSP, Genesis, Dreamcast, Saturn, etc.).";
                        }

                        const replaceToken = (tmpl, token, val) => tmpl.replace(new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, 'gi'), val);

                        prompt = replaceToken(prompt, 'mode', payload.mode);
                        prompt = replaceToken(prompt, 'query', payload.query);
                        prompt = replaceToken(prompt, 'limit', String(payload.limit));
                        prompt = replaceToken(prompt, 'platformConstraint', platformConstraint);
                        prompt = replaceToken(prompt, 'selectedPlatform', payload.selectedPlatform);
                        prompt = replaceToken(prompt, 'libraryJson', JSON.stringify(payload.libraryGames, null, 2));
                        
                        // Always append a strict context block
                        prompt += `\n\nContext:\n- mode: ${payload.mode}\n- query: ${payload.query}\n- limit: ${payload.limit}\n- platformConstraint: ${platformConstraint}\n- hasLibrary: ${payload.libraryGames.length > 0}`;

                        viewTextarea.value = prompt;
                    }
                }
            });
        });

        if (lastSuggestionsResult) {
            renderSuggestionResultsView(panel, lastSuggestionsResult, {
                escapeHtml,
                onSearch: applySuggestionSearchTerm
            });
            const status = panel.querySelector('[data-suggest-status]');
            if (status) {
                status.textContent = String(lastSuggestionsResult.summary || t('suggested.status.ready', 'Suggestions ready.'));
            }
            if (outputTextarea) {
                outputTextarea.value = JSON.stringify(lastSuggestionsResult, null, 2);
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
