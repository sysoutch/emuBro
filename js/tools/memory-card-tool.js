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
    let translated = '';
    if (i18nRef && typeof i18nRef.t === 'function') {
        translated = i18nRef.t(key);
        if (typeof translated === 'string' && translated && translated !== key) {
            return applyTemplate(translated, data);
        }
    }
    return applyTemplate(String(fallback || key), data);
}

export class MemoryCardTool {
    constructor() {
        this.toolName = 'memory-card-editor';
        this.currentSlot1Path = null;
        this.currentSlot2Path = null;
        this.selectedSave = null; // { slotId: "slot-1"|"slot-2", index: number, save: object }
        this.lastDeletedSave = null; // { slotId, filePath, slot, deletedEntry, title }
        this.pendingChanges = {
            'slot-1': [],
            'slot-2': []
        };
        this.animatedSaveIcons = [];
        this.iconAnimationTimer = null;
    }

    render(container) {
        this.stopIconAnimationLoop();
        this.animatedSaveIcons = [];
        this.pendingChanges = { 'slot-1': [], 'slot-2': [] };
        this.lastDeletedSave = null;

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
                        <div class="slot-pending-row">
                            <span class="slot-pending-indicator" data-slot-pending-indicator>${t('tools.noPendingChanges', 'No pending changes')}</span>
                            <button class="action-btn small" data-slot-action="apply" disabled>${t('tools.applyChanges', 'Apply')}</button>
                            <button class="action-btn small" data-slot-action="discard" disabled>${t('tools.discardChanges', 'Discard')}</button>
                        </div>
                        <div class="slot-actions">
                            <button class="action-btn small" data-slot-action="create">${t('tools.createEmptyCard', 'Create Empty Card')}</button>
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
                        <div class="slot-pending-row">
                            <span class="slot-pending-indicator" data-slot-pending-indicator>${t('tools.noPendingChanges', 'No pending changes')}</span>
                            <button class="action-btn small" data-slot-action="apply" disabled>${t('tools.applyChanges', 'Apply')}</button>
                            <button class="action-btn small" data-slot-action="discard" disabled>${t('tools.discardChanges', 'Discard')}</button>
                        </div>
                        <div class="slot-actions">
                            <button class="action-btn small" data-slot-action="create">${t('tools.createEmptyCard', 'Create Empty Card')}</button>
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
        document.getElementById('undelete-btn').addEventListener('click', () => this.undeleteLastSave());
        document.getElementById('rename-btn').addEventListener('click', () => this.renameSelectedSave());
        document.getElementById('export-btn').addEventListener('click', () => this.exportSelectedSave());
        document.getElementById('move-left-btn').addEventListener('click', () => this.copySelectedSaveTo('slot-1'));
        document.getElementById('move-right-btn').addEventListener('click', () => this.copySelectedSaveTo('slot-2'));
        
        // Slot Actions (Create, Format, Import)
        document.querySelectorAll('.card-slot [data-slot-action]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const action = String(e.currentTarget.dataset.slotAction || '').trim();
                const slotEl = e.currentTarget.closest('.card-slot');
                const slotId = slotEl ? slotEl.id : '';
                if (!slotId) return;
                if (action === 'format') {
                    await this.stageFormatCard(slotId);
                    return;
                }
                if (action === 'import') {
                    await this.stageImportSaveToSlot(slotId);
                    return;
                }
                if (action === 'create') {
                    await this.createEmptyCardForSlot(slotId);
                    return;
                }
                if (action === 'apply') {
                    await this.applyPendingChanges(slotId);
                    return;
                }
                if (action === 'discard') {
                    this.discardPendingChanges(slotId);
                }
            });
        });

        this.updateCentralControls();
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
                this.pendingChanges[slotId] = [];
                if (String(this.selectedSave?.slotId || '') === slotId) {
                    this.selectedSave = null;
                }

                // Update UI Label
                const label = document.querySelector(`#${slotId} .current-file-label`);
                if (label) label.textContent = filePath.split(/[\\/]/).pop();

                this.updateSlotControls(slotId, true);
                this.populateSlot(slotId, result.data);
                this.updateCentralControls();
            } else {
                alert(t('tools.readFailed', 'Failed to read memory card: {{message}}', { message: String(result.message || '') }));
            }
        } catch (error) {
            console.error("Error reading card for " + slotId, error);
            alert(t('tools.readFailed', 'Failed to read memory card: {{message}}', { message: String(error?.message || error) }));
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
                    <td class="col-title" data-col-title>${save.title}</td>
                    <td class="col-name">${save.productCode}</td>
                    <td class="col-blocks">${blocksText}</td>
                `;
                tr.dataset.saveSlot = String(save.slot || 0);
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
            this.applyPendingPreview(slotId);
        } else if (data.format === "PlayStation 2") {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="4" class="centered">${data.message}</td>`;
            tbody.appendChild(tr);
            if (stats) stats.textContent = "?";
            this.applyPendingPreview(slotId);
        } else {
            const tr = document.createElement("tr");
            tr.innerHTML = `<td colspan="4" class="centered">${t('tools.emptyOrUnsupportedCard', 'Empty or Unsupported Card')}</td>`;
            tbody.appendChild(tr);
            this.applyPendingPreview(slotId);
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
        const undeleteBtn = document.getElementById('undelete-btn');
        const renameBtn = document.getElementById('rename-btn');
        const exportBtn = document.getElementById('export-btn');
        const moveLeftBtn = document.getElementById('move-left-btn');
        const moveRightBtn = document.getElementById('move-right-btn');
        
        const hasSelection = !!this.selectedSave;
        const selectedSlotId = String(this.selectedSave?.slotId || '');
        const selectedSave = this.selectedSave?.save || null;
        const sourcePath = this.getSlotPath(selectedSlotId);
        const canActOnSelection = hasSelection && !!sourcePath;
        const isSingleBlock = !!selectedSave && !selectedSave.isMultiBlock;
        const canCopyLeft = canActOnSelection && isSingleBlock && selectedSlotId === 'slot-2' && !!this.currentSlot1Path;
        const canCopyRight = canActOnSelection && isSingleBlock && selectedSlotId === 'slot-1' && !!this.currentSlot2Path;
        
        if (deleteBtn) deleteBtn.disabled = !canActOnSelection;
        if (renameBtn) renameBtn.disabled = !canActOnSelection;
        if (exportBtn) exportBtn.disabled = !canActOnSelection || !isSingleBlock;
        if (undeleteBtn) {
            const hasStagedDelete = selectedSlotId
                ? this.getPendingQueue(selectedSlotId).some((entry) => String(entry?.type || '') === 'delete')
                : false;
            undeleteBtn.disabled = !(hasStagedDelete || this.canUndeleteIntoSlot());
        }
        if (moveLeftBtn) moveLeftBtn.disabled = !canCopyLeft;
        if (moveRightBtn) moveRightBtn.disabled = !canCopyRight;
        this.renderAllPendingIndicators();
    }

    updateSlotControls(slotId, hasCard) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        
        const formatBtn = slot.querySelector('[data-slot-action="format"]');
        const importBtn = slot.querySelector('[data-slot-action="import"]');
        if (formatBtn) formatBtn.disabled = !hasCard;
        if (importBtn) importBtn.disabled = !hasCard;
    }

    getSlotPath(slotId) {
        return slotId === 'slot-1' ? this.currentSlot1Path : this.currentSlot2Path;
    }

    setSlotPath(slotId, filePath) {
        if (slotId === 'slot-1') this.currentSlot1Path = filePath;
        else this.currentSlot2Path = filePath;
    }

    canUndeleteIntoSlot() {
        if (!this.lastDeletedSave) return false;
        const slotPath = this.getSlotPath(this.lastDeletedSave.slotId);
        if (!slotPath) return false;
        return String(slotPath) === String(this.lastDeletedSave.filePath || '');
    }

    getPendingQueue(slotId) {
        if (!this.pendingChanges || typeof this.pendingChanges !== 'object') {
            this.pendingChanges = { 'slot-1': [], 'slot-2': [] };
        }
        if (!Array.isArray(this.pendingChanges[slotId])) {
            this.pendingChanges[slotId] = [];
        }
        return this.pendingChanges[slotId];
    }

    renderPendingIndicator(slotId) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        const queue = this.getPendingQueue(slotId);
        const indicator = slot.querySelector('[data-slot-pending-indicator]');
        const applyBtn = slot.querySelector('[data-slot-action="apply"]');
        const discardBtn = slot.querySelector('[data-slot-action="discard"]');
        const hasPending = queue.length > 0;
        if (indicator) {
            if (!hasPending) {
                indicator.textContent = t('tools.noPendingChanges', 'No pending changes');
                indicator.dataset.level = 'none';
            } else {
                const summary = this.getPendingOperationSummary(queue);
                indicator.textContent = `${t('tools.pendingChangesCount', '{{count}} pending change(s)', { count: queue.length })}${summary ? ` - ${summary}` : ''}`;
                indicator.dataset.level = 'pending';
            }
        }
        if (applyBtn) applyBtn.disabled = !hasPending || !this.getSlotPath(slotId);
        if (discardBtn) discardBtn.disabled = !hasPending;
        this.applyPendingPreview(slotId);
    }

    renderAllPendingIndicators() {
        this.renderPendingIndicator('slot-1');
        this.renderPendingIndicator('slot-2');
    }

    getPendingOperationSummary(queue = []) {
        const ops = Array.isArray(queue) ? queue : [];
        if (!ops.length) return '';
        const counts = new Map();
        ops.forEach((entry) => {
            const key = String(entry?.type || '').trim().toLowerCase();
            if (!key) return;
            counts.set(key, (counts.get(key) || 0) + 1);
        });
        const parts = [];
        if (counts.get('rename')) parts.push(`${counts.get('rename')} rename`);
        if (counts.get('delete')) parts.push(`${counts.get('delete')} delete`);
        if (counts.get('copy')) parts.push(`${counts.get('copy')} copy`);
        if (counts.get('import')) parts.push(`${counts.get('import')} import`);
        if (counts.get('format')) parts.push(`${counts.get('format')} format`);
        return parts.join(', ');
    }

    applyPendingPreview(slotId) {
        const slot = document.getElementById(slotId);
        if (!slot) return;
        const rows = Array.from(slot.querySelectorAll('.save-list tr[data-save-slot]'));
        const queue = this.getPendingQueue(slotId);

        slot.classList.remove('has-pending-format');
        rows.forEach((row) => {
            row.classList.remove('pending-delete', 'pending-rename');
            const titleCell = row.querySelector('[data-col-title]');
            if (titleCell && typeof titleCell.dataset.originalTitle === 'string') {
                titleCell.textContent = titleCell.dataset.originalTitle;
            } else if (titleCell) {
                titleCell.dataset.originalTitle = titleCell.textContent || '';
            }
        });

        queue.forEach((op) => {
            const type = String(op?.type || '').trim().toLowerCase();
            if (type === 'format') {
                slot.classList.add('has-pending-format');
                return;
            }
            const targetSlot = String(op?.slot || '').trim();
            if (!targetSlot) return;
            const row = rows.find((entry) => String(entry.dataset.saveSlot || '') === targetSlot);
            if (!row) return;
            const titleCell = row.querySelector('[data-col-title]');
            if (!titleCell) return;
            if (type === 'delete') {
                row.classList.add('pending-delete');
                return;
            }
            if (type === 'rename') {
                row.classList.add('pending-rename');
                titleCell.textContent = String(op?.newName || '').trim() || titleCell.dataset.originalTitle || titleCell.textContent || '';
            }
        });
    }

    stageOperation(slotId, op) {
        const queue = this.getPendingQueue(slotId);
        if (!op || typeof op !== 'object') return;
        if (op.type === 'format') {
            queue.length = 0;
            queue.push(op);
        } else {
            queue.push(op);
        }
        this.renderPendingIndicator(slotId);
        this.updateCentralControls();
    }

    discardPendingChanges(slotId) {
        const queue = this.getPendingQueue(slotId);
        queue.length = 0;
        this.renderPendingIndicator(slotId);
        this.updateCentralControls();
    }

    popLastStagedDelete(slotId = '') {
        const targetSlot = slotId || String(this.selectedSave?.slotId || '');
        if (!targetSlot) return false;
        const queue = this.getPendingQueue(targetSlot);
        for (let i = queue.length - 1; i >= 0; i--) {
            if (String(queue[i]?.type || '') !== 'delete') continue;
            queue.splice(i, 1);
            this.renderPendingIndicator(targetSlot);
            this.updateCentralControls();
            return true;
        }
        return false;
    }

    async createEmptyCardForSlot(slotId) {
        try {
            const saveResult = await emubro.invoke("save-file-dialog", {
                title: t('tools.createEmptyCardTitle', 'Create Empty Memory Card'),
                defaultPath: slotId === 'slot-1' ? 'memory-card-1.mcr' : 'memory-card-2.mcr',
                filters: [
                    { name: t('tools.fileDialogMemoryCards', 'Memory Cards'), extensions: ['mcr'] },
                    { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                ]
            });
            const targetPath = String(saveResult?.filePath || '').trim();
            if (saveResult?.canceled || !targetPath) return;

            const createResult = await emubro.invoke('memory-card:create-empty', { filePath: targetPath });
            if (!createResult?.success) {
                alert(t('tools.memoryCardCreateFailed', 'Failed to create empty memory card: {{message}}', {
                    message: String(createResult?.message || 'Unknown error')
                }));
                return;
            }
            this.pendingChanges[slotId] = [];
            await this.loadCard(slotId, targetPath);
        } catch (error) {
            alert(t('tools.memoryCardCreateFailed', 'Failed to create empty memory card: {{message}}', {
                message: String(error?.message || error || 'Unknown error')
            }));
        }
    }

    async stageImportSaveToSlot(slotId) {
        const targetCardPath = this.getSlotPath(slotId);
        if (!targetCardPath) return;
        try {
            const result = await emubro.invoke("open-file-dialog", {
                properties: ["openFile"],
                filters: [
                    { name: t('tools.fileDialogSaveImport', 'Save Import Files'), extensions: ["mcs", "bin", "sav", "psv", "psx"] },
                    { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ["*"] }
                ]
            });
            if (result?.canceled || !Array.isArray(result?.filePaths) || !result.filePaths.length) return;
            const importPath = String(result.filePaths[0] || '').trim();
            if (!importPath) return;
            this.stageOperation(slotId, { type: 'import', importPath });
        } catch (error) {
            alert(t('tools.failedImportSave', 'Failed to import save: {{message}}', {
                message: String(error?.message || error || 'Unknown error')
            }));
        }
    }

    async stageFormatCard(slotId) {
        const filePath = this.getSlotPath(slotId);
        if (!filePath) return;
        if (!confirm(t('tools.confirmFormatCard', 'Are you sure you want to format this card?\nAll data will be lost!'))) return;
        this.stageOperation(slotId, { type: 'format' });
    }

    async applyPendingChanges(slotId) {
        const filePath = this.getSlotPath(slotId);
        if (!filePath) return;
        const queue = [...this.getPendingQueue(slotId)];
        if (!queue.length) return;

        for (let i = 0; i < queue.length; i++) {
            const op = queue[i];
            let result = { success: false, message: t('tools.operationUnknown', 'Unknown operation.') };

            if (op.type === 'delete') {
                result = await emubro.invoke('delete-save', { filePath, slot: Number(op.slot || 0) });
                if (result?.success) {
                    this.lastDeletedSave = {
                        slotId,
                        filePath,
                        slot: Number(result.slot || op.slot || 0),
                        deletedEntry: String(result.deletedEntry || ''),
                        title: String(result.deletedTitle || op.title || '')
                    };
                }
            } else if (op.type === 'rename') {
                result = await emubro.invoke('rename-save', {
                    filePath,
                    slot: Number(op.slot || 0),
                    newName: String(op.newName || '')
                });
            } else if (op.type === 'format') {
                result = await emubro.invoke('format-card', filePath);
                if (result?.success) this.lastDeletedSave = null;
            } else if (op.type === 'import') {
                result = await emubro.invoke('import-save', {
                    filePath,
                    importPath: String(op.importPath || '')
                });
            } else if (op.type === 'copy') {
                result = await emubro.invoke('copy-save', {
                    sourcePath: String(op.sourcePath || ''),
                    sourceSlot: Number(op.sourceSlot || 0),
                    targetPath: filePath
                });
            }

            if (!result?.success) {
                const remaining = queue.slice(i);
                this.pendingChanges[slotId] = remaining;
                this.renderPendingIndicator(slotId);
                this.updateCentralControls();
                alert(t('tools.failedApplyChanges', 'Failed to apply changes: {{message}}', {
                    message: String(result?.message || 'Unknown error')
                }));
                return;
            }
        }

        this.pendingChanges[slotId] = [];
        this.selectedSave = null;
        await this.loadCard(slotId, filePath);
        this.renderPendingIndicator(slotId);
        this.updateCentralControls();
    }

    async exportSelectedSave() {
        if (!this.selectedSave) return;
        const sourcePath = this.getSlotPath(this.selectedSave.slotId);
        if (!sourcePath) return;

        const saveTitle = String(this.selectedSave.save?.title || 'save').trim() || 'save';
        const safeFile = saveTitle.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 60);

        try {
            const dialogResult = await emubro.invoke("save-file-dialog", {
                title: t('tools.exportSave', 'Export Save'),
                defaultPath: `${safeFile}.mcs`,
                filters: [
                    { name: t('tools.fileDialogSaveExport', 'Save Export Files'), extensions: ['mcs'] },
                    { name: t('tools.fileDialogAllFiles', 'All Files'), extensions: ['*'] }
                ]
            });
            const outputPath = String(dialogResult?.filePath || '').trim();
            if (dialogResult?.canceled || !outputPath) return;

            const result = await emubro.invoke('export-save', {
                filePath: sourcePath,
                slot: Number(this.selectedSave.save?.slot || 0),
                outputPath
            });
            if (!result?.success) {
                alert(t('tools.failedExportSave', 'Failed to export save: {{message}}', {
                    message: String(result?.message || 'Unknown error')
                }));
            }
        } catch (error) {
            alert(t('tools.failedExportSave', 'Failed to export save: {{message}}', {
                message: String(error?.message || error || 'Unknown error')
            }));
        }
    }

    async copySelectedSaveTo(targetSlotId) {
        if (!this.selectedSave) return;
        const sourceSlotId = String(this.selectedSave.slotId || '');
        if (!sourceSlotId || sourceSlotId === targetSlotId) return;

        const sourcePath = this.getSlotPath(sourceSlotId);
        const targetPath = this.getSlotPath(targetSlotId);
        const sourceSlot = Number(this.selectedSave.save?.slot || 0);
        if (!sourcePath || !targetPath || !sourceSlot) return;

        this.stageOperation(targetSlotId, {
            type: 'copy',
            sourcePath,
            sourceSlot
        });
    }

    async undeleteLastSave() {
        const selectedSlotId = String(this.selectedSave?.slotId || '');
        if (this.popLastStagedDelete(selectedSlotId)) return;
        if (!this.canUndeleteIntoSlot()) return;
        const last = this.lastDeletedSave;
        try {
            const result = await emubro.invoke('undelete-save', {
                filePath: last.filePath,
                slot: Number(last.slot || 0),
                deletedEntry: String(last.deletedEntry || '')
            });
            if (!result?.success) {
                alert(t('tools.failedUndeleteSave', 'Failed to undelete save: {{message}}', {
                    message: String(result?.message || 'Unknown error')
                }));
                return;
            }
            await this.loadCard(last.slotId, last.filePath);
            this.lastDeletedSave = null;
            this.updateCentralControls();
        } catch (error) {
            alert(t('tools.failedUndeleteSave', 'Failed to undelete save: {{message}}', {
                message: String(error?.message || error || 'Unknown error')
            }));
        }
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

        this.stageOperation(this.selectedSave.slotId, {
            type: 'delete',
            slot: Number(this.selectedSave.save.slot || 0),
            title: String(this.selectedSave.save.title || '').trim()
        });
    }

    async renameSelectedSave() {
        if (!this.selectedSave) return;

        const newName = prompt(t('tools.enterNewName', 'Enter new name:'), this.selectedSave.save.title);
        if (!newName) return;

        if (newName.length > 60) {
            alert(t('tools.nameTooLong', 'Name too long.'));
            return;
        }

        this.stageOperation(this.selectedSave.slotId, {
            type: 'rename',
            slot: Number(this.selectedSave.save.slot || 0),
            newName: String(newName || '').trim()
        });
    }
}
