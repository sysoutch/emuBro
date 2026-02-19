const { registerEmulatorDownloadOptionsHandler } = require("./register-download-options-handler");
const { registerEmulatorDownloadInstallHandler } = require("./register-download-install-handler");

function registerEmulatorDownloadHandlers(deps = {}) {
  const {
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
    normalizeDownloadOsKey,
    normalizeDownloadPackageType,
    ensureHttpUrl,
    resolveEmulatorDownloadTarget,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl,
    sanitizePathSegment,
    downloadUrlToFile,
    findEmulatorBinaryInFolder,
    inferDownloadPackageTypeFromName,
    isInstallerLikeName
  } = deps;

  if (!ipcMain) throw new Error("registerEmulatorDownloadHandlers requires ipcMain");
  if (!log) throw new Error("registerEmulatorDownloadHandlers requires log");
  if (!app) throw new Error("registerEmulatorDownloadHandlers requires app");
  if (!dialog) throw new Error("registerEmulatorDownloadHandlers requires dialog");
  if (typeof getMainWindow !== "function") throw new Error("registerEmulatorDownloadHandlers requires getMainWindow");
  if (!shell) throw new Error("registerEmulatorDownloadHandlers requires shell");
  if (!path) throw new Error("registerEmulatorDownloadHandlers requires path");
  if (!fsSync) throw new Error("registerEmulatorDownloadHandlers requires fsSync");
  if (typeof getLibraryPathSettings !== "function") throw new Error("registerEmulatorDownloadHandlers requires getLibraryPathSettings");
  if (typeof ensureUniqueDestinationPath !== "function") throw new Error("registerEmulatorDownloadHandlers requires ensureUniqueDestinationPath");
  if (typeof movePathSafe !== "function") throw new Error("registerEmulatorDownloadHandlers requires movePathSafe");
  if (typeof getArchiveKind !== "function") throw new Error("registerEmulatorDownloadHandlers requires getArchiveKind");
  if (typeof extractArchiveToDir !== "function") throw new Error("registerEmulatorDownloadHandlers requires extractArchiveToDir");
  if (typeof integrateDirectoryContents !== "function") throw new Error("registerEmulatorDownloadHandlers requires integrateDirectoryContents");
  if (typeof removePathSafe !== "function") throw new Error("registerEmulatorDownloadHandlers requires removePathSafe");
  if (typeof normalizePlatform !== "function") throw new Error("registerEmulatorDownloadHandlers requires normalizePlatform");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerEmulatorDownloadHandlers requires refreshLibraryFromDb");
  if (typeof dbUpsertEmulator !== "function") throw new Error("registerEmulatorDownloadHandlers requires dbUpsertEmulator");
  if (typeof normalizeDownloadOsKey !== "function") throw new Error("registerEmulatorDownloadHandlers requires normalizeDownloadOsKey");
  if (typeof normalizeDownloadPackageType !== "function") throw new Error("registerEmulatorDownloadHandlers requires normalizeDownloadPackageType");
  if (typeof ensureHttpUrl !== "function") throw new Error("registerEmulatorDownloadHandlers requires ensureHttpUrl");
  if (typeof resolveEmulatorDownloadTarget !== "function") throw new Error("registerEmulatorDownloadHandlers requires resolveEmulatorDownloadTarget");
  if (typeof getPreferredEmulatorDownloadUrl !== "function") throw new Error("registerEmulatorDownloadHandlers requires getPreferredEmulatorDownloadUrl");
  if (typeof buildWaybackMachineUrl !== "function") throw new Error("registerEmulatorDownloadHandlers requires buildWaybackMachineUrl");
  if (typeof sanitizePathSegment !== "function") throw new Error("registerEmulatorDownloadHandlers requires sanitizePathSegment");
  if (typeof downloadUrlToFile !== "function") throw new Error("registerEmulatorDownloadHandlers requires downloadUrlToFile");
  if (typeof findEmulatorBinaryInFolder !== "function") throw new Error("registerEmulatorDownloadHandlers requires findEmulatorBinaryInFolder");
  if (typeof inferDownloadPackageTypeFromName !== "function") throw new Error("registerEmulatorDownloadHandlers requires inferDownloadPackageTypeFromName");
  if (typeof isInstallerLikeName !== "function") throw new Error("registerEmulatorDownloadHandlers requires isInstallerLikeName");

  registerEmulatorDownloadOptionsHandler({
    ipcMain,
    log,
    runtimePlatform,
    normalizeDownloadOsKey,
    normalizeDownloadPackageType,
    ensureHttpUrl,
    resolveEmulatorDownloadTarget
  });

  registerEmulatorDownloadInstallHandler({
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
    normalizeDownloadOsKey,
    normalizeDownloadPackageType,
    ensureHttpUrl,
    resolveEmulatorDownloadTarget,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl,
    sanitizePathSegment,
    downloadUrlToFile,
    findEmulatorBinaryInFolder,
    inferDownloadPackageTypeFromName,
    isInstallerLikeName
  });
}

module.exports = {
  registerEmulatorDownloadHandlers
};
