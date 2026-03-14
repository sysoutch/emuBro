import { defineStore } from "pinia";
import {
  normalizeEmulatorRow,
  normalizeGameRow,
  normalizeLocaleOption,
  normalizePlatformOption,
  pickRowLabel
} from "../utils/library-data";
import { resolveEffectiveEmulatorConfig } from "../utils/emulator-config";

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
    .filter((row) => row.length > 0)
    .filter((row) => {
      const key = row.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

function cloneLibraryPaths(paths) {
  return {
    gameFolders: normalizePathList(paths?.gameFolders),
    emulatorFolders: normalizePathList(paths?.emulatorFolders)
  };
}

export const useWorkspaceStore = defineStore("workspace", {
  state: () => ({
    initialized: false,
    loading: false,
    refreshError: "",
    stats: {
      games: 0,
      emulators: 0,
      platforms: 0,
      languages: 0
    },
    libraryPaths: {
      gameFolders: [],
      emulatorFolders: []
    },
    libraryPathsDraft: {
      gameFolders: [],
      emulatorFolders: []
    },
    libraryPathDirty: false,
    libraryPathSaveBusy: false,
    libraryPathSaveError: "",
    libraryPathStatus: "",
    games: [],
    emulators: [],
    platforms: [],
    languages: [],
    gamesPreview: [],
    emulatorsPreview: [],
    pluginChannelsReady: false,
    pluginScaffoldBusy: false,
    pluginScaffoldError: "",
    lastPluginScaffold: null
  }),
  getters: {
    totalLibraryFolders(state) {
      return state.libraryPaths.gameFolders.length + state.libraryPaths.emulatorFolders.length;
    },
    totalDraftLibraryFolders(state) {
      return state.libraryPathsDraft.gameFolders.length + state.libraryPathsDraft.emulatorFolders.length;
    }
  },
  actions: {
    syncLibraryPathDraft(nextPaths = this.libraryPaths) {
      this.libraryPathsDraft = cloneLibraryPaths(nextPaths);
    },
    replaceLibraryPathDraft(kind, nextRows) {
      if (kind !== "gameFolders" && kind !== "emulatorFolders") {
        return;
      }
      this.libraryPathsDraft = {
        ...this.libraryPathsDraft,
        [kind]: normalizePathList(nextRows)
      };
      this.libraryPathDirty = true;
      this.libraryPathSaveError = "";
      this.libraryPathStatus = "";
    },
    addLibraryPath(kind, value) {
      const nextValue = String(value || "").trim();
      if (!nextValue) {
        return;
      }
      this.replaceLibraryPathDraft(kind, [...this.libraryPathsDraft[kind], nextValue]);
    },
    removeLibraryPath(kind, index) {
      if (kind !== "gameFolders" && kind !== "emulatorFolders") {
        return;
      }
      const currentRows = this.libraryPathsDraft[kind];
      this.replaceLibraryPathDraft(
        kind,
        currentRows.filter((_row, rowIndex) => rowIndex !== index)
      );
    },
    resetLibraryPathDraft() {
      this.syncLibraryPathDraft(this.libraryPaths);
      this.libraryPathDirty = false;
      this.libraryPathSaveError = "";
      this.libraryPathStatus = "Reverted unsaved library path changes.";
    },
    async browseAndAddLibraryPath(kind) {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        this.libraryPathSaveError = "Desktop bridge unavailable.";
        return null;
      }

      const pick = await bridge.invoke("open-file-dialog", {
        title: "Select folder",
        properties: ["openDirectory", "createDirectory"]
      });
      if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
        return null;
      }

      const selectedPath = String(pick.filePaths[0] || "").trim();
      if (!selectedPath) {
        return null;
      }

      this.addLibraryPath(kind, selectedPath);
      return selectedPath;
    },
    async saveLibraryPaths() {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        this.libraryPathSaveError = "Desktop bridge unavailable.";
        return null;
      }

      this.libraryPathSaveBusy = true;
      this.libraryPathSaveError = "";
      this.libraryPathStatus = "";

      try {
        const result = await bridge.invoke("settings:set-library-paths", {
          gameFolders: this.libraryPathsDraft.gameFolders,
          emulatorFolders: this.libraryPathsDraft.emulatorFolders
        });
        if (!result?.success) {
          throw new Error(result?.message || "Failed to save library paths.");
        }

        const settings = cloneLibraryPaths(result.settings || this.libraryPathsDraft);
        this.libraryPaths = settings;
        this.syncLibraryPathDraft(settings);
        this.libraryPathDirty = false;
        this.libraryPathStatus = "Saved library path settings.";
        await this.refresh();
        return settings;
      } catch (error) {
        this.libraryPathSaveError = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.libraryPathSaveBusy = false;
      }
    },
    async refresh() {
      if (this.loading) {
        return;
      }

      this.loading = true;
      this.refreshError = "";

      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        this.initialized = true;
        this.loading = false;
        return;
      }

      try {
        const [games, emulators, platforms, locales, librarySettings] = await Promise.all([
          bridge.invoke("get-games"),
          bridge.invoke("get-emulators"),
          bridge.invoke("get-platforms"),
          bridge.invoke("locales:list"),
          bridge.invoke("settings:get-library-paths")
        ]);

        const gameRows = Array.isArray(games) ? games : [];
        const emulatorRows = Array.isArray(emulators) ? emulators : [];
        const platformRows = Array.isArray(platforms) ? platforms : [];
        const localeRows = Array.isArray(locales) ? locales : [];
        const settings =
          librarySettings && typeof librarySettings === "object" && librarySettings.success
            ? librarySettings.settings || {}
            : {};

        this.stats = {
          games: gameRows.length,
          emulators: emulatorRows.length,
          platforms: platformRows.length,
          languages: localeRows.length
        };
        this.libraryPaths = cloneLibraryPaths({
          gameFolders: Array.isArray(settings.gameFolders) ? settings.gameFolders : [],
          emulatorFolders: Array.isArray(settings.emulatorFolders) ? settings.emulatorFolders : []
        });
        if (!this.libraryPathDirty || this.totalDraftLibraryFolders === 0) {
          this.syncLibraryPathDraft(this.libraryPaths);
        }
        this.games = gameRows.map((row, index) => normalizeGameRow(row, index));
        this.emulators = emulatorRows.map((row, index) => {
          const effectiveConfig = resolveEffectiveEmulatorConfig(row);
          return normalizeEmulatorRow({ ...row, ...effectiveConfig }, index);
        });
        this.platforms = platformRows
          .map((row, index) => normalizePlatformOption(row, index))
          .filter(Boolean);
        this.languages = localeRows
          .map((row, index) => normalizeLocaleOption(row, index))
          .filter(Boolean);
        this.gamesPreview = gameRows.slice(0, 6).map((row, index) => pickRowLabel(row, `Game ${index + 1}`));
        this.emulatorsPreview = emulatorRows
          .slice(0, 6)
          .map((row, index) => pickRowLabel(row, `Emulator ${index + 1}`));
        this.pluginChannelsReady = true;
        this.initialized = true;
      } catch (error) {
        this.refreshError = error instanceof Error ? error.message : String(error || "Unknown error");
      } finally {
        this.loading = false;
      }
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await this.refresh();
    },
    async createToolPluginScaffold(payload = {}) {
      const bridge = getDesktopBridge();
      if (!bridge || typeof bridge.invoke !== "function") {
        this.pluginScaffoldError = "Desktop bridge unavailable.";
        return null;
      }

      this.pluginScaffoldBusy = true;
      this.pluginScaffoldError = "";

      try {
        const result = await bridge.invoke("tools:plugin:create-files", payload);
        if (!result || result.success !== true) {
          const message = String(result?.message || "Failed to create plugin scaffold.");
          this.pluginScaffoldError = message;
          return null;
        }

        const files = await bridge.invoke("tools:plugin:read-files", {
          htmlFilePath: result.htmlFilePath,
          cssFilePath: result.cssFilePath,
          jsFilePath: result.jsFilePath
        });

        this.lastPluginScaffold = {
          ...result,
          files: files && files.success === true ? files : null
        };
        return this.lastPluginScaffold;
      } catch (error) {
        this.pluginScaffoldError = error instanceof Error ? error.message : String(error || "Unknown error");
        return null;
      } finally {
        this.pluginScaffoldBusy = false;
      }
    }
  }
});
