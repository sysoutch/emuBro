const path = require("path");
const os = require("os");
const Database = require("better-sqlite3");

function registerImportIpc(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    dialog,
    fs,
    fsSync,
    getMainWindow,
    refreshLibraryFromDb,
    getGamesState,
    getEmulatorsState,
    getPlatformConfigs,
    determinePlatformFromFilename,
    determinePlatformFromFilenameEmus,
    processEmulatorExe,
    inferGameCode,
    lookupGameCodeFromCatalog,
    discoverCoverImageRelative,
    resolveResourcePath,
    dbUpsertGame,
    dbUpsertTags,
    dbUpdateGameMetadata,
    getArchiveKind,
    extractArchiveToDir
  } = deps;

  if (!ipcMain) throw new Error("registerImportIpc requires ipcMain");
  if (!log) throw new Error("registerImportIpc requires log");
  if (!app) throw new Error("registerImportIpc requires app");
  if (!dialog) throw new Error("registerImportIpc requires dialog");
  if (!fs || typeof fs.readdir !== "function") throw new Error("registerImportIpc requires fs promises API");
  if (!fsSync) throw new Error("registerImportIpc requires fsSync");
  if (typeof getMainWindow !== "function") throw new Error("registerImportIpc requires getMainWindow");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerImportIpc requires refreshLibraryFromDb");
  if (typeof getGamesState !== "function") throw new Error("registerImportIpc requires getGamesState");
  if (typeof getEmulatorsState !== "function") throw new Error("registerImportIpc requires getEmulatorsState");
  if (typeof getPlatformConfigs !== "function") throw new Error("registerImportIpc requires getPlatformConfigs");
  if (typeof determinePlatformFromFilename !== "function") throw new Error("registerImportIpc requires determinePlatformFromFilename");
  if (typeof determinePlatformFromFilenameEmus !== "function") throw new Error("registerImportIpc requires determinePlatformFromFilenameEmus");
  if (typeof processEmulatorExe !== "function") throw new Error("registerImportIpc requires processEmulatorExe");
  if (typeof inferGameCode !== "function") throw new Error("registerImportIpc requires inferGameCode");
  if (lookupGameCodeFromCatalog && typeof lookupGameCodeFromCatalog !== "function") {
    throw new Error("registerImportIpc requires lookupGameCodeFromCatalog to be a function");
  }
  if (typeof discoverCoverImageRelative !== "function") throw new Error("registerImportIpc requires discoverCoverImageRelative");
  if (typeof resolveResourcePath !== "function") throw new Error("registerImportIpc requires resolveResourcePath");
  if (typeof dbUpsertGame !== "function") throw new Error("registerImportIpc requires dbUpsertGame");
  if (typeof getArchiveKind !== "function") throw new Error("registerImportIpc requires getArchiveKind");
  if (typeof extractArchiveToDir !== "function") throw new Error("registerImportIpc requires extractArchiveToDir");

  const lookupGameCode = typeof lookupGameCodeFromCatalog === "function"
    ? lookupGameCodeFromCatalog
    : () => null;
  let loggedCatalogLookupFailure = false;

  function normalizeFileExtension(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized) return "";
    return normalized.startsWith(".") ? normalized : `.${normalized}`;
  }

  function pathKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function dedupeStringPaths(values = []) {
    const out = [];
    const seen = new Set();
    for (const raw of (Array.isArray(values) ? values : [])) {
      const p = String(raw || "").trim();
      if (!p) continue;
      const key = pathKey(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
    return out;
  }

  let cachedAppIconDataUrl = "";

  async function resolveFileIconDataUrl(filePath) {
    try {
      const p = String(filePath || "").trim();
      if (!p) return "";
      if (!app || typeof app.getFileIcon !== "function") return "";
      const icon = await app.getFileIcon(p, { size: "normal" });
      if (!icon || typeof icon.isEmpty !== "function" || icon.isEmpty()) return "";
      return typeof icon.toDataURL === "function" ? String(icon.toDataURL() || "").trim() : "";
    } catch (_error) {
      return "";
    }
  }

  function toPngDataUrlFromFile(filePath) {
    try {
      const p = String(filePath || "").trim();
      if (!p) return "";
      if (!fsSync.existsSync(p)) return "";
      const buf = fsSync.readFileSync(p);
      if (!buf || !buf.length) return "";
      const ext = path.extname(p).toLowerCase();
      const mime = ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".svg"
          ? "image/svg+xml"
          : "image/png";
      return `data:${mime};base64,${buf.toString("base64")}`;
    } catch (_error) {
      return "";
    }
  }

  async function resolveAppIconDataUrl() {
    if (cachedAppIconDataUrl) return cachedAppIconDataUrl;
    const appPath = String(app?.getAppPath?.() || "").trim() || process.cwd();
    const execDir = path.dirname(String(process.execPath || "").trim() || process.cwd());
    const candidates = [
      path.join(appPath, "favicon.ico"),
      path.join(appPath, "logo.png"),
      path.join(appPath, "assets", "logo.png"),
      path.join(appPath, "build", "favicon.ico"),
      path.join(process.cwd(), "favicon.ico"),
      path.join(process.cwd(), "logo.png"),
      path.join(process.cwd(), "assets", "logo.png"),
      path.join(execDir, "resources", "favicon.ico"),
      path.join(execDir, "resources", "logo.png")
    ];
    for (const candidate of candidates) {
      const dataUrl = toPngDataUrlFromFile(candidate);
      if (dataUrl) {
        cachedAppIconDataUrl = dataUrl;
        return cachedAppIconDataUrl;
      }
    }
    const execIconDataUrl = await resolveFileIconDataUrl(process.execPath);
    if (execIconDataUrl) {
      cachedAppIconDataUrl = execIconDataUrl;
      return cachedAppIconDataUrl;
    }
    const svgFallback = [
      "<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>",
      "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>",
      "<stop offset='0%' stop-color='#66d8ff'/><stop offset='100%' stop-color='#2f7dff'/>",
      "</linearGradient></defs>",
      "<rect width='128' height='128' rx='24' fill='#0e1a2b'/>",
      "<circle cx='40' cy='64' r='22' fill='url(#g)'/>",
      "<text x='64' y='73' fill='#dff5ff' font-family='Segoe UI, Arial, sans-serif' font-size='24' font-weight='700'>BRO</text>",
      "</svg>"
    ].join("");
    cachedAppIconDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgFallback)}`;
    return cachedAppIconDataUrl;
  }

  async function resolveExecutableIconDataUrl(exePath) {
    return resolveFileIconDataUrl(exePath);
  }

  function osSetupMatchKey() {
    if (process.platform === "win32") return "setupFileMatchWin";
    if (process.platform === "darwin") return "setupFileMatchMac";
    return "setupFileMatchLinux";
  }

  function collectSetupMatchers(platformConfigs = []) {
    const key = osSetupMatchKey();
    const out = [];
    for (const cfg of (platformConfigs || [])) {
      for (const emu of (Array.isArray(cfg?.emulators) ? cfg.emulators : [])) {
        const source = String(emu?.[key] || "").trim();
        if (!source) continue;
        try {
          out.push(new RegExp(source, "i"));
        } catch (error) {
          log.warn(`Invalid ${key} regex for ${cfg?.shortName || cfg?.name || "unknown"} / ${emu?.name || "emulator"}:`, error.message);
        }
      }
    }
    return out;
  }

  function matchesAnySetupPattern(filename, regexes = []) {
    const value = String(filename || "");
    if (!value) return false;
    return (Array.isArray(regexes) ? regexes : []).some((regex) => {
      try {
        return regex.test(value);
      } catch (_e) {
        return false;
      }
    });
  }

  function extensionIsMentioned(source, extension) {
    const src = String(source || "").trim().toLowerCase();
    const ext = normalizeFileExtension(extension);
    if (!src || !ext) return false;
    if (src === ext) return true;

    // Match extension tokens safely so ".h" does not match ".hdf" and ".elf" does not match ".self".
    const escapedExt = ext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const tokenPattern = new RegExp(`(^|[^a-z0-9])${escapedExt}($|[^a-z0-9])`, "i");
    if (tokenPattern.test(src)) return true;

    const escapedRegexExt = ext.startsWith(".")
      ? `\\\\\\.${escapedExt.slice(2)}`
      : `\\\\${escapedExt}`;
    const regexPattern = new RegExp(`(^|[^a-z0-9])${escapedRegexExt}($|[^a-z0-9])`, "i");
    if (regexPattern.test(src)) return true;

    return false;
  }

  function platformSupportsExtension(config, extension) {
    const ext = normalizeFileExtension(extension);
    if (!ext || !config) return false;

    const inImageTypes = (Array.isArray(config?.supportedImageTypes) ? config.supportedImageTypes : [])
      .some((entry) => normalizeFileExtension(entry) === ext || extensionIsMentioned(entry, ext));
    if (inImageTypes) return true;

    const inArchiveTypes = (Array.isArray(config?.supportedArchiveTypes) ? config.supportedArchiveTypes : [])
      .some((entry) => normalizeFileExtension(entry) === ext || extensionIsMentioned(entry, ext));
    if (inArchiveTypes) return true;

    const searchFor = String(config?.searchFor || "").trim();
    if (searchFor) {
      try {
        const regex = new RegExp(searchFor, "i");
        if (regex.test(`dummy${ext}`)) return true;
      } catch (_e) {}
    }

    const inEmulatorSupportedTypes = (Array.isArray(config?.emulators) ? config.emulators : [])
      .some((emu) => (Array.isArray(emu?.supportedFileTypes) ? emu.supportedFileTypes : [])
        .some((entry) => extensionIsMentioned(entry, ext)));
    if (inEmulatorSupportedTypes) return true;

    return false;
  }

  function anyPlatformSupportsExtension(platformConfigs, extension) {
    const ext = normalizeFileExtension(extension);
    if (!ext) return false;
    return (Array.isArray(platformConfigs) ? platformConfigs : []).some((cfg) => platformSupportsExtension(cfg, ext));
  }

  function getDirectArchiveEmulatorNames(config, extension) {
    const ext = normalizeFileExtension(extension);
    if (!ext || !config) return [];
    const names = [];
    for (const emu of (Array.isArray(config?.emulators) ? config.emulators : [])) {
      const emuName = String(emu?.name || "").trim();
      if (!emuName) continue;
      const supportsArchive = (Array.isArray(emu?.supportedFileTypes) ? emu.supportedFileTypes : [])
        .some((entry) => extensionIsMentioned(entry, ext));
      if (!supportsArchive) continue;
      names.push(emuName);
    }
    return Array.from(new Set(names));
  }

  function platformAllowsArchiveExtension(config, extension) {
    const ext = normalizeFileExtension(extension);
    if (!ext || !config) return false;
    return (Array.isArray(config?.supportedArchiveTypes) ? config.supportedArchiveTypes : [])
      .some((entry) => normalizeFileExtension(entry) === ext || extensionIsMentioned(entry, ext));
  }

  function analyzeArchivePath(filePath, platformConfigs = []) {
    const p = String(filePath || "").trim();
    if (!p) return null;
    const archiveKind = String(getArchiveKind(p) || "").trim().toLowerCase();
    if (!archiveKind) return null;
    const ext = normalizeFileExtension(path.extname(p));
    const fileName = path.basename(p);
    const platformConfig = resolveGamePlatformConfig(fileName, p, platformConfigs);
    const emulatorNames = platformConfig
      ? getDirectArchiveEmulatorNames(platformConfig, ext)
      : [];
    const directArchiveSupported = !!platformConfig
      && platformAllowsArchiveExtension(platformConfig, ext)
      && emulatorNames.length > 0;
    return {
      path: p,
      extension: ext,
      archiveKind,
      platformShortName: String(platformConfig?.shortName || "").trim().toLowerCase(),
      platformName: String(platformConfig?.name || "").trim(),
      directArchiveSupported,
      directArchiveEmulators: emulatorNames,
      recommendedMode: directArchiveSupported ? "ask" : "extract"
    };
  }

  function isHttpUrl(value) {
    const input = String(value || "").trim();
    if (!input) return false;
    try {
      const parsed = new URL(input);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_error) {
      return false;
    }
  }

  function parseHttpUrl(value) {
    const input = String(value || "").trim();
    if (!input) return null;
    try {
      const parsed = new URL(input);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  }

  function isHtmlLikeSource(value) {
    const input = String(value || "").trim();
    if (!input) return false;
    if (isHttpUrl(input)) {
      const parsed = parseHttpUrl(input);
      const pathname = String(parsed?.pathname || "").toLowerCase();
      return pathname.endsWith(".html") || pathname.endsWith(".htm");
    }
    const ext = normalizeFileExtension(path.extname(input));
    return ext === ".html" || ext === ".htm";
  }

  function normalizeNameForMatch(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
  }

  function decodeFileUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value.toLowerCase().startsWith("file://")) return value;
    try {
      const parsed = new URL(value);
      let fsPath = decodeURIComponent(parsed.pathname || "");
      if (process.platform === "win32" && /^\/[a-z]:/i.test(fsPath)) {
        fsPath = fsPath.slice(1);
      }
      return fsPath;
    } catch (_error) {
      return value.replace(/^file:\/\//i, "");
    }
  }

  function getBasenameFromSource(source) {
    const input = String(source || "").trim();
    if (!input) return "";
    if (isHttpUrl(input)) {
      const parsed = parseHttpUrl(input);
      return path.basename(String(parsed?.pathname || ""));
    }
    return path.basename(input);
  }

  function toAbsoluteHttpUrl(rawValue, website) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    if (isHttpUrl(value)) return value;
    if (value.startsWith("/") && isHttpUrl(website)) {
      try {
        return new URL(value, website).toString();
      } catch (_error) {
        return "";
      }
    }
    return "";
  }

  function getFirstDownloadUrls(downloadUrl) {
    const out = [];
    if (!downloadUrl) return out;
    if (typeof downloadUrl === "string") {
      if (downloadUrl.trim()) out.push(downloadUrl.trim());
      return out;
    }
    if (Array.isArray(downloadUrl)) {
      downloadUrl.forEach((entry) => {
        const value = String(entry || "").trim();
        if (value) out.push(value);
      });
      return out;
    }
    if (typeof downloadUrl !== "object") return out;
    const keys = ["windows", "win", "linux", "mac", "macos", "darwin", "all", "default", "any"];
    keys.forEach((key) => {
      const source = downloadUrl[key];
      if (typeof source === "string") {
        const value = source.trim();
        if (value) out.push(value);
        return;
      }
      if (!Array.isArray(source)) return;
      source.forEach((entry) => {
        const value = String(entry || "").trim();
        if (value) out.push(value);
      });
    });
    return out;
  }

  function resolveImportedGameCode(payload = {}) {
    const preferredCode = String(payload?.preferredCode || "").trim();
    if (preferredCode) {
      return { code: preferredCode, source: "override" };
    }

    try {
      const match = lookupGameCode({
        platformShortName: payload?.platformShortName,
        platformName: payload?.platformName,
        gameName: payload?.name,
        filePath: payload?.filePath,
        fileName: payload?.fileName
      });
      const codeFromCatalog = String(match?.code || "").trim();
      if (codeFromCatalog) {
        return { code: codeFromCatalog, source: "gamelist", match };
      }
    } catch (error) {
      if (!loggedCatalogLookupFailure) {
        loggedCatalogLookupFailure = true;
        log.warn("gamelist lookup failed; falling back to filename/code inference:", error?.message || error);
      }
    }

    const fallback = String(inferGameCode({
      name: payload?.name,
      filePath: payload?.filePath,
      platformShortName: payload?.platformShortName,
      platform: payload?.platformName
    }) || "").trim();
    if (fallback) return { code: fallback, source: "inferred" };
    return { code: "", source: "none" };
  }

  function collectConfiguredWebEmulators(platformConfigs = []) {
    const rows = [];
    for (const cfg of (Array.isArray(platformConfigs) ? platformConfigs : [])) {
      const platformShortName = String(cfg?.shortName || "").trim().toLowerCase();
      const platformName = String(cfg?.name || platformShortName || "Unknown").trim();
      for (const emu of (Array.isArray(cfg?.emulators) ? cfg.emulators : [])) {
        const type = String(emu?.type || "").trim().toLowerCase();
        if (type !== "web") continue;
        const name = String(emu?.name || "").trim();
        if (!name) continue;
        const website = String(emu?.website || "").trim();
        const webUrl = String(emu?.webUrl || "").trim();
        const webUrlOnline = String(emu?.webUrlOnline || "").trim();
        const startParameters = String(emu?.startParameters || "").trim();
        const downloadCandidates = getFirstDownloadUrls(emu?.downloadUrl);
        const normalizedCandidates = dedupeStringPaths([
          webUrlOnline,
          toAbsoluteHttpUrl(webUrlOnline, website),
          webUrl,
          toAbsoluteHttpUrl(webUrl, website),
          website,
          ...downloadCandidates
        ]).filter((entry) => isHttpUrl(entry));

        rows.push({
          platformShortName,
          platformName,
          name,
          type: "web",
          website,
          webUrl,
          webUrlOnline,
          startParameters,
          supportedFileTypes: Array.isArray(emu?.supportedFileTypes)
            ? emu.supportedFileTypes.map((entry) => String(entry || "").trim()).filter(Boolean)
            : [],
          normalizedCandidates
        });
      }
    }
    return rows;
  }

  function scoreWebEmulatorMatch(source, webEmu) {
    const src = String(source || "").trim();
    if (!src) return 0;
    const sourceBase = String(getBasenameFromSource(src) || "").trim().toLowerCase();
    const sourceBaseNorm = normalizeNameForMatch(path.basename(sourceBase, path.extname(sourceBase)));
    const sourceUrl = parseHttpUrl(src);
    const sourceHost = String(sourceUrl?.host || "").trim().toLowerCase();
    const sourcePath = String(sourceUrl?.pathname || "").trim().toLowerCase();
    const nameNorm = normalizeNameForMatch(webEmu?.name);

    let score = 0;
    const candidates = Array.isArray(webEmu?.normalizedCandidates) ? webEmu.normalizedCandidates : [];
    candidates.forEach((candidate) => {
      const c = String(candidate || "").trim();
      if (!c) return;
      const parsed = parseHttpUrl(c);
      const candidateHost = String(parsed?.host || "").trim().toLowerCase();
      const candidatePath = String(parsed?.pathname || "").trim().toLowerCase();
      const candidateBase = String(path.basename(candidatePath) || "").trim().toLowerCase();

      if (sourceUrl) {
        if (c.toLowerCase() === src.toLowerCase()) score += 500;
        if (sourceHost && candidateHost && sourceHost === candidateHost) score += 120;
        if (sourcePath && candidatePath && sourcePath === candidatePath) score += 220;
        if (sourceBase && candidateBase && sourceBase === candidateBase) score += 140;
      } else {
        if (sourceBase && candidateBase && sourceBase === candidateBase) score += 180;
      }
    });

    if (nameNorm && sourceBaseNorm) {
      if (sourceBaseNorm === nameNorm) score += 120;
      else if (sourceBaseNorm.includes(nameNorm) || nameNorm.includes(sourceBaseNorm)) score += 60;
    }

    return score;
  }

  function sanitizePathSegment(value, fallback = "web-emulator") {
    const normalized = String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, " ")
      .replace(/[. ]+$/g, "")
      .trim();
    return normalized || fallback;
  }

  function extractCodeTail(upperText) {
    const text = String(upperText || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!text) return "";
    const prefixMatch = text.match(/^([A-Z]{4})([0-9]{4,5})$/);
    if (!prefixMatch) return "";
    return `${prefixMatch[1]}-${prefixMatch[2]}`;
  }

  function gameCodeVariants(codeValue) {
    const canonical = extractCodeTail(codeValue);
    if (!canonical) return [];
    const compact = canonical.replace(/[^A-Z0-9]/g, "");
    const prefix = compact.slice(0, 4);
    const digits = compact.slice(4);
    return Array.from(new Set([
      `${prefix}${digits}`,
      `${prefix}-${digits}`,
      `${prefix}_${digits}`
    ]));
  }

  function detectCodesInTextChunk(text, foundMap) {
    const sample = String(text || "").toUpperCase();
    if (!sample) return;

    const patterns = [
      /\b([A-Z]{4})[-_ ]?([0-9]{3})[.\-_ ]?([0-9]{2})\b/g,
      /\b([A-Z]{4})[-_ ]?([0-9]{4,5})\b/g
    ];

    for (const regex of patterns) {
      let match = null;
      while ((match = regex.exec(sample)) !== null) {
        const prefix = String(match[1] || "").toUpperCase();
        const digits = match[3] ? `${String(match[2] || "")}${String(match[3] || "")}` : String(match[2] || "");
        const canonical = extractCodeTail(`${prefix}${digits}`);
        if (!canonical) continue;
        if (!foundMap.has(canonical)) {
          foundMap.set(canonical, { index: Number(match.index) || 0 });
        }
      }
    }
  }

  async function detectIsoGameCodeDetails(filePath) {
    const p = String(filePath || "").trim();
    const ext = normalizeFileExtension(path.extname(p));
    if (!p || ext !== ".iso") {
      return { code: "", variants: [], candidates: [] };
    }

    const fd = await fs.open(p, "r");
    try {
      const stat = await fd.stat();
      const maxBytes = Math.min(Number(stat?.size || 0), 64 * 1024 * 1024);
      const chunkSize = 1024 * 1024;
      const foundMap = new Map();
      let position = 0;
      let carry = "";

      while (position < maxBytes && foundMap.size < 24) {
        const nextSize = Math.min(chunkSize, maxBytes - position);
        const buffer = Buffer.allocUnsafe(nextSize);
        const read = await fd.read(buffer, 0, nextSize, position);
        const bytesRead = Number(read?.bytesRead || 0);
        if (bytesRead <= 0) break;

        const text = `${carry}${buffer.toString("latin1", 0, bytesRead)}`.toUpperCase();
        detectCodesInTextChunk(text, foundMap);
        carry = text.slice(-96);
        position += bytesRead;
      }

      const preferredPrefixes = new Set([
        "SLES", "SCES", "SLUS", "SCUS", "SLPS", "SCPS", "BLES", "BLUS", "BLJS",
        "ULES", "ULUS", "ULJM", "NPEB", "NPUB", "NPJB", "BCES", "BCUS", "BCJS"
      ]);

      const ordered = Array.from(foundMap.entries())
        .sort((a, b) => {
          const aPrefix = String(a[0]).slice(0, 4);
          const bPrefix = String(b[0]).slice(0, 4);
          const aPreferred = preferredPrefixes.has(aPrefix) ? 0 : 1;
          const bPreferred = preferredPrefixes.has(bPrefix) ? 0 : 1;
          if (aPreferred !== bPreferred) return aPreferred - bPreferred;
          return Number(a[1]?.index || 0) - Number(b[1]?.index || 0);
        })
        .map(([code]) => code);

      const code = ordered[0] || "";
      return {
        code,
        variants: gameCodeVariants(code),
        candidates: ordered
      };
    } catch (error) {
      log.warn(`Failed to inspect ISO for game code (${p}):`, error.message);
      return { code: "", variants: [], candidates: [], error: error.message };
    } finally {
      try { await fd.close(); } catch (_e) {}
    }
  }

  function resolveGamePlatformConfig(filename, filePath, platformConfigs) {
    // Auto platform assignment must come only from the platform searchFor regex.
    return determinePlatformFromFilename(filename, filePath, platformConfigs);
  }

  function parseCueReferencedBinNames(cuePath) {
    const p = String(cuePath || "").trim();
    if (!p || !fsSync.existsSync(p)) return [];
    let text = "";
    try {
      text = fsSync.readFileSync(p, "utf8");
    } catch (_e) {
      try {
        text = fsSync.readFileSync(p, "latin1");
      } catch (_e2) {
        return [];
      }
    }
    const out = [];
    const regex = /^\s*FILE\s+(?:"([^"]+)"|([^\r\n]+?))\s+(?:BINARY|MOTOROLA|WAVE|MP3|AIFF|FLAC)\s*$/gim;
    let match = null;
    while ((match = regex.exec(text)) !== null) {
      const value = String(match[1] || match[2] || "").trim();
      if (!value) continue;
      const normalized = value.replace(/^["']+|["']+$/g, "").trim();
      if (!normalized) continue;
      out.push(path.basename(normalized));
    }
    return Array.from(new Set(out.map((row) => String(row || "").trim()).filter(Boolean)));
  }

  function normalizePlatformShortName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function validatePsxCueReferences(cuePath) {
    const p = String(cuePath || "").trim();
    if (!p || !fsSync.existsSync(p)) {
      return { ok: false, message: "CUE file was not found." };
    }
    const dir = path.dirname(p);
    const refs = parseCueReferencedBinNames(p);
    if (!refs.length) {
      return { ok: false, message: "CUE file does not reference any BIN track." };
    }
    const missing = refs.filter((name) => {
      const abs = path.resolve(dir, name);
      return !fsSync.existsSync(abs);
    });
    if (missing.length > 0) {
      return {
        ok: false,
        message: `CUE references missing BIN file(s): ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? "..." : ""}`
      };
    }
    return { ok: true, referencedBins: refs };
  }

  function getSbiPathForBin(binPath) {
    const p = String(binPath || "").trim();
    if (!p) return "";
    const ext = normalizeFileExtension(path.extname(p));
    if (ext !== ".bin") return "";
    return path.join(path.dirname(p), `${path.basename(p, path.extname(p))}.sbi`);
  }

  function validatePsxImportAssets(gameFilePath, platformShortName) {
    const psn = normalizePlatformShortName(platformShortName);
    if (psn !== "psx" && psn !== "ps1" && psn !== "playstation") {
      return { ok: true, warning: "" };
    }
    const p = String(gameFilePath || "").trim();
    const ext = normalizeFileExtension(path.extname(p));
    if (ext === ".cue") {
      return validatePsxCueReferences(p);
    }
    if (ext === ".bin") {
      const sbiPath = getSbiPathForBin(p);
      if (!sbiPath || !fsSync.existsSync(sbiPath)) {
        return {
          ok: true,
          warning: `No matching SBI file found for BIN: ${path.basename(p)}`
        };
      }
      return { ok: true, warning: "", sbiPath };
    }
    return { ok: true, warning: "" };
  }

  function buildArchiveExtractionDirectory(archivePath) {
    const archive = String(archivePath || "").trim();
    const parentDir = path.dirname(archive);
    const baseName = sanitizePathSegment(path.basename(archive, path.extname(archive)), "archive");
    const initial = path.join(parentDir, `${baseName}_extracted`);
    let candidate = initial;
    let suffix = 1;
    while (fsSync.existsSync(candidate)) {
      candidate = path.join(parentDir, `${baseName}_extracted_${suffix}`);
      suffix += 1;
    }
    return candidate;
  }

  function findCueForBinPath(binPath) {
    const p = String(binPath || "").trim();
    if (!p) return "";
    const ext = normalizeFileExtension(path.extname(p));
    if (ext !== ".bin") return "";
    const dir = path.dirname(p);
    const baseName = path.basename(p).toLowerCase();
    const siblingCue = path.join(dir, `${path.basename(p, path.extname(p))}.cue`);
    if (fsSync.existsSync(siblingCue)) {
      try {
        if (fsSync.lstatSync(siblingCue).isFile()) return siblingCue;
      } catch (_e) {}
    }

    let entries = [];
    try {
      entries = fsSync.readdirSync(dir, { withFileTypes: true });
    } catch (_e) {
      return "";
    }

    for (const entry of entries) {
      if (!entry || !entry.isFile || !entry.isFile()) continue;
      if (!String(entry.name || "").toLowerCase().endsWith(".cue")) continue;
      const cuePath = path.join(dir, entry.name);
      const referencedBins = parseCueReferencedBinNames(cuePath).map((row) => String(row || "").toLowerCase());
      if (referencedBins.includes(baseName)) return cuePath;
    }

    return "";
  }

  function getCanonicalGameImportPath(filePath) {
    const p = String(filePath || "").trim();
    if (!p) return "";
    const ext = normalizeFileExtension(path.extname(p));
    if (ext === ".bin") {
      const cuePath = findCueForBinPath(p);
      if (cuePath) return cuePath;
    }
    return p;
  }

  function buildCueContentForBin(binPath) {
    const fileName = path.basename(String(binPath || "").trim());
    return [
      `FILE "${fileName}" BINARY`,
      "  TRACK 01 MODE1/2352",
      "    INDEX 01 00:00:00",
      ""
    ].join("\n");
  }

  function ensureCueForBinImport(filePath) {
    const originalPath = String(filePath || "").trim();
    if (!originalPath) {
      return { importPath: "", generated: false, failed: false, message: "" };
    }
    if (normalizeFileExtension(path.extname(originalPath)) !== ".bin") {
      return { importPath: originalPath, generated: false, failed: false, message: "" };
    }

    const existingCue = findCueForBinPath(originalPath);
    if (existingCue) {
      return {
        importPath: existingCue,
        generated: false,
        failed: false,
        cuePath: existingCue,
        message: ""
      };
    }

    const cuePath = path.join(path.dirname(originalPath), `${path.basename(originalPath, path.extname(originalPath))}.cue`);
    try {
      fsSync.writeFileSync(cuePath, buildCueContentForBin(originalPath), "utf8");
      return {
        importPath: cuePath,
        generated: true,
        failed: false,
        cuePath,
        message: ""
      };
    } catch (error) {
      return {
        importPath: originalPath,
        generated: false,
        failed: true,
        cuePath,
        message: String(error?.message || error || "Failed to generate CUE file.")
      };
    }
  }

  ipcMain.handle("process-emulator-exe", async (_event, filePath) => {
  try {
    log.info("Processing dropped emulator exe:", filePath);
    
    const platformConfigs = await getPlatformConfigs();
    const fileName = path.basename(filePath);
    
    const found = [];
    processEmulatorExe(filePath, fileName, platformConfigs, getEmulatorsState(), found);
    if (found.length > 0) {
      return { success: true, message: `Emulator ${fileName} added`, emulator: found[0] };
    }
    
    return {
      success: true,
      message: `Emulator ${fileName} processed successfully`
    };
  } catch (error) {
    log.error("Failed to process emulator exe:", error);
    return { success: false, message: error.message };
  }
});

async function scanForGamesAndEmulators(selectedDrive, options = {}) {
  log.info("Starting game search");
  try {
    // Ensure de-dupe checks are based on the latest persisted library.
    refreshLibraryFromDb();
  } catch (_e) {}

  const platformConfigs = await getPlatformConfigs();
  const foundPlatforms = [];
  const foundGames = [];
  const foundEmulators = [];
  const foundArchives = [];
  const foundSetupFiles = [];
  const unmatchedGameFiles = [];
  const unmatchedSeen = new Set();
  const archiveSeen = new Set();
  const setupSeen = new Set();
  const discoveryLimit = 2000;
  const setupMatchers = collectSetupMatchers(platformConfigs);
  const scope = String(options?.scope || "both").trim().toLowerCase();
  const scanGames = scope !== "emulators";
  const scanEmulators = scope !== "games";
  const recursive = options && options.recursive === false ? false : true;
  const maxDepth = Number.isFinite(options?.maxDepth)
    ? Math.max(0, Math.floor(options.maxDepth))
    : (recursive ? 50 : 0);

  // load more folders to skip from ignore-folders.json
  const ignoreFoldersPath = resolveResourcePath("ignore-folders.json", { mustExist: true });
  let ignoreFolders = [];
  try {
    const ignoreData = await fsSync.readFileSync(ignoreFoldersPath, "utf8");
    const ignoreJson = JSON.parse(ignoreData);
    ignoreFolders = ignoreJson["ignore-folders"] || [];
  } catch (ignoreErr) {
    log.warn("Failed to read ignore-folders.json:", ignoreErr.message);
  }

  const systemDirs = [
    process.env.WINDIR,
    process.env.APPDATA,
    process.env["PROGRAMFILES"],
    process.env["PROGRAMFILES(X86)"],
    process.env.LOCALAPPDATA,
    "C:\\System Volume Information",
    "C:\\$Recycle.Bin",
    "C:\\Config.Msi"
  ];

  async function scanDirectory(dir, depth = 0) {
    try {
      if (!fsSync.existsSync(dir)) return;
      if (depth > maxDepth) return;

      const items = await fs.readdir(dir).catch(() => []);

      for (const item of items) {
        const itemPath = path.join(dir, item);

        try {
          // Use lstat so we don't follow Windows Junctions/Symlinks
          const stat = await fs.lstat(itemPath);

          if (item.startsWith(".") || stat.isSymbolicLink()) {
            continue;
          }

          if (stat.isDirectory()) {
            if (!recursive && depth > 0) continue;
            if (item.startsWith("$")) continue;
            if (ignoreFolders.some((folder) => item.toLowerCase() === folder.toLowerCase())) continue;

            if (os.platform() === "win32") {
              if (systemDirs.some((sysDir) => sysDir && itemPath.toLowerCase().startsWith(sysDir.toLowerCase()))) {
                continue;
              }
            }

            if (recursive) {
              await scanDirectory(itemPath, depth + 1);
            }
          } else if (stat.isFile()) {
            const filePath = String(itemPath || "").trim();
            const fileName = String(item || "").trim();
            const ext = normalizeFileExtension(path.extname(fileName));

            if (ext === ".zip" || ext === ".rar" || ext === ".iso") {
              const key = pathKey(filePath);
              if (key && !archiveSeen.has(key) && foundArchives.length < discoveryLimit) {
                archiveSeen.add(key);
                foundArchives.push(filePath);
              }
            }

            if (setupMatchers.length > 0 && matchesAnySetupPattern(fileName, setupMatchers)) {
              const key = pathKey(filePath);
              if (key && !setupSeen.has(key) && foundSetupFiles.length < discoveryLimit) {
                setupSeen.add(key);
                foundSetupFiles.push(filePath);
              }
            }

            if (scanGames) {
              const canonicalGamePath = getCanonicalGameImportPath(filePath);
              const canonicalFileName = path.basename(canonicalGamePath || filePath);
              const platformConfig = resolveGamePlatformConfig(canonicalFileName, canonicalGamePath || filePath, platformConfigs);
              if (platformConfig) {
                const gameFilePath = String(canonicalGamePath || filePath).trim();
                const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === gameFilePath.toLowerCase());
                if (!exists) {
                  const name = path.basename(canonicalFileName, path.extname(canonicalFileName));
                  const platformShortName = platformConfig.shortName || "unknown";
                  const code = resolveImportedGameCode({
                    platformShortName,
                    platformName: platformConfig.name || "Unknown",
                    name,
                    filePath: gameFilePath,
                    fileName: canonicalFileName
                  }).code;
                  const image = discoverCoverImageRelative(platformShortName, code, name);

                  const { row, existed: existedInDb } = dbUpsertGame({
                    name,
                    platform: platformConfig.name || "Unknown",
                    platformShortName,
                    filePath: gameFilePath,
                    code: code || null,
                    image: image || null
                  });

                  if (!existedInDb) foundGames.push(row);

                  const psn = String(platformShortName).toLowerCase();
                  if (!foundPlatforms.includes(psn)) {
                    log.info(`Found new platform ${platformConfig.name} shortName ${platformShortName}`);
                    foundPlatforms.push(psn);
                  }

                  refreshLibraryFromDb();
                }
              } else {
                const unmatchedPath = String(canonicalGamePath || filePath).trim();
                const unmatchedExt = normalizeFileExtension(path.extname(unmatchedPath));
                if (!anyPlatformSupportsExtension(platformConfigs, unmatchedExt)) {
                  continue;
                }
                const key = pathKey(unmatchedPath);
                if (key && !unmatchedSeen.has(key) && unmatchedGameFiles.length < discoveryLimit) {
                  unmatchedSeen.add(key);
                  unmatchedGameFiles.push(unmatchedPath);
                }
              }
            }

            if (scanEmulators && itemPath.toLowerCase().endsWith(".exe")) {
              processEmulatorExe(itemPath, item, platformConfigs, getEmulatorsState(), foundEmulators);
            }
          }
        } catch (_fileErr) {
          continue;
        }
      }
    } catch (error) {
      log.warn(`Critical failure scanning ${dir}:`, error.message);
    }
  }

  if (!selectedDrive) {
    const homeDir = os.homedir();
    log.info("Scanning home directory:", homeDir);
    await scanDirectory(homeDir);
  } else {
    let drivePath = selectedDrive;
    if (os.platform() === "win32" && drivePath.length === 2 && drivePath.endsWith(":")) {
      drivePath += "\\";
    }
    log.info("Scanning selected drive:", drivePath);
    await scanDirectory(drivePath);
  }

  log.info(`Game search completed. Found ${foundGames.length} games and ${foundEmulators.length} emulators.`);
  return {
    success: true,
    platforms: foundPlatforms,
    games: foundGames,
    emulators: foundEmulators,
    archives: dedupeStringPaths(foundArchives),
    setupFiles: dedupeStringPaths(foundSetupFiles),
    unmatchedGameFiles: dedupeStringPaths(unmatchedGameFiles)
  };
}

ipcMain.handle("browse-games-and-emus", async (_event, selectedDrive, options = {}) => {
  try {
    return await scanForGamesAndEmulators(selectedDrive, options);
  } catch (error) {
    log.error("Failed to search for games and emulators:", error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle("prompt-scan-subfolders", async (_event, folderPath) => {
  const ownerWindow = getMainWindow();
  if (!ownerWindow) return { canceled: true, recursive: true };

  const folder = String(folderPath || "").trim();
  const res = await dialog.showMessageBox(ownerWindow, {
    type: "question",
    buttons: ["Scan Subfolders", "Only This Folder", "Cancel"],
    defaultId: 0,
    cancelId: 2,
    title: "Import Folder",
    message: "Scan subfolders too?",
    detail: folder
  });

  if (res.response === 2) return { canceled: true };
  return { canceled: false, recursive: res.response === 0 };
});

ipcMain.handle("get-platforms", async () => {
  const platformConfigs = await getPlatformConfigs();
  const platforms = [];

  for (const c of platformConfigs || []) {
    const shortName = String(c?.shortName || "").trim().toLowerCase();
    const name = String(c?.name || "").trim();
    if (!shortName) continue;
    platforms.push({ shortName, name: name || shortName });
  }

  // Optional built-in platform for standalone PC games.
  platforms.push({ shortName: "pc", name: "PC" });

  // De-dupe by shortName
  const seen = new Set();
  return platforms.filter((p) => {
    if (seen.has(p.shortName)) return false;
    seen.add(p.shortName);
    return true;
  }).sort((a, b) => a.name.localeCompare(b.name));
});

ipcMain.handle("get-platforms-for-extension", async (_event, extension) => {
  try {
    const ext = normalizeFileExtension(extension);
    if (!ext) return [];
    const platformConfigs = await getPlatformConfigs();
    const platforms = [];

    for (const c of (platformConfigs || [])) {
      if (!platformSupportsExtension(c, ext)) continue;
      const shortName = String(c?.shortName || "").trim().toLowerCase();
      const name = String(c?.name || "").trim();
      if (!shortName) continue;
      platforms.push({ shortName, name: name || shortName });
    }

    const seen = new Set();
    return platforms
      .filter((p) => {
        if (seen.has(p.shortName)) return false;
        seen.add(p.shortName);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    log.error("get-platforms-for-extension failed:", error);
    return [];
  }
});

ipcMain.handle("import:analyze-archives", async (_event, paths = []) => {
  try {
    const platformConfigs = await getPlatformConfigs();
    const rows = dedupeStringPaths(paths)
      .map((entry) => analyzeArchivePath(entry, platformConfigs))
      .filter(Boolean);
    return {
      success: true,
      archives: rows
    };
  } catch (error) {
    log.error("import:analyze-archives failed:", error);
    return {
      success: false,
      message: error.message,
      archives: []
    };
  }
});

ipcMain.handle("import:analyze-web-emulator-source", async (_event, payload = {}) => {
  try {
    const source = String(
      (payload && typeof payload === "object")
        ? (payload.source || payload.path || payload.url || "")
        : payload
    ).trim();
    if (!source) {
      return { success: false, message: "Missing source.", source: "", htmlLike: false, matches: [] };
    }

    const resolvedSource = source.toLowerCase().startsWith("file://")
      ? decodeFileUrl(source)
      : source;
    const htmlLike = isHtmlLikeSource(resolvedSource);
    const sourceIsUrl = isHttpUrl(resolvedSource);
    const sourceExists = !sourceIsUrl && fsSync.existsSync(resolvedSource);
    const sourceExt = normalizeFileExtension(path.extname(getBasenameFromSource(resolvedSource)));

    const platformConfigs = await getPlatformConfigs();
    const webEmulators = collectConfiguredWebEmulators(platformConfigs);
    const matches = webEmulators
      .map((row) => ({
        ...row,
        score: scoreWebEmulatorMatch(resolvedSource, row)
      }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((row) => ({
        name: row.name,
        platform: row.platformName,
        platformShortName: row.platformShortName,
        website: row.website,
        webUrl: row.webUrl,
        webUrlOnline: row.webUrlOnline,
        startParameters: row.startParameters,
        supportedFileTypes: row.supportedFileTypes,
        score: row.score
      }));

    return {
      success: true,
      source: resolvedSource,
      htmlLike,
      sourceIsUrl,
      sourceExists,
      sourceExtension: sourceExt,
      matches
    };
  } catch (error) {
    log.error("import:analyze-web-emulator-source failed:", error);
    return {
      success: false,
      message: error?.message || String(error),
      source: "",
      htmlLike: false,
      matches: []
    };
  }
});

ipcMain.handle("import:save-web-emulator-source", async (_event, payload = {}) => {
  try {
    refreshLibraryFromDb();
    const sourceRaw = String(payload?.source || payload?.path || payload?.url || "").trim();
    if (!sourceRaw) {
      return { success: false, message: "Missing source." };
    }
    const source = sourceRaw.toLowerCase().startsWith("file://")
      ? decodeFileUrl(sourceRaw)
      : sourceRaw;
    const sourceIsUrl = isHttpUrl(source);
    const action = String(payload?.action || "save").trim().toLowerCase();
    const shouldDownload = action === "save_and_download" || action === "download";

    const match = (payload?.match && typeof payload.match === "object") ? payload.match : {};
    const platformShortName = String(payload?.platformShortName || match?.platformShortName || "").trim().toLowerCase();
    const platformName = String(payload?.platform || match?.platform || platformShortName || "Unknown").trim();
    const emulatorName = String(payload?.name || match?.name || path.basename(getBasenameFromSource(source), path.extname(getBasenameFromSource(source))) || "Web Emulator").trim();
    const startParameters = String(payload?.startParameters || match?.startParameters || "?rom=%gamepath%").trim();
    const website = String(payload?.website || match?.website || "").trim();
    const type = "web";

    if (!platformShortName) {
      return { success: false, message: "Missing platform for web emulator." };
    }

    let storedPath = source;
    let downloadedTo = "";
    if (shouldDownload) {
      const targetRoot = path.join(app.getPath("userData"), "web-emulators", platformShortName);
      fsSync.mkdirSync(targetRoot, { recursive: true });
      const sourceBaseName = getBasenameFromSource(source);
      const sourceExt = normalizeFileExtension(path.extname(sourceBaseName || "")) || ".html";
      const baseFileName = sanitizePathSegment(emulatorName, "web-emulator");
      const desiredPath = path.join(targetRoot, `${baseFileName}${sourceExt === ".htm" ? ".html" : sourceExt}`);
      let targetPath = desiredPath;
      let index = 1;
      while (fsSync.existsSync(targetPath)) {
        targetPath = path.join(targetRoot, `${baseFileName}-${index}${sourceExt === ".htm" ? ".html" : sourceExt}`);
        index += 1;
      }

      if (sourceIsUrl) {
        if (typeof fetch !== "function") {
          return { success: false, message: "Download is not available in this runtime." };
        }
        const response = await fetch(source, { redirect: "follow" });
        if (!response.ok) {
          return { success: false, message: `Failed to download web emulator page (${response.status}).` };
        }
        const text = await response.text();
        fsSync.writeFileSync(targetPath, String(text || ""), "utf8");
      } else {
        if (!fsSync.existsSync(source) || !fsSync.lstatSync(source).isFile()) {
          return { success: false, message: "Source HTML file was not found." };
        }
        fsSync.copyFileSync(source, targetPath);
      }

      storedPath = targetPath;
      downloadedTo = targetPath;
    } else if (!sourceIsUrl) {
      if (!fsSync.existsSync(source) || !fsSync.lstatSync(source).isFile()) {
        return { success: false, message: "Source HTML file was not found." };
      }
    }

    const upsert = dbUpsertEmulator({
      name: emulatorName,
      platform: platformName || platformShortName,
      platformShortName,
      filePath: storedPath,
      type,
      website,
      startParameters
    });
    refreshLibraryFromDb();

    return {
      success: true,
      emulator: upsert?.row || null,
      downloadedTo,
      source,
      storedPath
    };
  } catch (error) {
    log.error("import:save-web-emulator-source failed:", error);
    return {
      success: false,
      message: error?.message || String(error)
    };
  }
});

ipcMain.handle("iso:detect-game-codes", async (_event, paths = []) => {
  try {
    const input = dedupeStringPaths(paths);
    const results = [];
    const codesByPath = {};

    for (const p of input) {
      if (normalizeFileExtension(path.extname(p)) !== ".iso") continue;
      const details = await detectIsoGameCodeDetails(p);
      const normalizedPath = String(p || "").trim();
      if (details?.code) {
        codesByPath[normalizedPath] = details.code;
      }
      results.push({
        path: normalizedPath,
        code: String(details?.code || ""),
        variants: Array.isArray(details?.variants) ? details.variants : [],
        candidates: Array.isArray(details?.candidates) ? details.candidates : [],
        error: String(details?.error || "")
      });
    }

    return { success: true, results, codesByPath };
  } catch (error) {
    log.error("iso:detect-game-codes failed:", error);
    return { success: false, message: error.message, results: [], codesByPath: {} };
  }
});

ipcMain.handle("cue:inspect-bin-files", async (_event, paths = []) => {
  try {
    const input = dedupeStringPaths(paths).filter((p) => normalizeFileExtension(path.extname(p)) === ".bin");
    const results = [];
    for (const p of input) {
      const binPath = String(p || "").trim();
      const cuePath = findCueForBinPath(binPath);
      results.push({
        binPath,
        cuePath: String(cuePath || ""),
        hasCue: !!cuePath
      });
    }
    return { success: true, results };
  } catch (error) {
    log.error("cue:inspect-bin-files failed:", error);
    return { success: false, message: error.message, results: [] };
  }
});

ipcMain.handle("cue:generate-for-bin", async (_event, paths = []) => {
  try {
    const input = dedupeStringPaths(paths).filter((p) => normalizeFileExtension(path.extname(p)) === ".bin");
    const generated = [];
    const existing = [];
    const failed = [];

    for (const p of input) {
      const binPath = String(p || "").trim();
      if (!binPath || !fsSync.existsSync(binPath)) {
        failed.push({ binPath, message: "BIN file does not exist." });
        continue;
      }

      const existingCue = findCueForBinPath(binPath);
      if (existingCue) {
        existing.push({ binPath, cuePath: existingCue });
        continue;
      }

      const cuePath = path.join(path.dirname(binPath), `${path.basename(binPath, path.extname(binPath))}.cue`);
      try {
        fsSync.writeFileSync(cuePath, buildCueContentForBin(binPath), "utf8");
        generated.push({ binPath, cuePath });
      } catch (error) {
        failed.push({ binPath, message: error.message });
      }
    }

    return { success: true, generated, existing, failed };
  } catch (error) {
    log.error("cue:generate-for-bin failed:", error);
    return { success: false, message: error.message, generated: [], existing: [], failed: [] };
  }
});

ipcMain.handle("detect-emulator-exe", async (_event, exePath) => {
  try {
    refreshLibraryFromDb();
  } catch (_e) {}

  const p = String(exePath || "").trim();
  if (!p) return { success: false, message: "Missing path" };

  const fileName = path.basename(p);
  const platformConfigs = await getPlatformConfigs();
  const platformConfigEmus = determinePlatformFromFilenameEmus(fileName, p, platformConfigs);
  const matched = !!platformConfigEmus;

  const emulatorAlreadyAdded = getEmulatorsState().some((e) => String(e.filePath || "").toLowerCase() === p.toLowerCase());

  return {
    success: true,
    matched,
    emulatorAlreadyAdded,
    platformShortName: matched ? (platformConfigEmus.shortName || "unknown") : "",
    platformName: matched ? (platformConfigEmus.name || "Unknown") : ""
  };
});

ipcMain.handle("import-exe", async (_event, payload) => {
  try {
    refreshLibraryFromDb();

    const p = String(payload?.path || "").trim();
    if (!p) return { success: false, message: "Missing .exe path" };
    if (!fsSync.existsSync(p) || !fsSync.lstatSync(p).isFile()) return { success: false, message: "Path is not a file" };

    const addEmulator = !!payload?.addEmulator;
    const addGame = !!payload?.addGame;
    const emuPsn = String(payload?.emulatorPlatformShortName || "").trim().toLowerCase();
    const gamePsn = String(payload?.gamePlatformShortName || "pc").trim().toLowerCase();

    const platformConfigs = await getPlatformConfigs();
    const findPlatform = (shortName) => (platformConfigs || []).find((c) => String(c?.shortName || "").trim().toLowerCase() === shortName);

    const results = { success: true, addedEmulator: null, addedGame: null, skipped: [], errors: [] };

    let knownEmulatorMatch = false;
    if (addEmulator) {
      let platformShortName = emuPsn;
      let platformName = "Unknown";

      if (!platformShortName) {
        // Fall back to detection if caller didn't provide it.
        const cfg = determinePlatformFromFilenameEmus(path.basename(p), p, platformConfigs);
        if (cfg) {
          platformShortName = String(cfg.shortName || "").trim().toLowerCase();
          platformName = cfg.name || "Unknown";
          knownEmulatorMatch = true;
        }
      } else {
        const cfg = findPlatform(platformShortName);
        if (cfg) platformName = cfg.name || platformName;
        const matchedCfg = determinePlatformFromFilenameEmus(path.basename(p), p, platformConfigs);
        if (matchedCfg && String(matchedCfg.shortName || "").trim().toLowerCase() === platformShortName) {
          knownEmulatorMatch = true;
        }
      }

      if (!platformShortName) {
        results.errors.push({ path: p, message: "Emulator platform is required" });
      } else {
        const { row, existed } = dbUpsertEmulator({
          name: path.basename(p, path.extname(p)),
          platform: platformName,
          platformShortName,
          filePath: p
        });
        if (!existed) results.addedEmulator = row;
        else results.skipped.push({ path: p, reason: "emu_exists" });
      }
    }

    if (addGame) {
      let platformShortName = gamePsn || "pc";
      let platformName = "PC";
      if (platformShortName !== "pc") {
        const cfg = findPlatform(platformShortName);
        if (!cfg) {
          results.errors.push({ path: p, message: `Unknown game platform '${platformShortName}'` });
        } else {
          platformName = cfg.name || platformShortName;
        }
      }

      if (platformShortName) {
        const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === p.toLowerCase());
        if (exists) {
          results.skipped.push({ path: p, reason: "game_exists" });
        } else {
          const name = path.basename(p, path.extname(p));
          const code = resolveImportedGameCode({
            platformShortName,
            platformName,
            name,
            filePath: p,
            fileName: path.basename(p)
          }).code;
          const discoveredImage = discoverCoverImageRelative(platformShortName, code, name);
          let image = discoveredImage || (await resolveAppIconDataUrl());
          if (addEmulator && knownEmulatorMatch) {
            const exeIconDataUrl = await resolveExecutableIconDataUrl(p);
            if (exeIconDataUrl) {
              image = exeIconDataUrl;
            } else if (!image) {
              image = await resolveAppIconDataUrl();
            }
          }
          const { row, existed } = dbUpsertGame({
            name,
            platform: platformName,
            platformShortName,
            filePath: p,
            code: code || null,
            image: image || null
          });
          if (!existed) results.addedGame = row;
          else results.skipped.push({ path: p, reason: "game_exists" });
        }
      }
    }

    refreshLibraryFromDb();
    return results;
  } catch (e) {
    log.error("import-exe failed:", e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle("import-files-as-platform", async (_event, paths, platformShortName, options = {}) => {
  try {
    refreshLibraryFromDb();

    const psn = String(platformShortName || "").trim().toLowerCase();
    if (!psn) return { success: false, message: "Missing platformShortName" };

    const platformConfigs = await getPlatformConfigs();
    const cfg = (platformConfigs || []).find((c) => String(c?.shortName || "").trim().toLowerCase() === psn);
    const platformName = psn === "pc" ? "PC" : (cfg?.name || "Unknown");

    const inputPaths = Array.isArray(paths) ? paths : [];
    const codeOverrides = (options && typeof options === "object" && options.codeOverrides && typeof options.codeOverrides === "object")
      ? options.codeOverrides
      : {};
    const results = { success: true, addedGames: [], skipped: [], errors: [], warnings: [] };

    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;

      try {
        if (!fsSync.existsSync(p) || !fsSync.lstatSync(p).isFile()) {
          results.skipped.push({ path: p, reason: "not_a_file" });
          continue;
        }

        const cuePrep = ensureCueForBinImport(p);
        if (cuePrep.generated) {
          results.warnings.push({
            path: p,
            reason: "cue_generated",
            message: `Generated missing CUE file: ${path.basename(String(cuePrep.cuePath || ""))}`
          });
        } else if (cuePrep.failed) {
          results.warnings.push({
            path: p,
            reason: "cue_generation_failed",
            message: cuePrep.message || "Failed to generate CUE file for BIN import."
          });
        }

        const importPath = String(cuePrep.importPath || p).trim();
        const canonicalPath = String(getCanonicalGameImportPath(importPath) || importPath).trim();
        if (canonicalPath.toLowerCase() !== p.toLowerCase()) {
          results.skipped.push({ path: p, reason: "bin_replaced_by_cue", cuePath: canonicalPath });
        }

        const psxValidation = validatePsxImportAssets(canonicalPath, psn);
        if (!psxValidation?.ok) {
          results.errors.push({
            path: canonicalPath || p,
            reason: "psx_assets_invalid",
            message: psxValidation?.message || "PS1 asset validation failed."
          });
          continue;
        }
        if (psxValidation?.warning) {
          results.warnings.push({
            path: canonicalPath || p,
            reason: "psx_sbi_missing",
            message: psxValidation.warning
          });
        }

        const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === canonicalPath.toLowerCase());
        if (exists) {
          results.skipped.push({ path: canonicalPath, reason: "game_exists" });
          continue;
        }

        const base = path.basename(canonicalPath);
        const name = path.basename(base, path.extname(base));
        const overrideCodeRaw = String(
          codeOverrides[p]
          || codeOverrides[pathKey(p)]
          || codeOverrides[canonicalPath]
          || codeOverrides[pathKey(canonicalPath)]
          || ""
        ).trim();
        const overrideVariants = gameCodeVariants(overrideCodeRaw);
        const code = resolveImportedGameCode({
          platformShortName: psn,
          platformName,
          name,
          filePath: canonicalPath,
          fileName: base,
          preferredCode: overrideCodeRaw
        }).code;

        const imageCodes = dedupeStringPaths([
          ...overrideVariants,
          code
        ]);
        let image = "";
        for (const codeCandidate of imageCodes) {
          image = discoverCoverImageRelative(psn, codeCandidate, name);
          if (image) break;
        }
        if (!image) {
          image = discoverCoverImageRelative(psn, code, name);
        }

        const { row, existed } = dbUpsertGame({
          name,
          platform: platformName,
          platformShortName: psn,
          filePath: canonicalPath,
          code: code || null,
          image: image || null
        });
        if (!existed) results.addedGames.push(row);
        else results.skipped.push({ path: p, reason: "game_exists" });
      } catch (e) {
        results.errors.push({ path: raw, message: e.message });
      }
    }

    refreshLibraryFromDb();
    return results;
  } catch (e) {
    log.error("import-files-as-platform failed:", e);
    return { success: false, message: e.message };
  }
});

ipcMain.handle("import-paths", async (_event, paths, options = {}) => {
  try {
    refreshLibraryFromDb();

    const platformConfigs = await getPlatformConfigs();

    const inputPaths = Array.isArray(paths) ? paths : [];
    const results = {
      success: true,
      addedGames: [],
      addedEmulators: [],
      skipped: [],
      errors: [],
      warnings: []
    };

    const recursive = options && options.recursive === false ? false : true;
    const archiveImportModesRaw = options && options.archiveImportModes && typeof options.archiveImportModes === "object"
      ? options.archiveImportModes
      : {};
    const archiveImportModes = new Map();
    Object.keys(archiveImportModesRaw).forEach((key) => {
      const normalizedKey = pathKey(key);
      if (!normalizedKey) return;
      const mode = String(archiveImportModesRaw[key] || "").trim().toLowerCase();
      if (mode !== "extract" && mode !== "direct" && mode !== "skip") return;
      archiveImportModes.set(normalizedKey, mode);
    });

    function importGameFileDirect(gameFilePath, originalPathForSkip) {
      const cuePrep = ensureCueForBinImport(gameFilePath);
      if (cuePrep.generated) {
        results.warnings.push({
          path: gameFilePath,
          reason: "cue_generated",
          message: `Generated missing CUE file: ${path.basename(String(cuePrep.cuePath || ""))}`
        });
      } else if (cuePrep.failed) {
        results.warnings.push({
          path: gameFilePath,
          reason: "cue_generation_failed",
          message: cuePrep.message || "Failed to generate CUE file for BIN import."
        });
      }

      const importPath = String(cuePrep.importPath || gameFilePath).trim();
      const canonicalPath = String(getCanonicalGameImportPath(importPath) || importPath).trim();
      if (canonicalPath.toLowerCase() !== String(gameFilePath || "").trim().toLowerCase()) {
        results.skipped.push({ path: gameFilePath, reason: "bin_replaced_by_cue", cuePath: canonicalPath });
      }

      const canonicalBase = path.basename(canonicalPath);
      const platformConfig = resolveGamePlatformConfig(canonicalBase, canonicalPath, platformConfigs);
      if (!platformConfig) {
        results.skipped.push({ path: canonicalPath || gameFilePath, reason: "unmatched" });
        return;
      }

      const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === canonicalPath.toLowerCase());
      if (exists) {
        results.skipped.push({ path: originalPathForSkip || canonicalPath, reason: "game_exists" });
        return;
      }

      const name = path.basename(canonicalBase, path.extname(canonicalBase));
      const platformShortName = platformConfig.shortName || "unknown";
      const psxValidation = validatePsxImportAssets(canonicalPath, platformShortName);
      if (!psxValidation?.ok) {
        results.errors.push({
          path: canonicalPath || gameFilePath,
          reason: "psx_assets_invalid",
          message: psxValidation?.message || "PS1 asset validation failed."
        });
        return;
      }
      if (psxValidation?.warning) {
        results.warnings.push({
          path: canonicalPath || gameFilePath,
          reason: "psx_sbi_missing",
          message: psxValidation.warning
        });
      }

      const code = resolveImportedGameCode({
        platformShortName,
        platformName: platformConfig.name || "Unknown",
        name,
        filePath: canonicalPath,
        fileName: canonicalBase
      }).code;
      const image = discoverCoverImageRelative(platformShortName, code, name);
      const { row, existed: existedInDb } = dbUpsertGame({
        name,
        platform: platformConfig.name || "Unknown",
        platformShortName,
        filePath: canonicalPath,
        code: code || null,
        image: image || null
      });

      refreshLibraryFromDb();

      if (!existedInDb) {
        results.addedGames.push(row);
      } else {
        results.skipped.push({ path: originalPathForSkip || canonicalPath, reason: "game_exists" });
      }
    }

    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;

      try {
        const stat = fsSync.existsSync(p) ? fsSync.lstatSync(p) : null;
        if (!stat) {
          results.skipped.push({ path: p, reason: "not_found" });
          continue;
        }

        if (stat.isDirectory()) {
          const scanRes = await scanForGamesAndEmulators(p, { recursive });
          if (scanRes?.success) {
            results.addedGames.push(...(scanRes.games || []));
            results.addedEmulators.push(...(scanRes.emulators || []));
            results.skipped.push(...(Array.isArray(scanRes.unmatchedGameFiles) ? scanRes.unmatchedGameFiles : []).map((entry) => ({
              path: entry,
              reason: "unmatched"
            })));
            if ((scanRes.games || []).length === 0 && (scanRes.emulators || []).length === 0) {
              results.skipped.push({ path: p, reason: "no_matches" });
            }
          }
          continue;
        }

        if (!stat.isFile()) {
          results.skipped.push({ path: p, reason: "not_a_file" });
          continue;
        }

        const lower = p.toLowerCase();
        const base = path.basename(p);

        if (lower.endsWith(".exe")) {
          const foundEmus = [];
          processEmulatorExe(p, base, platformConfigs, getEmulatorsState(), foundEmus);
          if (foundEmus.length > 0) {
            results.addedEmulators.push(foundEmus[0]);
          } else {
            results.skipped.push({ path: p, reason: "emu_exists_or_unmatched" });
          }
          continue;
        }

        const archiveKind = getArchiveKind(p);
        if (archiveKind) {
          const importMode = archiveImportModes.get(pathKey(p)) || "extract";
          if (importMode === "skip") {
            results.skipped.push({ path: p, reason: "archive_skipped_by_user" });
            continue;
          }

          if (importMode === "direct") {
            importGameFileDirect(p, p);
            continue;
          }

          let destDir = buildArchiveExtractionDirectory(p);
          let extracted = false;
          let extractionError = null;

          try {
            await extractArchiveToDir(p, destDir);
            extracted = true;
          } catch (e) {
            extractionError = e;
          }

          if (!extracted) {
            const fallbackDestDir = path.join(
              app.getPath("userData"),
              "imports",
              `${archiveKind}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
            );
            try {
              await extractArchiveToDir(p, fallbackDestDir);
              extracted = true;
              destDir = fallbackDestDir;
              results.warnings.push({
                path: p,
                reason: "archive_extract_fallback",
                message: "Archive extraction in source folder failed. Used app import cache folder instead."
              });
            } catch (fallbackError) {
              results.skipped.push({
                path: p,
                reason: "archive_extract_failed",
                message: fallbackError?.message || extractionError?.message || "Archive extract failed."
              });
              continue;
            }
          }

          const scanRes = await scanForGamesAndEmulators(destDir, { recursive: true });
          if (scanRes?.success) {
            results.addedGames.push(...(scanRes.games || []));
            results.addedEmulators.push(...(scanRes.emulators || []));
            results.skipped.push(...(Array.isArray(scanRes.unmatchedGameFiles) ? scanRes.unmatchedGameFiles : []).map((entry) => ({
              path: entry,
              reason: "unmatched"
            })));
            if ((scanRes.games || []).length === 0 && (scanRes.emulators || []).length === 0) {
              results.skipped.push({ path: p, reason: "no_matches" });
            }
          }
          continue;
        }

        // Treat as a game file.
        importGameFileDirect(p, p);
      } catch (e) {
        results.errors.push({ path: raw, message: e.message });
      }
    }

    return results;
  } catch (e) {
    log.error("import-paths failed:", e);
    return { success: false, message: e.message };
  }
});

  function expandUserPath(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (raw.startsWith("~")) {
      const home = String(os.homedir() || "");
      return raw.replace(/^~(?=\/|\\|$)/, home);
    }
    return raw;
  }

  function collectLauncherIntegrations(platformConfigs = []) {
    for (const cfg of (platformConfigs || [])) {
      const shortName = String(cfg?.shortName || "").trim().toLowerCase();
      if (shortName !== "pc") continue;
      const integrations = cfg?.launcherIntegrations;
      if (integrations && typeof integrations === "object") return integrations;
    }
    return null;
  }

  function parseSteamLibraryFolders(text) {
    const out = new Set();
    const lines = String(text || "").split(/\r?\n/g);
    for (const line of lines) {
      const match = line.match(/"path"\s*"([^"]+)"/i);
      if (match && match[1]) {
        out.add(match[1].replace(/\\\\/g, "\\"));
        continue;
      }
      const legacy = line.match(/"\d+"\s*"([^"]+)"/);
      if (legacy && legacy[1]) {
        out.add(legacy[1].replace(/\\\\/g, "\\"));
      }
    }
    return Array.from(out);
  }

  function resolveSteamManifestDirs(configPaths = []) {
    const dirs = new Set();
    (Array.isArray(configPaths) ? configPaths : []).forEach((raw) => {
      const expanded = expandUserPath(raw);
      if (expanded) dirs.add(expanded);
    });

    const extra = new Set();
    dirs.forEach((steamappsPath) => {
      const libraryFile = path.join(steamappsPath, "libraryfolders.vdf");
      if (!fsSync.existsSync(libraryFile)) return;
      try {
        const text = fsSync.readFileSync(libraryFile, "utf8");
        const libs = parseSteamLibraryFolders(text);
        libs.forEach((libPath) => {
          if (!libPath) return;
          const normalized = libPath.replace(/\\\\/g, "\\");
          const steamapps = normalized.toLowerCase().endsWith("steamapps")
            ? normalized
            : path.join(normalized, "steamapps");
          extra.add(steamapps);
        });
      } catch (_e) {}
    });

    extra.forEach((p) => dirs.add(p));
    return Array.from(dirs).filter((p) => !!p);
  }

  function scanSteamManifests(manifestDirs = []) {
    const results = [];
    const seen = new Set();
    const dirs = resolveSteamManifestDirs(manifestDirs);

    dirs.forEach((dirPath) => {
      if (!fsSync.existsSync(dirPath)) return;
      let entries = [];
      try {
        entries = fsSync.readdirSync(dirPath, { withFileTypes: true });
      } catch (_e) {
        return;
      }

      entries.forEach((entry) => {
        if (!entry.isFile()) return;
        const name = String(entry.name || "");
        if (!/^appmanifest_\d+\.acf$/i.test(name)) return;
        const manifestPath = path.join(dirPath, name);
        let text = "";
        try {
          text = fsSync.readFileSync(manifestPath, "utf8");
        } catch (_e) {
          return;
        }
        const appIdMatch = text.match(/"appid"\s*"(\d+)"/i) || name.match(/appmanifest_(\d+)\.acf/i);
        const appId = appIdMatch ? String(appIdMatch[1] || "").trim() : "";
        const nameMatch = text.match(/"name"\s*"([^"]+)"/i);
        const displayName = nameMatch ? String(nameMatch[1] || "").trim() : "";
        const dirMatch = text.match(/"installdir"\s*"([^"]+)"/i);
        const installDir = dirMatch ? String(dirMatch[1] || "").trim() : "";
        if (!appId || !displayName) return;
        const key = `steam:${appId}`;
        if (seen.has(key)) return;
        seen.add(key);
        const commonDir = path.join(dirPath, "common");
        const installPath = installDir ? path.join(commonDir, installDir) : "";
        const isInstalled = !!(installPath && fsSync.existsSync(installPath));
        results.push({
          launcher: "steam",
          id: appId,
          name: displayName,
          launchUri: `steam://rungameid/${appId}`,
          installDir: installPath || "",
          installed: isInstalled
        });
      });
    });

    return results;
  }

  function scanEpicManifests(manifestDirs = []) {
    const results = [];
    const seen = new Set();
    (Array.isArray(manifestDirs) ? manifestDirs : []).forEach((rawDir) => {
      const dirPath = expandUserPath(rawDir);
      if (!dirPath || !fsSync.existsSync(dirPath)) return;
      let entries = [];
      try {
        entries = fsSync.readdirSync(dirPath, { withFileTypes: true });
      } catch (_e) {
        return;
      }

      entries.forEach((entry) => {
        if (!entry.isFile()) return;
        const name = String(entry.name || "");
        if (!name.toLowerCase().endsWith(".item")) return;
        const manifestPath = path.join(dirPath, name);
        let raw = "";
        try {
          raw = fsSync.readFileSync(manifestPath, "utf8");
        } catch (_e) {
          return;
        }
        let data = null;
        try {
          data = JSON.parse(raw);
        } catch (_e) {
          return;
        }
        const displayName = String(data?.DisplayName || data?.AppName || "").trim();
        const appName = String(data?.AppName || data?.CatalogItemId || "").trim();
        const installDir = String(data?.InstallLocation || data?.InstallLocationBase || "").trim();
        const isIncomplete = data?.bIsIncompleteInstall === true
          || String(data?.bIsIncompleteInstall || "").toLowerCase() === "true";
        const flagInstalled = data?.bIsInstalled === true
          || String(data?.bIsInstalled || "").toLowerCase() === "true";
        const hasDir = !!(installDir && fsSync.existsSync(installDir));
        const isInstalled = !isIncomplete && (flagInstalled || hasDir);
        if (!displayName || !appName) return;
        const key = `epic:${appName}`;
        if (seen.has(key)) return;
        seen.add(key);
        results.push({
          launcher: "epic",
          id: appName,
          name: displayName,
          launchUri: `com.epicgames.launcher://apps/${appName}?action=launch&silent=true`,
          installDir,
          installed: isInstalled
        });
      });
    });
    return results;
  }

  function findGogDbPaths(manifestDirs = []) {
    const dbPaths = [];
    (Array.isArray(manifestDirs) ? manifestDirs : []).forEach((rawDir) => {
      const dirPath = expandUserPath(rawDir);
      if (!dirPath || !fsSync.existsSync(dirPath)) return;
      const candidates = [
        path.join(dirPath, "galaxy-2.0.db"),
        path.join(dirPath, "galaxy.db")
      ];
      candidates.forEach((candidate) => {
        if (fsSync.existsSync(candidate)) dbPaths.push(candidate);
      });
      try {
        const entries = fsSync.readdirSync(dirPath, { withFileTypes: true });
        entries.forEach((entry) => {
          if (!entry.isFile()) return;
          const name = String(entry.name || "");
          if (!name.toLowerCase().endsWith(".db")) return;
          if (!name.toLowerCase().includes("galaxy")) return;
          const candidate = path.join(dirPath, name);
          if (fsSync.existsSync(candidate)) dbPaths.push(candidate);
        });
      } catch (_e) {}
    });
    return Array.from(new Set(dbPaths));
  }

  function scanGogGalaxy(manifestDirs = []) {
    const results = [];
    const seen = new Set();
    const dbPaths = findGogDbPaths(manifestDirs);

    const parseDbBool = (value) => {
      if (value === true) return true;
      if (value === false) return false;
      if (value == null) return null;
      const text = String(value).trim().toLowerCase();
      if (!text) return null;
      if (["1", "true", "yes", "y"].includes(text)) return true;
      if (["0", "false", "no", "n"].includes(text)) return false;
      return null;
    };

    dbPaths.forEach((dbPath) => {
      let db = null;
      try {
        db = new Database(dbPath, { readonly: true });
      } catch (_e) {
        return;
      }

      try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => String(row?.name || ""));
        const tableName = tables.find((t) => t.toLowerCase() === "products")
          || tables.find((t) => t.toLowerCase() === "product")
          || tables.find((t) => t.toLowerCase().includes("product"));
        if (!tableName) return;

        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => String(row?.name || "").toLowerCase());
        const idCol = columns.includes("productid") ? "productId" : (columns.includes("id") ? "id" : "");
        const nameCol = columns.includes("title") ? "title" : (columns.includes("name") ? "name" : "");
        const pathCol = columns.includes("installationpath")
          ? "installationPath"
          : (columns.includes("path") ? "path" : "");
        const installedCol = columns.includes("isinstalled")
          ? "isInstalled"
          : (columns.includes("installed") ? "installed" : "");
        const ownedCol = columns.includes("owned") ? "owned" : "";
        if (!idCol || !nameCol) return;

        let installMap = new Map();
        const installCandidates = tables.filter((t) => t.toLowerCase().includes("installed"));
        const installTables = installCandidates.length > 0 ? installCandidates : tables;
        for (const installTable of installTables) {
          try {
            const installCols = db.prepare(`PRAGMA table_info(${installTable})`).all().map((row) => String(row?.name || "").toLowerCase());
            const installIdCol = installCols.includes("productid") ? "productId" : (installCols.includes("id") ? "id" : "");
            const installPathCol = installCols.includes("installationpath") ? "installationPath" : (installCols.includes("path") ? "path" : "");
            if (!installIdCol || !installPathCol) continue;
            const rows = db.prepare(`SELECT ${installIdCol} as productId, ${installPathCol} as path FROM ${installTable}`).all();
            if (!rows || rows.length === 0) continue;
            installMap = new Map(rows.map((row) => [String(row?.productId || "").trim(), String(row?.path || "").trim()]));
            break;
          } catch (_e) {}
        }

        const rows = db.prepare(
          `SELECT ${idCol} as productId, ${nameCol} as title`
          + (pathCol ? `, ${pathCol} as path` : "")
          + (installedCol ? `, ${installedCol} as installedFlag` : "")
          + (ownedCol ? `, ${ownedCol} as ownedFlag` : "")
          + ` FROM ${tableName}`
        ).all();
        rows.forEach((row) => {
          const productId = String(row?.productId || "").trim();
          const title = String(row?.title || "").trim();
          if (!productId || !title) return;
          const key = `gog:${productId}`;
          if (seen.has(key)) return;
          seen.add(key);
          const directPath = String(row?.path || "").trim();
          const installDir = installMap.get(productId) || directPath || "";
          const installedFlag = parseDbBool(row?.installedFlag);
          const ownedFlag = parseDbBool(row?.ownedFlag);
          const hasDir = !!(installDir && fsSync.existsSync(installDir));
          const isInstalled = installedFlag === null
            ? hasDir
            : installedFlag || hasDir;
          results.push({
            launcher: "gog",
            id: productId,
            name: title,
            launchUri: `goggalaxy://launch/${productId}`,
            installDir,
            installed: isInstalled,
            owned: ownedFlag == null ? undefined : ownedFlag
          });
        });
      } catch (_e) {
        // ignore db failures
      } finally {
        try { db.close(); } catch (_e) {}
      }
    });

    return results;
  }

  function scanHeroicLibraries() {
    const results = [];
    const seen = new Set();
    const cacheDir = expandUserPath("~/.config/heroic/store_cache");
    const heroicFiles = [
      { file: "legendary_library.json", launcher: "epic" },
      { file: "gog_library.json", launcher: "gog" }
    ];

    heroicFiles.forEach((entry) => {
      const filePath = path.join(cacheDir, entry.file);
      if (!fsSync.existsSync(filePath)) return;
      let raw = "";
      try {
        raw = fsSync.readFileSync(filePath, "utf8");
      } catch (_e) {
        return;
      }
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_e) {
        return;
      }

      const list = Array.isArray(data) ? data : (Array.isArray(data?.games) ? data.games : []);
      list.forEach((game) => {
        const appId = String(game?.app_name || game?.appName || game?.id || "").trim();
        const title = String(game?.title || game?.name || "").trim();
        if (!appId || !title) return;
        const key = `heroic:${entry.launcher}:${appId}`;
        if (seen.has(key)) return;
        seen.add(key);
        const installDir = String(game?.install?.install_path || game?.install_path || game?.path || "").trim();
        const isInstalled = !!(installDir && fsSync.existsSync(installDir));
        results.push({
          launcher: entry.launcher,
          id: appId,
          name: title,
          launchUri: `heroic://launch/${appId}`,
          installDir,
          installed: isInstalled
        });
      });
    });

    return results;
  }

  ipcMain.handle("launcher:scan-games", async (_event, payload = {}) => {
    try {
      const platformConfigs = await getPlatformConfigs();
      const integrations = collectLauncherIntegrations(platformConfigs) || {};
      const stores = integrations?.stores || {};
      const requestStores = payload?.stores && typeof payload.stores === "object" ? payload.stores : {};

      const pickPaths = (storeKey) => {
        const store = stores?.[storeKey] || {};
        const manifestPaths = store?.manifestPaths || {};
        const osKey = process.platform === "win32" ? "win" : (process.platform === "darwin" ? "mac" : "linux");
        const paths = Array.isArray(manifestPaths?.[osKey]) ? manifestPaths[osKey] : [];
        const base = paths.map(expandUserPath).filter(Boolean);
        if (storeKey === "epic") {
          const extras = [];
          if (osKey === "win") {
            extras.push("C:\\\\ProgramData\\\\Epic\\\\EpicGamesLauncher\\\\Data\\\\Manifests");
            extras.push("C:\\\\ProgramData\\\\Epic\\\\UnrealEngineLauncher\\\\Data\\\\Manifests");
          } else if (osKey === "mac") {
            extras.push("~/Library/Application Support/Epic/EpicGamesLauncher/Data/Manifests");
          } else if (osKey === "linux") {
            extras.push("~/.config/Epic/EpicGamesLauncher/Data/Manifests");
            extras.push("~/.local/share/Epic/EpicGamesLauncher/Data/Manifests");
          }
          extras.map(expandUserPath).forEach((p) => base.push(p));
        }
        if (storeKey === "gog") {
          const extras = [];
          if (osKey === "win") {
            extras.push("C:\\\\ProgramData\\\\GOG.com\\\\Galaxy\\\\storage");
            extras.push("C:\\\\Program Files (x86)\\\\GOG Galaxy\\\\storage");
            extras.push("C:\\\\Program Files\\\\GOG Galaxy\\\\storage");
          } else if (osKey === "mac") {
            extras.push("~/Library/Application Support/GOG.com/Galaxy/storage");
          }
          extras.map(expandUserPath).forEach((p) => base.push(p));
        }
        return Array.from(new Set(base.filter(Boolean)));
      };

      const results = {
        success: true,
        stores: {
          steam: [],
          epic: [],
          gog: []
        },
        errors: []
      };

      if (requestStores.steam !== false && stores?.steam?.enabled !== false) {
        results.stores.steam = scanSteamManifests(pickPaths("steam"));
      }

      if (requestStores.epic !== false && stores?.epic?.enabled !== false) {
        results.stores.epic = scanEpicManifests(pickPaths("epic"));
      }

      if (requestStores.gog !== false && stores?.gog?.enabled !== false) {
        results.stores.gog = scanGogGalaxy(pickPaths("gog"));
      }

      if (process.platform === "linux") {
        const heroicRows = scanHeroicLibraries();
        if (requestStores.epic !== false && heroicRows.length) {
          results.stores.epic = results.stores.epic.concat(heroicRows.filter((row) => row.launcher === "epic"));
        }
        if (requestStores.gog !== false && heroicRows.length) {
          results.stores.gog = results.stores.gog.concat(heroicRows.filter((row) => row.launcher === "gog"));
        }
      }

      return results;
    } catch (error) {
      log.error("launcher:scan-games failed:", error);
      return { success: false, message: error.message, stores: { steam: [], epic: [], gog: [] } };
    }
  });

  ipcMain.handle("launcher:import-games", async (_event, payload = {}) => {
    try {
      refreshLibraryFromDb();
      const games = Array.isArray(payload?.games) ? payload.games : [];
      const platformConfigs = await getPlatformConfigs();
      const pcConfig = (platformConfigs || []).find((cfg) => String(cfg?.shortName || "").trim().toLowerCase() === "pc");
      const platformShortName = String(pcConfig?.shortName || "pc").trim().toLowerCase() || "pc";
      const platformName = String(pcConfig?.name || "PC").trim() || "PC";

      const added = [];
      const skipped = [];
      const errors = [];
      const defaultImage = await resolveAppIconDataUrl();

      const tagRows = [];
      games.forEach((entry) => {
        const name = String(entry?.name || "").trim();
        const launchUri = String(entry?.launchUri || "").trim();
        const launcher = String(entry?.launcher || "").trim().toLowerCase();
        if (!name || !launchUri) {
          errors.push({ name, message: "Missing name or launch URI" });
          return;
        }
        const { row, existed } = dbUpsertGame({
          name,
          platform: platformName,
          platformShortName,
          filePath: launchUri,
          code: String(entry?.id || "").trim() || null,
          image: defaultImage || null
        });
        if (launcher) {
          const tagId = `launcher-${launcher}`;
          tagRows.push({ id: tagId, label: launcher.toUpperCase(), source: "launcher" });
          if (typeof dbUpdateGameMetadata === "function") {
            const currentTags = Array.isArray(row?.tags) ? row.tags : [];
            const merged = Array.from(new Set([...currentTags, tagId]));
            dbUpdateGameMetadata(row?.id, { tags: merged });
          }
        }
        if (existed) skipped.push({ name, launchUri });
        else added.push(row);
      });

      if (tagRows.length && typeof dbUpsertTags === "function") {
        dbUpsertTags(tagRows, { source: "launcher" });
      }

      refreshLibraryFromDb();
      return { success: true, added, skipped, errors };
    } catch (error) {
      log.error("launcher:import-games failed:", error);
      return { success: false, message: error.message, added: [], skipped: [], errors: [] };
    }
  });

}

module.exports = {
  registerImportIpc
};
