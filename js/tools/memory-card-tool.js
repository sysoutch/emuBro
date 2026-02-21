const emubro = window.emubro;

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

export class MemoryCardTool {
    constructor() {
        this.toolName = 'memory-card-editor';
        this.currentSlot1Path = null;
        this.currentSlot2Path = null;
        this.selectedSave = null; // { slotId: "slot-1"|"slot-2", index: number, save: object }
        this.animatedSaveIcons = [];
        this.iconAnimationTimer = null;
    }

    render(container) {
        this.stopIconAnimationLoop();
        this.animatedSaveIcons = [];

        const toolContent = document.createElement("div");
        toolContent.className = "tool-content memory-card-editor";
        toolContent.innerHTML = `
            <div class="editor-layout">
                <!-- Left Card Slot -->
                <div class="card-slot" id="slot-1">
                    <div class="slot-header">
                        <label>${t('tools.memoryCard1', 'Memory Card 1')}:</label>
                        <div class="header-controls">
                            <div class="current-file-label">${t('tools.noCardLoaded', 'No Card Loaded')}</div>
                            <button class="icon-btn open-btn" title="${t('tools.openCard', 'Open Card')}"><i class="fas fa-folder-open"></i></button>
                        </div>
                    </div>
                    <div class="save-table-container">
                        <table class="save-table">
                            <thead>
                                <tr>
                                    <th class="col-icon">${t('tools.iconColumn', 'Icon')}</th>
                                    <th class="col-title">${t('tools.titleColumn', 'Title')}</th>
                                    <th class="col-name">${t('tools.codeColumn', 'Code')}</th>
                                    <th class="col-blocks">${t('tools.size', 'Size')}</th>
                                </tr>
                            </thead>
                            <tbody class="save-list">
                                <tr class="empty-msg"><td colspan="4">${t('tools.dragDropMemoryCard', 'Drag and drop memory card file here')}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="slot-footer">
                        <div class="card-stats">${t('tools.freeBlocks', 'Free Blocks')}: <span class="free-blocks">-</span></div>
                        <div class="slot-actions">
                            <button class="action-btn small" data-slot-action="format" disabled>${t('tools.formatCard', 'Format Card')}</button>
                            <button class="action-btn small" data-slot-action="import" disabled>${t('tools.importSave', 'Import Save...')}</button>
                        </div>
                    </div>
                </div>

                <!-- Central Controls -->
                <div class="central-controls">
                    <button class="control-btn" id="delete-btn" disabled title="${t('tools.deleteSelectedSave', 'Delete Selected Save')}"><i class="fas fa-trash"></i></button>
                    <button class="control-btn" id="undelete-btn" disabled title="${t('tools.undeleteSave', 'Undelete Save')}">${t('tools.undelete', 'Undelete')}</button>
                    <button class="control-btn" id="rename-btn" disabled title="${t('tools.renameSave', 'Rename Save')}">${t('tools.rename', 'Rename')}</button>
                    <button class="control-btn" id="export-btn" disabled title="${t('tools.exportSave', 'Export Save')}">${t('tools.export', 'Export')}</button>
                    <button class="control-btn move-btn" id="move-left-btn" disabled title="${t('tools.copyToLeft', 'Copy to Left')}"><i class="fas fa-chevron-left"></i> ${t('tools.copy', 'Copy')}</button>
                    <button class="control-btn move-btn" id="move-right-btn" disabled title="${t('tools.copyToRight', 'Copy to Right')}">${t('tools.copy', 'Copy')} <i class="fas fa-chevron-right"></i></button>
                </div>

                <!-- Right Card Slot -->
                <div class="card-slot" id="slot-2">
                    <div class="slot-header">
                        <label>${t('tools.memoryCard2', 'Memory Card 2')}:</label>
                        <div class="header-controls">
                            <div class="current-file-label">${t('tools.noCardLoaded', 'No Card Loaded')}</div>
                            <button class="icon-btn open-btn" title="${t('tools.openCard', 'Open Card')}"><i class="fas fa-folder-open"></i></button>
                        </div>
                    </div>
                    <div class="save-table-container">
                        <table class="save-table">
                            <thead>
                                <tr>
                                    <th class="col-icon">${t('tools.iconColumn', 'Icon')}</th>
                                    <th class="col-title">${t('tools.titleColumn', 'Title')}</th>
                                    <th class="col-name">${t('tools.codeColumn', 'Code')}</th>
                                    <th class="col-blocks">${t('tools.size', 'Size')}</th>
                                </tr>
                            </thead>
                            <tbody class="save-list">
                                <tr class="empty-msg"><td colspan="4">${t('tools.dragDropMemoryCard', 'Drag and drop memory card file here')}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div class="slot-footer">
                        <div class="card-stats">${t('tools.freeBlocks', 'Free Blocks')}: <span class="free-blocks">-</span></div>
                        <div class="slot-actions">
                            <button class="action-btn small" data-slot-action="format" disabled>${t('tools.formatCard', 'Format Card')}</button>
                            <button class="action-btn small" data-slot-action="import" disabled>${t('tools.importSave', 'Import Save...')}</button>
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
        document.querySelectorAll('.slot-actions [data-slot-action="format"]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const slotId = e.target.closest('.card-slot').id;
                this.formatCard(slotId);
            });
        });
    }

    async handleNativeOpen(slotId) {
        try {
            const result = await emubro.invoke("open-file-dialog", {
                properties: ["openFile"],
                filters: [
                    { name: t('tools.fileDialogMemoryCards', 'Memory Cards'), extensions: ["mcr", "mcd", "gme", "ps2", "max", "psu"] },
                    { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ["*"] }
                ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                this.loadCard(slotId, filePath);
            }
        } catch (error) {
            console.error(t('tools.errorOpeningFileDialog', 'Error opening file dialog:'), error);
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
            const directPath = file && file.path ? String(file.path) : "";
            const resolvedPath = directPath || (
                emubro && typeof emubro.getPathForFile === "function"
                    ? String(emubro.getPathForFile(file) || "")
                    : ""
            );

            if (resolvedPath) {
                this.loadCard(slotId, resolvedPath);
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

        this.removeAnimatedIconsForSlot(slotId);
        tbody.innerHTML = "";

        if (data.format === "PlayStation 1" && data.saves) {
            if (stats) stats.textContent = data.freeBlocks;

            if (data.saves.length === 0) {
                 tbody.innerHTML = `<tr class="empty-msg"><td colspan="4">${t('tools.emptyCard', 'Empty Card')}</td></tr>`;
            }

            data.saves.forEach((save, index) => {
                const tr = document.createElement("tr");
                const iconFrames = this.getIconFrameDataUrls(save.icon);
                const iconHtml = iconFrames.length
                    ? `<img src="${iconFrames[0]}" class="save-icon-img${iconFrames.length > 1 ? ' is-animated' : ''}" alt="${t('tools.saveIconAlt', 'Save Icon')}"/>`
                    : `<i class="fas fa-save"></i>`;
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

                if (iconFrames.length > 1) {
                    const iconEl = tr.querySelector('.save-icon-img');
                    if (iconEl) {
                        this.registerAnimatedSaveIcon(slotId, iconEl, iconFrames);
                    }
                }
            });
        } else if (data.format === "PlayStation 2") {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="4" class="centered">${data.message}</td>`;
            tbody.appendChild(tr);
            if (stats) stats.textContent = "?";
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="4" class="centered">${t('tools.emptyOrUnsupportedCard', 'Empty or Unsupported Card')}</td>`;
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
        
        const formatBtn = slot.querySelector('[data-slot-action="format"]');
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

    getIconFrameDataUrls(icon) {
        if (!icon) return [];
        if (Array.isArray(icon.frames) && icon.frames.length > 0) {
            return icon.frames
                .map((frame) => this.createDataURL(frame))
                .filter((url) => !!url);
        }
        const fallback = this.createDataURL(icon);
        return fallback ? [fallback] : [];
    }

    removeAnimatedIconsForSlot(slotId) {
        this.animatedSaveIcons = this.animatedSaveIcons.filter((entry) => entry.slotId !== slotId);
        if (!this.animatedSaveIcons.length) {
            this.stopIconAnimationLoop();
        }
    }

    registerAnimatedSaveIcon(slotId, imgElement, frameUrls) {
        if (!imgElement || !Array.isArray(frameUrls) || frameUrls.length < 2) return;
        this.animatedSaveIcons.push({
            slotId,
            imgElement,
            frameUrls,
            frameIndex: 0
        });
        this.startIconAnimationLoop();
    }

    startIconAnimationLoop() {
        if (this.iconAnimationTimer) return;
        this.iconAnimationTimer = setInterval(() => {
            const nextEntries = [];
            this.animatedSaveIcons.forEach((entry) => {
                if (!entry?.imgElement || !entry.imgElement.isConnected) return;
                if (!Array.isArray(entry.frameUrls) || entry.frameUrls.length < 2) return;

                entry.frameIndex = (entry.frameIndex + 1) % entry.frameUrls.length;
                entry.imgElement.src = entry.frameUrls[entry.frameIndex];
                nextEntries.push(entry);
            });
            this.animatedSaveIcons = nextEntries;

            if (!this.animatedSaveIcons.length) {
                this.stopIconAnimationLoop();
            }
        }, 320);
    }

    stopIconAnimationLoop() {
        if (!this.iconAnimationTimer) return;
        clearInterval(this.iconAnimationTimer);
        this.iconAnimationTimer = null;
    }

    async deleteSelectedSave() {
        if (!this.selectedSave) return;
        
        const confirmMsg = t('tools.confirmDeleteSave', 'Are you sure you want to delete "{{name}}"?', { name: this.selectedSave.save.title });
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
                alert(t('tools.failedDeleteSave', 'Failed to delete save: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error(t('tools.errorDeletingSave', 'Error deleting save:'), error);
            alert(t('tools.errorDeletingSaveMessage', 'Error deleting save: {{message}}', { message: error.message }));
        }
    }

    async renameSelectedSave() {
        if (!this.selectedSave) return;

        const newName = prompt(t('tools.enterNewName', 'Enter new name:'), this.selectedSave.save.title);
        if (!newName) return;

        if (newName.length > 60) {
            alert(t('tools.nameTooLong', 'Name too long.'));
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
                alert(t('tools.failedRenameSave', 'Failed to rename save: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error(t('tools.errorRenamingSave', 'Error renaming save:'), error);
            alert(t('tools.errorRenamingSaveMessage', 'Error renaming save: {{message}}', { message: error.message }));
        }
    }

    async formatCard(slotId) {
        const filePath = slotId === 'slot-1' ? this.currentSlot1Path : this.currentSlot2Path;
        if (!filePath) return;

        if (!confirm(t('tools.confirmFormatCard', 'Are you sure you want to format this card?\nAll data will be lost!'))) return;

        try {
            const result = await emubro.invoke('format-card', filePath);
            if (result.success) {
                this.loadCard(slotId, filePath);
                this.selectedSave = null;
                this.updateCentralControls();
            } else {
                alert(t('tools.failedFormatCard', 'Failed to format card: {{message}}', { message: result.message }));
            }
        } catch (error) {
            console.error(t('tools.errorFormattingCard', 'Error formatting card:'), error);
            alert(t('tools.errorFormattingCardMessage', 'Error formatting card: {{message}}', { message: error.message }));
        }
    }
}
