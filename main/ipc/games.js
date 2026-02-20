const path = require("path");
const { spawn } = require("child_process");

function registerGameIpc(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    shell,
    nativeImage,
    fsSync,
    normalizePlatform,
    inferGameCode,
    classifyPathMedia,
    getMainWindow,
    refreshLibraryFromDb,
    getGamesState,
    getEmulatorsState,
    getTagsState,
    dbGetGameById,
    dbDeleteGameById,
    dbUpdateGameMetadata,
    dbUpsertTags,
    dbUpdateGameFilePath,
    getPlatformConfigs
  } = deps;

  if (!ipcMain) throw new Error("registerGameIpc requires ipcMain");
  if (!log) throw new Error("registerGameIpc requires log");
  if (!app) throw new Error("registerGameIpc requires app");
  if (!shell) throw new Error("registerGameIpc requires shell");
  if (!nativeImage) throw new Error("registerGameIpc requires nativeImage");
  if (!fsSync) throw new Error("registerGameIpc requires fsSync");
  if (typeof normalizePlatform !== "function") throw new Error("registerGameIpc requires normalizePlatform");
  if (typeof inferGameCode !== "function") throw new Error("registerGameIpc requires inferGameCode");
  if (typeof classifyPathMedia !== "function") throw new Error("registerGameIpc requires classifyPathMedia");
  if (typeof getMainWindow !== "function") throw new Error("registerGameIpc requires getMainWindow");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerGameIpc requires refreshLibraryFromDb");
  if (typeof getGamesState !== "function") throw new Error("registerGameIpc requires getGamesState");
  if (typeof getEmulatorsState !== "function") throw new Error("registerGameIpc requires getEmulatorsState");
  if (typeof getTagsState !== "function") throw new Error("registerGameIpc requires getTagsState");
  if (typeof dbGetGameById !== "function") throw new Error("registerGameIpc requires dbGetGameById");
  if (typeof dbDeleteGameById !== "function") throw new Error("registerGameIpc requires dbDeleteGameById");
  if (typeof dbUpdateGameMetadata !== "function") throw new Error("registerGameIpc requires dbUpdateGameMetadata");
  if (typeof dbUpsertTags !== "function") throw new Error("registerGameIpc requires dbUpsertTags");
  if (typeof dbUpdateGameFilePath !== "function") throw new Error("registerGameIpc requires dbUpdateGameFilePath");
  if (typeof getPlatformConfigs !== "function") throw new Error("registerGameIpc requires getPlatformConfigs");

  const appPath = app.getAppPath();

  function toTitleCaseFromSlug(value) {
    return String(value || "")
      .split("-")
      .map((part) => part ? (part.charAt(0).toUpperCase() + part.slice(1)) : "")
      .join(" ")
      .trim();
  }

  function normalizeTagId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function unquoteYamlScalar(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
      text = text.slice(1, -1);
    }
    return text.trim();
  }

  function parseYamlTagLabel(yamlText) {
    const lines = String(yamlText || "").split(/\r?\n/g);
    let inEnglishSection = false;
    const englishValues = [];

    for (const rawLine of lines) {
      const line = String(rawLine || "");
      const trimmed = line.trim();
      if (!trimmed || trimmed === "---") continue;

      const keyMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (keyMatch) {
        const key = String(keyMatch[1] || "").trim().toLowerCase();
        const valuePart = String(keyMatch[2] || "").trim();
        inEnglishSection = key === "en";
        if (inEnglishSection && valuePart) {
          const scalar = unquoteYamlScalar(valuePart);
          if (scalar) englishValues.push(scalar);
        }
        continue;
      }

      if (inEnglishSection) {
        const listItemMatch = trimmed.match(/^-+\s*(.+)$/);
        if (listItemMatch) {
          const scalar = unquoteYamlScalar(listItemMatch[1]);
          if (scalar) englishValues.push(scalar);
        } else if (/^[A-Za-z0-9_-]+\s*:/.test(trimmed)) {
          inEnglishSection = false;
        }
      }
    }

    return englishValues.find((value) => String(value || "").trim().length > 0) || "";
  }

  function loadTagCatalog() {
    const tagsDir = path.join(appPath, "emubro-resources", "tags");
    if (!fsSync.existsSync(tagsDir)) return [];

    const files = fsSync.readdirSync(tagsDir, { withFileTypes: true });
    const out = [];
    const seen = new Set();

    for (const file of files) {
      if (!file || !file.isFile()) continue;
      const ext = path.extname(file.name).toLowerCase();
      if (ext !== ".yaml" && ext !== ".yml") continue;

      const slug = String(path.basename(file.name, ext) || "").trim().toLowerCase();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      const absPath = path.join(tagsDir, file.name);
      let label = "";
      try {
        const raw = fsSync.readFileSync(absPath, "utf8");
        label = parseYamlTagLabel(raw);
      } catch (_error) {
        label = "";
      }

      out.push({
        id: slug,
        label: label || toTitleCaseFromSlug(slug)
      });
    }

    out.sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
    return out;
  }

  function collectGameDerivedTags() {
    const rows = Array.isArray(getGamesState()) ? getGamesState() : [];
    const out = [];
    const seen = new Set();
    rows.forEach((game) => {
      const tagRows = Array.isArray(game?.tags) ? game.tags : [];
      tagRows.forEach((rawTag) => {
        const tag = normalizeTagId(rawTag);
        if (!tag || seen.has(tag)) return;
        seen.add(tag);
        out.push({
          id: tag,
          label: toTitleCaseFromSlug(tag),
          source: "game"
        });
      });
    });
    return out;
  }

  function getDeletedTagIdSet() {
    const rows = Array.isArray(getTagsState()) ? getTagsState() : [];
    const deleted = new Set();
    rows.forEach((row) => {
      const id = normalizeTagId(row?.id);
      const source = String(row?.source || "").trim().toLowerCase();
      if (id && source === "deleted") {
        deleted.add(id);
      }
    });
    return deleted;
  }

  function getMergedTagCatalog() {
    const mergedMap = new Map();
    const deletedTagIds = getDeletedTagIdSet();
    const pushRows = (rows) => {
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const id = normalizeTagId(row?.id);
        if (!id) return;
        const label = String(row?.label || "").trim() || toTitleCaseFromSlug(id);
        const source = String(row?.source || "").trim() || "resource";
        const existing = mergedMap.get(id);
        if (!existing) {
          mergedMap.set(id, { id, label, source });
          return;
        }
        if (existing.label === existing.id && label !== id) {
          existing.label = label;
        }
        if (existing.source !== "resource" || source === "resource") {
          existing.source = source;
        }
      });
    };

    pushRows(loadTagCatalog().map((row) => ({ ...row, source: "resource" })));
    pushRows((Array.isArray(getTagsState()) ? getTagsState() : []).filter((row) => {
      return String(row?.source || "").trim().toLowerCase() !== "deleted";
    }));
    pushRows(collectGameDerivedTags());

    const out = Array.from(mergedMap.values()).filter((row) => !deletedTagIds.has(normalizeTagId(row?.id)));
    out.sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
    return out;
  }

  function remapTagAcrossGames(oldTagId, newTagId) {
    const source = Array.isArray(getGamesState()) ? getGamesState() : [];
    let updatedGames = 0;
    source.forEach((gameRow) => {
      const gameId = Number(gameRow?.id || 0);
      if (!gameId) return;
      const existing = Array.isArray(gameRow?.tags) ? gameRow.tags : [];
      if (!existing.length) return;

      let changed = false;
      const next = [];
      const seen = new Set();
      existing.forEach((rawTag) => {
        const tagId = normalizeTagId(rawTag);
        if (!tagId) return;
        const mapped = tagId === oldTagId ? newTagId : tagId;
        if (tagId === oldTagId) changed = true;
        if (!mapped || seen.has(mapped)) return;
        seen.add(mapped);
        next.push(mapped);
      });

      if (!changed) return;
      dbUpdateGameMetadata(gameId, { tags: next });
      updatedGames += 1;
    });
    return updatedGames;
  }

  function removeTagFromGames(tagIdToRemove) {
    const source = Array.isArray(getGamesState()) ? getGamesState() : [];
    let updatedGames = 0;
    source.forEach((gameRow) => {
      const gameId = Number(gameRow?.id || 0);
      if (!gameId) return;
      const existing = Array.isArray(gameRow?.tags) ? gameRow.tags : [];
      if (!existing.length) return;

      let changed = false;
      const next = [];
      const seen = new Set();
      existing.forEach((rawTag) => {
        const tagId = normalizeTagId(rawTag);
        if (!tagId || tagId === tagIdToRemove) {
          if (tagId === tagIdToRemove) changed = true;
          return;
        }
        if (seen.has(tagId)) return;
        seen.add(tagId);
        next.push(tagId);
      });

      if (!changed) return;
      dbUpdateGameMetadata(gameId, { tags: next });
      updatedGames += 1;
    });
    return updatedGames;
  }

  function sanitizeFilename(name) {
    return String(name || "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "emuBro Shortcut";
  }

  function resolvePlatformDefaultCoverPath(platformShortName) {
    const psn = normalizePlatform(platformShortName);
    return path.join(appPath, "emubro-resources", "platforms", psn, "covers", "default.jpg");
  }

  function resolveGameCoverPath(game) {
    const img = String(game?.image || "").trim();
    if (img) {
      const p = path.isAbsolute(img) ? img : path.join(appPath, img);
      if (fsSync.existsSync(p)) return p;
    }

    const fallback = resolvePlatformDefaultCoverPath(game?.platformShortName);
    if (fsSync.existsSync(fallback)) return fallback;

    const appIcon = path.join(appPath, "icon.png");
    if (fsSync.existsSync(appIcon)) return appIcon;

    return path.join(appPath, "logo.png");
  }

  function readPngDimensions(pngBuffer) {
    if (!Buffer.isBuffer(pngBuffer) || pngBuffer.length < 24) return { width: 256, height: 256 };
    const sig = pngBuffer.subarray(0, 8);
    const expected = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (!sig.equals(expected)) return { width: 256, height: 256 };
    return {
      width: pngBuffer.readUInt32BE(16),
      height: pngBuffer.readUInt32BE(20)
    };
  }

  function writeIcoFromPng(pngBuffer, icoPath) {
    const { width, height } = readPngDimensions(pngBuffer);
    const w = width >= 256 ? 0 : width;
    const h = height >= 256 ? 0 : height;

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuffer.length, 8);
    entry.writeUInt32LE(6 + 16, 12);

    fsSync.writeFileSync(icoPath, Buffer.concat([header, entry, pngBuffer]));
  }

  function buildDeepLinkForGame(game) {
    const platform = normalizePlatform(game?.platformShortName) || normalizePlatform(game?.platform) || "unknown";
    const code = inferGameCode(game);
    const name = String(game?.name || "").trim();

    const params = new URLSearchParams();
    params.set("platform", platform);
    if (code) params.set("code", code);
    if (name) params.set("name", name);

    return `emubro://launch?${params.toString()}`;
  }

  function getShortcutTargetAndArgs(url) {
    const quoteWinArg = (value) => `"${String(value ?? "").replace(/"/g, '\\"')}"`;
    if (process.defaultApp) {
      const entry = process.argv.length >= 2 ? path.resolve(process.argv[1]) : "";
      const args = entry ? `${quoteWinArg(entry)} ${quoteWinArg(url)}` : quoteWinArg(url);
      return { target: process.execPath, args };
    }
    return { target: process.execPath, args: quoteWinArg(url) };
  }

  function findFileByNameInTree(rootDir, targetFileName, options = {}) {
    const root = String(rootDir || "").trim();
    const target = String(targetFileName || "").trim().toLowerCase();
    if (!root || !target) return "";

    const maxDepth = Number.isFinite(options.maxDepth) ? Math.max(0, Math.floor(options.maxDepth)) : 6;
    const maxVisitedDirs = Number.isFinite(options.maxVisitedDirs) ? Math.max(100, Math.floor(options.maxVisitedDirs)) : 5000;
    const queue = [{ dir: root, depth: 0 }];
    let visitedDirs = 0;

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      const { dir, depth } = next;
      visitedDirs += 1;
      if (visitedDirs > maxVisitedDirs) break;

      let entries = [];
      try {
        entries = fsSync.readdirSync(dir, { withFileTypes: true });
      } catch (_e) {
        continue;
      }

      for (const entry of entries) {
        const entryName = String(entry?.name || "");
        if (!entryName) continue;
        const fullPath = path.join(dir, entryName);

        if (entry.isFile()) {
          if (entryName.toLowerCase() === target) return fullPath;
          continue;
        }

        if (!entry.isDirectory()) continue;
        if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
        if (depth >= maxDepth) continue;
        queue.push({ dir: fullPath, depth: depth + 1 });
      }
    }

    return "";
  }

  function tryRelinkGameInParent(game) {
    const gameId = Number(game?.id);
    const originalPath = String(game?.filePath || "").trim();
    const parentPath = originalPath ? path.dirname(originalPath) : "";
    const fileName = originalPath ? path.basename(originalPath) : "";

    if (!gameId || !originalPath || !parentPath || !fileName) {
      return { found: false, parentExists: false, parentPath, missingPath: originalPath };
    }

    let parentExists = false;
    try {
      parentExists = fsSync.existsSync(parentPath) && fsSync.statSync(parentPath).isDirectory();
    } catch (_e) {
      parentExists = false;
    }

    if (!parentExists) {
      return { found: false, parentExists: false, parentPath, missingPath: originalPath };
    }

    const resolvedPath = findFileByNameInTree(parentPath, fileName, { maxDepth: 2, maxVisitedDirs: 1500 });
    if (!resolvedPath) {
      return { found: false, parentExists: true, parentPath, missingPath: originalPath };
    }

    try {
      const updated = dbUpdateGameFilePath(gameId, resolvedPath);
      if (!updated) {
        return { found: false, parentExists: true, parentPath, missingPath: originalPath };
      }
      refreshLibraryFromDb();
      return {
        found: true,
        parentExists: true,
        parentPath,
        missingPath: originalPath,
        newPath: resolvedPath,
        game: updated
      };
    } catch (error) {
      log.error("Failed to relink missing game in parent folder:", error);
      return { found: false, parentExists: true, parentPath, missingPath: originalPath, error: error.message };
    }
  }

  function launchGameObject(game) {
    const platformShortName = String(game?.platformShortName || "").trim().toLowerCase();
    let gameRow = game;
    let gamePath = String(game?.filePath || "").trim();

    if (!gamePath || !fsSync.existsSync(gamePath)) {
      const mediaInfo = classifyPathMedia(gamePath);
      if (mediaInfo.rootPath && !mediaInfo.rootExists) {
        log.warn(`Game root path is unavailable for "${game?.name}": ${mediaInfo.rootPath}`);
        return {
          success: false,
          code: "GAME_FILE_MISSING",
          message: "Game file not found",
          gameId: game?.id ?? null,
          gameName: game?.name || "Unknown Game",
          missingPath: gamePath || "",
          parentPath: gamePath ? path.dirname(gamePath) : "",
          parentExists: false,
          rootPath: mediaInfo.rootPath,
          rootExists: false,
          sourceMedia: mediaInfo.mediaCategory
        };
      }

      const relink = tryRelinkGameInParent(gameRow);
      if (relink.found && relink.newPath && fsSync.existsSync(relink.newPath)) {
        gamePath = relink.newPath;
        gameRow = relink.game || gameRow;
        log.info(`Auto-relocated missing game "${gameRow?.name || game?.name}" to ${gamePath}`);
      } else {
        log.error(`Game file not found at path: ${gamePath}`);
        return {
          success: false,
          code: "GAME_FILE_MISSING",
          message: "Game file not found",
          gameId: game?.id ?? null,
          gameName: game?.name || "Unknown Game",
          missingPath: gamePath || "",
          parentPath: relink?.parentPath || (gamePath ? path.dirname(gamePath) : ""),
          parentExists: !!relink?.parentExists,
          rootPath: mediaInfo.rootPath,
          rootExists: mediaInfo.rootExists,
          sourceMedia: mediaInfo.mediaCategory
        };
      }
    }

    const isWindowsExeGame = process.platform === "win32" && /\.exe$/i.test(gamePath);
    let launchTarget = "";
    let launchArgs = [];
    let launchCwd = "";
    let launchMode = "";

    if (isWindowsExeGame) {
      const gameDir = path.dirname(gamePath);
      const cmdPath = String(process.env.ComSpec || "cmd.exe").trim() || "cmd.exe";
      launchTarget = cmdPath;
      launchArgs = ["/d", "/s", "/c", "start", "", "/d", gameDir, "/wait", gamePath];
      launchCwd = gameDir;
      launchMode = "cmd";
    } else {
      const overridePath = String(gameRow?.emulatorOverridePath || game?.emulatorOverridePath || "").trim();
      let emuPath = "";

      if (overridePath && fsSync.existsSync(overridePath)) {
        emuPath = overridePath;
      } else {
        if (overridePath) {
          log.warn(`Game "${gameRow?.name || game?.name}" has an emulator override path that is missing: ${overridePath}`);
        }
        emuPath = getEmulatorsState().find((emu) => String(emu.platformShortName || "").trim().toLowerCase() === platformShortName)?.filePath;
      }

      if (!emuPath) {
        log.error(`No emulator found for platform ${game.platformShortName}`);
        return { success: false, message: "Emulator not found for this game" };
      }
      if (!fsSync.existsSync(emuPath)) {
        log.error(`Emulator executable not found at path: ${emuPath}`);
        return { success: false, message: "Emulator executable not found" };
      }

      launchTarget = emuPath;
      launchArgs = [gamePath];
      launchCwd = path.dirname(emuPath);
      launchMode = overridePath && overridePath === emuPath ? "emulator-override" : "emulator";
    }

    try {
      const child = spawn(launchTarget, launchArgs, {
        stdio: "ignore",
        cwd: launchCwd || undefined
      });
      child.on("error", (error) => log.error(`Error launching game ${gameRow?.name || game?.name}:`, error));
      child.on("exit", () => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
          log.info("restore main window from minimized state after game stopped");
          mainWindow.restore();
        }
      });

      const mainWindow = getMainWindow();
      if (mainWindow) {
        log.info("Minimizing main window after game launch");
        mainWindow.minimize();
      }

      return {
        success: true,
        message: "Game launched successfully",
        resolvedPath: gamePath !== String(game?.filePath || "").trim() ? gamePath : null,
        launchMode
      };
    } catch (error) {
      log.error(`Error launching game ${gameRow?.name || game?.name}:`, error);
      const mainWindow = getMainWindow();
      if (mainWindow) mainWindow.restore();
      return { success: false, message: "Failed to execute launch command" };
    }
  }

  ipcMain.handle("get-games", async () => {
    try {
      refreshLibraryFromDb();
    } catch (_e) {}
    return getGamesState();
  });

  ipcMain.handle("tags:list", async () => {
    try {
      return { success: true, tags: getMergedTagCatalog() };
    } catch (error) {
      log.error("Failed to list tags:", error);
      return { success: false, message: error.message, tags: [] };
    }
  });

  ipcMain.handle("tags:rename", async (_event, payload = {}) => {
    try {
      const oldTagId = normalizeTagId(payload?.oldTagId || payload?.tagId || payload?.oldId);
      const requestedName = String(
        payload?.newTagName
        || payload?.newLabel
        || payload?.newName
        || payload?.name
        || ""
      ).trim();
      if (!oldTagId) {
        return { success: false, message: "Missing source tag ID" };
      }
      if (!requestedName) {
        return { success: false, message: "Missing new tag name" };
      }

      const newTagId = normalizeTagId(requestedName);
      if (!newTagId) {
        return { success: false, message: "Invalid new tag name" };
      }

      const catalogMap = new Map(getMergedTagCatalog().map((row) => [normalizeTagId(row?.id), row]));
      const oldCatalog = catalogMap.get(oldTagId);
      const oldLabel = String(oldCatalog?.label || toTitleCaseFromSlug(oldTagId)).trim() || toTitleCaseFromSlug(oldTagId);
      const newLabel = requestedName;

      let updatedGames = 0;
      let mergedIntoExisting = false;

      if (oldTagId !== newTagId) {
        updatedGames = remapTagAcrossGames(oldTagId, newTagId);
        mergedIntoExisting = catalogMap.has(newTagId);
      }

      dbUpsertTags(
        [{
          id: newTagId,
          label: newLabel || toTitleCaseFromSlug(newTagId),
          source: "user"
        }],
        { source: "user", forceLabel: true, forceSource: true }
      );

      if (oldTagId !== newTagId) {
        dbUpsertTags(
          [{
            id: oldTagId,
            label: oldLabel,
            source: "deleted"
          }],
          { source: "deleted", forceLabel: true, forceSource: true }
        );
      }

      refreshLibraryFromDb();
      return {
        success: true,
        oldTagId,
        newTagId,
        newLabel: newLabel || toTitleCaseFromSlug(newTagId),
        updatedGames,
        merged: mergedIntoExisting
      };
    } catch (error) {
      log.error("Failed to rename tag:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("tags:delete", async (_event, payload = {}) => {
    try {
      const tagId = normalizeTagId(payload?.tagId || payload?.id);
      if (!tagId) return { success: false, message: "Missing tag ID" };

      const catalogMap = new Map(getMergedTagCatalog().map((row) => [normalizeTagId(row?.id), row]));
      const existing = catalogMap.get(tagId);
      const label = String(existing?.label || toTitleCaseFromSlug(tagId)).trim() || toTitleCaseFromSlug(tagId);

      const updatedGames = removeTagFromGames(tagId);
      dbUpsertTags(
        [{
          id: tagId,
          label,
          source: "deleted"
        }],
        { source: "deleted", forceLabel: true, forceSource: true }
      );

      refreshLibraryFromDb();
      return { success: true, tagId, updatedGames };
    } catch (error) {
      log.error("Failed to delete tag:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("get-game-details", async (_event, gameId) => {
    const targetId = Number(gameId);
    return getGamesState().find((game) => Number(game.id) === targetId) || null;
  });

  ipcMain.handle("update-game-metadata", async (_event, payload = {}) => {
    try {
      const gameId = Number(payload?.gameId);
      if (!gameId) return { success: false, message: "Missing game ID" };

      const game = dbGetGameById(gameId) || getGamesState().find((row) => Number(row.id) === gameId);
      if (!game) return { success: false, message: "Game not found" };

      const patch = {};

      if (Object.prototype.hasOwnProperty.call(payload, "emulatorOverridePath")) {
        const nextPath = String(payload?.emulatorOverridePath || "").trim();
        if (nextPath && !fsSync.existsSync(nextPath)) {
          return { success: false, message: "Selected emulator path does not exist" };
        }
        patch.emulatorOverridePath = nextPath || null;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "platformShortName")) {
        const nextPlatformShortName = normalizePlatform(payload?.platformShortName);
        if (!nextPlatformShortName) {
          return { success: false, message: "Missing platform short name" };
        }

        let nextPlatformName = "Unknown";
        if (nextPlatformShortName === "pc") {
          nextPlatformName = "PC";
        } else {
          const platformConfigs = await getPlatformConfigs();
          const config = (platformConfigs || []).find((row) => normalizePlatform(row?.shortName) === nextPlatformShortName);
          if (config) nextPlatformName = String(config?.name || nextPlatformShortName).trim() || nextPlatformShortName;
        }

        patch.platformShortName = nextPlatformShortName;
        patch.platform = nextPlatformName;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
        const rawTags = Array.isArray(payload?.tags) ? payload.tags : [];
        const normalizedTags = [];
        const seen = new Set();
        rawTags.forEach((rawTag) => {
          const tag = normalizeTagId(rawTag);
          if (!tag || seen.has(tag)) return;
          seen.add(tag);
          normalizedTags.push(tag);
        });
        patch.tags = normalizedTags;

        if (normalizedTags.length > 0) {
          const tagCatalogMap = new Map(
            getMergedTagCatalog().map((row) => [String(row?.id || "").toLowerCase(), String(row?.label || "").trim()])
          );
          dbUpsertTags(
            normalizedTags.map((tagId) => ({
              id: tagId,
              label: tagCatalogMap.get(tagId) || toTitleCaseFromSlug(tagId),
              source: "user"
            })),
            { source: "user" }
          );
        }
      }

      const updated = dbUpdateGameMetadata(gameId, patch);
      if (!updated) return { success: false, message: "Failed to update game metadata" };

      refreshLibraryFromDb();
      return { success: true, game: updated };
    } catch (error) {
      log.error("Failed to update game metadata:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("remove-game", async (_event, gameId) => {
    try {
      const targetId = Number(gameId);
      const game = getGamesState().find((row) => Number(row.id) === targetId) || dbGetGameById(targetId);
      if (!game) return { success: false, message: "Game not found" };

      const removed = dbDeleteGameById(targetId);
      if (removed) {
        refreshLibraryFromDb();
        log.info(`Game ${game.name} removed from library`);
        return { success: true, message: "Game removed from library" };
      }

      return { success: false, message: "Game not found" };
    } catch (error) {
      log.error(`Failed to remove game ${gameId}:`, error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("launch-game", async (_event, gameId) => {
    try {
      const targetId = Number(gameId);
      const game = getGamesState().find((row) => Number(row.id) === targetId) || dbGetGameById(targetId);
      if (!game) return { success: false, message: "Game not found" };
      return launchGameObject(game);
    } catch (error) {
      log.error(`Failed to launch game ${gameId}:`, error);
      const mainWindow = getMainWindow();
      if (mainWindow) mainWindow.restore();
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("search-missing-game-file", async (_event, payload = {}) => {
    try {
      const targetId = Number(payload?.gameId);
      const rootDir = String(payload?.rootDir || "").trim();
      const maxDepth = Number.isFinite(payload?.maxDepth) ? Math.max(0, Math.floor(payload.maxDepth)) : 8;

      if (!targetId) return { success: false, message: "Missing game ID" };
      if (!rootDir) return { success: false, message: "Missing search root folder" };
      if (!fsSync.existsSync(rootDir) || !fsSync.statSync(rootDir).isDirectory()) {
        return { success: false, message: "Search root folder not found" };
      }

      const game = dbGetGameById(targetId) || getGamesState().find((row) => Number(row.id) === targetId);
      if (!game) return { success: false, message: "Game not found" };

      const oldPath = String(game.filePath || "").trim();
      const targetFileName = path.basename(oldPath);
      if (!targetFileName) return { success: false, message: "Game has no file name" };

      const foundPath = findFileByNameInTree(rootDir, targetFileName, { maxDepth, maxVisitedDirs: 15000 });
      if (!foundPath) {
        return {
          success: true,
          found: false,
          gameId: targetId,
          gameName: game.name || "Unknown Game",
          targetFileName
        };
      }

      const updated = dbUpdateGameFilePath(targetId, foundPath);
      if (!updated) return { success: false, message: "Failed to update game path" };
      refreshLibraryFromDb();

      return {
        success: true,
        found: true,
        gameId: targetId,
        gameName: updated.name || game.name || "Unknown Game",
        newPath: foundPath
      };
    } catch (error) {
      log.error("search-missing-game-file failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("relink-game-file", async (_event, payload = {}) => {
    try {
      const targetId = Number(payload?.gameId);
      const selectedPath = String(payload?.filePath || "").trim();

      if (!targetId) return { success: false, message: "Missing game ID" };
      if (!selectedPath) return { success: false, message: "Missing file path" };
      if (!fsSync.existsSync(selectedPath)) return { success: false, message: "Selected file was not found" };

      let stat;
      try {
        stat = fsSync.statSync(selectedPath);
      } catch (_e) {
        stat = null;
      }
      if (!stat || !stat.isFile()) return { success: false, message: "Selected path is not a file" };

      const game = dbGetGameById(targetId) || getGamesState().find((row) => Number(row.id) === targetId);
      if (!game) return { success: false, message: "Game not found" };

      const updated = dbUpdateGameFilePath(targetId, selectedPath);
      if (!updated) return { success: false, message: "Failed to update game path" };
      refreshLibraryFromDb();

      return {
        success: true,
        gameId: targetId,
        gameName: updated.name || game.name || "Unknown Game",
        newPath: selectedPath
      };
    } catch (error) {
      log.error("relink-game-file failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("create-game-shortcut", async (_event, gameId) => {
    try {
      const game = getGamesState().find((row) => Number(row.id) === Number(gameId));
      if (!game) return { success: false, message: "Game not found" };

      const url = buildDeepLinkForGame(game);
      const { target, args } = getShortcutTargetAndArgs(url);

      const desktopDir = app.getPath("desktop");
      const shortcutName = `${sanitizeFilename(`${game.name} (${game.platformShortName || game.platform || "unknown"})`)}.lnk`;
      const shortcutPath = path.join(desktopDir, shortcutName);

      const iconDir = path.join(app.getPath("userData"), "shortcut-icons");
      fsSync.mkdirSync(iconDir, { recursive: true });

      const coverPath = resolveGameCoverPath(game);
      const iconKey = sanitizeFilename(`${game.platformShortName || "unknown"}_${inferGameCode(game) || game.name || "game"}`);
      const icoPath = path.join(iconDir, `${iconKey}.ico`);

      try {
        const img = nativeImage.createFromPath(coverPath).resize({ width: 256, height: 256 });
        const png = img.toPNG();
        writeIcoFromPng(png, icoPath);
      } catch (error) {
        log.warn("Failed to generate shortcut icon, falling back to app icon:", error.message);
      }

      const ok = shell.writeShortcutLink(shortcutPath, {
        target,
        args,
        description: `Launch ${game.name} in emuBro`,
        icon: fsSync.existsSync(icoPath) ? icoPath : undefined,
        iconIndex: 0
      });

      if (!ok) return { success: false, message: "Failed to create shortcut" };
      return { success: true, path: shortcutPath, url };
    } catch (error) {
      log.error("Failed to create shortcut:", error);
      return { success: false, message: error.message };
    }
  });

  return {
    launchGameObject
  };
}

module.exports = {
  registerGameIpc
};
