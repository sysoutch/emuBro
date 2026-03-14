import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

const SLOT_IDS = ["slot-1", "slot-2"];

function translate(key, fallback, params = null) {
  try {
    const shellI18nStore = useShellI18nStore();
    return params ? shellI18nStore.tf(key, params, fallback) : shellI18nStore.t(key, fallback);
  } catch (_error) {
    if (!params) {
      return fallback;
    }
    return Object.entries(params).reduce(
      (result, [name, value]) => String(result).replaceAll(`{{${name}}}`, String(value ?? "")),
      String(fallback || "")
    );
  }
}

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function createEmptySlot(id) {
  return {
    id,
    filePath: "",
    fileName: "No Card Loaded",
    format: "",
    freeBlocks: "-",
    saves: [],
    message: "",
    totalSize: 0
  };
}

function normalizeSaveRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    key: `${String(row?.slot || index + 1)}-${String(row?.title || 'save')}`,
    slot: Number(row?.slot || 0),
    title: String(row?.title || "Untitled").trim(),
    productCode: String(row?.productCode || "").trim(),
    size: Number(row?.size || 0),
    blocks: Number(row?.blocks || 0),
    isMultiBlock: !!row?.isMultiBlock,
    icon: row?.icon || null
  }));
}

function normalizeCardData(slotId, filePath, data) {
  const fileName = String(filePath || "").replace(/\\/g, "/").split("/").pop() || "No Card Loaded";
  const payload = data && typeof data === "object" ? data : {};
  return {
    id: slotId,
    filePath: String(filePath || "").trim(),
    fileName,
    format: String(payload?.format || "").trim(),
    freeBlocks: payload?.format === "PlayStation 1" ? Number(payload?.freeBlocks ?? 0) : "?",
    saves: normalizeSaveRows(payload?.saves),
    message: String(payload?.message || "").trim(),
    totalSize: Number(payload?.totalSize || payload?.cardSize || 0)
  };
}

function getFileName(path) {
  return String(path || "").replace(/\\/g, "/").split("/").pop() || String(path || "");
}

export const useMemoryCardStore = defineStore("memoryCard", {
  state: () => ({
    initialized: false,
    loading: false,
    browseBusy: false,
    status: "",
    statusTone: "",
    browseRoot: "",
    browseResults: [],
    slots: {
      "slot-1": createEmptySlot("slot-1"),
      "slot-2": createEmptySlot("slot-2")
    },
    selectedSaveRef: {
      slotId: "",
      slot: 0
    },
    lastDeletedSave: null
  }),
  getters: {
    selectedSave(state) {
      const slotId = String(state.selectedSaveRef?.slotId || "").trim();
      const slot = Number(state.selectedSaveRef?.slot || 0);
      if (!slotId || !slot) {
        return null;
      }
      const targetSlot = state.slots?.[slotId];
      if (!targetSlot) {
        return null;
      }
      return targetSlot.saves.find((row) => Number(row?.slot || 0) === slot) || null;
    },
    selectedSlotId(state) {
      return String(state.selectedSaveRef?.slotId || "").trim();
    },
    selectedCardPath() {
      const slotId = this.selectedSlotId;
      return slotId ? String(this.slots?.[slotId]?.filePath || "").trim() : "";
    },
    canUndelete(state) {
      if (!state.lastDeletedSave) {
        return false;
      }
      const slotId = String(state.lastDeletedSave.slotId || "").trim();
      const filePath = String(state.lastDeletedSave.filePath || "").trim();
      return !!slotId && !!filePath && String(state.slots?.[slotId]?.filePath || "").trim() === filePath;
    }
  },
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    setBrowseRoot(value) {
      this.browseRoot = String(value || "").trim();
    },
    clearSelection() {
      this.selectedSaveRef = {
        slotId: "",
        slot: 0
      };
    },
    selectSave(slotId, save) {
      if (!slotId || !save?.slot) {
        this.clearSelection();
        return;
      }
      this.selectedSaveRef = {
        slotId: String(slotId || "").trim(),
        slot: Number(save.slot || 0)
      };
    },
    getSlot(slotId) {
      return this.slots[String(slotId || "").trim()] || null;
    },
    async loadCard(slotId, filePath) {
      const bridge = getDesktopBridge();
      const targetSlotId = String(slotId || "").trim();
      const targetPath = String(filePath || "").trim();
      if (!bridge?.invoke || !targetSlotId || !targetPath) {
        this.setStatus(translate("desktopShell.memory.desktopBridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      this.loading = true;
      this.setStatus(translate("desktopShell.memory.loadingCard", `Loading ${getFileName(targetPath)}...`, { name: getFileName(targetPath) }));
      try {
        const result = await bridge.invoke("read-memory-card", targetPath);
        if (!result?.success) {
          this.setStatus(String(result?.message || "Failed to read memory card."), "error");
          return null;
        }

        const previousSelection =
          this.selectedSaveRef.slotId === targetSlotId ? Number(this.selectedSaveRef.slot || 0) : 0;
        this.slots = {
          ...this.slots,
          [targetSlotId]: normalizeCardData(targetSlotId, targetPath, result?.data)
        };
        const nextSelected = previousSelection
          ? this.slots[targetSlotId].saves.find((row) => Number(row?.slot || 0) === previousSelection)
          : null;
        if (nextSelected) {
          this.selectSave(targetSlotId, nextSelected);
        } else if (this.selectedSaveRef.slotId === targetSlotId) {
          this.clearSelection();
        }
        this.setStatus(translate("desktopShell.memory.loadedCard", `Loaded ${getFileName(targetPath)}.`, { name: getFileName(targetPath) }), "success");
        return this.slots[targetSlotId];
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to read memory card."), "error");
        return null;
      } finally {
        this.loading = false;
      }
    },
    async openCard(slotId) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.memory.desktopBridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      const pick = await bridge.invoke("open-file-dialog", {
        properties: ["openFile"],
        filters: [
          { name: "Memory Cards", extensions: ["mcr", "mcd", "gme", "ps2", "max", "psu"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
        return null;
      }
      return this.loadCard(slotId, pick.filePaths[0]);
    },
    async createEmptyCard(slotId) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.memory.desktopBridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      const saveResult = await bridge.invoke("save-file-dialog", {
        title: translate("tools.createEmptyCardTitle", "Create Empty Memory Card"),
        defaultPath: slotId === "slot-1" ? "memory-card-1.mcr" : "memory-card-2.mcr",
        filters: [
          { name: "Memory Cards", extensions: ["mcr"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      const targetPath = String(saveResult?.filePath || "").trim();
      if (saveResult?.canceled || !targetPath) {
        return null;
      }

      const createResult = await bridge.invoke("memory-card:create-empty", { filePath: targetPath });
      if (!createResult?.success) {
        this.setStatus(String(createResult?.message || translate("tools.memoryCardCreateFailed", "Failed to create empty memory card.")), "error");
        return null;
      }
      return this.loadCard(slotId, targetPath);
    },
    async openCardFolder(slotId) {
      const bridge = getDesktopBridge();
      const filePath = String(this.getSlot(slotId)?.filePath || "").trim();
      if (!bridge?.invoke || !filePath) {
        return null;
      }
      const result = await bridge.invoke("show-item-in-folder", filePath);
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to open folder."), "error");
      }
      return result;
    },
    async formatCard(slotId) {
      const bridge = getDesktopBridge();
      const filePath = String(this.getSlot(slotId)?.filePath || "").trim();
      if (!bridge?.invoke || !filePath) {
        return null;
      }
      const result = await bridge.invoke("format-card", filePath);
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to format memory card."), "error");
        return null;
      }
      this.lastDeletedSave = null;
      this.clearSelection();
      return this.loadCard(slotId, filePath);
    },
    async importSaveToSlot(slotId) {
      const bridge = getDesktopBridge();
      const filePath = String(this.getSlot(slotId)?.filePath || "").trim();
      if (!bridge?.invoke || !filePath) {
        return null;
      }

      const result = await bridge.invoke("open-file-dialog", {
        properties: ["openFile"],
        filters: [
          { name: "Save Import Files", extensions: ["mcs", "bin", "sav", "psv", "psx"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      if (!result || result.canceled || !Array.isArray(result.filePaths) || !result.filePaths.length) {
        return null;
      }

      const importPath = String(result.filePaths[0] || "").trim();
      if (!importPath) {
        return null;
      }

      const importResult = await bridge.invoke("import-save", {
        filePath,
        importPath
      });
      if (!importResult?.success) {
        this.setStatus(String(importResult?.message || "Failed to import save."), "error");
        return null;
      }
      await this.loadCard(slotId, filePath);
      const imported = this.getSlot(slotId)?.saves.find((row) => Number(row?.slot || 0) === Number(importResult?.targetSlot || 0));
      if (imported) {
        this.selectSave(slotId, imported);
      }
      this.setStatus(translate("desktopShell.memory.saveImported", "Save imported."), "success");
      return importResult;
    },
    async deleteSelectedSave() {
      const bridge = getDesktopBridge();
      const save = this.selectedSave;
      const slotId = this.selectedSlotId;
      const filePath = this.selectedCardPath;
      if (!bridge?.invoke || !save || !slotId || !filePath) {
        return null;
      }

      const result = await bridge.invoke("delete-save", {
        filePath,
        slot: Number(save.slot || 0)
      });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to delete save."), "error");
        return null;
      }
      this.lastDeletedSave = {
        slotId,
        filePath,
        slot: Number(result?.slot || save.slot || 0),
        deletedEntry: String(result?.deletedEntry || ""),
        title: String(result?.deletedTitle || save.title || "Deleted Save")
      };
      this.clearSelection();
      await this.loadCard(slotId, filePath);
      this.setStatus(translate("desktopShell.memory.saveDeleted", "Save deleted."), "success");
      return result;
    },
    async renameSelectedSave(newName) {
      const bridge = getDesktopBridge();
      const save = this.selectedSave;
      const filePath = this.selectedCardPath;
      if (!bridge?.invoke || !save || !filePath) {
        return null;
      }
      const nextName = String(newName || "").trim();
      if (!nextName) {
        this.setStatus(translate("categories.tagNameEmpty", "Name cannot be empty."), "warning");
        return null;
      }

      const result = await bridge.invoke("rename-save", {
        filePath,
        slot: Number(save.slot || 0),
        newName: nextName
      });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to rename save."), "error");
        return null;
      }
      await this.loadCard(this.selectedSlotId, filePath);
      const renamed = this.getSlot(this.selectedSlotId)?.saves.find((row) => Number(row?.slot || 0) === Number(save.slot || 0));
      if (renamed) {
        this.selectSave(this.selectedSlotId, renamed);
      }
      this.setStatus(translate("desktopShell.memory.saveRenamed", "Save renamed."), "success");
      return result;
    },
    async exportSelectedSave() {
      const bridge = getDesktopBridge();
      const save = this.selectedSave;
      const filePath = this.selectedCardPath;
      if (!bridge?.invoke || !save || !filePath) {
        return null;
      }
      if (save.isMultiBlock) {
        this.setStatus(translate("desktopShell.memory.singleBlockOnly", "Only single-block PS1 saves can be exported right now."), "warning");
        return null;
      }

      const safeFile = String(save.title || "save").replace(/[<>:"/\\|?*]+/g, "_").slice(0, 60) || "save";
      const dialogResult = await bridge.invoke("save-file-dialog", {
        title: translate("tools.exportSave", "Export Save"),
        defaultPath: `${safeFile}.mcs`,
        filters: [
          { name: "Save Export Files", extensions: ["mcs"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      const outputPath = String(dialogResult?.filePath || "").trim();
      if (dialogResult?.canceled || !outputPath) {
        return null;
      }

      const result = await bridge.invoke("export-save", {
        filePath,
        slot: Number(save.slot || 0),
        outputPath
      });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to export save."), "error");
        return null;
      }
      this.setStatus(translate("desktopShell.memory.saveExported", "Save exported."), "success");
      return result;
    },
    async copySelectedSaveTo(targetSlotId) {
      const bridge = getDesktopBridge();
      const save = this.selectedSave;
      const sourceSlotId = this.selectedSlotId;
      const sourcePath = this.selectedCardPath;
      const targetPath = String(this.getSlot(targetSlotId)?.filePath || "").trim();
      if (!bridge?.invoke || !save || !sourcePath || !targetPath || !sourceSlotId || sourceSlotId === targetSlotId) {
        return null;
      }

      const result = await bridge.invoke("copy-save", {
        sourcePath,
        sourceSlot: Number(save.slot || 0),
        targetPath
      });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to copy save."), "error");
        return null;
      }
      await this.loadCard(targetSlotId, targetPath);
      const copied = this.getSlot(targetSlotId)?.saves.find((row) => Number(row?.slot || 0) === Number(result?.targetSlot || 0));
      if (copied) {
        this.selectSave(targetSlotId, copied);
      }
      this.setStatus(translate("desktopShell.memory.saveCopied", "Save copied."), "success");
      return result;
    },
    async undeleteLastSave() {
      const bridge = getDesktopBridge();
      const last = this.lastDeletedSave;
      if (!bridge?.invoke || !last || !this.canUndelete) {
        return null;
      }

      const result = await bridge.invoke("undelete-save", {
        filePath: last.filePath,
        slot: Number(last.slot || 0),
        deletedEntry: String(last.deletedEntry || "")
      });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to undelete save."), "error");
        return null;
      }
      await this.loadCard(last.slotId, last.filePath);
      const restored = this.getSlot(last.slotId)?.saves.find((row) => Number(row?.slot || 0) === Number(last.slot || 0));
      if (restored) {
        this.selectSave(last.slotId, restored);
      }
      this.lastDeletedSave = null;
      this.setStatus(translate("desktopShell.memory.saveRestored", "Save restored."), "success");
      return result;
    },
    async pickBrowseRoot() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.memory.desktopBridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      const pick = await bridge.invoke("open-file-dialog", {
        title: translate("tools.searchMemoryCards", "Select memory card folder"),
        properties: ["openDirectory", "createDirectory"]
      });
      if (pick?.canceled || !Array.isArray(pick?.filePaths) || !pick.filePaths.length) {
        return null;
      }
      const root = String(pick.filePaths[0] || "").trim();
      this.browseRoot = root;
      return this.browseCards(root);
    },
    async browseCards(rootHint = this.browseRoot) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.memory.desktopBridgeUnavailable", "Desktop bridge unavailable."), "error");
        return [];
      }
      this.browseBusy = true;
      this.setStatus(translate("desktopShell.memory.scanningCards", "Scanning for memory cards..."));
      try {
        const result = await bridge.invoke("browse-memory-cards", String(rootHint || "").trim());
        if (!result?.success) {
          this.setStatus(String(result?.message || "Failed to browse memory cards."), "error");
          return [];
        }
        this.browseResults = (Array.isArray(result?.cards) ? result.cards : []).map((row) => ({
          name: String(row?.name || getFileName(row?.path)).trim(),
          path: String(row?.path || "").trim(),
          size: Number(row?.size || 0),
          modified: Number(row?.modified || 0)
        }));
        this.setStatus(
          this.browseResults.length
            ? translate("desktopShell.memory.cardsFound", `Found ${this.browseResults.length} card(s).`, { count: this.browseResults.length })
            : translate("tools.noMemoryCards", "No memory cards found."),
          this.browseResults.length ? "success" : "warning"
        );
        return this.browseResults;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to browse memory cards."), "error");
        return [];
      } finally {
        this.browseBusy = false;
      }
    },
    async loadBrowsedCard(slotId, filePath) {
      return this.loadCard(slotId, filePath);
    },
    initialize() {
      this.initialized = true;
    }
  }
});
