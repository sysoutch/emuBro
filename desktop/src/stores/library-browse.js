import { defineStore } from "pinia";
import { useWorkspaceStore } from "./workspace";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";

const QUICK_SEARCH_STATE_KEY = "emuBro.quickSearchState.v1";
const BROWSE_SCOPE_STORAGE_KEY = "emuBro.browseScope.v1";
const LIBRARY_BROWSE_STATE_KEY = "library-browse";

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

function readStorage(key, fallback = "") {
  return getShellStorageValue(key, fallback);
}

function writeStorage(key, value) {
  setShellStorageValue(key, String(value ?? ""));
}

function normalizeBrowseScope(scope) {
  const value = String(scope || "").trim().toLowerCase();
  if (value === "games" || value === "emulators" || value === "both") return value;
  return "both";
}

function loadQuickSearchState() {
  const fallback = { ready: false, gameFolders: [], emulatorFolders: [], lastSuccessAt: "" };
  const raw = readStorage(QUICK_SEARCH_STATE_KEY, "");
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return {
      ready: !!parsed?.ready,
      gameFolders: normalizePathList(parsed?.gameFolders),
      emulatorFolders: normalizePathList(parsed?.emulatorFolders),
      lastSuccessAt: String(parsed?.lastSuccessAt || "")
    };
  } catch (_error) {
    return fallback;
  }
}

function saveQuickSearchState(nextState) {
  writeStorage(
    QUICK_SEARCH_STATE_KEY,
    JSON.stringify({
      ready: !!nextState?.ready,
      gameFolders: normalizePathList(nextState?.gameFolders),
      emulatorFolders: normalizePathList(nextState?.emulatorFolders),
      lastSuccessAt: String(nextState?.lastSuccessAt || "")
    })
  );
}

function normalizeQuickSearchState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ready: !!source?.ready,
    gameFolders: normalizePathList(source?.gameFolders),
    emulatorFolders: normalizePathList(source?.emulatorFolders),
    lastSuccessAt: String(source?.lastSuccessAt || "")
  };
}

function normalizeBrowsePersistedState(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    browseScope: normalizeBrowseScope(source.browseScope),
    quickSearchState: normalizeQuickSearchState(source.quickSearchState)
  };
}

function getPathParentFolder(filePath) {
  const value = String(filePath || "").trim();
  if (!value) return "";
  const normalized = value.replace(/[\\/]+$/g, "");
  const index = Math.max(normalized.lastIndexOf("\\"), normalized.lastIndexOf("/"));
  if (index <= 0) return "";
  return normalized.slice(0, index);
}

function deriveCommonParentFolders(filePaths = []) {
  const parents = (Array.isArray(filePaths) ? filePaths : [])
    .map((entry) => getPathParentFolder(entry))
    .filter(Boolean);
  if (!parents.length) return [];

  const countMap = new Map();
  parents.forEach((folder) => {
    const key = folder.toLowerCase();
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  const repeatedParents = Array.from(countMap.entries())
    .filter(([, count]) => count >= 2)
    .map(([folderKey]) => parents.find((folder) => folder.toLowerCase() === folderKey) || "");

  if (repeatedParents.length > 0) return normalizePathList(repeatedParents);
  return normalizePathList(parents).slice(0, 20);
}

export const useLibraryBrowseStore = defineStore("libraryBrowse", {
  state: () => ({
    initialized: false,
    loading: false,
    searchBusy: false,
    coverBusy: false,
    browseScope: normalizeBrowseScope(readStorage(BROWSE_SCOPE_STORAGE_KEY, "both")),
    quickSearchState: loadQuickSearchState(),
    notifications: [],
    lastDiscovery: {
      archives: [],
      setupFiles: [],
      scope: "both",
      scannedAt: ""
    }
  }),
  getters: {
    quickSearchReady(state) {
      return !!state.quickSearchState.ready;
    },
    latestArchiveCount(state) {
      return Number(state.lastDiscovery.archives.length || 0);
    },
    latestSetupCount(state) {
      return Number(state.lastDiscovery.setupFiles.length || 0);
    }
  },
  actions: {
    persistNativeState() {
      void writeNativeShellState(LIBRARY_BROWSE_STATE_KEY, {
        browseScope: this.browseScope,
        quickSearchState: this.quickSearchState
      });
    },
    addNotification(message, level = "info") {
      const item = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        message: String(message || "").trim(),
        level: String(level || "info").trim().toLowerCase() || "info",
        stamp: new Date().toLocaleString()
      };
      this.notifications = [item, ...this.notifications].slice(0, 30);
    },
    clearNotifications() {
      this.notifications = [];
    },
    setBrowseScope(scope) {
      this.browseScope = normalizeBrowseScope(scope);
      writeStorage(BROWSE_SCOPE_STORAGE_KEY, this.browseScope);
      this.persistNativeState();
    },
    getQuickSearchTargetsByScope(scope = this.browseScope) {
      const normalized = normalizeBrowseScope(scope);
      if (normalized === "games") return normalizePathList(this.quickSearchState.gameFolders);
      if (normalized === "emulators") return normalizePathList(this.quickSearchState.emulatorFolders);
      return normalizePathList([...this.quickSearchState.gameFolders, ...this.quickSearchState.emulatorFolders]);
    },
    updateQuickSearchStateFromSummary(summary, scannedTargets = [], scope = this.browseScope) {
      const workspaceStore = useWorkspaceStore();
      const normalizedScope = normalizeBrowseScope(scope);
      const totalGames = Number(summary?.totalFoundGames || 0);
      const totalEmulators = Number(summary?.totalFoundEmulators || 0);
      const hasGamesInLibrary = workspaceStore.games.some((game) => !!String(game?.filePath || "").trim());
      const hasEmulatorsInLibrary = workspaceStore.emulators.some((emu) => !!String(emu?.filePath || "").trim());
      const hasScopeData =
        normalizedScope === "games"
          ? hasGamesInLibrary
          : normalizedScope === "emulators"
            ? hasEmulatorsInLibrary
            : hasGamesInLibrary || hasEmulatorsInLibrary;

      if (totalGames <= 0 && totalEmulators <= 0 && !hasScopeData) {
        return;
      }

      const nextState = {
        ...this.quickSearchState,
        ready: true,
        lastSuccessAt: new Date().toISOString()
      };
      const gamePaths =
        Array.isArray(summary?.foundGamePaths) && summary.foundGamePaths.length > 0
          ? summary.foundGamePaths
          : workspaceStore.games.map((game) => game?.filePath).filter(Boolean);
      const emulatorPaths =
        Array.isArray(summary?.foundEmulatorPaths) && summary.foundEmulatorPaths.length > 0
          ? summary.foundEmulatorPaths
          : workspaceStore.emulators.map((emu) => emu?.filePath).filter(Boolean);
      const scanned = normalizePathList(scannedTargets);
      const gameFolders = deriveCommonParentFolders(gamePaths);
      const emulatorFolders = deriveCommonParentFolders(emulatorPaths);
      const gameSeedFolders = gameFolders.length > 0 ? gameFolders : scanned;
      const emulatorSeedFolders = emulatorFolders.length > 0 ? emulatorFolders : scanned;

      if (normalizedScope !== "emulators") {
        nextState.gameFolders = normalizePathList([...nextState.gameFolders, ...gameSeedFolders]);
      }
      if (normalizedScope !== "games") {
        nextState.emulatorFolders = normalizePathList([...nextState.emulatorFolders, ...emulatorSeedFolders]);
      }

      this.quickSearchState = nextState;
      saveQuickSearchState(nextState);
      this.persistNativeState();
    },
    setLastDiscovery(summary, scope = this.browseScope) {
      this.lastDiscovery = {
        archives: normalizePathList(summary?.foundArchives),
        setupFiles: normalizePathList(summary?.foundSetupFiles),
        scope: normalizeBrowseScope(scope),
        scannedAt: new Date().toISOString()
      };
    },
    async openPath(path) {
      const target = String(path || "").trim();
      if (!target) {
        return null;
      }

      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.addNotification("Desktop bridge unavailable.", "error");
        return null;
      }

      const result = await bridge.invoke("show-item-in-folder", target);
      this.addNotification(
        result?.success ? "Opened file location." : String(result?.message || "Could not open file location."),
        result?.success ? "success" : "error"
      );
      return result;
    },
    async runBrowseSearch(mode = "full") {
      const workspaceStore = useWorkspaceStore();
      await workspaceStore.initialize();

      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.addNotification("Desktop bridge unavailable.", "error");
        return null;
      }

      const normalizedMode = String(mode || "full").trim().toLowerCase();
      const normalizedScope = normalizeBrowseScope(this.browseScope);
      const baseTargets = normalizePathList([
        ...(normalizedScope !== "emulators" ? workspaceStore.libraryPaths.gameFolders : []),
        ...(normalizedScope !== "games" ? workspaceStore.libraryPaths.emulatorFolders : [])
      ]);

      let targets = [];
      if (normalizedMode === "quick") {
        if (!this.quickSearchState.ready) {
          this.addNotification("Quick Search is disabled until a previous search found games or emulators.", "warning");
          return null;
        }
        targets = this.getQuickSearchTargetsByScope(normalizedScope);
      } else if (normalizedMode === "custom") {
        const pick = await bridge.invoke("open-file-dialog", {
          title: "Select search folder",
          properties: ["openDirectory"]
        });
        if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) {
          return null;
        }
        targets = normalizePathList([...pick.filePaths, ...baseTargets]);
      } else {
        targets = normalizePathList(baseTargets);
        if (!targets.length) {
          targets = [""];
        }
      }

      if (normalizedMode === "quick" && targets.length === 0) {
        this.addNotification("Quick Search skipped: no common parent folders found yet. Run a full search first.", "warning");
        return null;
      }

      this.searchBusy = true;
      this.addNotification(`Search started (${normalizedMode}, ${normalizedScope}).`, "info");

      try {
        let totalFoundGames = 0;
        let totalFoundEmulators = 0;
        const foundGamePaths = [];
        const foundEmulatorPaths = [];
        const foundArchives = [];
        const foundSetupFiles = [];
        let anySuccess = false;

        for (const target of targets) {
          const result = await bridge.invoke("browse-games-and-emus", target, { scope: normalizedScope });
          if (!result?.success) {
            continue;
          }
          anySuccess = true;
          const games = Array.isArray(result.games) ? result.games : [];
          const emulators = Array.isArray(result.emulators) ? result.emulators : [];
          totalFoundGames += games.length;
          totalFoundEmulators += emulators.length;
          games.forEach((row) => {
            const path = String(row?.filePath || "").trim();
            if (path) foundGamePaths.push(path);
          });
          emulators.forEach((row) => {
            const path = String(row?.filePath || "").trim();
            if (path) foundEmulatorPaths.push(path);
          });
          (Array.isArray(result.archives) ? result.archives : []).forEach((entry) => {
            const path = String(entry || "").trim();
            if (path) foundArchives.push(path);
          });
          (Array.isArray(result.setupFiles) ? result.setupFiles : []).forEach((entry) => {
            const path = String(entry || "").trim();
            if (path) foundSetupFiles.push(path);
          });
        }

        if (!anySuccess) {
          this.addNotification("Search finished without new results.", "warning");
          return null;
        }

        await workspaceStore.refresh();
        const summary = {
          success: true,
          scope: normalizedScope,
          scanTargets: targets,
          totalFoundGames,
          totalFoundEmulators,
          foundGamePaths,
          foundEmulatorPaths,
          foundArchives: normalizePathList(foundArchives),
          foundSetupFiles: normalizePathList(foundSetupFiles)
        };
        this.setLastDiscovery(summary, normalizedScope);
        this.updateQuickSearchStateFromSummary(summary, targets, normalizedScope);
        this.addNotification(
          `Search complete. ${totalFoundGames} game(s), ${totalFoundEmulators} emulator(s), ${summary.foundArchives.length} archive(s), ${summary.foundSetupFiles.length} setup file(s).`,
          "success"
        );
        return summary;
      } catch (error) {
        this.addNotification(`Search failed: ${error instanceof Error ? error.message : String(error || "Unknown error")}`, "error");
        return null;
      } finally {
        this.searchBusy = false;
      }
    },
    async downloadMissingCovers(gameIds = []) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.addNotification("Desktop bridge unavailable.", "error");
        return null;
      }

      this.coverBusy = true;
      this.addNotification("Downloading missing covers for the current library selection...", "info");

      try {
        const result = await bridge.invoke("covers:download-for-library", {
          gameIds: (Array.isArray(gameIds) ? gameIds : []).filter((id) => Number.isFinite(Number(id)) && Number(id) > 0),
          onlyMissing: true,
          overwrite: false
        });
        if (!result?.success) {
          this.addNotification(String(result?.message || "Cover download failed."), "error");
          return null;
        }
        this.addNotification(
          `Cover download complete. ${Number(result.downloaded || 0)} downloaded, ${Number(result.skipped || 0)} skipped, ${Number(result.failed || 0)} failed.`,
          Number(result.failed || 0) > 0 ? "warning" : "success"
        );
        const workspaceStore = useWorkspaceStore();
        await workspaceStore.refresh();
        return result;
      } catch (error) {
        this.addNotification(`Cover download failed: ${error instanceof Error ? error.message : String(error || "Unknown error")}`, "error");
        return null;
      } finally {
        this.coverBusy = false;
      }
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }
      this.loading = true;
      try {
        const persisted = normalizeBrowsePersistedState(
          await readNativeShellState(LIBRARY_BROWSE_STATE_KEY, {
            browseScope: readStorage(BROWSE_SCOPE_STORAGE_KEY, "both"),
            quickSearchState: loadQuickSearchState()
          })
        );
        this.quickSearchState = persisted.quickSearchState;
        this.browseScope = persisted.browseScope;
        this.persistNativeState();
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    }
  }
});
