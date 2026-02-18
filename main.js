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
const { registerMonitorIpc } = require("./main/ipc/monitors");
const { registerMemoryCardIpc } = require("./main/ipc/memory-cards");
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

let mainWindow;
const screen = require("electron").screen;

let appBootstrapStarted = false;
let mainWindowRendererReady = false;
let requestRevealMainWindow = null;
let gameIpcActions = null;
const { createSplashWindow, closeSplashWindow } = createSplashWindowManager();

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
  dbUpsertGame,
  dbUpsertEmulator,
  refreshLibraryFromDb,
  getGamesState,
  getEmulatorsState,
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
  setRequestRevealMainWindow: (value) => { requestRevealMainWindow = value; }
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

registerSystemActionsIpc({
  ipcMain,
  log,
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
  dbGetGameById,
  dbDeleteGameById,
  dbUpdateGameMetadata,
  dbUpdateGameFilePath,
  getPlatformConfigs
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
