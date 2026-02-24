const path = require("path");

const KNOWN_CATALOG_FILES = new Set([
  "3ds",
  "dc",
  "gb",
  "gba",
  "gbc",
  "n64",
  "nds",
  "nes",
  "ps2",
  "ps3",
  "psp",
  "psx",
  "scummvm",
  "snes",
  "switch",
  "wiiu"
]);

const PLATFORM_FILE_ALIASES = Object.freeze({
  "3ds": "3ds",
  "dc": "dc",
  "dreamcast": "dc",
  "gb": "gb",
  "gameboy": "gb",
  "gameboyclassic": "gb",
  "gameboycolor": "gbc",
  "gbc": "gbc",
  "gba": "gba",
  "gameboyadvance": "gba",
  "n64": "n64",
  "nintendo64": "n64",
  "nds": "nds",
  "nintendods": "nds",
  "nes": "nes",
  "ps": "psx",
  "ps1": "psx",
  "psx": "psx",
  "playstation": "psx",
  "playstation1": "psx",
  "sonyplaystation": "psx",
  "ps2": "ps2",
  "playstation2": "ps2",
  "sonyplaystation2": "ps2",
  "ps3": "ps3",
  "playstation3": "ps3",
  "sonyplaystation3": "ps3",
  "psp": "psp",
  "playstationportable": "psp",
  "scummvm": "scummvm",
  "snes": "snes",
  "supernintendo": "snes",
  "switch": "switch",
  "nintendoswitch": "switch",
  "wiiu": "wiiu",
  "wii-u": "wiiu",
  "nintendowiiu": "wiiu"
});

function createGameListService(deps = {}) {
  const {
    app,
    fsSync,
    log,
    appRootDir
  } = deps;

  if (!app) throw new Error("createGameListService requires app");
  if (!fsSync) throw new Error("createGameListService requires fsSync");
  if (!log) throw new Error("createGameListService requires log");

  const rootDir = String(appRootDir || app.getAppPath() || "").trim() || process.cwd();
  const catalogCache = new Map();

  function normalizePathKey(value) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (process.platform === "win32") return text.toLowerCase();
    return text;
  }

  function normalizePlatformToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function normalizeLookupText(value, options = {}) {
    const stripBracketContent = !!options.stripBracketContent;
    let text = String(value || "").replace(/\uFEFF/g, "").trim();
    if (!text) return "";

    if (stripBracketContent) {
      text = text
        .replace(/\([^)]*\)/g, " ")
        .replace(/\[[^\]]*\]/g, " ")
        .replace(/\{[^}]*\}/g, " ");
    }

    text = text
      .replace(/\.[a-z0-9]{1,5}$/i, " ")
      .replace(/\b(disc|disk|cd)\s*[0-9ivx]+\b/gi, " ")
      .replace(/[_\-]+/g, " ")
      .replace(/['`]+/g, "")
      .replace(/[^a-z0-9]+/gi, " ")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    return text;
  }

  function buildLookupKeys(value) {
    const out = [];
    const seen = new Set();
    const add = (candidate) => {
      const normalized = String(candidate || "").trim();
      if (!normalized) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      out.push(normalized);

      const compact = normalized.replace(/\s+/g, "");
      if (compact && !seen.has(compact)) {
        seen.add(compact);
        out.push(compact);
      }

      if (normalized.startsWith("the ")) {
        const withoutArticle = normalized.slice(4).trim();
        if (withoutArticle && !seen.has(withoutArticle)) {
          seen.add(withoutArticle);
          out.push(withoutArticle);
        }
      }
    };

    add(normalizeLookupText(value, { stripBracketContent: false }));
    add(normalizeLookupText(value, { stripBracketContent: true }));
    return out;
  }

  function normalizeGameCode(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";

    const normalized = raw
      .replace(/[^A-Z0-9-]+/g, "")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!normalized) return "";

    const compact = normalized.replace(/-/g, "");
    const serialMatch = compact.match(/^([A-Z]{4})(\d{3,7})$/);
    if (serialMatch) return `${serialMatch[1]}-${serialMatch[2]}`;

    const dashedSerialMatch = normalized.match(/^([A-Z]{4})-(\d{3,7})$/);
    if (dashedSerialMatch) return `${dashedSerialMatch[1]}-${dashedSerialMatch[2]}`;

    return normalized;
  }

  function getCatalogRoots() {
    const out = [];
    const seen = new Set();
    const addRoot = (value) => {
      const candidate = String(value || "").trim();
      if (!candidate) return;
      const absolute = path.resolve(candidate);
      const key = normalizePathKey(absolute);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(absolute);
    };

    const envRoot = String(process.env.EMUBRO_GAMELIST_DIR || "").trim();
    if (envRoot) addRoot(envRoot);

    addRoot(path.join(app.getPath("userData"), "gamelist"));
    addRoot(path.join(rootDir, "gamelist"));
    addRoot(path.join(app.getAppPath(), "gamelist"));
    addRoot(path.join(process.cwd(), "gamelist"));

    return out;
  }

  function resolveCatalogFileKey(platformShortName = "", platformName = "") {
    const shortToken = normalizePlatformToken(platformShortName);
    const nameToken = normalizePlatformToken(platformName);
    const candidates = [shortToken, nameToken].filter(Boolean);

    for (const candidate of candidates) {
      const alias = PLATFORM_FILE_ALIASES[candidate];
      if (alias) return alias;
      if (KNOWN_CATALOG_FILES.has(candidate)) return candidate;
    }

    return "";
  }

  function readJson(filePath) {
    const raw = String(fsSync.readFileSync(filePath, "utf8") || "").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  }

  function readCatalog(fileKey) {
    const cacheKey = String(fileKey || "").trim().toLowerCase();
    if (!cacheKey) return null;
    if (catalogCache.has(cacheKey)) return catalogCache.get(cacheKey);

    const roots = getCatalogRoots();
    let sourcePath = "";
    for (const root of roots) {
      const candidate = path.join(root, `${cacheKey}.json`);
      if (fsSync.existsSync(candidate)) {
        sourcePath = candidate;
        break;
      }
    }

    if (!sourcePath) {
      catalogCache.set(cacheKey, null);
      return null;
    }

    try {
      const rows = readJson(sourcePath);
      const list = Array.isArray(rows) ? rows : [];
      const exactByKey = new Map();

      list.forEach((row) => {
        const gameName = String(
          row?.game_name
          || row?.name
          || row?.title
          || row?.game
          || row?.gameName
          || ""
        ).trim();
        if (!gameName) return;

        const code = normalizeGameCode(
          row?.game_gameCode
          || row?.gameCode
          || row?.serial
          || row?.code
          || row?.productCode
          || ""
        );
        const keys = buildLookupKeys(gameName);
        if (!keys.length) return;

        const entry = { gameName, code };
        keys.forEach((key) => {
          const existing = exactByKey.get(key);
          if (!existing) {
            exactByKey.set(key, entry);
            return;
          }
          if (!existing.code && code) {
            exactByKey.set(key, entry);
          }
        });
      });

      const catalog = {
        fileKey: cacheKey,
        sourcePath,
        exactByKey
      };
      catalogCache.set(cacheKey, catalog);
      return catalog;
    } catch (error) {
      log.warn(`Failed to read gamelist catalog '${cacheKey}' from ${sourcePath}:`, error?.message || error);
      catalogCache.set(cacheKey, null);
      return null;
    }
  }

  function buildNameCandidates(payload = {}) {
    const out = [];
    const seen = new Set();
    const add = (value) => {
      const text = String(value || "").trim();
      if (!text) return;
      if (seen.has(text)) return;
      seen.add(text);
      out.push(text);
    };

    add(payload.gameName);
    add(payload.fileName);
    const filePath = String(payload.filePath || "").trim();
    if (filePath) {
      const base = path.basename(filePath);
      add(base);
      add(path.basename(base, path.extname(base)));
    }
    return out;
  }

  function lookupGameCode(payload = {}) {
    const fileKey = resolveCatalogFileKey(payload.platformShortName, payload.platformName);
    if (!fileKey) return null;

    const catalog = readCatalog(fileKey);
    if (!catalog || !catalog.exactByKey || catalog.exactByKey.size === 0) return null;

    const names = buildNameCandidates(payload);
    for (const name of names) {
      const keys = buildLookupKeys(name);
      for (const key of keys) {
        const entry = catalog.exactByKey.get(key);
        if (!entry) continue;
        const code = normalizeGameCode(entry.code);
        if (!code) continue;
        return {
          code,
          matchedName: entry.gameName,
          platformFile: fileKey,
          sourcePath: catalog.sourcePath
        };
      }
    }

    return null;
  }

  function clearCache() {
    catalogCache.clear();
  }

  return {
    lookupGameCode,
    resolveCatalogFileKey,
    getCatalogRoots,
    clearCache
  };
}

module.exports = {
  createGameListService
};
