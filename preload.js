const { contextBridge, ipcRenderer, webUtils } = require("electron");

const ALLOWED_INVOKE = new Set([
  "get-drives",
  "check-path-type",
  "analyze-import-paths",
  "stage-import-paths",
  "process-emulator-exe",
  "get-games",
  "get-game-details",
  "tags:list",
  "tags:rename",
  "tags:delete",
  "update-game-metadata",
  "remove-game",
  "launch-game",
  "game-session:get-status",
  "game-session:show-launcher",
  "game-session:quit",
  "game-session:send-hotkey",
  "game-session:capture-screenshot",
  "game-session:show-overlay-menu",
  "search-missing-game-file",
  "relink-game-file",
  "launch-emulator",
  "emulator:read-config-file",
  "emulator:write-config-file",
  "get-emulator-download-options",
  "download-install-emulator",
  "get-emulators",
  "show-item-in-folder",
  "get-file-icon-data-url",
  "open-external-url",
  "youtube:search-videos",
  "youtube:open-video",
  "suggestions:recommend-games",
  "suggestions:list-ollama-models",
  "suggestions:emulation-support",
  "suggestions:generate-theme",
  "suggestions:translate-locale-missing",
  "suggestions:suggest-tags-for-game",
  "suggestions:suggest-tags-for-games-batch",
  "browse-games-and-emus",
  "upload-theme",
  "get-user-info",
  "open-file-dialog",
  "get-library-stats",
  "get-monitor-info",
  "detect-monitors",
  "set-monitor-orientation",
  "toggle-monitor-orientation",
  "set-monitor-display-state",
  "set-primary-monitor",
  "read-memory-card",
  "delete-save",
  "rename-save",
  "format-card",
  "browse-memory-cards",
  "bios:list",
  "bios:add-files",
  "bios:open-folder",
  "get-all-translations",
  "locales:list",
  "locales:read",
  "locales:exists",
  "locales:write",
  "locales:delete",
  "locales:rename",
  "locales:flags:get-data-url",
  "locales:flags:write-data-url",
  "locales:flags:write-from-file",
  "locales:repo:get-config",
  "locales:repo:set-config",
  "locales:repo:fetch-catalog",
  "locales:repo:install",
  "create-game-shortcut",
  "prompt-scan-subfolders",
  "import-paths",
  "get-platforms",
  "get-platforms-for-extension",
  "import-files-as-platform",
  "iso:detect-game-codes",
  "cue:inspect-bin-files",
  "cue:generate-for-bin",
  "detect-emulator-exe",
  "import-exe",
  "settings:get-library-paths",
  "settings:set-library-paths",
  "settings:get-runtime-data-rules",
  "settings:set-runtime-data-rules",
  "settings:get-splash-theme",
  "settings:set-splash-theme",
  "settings:preview-relocate-managed-folder",
  "settings:confirm-relocate-preview",
  "settings:relocate-managed-folder",
  "window:minimize",
  "window:toggle-maximize",
  "window:close",
  "window:is-maximized",
  "app:renderer-ready",
  "update:get-state",
  "update:get-config",
  "update:set-config",
  "update:check",
  "update:download",
  "update:install",
  "resources:update:get-state",
  "resources:update:check",
  "resources:update:install",
  "resources:update:get-config",
  "resources:update:set-config"
]);

const ALLOWED_SEND = new Set([
  "minimize-window"
]);

const ALLOWED_ON = new Set([
  "emubro:launch",
  "window-moved",
  "window:maximized-changed",
  "app:update-status",
  "resources:update-status"
]);

function invoke(channel, ...args) {
  if (!ALLOWED_INVOKE.has(channel)) {
    throw new Error(`Blocked ipcRenderer.invoke('${channel}')`);
  }
  return ipcRenderer.invoke(channel, ...args);
}

function send(channel, ...args) {
  if (!ALLOWED_SEND.has(channel)) {
    throw new Error(`Blocked ipcRenderer.send('${channel}')`);
  }
  ipcRenderer.send(channel, ...args);
}

function on(channel, callback) {
  if (!ALLOWED_ON.has(channel)) {
    throw new Error(`Blocked ipcRenderer.on('${channel}')`);
  }
  if (typeof callback !== "function") return () => {};

  const listener = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("emubro", {
  platform: process.platform,
  // Deep-link payloads: { action, platform, name, code }
  onLaunch: (callback) => on("emubro:launch", callback),
  onWindowMoved: (callback) => on("window-moved", callback),
  onWindowMaximizedChanged: (callback) => on("window:maximized-changed", callback),
  onUpdateStatus: (callback) => on("app:update-status", callback),
  onResourcesUpdateStatus: (callback) => on("resources:update-status", callback),

  invoke,

  minimizeWindow: () => send("minimize-window"),

  getAllTranslations: () => invoke("get-all-translations"),

  locales: {
    list: () => invoke("locales:list"),
    read: (filename) => invoke("locales:read", filename),
    exists: (filename) => invoke("locales:exists", filename),
    write: (filename, json) => invoke("locales:write", filename, json),
    delete: (filename) => invoke("locales:delete", filename),
    rename: (payload) => invoke("locales:rename", payload),
    getFlagDataUrl: (flagCode) => invoke("locales:flags:get-data-url", flagCode),
    writeFlagDataUrl: (payload) => invoke("locales:flags:write-data-url", payload),
    writeFlagFromFile: (payload) => invoke("locales:flags:write-from-file", payload),
    getRepoConfig: () => invoke("locales:repo:get-config"),
    setRepoConfig: (payload) => invoke("locales:repo:set-config", payload),
    fetchRepoCatalog: (payload) => invoke("locales:repo:fetch-catalog", payload),
    installFromRepo: (payload) => invoke("locales:repo:install", payload)
  },

  createGameShortcut: (gameId) => invoke("create-game-shortcut", gameId),
  updates: {
    getState: () => invoke("update:get-state"),
    getConfig: () => invoke("update:get-config"),
    setConfig: (payload) => invoke("update:set-config", payload),
    check: () => invoke("update:check"),
    download: () => invoke("update:download"),
    install: () => invoke("update:install")
  },
  resourcesUpdates: {
    getState: () => invoke("resources:update:get-state"),
    check: () => invoke("resources:update:check"),
    install: () => invoke("resources:update:install"),
    getConfig: () => invoke("resources:update:get-config"),
    setConfig: (payload) => invoke("resources:update:set-config", payload)
  },
  promptScanSubfolders: (folderPath) => invoke("prompt-scan-subfolders", folderPath),
  importPaths: (paths, options) => invoke("import-paths", paths, options),
  getPathForFile: (file) => {
    try {
      const p = webUtils && typeof webUtils.getPathForFile === "function"
        ? webUtils.getPathForFile(file)
        : "";
      return typeof p === "string" ? p : "";
    } catch (_e) {
      return "";
    }
  }
});
