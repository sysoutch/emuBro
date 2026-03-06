import {
    normalizeSuggestionProvider,
    loadSuggestionSettings,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings.js';

const TOOL_PLUGIN_STORAGE_KEY = 'emuBro.toolPlugins.v1';
const TOOL_PLUGIN_MODE_MANUAL = 'manual';
const TOOL_PLUGIN_MODE_LLM = 'llm';
const TOOL_PLUGIN_KIND_LAUNCHER = 'launcher';
const TOOL_PLUGIN_KIND_WEB = 'web';

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

    function normalizeToolPluginKind(value) {
        return String(value || '').trim().toLowerCase() === TOOL_PLUGIN_KIND_WEB
            ? TOOL_PLUGIN_KIND_WEB
            : TOOL_PLUGIN_KIND_LAUNCHER;
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
            pluginKind: normalizeToolPluginKind(source.pluginKind),
            htmlFilePath: String(source.htmlFilePath || '').trim(),
            cssFilePath: String(source.cssFilePath || '').trim(),
            jsFilePath: String(source.jsFilePath || '').trim(),
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

    async function createPluginScaffoldFiles(payload = {}) {
        return window.emubro.invoke('tools:plugin:create-files', payload);
    }

    async function readPluginScaffoldFiles(payload = {}) {
        return window.emubro.invoke('tools:plugin:read-files', payload);
    }

    function renderToolPluginBuilder(editPlugin = null) {
        const gamesContainer = document.getElementById('games-container');
        if (!gamesContainer) return;

        const normalizedEdit = normalizeToolPluginRecord(editPlugin);
        const isEditing = !!normalizedEdit;
        const initialMode = normalizeToolPluginMode(normalizedEdit?.mode);
        const builderPluginId = String(normalizedEdit?.id || createToolPluginId()).trim();

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

            <label for="tool-plugin-kind">${escapeHtml(t('tools.createKindLabel', 'Plugin Type'))}</label>
            <select id="tool-plugin-kind" data-plugin-field="pluginKind">
                <option value="${TOOL_PLUGIN_KIND_LAUNCHER}">${escapeHtml(t('tools.createKindLauncher', 'Executable Launcher'))}</option>
                <option value="${TOOL_PLUGIN_KIND_WEB}">${escapeHtml(t('tools.createKindWeb', 'Web Plugin (HTML/CSS/JS)'))}</option>
            </select>

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

            <label>${escapeHtml(t('tools.createWebFilesLabel', 'Web Plugin Files'))}</label>
            <div class="tool-plugin-inline">
                <button type="button" class="action-btn small" data-plugin-action="create-files">${escapeHtml(t('tools.createWebFilesBtn', 'Create HTML/CSS/JS Files'))}</button>
                <span style="align-self:center;font-size:0.8rem;color:var(--text-secondary);">${escapeHtml(t('tools.createWebFilesHint', 'Files are stored in managed data under tool-plugins/.'))}</span>
            </div>
            <input id="tool-plugin-html-path" data-plugin-field="htmlFilePath" type="text" value="${escapeHtml(normalizedEdit?.htmlFilePath || '')}" placeholder=".../index.html" readonly />
            <input id="tool-plugin-css-path" data-plugin-field="cssFilePath" type="text" value="${escapeHtml(normalizedEdit?.cssFilePath || '')}" placeholder=".../style.css" readonly />
            <input id="tool-plugin-js-path" data-plugin-field="jsFilePath" type="text" value="${escapeHtml(normalizedEdit?.jsFilePath || '')}" placeholder=".../script.js" readonly />
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
        const fieldPluginKind = toolContent.querySelector('[data-plugin-field="pluginKind"]');
        const fieldCommandPath = toolContent.querySelector('[data-plugin-field="commandPath"]');
        const fieldArgs = toolContent.querySelector('[data-plugin-field="args"]');
        const fieldWorkingDirectory = toolContent.querySelector('[data-plugin-field="workingDirectory"]');
        const fieldHtmlFilePath = toolContent.querySelector('[data-plugin-field="htmlFilePath"]');
        const fieldCssFilePath = toolContent.querySelector('[data-plugin-field="cssFilePath"]');
        const fieldJsFilePath = toolContent.querySelector('[data-plugin-field="jsFilePath"]');
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
            pluginKind: normalizeToolPluginKind(fieldPluginKind?.value || TOOL_PLUGIN_KIND_LAUNCHER),
            commandPath: String(fieldCommandPath?.value || '').trim(),
            args: String(fieldArgs?.value || '').trim(),
            workingDirectory: String(fieldWorkingDirectory?.value || '').trim(),
            htmlFilePath: String(fieldHtmlFilePath?.value || '').trim(),
            cssFilePath: String(fieldCssFilePath?.value || '').trim(),
            jsFilePath: String(fieldJsFilePath?.value || '').trim(),
            prompt: String(fieldPrompt?.value || '').trim(),
            notes: String(fieldNotes?.value || '').trim(),
            mode
        });

        const applyDraftFields = (draft) => {
            if (!draft || typeof draft !== 'object') return;
            if (fieldName && draft.name) fieldName.value = String(draft.name || '');
            if (fieldDescription && draft.description) fieldDescription.value = String(draft.description || '');
            if (fieldPluginKind) fieldPluginKind.value = normalizeToolPluginKind(draft.pluginKind || TOOL_PLUGIN_KIND_LAUNCHER);
            if (fieldCommandPath && draft.commandPath) fieldCommandPath.value = String(draft.commandPath || '');
            if (fieldArgs && (draft.args || draft.args === '')) fieldArgs.value = String(draft.args || '');
            if (fieldWorkingDirectory && draft.workingDirectory) fieldWorkingDirectory.value = String(draft.workingDirectory || '');
            if (fieldHtmlFilePath && draft.htmlFilePath) fieldHtmlFilePath.value = String(draft.htmlFilePath || '');
            if (fieldCssFilePath && draft.cssFilePath) fieldCssFilePath.value = String(draft.cssFilePath || '');
            if (fieldJsFilePath && draft.jsFilePath) fieldJsFilePath.value = String(draft.jsFilePath || '');
            if (fieldNotes && draft.notes) fieldNotes.value = String(draft.notes || '');
        };

        const syncPluginKindUi = () => {
            const kind = normalizeToolPluginKind(fieldPluginKind?.value || TOOL_PLUGIN_KIND_LAUNCHER);
            const isWeb = kind === TOOL_PLUGIN_KIND_WEB;
            if (fieldCommandPath) fieldCommandPath.disabled = isWeb;
            if (fieldArgs) fieldArgs.disabled = isWeb;
            if (fieldWorkingDirectory) fieldWorkingDirectory.disabled = isWeb;
        };

        modeButtons.forEach((button) => {
            button.addEventListener('click', () => {
                setMode(button.dataset.pluginMode || TOOL_PLUGIN_MODE_MANUAL);
            });
        });
        setMode(mode);
        if (fieldPluginKind) {
            fieldPluginKind.value = normalizeToolPluginKind(normalizedEdit?.pluginKind || TOOL_PLUGIN_KIND_LAUNCHER);
            fieldPluginKind.addEventListener('change', syncPluginKindUi);
        }
        syncPluginKindUi();

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
            if (action === 'create-files') {
                const name = String(fieldName?.value || '').trim();
                if (!name) {
                    setStatus(t('tools.createNameRequired', 'Tool name is required.'), 'error');
                    return;
                }
                actionButton.disabled = true;
                setStatus(t('tools.createWebFilesCreating', 'Creating plugin files...'), 'info');
                try {
                    const result = await createPluginScaffoldFiles({
                        name,
                        pluginId: builderPluginId
                    });
                    if (!result?.success) {
                        setStatus(String(result?.message || t('tools.createWebFilesFailed', 'Failed to create plugin files.')), 'error');
                        return;
                    }
                    if (fieldPluginKind) fieldPluginKind.value = TOOL_PLUGIN_KIND_WEB;
                    if (fieldHtmlFilePath) fieldHtmlFilePath.value = String(result?.htmlFilePath || '');
                    if (fieldCssFilePath) fieldCssFilePath.value = String(result?.cssFilePath || '');
                    if (fieldJsFilePath) fieldJsFilePath.value = String(result?.jsFilePath || '');
                    syncPluginKindUi();
                    setStatus(t('tools.createWebFilesSuccess', 'Plugin files created. Save this tool to use them.'), 'success');
                } catch (error) {
                    setStatus(String(error?.message || error || t('tools.createWebFilesFailed', 'Failed to create plugin files.')), 'error');
                } finally {
                    actionButton.disabled = false;
                }
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
                id: builderPluginId,
                createdAt: normalizedEdit?.createdAt || Date.now()
            });
            if (!normalized) {
                setStatus(t('tools.createNameRequired', 'Tool name is required.'), 'error');
                return;
            }
            const hasWebFiles = !!(normalized.htmlFilePath && normalized.cssFilePath && normalized.jsFilePath);
            if (!normalized.commandPath && !hasWebFiles && !normalized.notes) {
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

        const isWebPlugin = normalizeToolPluginKind(plugin.pluginKind) === TOOL_PLUGIN_KIND_WEB;
        const hasWebFiles = !!(plugin.htmlFilePath && plugin.cssFilePath && plugin.jsFilePath);
        const hasLaunchCommand = !!String(plugin.commandPath || '').trim();
        const canRun = isWebPlugin ? hasWebFiles : hasLaunchCommand;
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
            <div><strong>${escapeHtml(t('tools.createKindLabel', 'Plugin Type'))}:</strong> ${escapeHtml(isWebPlugin ? t('tools.createKindWeb', 'Web Plugin (HTML/CSS/JS)') : t('tools.createKindLauncher', 'Executable Launcher'))}</div>
            <div><strong>${escapeHtml(t('tools.createModeLabel', 'Mode'))}:</strong> ${escapeHtml(plugin.mode === TOOL_PLUGIN_MODE_LLM ? t('tools.createWithLlm', 'Generate with LLM') : t('tools.createManual', 'Create Manually'))}</div>
            <div><strong>${escapeHtml(t('tools.createCommandPathLabel', 'Command Path'))}:</strong> ${escapeHtml(plugin.commandPath || t('tools.noneSet', 'Not set'))}</div>
            <div><strong>${escapeHtml(t('tools.createArgsLabel', 'Arguments'))}:</strong> ${escapeHtml(plugin.args || t('tools.noneSet', 'Not set'))}</div>
            <div><strong>${escapeHtml(t('tools.createWorkingDirLabel', 'Working Directory'))}:</strong> ${escapeHtml(plugin.workingDirectory || t('tools.noneSet', 'Not set'))}</div>
            <div><strong>${escapeHtml(t('tools.createWebFilesLabel', 'Web Plugin Files'))}:</strong> ${escapeHtml(hasWebFiles ? t('tools.configured', 'Configured') : t('tools.noneSet', 'Not set'))}</div>
        </div>
        <div class="tool-plugin-notes">${escapeHtml(plugin.notes || t('tools.createNoNotes', 'No additional notes.'))}</div>
        <div class="tool-plugin-actions">
            <button type="button" class="action-btn" data-plugin-action="run"${canRun ? '' : ' disabled'}>${escapeHtml(isWebPlugin ? t('tools.runPlugin', 'Run Plugin') : t('tools.launchTool', 'Launch Tool'))}</button>
            <button type="button" class="action-btn" data-plugin-action="open-plugin-folder"${hasWebFiles ? '' : ' disabled'}>${escapeHtml(t('tools.openPluginFolder', 'Open Plugin Folder'))}</button>
            <button type="button" class="action-btn" data-plugin-action="edit">${escapeHtml(t('tools.editToolTitle', 'Edit Tool'))}</button>
            <button type="button" class="action-btn remove-btn" data-plugin-action="delete">${escapeHtml(t('tools.deleteTool', 'Delete Tool'))}</button>
        </div>
        <div class="tool-plugin-runtime" data-plugin-runtime hidden></div>
        <p class="tool-plugin-status" data-plugin-status aria-live="polite"></p>
    `;
        gamesContainer.appendChild(toolContent);

        const statusEl = toolContent.querySelector('[data-plugin-status]');
        const runtimeEl = toolContent.querySelector('[data-plugin-runtime]');
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
            if (action === 'open-plugin-folder') {
                const htmlPath = String(plugin.htmlFilePath || '').trim();
                if (!htmlPath) {
                    setStatus(t('tools.pluginFolderMissing', 'Plugin folder is not configured yet.'), 'warning');
                    return;
                }
                const result = await window.emubro.invoke('show-item-in-folder', htmlPath);
                if (result?.success === false) {
                    setStatus(result?.message || t('tools.status.openFolderFailed', 'Failed to open folder.'), 'error');
                }
                return;
            }
            if (action !== 'run') return;

            button.disabled = true;
            setStatus(isWebPlugin ? t('tools.runningPlugin', 'Running plugin...') : t('tools.runningTool', 'Launching tool...'), 'info');
            try {
                if (isWebPlugin) {
                    const files = await readPluginScaffoldFiles({
                        htmlFilePath: plugin.htmlFilePath,
                        cssFilePath: plugin.cssFilePath,
                        jsFilePath: plugin.jsFilePath
                    });
                    if (!files?.success) {
                        setStatus(files?.message || t('tools.runPluginFailed', 'Failed to run plugin files.'), 'error');
                        return;
                    }
                    const htmlSource = String(files?.html || '').trim();
                    const cssSource = String(files?.css || '');
                    const jsSource = String(files?.js || '').replace(/<\/script>/gi, '<\\/script>');
                    const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${cssSource}</style></head><body>${htmlSource}<script>${jsSource}</script></body></html>`;
                    if (runtimeEl) {
                        runtimeEl.hidden = false;
                        runtimeEl.innerHTML = `<iframe class="tool-plugin-frame" sandbox="allow-scripts allow-forms allow-modals allow-downloads" srcdoc="${escapeHtml(srcDoc)}"></iframe>`;
                    }
                    setStatus(t('tools.runPluginSuccess', 'Plugin is running below.'), 'success');
                } else {
                    const commandPath = String(plugin.commandPath || '').trim();
                    if (!commandPath) {
                        setStatus(t('tools.commandPathMissing', 'Command path is missing.'), 'warning');
                        return;
                    }
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
                }
            } catch (error) {
                setStatus(String(error?.message || error || (isWebPlugin ? t('tools.runPluginFailed', 'Failed to run plugin files.') : t('tools.status.launchFailed', 'Failed to launch tool.'))), 'error');
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
