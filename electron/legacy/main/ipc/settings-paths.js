const path = require("path");

function registerSettingsPathsIpc(deps = {}) {
  const {
    ipcMain,
    log,
    fsSync,
    dialog,
    getMainWindow,
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
  } = deps;

  if (!ipcMain) throw new Error("registerSettingsPathsIpc requires ipcMain");
  if (!log) throw new Error("registerSettingsPathsIpc requires log");
  if (!fsSync) throw new Error("registerSettingsPathsIpc requires fsSync");
  if (!dialog) throw new Error("registerSettingsPathsIpc requires dialog");
  if (typeof getMainWindow !== "function") throw new Error("registerSettingsPathsIpc requires getMainWindow");
  if (typeof getLibraryPathSettings !== "function") throw new Error("registerSettingsPathsIpc requires getLibraryPathSettings");
  if (typeof getDefaultLibraryPathSettings !== "function") throw new Error("registerSettingsPathsIpc requires getDefaultLibraryPathSettings");
  if (typeof setLibraryPathSettings !== "function") throw new Error("registerSettingsPathsIpc requires setLibraryPathSettings");
  if (typeof getRuntimeDataRules !== "function") throw new Error("registerSettingsPathsIpc requires getRuntimeDataRules");
  if (typeof setRuntimeDataRules !== "function") throw new Error("registerSettingsPathsIpc requires setRuntimeDataRules");
  if (typeof normalizeManagedFolderKind !== "function") throw new Error("registerSettingsPathsIpc requires normalizeManagedFolderKind");
  if (typeof isExistingDirectory !== "function") throw new Error("registerSettingsPathsIpc requires isExistingDirectory");
  if (typeof pathsEqual !== "function") throw new Error("registerSettingsPathsIpc requires pathsEqual");
  if (typeof isPathInside !== "function") throw new Error("registerSettingsPathsIpc requires isPathInside");
  if (typeof buildDirectoryIntegrationPreview !== "function") throw new Error("registerSettingsPathsIpc requires buildDirectoryIntegrationPreview");
  if (typeof normalizeConflictPolicy !== "function") throw new Error("registerSettingsPathsIpc requires normalizeConflictPolicy");
  if (typeof integrateDirectoryContents !== "function") throw new Error("registerSettingsPathsIpc requires integrateDirectoryContents");
  if (typeof tryRemoveDirIfEmpty !== "function") throw new Error("registerSettingsPathsIpc requires tryRemoveDirIfEmpty");
  if (typeof normalizeFolderPathList !== "function") throw new Error("registerSettingsPathsIpc requires normalizeFolderPathList");

  ipcMain.handle("settings:get-library-paths", async () => {
    try {
      return { success: true, settings: getLibraryPathSettings() };
    } catch (error) {
      log.error("Failed to read library path settings:", error);
      return { success: false, message: error.message, settings: getDefaultLibraryPathSettings() };
    }
  });

  ipcMain.handle("settings:set-library-paths", async (_event, payload = {}) => {
    try {
      const saved = setLibraryPathSettings(payload);
      return { success: true, settings: saved };
    } catch (error) {
      log.error("Failed to save library path settings:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("settings:get-runtime-data-rules", async () => {
    try {
      return { success: true, rules: getRuntimeDataRules() };
    } catch (error) {
      log.error("Failed to read runtime data rules:", error);
      return {
        success: false,
        message: error.message,
        rules: {
          directoryNames: [],
          fileExtensions: [],
          fileNameIncludes: []
        }
      };
    }
  });

  ipcMain.handle("settings:set-runtime-data-rules", async (_event, payload = {}) => {
    try {
      const saved = setRuntimeDataRules(payload);
      return { success: true, rules: saved };
    } catch (error) {
      log.error("Failed to save runtime data rules:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("settings:preview-relocate-managed-folder", async (_event, payload = {}) => {
    try {
      const kind = normalizeManagedFolderKind(payload?.kind);
      if (!kind) return { success: false, message: "Invalid managed folder type" };

      const sourcePath = path.normalize(String(payload?.sourcePath || "").trim());
      const targetPath = path.normalize(String(payload?.targetPath || "").trim());
      if (!sourcePath || !targetPath) {
        return { success: false, message: "Missing source or destination path" };
      }
      if (!isExistingDirectory(sourcePath)) {
        return { success: false, message: "Source folder does not exist" };
      }
      if (pathsEqual(sourcePath, targetPath)) {
        return {
          success: true,
          kind,
          sourcePath,
          targetPath,
          preview: {
            totalItems: 0,
            totalFiles: 0,
            totalDirs: 0,
            newItems: 0,
            conflicts: 0,
            fileConflicts: 0,
            directoryConflicts: 0,
            typeConflicts: 0,
            mergeCandidates: 0,
            truncated: false
          }
        };
      }
      if (isPathInside(targetPath, sourcePath)) {
        return { success: false, message: "Destination folder cannot be inside the source folder." };
      }

      fsSync.mkdirSync(targetPath, { recursive: true });
      const preview = buildDirectoryIntegrationPreview(sourcePath, targetPath);
      return { success: true, kind, sourcePath, targetPath, preview };
    } catch (error) {
      log.error("settings:preview-relocate-managed-folder failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("settings:confirm-relocate-preview", async (_event, payload = {}) => {
    try {
      const ownerWindow = getMainWindow();
      if (!ownerWindow) {
        return { success: true, proceed: true, policy: "", canceled: false };
      }

      const sourcePath = String(payload?.sourcePath || "").trim();
      const targetPath = String(payload?.targetPath || "").trim();
      const preview = (payload?.preview && typeof payload.preview === "object") ? payload.preview : {};
      const totalItems = Number(preview.totalItems || 0);
      const newItems = Number(preview.newItems || 0);
      const conflicts = Number(preview.conflicts || 0);
      const fileConflicts = Number(preview.fileConflicts || 0);
      const directoryConflicts = Number(preview.directoryConflicts || 0);
      const typeConflicts = Number(preview.typeConflicts || 0);
      const truncated = !!preview.truncated;

      const detailLines = [
        `From: ${sourcePath}`,
        `To: ${targetPath}`,
        "",
        `Items scanned: ${totalItems}`,
        `New destination items: ${newItems}`,
        `Conflicts: ${conflicts} (files: ${fileConflicts}, folders: ${directoryConflicts}, type mismatch: ${typeConflicts})`,
        "",
        "Conflict impact preview:",
        `- Keep Both: create up to ${conflicts} duplicate-name copies`,
        `- Skip Existing: skip up to ${conflicts} source items`,
        `- Replace Existing: replace up to ${conflicts} destination items`
      ];
      if (truncated) {
        detailLines.push("", "Preview truncated due to very large folder size; actual conflicts may be higher.");
      }

      const response = await dialog.showMessageBox(ownerWindow, {
        type: "question",
        title: "Relocate Managed Folder",
        message: "Review relocation preview and choose conflict strategy.",
        detail: detailLines.join("\n"),
        buttons: [
          "Keep Both (Recommended)",
          "Skip Existing",
          "Replace Existing",
          "Ask Per Conflict",
          "Cancel"
        ],
        defaultId: 0,
        cancelId: 4,
        noLink: true
      });

      if (response.response === 4) {
        return { success: true, proceed: false, policy: "cancel", canceled: true };
      }
      if (response.response === 0) {
        return { success: true, proceed: true, policy: "keep_both", canceled: false };
      }
      if (response.response === 1) {
        return { success: true, proceed: true, policy: "skip_existing", canceled: false };
      }
      if (response.response === 2) {
        return { success: true, proceed: true, policy: "replace_existing", canceled: false };
      }

      return { success: true, proceed: true, policy: "", canceled: false };
    } catch (error) {
      log.error("settings:confirm-relocate-preview failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("settings:relocate-managed-folder", async (_event, payload = {}) => {
    try {
      const kind = normalizeManagedFolderKind(payload?.kind);
      if (!kind) return { success: false, message: "Invalid managed folder type" };

      const sourcePath = path.normalize(String(payload?.sourcePath || "").trim());
      const targetPath = path.normalize(String(payload?.targetPath || "").trim());
      if (!sourcePath || !targetPath) {
        return { success: false, message: "Missing source or destination path" };
      }
      if (!isExistingDirectory(sourcePath)) {
        return { success: false, message: "Source folder does not exist" };
      }
      if (pathsEqual(sourcePath, targetPath)) {
        return {
          success: true,
          message: "Source and destination are identical",
          settings: getLibraryPathSettings(),
          stats: { moved: 0, replaced: 0, keptBoth: 0, skipped: 0, conflicts: 0 }
        };
      }
      if (isPathInside(targetPath, sourcePath)) {
        return { success: false, message: "Destination folder cannot be inside the source folder." };
      }

      fsSync.mkdirSync(targetPath, { recursive: true });

      const ctx = {
        policy: normalizeConflictPolicy(payload?.conflictPolicy),
        operationLabel: "Relocate Managed Folder",
        discardSkippedSources: false,
        cancelled: false,
        stats: { moved: 0, replaced: 0, keptBoth: 0, skipped: 0, conflicts: 0 }
      };

      const merged = await integrateDirectoryContents(sourcePath, targetPath, ctx);
      if (!merged || ctx.cancelled) {
        return {
          success: false,
          canceled: true,
          message: "Folder relocation canceled by user.",
          settings: getLibraryPathSettings(),
          stats: ctx.stats
        };
      }

      tryRemoveDirIfEmpty(sourcePath);

      const current = getLibraryPathSettings();
      const currentList = Array.isArray(current[kind]) ? current[kind] : [];
      const replacedList = currentList.map((entryPath) => (
        pathsEqual(entryPath, sourcePath) ? targetPath : entryPath
      ));
      const cleanedList = normalizeFolderPathList(
        [...replacedList, targetPath].filter((entryPath) => !pathsEqual(entryPath, sourcePath))
      );

      const saved = setLibraryPathSettings({
        ...current,
        [kind]: cleanedList
      });

      return {
        success: true,
        message: "Managed folder relocated successfully.",
        settings: saved,
        sourcePath,
        targetPath,
        stats: ctx.stats
      };
    } catch (error) {
      log.error("settings:relocate-managed-folder failed:", error);
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerSettingsPathsIpc
};
