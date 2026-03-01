function formatBytes(byteCount) {
    const value = Number(byteCount || 0);
    if (!Number.isFinite(value) || value <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = value;
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index += 1;
    }
    const decimals = size >= 100 ? 0 : (size >= 10 ? 1 : 2);
    return `${size.toFixed(decimals)} ${units[index]}`;
}

export function renderBiosManagerTool({ t, escapeHtml }) {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content';
    toolContent.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
            <div>
                <h3 style="margin:0 0 6px 0;">${escapeHtml(t('tools.biosManager', 'BIOS Manager'))}</h3>
                <p style="margin:0;color:var(--text-secondary);">${escapeHtml(t('tools.biosManagerDesc', 'Manage BIOS files required by your emulator platforms.'))}</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                <button type="button" class="action-btn" data-bios-action="refresh">${escapeHtml(t('buttons.refresh', 'Refresh'))}</button>
                <button type="button" class="action-btn" data-bios-action="open-shared">${escapeHtml(t('tools.openSharedBiosFolder', 'Open Shared Folder'))}</button>
            </div>
        </div>
        <p class="tool-output" data-bios-status style="margin-top:10px;"></p>
        <div data-bios-root style="font-family:monospace;font-size:12px;color:var(--text-secondary);margin-bottom:10px;"></div>
        <div data-bios-list style="display:grid;gap:10px;"></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-bios-status]');
    const rootEl = toolContent.querySelector('[data-bios-root]');
    const listEl = toolContent.querySelector('[data-bios-list]');

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = String(level || 'info');
    };

    const openPlatformFolder = async (platformShortName) => {
        const result = await window.emubro.invoke('bios:open-folder', { platformShortName });
        if (!result?.success) {
            setStatus(result?.message || t('tools.biosOpenFolderFailed', 'Failed to open BIOS folder.'), 'error');
        }
    };

    const addFilesForPlatform = async (platformShortName) => {
        const pick = await window.emubro.invoke('open-file-dialog', {
            title: t('tools.selectBiosFiles', 'Select BIOS file(s)'),
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: t('tools.fileDialogBiosFiles', 'BIOS Files'), extensions: ['bin', 'rom', 'bios', 'img', 'zip', '7z'] },
                { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
            ]
        });
        if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return false;

        const result = await window.emubro.invoke('bios:add-files', {
            platformShortName,
            filePaths: pick.filePaths
        });
        if (!result?.success) {
            setStatus(result?.message || t('tools.biosAddFailed', 'Failed to add BIOS files.'), 'error');
            return false;
        }
        setStatus(
            t('tools.biosAddSummary', 'Added {{added}} BIOS file(s), skipped {{skipped}}.', {
                added: Number(result?.added || 0),
                skipped: Number(result?.skipped || 0)
            }),
            'success'
        );
        return true;
    };

    const renderPlatformRows = (rows = []) => {
        if (!listEl) return;
        if (!rows.length) {
            listEl.innerHTML = `<div class="tool-output">${escapeHtml(t('tools.biosNoPlatforms', 'No BIOS platforms found.'))}</div>`;
            return;
        }
        listEl.innerHTML = rows.map((row) => {
            const shortName = String(row?.shortName || '').trim().toLowerCase();
            const requiredBy = Array.isArray(row?.requiredBy) ? row.requiredBy : [];
            const files = Array.isArray(row?.files) ? row.files : [];
            const requirementText = row?.biosRequired
                ? t('tools.biosRequiredBy', 'Required by: {{list}}', { list: requiredBy.join(', ') || 'Unknown' })
                : t('tools.biosOptional', 'Optional platform BIOS folder');
            return `
                <article data-bios-platform="${escapeHtml(shortName)}" style="border:1px solid var(--border-color);border-radius:12px;padding:12px;background:color-mix(in srgb, var(--bg-primary), transparent 12%);display:grid;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;">
                        <div>
                            <h4 style="margin:0 0 4px 0;">${escapeHtml(row?.name || shortName.toUpperCase())} (${escapeHtml(shortName)})</h4>
                            <p style="margin:0;color:var(--text-secondary);font-size:0.85rem;">${escapeHtml(requirementText)}</p>
                        </div>
                        <div style="display:flex;gap:8px;flex-wrap:wrap;">
                            <button type="button" class="action-btn small" data-bios-action="add" data-bios-platform="${escapeHtml(shortName)}">${escapeHtml(t('tools.addBiosFiles', 'Add BIOS Files'))}</button>
                            <button type="button" class="action-btn small" data-bios-action="open" data-bios-platform="${escapeHtml(shortName)}">${escapeHtml(t('tools.openFolder', 'Open Folder'))}</button>
                        </div>
                    </div>
                    <div style="font-family:monospace;font-size:12px;color:var(--text-secondary);word-break:break-all;">${escapeHtml(String(row?.folderPath || '').trim())}</div>
                    <div style="font-size:0.84rem;color:var(--text-secondary);">
                        ${escapeHtml(t('tools.biosFileCount', '{{count}} file(s)', { count: Number(row?.fileCount || 0) }))}
                    </div>
                    <div style="display:grid;gap:6px;">
                        ${files.length
                            ? files.map((file) => `
                                <div style="display:flex;justify-content:space-between;gap:8px;border:1px solid color-mix(in srgb, var(--border-color), transparent 18%);border-radius:8px;padding:6px 8px;background:color-mix(in srgb, var(--bg-secondary), transparent 22%);">
                                    <span style="word-break:break-all;">${escapeHtml(file?.name || '')}</span>
                                    <span style="white-space:nowrap;color:var(--text-secondary);">${escapeHtml(formatBytes(file?.size || 0))}</span>
                                </div>
                            `).join('')
                            : `<div style="opacity:0.7;">${escapeHtml(t('tools.biosNoFiles', 'No BIOS files in this folder yet.'))}</div>`
                        }
                    </div>
                </article>
            `;
        }).join('');
    };

    const load = async () => {
        setStatus(t('tools.loading', 'Loading...'), 'info');
        try {
            const result = await window.emubro.invoke('bios:list');
            if (!result?.success) {
                setStatus(result?.message || t('tools.biosLoadFailed', 'Failed to load BIOS data.'), 'error');
                return;
            }
            if (rootEl) {
                rootEl.textContent = `${t('tools.biosRootPath', 'BIOS Root')}: ${String(result?.rootPath || '').trim()}`;
            }
            renderPlatformRows(result?.platforms || []);
            setStatus(t('tools.biosLoaded', 'BIOS data loaded.'), 'success');
        } catch (error) {
            setStatus(error?.message || t('tools.biosLoadFailed', 'Failed to load BIOS data.'), 'error');
        }
    };

    toolContent.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-bios-action]');
        if (!button) return;
        const action = String(button.dataset.biosAction || '').trim();
        const platformShortName = String(button.dataset.biosPlatform || '').trim().toLowerCase() || 'shared';

        if (action === 'refresh') {
            await load();
            return;
        }
        if (action === 'open-shared') {
            await openPlatformFolder('shared');
            return;
        }
        if (action === 'open') {
            await openPlatformFolder(platformShortName);
            return;
        }
        if (action === 'add') {
            const changed = await addFilesForPlatform(platformShortName);
            if (changed) await load();
        }
    });

    void load();
}
