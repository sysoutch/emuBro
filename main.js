const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage } = require("electron");
const path = require("path");
const log = require("electron-log");
const Store = require("electron-store");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const { execFile, spawnSync } = require("child_process");
const { createSplashWindowManager } = require("./main/splash-window");
const { registerWindowControlsIpc } = require("./main/ipc/window-controls");
const { registerLocalesIpc } = require("./main/ipc/locales");
const { registerYouTubeSearchIpc } = require("./main/ipc/youtube-search");
const { registerSuggestionsIpc } = require("./main/ipc/suggestions");
const { registerMonitorIpc } = require("./main/ipc/monitors");
const { registerMemoryCardIpc } = require("./main/ipc/memory-cards");
const { registerBiosIpc } = require("./main/ipc/bios");
const { registerEmulatorIpc } = require("./main/ipc/emulators");
const { registerImportIpc } = require("./main/ipc/imports");
const { registerGameIpc } = require("./main/ipc/games");
const { registerSystemActionsIpc } = require("./main/ipc/system-actions");
const { registerThemeUploadIpc } = require("./main/ipc/theme-upload");
const { registerSettingsPathsIpc } = require("./main/ipc/settings-paths");
const { registerImportStagingIpc } = require("./main/ipc/import-staging");
const { registerAppMetaIpc } = require("./main/ipc/app-meta");
const { createLibraryStorageTools } = require("./main/library-storage-tools");
const { createPlatformConfigService } = require("./main/platform-config-service");
const { createLibraryDbService } = require("./main/library-db");
const { createAppBootstrapManager } = require("./main/app-bootstrap");

// Import handlers
const ps1Handler = require("./ps1-handler");

// Initialize the store for app settings
const store = new Store();
const LIBRARY_PATH_SETTINGS_KEY = "library:path-settings:v1";
const SPLASH_THEME_SETTINGS_KEY = "ui:splash-theme:v1";
const FIRST_RUN_LEGAL_NOTICE_KEY = "legal:first-run-notice-shown:v1";
const RUNTIME_DATA_RULES_SETTINGS_KEY = "runtime:data-rules:v1";
const GAME_SESSION_CLOSE_BEHAVIOR_SETTINGS_KEY = "game-session:close-behavior:v1";

let mainWindow;
const screen = require("electron").screen;

let appBootstrapStarted = false;
let mainWindowRendererReady = false;
let requestRevealMainWindow = null;
let gameIpcActions = null;
let hasAttemptedFirstRunLegalNotice = false;
const { createSplashWindow, closeSplashWindow } = createSplashWindowManager({
  getSplashTheme: () => store.get(SPLASH_THEME_SETTINGS_KEY, null)
});

function normalizeRuntimeRuleValueList(values = []) {
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((entry) => {
    const value = String(entry || "").trim().toLowerCase();
    if (!value) return;
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
}

function normalizeRuntimeFileExtensions(values = []) {
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach((entry) => {
    let value = String(entry || "").trim().toLowerCase();
    if (!value) return;
    if (!value.startsWith(".")) value = `.${value}`;
    value = value.replace(/\s+/g, "");
    if (!value) return;
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  });
  return out;
}

function getDefaultRuntimeDataRules() {
  return {
    directoryNames: [],
    fileExtensions: [],
    fileNameIncludes: []
  };
}

function normalizeRuntimeDataRules(payload = {}) {
  const source = (payload && typeof payload === "object") ? payload : {};
  return {
    directoryNames: normalizeRuntimeRuleValueList(source.directoryNames),
    fileExtensions: normalizeRuntimeFileExtensions(source.fileExtensions),
    fileNameIncludes: normalizeRuntimeRuleValueList(source.fileNameIncludes)
  };
}

function getRuntimeDataRules() {
  const raw = store.get(RUNTIME_DATA_RULES_SETTINGS_KEY, getDefaultRuntimeDataRules());
  return normalizeRuntimeDataRules(raw);
}

function setRuntimeDataRules(payload = {}) {
  const normalized = normalizeRuntimeDataRules(payload);
  store.set(RUNTIME_DATA_RULES_SETTINGS_KEY, normalized);
  return normalized;
}

async function showFirstRunLegalNoticeOnce() {
  if (hasAttemptedFirstRunLegalNotice) return;
  hasAttemptedFirstRunLegalNotice = true;

  try {
    if (store.get(FIRST_RUN_LEGAL_NOTICE_KEY, false)) return;
    const ownerWindow = (mainWindow && !mainWindow.isDestroyed()) ? mainWindow : null;
    await dialog.showMessageBox(ownerWindow, {
      type: "warning",
      title: "emuBro - Anti-Piracy Notice",
      message: "emuBro is intended for legal use only.",
      detail: "Do not download, share, or use pirated games, BIOS files, firmware, or emulator packages.\n\nEmulator usage is at your own risk. You are responsible for legal compliance, file safety, and any effects caused by third-party software.",
      buttons: ["I Understand"],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });
    store.set(FIRST_RUN_LEGAL_NOTICE_KEY, true);
  } catch (error) {
    log.error("Failed to show first-run legal notice:", error);
  }
}

const {
  normalizeFolderPathList,
  getDefaultLibraryPathSettings,
  getLibraryPathSettings,
  setLibraryPathSettings,
  normalizeManagedFolderKind,
  classifyPathMedia,
  ensureUniqueDestinationPath,
  movePathSafe,
  pathsEqual,
  isPathInside,
  isExistingDirectory,
  removePathSafe,
  tryRemoveDirIfEmpty,
  normalizeConflictPolicy,
  integrateDirectoryContents,
  buildDirectoryIntegrationPreview,
  getArchiveKind,
  extractArchiveToDir
} = createLibraryStorageTools({
  app,
  store,
  storageKey: LIBRARY_PATH_SETTINGS_KEY,
  path,
  fsSync,
  dialog,
  spawnSync,
  getMainWindow: () => mainWindow
});

const libraryDbService = createLibraryDbService({
  app,
  fsSync,
  log,
  appRootDir: __dirname
});

const {
  dbGetGameById,
  dbDeleteGameById,
  dbUpdateGameFilePath,
  dbUpdateGameMetadata,
  dbUpsertTags,
  dbUpsertGame,
  dbUpsertEmulator,
  refreshLibraryFromDb,
  getGamesState,
  getEmulatorsState,
  getTagsState,
  normalizePlatform,
  inferGameCode,
  discoverCoverImageRelative,
  findGameByPlatformAndCodeOrName
} = libraryDbService;

const {
  getPlatformConfigs,
  determinePlatformFromFilename,
  determinePlatformFromFilenameEmus,
  processEmulatorExe
} = createPlatformConfigService({
  app,
  fs,
  fsSync,
  log,
  dbUpsertEmulator,
  refreshLibraryFromDb
});

// Create the main window
const appBootstrapManager = createAppBootstrapManager({
  app,
  BrowserWindow,
  Menu,
  screen,
  path,
  dialog,
  log,
  processRef: process,
  createSplashWindow,
  closeSplashWindow,
  refreshLibraryFromDb,
  findGameByPlatformAndCodeOrName,
  getGameLaunchHandler: () => gameIpcActions?.launchGameObject,
  getMainWindow: () => mainWindow,
  setMainWindow: (value) => { mainWindow = value; },
  getAppBootstrapStarted: () => appBootstrapStarted,
  setAppBootstrapStarted: (value) => { appBootstrapStarted = !!value; },
  getMainWindowRendererReady: () => mainWindowRendererReady,
  setMainWindowRendererReady: (value) => { mainWindowRendererReady = !!value; },
  getRequestRevealMainWindow: () => requestRevealMainWindow,
  setRequestRevealMainWindow: (value) => { requestRevealMainWindow = value; },
  onMainWindowRevealed: () => {
    showFirstRunLegalNoticeOnce();
  }
});

appBootstrapManager.initLifecycle();
registerWindowControlsIpc({
  ipcMain,
  getMainWindow: () => mainWindow,
  onMainWindowRendererReady: () => {
    mainWindowRendererReady = true;
    if (typeof requestRevealMainWindow === "function") requestRevealMainWindow();
  }
});

registerLocalesIpc({
  ipcMain,
  app,
  fs,
  fsSync,
  path,
  log,
  appRootDir: __dirname
});

registerYouTubeSearchIpc({
  ipcMain,
  log,
  fetchImpl: fetch
});

registerSuggestionsIpc({
  ipcMain,
  log,
  fetchImpl: fetch
});

registerSystemActionsIpc({
  ipcMain,
  log,
  app,
  fsSync,
  shell
});

registerImportStagingIpc({
  ipcMain,
  log,
  fs,
  fsSync,
  classifyPathMedia,
  ensureUniqueDestinationPath,
  movePathSafe
});

registerSettingsPathsIpc({
  ipcMain,
  log,
  fsSync,
  dialog,
  getMainWindow: () => mainWindow,
  getLibraryPathSettings,
  getDefaultLibraryPathSettings,
  setLibraryPathSettings,
  getRuntimeDataRules,
  setRuntimeDataRules,
  normalizeManagedFolderKind,
  isExistingDirectory,
  pathsEqual,
  isPathInside,
  buildDirectoryIntegrationPreview,
  normalizeConflictPolicy,
  integrateDirectoryContents,
  tryRemoveDirIfEmpty,
  normalizeFolderPathList
});

registerAppMetaIpc({
  ipcMain,
  log,
  os,
  fsSync,
  dialog,
  getMainWindow: () => mainWindow,
  getGamesState
});

ipcMain.handle("settings:set-splash-theme", async (_event, payload = {}) => {
  try {
    const input = (payload && typeof payload === "object") ? payload : {};
    const normalized = {
      id: String(input.id || "dark"),
      tone: String(input.tone || "dark").toLowerCase() === "light" ? "light" : "dark",
      bgPrimary: String(input.bgPrimary || "").trim(),
      bgSecondary: String(input.bgSecondary || "").trim(),
      bgTertiary: String(input.bgTertiary || "").trim(),
      textPrimary: String(input.textPrimary || "").trim(),
      textSecondary: String(input.textSecondary || "").trim(),
      accentColor: String(input.accentColor || "").trim(),
      accentLight: String(input.accentLight || "").trim(),
      fontBody: String(input.fontBody || "").trim(),
      appGradientA: String(input.appGradientA || "").trim(),
      appGradientB: String(input.appGradientB || "").trim(),
      appGradientC: String(input.appGradientC || "").trim()
    };
    store.set(SPLASH_THEME_SETTINGS_KEY, normalized);
    return { success: true };
  } catch (error) {
    log.error("settings:set-splash-theme failed:", error);
    return { success: false, message: error?.message || String(error) };
  }
});

ipcMain.handle("settings:get-splash-theme", async () => {
  try {
    return { success: true, theme: store.get(SPLASH_THEME_SETTINGS_KEY, null) };
  } catch (error) {
    log.error("settings:get-splash-theme failed:", error);
    return { success: false, theme: null };
  }
});

registerImportIpc({
  ipcMain,
  log,
  app,
  dialog,
  fs,
  fsSync,
  getMainWindow: () => mainWindow,
  refreshLibraryFromDb,
  getGamesState,
  getEmulatorsState,
  getPlatformConfigs,
  determinePlatformFromFilename,
  determinePlatformFromFilenameEmus,
  processEmulatorExe,
  inferGameCode,
  discoverCoverImageRelative,
  dbUpsertGame,
  getArchiveKind,
  extractArchiveToDir
});

registerEmulatorIpc({
  ipcMain,
  log,
  app,
  dialog,
  getMainWindow: () => mainWindow,
  shell,
  fetchImpl: fetch,
  processPlatform: process.platform,
  getLibraryPathSettings,
  ensureUniqueDestinationPath,
  movePathSafe,
  getArchiveKind,
  extractArchiveToDir,
  integrateDirectoryContents,
  removePathSafe,
  getPlatformConfigs,
  normalizePlatform,
  refreshLibraryFromDb,
  getEmulatorsState,
  dbUpsertEmulator
});

gameIpcActions = registerGameIpc({
  ipcMain,
  log,
  app,
  BrowserWindow,
  Menu,
  screen,
  dialog,
  shell,
  nativeImage,
  fsSync,
  normalizePlatform,
  inferGameCode,
  classifyPathMedia,
  getMainWindow: () => mainWindow,
  refreshLibraryFromDb,
  getGamesState,
  getEmulatorsState,
  getTagsState,
  dbGetGameById,
  dbDeleteGameById,
  dbUpdateGameMetadata,
  dbUpsertTags,
  dbUpdateGameFilePath,
  getPlatformConfigs,
  getRuntimeDataRules,
  getGameSessionCloseBehaviorPreference: () => store.get(GAME_SESSION_CLOSE_BEHAVIOR_SETTINGS_KEY, "ask"),
  setGameSessionCloseBehaviorPreference: (value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized !== "hide" && normalized !== "quit" && normalized !== "ask") return;
    store.set(GAME_SESSION_CLOSE_BEHAVIOR_SETTINGS_KEY, normalized);
  }
});

registerThemeUploadIpc({
  ipcMain,
  log,
  fetchImpl: fetch
});

// Handle app quit
app.on("before-quit", () => {
  log.info("Application is quitting");
});

registerMonitorIpc({
  ipcMain,
  execFile,
  path,
  os,
  fsSync,
  log,
  appRootDir: __dirname
});

registerMemoryCardIpc({
  ipcMain,
  ps1Handler,
  fs,
  path,
  os,
  log
});

registerBiosIpc({
  ipcMain,
  app,
  fsSync,
  shell,
  log,
  getPlatformConfigs
});

ipcMain.handle("youtube:open-video", async (_event, url) => {
  const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com"
  ]);

  const isYouTubeHost = (hostname) => {
    const host = String(hostname || "").trim().toLowerCase();
    if (!host) return false;
    if (YOUTUBE_HOSTS.has(host)) return true;
    return host.endsWith(".youtube.com");
  };

  const extractVideoId = (parsedUrl) => {
    const host = String(parsedUrl?.hostname || "").toLowerCase();
    const pathPart = String(parsedUrl?.pathname || "");
    if (host === "youtu.be") {
      const shortId = pathPart.replace(/^\/+/, "").split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(shortId) ? shortId : "";
    }
    if (pathPart.startsWith("/watch")) {
      const watchId = String(parsedUrl.searchParams.get("v") || "").trim();
      return /^[A-Za-z0-9_-]{11}$/.test(watchId) ? watchId : "";
    }
    if (pathPart.startsWith("/embed/")) {
      const embedId = pathPart.split("/")[2] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(embedId) ? embedId : "";
    }
    if (pathPart.startsWith("/shorts/")) {
      const shortsId = pathPart.split("/")[2] || "";
      return /^[A-Za-z0-9_-]{11}$/.test(shortsId) ? shortsId : "";
    }
    return "";
  };

  try {
    let targetUrl = String(url || "").trim();
    if (!targetUrl) return { success: false, message: "No URL provided" };
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = `https://${targetUrl}`;
    }

    let parsed;
    try {
      parsed = new URL(targetUrl);
    } catch (_error) {
      return { success: false, message: "Invalid YouTube URL" };
    }

    if (!isYouTubeHost(parsed.hostname)) {
      return { success: false, message: "Only YouTube URLs are supported" };
    }

    const videoId = extractVideoId(parsed);
    const loadUrl = videoId
      ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&origin=${encodeURIComponent("https://www.youtube.com")}`
      : parsed.toString();

    const videoWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      title: "emuBro - YouTube",
      backgroundColor: "#000",
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true
      }
    });

    videoWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      try {
        const parsedNext = new URL(nextUrl);
        if (isYouTubeHost(parsedNext.hostname)) {
          return { action: "allow" };
        }
      } catch (_error) {}
      void shell.openExternal(nextUrl);
      return { action: "deny" };
    });

    videoWindow.webContents.on("will-navigate", (event, nextUrl) => {
      try {
        const parsedNext = new URL(nextUrl);
        if (isYouTubeHost(parsedNext.hostname)) return;
      } catch (_error) {}
      event.preventDefault();
      void shell.openExternal(nextUrl);
    });

    const loadOptions = {
      httpReferrer: "https://www.youtube.com/",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36"
    };

    await videoWindow.loadURL(loadUrl, loadOptions);

    if (videoId) {
      // YouTube can reject embed playback in embedded contexts (Error 153). Fall back to watch page.
      await new Promise((resolve) => setTimeout(resolve, 700));
      let hasEmbedError153 = false;
      try {
        hasEmbedError153 = await videoWindow.webContents.executeJavaScript(
          `(() => {
            const text = String(document?.body?.innerText || '').toLowerCase();
            return text.includes('error 153')
              || text.includes('fehler 153')
              || text.includes('player configuration')
              || text.includes('konfiguration des videoplayers');
          })()`,
          true
        );
      } catch (_error) {
        hasEmbedError153 = false;
      }

      if (hasEmbedError153) {
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        await videoWindow.loadURL(watchUrl, loadOptions);
        return { success: true, url: watchUrl, embedded: false, fallback: "watch-page" };
      }
    }

    return { success: true, url: loadUrl, embedded: !!videoId };
  } catch (error) {
    log.error("youtube:open-video failed:", error);
    return { success: false, message: error?.message || String(error) };
  }
});
