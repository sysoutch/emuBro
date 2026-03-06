/**
 * Tools Manager
 */

const log = console;

import { GamepadTool } from './tools/gamepad-tool.js';
import { MonitorTool } from './tools/monitor-tool.js';
import { MemoryCardTool } from './tools/memory-card-tool.js';
import { showTextInputDialog } from './ui/text-input-dialog.js';
import { createToolPluginManager } from './tools/tool-plugin-manager.js';
import { createCustomToolShortcutsSection } from './tools/custom-tool-shortcuts-section.js';
import { renderCoverDownloaderTool } from './tools/cover-downloader-tool.js';
import { renderCueMakerTool } from './tools/cue-maker-tool.js';
import { renderEcmUnecmTool } from './tools/ecm-unecm-tool.js';
import { renderRemoteLibraryTool } from './tools/remote-library-tool.js';
import { renderBiosManagerTool } from './tools/bios-manager-tool.js';

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

const toolPluginManager = createToolPluginManager({
    t,
    escapeHtml,
    showToolView: (toolId) => showToolView(toolId)
});

export function showToolView(tool) {
    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    const editingPluginId = toolPluginManager.parseCreateToolRouteId(tool);
    const activePluginId = toolPluginManager.parsePluginRouteId(tool);
    const activePlugin = activePluginId ? toolPluginManager.findToolPluginById(activePluginId) : null;
    
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
        else if (editingPluginId !== null) title = editingPluginId
            ? t('tools.editToolTitle', 'Edit Tool')
            : t('tools.createNewTool', 'Create New Tool');
        else if (activePlugin) title = activePlugin.name;
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
                renderCoverDownloaderTool({ t, escapeHtml });
                break;
            case "cue-maker":
                renderCueMakerTool({ t, escapeHtml });
                break;
            case "ecm-unecm":
                renderEcmUnecmTool({ t, escapeHtml });
                break;
            case "remote-library":
                renderRemoteLibraryTool({ t, escapeHtml, showTextInputDialog, log });
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
            case "create-tool":
                toolPluginManager.renderToolPluginBuilder(null);
                break;
            case "bios":
                renderBiosManagerTool({ t, escapeHtml });
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
                if (editingPluginId !== null) {
                    toolPluginManager.renderToolPluginBuilder(
                        editingPluginId ? toolPluginManager.findToolPluginById(editingPluginId) : null
                    );
                    return;
                }
                if (activePlugin) {
                    toolPluginManager.renderToolPluginView(activePlugin);
                    return;
                }
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
        { id: "remote-library", icon: "fas fa-network-wired", name: t('tools.remoteLibrary', 'Remote Library'), desc: t('tools.remoteLibraryOverviewDesc', 'Discover LAN hosts, import games, and copy files over the network.') },
        { id: "rom-ripper", icon: "fas fa-compact-disc", name: t('tools.romRipper', 'ROM Ripper'), desc: t('tools.romRipperOverviewDesc', 'Create backups of physical discs.') },
        { id: "game-database", icon: "fas fa-database", name: t('tools.gameDatabase', 'Game Database'), desc: t('tools.gameDatabaseOverviewDesc', 'Explore the global database.') },
        { id: "cheat-codes", icon: "fas fa-magic", name: t('tools.cheatCodes', 'Cheat Codes'), desc: t('tools.cheatCodesOverviewDesc', 'Apply GameShark or Action Replay.') },
        { id: "gamepad", icon: "fas fa-gamepad", name: t('tools.gamepadTester', 'Gamepad Tester'), desc: t('tools.gamepadTesterDesc', 'Test and map your controllers.') },
        { id: "monitor", icon: "fas fa-desktop", name: t('tools.monitorManager', 'Monitor Manager'), desc: t('tools.monitorManagerDesc', 'Manage displays and orientation.') },
        { id: "bios", icon: "fas fa-microchip", name: t('tools.biosManager', 'BIOS Manager'), desc: t('tools.biosManagerDesc', 'Manage BIOS files per platform.') }
    ];
    const createCard = {
        id: 'create-tool',
        icon: 'fas fa-plus-circle',
        name: t('tools.createNewTool', 'Create New Tool'),
        desc: t('tools.createNewToolDesc', 'Build a plugin tool manually or generate a draft with LLM.'),
        actionLabel: t('tools.createTool', 'Create Tool'),
        extraClass: 'tool-card-create'
    };
    const pluginCards = toolPluginManager.getOverviewPluginCards();

    const cards = [...tools, ...pluginCards, createCard];

    overview.innerHTML = `
        <div class="tools-grid">
            ${cards.map((toolMeta) => `
                <div class="tool-card ${escapeHtml(toolMeta.extraClass || '')}" data-tool-id="${escapeHtml(toolMeta.id)}" data-tool-mode="${escapeHtml(toolMeta.mode || '')}">
                    <div class="tool-icon"><i class="${toolMeta.icon}"></i></div>
                    <h3>${escapeHtml(toolMeta.name)}</h3>
                    <p>${escapeHtml(toolMeta.desc)}</p>
                    <button class="action-btn">${escapeHtml(toolMeta.actionLabel || t('tools.openTool', 'Open Tool'))}</button>
                </div>
            `).join("")}
        </div>
    `;

    gamesContainer.appendChild(overview);
    overview.appendChild(createCustomToolShortcutsSection({ t, escapeHtml }));

    overview.querySelectorAll(".tool-card").forEach(card => {
        card.addEventListener("click", () => {
            showToolView(card.dataset.toolId);
        });
    });
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
