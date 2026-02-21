function registerEmulatorCatalogHandlers(deps = {}) {
  const {
    ipcMain,
    normalizeEmulatorType,
    buildEmulatorDownloadLinks,
    buildConfiguredEmulators,
    installedMatchesConfigured,
    mapInstalledRows,
    refreshLibraryFromDb,
    getEmulatorsState,
    getPlatformConfigs
  } = deps;

  if (!ipcMain) throw new Error("registerEmulatorCatalogHandlers requires ipcMain");
  if (typeof normalizeEmulatorType !== "function") throw new Error("registerEmulatorCatalogHandlers requires normalizeEmulatorType");
  if (typeof buildEmulatorDownloadLinks !== "function") throw new Error("registerEmulatorCatalogHandlers requires buildEmulatorDownloadLinks");
  if (typeof buildConfiguredEmulators !== "function") throw new Error("registerEmulatorCatalogHandlers requires buildConfiguredEmulators");
  if (typeof installedMatchesConfigured !== "function") throw new Error("registerEmulatorCatalogHandlers requires installedMatchesConfigured");
  if (typeof mapInstalledRows !== "function") throw new Error("registerEmulatorCatalogHandlers requires mapInstalledRows");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerEmulatorCatalogHandlers requires refreshLibraryFromDb");
  if (typeof getEmulatorsState !== "function") throw new Error("registerEmulatorCatalogHandlers requires getEmulatorsState");
  if (typeof getPlatformConfigs !== "function") throw new Error("registerEmulatorCatalogHandlers requires getPlatformConfigs");

  function normalizeDedupeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[\s._-]+/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function collectFilePaths(...rows) {
    const ordered = [];
    const seen = new Set();
    rows.forEach((row) => {
      const candidates = [];
      if (Array.isArray(row?.filePaths)) {
        row.filePaths.forEach((p) => candidates.push(p));
      }
      candidates.push(row?.filePath);
      candidates.forEach((rawPath) => {
        const value = String(rawPath || "").trim();
        if (!value) return;
        const key = value.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        ordered.push(value);
      });
    });
    return ordered;
  }

  function hasAnyDownloadUrl(value) {
    if (typeof value === "string") return !!String(value).trim();
    if (Array.isArray(value)) return value.some((entry) => !!String(entry || "").trim());
    if (!value || typeof value !== "object") return false;

    const keys = ["windows", "win", "win32", "linux", "mac", "macos", "darwin", "osx", "all", "default", "any"];
    return keys.some((key) => {
      const entry = value[key];
      if (Array.isArray(entry)) return entry.some((item) => !!String(item || "").trim());
      return !!String(entry || "").trim();
    });
  }

  function pickDownloadUrl(preferred, fallback) {
    if (hasAnyDownloadUrl(preferred)) return preferred;
    if (hasAnyDownloadUrl(fallback)) return fallback;
    return "";
  }

  function mergeDuplicateRows(a, b) {
    const aInstalled = !!a?.isInstalled;
    const bInstalled = !!b?.isInstalled;
    const preferred = (bInstalled && !aInstalled) ? b : a;
    const fallback = preferred === a ? b : a;
    const filePaths = collectFilePaths(preferred, fallback);
    const sourceParts = [String(fallback?.source || "").trim(), String(preferred?.source || "").trim()]
      .filter(Boolean);
    const source = Array.from(new Set(sourceParts)).join("+") || String(preferred?.source || fallback?.source || "");
    const merged = {
      ...fallback,
      ...preferred,
      name: preferred?.name || fallback?.name || "",
      platform: preferred?.platform || fallback?.platform || "",
      platformShortName: preferred?.platformShortName || fallback?.platformShortName || "",
      type: normalizeEmulatorType(preferred?.type || fallback?.type) || "standalone",
      filePath: String(preferred?.filePath || fallback?.filePath || filePaths[0] || "").trim(),
      filePaths,
      isInstalled: !!(aInstalled || bInstalled),
      website: preferred?.website || fallback?.website || "",
      downloadUrl: pickDownloadUrl(preferred?.downloadUrl, fallback?.downloadUrl),
      searchString: preferred?.searchString || fallback?.searchString || "",
      startParameters: preferred?.startParameters || fallback?.startParameters || "",
      archiveFileMatchWin: preferred?.archiveFileMatchWin || fallback?.archiveFileMatchWin || "",
      archiveFileMatchLinux: preferred?.archiveFileMatchLinux || fallback?.archiveFileMatchLinux || "",
      archiveFileMatchMac: preferred?.archiveFileMatchMac || fallback?.archiveFileMatchMac || "",
      setupFileMatchWin: preferred?.setupFileMatchWin || fallback?.setupFileMatchWin || "",
      setupFileMatchLinux: preferred?.setupFileMatchLinux || fallback?.setupFileMatchLinux || "",
      setupFileMatchMac: preferred?.setupFileMatchMac || fallback?.setupFileMatchMac || "",
      executableFileMatchWin: preferred?.executableFileMatchWin || fallback?.executableFileMatchWin || "",
      executableFileMatchLinux: preferred?.executableFileMatchLinux || fallback?.executableFileMatchLinux || "",
      executableFileMatchMac: preferred?.executableFileMatchMac || fallback?.executableFileMatchMac || "",
      configFilePath: preferred?.configFilePath || fallback?.configFilePath || "",
      runCommandsBefore: Array.isArray(preferred?.runCommandsBefore) && preferred.runCommandsBefore.length > 0
        ? preferred.runCommandsBefore
        : (Array.isArray(fallback?.runCommandsBefore) ? fallback.runCommandsBefore : []),
      supportedFileTypes: Array.isArray(preferred?.supportedFileTypes) && preferred.supportedFileTypes.length > 0
        ? preferred.supportedFileTypes
        : (Array.isArray(fallback?.supportedFileTypes) ? fallback.supportedFileTypes : []),
      biosRequired: typeof preferred?.biosRequired === "boolean"
        ? preferred.biosRequired
        : !!fallback?.biosRequired,
      autoSearchEnabled: typeof preferred?.autoSearchEnabled === "boolean"
        ? preferred.autoSearchEnabled
        : (typeof fallback?.autoSearchEnabled === "boolean" ? fallback.autoSearchEnabled : true),
      iconFilename: preferred?.iconFilename || fallback?.iconFilename || "",
      source
    };
    merged.downloadLinks = buildEmulatorDownloadLinks(
      merged.name,
      merged.website,
      preferred?.downloadLinks || fallback?.downloadLinks,
      merged.downloadUrl
    );
    return merged;
  }

  ipcMain.handle("get-emulators", async () => {
    try {
      refreshLibraryFromDb();
    } catch (_e) {}

    const installedRows = mapInstalledRows(getEmulatorsState() || []);

    let platformConfigs = [];
    try {
      platformConfigs = await getPlatformConfigs();
    } catch (_e) {}

    const configured = buildConfiguredEmulators(platformConfigs);
    const usedConfiguredIndices = new Set();
    const merged = [];

    for (const installed of installedRows) {
      const idx = configured.findIndex((cfg) => installedMatchesConfigured(installed, cfg));
      if (idx >= 0) {
        const cfg = configured[idx];
        usedConfiguredIndices.add(idx);
        merged.push({
          ...cfg,
          ...installed,
          name: cfg.name || installed.name,
          platform: cfg.platform || installed.platform,
          platformShortName: cfg.platformShortName || installed.platformShortName,
          type: normalizeEmulatorType(installed.type || cfg.type) || "standalone",
          website: cfg.website || installed.website || "",
          downloadUrl: pickDownloadUrl(cfg.downloadUrl, installed.downloadUrl),
          downloadLinks: buildEmulatorDownloadLinks(
            cfg.name || installed.name,
            cfg.website || installed.website,
            cfg.downloadLinks || installed.downloadLinks,
            pickDownloadUrl(cfg.downloadUrl, installed.downloadUrl)
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
          configFilePath: cfg.configFilePath || installed.configFilePath || "",
          runCommandsBefore: Array.isArray(cfg.runCommandsBefore) ? cfg.runCommandsBefore : (Array.isArray(installed.runCommandsBefore) ? installed.runCommandsBefore : []),
          supportedFileTypes: Array.isArray(cfg.supportedFileTypes) ? cfg.supportedFileTypes : (Array.isArray(installed.supportedFileTypes) ? installed.supportedFileTypes : []),
          biosRequired: typeof cfg.biosRequired === "boolean" ? cfg.biosRequired : !!installed.biosRequired,
          autoSearchEnabled: typeof cfg.autoSearchEnabled === "boolean" ? cfg.autoSearchEnabled : (typeof installed.autoSearchEnabled === "boolean" ? installed.autoSearchEnabled : true),
          iconFilename: cfg.iconFilename || "",
          filePath: String(installed.filePath || cfg.filePath || "").trim(),
          filePaths: collectFilePaths(installed, cfg),
          source: "library+config"
        });
      } else {
        merged.push({
          ...installed,
          type: normalizeEmulatorType(installed.type) || "standalone",
          filePath: String(installed.filePath || "").trim(),
          filePaths: collectFilePaths(installed),
          downloadLinks: buildEmulatorDownloadLinks(
            installed.name,
            installed.website,
            installed.downloadLinks,
            installed.downloadUrl
          )
        });
      }
    }

    configured.forEach((cfg, idx) => {
      if (usedConfiguredIndices.has(idx)) return;
      merged.push({
        ...cfg,
        type: normalizeEmulatorType(cfg.type) || "standalone",
        filePath: String(cfg.filePath || "").trim(),
        filePaths: collectFilePaths(cfg),
        downloadLinks: buildEmulatorDownloadLinks(cfg.name, cfg.website, cfg.downloadLinks, cfg.downloadUrl)
      });
    });

    const deduped = [];
    const byKey = new Map();
    merged.forEach((row) => {
      const platformKey = String(row?.platformShortName || "").trim().toLowerCase();
      const nameKey = normalizeDedupeText(row?.name);
      const key = `${platformKey}::${nameKey}`;
      if (!platformKey || !nameKey) {
        deduped.push(row);
        return;
      }
      const existingIndex = byKey.get(key);
      if (existingIndex == null) {
        byKey.set(key, deduped.length);
        deduped.push(row);
        return;
      }
      deduped[existingIndex] = mergeDuplicateRows(deduped[existingIndex], row);
    });

    deduped.sort((a, b) => {
      const p = String(a.platform || a.platformShortName || "").localeCompare(String(b.platform || b.platformShortName || ""));
      if (p !== 0) return p;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });

    return deduped;
  });
}

module.exports = {
  registerEmulatorCatalogHandlers
};
