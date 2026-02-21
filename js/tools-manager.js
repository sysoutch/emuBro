/**
 * Tools Manager
 */

const log = console;
const CUSTOM_TOOL_SHORTCUTS_KEY = 'emuBro.customToolShortcuts.v1';
const CUSTOM_TOOL_DROP_ACTIVE_CLASS = 'is-drag-over';
const WINDOWS_EXECUTABLE_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.ps1', '.lnk', '.com']);
const customToolIconCache = new Map();

import { GamepadTool } from './tools/gamepad-tool.js';
import { MonitorTool } from './tools/monitor-tool.js';
import { MemoryCardTool } from './tools/memory-card-tool.js';

// Create instances of tools
const gamepadTool = new GamepadTool();
const monitorTool = new MonitorTool();
const memoryCardTool = new MemoryCardTool();

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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

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

function deriveShortcutName(filePath) {
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

function normalizeShortcutRecord(raw) {
    const filePath = String(raw?.filePath || '').trim();
    if (!filePath) return null;
    return {
        id: String(raw?.id || `tool-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        name: String(raw?.name || deriveShortcutName(filePath)).trim() || deriveShortcutName(filePath),
        filePath,
        createdAt: Number(raw?.createdAt || Date.now())
    };
}

function loadCustomToolShortcuts() {
    try {
        const raw = localStorage.getItem(CUSTOM_TOOL_SHORTCUTS_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((entry) => normalizeShortcutRecord(entry))
            .filter((entry) => !!entry);
    } catch (_error) {
        return [];
    }
}

function saveCustomToolShortcuts(rows) {
    const normalizedRows = Array.isArray(rows)
        ? rows.map((entry) => normalizeShortcutRecord(entry)).filter((entry) => !!entry)
        : [];
    localStorage.setItem(CUSTOM_TOOL_SHORTCUTS_KEY, JSON.stringify(normalizedRows));
}

function addCustomToolShortcutsFromPaths(paths) {
    const existing = loadCustomToolShortcuts();
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
            name: deriveShortcutName(filePath),
            filePath,
            createdAt: Date.now()
        });
        added += 1;
    });

    saveCustomToolShortcuts(existing);
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

async function pickAndAddCustomTools(renderList, setStatus) {
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
        const summary = addCustomToolShortcutsFromPaths(filePaths);
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

async function launchCustomTool(shortcut, setStatus) {
    if (!shortcut?.filePath) return;
    const result = await window.emubro.invoke('launch-emulator', {
        filePath: shortcut.filePath
    });
    if (!result?.success) {
        setStatus(result?.message || t('tools.status.launchFailed', 'Failed to launch tool.'), 'error');
        return;
    }
    setStatus(t('tools.status.launchedTool', 'Launched {{name}}.', { name: shortcut.name }), 'success');
}

function renderCustomToolsSection() {
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
        const shortcuts = loadCustomToolShortcuts();
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
                <div class="custom-tool-actions">
                    <button type="button" class="action-btn small" data-custom-tool-action="launch" data-custom-tool-id="${escapeHtml(shortcut.id)}">${escapeHtml(t('tools.customLaunch', 'Launch'))}</button>
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
            await pickAndAddCustomTools(renderList, setStatus);
        });
    }

    if (listEl) {
        listEl.addEventListener('click', async (event) => {
            const button = event.target.closest('[data-custom-tool-action]');
            if (!button) return;
            const action = String(button.dataset.customToolAction || '').trim();
            const id = String(button.dataset.customToolId || '').trim();
            const shortcuts = loadCustomToolShortcuts();
            const shortcut = shortcuts.find((entry) => entry.id === id);
            if (!shortcut) return;

            if (action === 'launch') {
                await launchCustomTool(shortcut, setStatus);
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
                saveCustomToolShortcuts(next);
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
            const summary = addCustomToolShortcutsFromPaths(paths);
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

export function showToolView(tool) {
    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    
    // 1. Safety: Stop gamepad testing loop whenever switching AWAY from the gamepad tool
    if (gamepadTool && typeof gamepadTool.stopTesting === 'function') {
        gamepadTool.stopTesting();
    }

    // 2. Update Sidebar UI
    document.querySelectorAll("[data-tool]").forEach(link => {
        link.classList.remove("active");
    });
    const toolLink = document.querySelector(`[data-tool="${tool}"]`);
    if (toolLink) toolLink.classList.add("active");
    
    // 3. Update Header Text
    if (gamesHeader) {
        let title = t('header.tools', 'Tools');
        if (tool === 'memory-card') title = t('tools.memoryCardReader', 'Memory Card Reader');
        else if (tool === 'rom-ripper') title = t('tools.romRipper', 'ROM Ripper');
        else if (tool === 'game-database') title = t('tools.gameDatabase', 'Game Database');
        else if (tool === 'cheat-codes') title = t('tools.cheatCodes', 'Cheat Codes');
        else if (tool === 'gamepad') title = t('tools.gamepadTester', 'Gamepad Tester');
        else if (tool === 'monitor') title = t('tools.monitorManager', 'Monitor Manager');
        else if (tool === 'bios') title = t('tools.biosManager', 'BIOS Manager');
        else if (tool) title = tool.charAt(0).toUpperCase() + tool.slice(1).replace("-", " ");
        gamesHeader.textContent = title;
    }
    
    if (gamesContainer) {
        gamesContainer.className = "games-container tools-view";
        gamesContainer.innerHTML = ""; // Wipe the current view
        
        if (!tool) {
            renderToolsOverview();
            return;
        }

        // 4. Robust Switch with "Exits"
        switch(tool) {
            case "memory-card":
                if (memoryCardTool && typeof memoryCardTool.render === 'function') {
                    memoryCardTool.render(gamesContainer);
                } else {
                    log.error("Memory Card tool failed to load or has no render() method");
                }
                break;
            case "gamepad":
                if (gamepadTool && typeof gamepadTool.render === 'function') {
                    gamepadTool.render(gamesContainer);
                } else {
                    log.error("Gamepad tool failed to load or has no render() method");
                }
                break;
            case "monitor":
                if (monitorTool && typeof monitorTool.render === 'function') {
                    monitorTool.render(gamesContainer);
                } else {
                    log.error("Monitor tool failed to load or has no render() method");
                }
                break;
            case "bios":
                renderBiosManagerTool();
                break;
            // Placeholders for other tools
            case "rom-ripper":
                renderRomRipperTool();
                break;
            case "game-database":
                renderGameDatabaseTool();
                break;
            case "cheat-codes":
                renderCheatCodesTool();
                break;
            default:
                gamesContainer.innerHTML = `<p>${escapeHtml(t('tools.notImplementedTool', 'Tool "{{tool}}" is not yet implemented.', { tool }))}</p>`;
        }
    }
}

function renderToolsOverview() {
    const gamesContainer = document.getElementById("games-container");
    const overview = document.createElement("div");
    overview.className = "tools-overview";
    
    const tools = [
        { id: "memory-card", icon: "fas fa-memory", name: t('tools.memoryCardEditor', 'Memory Card Editor'), desc: t('tools.memoryCardEditorDesc', 'Manage PS1/PS2 save files.') },
        { id: "rom-ripper", icon: "fas fa-compact-disc", name: t('tools.romRipper', 'ROM Ripper'), desc: t('tools.romRipperOverviewDesc', 'Create backups of physical discs.') },
        { id: "game-database", icon: "fas fa-database", name: t('tools.gameDatabase', 'Game Database'), desc: t('tools.gameDatabaseOverviewDesc', 'Explore the global database.') },
        { id: "cheat-codes", icon: "fas fa-magic", name: t('tools.cheatCodes', 'Cheat Codes'), desc: t('tools.cheatCodesOverviewDesc', 'Apply GameShark or Action Replay.') },
        { id: "gamepad", icon: "fas fa-gamepad", name: t('tools.gamepadTester', 'Gamepad Tester'), desc: t('tools.gamepadTesterDesc', 'Test and map your controllers.') },
        { id: "monitor", icon: "fas fa-desktop", name: t('tools.monitorManager', 'Monitor Manager'), desc: t('tools.monitorManagerDesc', 'Manage displays and orientation.') },
        { id: "bios", icon: "fas fa-microchip", name: t('tools.biosManager', 'BIOS Manager'), desc: t('tools.biosManagerDesc', 'Manage BIOS files per platform.') }
    ];

    overview.innerHTML = `
        <div class="tools-grid">
            ${tools.map((toolMeta) => `
                <div class="tool-card" data-tool-id="${toolMeta.id}">
                    <div class="tool-icon"><i class="${toolMeta.icon}"></i></div>
                    <h3>${toolMeta.name}</h3>
                    <p>${toolMeta.desc}</p>
                    <button class="action-btn">${escapeHtml(t('tools.openTool', 'Open Tool'))}</button>
                </div>
            `).join("")}
        </div>
    `;

    gamesContainer.appendChild(overview);
    overview.appendChild(renderCustomToolsSection());

    overview.querySelectorAll(".tool-card").forEach(card => {
        card.addEventListener("click", () => {
            showToolView(card.dataset.toolId);
        });
    });
}

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

function renderBiosManagerTool() {
    const gamesContainer = document.getElementById("games-container");
    if (!gamesContainer) return;

    const toolContent = document.createElement("div");
    toolContent.className = "tool-content";
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

function renderRomRipperTool() {
    const gamesContainer = document.getElementById("games-container");
    const toolContent = document.createElement("div");
    toolContent.className = "tool-content";
    toolContent.innerHTML = `
        <h3>${i18n.t("tools.romRipper")}</h3>
        <p>${i18n.t("tools.romRipperDesc")}</p>
        <div class="tool-controls">
            <button id="rip-rom-btn" class="action-btn">${i18n.t("tools.startRip")}</button>
        </div>
        <div id="rom-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById("rip-rom-btn").addEventListener("click", () => {
        alert(i18n.t("tools.placeholderAlert", {feature: i18n.t("tools.romRipper")}));
    });
}

function renderGameDatabaseTool() {
    const gamesContainer = document.getElementById("games-container");
    const toolContent = document.createElement("div");
    toolContent.className = "tool-content";
    toolContent.innerHTML = `
        <h3>${i18n.t("tools.gameDatabase")}</h3>
        <p>${i18n.t("tools.gameDatabaseDesc")}</p>
        <div class="tool-controls">
            <input type="text" id="db-search" placeholder="${i18n.t("tools.searchGames")}" />
            <button id="search-db-btn" class="action-btn">${i18n.t("tools.search")}</button>
        </div>
        <div id="db-results" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById("search-db-btn").addEventListener("click", () => {
        alert(i18n.t("tools.placeholderAlert", {feature: i18n.t("tools.gameDatabase")}));
    });
}

function renderCheatCodesTool() {
    const gamesContainer = document.getElementById("games-container");
    const toolContent = document.createElement("div");
    toolContent.className = "tool-content";
    toolContent.innerHTML = `
        <h3>${i18n.t("tools.cheatCodes")}</h3>
        <p>${i18n.t("tools.cheatCodesDesc")}</p>
        <div class="tool-controls">
            <select id="game-select">
                <option value="">${i18n.t("tools.selectGame")}</option>
                <option value="game1">${i18n.t("tools.sampleGame1")}</option>
                <option value="game2">${i18n.t("tools.sampleGame2")}</option>
                <option value="game3">${i18n.t("tools.sampleGame3")}</option>
            </select>
            <button id="apply-cheat-btn" class="action-btn">${i18n.t("tools.applyCheat")}</button>
        </div>
        <div id="cheat-output" class="tool-output"></div>
    `;
    gamesContainer.appendChild(toolContent);
    
    document.getElementById("apply-cheat-btn").addEventListener("click", () => {
        alert(i18n.t("tools.placeholderAlert", {feature: i18n.t("tools.cheatCodes")}));
    });
}

function renderGamepadTool() {
    const gamesContainer = document.getElementById("games-container");
    const toolContent = document.createElement("div");
    toolContent.className = "tool-content";
    gamepadTool.render(gamesContainer);
}

export function showMemoryCardReader() {
    if (memoryCardTool && typeof memoryCardTool.render === 'function') {
        const gamesContainer = document.getElementById("games-container");
        memoryCardTool.render(gamesContainer);
    }
}
