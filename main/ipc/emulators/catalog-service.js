function createEmulatorCatalogService(deps = {}) {
  const {
    path,
    fsSync,
    normalizePlatform,
    normalizeEmulatorName,
    normalizeEmulatorType,
    ensureHttpUrl,
    buildEmulatorDownloadLinks,
    normalizeDownloadUrlMap
  } = deps;

  if (!path) throw new Error("createEmulatorCatalogService requires path");
  if (!fsSync) throw new Error("createEmulatorCatalogService requires fsSync");
  if (typeof normalizePlatform !== "function") throw new Error("createEmulatorCatalogService requires normalizePlatform");
  if (typeof normalizeEmulatorName !== "function") throw new Error("createEmulatorCatalogService requires normalizeEmulatorName");
  if (typeof normalizeEmulatorType !== "function") throw new Error("createEmulatorCatalogService requires normalizeEmulatorType");
  if (typeof ensureHttpUrl !== "function") throw new Error("createEmulatorCatalogService requires ensureHttpUrl");
  if (typeof buildEmulatorDownloadLinks !== "function") throw new Error("createEmulatorCatalogService requires buildEmulatorDownloadLinks");
  if (typeof normalizeDownloadUrlMap !== "function") throw new Error("createEmulatorCatalogService requires normalizeDownloadUrlMap");

  function hasAnyDownloadUrl(input) {
    const normalized = normalizeDownloadUrlMap(input);
    return normalized.windows.length > 0 || normalized.linux.length > 0 || normalized.mac.length > 0;
  }

  function firstDownloadUrl(input) {
    const normalized = normalizeDownloadUrlMap(input);
    return normalized.windows[0] || normalized.linux[0] || normalized.mac[0] || "";
  }

  function buildConfiguredEmulators(platformConfigs) {
    const out = [];
    const seen = new Set();

    for (const config of platformConfigs || []) {
      const platformShortName = normalizePlatform(config?.shortName) || "unknown";
      const platformName = String(config?.name || platformShortName);

      for (const emu of (config?.emulators || [])) {
        const name = String(emu?.name || "").trim();
        if (!name) continue;
        const normalizedDownloadUrl = normalizeDownloadUrlMap(emu?.downloadUrl);
        const downloadUrl = hasAnyDownloadUrl(normalizedDownloadUrl) ? normalizedDownloadUrl : "";
        const website = ensureHttpUrl(emu?.website || firstDownloadUrl(normalizedDownloadUrl));
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
          filePaths: [],
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
          configFilePath: String(emu?.configFilePath || "").trim(),
          runCommandsBefore: Array.isArray(emu?.runCommandsBefore)
            ? emu.runCommandsBefore.map((cmd) => String(cmd || "").trim()).filter(Boolean)
            : [],
          supportedFileTypes: Array.isArray(emu?.supportedFileTypes)
            ? emu.supportedFileTypes.map((ext) => String(ext || "").trim()).filter(Boolean)
            : [],
          biosRequired: !!emu?.biosRequired,
          autoSearchEnabled: emu?.autoSearchEnabled !== false,
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
    const fileName = filePath ? path.basename(filePath) : "";
    const exeBase = filePath
      ? path.basename(filePath, path.extname(filePath))
      : String(installed?.name || "").trim();

    const installedNameNorm = normalizeEmulatorName(installed?.name);
    const exeNorm = normalizeEmulatorName(exeBase);
    const configuredNameNorm = normalizeEmulatorName(configured?.name);
    const containsEither = (a, b) => !!(a && b && (a.includes(b) || b.includes(a)));

    if (installedNameNorm && installedNameNorm === configuredNameNorm) return true;
    if (exeNorm && exeNorm === configuredNameNorm) return true;
    if (containsEither(installedNameNorm, configuredNameNorm)) return true;
    if (containsEither(exeNorm, configuredNameNorm)) return true;

    const searchString = String(configured?.searchString || "").trim();
    const searchCandidates = [
      fileName,
      `${exeBase}.exe`,
      exeBase,
      String(installed?.name || "").trim(),
      filePath
    ].filter(Boolean);

    const regexSources = [
      searchString,
      String(configured?.executableFileMatchWin || "").trim(),
      String(configured?.executableFileMatchLinux || "").trim(),
      String(configured?.executableFileMatchMac || "").trim()
    ].filter(Boolean);

    for (const source of regexSources) {
      try {
        const re = new RegExp(source, "i");
        if (searchCandidates.some((candidate) => re.test(candidate))) return true;
      } catch (_e) {}
    }

    return false;
  }

  function mapInstalledRows(installedRows) {
    return (installedRows || []).map((emu) => {
      const filePath = String(emu?.filePath || "").trim();
      const installed = !!filePath && fsSync.existsSync(filePath);
      const normalizedDownloadUrl = normalizeDownloadUrlMap(emu?.downloadUrl);
      const downloadUrl = hasAnyDownloadUrl(normalizedDownloadUrl) ? normalizedDownloadUrl : "";
      const website = ensureHttpUrl(emu?.website || firstDownloadUrl(normalizedDownloadUrl));
      return {
        ...emu,
        filePath,
        filePaths: filePath ? [filePath] : [],
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
        configFilePath: String(emu?.configFilePath || "").trim(),
        runCommandsBefore: Array.isArray(emu?.runCommandsBefore)
          ? emu.runCommandsBefore.map((cmd) => String(cmd || "").trim()).filter(Boolean)
          : [],
        supportedFileTypes: Array.isArray(emu?.supportedFileTypes)
          ? emu.supportedFileTypes.map((ext) => String(ext || "").trim()).filter(Boolean)
          : [],
        biosRequired: !!emu?.biosRequired,
        autoSearchEnabled: emu?.autoSearchEnabled !== false,
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
