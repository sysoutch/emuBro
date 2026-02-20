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
  let tags = [];

  function normalizePlatform(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeTagId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function toTitleCaseFromSlug(value) {
    return String(value || "")
      .split("-")
      .map((part) => part ? (part.charAt(0).toUpperCase() + part.slice(1)) : "")
      .join(" ")
      .trim();
  }

  function normalizeTagList(tagsInput) {
    const rows = Array.isArray(tagsInput) ? tagsInput : [];
    const out = [];
    const seen = new Set();
    for (const raw of rows) {
      const tagId = normalizeTagId(raw);
      if (!tagId || seen.has(tagId)) continue;
      seen.add(tagId);
      out.push(tagId);
    }
    return out;
  }

  function parseTagsColumn(rawValue) {
    if (Array.isArray(rawValue)) return normalizeTagList(rawValue);
    const text = String(rawValue || "").trim();
    if (!text) return [];
    try {
      const parsed = JSON.parse(text);
      return normalizeTagList(parsed);
    } catch (_error) {
      return [];
    }
  }

  function hydrateGameRow(row) {
    if (!row || typeof row !== "object") return row;
    return {
      ...row,
      tags: parseTagsColumn(row.tags)
    };
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
        tags TEXT,
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

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        label TEXT,
        source TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_games_platform ON games(platformShortName);
      CREATE INDEX IF NOT EXISTS idx_emus_platform ON emulators(platformShortName);
      CREATE INDEX IF NOT EXISTS idx_tags_label ON tags(label COLLATE NOCASE);
    `);

    try {
      const gameColumns = dbRef.prepare("PRAGMA table_info(games)").all();
      const hasOverrideColumn = gameColumns.some((col) => String(col?.name || "").trim().toLowerCase() === "emulatoroverridepath");
      if (!hasOverrideColumn) {
        dbRef.exec("ALTER TABLE games ADD COLUMN emulatorOverridePath TEXT");
      }
      const hasTagsColumn = gameColumns.some((col) => String(col?.name || "").trim().toLowerCase() === "tags");
      if (!hasTagsColumn) {
        dbRef.exec("ALTER TABLE games ADD COLUMN tags TEXT");
      }
    } catch (error) {
      log.error("Failed to migrate games table:", error);
    }

    return dbRef;
  }

  function dbLoadGames() {
    const db = getDb();
    return db
      .prepare("SELECT * FROM games ORDER BY name COLLATE NOCASE")
      .all()
      .map((row) => hydrateGameRow(row));
  }

  function dbLoadEmulators() {
    const db = getDb();
    return db.prepare("SELECT * FROM emulators ORDER BY name COLLATE NOCASE").all();
  }

  function dbLoadTags() {
    const db = getDb();
    return db.prepare("SELECT id, label, source, createdAt, updatedAt FROM tags ORDER BY COALESCE(label, id) COLLATE NOCASE").all()
      .map((row) => {
        const id = normalizeTagId(row?.id);
        if (!id) return null;
        return {
          id,
          label: String(row?.label || "").trim() || toTitleCaseFromSlug(id),
          source: String(row?.source || "").trim() || "db",
          createdAt: row?.createdAt || null,
          updatedAt: row?.updatedAt || null
        };
      })
      .filter(Boolean);
  }

  function dbUpsertTags(rows, options = {}) {
    const list = Array.isArray(rows) ? rows : [];
    if (list.length === 0) return [];

    const sourceDefault = String(options?.source || "user").trim() || "user";
    const forceLabel = !!options?.forceLabel;
    const forceSource = !!options?.forceSource;
    const deduped = [];
    const seen = new Set();
    list.forEach((row) => {
      const id = normalizeTagId(typeof row === "string" ? row : row?.id);
      if (!id || seen.has(id)) return;
      seen.add(id);
      const providedLabel = typeof row === "string"
        ? ""
        : String(row?.label || "").trim();
      deduped.push({
        id,
        label: providedLabel || toTitleCaseFromSlug(id),
        source: String(typeof row === "string" ? sourceDefault : (row?.source || sourceDefault)).trim() || sourceDefault
      });
    });
    if (!deduped.length) return [];

    const db = getDb();
    const tx = db.transaction((entries) => {
      const labelExpr = forceLabel
        ? "excluded.label"
        : `CASE
            WHEN tags.label IS NULL OR trim(tags.label) = '' THEN excluded.label
            WHEN tags.label = tags.id AND excluded.label <> excluded.id THEN excluded.label
            ELSE tags.label
          END`;
      const sourceExpr = forceSource
        ? "excluded.source"
        : `CASE
            WHEN tags.source IS NULL OR trim(tags.source) = '' THEN excluded.source
            WHEN tags.source = 'resource' AND excluded.source <> 'resource' THEN tags.source
            ELSE excluded.source
          END`;
      const stmt = db.prepare(`
        INSERT INTO tags (id, label, source, updatedAt)
        VALUES (@id, @label, @source, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          label = ${labelExpr},
          source = ${sourceExpr},
          updatedAt = CURRENT_TIMESTAMP
      `);
      entries.forEach((entry) => stmt.run(entry));
    });
    tx(deduped);
    tags = dbLoadTags();
    return deduped;
  }

  function dbGetGameById(id) {
    const db = getDb();
    return hydrateGameRow(db.prepare("SELECT * FROM games WHERE id = ?").get(id));
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

    if (Object.prototype.hasOwnProperty.call(patch, "tags")) {
      const tags = normalizeTagList(patch.tags);
      sets.push("tags = @tags");
      params.tags = tags.length > 0 ? JSON.stringify(tags) : null;
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

    return { row: hydrateGameRow(row), existed };
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
    tags = dbLoadTags();
    return { games, emulators, tags };
  }

  function getGamesState() {
    return games;
  }

  function getEmulatorsState() {
    return emulators;
  }

  function getTagsState() {
    return tags;
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
    dbLoadTags,
    dbUpsertTags,
    dbUpsertGame,
    dbUpsertEmulator,
    refreshLibraryFromDb,
    getGamesState,
    getEmulatorsState,
    getTagsState,
    normalizePlatform,
    inferGameCode,
    discoverCoverImageRelative,
    findGameByPlatformAndCodeOrName
  };
}

module.exports = {
  createLibraryDbService
};
