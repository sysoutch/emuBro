const path = require("path");
const fsSync = require("fs");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { createEmulatorDownloadService } = require("./emulators/download-service");
const { createEmulatorCatalogService } = require("./emulators/catalog-service");
const { registerEmulatorCatalogHandlers } = require("./emulators/register-catalog-handlers");
const { registerEmulatorDownloadHandlers } = require("./emulators/register-download-handlers");

function registerEmulatorIpc(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    dialog,
    getMainWindow,
    shell,
    fetchImpl,
    processPlatform,
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
  } = deps;

  const runtimePlatform = String(processPlatform || process.platform || "").trim().toLowerCase();
  const fetchFn = typeof fetchImpl === "function" ? fetchImpl : (typeof fetch === "function" ? fetch : null);

  if (!ipcMain) throw new Error("registerEmulatorIpc requires ipcMain");
  if (!app) throw new Error("registerEmulatorIpc requires app");
  if (!dialog) throw new Error("registerEmulatorIpc requires dialog");
  if (typeof getMainWindow !== "function") throw new Error("registerEmulatorIpc requires getMainWindow");
  if (!shell) throw new Error("registerEmulatorIpc requires shell");
  if (!fetchFn) throw new Error("registerEmulatorIpc requires fetch implementation");

  const downloadService = createEmulatorDownloadService({
    path,
    fsSync,
    Readable,
    pipeline,
    fetchFn,
    runtimePlatform,
    getArchiveKind
  });

  const catalogService = createEmulatorCatalogService({
    path,
    fsSync,
    normalizePlatform,
    normalizeEmulatorName: downloadService.normalizeEmulatorName,
    normalizeEmulatorType: downloadService.normalizeEmulatorType,
    ensureHttpUrl: downloadService.ensureHttpUrl,
    buildEmulatorDownloadLinks: downloadService.buildEmulatorDownloadLinks
  });

  registerEmulatorCatalogHandlers({
    ipcMain,
    normalizeEmulatorType: downloadService.normalizeEmulatorType,
    buildEmulatorDownloadLinks: downloadService.buildEmulatorDownloadLinks,
    buildConfiguredEmulators: catalogService.buildConfiguredEmulators,
    installedMatchesConfigured: catalogService.installedMatchesConfigured,
    mapInstalledRows: catalogService.mapInstalledRows,
    refreshLibraryFromDb,
    getEmulatorsState,
    getPlatformConfigs
  });

  registerEmulatorDownloadHandlers({
    ipcMain,
    log,
    app,
    dialog,
    getMainWindow,
    shell,
    path,
    fsSync,
    getLibraryPathSettings,
    ensureUniqueDestinationPath,
    movePathSafe,
    getArchiveKind,
    extractArchiveToDir,
    integrateDirectoryContents,
    removePathSafe,
    normalizePlatform,
    refreshLibraryFromDb,
    dbUpsertEmulator,
    runtimePlatform,
    normalizeDownloadOsKey: downloadService.normalizeDownloadOsKey,
    normalizeDownloadPackageType: downloadService.normalizeDownloadPackageType,
    ensureHttpUrl: downloadService.ensureHttpUrl,
    resolveEmulatorDownloadTarget: downloadService.resolveEmulatorDownloadTarget,
    getPreferredEmulatorDownloadUrl: downloadService.getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl: downloadService.buildWaybackMachineUrl,
    sanitizePathSegment: downloadService.sanitizePathSegment,
    downloadUrlToFile: downloadService.downloadUrlToFile,
    findEmulatorBinaryInFolder: downloadService.findEmulatorBinaryInFolder,
    inferDownloadPackageTypeFromName: downloadService.inferDownloadPackageTypeFromName,
    isInstallerLikeName: downloadService.isInstallerLikeName
  });
}

module.exports = {
  registerEmulatorIpc
};
