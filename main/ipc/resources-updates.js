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

  const DEFAULT_RESOURCES_MANIFEST_URL = "https://raw.githubusercontent.com/sysoutch/emubro-resources/master/manifest.json";
  const RESOURCES_MANIFEST_URL_KEY = "resources:manifest-url:v1";
  const RESOURCES_STORAGE_PATH_KEY = "resources:storage-path:v1";
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
  let storagePath = "";
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
      storagePath,
      effectiveStoragePath: resourceOverrides.getUserResourcesDir(),
      defaultStoragePath: resourceOverrides.getDefaultUserResourcesDir(),
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

  function normalizeStoragePath(value, options = {}) {
    const allowEmpty = options.allowEmpty !== false;
    const raw = String(value || "").trim();
    if (!raw) {
      if (allowEmpty) return "";
      throw new Error("Storage path is required");
    }
    if (!path.isAbsolute(raw)) {
      throw new Error("Storage path must be an absolute directory path.");
    }
    return path.normalize(raw);
  }

  function getStoredStoragePath() {
    if (!store || typeof store.get !== "function") return "";
    return normalizeStoragePath(store.get(RESOURCES_STORAGE_PATH_KEY, ""), { allowEmpty: true });
  }

  function setStoragePath(nextPath) {
    const normalized = normalizeStoragePath(nextPath, { allowEmpty: true });
    if (store) {
      if (normalized) {
        if (typeof store.set === "function") store.set(RESOURCES_STORAGE_PATH_KEY, normalized);
      } else if (typeof store.delete === "function") {
        store.delete(RESOURCES_STORAGE_PATH_KEY);
      } else if (typeof store.set === "function") {
        store.set(RESOURCES_STORAGE_PATH_KEY, "");
      }
    }
    storagePath = normalized;
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

  function normalizeGitHubSource(source = {}) {
    const raw = (source && typeof source === "object") ? source : {};
    const owner = String(raw.owner || "").trim();
    const repo = String(raw.repo || "").trim();
    const branch = String(raw.branch || "").trim() || "master";
    const commit = String(raw.commit || raw.sha || "").trim();
    if (!owner || !repo) return null;
    return { owner, repo, branch, commit };
  }

  function deriveGitHubSourceFromManifestUrl(url) {
    const target = String(url || "").trim();
    const match = target.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)$/i);
    if (!match) return null;
    const owner = decodeURIComponent(String(match[1] || "").trim());
    const repo = decodeURIComponent(String(match[2] || "").trim());
    const branch = decodeURIComponent(String(match[3] || "").trim()) || "master";
    if (!owner || !repo || !branch) return null;
    return { owner, repo, branch, commit: "" };
  }

  function encodeRawPath(relPath) {
    return String(relPath || "")
      .split("/")
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join("/");
  }

  function normalizeManifest(rawManifest = {}, options = {}) {
    const raw = (rawManifest && typeof rawManifest === "object") ? rawManifest : {};
    const manifestUrlInput = String(options.manifestUrl || "").trim();
    const explicitSource = normalizeGitHubSource(raw.source);
    const inferredSource = deriveGitHubSourceFromManifestUrl(manifestUrlInput);
    const source = explicitSource || inferredSource || null;
    const version = String(raw.version || "").trim();
    if (!version && !source) {
      throw new Error("Manifest is missing 'version' and has no valid 'source'.");
    }

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
      source,
      installedRef: String(raw.installedRef || raw.commit || raw.sha || "").trim(),
      files
    };
  }

  async function fetchLatestSourceCommit(source) {
    const normalized = normalizeGitHubSource(source);
    if (!normalized) throw new Error("Invalid manifest source definition.");
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(normalized.owner)}/${encodeURIComponent(normalized.repo)}/commits/${encodeURIComponent(normalized.branch)}`;
    if (typeof fetch !== "function") {
      throw new Error("Fetch API is not available in this runtime");
    }
    const response = await fetch(apiUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "emuBro-resources-updater"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${apiUrl}`);
    }
    const payload = await response.json();
    const sha = String(payload?.sha || "").trim();
    if (!sha) {
      throw new Error("GitHub commit response did not include a commit SHA.");
    }
    return sha;
  }

  async function buildFilesFromSourceTree(source, refSha) {
    const normalized = normalizeGitHubSource(source);
    if (!normalized) throw new Error("Invalid manifest source definition.");
    const ref = String(refSha || normalized.commit || "").trim();
    if (!ref) throw new Error("Missing source ref for tree listing.");
    const apiUrl = `https://api.github.com/repos/${encodeURIComponent(normalized.owner)}/${encodeURIComponent(normalized.repo)}/git/trees/${encodeURIComponent(ref)}?recursive=1`;
    if (typeof fetch !== "function") {
      throw new Error("Fetch API is not available in this runtime");
    }
    const response = await fetch(apiUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "emuBro-resources-updater"
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} while fetching ${apiUrl}`);
    }
    const payload = await response.json();
    const tree = Array.isArray(payload?.tree) ? payload.tree : [];
    const files = [];
    for (const node of tree) {
      if (String(node?.type || "") !== "blob") continue;
      const relPath = normalizeRelativePath(node?.path || "");
      if (!relPath) continue;
      const fileName = String(relPath.split("/").pop() || "").toLowerCase();
      if (fileName === "manifest.json" || fileName === ".gitignore") continue;
      if (relPath.startsWith(".git/") || relPath.startsWith(".github/")) continue;
      if (/^readme(\.|$)/i.test(fileName)) continue;
      files.push({
        path: relPath,
        url: `https://raw.githubusercontent.com/${normalized.owner}/${normalized.repo}/${ref}/${encodeRawPath(relPath)}`
      });
    }
    files.sort((a, b) => String(a.path).localeCompare(String(b.path), "en"));
    return files;
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

  async function readManifestFromFile(filePath, options = {}) {
    try {
      if (!filePath || !fsSync.existsSync(filePath)) return null;
      const text = await fs.readFile(filePath, "utf8");
      return normalizeManifest(JSON.parse(String(text || "{}")), options);
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
    if (userManifest?.installedRef) return String(userManifest.installedRef).trim();
    if (userManifest?.version) return userManifest.version;

    const bundledManifestPath = path.join(resourceOverrides.getBundledResourcesDir(), "manifest.json");
    const bundledManifest = await readManifestFromFile(bundledManifestPath);
    if (bundledManifest?.installedRef) return String(bundledManifest.installedRef).trim();
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
      const remoteManifest = normalizeManifest(await fetchJson(manifestUrl), { manifestUrl });
      let remoteRef = String(remoteManifest.version || "").trim();
      let sourceRef = "";
      if (remoteManifest.source) {
        try {
          sourceRef = await fetchLatestSourceCommit(remoteManifest.source);
          remoteRef = sourceRef;
        } catch (error) {
          if (!remoteRef) {
            throw error;
          }
          log.warn("Failed to fetch latest source commit; falling back to manifest version:", String(error?.message || error));
        }
      }
      if (!remoteRef) {
        throw new Error("Unable to determine remote resources revision.");
      }
      cachedManifest = {
        ...remoteManifest,
        resolvedRef: sourceRef || "",
        remoteRef
      };
      latestVersion = remoteRef;
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
      if (!cachedManifest || !String(cachedManifest.remoteRef || cachedManifest.version || "").trim()) {
        await checkForResourceUpdates();
      }
      if (!cachedManifest || !String(cachedManifest.remoteRef || cachedManifest.version || "").trim()) {
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

      const installRef = String(cachedManifest.resolvedRef || cachedManifest.remoteRef || cachedManifest.version || "").trim();
      let files = [];
      if (cachedManifest.source && installRef) {
        try {
          files = await buildFilesFromSourceTree(cachedManifest.source, installRef);
        } catch (error) {
          log.warn("Failed to build files from source tree; falling back to manifest file list:", String(error?.message || error));
        }
      }
      if (!Array.isArray(files) || files.length === 0) {
        files = Array.isArray(cachedManifest.files) ? cachedManifest.files : [];
      }
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
        const downloadedFiles = [];
        const skippedFiles = [];

        for (const fileEntry of files) {
          const relPath = normalizeRelativePath(fileEntry.path);
          if (!relPath) continue;
          const sourceUrl = String(fileEntry.url || "").trim();
          try {
            const response = await fetch(sourceUrl, { method: "GET", redirect: "follow", cache: "no-store" });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status} while fetching ${sourceUrl}`);
            }
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempOutPath = path.join(tempRoot, relPath);
            fsSync.mkdirSync(path.dirname(tempOutPath), { recursive: true });
            fsSync.writeFileSync(tempOutPath, buffer);
            downloadedFiles.push({
              path: relPath,
              url: sourceUrl
            });
          } catch (error) {
            skippedFiles.push({
              path: relPath,
              url: sourceUrl,
              error: String(error?.message || error || "Download failed")
            });
            log.warn(`Skipping resource file '${relPath}':`, String(error?.message || error || "Download failed"));
          }

          downloadedCount += 1;
          progressPercent = Math.round((downloadedCount / total) * 100);
          lastMessage = `Downloading resources... ${progressPercent}%`;
          emitStatus();
        }

        if (downloadedFiles.length === 0) {
          throw new Error("None of the manifest files could be downloaded.");
        }

        for (const fileEntry of downloadedFiles) {
          const relPath = normalizeRelativePath(fileEntry.path);
          if (!relPath) continue;
          const sourcePath = path.join(tempRoot, relPath);
          if (!fsSync.existsSync(sourcePath)) continue;
          const targetPath = path.join(targetRoot, relPath);
          fsSync.mkdirSync(path.dirname(targetPath), { recursive: true });
          fsSync.copyFileSync(sourcePath, targetPath);
        }

        const previousManifestPath = path.join(targetRoot, "manifest.json");
        let previousFiles = [];
        try {
          if (fsSync.existsSync(previousManifestPath)) {
            const previousRaw = JSON.parse(String(fsSync.readFileSync(previousManifestPath, "utf8") || "{}"));
            previousFiles = Array.isArray(previousRaw?.files) ? previousRaw.files : [];
          }
        } catch (_error) {}
        const expectedPaths = new Set(
          (Array.isArray(files) ? files : [])
            .map((entry) => normalizeRelativePath(entry?.path || entry?.file || ""))
            .filter(Boolean)
        );
        const stalePaths = (Array.isArray(previousFiles) ? previousFiles : [])
          .map((entry) => normalizeRelativePath(entry?.path || entry?.file || ""))
          .filter((relPath, idx, arr) => relPath && arr.indexOf(relPath) === idx && !expectedPaths.has(relPath));

        for (const staleRelPath of stalePaths) {
          try {
            const staleAbsPath = path.resolve(path.join(targetRoot, staleRelPath));
            const targetRootResolved = path.resolve(targetRoot);
            const allowedPrefix = `${targetRootResolved}${path.sep}`;
            if (staleAbsPath !== targetRootResolved && !staleAbsPath.startsWith(allowedPrefix)) continue;
            if (fsSync.existsSync(staleAbsPath)) {
              const stat = fsSync.statSync(staleAbsPath);
              if (stat.isFile()) {
                fsSync.unlinkSync(staleAbsPath);
              } else if (stat.isDirectory()) {
                fsSync.rmSync(staleAbsPath, { recursive: true, force: true });
              }
            }
            let parentDir = path.dirname(staleAbsPath);
            while (parentDir && parentDir.startsWith(targetRoot) && parentDir !== targetRoot) {
              try {
                if (!fsSync.existsSync(parentDir)) break;
                const children = fsSync.readdirSync(parentDir);
                if (children.length > 0) break;
                fsSync.rmdirSync(parentDir);
                parentDir = path.dirname(parentDir);
              } catch (_error) {
                break;
              }
            }
          } catch (_error) {}
        }

        const writtenManifest = {
          name: cachedManifest.name,
          version: cachedManifest.version,
          source: cachedManifest.source || undefined,
          sourceManifestUrl: manifestUrl,
          installedRef: installRef || undefined,
          installedAt: new Date().toISOString(),
          files,
          skippedFiles
        };
        fsSync.writeFileSync(path.join(targetRoot, "manifest.json"), JSON.stringify(writtenManifest, null, 2), "utf8");

        if (store && typeof store.set === "function") {
          store.set(RESOURCES_INSTALLED_VERSION_KEY, installRef || cachedManifest.version);
        }

        await refreshCurrentVersion();
        latestVersion = installRef || cachedManifest.version;
        available = false;
        installing = false;
        progressPercent = 100;
        lastError = "";
        lastMessage = skippedFiles.length > 0
          ? `Resource update installed with warnings (${downloadedFiles.length}/${files.length} files).`
          : "Resource update installed successfully.";
        return {
          success: true,
          skippedFiles,
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
      storagePath,
      effectiveStoragePath: resourceOverrides.getUserResourcesDir(),
      defaultStoragePath: resourceOverrides.getDefaultUserResourcesDir(),
      autoCheckOnStartup,
      autoCheckIntervalMinutes
    };
  });

  ipcMain.handle("resources:update:set-config", async (_event, payload = {}) => {
    try {
      const shouldUpdateManifestUrl = Object.prototype.hasOwnProperty.call(payload || {}, "manifestUrl")
        || Object.prototype.hasOwnProperty.call(payload || {}, "url");
      const shouldUpdateStoragePath = Object.prototype.hasOwnProperty.call(payload || {}, "storagePath");
      const nextManifestUrl = shouldUpdateManifestUrl
        ? normalizeManifestUrl(payload?.manifestUrl || payload?.url || "")
        : getManifestUrl();
      const nextStoragePath = shouldUpdateStoragePath
        ? normalizeStoragePath(payload?.storagePath || "", { allowEmpty: true })
        : getStoredStoragePath();
      writeAutoCheckConfigToStore({
        autoCheckOnStartup: payload?.autoCheckOnStartup,
        autoCheckIntervalMinutes: payload?.autoCheckIntervalMinutes
      });
      scheduleAutoCheck();
      return {
        success: true,
        manifestUrl: setManifestUrl(nextManifestUrl),
        storagePath: setStoragePath(nextStoragePath),
        effectiveStoragePath: resourceOverrides.getUserResourcesDir(),
        defaultStoragePath: resourceOverrides.getDefaultUserResourcesDir(),
        autoCheckOnStartup,
        autoCheckIntervalMinutes
      };
    } catch (error) {
      return {
        success: false,
        message: String(error?.message || error || "Invalid manifest URL"),
        manifestUrl: getManifestUrl(),
        storagePath,
        effectiveStoragePath: resourceOverrides.getUserResourcesDir(),
        defaultStoragePath: resourceOverrides.getDefaultUserResourcesDir(),
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
  storagePath = getStoredStoragePath();
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
