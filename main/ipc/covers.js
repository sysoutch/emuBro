const path = require("path");

const COVER_SOURCES = Object.freeze({
  psx: "https://raw.githubusercontent.com/xlenore/psx-covers/main/covers/default/${serial}.jpg",
  ps2: "https://raw.githubusercontent.com/xlenore/ps2-covers/main/covers/default/${serial}.jpg"
});

function registerCoverIpc(deps = {}) {
  const {
    ipcMain,
    log,
    fsSync,
    getPlatformConfigs,
    normalizePlatform,
    inferGameCode,
    getGamesState,
    dbGetGameById,
    dbUpdateGameMetadata,
    refreshLibraryFromDb,
    resolveResourcePath,
    fetchImpl
  } = deps;

  if (!ipcMain) throw new Error("registerCoverIpc requires ipcMain");
  if (!log) throw new Error("registerCoverIpc requires log");
  if (!fsSync) throw new Error("registerCoverIpc requires fsSync");
  if (typeof getPlatformConfigs !== "function") throw new Error("registerCoverIpc requires getPlatformConfigs");
  if (typeof normalizePlatform !== "function") throw new Error("registerCoverIpc requires normalizePlatform");
  if (typeof inferGameCode !== "function") throw new Error("registerCoverIpc requires inferGameCode");
  if (typeof getGamesState !== "function") throw new Error("registerCoverIpc requires getGamesState");
  if (typeof dbGetGameById !== "function") throw new Error("registerCoverIpc requires dbGetGameById");
  if (typeof dbUpdateGameMetadata !== "function") throw new Error("registerCoverIpc requires dbUpdateGameMetadata");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerCoverIpc requires refreshLibraryFromDb");
  if (typeof resolveResourcePath !== "function") throw new Error("registerCoverIpc requires resolveResourcePath");
  if (typeof fetchImpl !== "function") throw new Error("registerCoverIpc requires fetchImpl");

  function normalizeCoverPlatform(value) {
    const raw = normalizePlatform(value);
    if (raw === "psx" || raw === "ps2") return raw;
    if (raw === "ps1" || raw === "ps") return "psx";
    if (raw === "playstation" || raw === "playstation-1" || raw === "sony-playstation") return "psx";
    if (raw === "playstation2" || raw === "playstation-2" || raw === "sony-playstation-2") return "ps2";
    return "";
  }

  function normalizeSerial(value) {
    const raw = String(value || "").trim().toUpperCase();
    if (!raw) return "";

    const cleaned = raw
      .replace(/[^A-Z0-9.\-_\s]/g, "")
      .replace(/[.\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleaned) return "";

    const compact = cleaned.replace(/-/g, "");
    const compactMatch = compact.match(/^([A-Z]{4})(\d{3,7})$/);
    if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}`;

    const splitMatch = cleaned.match(/^([A-Z]{4})-?(\d{3,7})$/);
    if (splitMatch) return `${splitMatch[1]}-${splitMatch[2]}`;

    return cleaned;
  }

  function serialCandidatesFromGame(game) {
    const seeds = [];
    const addSeed = (value) => {
      const text = String(value || "").trim();
      if (!text) return;
      seeds.push(text);
    };

    addSeed(game?.code);
    addSeed(game?.productCode);
    addSeed(game?.serial);
    addSeed(game?.gameCode);
    addSeed(inferGameCode(game));

    const hay = `${String(game?.name || "")} ${path.basename(String(game?.filePath || ""))}`.toUpperCase();
    const pattern = /\b([A-Z]{4})[-_. ]?(\d{3})[-_. ]?(\d{2,4})\b|\b([A-Z]{4})[-_. ]?(\d{3,7})\b/g;
    let match;
    while ((match = pattern.exec(hay))) {
      if (match[1] && match[2] && match[3]) {
        addSeed(`${match[1]}-${match[2]}${match[3]}`);
      } else if (match[4] && match[5]) {
        addSeed(`${match[4]}-${match[5]}`);
      }
    }

    const out = [];
    const seen = new Set();
    for (const seed of seeds) {
      const normalized = normalizeSerial(seed);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      out.push(normalized);

      const compact = normalized.replace(/-/g, "");
      if (compact && !seen.has(compact)) {
        seen.add(compact);
        out.push(compact);
      }
    }
    return out;
  }

  function hasAssignedCover(game, platform) {
    const image = String(game?.image || "").trim();
    if (!image) return false;
    if (/\/default\.(jpg|jpeg|png|webp)$/i.test(image)) return false;
    const marker = `emubro-resources/platforms/${platform}/covers/`;
    if (image.toLowerCase().includes(marker.toLowerCase())) return true;
    return true;
  }

  function normalizeSourceTemplate(template) {
    const text = String(template || "").trim();
    if (!text) return "";
    if (!/^https?:\/\//i.test(text)) return "";
    if (!text.includes("${serial}")) return "";
    return text;
  }

  async function getConfigSourceTemplatesByPlatform() {
    const out = { psx: [], ps2: [] };
    try {
      const rows = await getPlatformConfigs();
      (Array.isArray(rows) ? rows : []).forEach((config) => {
        const platform = normalizeCoverPlatform(config?.shortName || config?.platform || config?.name);
        if (!platform) return;
        const entries = Array.isArray(config?.coverDownloadSources) ? config.coverDownloadSources : [];
        entries.forEach((entry) => {
          const normalized = normalizeSourceTemplate(entry);
          if (!normalized) return;
          out[platform].push(normalized);
        });
      });
    } catch (error) {
      log.warn("covers:get-config-source-templates failed, using built-in defaults:", error?.message || error);
    }
    return out;
  }

  function getSourceTemplatesForPlatform(platform, sourceOverrides = {}, configSourceTemplates = {}) {
    const defaults = [];
    const primary = normalizeSourceTemplate(COVER_SOURCES[platform]);
    if (primary) defaults.push(primary);

    const rawConfigured = Array.isArray(configSourceTemplates?.[platform]) ? configSourceTemplates[platform] : [];
    const configured = rawConfigured
      .map((entry) => normalizeSourceTemplate(entry))
      .filter(Boolean);

    const rawCustom = Array.isArray(sourceOverrides?.[platform]) ? sourceOverrides[platform] : [];
    const extra = rawCustom
      .map((entry) => normalizeSourceTemplate(entry))
      .filter(Boolean);

    const seen = new Set();
    const merged = [];
    [...defaults, ...configured, ...extra].forEach((entry) => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(entry);
    });
    return merged;
  }

  function getRelativeCoverPath(platform, serial) {
    return path.posix.join("emubro-resources", "platforms", platform, "covers", `${serial}.jpg`);
  }

  function getAbsoluteCoverPath(platform, serial) {
    const rel = path.posix.join("platforms", platform, "covers", `${serial}.jpg`);
    return resolveResourcePath(rel, { mustExist: false });
  }

  async function downloadCoverForGame(game, options = {}) {
    const overwrite = !!options.overwrite;
    const onlyMissing = !!options.onlyMissing;
    const sourceOverrides = (options?.sourceOverrides && typeof options.sourceOverrides === "object")
      ? options.sourceOverrides
      : {};
    const configSourceTemplates = (options?.configSourceTemplates && typeof options.configSourceTemplates === "object")
      ? options.configSourceTemplates
      : {};
    const id = Number(game?.id || 0);
    const platform = normalizeCoverPlatform(game?.platformShortName || game?.platform);

    if (!id) return { success: false, status: "invalid_game", message: "Invalid game" };
    if (!platform) return { success: false, status: "unsupported_platform", message: "Only PS1/PS2 are supported." };
    if (onlyMissing && hasAssignedCover(game, platform)) {
      return { success: true, status: "skipped_existing_cover", downloaded: false, gameId: id };
    }

    const serialCandidates = serialCandidatesFromGame(game);
    if (!serialCandidates.length) {
      return { success: false, status: "missing_serial", message: "No game serial/code detected.", gameId: id };
    }
    const sourceTemplates = getSourceTemplatesForPlatform(platform, sourceOverrides, configSourceTemplates);
    if (!sourceTemplates.length) {
      return { success: false, status: "missing_sources", message: "No valid cover source URLs configured.", gameId: id };
    }

    let lastHttpStatus = 0;
    for (const serial of serialCandidates) {
      const relativePath = getRelativeCoverPath(platform, serial);
      const absolutePath = getAbsoluteCoverPath(platform, serial);
      if (!absolutePath) continue;

      const alreadyExists = fsSync.existsSync(absolutePath);
      if (alreadyExists && !overwrite) {
        const patch = { image: relativePath };
        if (!String(game?.code || "").trim()) patch.code = serial;
        dbUpdateGameMetadata(id, patch);
        return {
          success: true,
          status: "reused_existing_file",
          downloaded: false,
          serial,
          image: relativePath,
          gameId: id
        };
      }

      for (const sourceTemplate of sourceTemplates) {
        const sourceUrl = sourceTemplate.replace("${serial}", encodeURIComponent(serial));
        if (!sourceUrl) continue;

        try {
          // Keep requests bounded so one bad edge node does not stall the whole batch.
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 15000);
          let response;
          try {
            response = await fetchImpl(sourceUrl, {
              redirect: "follow",
              signal: controller.signal
            });
          } finally {
            clearTimeout(timeout);
          }

          lastHttpStatus = Number(response?.status || 0);
          if (response.status === 404) continue;
          if (!response.ok) {
            return {
              success: false,
              status: "http_error",
              message: `Cover request failed (${response.status}).`,
              serial,
              sourceUrl,
              sourceTemplate,
              gameId: id
            };
          }

          const buffer = Buffer.from(await response.arrayBuffer());
          if (!buffer.length) {
            return {
              success: false,
              status: "empty_response",
              message: "Cover response was empty.",
              serial,
              sourceUrl,
              sourceTemplate,
              gameId: id
            };
          }

          fsSync.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fsSync.writeFileSync(absolutePath, buffer);

          const patch = { image: relativePath };
          if (!String(game?.code || "").trim()) patch.code = serial;
          dbUpdateGameMetadata(id, patch);

          return {
            success: true,
            status: "downloaded",
            downloaded: true,
            serial,
            image: relativePath,
            sourceUrl,
            sourceTemplate,
            gameId: id
          };
        } catch (error) {
          if (String(error?.name || "").toLowerCase() === "aborterror") {
            return {
              success: false,
              status: "timeout",
              message: "Cover request timed out.",
              serial,
              sourceUrl,
              sourceTemplate,
              gameId: id
            };
          }
          return {
            success: false,
            status: "request_failed",
            message: error?.message || String(error),
            serial,
            sourceUrl,
            sourceTemplate,
            gameId: id
          };
        }
      }
    }

    return {
      success: false,
      status: "not_found",
      message: "No cover was found for this serial.",
      httpStatus: lastHttpStatus || 404,
      gameId: id
    };
  }

  ipcMain.handle("covers:download-for-game", async (_event, payload = {}) => {
    try {
      const gameId = Number(payload?.gameId || 0);
      if (!gameId) return { success: false, message: "Missing game ID" };
      const game = dbGetGameById(gameId) || getGamesState().find((row) => Number(row.id) === gameId);
      if (!game) return { success: false, message: "Game not found" };

      const configSourceTemplates = await getConfigSourceTemplatesByPlatform();
      const result = await downloadCoverForGame(game, {
        overwrite: payload?.overwrite !== false,
        onlyMissing: !!payload?.onlyMissing,
        sourceOverrides: payload?.sourceOverrides,
        configSourceTemplates
      });
      refreshLibraryFromDb();
      return result;
    } catch (error) {
      log.error("covers:download-for-game failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("covers:download-for-library", async (_event, payload = {}) => {
    try {
      const configSourceTemplates = await getConfigSourceTemplatesByPlatform();
      const overwrite = !!payload?.overwrite;
      const onlyMissing = payload?.onlyMissing !== false;
      const gameIds = Array.isArray(payload?.gameIds)
        ? payload.gameIds.map((value) => Number(value || 0)).filter((value) => value > 0)
        : [];

      let games = Array.isArray(getGamesState()) ? getGamesState() : [];
      if (gameIds.length > 0) {
        const wanted = new Set(gameIds);
        games = games.filter((row) => wanted.has(Number(row?.id || 0)));
      }

      const supportedGames = games.filter((row) => normalizeCoverPlatform(row?.platformShortName || row?.platform));
      const results = [];
      let downloaded = 0;
      let skipped = 0;
      let failed = 0;
      let changed = false;

      for (const game of supportedGames) {
        // eslint-disable-next-line no-await-in-loop
        const result = await downloadCoverForGame(game, {
          overwrite,
          onlyMissing,
          sourceOverrides: payload?.sourceOverrides,
          configSourceTemplates
        });
        results.push({
          gameId: Number(game?.id || 0),
          name: String(game?.name || "").trim(),
          platformShortName: normalizeCoverPlatform(game?.platformShortName || game?.platform),
          ...result
        });

        if (result?.status === "downloaded" || result?.status === "reused_existing_file") {
          changed = true;
        }
        if (result?.downloaded) downloaded += 1;
        else if (result?.success) skipped += 1;
        else failed += 1;
      }

      if (changed) refreshLibraryFromDb();

      return {
        success: true,
        total: supportedGames.length,
        downloaded,
        skipped,
        failed,
        results,
        sourceTemplates: {
          psx: getSourceTemplatesForPlatform("psx", payload?.sourceOverrides, configSourceTemplates),
          ps2: getSourceTemplatesForPlatform("ps2", payload?.sourceOverrides, configSourceTemplates)
        }
      };
    } catch (error) {
      log.error("covers:download-for-library failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("covers:get-source-config", async () => {
    try {
      const configSourceTemplates = await getConfigSourceTemplatesByPlatform();
      return {
        success: true,
        sources: {
          psx: getSourceTemplatesForPlatform("psx", {}, configSourceTemplates),
          ps2: getSourceTemplatesForPlatform("ps2", {}, configSourceTemplates)
        }
      };
    } catch (error) {
      log.error("covers:get-source-config failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });
}

module.exports = {
  registerCoverIpc
};
