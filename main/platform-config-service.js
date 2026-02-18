const path = require("path");

function createPlatformConfigService(deps = {}) {
  const {
    app,
    fs,
    fsSync,
    log,
    dbUpsertEmulator,
    refreshLibraryFromDb
  } = deps;

  if (!app) throw new Error("createPlatformConfigService requires app");
  if (!fs || typeof fs.readdir !== "function") throw new Error("createPlatformConfigService requires fs promises API");
  if (!fsSync) throw new Error("createPlatformConfigService requires fsSync");
  if (!log) throw new Error("createPlatformConfigService requires log");
  if (typeof dbUpsertEmulator !== "function") throw new Error("createPlatformConfigService requires dbUpsertEmulator");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("createPlatformConfigService requires refreshLibraryFromDb");

  async function getPlatformConfigs() {
    const platformConfigs = [];
    const platformsDir = path.join(app.getAppPath(), "emubro-resources", "platforms");

    try {
      const platformDirs = await fs.readdir(platformsDir);
      for (const platformDir of platformDirs) {
        const configPath = path.join(platformsDir, platformDir, "config.json");
        try {
          if (!fsSync.existsSync(configPath)) continue;
          const configFile = fsSync.readFileSync(configPath, "utf8");
          const config = JSON.parse(configFile);
          config.platformDir = platformDir;
          platformConfigs.push(config);
        } catch (error) {
          log.warn(`Failed to read config file for platform ${platformDir}:`, error.message);
        }
      }
    } catch (error) {
      log.error("Failed to read platform configurations:", error);
    }

    return platformConfigs;
  }

  function determinePlatformFromFilename(filename, _filePath, platformConfigs) {
    for (const config of platformConfigs || []) {
      if (!config?.searchFor || !String(config.searchFor).trim()) continue;
      try {
        const regex = new RegExp(config.searchFor, "i");
        if (regex.test(filename)) return config;
      } catch (error) {
        log.warn(`Invalid regex pattern for platform ${config?.name}:`, error.message);
      }
    }
    return null;
  }

  function determinePlatformFromFilenameEmus(filename, _filePath, platformConfigs) {
    for (const config of platformConfigs || []) {
      for (const emulator of (config?.emulators || [])) {
        if (!emulator?.searchString || !String(emulator.searchString).trim()) continue;
        try {
          const regex = new RegExp(emulator.searchString, "i");
          if (regex.test(filename)) return config;
        } catch (error) {
          log.warn(`Invalid regex pattern for platform ${config?.name}:`, error.message);
        }
      }
    }
    return null;
  }

  function processEmulatorExe(itemPath, item, platformConfigs, emulators, foundEmulators) {
    const platformConfigEmus = determinePlatformFromFilenameEmus(item, itemPath, platformConfigs);
    if (!platformConfigEmus) return;

    const filePath = String(itemPath || "").trim();
    if (!filePath) return;

    const exists = (emulators || []).some((entry) => String(entry.filePath || "").toLowerCase() === filePath.toLowerCase());
    if (exists) return;

    const emulator = {
      name: path.basename(item, path.extname(item)),
      platform: platformConfigEmus.name || "Unknown",
      platformShortName: platformConfigEmus.shortName || "unknown",
      filePath
    };

    const { row, existed: existedInDb } = dbUpsertEmulator(emulator);
    if (!existedInDb) {
      log.info(`Emulator added: ${row.name} for platform ${row.platformShortName} at ${row.filePath}`);
      foundEmulators.push(row);
    } else {
      log.info(`Emulator already exists: ${row.name} at ${row.filePath}`);
    }

    refreshLibraryFromDb();
  }

  return {
    getPlatformConfigs,
    determinePlatformFromFilename,
    determinePlatformFromFilenameEmus,
    processEmulatorExe
  };
}

module.exports = {
  createPlatformConfigService
};
