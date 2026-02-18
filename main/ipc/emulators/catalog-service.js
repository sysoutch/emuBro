function createEmulatorCatalogService(deps = {}) {
  const {
    path,
    fsSync,
    normalizePlatform,
    normalizeEmulatorName,
    normalizeEmulatorType,
    ensureHttpUrl,
    buildEmulatorDownloadLinks
  } = deps;

  if (!path) throw new Error("createEmulatorCatalogService requires path");
  if (!fsSync) throw new Error("createEmulatorCatalogService requires fsSync");
  if (typeof normalizePlatform !== "function") throw new Error("createEmulatorCatalogService requires normalizePlatform");
  if (typeof normalizeEmulatorName !== "function") throw new Error("createEmulatorCatalogService requires normalizeEmulatorName");
  if (typeof normalizeEmulatorType !== "function") throw new Error("createEmulatorCatalogService requires normalizeEmulatorType");
  if (typeof ensureHttpUrl !== "function") throw new Error("createEmulatorCatalogService requires ensureHttpUrl");
  if (typeof buildEmulatorDownloadLinks !== "function") throw new Error("createEmulatorCatalogService requires buildEmulatorDownloadLinks");

  function buildConfiguredEmulators(platformConfigs) {
    const out = [];
    const seen = new Set();

    for (const config of platformConfigs || []) {
      const platformShortName = normalizePlatform(config?.shortName) || "unknown";
      const platformName = String(config?.name || platformShortName);

      for (const emu of (config?.emulators || [])) {
        const name = String(emu?.name || "").trim();
        if (!name) continue;
        const downloadUrl = ensureHttpUrl(emu?.downloadUrl || "");
        const website = ensureHttpUrl(emu?.website || downloadUrl);
        const downloadLinks = buildEmulatorDownloadLinks(name, website, emu?.downloadLinks, downloadUrl);

        const key = `${platformShortName}::${normalizeEmulatorName(name)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          id: `cfg:${platformShortName}:${normalizeEmulatorName(name) || "emu"}`,
          name,
          platform: platformName,
          platformShortName,
          type: normalizeEmulatorType(emu?.type) || "standalone",
          filePath: "",
          isInstalled: false,
          website,
          downloadUrl,
          downloadLinks,
          startParameters: String(emu?.startParameters || "").trim(),
          searchString: String(emu?.searchString || "").trim(),
          archiveFileMatchWin: String(emu?.archiveFileMatchWin || "").trim(),
          archiveFileMatchLinux: String(emu?.archiveFileMatchLinux || "").trim(),
          archiveFileMatchMac: String(emu?.archiveFileMatchMac || "").trim(),
          setupFileMatchWin: String(emu?.setupFileMatchWin || "").trim(),
          setupFileMatchLinux: String(emu?.setupFileMatchLinux || "").trim(),
          setupFileMatchMac: String(emu?.setupFileMatchMac || "").trim(),
          executableFileMatchWin: String(emu?.executableFileMatchWin || "").trim(),
          executableFileMatchLinux: String(emu?.executableFileMatchLinux || "").trim(),
          executableFileMatchMac: String(emu?.executableFileMatchMac || "").trim(),
          iconFilename: String(emu?.iconFilename || "").trim(),
          source: "config"
        });
      }
    }

    return out;
  }

  function installedMatchesConfigured(installed, configured) {
    if (normalizePlatform(installed?.platformShortName) !== normalizePlatform(configured?.platformShortName)) {
      return false;
    }

    const filePath = String(installed?.filePath || "").trim();
    const exeBase = filePath
      ? path.basename(filePath, path.extname(filePath))
      : String(installed?.name || "").trim();

    const installedNameNorm = normalizeEmulatorName(installed?.name);
    const exeNorm = normalizeEmulatorName(exeBase);
    const configuredNameNorm = normalizeEmulatorName(configured?.name);

    if (installedNameNorm && installedNameNorm === configuredNameNorm) return true;
    if (exeNorm && exeNorm === configuredNameNorm) return true;

    const searchString = String(configured?.searchString || "").trim();
    if (!searchString) return false;

    try {
      const re = new RegExp(searchString, "i");
      return re.test(`${exeBase}.exe`) || re.test(exeBase);
    } catch (_e) {
      return false;
    }
  }

  function mapInstalledRows(installedRows) {
    return (installedRows || []).map((emu) => {
      const filePath = String(emu?.filePath || "").trim();
      const installed = !!filePath && fsSync.existsSync(filePath);
      const downloadUrl = ensureHttpUrl(emu?.downloadUrl || "");
      const website = ensureHttpUrl(emu?.website || downloadUrl);
      return {
        ...emu,
        isInstalled: installed,
        type: normalizeEmulatorType(emu?.type) || "",
        website,
        downloadUrl,
        downloadLinks: buildEmulatorDownloadLinks(emu?.name, website, emu?.downloadLinks, downloadUrl),
        archiveFileMatchWin: String(emu?.archiveFileMatchWin || "").trim(),
        archiveFileMatchLinux: String(emu?.archiveFileMatchLinux || "").trim(),
        archiveFileMatchMac: String(emu?.archiveFileMatchMac || "").trim(),
        setupFileMatchWin: String(emu?.setupFileMatchWin || "").trim(),
        setupFileMatchLinux: String(emu?.setupFileMatchLinux || "").trim(),
        setupFileMatchMac: String(emu?.setupFileMatchMac || "").trim(),
        executableFileMatchWin: String(emu?.executableFileMatchWin || "").trim(),
        executableFileMatchLinux: String(emu?.executableFileMatchLinux || "").trim(),
        executableFileMatchMac: String(emu?.executableFileMatchMac || "").trim(),
        source: "library"
      };
    });
  }

  return {
    buildConfiguredEmulators,
    installedMatchesConfigured,
    mapInstalledRows
  };
}

module.exports = {
  createEmulatorCatalogService
};
