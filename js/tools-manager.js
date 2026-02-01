/**
 * Tools Manager
 */

const { ipcRenderer } = require("electron");
const log = require("electron-log");

export function showToolView(tool) {
    const gamesContainer = document.getElementById("games-container");
    const gamesHeader = document.getElementById("games-header");
    
    document.querySelectorAll("[data-tool]").forEach(link => {
        link.classList.remove("active");
    });
    const toolLink = document.querySelector(`[data-tool="${tool}"]`);
    if (toolLink) toolLink.classList.add("active");
    
    if (gamesHeader) {
        gamesHeader.textContent = tool ? (tool.charAt(0).toUpperCase() + tool.slice(1).replace("-", " ")) : "Tools";
    }
    
    if (gamesContainer) {
        gamesContainer.innerHTML = "";
        
        if (!tool) {
            renderToolsOverview();
            return;
        }

        switch(tool) {
            case "memory-card":
                renderMemoryCardTool();
                break;
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
                gamesContainer.innerHTML = `<p>${i18n.t("tools.notImplemented")}</p>`;
        }
    }
}

function renderToolsOverview() {
    const gamesContainer = document.getElementById("games-container");
    const overview = document.createElement("div");
    overview.className = "tools-overview";
    
    const tools = [
        { id: "memory-card", icon: "fas fa-memory", name: "Memory Card Editor", desc: "Manage PS1/PS2 save files in a dual-pane editor." },
        { id: "rom-ripper", icon: "fas fa-compact-disc", name: "ROM Ripper", desc: "Create backups of your physical game discs." },
        { id: "game-database", icon: "fas fa-database", name: "Game Database", desc: "Explore the global database of retro games." },
        { id: "cheat-codes", icon: "fas fa-magic", name: "Cheat Codes", desc: "Apply GameShark, Action Replay, or other cheats." }
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

function renderMemoryCardTool() {
    const gamesContainer = document.getElementById("games-container");
    const toolContent = document.createElement("div");
    toolContent.className = "tool-content memory-card-editor";
    toolContent.innerHTML = `
        <div class="editor-layout">
            <!-- Left Card Slot -->
            <div class="card-slot" id="slot-1">
                <div class="slot-header">
                    <label>Memory Card 1:</label>
                    <div class="header-controls">
                        <select class="card-select"><option value="">Select Card...</option></select>
                        <button class="icon-btn add-btn" title="New Card"><i class="fas fa-plus-square"></i></button>
                        <button class="icon-btn open-btn" title="Open Card"><i class="fas fa-folder-open"></i></button>
                    </div>
                </div>
                <div class="save-table-container">
                    <table class="save-table">
                        <thead>
                            <tr>
                                <th class="col-icon">Icon</th>
                                <th class="col-title">Title</th>
                                <th class="col-name">File Name</th>
                                <th class="col-blocks">Blocks</th>
                            </tr>
                        </thead>
                        <tbody class="save-list">
                            <!-- Saves will be injected here -->
                        </tbody>
                    </table>
                </div>
                <div class="slot-footer">
                    <button class="action-btn small">Format Card</button>
                    <button class="action-btn small">Import File...</button>
                    <button class="action-btn small">Import Card...</button>
                    <button class="action-btn small primary">Save</button>
                </div>
            </div>

            <!-- Central Controls -->
            <div class="central-controls">
                <button class="control-btn" disabled>Delete File</button>
                <button class="control-btn" disabled>Undelete File</button>
                <button class="control-btn" disabled>Rename File</button>
                <button class="control-btn" disabled>Export File</button>
                <button class="control-btn move-btn" disabled><i class="fas fa-chevron-left"></i><i class="fas fa-chevron-left"></i></button>
                <button class="control-btn move-btn" disabled><i class="fas fa-chevron-right"></i><i class="fas fa-chevron-right"></i></button>
            </div>

            <!-- Right Card Slot -->
            <div class="card-slot" id="slot-2">
                <div class="slot-header">
                    <label>Memory Card 2:</label>
                    <div class="header-controls">
                        <select class="card-select"><option value="">Select Card...</option></select>
                        <button class="icon-btn add-btn" title="New Card"><i class="fas fa-plus-square"></i></button>
                        <button class="icon-btn open-btn" title="Open Card"><i class="fas fa-folder-open"></i></button>
                    </div>
                </div>
                <div class="save-table-container">
                    <table class="save-table">
                        <thead>
                            <tr>
                                <th class="col-icon">Icon</th>
                                <th class="col-title">Title</th>
                                <th class="col-name">File Name</th>
                                <th class="col-blocks">Blocks</th>
                            </tr>
                        </thead>
                        <tbody class="save-list">
                            <!-- Saves will be injected here -->
                        </tbody>
                    </table>
                </div>
                <div class="slot-footer">
                    <button class="action-btn small">Format Card</button>
                    <button class="action-btn small">Import File...</button>
                    <button class="action-btn small">Import Card...</button>
                    <button class="action-btn small primary">Save</button>
                </div>
            </div>
        </div>
    `;
    gamesContainer.appendChild(toolContent);
    
    setupEditorLogic();
}

function setupEditorLogic() {
    const slot1Open = document.querySelector("#slot-1 .open-btn");
    const slot2Open = document.querySelector("#slot-2 .open-btn");

    if (!slot1Open || !slot2Open) return;

    slot1Open.addEventListener("click", () => handleNativeOpen("slot-1"));
    slot2Open.addEventListener("click", () => handleNativeOpen("slot-2"));

    // Handle Drag and Drop
    setupSlotDropZone("slot-1");
    setupSlotDropZone("slot-2");
}

async function handleNativeOpen(slotId) {
    try {
        const result = await ipcRenderer.invoke("open-file-dialog", {
            properties: ["openFile"],
            filters: [
                { name: "Memory Cards", extensions: ["mcr", "mcd", "gme", "ps2", "max", "psu"] },
                { name: "All Files", extensions: ["*"] }
            ]
        });

        if (!result.canceled && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            log.info(`(Renderer) File selected via native dialog for ${slotId}: ${filePath}`);
            readMemoryCardForSlot(filePath, slotId);
        }
    } catch (error) {
        log.error("Error opening file dialog:", error);
    }
}

function setupSlotDropZone(slotId) {
    const slot = document.getElementById(slotId);
    if (!slot) return;

    slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", () => {
        slot.classList.remove("drag-over");
    });

    slot.addEventListener("drop", (e) => {
        e.preventDefault();
        slot.classList.remove("drag-over");
        const file = e.dataTransfer.files[0];
        if (file && file.path) {
            log.info(`(Renderer) File dropped for ${slotId}: ${file.path}`);
            readMemoryCardForSlot(file.path, slotId);
        }
    });
}

async function readMemoryCardForSlot(filePath, slotId) {
    try {
        const result = await ipcRenderer.invoke("read-memory-card", filePath);
        if (result.success) {
            populateSlot(slotId, result.data);
        } else {
            alert(i18n.t("tools.readFailed", {message: result.message}));
        }
    } catch (error) {
        log.error("Error reading card for " + slotId, error);
    }
}

function populateSlot(slotId, data) {
    const tbody = document.querySelector(`#${slotId} .save-list`);
    if (!tbody) return;

    tbody.innerHTML = "";

    if (data.format === "PlayStation 1" && data.saves) {
        data.saves.forEach(save => {
            const tr = document.createElement("tr");
            const iconHtml = save.icon ? `<img src="${createDataURL(save.icon)}" class="save-icon-img" alt="Save Icon"/>` : `<i class="fas fa-save"></i>`;

            tr.innerHTML = `
                <td class="col-icon">${iconHtml}</td>
                <td class="col-title">${save.title}</td>
                <td class="col-name">${save.productCode}</td>
                <td class="col-blocks">${Math.ceil(save.size / 8192)}</td>
            `;
            tr.addEventListener("click", () => {
                tbody.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
                tr.classList.add("selected");
                updateCentralControls();
            });
            tbody.appendChild(tr);
        });
    } else if (data.format === "PlayStation 2") {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="4" class="centered">${data.message}</td>`;
        tbody.appendChild(tr);
    } else {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="4" class="centered">Empty or Unsupported Card</td>`;
        tbody.appendChild(tr);
    }
}

function updateCentralControls() {
    const hasSelection = !!document.querySelector(".save-list tr.selected");
    document.querySelectorAll(".central-controls .control-btn").forEach(btn => {
        btn.disabled = !hasSelection;
    });
}

// Helper to create a data URL from raw pixel data for rendering in the browser
function createDataURL(icon) {
    // 1. Double check we have data
    if (!icon || !icon.pixels) return "";

    // 2. Extract raw array from Electron/IPC "Buffer" object if needed
    const rawData = icon.pixels.data ? icon.pixels.data : icon.pixels;
    
    // 3. Ensure it's the right length (16x16 * 4 channels = 1024)
    if (rawData.length === 0) return "";

    const canvas = document.createElement("canvas");
    canvas.width = icon.width || 16;
    canvas.height = icon.height || 16;
    const ctx = canvas.getContext("2d");

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    
    // Use the TypedArray for the canvas
    const pixelArray = new Uint8ClampedArray(rawData);
    imageData.data.set(pixelArray);
    
    ctx.putImageData(imageData, 0, 0);
    
    const dataUrl = canvas.toDataURL("image/png");
    console.log("Generated DataURL length:", dataUrl.length); // Should be > 500 characters
    return dataUrl;
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

export function showMemoryCardReader() {
    renderMemoryCardTool();
}
