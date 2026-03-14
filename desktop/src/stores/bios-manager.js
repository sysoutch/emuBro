import { defineStore } from "pinia";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeFileRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    name: String(row?.name || "").trim(),
    size: Number(row?.size || 0)
  }));
}

function normalizePlatformRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    key: String(row?.shortName || row?.platform || row?.name || "shared")
      .trim()
      .toLowerCase(),
    shortName: String(row?.shortName || row?.platform || "shared").trim().toLowerCase(),
    name: String(row?.name || row?.shortName || "Platform").trim(),
    biosRequired: !!row?.biosRequired,
    requiredBy: Array.isArray(row?.requiredBy) ? row.requiredBy.map((value) => String(value || "").trim()).filter(Boolean) : [],
    folderPath: String(row?.folderPath || "").trim(),
    fileCount: Number(row?.fileCount || 0),
    files: normalizeFileRows(row?.files)
  }));
}

export const useBiosManagerStore = defineStore("biosManager", {
  state: () => ({
    initialized: false,
    loading: false,
    status: "",
    statusTone: "",
    rootPath: "",
    platforms: []
  }),
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    async refresh() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      this.loading = true;
      this.setStatus("Loading BIOS folders...");

      try {
        const result = await bridge.invoke("bios:list");
        if (!result?.success) {
          this.setStatus(String(result?.message || "Failed to load BIOS data."), "error");
          return null;
        }

        this.rootPath = String(result?.rootPath || "").trim();
        this.platforms = normalizePlatformRows(result?.platforms);
        this.setStatus("BIOS data loaded.", "success");
        return this.platforms;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to load BIOS data."), "error");
        return null;
      } finally {
        this.loading = false;
      }
    },
    async openFolder(platformShortName = "shared") {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      const result = await bridge.invoke("bios:open-folder", { platformShortName });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to open BIOS folder."), "error");
        return null;
      }

      this.setStatus("Opened BIOS folder.", "success");
      return result;
    },
    async addFiles(platformShortName) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      const pick = await bridge.invoke("open-file-dialog", {
        title: "Select BIOS file(s)",
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "BIOS Files", extensions: ["bin", "rom", "bios", "img", "zip", "7z"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
        return null;
      }

      const result = await bridge.invoke("bios:add-files", {
        platformShortName,
        filePaths: pick.filePaths
      });
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to add BIOS files."), "error");
        return null;
      }

      this.setStatus(`Added ${Number(result?.added || 0)} BIOS file(s), skipped ${Number(result?.skipped || 0)}.`, "success");
      await this.refresh();
      return result;
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await this.refresh();
      this.initialized = true;
    }
  }
});
