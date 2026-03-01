function createLibraryStorageTools(deps = {}) {
  const app = deps.app;
  const store = deps.store;
  const path = deps.path;
  const fsSync = deps.fsSync;
  const dialog = deps.dialog;
  const spawnSync = deps.spawnSync;
  const getMainWindow = typeof deps.getMainWindow === "function" ? deps.getMainWindow : () => null;
  const libraryPathSettingsKey = String(deps.storageKey || "library:path-settings:v1");

  if (!app || !store || !path || !fsSync || !dialog || typeof spawnSync !== "function") {
    throw new Error("createLibraryStorageTools requires app/store/path/fsSync/dialog/spawnSync dependencies");
  }

  const driveTypeCache = new Map();
  let sevenZipExe = null;

  function normalizeFolderPathList(values) {
    const out = [];
    const seen = new Set();
    for (const raw of Array.isArray(values) ? values : []) {
      const p = String(raw || "").trim();
      if (!p) continue;
      const normalized = path.normalize(p);
      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(normalized);
    }
    return out;
  }

  function getDefaultLibraryPathSettings() {
    const base = path.join(app.getPath("userData"), "library-storage");
    return {
      scanFolders: [],
      gameFolders: [path.join(base, "games")],
      emulatorFolders: [path.join(base, "emulators")]
    };
  }

  function getLibraryPathSettings() {
    const defaults = getDefaultLibraryPathSettings();
    const raw = store.get(libraryPathSettingsKey, {});
    return {
      scanFolders: normalizeFolderPathList(raw?.scanFolders || defaults.scanFolders),
      gameFolders: normalizeFolderPathList(raw?.gameFolders || defaults.gameFolders),
      emulatorFolders: normalizeFolderPathList(raw?.emulatorFolders || defaults.emulatorFolders)
    };
  }

  function setLibraryPathSettings(nextValue) {
    const settings = {
      scanFolders: normalizeFolderPathList(nextValue?.scanFolders),
      gameFolders: normalizeFolderPathList(nextValue?.gameFolders),
      emulatorFolders: normalizeFolderPathList(nextValue?.emulatorFolders)
    };
    store.set(libraryPathSettingsKey, settings);
    return settings;
  }

  function normalizeManagedFolderKind(rawKind) {
    const value = String(rawKind || "").trim();
    if (value === "gameFolders" || value === "emulatorFolders") return value;
    return "";
  }

  function getPathRootInfo(inputPath) {
    const raw = String(inputPath || "").trim();
    const rootPath = raw ? String(path.parse(raw).root || "").trim() : "";
    const lowerRoot = rootPath.toLowerCase();
    const isDriveRoot = /^[a-z]:\\?$/i.test(rootPath);
    const isNetworkRoot = /^\\\\[^\\]+\\[^\\]+\\?$/i.test(rootPath);

    let rootExists = false;
    if (rootPath) {
      try {
        rootExists = fsSync.existsSync(rootPath);
      } catch (_e) {
        rootExists = false;
      }
    }

    return {
      path: raw,
      rootPath,
      rootExists,
      isDriveRoot,
      isNetworkRoot,
      rootKey: lowerRoot
    };
  }

  function getWindowsDriveTypeCode(rootPath) {
    const root = String(rootPath || "").trim();
    if (!/^[a-z]:\\?$/i.test(root)) return null;

    const drive = root.slice(0, 2).toUpperCase();
    const cacheKey = drive;
    if (driveTypeCache.has(cacheKey)) return driveTypeCache.get(cacheKey);

    try {
      const escaped = drive.replace(/'/g, "''");
      const ps = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          `(Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='${escaped}'" | Select-Object -ExpandProperty DriveType)`
        ],
        { encoding: "utf8", timeout: 3000 }
      );

      if (!ps.error && ps.status === 0) {
        const value = Number.parseInt(String(ps.stdout || "").trim(), 10);
        if (Number.isFinite(value)) {
          driveTypeCache.set(cacheKey, value);
          return value;
        }
      }
    } catch (_e) {}

    driveTypeCache.set(cacheKey, null);
    return null;
  }

  function classifyPathMedia(inputPath) {
    const rootInfo = getPathRootInfo(inputPath);
    let mediaCategory = "unknown";
    let mediaLabel = "Unknown";

    if (!rootInfo.rootPath) {
      mediaCategory = "unknown";
      mediaLabel = "Unknown";
    } else if (rootInfo.isNetworkRoot) {
      mediaCategory = "network";
      mediaLabel = "Network Share";
    } else if (rootInfo.isDriveRoot && process.platform === "win32") {
      const driveType = getWindowsDriveTypeCode(rootInfo.rootPath);
      if (driveType === 2) {
        mediaCategory = "removable";
        mediaLabel = "USB / Removable";
      } else if (driveType === 3) {
        mediaCategory = "fixed";
        mediaLabel = "Fixed Disk";
      } else if (driveType === 4) {
        mediaCategory = "network";
        mediaLabel = "Mapped Network Drive";
      } else if (driveType === 5) {
        mediaCategory = "cdrom";
        mediaLabel = "CD / DVD";
      } else if (driveType === 6) {
        mediaCategory = "ramdisk";
        mediaLabel = "RAM Disk";
      } else {
        mediaCategory = "drive";
        mediaLabel = "Drive";
      }
    } else if (rootInfo.rootExists) {
      mediaCategory = "fixed";
      mediaLabel = "Filesystem";
    }

    return {
      path: String(inputPath || "").trim(),
      rootPath: rootInfo.rootPath,
      rootExists: !!rootInfo.rootExists,
      mediaCategory,
      mediaLabel
    };
  }

  function ensureUniqueDestinationPath(destPath) {
    const initial = String(destPath || "").trim();
    if (!initial) return initial;
    if (!fsSync.existsSync(initial)) return initial;

    const dir = path.dirname(initial);
    const ext = path.extname(initial);
    const base = path.basename(initial, ext);

    let index = 1;
    while (index < 5000) {
      const candidate = path.join(dir, `${base} (${index})${ext}`);
      if (!fsSync.existsSync(candidate)) return candidate;
      index += 1;
    }
    return path.join(dir, `${base} (${Date.now()})${ext}`);
  }

  function movePathSafe(srcPath, destPath) {
    try {
      fsSync.renameSync(srcPath, destPath);
      return;
    } catch (error) {
      if (!error || error.code !== "EXDEV") throw error;
    }

    const srcStat = fsSync.lstatSync(srcPath);
    if (srcStat.isDirectory()) {
      fsSync.cpSync(srcPath, destPath, { recursive: true, force: false, errorOnExist: true });
      fsSync.rmSync(srcPath, { recursive: true, force: true });
      return;
    }

    fsSync.copyFileSync(srcPath, destPath, fsSync.constants.COPYFILE_EXCL);
    fsSync.unlinkSync(srcPath);
  }

  function normalizePathForCompare(inputPath) {
    const normalized = path.normalize(String(inputPath || "").trim());
    if (!normalized) return "";
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  }

  function pathsEqual(a, b) {
    const left = normalizePathForCompare(a);
    const right = normalizePathForCompare(b);
    return !!left && !!right && left === right;
  }

  function isPathInside(candidatePath, parentPath) {
    const candidate = normalizePathForCompare(candidatePath);
    const parent = normalizePathForCompare(parentPath);
    if (!candidate || !parent) return false;
    if (candidate === parent) return false;
    const parentWithSep = parent.endsWith(path.sep) ? parent : `${parent}${path.sep}`;
    return candidate.startsWith(parentWithSep);
  }

  function isExistingDirectory(inputPath) {
    try {
      return fsSync.existsSync(inputPath) && fsSync.lstatSync(inputPath).isDirectory();
    } catch (_e) {
      return false;
    }
  }

  function removePathSafe(targetPath) {
    try {
      if (!fsSync.existsSync(targetPath)) return;
      const stat = fsSync.lstatSync(targetPath);
      if (stat.isDirectory()) {
        fsSync.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fsSync.unlinkSync(targetPath);
      }
    } catch (_e) {}
  }

  function tryRemoveDirIfEmpty(dirPath) {
    try {
      if (!isExistingDirectory(dirPath)) return false;
      const entries = fsSync.readdirSync(dirPath);
      if (entries.length > 0) return false;
      fsSync.rmdirSync(dirPath);
      return true;
    } catch (_e) {
      return false;
    }
  }

  function normalizeConflictPolicy(rawPolicy) {
    const value = String(rawPolicy || "").trim().toLowerCase();
    if (value === "keep_both" || value === "skip_existing" || value === "replace_existing" || value === "cancel") {
      return value;
    }
    return "";
  }

  async function promptConflictPolicy(conflictPath, operationLabel) {
    const mainWindow = getMainWindow();
    if (!mainWindow) return "keep_both";
    const result = await dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Keep Both (Recommended)", "Skip Existing", "Replace Existing", "Cancel"],
      defaultId: 0,
      cancelId: 3,
      noLink: true,
      title: operationLabel || "Conflict detected",
      message: "Existing files/folders were found in the destination.",
      detail: `Conflict item:\n${String(conflictPath || "")}\n\nHow should integration handle conflicts for the remaining items?`
    });
    if (result.response === 0) return "keep_both";
    if (result.response === 1) return "skip_existing";
    if (result.response === 2) return "replace_existing";
    return "cancel";
  }

  async function integratePathIntoDirectory(sourcePath, targetDir, ctx) {
    const src = String(sourcePath || "").trim();
    const destRoot = String(targetDir || "").trim();
    if (!src || !destRoot) return false;
    if (!fsSync.existsSync(src)) return true;

    fsSync.mkdirSync(destRoot, { recursive: true });
    const destinationPath = path.join(destRoot, path.basename(src));
    const destinationExists = fsSync.existsSync(destinationPath);

    if (!destinationExists) {
      movePathSafe(src, destinationPath);
      ctx.stats.moved += 1;
      return true;
    }

    ctx.stats.conflicts += 1;
    if (!ctx.policy) {
      ctx.policy = await promptConflictPolicy(destinationPath, ctx.operationLabel);
    }
    const policy = normalizeConflictPolicy(ctx.policy) || "cancel";
    if (policy === "cancel") {
      ctx.cancelled = true;
      return false;
    }

    const sourceIsDir = isExistingDirectory(src);
    const destinationIsDir = isExistingDirectory(destinationPath);

    if (sourceIsDir && destinationIsDir) {
      if (policy === "replace_existing") {
        removePathSafe(destinationPath);
        movePathSafe(src, destinationPath);
        ctx.stats.replaced += 1;
        return true;
      }
      if (policy === "skip_existing") {
        if (ctx.discardSkippedSources) removePathSafe(src);
        ctx.stats.skipped += 1;
        return true;
      }
      const merged = await integrateDirectoryContents(src, destinationPath, ctx);
      if (!merged) return false;
      tryRemoveDirIfEmpty(src);
      return true;
    }

    if (policy === "replace_existing") {
      removePathSafe(destinationPath);
      movePathSafe(src, destinationPath);
      ctx.stats.replaced += 1;
      return true;
    }

    if (policy === "skip_existing") {
      if (ctx.discardSkippedSources) removePathSafe(src);
      ctx.stats.skipped += 1;
      return true;
    }

    const uniqueDest = ensureUniqueDestinationPath(destinationPath);
    movePathSafe(src, uniqueDest);
    ctx.stats.keptBoth += 1;
    return true;
  }

  async function integrateDirectoryContents(sourceDir, targetDir, ctx) {
    const source = String(sourceDir || "").trim();
    const target = String(targetDir || "").trim();
    if (!source || !target) return false;
    if (!isExistingDirectory(source)) return true;

    fsSync.mkdirSync(target, { recursive: true });
    const entries = fsSync.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(source, entry.name);
      const ok = await integratePathIntoDirectory(srcPath, target, ctx);
      if (!ok || ctx.cancelled) return false;
    }
    return true;
  }

  function buildDirectoryIntegrationPreview(sourceDir, targetDir, maxItems = 200000) {
    const sourceRoot = String(sourceDir || "").trim();
    const targetRoot = String(targetDir || "").trim();
    const stats = {
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
    };

    if (!isExistingDirectory(sourceRoot)) return stats;

    const stack = [sourceRoot];
    const normalizedSource = path.normalize(sourceRoot);

    while (stack.length > 0) {
      const current = stack.pop();
      let entries = [];
      try {
        entries = fsSync.readdirSync(current, { withFileTypes: true });
      } catch (_e) {
        continue;
      }

      for (const entry of entries) {
        const sourcePath = path.join(current, entry.name);
        const sourceIsDir = entry.isDirectory();
        const relativePath = path.relative(normalizedSource, sourcePath);
        const destinationPath = path.join(targetRoot, relativePath);

        stats.totalItems += 1;
        if (sourceIsDir) stats.totalDirs += 1;
        else stats.totalFiles += 1;

        const destinationExists = fsSync.existsSync(destinationPath);
        if (!destinationExists) {
          stats.newItems += 1;
        } else {
          const destinationIsDir = isExistingDirectory(destinationPath);
          stats.conflicts += 1;
          if (sourceIsDir && destinationIsDir) {
            stats.directoryConflicts += 1;
            stats.mergeCandidates += 1;
          } else if (!sourceIsDir && !destinationIsDir) {
            stats.fileConflicts += 1;
          } else {
            stats.typeConflicts += 1;
          }
        }

        if (sourceIsDir) {
          stack.push(sourcePath);
        }

        if (stats.totalItems >= maxItems) {
          stats.truncated = true;
          return stats;
        }
      }
    }

    return stats;
  }

  function getArchiveKind(p) {
    const lower = String(p || "").toLowerCase();
    if (lower.endsWith(".zip")) return "zip";
    if (lower.endsWith(".7z") || lower.endsWith(".rar")) return "7z";

    if (
      lower.endsWith(".tar") ||
      lower.endsWith(".tar.gz") ||
      lower.endsWith(".tgz") ||
      lower.endsWith(".tar.bz2") ||
      lower.endsWith(".tbz2") ||
      lower.endsWith(".tar.xz") ||
      lower.endsWith(".txz")
    ) {
      return "tar";
    }

    return "";
  }

  function findSevenZipExecutable() {
    if (sevenZipExe) return sevenZipExe;

    try {
      const probe = spawnSync("7z", ["-h"], { encoding: "utf8", shell: false });
      if (!probe.error && probe.status === 0) {
        sevenZipExe = "7z";
        return sevenZipExe;
      }
    } catch (_e) {}

    if (process.platform === "win32") {
      const programFiles = String(process.env["ProgramFiles"] || "C:\\Program Files").trim();
      const programFilesX86 = String(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)").trim();
      const candidates = [
        path.join(programFiles, "7-Zip", "7z.exe"),
        path.join(programFilesX86, "7-Zip", "7z.exe")
      ];

      for (const c of candidates) {
        try {
          if (fsSync.existsSync(c)) {
            sevenZipExe = c;
            return sevenZipExe;
          }
        } catch (_e) {}
      }
    }

    return null;
  }

  async function extractZipToDir(zipPath, destDir) {
    fsSync.mkdirSync(destDir, { recursive: true });

    if (process.platform === "win32") {
      const ps = spawnSync(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`
        ],
        { encoding: "utf8" }
      );

      if (ps.error) throw ps.error;
      if (ps.status !== 0) {
        throw new Error((ps.stderr || ps.stdout || "").trim() || `Expand-Archive failed (${ps.status})`);
      }
      return;
    }

    const unzip = spawnSync("unzip", ["-o", zipPath, "-d", destDir], { encoding: "utf8", shell: false });
    if (!unzip.error && unzip.status === 0) return;

    const tarFallback = spawnSync("tar", ["-xf", zipPath, "-C", destDir], { encoding: "utf8", shell: false });
    if (tarFallback.error) throw tarFallback.error;
    if (tarFallback.status !== 0) {
      const details = [
        (unzip.stderr || unzip.stdout || "").trim(),
        (tarFallback.stderr || tarFallback.stdout || "").trim()
      ].filter(Boolean).join(" | ");
      throw new Error(details || "ZIP extraction failed");
    }
  }

  function extractTarToDir(archivePath, destDir) {
    fsSync.mkdirSync(destDir, { recursive: true });
    const res = spawnSync("tar", ["-xf", archivePath, "-C", destDir], { encoding: "utf8", shell: false });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      throw new Error((res.stderr || res.stdout || "").trim() || `tar extraction failed (${res.status})`);
    }
  }

  function extractSevenZipToDir(archivePath, destDir) {
    const sevenZip = findSevenZipExecutable();
    if (!sevenZip) {
      throw new Error("7-Zip not found. Install 7-Zip (7z.exe) to import .7z/.rar archives.");
    }

    fsSync.mkdirSync(destDir, { recursive: true });
    const res = spawnSync(sevenZip, ["x", "-y", `-o${destDir}`, archivePath], { encoding: "utf8", shell: false });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      throw new Error((res.stderr || res.stdout || "").trim() || `7z extraction failed (${res.status})`);
    }
  }

  async function extractArchiveToDir(archivePath, destDir) {
    const kind = getArchiveKind(archivePath);
    if (!kind) throw new Error("Unsupported archive type");

    if (kind === "zip") {
      await extractZipToDir(archivePath, destDir);
      return;
    }

    if (kind === "tar") {
      extractTarToDir(archivePath, destDir);
      return;
    }

    if (kind === "7z") {
      extractSevenZipToDir(archivePath, destDir);
      return;
    }

    throw new Error("Unsupported archive type");
  }

  return {
    normalizeFolderPathList,
    getDefaultLibraryPathSettings,
    getLibraryPathSettings,
    setLibraryPathSettings,
    normalizeManagedFolderKind,
    getPathRootInfo,
    getWindowsDriveTypeCode,
    classifyPathMedia,
    ensureUniqueDestinationPath,
    movePathSafe,
    normalizePathForCompare,
    pathsEqual,
    isPathInside,
    isExistingDirectory,
    removePathSafe,
    tryRemoveDirIfEmpty,
    normalizeConflictPolicy,
    promptConflictPolicy,
    integratePathIntoDirectory,
    integrateDirectoryContents,
    buildDirectoryIntegrationPreview,
    getArchiveKind,
    findSevenZipExecutable,
    extractZipToDir,
    extractTarToDir,
    extractSevenZipToDir,
    extractArchiveToDir
  };
}

module.exports = {
  createLibraryStorageTools
};
