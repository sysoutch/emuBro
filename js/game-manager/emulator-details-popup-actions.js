import {
    normalizeSuggestionProvider,
    loadSuggestionSettings,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings';

const EMULATOR_INFO_PIN_STORAGE_KEY = 'emuBro.emulatorInfoPopupPinned';
const EMULATOR_SELECTED_PATHS_STORAGE_KEY = 'emuBro.emulatorPreferredLaunchPath.v1';

export function createEmulatorDetailsPopupActions(deps = {}) {
    const emubro = deps.emubro || window.emubro;
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const log = deps.log || console;
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getEmulatorKey = deps.getEmulatorKey || ((emulator) => String(emulator?.id || emulator?.name || ''));
    const getEmulators = deps.getEmulators || (() => []);
    const fetchEmulators = deps.fetchEmulators || (async () => []);
    const getEmulatorConfig = deps.getEmulatorConfig || (() => ({}));
    const saveEmulatorOverrides = typeof deps.saveEmulatorOverrides === 'function'
        ? deps.saveEmulatorOverrides
        : ((emulator, overrides) => ({ ...getEmulatorConfig(emulator), ...(overrides || {}) }));
    const normalizeEmulatorDownloadLinks = deps.normalizeEmulatorDownloadLinks || ((raw) => raw || {});
    const hasAnyDownloadLink = deps.hasAnyDownloadLink || (() => false);
    const downloadAndInstallEmulatorAction = deps.downloadAndInstallEmulatorAction || (async () => false);
    const getDownloadedPackagePath = deps.getDownloadedPackagePath || (() => '');
    const launchEmulatorAction = deps.launchEmulatorAction || (async () => {});
    const openEmulatorInExplorerAction = deps.openEmulatorInExplorerAction || (async () => {});
    const openDownloadedPackageInExplorerAction = deps.openDownloadedPackageInExplorerAction || (async () => {});
    const openEmulatorWebsiteAction = deps.openEmulatorWebsiteAction || (async () => {});
    const openEmulatorConfigEditor = deps.openEmulatorConfigEditor || (async () => false);
    const openEmulatorDownloadLinkAction = deps.openEmulatorDownloadLinkAction || (async () => {});
    const localStorageRef = deps.localStorageRef || window.localStorage;
    const isLlmHelpersEnabled = typeof deps.isLlmHelpersEnabled === 'function' ? deps.isLlmHelpersEnabled : () => true;
    const alertUser = typeof deps.alertUser === 'function' ? deps.alertUser : ((message) => window.alert(String(message || '')));
    const t = (key, fallback) => {
        const safeKey = String(key || '').trim();
        try {
            const translated = i18n.t(safeKey);
            if (typeof translated === 'string') {
                const normalized = translated.trim();
                if (normalized && normalized !== safeKey) return normalized;
            } else if (typeof translated === 'number' && Number.isFinite(translated)) {
                return String(translated);
            }
        } catch (_error) {}
        return String(fallback || safeKey || '');
    };

    let emulatorInfoPopup = null;
    let emulatorInfoPopupPinned = false;
    try {
        emulatorInfoPopupPinned = localStorageRef.getItem(EMULATOR_INFO_PIN_STORAGE_KEY) === 'true';
    } catch (_e) {
        emulatorInfoPopupPinned = false;
    }

    function getEmulatorInfoPinIconMarkup() {
        return '<span class="icon-svg" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8.5 4h7l-1.5 4.8v3.1l1.4 1.5h-6.8l1.4-1.5V8.8L8.5 4Z"></path><path d="M12 13.4V20"></path></svg></span>';
    }

    function normalizeCompactText(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function buildCompactDescriptionPreview(text, expanded = false) {
        const normalized = normalizeCompactText(text);
        if (!normalized) return { text: t('emulator.details.noDescription', 'No description added yet.'), empty: true, canExpand: false };
        if (expanded || normalized.length <= 90) return { text: normalized, empty: false, canExpand: normalized.length > 90 };
        return { text: `${normalized.slice(0, 90).trimEnd()}...`, empty: false, canExpand: true };
    }

    function setCompactSummaryExpanded(root, expanded) {
        if (!root) return;
        const preview = root.querySelector('[data-compact-preview]');
        root.classList.toggle('is-summary-expanded', !!expanded);
        if (preview) preview.classList.toggle('is-expanded', !!expanded);
    }

    function setCompactEditorOpen(root, open) {
        if (!root) return;
        const preview = root.querySelector('[data-compact-preview]');
        const editor = root.querySelector('[data-compact-editor]');
        root.classList.toggle('is-editing', !!open);
        if (preview) preview.hidden = !!open;
        if (editor) editor.hidden = !open;
    }

    function setEmulatorInfoPinnedStorage(pinned) {
        emulatorInfoPopupPinned = !!pinned;
        try {
            localStorageRef.setItem(EMULATOR_INFO_PIN_STORAGE_KEY, emulatorInfoPopupPinned ? 'true' : 'false');
        } catch (_e) {}
    }

    function getEmulatorSelectionStorageKey(emulator) {
        const platformKey = String(emulator?.platformShortName || emulator?.platform || '').trim().toLowerCase();
        const nameKey = String(emulator?.name || '').trim().toLowerCase().replace(/[\s._-]+/g, '').replace(/[^a-z0-9]/g, '');
        const fallback = String(getEmulatorKey(emulator) || '').trim().toLowerCase();
        if (platformKey && nameKey) return `${platformKey}::${nameKey}`;
        return fallback || `${platformKey || 'unknown'}::${nameKey || 'emulator'}`;
    }

    function loadSelectedPathMap() {
        try {
            const raw = localStorageRef.getItem(EMULATOR_SELECTED_PATHS_STORAGE_KEY);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_e) {}
        return {};
    }

    function saveSelectedPathMap(map) {
        try {
            localStorageRef.setItem(EMULATOR_SELECTED_PATHS_STORAGE_KEY, JSON.stringify(map || {}));
        } catch (_e) {}
    }

    function setSelectedLaunchPath(emulator, pathValue) {
        const key = getEmulatorSelectionStorageKey(emulator);
        if (!key) return;
        const value = String(pathValue || '').trim();
        const map = loadSelectedPathMap();
        if (value) map[key] = value;
        else delete map[key];
        saveSelectedPathMap(map);
    }

    function applyEmulatorInfoPinnedState() {
        if (!emulatorInfoPopup) return;
        const pinBtn = emulatorInfoPopup.querySelector('#pin-emulator-info');
        const isDocked = emulatorInfoPopup.classList.contains('docked-right');
        const pinned = !!(isDocked || emulatorInfoPopupPinned);
        emulatorInfoPopup.classList.toggle('is-pinned', pinned);
        if (pinBtn) {
            pinBtn.classList.toggle('active', pinned);
            pinBtn.innerHTML = getEmulatorInfoPinIconMarkup();
            pinBtn.title = pinned ? 'Unpin' : 'Pin';
            pinBtn.setAttribute('aria-label', pinned ? 'Unpin emulator details window' : 'Pin emulator details window');
        }
    }

    function ensureEmulatorInfoPopup() {
        if (emulatorInfoPopup && emulatorInfoPopup.isConnected) return emulatorInfoPopup;
        emulatorInfoPopup = document.getElementById('emulator-info-modal');
        if (!emulatorInfoPopup) return null;
        if (emulatorInfoPopup.dataset.initialized === '1') return emulatorInfoPopup;

        const closeBtn = emulatorInfoPopup.querySelector('#close-emulator-info');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                emulatorInfoPopup.style.display = 'none';
                emulatorInfoPopup.classList.remove('active');
                if (emulatorInfoPopup.classList.contains('docked-right')) import('../docking-manager').then((m) => m.completelyRemoveFromDock('emulator-info-modal'));
                else import('../docking-manager').then((m) => m.removeFromDock('emulator-info-modal'));
                setEmulatorInfoPinnedStorage(false);
                applyEmulatorInfoPinnedState();
            });
        }

        const pinBtn = emulatorInfoPopup.querySelector('#pin-emulator-info');
        if (pinBtn) {
            pinBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const shouldPin = !emulatorInfoPopup.classList.contains('docked-right');
                import('../docking-manager').then((m) => {
                    m.toggleDock('emulator-info-modal', 'pin-emulator-info', shouldPin);
                    setEmulatorInfoPinnedStorage(shouldPin);
                    applyEmulatorInfoPinnedState();
                });
            });
        }

        import('../theme-manager').then((m) => m.makeDraggable('emulator-info-modal', 'emulator-info-header'));
        emulatorInfoPopup.dataset.initialized = '1';
        applyEmulatorInfoPinnedState();
        return emulatorInfoPopup;
    }

    function getLatestEmulatorRecord(target) {
        const key = getEmulatorKey(target);
        const rows = Array.isArray(getEmulators()) ? getEmulators() : [];
        return rows.find((row) => getEmulatorKey(row) === key) || target;
    }

    function getEmulatorFilePaths(emulator) {
        const ordered = [];
        const seen = new Set();
        const add = (rawPath) => {
            const value = String(rawPath || '').trim();
            if (!value) return;
            const key = value.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            ordered.push(value);
        };
        if (Array.isArray(emulator?.filePaths)) emulator.filePaths.forEach(add);
        add(emulator?.filePath);
        return ordered;
    }

    function getSelectedLaunchPath(emulator, filePaths = []) {
        const paths = Array.isArray(filePaths) ? filePaths : [];
        if (paths.length === 0) return '';
        const map = loadSelectedPathMap();
        const storageKey = getEmulatorSelectionStorageKey(emulator);
        const fromStorage = String(map[storageKey] || '').trim();
        if (fromStorage) {
            const match = paths.find((path) => String(path || '').trim().toLowerCase() === fromStorage.toLowerCase());
            if (match) return match;
        }
        const emulatorPath = String(emulator?.filePath || '').trim();
        if (emulatorPath) {
            const pathMatch = paths.find((path) => String(path || '').trim().toLowerCase() === emulatorPath.toLowerCase());
            if (pathMatch) return pathMatch;
        }
        return paths[0];
    }

    async function bindEmulatorDescriptionActions(textarea, saveBtn, llmBtn, statusEl, emulator, options = {}) {
        if (!textarea || !saveBtn || !emulator) return;
        const root = options.root || null;
        const summaryPreview = options.summaryPreview || null;
        const showMoreBtn = options.showMoreBtn || null;
        const editBtn = options.editBtn || null;
        const closeBtn = options.closeBtn || null;
        let summaryExpanded = false;

        const syncDescriptionPreview = (value = textarea.value) => {
            let preview = buildCompactDescriptionPreview(value, summaryExpanded);
            if (!preview.canExpand && summaryExpanded) {
                summaryExpanded = false;
                preview = buildCompactDescriptionPreview(value, false);
            }
            if (summaryPreview) {
                summaryPreview.textContent = preview.text;
                summaryPreview.classList.toggle('is-empty', preview.empty);
            }
            setCompactSummaryExpanded(root, summaryExpanded && preview.canExpand);
            if (showMoreBtn) {
                showMoreBtn.hidden = !preview.canExpand;
                showMoreBtn.textContent = summaryExpanded ? t('common.showLess', 'Show Less') : t('common.showMore', 'Show More');
            }
        };

        const setStatus = (message, level = 'info') => {
            if (!statusEl) return;
            statusEl.textContent = String(message || '');
            statusEl.dataset.level = String(level || 'info');
        };

        const saveDescription = async (description) => {
            const nextConfig = saveEmulatorOverrides(emulator, { description: String(description || '').trim() });
            emulator.description = String(nextConfig?.description || description || '').trim();
            textarea.value = emulator.description;
            syncDescriptionPreview(emulator.description);
            if (typeof options.onSaved === 'function') options.onSaved(nextConfig);
        };

        const initialDescription = String(getEmulatorConfig(emulator)?.description || textarea.value || '').trim();
        textarea.value = initialDescription;
        syncDescriptionPreview(initialDescription);

        textarea.addEventListener('input', () => syncDescriptionPreview(textarea.value));
        summaryPreview?.addEventListener('click', () => {
            setCompactEditorOpen(root, true);
            textarea.focus();
        });
        editBtn?.addEventListener('click', () => {
            setCompactEditorOpen(root, true);
            textarea.focus();
        });
        closeBtn?.addEventListener('click', () => setCompactEditorOpen(root, false));
        showMoreBtn?.addEventListener('click', () => {
            summaryExpanded = !summaryExpanded;
            syncDescriptionPreview(textarea.value);
        });

        saveBtn.addEventListener('click', async () => {
            const description = String(textarea.value || '').trim();
            saveBtn.disabled = true;
            setStatus(t('emulator.details.savingDescription', 'Saving description...'), 'info');
            try {
                await saveDescription(description);
                setStatus(t('emulator.details.descriptionSaved', 'Description saved.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || t('emulator.details.descriptionSaveFailed', 'Failed to save description.')), 'error');
            } finally {
                saveBtn.disabled = false;
            }
        });

        if (!llmBtn || !emubro || typeof emubro.invoke !== 'function') return;
        llmBtn.addEventListener('click', async () => {
            const settings = loadSuggestionSettings(localStorageRef);
            const provider = normalizeSuggestionProvider(settings.provider);
            const model = String(settings.models?.[provider] || '').trim();
            const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
            const apiKey = String(settings.apiKeys?.[provider] || '').trim();
            const routing = getSuggestionLlmRoutingSettings(settings);
            const currentConfig = getEmulatorConfig(emulator);

            if (routing.llmMode === 'client' && !routing.relayHostUrl) {
                setStatus('Set a relay host URL first in Settings -> AI / LLM.', 'error');
                return;
            }
            if (routing.llmMode !== 'client' && (!model || !baseUrl)) {
                setStatus('Configure your LLM provider/model first in Suggested view.', 'error');
                return;
            }
            if (routing.llmMode !== 'client' && (provider === 'openai' || provider === 'gemini') && !apiKey) {
                setStatus('API key is missing for the selected provider.', 'error');
                return;
            }

            const oldLabel = llmBtn.textContent;
            llmBtn.disabled = true;
            saveBtn.disabled = true;
            llmBtn.textContent = t('emulator.details.generating', 'Generating...');
            setStatus(t('emulator.details.generatingDescription', 'Generating description with LLM...'), 'info');
            try {
                const response = await emubro.invoke('suggestions:generate-description-for-emulator', {
                    provider,
                    model,
                    baseUrl,
                    apiKey,
                    ...routing,
                    maxChars: 420,
                    emulator: {
                        id: Number(emulator?.id || 0),
                        name: String(emulator?.name || ''),
                        platform: String(emulator?.platform || emulator?.platformShortName || ''),
                        platformShortName: String(emulator?.platformShortName || ''),
                        type: String(emulator?.type || 'standalone'),
                        website: String(currentConfig?.website || emulator?.website || ''),
                        description: String(textarea.value || currentConfig?.description || ''),
                        notes: String(currentConfig?.notes || ''),
                        filePath: String(emulator?.filePath || ''),
                        isInstalled: !!emulator?.isInstalled
                    }
                });

                if (!response?.success) {
                    throw new Error(String(response?.message || t('emulator.details.descriptionGenerateFailed', 'Failed to generate description.')));
                }
                const generated = String(response?.description || '').trim();
                if (!generated) {
                    throw new Error(t('emulator.details.descriptionGenerateEmpty', 'LLM returned an empty description.'));
                }
                textarea.value = generated;
                syncDescriptionPreview(generated);
                await saveDescription(generated);
                setStatus(t('emulator.details.descriptionGenerated', 'Description generated and saved.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || t('emulator.details.descriptionGenerateFailed', 'Failed to generate description.')), 'error');
            } finally {
                llmBtn.disabled = false;
                saveBtn.disabled = false;
                llmBtn.textContent = oldLabel;
            }
        });
    }

    function renderEmulatorDetailsMarkup(container, emulator) {
        if (!container || !emulator) return;
        const config = getEmulatorConfig(emulator);
        const shortName = String(emulator.platformShortName || 'unknown').toLowerCase();
        const platformIcon = `emubro-resources/platforms/${shortName}/logos/default.png`;
        const safeName = escapeHtml(emulator.name || 'Unknown Emulator');
        const safePlatform = escapeHtml(emulator.platform || emulator.platformShortName || t('gameDetails.unknown', 'Unknown'));
        const safeDescription = escapeHtml(String(config?.description || '').trim());
        const tagSummary = Array.isArray(config?.tags) && config.tags.length > 0
            ? config.tags.map((tag) => String(tag || '').trim()).filter(Boolean).join(', ')
            : t('emulator.details.noTagsAssigned', 'No tags assigned');
        const installed = !!emulator.isInstalled;
        const filePaths = getEmulatorFilePaths(emulator);
        const selectedLaunchPath = installed ? getSelectedLaunchPath(emulator, filePaths) : '';
        const statusClass = installed ? 'is-installed' : 'is-missing';
        const statusText = installed ? t('emulator.status.installed', 'Installed') : t('emulator.status.notInstalled', 'Not Installed');
        const safePathMarkup = installed && filePaths.length > 0
            ? filePaths.map((p) => `<span class="emulator-detail-path-line">${escapeHtml(p)}</span>`).join('')
            : `<span class="emulator-detail-path-line">${escapeHtml(t('emulator.details.notInstalledYet', 'Not installed yet'))}</span>`;
        const launchPathControlMarkup = installed && filePaths.length > 1
            ? `<div class="emulator-detail-launch-path-control"><label for="emu-launch-path-select">${escapeHtml(t('emulator.details.launchPath', 'Launch Path'))}</label><select id="emu-launch-path-select" data-emu-launch-path>${filePaths.map((p) => {
                const selected = String(p).toLowerCase() === String(selectedLaunchPath).toLowerCase() ? 'selected' : '';
                return `<option value="${escapeHtml(p)}" ${selected}>${escapeHtml(p)}</option>`;
            }).join('')}</select></div>`
            : '';
        const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
        const winDisabled = links.windows ? '' : 'disabled';
        const linuxDisabled = links.linux ? '' : 'disabled';
        const macDisabled = links.mac ? '' : 'disabled';
        const canDownload = hasAnyDownloadLink(emulator);
        const downloadDisabled = canDownload ? '' : 'disabled';
        const downloadedPackagePath = String(getDownloadedPackagePath(emulator) || '').trim();
        const showDownloadedSetupAction = !installed && !!downloadedPackagePath;
        const launchActionMarkup = installed ? `<button class="action-btn launch-btn" data-emu-popup-action="launch">${escapeHtml(t('buttons.launch', 'Launch'))}</button>` : '';
        const explorerActionMarkup = installed ? `<button class="action-btn" data-emu-popup-action="explorer">${escapeHtml(t('gameDetails.showInExplorer', 'Show in Explorer'))}</button>` : '';
        const downloadedSetupActionMarkup = showDownloadedSetupAction
            ? `<button class="action-btn" data-emu-popup-action="downloaded-package">${escapeHtml(t('emulator.details.showDownloadedSetup', 'Show Downloaded Setup'))}</button>`
            : '';
        const llmDescriptionMarkup = isLlmHelpersEnabled()
            ? `<button class="action-btn launch-btn" data-emu-description-llm type="button">${escapeHtml(t('gameDetails.generateDescriptionWithLlm', 'Generate with LLM'))}</button>`
            : '';

        container.innerHTML = `
        <div class="emulator-details-info">
            <div class="emulator-detail-media">
                <img src="${escapeHtml(platformIcon)}" alt="${safePlatform}" class="emulator-detail-icon" loading="lazy" onerror="this.style.display='none'" />
            </div>
            <div class="emulator-detail-meta">
                <p><strong>${escapeHtml(t('common.name', 'Name'))}:</strong> ${safeName}</p>
                <p><strong>${escapeHtml(t('gameDetails.platform', 'Platform'))}:</strong> ${safePlatform}</p>
                <p><strong>${escapeHtml(t('common.status', 'Status'))}:</strong> <span class="emulator-install-status ${statusClass}">${escapeHtml(statusText)}</span></p>
                <p><strong>${escapeHtml(t('common.tags', 'Tags'))}:</strong> ${escapeHtml(tagSummary)}</p>
                <p><strong>${escapeHtml(t('common.path', 'Path'))}:</strong> <span class="emulator-detail-path">${safePathMarkup}</span></p>
                ${launchPathControlMarkup}
            </div>
            <div class="emulator-detail-description-control" data-emu-description-section>
                <div class="game-detail-compact-header">
                    <label for="emu-description-input-${Number(emulator.id || 0)}">${escapeHtml(t('gameDetails.description', 'Description'))}</label>
                    <div class="game-detail-compact-toolbar">
                        <button class="action-btn small" data-emu-description-show-more type="button" hidden>${escapeHtml(t('common.showMore', 'Show More'))}</button>
                        <button class="action-btn small" data-emu-description-edit type="button">${escapeHtml(t('common.edit', 'Edit'))}</button>
                    </div>
                </div>
                <button class="game-detail-compact-preview emulator-detail-description-preview${safeDescription ? '' : ' is-empty'}" data-compact-preview data-emu-description-preview type="button"></button>
                <div class="game-detail-description-editor emulator-detail-description-editor" data-compact-editor data-emu-description-editor hidden>
                    <textarea id="emu-description-input-${Number(emulator.id || 0)}" data-emu-description-input rows="4" placeholder="${escapeHtml(t('emulator.details.addDescription', 'Add an emulator description...'))}">${safeDescription}</textarea>
                    <div class="game-detail-description-actions emulator-detail-description-actions">
                        <button class="action-btn" data-emu-description-save type="button">${escapeHtml(t('buttons.saveChanges', 'Save Changes'))}</button>
                        ${llmDescriptionMarkup}
                        <button class="action-btn" data-emu-description-close type="button">${escapeHtml(t('common.done', 'Done'))}</button>
                    </div>
                    <small class="game-detail-description-status emulator-detail-description-status" data-emu-description-status aria-live="polite"></small>
                </div>
            </div>
            <div class="emulator-detail-download-links">
                <button class="emulator-os-link" type="button" data-emu-download-os="windows" ${winDisabled}>Windows</button>
                <button class="emulator-os-link" type="button" data-emu-download-os="linux" ${linuxDisabled}>Linux</button>
                <button class="emulator-os-link" type="button" data-emu-download-os="mac" ${macDisabled}>Mac</button>
            </div>
            <div class="emulator-detail-actions">
                <button class="action-btn" data-emu-popup-action="download" ${downloadDisabled}>${escapeHtml(t('common.download', 'Download'))}</button>
                ${launchActionMarkup}
                ${explorerActionMarkup}
                ${downloadedSetupActionMarkup}
                <button class="action-btn" data-emu-popup-action="website">${escapeHtml(t('common.website', 'Website'))}</button>
                <button class="action-btn" data-emu-popup-action="edit">${escapeHtml(t('common.edit', 'Edit'))}</button>
            </div>
        </div>`;
    }

    function bindEmulatorDetailsActions(container, emulator, options = {}) {
        if (!container || !emulator) return;
        const installedPaths = getEmulatorFilePaths(emulator);
        let selectedLaunchPath = emulator?.isInstalled ? getSelectedLaunchPath(emulator, installedPaths) : '';

        const launchPathSelect = container.querySelector('[data-emu-launch-path]');
        if (launchPathSelect) {
            launchPathSelect.value = selectedLaunchPath || launchPathSelect.value;
            launchPathSelect.addEventListener('change', () => {
                selectedLaunchPath = String(launchPathSelect.value || '').trim();
                if (selectedLaunchPath) setSelectedLaunchPath(emulator, selectedLaunchPath);
            });
        }

        bindEmulatorDescriptionActions(
            container.querySelector('[data-emu-description-input]'),
            container.querySelector('[data-emu-description-save]'),
            container.querySelector('[data-emu-description-llm]'),
            container.querySelector('[data-emu-description-status]'),
            emulator,
            {
                root: container.querySelector('[data-emu-description-section]'),
                summaryPreview: container.querySelector('[data-emu-description-preview]'),
                showMoreBtn: container.querySelector('[data-emu-description-show-more]'),
                editBtn: container.querySelector('[data-emu-description-edit]'),
                closeBtn: container.querySelector('[data-emu-description-close]'),
                onSaved: (nextConfig) => {
                    emulator.description = String(nextConfig?.description || '').trim();
                }
            }
        ).catch((error) => {
            log.error('Failed to bind emulator description actions:', error);
        });

        const refreshAfterChange = async () => {
            await fetchEmulators();
            if (typeof options.onRefresh === 'function') options.onRefresh();
            const latest = getLatestEmulatorRecord(emulator);
            showEmulatorDetails(latest, options);
        };

        const actionButtons = container.querySelectorAll('[data-emu-popup-action]');
        actionButtons.forEach((button) => {
            button.addEventListener('click', async () => {
                const action = String(button.dataset.emuPopupAction || '').trim();
                if (!action) return;
                const originalLabel = button.textContent;
                const isBusyAction = action === 'download';
                if (isBusyAction) {
                    button.disabled = true;
                    button.textContent = t('common.downloading', 'Downloading...');
                }
                try {
                    if (action === 'download') {
                        const changed = await downloadAndInstallEmulatorAction(emulator);
                        if (changed) await refreshAfterChange();
                        return;
                    }
                    if (action === 'launch') {
                        const targetEmulator = selectedLaunchPath
                            ? { ...emulator, filePath: selectedLaunchPath, isInstalled: true }
                            : emulator;
                        await launchEmulatorAction(targetEmulator);
                        return;
                    }
                    if (action === 'explorer') {
                        const targetEmulator = selectedLaunchPath
                            ? { ...emulator, filePath: selectedLaunchPath, isInstalled: true }
                            : emulator;
                        await openEmulatorInExplorerAction(targetEmulator);
                        return;
                    }
                    if (action === 'downloaded-package') {
                        await openDownloadedPackageInExplorerAction(emulator);
                        return;
                    }
                    if (action === 'website') {
                        await openEmulatorWebsiteAction(emulator);
                        return;
                    }
                    if (action === 'edit') {
                        const changed = await openEmulatorConfigEditor(emulator);
                        if (changed) await refreshAfterChange();
                    }
                } finally {
                    if (isBusyAction) {
                        button.textContent = originalLabel;
                        button.disabled = false;
                    }
                }
            });
        });

        container.querySelectorAll('[data-emu-download-os]').forEach((button) => {
            button.addEventListener('click', async () => {
                const osKey = String(button.dataset.emuDownloadOs || '').trim().toLowerCase();
                await openEmulatorDownloadLinkAction(emulator, osKey);
            });
        });
    }

    function showEmulatorDetails(emulator, options = {}) {
        if (!emulator) return;
        const popup = ensureEmulatorInfoPopup();
        if (!popup) return;

        const popupTitle = popup.querySelector('#emulator-info-popup-title');
        const popupBody = popup.querySelector('#emulator-info-popup-body');
        if (popupTitle) popupTitle.textContent = emulator.name || 'Emulator Details';
        renderEmulatorDetailsMarkup(popupBody, emulator);
        bindEmulatorDetailsActions(popupBody, emulator, options);

        if (emulatorInfoPopupPinned || popup.classList.contains('docked-right')) {
            import('../docking-manager').then((m) => m.toggleDock('emulator-info-modal', 'pin-emulator-info', true));
            setEmulatorInfoPinnedStorage(true);
        } else {
            const hasManualPosition = !!(popup.style.left || popup.style.top || popup.classList.contains('moved'));
            popup.classList.toggle('moved', hasManualPosition);
            popup.style.display = 'flex';
            popup.classList.add('active');
            import('../theme-manager').then((m) => {
                if (typeof m.focusManagedModal === 'function') {
                    m.focusManagedModal('emulator-info-modal');
                }
                if (typeof m.recenterManagedModalIfMostlyOutOfView === 'function') {
                    m.recenterManagedModalIfMostlyOutOfView('emulator-info-modal', {
                        visibleThreshold: 0.5,
                        smooth: true
                    });
                }
            });
        }
        applyEmulatorInfoPinnedState();
    }

    return {
        showEmulatorDetails
    };
}
