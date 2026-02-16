const emubro = window.emubro;

export class MemoryCardTool {
    constructor() {
        this.toolName = 'memory-card-editor';
        this.currentSlot1Path = null;
        this.currentSlot2Path = null;
        this.selectedSave = null; // { slotId: "slot-1"|"slot-2", index: number, save: object }
    }

    render(container) {
        const toolContent = document.createElement("div");
        toolContent.className = "tool-content memory-card-editor";
        toolContent.innerHTML = `
            <div class="editor-layout">
                <!-- Left Card Slot -->
                <div class="card-slot" id="slot-1">
                    <div class="slot-header">
                        <label>${i18n.t("tools.memoryCard1") || "Memory Card 1"}:</label>
                        <div class="header-controls">
                            <div class="current-file-label">No Card Loaded</div>
                            <button class="icon-btn open-btn" title="Open Card"><i class="fas fa-folder-open"></i></button>
                        </div>
                    </div>
                    <div class="save-table-container">
                        <table class="save-table">
                            <thead>
                                <tr>
                                    <th class="col-icon">Icon</th>
                                    <th class="col-title">Title</th>
                                    <th class="col-name">Code</th>
                                    <th class="col-blocks">Size</th>
                                </tr>
                            </thead>
                            <tbody class="save-list">
                                <tr class="empty-msg"><td colspan="4">Drag & Drop Memory Card File Here</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="slot-footer">
                        <div class="card-stats">Free Blocks: <span class="free-blocks">-</span></div>
                        <div class="slot-actions">
                            <button class="action-btn small" disabled>Format Card</button>
                            <button class="action-btn small" disabled>Import Save...</button>
                        </div>
                    </div>
                </div>

                <!-- Central Controls -->
                <div class="central-controls">
                    <button class="control-btn" id="delete-btn" disabled title="Delete Selected Save"><i class="fas fa-trash"></i></button>
                    <button class="control-btn" id="undelete-btn" disabled title="Undelete Save">Undelete</button>
                    <button class="control-btn" id="rename-btn" disabled title="Rename Save">Rename</button>
                    <button class="control-btn" id="export-btn" disabled title="Export Save">Export</button>
                    <button class="control-btn move-btn" id="move-left-btn" disabled title="Copy to Left"><i class="fas fa-chevron-left"></i> Copy</button>
                    <button class="control-btn move-btn" id="move-right-btn" disabled title="Copy to Right">Copy <i class="fas fa-chevron-right"></i></button>
                </div>

                <!-- Right Card Slot -->
                <div class="card-slot" id="slot-2">
                    <div class="slot-header">
                        <label>${i18n.t("tools.memoryCard2") || "Memory Card 2"}:</label>
                        <div class="header-controls">
                            <div class="current-file-label">No Card Loaded</div>
                            <button class="icon-btn open-btn" title="Open Card"><i class="fas fa-folder-open"></i></button>
                        </div>
                    </div>
                    <div class="save-table-container">
                        <table class="save-table">
                            <thead>
                                <tr>
                                    <th class="col-icon">Icon</th>
                                    <th class="col-title">Title</th>
                                    <th class="col-name">Code</th>
                                    <th class="col-blocks">Size</th>
                                </tr>
                            </thead>
                            <tbody class="save-list">
                                <tr class="empty-msg"><td colspan="4">Drag & Drop Memory Card File Here</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="slot-footer">
                        <div class="card-stats">Free Blocks: <span class="free-blocks">-</span></div>
                        <div class="slot-actions">
                            <button class="action-btn small" disabled>Format Card</button>
                            <button class="action-btn small" disabled>Import Save...</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(toolContent);
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        const slot1Open = document.querySelector("#slot-1 .open-btn");
        const slot2Open = document.querySelector("#slot-2 .open-btn");

        if (slot1Open) slot1Open.addEventListener("click", () => this.handleNativeOpen("slot-1"));
        if (slot2Open) slot2Open.addEventListener("click", () => this.handleNativeOpen("slot-2"));

        this.setupSlotDropZone("slot-1");
        this.setupSlotDropZone("slot-2");

        // Central Controls
        document.getElementById('delete-btn').addEventListener('click', () => this.deleteSelectedSave());
        document.getElementById('rename-btn').addEventListener('click', () => this.renameSelectedSave());
        
        // Slot Actions (Format)
        document.querySelectorAll('.slot-actions .action-btn').forEach(btn => {
            if (btn.textContent.includes("Format")) {
                btn.addEventListener('click', (e) => {
                    const slotId = e.target.closest('.card-slot').id;
                    this.formatCard(slotId);
                });
            }
        });
    }

    async handleNativeOpen(slotId) {
        try {
            const result = await emubro.invoke("open-file-dialog", {
                properties: ["openFile"],
                filters: [
                    { name: "Memory Cards", extensions: ["mcr", "mcd", "gme", "ps2", "max", "psu"] },
                    { name: "All Files", extensions: ["*"] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                this.loadCard(slotId, filePath);
            }
        } catch (error) {
            console.error("Error opening file dialog:", error);
        }
    }

    setupSlotDropZone(slotId) {
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
                this.loadCard(slotId, file.path);
            }
        });
    }

    async loadCard(slotId, filePath) {
        try {
            const result = await emubro.invoke("read-memory-card", filePath);
            if (result.success) {
                if (slotId === "slot-1") this.currentSlot1Path = filePath;
                else this.currentSlot2Path = filePath;

                // Update UI Label
                const label = document.querySelector(`#${slotId} .current-file-label`);
                if (label) label.textContent = filePath.split(/[\\/]/).pop();

                this.updateSlotControls(slotId, true);
                this.populateSlot(slotId, result.data);
            } else {
                alert(i18n.t("tools.readFailed", {message: result.message}) || `Read Failed: ${result.message}`);
            }
        } catch (error) {
            console.error("Error reading card for " + slotId, error);
        }
    }

    populateSlot(slotId, data) {
        const tbody = document.querySelector(`#${slotId} .save-list`);
        const stats = document.querySelector(`#${slotId} .free-blocks`);
        if (!tbody) return;

        tbody.innerHTML = "";

        if (data.format === "PlayStation 1" && data.saves) {
            if (stats) stats.textContent = data.freeBlocks;

            if (data.saves.length === 0) {
                 tbody.innerHTML = `<tr class="empty-msg"><td colspan="4">Empty Card</td></tr>`;
            }

            data.saves.forEach((save, index) => {
                const tr = document.createElement("tr");
                const iconHtml = save.icon ? `<img src="${this.createDataURL(save.icon)}" class="save-icon-img" alt="Save Icon"/>` : `<i class="fas fa-save"></i>`;
                const blocksText = save.blocks + (save.isMultiBlock ? "+" : "");

                tr.innerHTML = `
                    <td class="col-icon">${iconHtml}</td>
                    <td class="col-title">${save.title}</td>
                    <td class="col-name">${save.productCode}</td>
                    <td class="col-blocks">${blocksText}</td>
                `;
                tr.addEventListener("click", () => {
                    this.selectSave(slotId, index, save, tr);
                });
                tbody.appendChild(tr);
            });
        } else if (data.format === "PlayStation 2") {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="4" class="centered">${data.message}</td>`;
            tbody.appendChild(tr);
            if (stats) stats.textContent = "?";
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="4" class="centered">Empty or Unsupported Card</td>`;
            tbody.appendChild(tr);
        }
    }

    selectSave(slotId, index, save, rowElement) {
        // Deselect all
        document.querySelectorAll(".save-list tr").forEach(r => r.classList.remove("selected"));
        
        // Select clicked
        rowElement.classList.add("selected");
        
        this.selectedSave = { slotId, index, save };
        this.updateCentralControls();
    }

    updateCentralControls() {
        const deleteBtn = document.getElementById('delete-btn');
        const renameBtn = document.getElementById('rename-btn');
        const exportBtn = document.getElementById('export-btn');
        
        const hasSelection = !!this.selectedSave;
        
        deleteBtn.disabled = !hasSelection;
        renameBtn.disabled = !hasSelection;
        // exportBtn.disabled = !hasSelection; // Keep export disabled for now
    }

    updateSlotControls(slotId, hasCard) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const formatBtn = Array.from(slot.querySelectorAll('button')).find(b => b.textContent.includes('Format'));
        if (formatBtn) formatBtn.disabled = !hasCard;
    }

    createDataURL(icon) {
        if (!icon || !icon.pixels) return "";
        const rawData = icon.pixels;
        if (rawData.length === 0) return "";

        const canvas = document.createElement("canvas");
        canvas.width = icon.width || 16;
        canvas.height = icon.height || 16;
        const ctx = canvas.getContext("2d");

        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const pixelArray = new Uint8ClampedArray(rawData);
        imageData.data.set(pixelArray);
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL("image/png");
    }

    async deleteSelectedSave() {
        if (!this.selectedSave) return;
        
        const confirmMsg = `Are you sure you want to delete "${this.selectedSave.save.title}"?`;
        if (!confirm(confirmMsg)) return;

        const filePath = this.selectedSave.slotId === 'slot-1' ? this.currentSlot1Path : this.currentSlot2Path;
        
        try {
            const result = await emubro.invoke('delete-save', {
                filePath: filePath,
                slot: this.selectedSave.save.slot
            });

            if (result.success) {
                // Reload the card
                this.loadCard(this.selectedSave.slotId, filePath);
                this.selectedSave = null;
                this.updateCentralControls();
            } else {
                alert("Failed to delete save: " + result.message);
            }
        } catch (error) {
            console.error("Error deleting save:", error);
            alert("Error deleting save: " + error.message);
        }
    }

    async renameSelectedSave() {
        if (!this.selectedSave) return;

        const newName = prompt("Enter new name:", this.selectedSave.save.title);
        if (!newName) return;

        if (newName.length > 60) {
            alert("Name too long.");
            return;
        }

        const filePath = this.selectedSave.slotId === 'slot-1' ? this.currentSlot1Path : this.currentSlot2Path;

        try {
            const result = await emubro.invoke('rename-save', {
                filePath: filePath,
                slot: this.selectedSave.save.slot,
                newName: newName
            });

            if (result.success) {
                this.loadCard(this.selectedSave.slotId, filePath);
                this.selectedSave = null;
                this.updateCentralControls();
            } else {
                alert("Failed to rename save: " + result.message);
            }
        } catch (error) {
            console.error("Error renaming save:", error);
            alert("Error renaming save: " + error.message);
        }
    }

    async formatCard(slotId) {
        const filePath = slotId === 'slot-1' ? this.currentSlot1Path : this.currentSlot2Path;
        if (!filePath) return;

        if (!confirm("Are you sure you want to FORMAT this card?\nAll data will be lost!")) return;

        try {
            const result = await emubro.invoke('format-card', filePath);
            if (result.success) {
                this.loadCard(slotId, filePath);
                this.selectedSave = null;
                this.updateCentralControls();
            } else {
                alert("Failed to format card: " + result.message);
            }
        } catch (error) {
            console.error("Error formatting card:", error);
            alert("Error formatting card: " + error.message);
        }
    }
}
