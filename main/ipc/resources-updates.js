function registerResourceUpdatesIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const app = deps.app;
  const store = deps.store || null;
  const fs = deps.fs;
  const fsSync = deps.fsSync;
  const path = deps.path;
  const log = deps.log || console;
  const getMainWindow = typeof deps.getMainWindow === "function" ? deps.getMainWindow : () => null;
  const resourceOverrides = deps.resourceOverrides || null;

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerResourceUpdatesIpc requires ipcMain");
  }
  if (!app || !fs || !fsSync || !path) {
    throw new Error("registerResourceUpdatesIpc requires app/fs/fsSync/path");
  }
  if (!resourceOverrides || typeof resourceOverrides.resolveResourcePath !== "function") {
    throw new Error("registerResourceUpdatesIpc requires resourceOverrides");
  }

  const DEFAULT_RESOURCES_MANIFEST_URL = "https://raw.githubusercontent.com/sysoutch/emuBro/main/emubro-resources/manifest.json";
  const RESOURCES_MANIFEST_URL_KEY = "resources:manifest-url:v1";
  const RESOURCES_INSTALLED_VERSION_KEY = "resources:installed-version:v1";
  const RESOURCES_AUTO_CHECK_ON_STARTUP_KEY = "resources:auto-check-on-startup:v1";
  const RESOURCES_AUTO_CHECK_INTERVAL_MINUTES_KEY = "resources:auto-check-interval-minutes:v1";

  let checking = false;
  let installing = false;
  let available = false;
  let currentVersion = "";
  let latestVersion = "";
  let lastMessage = "";
  let lastError = "";
  let progressPercent = 0;
  let manifestUrl = "";
  let cachedManifest = null;
  let autoCheckOnStartup = true;
  let autoCheckIntervalMinutes = 60;
  let autoCheckTimer = null;

  function emitStatus(extra = {}) {
    const payload = {
      checking,
      installing,
      available,
      currentVersion,
      latestVersion,
      lastMessage,
      lastError,
      progressPercent,
      manifestUrl,
      autoCheckOnStartup,
      autoCheckIntervalMinutes,
      ...extra
    };
    const mainWindow = getMainWindow();
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send("resources:update-status", payload);
      }
    } catch (_error) {}
    return payload;
  }

  function normalizeManifestUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return DEFAULT_RESOURCES_MANIFEST_URL;
    if (!/^https?:\/\//i.test(raw)) {
      throw new Error("Manifest URL must start with http:// or https://");
    }
    return raw;
  }

  function getManifestUrl() {
    if (!store || typeof store.get !== "function") {
      return DEFAULT_RESOURCES_MANIFEST_URL;
    }
    return normalizeManifestUrl(store.get(RESOURCES_MANIFEST_URL_KEY, DEFAULT_RESOURCES_MANIFEST_URL));
  }

  function setManifestUrl(nextUrl) {
    const normalized = normalizeManifestUrl(nextUrl);
    if (store && typeof store.set === "function") {
      store.set(RESOURCES_MANIFEST_URL_KEY, normalized);
    }
    manifestUrl = normalized;
    return normalized;
  }

  function readAutoCheckConfigFromStore() {
    const storedStartup = store && typeof store.get === "function"
      ? store.get(RESOURCES_AUTO_CHECK_ON_STARTUP_KEY, true)
      : true;
    autoCheckOnStartup = storedStartup !== false;

    const storedMinutes = Number(store && typeof store.get === "function"
      ? store.get(RESOURCES_AUTO_CHECK_INTERVAL_MINUTES_KEY, 60)
      : 60);
    autoCheckIntervalMinutes = Number.isFinite(storedMinutes)
      ? Math.max(5, Math.min(1440, Math.round(storedMinutes)))
      : 60;
  }

  function writeAutoCheckConfigToStore(nextConfig = {}) {
    const startup = nextConfig.autoCheckOnStartup !== false;
    const parsedMinutes = Number(nextConfig.autoCheckIntervalMinutes);
    const minutes = Number.isFinite(parsedMinutes)
      ? Math.max(5, Math.min(1440, Math.round(parsedMinutes)))
      : autoCheckIntervalMinutes;

    autoCheckOnStartup = startup;
    autoCheckIntervalMinutes = minutes;

    if (store && typeof store.set === "function") {
      store.set(RESOURCES_AUTO_CHECK_ON_STARTUP_KEY, autoCheckOnStartup);
      store.set(RESOURCES_AUTO_CHECK_INTERVAL_MINUTES_KEY, autoCheckIntervalMinutes);
    }
  }

  function scheduleAutoCheck() {
    if (autoCheckTimer) {
      clearInterval(autoCheckTimer);
      autoCheckTimer = null;
    }
    if (!autoCheckOnStartup) return;
    autoCheckTimer = setInterval(() => {
      void checkForResourceUpdates();
    }, autoCheckIntervalMinutes * 60 * 1000);
  }

  function normalizeRelativePath(input) {
    const raw = String(input || "").replace(/\\/g, "/").trim();
    if (!raw) return "";
    const cleaned = raw.replace(/^\/+/, "").replace(/^\.\/+/, "");
    if (!cleaned || cleaned.includes("../") || cleaned.startsWith("..")) return "";
    return cleaned;
  }

  function normalizeManifest(rawManifest = {}) {
    const raw = (rawManifest && typeof rawManifest === "object") ? rawManifest : {};
    const version = String(raw.version || "").trim();
    if (!version) throw new Error("Manifest is missing 'version'.");

    const files = [];
    const sourceFiles = Array.isArray(raw.files) ? raw.files : [];
    for (const entry of sourceFiles) {
      const relPath = normalizeRelativePath(entry?.path || entry?.file || "");
      const url = String(entry?.url || "").trim();
      if (!relPath) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      files.push({
        path: relPath,
        url
      });
    }

    return {
      name: String(raw.name || "emuBro Resources"),
      version,
      files
    };
  }

  async function fetchJson(url) {
    const target = String(url || "").trim();
    if (!/^https?:\/\//i.test(target)) {
      throw new Error("Invalid URL");
    }
    if (typeof fetch !== "function") {
      throw new Error("Fetch API is not available in this runtime");
    }
    const response = await fetch(target, { method: "GET", redirect: "follow", cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${target}`);
    }
    return await response.json();
  }

  async function readManifestFromFile(filePath) {
    try {
      if (!filePath || !fsSync.existsSync(filePath)) return null;
      const text = await fs.readFile(filePath, "utf8");
      return normalizeManifest(JSON.parse(String(text || "{}")));
    } catch (_error) {
      return null;
    }
  }

  async function resolveCurrentVersion() {
    const stored = (store && typeof store.get === "function")
      ? String(store.get(RESOURCES_INSTALLED_VERSION_KEY, "") || "").trim()
      : "";
    if (stored) return stored;

    const userManifestPath = resourceOverrides.resolveResourcePath("manifest.json", { mustExist: true });
    const userManifest = await readManifestFromFile(userManifestPath);
    if (userManifest?.version) return userManifest.version;

    const bundledManifestPath = path.join(resourceOverrides.getBundledResourcesDir(), "manifest.json");
    const bundledManifest = await readManifestFromFile(bundledManifestPath);
    if (bundledManifest?.version) return bundledManifest.version;

    return String(app.getVersion() || "0");
  }

  async function refreshCurrentVersion() {
    currentVersion = await resolveCurrentVersion();
    return currentVersion;
  }

  async function checkForResourceUpdates() {
    checking = true;
    lastError = "";
    lastMessage = "Checking resource updates...";
    progressPercent = 0;
    emitStatus();

    try {
      manifestUrl = getManifestUrl();
      await refreshCurrentVersion();
      const remoteManifest = normalizeManifest(await fetchJson(manifestUrl));
      cachedManifest = remoteManifest;
      latestVersion = remoteManifest.version;
      available = latestVersion !== currentVersion;
      lastMessage = available
        ? `Resource update available: ${latestVersion}`
        : "Resources are up to date.";
      checking = false;
      return {
        success: true,
        available,
        ...emitStatus()
      };
    } catch (error) {
      checking = false;
      available = false;
      latestVersion = "";
      lastError = String(error?.message || error || "Failed to check resource updates");
      lastMessage = "";
      return {
        success: false,
        message: lastError,
        ...emitStatus()
      };
    }
  }

  async function installResourceUpdate() {
    if (installing) {
      return {
        success: false,
        message: "Resource update is already in progress.",
        ...emitStatus()
      };
    }

    try {
      if (!cachedManifest || !String(cachedManifest.version || "").trim()) {
        await checkForResourceUpdates();
      }
      if (!cachedManifest || !String(cachedManifest.version || "").trim()) {
        throw new Error("No remote resource manifest available.");
      }

      if (!available) {
        lastMessage = "Resources are already up to date.";
        return {
          success: true,
          available: false,
          ...emitStatus()
        };
      }

      const files = Array.isArray(cachedManifest.files) ? cachedManifest.files : [];
      if (files.length === 0) {
        throw new Error("Manifest has no downloadable files.");
      }

      installing = true;
      lastError = "";
      progressPercent = 0;
      lastMessage = "Downloading resource update...";
      emitStatus();

      const targetRoot = resourceOverrides.getUserResourcesDir();
      const tempRoot = path.join(app.getPath("temp"), `emubro-resource-update-${Date.now()}`);
      fsSync.mkdirSync(tempRoot, { recursive: true });

      try {
        let downloadedCount = 0;
        const total = files.length;

        for (const fileEntry of files) {
          const relPath = normalizeRelativePath(fileEntry.path);
          if (!relPath) continue;
          const response = await fetch(String(fileEntry.url || "").trim(), { method: "GET", redirect: "follow", cache: "no-store" });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status} while fetching ${fileEntry.url}`);
          }
          const buffer = Buffer.from(await response.arrayBuffer());
          const tempOutPath = path.join(tempRoot, relPath);
          fsSync.mkdirSync(path.dirname(tempOutPath), { recursive: true });
          fsSync.writeFileSync(tempOutPath, buffer);

          downloadedCount += 1;
          progressPercent = Math.round((downloadedCount / total) * 100);
          lastMessage = `Downloading resources... ${progressPercent}%`;
          emitStatus();
        }

        for (const fileEntry of files) {
          const relPath = normalizeRelativePath(fileEntry.path);
          if (!relPath) continue;
          const sourcePath = path.join(tempRoot, relPath);
          if (!fsSync.existsSync(sourcePath)) continue;
          const targetPath = path.join(targetRoot, relPath);
          fsSync.mkdirSync(path.dirname(targetPath), { recursive: true });
          fsSync.copyFileSync(sourcePath, targetPath);
        }

        const writtenManifest = {
          name: cachedManifest.name,
          version: cachedManifest.version,
          sourceManifestUrl: manifestUrl,
          installedAt: new Date().toISOString(),
          files
        };
        fsSync.writeFileSync(path.join(targetRoot, "manifest.json"), JSON.stringify(writtenManifest, null, 2), "utf8");

        if (store && typeof store.set === "function") {
          store.set(RESOURCES_INSTALLED_VERSION_KEY, cachedManifest.version);
        }

        await refreshCurrentVersion();
        latestVersion = cachedManifest.version;
        available = false;
        installing = false;
        progressPercent = 100;
        lastError = "";
        lastMessage = "Resource update installed successfully.";
        return {
          success: true,
          ...emitStatus()
        };
      } finally {
        try {
          fsSync.rmSync(tempRoot, { recursive: true, force: true });
        } catch (_error) {}
      }
    } catch (error) {
      installing = false;
      progressPercent = 0;
      lastError = String(error?.message || error || "Failed to install resource update");
      lastMessage = "";
      return {
        success: false,
        message: lastError,
        ...emitStatus()
      };
    }
  }

  ipcMain.handle("resources:update:get-config", async () => {
    return {
      success: true,
      manifestUrl: getManifestUrl(),
      autoCheckOnStartup,
      autoCheckIntervalMinutes
    };
  });

  ipcMain.handle("resources:update:set-config", async (_event, payload = {}) => {
    try {
      const next = normalizeManifestUrl(payload?.manifestUrl || payload?.url || "");
      writeAutoCheckConfigToStore({
        autoCheckOnStartup: payload?.autoCheckOnStartup,
        autoCheckIntervalMinutes: payload?.autoCheckIntervalMinutes
      });
      scheduleAutoCheck();
      return {
        success: true,
        manifestUrl: setManifestUrl(next),
        autoCheckOnStartup,
        autoCheckIntervalMinutes
      };
    } catch (error) {
      return {
        success: false,
        message: String(error?.message || error || "Invalid manifest URL"),
        manifestUrl: getManifestUrl(),
        autoCheckOnStartup,
        autoCheckIntervalMinutes
      };
    }
  });

  ipcMain.handle("resources:update:get-state", async () => {
    await refreshCurrentVersion();
    manifestUrl = getManifestUrl();
    return {
      success: true,
      ...emitStatus()
    };
  });

  ipcMain.handle("resources:update:check", async () => {
    return await checkForResourceUpdates();
  });

  ipcMain.handle("resources:update:install", async () => {
    return await installResourceUpdate();
  });

  manifestUrl = getManifestUrl();
  readAutoCheckConfigFromStore();
  scheduleAutoCheck();
  void refreshCurrentVersion().then(() => emitStatus());
  if (autoCheckOnStartup) {
    setTimeout(() => {
      void checkForResourceUpdates();
    }, app.isPackaged ? 12000 : 3000);
  }
}

module.exports = {
  registerResourceUpdatesIpc
};
