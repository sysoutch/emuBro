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
ipcMain.handle("process-emulator-exe", async (event, filePath) => {
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
            if (scanGames) {
              const platformConfig = determinePlatformFromFilename(item, itemPath, platformConfigs);
              if (platformConfig) {
                const filePath = String(itemPath || "").trim();
                const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === filePath.toLowerCase());
                if (!exists) {
                  const name = path.basename(item, path.extname(item));
                  const platformShortName = platformConfig.shortName || "unknown";
                  const code = inferGameCode({ name, filePath });
                  const image = discoverCoverImageRelative(platformShortName, code, name);

                  const { row, existed: existedInDb } = dbUpsertGame({
                    name,
                    platform: platformConfig.name || "Unknown",
                    platformShortName,
                    filePath,
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
  return { success: true, platforms: foundPlatforms, games: foundGames, emulators: foundEmulators };
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

ipcMain.handle("import-files-as-platform", async (_event, paths, platformShortName) => {
  try {
    refreshLibraryFromDb();

    const psn = String(platformShortName || "").trim().toLowerCase();
    if (!psn) return { success: false, message: "Missing platformShortName" };

    const platformConfigs = await getPlatformConfigs();
    const cfg = (platformConfigs || []).find((c) => String(c?.shortName || "").trim().toLowerCase() === psn);
    const platformName = psn === "pc" ? "PC" : (cfg?.name || "Unknown");

    const inputPaths = Array.isArray(paths) ? paths : [];
    const results = { success: true, addedGames: [], skipped: [], errors: [] };

    for (const raw of inputPaths) {
      const p = String(raw || "").trim();
      if (!p) continue;

      try {
        if (!fsSync.existsSync(p) || !fsSync.lstatSync(p).isFile()) {
          results.skipped.push({ path: p, reason: "not_a_file" });
          continue;
        }

        const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === p.toLowerCase());
        if (exists) {
          results.skipped.push({ path: p, reason: "game_exists" });
          continue;
        }

        const base = path.basename(p);
        const name = path.basename(base, path.extname(base));
        const code = inferGameCode({ name, filePath: p });
        const image = discoverCoverImageRelative(psn, code, name);
        const { row, existed } = dbUpsertGame({
          name,
          platform: platformName,
          platformShortName: psn,
          filePath: p,
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
          }
          continue;
        }

        // Treat as a game file.
        const platformConfig = determinePlatformFromFilename(base, p, platformConfigs);
        if (!platformConfig) {
          results.skipped.push({ path: p, reason: "unmatched" });
          continue;
        }

        const exists = getGamesState().some((g) => String(g.filePath || "").toLowerCase() === p.toLowerCase());
        if (exists) {
          results.skipped.push({ path: p, reason: "game_exists" });
          continue;
        }

        const name = path.basename(base, path.extname(base));
        const platformShortName = platformConfig.shortName || "unknown";
        const code = inferGameCode({ name, filePath: p });
        const image = discoverCoverImageRelative(platformShortName, code, name);
        const { row, existed: existedInDb } = dbUpsertGame({
          name,
          platform: platformConfig.name || "Unknown",
          platformShortName,
          filePath: p,
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
