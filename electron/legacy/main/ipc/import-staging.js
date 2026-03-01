const path = require("path");

function registerImportStagingIpc(deps = {}) {
  const {
    ipcMain,
    log,
    fs,
    fsSync,
    classifyPathMedia,
    ensureUniqueDestinationPath,
    movePathSafe
  } = deps;

  if (!ipcMain) throw new Error("registerImportStagingIpc requires ipcMain");
  if (!log) throw new Error("registerImportStagingIpc requires log");
  if (!fs || typeof fs.stat !== "function") throw new Error("registerImportStagingIpc requires fs promises API");
  if (!fsSync) throw new Error("registerImportStagingIpc requires fsSync");
  if (typeof classifyPathMedia !== "function") throw new Error("registerImportStagingIpc requires classifyPathMedia");
  if (typeof ensureUniqueDestinationPath !== "function") throw new Error("registerImportStagingIpc requires ensureUniqueDestinationPath");
  if (typeof movePathSafe !== "function") throw new Error("registerImportStagingIpc requires movePathSafe");

  ipcMain.handle("check-path-type", async (_event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        isDirectory: stats.isDirectory(),
        path: filePath
      };
    } catch (error) {
      log.error("Failed to check path type:", error);
      return { isDirectory: false, path: filePath };
    }
  });

  ipcMain.handle("analyze-import-paths", async (_event, paths) => {
    try {
      const rows = [];
      const inputPaths = Array.isArray(paths) ? paths : [];
      for (const raw of inputPaths) {
        const p = String(raw || "").trim();
        if (!p) continue;
        rows.push(classifyPathMedia(p));
      }

      const requiresDecision = rows.some((row) =>
        row.mediaCategory === "removable" ||
        row.mediaCategory === "cdrom" ||
        row.mediaCategory === "network"
      );

      return { success: true, paths: rows, requiresDecision };
    } catch (error) {
      log.error("analyze-import-paths failed:", error);
      return { success: false, message: error.message, paths: [], requiresDecision: false };
    }
  });

  ipcMain.handle("stage-import-paths", async (_event, payload = {}) => {
    try {
      const mode = String(payload?.mode || "keep").trim().toLowerCase();
      const targetDir = String(payload?.targetDir || "").trim();
      const inputPaths = Array.isArray(payload?.paths) ? payload.paths : [];

      if (mode !== "copy" && mode !== "move" && mode !== "keep") {
        return { success: false, message: "Invalid staging mode" };
      }

      const cleanPaths = inputPaths
        .map((p) => String(p || "").trim())
        .filter(Boolean);

      if (mode === "keep") {
        return { success: true, mode, paths: cleanPaths, skipped: [] };
      }

      if (!targetDir) {
        return { success: false, message: "Missing destination folder" };
      }

      fsSync.mkdirSync(targetDir, { recursive: true });

      const staged = [];
      const skipped = [];

      for (const src of cleanPaths) {
        try {
          if (!fsSync.existsSync(src)) {
            skipped.push({ path: src, reason: "not_found" });
            continue;
          }

          const baseName = path.basename(src);
          const requestedDest = path.join(targetDir, baseName);
          const finalDest = ensureUniqueDestinationPath(requestedDest);

          if (mode === "copy") {
            const stat = fsSync.lstatSync(src);
            if (stat.isDirectory()) {
              fsSync.cpSync(src, finalDest, { recursive: true, force: false, errorOnExist: true });
            } else if (stat.isFile()) {
              fsSync.copyFileSync(src, finalDest, fsSync.constants.COPYFILE_EXCL);
            } else {
              skipped.push({ path: src, reason: "unsupported_type" });
              continue;
            }
          } else {
            movePathSafe(src, finalDest);
          }

          staged.push(finalDest);
        } catch (error) {
          skipped.push({ path: src, reason: "stage_failed", message: error.message });
        }
      }

      return { success: true, mode, paths: staged, skipped };
    } catch (error) {
      log.error("stage-import-paths failed:", error);
      return { success: false, message: error.message, paths: [], skipped: [] };
    }
  });
}

module.exports = {
  registerImportStagingIpc
};
