const path = require("path");
const fsSync = require("fs");
const { Readable } = require("stream");
const { pipeline } = require("stream/promises");

function registerEmulatorIpc(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    shell,
    fetchImpl,
    processPlatform,
    getLibraryPathSettings,
    ensureUniqueDestinationPath,
    movePathSafe,
    getArchiveKind,
    extractArchiveToDir,
    integrateDirectoryContents,
    removePathSafe,
    getPlatformConfigs,
    normalizePlatform,
    refreshLibraryFromDb,
    getEmulatorsState,
    dbUpsertEmulator
  } = deps;

  const runtimePlatform = String(processPlatform || process.platform || "").trim().toLowerCase();
  const fetchFn = typeof fetchImpl === "function" ? fetchImpl : (typeof fetch === "function" ? fetch : null);

  if (!ipcMain) throw new Error("registerEmulatorIpc requires ipcMain");
  if (!app) throw new Error("registerEmulatorIpc requires app");
  if (!shell) throw new Error("registerEmulatorIpc requires shell");
  if (!fetchFn) throw new Error("registerEmulatorIpc requires fetch implementation");
function normalizeEmulatorName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[\s._-]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeEmulatorType(type) {
  const raw = String(type || "").trim().toLowerCase();
  if (raw === "standalone" || raw === "core" || raw === "web") return raw;
  return "";
}

function normalizeDownloadOsKey(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "win32" || value === "windows" || value === "win") return "windows";
  if (value === "darwin" || value === "mac" || value === "macos" || value === "osx") return "mac";
  if (value === "linux") return "linux";
  if (runtimePlatform === "win32") return "windows";
  if (runtimePlatform === "darwin") return "mac";
  return "linux";
}

function sanitizePathSegment(name) {
  return String(name || "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .replace(/[. ]+$/g, "")
    || "item";
}

function ensureHttpUrl(rawUrl) {
  let next = String(rawUrl || "").trim();
  if (!next) return "";
  if (!/^https?:\/\//i.test(next)) next = `https://${next}`;
  return next;
}

function normalizeDownloadLinks(rawLinks) {
  const links = (rawLinks && typeof rawLinks === "object") ? rawLinks : {};
  return {
    windows: ensureHttpUrl(links.windows || links.win || links.win32 || ""),
    linux: ensureHttpUrl(links.linux || ""),
    mac: ensureHttpUrl(links.mac || links.macos || links.darwin || "")
  };
}

function parseGitHubRepoFromUrl(rawUrl) {
  const input = ensureHttpUrl(rawUrl);
  if (!input) return null;
  try {
    const parsed = new URL(input);
    if (!/github\.com$/i.test(parsed.hostname)) return null;
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = String(parts[1] || "").replace(/\.git$/i, "");
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch (_e) {
    return null;
  }
}

function getDownloadSourceUrl(name, website, downloadUrl) {
  const explicitDownloadUrl = ensureHttpUrl(downloadUrl);
  if (explicitDownloadUrl) return explicitDownloadUrl;
  return ensureHttpUrl(website);
}

function buildEmulatorDownloadLinks(name, website, rawLinks, downloadUrl) {
  const explicit = normalizeDownloadLinks(rawLinks);
  const source = getDownloadSourceUrl(name, website, downloadUrl);
  if (!source) return explicit;

  return {
    windows: explicit.windows || source,
    linux: explicit.linux || source,
    mac: explicit.mac || source
  };
}

function compileRegexOrNull(pattern) {
  const source = String(pattern || "").trim();
  if (!source) return null;
  try {
    return new RegExp(source, "i");
  } catch (_e) {
    return null;
  }
}

function getDownloadPatternForOs(emulator, osKey, patternKind) {
  const key = normalizeDownloadOsKey(osKey);
  if (patternKind === "archive") {
    if (key === "windows") return String(emulator?.archiveFileMatchWin || "").trim();
    if (key === "linux") return String(emulator?.archiveFileMatchLinux || "").trim();
    return String(emulator?.archiveFileMatchMac || "").trim();
  }
  if (patternKind === "setup" || patternKind === "installer") {
    if (key === "windows") return String(emulator?.setupFileMatchWin || "").trim();
    if (key === "linux") return String(emulator?.setupFileMatchLinux || "").trim();
    return String(emulator?.setupFileMatchMac || "").trim();
  }
  if (patternKind === "executable") {
    if (key === "windows") return String(emulator?.executableFileMatchWin || "").trim();
    if (key === "linux") return String(emulator?.executableFileMatchLinux || "").trim();
    return String(emulator?.executableFileMatchMac || "").trim();
  }
  return "";
}

function normalizeDownloadPackageType(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "setup") return "installer";
  if (value === "install") return "installer";
  if (value === "portable") return "executable";
  if (value === "binary") return "executable";
  if (value === "exe") return "executable";
  if (value === "installer" || value === "archive" || value === "executable") return value;
  return "";
}

function getDownloadRegexBundleForOs(emulator, osKey) {
  return {
    installer: compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "installer")),
    archive: compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "archive")),
    executable: compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "executable"))
  };
}

function inferDownloadPackageTypeFromName(name, osKey) {
  const rawName = String(name || "").trim();
  if (!rawName) return "";
  const lower = rawName.toLowerCase();
  const normalizedOs = normalizeDownloadOsKey(osKey);

  if (getArchiveKind(lower)) return "archive";

  if (normalizedOs === "windows") {
    if (/\.(msi|msix|appx)$/i.test(lower)) return "installer";
    if (lower.endsWith(".exe")) {
      return isInstallerLikeName(lower) ? "installer" : "executable";
    }
  } else if (normalizedOs === "linux") {
    if (/\.(deb|rpm|snap|flatpak)$/i.test(lower)) return "installer";
    if (lower.endsWith(".appimage")) return "executable";
  } else {
    if (/\.(dmg|pkg)$/i.test(lower)) return "installer";
    if (lower.endsWith(".app")) return "executable";
  }

  if (isInstallerLikeName(lower)) return "installer";
  return "";
}

function classifyDownloadPackageType(name, osKey, regexBundle) {
  const fileName = String(name || "").trim();
  if (!fileName) return "";
  const regexes = (regexBundle && typeof regexBundle === "object") ? regexBundle : {};

  if (regexes.installer && regexes.installer.test(fileName)) return "installer";
  if (regexes.archive && regexes.archive.test(fileName)) return "archive";
  if (regexes.executable && regexes.executable.test(fileName)) return "executable";

  return inferDownloadPackageTypeFromName(fileName, osKey);
}

function scoreAssetForOs(assetName, osKey) {
  const name = String(assetName || "").toLowerCase();
  const key = normalizeDownloadOsKey(osKey);
  let score = 0;

  if (key === "windows") {
    if (name.includes("win")) score += 4;
    if (name.includes("windows")) score += 5;
    if (/\.(zip|7z|rar|exe|msi|msix|appx)$/.test(name)) score += 4;
  } else if (key === "linux") {
    if (name.includes("linux")) score += 5;
    if (name.includes("appimage")) score += 5;
    if (/\.(tar|tar\.gz|tar\.xz|tgz|zip|appimage|deb|rpm)$/.test(name)) score += 4;
  } else {
    if (name.includes("mac")) score += 4;
    if (name.includes("osx") || name.includes("darwin") || name.includes("macos")) score += 5;
    if (/\.(dmg|pkg|zip|app)$/.test(name)) score += 4;
  }

  if (name.includes("x64") || name.includes("x86_64") || name.includes("amd64")) score += 2;
  if (name.includes("debug") || name.includes("symbols") || name.includes("source")) score -= 3;
  return score;
}

function selectBestGitHubAsset(release, emulator, osKey) {
  const assets = Array.isArray(release?.assets) ? release.assets : [];
  if (assets.length === 0) return null;

  const setupRegex = compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "installer"));
  const archiveRegex = compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "archive"));
  const executableRegex = compileRegexOrNull(getDownloadPatternForOs(emulator, osKey, "executable"));

  if (setupRegex) {
    const match = assets.find((asset) => setupRegex.test(String(asset?.name || "")));
    if (match) return match;
  }

  if (archiveRegex) {
    const match = assets.find((asset) => archiveRegex.test(String(asset?.name || "")));
    if (match) return match;
  }

  if (executableRegex) {
    const match = assets.find((asset) => executableRegex.test(String(asset?.name || "")));
    if (match) return match;
  }

  const ranked = assets
    .map((asset) => ({ asset, score: scoreAssetForOs(asset?.name, osKey) }))
    .sort((a, b) => b.score - a.score);

  if (ranked.length && ranked[0].score > 0) return ranked[0].asset;
  return assets[0] || null;
}

async function fetchGitHubLatestRelease(repoInfo) {
  const apiUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/releases/latest`;
  const res = await fetchFn(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "emuBro"
    }
  });
  if (!res.ok) {
    throw new Error(`GitHub release lookup failed (${res.status})`);
  }
  return await res.json();
}

function isLikelyDirectDownloadUrl(rawUrl) {
  const input = ensureHttpUrl(rawUrl);
  if (!input) return false;
  try {
    const parsed = new URL(input);
    const pathname = String(parsed.pathname || "").toLowerCase();
    if (getArchiveKind(pathname)) return true;
    return /\.(exe|msi|msix|appx|dmg|pkg|appimage|deb|rpm)$/i.test(pathname);
  } catch (_e) {
    return false;
  }
}

function extractFilenameFromContentDisposition(value) {
  const header = String(value || "").trim();
  if (!header) return "";
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8 && utf8[1]) {
    try {
      return decodeURIComponent(utf8[1]).trim();
    } catch (_e) {}
  }
  const plain = header.match(/filename=\"?([^\";]+)\"?/i);
  if (plain && plain[1]) return String(plain[1]).trim();
  return "";
}

async function downloadUrlToFile(url, targetPath) {
  const res = await fetchFn(url, {
    headers: {
      Accept: "*/*",
      "User-Agent": "emuBro"
    },
    redirect: "follow"
  });

  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  if (!res.body) throw new Error("Download returned empty response");

  fsSync.mkdirSync(path.dirname(targetPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fsSync.createWriteStream(targetPath));

  return {
    contentType: String(res.headers.get("content-type") || "").trim(),
    fileNameFromHeader: extractFilenameFromContentDisposition(res.headers.get("content-disposition"))
  };
}

function findEmulatorBinaryInFolder(rootDir, searchString, osKey) {
  const root = String(rootDir || "").trim();
  if (!root || !fsSync.existsSync(root)) return "";

  const matcher = compileRegexOrNull(searchString);
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const fallbackCandidates = [];
  const queue = [root];
  let visitedDirs = 0;

  while (queue.length > 0 && visitedDirs < 10000) {
    const current = queue.shift();
    visitedDirs += 1;

    let entries = [];
    try {
      entries = fsSync.readdirSync(current, { withFileTypes: true });
    } catch (_e) {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (normalizedOs === "mac" && entry.name.toLowerCase().endsWith(".app")) {
          if (!matcher || matcher.test(entry.name)) return full;
          fallbackCandidates.push(full);
          continue;
        }
        queue.push(full);
        continue;
      }

      if (!entry.isFile()) continue;
      const filename = entry.name;
      const lowerName = filename.toLowerCase();
      if (matcher && (matcher.test(filename) || matcher.test(full))) return full;

      if (normalizedOs === "windows" && lowerName.endsWith(".exe")) {
        fallbackCandidates.push(full);
      } else if (normalizedOs === "linux" && (lowerName.endsWith(".appimage") || !path.extname(lowerName))) {
        fallbackCandidates.push(full);
      } else if (normalizedOs === "mac" && lowerName.endsWith(".app")) {
        fallbackCandidates.push(full);
      }
    }
  }

  return fallbackCandidates[0] || "";
}

function isInstallerLikeName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (/\.(msi|msix|appx|dmg|pkg|deb|rpm)$/i.test(lower)) return true;
  return /\b(setup|installer|install)\b/.test(lower);
}

function rankDownloadOption(option, emulator, osKey) {
  const entry = (option && typeof option === "object") ? option : {};
  const packageType = normalizeDownloadPackageType(entry.packageType);
  const fileName = String(entry.fileName || "").trim();
  const score = Number.isFinite(entry.score) ? Number(entry.score) : scoreAssetForOs(fileName, osKey);

  let rank = score;
  const installerPattern = String(getDownloadPatternForOs(emulator, osKey, "installer") || "").trim();
  const archivePattern = String(getDownloadPatternForOs(emulator, osKey, "archive") || "").trim();
  const executablePattern = String(getDownloadPatternForOs(emulator, osKey, "executable") || "").trim();

  if (packageType === "installer" && installerPattern) rank += 60;
  if (packageType === "archive" && archivePattern) rank += 55;
  if (packageType === "executable" && executablePattern) rank += 50;
  return rank;
}

function selectPreferredDownloadOption(options, emulator, osKey) {
  const list = Array.isArray(options) ? options : [];
  if (!list.length) return null;

  const installerPattern = String(getDownloadPatternForOs(emulator, osKey, "installer") || "").trim();
  const archivePattern = String(getDownloadPatternForOs(emulator, osKey, "archive") || "").trim();
  const executablePattern = String(getDownloadPatternForOs(emulator, osKey, "executable") || "").trim();

  if (installerPattern) {
    const installer = list.find((item) => normalizeDownloadPackageType(item?.packageType) === "installer");
    if (installer) return installer;
  }
  if (archivePattern) {
    const archive = list.find((item) => normalizeDownloadPackageType(item?.packageType) === "archive");
    if (archive) return archive;
  }
  if (executablePattern) {
    const executable = list.find((item) => normalizeDownloadPackageType(item?.packageType) === "executable");
    if (executable) return executable;
  }

  const ranking = { archive: 3, executable: 2, installer: 1 };
  return [...list].sort((a, b) => {
    const aType = normalizeDownloadPackageType(a?.packageType);
    const bType = normalizeDownloadPackageType(b?.packageType);
    const typeDiff = (ranking[bType] || 0) - (ranking[aType] || 0);
    if (typeDiff !== 0) return typeDiff;
    return rankDownloadOption(b, emulator, osKey) - rankDownloadOption(a, emulator, osKey);
  })[0] || null;
}

function selectDownloadOptionsByType(candidates, emulator, osKey) {
  const byType = new Map();
  const list = Array.isArray(candidates) ? candidates : [];
  for (const candidate of list) {
    const type = normalizeDownloadPackageType(candidate?.packageType);
    const url = ensureHttpUrl(candidate?.url || "");
    if (!type || !url) continue;

    const normalized = {
      packageType: type,
      url,
      fileName: String(candidate?.fileName || "").trim(),
      source: String(candidate?.source || "").trim() || "unknown",
      releaseUrl: ensureHttpUrl(candidate?.releaseUrl || ""),
      score: Number.isFinite(candidate?.score) ? Number(candidate.score) : scoreAssetForOs(candidate?.fileName, osKey)
    };

    const existing = byType.get(type);
    if (!existing || rankDownloadOption(normalized, emulator, osKey) > rankDownloadOption(existing, emulator, osKey)) {
      byType.set(type, normalized);
    }
  }

  const order = ["installer", "archive", "executable"];
  return order
    .map((type) => byType.get(type))
    .filter(Boolean);
}

function getFilenameFromUrl(rawUrl) {
  const input = ensureHttpUrl(rawUrl);
  if (!input) return "";
  try {
    const parsed = new URL(input);
    return decodeURIComponent(path.basename(parsed.pathname || ""));
  } catch (_e) {
    return "";
  }
}

function getPreferredEmulatorDownloadUrl(emulator, osKey) {
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const downloadLinks = buildEmulatorDownloadLinks(
    emulator?.name,
    emulator?.website,
    emulator?.downloadLinks,
    emulator?.downloadUrl
  );
  return ensureHttpUrl(downloadLinks[normalizedOs] || emulator?.downloadUrl || emulator?.website || "");
}

function buildWaybackMachineUrl(rawUrl) {
  const source = ensureHttpUrl(rawUrl);
  if (!source) return "";
  return `https://web.archive.org/web/*/${source}`;
}

async function listEmulatorDownloadTargets(emulator, osKey) {
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const preferredUrl = getPreferredEmulatorDownloadUrl(emulator, normalizedOs);
  if (!preferredUrl) {
    throw new Error("No download URL available for this emulator");
  }

  const regexBundle = getDownloadRegexBundleForOs(emulator, normalizedOs);
  const candidates = [];
  let manualUrl = preferredUrl;

  const repo = parseGitHubRepoFromUrl(preferredUrl);
  if (repo) {
    try {
      const release = await fetchGitHubLatestRelease(repo);
      const releaseUrl = ensureHttpUrl(release?.html_url || preferredUrl);
      manualUrl = releaseUrl || preferredUrl;
      const assets = Array.isArray(release?.assets) ? release.assets : [];

      for (const asset of assets) {
        const assetUrl = ensureHttpUrl(asset?.browser_download_url || "");
        if (!assetUrl) continue;

        const fileName = String(asset?.name || getFilenameFromUrl(assetUrl)).trim();
        if (!fileName) continue;

        const packageType = classifyDownloadPackageType(fileName, normalizedOs, regexBundle);
        if (!packageType) continue;

        const score = scoreAssetForOs(fileName, normalizedOs);
        if (score <= 0 && !(regexBundle.archive?.test(fileName) || regexBundle.installer?.test(fileName) || regexBundle.executable?.test(fileName))) {
          continue;
        }

        candidates.push({
          packageType,
          url: assetUrl,
          fileName,
          score,
          source: "github-release",
          releaseUrl
        });
      }

      if (candidates.length === 0) {
        const bestAsset = selectBestGitHubAsset(release, emulator, normalizedOs);
        if (bestAsset?.browser_download_url) {
          const fallbackName = String(bestAsset?.name || getFilenameFromUrl(bestAsset.browser_download_url)).trim();
          const fallbackType = classifyDownloadPackageType(fallbackName, normalizedOs, regexBundle);
          if (fallbackType) {
            candidates.push({
              packageType: fallbackType,
              url: ensureHttpUrl(bestAsset.browser_download_url),
              fileName: fallbackName,
              score: scoreAssetForOs(fallbackName, normalizedOs),
              source: "github-release",
              releaseUrl
            });
          }
        }
      }
    } catch (_e) {
      // Fall through to direct URL handling.
    }
  }

  if (candidates.length === 0 && isLikelyDirectDownloadUrl(preferredUrl)) {
    const fileName = getFilenameFromUrl(preferredUrl);
    const packageType = classifyDownloadPackageType(fileName, normalizedOs, regexBundle);
    if (packageType) {
      candidates.push({
        packageType,
        url: preferredUrl,
        fileName,
        score: scoreAssetForOs(fileName, normalizedOs),
        source: "direct-link",
        releaseUrl: ensureHttpUrl(preferredUrl)
      });
    }
  }

  return {
    osKey: normalizedOs,
    options: selectDownloadOptionsByType(candidates, emulator, normalizedOs),
    manualUrl,
    waybackUrl: buildWaybackMachineUrl(manualUrl || preferredUrl)
  };
}

async function resolveEmulatorDownloadTarget(emulator, osKey, preferredType) {
  const normalizedOs = normalizeDownloadOsKey(osKey);
  const requestedType = normalizeDownloadPackageType(preferredType);
  const discovered = await listEmulatorDownloadTargets(emulator, normalizedOs);
  const options = Array.isArray(discovered?.options) ? discovered.options : [];
  const manualUrl = ensureHttpUrl(discovered?.manualUrl || "");

  if (!options.length) {
    return {
      directDownload: false,
      url: manualUrl,
      releaseUrl: manualUrl,
      osKey: normalizedOs,
      options: [],
      waybackUrl: buildWaybackMachineUrl(manualUrl)
    };
  }

  const selected = requestedType
    ? options.find((item) => normalizeDownloadPackageType(item?.packageType) === requestedType)
    : null;
  const preferred = selected || selectPreferredDownloadOption(options, emulator, normalizedOs);
  if (!preferred?.url) {
    return {
      directDownload: false,
      url: manualUrl,
      releaseUrl: manualUrl,
      osKey: normalizedOs,
      options,
      waybackUrl: buildWaybackMachineUrl(manualUrl)
    };
  }

  return {
    directDownload: true,
    osKey: normalizedOs,
    url: preferred.url,
    fileName: preferred.fileName || "",
    packageType: normalizeDownloadPackageType(preferred.packageType),
    source: preferred.source || "unknown",
    releaseUrl: ensureHttpUrl(preferred.releaseUrl || manualUrl || preferred.url),
    options,
    waybackUrl: buildWaybackMachineUrl(manualUrl || preferred.url)
  };
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

ipcMain.handle("get-emulators", async () => {
  try {
    refreshLibraryFromDb();
  } catch (_e) {}

  const installedRows = (getEmulatorsState() || []).map((emu) => {
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

ipcMain.handle("get-emulator-download-options", async (_event, payload = {}) => {
  try {
    const emulator = (payload && typeof payload === "object") ? payload : {};
    const name = String(emulator?.name || "").trim();
    if (!name) return { success: false, message: "Missing emulator name" };

    const osKey = normalizeDownloadOsKey(payload?.os || runtimePlatform);
    const resolved = await resolveEmulatorDownloadTarget(emulator, osKey, "");
    return {
      success: true,
      osKey,
      options: Array.isArray(resolved?.options) ? resolved.options : [],
      recommendedType: normalizeDownloadPackageType(resolved?.packageType || ""),
      manualUrl: ensureHttpUrl(resolved?.releaseUrl || resolved?.url || ""),
      waybackUrl: ensureHttpUrl(resolved?.waybackUrl || "")
    };
  } catch (error) {
    log.error("get-emulator-download-options failed:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("download-install-emulator", async (_event, payload = {}) => {
  try {
    const emulator = (payload && typeof payload === "object") ? payload : {};
    const name = String(emulator?.name || "").trim();
    const platformName = String(emulator?.platform || "").trim() || "Unknown";
    const platformShortName = normalizePlatform(emulator?.platformShortName) || "unknown";
    if (!name) return { success: false, message: "Missing emulator name" };

    const osKey = normalizeDownloadOsKey(payload?.os || runtimePlatform);
    const useWaybackFallback = !!payload?.useWaybackFallback;
    if (useWaybackFallback) {
      const waybackSourceUrl = ensureHttpUrl(
        payload?.waybackSourceUrl
        || payload?.manualUrl
        || getPreferredEmulatorDownloadUrl(emulator, osKey)
      );
      const waybackUrl = ensureHttpUrl(payload?.waybackUrl || buildWaybackMachineUrl(waybackSourceUrl));
      if (!waybackUrl) {
        return { success: false, message: "No fallback source URL available for Wayback Machine." };
      }
      await shell.openExternal(waybackUrl);
      return {
        success: false,
        manual: true,
        wayback: true,
        message: "Opened Wayback Machine fallback for this emulator.",
        openedUrl: waybackUrl
      };
    }

    const requestedPackageType = normalizeDownloadPackageType(payload?.packageType || "");
    const resolved = await resolveEmulatorDownloadTarget(emulator, osKey, requestedPackageType);
    if (!resolved?.url) {
      return { success: false, message: "No download source found for this emulator" };
    }

    if (!resolved.directDownload) {
      await shell.openExternal(resolved.url);
      return {
        success: false,
        manual: true,
        message: "No direct package found. Opened the download page in your browser.",
        openedUrl: resolved.url
      };
    }

    const selectedPackageType = normalizeDownloadPackageType(resolved?.packageType || requestedPackageType);

    const settings = getLibraryPathSettings();
    const preferredRoot = String(payload?.targetDir || "").trim();
    const baseInstallRoot = preferredRoot
      || (Array.isArray(settings?.emulatorFolders) && settings.emulatorFolders[0])
      || path.join(app.getPath("userData"), "library-storage", "emulators");
    const platformDir = path.join(baseInstallRoot, sanitizePathSegment(platformShortName));
    const emulatorDir = path.join(platformDir, sanitizePathSegment(name));
    fsSync.mkdirSync(emulatorDir, { recursive: true });

    const tempDir = path.join(app.getPath("temp"), "emubro-downloads", "emulators");
    fsSync.mkdirSync(tempDir, { recursive: true });

    const urlFileName = (() => {
      try {
        const parsed = new URL(resolved.url);
        return decodeURIComponent(path.basename(parsed.pathname || ""));
      } catch (_e) {
        return "";
      }
    })();

    const suggestedName = String(resolved.fileName || urlFileName || `${sanitizePathSegment(name)}-${Date.now()}`).trim();
    const initialDownloadPath = ensureUniqueDestinationPath(path.join(tempDir, suggestedName));
    const downloadMeta = await downloadUrlToFile(resolved.url, initialDownloadPath);
    const finalName = String(downloadMeta?.fileNameFromHeader || path.basename(initialDownloadPath)).trim();
    const finalDownloadPath = (finalName && finalName !== path.basename(initialDownloadPath))
      ? ensureUniqueDestinationPath(path.join(tempDir, finalName))
      : initialDownloadPath;
    if (finalDownloadPath !== initialDownloadPath) {
      movePathSafe(initialDownloadPath, finalDownloadPath);
    }

    const archiveKind = getArchiveKind(finalDownloadPath);
    let installedPath = "";
    let packagePath = "";

    if (archiveKind) {
      const extractRoot = ensureUniqueDestinationPath(
        path.join(tempDir, `${sanitizePathSegment(name)}-extract`)
      );
      fsSync.mkdirSync(extractRoot, { recursive: true });
      await extractArchiveToDir(finalDownloadPath, extractRoot);

      const ctx = {
        policy: "",
        operationLabel: "Install Emulator Package",
        discardSkippedSources: true,
        cancelled: false,
        stats: { moved: 0, replaced: 0, keptBoth: 0, skipped: 0, conflicts: 0 }
      };
      const integrated = await integrateDirectoryContents(extractRoot, emulatorDir, ctx);
      removePathSafe(extractRoot);

      if (!integrated || ctx.cancelled) {
        return {
          success: false,
          canceled: true,
          message: "Installation canceled during conflict resolution.",
          installDir: emulatorDir,
          stats: ctx.stats
        };
      }

      packagePath = emulatorDir;
      installedPath = findEmulatorBinaryInFolder(emulatorDir, emulator?.searchString, osKey);
    } else {
      const destination = ensureUniqueDestinationPath(path.join(emulatorDir, path.basename(finalDownloadPath)));
      movePathSafe(finalDownloadPath, destination);
      packagePath = destination;
      installedPath = findEmulatorBinaryInFolder(emulatorDir, emulator?.searchString, osKey) || destination;
    }

    const installedFileName = path.basename(installedPath || "");
    const detectedInstalledType = normalizeDownloadPackageType(
      inferDownloadPackageTypeFromName(installedFileName || path.basename(packagePath || ""), osKey)
    );
    const installerOnly = (detectedInstalledType === "installer")
      || (!installedPath && selectedPackageType === "installer")
      || (installedFileName ? isInstallerLikeName(installedFileName) : false);
    if (installedPath && !installerOnly) {
      dbUpsertEmulator({
        name,
        platform: platformName,
        platformShortName,
        filePath: installedPath
      });
      refreshLibraryFromDb();
    }

    if (!installedPath || installerOnly) {
      const message = installerOnly
        ? `Downloaded installer to ${packagePath}. Run it once, then rescan emulators.`
        : `Downloaded package to ${packagePath}. Could not auto-detect the emulator executable yet.`;
      return {
        success: true,
        installed: false,
        packagePath,
        installDir: emulatorDir,
        packageType: selectedPackageType || detectedInstalledType || "",
        message
      };
    }

    return {
      success: true,
      installed: true,
      installedPath,
      packagePath,
      installDir: emulatorDir,
      packageType: selectedPackageType || detectedInstalledType || "",
      message: `Downloaded and installed ${name}.`
    };
  } catch (error) {
    log.error("download-install-emulator failed:", error);
    return { success: false, message: error.message };
  }
});
}

module.exports = {
  registerEmulatorIpc
};
