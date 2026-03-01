function registerLocalesIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const app = deps.app;
  const store = deps.store || null;
  const fs = deps.fs;
  const fsSync = deps.fsSync;
  const path = deps.path;
  const log = deps.log || console;
  const appRootDir = String(deps.appRootDir || "").trim();

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerLocalesIpc requires ipcMain");
  }
  if (!app || !fs || !fsSync || !path) {
    throw new Error("registerLocalesIpc requires app/fs/fsSync/path");
  }
  if (!appRootDir) {
    throw new Error("registerLocalesIpc requires appRootDir");
  }

  const LOCALE_FILENAME_RE = /^[a-z]{2,3}\.json$/i;
  const FLAG_CODE_RE = /^[a-z]{2}$/i;
  const DEFAULT_LOCALES_REPO_MANIFEST_URL = "https://raw.githubusercontent.com/sysoutch/emubro-locales/master/manifest.json";
  const LOCALES_REPO_MANIFEST_URL_KEY = "locales:repo-manifest-url:v1";

  function normalizeLocaleFilename(filename) {
    const f = String(filename || "").trim();
    if (!LOCALE_FILENAME_RE.test(f)) {
      throw new Error(`Invalid locale filename '${filename}'. Expected e.g. en.json`);
    }
    return f.toLowerCase();
  }

  function getAppLocalesDir() {
    return path.join(appRootDir, "locales");
  }

  function getUserLocalesDir() {
    const dir = path.join(app.getPath("userData"), "locales");
    try {
      fsSync.mkdirSync(dir, { recursive: true });
    } catch (_e) {}
    return dir;
  }

  function getUserFlagsDir() {
    const dir = path.join(getUserLocalesDir(), "flags");
    try {
      fsSync.mkdirSync(dir, { recursive: true });
    } catch (_e) {}
    return dir;
  }

  function normalizeRepoManifestUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) return DEFAULT_LOCALES_REPO_MANIFEST_URL;
    if (!/^https?:\/\//i.test(value)) {
      throw new Error("Manifest URL must start with http:// or https://");
    }
    return value;
  }

  function getLocalesRepoManifestUrl() {
    if (!store || typeof store.get !== "function") return DEFAULT_LOCALES_REPO_MANIFEST_URL;
    return normalizeRepoManifestUrl(store.get(LOCALES_REPO_MANIFEST_URL_KEY, DEFAULT_LOCALES_REPO_MANIFEST_URL));
  }

  function setLocalesRepoManifestUrl(rawUrl) {
    const normalized = normalizeRepoManifestUrl(rawUrl);
    if (store && typeof store.set === "function") {
      store.set(LOCALES_REPO_MANIFEST_URL_KEY, normalized);
    }
    return normalized;
  }

  function normalizeCatalogEntry(entry = {}) {
    const code = String(entry?.code || "").trim().toLowerCase();
    const localeUrl = String(entry?.localeUrl || "").trim();
    const name = String(entry?.name || "").trim();
    const abbreviation = String(entry?.abbreviation || "").trim();
    const flag = String(entry?.flag || "").trim().toLowerCase();
    const flagUrl = String(entry?.flagUrl || "").trim();
    if (!/^[a-z]{2,3}$/.test(code)) return null;
    if (!/^https?:\/\//i.test(localeUrl)) return null;
    return {
      code,
      name: name || code.toUpperCase(),
      abbreviation: abbreviation || code.toUpperCase(),
      flag: FLAG_CODE_RE.test(flag) ? flag : "us",
      localeUrl,
      flagUrl: /^https?:\/\//i.test(flagUrl) ? flagUrl : ""
    };
  }

  async function fetchJsonFromUrl(url) {
    const targetUrl = String(url || "").trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      throw new Error("Invalid URL");
    }
    if (typeof fetch !== "function") {
      throw new Error("Fetch API is not available in this runtime");
    }
    const response = await fetch(targetUrl, { method: "GET", redirect: "follow", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${targetUrl}`);
    }
    return await response.json();
  }

  async function fetchTextFromUrl(url) {
    const targetUrl = String(url || "").trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      throw new Error("Invalid URL");
    }
    if (typeof fetch !== "function") {
      throw new Error("Fetch API is not available in this runtime");
    }
    const response = await fetch(targetUrl, { method: "GET", redirect: "follow", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${targetUrl}`);
    }
    return await response.text();
  }

  async function fetchLocalesCatalog(manifestUrl = "") {
    const normalizedManifestUrl = normalizeRepoManifestUrl(manifestUrl || getLocalesRepoManifestUrl());
    const raw = await fetchJsonFromUrl(normalizedManifestUrl);
    const packages = Array.isArray(raw?.packages) ? raw.packages.map(normalizeCatalogEntry).filter(Boolean) : [];
    return {
      manifestUrl: normalizedManifestUrl,
      name: String(raw?.name || "emuBro Locales"),
      version: String(raw?.version || "1"),
      packages
    };
  }

  function parseLocaleJson(content) {
    const raw = String(content ?? "");
    const sanitized = raw.replace(/^\uFEFF/, "").replace(/^\u00EF\u00BB\u00BF/, "");
    return JSON.parse(sanitized);
  }

  async function readLocaleJson(filename) {
    const f = normalizeLocaleFilename(filename);
    const userPath = path.join(getUserLocalesDir(), f);
    const appPath = path.join(getAppLocalesDir(), f);

    const p = fsSync.existsSync(userPath) ? userPath : appPath;
    const content = await fs.readFile(p, "utf8");
    return parseLocaleJson(content);
  }

  async function readLocaleJsonByPath(fullPath) {
    const content = await fs.readFile(fullPath, "utf8");
    return parseLocaleJson(content);
  }

  async function listLocaleFilePaths() {
    const map = new Map();

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

    await addFromDir(getAppLocalesDir());
    await addFromDir(getUserLocalesDir());

    return Array.from(map.entries()).map(([filename, fullPath]) => {
      const userDir = getUserLocalesDir();
      const normalizedPath = String(fullPath || "").toLowerCase();
      const normalizedUserDir = String(userDir || "").toLowerCase();
      const source = normalizedPath.startsWith(normalizedUserDir) ? "user" : "app";
      return {
        filename,
        fullPath,
        source
      };
    });
  }

  ipcMain.handle("get-all-translations", async () => {
    const all = {};
    const files = await listLocaleFilePaths();

    for (const f of files) {
      try {
        const content = await fs.readFile(f.fullPath, "utf8");
        const json = parseLocaleJson(content);
        if (json && typeof json === "object") Object.assign(all, json);
      } catch (e) {
        log.error(`Failed to load locale '${f.filename}':`, e);
      }
    }

    return all;
  });

  ipcMain.handle("locales:list", async () => {
    const files = await listLocaleFilePaths();
    const languages = [];

    for (const f of files) {
      try {
        const content = await fs.readFile(f.fullPath, "utf8");
        const json = parseLocaleJson(content);
        const code = json && typeof json === "object" ? Object.keys(json)[0] : null;
        if (!code) continue;
        languages.push({
          filename: f.filename,
          code,
          data: json,
          source: f.source || "app",
          canDelete: (f.source || "app") === "user",
          canRename: (f.source || "app") === "user"
        });
      } catch (e) {
        log.error(`Failed to read locale '${f.filename}':`, e);
      }
    }

    return languages;
  });

  ipcMain.handle("locales:read", async (_event, filename) => {
    return await readLocaleJson(filename);
  });

  ipcMain.handle("locales:exists", async (_event, filename) => {
    const f = normalizeLocaleFilename(filename);
    const userPath = path.join(getUserLocalesDir(), f);
    const appPath = path.join(getAppLocalesDir(), f);
    return fsSync.existsSync(userPath) || fsSync.existsSync(appPath);
  });

  ipcMain.handle("locales:write", async (_event, filename, json) => {
    const f = normalizeLocaleFilename(filename);
    if (!json || typeof json !== "object") {
      throw new Error("Invalid locale payload (expected object)");
    }

    const outPath = path.join(getUserLocalesDir(), f);
    const content = JSON.stringify(json, null, 2);
    await fs.writeFile(outPath, content, "utf8");
    return { success: true };
  });

  ipcMain.handle("locales:delete", async (_event, filename) => {
    try {
      const f = normalizeLocaleFilename(filename);
      if (f === "en.json") {
        return { success: false, message: "English locale cannot be deleted." };
      }

      const userPath = path.join(getUserLocalesDir(), f);
      if (!fsSync.existsSync(userPath)) {
        return { success: false, message: "Only user-installed locales can be deleted." };
      }

      await fs.unlink(userPath);
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("locales:rename", async (_event, payload = {}) => {
    try {
      const oldFilename = normalizeLocaleFilename(payload?.oldFilename || payload?.filename || "");
      if (oldFilename === "en.json") {
        return { success: false, message: "English locale cannot be renamed." };
      }

      const oldPath = path.join(getUserLocalesDir(), oldFilename);
      if (!fsSync.existsSync(oldPath)) {
        return { success: false, message: "Only user-installed locales can be renamed." };
      }

      const oldJson = await readLocaleJsonByPath(oldPath);
      const oldCode = String(payload?.oldCode || Object.keys(oldJson || {})[0] || "").trim().toLowerCase();
      const nextCode = String(payload?.newCode || oldCode || "").trim().toLowerCase();
      if (!/^[a-z]{2,3}$/.test(nextCode)) {
        return { success: false, message: "Invalid language code. Use 2-3 letters." };
      }

      const oldLang = oldJson?.[oldCode] && typeof oldJson[oldCode] === "object"
        ? oldJson[oldCode]
        : (oldJson && typeof oldJson === "object" ? Object.values(oldJson)[0] || {} : {});

      const nextName = String(payload?.newName || oldLang?.language?.name || nextCode.toUpperCase()).trim();
      const nextAbbreviation = String(payload?.newAbbreviation || oldLang?.language?.abbreviation || nextCode.toUpperCase()).trim() || nextCode.toUpperCase();
      const nextFlag = String(payload?.newFlag || oldLang?.language?.flag || "us").trim().toLowerCase();
      if (!/^[a-z]{2}$/.test(nextFlag)) {
        return { success: false, message: "Invalid flag code. Use 2 letters." };
      }

      const targetFilename = `${nextCode}.json`;
      const targetPath = path.join(getUserLocalesDir(), targetFilename);
      if (targetFilename !== oldFilename && fsSync.existsSync(targetPath)) {
        return { success: false, message: `Locale '${targetFilename}' already exists.` };
      }

      const nextLangPayload = {
        ...(oldLang && typeof oldLang === "object" ? oldLang : {}),
        language: {
          ...(oldLang?.language && typeof oldLang.language === "object" ? oldLang.language : {}),
          name: nextName,
          abbreviation: nextAbbreviation,
          flag: nextFlag
        }
      };
      const nextJson = { [nextCode]: nextLangPayload };

      await fs.writeFile(targetPath, JSON.stringify(nextJson, null, 2), "utf8");
      if (targetPath !== oldPath && fsSync.existsSync(oldPath)) {
        await fs.unlink(oldPath);
      }

      return {
        success: true,
        filename: targetFilename,
        code: nextCode,
        data: nextJson
      };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("locales:flags:get-data-url", async (_event, flagCodeRaw) => {
    try {
      const flagCode = String(flagCodeRaw || "").trim().toLowerCase();
      if (!FLAG_CODE_RE.test(flagCode)) {
        return { success: false, message: "Invalid flag code", dataUrl: "" };
      }
      const filePath = path.join(getUserFlagsDir(), `${flagCode}.svg`);
      if (!fsSync.existsSync(filePath)) {
        return { success: false, message: "Flag not found", dataUrl: "" };
      }
      const buf = await fs.readFile(filePath);
      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(buf).toString("base64")}`;
      return { success: true, dataUrl };
    } catch (error) {
      return { success: false, message: error?.message || String(error), dataUrl: "" };
    }
  });

  ipcMain.handle("locales:flags:write-data-url", async (_event, payload = {}) => {
    try {
      const flagCode = String(payload?.flagCode || "").trim().toLowerCase();
      const dataUrl = String(payload?.dataUrl || "").trim();
      if (!FLAG_CODE_RE.test(flagCode)) {
        return { success: false, message: "Invalid flag code" };
      }
      if (!/^data:image\/svg\+xml;base64,/i.test(dataUrl)) {
        return { success: false, message: "Only SVG data URLs are supported." };
      }

      const base64 = dataUrl.split(",")[1] || "";
      const buffer = Buffer.from(base64, "base64");
      await fs.writeFile(path.join(getUserFlagsDir(), `${flagCode}.svg`), buffer);
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("locales:flags:write-from-file", async (_event, payload = {}) => {
    try {
      const flagCode = String(payload?.flagCode || "").trim().toLowerCase();
      const sourcePath = String(payload?.filePath || "").trim();
      if (!FLAG_CODE_RE.test(flagCode)) {
        return { success: false, message: "Invalid flag code" };
      }
      if (!sourcePath || !fsSync.existsSync(sourcePath)) {
        return { success: false, message: "Source file not found." };
      }
      const ext = String(path.extname(sourcePath) || "").trim().toLowerCase();
      if (ext !== ".svg") {
        return { success: false, message: "Only SVG files are supported." };
      }

      const buffer = await fs.readFile(sourcePath);
      await fs.writeFile(path.join(getUserFlagsDir(), `${flagCode}.svg`), buffer);
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("locales:repo:get-config", async () => {
    return {
      success: true,
      manifestUrl: getLocalesRepoManifestUrl()
    };
  });

  ipcMain.handle("locales:repo:set-config", async (_event, payload = {}) => {
    const nextUrl = normalizeRepoManifestUrl(payload?.manifestUrl || payload?.url || "");
    return {
      success: true,
      manifestUrl: setLocalesRepoManifestUrl(nextUrl)
    };
  });

  ipcMain.handle("locales:repo:fetch-catalog", async (_event, payload = {}) => {
    try {
      const catalog = await fetchLocalesCatalog(payload?.manifestUrl || payload?.url || "");
      return {
        success: true,
        ...catalog
      };
    } catch (error) {
      return {
        success: false,
        message: error?.message || String(error),
        manifestUrl: String(payload?.manifestUrl || payload?.url || "").trim()
      };
    }
  });

  ipcMain.handle("locales:repo:install", async (_event, payload = {}) => {
    try {
      const catalog = await fetchLocalesCatalog(payload?.manifestUrl || payload?.url || "");
      const requestedCodes = Array.isArray(payload?.codes)
        ? payload.codes.map((code) => String(code || "").trim().toLowerCase()).filter((code) => /^[a-z]{2,3}$/.test(code))
        : [];
      const selected = requestedCodes.length > 0
        ? catalog.packages.filter((entry) => requestedCodes.includes(entry.code))
        : catalog.packages;
      if (selected.length === 0) {
        return {
          success: false,
          message: "No locale packages selected for installation.",
          installed: [],
          failed: []
        };
      }

      const installed = [];
      const failed = [];
      const localesDir = getUserLocalesDir();
      const flagsDir = getUserFlagsDir();

      for (const entry of selected) {
        try {
          const localeJson = await fetchJsonFromUrl(entry.localeUrl);
          const localePayload = (localeJson && typeof localeJson === "object" && localeJson[entry.code])
            ? localeJson
            : { [entry.code]: localeJson };
          const localePath = path.join(localesDir, `${entry.code}.json`);
          await fs.writeFile(localePath, JSON.stringify(localePayload, null, 2), "utf8");

          if (entry.flagUrl && FLAG_CODE_RE.test(entry.flag)) {
            try {
              const flagSvg = await fetchTextFromUrl(entry.flagUrl);
              await fs.writeFile(path.join(flagsDir, `${entry.flag}.svg`), String(flagSvg || ""), "utf8");
            } catch (_flagError) {
              // Flag download is optional; locale install should still succeed.
            }
          }

          installed.push({
            code: entry.code,
            localePath
          });
        } catch (error) {
          failed.push({
            code: entry.code,
            message: error?.message || String(error)
          });
        }
      }

      return {
        success: installed.length > 0,
        manifestUrl: catalog.manifestUrl,
        installed,
        failed
      };
    } catch (error) {
      log.error("locales:repo:install failed:", error);
      return {
        success: false,
        message: error?.message || String(error),
        installed: [],
        failed: []
      };
    }
  });
}

module.exports = {
  registerLocalesIpc
};
