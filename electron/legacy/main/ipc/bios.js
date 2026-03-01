const path = require("path");

function registerBiosIpc(deps = {}) {
  const {
    ipcMain,
    app,
    fsSync,
    shell,
    log,
    getPlatformConfigs
  } = deps;

  if (!ipcMain) throw new Error("registerBiosIpc requires ipcMain");
  if (!app) throw new Error("registerBiosIpc requires app");
  if (!fsSync) throw new Error("registerBiosIpc requires fsSync");
  if (!shell) throw new Error("registerBiosIpc requires shell");
  if (!log) throw new Error("registerBiosIpc requires log");
  if (typeof getPlatformConfigs !== "function") throw new Error("registerBiosIpc requires getPlatformConfigs");

  function sanitizePathSegment(value) {
    return String(value || "")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80)
      .replace(/[. ]+$/g, "")
      || "item";
  }

  function normalizePlatformShortName(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "");
  }

  function getBiosRootDir() {
    return path.join(app.getPath("userData"), "library-storage", "bios");
  }

  function ensureDir(dirPath) {
    const target = String(dirPath || "").trim();
    if (!target) return;
    fsSync.mkdirSync(target, { recursive: true });
  }

  function toUniqueTargetPath(targetDir, fileName) {
    const safeName = sanitizePathSegment(fileName);
    const ext = path.extname(safeName);
    const base = ext ? safeName.slice(0, -ext.length) : safeName;
    let candidate = path.join(targetDir, safeName);
    if (!fsSync.existsSync(candidate)) return candidate;

    let idx = 2;
    while (idx < 10000) {
      candidate = path.join(targetDir, `${base} (${idx})${ext}`);
      if (!fsSync.existsSync(candidate)) return candidate;
      idx += 1;
    }
    return path.join(targetDir, `${base}-${Date.now()}${ext}`);
  }

  function listFilesInDir(dirPath) {
    const out = [];
    const target = String(dirPath || "").trim();
    if (!target || !fsSync.existsSync(target)) return out;
    let entries = [];
    try {
      entries = fsSync.readdirSync(target, { withFileTypes: true });
    } catch (_e) {
      return out;
    }
    entries.forEach((entry) => {
      if (!entry.isFile()) return;
      const filePath = path.join(target, entry.name);
      let size = 0;
      let modifiedAt = "";
      try {
        const stat = fsSync.statSync(filePath);
        size = Number(stat.size || 0);
        modifiedAt = stat.mtime ? stat.mtime.toISOString() : "";
      } catch (_e) {}
      out.push({
        name: entry.name,
        filePath,
        size,
        modifiedAt
      });
    });
    out.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return out;
  }

  ipcMain.handle("bios:list", async () => {
    try {
      const biosRootDir = getBiosRootDir();
      ensureDir(biosRootDir);

      let platformConfigs = [];
      try {
        platformConfigs = await getPlatformConfigs();
      } catch (_e) {
        platformConfigs = [];
      }

      const map = new Map();
      (Array.isArray(platformConfigs) ? platformConfigs : []).forEach((platform) => {
        const shortName = normalizePlatformShortName(platform?.shortName);
        if (!shortName) return;
        const emulators = Array.isArray(platform?.emulators) ? platform.emulators : [];
        const requiring = emulators
          .filter((emu) => !!emu?.biosRequired)
          .map((emu) => String(emu?.name || "").trim())
          .filter(Boolean);
        if (!requiring.length) return;
        map.set(shortName, {
          shortName,
          name: String(platform?.name || shortName.toUpperCase()).trim() || shortName.toUpperCase(),
          biosRequired: true,
          requiredBy: requiring
        });
      });

      let dirs = [];
      try {
        dirs = fsSync.readdirSync(biosRootDir, { withFileTypes: true });
      } catch (_e) {
        dirs = [];
      }
      dirs.forEach((entry) => {
        if (!entry.isDirectory()) return;
        const shortName = normalizePlatformShortName(entry.name);
        if (!shortName) return;
        if (!map.has(shortName)) {
          map.set(shortName, {
            shortName,
            name: shortName.toUpperCase(),
            biosRequired: false,
            requiredBy: []
          });
        }
      });

      const rows = Array.from(map.values())
        .map((row) => {
          const folderPath = path.join(biosRootDir, row.shortName);
          ensureDir(folderPath);
          const files = listFilesInDir(folderPath);
          return {
            ...row,
            folderPath,
            fileCount: files.length,
            files
          };
        })
        .sort((a, b) => String(a.name || a.shortName).localeCompare(String(b.name || b.shortName)));

      return {
        success: true,
        rootPath: biosRootDir,
        platforms: rows
      };
    } catch (error) {
      log.error("bios:list failed:", error);
      return { success: false, message: error?.message || String(error), platforms: [] };
    }
  });

  ipcMain.handle("bios:add-files", async (_event, payload = {}) => {
    try {
      const shortName = normalizePlatformShortName(payload?.platformShortName || payload?.platform || "shared");
      const biosRootDir = getBiosRootDir();
      const targetDir = path.join(biosRootDir, shortName || "shared");
      ensureDir(targetDir);

      const sourceFiles = (Array.isArray(payload?.filePaths) ? payload.filePaths : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean);
      if (!sourceFiles.length) {
        return { success: false, message: "No BIOS files selected", added: 0, skipped: 0 };
      }

      let added = 0;
      let skipped = 0;
      const copied = [];
      for (const sourcePath of sourceFiles) {
        let stat;
        try {
          stat = fsSync.statSync(sourcePath);
        } catch (_e) {
          stat = null;
        }
        if (!stat || !stat.isFile()) {
          skipped += 1;
          continue;
        }

        const targetPath = toUniqueTargetPath(targetDir, path.basename(sourcePath));
        try {
          fsSync.copyFileSync(sourcePath, targetPath);
          copied.push(targetPath);
          added += 1;
        } catch (_e) {
          skipped += 1;
        }
      }

      return {
        success: true,
        rootPath: biosRootDir,
        folderPath: targetDir,
        added,
        skipped,
        copied
      };
    } catch (error) {
      log.error("bios:add-files failed:", error);
      return { success: false, message: error?.message || String(error), added: 0, skipped: 0 };
    }
  });

  ipcMain.handle("bios:open-folder", async (_event, payload = {}) => {
    try {
      const shortName = normalizePlatformShortName(payload?.platformShortName || payload?.platform || "shared");
      const targetDir = path.join(getBiosRootDir(), shortName || "shared");
      ensureDir(targetDir);
      const openError = await shell.openPath(targetDir);
      if (openError) {
        return { success: false, message: String(openError), path: targetDir };
      }
      return { success: true, path: targetDir };
    } catch (error) {
      log.error("bios:open-folder failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });
}

module.exports = {
  registerBiosIpc
};

