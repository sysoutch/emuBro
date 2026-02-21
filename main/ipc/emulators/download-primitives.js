function createDownloadPrimitives(deps = {}) {
  const {
    runtimePlatform,
    getArchiveKind,
    path
  } = deps;

  if (!path) throw new Error("createDownloadPrimitives requires path");
  if (typeof getArchiveKind !== "function") throw new Error("createDownloadPrimitives requires getArchiveKind");

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

  function normalizeUrlList(rawValue) {
    const input = Array.isArray(rawValue) ? rawValue : [rawValue];
    const out = [];
    const seen = new Set();
    input.forEach((entry) => {
      const url = ensureHttpUrl(entry);
      if (!url) return;
      const key = url.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(url);
    });
    return out;
  }

  function firstUrlFromList(list) {
    const items = Array.isArray(list) ? list : [];
    return items.length > 0 ? String(items[0] || "") : "";
  }

  function normalizeDownloadUrlMap(rawDownloadUrl) {
    const empty = {
      windows: [],
      linux: [],
      mac: []
    };

    if (!rawDownloadUrl) return empty;

    if (typeof rawDownloadUrl === "string" || Array.isArray(rawDownloadUrl)) {
      const shared = normalizeUrlList(rawDownloadUrl);
      return {
        windows: [...shared],
        linux: [...shared],
        mac: [...shared]
      };
    }

    if (typeof rawDownloadUrl !== "object") return empty;

    const sharedFallback = normalizeUrlList(
      rawDownloadUrl.all
      || rawDownloadUrl.default
      || rawDownloadUrl.any
      || ""
    );
    const windows = normalizeUrlList(rawDownloadUrl.windows || rawDownloadUrl.win || rawDownloadUrl.win32 || "");
    const linux = normalizeUrlList(rawDownloadUrl.linux || "");
    const mac = normalizeUrlList(rawDownloadUrl.mac || rawDownloadUrl.macos || rawDownloadUrl.darwin || rawDownloadUrl.osx || "");

    return {
      windows: windows.length ? windows : [...sharedFallback],
      linux: linux.length ? linux : [...sharedFallback],
      mac: mac.length ? mac : [...sharedFallback]
    };
  }

  function normalizeDownloadLinks(rawLinks) {
    const links = (rawLinks && typeof rawLinks === "object") ? rawLinks : {};
    const windowsLinks = normalizeUrlList(links.windows || links.win || links.win32 || "");
    const linuxLinks = normalizeUrlList(links.linux || "");
    const macLinks = normalizeUrlList(links.mac || links.macos || links.darwin || "");
    return {
      windows: firstUrlFromList(windowsLinks),
      linux: firstUrlFromList(linuxLinks),
      mac: firstUrlFromList(macLinks)
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

  function getDownloadSourceUrl(_name, website, downloadUrl, osKey) {
    const normalizedOs = normalizeDownloadOsKey(osKey);
    const mapped = normalizeDownloadUrlMap(downloadUrl);
    const osPreferred = firstUrlFromList(mapped[normalizedOs]);
    if (osPreferred) return osPreferred;

    const fallback = firstUrlFromList(mapped.windows) || firstUrlFromList(mapped.linux) || firstUrlFromList(mapped.mac);
    if (fallback) return fallback;
    return ensureHttpUrl(website);
  }

  function buildEmulatorDownloadLinks(name, website, rawLinks, downloadUrl) {
    const explicit = normalizeDownloadLinks(rawLinks);
    const mapped = normalizeDownloadUrlMap(downloadUrl);
    const source = getDownloadSourceUrl(name, website, downloadUrl, "windows");
    if (!source && !firstUrlFromList(mapped.windows) && !firstUrlFromList(mapped.linux) && !firstUrlFromList(mapped.mac)) {
      return explicit;
    }

    return {
      windows: explicit.windows || firstUrlFromList(mapped.windows) || source,
      linux: explicit.linux || firstUrlFromList(mapped.linux) || source,
      mac: explicit.mac || firstUrlFromList(mapped.mac) || source
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

  function isInstallerLikeName(fileName) {
    const lower = String(fileName || "").toLowerCase();
    if (/\.(msi|msix|appx|dmg|pkg|deb|rpm)$/i.test(lower)) return true;
    return /\b(setup|installer|install)\b/.test(lower);
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

  function getEmulatorDownloadUrlCandidates(emulator, osKey) {
    const normalizedOs = normalizeDownloadOsKey(osKey);
    const mapped = normalizeDownloadUrlMap(emulator?.downloadUrl);
    const links = buildEmulatorDownloadLinks(
      emulator?.name,
      emulator?.website,
      emulator?.downloadLinks,
      emulator?.downloadUrl
    );
    const out = [];
    const seen = new Set();
    const push = (value) => {
      const url = ensureHttpUrl(value);
      if (!url) return;
      const key = url.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(url);
    };

    const primaryList = Array.isArray(mapped[normalizedOs]) ? mapped[normalizedOs] : [];
    primaryList.forEach(push);

    if (normalizedOs !== "windows") (mapped.windows || []).forEach(push);
    if (normalizedOs !== "linux") (mapped.linux || []).forEach(push);
    if (normalizedOs !== "mac") (mapped.mac || []).forEach(push);

    push(links[normalizedOs]);
    if (normalizedOs !== "windows") push(links.windows);
    if (normalizedOs !== "linux") push(links.linux);
    if (normalizedOs !== "mac") push(links.mac);
    push(emulator?.website);

    return out;
  }

  function getPreferredEmulatorDownloadUrl(emulator, osKey) {
    const urls = getEmulatorDownloadUrlCandidates(emulator, osKey);
    return urls[0] || "";
  }

  function buildWaybackMachineUrl(rawUrl) {
    const source = ensureHttpUrl(rawUrl);
    if (!source) return "";
    return `https://web.archive.org/web/*/${source}`;
  }

  return {
    normalizeEmulatorName,
    normalizeEmulatorType,
    normalizeDownloadOsKey,
    sanitizePathSegment,
    ensureHttpUrl,
    normalizeDownloadUrlMap,
    parseGitHubRepoFromUrl,
    buildEmulatorDownloadLinks,
    normalizeDownloadPackageType,
    getDownloadRegexBundleForOs,
    inferDownloadPackageTypeFromName,
    classifyDownloadPackageType,
    scoreAssetForOs,
    selectBestGitHubAsset,
    selectPreferredDownloadOption,
    selectDownloadOptionsByType,
    isInstallerLikeName,
    getFilenameFromUrl,
    getEmulatorDownloadUrlCandidates,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl
  };
}

module.exports = {
  createDownloadPrimitives
};
