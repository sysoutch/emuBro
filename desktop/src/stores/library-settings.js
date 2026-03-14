import { defineStore } from "pinia";
import { useHeaderFiltersStore } from "./header-filters";
import { useWorkspaceStore } from "./workspace";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const DEFAULT_LIBRARY_SECTION_KEY = "emuBro.defaultLibrarySection";
const DEFAULT_LIBRARY_VIEW_KEY = "emuBro.defaultLibraryView";
const SHOW_LOAD_INDICATOR_KEY = "emuBro.showLoadIndicator";
const AUTO_OPEN_FOOTER_KEY = "emuBro.autoOpenFooter";
const LLM_HELPERS_ENABLED_KEY = "emuBro.llmHelpersEnabled";
const LLM_ALLOW_UNKNOWN_TAGS_KEY = "emuBro.llmAllowUnknownTags";
const PREFER_COPY_EXTERNAL_KEY = "emuBro.preferCopyExternal";
const ENABLE_NETWORK_SCAN_KEY = "emuBro.enableNetworkScan";
const LAUNCHER_IMPORT_STEAM_KEY = "emuBro.launcherImportSteam";
const LAUNCHER_IMPORT_EPIC_KEY = "emuBro.launcherImportEpic";
const LAUNCHER_IMPORT_GOG_KEY = "emuBro.launcherImportGog";
const LAUNCHER_IMPORT_MODE_KEY = "emuBro.launcherImportMode";
const LIBRARY_SETTINGS_STATE_KEY = "library-settings";

const LIBRARY_SECTION_OPTIONS = [
  { id: "all", label: "All Games" },
  { id: "suggested", label: "Suggested Games" },
  { id: "recent", label: "Recently Played" },
  { id: "emulators", label: "Emulators" }
];

const VIEW_OPTIONS = [
  { id: "cover", label: "Cover" },
  { id: "list", label: "List" },
  { id: "focus", label: "Focus" },
  { id: "slideshow", label: "Slideshow" },
  { id: "random", label: "Random" }
];

const LAUNCHER_DISCOVERY_OPTIONS = [
  { id: "filesystem", label: "Filesystem" },
  { id: "api", label: "API (if available)" },
  { id: "both", label: "Both" }
];

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function readStorage(key, fallback = "") {
  return getShellStorageValue(key, fallback);
}

function writeStorage(key, value) {
  setShellStorageValue(key, String(value ?? ""));
}

function normalizeLibrarySection(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "favorite") {
    return "suggested";
  }
  return LIBRARY_SECTION_OPTIONS.some((row) => row.id === normalized) ? normalized : "all";
}

function normalizeLibraryView(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return VIEW_OPTIONS.some((row) => row.id === normalized) ? normalized : "cover";
}

function normalizeDiscoveryMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return LAUNCHER_DISCOVERY_OPTIONS.some((row) => row.id === normalized) ? normalized : "filesystem";
}

function readBooleanSetting(key, defaultValue) {
  const rawValue = String(readStorage(key, defaultValue ? "true" : "false")).trim().toLowerCase();
  if (rawValue === "true") {
    return true;
  }
  if (rawValue === "false") {
    return false;
  }
  return !!defaultValue;
}

function createGeneralDraft() {
  return {
    defaultSection: normalizeLibrarySection(readStorage(DEFAULT_LIBRARY_SECTION_KEY, "all")),
    defaultView: normalizeLibraryView(readStorage(DEFAULT_LIBRARY_VIEW_KEY, "cover")),
    showLoadIndicator: readBooleanSetting(SHOW_LOAD_INDICATOR_KEY, true),
    autoOpenFooter: readBooleanSetting(AUTO_OPEN_FOOTER_KEY, true),
    llmHelpersEnabled: readBooleanSetting(LLM_HELPERS_ENABLED_KEY, true),
    llmAllowUnknownTags: readBooleanSetting(LLM_ALLOW_UNKNOWN_TAGS_KEY, false)
  };
}

function createImportDraft() {
  return {
    preferCopyExternal: readBooleanSetting(PREFER_COPY_EXTERNAL_KEY, true),
    enableNetworkScan: readBooleanSetting(ENABLE_NETWORK_SCAN_KEY, true),
    launcherStores: {
      steam: readBooleanSetting(LAUNCHER_IMPORT_STEAM_KEY, true),
      epic: readBooleanSetting(LAUNCHER_IMPORT_EPIC_KEY, false),
      gog: readBooleanSetting(LAUNCHER_IMPORT_GOG_KEY, false)
    },
    launcherDiscoveryMode: normalizeDiscoveryMode(readStorage(LAUNCHER_IMPORT_MODE_KEY, "filesystem"))
  };
}

function cloneGeneralDraft(draft = createGeneralDraft()) {
  return {
    defaultSection: normalizeLibrarySection(draft?.defaultSection),
    defaultView: normalizeLibraryView(draft?.defaultView),
    showLoadIndicator: !!draft?.showLoadIndicator,
    autoOpenFooter: !!draft?.autoOpenFooter,
    llmHelpersEnabled: !!draft?.llmHelpersEnabled,
    llmAllowUnknownTags: !!draft?.llmAllowUnknownTags
  };
}

function cloneImportDraft(draft = createImportDraft()) {
  return {
    preferCopyExternal: !!draft?.preferCopyExternal,
    enableNetworkScan: !!draft?.enableNetworkScan,
    launcherStores: {
      steam: !!draft?.launcherStores?.steam,
      epic: !!draft?.launcherStores?.epic,
      gog: !!draft?.launcherStores?.gog
    },
    launcherDiscoveryMode: normalizeDiscoveryMode(draft?.launcherDiscoveryMode)
  };
}

function normalizeLauncherRows(rows = [], importedPaths = new Set()) {
  return (Array.isArray(rows) ? rows : [])
    .map((row, index) => {
      const launcher = String(row?.launcher || row?.store || "launcher").trim().toLowerCase();
      const launchUri = String(row?.launchUri || row?.filePath || row?.path || "").trim();
      const name = String(row?.name || row?.title || `Launcher Game ${index + 1}`).trim();
      if (!name || !launchUri) {
        return null;
      }
      return {
        id: `${launcher}:${launchUri.toLowerCase()}`,
        name,
        launcher,
        launchUri,
        installDir: String(row?.installDir || row?.installPath || "").trim(),
        installed: !!row?.installed,
        imported: importedPaths.has(launchUri.toLowerCase()),
        selected: !importedPaths.has(launchUri.toLowerCase()),
        raw: row
      };
    })
    .filter(Boolean);
}

function applyLlmHelperAttributes(generalDraft) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.setAttribute(
    "data-llm-helpers",
    generalDraft?.llmHelpersEnabled ? "enabled" : "disabled"
  );
}

function createSettingsSnapshot() {
  return {
    general: createGeneralDraft(),
    imports: createImportDraft()
  };
}

function normalizeSettingsSnapshot(snapshot = createSettingsSnapshot()) {
  return {
    general: cloneGeneralDraft(snapshot?.general),
    imports: cloneImportDraft(snapshot?.imports)
  };
}

export const useLibrarySettingsStore = defineStore("librarySettings", {
  state: () => ({
    initialized: false,
    loading: false,
    generalDraft: createGeneralDraft(),
    savedGeneralDraft: createGeneralDraft(),
    importDraft: createImportDraft(),
    savedImportDraft: createImportDraft(),
    saveStatus: "",
    saveTone: "",
    launcherRows: [],
    launcherInstalledOnly: false,
    launcherScanBusy: false,
    launcherImportBusy: false,
    launcherStatus: "",
    launcherStatusTone: ""
  }),
  getters: {
    librarySectionOptions() {
      return LIBRARY_SECTION_OPTIONS;
    },
    libraryViewOptions() {
      return VIEW_OPTIONS;
    },
    launcherDiscoveryOptions() {
      return LAUNCHER_DISCOVERY_OPTIONS;
    },
    hasDraftChanges(state) {
      return (
        JSON.stringify(state.generalDraft) !== JSON.stringify(state.savedGeneralDraft) ||
        JSON.stringify(state.importDraft) !== JSON.stringify(state.savedImportDraft)
      );
    },
    visibleLauncherRows(state) {
      if (!state.launcherInstalledOnly) {
        return state.launcherRows;
      }
      return state.launcherRows.filter((row) => row.installed);
    },
    selectedLauncherRows(state) {
      return state.launcherRows.filter((row) => row.selected);
    }
  },
  actions: {
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }
      this.loading = true;
      try {
        const persisted = normalizeSettingsSnapshot(
          await readNativeShellState(LIBRARY_SETTINGS_STATE_KEY, createSettingsSnapshot())
        );
        this.savedGeneralDraft = cloneGeneralDraft(persisted.general);
        this.generalDraft = cloneGeneralDraft(this.savedGeneralDraft);
        this.savedImportDraft = cloneImportDraft(persisted.imports);
        this.importDraft = cloneImportDraft(this.savedImportDraft);
        this.initialized = true;
        applyLlmHelperAttributes(this.generalDraft);
      } finally {
        this.loading = false;
      }
    },
    setGeneralField(field, value) {
      if (field === "defaultSection") {
        this.generalDraft.defaultSection = normalizeLibrarySection(value);
        return;
      }
      if (field === "defaultView") {
        this.generalDraft.defaultView = normalizeLibraryView(value);
        return;
      }
      if (field === "llmHelpersEnabled") {
        const enabled = !!value;
        this.generalDraft.llmHelpersEnabled = enabled;
        if (!enabled) {
          this.generalDraft.llmAllowUnknownTags = false;
        }
        return;
      }
      if (field in this.generalDraft) {
        this.generalDraft[field] = !!value;
      }
    },
    setImportField(field, value) {
      if (field === "launcherDiscoveryMode") {
        this.importDraft.launcherDiscoveryMode = normalizeDiscoveryMode(value);
        return;
      }
      if (field in this.importDraft) {
        this.importDraft[field] = !!value;
      }
    },
    setLauncherStore(storeId, enabled) {
      const key = String(storeId || "").trim().toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(this.importDraft.launcherStores, key)) {
        return;
      }
      this.importDraft.launcherStores[key] = !!enabled;
    },
    resetDrafts() {
      this.generalDraft = cloneGeneralDraft(this.savedGeneralDraft);
      this.importDraft = cloneImportDraft(this.savedImportDraft);
      this.saveStatus = "Reverted unsaved library settings.";
      this.saveTone = "";
      applyLlmHelperAttributes(this.generalDraft);
    },
    save() {
      this.savedGeneralDraft = cloneGeneralDraft(this.generalDraft);
      this.savedImportDraft = cloneImportDraft(this.importDraft);

      writeStorage(DEFAULT_LIBRARY_SECTION_KEY, this.savedGeneralDraft.defaultSection);
      writeStorage(DEFAULT_LIBRARY_VIEW_KEY, this.savedGeneralDraft.defaultView);
      writeStorage(SHOW_LOAD_INDICATOR_KEY, this.savedGeneralDraft.showLoadIndicator ? "true" : "false");
      writeStorage(AUTO_OPEN_FOOTER_KEY, this.savedGeneralDraft.autoOpenFooter ? "true" : "false");
      writeStorage(LLM_HELPERS_ENABLED_KEY, this.savedGeneralDraft.llmHelpersEnabled ? "true" : "false");
      writeStorage(LLM_ALLOW_UNKNOWN_TAGS_KEY, this.savedGeneralDraft.llmAllowUnknownTags ? "true" : "false");
      writeStorage(PREFER_COPY_EXTERNAL_KEY, this.savedImportDraft.preferCopyExternal ? "true" : "false");
      writeStorage(ENABLE_NETWORK_SCAN_KEY, this.savedImportDraft.enableNetworkScan ? "true" : "false");
      writeStorage(LAUNCHER_IMPORT_STEAM_KEY, this.savedImportDraft.launcherStores.steam ? "true" : "false");
      writeStorage(LAUNCHER_IMPORT_EPIC_KEY, this.savedImportDraft.launcherStores.epic ? "true" : "false");
      writeStorage(LAUNCHER_IMPORT_GOG_KEY, this.savedImportDraft.launcherStores.gog ? "true" : "false");
      writeStorage(LAUNCHER_IMPORT_MODE_KEY, this.savedImportDraft.launcherDiscoveryMode);
      void writeNativeShellState(LIBRARY_SETTINGS_STATE_KEY, {
        general: this.savedGeneralDraft,
        imports: this.savedImportDraft
      });

      applyLlmHelperAttributes(this.savedGeneralDraft);

      const headerFiltersStore = useHeaderFiltersStore();
      headerFiltersStore.updateField("librarySection", this.savedGeneralDraft.defaultSection);
      headerFiltersStore.updateField("viewMode", this.savedGeneralDraft.defaultView);

      this.saveStatus = "Saved library defaults and import settings.";
      this.saveTone = "success";
    },
    async scanLauncherGames() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.launcherStatus = "Desktop bridge unavailable.";
        this.launcherStatusTone = "error";
        return [];
      }

      const workspaceStore = useWorkspaceStore();
      await workspaceStore.initialize();

      this.launcherScanBusy = true;
      this.launcherStatus = "Scanning launcher libraries...";
      this.launcherStatusTone = "";

      try {
        const result = await bridge.invoke("launcher:scan-games", {
          stores: this.importDraft.launcherStores,
          discoveryMode: this.importDraft.launcherDiscoveryMode
        });
        if (!result?.success) {
          this.launcherRows = [];
          this.launcherStatus = String(result?.message || "Failed to scan launcher libraries.");
          this.launcherStatusTone = "error";
          return [];
        }

        const importedPaths = new Set(
          (Array.isArray(workspaceStore.games) ? workspaceStore.games : [])
            .map((game) => String(game?.filePath || game?.raw?.filePath || "").trim().toLowerCase())
            .filter(Boolean)
        );
        const rows = [];
        const stores = result?.stores && typeof result.stores === "object" ? result.stores : {};
        Object.entries(stores).forEach(([storeId, storeRows]) => {
          (Array.isArray(storeRows) ? storeRows : []).forEach((row) => rows.push({ ...row, launcher: storeId }));
        });

        this.launcherRows = normalizeLauncherRows(rows, importedPaths);
        if (!this.launcherRows.length) {
          this.launcherStatus = "No launcher games found for the selected stores.";
          this.launcherStatusTone = "warning";
          return [];
        }

        this.launcherStatus = `Found ${this.launcherRows.length} launcher game(s).`;
        this.launcherStatusTone = "success";
        return this.launcherRows;
      } catch (error) {
        this.launcherRows = [];
        this.launcherStatus = error instanceof Error ? error.message : String(error || "Failed to scan launcher libraries.");
        this.launcherStatusTone = "error";
        return [];
      } finally {
        this.launcherScanBusy = false;
      }
    },
    setLauncherInstalledOnly(enabled) {
      this.launcherInstalledOnly = !!enabled;
    },
    setLauncherRowSelected(rowId, selected) {
      const targetId = String(rowId || "").trim();
      this.launcherRows = this.launcherRows.map((row) =>
        row.id === targetId ? { ...row, selected: !!selected } : row
      );
    },
    selectAllLauncherRows(selected = true) {
      const nextSelected = !!selected;
      this.launcherRows = this.launcherRows.map((row) => ({ ...row, selected: nextSelected }));
    },
    async importSelectedLauncherRows() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.launcherStatus = "Desktop bridge unavailable.";
        this.launcherStatusTone = "error";
        return null;
      }

      const selectedRows = this.selectedLauncherRows;
      if (!selectedRows.length) {
        this.launcherStatus = "Select at least one launcher game to import.";
        this.launcherStatusTone = "warning";
        return null;
      }

      this.launcherImportBusy = true;
      this.launcherStatus = "Importing launcher games...";
      this.launcherStatusTone = "";

      try {
        const result = await bridge.invoke("launcher:import-games", {
          games: selectedRows.map((row) => row.raw)
        });
        if (!result?.success) {
          this.launcherStatus = String(result?.message || "Failed to import launcher games.");
          this.launcherStatusTone = "error";
          return null;
        }

        const workspaceStore = useWorkspaceStore();
        await workspaceStore.refresh();
        const addedCount = Array.isArray(result?.added) ? result.added.length : Number(result?.addedCount || 0);
        this.launcherRows = this.launcherRows.map((row) =>
          row.selected ? { ...row, imported: true, selected: false } : row
        );
        this.launcherStatus = `Imported ${addedCount} launcher game(s).`;
        this.launcherStatusTone = "success";
        return result;
      } catch (error) {
        this.launcherStatus = error instanceof Error ? error.message : String(error || "Failed to import launcher games.");
        this.launcherStatusTone = "error";
        return null;
      } finally {
        this.launcherImportBusy = false;
      }
    }
  }
});
