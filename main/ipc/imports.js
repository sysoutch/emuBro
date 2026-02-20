const path = require("path");
const os = require("os");

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
    discoverCoverImageRelative,
    dbUpsertGame,
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
  if (typeof discoverCoverImageRelative !== "function") throw new Error("registerImportIpc requires discoverCoverImageRelative");
  if (typeof dbUpsertGame !== "function") throw new Error("registerImportIpc requires dbUpsertGame");
  if (typeof getArchiveKind !== "function") throw new Error("registerImportIpc requires getArchiveKind");
  if (typeof extractArchiveToDir !== "function") throw new Error("registerImportIpc requires extractArchiveToDir");

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
    if (src.includes(ext)) return true;
    if (src.includes(`\\${ext}`)) return true;
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
    const direct = determinePlatformFromFilename(filename, filePath, platformConfigs);
    if (direct) return direct;

    const ext = normalizeFileExtension(path.extname(String(filename || filePath || "")));
    if (!ext) return null;

    const matches = (Array.isArray(platformConfigs) ? platformConfigs : [])
      .filter((cfg) => platformSupportsExtension(cfg, ext));

    if (matches.length === 1) return matches[0];
    return null;
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
  const ignoreFoldersPath = path.join(app.getAppPath(), "emubro-resources", "ignore-folders.json");
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
                  const code = inferGameCode({ name, filePath: gameFilePath });
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

    if (addEmulator) {
      let platformShortName = emuPsn;
      let platformName = "Unknown";

      if (!platformShortName) {
        // Fall back to detection if caller didn't provide it.
        const cfg = determinePlatformFromFilenameEmus(path.basename(p), p, platformConfigs);
        if (cfg) {
          platformShortName = String(cfg.shortName || "").trim().toLowerCase();
          platformName = cfg.name || "Unknown";
        }
      } else {
        const cfg = findPlatform(platformShortName);
        if (cfg) platformName = cfg.name || platformName;
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
          const code = inferGameCode({ name, filePath: p });
          const image = discoverCoverImageRelative(platformShortName, code, name);
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
    const results = { success: true, addedGames: [], skipped: [], errors: [] };

    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;

      try {
        if (!fsSync.existsSync(p) || !fsSync.lstatSync(p).isFile()) {
          results.skipped.push({ path: p, reason: "not_a_file" });
          continue;
        }

        const canonicalPath = String(getCanonicalGameImportPath(p) || p).trim();
        if (canonicalPath.toLowerCase() !== p.toLowerCase()) {
          results.skipped.push({ path: p, reason: "bin_replaced_by_cue", cuePath: canonicalPath });
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
        const fallbackCode = inferGameCode({ name, filePath: canonicalPath });
        const code = overrideCodeRaw || fallbackCode;

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
      errors: []
    };

    const recursive = options && options.recursive === false ? false : true;

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
          const destDir = path.join(
            app.getPath("userData"),
            "imports",
            `${archiveKind}_${Date.now()}_${Math.floor(Math.random() * 1000)}`
          );

          try {
            await extractArchiveToDir(p, destDir);
          } catch (e) {
            results.skipped.push({ path: p, reason: "archive_extract_failed", message: e.message });
            continue;
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
        const canonicalPath = String(getCanonicalGameImportPath(p) || p).trim();
        if (canonicalPath.toLowerCase() !== p.toLowerCase()) {
          results.skipped.push({ path: p, reason: "bin_replaced_by_cue", cuePath: canonicalPath });
        }
        const canonicalBase = path.basename(canonicalPath);
        const platformConfig = resolveGamePlatformConfig(canonicalBase, canonicalPath, platformConfigs);
        if (!platformConfig) {
          results.skipped.push({ path: canonicalPath || p, reason: "unmatched" });
          continue;
        }

        const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === canonicalPath.toLowerCase());
        if (exists) {
          results.skipped.push({ path: canonicalPath, reason: "game_exists" });
          continue;
        }

        const name = path.basename(canonicalBase, path.extname(canonicalBase));
        const platformShortName = platformConfig.shortName || "unknown";
        const code = inferGameCode({ name, filePath: canonicalPath });
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
          results.skipped.push({ path: p, reason: "game_exists" });
        }
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
}

module.exports = {
  registerImportIpc
};
