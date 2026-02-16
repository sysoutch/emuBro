const { app, BrowserWindow, Menu, ipcMain, dialog, shell, nativeImage } = require("electron");
const path = require("path");
const log = require("electron-log");
const Store = require("electron-store");
const Database = require("better-sqlite3");
const fs = require("fs").promises;
const fsSync = require("fs");
const os = require("os");
const { execFile, spawnSync } = require("child_process");

// Import handlers
const ps1Handler = require("./ps1-handler");

// Initialize the store for app settings
const store = new Store();

let mainWindow;
let games = [];
let emulators = [];
const screen = require("electron").screen;

let _db = null;

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
  if (process.platform !== "win32") {
    throw new Error("ZIP extraction is only implemented on Windows for now");
  }

  fsSync.mkdirSync(destDir, { recursive: true });

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

function launchGameObject(game) {
  const gamePath = game?.filePath;
  const emuPath = emulators.find((emu) => emu.platformShortName === game.platformShortName)?.filePath;

  if (!emuPath) {
    log.error(`No emulator found for platform ${game.platformShortName}`);
    return { success: false, message: "Emulator not found for this game" };
  }
  if (!fsSync.existsSync(emuPath)) {
    log.error(`Emulator executable not found at path: ${emuPath}`);
    return { success: false, message: "Emulator executable not found" };
  }
  if (!gamePath || !fsSync.existsSync(gamePath)) {
    log.error(`Game file not found at path: ${gamePath}`);
    return { success: false, message: "Game file not found" };
  }

  const { spawn } = require("child_process");
  try {
    const child = spawn(emuPath, [gamePath], { stdio: "ignore" });
    child.on("error", (e) => log.error(`Error launching game ${game.name}:`, e));
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

    return { success: true, message: "Game launched successfully" };
  } catch (e) {
    log.error(`Error launching game ${game.name}:`, e);
    if (mainWindow) mainWindow.restore();
    return { success: false, message: "Failed to execute launch command" };
  }
}

// Create the main window
function createWindow() {
  const isWin = process.platform === "win32";

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, "icon.png"),
    // Custom chrome on Windows so we can style the top bar + show glow inside the app.
      ...(isWin
        ? {
            frame: false,
            thickFrame: true,
            autoHideMenuBar: true,
            // Windows 11: request rounded corners for frameless windows.
            roundedCorners: true
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

  // Load the main HTML file
  mainWindow.loadFile("index.html");

  // If we received a deep link before the renderer was ready, flush it now.
  mainWindow.webContents.on("did-finish-load", () => {
    flushPendingDeepLinks();
    try {
      mainWindow.webContents.send("window:maximized-changed", mainWindow.isMaximized());
    } catch (_e) {}
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

async function readLocaleJson(filename) {
  const f = normalizeLocaleFilename(filename);
  const userPath = path.join(getUserLocalesDir(), f);
  const appPath = path.join(getAppLocalesDir(), f);

  const p = fsSync.existsSync(userPath) ? userPath : appPath;
  const content = await fs.readFile(p, 'utf8');
  return JSON.parse(content);
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
      const json = JSON.parse(content);
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
      const json = JSON.parse(content);
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

// Initialize the application
app.whenReady().then(() => {
  // Load persisted library before the renderer requests it.
  try {
    refreshLibraryFromDb();
  } catch (e) {
    log.error("Failed to load library database:", e);
  }

  createWindow();
  createMenu();
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
    app.quit();
  });
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

ipcMain.handle("remove-game", async (event, gameId) => {
  try {
    const game = games.find(g => g.id === gameId);
    if (game) {
      game.isInstalled = false;
      game.progress = 0;
      log.info(`Game ${game.name} removed`);
      return { success: true, message: "Removal started successfully" };
    }
    return { success: false, message: "Game not found" };
  } catch (error) {
    log.error(`Failed to remove game ${gameId}:`, error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("launch-game", async (event, gameId) => {
  try {
    const game = games.find(g => g.id === gameId);
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

ipcMain.handle("get-emulators", async () => {
  try {
    refreshLibraryFromDb();
  } catch (_e) {}
  return emulators;
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

            if (itemPath.toLowerCase().endsWith(".exe")) {
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
