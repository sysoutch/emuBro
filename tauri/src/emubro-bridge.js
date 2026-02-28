import { invoke as tauriInvoke } from "@tauri-apps/api/core";

const emitter = new EventTarget();

async function invokeChannel(channel, ...args) {
  return tauriInvoke("emubro_invoke", { channel, args });
}

function onEvent(eventName, callback) {
  if (typeof callback !== "function") return () => {};
  const handler = (event) => callback(event.detail);
  emitter.addEventListener(eventName, handler);
  return () => emitter.removeEventListener(eventName, handler);
}

function dispatchEvent(eventName, detail) {
  emitter.dispatchEvent(new CustomEvent(eventName, { detail }));
}

const emubro = {
  platform: "tauri",
  invoke: invokeChannel,
  minimizeWindow: () => invokeChannel("window:minimize"),
  onLaunch: (callback) => onEvent("emubro:launch", callback),
  onWindowMoved: (callback) => onEvent("window-moved", callback),
  onWindowMaximizedChanged: (callback) => onEvent("window:maximized-changed", callback),
  onUpdateStatus: (callback) => onEvent("app:update-status", callback),
  onResourcesUpdateStatus: (callback) => onEvent("resources:update-status", callback),
  getAllTranslations: () => invokeChannel("get-all-translations"),
  locales: {
    list: () => invokeChannel("locales:list"),
    read: (filename) => invokeChannel("locales:read", filename),
    exists: (filename) => invokeChannel("locales:exists", filename),
    write: async () => ({ success: false, message: "Not implemented in Tauri migration yet" }),
    delete: async () => ({ success: false, message: "Not implemented in Tauri migration yet" }),
    rename: async () => ({ success: false, message: "Not implemented in Tauri migration yet" }),
    getFlagDataUrl: async () => ({ success: false, dataUrl: "" }),
    writeFlagDataUrl: async () => ({ success: false, message: "Not implemented in Tauri migration yet" }),
    writeFlagFromFile: async () => ({ success: false, message: "Not implemented in Tauri migration yet" }),
    getRepoConfig: async () => ({}),
    setRepoConfig: async () => ({ success: false, message: "Not implemented in Tauri migration yet" }),
    fetchRepoCatalog: async () => ({ success: false, items: [] }),
    installFromRepo: async () => ({ success: false, message: "Not implemented in Tauri migration yet" })
  },
  updates: {
    getState: () => invokeChannel("update:get-state"),
    getConfig: () => invokeChannel("update:get-config"),
    setConfig: (payload) => invokeChannel("update:set-config", payload),
    check: () => invokeChannel("update:check"),
    download: () => invokeChannel("update:download"),
    install: () => invokeChannel("update:install")
  },
  resourcesUpdates: {
    getState: () => invokeChannel("resources:update:get-state"),
    check: () => invokeChannel("resources:update:check"),
    install: () => invokeChannel("resources:update:install"),
    getConfig: () => invokeChannel("resources:update:get-config"),
    setConfig: (payload) => invokeChannel("resources:update:set-config", payload)
  },
  helpDocs: {
    list: (payload) => invokeChannel("help:docs:list", payload),
    get: (payload) => invokeChannel("help:docs:get", payload),
    search: (payload) => invokeChannel("help:docs:search", payload)
  },
  promptScanSubfolders: (folderPath) => invokeChannel("prompt-scan-subfolders", folderPath),
  importPaths: (paths, options) => invokeChannel("import-paths", paths, options),
  createGameShortcut: (gameId) => invokeChannel("create-game-shortcut", gameId),
  getPathForFile: () => ""
};

if (!window.emubro) {
  window.emubro = emubro;
}

window.__emubroDispatchEvent = dispatchEvent;

export { emubro, dispatchEvent };
