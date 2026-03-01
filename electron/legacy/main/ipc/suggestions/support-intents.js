function createSupportIntentsService(deps = {}) {
  const normalizeText = typeof deps.normalizeText === "function"
    ? deps.normalizeText
    : ((value, fallback = "") => {
      const text = String(value ?? "").trim();
      return text || fallback;
    });
  const getGamesState = typeof deps.getGamesState === "function"
    ? deps.getGamesState
    : (() => []);
  const getEmulatorsState = typeof deps.getEmulatorsState === "function"
    ? deps.getEmulatorsState
    : (() => []);
  const normalizePlatformRef = typeof deps.normalizePlatform === "function"
    ? deps.normalizePlatform
    : ((value) => String(value || "").trim().toLowerCase());
  const getPlatformConfigs = typeof deps.getPlatformConfigs === "function"
    ? deps.getPlatformConfigs
    : (async () => []);
  const launchGameObject = typeof deps.launchGameObject === "function"
    ? deps.launchGameObject
    : null;
  const downloadInstallEmulator = typeof deps.downloadInstallEmulator === "function"
    ? deps.downloadInstallEmulator
    : null;

  function normalizeLookup(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeCompactLookup(value) {
    return normalizeLookup(value).replace(/\s+/g, "");
  }

  function buildPlatformMatcher(platformConfigs = []) {
    const aliasToCanonical = new Map();
    const canonicalToAliases = new Map();

    function register(canonical, alias) {
      const canonicalKey = normalizeCompactLookup(canonical);
      const aliasKey = normalizeCompactLookup(alias);
      if (!canonicalKey || !aliasKey) return;
      if (!canonicalToAliases.has(canonicalKey)) {
        canonicalToAliases.set(canonicalKey, new Set());
      }
      canonicalToAliases.get(canonicalKey).add(aliasKey);
      if (!aliasToCanonical.has(aliasKey)) {
        aliasToCanonical.set(aliasKey, canonicalKey);
      }
    }

    (Array.isArray(platformConfigs) ? platformConfigs : []).forEach((cfg) => {
      const canonical = normalizePlatformRef(cfg?.shortName || cfg?.platform || cfg?.platformDir || cfg?.name);
      const aliasCandidates = new Set([
        cfg?.shortName,
        cfg?.platform,
        cfg?.platformDir,
        cfg?.name
      ]);
      const extraAliases = []
        .concat(Array.isArray(cfg?.aliases) ? cfg.aliases : [])
        .concat(Array.isArray(cfg?.platformAliases) ? cfg.platformAliases : [])
        .concat(Array.isArray(cfg?.supportAliases) ? cfg.supportAliases : []);
      extraAliases.forEach((alias) => aliasCandidates.add(alias));

      const displayName = normalizeLookup(cfg?.name);
      const companyName = normalizeLookup(cfg?.companyName);
      if (displayName && companyName && displayName.startsWith(`${companyName} `)) {
        aliasCandidates.add(displayName.slice(companyName.length + 1));
      }

      aliasCandidates.forEach((alias) => register(canonical, alias));
    });

    function resolve(value) {
      const key = normalizeCompactLookup(normalizePlatformRef(value) || value);
      if (!key) return "";
      return aliasToCanonical.get(key) || key;
    }

    function isKnown(value) {
      const key = normalizeCompactLookup(normalizePlatformRef(value) || value);
      if (!key) return false;
      return aliasToCanonical.has(key) || canonicalToAliases.has(key);
    }

    function matches(left, right) {
      const leftKey = resolve(left);
      const rightKey = resolve(right);
      if (!leftKey || !rightKey) return false;
      if (leftKey === rightKey) return true;
      const leftAliases = canonicalToAliases.get(leftKey);
      const rightAliases = canonicalToAliases.get(rightKey);
      if (leftAliases && rightAliases) {
        for (const alias of leftAliases) {
          if (rightAliases.has(alias)) return true;
        }
      }
      return leftKey.includes(rightKey) || rightKey.includes(leftKey);
    }

    return {
      resolve,
      matches,
      isKnown
    };
  }

  let platformMatcherPromise = null;
  async function getPlatformMatcher() {
    if (!platformMatcherPromise) {
      platformMatcherPromise = Promise.resolve(getPlatformConfigs())
        .then((rows) => buildPlatformMatcher(rows))
        .catch(() => buildPlatformMatcher([]));
    }
    return platformMatcherPromise;
  }

  function normalizeActionPlan(plan = {}) {
    const rawIntent = normalizeText(plan?.intent || plan?.type || "").toLowerCase();
    const rawCommand = normalizeText(plan?.command || plan?.action || "").toLowerCase();
    const rawTarget = normalizeText(plan?.target || plan?.flag || plan?.operation || "").toLowerCase();
    const args = plan?.args && typeof plan.args === "object" ? plan.args : {};
    const gameFromArgs = normalizeText(args?.game || args?.title || args?.name || "");
    const queryFromArgs = normalizeText(args?.query || args?.search || "");
    const platformFromArgs = normalizeText(args?.platform || args?.system || "");
    const emulatorFromArgs = normalizeText(args?.emulator || args?.emu || args?.emulatorName || "");
    const methodFromArgs = normalizeText(args?.method || args?.installMethod || "");
    const osFromArgs = normalizeText(args?.os || args?.operatingSystem || "");

    let command = "none";
    let target = "none";

    if (rawCommand === "run" || rawCommand === "launch" || rawCommand === "play" || rawCommand === "start" || rawCommand === "open") {
      command = "run";
    } else if (rawCommand === "download") {
      command = "download";
    } else if (rawCommand === "install" || rawCommand === "setup") {
      command = "install";
    } else if (rawCommand === "get" || rawCommand === "count" || rawCommand === "list" || rawCommand === "find") {
      command = "get";
    }

    if (rawTarget === "game" || rawTarget === "games" || rawTarget === "title") {
      target = "game";
    } else if (rawTarget === "game-count" || rawTarget === "count" || rawTarget === "library-count" || rawTarget === "games-count") {
      target = "game-count";
    } else if (rawTarget === "emulator" || rawTarget === "emu" || rawTarget === "emulators") {
      target = "emulator";
    }

    if (command === "none") {
      if (rawIntent === "run_game") {
        command = "run";
        target = "game";
      } else if (rawIntent === "count_games" || rawIntent === "count_specific_games") {
        command = "get";
        target = "game-count";
      } else if (rawIntent === "download_emulator") {
        command = "download";
        target = "emulator";
      } else if (rawIntent === "install_emulator") {
        command = "install";
        target = "emulator";
      }
    }

    let normalizedIntent = "none";
    if (command === "run" && target === "game") normalizedIntent = "run_game";
    else if (command === "get" && target === "game-count") normalizedIntent = "count_games";
    else if (command === "download" && target === "emulator") normalizedIntent = "download_emulator";
    else if (command === "install" && target === "emulator") normalizedIntent = "install_emulator";

    const explicitRunQuery = normalizeText(
      plan?.gameQuery || plan?.gameName || ""
    );
    const legacySpecificCountQuery = rawIntent === "count_specific_games"
      ? normalizeText(plan?.queryText || plan?.subjectQuery || plan?.gameQuery || plan?.gameName || "")
      : "";
    const gameQuery = normalizedIntent === "run_game" ? (gameFromArgs || explicitRunQuery) : "";
    const queryText = queryFromArgs || legacySpecificCountQuery;
    if (normalizedIntent === "count_games" && queryText) {
      normalizedIntent = "count_specific_games";
    }

    const confidenceValue = Number(plan?.confidence);
    const confidence = Number.isFinite(confidenceValue)
      ? Math.max(0, Math.min(1, confidenceValue))
      : 0;
    return {
      command,
      target,
      intent: normalizedIntent,
      gameQuery,
      emulatorQuery: emulatorFromArgs || normalizeText(plan?.emulatorQuery || plan?.emulator || plan?.emulatorName || ""),
      platformHint: platformFromArgs || normalizeText(plan?.platformHint || plan?.platform || ""),
      installMethod: methodFromArgs || normalizeText(plan?.installMethod || ""),
      osHint: osFromArgs || normalizeText(plan?.osHint || plan?.os || ""),
      queryText,
      confidence,
      reason: normalizeText(plan?.reason || "")
    };
  }

  function tokenizeQuery(value = "") {
    return normalizeLookup(value)
      .split(" ")
      .filter((token) => token.length >= 2);
  }

  function scoreGame(game = {}, runPlan = {}, matcher) {
    const gameName = normalizeText(game?.name);
    if (!gameName) return 0;
    const gameLookup = normalizeLookup(gameName);
    const queryLookup = normalizeLookup(runPlan?.gameQuery);
    const queryTokens = tokenizeQuery(runPlan?.gameQuery);
    const platformHint = matcher.resolve(runPlan?.platformHint);
    const gamePlatform = matcher.resolve(game?.platformShortName || game?.platform);
    let score = 0;

    if (queryLookup && gameLookup === queryLookup) score += 240;
    else if (queryLookup && gameLookup.startsWith(queryLookup)) score += 190;
    else if (queryLookup && gameLookup.includes(queryLookup)) score += 140;

    const tokenHits = queryTokens.filter((token) => gameLookup.includes(token)).length;
    if (tokenHits > 0) score += tokenHits * 22;
    if (queryTokens.length > 0 && tokenHits === queryTokens.length) score += 35;

    if (platformHint && gamePlatform && matcher.matches(platformHint, gamePlatform)) score += 90;
    else if (platformHint && !gamePlatform) score -= 10;

    const filePath = normalizeText(game?.filePath).toLowerCase();
    if (/\bsbi\b/.test(gameLookup) || filePath.endsWith(".sbi")) {
      score -= 120;
    }

    return score;
  }

  function findRunCandidates(runPlan = {}, matcher, limit = 6) {
    const games = Array.isArray(getGamesState()) ? getGamesState() : [];
    return games
      .map((game) => ({ game, score: scoreGame(game, runPlan, matcher) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Number(limit) || 6));
  }

  function deriveRunPlanFromQuery(runPlan = {}, matcher) {
    const normalized = { ...runPlan };
    let gameQuery = normalizeText(normalized.gameQuery);
    let platformHint = normalizeText(normalized.platformHint);
    if (!gameQuery) return normalized;

    if (!platformHint) {
      const bracketSuffixMatch = gameQuery.match(/^(.+?)\s*\[([^\]]+)\]\s*$/);
      if (bracketSuffixMatch) {
        const candidatePlatform = normalizeText(bracketSuffixMatch[2]);
        if (candidatePlatform && matcher.isKnown(candidatePlatform)) {
          gameQuery = normalizeText(bracketSuffixMatch[1]);
          platformHint = candidatePlatform;
        }
      }
    }

    return {
      ...normalized,
      gameQuery,
      platformHint
    };
  }

  async function handleRunIntent(plan = {}) {
    const runPlan = normalizeActionPlan(plan);
    if (runPlan.intent !== "run_game" || !runPlan.gameQuery) {
      return { handled: false };
    }
    const matcher = await getPlatformMatcher();
    const resolvedRunPlan = deriveRunPlanFromQuery(runPlan, matcher);
    const candidates = findRunCandidates(resolvedRunPlan, matcher, 6);
    if (!candidates.length) {
      return {
        handled: true,
        answer: `I could not find a game matching "${resolvedRunPlan.gameQuery}" in your library.`,
        action: { type: "run-game", status: "not_found", query: resolvedRunPlan }
      };
    }

    const best = candidates[0];
    const runnerUp = candidates[1];
    const queryLookup = normalizeLookup(resolvedRunPlan.gameQuery);
    const bestLookup = normalizeLookup(best?.game?.name || "");
    const hasExactNameMatch = !!(queryLookup && bestLookup && queryLookup === bestLookup);
    const ambiguityDelta = hasExactNameMatch ? 10 : 28;
    if (runnerUp && (best.score - runnerUp.score) < ambiguityDelta) {
      const options = candidates.slice(0, 4)
        .map((entry) => `${normalizeText(entry.game?.name)}${normalizeText(entry.game?.platformShortName || entry.game?.platform) ? ` [${normalizeText(entry.game?.platformShortName || entry.game?.platform)}]` : ""}`)
        .join(", ");
      return {
        handled: true,
        answer: `I found multiple matches. Tell me which one to run: ${options}`,
        action: { type: "run-game", status: "ambiguous", query: resolvedRunPlan }
      };
    }

    if (!launchGameObject) {
      return {
        handled: true,
        answer: `I matched "${normalizeText(best.game?.name)}", but launch actions are not available right now.`,
        action: { type: "run-game", status: "launch_unavailable", query: resolvedRunPlan }
      };
    }

    try {
      const launchResult = await Promise.resolve(launchGameObject(best.game, {}));
      if (launchResult?.success) {
        return {
          handled: true,
          answer: `Launching ${normalizeText(best.game?.name)}${normalizeText(best.game?.platformShortName || best.game?.platform) ? ` on ${normalizeText(best.game?.platformShortName || best.game?.platform).toUpperCase()}` : ""}.`,
          action: {
            type: "run-game",
            status: "launched",
            gameId: Number(best.game?.id || 0),
            gameName: normalizeText(best.game?.name)
          }
        };
      }
      return {
        handled: true,
        answer: `I matched "${normalizeText(best.game?.name)}", but launch failed: ${normalizeText(launchResult?.message, "unknown error")}`,
        action: { type: "run-game", status: "launch_failed", gameId: Number(best.game?.id || 0) }
      };
    } catch (error) {
      return {
        handled: true,
        answer: `I matched "${normalizeText(best.game?.name)}", but launch failed: ${normalizeText(error?.message || String(error), "unknown error")}`,
        action: { type: "run-game", status: "launch_failed_exception", gameId: Number(best.game?.id || 0) }
      };
    }
  }

  function normalizeInstallMethod(value = "") {
    const raw = normalizeLookup(value).replace(/\s+/g, "");
    if (raw === "flatpak") return "flatpak";
    if (raw === "apt" || raw === "deb" || raw === "debian") return "apt";
    if (raw === "download" || raw === "directdownload" || raw === "installer") return "download";
    return "";
  }

  async function collectConfiguredEmulators() {
    const loaded = await getPlatformConfigs();
    const rows = Array.isArray(loaded) ? loaded : [];
    const out = [];
    rows.forEach((cfg) => {
      const platformShortName = normalizeText(cfg?.shortName || cfg?.platform || cfg?.platformDir);
      const platformName = normalizeText(cfg?.name || platformShortName || "Unknown");
      const emulators = Array.isArray(cfg?.emulators) ? cfg.emulators : [];
      emulators.forEach((emu) => {
        const name = normalizeText(emu?.name);
        if (!name) return;
        out.push({
          name,
          platform: platformName,
          platformShortName,
          installers: (emu?.installers && typeof emu.installers === "object") ? emu.installers : null,
          website: normalizeText(emu?.website),
          downloadUrl: emu?.downloadUrl || "",
          searchString: normalizeText(emu?.searchString)
        });
      });
    });
    return out;
  }

  function scoreEmulatorCandidate(entry = {}, plan = {}, matcher) {
    const emuName = normalizeLookup(entry?.name);
    if (!emuName) return 0;
    const platformName = normalizeLookup(entry?.platform);
    const platformShort = normalizeLookup(entry?.platformShortName);
    const query = normalizeLookup(plan?.emulatorQuery);
    const queryTokens = tokenizeQuery(plan?.emulatorQuery);
    let score = 0;

    if (query) {
      if (emuName === query) score += 260;
      else if (emuName.startsWith(query)) score += 220;
      else if (emuName.includes(query)) score += 160;
      const tokenHits = queryTokens.filter((token) => emuName.includes(token)).length;
      if (tokenHits > 0) score += tokenHits * 26;
      if (queryTokens.length > 0 && tokenHits === queryTokens.length) score += 34;
    } else {
      score += 5;
    }

    if (plan?.platformHint) {
      if (matcher.matches(plan.platformHint, entry?.platformShortName) || matcher.matches(plan.platformHint, entry?.platform)) {
        score += 90;
      } else {
        const hint = normalizeLookup(plan.platformHint);
        if ((platformName && platformName.includes(hint)) || (platformShort && platformShort.includes(hint))) score += 45;
      }
    }

    return score;
  }

  function chooseLinuxInstallMethod(entry = {}, requested = "") {
    const method = normalizeInstallMethod(requested);
    const linuxInstallers = entry?.installers?.linux || {};
    if (method && linuxInstallers?.[method]) return method;
    if (method === "download") return "download";
    if (linuxInstallers?.flatpak) return "flatpak";
    if (linuxInstallers?.apt) return "apt";
    return "download";
  }

  function normalizeOsHint(value = "") {
    const compact = normalizeLookup(value).replace(/\s+/g, "");
    if (!compact) return "";
    if (compact.includes("win")) return "windows";
    if (compact.includes("linux") || compact.includes("ubuntu") || compact.includes("debian")) return "linux";
    if (compact.includes("mac") || compact.includes("osx") || compact.includes("darwin")) return "mac";
    return "";
  }

  function normalizeNodePlatform(value = "") {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "win32") return "windows";
    if (raw === "darwin") return "mac";
    if (raw === "linux") return "linux";
    return "";
  }

  async function handleEmulatorAcquireIntent(payload = {}, plan = {}) {
    const normalized = normalizeActionPlan(plan);
    const isDownload = normalized.intent === "download_emulator";
    const isInstall = normalized.intent === "install_emulator";
    if (!isDownload && !isInstall) return { handled: false };

    if (!downloadInstallEmulator) {
      return {
        handled: true,
        answer: "Emulator download/install actions are not available right now.",
        action: { type: "emulator-acquire", status: "handler_unavailable" }
      };
    }

    const matcher = await getPlatformMatcher();
    const configured = await collectConfiguredEmulators();
    if (!configured.length) {
      return {
        handled: true,
        answer: "I could not find emulator definitions in platform configs.",
        action: { type: "emulator-acquire", status: "no_configured_emulators" }
      };
    }

    const ranked = configured
      .map((entry) => ({ entry, score: scoreEmulatorCandidate(entry, normalized, matcher) }))
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!ranked.length) {
      const label = normalized.emulatorQuery || normalized.platformHint || "your request";
      return {
        handled: true,
        answer: `I could not match an emulator for "${label}".`,
        action: { type: "emulator-acquire", status: "not_found", query: normalized }
      };
    }

    const best = ranked[0];
    const runnerUp = ranked[1];
    if (runnerUp && (best.score - runnerUp.score) < 26) {
      const options = ranked.slice(0, 4)
        .map((row) => `${normalizeText(row.entry?.name)} [${normalizeText(row.entry?.platformShortName || row.entry?.platform)}]`)
        .join(", ");
      return {
        handled: true,
        answer: `I found multiple emulator matches. Tell me which one to use: ${options}`,
        action: { type: "emulator-acquire", status: "ambiguous", query: normalized }
      };
    }

    const preferredOs = normalizeOsHint(normalized.osHint)
      || normalizeNodePlatform(payload?.osPlatform)
      || "";
    const installMethod = preferredOs === "linux"
      ? chooseLinuxInstallMethod(best.entry, normalized.installMethod || (isDownload ? "download" : ""))
      : "download";

    const result = await Promise.resolve(downloadInstallEmulator({
      ...best.entry,
      os: preferredOs || undefined,
      installMethod
    }));

    if (result?.success) {
      const modeLabel = installMethod === "download" ? "download/install" : `install (${installMethod})`;
      return {
        handled: true,
        answer: `${modeLabel} started for ${normalizeText(best.entry?.name)}${normalizeText(best.entry?.platformShortName) ? ` [${normalizeText(best.entry.platformShortName).toUpperCase()}]` : ""}. ${normalizeText(result?.message)}`.trim(),
        action: {
          type: "emulator-acquire",
          status: "ok",
          command: normalized.command,
          emulatorName: normalizeText(best.entry?.name),
          platformShortName: normalizeText(best.entry?.platformShortName),
          installMethod,
          result
        }
      };
    }

    return {
      handled: true,
      answer: `Failed to ${normalized.command} ${normalizeText(best.entry?.name)}: ${normalizeText(result?.message, "unknown error")}`,
      action: {
        type: "emulator-acquire",
        status: "failed",
        command: normalized.command,
        emulatorName: normalizeText(best.entry?.name),
        platformShortName: normalizeText(best.entry?.platformShortName),
        installMethod,
        result
      }
    };
  }

  function stripBracketed(value = "") {
    let text = normalizeText(value);
    let previous = "";
    while (text && text !== previous) {
      previous = text;
      text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, " ");
      text = text.replace(/\s+/g, " ").trim();
    }
    return text;
  }

  async function handleSpecificGameCountIntent(plan = {}) {
    const normalized = normalizeActionPlan(plan);
    if (normalized.intent !== "count_specific_games") return { handled: false };
    const queryForMatch = normalized.gameQuery || normalized.queryText;
    if (!queryForMatch) return { handled: false };
    const queryForDisplay = normalized.gameQuery || normalized.queryText;

    const matcher = await getPlatformMatcher();
    const queryTokens = tokenizeQuery(queryForMatch);
    if (!queryTokens.length) return { handled: false };

    const games = Array.isArray(getGamesState()) ? getGamesState() : [];
    const matches = games.filter((game) => {
      const gameNameLookup = normalizeLookup(game?.name || "");
      if (!gameNameLookup) return false;
      const gamePlatform = game?.platformShortName || game?.platform;
      if (normalized.platformHint && gamePlatform && !matcher.matches(normalized.platformHint, gamePlatform)) return false;
      return queryTokens.every((token) => gameNameLookup.includes(token));
    });

    if (!matches.length) {
      return {
        handled: true,
        answer: `I could not find any games matching "${queryForDisplay}" in your library.`,
        action: { type: "specific-library-count", status: "not_found", query: queryForDisplay }
      };
    }

    const uniqueNames = new Map();
    matches.forEach((game) => {
      const cleaned = stripBracketed(game?.name || "");
      const key = normalizeLookup(cleaned || game?.name || "");
      if (!key || uniqueNames.has(key)) return;
      uniqueNames.set(key, cleaned || normalizeText(game?.name, "Unknown game"));
    });

    const sample = Array.from(uniqueNames.values()).slice(0, 6).join(", ");
    const platformPart = normalized.platformHint ? ` on ${normalizeText(normalized.platformHint).toUpperCase()}` : "";
    return {
      handled: true,
      answer: `I found ${matches.length} matching entries${platformPart} for "${queryForDisplay}" (${uniqueNames.size} unique titles).${sample ? ` Examples: ${sample}.` : ""}`,
      action: {
        type: "specific-library-count",
        status: "ok",
        entries: matches.length,
        uniqueTitles: uniqueNames.size
      }
    };
  }

  function handleLibraryCountIntent(plan = {}) {
    const normalized = normalizeActionPlan(plan);
    if (normalized.intent !== "count_games") return { handled: false };
    const games = Array.isArray(getGamesState()) ? getGamesState() : [];
    const emulators = Array.isArray(getEmulatorsState()) ? getEmulatorsState() : [];
    const installedGames = games.filter((game) => !!game?.isInstalled).length;
    return {
      handled: true,
      answer: `You currently have ${games.length} games in your library (${installedGames} marked installed) and ${emulators.length} emulators configured.`,
      action: { type: "library-count", status: "ok" }
    };
  }

  async function handlePlannedIntent(payload = {}, actionPlan = {}) {
    const normalized = normalizeActionPlan(actionPlan);
    if (!normalized.intent || normalized.intent === "none") {
      return { handled: false };
    }
    const emulatorAcquire = await handleEmulatorAcquireIntent(payload, normalized);
    if (emulatorAcquire.handled) return emulatorAcquire;
    const runResult = await handleRunIntent(normalized);
    if (runResult.handled) return runResult;
    const specificCount = await handleSpecificGameCountIntent(normalized);
    if (specificCount.handled) return specificCount;
    const countResult = handleLibraryCountIntent(normalized);
    if (countResult.handled) return countResult;
    return { handled: false };
  }

  return {
    normalizeActionPlan,
    handlePlannedIntent
  };
}

module.exports = {
  createSupportIntentsService
};
