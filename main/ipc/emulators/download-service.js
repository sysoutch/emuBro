const { createDownloadPrimitives } = require("./download-primitives");
const { createDownloadTargetResolver } = require("./download-target-resolver");
const { createDownloadInstallTools } = require("./download-install-tools");

function createEmulatorDownloadService(deps = {}) {
  const {
    path,
    fsSync,
    Readable,
    pipeline,
    fetchFn,
    runtimePlatform,
    getArchiveKind
  } = deps;

  if (!path) throw new Error("createEmulatorDownloadService requires path");
  if (!fsSync) throw new Error("createEmulatorDownloadService requires fsSync");
  if (!Readable) throw new Error("createEmulatorDownloadService requires Readable");
  if (typeof pipeline !== "function") throw new Error("createEmulatorDownloadService requires pipeline");
  if (typeof fetchFn !== "function") throw new Error("createEmulatorDownloadService requires fetchFn");
  if (typeof getArchiveKind !== "function") throw new Error("createEmulatorDownloadService requires getArchiveKind");

  const primitives = createDownloadPrimitives({
    runtimePlatform,
    getArchiveKind,
    path
  });

  const {
    normalizeEmulatorName,
    normalizeEmulatorType,
    normalizeDownloadOsKey,
    sanitizePathSegment,
    ensureHttpUrl,
    normalizeDownloadUrlMap,
    buildEmulatorDownloadLinks,
    normalizeDownloadPackageType,
    inferDownloadPackageTypeFromName,
    isInstallerLikeName,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl
  } = primitives;

  const resolver = createDownloadTargetResolver({
    fetchFn,
    primitives
  });

  const {
    downloadUrlToFile,
    findEmulatorBinaryInFolder
  } = createDownloadInstallTools({
    path,
    fsSync,
    Readable,
    pipeline,
    fetchFn,
    normalizeDownloadOsKey
  });

  return {
    normalizeEmulatorName,
    normalizeEmulatorType,
    normalizeDownloadOsKey,
    sanitizePathSegment,
    ensureHttpUrl,
    normalizeDownloadUrlMap,
    buildEmulatorDownloadLinks,
    normalizeDownloadPackageType,
    inferDownloadPackageTypeFromName,
    downloadUrlToFile,
    findEmulatorBinaryInFolder,
    isInstallerLikeName,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl,
    resolveEmulatorDownloadTarget: resolver.resolveEmulatorDownloadTarget
  };
}

module.exports = {
  createEmulatorDownloadService
};
