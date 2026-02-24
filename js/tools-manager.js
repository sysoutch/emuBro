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
    let translated = '';
    if (i18nRef && typeof i18nRef.t === 'function') {
        translated = i18nRef.t(key);
        if (typeof translated === 'string' && translated && translated !== key) {
            return applyTemplate(translated, data);
        }
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
        else if (tool === 'cover-downloader') title = t('tools.coverDownloader', 'Cover Downloader');
        else if (tool === 'cue-maker') title = t('tools.cueMaker', 'CUE Maker');
        else if (tool === 'ecm-unecm') title = t('tools.ecmUnecm', 'ECM/UNECM');
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
            case "cover-downloader":
                renderCoverDownloaderTool();
                break;
            case "cue-maker":
                renderCueMakerTool();
                break;
            case "ecm-unecm":
                renderEcmUnecmTool();
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
        { id: "cover-downloader", icon: "fas fa-image", name: t('tools.coverDownloader', 'Cover Downloader'), desc: t('tools.coverDownloaderOverviewDesc', 'Fetch PS1/PS2 covers by game serial.') },
        { id: "cue-maker", icon: "fas fa-file-code", name: t('tools.cueMaker', 'CUE Maker'), desc: t('tools.cueMakerOverviewDesc', 'Inspect BIN files and generate missing CUE sheets.') },
        { id: "ecm-unecm", icon: "fas fa-download", name: t('tools.ecmUnecm', 'ECM/UNECM'), desc: t('tools.ecmUnecmOverviewDesc', 'Download upstream ECM/UNECM source bundle as an external GPL tool.') },
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

function normalizeCoverPlatform(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw === 'psx' || raw === 'ps2') return raw;
    if (raw === 'ps1' || raw === 'ps') return 'psx';
    if (raw === 'playstation' || raw === 'playstation-1') return 'psx';
    if (raw === 'playstation2' || raw === 'playstation-2') return 'ps2';
    return '';
}

function hasGameSerial(game) {
    const direct = [
        game?.code,
        game?.productCode,
        game?.serial,
        game?.gameCode
    ];
    if (direct.some((value) => String(value || '').trim())) return true;
    const hay = `${String(game?.name || '')} ${String(game?.filePath || '')}`.toUpperCase();
    return /\b[A-Z]{4}[-_. ]?\d{3,7}\b/.test(hay);
}

function formatCoverDownloadResult(row) {
    if (!row || typeof row !== 'object') return '';
    const status = String(row.status || '').trim();
    if (status === 'downloaded') return t('tools.coverDownloaderResultDownloaded', 'Downloaded');
    if (status === 'reused_existing_file') return t('tools.coverDownloaderResultReused', 'Reused local cover');
    if (status === 'skipped_existing_cover') return t('tools.coverDownloaderResultSkipped', 'Skipped');
    if (status === 'missing_serial') return t('tools.coverDownloaderNoSerial', 'No serial/code detected for this game.');
    if (status === 'not_found') return t('tools.coverDownloaderNotFound', 'No cover found on source repositories.');
    return String(row.message || t('tools.coverDownloaderResultFailed', 'Failed'));
}

const COVER_SOURCE_STORAGE_KEY = 'emuBro.coverDownloader.sources.v1';
const COVER_DEFAULT_SOURCES = Object.freeze({
    psx: 'https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg',
    ps2: 'https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg'
});

function normalizeCoverSourceLine(value) {
    const line = String(value || '').trim();
    if (!line) return '';
    if (!/^https?:\/\//i.test(line)) return '';
    if (!line.includes('${serial}')) return '';
    return line;
}

function parseCoverSourceTextArea(value) {
    const seen = new Set();
    return String(value || '')
        .split(/\r?\n/)
        .map((line) => normalizeCoverSourceLine(line))
        .filter(Boolean)
        .filter((line) => {
            const key = line.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function loadCoverSourceOverrides() {
    try {
        const raw = localStorage.getItem(COVER_SOURCE_STORAGE_KEY);
        if (!raw) return { psx: [], ps2: [] };
        const parsed = JSON.parse(raw);
        return {
            psx: parseCoverSourceTextArea((Array.isArray(parsed?.psx) ? parsed.psx : []).join('\n')),
            ps2: parseCoverSourceTextArea((Array.isArray(parsed?.ps2) ? parsed.ps2 : []).join('\n'))
        };
    } catch (_error) {
        return { psx: [], ps2: [] };
    }
}

function saveCoverSourceOverrides(value) {
    const normalized = {
        psx: parseCoverSourceTextArea((Array.isArray(value?.psx) ? value.psx : []).join('\n')),
        ps2: parseCoverSourceTextArea((Array.isArray(value?.ps2) ? value.ps2 : []).join('\n'))
    };
    localStorage.setItem(COVER_SOURCE_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
}

function renderCoverDownloaderTool() {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content cover-downloader-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.coverDownloader', 'Cover Downloader'))}</h3>
        <p>${escapeHtml(t('tools.coverDownloaderDesc', 'Download PS1/PS2 covers by serial code and assign them to your games.'))}</p>
        <p class="tool-output cover-downloader-hint">${escapeHtml(t('tools.coverDownloaderSupportedHint', 'Supports PS1 (psx-covers) and PS2 (ps2-covers) using game serials.'))}</p>
        <div class="cover-downloader-sources">
            <div class="cover-source-block">
                <h4>${escapeHtml(t('tools.coverDownloaderPs1Source', 'PS1 Source'))}</h4>
                <div class="cover-source-links" data-cover-default-links="psx"></div>
                <label>${escapeHtml(t('tools.coverDownloaderExtraLinks', 'Extra links (one per line)'))}</label>
                <textarea rows="3" data-cover-source-input="psx" placeholder="https://example.com/ps1/\${serial}.jpg"></textarea>
            </div>
            <div class="cover-source-block">
                <h4>${escapeHtml(t('tools.coverDownloaderPs2Source', 'PS2 Source'))}</h4>
                <div class="cover-source-links" data-cover-default-links="ps2"></div>
                <label>${escapeHtml(t('tools.coverDownloaderExtraLinks', 'Extra links (one per line)'))}</label>
                <textarea rows="3" data-cover-source-input="ps2" placeholder="https://example.com/ps2/\${serial}.jpg"></textarea>
            </div>
        </div>
        <div class="cover-downloader-source-actions">
            <button type="button" class="action-btn small" data-cover-action="save-sources">${escapeHtml(t('tools.coverDownloaderSaveLinks', 'Save Links'))}</button>
            <button type="button" class="action-btn small" data-cover-action="reset-sources">${escapeHtml(t('tools.coverDownloaderResetLinks', 'Reset Extras'))}</button>
        </div>

        <div class="cover-downloader-controls">
            <label class="cover-downloader-toggle">
                <input type="checkbox" data-cover-only-missing checked />
                <span>${escapeHtml(t('tools.coverDownloaderOnlyMissing', 'Only missing covers'))}</span>
            </label>
            <label class="cover-downloader-toggle">
                <input type="checkbox" data-cover-overwrite />
                <span>${escapeHtml(t('tools.coverDownloaderOverwrite', 'Overwrite existing files'))}</span>
            </label>
            <button type="button" class="action-btn" data-cover-action="run">${escapeHtml(t('tools.coverDownloaderRun', 'Download Covers'))}</button>
            <button type="button" class="action-btn" data-cover-action="refresh">${escapeHtml(t('buttons.refresh', 'Refresh'))}</button>
        </div>

        <p class="tool-output" data-cover-status></p>
        <p class="tool-output cover-downloader-stats" data-cover-stats></p>
        <p class="tool-output cover-downloader-summary" data-cover-summary></p>
        <div class="cover-downloader-results" data-cover-results></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-cover-status]');
    const statsEl = toolContent.querySelector('[data-cover-stats]');
    const summaryEl = toolContent.querySelector('[data-cover-summary]');
    const resultsEl = toolContent.querySelector('[data-cover-results]');
    const onlyMissingInput = toolContent.querySelector('[data-cover-only-missing]');
    const overwriteInput = toolContent.querySelector('[data-cover-overwrite]');
    const runBtn = toolContent.querySelector('[data-cover-action="run"]');
    const refreshBtn = toolContent.querySelector('[data-cover-action="refresh"]');
    const saveSourcesBtn = toolContent.querySelector('[data-cover-action="save-sources"]');
    const resetSourcesBtn = toolContent.querySelector('[data-cover-action="reset-sources"]');
    const psxSourceInput = toolContent.querySelector('[data-cover-source-input="psx"]');
    const ps2SourceInput = toolContent.querySelector('[data-cover-source-input="ps2"]');
    const psxDefaultLinksEl = toolContent.querySelector('[data-cover-default-links="psx"]');
    const ps2DefaultLinksEl = toolContent.querySelector('[data-cover-default-links="ps2"]');

    const renderSourceLinkList = (element, links = []) => {
        if (!element) return;
        const rows = Array.isArray(links) ? links : [];
        if (!rows.length) {
            element.innerHTML = '';
            return;
        }
        element.innerHTML = rows.map((link) => {
            const safe = String(link || '').trim();
            if (!safe) return '';
            return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(safe)}</a>`;
        }).join('');
    };

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = level;
    };

    const setSummary = (message, level = 'info') => {
        if (!summaryEl) return;
        summaryEl.textContent = String(message || '').trim();
        summaryEl.dataset.level = level;
    };

    const renderResults = (rows = []) => {
        if (!resultsEl) return;
        const list = Array.isArray(rows) ? rows : [];
        if (!list.length) {
            resultsEl.innerHTML = `<div class="cover-download-row is-empty">${escapeHtml(t('tools.coverDownloaderNoResults', 'No download results yet. Click "Download Covers" to start.'))}</div>`;
            return;
        }
        resultsEl.innerHTML = list.map((row) => {
            const name = String(row?.name || `Game #${row?.gameId || '?'}`).trim();
            const platform = String(row?.platformShortName || '').trim().toUpperCase();
            const label = formatCoverDownloadResult(row);
            const level = row?.success ? (row?.downloaded ? 'success' : 'info') : 'error';
            return `
                <div class="cover-download-row" data-level="${escapeHtml(level)}">
                    <div class="cover-download-game">
                        ${escapeHtml(name)} ${platform ? `<span>(${escapeHtml(platform)})</span>` : ''}
                        ${row?.sourceUrl ? `<a href="${escapeHtml(String(row.sourceUrl))}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('tools.coverDownloaderOpenSource', 'Open source'))}</a>` : ''}
                    </div>
                    <div class="cover-download-status">${escapeHtml(label)}</div>
                </div>
            `;
        }).join('');
    };

    const getSourceOverridesFromInputs = () => ({
        psx: parseCoverSourceTextArea(psxSourceInput?.value || ''),
        ps2: parseCoverSourceTextArea(ps2SourceInput?.value || '')
    });

    const applySourceOverridesToInputs = (overrides) => {
        if (psxSourceInput) psxSourceInput.value = Array.isArray(overrides?.psx) ? overrides.psx.join('\n') : '';
        if (ps2SourceInput) ps2SourceInput.value = Array.isArray(overrides?.ps2) ? overrides.ps2.join('\n') : '';
    };

    const loadConfiguredSourceLinks = async () => {
        renderSourceLinkList(psxDefaultLinksEl, [COVER_DEFAULT_SOURCES.psx]);
        renderSourceLinkList(ps2DefaultLinksEl, [COVER_DEFAULT_SOURCES.ps2]);
        try {
            const response = await window.emubro.invoke('covers:get-source-config');
            if (!response?.success) return;
            const links = response?.sources || {};
            renderSourceLinkList(psxDefaultLinksEl, Array.isArray(links.psx) && links.psx.length ? links.psx : [COVER_DEFAULT_SOURCES.psx]);
            renderSourceLinkList(ps2DefaultLinksEl, Array.isArray(links.ps2) && links.ps2.length ? links.ps2 : [COVER_DEFAULT_SOURCES.ps2]);
        } catch (_error) {}
    };

    const refreshStats = async () => {
        try {
            const games = await window.emubro.invoke('get-games');
            const rows = Array.isArray(games) ? games : [];
            const supported = rows.filter((game) => normalizeCoverPlatform(game?.platformShortName || game?.platform)).length;
            const withSerial = rows.filter((game) => {
                if (!normalizeCoverPlatform(game?.platformShortName || game?.platform)) return false;
                return hasGameSerial(game);
            }).length;
            if (statsEl) {
                statsEl.textContent = t('tools.coverDownloaderStats', 'PS1/PS2 games: {{supported}} • with serial/code: {{withSerial}}', {
                    supported,
                    withSerial
                });
            }
        } catch (error) {
            if (statsEl) statsEl.textContent = String(error?.message || error || '');
        }
    };

    const setRunning = (running) => {
        const isRunning = !!running;
        if (runBtn) runBtn.disabled = isRunning;
        if (refreshBtn) refreshBtn.disabled = isRunning;
    };

    if (runBtn) {
        runBtn.addEventListener('click', async () => {
            setRunning(true);
            setStatus(t('tools.status.coverDownloaderRunning', 'Downloading covers...'), 'info');
            try {
                const result = await window.emubro.invoke('covers:download-for-library', {
                    onlyMissing: !!onlyMissingInput?.checked,
                    overwrite: !!overwriteInput?.checked,
                    sourceOverrides: getSourceOverridesFromInputs()
                });
                if (!result?.success) {
                    setStatus(
                        t('tools.status.coverDownloaderFailed', 'Cover download failed: {{message}}', {
                            message: String(result?.message || 'Unknown error')
                        }),
                        'error'
                    );
                    return;
                }
                setStatus('', 'info');
                setSummary(
                    t('tools.coverDownloaderSummary', 'Processed {{total}} game(s): {{downloaded}} downloaded, {{skipped}} skipped, {{failed}} failed.', {
                        total: Number(result?.total || 0),
                        downloaded: Number(result?.downloaded || 0),
                        skipped: Number(result?.skipped || 0),
                        failed: Number(result?.failed || 0)
                    }),
                    Number(result?.failed || 0) > 0 ? 'warning' : 'success'
                );
                renderResults(result?.results || []);
                await refreshStats();
            } catch (error) {
                setStatus(
                    t('tools.status.coverDownloaderFailed', 'Cover download failed: {{message}}', {
                        message: String(error?.message || error || 'Unknown error')
                    }),
                    'error'
                );
            } finally {
                setRunning(false);
            }
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            await refreshStats();
        });
    }

    if (saveSourcesBtn) {
        saveSourcesBtn.addEventListener('click', () => {
            const saved = saveCoverSourceOverrides(getSourceOverridesFromInputs());
            applySourceOverridesToInputs(saved);
            setStatus(t('tools.coverDownloaderLinksSaved', 'Cover source links saved.'), 'success');
        });
    }

    if (resetSourcesBtn) {
        resetSourcesBtn.addEventListener('click', () => {
            const saved = saveCoverSourceOverrides({ psx: [], ps2: [] });
            applySourceOverridesToInputs(saved);
            setStatus(t('tools.coverDownloaderLinksReset', 'Extra cover links reset.'), 'info');
        });
    }

    applySourceOverridesToInputs(loadCoverSourceOverrides());
    void loadConfiguredSourceLinks();
    renderResults([]);
    void refreshStats();
}

function dedupePaths(values = []) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
        .map((entry) => String(entry || '').trim())
        .filter(Boolean)
        .filter((entry) => {
            const key = normalizePathForCompare(entry);
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
}

function renderCueMakerTool() {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content cue-maker-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.cueMaker', 'CUE Maker'))}</h3>
        <p>${escapeHtml(t('tools.cueMakerDesc', 'Inspect BIN files, detect missing CUE sheets, and generate CUE files when needed.'))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn" data-cue-action="pick">${escapeHtml(t('tools.cueMakerSelectBins', 'Select BIN Files'))}</button>
            <button type="button" class="action-btn" data-cue-action="inspect">${escapeHtml(t('tools.cueMakerInspect', 'Inspect'))}</button>
            <button type="button" class="action-btn" data-cue-action="generate">${escapeHtml(t('tools.cueMakerGenerateMissing', 'Generate Missing CUE'))}</button>
        </div>
        <p class="tool-output" data-cue-status></p>
        <div class="cover-downloader-results" data-cue-results></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-cue-status]');
    const resultsEl = toolContent.querySelector('[data-cue-results]');
    const pickBtn = toolContent.querySelector('[data-cue-action="pick"]');
    const inspectBtn = toolContent.querySelector('[data-cue-action="inspect"]');
    const generateBtn = toolContent.querySelector('[data-cue-action="generate"]');

    let selectedBinPaths = [];
    let inspectedRows = [];

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = String(level || 'info');
    };

    const setRunning = (running) => {
        const isRunning = !!running;
        if (pickBtn) pickBtn.disabled = isRunning;
        if (inspectBtn) inspectBtn.disabled = isRunning;
        if (generateBtn) generateBtn.disabled = isRunning;
    };

    const renderResults = () => {
        if (!resultsEl) return;
        if (!Array.isArray(inspectedRows) || inspectedRows.length === 0) {
            resultsEl.innerHTML = `<div class="cover-download-row is-empty">${escapeHtml(t('tools.cueMakerNoResults', 'No BIN files loaded yet.'))}</div>`;
            return;
        }
        resultsEl.innerHTML = inspectedRows.map((row) => {
            const binPath = String(row?.binPath || '').trim();
            const cuePath = String(row?.cuePath || '').trim();
            const hasCue = !!row?.hasCue;
            return `
                <div class="cover-download-row" data-level="${hasCue ? 'success' : 'warning'}">
                    <div class="cover-download-game">
                        ${escapeHtml(getFileNameFromPath(binPath) || binPath)}
                        <span>${escapeHtml(binPath)}</span>
                        ${cuePath ? `<span>${escapeHtml(cuePath)}</span>` : ''}
                    </div>
                    <div class="cover-download-status">${escapeHtml(hasCue ? t('tools.cueMakerHasCue', 'CUE found') : t('tools.cueMakerMissingCue', 'CUE missing'))}</div>
                </div>
            `;
        }).join('');
    };

    const inspectPaths = async (paths = null) => {
        const targetPaths = dedupePaths(Array.isArray(paths) ? paths : selectedBinPaths);
        if (targetPaths.length === 0) {
            inspectedRows = [];
            renderResults();
            setStatus(t('tools.cueMakerNoSelection', 'Select one or more BIN files first.'), 'warning');
            return;
        }
        setRunning(true);
        try {
            const response = await window.emubro.invoke('cue:inspect-bin-files', targetPaths);
            if (!response?.success) {
                setStatus(String(response?.message || 'Failed to inspect BIN files.'), 'error');
                return;
            }
            selectedBinPaths = targetPaths;
            inspectedRows = Array.isArray(response?.results) ? response.results : [];
            renderResults();
            const missingCount = inspectedRows.filter((row) => !row?.hasCue).length;
            setStatus(
                missingCount > 0
                    ? `${missingCount} file(s) missing CUE.`
                    : t('tools.cueMakerAllGood', 'All selected BIN files already have CUE files.'),
                missingCount > 0 ? 'warning' : 'success'
            );
        } catch (error) {
            setStatus(String(error?.message || error || 'Failed to inspect BIN files.'), 'error');
        } finally {
            setRunning(false);
        }
    };

    if (pickBtn) {
        pickBtn.addEventListener('click', async () => {
            try {
                const pick = await window.emubro.invoke('open-file-dialog', {
                    title: t('tools.cueMakerSelectBins', 'Select BIN Files'),
                    properties: ['openFile', 'multiSelections'],
                    filters: [
                        { name: 'BIN Files', extensions: ['bin'] },
                        { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                    ]
                });
                if (!pick || pick.canceled) return;
                selectedBinPaths = dedupePaths(pick.filePaths);
                await inspectPaths(selectedBinPaths);
            } catch (error) {
                setStatus(String(error?.message || error || 'Failed to select BIN files.'), 'error');
            }
        });
    }

    if (inspectBtn) {
        inspectBtn.addEventListener('click', async () => {
            await inspectPaths();
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener('click', async () => {
            const missing = inspectedRows
                .filter((row) => !row?.hasCue)
                .map((row) => String(row?.binPath || '').trim())
                .filter(Boolean);
            const target = dedupePaths(missing.length > 0 ? missing : selectedBinPaths);
            if (target.length === 0) {
                setStatus(t('tools.cueMakerNoSelection', 'Select one or more BIN files first.'), 'warning');
                return;
            }
            setRunning(true);
            try {
                const result = await window.emubro.invoke('cue:generate-for-bin', target);
                if (!result?.success) {
                    setStatus(String(result?.message || 'Failed to generate CUE files.'), 'error');
                    return;
                }
                const generatedCount = Number(result?.generated?.length || 0);
                const existingCount = Number(result?.existing?.length || 0);
                const failedCount = Number(result?.failed?.length || 0);
                setStatus(
                    t('tools.cueMakerGeneratedSummary', 'Generated {{generated}}, already existed {{existing}}, failed {{failed}}.', {
                        generated: generatedCount,
                        existing: existingCount,
                        failed: failedCount
                    }),
                    failedCount > 0 ? 'warning' : 'success'
                );
                await inspectPaths(selectedBinPaths);
            } catch (error) {
                setStatus(String(error?.message || error || 'Failed to generate CUE files.'), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    inspectedRows = [];
    renderResults();
}

function renderEcmUnecmTool() {
    const gamesContainer = document.getElementById('games-container');
    if (!gamesContainer) return;

    const toolContent = document.createElement('div');
    toolContent.className = 'tool-content ecm-unecm-tool';
    toolContent.innerHTML = `
        <h3>${escapeHtml(t('tools.ecmUnecm', 'ECM/UNECM'))}</h3>
        <p>${escapeHtml(t('tools.ecmUnecmDesc', 'Download ECM/UNECM from upstream as a separate GPL tool archive (not bundled into emuBro code).'))}</p>
        <p class="tool-output" data-ecm-note>${escapeHtml(t('tools.ecmUnecmLegalNote', 'This tool is provided by upstream under GPL. emuBro only downloads it as an external separate archive.'))}</p>
        <p class="tool-output" data-ecm-source>${escapeHtml(t('tools.ecmUnecmNoSourceSelected', 'Source: not selected'))}</p>
        <p class="tool-output" data-ecm-env>${escapeHtml(t('tools.ecmUnecmEnvUnknown', 'Build environment: not checked'))}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="action-btn" data-ecm-action="download">${escapeHtml(t('tools.ecmUnecmDownloadZip', 'Download Source ZIP'))}</button>
            <button type="button" class="action-btn" data-ecm-action="pick-source">${escapeHtml(t('tools.ecmUnecmPickSource', 'Select Source Path'))}</button>
            <button type="button" class="action-btn" data-ecm-action="detect-env">${escapeHtml(t('tools.ecmUnecmDetectEnv', 'Detect Build Env'))}</button>
            <button type="button" class="action-btn" data-ecm-action="build">${escapeHtml(t('tools.ecmUnecmBuild', 'Build Binaries'))}</button>
            <button type="button" class="action-btn" data-ecm-action="repo">${escapeHtml(t('tools.ecmUnecmOpenRepo', 'Open Upstream Repo'))}</button>
            <button type="button" class="action-btn" data-ecm-action="source-url">${escapeHtml(t('tools.ecmUnecmOpenZipUrl', 'Open ZIP URL'))}</button>
            <button type="button" class="action-btn" data-ecm-action="show-folder" style="display:none;">${escapeHtml(t('tools.ecmUnecmShowDownload', 'Show Download'))}</button>
            <button type="button" class="action-btn" data-ecm-action="show-build-folder" style="display:none;">${escapeHtml(t('tools.ecmUnecmShowBuild', 'Show Build Output'))}</button>
        </div>
        <p class="tool-output" data-ecm-status aria-live="polite"></p>
        <div class="cover-downloader-results" data-ecm-results></div>
    `;
    gamesContainer.appendChild(toolContent);

    const statusEl = toolContent.querySelector('[data-ecm-status]');
    const resultsEl = toolContent.querySelector('[data-ecm-results]');
    const noteEl = toolContent.querySelector('[data-ecm-note]');
    const sourceEl = toolContent.querySelector('[data-ecm-source]');
    const envEl = toolContent.querySelector('[data-ecm-env]');
    const downloadBtn = toolContent.querySelector('[data-ecm-action="download"]');
    const pickSourceBtn = toolContent.querySelector('[data-ecm-action="pick-source"]');
    const detectEnvBtn = toolContent.querySelector('[data-ecm-action="detect-env"]');
    const buildBtn = toolContent.querySelector('[data-ecm-action="build"]');
    const repoBtn = toolContent.querySelector('[data-ecm-action="repo"]');
    const sourceUrlBtn = toolContent.querySelector('[data-ecm-action="source-url"]');
    const showFolderBtn = toolContent.querySelector('[data-ecm-action="show-folder"]');
    const showBuildFolderBtn = toolContent.querySelector('[data-ecm-action="show-build-folder"]');

    let lastDownloadedPath = '';
    let selectedSourcePath = '';
    let lastBuildOutputPath = '';
    let info = null;
    let detectedEnvironment = null;

    const setStatus = (message, level = 'info') => {
        if (!statusEl) return;
        statusEl.textContent = String(message || '').trim();
        statusEl.dataset.level = String(level || 'info');
    };

    const setSourcePath = (value) => {
        selectedSourcePath = String(value || '').trim();
        if (!sourceEl) return;
        if (!selectedSourcePath) {
            sourceEl.textContent = t('tools.ecmUnecmNoSourceSelected', 'Source: not selected');
            return;
        }
        sourceEl.textContent = t('tools.ecmUnecmSourceSelected', 'Source: {{path}}', {
            path: selectedSourcePath
        });
    };

    const setEnvironmentSummary = (env) => {
        detectedEnvironment = env && typeof env === 'object' ? env : null;
        if (!envEl) return;
        if (!detectedEnvironment) {
            envEl.textContent = t('tools.ecmUnecmEnvUnknown', 'Build environment: not checked');
            return;
        }
        const compiler = String(detectedEnvironment.recommendedCompiler || '').trim();
        envEl.textContent = compiler
            ? t('tools.ecmUnecmEnvDetected', 'Build environment: compiler {{compiler}} available', { compiler })
            : t('tools.ecmUnecmEnvNoCompiler', 'Build environment detected, but no C compiler found');
    };

    const renderResults = (rows = []) => {
        if (!resultsEl) return;
        const list = Array.isArray(rows) ? rows : [];
        if (list.length === 0) {
            resultsEl.innerHTML = `<div class="cover-download-row is-empty">${escapeHtml(t('tools.ecmUnecmNoDownloadsYet', 'No downloads yet.'))}</div>`;
            return;
        }
        resultsEl.innerHTML = list.map((row) => {
            const filePath = String(row?.filePath || '').trim();
            const sizeBytes = Number(row?.sizeBytes || 0);
            const sizeLabel = Number.isFinite(sizeBytes) && sizeBytes > 0 ? formatBytes(sizeBytes) : '';
            const sourceUrl = String(row?.sourceUrl || '').trim();
            return `
                <div class="cover-download-row" data-level="${row?.success ? 'success' : 'error'}">
                    <div class="cover-download-game">
                        ${escapeHtml(getFileNameFromPath(filePath) || filePath || t('tools.unknown', 'Unknown'))}
                        <span>${escapeHtml(filePath || '')}</span>
                        ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(t('tools.coverDownloaderOpenSource', 'Open source'))}</a>` : ''}
                    </div>
                    <div class="cover-download-status">${escapeHtml(sizeLabel || (row?.success ? t('tools.coverDownloaderResultDownloaded', 'Downloaded') : t('tools.coverDownloaderResultFailed', 'Failed')))}</div>
                </div>
            `;
        }).join('');
    };

    const setRunning = (running) => {
        const isRunning = !!running;
        if (downloadBtn) downloadBtn.disabled = isRunning;
        if (pickSourceBtn) pickSourceBtn.disabled = isRunning;
        if (detectEnvBtn) detectEnvBtn.disabled = isRunning;
        if (buildBtn) buildBtn.disabled = isRunning;
        if (repoBtn) repoBtn.disabled = isRunning;
        if (sourceUrlBtn) sourceUrlBtn.disabled = isRunning;
    };

    const openUrl = async (url) => {
        const target = String(url || '').trim();
        if (!target) return;
        try {
            await window.emubro.invoke('open-external-url', target);
        } catch (error) {
            setStatus(String(error?.message || error || 'Failed to open URL.'), 'error');
        }
    };

    const loadInfo = async () => {
        try {
            const response = await window.emubro.invoke('tools:ecm:get-download-info');
            if (!response?.success) return;
            info = response;
            if (noteEl) {
                noteEl.textContent = t('tools.ecmUnecmLegalNoteWithLicense', 'License: {{license}}. Downloaded separately from upstream.', {
                    license: String(response?.license || 'GPL')
                });
            }
            const envResponse = await window.emubro.invoke('tools:ecm:detect-build-env');
            if (envResponse?.success) {
                setEnvironmentSummary(envResponse.environment);
            }
        } catch (_error) {}
    };

    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            setRunning(true);
            setStatus(t('tools.status.ecmUnecmDownloadRunning', 'Downloading ECM/UNECM source ZIP...'), 'info');
            try {
                const result = await window.emubro.invoke('tools:ecm:download-source-zip', {});
                if (!result?.success) {
                    if (result?.canceled) {
                        setStatus(t('tools.ecmUnecmDownloadCanceled', 'Download canceled.'), 'warning');
                    } else {
                        setStatus(String(result?.message || t('tools.status.ecmUnecmDownloadFailed', 'Failed to download ECM/UNECM archive.')), 'error');
                    }
                    return;
                }
                lastDownloadedPath = String(result?.filePath || '').trim();
                if (lastDownloadedPath) {
                    setSourcePath(lastDownloadedPath);
                }
                if (showFolderBtn) showFolderBtn.style.display = lastDownloadedPath ? '' : 'none';
                renderResults([result]);
                setStatus(t('tools.status.ecmUnecmDownloadSuccess', 'ECM/UNECM source ZIP downloaded.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmDownloadFailed', 'Failed to download ECM/UNECM archive.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (pickSourceBtn) {
        pickSourceBtn.addEventListener('click', async () => {
            try {
                const pick = await window.emubro.invoke('open-file-dialog', {
                    title: t('tools.ecmUnecmPickSource', 'Select Source Path'),
                    properties: ['openFile', 'openDirectory'],
                    filters: [
                        { name: 'ZIP Archive', extensions: ['zip'] },
                        { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                    ]
                });
                if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
                const selected = String(pick.filePaths[0] || '').trim();
                if (!selected) return;
                setSourcePath(selected);
                setStatus(t('tools.ecmUnecmSourcePicked', 'Source path selected.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.ecmUnecmPickSourceFailed', 'Failed to select source path.')), 'error');
            }
        });
    }

    if (detectEnvBtn) {
        detectEnvBtn.addEventListener('click', async () => {
            setRunning(true);
            setStatus(t('tools.status.ecmUnecmDetectRunning', 'Detecting build environment...'), 'info');
            try {
                const response = await window.emubro.invoke('tools:ecm:detect-build-env');
                if (!response?.success) {
                    setStatus(String(response?.message || t('tools.status.ecmUnecmDetectFailed', 'Failed to detect build environment.')), 'error');
                    return;
                }
                setEnvironmentSummary(response.environment || null);
                setStatus(t('tools.status.ecmUnecmDetectSuccess', 'Build environment detected.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmDetectFailed', 'Failed to detect build environment.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (buildBtn) {
        buildBtn.addEventListener('click', async () => {
            const sourcePath = String(selectedSourcePath || lastDownloadedPath || '').trim();
            if (!sourcePath) {
                setStatus(t('tools.ecmUnecmNoSourceForBuild', 'Select a source ZIP/folder first.'), 'warning');
                return;
            }
            setRunning(true);
            setStatus(t('tools.status.ecmUnecmBuildRunning', 'Building ECM/UNECM binaries...'), 'info');
            try {
                const result = await window.emubro.invoke('tools:ecm:build-binaries', {
                    sourcePath,
                    compiler: String(detectedEnvironment?.recommendedCompiler || '').trim()
                });
                if (!result?.success) {
                    setStatus(String(result?.message || t('tools.status.ecmUnecmBuildFailed', 'Build failed.')), 'error');
                    return;
                }
                const binaries = Array.isArray(result?.binaries) ? result.binaries : [];
                lastBuildOutputPath = String(binaries[0] || result?.outputDir || '').trim();
                if (showBuildFolderBtn) showBuildFolderBtn.style.display = lastBuildOutputPath ? '' : 'none';
                const rows = binaries.map((filePath) => ({
                    success: true,
                    filePath,
                    sizeBytes: 0,
                    sourceUrl: ''
                }));
                renderResults(rows.length > 0 ? rows : [{
                    success: true,
                    filePath: String(result?.outputDir || ''),
                    sizeBytes: 0,
                    sourceUrl: ''
                }]);
                if (result?.environment) {
                    setEnvironmentSummary(result.environment);
                }
                setStatus(t('tools.status.ecmUnecmBuildSuccess', 'ECM/UNECM binaries built successfully.'), 'success');
            } catch (error) {
                setStatus(String(error?.message || error || t('tools.status.ecmUnecmBuildFailed', 'Build failed.')), 'error');
            } finally {
                setRunning(false);
            }
        });
    }

    if (repoBtn) {
        repoBtn.addEventListener('click', async () => {
            await openUrl(info?.repoUrl || 'https://github.com/qeedquan/ecm/tree/master');
        });
    }

    if (sourceUrlBtn) {
        sourceUrlBtn.addEventListener('click', async () => {
            await openUrl(info?.sourceZipUrl || 'https://codeload.github.com/qeedquan/ecm/zip/refs/heads/master');
        });
    }

    if (showFolderBtn) {
        showFolderBtn.addEventListener('click', async () => {
            if (!lastDownloadedPath) return;
            const result = await window.emubro.invoke('show-item-in-folder', lastDownloadedPath);
            if (!result?.success) {
                setStatus(String(result?.message || t('tools.status.openFolderFailed', 'Failed to open folder.')), 'error');
            }
        });
    }

    if (showBuildFolderBtn) {
        showBuildFolderBtn.addEventListener('click', async () => {
            if (!lastBuildOutputPath) return;
            const result = await window.emubro.invoke('show-item-in-folder', lastBuildOutputPath);
            if (!result?.success) {
                setStatus(String(result?.message || t('tools.status.openFolderFailed', 'Failed to open folder.')), 'error');
            }
        });
    }

    renderResults([]);
    setSourcePath('');
    setEnvironmentSummary(null);
    void loadInfo();
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
