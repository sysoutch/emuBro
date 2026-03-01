import {
    normalizeSuggestionProvider,
    loadSuggestionSettings,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings.js';

const TOOL_PLUGIN_STORAGE_KEY = 'emuBro.toolPlugins.v1';
const TOOL_PLUGIN_MODE_MANUAL = 'manual';
const TOOL_PLUGIN_MODE_LLM = 'llm';

export function createToolPluginManager(deps = {}) {
    const t = typeof deps.t === 'function'
        ? deps.t
        : ((key, fallback) => String(fallback || key || ''));
    const escapeHtml = typeof deps.escapeHtml === 'function'
        ? deps.escapeHtml
        : ((value) => String(value ?? ''));
    const navigateToTool = typeof deps.showToolView === 'function'
        ? deps.showToolView
        : (() => {});

    function createToolPluginId() {
        return `plugin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function normalizeToolPluginMode(value) {
        return String(value || '').trim().toLowerCase() === TOOL_PLUGIN_MODE_LLM
            ? TOOL_PLUGIN_MODE_LLM
            : TOOL_PLUGIN_MODE_MANUAL;
    }

    function normalizeToolPluginRecord(raw) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const name = String(source.name || '').trim();
        if (!name) return null;
        return {
            id: String(source.id || createToolPluginId()).trim() || createToolPluginId(),
            name,
            description: String(source.description || '').trim(),
            commandPath: String(source.commandPath || '').trim(),
            args: String(source.args || '').trim(),
            workingDirectory: String(source.workingDirectory || '').trim(),
            prompt: String(source.prompt || '').trim(),
            notes: String(source.notes || '').trim(),
            mode: normalizeToolPluginMode(source.mode),
            createdAt: Number(source.createdAt || Date.now())
        };
    }

    function loadToolPlugins() {
        try {
            const raw = localStorage.getItem(TOOL_PLUGIN_STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((entry) => normalizeToolPluginRecord(entry))
                .filter((entry) => !!entry);
        } catch (_error) {
            return [];
        }
    }

    function saveToolPlugins(rows) {
        const normalizedRows = Array.isArray(rows)
            ? rows.map((entry) => normalizeToolPluginRecord(entry)).filter((entry) => !!entry)
            : [];
        localStorage.setItem(TOOL_PLUGIN_STORAGE_KEY, JSON.stringify(normalizedRows));
        return normalizedRows;
    }

    function parsePluginRouteId(toolId) {
        const text = String(toolId || '').trim();
        if (!text.startsWith('plugin:')) return '';
        return text.slice('plugin:'.length).trim();
    }

    function parseCreateToolRouteId(toolId) {
        const text = String(toolId || '').trim();
        if (text === 'create-tool') return '';
        if (!text.startsWith('create-tool:')) return null;
        return text.slice('create-tool:'.length).trim();
    }

    function findToolPluginById(pluginId) {
        const target = String(pluginId || '').trim();
        if (!target) return null;
        return loadToolPlugins().find((entry) => String(entry.id || '').trim() === target) || null;
    }

    function getOverviewPluginCards() {
        return loadToolPlugins().map((plugin) => ({
            id: `plugin:${plugin.id}`,
            icon: 'fas fa-puzzle-piece',
            name: plugin.name,
            desc: plugin.description || t('tools.customToolFallbackDescription', 'Custom plugin tool'),
            actionLabel: t('tools.openTool', 'Open Tool'),
            extraClass: 'tool-card-plugin',
            mode: plugin.mode
        }));
    }

    function buildFallbackToolDraft(promptText) {
        const prompt = String(promptText || '').replace(/\s+/g, ' ').trim();
        const pathMatch = prompt.match(/([a-zA-Z]:\\[^"'\n\r]+?\.(?:exe|bat|cmd|ps1|lnk|com))/i);
        const titleSource = prompt
            .replace(pathMatch ? pathMatch[1] : '', '')
            .replace(/[^a-z0-9 ]/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const rawName = (titleSource.split(' ').slice(0, 4).join(' ') || 'Custom Tool')
            .replace(/\b\w/g, (match) => match.toUpperCase());
        const name = rawName.toLowerCase().endsWith('tool') ? rawName : `${rawName} Tool`;
        const description = prompt.length > 220 ? `${prompt.slice(0, 220).trim()}...` : prompt;
        return {
            name,
            description,
            commandPath: String(pathMatch?.[1] || '').trim(),
            args: '',
            workingDirectory: '',
            notes: 'Review this draft before saving.',
            mode: TOOL_PLUGIN_MODE_LLM
        };
    }

    async function generateToolDraftFromLlm(promptText) {
        const prompt = String(promptText || '').trim();
        if (!prompt) {
            return {
                success: false,
                message: t('tools.createPromptRequired', 'Please enter a prompt first.'),
                draft: null
            };
        }

        const settings = loadSuggestionSettings(window.localStorage);
        const provider = normalizeSuggestionProvider(settings.provider);
        const model = String(settings.models?.[provider] || '').trim();
        const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
        const apiKey = String(settings.apiKeys?.[provider] || '').trim();
        const routing = getSuggestionLlmRoutingSettings(settings);

        if (routing.llmMode === 'client' && !routing.relayHostUrl) {
            return {
                success: false,
                message: t('tools.createRelayHostMissing', 'Set a relay host URL first in Settings -> AI / LLM.'),
                draft: null
            };
        }
        if (routing.llmMode !== 'client' && (!model || !baseUrl)) {
            return {
                success: false,
                message: t('tools.createLlmProviderMissing', 'Configure your LLM provider/model first in Suggested view.'),
                draft: null
            };
        }
        if (routing.llmMode !== 'client' && (provider === 'openai' || provider === 'gemini') && !apiKey) {
            return {
                success: false,
                message: t('tools.createLlmApiKeyMissing', 'API key is missing for the selected provider.'),
                draft: null
            };
        }

        try {
            const response = await window.emubro.invoke('suggestions:generate-tool-draft', {
                provider,
                model,
                baseUrl,
                apiKey,
                ...routing,
                prompt
            });
            const rawDraft = response?.draft && typeof response.draft === 'object' ? response.draft : null;
            if (!response?.success || !rawDraft) {
                throw new Error(String(response?.message || 'Provider returned an invalid tool draft.'));
            }
            const draft = normalizeToolPluginRecord({
                ...rawDraft,
                id: createToolPluginId(),
                mode: TOOL_PLUGIN_MODE_LLM
            });
            if (!draft) {
                throw new Error('Provider returned an empty draft.');
            }
            return {
                success: true,
                message: String(response?.message || ''),
                draft: {
                    name: draft.name,
                    description: draft.description,
                    commandPath: draft.commandPath,
                    args: draft.args,
                    workingDirectory: draft.workingDirectory,
                    notes: draft.notes,
                    prompt
                }
            };
        } catch (error) {
            return {
                success: true,
                message: String(error?.message || 'Could not reach LLM provider, using local draft.'),
                draft: {
                    ...buildFallbackToolDraft(prompt),
                    prompt
                },
                fallback: true
            };
        }
    }

    async function pickPluginExecutable(targetInput) {
        if (!targetInput) return;
        try {
            const result = await window.emubro.invoke('open-file-dialog', {
                title: t('tools.selectToolExecutable', 'Select tool executable'),
                properties: ['openFile'],
                filters: [
                    { name: t('tools.fileDialogExecutableFiles', 'Executable Files'), extensions: ['exe', 'bat', 'cmd', 'ps1', 'lnk', 'com'] },
                    { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                ]
            });
            if (result?.canceled) return;
            const selected = Array.isArray(result?.filePaths) ? String(result.filePaths[0] || '').trim() : '';
            if (selected) targetInput.value = selected;
        } catch (_error) {}
    }

    function renderToolPluginBuilder(editPlugin = null) {
        const gamesContainer = document.getElementById('games-container');
        if (!gamesContainer) return;

        const normalizedEdit = normalizeToolPluginRecord(editPlugin);
        const isEditing = !!normalizedEdit;
        const initialMode = normalizeToolPluginMode(normalizedEdit?.mode);

        const toolContent = document.createElement('div');
        toolContent.className = 'tool-content tool-plugin-builder';
        toolContent.innerHTML = `
        <div class="tool-plugin-header">
            <div>
                <h3>${escapeHtml(isEditing ? t('tools.editToolTitle', 'Edit Tool') : t('tools.createNewTool', 'Create New Tool'))}</h3>
                <p>${escapeHtml(t('tools.createToolSubtitle', 'Create plugin-like tools for quick launch and custom workflows.'))}</p>
            </div>
            <button type="button" class="action-btn small" data-plugin-action="back">${escapeHtml(t('tools.backToTools', 'Back to Tools'))}</button>
        </div>
        <div class="tool-plugin-mode-toggle">
            <button type="button" class="action-btn small" data-plugin-mode="manual">${escapeHtml(t('tools.createManual', 'Create Manually'))}</button>
            <button type="button" class="action-btn small" data-plugin-mode="llm">${escapeHtml(t('tools.createWithLlm', 'Generate with LLM'))}</button>
        </div>
        <div class="tool-plugin-llm-block" data-plugin-llm-block>
            <label for="tool-plugin-prompt">${escapeHtml(t('tools.createPromptLabel', 'Prompt for LLM'))}</label>
            <textarea id="tool-plugin-prompt" data-plugin-field="prompt" rows="3" placeholder="${escapeHtml(t('tools.createPromptPlaceholder', 'Example: Create a MAME launch tool with --skip_gameinfo and a D:\\Arcade working directory.'))}">${escapeHtml(normalizedEdit?.prompt || '')}</textarea>
            <button type="button" class="action-btn small" data-plugin-action="generate">${escapeHtml(t('tools.generateDraft', 'Generate Draft'))}</button>
        </div>
        <div class="tool-plugin-form-grid">
            <label for="tool-plugin-name">${escapeHtml(t('tools.createNameLabel', 'Tool Name'))}</label>
            <input id="tool-plugin-name" data-plugin-field="name" type="text" value="${escapeHtml(normalizedEdit?.name || '')}" placeholder="${escapeHtml(t('tools.createNamePlaceholder', 'Example: RetroArch PSX Fast Boot'))}" />

            <label for="tool-plugin-description">${escapeHtml(t('tools.createDescriptionLabel', 'Description'))}</label>
            <textarea id="tool-plugin-description" data-plugin-field="description" rows="2" placeholder="${escapeHtml(t('tools.createDescriptionPlaceholder', 'What this tool does and when to use it.'))}">${escapeHtml(normalizedEdit?.description || '')}</textarea>

            <label for="tool-plugin-command">${escapeHtml(t('tools.createCommandPathLabel', 'Command Path'))}</label>
            <div class="tool-plugin-inline">
                <input id="tool-plugin-command" data-plugin-field="commandPath" type="text" value="${escapeHtml(normalizedEdit?.commandPath || '')}" placeholder="C:\\Tools\\retroarch.exe" />
                <button type="button" class="action-btn small" data-plugin-action="pick-command">${escapeHtml(t('tools.browse', 'Browse'))}</button>
            </div>

            <label for="tool-plugin-args">${escapeHtml(t('tools.createArgsLabel', 'Arguments'))}</label>
            <input id="tool-plugin-args" data-plugin-field="args" type="text" value="${escapeHtml(normalizedEdit?.args || '')}" placeholder="--fullscreen --config retroarch.cfg" />

            <label for="tool-plugin-working-dir">${escapeHtml(t('tools.createWorkingDirLabel', 'Working Directory'))}</label>
            <input id="tool-plugin-working-dir" data-plugin-field="workingDirectory" type="text" value="${escapeHtml(normalizedEdit?.workingDirectory || '')}" placeholder="C:\\Tools\\RetroArch" />

            <label for="tool-plugin-notes">${escapeHtml(t('tools.createNotesLabel', 'Notes'))}</label>
            <textarea id="tool-plugin-notes" data-plugin-field="notes" rows="3" placeholder="${escapeHtml(t('tools.createNotesPlaceholder', 'Optional notes shown in the plugin details view.'))}">${escapeHtml(normalizedEdit?.notes || '')}</textarea>
        </div>
        <div class="tool-plugin-actions">
            <button type="button" class="action-btn" data-plugin-action="save">${escapeHtml(isEditing ? t('tools.saveToolChanges', 'Save Changes') : t('tools.saveTool', 'Save Tool'))}</button>
            ${isEditing ? `<button type="button" class="action-btn remove-btn" data-plugin-action="delete">${escapeHtml(t('tools.deleteTool', 'Delete Tool'))}</button>` : ''}
        </div>
        <p class="tool-plugin-status" data-plugin-status aria-live="polite"></p>
    `;
        gamesContainer.appendChild(toolContent);

        const modeButtons = Array.from(toolContent.querySelectorAll('[data-plugin-mode]'));
        const llmBlock = toolContent.querySelector('[data-plugin-llm-block]');
        const statusEl = toolContent.querySelector('[data-plugin-status]');
        const fieldName = toolContent.querySelector('[data-plugin-field="name"]');
        const fieldDescription = toolContent.querySelector('[data-plugin-field="description"]');
        const fieldCommandPath = toolContent.querySelector('[data-plugin-field="commandPath"]');
        const fieldArgs = toolContent.querySelector('[data-plugin-field="args"]');
        const fieldWorkingDirectory = toolContent.querySelector('[data-plugin-field="workingDirectory"]');
        const fieldPrompt = toolContent.querySelector('[data-plugin-field="prompt"]');
        const fieldNotes = toolContent.querySelector('[data-plugin-field="notes"]');

        let mode = initialMode;
        const setStatus = (message, level = 'info') => {
            if (!statusEl) return;
            statusEl.textContent = String(message || '').trim();
            statusEl.dataset.level = level;
        };

        const setMode = (nextMode) => {
            mode = normalizeToolPluginMode(nextMode);
            toolContent.dataset.mode = mode;
            if (llmBlock) llmBlock.classList.toggle('is-visible', mode === TOOL_PLUGIN_MODE_LLM);
            modeButtons.forEach((button) => {
                button.classList.toggle('active', String(button.dataset.pluginMode || '') === mode);
            });
        };

        const collectDraftFields = () => ({
            name: String(fieldName?.value || '').trim(),
            description: String(fieldDescription?.value || '').trim(),
            commandPath: String(fieldCommandPath?.value || '').trim(),
            args: String(fieldArgs?.value || '').trim(),
            workingDirectory: String(fieldWorkingDirectory?.value || '').trim(),
            prompt: String(fieldPrompt?.value || '').trim(),
            notes: String(fieldNotes?.value || '').trim(),
            mode
        });

        const applyDraftFields = (draft) => {
            if (!draft || typeof draft !== 'object') return;
            if (fieldName && draft.name) fieldName.value = String(draft.name || '');
            if (fieldDescription && draft.description) fieldDescription.value = String(draft.description || '');
            if (fieldCommandPath && draft.commandPath) fieldCommandPath.value = String(draft.commandPath || '');
            if (fieldArgs && (draft.args || draft.args === '')) fieldArgs.value = String(draft.args || '');
            if (fieldWorkingDirectory && draft.workingDirectory) fieldWorkingDirectory.value = String(draft.workingDirectory || '');
            if (fieldNotes && draft.notes) fieldNotes.value = String(draft.notes || '');
        };

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                setMode(button.dataset.pluginMode || TOOL_PLUGIN_MODE_MANUAL);
            });
        });
        setMode(mode);

        toolContent.addEventListener('click', async (event) => {
            const actionButton = event.target.closest('[data-plugin-action]');
            if (!actionButton) return;
            const action = String(actionButton.dataset.pluginAction || '').trim();
            if (!action) return;

            if (action === 'back') {
                navigateToTool('');
                return;
            }
            if (action === 'pick-command') {
                await pickPluginExecutable(fieldCommandPath);
                return;
            }
            if (action === 'generate') {
                const prompt = String(fieldPrompt?.value || '').trim();
                actionButton.disabled = true;
                setStatus(t('tools.generatingToolDraft', 'Generating tool draft...'), 'info');
                try {
                    const result = await generateToolDraftFromLlm(prompt);
                    if (!result?.success || !result?.draft) {
                        setStatus(String(result?.message || t('tools.generateDraftFailed', 'Failed to generate draft.')), 'error');
                        return;
                    }
                    applyDraftFields(result.draft);
                    setMode(TOOL_PLUGIN_MODE_LLM);
                    setStatus(
                        result.fallback
                            ? t('tools.generateDraftFallback', 'LLM unavailable, applied local draft. Review before saving.')
                            : t('tools.generateDraftSuccess', 'Draft generated. Review and save.'),
                        result.fallback ? 'warning' : 'success'
                    );
                } finally {
                    actionButton.disabled = false;
                }
                return;
            }
            if (action === 'delete' && normalizedEdit) {
                const confirmed = window.confirm(t('tools.deleteToolConfirm', 'Delete this tool plugin?'));
                if (!confirmed) return;
                const next = loadToolPlugins().filter((entry) => String(entry.id || '') !== String(normalizedEdit.id || ''));
                saveToolPlugins(next);
                navigateToTool('');
                return;
            }
            if (action !== 'save') return;

            const payload = collectDraftFields();
            const normalized = normalizeToolPluginRecord({
                ...normalizedEdit,
                ...payload,
                id: normalizedEdit?.id || createToolPluginId(),
                createdAt: normalizedEdit?.createdAt || Date.now()
            });
            if (!normalized) {
                setStatus(t('tools.createNameRequired', 'Tool name is required.'), 'error');
                return;
            }
            if (!normalized.commandPath && !normalized.notes) {
                setStatus(t('tools.createCommandOrNotesRequired', 'Provide a command path or add notes so this tool has meaningful behavior.'), 'warning');
                return;
            }

            const rows = loadToolPlugins().filter((entry) => String(entry.id || '') !== normalized.id);
            rows.push(normalized);
            rows.sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
            saveToolPlugins(rows);
            navigateToTool(`plugin:${normalized.id}`);
        });
    }

    function renderToolPluginView(pluginTool) {
        const gamesContainer = document.getElementById('games-container');
        if (!gamesContainer) return;
        const plugin = normalizeToolPluginRecord(pluginTool);
        if (!plugin) {
            gamesContainer.innerHTML = `<p>${escapeHtml(t('tools.pluginNotFound', 'Tool plugin not found.'))}</p>`;
            return;
        }

        const hasLaunchCommand = !!String(plugin.commandPath || '').trim();
        const toolContent = document.createElement('div');
        toolContent.className = 'tool-content tool-plugin-view';
        toolContent.innerHTML = `
        <div class="tool-plugin-header">
            <div>
                <h3>${escapeHtml(plugin.name)}</h3>
                <p>${escapeHtml(plugin.description || t('tools.customToolFallbackDescription', 'Custom plugin tool'))}</p>
            </div>
            <button type="button" class="action-btn small" data-plugin-action="back">${escapeHtml(t('tools.backToTools', 'Back to Tools'))}</button>
        </div>
        <div class="tool-plugin-summary">
            <div><strong>${escapeHtml(t('tools.createModeLabel', 'Mode'))}:</strong> ${escapeHtml(plugin.mode === TOOL_PLUGIN_MODE_LLM ? t('tools.createWithLlm', 'Generate with LLM') : t('tools.createManual', 'Create Manually'))}</div>
            <div><strong>${escapeHtml(t('tools.createCommandPathLabel', 'Command Path'))}:</strong> ${escapeHtml(plugin.commandPath || t('tools.noneSet', 'Not set'))}</div>
            <div><strong>${escapeHtml(t('tools.createArgsLabel', 'Arguments'))}:</strong> ${escapeHtml(plugin.args || t('tools.noneSet', 'Not set'))}</div>
            <div><strong>${escapeHtml(t('tools.createWorkingDirLabel', 'Working Directory'))}:</strong> ${escapeHtml(plugin.workingDirectory || t('tools.noneSet', 'Not set'))}</div>
        </div>
        <div class="tool-plugin-notes">${escapeHtml(plugin.notes || t('tools.createNoNotes', 'No additional notes.'))}</div>
        <div class="tool-plugin-actions">
            <button type="button" class="action-btn" data-plugin-action="run"${hasLaunchCommand ? '' : ' disabled'}>${escapeHtml(t('tools.launchTool', 'Launch Tool'))}</button>
            <button type="button" class="action-btn" data-plugin-action="edit">${escapeHtml(t('tools.editToolTitle', 'Edit Tool'))}</button>
            <button type="button" class="action-btn remove-btn" data-plugin-action="delete">${escapeHtml(t('tools.deleteTool', 'Delete Tool'))}</button>
        </div>
        <p class="tool-plugin-status" data-plugin-status aria-live="polite"></p>
    `;
        gamesContainer.appendChild(toolContent);

        const statusEl = toolContent.querySelector('[data-plugin-status]');
        const setStatus = (message, level = 'info') => {
            if (!statusEl) return;
            statusEl.textContent = String(message || '').trim();
            statusEl.dataset.level = level;
        };

        toolContent.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-plugin-action]');
            if (!button) return;
            const action = String(button.dataset.pluginAction || '').trim();
            if (!action) return;

            if (action === 'back') {
                navigateToTool('');
                return;
            }
            if (action === 'edit') {
                navigateToTool(`create-tool:${plugin.id}`);
                return;
            }
            if (action === 'delete') {
                const confirmed = window.confirm(t('tools.deleteToolConfirm', 'Delete this tool plugin?'));
                if (!confirmed) return;
                const next = loadToolPlugins().filter((entry) => String(entry.id || '') !== String(plugin.id || ''));
                saveToolPlugins(next);
                navigateToTool('');
                return;
            }
            if (action !== 'run') return;

            const commandPath = String(plugin.commandPath || '').trim();
            if (!commandPath) {
                setStatus(t('tools.commandPathMissing', 'Command path is missing.'), 'warning');
                return;
            }
            button.disabled = true;
            setStatus(t('tools.runningTool', 'Launching tool...'), 'info');
            try {
                let result;
                if (/^https?:\/\//i.test(commandPath)) {
                    result = await window.emubro.invoke('open-external-url', commandPath);
                } else {
                    result = await window.emubro.invoke('launch-emulator', {
                        filePath: commandPath,
                        args: String(plugin.args || ''),
                        workingDirectory: String(plugin.workingDirectory || ''),
                        name: plugin.name
                    });
                }
                if (result?.success === false) {
                    setStatus(result?.message || t('tools.status.launchFailed', 'Failed to launch tool.'), 'error');
                    return;
                }
                setStatus(t('tools.status.launchedTool', 'Launched {{name}}.', { name: plugin.name }), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.launchFailed', 'Failed to launch tool.')), 'error');
            } finally {
                button.disabled = false;
            }
        });
    }

    return {
        parsePluginRouteId,
        parseCreateToolRouteId,
        findToolPluginById,
        getOverviewPluginCards,
        renderToolPluginBuilder,
        renderToolPluginView
    };
}
