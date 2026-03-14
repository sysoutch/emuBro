import { defineStore } from "pinia";
import { useWorkspaceStore } from "./workspace";
import {
  COVER_DEFAULT_SOURCES,
  hasGameSerial,
  loadCoverSourceOverrides,
  normalizeCoverPlatform,
  parseCoverSourceText,
  saveCoverSourceOverrides
} from "../utils/cover-downloader";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function createEmptySourceMap() {
  return { psx: [], ps2: [] };
}

export const useCoverDownloaderStore = defineStore("coverDownloader", {
  state: () => ({
    initialized: false,
    loading: false,
    running: false,
    status: "",
    statusTone: "",
    summary: "",
    summaryTone: "",
    stats: {
      supported: 0,
      withSerial: 0
    },
    onlyMissing: true,
    overwrite: false,
    sourceOverrides: createEmptySourceMap(),
    sourceTemplates: {
      psx: [COVER_DEFAULT_SOURCES.psx],
      ps2: [COVER_DEFAULT_SOURCES.ps2]
    },
    results: []
  }),
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    setSummary(message, tone = "") {
      this.summary = String(message || "").trim();
      this.summaryTone = String(tone || "").trim();
    },
    setSourceOverride(platform, nextText) {
      const key = platform === "ps2" ? "ps2" : "psx";
      this.sourceOverrides = {
        ...this.sourceOverrides,
        [key]: parseCoverSourceText(nextText)
      };
      this.setStatus("");
    },
    saveOverrides() {
      this.sourceOverrides = saveCoverSourceOverrides(this.sourceOverrides);
      this.setStatus("Cover source links saved.", "success");
    },
    resetOverrides() {
      this.sourceOverrides = saveCoverSourceOverrides(createEmptySourceMap());
      this.setStatus("Extra cover links reset.");
    },
    async loadSourceConfig() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.sourceTemplates = {
          psx: [COVER_DEFAULT_SOURCES.psx],
          ps2: [COVER_DEFAULT_SOURCES.ps2]
        };
        return this.sourceTemplates;
      }

      const response = await bridge.invoke("covers:get-source-config");
      if (!response?.success) {
        this.sourceTemplates = {
          psx: [COVER_DEFAULT_SOURCES.psx],
          ps2: [COVER_DEFAULT_SOURCES.ps2]
        };
        return this.sourceTemplates;
      }

      const sources = response?.sources || {};
      this.sourceTemplates = {
        psx: Array.isArray(sources.psx) && sources.psx.length ? sources.psx : [COVER_DEFAULT_SOURCES.psx],
        ps2: Array.isArray(sources.ps2) && sources.ps2.length ? sources.ps2 : [COVER_DEFAULT_SOURCES.ps2]
      };
      return this.sourceTemplates;
    },
    async refreshStats() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.stats = { supported: 0, withSerial: 0 };
        return this.stats;
      }

      const games = await bridge.invoke("get-games");
      const rows = Array.isArray(games) ? games : [];
      const supported = rows.filter((game) => normalizeCoverPlatform(game?.platformShortName || game?.platform)).length;
      const withSerial = rows.filter((game) => {
        if (!normalizeCoverPlatform(game?.platformShortName || game?.platform)) {
          return false;
        }
        return hasGameSerial(game);
      }).length;
      this.stats = { supported, withSerial };
      return this.stats;
    },
    async runDownload({ gameIds = [] } = {}) {
      const bridge = getDesktopBridge();
      const workspaceStore = useWorkspaceStore();
      if (!bridge?.invoke) {
        this.setStatus("Desktop bridge unavailable.", "error");
        return null;
      }

      this.running = true;
      this.setStatus("Downloading covers...");
      this.setSummary("");

      try {
        const payload = {
          onlyMissing: !!this.onlyMissing,
          overwrite: !!this.overwrite,
          sourceOverrides: this.sourceOverrides
        };
        if (Array.isArray(gameIds) && gameIds.length > 0) {
          payload.gameIds = gameIds;
        }

        const result = await bridge.invoke("covers:download-for-library", payload);
        if (!result?.success) {
          this.setStatus(String(result?.message || "Cover download failed."), "error");
          return null;
        }

        this.results = Array.isArray(result?.results) ? result.results : [];
        this.sourceTemplates = {
          psx: Array.isArray(result?.sourceTemplates?.psx) && result.sourceTemplates.psx.length
            ? result.sourceTemplates.psx
            : [COVER_DEFAULT_SOURCES.psx],
          ps2: Array.isArray(result?.sourceTemplates?.ps2) && result.sourceTemplates.ps2.length
            ? result.sourceTemplates.ps2
            : [COVER_DEFAULT_SOURCES.ps2]
        };
        this.setStatus("");
        this.setSummary(
          `Processed ${Number(result?.total || 0)} game(s): ${Number(result?.downloaded || 0)} downloaded, ${Number(result?.skipped || 0)} skipped, ${Number(result?.failed || 0)} failed.`,
          Number(result?.failed || 0) > 0 ? "warning" : "success"
        );
        await Promise.all([this.refreshStats(), workspaceStore.refresh()]);
        return result;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Cover download failed."), "error");
        return null;
      } finally {
        this.running = false;
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      this.sourceOverrides = loadCoverSourceOverrides();
      await Promise.all([this.loadSourceConfig(), this.refreshStats()]);
      this.initialized = true;
    }
  }
});
