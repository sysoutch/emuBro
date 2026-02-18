const path = require("path");
const Database = require("better-sqlite3");

function createLibraryDbService(deps = {}) {
  const {
    app,
    fsSync,
    log,
    appRootDir
  } = deps;

  if (!app) throw new Error("createLibraryDbService requires app");
  if (!fsSync) throw new Error("createLibraryDbService requires fsSync");
  if (!log) throw new Error("createLibraryDbService requires log");

  const rootDir = String(appRootDir || app.getAppPath() || "").trim() || process.cwd();
  let dbRef = null;
  let games = [];
  let emulators = [];

  function normalizePlatform(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function getDb() {
    if (dbRef) return dbRef;

    const dbPath = path.join(app.getPath("userData"), "library.db");
    fsSync.mkdirSync(path.dirname(dbPath), { recursive: true });
    dbRef = new Database(dbPath);

    dbRef.pragma("journal_mode = WAL");
    dbRef.pragma("foreign_keys = ON");

    dbRef.exec(`
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
      const gameColumns = dbRef.prepare("PRAGMA table_info(games)").all();
      const hasOverrideColumn = gameColumns.some((col) => String(col?.name || "").trim().toLowerCase() === "emulatoroverridepath");
      if (!hasOverrideColumn) {
        dbRef.exec("ALTER TABLE games ADD COLUMN emulatorOverridePath TEXT");
      }
    } catch (error) {
      log.error("Failed to migrate games table:", error);
    }

    return dbRef;
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
    return { games, emulators };
  }

  function getGamesState() {
    return games;
  }

  function getEmulatorsState() {
    return emulators;
  }

  function inferGameCode(game) {
    const direct = (game && (game.code || game.productCode || game.serial || game.gameCode));
    if (direct) return String(direct).trim();

    const hay = `${game?.name || ""} ${path.basename(game?.filePath || "")}`;
    const match = hay.toUpperCase().match(/\b([A-Z]{4})[-_ ]?(\d{3})[.\-_ ]?(\d{2})\b|\b([A-Z]{4})[-_ ]?(\d{5})\b/);
    if (!match) return "";

    if (match[1] && match[2] && match[3]) return `${match[1]}-${match[2]}${match[3]}`;
    if (match[4] && match[5]) return `${match[4]}-${match[5]}`;
    return "";
  }

  function discoverCoverImageRelative(platformShortName, code, name) {
    const psn = normalizePlatform(platformShortName);
    if (!psn) return "";

    const coversDir = path.join(rootDir, "emubro-resources", "platforms", psn, "covers");
    if (!fsSync.existsSync(coversDir)) return "";

    const exts = [".jpg", ".jpeg", ".png", ".webp"];
    const candidates = [];

    const addBase = (base) => {
      const cleanBase = String(base || "").trim();
      if (!cleanBase) return;
      for (const ext of exts) candidates.push(cleanBase + ext);
    };

    if (code) {
      const cleanCode = String(code).trim();
      addBase(cleanCode);
      addBase(cleanCode.toLowerCase());
      addBase(cleanCode.toUpperCase());
      addBase(cleanCode.replace(/[_\s]/g, "-"));
      addBase(cleanCode.replace(/[-_.\s]/g, ""));
    }

    if (name) {
      const cleanName = String(name).trim();
      const slug = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      addBase(slug);
      addBase(cleanName);
    }

    for (const file of candidates) {
      const abs = path.join(coversDir, file);
      if (fsSync.existsSync(abs)) {
        return path.posix.join("emubro-resources", "platforms", psn, "covers", file);
      }
    }

    return "";
  }

  function findGameByPlatformAndCodeOrName(payload) {
    const platform = normalizePlatform(payload?.platform);
    const code = String(payload?.code || "").trim();
    const name = String(payload?.name || "").trim();

    const candidates = games.filter((game) => {
      const shortName = normalizePlatform(game?.platformShortName);
      const platformName = normalizePlatform(game?.platform);
      const altPlatformName = normalizePlatform(game?.platformName);
      return platform && (shortName === platform || platformName === platform || altPlatformName === platform);
    });

    if (code) {
      const codeNorm = code.toUpperCase().replace(/[_\s]/g, "-");

      const byField = candidates.find((game) => {
        const gameCode = inferGameCode(game);
        if (!gameCode) return false;
        const gameNorm = gameCode.toUpperCase().replace(/[_\s]/g, "-");
        return gameNorm === codeNorm;
      });
      if (byField) return byField;

      const byText = candidates.find((game) => {
        const hay = `${game?.name || ""} ${path.basename(game?.filePath || "")}`.toUpperCase();
        return hay.includes(codeNorm);
      });
      if (byText) return byText;
    }

    if (name) {
      const nameNorm = normalizeName(name);

      const exact = candidates.find((game) => normalizeName(game?.name) === nameNorm);
      if (exact) return exact;

      const fuzzy = candidates.find((game) => {
        const gameName = normalizeName(game?.name);
        return gameName && (gameName.includes(nameNorm) || nameNorm.includes(gameName));
      });
      if (fuzzy) return fuzzy;
    }

    return null;
  }

  return {
    getDb,
    dbLoadGames,
    dbLoadEmulators,
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
  };
}

module.exports = {
  createLibraryDbService
};
