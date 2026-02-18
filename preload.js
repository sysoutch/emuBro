const { contextBridge, ipcRenderer, webUtils } = require("electron");

const ALLOWED_INVOKE = new Set([
  "get-drives",
  "check-path-type",
  "analyze-import-paths",
  "stage-import-paths",
  "process-emulator-exe",
  "get-games",
  "get-game-details",
  "update-game-metadata",
  "remove-game",
  "launch-game",
  "search-missing-game-file",
  "relink-game-file",
  "launch-emulator",
  "get-emulator-download-options",
  "download-install-emulator",
  "get-emulators",
  "show-item-in-folder",
  "open-external-url",
  "youtube:search-videos",
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
  "get-all-translations",
  "locales:list",
  "locales:read",
  "locales:exists",
  "locales:write",
  "create-game-shortcut",
  "prompt-scan-subfolders",
  "import-paths",
  "get-platforms",
  "import-files-as-platform",
  "detect-emulator-exe",
  "import-exe",
  "settings:get-library-paths",
  "settings:set-library-paths",
  "settings:preview-relocate-managed-folder",
  "settings:confirm-relocate-preview",
  "settings:relocate-managed-folder"
  ,
  "window:minimize",
  "window:toggle-maximize",
  "window:close",
  "window:is-maximized",
  "app:renderer-ready"
]);

const ALLOWED_SEND = new Set([
  "minimize-window"
]);

const ALLOWED_ON = new Set([
  "emubro:launch",
  "window-moved",
  "window:maximized-changed"
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

  invoke,

  minimizeWindow: () => send("minimize-window"),

  getAllTranslations: () => invoke("get-all-translations"),

  locales: {
    list: () => invoke("locales:list"),
    read: (filename) => invoke("locales:read", filename),
    exists: (filename) => invoke("locales:exists", filename),
    write: (filename, json) => invoke("locales:write", filename, json)
  },

  createGameShortcut: (gameId) => invoke("create-game-shortcut", gameId),
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
