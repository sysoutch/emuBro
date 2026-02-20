export async function openLibraryPathSettingsModal(options = {}) {
    const emubro = options.emubro;
    const getLibraryPathSettings = typeof options.getLibraryPathSettings === 'function'
        ? options.getLibraryPathSettings
        : async () => ({ scanFolders: [], gameFolders: [], emulatorFolders: [] });
    const saveLibraryPathSettings = typeof options.saveLibraryPathSettings === 'function'
        ? options.saveLibraryPathSettings
        : async () => {};
    const normalizePathList = typeof options.normalizePathList === 'function'
        ? options.normalizePathList
        : (values = []) => Array.from(new Set((Array.isArray(values) ? values : []).map((value) => String(value || '').trim()).filter(Boolean)));
    const normalizeLibrarySection = typeof options.normalizeLibrarySection === 'function'
        ? options.normalizeLibrarySection
        : ((section) => String(section || 'all').trim().toLowerCase() || 'all');
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function'
        ? options.getActiveLibrarySection
        : () => 'all';
    const setActiveLibrarySectionState = typeof options.setActiveLibrarySectionState === 'function'
        ? options.setActiveLibrarySectionState
        : () => {};
    const isLibraryTopSection = typeof options.isLibraryTopSection === 'function'
        ? options.isLibraryTopSection
        : () => true;
    const confirmDisableLlmHelpersFlow = typeof options.confirmDisableLlmHelpersFlow === 'function'
        ? options.confirmDisableLlmHelpersFlow
        : () => true;
    const setLlmHelpersEnabled = typeof options.setLlmHelpersEnabled === 'function'
        ? options.setLlmHelpersEnabled
        : () => {};
    const setLlmAllowUnknownTagsEnabled = typeof options.setLlmAllowUnknownTagsEnabled === 'function'
        ? options.setLlmAllowUnknownTagsEnabled
        : () => {};
    const openThemeManager = typeof options.openThemeManager === 'function' ? options.openThemeManager : () => {};
    const openLanguageManager = typeof options.openLanguageManager === 'function' ? options.openLanguageManager : () => {};
    const openProfileModal = typeof options.openProfileModal === 'function' ? options.openProfileModal : async () => {};
    const runBrowseSearch = typeof options.runBrowseSearch === 'function' ? options.runBrowseSearch : async () => {};
    const getBrowseScopeSelection = typeof options.getBrowseScopeSelection === 'function' ? options.getBrowseScopeSelection : () => 'both';
    const openFooterPanel = typeof options.openFooterPanel === 'function' ? options.openFooterPanel : () => {};
    const addFooterNotification = typeof options.addFooterNotification === 'function' ? options.addFooterNotification : () => {};
    const setActiveViewButton = typeof options.setActiveViewButton === 'function' ? options.setActiveViewButton : () => {};
    const setActiveLibrarySection = typeof options.setActiveLibrarySection === 'function' ? options.setActiveLibrarySection : async () => {};
    const LLM_HELPERS_ENABLED_KEY = String(options.llmHelpersEnabledKey || 'emuBro.llmHelpersEnabled');
    const LLM_ALLOW_UNKNOWN_TAGS_KEY = String(options.llmAllowUnknownTagsKey || 'emuBro.llmAllowUnknownTags');
    const SUGGESTED_SECTION_KEY = String(options.suggestedSectionKey || 'suggested');

    if (!emubro) return;

    let activeLibrarySection = normalizeLibrarySection(getActiveLibrarySection() || 'all');

    const loaded = await getLibraryPathSettings();
    const draft = {
        scanFolders: normalizePathList(loaded.scanFolders),
        gameFolders: normalizePathList(loaded.gameFolders),
        emulatorFolders: normalizePathList(loaded.emulatorFolders)
    };
    const generalDraft = {
        defaultSection: normalizeLibrarySection(localStorage.getItem('emuBro.defaultLibrarySection') || activeLibrarySection || 'all'),
        defaultView: String(localStorage.getItem('emuBro.defaultLibraryView') || (document.querySelector('.view-btn.active')?.dataset.view || 'cover')).toLowerCase(),
        showLoadIndicator: localStorage.getItem('emuBro.showLoadIndicator') !== 'false',
        autoOpenFooter: localStorage.getItem('emuBro.autoOpenFooter') !== 'false',
        llmHelpersEnabled: localStorage.getItem(LLM_HELPERS_ENABLED_KEY) !== 'false',
        llmAllowUnknownTags: localStorage.getItem(LLM_ALLOW_UNKNOWN_TAGS_KEY) === 'true'
    };
    if (!generalDraft.llmHelpersEnabled && generalDraft.defaultSection === SUGGESTED_SECTION_KEY) {
        generalDraft.defaultSection = 'all';
    }
    const importDraft = {
        preferCopyExternal: localStorage.getItem('emuBro.preferCopyExternal') !== 'false',
        enableNetworkScan: localStorage.getItem('emuBro.enableNetworkScan') !== 'false'
    };
    let activeTab = 'general';

    const overlay = document.createElement('div');
    overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:3600',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'padding:20px',
        'background:rgba(0,0,0,0.58)'
    ].join(';');

    const modal = document.createElement('div');
    modal.className = 'glass';
    modal.style.cssText = [
        'width:min(980px,100%)',
        'max-height:86vh',
        'overflow:auto',
        'background:var(--bg-secondary)',
        'border:1px solid var(--border-color)',
        'border-radius:14px',
        'padding:16px',
        'box-shadow:0 18px 42px rgba(0,0,0,0.45)'
    ].join(';');

    const renderList = (key, items, emptyLabel) => {
        const canRelocate = key === 'gameFolders' || key === 'emulatorFolders';
        if (!items.length) return `<div style="opacity:0.7;font-size:0.92rem;">${emptyLabel}</div>`;
        return `<div style="display:flex;flex-direction:column;gap:8px;">${items.map((p, idx) => `
            <div data-row="${idx}" style="display:flex;gap:8px;align-items:center;">
                <div style="flex:1;font-family:monospace;font-size:12px;padding:8px 10px;border:1px solid var(--border-color);border-radius:8px;background:var(--bg-primary);word-break:break-all;">${p}</div>
                ${canRelocate ? `<button type="button" class="action-btn small" data-relocate-index="${idx}" data-relocate-key="${key}">Relocate</button>` : ''}
                <button type="button" class="action-btn remove-btn small" data-remove-index="${idx}">Remove</button>
            </div>
        `).join('')}</div>`;
    };

    const section = (key, title, subtitle, placeholder, browseLabel, entries) => `
        <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;">
            <div>
                <h3 style="margin:0 0 4px 0;font-size:1rem;">${title}</h3>
                <p style="margin:0;color:var(--text-secondary);font-size:0.9rem;">${subtitle}</p>
            </div>
            <div data-list="${key}">${renderList(key, entries, 'No folders added yet.')}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <input type="text" data-input="${key}" placeholder="${placeholder}" style="flex:1;min-width:260px;" />
                <button type="button" class="action-btn" data-add-manual="${key}">Add Path</button>
                <button type="button" class="action-btn launch-btn" data-add-browse="${key}">${browseLabel}</button>
            </div>
        </section>
    `;

    const renderGeneralTab = () => `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Library Defaults</h3>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library Section</span>
                        <select data-setting="default-section">
                            <option value="all"${generalDraft.defaultSection === 'all' ? ' selected' : ''}>All Games</option>
                            <option value="installed"${generalDraft.defaultSection === 'installed' ? ' selected' : ''}>Installed</option>
                            <option value="recent"${generalDraft.defaultSection === 'recent' ? ' selected' : ''}>Recently Played</option>
                            ${generalDraft.llmHelpersEnabled ? `<option value="suggested"${generalDraft.defaultSection === 'suggested' ? ' selected' : ''}>Suggested</option>` : ''}
                            <option value="emulators"${generalDraft.defaultSection === 'emulators' ? ' selected' : ''}>Emulators</option>
                        </select>
                    </label>
                    <label style="display:flex;flex-direction:column;gap:6px;">
                        <span style="font-size:0.82rem;color:var(--text-secondary);">Default Library View</span>
                        <select data-setting="default-view">
                            <option value="cover"${generalDraft.defaultView === 'cover' ? ' selected' : ''}>Cover</option>
                            <option value="list"${generalDraft.defaultView === 'list' ? ' selected' : ''}>List</option>
                            <option value="table"${generalDraft.defaultView === 'table' ? ' selected' : ''}>Table</option>
                            <option value="slideshow"${generalDraft.defaultView === 'slideshow' ? ' selected' : ''}>Slideshow</option>
                            <option value="random"${generalDraft.defaultView === 'random' ? ' selected' : ''}>Random</option>
                        </select>
                    </label>
                </div>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="show-load-indicator"${generalDraft.showLoadIndicator ? ' checked' : ''} />
                    <span>Show progressive load indicator when more games are appended</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="auto-open-footer"${generalDraft.autoOpenFooter ? ' checked' : ''} />
                    <span>Auto-open the bottom panel when selecting a game</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" data-setting="llm-helpers-enabled"${generalDraft.llmHelpersEnabled ? ' checked' : ''} />
                    <span>Show AI/LLM helpers in UI (Suggested view, AI tag buttons, global AI tagging)</span>
                </label>
                <label style="display:flex;align-items:flex-start;gap:10px;">
                    <input type="checkbox" data-setting="llm-allow-unknown-tags"${generalDraft.llmAllowUnknownTags ? ' checked' : ''}${generalDraft.llmHelpersEnabled ? '' : ' disabled'} />
                    <span>Allow AI to suggest new tags not in your current tag catalog</span>
                </label>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Quick Access</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn" data-settings-open-theme>Open Theme Manager</button>
                    <button type="button" class="action-btn" data-settings-open-language>Open Language Manager</button>
                    <button type="button" class="action-btn launch-btn" data-settings-open-profile>Open Profile</button>
                </div>
            </section>
        </section>
    `;

    const renderImportTab = () => `
        <section style="display:grid;gap:12px;">
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Import Behavior</h3>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="prefer-copy-external"${importDraft.preferCopyExternal ? ' checked' : ''} />
                    <span>Prefer copy (instead of move) when importing from external drives</span>
                </label>
                <label style="display:flex;align-items:center;gap:10px;">
                    <input type="checkbox" data-setting="enable-network-scan"${importDraft.enableNetworkScan ? ' checked' : ''} />
                    <span>Allow network share scan targets in quick search</span>
                </label>
            </section>
            <section style="border:1px solid var(--border-color);border-radius:12px;padding:12px;display:grid;gap:10px;">
                <h3 style="margin:0;font-size:1rem;">Scan Shortcuts</h3>
                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button type="button" class="action-btn launch-btn" data-settings-quick-search>Run Quick Search</button>
                    <button type="button" class="action-btn" data-settings-custom-search>Run Custom Search</button>
                    <button type="button" class="action-btn" data-settings-open-browse-tab>Open Browse Computer Tab</button>
                </div>
            </section>
        </section>
    `;

    const render = () => {
        const tabContent = activeTab === 'general'
            ? renderGeneralTab()
            : (activeTab === 'library-paths'
                ? `
                    <div style="display:grid;gap:12px;">
                        ${section(
                            'scanFolders',
                            'Scan Folders',
                            'Scanned when you click Search Games. Supports local folders and network shares.',
                            '\\\\server\\share\\games or D:\\\\ROMS',
                            'Pick Folder',
                            draft.scanFolders
                        )}
                        ${section(
                            'gameFolders',
                            'Managed Game Folders',
                            'Destination folders used when importing from USB/CD/network and choosing Copy/Move.',
                            'D:\\\\EmuLibrary\\\\Games',
                            'Pick Folder',
                            draft.gameFolders
                        )}
                        ${section(
                            'emulatorFolders',
                            'Managed Emulator Folders',
                            'Optional destination folders for emulator executables.',
                            'D:\\\\EmuLibrary\\\\Emulators',
                            'Pick Folder',
                            draft.emulatorFolders
                        )}
                    </div>
                `
                : renderImportTab());

        modal.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px;">
                <h2 style="margin:0;font-size:1.15rem;">Settings</h2>
                <button type="button" class="close-btn" data-close-modal>&times;</button>
            </div>
            <p style="margin:0 0 12px 0;color:var(--text-secondary);font-size:0.92rem;">
                Configure library behavior, scanning paths, and import defaults.
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
                <button type="button" class="action-btn${activeTab === 'general' ? ' launch-btn' : ''}" data-settings-tab="general">General</button>
                <button type="button" class="action-btn${activeTab === 'library-paths' ? ' launch-btn' : ''}" data-settings-tab="library-paths">Library Paths</button>
                <button type="button" class="action-btn${activeTab === 'import' ? ' launch-btn' : ''}" data-settings-tab="import">Import & Scan</button>
            </div>
            <div style="display:grid;gap:12px;">
                ${tabContent}
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px;flex-wrap:wrap;">
                <button type="button" class="action-btn" data-close-modal>Cancel</button>
                <button type="button" class="action-btn launch-btn" data-save-settings>Save</button>
            </div>
        `;

        const closeBtns = modal.querySelectorAll('[data-close-modal]');
        closeBtns.forEach((btn) => btn.addEventListener('click', () => overlay.remove()));

        modal.querySelectorAll('[data-settings-tab]').forEach((btn) => {
            btn.addEventListener('click', () => {
                activeTab = String(btn.dataset.settingsTab || 'general');
                render();
            });
        });

        const defaultSectionSelect = modal.querySelector('[data-setting="default-section"]');
        if (defaultSectionSelect) {
            defaultSectionSelect.addEventListener('change', () => {
                generalDraft.defaultSection = normalizeLibrarySection(defaultSectionSelect.value || 'all');
            });
        }

        const defaultViewSelect = modal.querySelector('[data-setting="default-view"]');
        if (defaultViewSelect) {
            defaultViewSelect.addEventListener('change', () => {
                generalDraft.defaultView = String(defaultViewSelect.value || 'cover').toLowerCase();
            });
        }

        const showIndicatorToggle = modal.querySelector('[data-setting="show-load-indicator"]');
        if (showIndicatorToggle) {
            showIndicatorToggle.addEventListener('change', () => {
                generalDraft.showLoadIndicator = !!showIndicatorToggle.checked;
            });
        }

        const autoOpenFooterToggle = modal.querySelector('[data-setting="auto-open-footer"]');
        if (autoOpenFooterToggle) {
            autoOpenFooterToggle.addEventListener('change', () => {
                generalDraft.autoOpenFooter = !!autoOpenFooterToggle.checked;
            });
        }

        const llmHelpersToggle = modal.querySelector('[data-setting="llm-helpers-enabled"]');
        if (llmHelpersToggle) {
            llmHelpersToggle.addEventListener('change', () => {
                const shouldEnable = !!llmHelpersToggle.checked;
                if (!shouldEnable) {
                    const confirmed = confirmDisableLlmHelpersFlow();
                    if (!confirmed) {
                        llmHelpersToggle.checked = true;
                        generalDraft.llmHelpersEnabled = true;
                        return;
                    }
                }
                generalDraft.llmHelpersEnabled = shouldEnable;
                if (!generalDraft.llmHelpersEnabled && generalDraft.defaultSection === SUGGESTED_SECTION_KEY) {
                    generalDraft.defaultSection = 'all';
                }
                render();
            });
        }

        const llmAllowUnknownTagsToggle = modal.querySelector('[data-setting="llm-allow-unknown-tags"]');
        if (llmAllowUnknownTagsToggle) {
            llmAllowUnknownTagsToggle.addEventListener('change', () => {
                generalDraft.llmAllowUnknownTags = !!llmAllowUnknownTagsToggle.checked;
            });
        }

        const preferCopyToggle = modal.querySelector('[data-setting="prefer-copy-external"]');
        if (preferCopyToggle) {
            preferCopyToggle.addEventListener('change', () => {
                importDraft.preferCopyExternal = !!preferCopyToggle.checked;
            });
        }

        const networkScanToggle = modal.querySelector('[data-setting="enable-network-scan"]');
        if (networkScanToggle) {
            networkScanToggle.addEventListener('change', () => {
                importDraft.enableNetworkScan = !!networkScanToggle.checked;
            });
        }

        const openThemeBtn = modal.querySelector('[data-settings-open-theme]');
        if (openThemeBtn) openThemeBtn.addEventListener('click', () => openThemeManager());

        const openLanguageBtn = modal.querySelector('[data-settings-open-language]');
        if (openLanguageBtn) openLanguageBtn.addEventListener('click', () => openLanguageManager());

        const openProfileBtn = modal.querySelector('[data-settings-open-profile]');
        if (openProfileBtn) openProfileBtn.addEventListener('click', () => openProfileModal());

        const quickSearchBtn = modal.querySelector('[data-settings-quick-search]');
        if (quickSearchBtn) quickSearchBtn.addEventListener('click', async () => runBrowseSearch('quick', { scope: getBrowseScopeSelection() }));

        const customSearchBtn = modal.querySelector('[data-settings-custom-search]');
        if (customSearchBtn) customSearchBtn.addEventListener('click', async () => runBrowseSearch('custom', { scope: getBrowseScopeSelection() }));

        const openBrowseTabBtn = modal.querySelector('[data-settings-open-browse-tab]');
        if (openBrowseTabBtn) {
            openBrowseTabBtn.addEventListener('click', () => {
                overlay.remove();
                openFooterPanel('browse');
            });
        }

        const attachSectionHandlers = (key) => {
            const listWrap = modal.querySelector(`[data-list="${key}"]`);
            if (listWrap) {
                listWrap.querySelectorAll('[data-remove-index]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const idx = Number(btn.dataset.removeIndex);
                        if (!Number.isFinite(idx) || idx < 0) return;
                        draft[key] = draft[key].filter((_p, i) => i !== idx);
                        render();
                    });
                });
                listWrap.querySelectorAll('[data-relocate-index]').forEach((btn) => {
                    btn.addEventListener('click', async () => {
                        const idx = Number(btn.dataset.relocateIndex);
                        if (!Number.isFinite(idx) || idx < 0) return;
                        const sourcePath = String(draft[key]?.[idx] || '').trim();
                        if (!sourcePath) return;

                        const pick = await emubro.invoke('open-file-dialog', {
                            title: 'Select destination folder',
                            properties: ['openDirectory', 'createDirectory'],
                            defaultPath: sourcePath
                        });
                        if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;

                        const targetPath = String(pick.filePaths[0] || '').trim();
                        if (!targetPath || targetPath.toLowerCase() === sourcePath.toLowerCase()) return;

                        btn.disabled = true;
                        const previousLabel = btn.textContent;
                        btn.textContent = 'Moving...';
                        try {
                            const previewResult = await emubro.invoke('settings:preview-relocate-managed-folder', {
                                kind: key,
                                sourcePath,
                                targetPath
                            });
                            if (!previewResult?.success) {
                                throw new Error(previewResult?.message || 'Failed to preview relocation.');
                            }

                            const confirmResult = await emubro.invoke('settings:confirm-relocate-preview', {
                                kind: key,
                                sourcePath,
                                targetPath,
                                preview: previewResult?.preview || {}
                            });
                            if (!confirmResult?.success) {
                                throw new Error(confirmResult?.message || 'Failed to confirm relocation.');
                            }
                            if (!confirmResult?.proceed) {
                                addFooterNotification('Relocation canceled.', 'warning');
                                return;
                            }

                            const result = await emubro.invoke('settings:relocate-managed-folder', {
                                kind: key,
                                sourcePath,
                                targetPath,
                                conflictPolicy: String(confirmResult?.policy || '').trim()
                            });
                            if (!result?.success) {
                                if (result?.canceled) {
                                    addFooterNotification('Relocation canceled.', 'warning');
                                    return;
                                }
                                throw new Error(result?.message || 'Failed to relocate folder.');
                            }

                            const nextSettings = result?.settings;
                            if (nextSettings && typeof nextSettings === 'object') {
                                draft.scanFolders = normalizePathList(nextSettings.scanFolders);
                                draft.gameFolders = normalizePathList(nextSettings.gameFolders);
                                draft.emulatorFolders = normalizePathList(nextSettings.emulatorFolders);
                            } else {
                                draft[key] = normalizePathList(
                                    draft[key].map((entryPath, entryIndex) => entryIndex === idx ? targetPath : entryPath)
                                );
                            }

                            const stats = result?.stats || {};
                            addFooterNotification(
                                `Relocated folder. Moved: ${Number(stats.moved || 0)}, replaced: ${Number(stats.replaced || 0)}, kept both: ${Number(stats.keptBoth || 0)}, skipped: ${Number(stats.skipped || 0)}.`,
                                'success'
                            );
                            render();
                        } catch (error) {
                            alert(error?.message || 'Failed to relocate managed folder.');
                        } finally {
                            btn.disabled = false;
                            btn.textContent = previousLabel;
                        }
                    });
                });
            }

            const addManualBtn = modal.querySelector(`[data-add-manual="${key}"]`);
            const input = modal.querySelector(`[data-input="${key}"]`);
            if (addManualBtn && input) {
                addManualBtn.addEventListener('click', () => {
                    const val = String(input.value || '').trim();
                    if (!val) return;
                    draft[key] = normalizePathList([...draft[key], val]);
                    render();
                });
            }

            const addBrowseBtn = modal.querySelector(`[data-add-browse="${key}"]`);
            if (addBrowseBtn) {
                addBrowseBtn.addEventListener('click', async () => {
                    const pick = await emubro.invoke('open-file-dialog', {
                        title: 'Select folder',
                        properties: ['openDirectory']
                    });
                    if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
                    draft[key] = normalizePathList([...draft[key], pick.filePaths[0]]);
                    render();
                });
            }
        };

        attachSectionHandlers('scanFolders');
        attachSectionHandlers('gameFolders');
        attachSectionHandlers('emulatorFolders');

        const saveBtn = modal.querySelector('[data-save-settings]');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                try {
                    await saveLibraryPathSettings(draft);
                    localStorage.setItem('emuBro.defaultLibrarySection', generalDraft.defaultSection);
                    localStorage.setItem('emuBro.defaultLibraryView', generalDraft.defaultView);
                    localStorage.setItem('emuBro.showLoadIndicator', generalDraft.showLoadIndicator ? 'true' : 'false');
                    localStorage.setItem('emuBro.autoOpenFooter', generalDraft.autoOpenFooter ? 'true' : 'false');
                    setLlmHelpersEnabled(generalDraft.llmHelpersEnabled, { persist: true, rerender: false });
                    setLlmAllowUnknownTagsEnabled(generalDraft.llmAllowUnknownTags, { persist: true });
                    localStorage.setItem('emuBro.preferCopyExternal', importDraft.preferCopyExternal ? 'true' : 'false');
                    localStorage.setItem('emuBro.enableNetworkScan', importDraft.enableNetworkScan ? 'true' : 'false');

                    activeLibrarySection = normalizeLibrarySection(generalDraft.defaultSection || 'all');
                    setActiveLibrarySectionState(activeLibrarySection);
                    setActiveViewButton(generalDraft.defaultView || 'cover');
                    if (isLibraryTopSection()) {
                        await setActiveLibrarySection(activeLibrarySection);
                    }
                    overlay.remove();
                    addFooterNotification('Settings saved.', 'success');
                } catch (error) {
                    alert(error?.message || 'Failed to save settings.');
                }
            });
        }
    };

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.remove();
    });

    render();
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
}
