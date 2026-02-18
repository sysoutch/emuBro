function registerLocalesIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const app = deps.app;
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

    return Array.from(map.entries()).map(([filename, fullPath]) => ({ filename, fullPath }));
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
        languages.push({ filename: f.filename, code, data: json });
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
}

module.exports = {
  registerLocalesIpc
};
