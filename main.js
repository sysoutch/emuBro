const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage } = require("electron");
const path = require("path");
const log = require("electron-log");
const Store = require("electron-store");
const Database = require("better-sqlite3");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const { execFile, spawnSync } = require("child_process");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");
const { createSplashWindowManager } = require("./main/splash-window");

// Import handlers
const ps1Handler = require("./ps1-handler");

// Initialize the store for app settings
const store = new Store();
const LIBRARY_PATH_SETTINGS_KEY = "library:path-settings:v1";
const _driveTypeCache = new Map();

let mainWindow;
let games = [];
let emulators = [];
const screen = require("electron").screen;

let _db = null;
let appBootstrapStarted = false;
let mainWindowRendererReady = false;
let requestRevealMainWindow = null;
const { createSplashWindow, closeSplashWindow } = createSplashWindowManager();

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
  const raw = store.get(LIBRARY_PATH_SETTINGS_KEY, {});
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
  store.set(LIBRARY_PATH_SETTINGS_KEY, settings);
  return settings;
}

function normalizeManagedFolderKind(rawKind) {
  const value = String(rawKind || "").trim();
  if (value === "gameFolders" || value === "emulatorFolders") return value;
  return "";
}

function getDb() {
  if (_db) return _db;

  const dbPath = path.join(app.getPath("userData"), "library.db");
  fsSync.mkdirSync(path.dirname(dbPath), { recursive: true });
  _db = new Database(dbPath);

  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");

  _db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform TEXT,
      platformShortName TEXT NOT NULL,
      emulatorOverridePath TEXT,
      filePath TEXT NOT NULL UNIQUE,
      code TEXT,
      image TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS emulators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      platform TEXT,
      platformShortName TEXT NOT NULL,
      filePath TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platformShortName);
    CREATE INDEX IF NOT EXISTS idx_emus_platform ON emulators(platformShortName);
  `);

  try {
    const gameColumns = _db.prepare("PRAGMA table_info(games)").all();
    const hasOverrideColumn = gameColumns.some((col) => String(col?.name || "").trim().toLowerCase() === "emulatoroverridepath");
    if (!hasOverrideColumn) {
      _db.exec("ALTER TABLE games ADD COLUMN emulatorOverridePath TEXT");
    }
  } catch (error) {
    log.error("Failed to migrate games table:", error);
  }

  return _db;
}

function dbLoadGames() {
  const db = getDb();
  return db.prepare("SELECT * FROM games ORDER BY name COLLATE NOCASE").all();
}

function dbLoadEmulators() {
  const db = getDb();
  return db.prepare("SELECT * FROM emulators ORDER BY name COLLATE NOCASE").all();
}

function dbGetGameById(id) {
  const db = getDb();
  return db.prepare("SELECT * FROM games WHERE id = ?").get(id);
}

function dbDeleteGameById(id) {
  const db = getDb();
  const result = db.prepare("DELETE FROM games WHERE id = ?").run(id);
  return result.changes > 0;
}

function dbUpdateGameFilePath(gameId, newFilePath) {
  const db = getDb();
  const cleanPath = String(newFilePath || "").trim();
  if (!cleanPath) return null;

  const result = db.prepare(`
    UPDATE games
    SET filePath = ?, updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(cleanPath, gameId);

  if (!result.changes) return null;
  return dbGetGameById(gameId);
}

function dbUpdateGameMetadata(gameId, patch = {}) {
  const db = getDb();
  const targetId = Number(gameId);
  if (!targetId) return null;

  const sets = [];
  const params = { id: targetId };

  if (Object.prototype.hasOwnProperty.call(patch, "platformShortName")) {
    const normalized = normalizePlatform(patch.platformShortName);
    if (!normalized) return null;
    sets.push("platformShortName = @platformShortName");
    params.platformShortName = normalized;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "platform")) {
    const value = String(patch.platform || "").trim();
    sets.push("platform = @platform");
    params.platform = value || null;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "emulatorOverridePath")) {
    const value = String(patch.emulatorOverridePath || "").trim();
    sets.push("emulatorOverridePath = @emulatorOverridePath");
    params.emulatorOverridePath = value || null;
  }

  if (sets.length === 0) return dbGetGameById(targetId);

  const sql = `
    UPDATE games
    SET ${sets.join(", ")},
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = @id
  `;
  const result = db.prepare(sql).run(params);
  if (!result.changes) return null;
  return dbGetGameById(targetId);
}

function dbUpsertGame(game) {
  const db = getDb();
  const filePath = String(game.filePath || "").trim();
  const existed = !!db.prepare("SELECT 1 FROM games WHERE filePath = ?").get(filePath);
  const stmt = db.prepare(`
    INSERT INTO games (name, platform, platformShortName, filePath, code, image, updatedAt)
    VALUES (@name, @platform, @platformShortName, @filePath, @code, @image, CURRENT_TIMESTAMP)
    ON CONFLICT(filePath) DO UPDATE SET
      name=excluded.name,
      platform=excluded.platform,
      platformShortName=excluded.platformShortName,
      code=COALESCE(excluded.code, games.code),
      image=COALESCE(excluded.image, games.image),
      updatedAt=CURRENT_TIMESTAMP
  `);

  stmt.run({
    name: String(game.name || "").trim() || path.basename(game.filePath || ""),
    platform: game.platform || null,
    platformShortName: String(game.platformShortName || "").trim().toLowerCase(),
    filePath,
    code: game.code ? String(game.code).trim() : null,
    image: game.image ? String(game.image).trim() : null
  });

  const row = db
    .prepare("SELECT * FROM games WHERE filePath = ?")
    .get(filePath);

  return { row, existed };
}

function dbUpsertEmulator(emu) {
  const db = getDb();
  const filePath = String(emu.filePath || "").trim();
  const existed = !!db.prepare("SELECT 1 FROM emulators WHERE filePath = ?").get(filePath);
  const stmt = db.prepare(`
    INSERT INTO emulators (name, platform, platformShortName, filePath, updatedAt)
    VALUES (@name, @platform, @platformShortName, @filePath, CURRENT_TIMESTAMP)
    ON CONFLICT(filePath) DO UPDATE SET
      name=excluded.name,
      platform=excluded.platform,
      platformShortName=excluded.platformShortName,
      updatedAt=CURRENT_TIMESTAMP
  `);

  stmt.run({
    name: String(emu.name || "").trim() || path.basename(emu.filePath || ""),
    platform: emu.platform || null,
    platformShortName: String(emu.platformShortName || "").trim().toLowerCase(),
    filePath
  });

  const row = getDb()
    .prepare("SELECT * FROM emulators WHERE filePath = ?")
    .get(filePath);

  return { row, existed };
}

function refreshLibraryFromDb() {
  games = dbLoadGames();
  emulators = dbLoadEmulators();
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
  if (_driveTypeCache.has(cacheKey)) return _driveTypeCache.get(cacheKey);

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
        _driveTypeCache.set(cacheKey, value);
        return value;
      }
    }
  } catch (_e) {}

  _driveTypeCache.set(cacheKey, null);
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

  // Support common tar formats without guessing for bare ".gz"/".xz" etc.
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

let _sevenZipExe = null;
function findSevenZipExecutable() {
  if (_sevenZipExe) return _sevenZipExe;

  // Try PATH first.
  try {
    const probe = spawnSync("7z", ["-h"], { encoding: "utf8", shell: false });
    if (!probe.error && probe.status === 0) {
      _sevenZipExe = "7z";
      return _sevenZipExe;
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
          _sevenZipExe = c;
          return _sevenZipExe;
        }
      } catch (_e) {}
    }
  }

  return null;
}

async function extractZipToDir(zipPath, destDir) {
  fsSync.mkdirSync(destDir, { recursive: true });

  if (process.platform === "win32") {
    // Use PowerShell Expand-Archive (available on Windows).
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

  // Linux/macOS fallback: try unzip first, then tar (bsdtar often supports zip).
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

  // bsdtar (Windows) supports -C for output dir and auto-detects compression for .tar.gz, .tgz, etc.
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

function sanitizeFilename(name) {
  return String(name || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'emuBro Shortcut';
}

function inferGameCode(game) {
  // Prefer explicit fields if they ever exist.
  const direct = (game && (game.code || game.productCode || game.serial || game.gameCode));
  if (direct) return String(direct).trim();

  const hay = `${game?.name || ''} ${path.basename(game?.filePath || '')}`;

  // Common disc serial patterns: SCES-12345, SLUS_123.45, etc. Keep it permissive.
  const m = hay.toUpperCase().match(/\b([A-Z]{4})[-_ ]?(\d{3})[.\-_ ]?(\d{2})\b|\b([A-Z]{4})[-_ ]?(\d{5})\b/);
  if (!m) return '';

  if (m[1] && m[2] && m[3]) return `${m[1]}-${m[2]}${m[3]}`;
  if (m[4] && m[5]) return `${m[4]}-${m[5]}`;

  return '';
}

function discoverCoverImageRelative(platformShortName, code, name) {
  const psn = normalizePlatform(platformShortName);
  if (!psn) return "";

  const coversDir = path.join(__dirname, "emubro-resources", "platforms", psn, "covers");
  if (!fsSync.existsSync(coversDir)) return "";

  const exts = [".jpg", ".jpeg", ".png", ".webp"];
  const candidates = [];

  const addBase = (base) => {
    const b = String(base || "").trim();
    if (!b) return;
    for (const ext of exts) candidates.push(b + ext);
  };

  if (code) {
    const c = String(code).trim();
    addBase(c);
    addBase(c.toLowerCase());
    addBase(c.toUpperCase());
    addBase(c.replace(/[_\s]/g, "-"));
    addBase(c.replace(/[-_.\s]/g, ""));
  }

  if (name) {
    const n = String(name).trim();
    const slug = n
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    addBase(slug);
    addBase(n);
  }

  for (const file of candidates) {
    const abs = path.join(coversDir, file);
    if (fsSync.existsSync(abs)) {
      return path.posix.join("emubro-resources", "platforms", psn, "covers", file);
    }
  }

  return "";
}

function normalizePlatform(s) {
  return String(s || '').trim().toLowerCase();
}

function normalizeName(s) {
  return String(s || '').trim().toLowerCase();
}

function findGameByPlatformAndCodeOrName(payload) {
  const platform = normalizePlatform(payload?.platform);
  const code = String(payload?.code || '').trim();
  const name = String(payload?.name || '').trim();

  const candidates = games.filter((g) => {
    const psn = normalizePlatform(g?.platformShortName);
    const pl = normalizePlatform(g?.platform);
    const pn = normalizePlatform(g?.platformName);
    return platform && (psn === platform || pl === platform || pn === platform);
  });

  if (code) {
    const codeNorm = code.toUpperCase().replace(/[_\s]/g, '-');

    // 1) Direct code fields (if present)
    const byField = candidates.find((g) => {
      const gCode = inferGameCode(g);
      if (!gCode) return false;
      const gNorm = gCode.toUpperCase().replace(/[_\s]/g, '-');
      return gNorm === codeNorm;
    });
    if (byField) return byField;

    // 2) Code in filename or title
    const byText = candidates.find((g) => {
      const hay = `${g?.name || ''} ${path.basename(g?.filePath || '')}`.toUpperCase();
      return hay.includes(codeNorm);
    });
    if (byText) return byText;
  }

  if (name) {
    const nameNorm = normalizeName(name);

    // 1) Exact title match
    const exact = candidates.find((g) => normalizeName(g?.name) === nameNorm);
    if (exact) return exact;

    // 2) Fuzzy contains match (avoid matching empty)
    const fuzzy = candidates.find((g) => {
      const gName = normalizeName(g?.name);
      return gName && (gName.includes(nameNorm) || nameNorm.includes(gName));
    });
    if (fuzzy) return fuzzy;
  }

  return null;
}

function resolvePlatformDefaultCoverPath(platformShortName) {
  const psn = normalizePlatform(platformShortName);
  return path.join(__dirname, 'emubro-resources', 'platforms', psn, 'covers', 'default.jpg');
}

function resolveGameCoverPath(game) {
  const img = String(game?.image || '').trim();
  if (img) {
    // If it's already an absolute path, use it. Otherwise treat it as app-relative.
    const p = path.isAbsolute(img) ? img : path.join(__dirname, img);
    if (fsSync.existsSync(p)) return p;
  }

  const fallback = resolvePlatformDefaultCoverPath(game?.platformShortName);
  if (fsSync.existsSync(fallback)) return fallback;

  // Final fallback: app icon
  const appIcon = path.join(__dirname, 'icon.png');
  if (fsSync.existsSync(appIcon)) return appIcon;

  return path.join(__dirname, 'logo.png');
}

function readPngDimensions(pngBuffer) {
  // PNG signature + IHDR (width/height at bytes 16..23)
  if (!Buffer.isBuffer(pngBuffer) || pngBuffer.length < 24) return { width: 256, height: 256 };
  const sig = pngBuffer.subarray(0, 8);
  const expected = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!sig.equals(expected)) return { width: 256, height: 256 };
  const width = pngBuffer.readUInt32BE(16);
  const height = pngBuffer.readUInt32BE(20);
  return { width, height };
}

function writeIcoFromPng(pngBuffer, icoPath) {
  // ICO can embed PNG bytes directly (Vista+). Create a single-image icon.
  const { width, height } = readPngDimensions(pngBuffer);
  const w = width >= 256 ? 0 : width;
  const h = height >= 256 ? 0 : height;

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(w, 0);
  entry.writeUInt8(h, 1);
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuffer.length, 8); // bytes in resource
  entry.writeUInt32LE(6 + 16, 12); // image offset

  const out = Buffer.concat([header, entry, pngBuffer]);
  fsSync.writeFileSync(icoPath, out);
}

function buildDeepLinkForGame(game) {
  const platform = normalizePlatform(game?.platformShortName) || normalizePlatform(game?.platform) || 'unknown';
  const code = inferGameCode(game);
  const name = String(game?.name || '').trim();

  const params = new URLSearchParams();
  params.set('platform', platform);
  if (code) params.set('code', code);
  if (name) params.set('name', name);

  return `emubro://launch?${params.toString()}`;
}

function getShortcutTargetAndArgs(url) {
  const quoteWinArg = (s) => {
    const v = String(s ?? "");
    // Basic Windows quoting; good enough for paths/URLs with spaces and &/?.
    return `"${v.replace(/"/g, '\\"')}"`;
  };

  // In dev: need to pass app entrypoint path as first arg to electron.exe.
  if (process.defaultApp) {
    const appPath = process.argv.length >= 2 ? path.resolve(process.argv[1]) : '';
    const args = appPath ? `${quoteWinArg(appPath)} ${quoteWinArg(url)}` : `${quoteWinArg(url)}`;
    return { target: process.execPath, args };
  }
  return { target: process.execPath, args: `${quoteWinArg(url)}` };
}

function findFileByNameInTree(rootDir, targetFileName, options = {}) {
  const root = String(rootDir || "").trim();
  const target = String(targetFileName || "").trim().toLowerCase();
  if (!root || !target) return "";

  const maxDepth = Number.isFinite(options.maxDepth) ? Math.max(0, Math.floor(options.maxDepth)) : 6;
  const maxVisitedDirs = Number.isFinite(options.maxVisitedDirs) ? Math.max(100, Math.floor(options.maxVisitedDirs)) : 5000;
  const queue = [{ dir: root, depth: 0 }];
  let visitedDirs = 0;

  while (queue.length > 0) {
    const next = queue.shift();
    if (!next) break;
    const { dir, depth } = next;
    visitedDirs += 1;
    if (visitedDirs > maxVisitedDirs) break;

    let entries = [];
    try {
      entries = fsSync.readdirSync(dir, { withFileTypes: true });
    } catch (_e) {
      continue;
    }

    for (const entry of entries) {
      const entryName = String(entry?.name || "");
      if (!entryName) continue;
      const fullPath = path.join(dir, entryName);

      if (entry.isFile()) {
        if (entryName.toLowerCase() === target) return fullPath;
        continue;
      }

      if (!entry.isDirectory()) continue;
      if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
      if (depth >= maxDepth) continue;

      queue.push({ dir: fullPath, depth: depth + 1 });
    }
  }

  return "";
}

function tryRelinkGameInParent(game) {
  const gameId = Number(game?.id);
  const originalPath = String(game?.filePath || "").trim();
  const parentPath = originalPath ? path.dirname(originalPath) : "";
  const fileName = originalPath ? path.basename(originalPath) : "";

  if (!gameId || !originalPath || !parentPath || !fileName) {
    return { found: false, parentExists: false, parentPath, missingPath: originalPath };
  }

  let parentExists = false;
  try {
    parentExists = fsSync.existsSync(parentPath) && fsSync.statSync(parentPath).isDirectory();
  } catch (_e) {
    parentExists = false;
  }

  if (!parentExists) {
    return { found: false, parentExists: false, parentPath, missingPath: originalPath };
  }

  const resolvedPath = findFileByNameInTree(parentPath, fileName, { maxDepth: 2, maxVisitedDirs: 1500 });
  if (!resolvedPath) {
    return { found: false, parentExists: true, parentPath, missingPath: originalPath };
  }

  try {
    const updated = dbUpdateGameFilePath(gameId, resolvedPath);
    if (!updated) {
      return { found: false, parentExists: true, parentPath, missingPath: originalPath };
    }
    refreshLibraryFromDb();
    return {
      found: true,
      parentExists: true,
      parentPath,
      missingPath: originalPath,
      newPath: resolvedPath,
      game: updated
    };
  } catch (error) {
    log.error("Failed to relink missing game in parent folder:", error);
    return { found: false, parentExists: true, parentPath, missingPath: originalPath, error: error.message };
  }
}

function launchGameObject(game) {
  const platformShortName = String(game?.platformShortName || "").trim().toLowerCase();
  let gameRow = game;
  let gamePath = String(game?.filePath || "").trim();

  if (!gamePath || !fsSync.existsSync(gamePath)) {
    const mediaInfo = classifyPathMedia(gamePath);
    if (mediaInfo.rootPath && !mediaInfo.rootExists) {
      log.warn(`Game root path is unavailable for "${game?.name}": ${mediaInfo.rootPath}`);
      return {
        success: false,
        code: "GAME_FILE_MISSING",
        message: "Game file not found",
        gameId: game?.id ?? null,
        gameName: game?.name || "Unknown Game",
        missingPath: gamePath || "",
        parentPath: gamePath ? path.dirname(gamePath) : "",
        parentExists: false,
        rootPath: mediaInfo.rootPath,
        rootExists: false,
        sourceMedia: mediaInfo.mediaCategory
      };
    }

    const relink = tryRelinkGameInParent(gameRow);
    if (relink.found && relink.newPath && fsSync.existsSync(relink.newPath)) {
      gamePath = relink.newPath;
      gameRow = relink.game || gameRow;
      log.info(`Auto-relocated missing game "${gameRow?.name || game?.name}" to ${gamePath}`);
    } else {
      log.error(`Game file not found at path: ${gamePath}`);
      return {
        success: false,
        code: "GAME_FILE_MISSING",
        message: "Game file not found",
        gameId: game?.id ?? null,
        gameName: game?.name || "Unknown Game",
        missingPath: gamePath || "",
        parentPath: relink?.parentPath || (gamePath ? path.dirname(gamePath) : ""),
        parentExists: !!relink?.parentExists,
        rootPath: mediaInfo.rootPath,
        rootExists: mediaInfo.rootExists,
        sourceMedia: mediaInfo.mediaCategory
      };
    }
  }

  const isWindowsExeGame = process.platform === "win32" && /\.exe$/i.test(gamePath);
  let launchTarget = "";
  let launchArgs = [];
  let launchCwd = "";
  let launchMode = "";

  if (isWindowsExeGame) {
    const gameDir = path.dirname(gamePath);
    const cmdPath = String(process.env.ComSpec || "cmd.exe").trim() || "cmd.exe";
    launchTarget = cmdPath;
    launchArgs = ["/d", "/s", "/c", "start", "", "/d", gameDir, "/wait", gamePath];
    launchCwd = gameDir;
    launchMode = "cmd";
  } else {
    const overridePath = String(gameRow?.emulatorOverridePath || game?.emulatorOverridePath || "").trim();
    let emuPath = "";

    if (overridePath && fsSync.existsSync(overridePath)) {
      emuPath = overridePath;
    } else {
      if (overridePath) {
        log.warn(`Game "${gameRow?.name || game?.name}" has an emulator override path that is missing: ${overridePath}`);
      }
      emuPath = emulators.find((emu) => String(emu.platformShortName || "").trim().toLowerCase() === platformShortName)?.filePath;
    }

    if (!emuPath) {
      log.error(`No emulator found for platform ${game.platformShortName}`);
      return { success: false, message: "Emulator not found for this game" };
    }
    if (!fsSync.existsSync(emuPath)) {
      log.error(`Emulator executable not found at path: ${emuPath}`);
      return { success: false, message: "Emulator executable not found" };
    }

    launchTarget = emuPath;
    launchArgs = [gamePath];
    launchCwd = path.dirname(emuPath);
    launchMode = overridePath && overridePath === emuPath ? "emulator-override" : "emulator";
  }

  const { spawn } = require("child_process");
  try {
    const child = spawn(launchTarget, launchArgs, {
      stdio: "ignore",
      cwd: launchCwd || undefined
    });
    child.on("error", (e) => log.error(`Error launching game ${gameRow?.name || game?.name}:`, e));
    child.on("exit", () => {
      if (mainWindow) {
        log.info("restore main window from minimized state after game stopped");
        mainWindow.restore();
      }
    });

    if (mainWindow) {
      log.info("Minimizing main window after game launch");
      mainWindow.minimize();
    }

    return {
      success: true,
      message: "Game launched successfully",
      resolvedPath: gamePath !== String(game?.filePath || "").trim() ? gamePath : null,
      launchMode
    };
  } catch (e) {
    log.error(`Error launching game ${gameRow?.name || game?.name}:`, e);
    if (mainWindow) mainWindow.restore();
    return { success: false, message: "Failed to execute launch command" };
  }
}

// Create the main window
function createWindow() {
  const isWin = process.platform === "win32";
  let didFinishLoad = false;
  let isReadyToShow = false;
  let isRevealed = false;
  mainWindowRendererReady = false;
  requestRevealMainWindow = null;

  mainWindow = new BrowserWindow({
    show: false,
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, "icon.png"),
    backgroundColor: "#0b1220",
    // Custom chrome on Windows so we can style the top bar + show glow inside the app.
      ...(isWin
        ? {
            frame: false,
            thickFrame: true,
            autoHideMenuBar: true,
            // Windows 11: request rounded corners for frameless windows.
            roundedCorners: true,
            // Ask DWM for a blurred/acrylic backdrop behind the frameless window chrome.
            backgroundMaterial: "acrylic"
          }
        : {}),
    webPreferences: {
      // Secure defaults: no Node.js in the page, all IPC goes through preload allowlist.
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
      devTools: true
    }
  });
  const primaryDisplay = screen.getPrimaryDisplay();

  mainWindow.on("move", () => {
    const [x, y] = mainWindow.getPosition();
    const [screenGoalX, screenGoalY] = [primaryDisplay.bounds.width / 2, primaryDisplay.bounds.height / 2];
    mainWindow.webContents.send("window-moved", { x, y }, { screenGoalX, screenGoalY });
  });

  const revealMainWindow = () => {
    if (isRevealed) return;
    if (!didFinishLoad || !isReadyToShow || !mainWindowRendererReady) return;
    if (!mainWindow || mainWindow.isDestroyed()) return;

    isRevealed = true;
    closeSplashWindow();
    mainWindow.show();
    mainWindow.focus();
  };
  requestRevealMainWindow = revealMainWindow;

  // Load the main HTML file
  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    isReadyToShow = true;
    revealMainWindow();
  });

  // If we received a deep link before the renderer was ready, flush it now.
  mainWindow.webContents.on("did-finish-load", () => {
    didFinishLoad = true;
    flushPendingDeepLinks();
    try {
      mainWindow.webContents.send("window:maximized-changed", mainWindow.isMaximized());
    } catch (_e) {}
    revealMainWindow();
  });

  mainWindow.webContents.on("did-fail-load", () => {
    closeSplashWindow({ force: true });
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
  });
  mainWindow.on("closed", () => {
    requestRevealMainWindow = null;
    mainWindowRendererReady = false;
  });

  // Keep renderer informed so it can adjust corner radii / chrome.
  const sendMaxState = () => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("window:maximized-changed", mainWindow.isMaximized());
      }
    } catch (_e) {}
  };
  mainWindow.on("maximize", sendMaxState);
  mainWindow.on("unmaximize", sendMaxState);
  mainWindow.on("restore", sendMaxState);

  // Open DevTools
  // mainWindow.webContents.openDevTools();

  return mainWindow;
}

// Listen for the minimize event from the renderer
ipcMain.on("minimize-window", () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Window controls for custom titlebar (frameless on Windows)
ipcMain.handle("window:minimize", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
  return true;
});

ipcMain.handle("window:toggle-maximize", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
  return true;
});

ipcMain.handle("window:close", () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  return true;
});

ipcMain.handle("window:is-maximized", () => {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  return mainWindow.isMaximized();
});

ipcMain.handle("app:renderer-ready", (event) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { success: false };
  if (event.sender !== mainWindow.webContents) return { success: false };
  mainWindowRendererReady = true;
  if (typeof requestRevealMainWindow === "function") requestRevealMainWindow();
  return { success: true };
});

// --------------------------------------------------
// Locales / Translations (renderer-safe access via preload)
// --------------------------------------------------
const LOCALE_FILENAME_RE = /^[a-z]{2,3}\.json$/i;

function normalizeLocaleFilename(filename) {
  const f = String(filename || '').trim();
  if (!LOCALE_FILENAME_RE.test(f)) {
    throw new Error(`Invalid locale filename '${filename}'. Expected e.g. en.json`);
  }
  return f.toLowerCase();
}

function getAppLocalesDir() {
  return path.join(__dirname, 'locales');
}

function getUserLocalesDir() {
  const dir = path.join(app.getPath('userData'), 'locales');
  try {
    fsSync.mkdirSync(dir, { recursive: true });
  } catch (_e) {
    // ignore; write will fail with a clear error later
  }
  return dir;
}

function parseLocaleJson(content) {
  const raw = String(content ?? '');
  const sanitized = raw.replace(/^\uFEFF/, '').replace(/^\u00EF\u00BB\u00BF/, '');
  return JSON.parse(sanitized);
}

async function readLocaleJson(filename) {
  const f = normalizeLocaleFilename(filename);
  const userPath = path.join(getUserLocalesDir(), f);
  const appPath = path.join(getAppLocalesDir(), f);

  const p = fsSync.existsSync(userPath) ? userPath : appPath;
  const content = await fs.readFile(p, 'utf8');
  return parseLocaleJson(content);
}

async function listLocaleFilePaths() {
  const map = new Map(); // filename -> fullpath

  const addFromDir = async (dir) => {
    if (!dir || !fsSync.existsSync(dir)) return;
    let entries = [];
    try {
      entries = await fs.readdir(dir);
    } catch (_e) {
      return;
    }

    for (const entry of entries) {
      if (!LOCALE_FILENAME_RE.test(entry)) continue;
      map.set(entry.toLowerCase(), path.join(dir, entry));
    }
  };

  // App locales first, user locales last so user overrides win.
  await addFromDir(getAppLocalesDir());
  await addFromDir(getUserLocalesDir());

  return Array.from(map.entries()).map(([filename, fullPath]) => ({ filename, fullPath }));
}

ipcMain.handle('get-all-translations', async () => {
  const all = {};
  const files = await listLocaleFilePaths();

  for (const f of files) {
    try {
      const content = await fs.readFile(f.fullPath, 'utf8');
      const json = parseLocaleJson(content);
      if (json && typeof json === 'object') Object.assign(all, json);
    } catch (e) {
      log.error(`Failed to load locale '${f.filename}':`, e);
    }
  }

  return all;
});

ipcMain.handle('locales:list', async () => {
  const files = await listLocaleFilePaths();
  const languages = [];

  for (const f of files) {
    try {
      const content = await fs.readFile(f.fullPath, 'utf8');
      const json = parseLocaleJson(content);
      const code = json && typeof json === 'object' ? Object.keys(json)[0] : null;
      if (!code) continue;
      languages.push({ filename: f.filename, code, data: json });
    } catch (e) {
      log.error(`Failed to read locale '${f.filename}':`, e);
    }
  }

  return languages;
});

ipcMain.handle('locales:read', async (_event, filename) => {
  return await readLocaleJson(filename);
});

ipcMain.handle('locales:exists', async (_event, filename) => {
  const f = normalizeLocaleFilename(filename);
  const userPath = path.join(getUserLocalesDir(), f);
  const appPath = path.join(getAppLocalesDir(), f);
  return fsSync.existsSync(userPath) || fsSync.existsSync(appPath);
});

ipcMain.handle('locales:write', async (_event, filename, json) => {
  const f = normalizeLocaleFilename(filename);
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid locale payload (expected object)');
  }

  const outPath = path.join(getUserLocalesDir(), f);
  const content = JSON.stringify(json, null, 2);
  await fs.writeFile(outPath, content, 'utf8');
  return { success: true };
});

// Get available drives on the system
ipcMain.handle("get-drives", async () => {
  try {
    const drives = [];
    
    // Get platform-specific drives
    if (os.platform() === "win32") {
      // For Windows, get all drives
      const driveLetters = ["C:", "D:", "E:", "F:", "G:", "H:", "I:", "J:", "K:", "L:", "M:", "N:", "O:", "P:", "Q:", "R:", "S:", "T:", "U:", "V:", "W:", "X:", "Y:", "Z:"];
      for (const drive of driveLetters) {
        try {
          if (fsSync.existsSync(drive)) {
            drives.push(drive);
          }
        } catch (error) {
          // Skip drives that can't be accessed
        }
      }
    } else {
      // For Unix-like systems, use root directory as the only drive
      drives.push("/");
    }
    
    return drives;
  } catch (error) {
    log.error("Failed to get drives:", error);
    return [];
  }
});

// Create the application menu
function createMenu() {
  const menuTemplate = [
    {
      label: "File",
      submenu: [
        { label: "Exit", click: () => app.quit() }
      ]
    },
    {
      label: "View",
      submenu: [
        { label: "Reload", click: () => mainWindow.reload() },
        { label: "Toggle DevTools", click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: "Help",
      submenu: [
        { label: "About" }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

const PROTOCOL = "emubro";
const pendingDeepLinks = [];

function flushPendingDeepLinks() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.webContents.isLoadingMainFrame()) return;

  while (pendingDeepLinks.length > 0) {
    const payload = pendingDeepLinks.shift();
    mainWindow.webContents.send("emubro:launch", payload);
  }
}

//
// --------------------------------------------------
// Register protocol
// --------------------------------------------------
// MUST run before ready on Windows dev mode
//
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL)
}

//
// --------------------------------------------------
// Single instance lock
// --------------------------------------------------
//
const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {

  app.on("second-instance", (event, commandLine) => {
    const url = commandLine.find((arg) => String(arg || "").toLowerCase().startsWith(`${PROTOCOL}://`));
    if (url) handleDeepLink(url)

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

//
// --------------------------------------------------
// macOS deep link
// --------------------------------------------------
//
app.on("open-url", (event, url) => {
  event.preventDefault()
  handleDeepLink(url)
})

app.on("before-quit", () => {
  closeSplashWindow({ force: true });
});

app.on("window-all-closed", () => {
  closeSplashWindow({ force: true });
});

function startApplicationBootstrap() {
  if (appBootstrapStarted) return;
  appBootstrapStarted = true;

  // Load persisted library before the renderer requests it.
  try {
    refreshLibraryFromDb();
  } catch (e) {
    log.error("Failed to load library database:", e);
  }

  createWindow();
  createMenu();

  // Fallback to avoid getting stuck on splash if renderer hangs.
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      closeSplashWindow({ force: true });
      mainWindow.show();
      mainWindow.focus();
    }
  }, 15000);

  try {
    // Hide menu bar by default on Windows; Alt will reveal it because autoHideMenuBar is enabled.
    if (process.platform === "win32" && mainWindow) {
      mainWindow.setMenuBarVisibility(false);
    }
  } catch (_e) {}

  // If launched directly from protocol while closed (Windows)
  const deeplink = process.argv.find((arg) => String(arg || "").toLowerCase().startsWith(`${PROTOCOL}://`));
  if (deeplink) handleDeepLink(deeplink)
  
  // Handle window close
  mainWindow.on("closed", () => {
    closeSplashWindow({ force: true });
    app.quit();
  });
}

// Initialize the application
app.whenReady().then(() => {
  const splash = createSplashWindow();
  const startSoon = () => setTimeout(() => startApplicationBootstrap(), 120);

  if (splash && !splash.isDestroyed()) {
    if (splash.isVisible()) startSoon();
    else splash.once("show", startSoon);
  } else {
    startSoon();
  }

  // Safety: never block startup if splash show event is missed.
  setTimeout(() => {
    startApplicationBootstrap();
  }, 1200);
});

function handleDeepLink(rawUrl) {
  console.log("Deep link received:", rawUrl)

  let url
  try {
    url = new URL(rawUrl)
  } catch {
    return
  }

  // emubro://launch?platform=ps2&name=Crash%20Bandicoot&code=SCES-12345
  const action = url.hostname
  const platform = url.searchParams.get("platform")
  const name = url.searchParams.get("name")
  const code = url.searchParams.get("code")

  const payload = {
    action,
    platform,
    name,
    code
  }

  console.log("Parsed:", payload)

  // If possible, launch immediately from the main process (works even if the renderer isn't ready).
  if (payload.action === 'launch') {
    const game = findGameByPlatformAndCodeOrName(payload);
    if (game) {
      const res = launchGameObject(game);
      if (!res.success) {
        dialog.showMessageBox({
          type: 'error',
          title: 'emuBro',
          message: 'Failed to launch game',
          detail: res.message || 'Unknown error'
        });
      }
    } else {
      dialog.showMessageBox({
        type: 'warning',
        title: 'emuBro',
        message: 'Game not found in library',
        detail: 'Open emuBro and rescan so the game and emulator are detected, then try again.'
      });
    }
  }

  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame()) {
    pendingDeepLinks.push(payload);
    return;
  }

  mainWindow.webContents.send("emubro:launch", payload);
}

// Handle app quit
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check if a path is a file or directory
ipcMain.handle("check-path-type", async (event, filePath) => {
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

// Process a dropped emulator executable file
ipcMain.handle("process-emulator-exe", async (event, filePath) => {
  try {
    log.info("Processing dropped emulator exe:", filePath);
    
    const platformConfigs = await getPlatformConfigs();
    const fileName = path.basename(filePath);
    
    const found = [];
    processEmulatorExe(filePath, fileName, platformConfigs, emulators, found);
    if (found.length > 0) {
      return { success: true, message: `Emulator ${fileName} added`, emulator: found[0] };
    }
    
    return {
      success: true,
      message: `Emulator ${fileName} processed successfully`
    };
  } catch (error) {
    log.error("Failed to process emulator exe:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("analyze-import-paths", async (_event, paths) => {
  try {
    const rows = [];
    const inputPaths = Array.isArray(paths) ? paths : [];
    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;
      const info = classifyPathMedia(p);
      rows.push(info);
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
    if (!mainWindow) {
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
      `Conflict impact preview:`,
      `- Keep Both: create up to ${conflicts} duplicate-name copies`,
      `- Skip Existing: skip up to ${conflicts} source items`,
      `- Replace Existing: replace up to ${conflicts} destination items`
    ];
    if (truncated) {
      detailLines.push("", "Preview truncated due to very large folder size; actual conflicts may be higher.");
    }

    const response = await dialog.showMessageBox(mainWindow, {
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
      return { success: true, message: "Source and destination are identical", settings: getLibraryPathSettings(), stats: { moved: 0, replaced: 0, keptBoth: 0, skipped: 0, conflicts: 0 } };
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

// IPC handlers
ipcMain.handle("get-games", async () => {
  try {
    refreshLibraryFromDb();
  } catch (_e) {}
  return games;
});

ipcMain.handle("get-game-details", async (event, gameId) => {
  const game = games.find(g => g.id === gameId);
  return game || null;
});

ipcMain.handle("update-game-metadata", async (_event, payload = {}) => {
  try {
    const gameId = Number(payload?.gameId);
    if (!gameId) return { success: false, message: "Missing game ID" };

    const game = dbGetGameById(gameId) || games.find((row) => Number(row.id) === gameId);
    if (!game) return { success: false, message: "Game not found" };

    const patch = {};

    if (Object.prototype.hasOwnProperty.call(payload, "emulatorOverridePath")) {
      const nextPath = String(payload?.emulatorOverridePath || "").trim();
      if (nextPath && !fsSync.existsSync(nextPath)) {
        return { success: false, message: "Selected emulator path does not exist" };
      }
      patch.emulatorOverridePath = nextPath || null;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "platformShortName")) {
      const nextPlatformShortName = normalizePlatform(payload?.platformShortName);
      if (!nextPlatformShortName) {
        return { success: false, message: "Missing platform short name" };
      }

      let nextPlatformName = "Unknown";
      if (nextPlatformShortName === "pc") {
        nextPlatformName = "PC";
      } else {
        const platformConfigs = await getPlatformConfigs();
        const config = (platformConfigs || []).find((row) => normalizePlatform(row?.shortName) === nextPlatformShortName);
        if (config) nextPlatformName = String(config?.name || nextPlatformShortName).trim() || nextPlatformShortName;
      }

      patch.platformShortName = nextPlatformShortName;
      patch.platform = nextPlatformName;
    }

    const updated = dbUpdateGameMetadata(gameId, patch);
    if (!updated) return { success: false, message: "Failed to update game metadata" };

    refreshLibraryFromDb();
    return { success: true, game: updated };
  } catch (error) {
    log.error("Failed to update game metadata:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("remove-game", async (event, gameId) => {
  try {
    const targetId = Number(gameId);
    const game = games.find(g => Number(g.id) === targetId) || dbGetGameById(targetId);
    if (!game) return { success: false, message: "Game not found" };

    const removed = dbDeleteGameById(targetId);
    if (removed) {
      refreshLibraryFromDb();
      log.info(`Game ${game.name} removed from library`);
      return { success: true, message: "Game removed from library" };
    }

    return { success: false, message: "Game not found" };
  } catch (error) {
    log.error(`Failed to remove game ${gameId}:`, error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("launch-game", async (event, gameId) => {
  try {
    const targetId = Number(gameId);
    const game = games.find(g => Number(g.id) === targetId) || dbGetGameById(targetId);
    if (game) {
      console.log("(handle) Launching game with ID:", gameId);
      return launchGameObject(game);
    }
    return { success: false, message: "Game not found" };
  } catch (error) {
    log.error(`Failed to launch game ${gameId}:`, error);
    mainWindow.restore();
    return { success: false, message: error.message };
  }
});

ipcMain.handle("search-missing-game-file", async (_event, payload = {}) => {
  try {
    const targetId = Number(payload?.gameId);
    const rootDir = String(payload?.rootDir || "").trim();
    const maxDepth = Number.isFinite(payload?.maxDepth) ? Math.max(0, Math.floor(payload.maxDepth)) : 8;

    if (!targetId) return { success: false, message: "Missing game ID" };
    if (!rootDir) return { success: false, message: "Missing search root folder" };
    if (!fsSync.existsSync(rootDir) || !fsSync.statSync(rootDir).isDirectory()) {
      return { success: false, message: "Search root folder not found" };
    }

    const game = dbGetGameById(targetId) || games.find(g => Number(g.id) === targetId);
    if (!game) return { success: false, message: "Game not found" };

    const oldPath = String(game.filePath || "").trim();
    const targetFileName = path.basename(oldPath);
    if (!targetFileName) return { success: false, message: "Game has no file name" };

    const foundPath = findFileByNameInTree(rootDir, targetFileName, { maxDepth, maxVisitedDirs: 15000 });
    if (!foundPath) {
      return {
        success: true,
        found: false,
        gameId: targetId,
        gameName: game.name || "Unknown Game",
        targetFileName
      };
    }

    const updated = dbUpdateGameFilePath(targetId, foundPath);
    if (!updated) return { success: false, message: "Failed to update game path" };
    refreshLibraryFromDb();

    return {
      success: true,
      found: true,
      gameId: targetId,
      gameName: updated.name || game.name || "Unknown Game",
      newPath: foundPath
    };
  } catch (error) {
    log.error("search-missing-game-file failed:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("relink-game-file", async (_event, payload = {}) => {
  try {
    const targetId = Number(payload?.gameId);
    const selectedPath = String(payload?.filePath || "").trim();

    if (!targetId) return { success: false, message: "Missing game ID" };
    if (!selectedPath) return { success: false, message: "Missing file path" };
    if (!fsSync.existsSync(selectedPath)) return { success: false, message: "Selected file was not found" };

    let stat;
    try {
      stat = fsSync.statSync(selectedPath);
    } catch (_e) {
      stat = null;
    }
    if (!stat || !stat.isFile()) return { success: false, message: "Selected path is not a file" };

    const game = dbGetGameById(targetId) || games.find(g => Number(g.id) === targetId);
    if (!game) return { success: false, message: "Game not found" };

    const updated = dbUpdateGameFilePath(targetId, selectedPath);
    if (!updated) return { success: false, message: "Failed to update game path" };
    refreshLibraryFromDb();

    return {
      success: true,
      gameId: targetId,
      gameName: updated.name || game.name || "Unknown Game",
      newPath: selectedPath
    };
  } catch (error) {
    log.error("relink-game-file failed:", error);
    return { success: false, message: error.message };
  }
});

function parseLaunchArgs(raw) {
  const str = String(raw || "").trim();
  if (!str) return [];

  const args = [];
  const re = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
  let m;
  while ((m = re.exec(str)) !== null) {
    args.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return args.filter(Boolean);
}

ipcMain.handle("launch-emulator", async (_event, payload = {}) => {
  try {
    const exePath = String(payload.filePath || "").trim();
    if (!exePath) return { success: false, message: "Missing emulator path" };
    if (!fsSync.existsSync(exePath)) return { success: false, message: "Emulator executable not found" };

    const args = Array.isArray(payload.args) ? payload.args : parseLaunchArgs(payload.args);
    const cwd = String(payload.workingDirectory || "").trim() || path.dirname(exePath);

    const { spawn } = require("child_process");
    const child = spawn(exePath, args, {
      cwd,
      detached: true,
      stdio: "ignore"
    });

    child.on("error", (error) => {
      log.error("Failed to launch emulator:", error);
    });
    child.unref();

    return { success: true };
  } catch (error) {
    log.error("launch-emulator failed:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("show-item-in-folder", async (_event, filePath) => {
  try {
    const p = String(filePath || "").trim();
    if (!p) return { success: false, message: "Missing path" };
    if (!fsSync.existsSync(p)) return { success: false, message: "Path not found" };
    shell.showItemInFolder(p);
    return { success: true };
  } catch (error) {
    log.error("show-item-in-folder failed:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("open-external-url", async (_event, rawUrl) => {
  try {
    let url = String(rawUrl || "").trim();
    if (!url) return { success: false, message: "Missing URL" };
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    await shell.openExternal(url);
    return { success: true, url };
  } catch (error) {
    log.error("open-external-url failed:", error);
    return { success: false, message: error.message };
  }
});

function extractYouTubeInitialData(html) {
  const source = String(html || "");
  const marker = "var ytInitialData = ";
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return null;

  const start = markerIndex + marker.length;
  const endMarker = ";</script>";
  let end = source.indexOf(endMarker, start);
  if (end < 0) {
    end = source.indexOf(";\n", start);
  }
  if (end < 0) return null;

  const raw = source.slice(start, end).trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function readRendererText(node) {
  if (!node || typeof node !== "object") return "";
  if (typeof node.simpleText === "string") return node.simpleText.trim();
  if (Array.isArray(node.runs)) {
    return node.runs
      .map((part) => String(part?.text || "").trim())
      .filter(Boolean)
      .join("");
  }
  return "";
}

function collectYouTubeVideoEntries(initialData, limit = 8) {
  const max = Math.max(1, Math.min(20, Number(limit) || 8));
  const entries = [];
  const seen = new Set();

  const visit = (node) => {
    if (!node || entries.length >= max) return;

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
        if (entries.length >= max) break;
      }
      return;
    }

    if (typeof node !== "object") return;

    const renderer = node.videoRenderer;
    if (renderer && entries.length < max) {
      const id = String(renderer.videoId || "").trim();
      if (id && !seen.has(id)) {
        seen.add(id);
        const title = readRendererText(renderer.title) || "YouTube Result";
        const channel = readRendererText(renderer.ownerText) || readRendererText(renderer.longBylineText) || "";
        const thumb = renderer?.thumbnail?.thumbnails;
        const thumbnail = Array.isArray(thumb) && thumb.length
          ? String(thumb[thumb.length - 1]?.url || "").trim()
          : `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

        entries.push({
          videoId: id,
          title,
          channel,
          url: `https://www.youtube.com/watch?v=${id}`,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          thumbnail
        });
      }
    }

    for (const value of Object.values(node)) {
      visit(value);
      if (entries.length >= max) break;
    }
  };

  visit(initialData);
  return entries;
}

ipcMain.handle("youtube:search-videos", async (_event, payload = {}) => {
  try {
    const query = String(payload?.query || "").trim();
    const limit = Math.max(1, Math.min(12, Number(payload?.limit) || 8));
    if (!query) return { success: false, message: "Missing YouTube search query", results: [] };

    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
        "accept-language": "en-US,en;q=0.9"
      }
    });

    if (!response.ok) {
      return {
        success: false,
        message: `YouTube search failed with status ${response.status}`,
        query,
        searchUrl,
        results: []
      };
    }

    const html = await response.text();
    const initialData = extractYouTubeInitialData(html);
    let results = collectYouTubeVideoEntries(initialData, limit);

    if (!results.length) {
      const fallbackMatches = [...html.matchAll(/"videoId":"([A-Za-z0-9_-]{11})"/g)];
      const seen = new Set();
      results = fallbackMatches
        .map((match) => String(match?.[1] || "").trim())
        .filter((id) => id && !seen.has(id) && seen.add(id))
        .slice(0, limit)
        .map((id) => ({
          videoId: id,
          title: "YouTube Result",
          channel: "",
          url: `https://www.youtube.com/watch?v=${id}`,
          embedUrl: `https://www.youtube.com/embed/${id}`,
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
        }));
    }

    return {
      success: true,
      query,
      searchUrl,
      results
    };
  } catch (error) {
    log.error("youtube:search-videos failed:", error);
    return {
      success: false,
      message: error.message || "Failed to search YouTube",
      results: []
    };
  }
});

function normalizeEmulatorName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeEmulatorType(type) {
  const raw = String(type || "").trim().toLowerCase();
  if (raw === "standalone" || raw === "core" || raw === "web") return raw;
  return "";
}

function normalizeDownloadOsKey(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "win32" || value === "windows" || value === "win") return "windows";
  if (value === "darwin" || value === "mac" || value === "macos" || value === "osx") return "mac";
  if (value === "linux") return "linux";
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "mac";
  return "linux";
}

function sanitizePathSegment(name) {
  return String(name || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/[. ]+$/g, "")
    || "item";
}

function ensureHttpUrl(rawUrl) {
  let next = String(rawUrl || "").trim();
  if (!next) return "";
  if (!/^https?:\/\//i.test(next)) next = `https://${next}`;
  return next;
}

function normalizeDownloadLinks(rawLinks) {
  const links = (rawLinks && typeof rawLinks === "object") ? rawLinks : {};
  return {
    windows: ensureHttpUrl(links.windows || links.win || links.win32 || ""),
    linux: ensureHttpUrl(links.linux || ""),
    mac: ensureHttpUrl(links.mac || links.macos || links.darwin || "")
  };
}

function parseGitHubRepoFromUrl(rawUrl) {
  const input = ensureHttpUrl(rawUrl);
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (!/github\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = String(parts[1] || "").replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch (_e) {
    return null;
  }
}

function getDownloadSourceUrl(name, website, downloadUrl) {
  const explicitDownloadUrl = ensureHttpUrl(downloadUrl);
  if (explicitDownloadUrl) return explicitDownloadUrl;
  return ensureHttpUrl(website);
}

function buildEmulatorDownloadLinks(name, website, rawLinks, downloadUrl) {
  const explicit = normalizeDownloadLinks(rawLinks);
  const source = getDownloadSourceUrl(name, website, downloadUrl);
  if (!source) return explicit;

  return {
    windows: explicit.windows || source,
    linux: explicit.linux || source,
    mac: explicit.mac || source
  };
}

function compileRegexOrNull(pattern) {
  const source = String(pattern || "").trim();
  if (!source) return null;
  try {
    return new RegExp(source, "i");
  } catch (_e) {
    return null;
  }
}

function getDownloadPatternForOs(emulator, osKey, patternKind) {
  const key = normalizeDownloadOsKey(osKey);
  if (patternKind === "archive") {
    if (key === "windows") return String(emulator?.archiveFileMatchWin || "").trim();
    if (key === "linux") return String(emulator?.archiveFileMatchLinux || "").trim();
    return String(emulator?.archiveFileMatchMac || "").trim();
  }
  if (patternKind === "setup" || patternKind === "installer") {
    if (key === "windows") return String(emulator?.setupFileMatchWin || "").trim();
    if (key === "linux") return String(emulator?.setupFileMatchLinux || "").trim();
    return String(emulator?.setupFileMatchMac || "").trim();
  }
  if (patternKind === "executable") {
    if (key === "windows") return String(emulator?.executableFileMatchWin || "").trim();
    if (key === "linux") return String(emulator?.executableFileMatchLinux || "").trim();
    return String(emulator?.executableFileMatchMac || "").trim();
  }
  return "";
}

function normalizeDownloadPackageType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "setup") return "installer";
  if (value === "install") return "installer";
  if (value === "portable") return "executable";
  if (value === "binary") return "executable";
  if (value === "exe") return "executable";
  if (value === "installer" || value === "archive" || value === "executable") return value;
  return "";
}

function getDownloadRegexBundleForOs(emulator, osKey) {
  return {
    installer: compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "installer")),
    archive: compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "archive")),
    executable: compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "executable"))
  };
}

function inferDownloadPackageTypeFromName(name, osKey) {
  const rawName = String(name || "").trim();
  if (!rawName) return "";
  const lower = rawName.toLowerCase();
  const normalizedOs = normalizeDownloadOsKey(osKey);

  if (getArchiveKind(lower)) return "archive";

  if (normalizedOs === "windows") {
    if (/\.(msi|msix|appx)$/i.test(lower)) return "installer";
    if (lower.endsWith(".exe")) {
      return isInstallerLikeName(lower) ? "installer" : "executable";
    }
  } else if (normalizedOs === "linux") {
    if (/\.(deb|rpm|snap|flatpak)$/i.test(lower)) return "installer";
    if (lower.endsWith(".appimage")) return "executable";
  } else {
    if (/\.(dmg|pkg)$/i.test(lower)) return "installer";
    if (lower.endsWith(".app")) return "executable";
  }

  if (isInstallerLikeName(lower)) return "installer";
  return "";
}

function classifyDownloadPackageType(name, osKey, regexBundle) {
  const fileName = String(name || "").trim();
  if (!fileName) return "";
  const regexes = (regexBundle && typeof regexBundle === "object") ? regexBundle : {};

  if (regexes.installer && regexes.installer.test(fileName)) return "installer";
  if (regexes.archive && regexes.archive.test(fileName)) return "archive";
  if (regexes.executable && regexes.executable.test(fileName)) return "executable";

  return inferDownloadPackageTypeFromName(fileName, osKey);
}

function scoreAssetForOs(assetName, osKey) {
  const name = String(assetName || "").toLowerCase();
  const key = normalizeDownloadOsKey(osKey);
  let score = 0;

  if (key === "windows") {
    if (name.includes("win")) score += 4;
    if (name.includes("windows")) score += 5;
    if (/\.(zip|7z|rar|exe|msi|msix|appx)$/.test(name)) score += 4;
  } else if (key === "linux") {
    if (name.includes("linux")) score += 5;
    if (name.includes("appimage")) score += 5;
    if (/\.(tar|tar\.gz|tar\.xz|tgz|zip|appimage|deb|rpm)$/.test(name)) score += 4;
  } else {
    if (name.includes("mac")) score += 4;
    if (name.includes("osx") || name.includes("darwin") || name.includes("macos")) score += 5;
    if (/\.(dmg|pkg|zip|app)$/.test(name)) score += 4;
  }

  if (name.includes("x64") || name.includes("x86_64") || name.includes("amd64")) score += 2;
  if (name.includes("debug") || name.includes("symbols") || name.includes("source")) score -= 3;
  return score;
}

function selectBestGitHubAsset(release, emulator, osKey) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  if (assets.length === 0) return null;

  const setupRegex = compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "installer"));
  const archiveRegex = compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "archive"));
  const executableRegex = compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "executable"));

  if (setupRegex) {
    const match = assets.find((asset) => setupRegex.test(String(asset?.name || "")));
    if (match) return match;
  }

  if (archiveRegex) {
    const match = assets.find((asset) => archiveRegex.test(String(asset?.name || "")));
    if (match) return match;
  }

  if (executableRegex) {
    const match = assets.find((asset) => executableRegex.test(String(asset?.name || "")));
    if (match) return match;
  }

  const ranked = assets
    .map((asset) => ({ asset, score: scoreAssetForOs(asset?.name, osKey) }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length && ranked[0].score > 0) return ranked[0].asset;
  return assets[0] || null;
}

async function fetchGitHubLatestRelease(repoInfo) {
  const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases/latest`;
  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "emuBro"
    }
  });
  if (!res.ok) {
    throw new Error(`GitHub release lookup failed (${res.status})`);
  }
  return await res.json();
}

function isLikelyDirectDownloadUrl(rawUrl) {
  const input = ensureHttpUrl(rawUrl);
  if (!input) return false;
  try {
    const parsed = new URL(input);
    const pathname = String(parsed.pathname || "").toLowerCase();
    if (getArchiveKind(pathname)) return true;
    return /\.(exe|msi|msix|appx|dmg|pkg|appimage|deb|rpm)$/i.test(pathname);
  } catch (_e) {
    return false;
  }
}

function extractFilenameFromContentDisposition(value) {
  const header = String(value || "").trim();
  if (!header) return "";
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8 && utf8[1]) {
    try {
      return decodeURIComponent(utf8[1]).trim();
    } catch (_e) {}
  }
  const plain = header.match(/filename=\"?([^\";]+)\"?/i);
  if (plain && plain[1]) return String(plain[1]).trim();
  return "";
}

async function downloadUrlToFile(url, targetPath) {
  const res = await fetch(url, {
    headers: {
      Accept: "*/*",
      "User-Agent": "emuBro"
    },
    redirect: "follow"
  });

  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  if (!res.body) throw new Error("Download returned empty response");

  fsSync.mkdirSync(path.dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fsSync.createWriteStream(targetPath));

  return {
    contentType: String(res.headers.get("content-type") || "").trim(),
    fileNameFromHeader: extractFilenameFromContentDisposition(res.headers.get("content-disposition"))
  };
}

function findEmulatorBinaryInFolder(rootDir, searchString, osKey) {
  const root = String(rootDir || "").trim();
  if (!root || !fsSync.existsSync(root)) return "";

  const matcher = compileRegexOrNull(searchString);
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const fallbackCandidates = [];
  const queue = [root];
  let visitedDirs = 0;

  while (queue.length > 0 && visitedDirs < 10000) {
    const current = queue.shift();
    visitedDirs += 1;

    let entries = [];
    try {
      entries = fsSync.readdirSync(current, { withFileTypes: true });
    } catch (_e) {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (normalizedOs === "mac" && entry.name.toLowerCase().endsWith(".app")) {
          if (!matcher || matcher.test(entry.name)) return full;
          fallbackCandidates.push(full);
          continue;
        }
        queue.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      const filename = entry.name;
      const lowerName = filename.toLowerCase();
      if (matcher && (matcher.test(filename) || matcher.test(full))) return full;

      if (normalizedOs === "windows" && lowerName.endsWith(".exe")) {
        fallbackCandidates.push(full);
      } else if (normalizedOs === "linux" && (lowerName.endsWith(".appimage") || !path.extname(lowerName))) {
        fallbackCandidates.push(full);
      } else if (normalizedOs === "mac" && lowerName.endsWith(".app")) {
        fallbackCandidates.push(full);
      }
    }
  }

  return fallbackCandidates[0] || "";
}

function isInstallerLikeName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (/\.(msi|msix|appx|dmg|pkg|deb|rpm)$/i.test(lower)) return true;
  return /\b(setup|installer|install)\b/.test(lower);
}

function rankDownloadOption(option, emulator, osKey) {
  const entry = (option && typeof option === "object") ? option : {};
  const packageType = normalizeDownloadPackageType(entry.packageType);
  const fileName = String(entry.fileName || "").trim();
  const score = Number.isFinite(entry.score) ? Number(entry.score) : scoreAssetForOs(fileName, osKey);

  let rank = score;
  const installerPattern = String(getDownloadPatternForOs(emulator, osKey, "installer") || "").trim();
  const archivePattern = String(getDownloadPatternForOs(emulator, osKey, "archive") || "").trim();
  const executablePattern = String(getDownloadPatternForOs(emulator, osKey, "executable") || "").trim();

  if (packageType === "installer" && installerPattern) rank += 60;
  if (packageType === "archive" && archivePattern) rank += 55;
  if (packageType === "executable" && executablePattern) rank += 50;
  return rank;
}

function selectPreferredDownloadOption(options, emulator, osKey) {
  const list = Array.isArray(options) ? options : [];
  if (!list.length) return null;

  const installerPattern = String(getDownloadPatternForOs(emulator, osKey, "installer") || "").trim();
  const archivePattern = String(getDownloadPatternForOs(emulator, osKey, "archive") || "").trim();
  const executablePattern = String(getDownloadPatternForOs(emulator, osKey, "executable") || "").trim();

  if (installerPattern) {
    const installer = list.find((item) => normalizeDownloadPackageType(item?.packageType) === "installer");
    if (installer) return installer;
  }
  if (archivePattern) {
    const archive = list.find((item) => normalizeDownloadPackageType(item?.packageType) === "archive");
    if (archive) return archive;
  }
  if (executablePattern) {
    const executable = list.find((item) => normalizeDownloadPackageType(item?.packageType) === "executable");
    if (executable) return executable;
  }

  const ranking = { archive: 3, executable: 2, installer: 1 };
  return [...list].sort((a, b) => {
    const aType = normalizeDownloadPackageType(a?.packageType);
    const bType = normalizeDownloadPackageType(b?.packageType);
    const typeDiff = (ranking[bType] || 0) - (ranking[aType] || 0);
    if (typeDiff !== 0) return typeDiff;
    return rankDownloadOption(b, emulator, osKey) - rankDownloadOption(a, emulator, osKey);
  })[0] || null;
}

function selectDownloadOptionsByType(candidates, emulator, osKey) {
  const byType = new Map();
  const list = Array.isArray(candidates) ? candidates : [];
  for (const candidate of list) {
    const type = normalizeDownloadPackageType(candidate?.packageType);
    const url = ensureHttpUrl(candidate?.url || "");
    if (!type || !url) continue;

    const normalized = {
      packageType: type,
      url,
      fileName: String(candidate?.fileName || "").trim(),
      source: String(candidate?.source || "").trim() || "unknown",
      releaseUrl: ensureHttpUrl(candidate?.releaseUrl || ""),
      score: Number.isFinite(candidate?.score) ? Number(candidate.score) : scoreAssetForOs(candidate?.fileName, osKey)
    };

    const existing = byType.get(type);
    if (!existing || rankDownloadOption(normalized, emulator, osKey) > rankDownloadOption(existing, emulator, osKey)) {
      byType.set(type, normalized);
    }
  }

  const order = ["installer", "archive", "executable"];
  return order
    .map((type) => byType.get(type))
    .filter(Boolean);
}

function getFilenameFromUrl(rawUrl) {
  const input = ensureHttpUrl(rawUrl);
  if (!input) return "";
  try {
    const parsed = new URL(input);
    return decodeURIComponent(path.basename(parsed.pathname || ""));
  } catch (_e) {
    return "";
  }
}

function getPreferredEmulatorDownloadUrl(emulator, osKey) {
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const downloadLinks = buildEmulatorDownloadLinks(
    emulator?.name,
    emulator?.website,
    emulator?.downloadLinks,
    emulator?.downloadUrl
  );
  return ensureHttpUrl(downloadLinks[normalizedOs] || emulator?.downloadUrl || emulator?.website || "");
}

function buildWaybackMachineUrl(rawUrl) {
  const source = ensureHttpUrl(rawUrl);
  if (!source) return "";
  return `https://web.archive.org/web/*/${source}`;
}

async function listEmulatorDownloadTargets(emulator, osKey) {
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const preferredUrl = getPreferredEmulatorDownloadUrl(emulator, normalizedOs);
  if (!preferredUrl) {
    throw new Error("No download URL available for this emulator");
  }

  const regexBundle = getDownloadRegexBundleForOs(emulator, normalizedOs);
  const candidates = [];
  let manualUrl = preferredUrl;

  const repo = parseGitHubRepoFromUrl(preferredUrl);
  if (repo) {
    try {
      const release = await fetchGitHubLatestRelease(repo);
      const releaseUrl = ensureHttpUrl(release?.html_url || preferredUrl);
      manualUrl = releaseUrl || preferredUrl;
      const assets = Array.isArray(release?.assets) ? release.assets : [];

      for (const asset of assets) {
        const assetUrl = ensureHttpUrl(asset?.browser_download_url || "");
        if (!assetUrl) continue;

        const fileName = String(asset?.name || getFilenameFromUrl(assetUrl)).trim();
        if (!fileName) continue;

        const packageType = classifyDownloadPackageType(fileName, normalizedOs, regexBundle);
        if (!packageType) continue;

        const score = scoreAssetForOs(fileName, normalizedOs);
        if (score <= 0 && !(regexBundle.archive?.test(fileName) || regexBundle.installer?.test(fileName) || regexBundle.executable?.test(fileName))) {
          continue;
        }

        candidates.push({
          packageType,
          url: assetUrl,
          fileName,
          score,
          source: "github-release",
          releaseUrl
        });
      }

      if (candidates.length === 0) {
        const bestAsset = selectBestGitHubAsset(release, emulator, normalizedOs);
        if (bestAsset?.browser_download_url) {
          const fallbackName = String(bestAsset?.name || getFilenameFromUrl(bestAsset.browser_download_url)).trim();
          const fallbackType = classifyDownloadPackageType(fallbackName, normalizedOs, regexBundle);
          if (fallbackType) {
            candidates.push({
              packageType: fallbackType,
              url: ensureHttpUrl(bestAsset.browser_download_url),
              fileName: fallbackName,
              score: scoreAssetForOs(fallbackName, normalizedOs),
              source: "github-release",
              releaseUrl
            });
          }
        }
      }
    } catch (_e) {
      // Fall through to direct URL handling.
    }
  }

  if (candidates.length === 0 && isLikelyDirectDownloadUrl(preferredUrl)) {
    const fileName = getFilenameFromUrl(preferredUrl);
    const packageType = classifyDownloadPackageType(fileName, normalizedOs, regexBundle);
    if (packageType) {
      candidates.push({
        packageType,
        url: preferredUrl,
        fileName,
        score: scoreAssetForOs(fileName, normalizedOs),
        source: "direct-link",
        releaseUrl: ensureHttpUrl(preferredUrl)
      });
    }
  }

  return {
    osKey: normalizedOs,
    options: selectDownloadOptionsByType(candidates, emulator, normalizedOs),
    manualUrl,
    waybackUrl: buildWaybackMachineUrl(manualUrl || preferredUrl)
  };
}

async function resolveEmulatorDownloadTarget(emulator, osKey, preferredType) {
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const requestedType = normalizeDownloadPackageType(preferredType);
  const discovered = await listEmulatorDownloadTargets(emulator, normalizedOs);
  const options = Array.isArray(discovered?.options) ? discovered.options : [];
  const manualUrl = ensureHttpUrl(discovered?.manualUrl || "");

  if (!options.length) {
    return {
      directDownload: false,
      url: manualUrl,
      releaseUrl: manualUrl,
      osKey: normalizedOs,
      options: [],
      waybackUrl: buildWaybackMachineUrl(manualUrl)
    };
  }

  const selected = requestedType
    ? options.find((item) => normalizeDownloadPackageType(item?.packageType) === requestedType)
    : null;
  const preferred = selected || selectPreferredDownloadOption(options, emulator, normalizedOs);
  if (!preferred?.url) {
    return {
      directDownload: false,
      url: manualUrl,
      releaseUrl: manualUrl,
      osKey: normalizedOs,
      options,
      waybackUrl: buildWaybackMachineUrl(manualUrl)
    };
  }

  return {
    directDownload: true,
    osKey: normalizedOs,
    url: preferred.url,
    fileName: preferred.fileName || "",
    packageType: normalizeDownloadPackageType(preferred.packageType),
    source: preferred.source || "unknown",
    releaseUrl: ensureHttpUrl(preferred.releaseUrl || manualUrl || preferred.url),
    options,
    waybackUrl: buildWaybackMachineUrl(manualUrl || preferred.url)
  };
}

function buildConfiguredEmulators(platformConfigs) {
  const out = [];
  const seen = new Set();

  for (const config of platformConfigs || []) {
    const platformShortName = normalizePlatform(config?.shortName) || "unknown";
    const platformName = String(config?.name || platformShortName);

    for (const emu of (config?.emulators || [])) {
      const name = String(emu?.name || "").trim();
      if (!name) continue;
      const downloadUrl = ensureHttpUrl(emu?.downloadUrl || "");
      const website = ensureHttpUrl(emu?.website || downloadUrl);
      const downloadLinks = buildEmulatorDownloadLinks(name, website, emu?.downloadLinks, downloadUrl);

      const key = `${platformShortName}::${normalizeEmulatorName(name)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        id: `cfg:${platformShortName}:${normalizeEmulatorName(name) || "emu"}`,
        name,
        platform: platformName,
        platformShortName,
        type: normalizeEmulatorType(emu?.type) || "standalone",
        filePath: "",
        isInstalled: false,
        website,
        downloadUrl,
        downloadLinks,
        startParameters: String(emu?.startParameters || "").trim(),
        searchString: String(emu?.searchString || "").trim(),
        archiveFileMatchWin: String(emu?.archiveFileMatchWin || "").trim(),
        archiveFileMatchLinux: String(emu?.archiveFileMatchLinux || "").trim(),
        archiveFileMatchMac: String(emu?.archiveFileMatchMac || "").trim(),
        setupFileMatchWin: String(emu?.setupFileMatchWin || "").trim(),
        setupFileMatchLinux: String(emu?.setupFileMatchLinux || "").trim(),
        setupFileMatchMac: String(emu?.setupFileMatchMac || "").trim(),
        executableFileMatchWin: String(emu?.executableFileMatchWin || "").trim(),
        executableFileMatchLinux: String(emu?.executableFileMatchLinux || "").trim(),
        executableFileMatchMac: String(emu?.executableFileMatchMac || "").trim(),
        iconFilename: String(emu?.iconFilename || "").trim(),
        source: "config"
      });
    }
  }

  return out;
}

function installedMatchesConfigured(installed, configured) {
  if (normalizePlatform(installed?.platformShortName) !== normalizePlatform(configured?.platformShortName)) {
    return false;
  }

  const filePath = String(installed?.filePath || "").trim();
  const exeBase = filePath
    ? path.basename(filePath, path.extname(filePath))
    : String(installed?.name || "").trim();

  const installedNameNorm = normalizeEmulatorName(installed?.name);
  const exeNorm = normalizeEmulatorName(exeBase);
  const configuredNameNorm = normalizeEmulatorName(configured?.name);

  if (installedNameNorm && installedNameNorm === configuredNameNorm) return true;
  if (exeNorm && exeNorm === configuredNameNorm) return true;

  const searchString = String(configured?.searchString || "").trim();
  if (!searchString) return false;

  try {
    const re = new RegExp(searchString, "i");
    return re.test(`${exeBase}.exe`) || re.test(exeBase);
  } catch (_e) {
    return false;
  }
}

ipcMain.handle("get-emulators", async () => {
  try {
    refreshLibraryFromDb();
  } catch (_e) {}

  const installedRows = (emulators || []).map((emu) => {
    const filePath = String(emu?.filePath || "").trim();
    const installed = !!filePath && fsSync.existsSync(filePath);
    const downloadUrl = ensureHttpUrl(emu?.downloadUrl || "");
    const website = ensureHttpUrl(emu?.website || downloadUrl);
    return {
      ...emu,
      isInstalled: installed,
      type: normalizeEmulatorType(emu?.type) || "",
      website,
      downloadUrl,
      downloadLinks: buildEmulatorDownloadLinks(emu?.name, website, emu?.downloadLinks, downloadUrl),
      archiveFileMatchWin: String(emu?.archiveFileMatchWin || "").trim(),
      archiveFileMatchLinux: String(emu?.archiveFileMatchLinux || "").trim(),
      archiveFileMatchMac: String(emu?.archiveFileMatchMac || "").trim(),
      setupFileMatchWin: String(emu?.setupFileMatchWin || "").trim(),
      setupFileMatchLinux: String(emu?.setupFileMatchLinux || "").trim(),
      setupFileMatchMac: String(emu?.setupFileMatchMac || "").trim(),
      executableFileMatchWin: String(emu?.executableFileMatchWin || "").trim(),
      executableFileMatchLinux: String(emu?.executableFileMatchLinux || "").trim(),
      executableFileMatchMac: String(emu?.executableFileMatchMac || "").trim(),
      source: "library"
    };
  });

  let platformConfigs = [];
  try {
    platformConfigs = await getPlatformConfigs();
  } catch (_e) {}

  const configured = buildConfiguredEmulators(platformConfigs);
  const unusedConfigured = [...configured];
  const merged = [];

  for (const installed of installedRows) {
    const idx = unusedConfigured.findIndex((cfg) => installedMatchesConfigured(installed, cfg));
    if (idx >= 0) {
      const cfg = unusedConfigured.splice(idx, 1)[0];
      merged.push({
        ...cfg,
        ...installed,
        name: cfg.name || installed.name,
        platform: cfg.platform || installed.platform,
        platformShortName: cfg.platformShortName || installed.platformShortName,
        type: normalizeEmulatorType(installed.type || cfg.type) || "standalone",
        website: cfg.website || installed.website || "",
        downloadUrl: cfg.downloadUrl || installed.downloadUrl || "",
        downloadLinks: buildEmulatorDownloadLinks(
          cfg.name || installed.name,
          cfg.website || installed.website,
          cfg.downloadLinks || installed.downloadLinks,
          cfg.downloadUrl || installed.downloadUrl
        ),
        searchString: cfg.searchString || "",
        startParameters: cfg.startParameters || "",
        archiveFileMatchWin: cfg.archiveFileMatchWin || installed.archiveFileMatchWin || "",
        archiveFileMatchLinux: cfg.archiveFileMatchLinux || installed.archiveFileMatchLinux || "",
        archiveFileMatchMac: cfg.archiveFileMatchMac || installed.archiveFileMatchMac || "",
        setupFileMatchWin: cfg.setupFileMatchWin || installed.setupFileMatchWin || "",
        setupFileMatchLinux: cfg.setupFileMatchLinux || installed.setupFileMatchLinux || "",
        setupFileMatchMac: cfg.setupFileMatchMac || installed.setupFileMatchMac || "",
        executableFileMatchWin: cfg.executableFileMatchWin || installed.executableFileMatchWin || "",
        executableFileMatchLinux: cfg.executableFileMatchLinux || installed.executableFileMatchLinux || "",
        executableFileMatchMac: cfg.executableFileMatchMac || installed.executableFileMatchMac || "",
        iconFilename: cfg.iconFilename || "",
        source: "library+config"
      });
    } else {
      merged.push({
        ...installed,
        type: normalizeEmulatorType(installed.type) || "standalone",
        downloadLinks: buildEmulatorDownloadLinks(
          installed.name,
          installed.website,
          installed.downloadLinks,
          installed.downloadUrl
        )
      });
    }
  }

  unusedConfigured.forEach((cfg) => {
    merged.push({
      ...cfg,
      type: normalizeEmulatorType(cfg.type) || "standalone",
      downloadLinks: buildEmulatorDownloadLinks(cfg.name, cfg.website, cfg.downloadLinks, cfg.downloadUrl)
    });
  });

  merged.sort((a, b) => {
    const p = String(a.platform || a.platformShortName || "").localeCompare(String(b.platform || b.platformShortName || ""));
    if (p !== 0) return p;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return merged;
});

ipcMain.handle("get-emulator-download-options", async (_event, payload = {}) => {
  try {
    const emulator = (payload && typeof payload === "object") ? payload : {};
    const name = String(emulator?.name || "").trim();
    if (!name) return { success: false, message: "Missing emulator name" };

    const osKey = normalizeDownloadOsKey(payload?.os || process.platform);
    const resolved = await resolveEmulatorDownloadTarget(emulator, osKey, "");
    return {
      success: true,
      osKey,
      options: Array.isArray(resolved?.options) ? resolved.options : [],
      recommendedType: normalizeDownloadPackageType(resolved?.packageType || ""),
      manualUrl: ensureHttpUrl(resolved?.releaseUrl || resolved?.url || ""),
      waybackUrl: ensureHttpUrl(resolved?.waybackUrl || "")
    };
  } catch (error) {
    log.error("get-emulator-download-options failed:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("download-install-emulator", async (_event, payload = {}) => {
  try {
    const emulator = (payload && typeof payload === "object") ? payload : {};
    const name = String(emulator?.name || "").trim();
    const platformName = String(emulator?.platform || "").trim() || "Unknown";
    const platformShortName = normalizePlatform(emulator?.platformShortName) || "unknown";
    if (!name) return { success: false, message: "Missing emulator name" };

    const osKey = normalizeDownloadOsKey(payload?.os || process.platform);
    const useWaybackFallback = !!payload?.useWaybackFallback;
    if (useWaybackFallback) {
      const waybackSourceUrl = ensureHttpUrl(
        payload?.waybackSourceUrl
        || payload?.manualUrl
        || getPreferredEmulatorDownloadUrl(emulator, osKey)
      );
      const waybackUrl = ensureHttpUrl(payload?.waybackUrl || buildWaybackMachineUrl(waybackSourceUrl));
      if (!waybackUrl) {
        return { success: false, message: "No fallback source URL available for Wayback Machine." };
      }
      await shell.openExternal(waybackUrl);
      return {
        success: false,
        manual: true,
        wayback: true,
        message: "Opened Wayback Machine fallback for this emulator.",
        openedUrl: waybackUrl
      };
    }

    const requestedPackageType = normalizeDownloadPackageType(payload?.packageType || "");
    const resolved = await resolveEmulatorDownloadTarget(emulator, osKey, requestedPackageType);
    if (!resolved?.url) {
      return { success: false, message: "No download source found for this emulator" };
    }

    if (!resolved.directDownload) {
      await shell.openExternal(resolved.url);
      return {
        success: false,
        manual: true,
        message: "No direct package found. Opened the download page in your browser.",
        openedUrl: resolved.url
      };
    }

    const selectedPackageType = normalizeDownloadPackageType(resolved?.packageType || requestedPackageType);

    const settings = getLibraryPathSettings();
    const preferredRoot = String(payload?.targetDir || "").trim();
    const baseInstallRoot = preferredRoot
      || (Array.isArray(settings?.emulatorFolders) && settings.emulatorFolders[0])
      || path.join(app.getPath("userData"), "library-storage", "emulators");
    const platformDir = path.join(baseInstallRoot, sanitizePathSegment(platformShortName));
    const emulatorDir = path.join(platformDir, sanitizePathSegment(name));
    fsSync.mkdirSync(emulatorDir, { recursive: true });

    const tempDir = path.join(app.getPath("temp"), "emubro-downloads", "emulators");
    fsSync.mkdirSync(tempDir, { recursive: true });

    const urlFileName = (() => {
      try {
        const parsed = new URL(resolved.url);
        return decodeURIComponent(path.basename(parsed.pathname || ""));
      } catch (_e) {
        return "";
      }
    })();

    const suggestedName = String(resolved.fileName || urlFileName || `${sanitizePathSegment(name)}-${Date.now()}`).trim();
    const initialDownloadPath = ensureUniqueDestinationPath(path.join(tempDir, suggestedName));
    const downloadMeta = await downloadUrlToFile(resolved.url, initialDownloadPath);
    const finalName = String(downloadMeta?.fileNameFromHeader || path.basename(initialDownloadPath)).trim();
    const finalDownloadPath = (finalName && finalName !== path.basename(initialDownloadPath))
      ? ensureUniqueDestinationPath(path.join(tempDir, finalName))
      : initialDownloadPath;
    if (finalDownloadPath !== initialDownloadPath) {
      movePathSafe(initialDownloadPath, finalDownloadPath);
    }

    const archiveKind = getArchiveKind(finalDownloadPath);
    let installedPath = "";
    let packagePath = "";

    if (archiveKind) {
      const extractRoot = ensureUniqueDestinationPath(
        path.join(tempDir, `${sanitizePathSegment(name)}-extract`)
      );
      fsSync.mkdirSync(extractRoot, { recursive: true });
      await extractArchiveToDir(finalDownloadPath, extractRoot);

      const ctx = {
        policy: "",
        operationLabel: "Install Emulator Package",
        discardSkippedSources: true,
        cancelled: false,
        stats: { moved: 0, replaced: 0, keptBoth: 0, skipped: 0, conflicts: 0 }
      };
      const integrated = await integrateDirectoryContents(extractRoot, emulatorDir, ctx);
      removePathSafe(extractRoot);

      if (!integrated || ctx.cancelled) {
        return {
          success: false,
          canceled: true,
          message: "Installation canceled during conflict resolution.",
          installDir: emulatorDir,
          stats: ctx.stats
        };
      }

      packagePath = emulatorDir;
      installedPath = findEmulatorBinaryInFolder(emulatorDir, emulator?.searchString, osKey);
    } else {
      const destination = ensureUniqueDestinationPath(path.join(emulatorDir, path.basename(finalDownloadPath)));
      movePathSafe(finalDownloadPath, destination);
      packagePath = destination;
      installedPath = findEmulatorBinaryInFolder(emulatorDir, emulator?.searchString, osKey) || destination;
    }

    const installedFileName = path.basename(installedPath || "");
    const detectedInstalledType = normalizeDownloadPackageType(
      inferDownloadPackageTypeFromName(installedFileName || path.basename(packagePath || ""), osKey)
    );
    const installerOnly = (detectedInstalledType === "installer")
      || (!installedPath && selectedPackageType === "installer")
      || (installedFileName ? isInstallerLikeName(installedFileName) : false);
    if (installedPath && !installerOnly) {
      dbUpsertEmulator({
        name,
        platform: platformName,
        platformShortName,
        filePath: installedPath
      });
      refreshLibraryFromDb();
    }

    if (!installedPath || installerOnly) {
      const message = installerOnly
        ? `Downloaded installer to ${packagePath}. Run it once, then rescan emulators.`
        : `Downloaded package to ${packagePath}. Could not auto-detect the emulator executable yet.`;
      return {
        success: true,
        installed: false,
        packagePath,
        installDir: emulatorDir,
        packageType: selectedPackageType || detectedInstalledType || "",
        message
      };
    }

    return {
      success: true,
      installed: true,
      installedPath,
      packagePath,
      installDir: emulatorDir,
      packageType: selectedPackageType || detectedInstalledType || "",
      message: `Downloaded and installed ${name}.`
    };
  } catch (error) {
    log.error("download-install-emulator failed:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("create-game-shortcut", async (_event, gameId) => {
  try {
    const game = games.find((g) => g.id === gameId);
    if (!game) return { success: false, message: "Game not found" };

    const url = buildDeepLinkForGame(game);
    const { target, args } = getShortcutTargetAndArgs(url);

    const desktopDir = app.getPath("desktop");
    const shortcutName = sanitizeFilename(`${game.name} (${game.platformShortName || game.platform || "unknown"})`) + ".lnk";
    const shortcutPath = path.join(desktopDir, shortcutName);

    const iconDir = path.join(app.getPath("userData"), "shortcut-icons");
    fsSync.mkdirSync(iconDir, { recursive: true });

    const coverPath = resolveGameCoverPath(game);
    const iconKey = sanitizeFilename(`${game.platformShortName || "unknown"}_${inferGameCode(game) || game.name || "game"}`);
    const icoPath = path.join(iconDir, `${iconKey}.ico`);

    try {
      const img = nativeImage.createFromPath(coverPath).resize({ width: 256, height: 256 });
      const png = img.toPNG();
      writeIcoFromPng(png, icoPath);
    } catch (e) {
      log.warn("Failed to generate shortcut icon, falling back to app icon:", e.message);
    }

    const ok = shell.writeShortcutLink(shortcutPath, {
      target,
      args,
      description: `Launch ${game.name} in emuBro`,
      icon: fsSync.existsSync(icoPath) ? icoPath : undefined,
      iconIndex: 0
    });

    if (!ok) return { success: false, message: "Failed to create shortcut" };
    return { success: true, path: shortcutPath, url };
  } catch (e) {
    log.error("Failed to create shortcut:", e);
    return { success: false, message: e.message };
  }
});

async function scanForGamesAndEmulators(selectedDrive, options = {}) {
  log.info("Starting game search");
  try {
    // Ensure de-dupe checks are based on the latest persisted library.
    refreshLibraryFromDb();
  } catch (_e) {}

  const platformConfigs = await getPlatformConfigs();
  const foundPlatforms = [];
  const foundGames = [];
  const foundEmulators = [];
  const scope = String(options?.scope || "both").trim().toLowerCase();
  const scanGames = scope !== "emulators";
  const scanEmulators = scope !== "games";
  const recursive = options && options.recursive === false ? false : true;
  const maxDepth = Number.isFinite(options?.maxDepth)
    ? Math.max(0, Math.floor(options.maxDepth))
    : (recursive ? 50 : 0);

  // load more folders to skip from ignore-folders.json
  const ignoreFoldersPath = path.join(__dirname, "./emubro-resources", "ignore-folders.json");
  let ignoreFolders = [];
  try {
    const ignoreData = await fsSync.readFileSync(ignoreFoldersPath, "utf8");
    const ignoreJson = JSON.parse(ignoreData);
    ignoreFolders = ignoreJson["ignore-folders"] || [];
  } catch (ignoreErr) {
    log.warn("Failed to read ignore-folders.json:", ignoreErr.message);
  }

  const systemDirs = [
    process.env.WINDIR,
    process.env.APPDATA,
    process.env["PROGRAMFILES"],
    process.env["PROGRAMFILES(X86)"],
    process.env.LOCALAPPDATA,
    "C:\\System Volume Information",
    "C:\\$Recycle.Bin",
    "C:\\Config.Msi"
  ];

  async function scanDirectory(dir, depth = 0) {
    try {
      if (!fsSync.existsSync(dir)) return;
      if (depth > maxDepth) return;

      const items = await fs.readdir(dir).catch(() => []);

      for (const item of items) {
        const itemPath = path.join(dir, item);

        try {
          // Use lstat so we don't follow Windows Junctions/Symlinks
          const stat = await fs.lstat(itemPath);

          if (item.startsWith(".") || stat.isSymbolicLink()) {
            continue;
          }

          if (stat.isDirectory()) {
            if (!recursive && depth > 0) continue;
            if (item.startsWith("$")) continue;
            if (ignoreFolders.some((folder) => item.toLowerCase() === folder.toLowerCase())) continue;

            if (os.platform() === "win32") {
              if (systemDirs.some((sysDir) => sysDir && itemPath.toLowerCase().startsWith(sysDir.toLowerCase()))) {
                continue;
              }
            }

            if (recursive) {
              await scanDirectory(itemPath, depth + 1);
            }
          } else if (stat.isFile()) {
            if (scanGames) {
              const platformConfig = determinePlatformFromFilename(item, itemPath, platformConfigs);
              if (platformConfig) {
                const filePath = String(itemPath || "").trim();
                const exists = games.some((g) => String(g.filePath || "").toLowerCase() === filePath.toLowerCase());
                if (!exists) {
                  const name = path.basename(item, path.extname(item));
                  const platformShortName = platformConfig.shortName || "unknown";
                  const code = inferGameCode({ name, filePath });
                  const image = discoverCoverImageRelative(platformShortName, code, name);

                  const { row, existed: existedInDb } = dbUpsertGame({
                    name,
                    platform: platformConfig.name || "Unknown",
                    platformShortName,
                    filePath,
                    code: code || null,
                    image: image || null
                  });

                  if (!existedInDb) foundGames.push(row);

                  const psn = String(platformShortName).toLowerCase();
                  if (!foundPlatforms.includes(psn)) {
                    log.info(`Found new platform ${platformConfig.name} shortName ${platformShortName}`);
                    foundPlatforms.push(psn);
                  }

                  refreshLibraryFromDb();
                }
              }
            }

            if (scanEmulators && itemPath.toLowerCase().endsWith(".exe")) {
              processEmulatorExe(itemPath, item, platformConfigs, emulators, foundEmulators);
            }
          }
        } catch (_fileErr) {
          continue;
        }
      }
    } catch (error) {
      log.warn(`Critical failure scanning ${dir}:`, error.message);
    }
  }

  if (!selectedDrive) {
    const homeDir = os.homedir();
    log.info("Scanning home directory:", homeDir);
    await scanDirectory(homeDir);
  } else {
    let drivePath = selectedDrive;
    if (os.platform() === "win32" && drivePath.length === 2 && drivePath.endsWith(":")) {
      drivePath += "\\";
    }
    log.info("Scanning selected drive:", drivePath);
    await scanDirectory(drivePath);
  }

  log.info(`Game search completed. Found ${foundGames.length} games and ${foundEmulators.length} emulators.`);
  return { success: true, platforms: foundPlatforms, games: foundGames, emulators: foundEmulators };
}

ipcMain.handle("browse-games-and-emus", async (_event, selectedDrive, options = {}) => {
  try {
    return await scanForGamesAndEmulators(selectedDrive, options);
  } catch (error) {
    log.error("Failed to search for games and emulators:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("prompt-scan-subfolders", async (_event, folderPath) => {
  if (!mainWindow) return { canceled: true, recursive: true };

  const folder = String(folderPath || "").trim();
  const res = await dialog.showMessageBox(mainWindow, {
    type: "question",
    buttons: ["Scan Subfolders", "Only This Folder", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    title: "Import Folder",
    message: "Scan subfolders too?",
    detail: folder
  });

  if (res.response === 2) return { canceled: true };
  return { canceled: false, recursive: res.response === 0 };
});

ipcMain.handle("get-platforms", async () => {
  const platformConfigs = await getPlatformConfigs();
  const platforms = [];

  for (const c of platformConfigs || []) {
    const shortName = String(c?.shortName || "").trim().toLowerCase();
    const name = String(c?.name || "").trim();
    if (!shortName) continue;
    platforms.push({ shortName, name: name || shortName });
  }

  // Optional built-in platform for standalone PC games.
  platforms.push({ shortName: "pc", name: "PC" });

  // De-dupe by shortName
  const seen = new Set();
  return platforms.filter((p) => {
    if (seen.has(p.shortName)) return false;
    seen.add(p.shortName);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle("detect-emulator-exe", async (_event, exePath) => {
  try {
    refreshLibraryFromDb();
  } catch (_e) {}

  const p = String(exePath || "").trim();
  if (!p) return { success: false, message: "Missing path" };

  const fileName = path.basename(p);
  const platformConfigs = await getPlatformConfigs();
  const platformConfigEmus = determinePlatformFromFilenameEmus(fileName, p, platformConfigs);
  const matched = !!platformConfigEmus;

  const emulatorAlreadyAdded = emulators.some((e) => String(e.filePath || "").toLowerCase() === p.toLowerCase());

  return {
    success: true,
    matched,
    emulatorAlreadyAdded,
    platformShortName: matched ? (platformConfigEmus.shortName || "unknown") : "",
    platformName: matched ? (platformConfigEmus.name || "Unknown") : ""
  };
});

ipcMain.handle("import-exe", async (_event, payload) => {
  try {
    refreshLibraryFromDb();

    const p = String(payload?.path || "").trim();
    if (!p) return { success: false, message: "Missing .exe path" };
    if (!fsSync.existsSync(p) || !fsSync.lstatSync(p).isFile()) return { success: false, message: "Path is not a file" };

    const addEmulator = !!payload?.addEmulator;
    const addGame = !!payload?.addGame;
    const emuPsn = String(payload?.emulatorPlatformShortName || "").trim().toLowerCase();
    const gamePsn = String(payload?.gamePlatformShortName || "pc").trim().toLowerCase();

    const platformConfigs = await getPlatformConfigs();
    const findPlatform = (shortName) => (platformConfigs || []).find((c) => String(c?.shortName || "").trim().toLowerCase() === shortName);

    const results = { success: true, addedEmulator: null, addedGame: null, skipped: [], errors: [] };

    if (addEmulator) {
      let platformShortName = emuPsn;
      let platformName = "Unknown";

      if (!platformShortName) {
        // Fall back to detection if caller didn't provide it.
        const cfg = determinePlatformFromFilenameEmus(path.basename(p), p, platformConfigs);
        if (cfg) {
          platformShortName = String(cfg.shortName || "").trim().toLowerCase();
          platformName = cfg.name || "Unknown";
        }
      } else {
        const cfg = findPlatform(platformShortName);
        if (cfg) platformName = cfg.name || platformName;
      }

      if (!platformShortName) {
        results.errors.push({ path: p, message: "Emulator platform is required" });
      } else {
        const { row, existed } = dbUpsertEmulator({
          name: path.basename(p, path.extname(p)),
          platform: platformName,
          platformShortName,
          filePath: p
        });
        if (!existed) results.addedEmulator = row;
        else results.skipped.push({ path: p, reason: "emu_exists" });
      }
    }

    if (addGame) {
      let platformShortName = gamePsn || "pc";
      let platformName = "PC";
      if (platformShortName !== "pc") {
        const cfg = findPlatform(platformShortName);
        if (!cfg) {
          results.errors.push({ path: p, message: `Unknown game platform '${platformShortName}'` });
        } else {
          platformName = cfg.name || platformShortName;
        }
      }

      if (platformShortName) {
        const exists = games.some((g) => String(g.filePath || "").toLowerCase() === p.toLowerCase());
        if (exists) {
          results.skipped.push({ path: p, reason: "game_exists" });
        } else {
          const name = path.basename(p, path.extname(p));
          const code = inferGameCode({ name, filePath: p });
          const image = discoverCoverImageRelative(platformShortName, code, name);
          const { row, existed } = dbUpsertGame({
            name,
            platform: platformName,
            platformShortName,
            filePath: p,
            code: code || null,
            image: image || null
          });
          if (!existed) results.addedGame = row;
          else results.skipped.push({ path: p, reason: "game_exists" });
        }
      }
    }

    refreshLibraryFromDb();
    return results;
  } catch (e) {
    log.error("import-exe failed:", e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle("import-files-as-platform", async (_event, paths, platformShortName) => {
  try {
    refreshLibraryFromDb();

    const psn = String(platformShortName || "").trim().toLowerCase();
    if (!psn) return { success: false, message: "Missing platformShortName" };

    const platformConfigs = await getPlatformConfigs();
    const cfg = (platformConfigs || []).find((c) => String(c?.shortName || "").trim().toLowerCase() === psn);
    const platformName = psn === "pc" ? "PC" : (cfg?.name || "Unknown");

    const inputPaths = Array.isArray(paths) ? paths : [];
    const results = { success: true, addedGames: [], skipped: [], errors: [] };

    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;

      try {
        if (!fsSync.existsSync(p) || !fsSync.lstatSync(p).isFile()) {
          results.skipped.push({ path: p, reason: "not_a_file" });
          continue;
        }

        const exists = games.some((g) => String(g.filePath || "").toLowerCase() === p.toLowerCase());
        if (exists) {
          results.skipped.push({ path: p, reason: "game_exists" });
          continue;
        }

        const base = path.basename(p);
        const name = path.basename(base, path.extname(base));
        const code = inferGameCode({ name, filePath: p });
        const image = discoverCoverImageRelative(psn, code, name);
        const { row, existed } = dbUpsertGame({
          name,
          platform: platformName,
          platformShortName: psn,
          filePath: p,
          code: code || null,
          image: image || null
        });
        if (!existed) results.addedGames.push(row);
        else results.skipped.push({ path: p, reason: "game_exists" });
      } catch (e) {
        results.errors.push({ path: raw, message: e.message });
      }
    }

    refreshLibraryFromDb();
    return results;
  } catch (e) {
    log.error("import-files-as-platform failed:", e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle("import-paths", async (_event, paths, options = {}) => {
  try {
    refreshLibraryFromDb();

    const platformConfigs = await getPlatformConfigs();

    const inputPaths = Array.isArray(paths) ? paths : [];
    const results = {
      success: true,
      addedGames: [],
      addedEmulators: [],
      skipped: [],
      errors: []
    };

    const recursive = options && options.recursive === false ? false : true;

    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;

      try {
        const stat = fsSync.existsSync(p) ? fsSync.lstatSync(p) : null;
        if (!stat) {
          results.skipped.push({ path: p, reason: "not_found" });
          continue;
        }

        if (stat.isDirectory()) {
          const scanRes = await scanForGamesAndEmulators(p, { recursive });
          if (scanRes?.success) {
            results.addedGames.push(...(scanRes.games || []));
            results.addedEmulators.push(...(scanRes.emulators || []));
            if ((scanRes.games || []).length === 0 && (scanRes.emulators || []).length === 0) {
              results.skipped.push({ path: p, reason: "no_matches" });
            }
          }
          continue;
        }

        if (!stat.isFile()) {
          results.skipped.push({ path: p, reason: "not_a_file" });
          continue;
        }

        const lower = p.toLowerCase();
        const base = path.basename(p);

        if (lower.endsWith(".exe")) {
          const foundEmus = [];
          processEmulatorExe(p, base, platformConfigs, emulators, foundEmus);
          if (foundEmus.length > 0) {
            results.addedEmulators.push(foundEmus[0]);
          } else {
            results.skipped.push({ path: p, reason: "emu_exists_or_unmatched" });
          }
          continue;
        }

        const archiveKind = getArchiveKind(p);
        if (archiveKind) {
          const destDir = path.join(
            app.getPath("userData"),
            "imports",
            `${archiveKind}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          );

          try {
            await extractArchiveToDir(p, destDir);
          } catch (e) {
            results.skipped.push({ path: p, reason: "archive_extract_failed", message: e.message });
            continue;
          }

          const scanRes = await scanForGamesAndEmulators(destDir, { recursive: true });
          if (scanRes?.success) {
            results.addedGames.push(...(scanRes.games || []));
            results.addedEmulators.push(...(scanRes.emulators || []));
          }
          continue;
        }

        // Treat as a game file.
        const platformConfig = determinePlatformFromFilename(base, p, platformConfigs);
        if (!platformConfig) {
          results.skipped.push({ path: p, reason: "unmatched" });
          continue;
        }

        const exists = games.some((g) => String(g.filePath || "").toLowerCase() === p.toLowerCase());
        if (exists) {
          results.skipped.push({ path: p, reason: "game_exists" });
          continue;
        }

        const name = path.basename(base, path.extname(base));
        const platformShortName = platformConfig.shortName || "unknown";
        const code = inferGameCode({ name, filePath: p });
        const image = discoverCoverImageRelative(platformShortName, code, name);
        const { row, existed: existedInDb } = dbUpsertGame({
          name,
          platform: platformConfig.name || "Unknown",
          platformShortName,
          filePath: p,
          code: code || null,
          image: image || null
        });

        refreshLibraryFromDb();

        if (!existedInDb) {
          results.addedGames.push(row);
        } else {
          results.skipped.push({ path: p, reason: "game_exists" });
        }
      } catch (e) {
        results.errors.push({ path: raw, message: e.message });
      }
    }

    return results;
  } catch (e) {
    log.error("import-paths failed:", e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle("upload-theme", async (event, { author, name, themeObject, base64Image, webhookUrl }) => {
    if (!webhookUrl) {
        log.error("Upload failed: No webhook URL provided.");
        return false;
    }
    const formData = new FormData();

    // Ensure the author field is set in the theme object
    themeObject.author = author;

    // 1. Thread Metadata
    const payload = {
        content: `New theme submission: **${name}** by user **${author}**`,
        thread_name: name,
    };
    formData.append("payload_json", JSON.stringify(payload));

    // 2. Attach theme.json
    const jsonBlob = new Blob([JSON.stringify(themeObject, null, 2)], { type: "application/json" });
    formData.append("files[0]", jsonBlob, "theme.json");

    // 3. Robust Image/GIF Conversion
    try {
        let imageData;
        let mimeType = "image/png"; // Default
        let extension = "png";

        if (base64Image.includes(";base64,")) {
            // It\'s a full Data URL (e.g., data:image/gif;base64,...)
            const parts = base64Image.split(";base64,");
            mimeType = parts[0].split(":")[1];
            imageData = parts[1];
            extension = mimeType.split("/")[1];
        } else {
            // It\'s already raw Base64 data
            imageData = base64Image;
            // Attempt to guess extension or keep default
            extension = "gif"; 
            mimeType = "image/gif";
        }

        if (!imageData) {
            throw new Error("Base64 data is empty or invalid.");
        }

        // Use the filename from the themeObject if it exists, otherwise use preview
        const imageFileName = (themeObject.background && themeObject.background.image) 
            ? themeObject.background.image 
            : `preview.${extension}`;

        // The Fix: Convert the cleaned string to a Buffer
        const imageBuffer = Buffer.from(imageData, "base64");
        const imageBlob = new Blob([imageBuffer], { type: mimeType });
        
        formData.append("files[1]", imageBlob, imageFileName);
        console.log(`Successfully prepared ${imageFileName} for upload.`);

    } catch (err) {
        console.error("Image conversion failed:", err.message);
        // We can still return true if the JSON part is okay, or false to stop
    }

    try {
        const response = await fetch(webhookUrl, { method: "POST", body: formData });
        return response.ok;
    } catch (error) {
        console.error("Webhook Error:", error);
        return false;
    }
});

// Function to read all platform configuration files
async function getPlatformConfigs() {
  const platformConfigs = [];
  const platformsDir = path.join(__dirname, "./emubro-resources", "platforms");
  
  try {
    const platformDirs = await fs.readdir(platformsDir);
    
    for (const platformDir of platformDirs) {
      const configPath = path.join(platformsDir, platformDir, "config.json");
      
      try {
        if (fsSync.existsSync(configPath)) {
          const configFile = await fsSync.readFileSync(configPath, "utf8");
          const config = JSON.parse(configFile);
          // Add platform directory name for reference
          config.platformDir = platformDir;
          platformConfigs.push(config);
        }
      } catch (error) {
        log.warn(`Failed to read config file for platform ${platformDir}:`, error.message);
      }
    }
  } catch (error) {
    log.error("Failed to read platform configurations:", error);
  }
  
  return platformConfigs;
}

function determinePlatformFromFilename(filename, filePath, platformConfigs) {
  for (const config of platformConfigs) {
    if (config.searchFor) {
      if (!config.searchFor || !config.searchFor.trim()) continue;
      try {
        const regex = new RegExp(config.searchFor, "i");
        if (regex.test(filename)) {
          return config;
        }
      } catch (error) {
        log.warn(`Invalid regex pattern for platform ${config.name}:`, error.message);
      }
    }
  }
  return null;
}

function determinePlatformFromFilenameEmus(filename, filePath, platformConfigs) {
  for (const config of platformConfigs) {
    if (config.emulators) {
      for (const emulator of config.emulators) {
        if (!emulator.searchString || !emulator.searchString.trim()) continue;
        try {
          const regex = new RegExp(emulator.searchString, "i");
          if (regex.test(filename)) {
            return config;
          }
        } catch (error) {
          log.warn(`Invalid regex pattern for platform ${config.name}:`, error.message);
        }
      }
    }
  }
  return null;
}

function processEmulatorExe(itemPath, item, platformConfigs, emulators, foundEmulators) {
  const platformConfigEmus = determinePlatformFromFilenameEmus(item, itemPath, platformConfigs);
  if (platformConfigEmus) {
    const filePath = String(itemPath || "").trim();
    if (!filePath) return;

    // De-dupe by file path (same emulator discovered multiple times).
    const exists = emulators.some((e) => String(e.filePath || "").toLowerCase() === filePath.toLowerCase());
    if (exists) return;

    const emulator = {
      name: path.basename(item, path.extname(item)),
      platform: platformConfigEmus.name || "Unknown",
      platformShortName: platformConfigEmus.shortName || "unknown",
      filePath
    };

    const { row, existed: existedInDb } = dbUpsertEmulator(emulator);
    if (!existedInDb) {
      log.info(`Emulator added: ${row.name} for platform ${row.platformShortName} at ${row.filePath}`);
      foundEmulators.push(row);
    } else {
      log.info(`Emulator already exists: ${row.name} at ${row.filePath}`);
    }

    refreshLibraryFromDb();
  }
}

ipcMain.handle("get-user-info", async () => {
  return {
    username: "Bro",
    avatar: "./logo.png",
    level: 25,
    xp: 12500,
    friends: 128
  };
});

ipcMain.handle("open-file-dialog", async (event, options) => {
  if (!mainWindow) return { canceled: true };
  return await dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle("get-library-stats", async () => {
  const totalGames = games.length;
  const installedGames = games.filter(game => game.isInstalled).length;
  const totalPlayTime = Math.floor(Math.random() * 1000) + 500; // Random play time between 500-1500 hours
  
  return {
    totalGames,
    installedGames,
    totalPlayTime,
    recentlyPlayed: [
      { id: 1, name: "Super Mario Bros 3", playTime: 45 },
      { id: 4, name: "Super Metroid", playTime: 32 },
      { id: 2, name: "The Legend of Zelda: A Link to the Past", playTime: 28 }
    ]
  };
});

// Handle app quit
app.on("before-quit", () => {
  log.info("Application is quitting");
});

// Monitor Tool Functionality
const multiMonitorToolPath = path.join(__dirname, "resources", "MultiMonitorTool.exe");

async function getMonitors() {
  return new Promise((resolve) => {
    const tempPath = path.join(os.tmpdir(), `monitors_${Date.now()}.csv`);
    
    execFile(multiMonitorToolPath, ["/scomma", tempPath], (error) => {
      if (error) {
        log.error("Failed to run MultiMonitorTool:", error);
        resolve([]);
        return;
      }

      try {
        if (fsSync.existsSync(tempPath)) {
          const content = fsSync.readFileSync(tempPath, 'utf8');
          fsSync.unlinkSync(tempPath);
          
          const lines = content.trim().split('\n');
          if (lines.length < 2) {
            resolve([]);
            return;
          }

          // Header: Name, Monitor ID, ...
          const headers = lines[0].split(',').map(h => h.trim());
          const monitors = [];

          for (let i = 1; i < lines.length; i++) {
            // Simple split handling (assuming no commas in values for this tool)
            const values = lines[i].split(',').map(v => v.trim());
            const monitor = {};
            headers.forEach((h, idx) => {
              if (idx < values.length) monitor[h] = values[idx];
            });
            
            monitors.push({
              id: monitor['Name'] || `Monitor ${i}`,
              name: monitor['Name'],
              deviceId: monitor['Monitor ID'] || monitor['Name'],
              width: parseInt(monitor['Width']) || 0,
              height: parseInt(monitor['Height']) || 0,
              isPrimary: monitor['Primary'] === 'Yes',
              orientation: parseInt(monitor['Orientation']) || 0,
              connected: monitor['Active'] === 'Yes'
            });
          }
          resolve(monitors);
        } else {
          resolve([]);
        }
      } catch (err) {
        log.error("Error parsing monitor info:", err);
        resolve([]);
      }
    });
  });
}

ipcMain.handle("get-monitor-info", async () => {
  return await getMonitors();
});

ipcMain.handle("detect-monitors", async () => {
  // Can interpret as refresh
  return await getMonitors();
});

ipcMain.handle("set-monitor-orientation", async (event, monitorIndex, orientation) => {
  try {
    const monitors = await getMonitors();
    if (monitorIndex >= 0 && monitorIndex < monitors.length) {
      const monitor = monitors[monitorIndex];
      return new Promise((resolve) => {
        // /SetOrientation <Monitor> <Orientation>
        execFile(multiMonitorToolPath, ["/SetOrientation", monitor.id, orientation.toString()], (error) => {
          if (error) {
            resolve({ success: false, message: error.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    }
    return { success: false, message: "Monitor index out of range" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("toggle-monitor-orientation", async (event, monitorIndex, targetOrientation) => {
  try {
    const monitors = await getMonitors();
    if (monitorIndex >= 0 && monitorIndex < monitors.length) {
        const monitor = monitors[monitorIndex];
        // If current is target, switch to 0 (normal), else switch to target
        // Logic: Toggle usually means A <-> B. User requested "landscape/portrait".
        // Assuming targetOrientation is the "Active" state (e.g. 90/portrait).
        // If already 90, go to 0. If 0, go to 90.
        
        // Wait, the UI passes 0 or 90.
        // If I pass 90 (Portrait), and it's already 90, I might want to go back to 0?
        // Let's implement simple set first. The user said "do landscape/portrait".
        // The UI button says "Toggle Landscape" (passes 0) and "Toggle Portrait" (passes 90).
        // Wait, "Toggle Landscape" -> 0? Landscape is usually 0 or 90?
        // Standard: 0 = Landscape, 90 = Portrait, 180 = Landscape Flipped, 270 = Portrait Flipped.
        // So Toggle Landscape (0) means set to 0. Toggle Portrait (90) means set to 90.
        // The UI implementation:
        // this.toggleMonitorOrientation(1, 0) -> Set to 0?
        // this.toggleMonitorOrientation(1, 90) -> Set to 90?
        
        // Let's assume it's just "Set". If it's "Toggle", it implies checking current state.
        // I will trust the "targetOrientation" as the desired state.
        
        return new Promise((resolve) => {
          execFile(multiMonitorToolPath, ["/SetOrientation", monitor.id, targetOrientation.toString()], (error) => {
            if (error) {
              resolve({ success: false, message: error.message });
            } else {
              resolve({ success: true });
            }
          });
        });
    }
    return { success: false, message: "Monitor index out of range" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("set-monitor-display-state", async (event, monitorIndex, state) => {
  try {
    const monitors = await getMonitors();
    if (monitorIndex >= 0 && monitorIndex < monitors.length) {
      const monitor = monitors[monitorIndex];
      const command = state === 'enable' ? '/Enable' : '/Disable';
      
      return new Promise((resolve) => {
        execFile(multiMonitorToolPath, [command, monitor.id], (error) => {
          if (error) {
            resolve({ success: false, message: error.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    }
    return { success: false, message: "Monitor index out of range" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

ipcMain.handle("set-primary-monitor", async (event, monitorIndex) => {
  try {
    const monitors = await getMonitors();
    if (monitorIndex >= 0 && monitorIndex < monitors.length) {
      const monitor = monitors[monitorIndex];
      return new Promise((resolve) => {
        execFile(multiMonitorToolPath, ["/SetPrimary", monitor.id], (error) => {
          if (error) {
            resolve({ success: false, message: error.message });
          } else {
            resolve({ success: true });
          }
        });
      });
    }
    return { success: false, message: "Monitor index out of range" };
  } catch (error) {
    return { success: false, message: error.message };
  }
});

// Memory card reader functionality
ipcMain.handle("read-memory-card", async (event, cardPath) => {
  return await ps1Handler.readCard(cardPath);
});

ipcMain.handle("delete-save", async (event, { filePath, slot }) => {
  return await ps1Handler.deleteSave(filePath, slot);
});

ipcMain.handle("rename-save", async (event, { filePath, slot, newName }) => {
  return await ps1Handler.renameSave(filePath, slot, newName);
});

ipcMain.handle("format-card", async (event, filePath) => {
  return await ps1Handler.formatCard(filePath);
});

function parsePS2MemoryCard(buffer) {
  const magic = buffer.toString("ascii", 0, 28);
  if (magic !== "Sony PS2 Memory Card Format ") {
    return { success: false, message: "Invalid PS2 Memory Card format" };
  }

  const pageSize = buffer.readUInt16LE(0x28);
  const pagesPerBlock = buffer.readUInt16LE(0x2A);
  const pagesPerCluster = buffer.readUInt16LE(0x2C);
  
  return {
    success: true,
    data: {
      format: "PlayStation 2",
      totalSize: buffer.length,
      pageSize: pageSize,
      pagesPerBlock: pagesPerBlock,
      pagesPerCluster: pagesPerCluster,
      message: "PS2 Card identified. Detailed directory parsing coming soon."
    }
  };
}

ipcMain.handle("browse-memory-cards", async (event, selectedDrive) => {
  try {
    log.info("Starting memory card search in:", selectedDrive);
    const foundCards = [];
    const extensions = [".mcr", ".mcd", ".gme", ".ps2", ".max", ".psu"];
    
    async function scan(dir) {
      try {
        const items = await fs.readdir(dir).catch(() => []);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          try {
            const stat = await fs.lstat(itemPath);
            if (stat.isDirectory()) {
              if (!item.startsWith("$") && !item.startsWith(".")) {
                await scan(itemPath);
              }
            } else if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (extensions.includes(ext)) {
                foundCards.push({
                  name: item,
                  path: itemPath,
                  size: stat.size,
                  modified: stat.mtime
                });
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    let searchPath = selectedDrive;
    if (os.platform() === "win32" && searchPath && searchPath.length === 2 && searchPath.endsWith(":")) {
      searchPath += "\\";
    }
    
    if (!searchPath) {
      searchPath = os.homedir();
    }

    await scan(searchPath);
    return { success: true, cards: foundCards };
  } catch (error) {
    log.error("Failed to browse memory cards:", error);
    return { success: false, message: error.message };
  }
});
