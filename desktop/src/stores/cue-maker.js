import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizePathList(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map((row) => String(row || "").trim())
    .filter(Boolean)
    .filter((row) => {
      const key = row.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

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

export const useCueMakerStore = defineStore("cueMaker", {
  state: () => ({
    initialized: false,
    running: false,
    status: "",
    statusTone: "",
    selectedBinPaths: [],
    inspectedRows: []
  }),
  getters: {
    missingCount(state) {
      return state.inspectedRows.filter((row) => !row?.hasCue).length;
    }
  },
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    async pickFiles() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      const pick = await bridge.invoke("open-file-dialog", {
        title: translate("tools.cueMakerSelectBins", "Select BIN Files"),
        properties: ["openFile", "multiSelections"],
        filters: [
          { name: "BIN Files", extensions: ["bin"] },
          { name: "All Files", extensions: ["*"] }
        ]
      });
      if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
        return null;
      }

      const paths = normalizePathList(pick.filePaths);
      await this.inspect(paths);
      return paths;
    },
    async inspect(paths = null) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      const targetPaths = normalizePathList(Array.isArray(paths) ? paths : this.selectedBinPaths);
      if (!targetPaths.length) {
        this.inspectedRows = [];
        this.setStatus(translate("tools.cueMakerNoSelection", "Select one or more BIN files first."), "warning");
        return null;
      }

      this.running = true;
      this.setStatus(translate("desktopShell.cueMaker.inspecting", "Inspecting BIN files..."));
      try {
        const response = await bridge.invoke("cue:inspect-bin-files", targetPaths);
        if (!response?.success) {
          this.setStatus(String(response?.message || "Failed to inspect BIN files."), "error");
          return null;
        }
        this.selectedBinPaths = targetPaths;
        this.inspectedRows = Array.isArray(response?.results) ? response.results : [];
        const missingCount = this.inspectedRows.filter((row) => !row?.hasCue).length;
        this.setStatus(
          missingCount > 0
            ? translate("desktopShell.cueMaker.missingSummary", `${missingCount} file(s) missing CUE.`, { count: missingCount })
            : translate("tools.cueMakerAllGood", "All selected BIN files already have CUE files."),
          missingCount > 0 ? "warning" : "success"
        );
        return this.inspectedRows;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to inspect BIN files."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    async generateMissing() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }

      const missing = this.inspectedRows
        .filter((row) => !row?.hasCue)
        .map((row) => String(row?.binPath || "").trim())
        .filter(Boolean);
      const targetPaths = normalizePathList(missing.length ? missing : this.selectedBinPaths);
      if (!targetPaths.length) {
        this.setStatus(translate("tools.cueMakerNoSelection", "Select one or more BIN files first."), "warning");
        return null;
      }

      this.running = true;
      this.setStatus(translate("desktopShell.cueMaker.generating", "Generating missing CUE files..."));
      try {
        const result = await bridge.invoke("cue:generate-for-bin", targetPaths);
        if (!result?.success) {
          this.setStatus(String(result?.message || "Failed to generate CUE files."), "error");
          return null;
        }
        this.setStatus(
          translate("tools.cueMakerGeneratedSummary", `Generated ${Number(result?.generated?.length || 0)}, already existed ${Number(result?.existing?.length || 0)}, failed ${Number(result?.failed?.length || 0)}.`, {
            generated: Number(result?.generated?.length || 0),
            existing: Number(result?.existing?.length || 0),
            failed: Number(result?.failed?.length || 0)
          }),
          Number(result?.failed?.length || 0) > 0 ? "warning" : "success"
        );
        await this.inspect(this.selectedBinPaths);
        return result;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to generate CUE files."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    initialize() {
      this.initialized = true;
    }
  }
});
