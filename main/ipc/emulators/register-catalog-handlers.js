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
}

module.exports = {
  registerEmulatorCatalogHandlers
};
