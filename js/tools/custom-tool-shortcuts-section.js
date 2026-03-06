const CUSTOM_TOOL_SHORTCUTS_KEY = 'emuBro.customToolShortcuts.v1';
const CUSTOM_TOOL_DROP_ACTIVE_CLASS = 'is-drag-over';
const WINDOWS_EXECUTABLE_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.ps1', '.lnk', '.com']);
const customToolIconCache = new Map();

function normalizePathForCompare(inputPath) {
    const normalized = String(inputPath || '').trim();
    if (!normalized) return '';
    return (window?.emubro?.platform === 'win32') ? normalized.toLowerCase() : normalized;
}

function getFileNameFromPath(filePath) {
    const normalized = String(filePath || '').replace(/\\/g, '/');
    const fileName = normalized.split('/').pop() || '';
    return fileName.trim();
}

function deriveShortcutName(filePath, t) {
    const fileName = getFileNameFromPath(filePath);
    if (!fileName) return t('tools.customToolFallbackName', 'Custom Tool');
    const withoutExt = fileName.replace(/\.[^/.\\]+$/, '').trim();
    return withoutExt || fileName;
}

function getShortcutInitial(name) {
    const text = String(name || '').trim();
    if (!text) return '?';
    return text.charAt(0).toUpperCase();
}

function getPathExtension(filePath) {
    const fileName = getFileNameFromPath(filePath);
    const match = fileName.match(/(\.[^/.\\]+)$/);
    return match ? match[1].toLowerCase() : '';
}

function deriveWorkingDirectory(filePath) {
    const normalized = String(filePath || '').trim();
    if (!normalized) return '';
    const slash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    if (slash <= 0) return '';
    return normalized.slice(0, slash);
}

function isSupportedShortcutPath(filePath) {
    const pathValue = String(filePath || '').trim();
    if (!pathValue) return false;
    if (window?.emubro?.platform !== 'win32') return true;
    const ext = getPathExtension(pathValue);
    return WINDOWS_EXECUTABLE_EXTENSIONS.has(ext);
}

async function getCustomToolIconDataUrl(filePath) {
    const normalizedPath = String(filePath || '').trim();
    if (!normalizedPath) return '';
    const cacheKey = normalizePathForCompare(normalizedPath);
    if (cacheKey && customToolIconCache.has(cacheKey)) {
        return String(customToolIconCache.get(cacheKey) || '');
    }

    try {
        const result = await window.emubro.invoke('get-file-icon-data-url', normalizedPath);
        const dataUrl = String(result?.dataUrl || '').trim();
        if (cacheKey && dataUrl) customToolIconCache.set(cacheKey, dataUrl);
        return dataUrl;
    } catch (_error) {
        return '';
    }
}

function normalizeShortcutRecord(raw, t) {
    const filePath = String(raw?.filePath || '').trim();
    if (!filePath) return null;
    return {
        id: String(raw?.id || `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name: String(raw?.name || deriveShortcutName(filePath, t)).trim() || deriveShortcutName(filePath, t),
        filePath,
        args: String(raw?.args || '').trim(),
        workingDirectory: String(raw?.workingDirectory || deriveWorkingDirectory(filePath)).trim(),
        runAsAdmin: !!raw?.runAsAdmin,
        runAsUser: String(raw?.runAsUser || '').trim(),
        createdAt: Number(raw?.createdAt || Date.now())
    };
}

function loadCustomToolShortcuts(t) {
    try {
        const raw = localStorage.getItem(CUSTOM_TOOL_SHORTCUTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => normalizeShortcutRecord(entry, t))
            .filter((entry) => !!entry);
    } catch (_error) {
        return [];
    }
}

function saveCustomToolShortcuts(rows, t) {
    const normalizedRows = Array.isArray(rows)
        ? rows.map((entry) => normalizeShortcutRecord(entry, t)).filter((entry) => !!entry)
        : [];
    localStorage.setItem(CUSTOM_TOOL_SHORTCUTS_KEY, JSON.stringify(normalizedRows));
}

function addCustomToolShortcutsFromPaths(paths, t) {
    const existing = loadCustomToolShortcuts(t);
    const seen = new Set(existing.map((entry) => normalizePathForCompare(entry.filePath)));
    let added = 0;
    let duplicate = 0;
    let unsupported = 0;

    (Array.isArray(paths) ? paths : []).forEach((rawPath) => {
        const filePath = String(rawPath || '').trim();
        if (!filePath) return;
        if (!isSupportedShortcutPath(filePath)) {
            unsupported += 1;
            return;
        }
        const key = normalizePathForCompare(filePath);
        if (!key || seen.has(key)) {
            duplicate += 1;
            return;
        }
        seen.add(key);
        existing.push({
            id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: deriveShortcutName(filePath, t),
            filePath,
            args: '',
            workingDirectory: deriveWorkingDirectory(filePath),
            runAsAdmin: false,
            runAsUser: '',
            createdAt: Date.now()
        });
        added += 1;
    });

    saveCustomToolShortcuts(existing, t);
    return { added, duplicate, unsupported };
}

function resolveDroppedFilePath(file) {
    try {
        if (window?.emubro?.getPathForFile) {
            const resolved = window.emubro.getPathForFile(file);
            if (resolved) return String(resolved).trim();
        }
    } catch (_error) {}

    const fallbackPath = String(file?.path || '').trim();
    return fallbackPath;
}

async function pickAndAddCustomTools(renderList, setStatus, t) {
    try {
        const result = await window.emubro.invoke('open-file-dialog', {
            title: t('tools.customDialogTitle', 'Select custom tool executable(s)'),
            properties: ['openFile', 'multiSelections'],
            filters: [
                { name: t('tools.fileDialogExecutableFiles', 'Executable Files'), extensions: ['exe', 'bat', 'cmd', 'ps1', 'lnk', 'com'] },
                { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
            ]
        });
        if (result?.canceled) return;
        const filePaths = Array.isArray(result?.filePaths) ? result.filePaths : [];
        const summary = addCustomToolShortcutsFromPaths(filePaths, t);
        renderList();
        if (summary.added > 0) {
            setStatus(t('tools.status.addedShortcuts', 'Added {{count}} shortcut(s).', { count: summary.added }), 'success');
            return;
        }
        if (summary.unsupported > 0) {
            setStatus(t('tools.status.noSupportedExecutablesSelected', 'No supported executables were selected.'), 'warning');
            return;
        }
        setStatus(t('tools.status.noNewShortcuts', 'No new shortcuts were added.'), 'warning');
    } catch (error) {
        setStatus(t('tools.status.addShortcutFailed', 'Failed to add shortcut: {{message}}', { message: String(error?.message || error) }), 'error');
    }
}

async function launchCustomTool(shortcut, setStatus, t) {
    if (!shortcut?.filePath) return;
    const result = await window.emubro.invoke('launch-emulator', {
        filePath: shortcut.filePath,
        args: String(shortcut.args || ''),
        workingDirectory: String(shortcut.workingDirectory || ''),
        runAsAdmin: !!shortcut.runAsAdmin,
        runAsUser: String(shortcut.runAsUser || ''),
        name: shortcut.name
    });
    if (!result?.success) {
        setStatus(result?.message || t('tools.status.launchFailed', 'Failed to launch tool.'), 'error');
        return;
    }
    setStatus(t('tools.status.launchedTool', 'Launched {{name}}.', { name: shortcut.name }), 'success');
}

function editCustomToolShortcut(shortcuts, shortcut, renderList, setStatus, t) {
    const nextName = window.prompt(
        t('tools.editNamePrompt', 'Tool name:'),
        String(shortcut?.name || '')
    );
    if (nextName === null) return;

    const nextArgs = window.prompt(
        t('tools.editArgsPrompt', 'Arguments (optional):'),
        String(shortcut?.args || '')
    );
    if (nextArgs === null) return;

    const suggestedWorkingDir = String(shortcut?.workingDirectory || deriveWorkingDirectory(shortcut?.filePath || '') || '').trim();
    const nextWorkingDirectory = window.prompt(
        t('tools.editWorkingDirPrompt', 'Working directory (optional):'),
        suggestedWorkingDir
    );
    if (nextWorkingDirectory === null) return;

    const nextRunAsUser = window.prompt(
        t('tools.editRunAsUserPrompt', 'Run as user (optional):'),
        String(shortcut?.runAsUser || '')
    );
    if (nextRunAsUser === null) return;

    const runAsAdmin = window.confirm(
        t('tools.editRunAsAdminConfirm', 'Run this tool with admin/root privileges?\n\nOK = yes, Cancel = no')
    );

    const nameNormalized = String(nextName || '').trim() || deriveShortcutName(shortcut.filePath, t);
    const updated = shortcuts.map((entry) => {
        if (entry.id !== shortcut.id) return entry;
        return {
            ...entry,
            name: nameNormalized,
            args: String(nextArgs || '').trim(),
            workingDirectory: String(nextWorkingDirectory || '').trim(),
            runAsUser: String(nextRunAsUser || '').trim(),
            runAsAdmin: !!runAsAdmin
        };
    });
    saveCustomToolShortcuts(updated, t);
    renderList();
    setStatus(t('tools.status.updatedTool', 'Updated {{name}}.', { name: nameNormalized }), 'success');
}

export function createCustomToolShortcutsSection({ t, escapeHtml }) {
    const section = document.createElement('section');
    section.className = 'custom-tools-section glass';
    section.innerHTML = `
        <div class="custom-tools-header">
            <h3>${escapeHtml(t('tools.customShortcutsTitle', 'Custom Tool Shortcuts'))}</h3>
            <button type="button" class="action-btn" data-custom-tool-action="add">${escapeHtml(t('tools.addExe', 'Add .exe'))}</button>
        </div>
        <p class="custom-tools-subtitle">${escapeHtml(t('tools.customShortcutsSubtitle', 'Add local executables for quick launch from Tools view.'))}</p>
        <div class="custom-tools-dropzone" data-custom-tools-dropzone>
            ${escapeHtml(t('tools.customDropzone', 'Drag and drop executable files here'))}
        </div>
        <p class="custom-tools-status" data-custom-tools-status aria-live="polite"></p>
        <div class="custom-tools-list" data-custom-tools-list></div>
    `;

    const listEl = section.querySelector('[data-custom-tools-list]');
    const statusEl = section.querySelector('[data-custom-tools-status]');
    const addBtn = section.querySelector('[data-custom-tool-action="add"]');
    const dropzone = section.querySelector('[data-custom-tools-dropzone]');
    let iconRenderToken = 0;

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = level;
    };

    const hydrateCustomToolIcons = async (shortcuts, renderToken) => {
        if (!listEl) return;
        const entries = Array.isArray(shortcuts) ? shortcuts : [];
        await Promise.all(entries.map(async (shortcut) => {
            const iconEl = listEl.querySelector(`img[data-custom-tool-icon-id="${shortcut.id}"]`);
            if (!iconEl) return;
            const iconWrap = iconEl.closest('.custom-tool-icon-wrap');
            if (iconWrap) iconWrap.classList.remove('has-icon');

            const dataUrl = await getCustomToolIconDataUrl(shortcut.filePath);
            if (renderToken !== iconRenderToken) return;
            if (!dataUrl) return;

            iconEl.src = dataUrl;
            iconEl.alt = t('tools.iconAlt', '{{name}} icon', { name: shortcut.name });
            if (iconWrap) iconWrap.classList.add('has-icon');
        }));
    };

    const renderList = () => {
        const shortcuts = loadCustomToolShortcuts(t);
        if (!listEl) return;
        if (!shortcuts.length) {
            listEl.innerHTML = `<div class="custom-tools-empty">${escapeHtml(t('tools.customShortcutsEmpty', 'No shortcuts yet. Add a tool executable to get started.'))}</div>`;
            return;
        }
        listEl.innerHTML = shortcuts.map((shortcut) => `
            <article class="custom-tool-card" data-custom-tool-id="${escapeHtml(shortcut.id)}">
                <div class="custom-tool-head">
                    <div class="custom-tool-icon-wrap" aria-hidden="true">
                        <img class="custom-tool-icon" data-custom-tool-icon-id="${escapeHtml(shortcut.id)}" alt="" loading="lazy" decoding="async" />
                        <span class="custom-tool-icon-fallback">${escapeHtml(getShortcutInitial(shortcut.name))}</span>
                    </div>
                    <div class="custom-tool-title">${escapeHtml(shortcut.name)}</div>
                </div>
                <div class="custom-tool-path" title="${escapeHtml(shortcut.filePath)}">${escapeHtml(shortcut.filePath)}</div>
                <div class="custom-tool-path" title="${escapeHtml(String(shortcut.args || '').trim() || t('tools.noneSet', 'Not set'))}">
                    ${escapeHtml(t('tools.createArgsLabel', 'Arguments'))}: ${escapeHtml(String(shortcut.args || '').trim() || t('tools.noneSet', 'Not set'))}
                </div>
                <div class="custom-tool-path" title="${escapeHtml(String(shortcut.workingDirectory || '').trim() || t('tools.noneSet', 'Not set'))}">
                    ${escapeHtml(t('tools.createWorkingDirLabel', 'Working Directory'))}: ${escapeHtml(String(shortcut.workingDirectory || '').trim() || t('tools.noneSet', 'Not set'))}
                </div>
                <div class="custom-tool-path" title="${escapeHtml(String(shortcut.runAsUser || '').trim() || t('tools.noneSet', 'Not set'))}">
                    ${escapeHtml(t('tools.runAsLabel', 'Run as'))}: ${escapeHtml(shortcut.runAsAdmin ? t('tools.runAsAdminShort', 'Admin/Root') : (String(shortcut.runAsUser || '').trim() || t('tools.runAsDefaultShort', 'Current user')))}
                </div>
                <div class="custom-tool-actions">
                    <button type="button" class="action-btn small" data-custom-tool-action="launch" data-custom-tool-id="${escapeHtml(shortcut.id)}">${escapeHtml(t('tools.customLaunch', 'Launch'))}</button>
                    <button type="button" class="action-btn small" data-custom-tool-action="edit" data-custom-tool-id="${escapeHtml(shortcut.id)}">${escapeHtml(t('tools.editToolTitle', 'Edit Tool'))}</button>
                    <button type="button" class="action-btn small" data-custom-tool-action="reveal" data-custom-tool-id="${escapeHtml(shortcut.id)}">${escapeHtml(t('tools.customShowInFolder', 'Show in Folder'))}</button>
                    <button type="button" class="action-btn small remove-btn" data-custom-tool-action="remove" data-custom-tool-id="${escapeHtml(shortcut.id)}">${escapeHtml(t('tools.customRemove', 'Remove'))}</button>
                </div>
            </article>
        `).join('');

        const renderToken = ++iconRenderToken;
        void hydrateCustomToolIcons(shortcuts, renderToken);
    };

    if (addBtn) {
        addBtn.addEventListener('click', async () => {
            await pickAndAddCustomTools(renderList, setStatus, t);
        });
    }

    if (listEl) {
        listEl.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-custom-tool-action]');
            if (!button) return;
            const action = String(button.dataset.customToolAction || '').trim();
            const id = String(button.dataset.customToolId || '').trim();
            const shortcuts = loadCustomToolShortcuts(t);
            const shortcut = shortcuts.find((entry) => entry.id === id);
            if (!shortcut) return;

            if (action === 'launch') {
                await launchCustomTool(shortcut, setStatus, t);
                return;
            }

            if (action === 'edit') {
                editCustomToolShortcut(shortcuts, shortcut, renderList, setStatus, t);
                return;
            }

            if (action === 'reveal') {
                const result = await window.emubro.invoke('show-item-in-folder', shortcut.filePath);
                if (!result?.success) {
                    setStatus(result?.message || t('tools.status.openFolderFailed', 'Failed to open folder.'), 'error');
                }
                return;
            }

            if (action === 'remove') {
                const next = shortcuts.filter((entry) => entry.id !== id);
                saveCustomToolShortcuts(next, t);
                renderList();
                setStatus(t('tools.status.removedTool', 'Removed {{name}}.', { name: shortcut.name }), 'info');
            }
        });
    }

    if (dropzone) {
        const prevent = (event) => {
            event.preventDefault();
            event.stopPropagation();
        };
        dropzone.addEventListener('dragenter', (event) => {
            prevent(event);
            dropzone.classList.add(CUSTOM_TOOL_DROP_ACTIVE_CLASS);
        });
        dropzone.addEventListener('dragover', (event) => {
            prevent(event);
            dropzone.classList.add(CUSTOM_TOOL_DROP_ACTIVE_CLASS);
        });
        dropzone.addEventListener('dragleave', (event) => {
            prevent(event);
            if (event.target === dropzone) {
                dropzone.classList.remove(CUSTOM_TOOL_DROP_ACTIVE_CLASS);
            }
        });
        dropzone.addEventListener('drop', async (event) => {
            prevent(event);
            dropzone.classList.remove(CUSTOM_TOOL_DROP_ACTIVE_CLASS);
            const droppedFiles = Array.from(event.dataTransfer?.files || []);
            const paths = droppedFiles
                .map((file) => resolveDroppedFilePath(file))
                .filter((pathValue) => !!pathValue);
            if (!paths.length) {
                setStatus(t('tools.status.couldNotReadDroppedPaths', 'Could not read dropped file paths.'), 'warning');
                return;
            }
            const summary = addCustomToolShortcutsFromPaths(paths, t);
            renderList();
            if (summary.added > 0) {
                setStatus(t('tools.status.addedFromDragDrop', 'Added {{count}} shortcut(s) from drag and drop.', { count: summary.added }), 'success');
                return;
            }
            if (summary.unsupported > 0) {
                setStatus(t('tools.status.droppedNotSupported', 'Dropped files were not supported executables.'), 'warning');
                return;
            }
            setStatus(t('tools.status.noNewShortcuts', 'No new shortcuts were added.'), 'warning');
        });
    }

    renderList();
    return section;
}
