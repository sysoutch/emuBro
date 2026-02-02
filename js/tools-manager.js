/**
 * Tools Manager
 */

const { ipcRenderer } = require("electron");
const log = require("electron-log");

import { GamepadTool } from './tools/gamepad-tool.js';
import { MonitorTool } from './tools/monitor-tool.js';
import { MemoryCardTool } from './tools/memory-card-tool.js';

// Create instances of tools
const gamepadTool = new GamepadTool();
const monitorTool = new MonitorTool();
const memoryCardTool = new MemoryCardTool();

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
        // Use a fallback if i18n isn't globally available yet
        const title = tool ? (tool.charAt(0).toUpperCase() + tool.slice(1).replace("-", " ")) : "Tools";
        gamesHeader.textContent = title;
    }
    
    if (gamesContainer) {
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
            // Placeholders for other tools
            case "rom-ripper":
                renderPlaceholder("ROM Ripper");
                break;
            case "game-database":
                renderPlaceholder("Game Database");
                break;
            default:
                gamesContainer.innerHTML = `<p>Tool "${tool}" is not yet implemented.</p>`;
        }
    }
}

function renderToolsOverview() {
    const gamesContainer = document.getElementById("games-container");
    const overview = document.createElement("div");
    overview.className = "tools-overview";
    
    const tools = [
        { id: "memory-card", icon: "fas fa-memory", name: "Memory Card Editor", desc: "Manage PS1/PS2 save files." },
        { id: "rom-ripper", icon: "fas fa-compact-disc", name: "ROM Ripper", desc: "Create backups of physical discs." },
        { id: "game-database", icon: "fas fa-database", name: "Game Database", desc: "Explore the global database." },
        { id: "cheat-codes", icon: "fas fa-magic", name: "Cheat Codes", desc: "Apply GameShark or Action Replay." },
        { id: "gamepad", icon: "fas fa-gamepad", name: "Gamepad Tester", desc: "Test and map your controllers." },
        { id: "monitor", icon: "fas fa-desktop", name: "Monitor Manager", desc: "Manage displays and orientation." }
    ];

    overview.innerHTML = `
        <div class="tools-grid">
            ${tools.map(t => `
                <div class="tool-card" data-tool-id="${t.id}">
                    <div class="tool-icon"><i class="${t.icon}"></i></div>
                    <h3>${t.name}</h3>
                    <p>${t.desc}</p>
                    <button class="action-btn">Open Tool</button>
                </div>
            `).join("")}
        </div>
    `;

    gamesContainer.appendChild(overview);

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
                <option value="game1">Game 1</option>
                <option value="game2">Game 2</option>
                <option value="game3">Game 3</option>
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
