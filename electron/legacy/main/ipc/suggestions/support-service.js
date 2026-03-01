const path = require("node:path");
const { createSupportIntentsService } = require("./support-intents");
const { createSupportPrompts } = require("./support-prompts");
const { createSupportSystemSpecsService } = require("./support-system-specs");

function createSupportSuggestionsService(deps = {}) {
  const log = deps.log || console;
  const getPlatformConfigs = typeof deps.getPlatformConfigs === "function"
    ? deps.getPlatformConfigs
    : (async () => []);
  const getGamesState = typeof deps.getGamesState === "function"
    ? deps.getGamesState
    : (() => []);
  const getEmulatorsState = typeof deps.getEmulatorsState === "function"
    ? deps.getEmulatorsState
    : (() => []);
  const searchHelpDocs = typeof deps.searchHelpDocs === "function"
    ? deps.searchHelpDocs
    : (() => []);
  const normalizePlatformRef = typeof deps.normalizePlatform === "function"
    ? deps.normalizePlatform
    : ((value) => String(value || "").trim().toLowerCase());
  const normalizeProvider = typeof deps.normalizeProvider === "function"
    ? deps.normalizeProvider
    : ((provider) => String(provider || "").trim().toLowerCase() || "ollama");
  const requestSupportProviderText = typeof deps.requestSupportProviderText === "function"
    ? deps.requestSupportProviderText
    : null;
  const launchGameObject = typeof deps.launchGameObject === "function"
    ? deps.launchGameObject
    : null;
  const downloadInstallEmulator = typeof deps.downloadInstallEmulator === "function"
    ? deps.downloadInstallEmulator
    : null;
  const osRef = deps.os;
  const spawnSyncRef = deps.spawnSync;

  if (!requestSupportProviderText) {
    throw new Error("createSupportSuggestionsService requires requestSupportProviderText");
  }

  function normalizeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  const supportIntentsService = createSupportIntentsService({
    normalizeText,
    getGamesState,
    getEmulatorsState,
    getPlatformConfigs,
    normalizePlatform: normalizePlatformRef,
    launchGameObject,
    downloadInstallEmulator
  });

  const supportSystemSpecsService = createSupportSystemSpecsService({
    os: osRef,
    spawnSync: spawnSyncRef,
    normalizeText
  });

  function normalizeSupportMode(mode) {
    const value = String(mode || "").trim().toLowerCase();
    return value === "chat" ? "chat" : "troubleshoot";
  }

  function normalizeSupportChatHistory(rows, maxItems = 20) {
    const list = Array.isArray(rows) ? rows : [];
    return list
      .map((entry) => {
        const role = String(entry?.role || "").trim().toLowerCase() === "assistant" ? "assistant" : "user";
        const text = normalizeText(entry?.text);
        return { role, text };
      })
      .filter((entry) => !!entry.text)
      .slice(-Math.max(2, Number(maxItems) || 20));
  }

  function toSingleLine(value, maxLen = 220) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    const limit = Math.max(20, Number(maxLen) || 220);
    return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
  }

  function extractJsonObjectFromText(rawText = "") {
    const text = String(rawText || "").trim();
    if (!text) return null;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const fenced = fenceMatch ? String(fenceMatch[1] || "").trim() : text;
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const slice = fenced.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (_error) {
      return null;
    }
  }

  function normalizeSupportLookup(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeSupportPlatformKey(value) {
    const raw = normalizePlatformRef(value);
    if (!raw) return "";
    if (raw === "ps1" || raw === "ps") return "psx";
    if (raw === "playstation" || raw === "playstation-1" || raw === "sony-playstation") return "psx";
    if (raw === "playstation2" || raw === "playstation-2" || raw === "sony-playstation-2") return "ps2";
    if (raw === "game-boy" || raw === "gb") return "gameboy";
    if (raw === "gameboy-advance") return "gba";
    if (raw === "nintendo-ds") return "nds";
    if (raw === "nintendo-3ds") return "3ds";
    return String(raw || "").trim().toLowerCase();
  }

  const SUPPORT_LOOKUP_TYPES = Object.freeze([
    "platform_config",
    "emulator_install_paths",
    "game_library_matches",
    "launcher_integrations",
    "library_summary",
    "tools_features",
    "theme_manager_features",
    "help_docs",
    "emubro_repo_code",
    "web_search"
  ]);

  const EMUBRO_REPO_OWNER = "sysoutch";
  const EMUBRO_REPO_NAME = "emuBro";
  const EMUBRO_REPO_BRANCH = "emubro-electron";
  const EMUBRO_REPO_BROWSE_URL = `https://github.com/${EMUBRO_REPO_OWNER}/${EMUBRO_REPO_NAME}/tree/${EMUBRO_REPO_BRANCH}`;
  const EMUBRO_REPO_TREE_URL = `https://api.github.com/repos/${EMUBRO_REPO_OWNER}/${EMUBRO_REPO_NAME}/git/trees/${EMUBRO_REPO_BRANCH}?recursive=1`;
  const EMUBRO_REPO_RAW_BASE = `https://raw.githubusercontent.com/${EMUBRO_REPO_OWNER}/${EMUBRO_REPO_NAME}/${EMUBRO_REPO_BRANCH}`;
  const EMUBRO_REPO_TREE_TTL_MS = 15 * 60 * 1000;
  const EMUBRO_REPO_FAIL_RETRY_MS = 2 * 60 * 1000;
  const EMUBRO_REPO_FILE_TTL_MS = 8 * 60 * 1000;
  const EMUBRO_REPO_FILE_MAX_CHARS = 20000;
  const EMUBRO_REPO_SNIPPET_MAX_CHARS = 520;
  const EMUBRO_REPO_MAX_FILES = 3;
  const EMUBRO_REPO_ALLOWED_EXT = new Set([
    ".js", ".ts", ".json", ".md", ".scss", ".css", ".html"
  ]);
  const EMUBRO_REPO_PRIORITY_PATHS = [
    "README.md",
    "js/support-manager.js",
    "main/ipc/suggestions/support-service.js",
    "main/ipc/suggestions/support-prompts.js",
    "js/theme-manager.js",
    "js/game-manager.js",
    "js/window-ui-manager.js",
    "renderer.js"
  ];
  let supportRepoTreeCache = {
    paths: [],
    loadedAt: 0,
    failedAt: 0
  };
  const supportRepoFileCache = new Map();
  const SUPPORT_WEB_SEARCH_TTL_MS = 8 * 60 * 1000;
  const SUPPORT_WEB_SEARCH_MAX_RESULTS = 4;
  const SUPPORT_WEB_SEARCH_QUERY_MAX_LEN = 180;
  const supportWebSearchCache = new Map();

  function deriveHeuristicSupportLookups(payload = {}) {
    const mode = normalizeSupportMode(payload?.supportMode);
    const allowWebAccess = !!payload?.allowWebAccess;
    const hay = normalizeSupportLookup(
      `${payload?.issueSummary || ""} ${payload?.details || ""} ${payload?.errorText || ""} ${payload?.platform || ""} ${payload?.emulator || ""}`
    );
    const isThemeQuestion = /\b(theme|themes|theming|palette|color|background|font|logo effect|text effect|invert)\b/.test(hay);
    const hasPlatformHint = !!normalizeSupportLookup(payload?.platform);
    const hasEmulatorHint = !!normalizeSupportLookup(payload?.emulator);
    const set = new Set();

    if (mode === "chat") {
      set.add("tools_features");
      set.add("theme_manager_features");
      set.add("library_summary");
      set.add("help_docs");
      set.add("emubro_repo_code");
    } else {
      set.add("platform_config");
      set.add("emulator_install_paths");
      set.add("game_library_matches");
      set.add("library_summary");
    }
    if (/\b(steam|epic|gog|launcher)\b/.test(hay)) set.add("launcher_integrations");
    if (/\b(path|install|folder|directory|exe|appimage)\b/.test(hay)) set.add("emulator_install_paths");
    if (/\b(view|theme|language|import|filter|sort|tool|support|settings)\b/.test(hay)) set.add("tools_features");
    if (/\b(help|how to|guide|docs?|documentation|where is|what does)\b/.test(hay)) set.add("help_docs");
    if (/\b(code|source|github|internal|internals|implementation|how it works)\b/.test(hay)) set.add("emubro_repo_code");
    if (allowWebAccess && /\b(latest|today|new|recent|official|wiki|reddit|github issue|driver|firmware|compatibility)\b/.test(hay)) {
      set.add("web_search");
    }
    if (isThemeQuestion) set.add("theme_manager_features");

    if (isThemeQuestion && !hasPlatformHint && !hasEmulatorHint) {
      set.delete("platform_config");
      set.delete("game_library_matches");
    }
    return Array.from(set);
  }

  function normalizeSupportLookupPlan(rawPlan = {}, payload = {}) {
    const allowed = new Set(SUPPORT_LOOKUP_TYPES);
    const input = (rawPlan && typeof rawPlan === "object") ? rawPlan : {};
    const lookups = (Array.isArray(input.lookups) ? input.lookups : [])
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter((entry) => allowed.has(entry));
    const normalizedLookups = Array.from(new Set(lookups));
    if (!normalizedLookups.length) {
      normalizedLookups.push(...deriveHeuristicSupportLookups(payload));
    }

    const hay = normalizeSupportLookup(
      `${payload?.issueSummary || ""} ${payload?.details || ""} ${payload?.errorText || ""} ${payload?.platform || ""} ${payload?.emulator || ""}`
    );
    const isThemeQuestion = /\b(theme|themes|theming|palette|color|background|font|logo effect|text effect|invert)\b/.test(hay);
    const hasPlatformHint = !!normalizeSupportLookup(payload?.platform);
    const hasEmulatorHint = !!normalizeSupportLookup(payload?.emulator);
    if (isThemeQuestion) {
      if (!normalizedLookups.includes("tools_features")) normalizedLookups.push("tools_features");
      if (!normalizedLookups.includes("theme_manager_features")) normalizedLookups.push("theme_manager_features");
      if (!normalizedLookups.includes("help_docs")) normalizedLookups.push("help_docs");
      if (!hasPlatformHint && !hasEmulatorHint) {
        const filtered = normalizedLookups.filter((entry) => entry !== "platform_config" && entry !== "game_library_matches");
        normalizedLookups.length = 0;
        normalizedLookups.push(...filtered);
      }
    }

    const searchTerms = (Array.isArray(input.searchTerms) ? input.searchTerms : [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
      .slice(0, 8);
    const followUpQuestions = (Array.isArray(input.followUpQuestions) ? input.followUpQuestions : [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
      .slice(0, 3);
    const reason = normalizeText(input.reason, "heuristic");

    return {
      lookups: normalizedLookups,
      searchTerms,
      followUpQuestions,
      reason
    };
  }

  function buildSupportPlannerPrompt(payload = {}) {
    const mode = normalizeSupportMode(payload?.supportMode);
    const allowWebAccess = !!payload?.allowWebAccess;
    const issueSummary = normalizeText(payload?.issueSummary, "No summary");
    const platform = normalizeText(payload?.platform, "Not specified");
    const emulator = normalizeText(payload?.emulator, "Not specified");
    const details = normalizeText(payload?.details, "No extra details");
    const errorText = normalizeText(payload?.errorText, "No explicit error");
    const chatHistory = normalizeSupportChatHistory(payload?.chatHistory, 6);
    const chatLines = chatHistory.length
      ? chatHistory.map((entry) => `${entry.role}: ${entry.text}`).join("\n")
      : "(none)";

    return [
      "Plan a minimal local-retrieval strategy for an emuBro support request.",
      "Choose only what is needed from the allowed lookup types.",
      "",
      "Allowed lookup types:",
      "- platform_config",
      "- emulator_install_paths",
      "- game_library_matches",
      "- launcher_integrations",
      "- library_summary",
      "- tools_features",
      "- theme_manager_features",
      "- help_docs",
      "- emubro_repo_code",
      ...(allowWebAccess ? ["- web_search"] : []),
      "",
      "Planning hints:",
      "- For theme/UI/theming questions, prioritize tools_features + theme_manager_features.",
      "- For emuBro feature usage/how-to questions, include help_docs.",
      "- For questions about emuBro internals or implementation details, include emubro_repo_code.",
      ...(allowWebAccess
        ? ["- If local context is weak or uncertain, include web_search with focused search terms."]
        : ["- web_search is disabled unless the user enabled Web Access toggle."]),
      "- Only request platform_config when platform/emulator compatibility or file type behavior matters.",
      "",
      "Request context:",
      `- mode: ${mode}`,
      `- summary: ${issueSummary}`,
      `- platform: ${platform}`,
      `- emulator: ${emulator}`,
      `- web access allowed: ${allowWebAccess ? "yes" : "no"}`,
      `- error: ${errorText}`,
      `- details: ${details}`,
      `- recent chat:\n${chatLines}`,
      "",
      "Return STRICT JSON only with this shape:",
      "{",
      '  "lookups": ["platform_config"],',
      '  "searchTerms": ["duckstation", "psx"],',
      '  "followUpQuestions": ["optional follow-up"],',
      '  "reason": "short reason"',
      "}"
    ].join("\n");
  }

  function formatSupportLookupPlanForPrompt(plan = {}) {
    const normalized = normalizeSupportLookupPlan(plan, {});
    const lookupsText = normalized.lookups.length ? normalized.lookups.join(", ") : "none";
    const termsText = normalized.searchTerms.length ? normalized.searchTerms.join(", ") : "none";
    return `lookups=${lookupsText}; searchTerms=${termsText}; reason=${normalizeText(normalized.reason, "n/a")}`;
  }

  function limitList(values = [], max = 8) {
    return (Array.isArray(values) ? values : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .slice(0, Math.max(1, Number(max) || 1));
  }

  function summarizeLinuxInstallerHints(emulator = {}) {
    const linux = emulator?.installers?.linux;
    if (!linux || typeof linux !== "object") return "";
    const hints = [];
    const flatpakId = normalizeText(linux?.flatpak?.id);
    if (flatpakId) hints.push(`flatpak:${flatpakId}`);
    const aptPackages = limitList(linux?.apt?.packages, 3);
    if (aptPackages.length) hints.push(`apt:${aptPackages.join(", ")}`);
    return hints.join(" | ");
  }

  function collectLauncherIntegrationSummary(platformConfigs = []) {
    const out = [];
    (Array.isArray(platformConfigs) ? platformConfigs : []).forEach((cfg) => {
      const shortName = normalizeSupportPlatformKey(cfg?.shortName || cfg?.platform || cfg?.name);
      if (shortName !== "pc") return;
      const integrations = cfg?.launcherIntegrations;
      if (!integrations || typeof integrations !== "object") return;
      Object.keys(integrations).forEach((launcherKey) => {
        const row = integrations[launcherKey] || {};
        if (row && typeof row !== "object") return;
        const enabled = row.enabled !== false;
        const discoveryModes = limitList(row.discoveryModes, 4);
        const modeText = discoveryModes.length ? discoveryModes.join(", ") : "filesystem";
        const policy = normalizeText(row.launchPolicy, "launcher-preferred");
        out.push(`${launcherKey}:${enabled ? "on" : "off"} (discovery=${modeText}; launch=${policy})`);
      });
    });
    return out;
  }

  function scorePlatformContext(config, platformNeedle, emulatorNeedle, combinedHaystack) {
    const shortName = normalizeSupportPlatformKey(config?.shortName);
    const displayName = normalizeSupportLookup(config?.name);
    const keyCandidates = [shortName, displayName, normalizeSupportLookup(config?.shortName)].filter(Boolean);
    let score = 0;

    if (platformNeedle) {
      const compactNeedle = platformNeedle.replace(/\s+/g, "");
      keyCandidates.forEach((candidate) => {
        const compactCandidate = candidate.replace(/\s+/g, "");
        if (compactCandidate === compactNeedle) score += 220;
        else if (compactCandidate.includes(compactNeedle) || compactNeedle.includes(compactCandidate)) score += 140;
      });
    }
    if (combinedHaystack) {
      keyCandidates.forEach((candidate) => {
        if (candidate && combinedHaystack.includes(candidate)) score += 30;
      });
    }
    if (emulatorNeedle) {
      const emulators = Array.isArray(config?.emulators) ? config.emulators : [];
      if (emulators.some((emu) => normalizeSupportLookup(emu?.name).includes(emulatorNeedle))) {
        score += 55;
      }
    }
    return score;
  }

  function buildPlatformConfigSupportLines(config) {
    const out = [];
    const shortName = normalizeText(config?.shortName, "unknown");
    out.push(`- Platform config [${shortName}] ${normalizeText(config?.name, shortName)}`);
    const imageTypes = limitList(config?.supportedImageTypes, 8);
    if (imageTypes.length) out.push(`  - supported image types: ${imageTypes.join(", ")}`);
    const archiveTypes = limitList(config?.supportedArchiveTypes, 6);
    if (archiveTypes.length) out.push(`  - supported archives: ${archiveTypes.join(", ")}`);
    const recommended = limitList(config?.recommendedEmulators, 5);
    if (recommended.length) out.push(`  - recommended emulators: ${recommended.join(", ")}`);

    const emulators = Array.isArray(config?.emulators) ? config.emulators : [];
    emulators.slice(0, 4).forEach((emu) => {
      const emuName = normalizeText(emu?.name, "Unknown emulator");
      const biosRequired = emu?.biosRequired ? "yes" : "no";
      const fileTypes = limitList(emu?.supportedFileTypes, 8);
      const launch = toSingleLine(emu?.startParameters, 120);
      const installers = summarizeLinuxInstallerHints(emu);
      const bits = [`bios required: ${biosRequired}`];
      if (fileTypes.length) bits.push(`file types: ${fileTypes.join(", ")}`);
      if (launch) bits.push(`launch: ${launch}`);
      if (installers) bits.push(`linux install: ${installers}`);
      out.push(`  - emulator: ${emuName} (${bits.join(" | ")})`);
    });
    return out;
  }

  function findRelevantInstalledEmulators(payload, platformsMatched = []) {
    const platformSet = new Set(
      (Array.isArray(platformsMatched) ? platformsMatched : [])
        .map((cfg) => normalizeSupportPlatformKey(cfg?.shortName))
        .filter(Boolean)
    );
    const emulatorNeedle = normalizeSupportLookup(payload?.emulator).replace(/\s+/g, "");
    const combinedHaystack = normalizeSupportLookup(
      `${payload?.issueSummary || ""} ${payload?.errorText || ""} ${payload?.details || ""} ${payload?.emulator || ""}`
    );
    const emulators = Array.isArray(getEmulatorsState()) ? getEmulatorsState() : [];
    const ranked = [];

    emulators.forEach((emu) => {
      const name = normalizeText(emu?.name);
      const filePath = normalizeText(emu?.filePath);
      if (!name || !filePath) return;
      const platformShortName = normalizeSupportPlatformKey(emu?.platformShortName || emu?.platform);
      const nameLookupCompact = normalizeSupportLookup(name).replace(/\s+/g, "");
      let score = 0;
      if (platformShortName && platformSet.has(platformShortName)) score += 80;
      if (emulatorNeedle && nameLookupCompact === emulatorNeedle) score += 240;
      else if (emulatorNeedle && nameLookupCompact.includes(emulatorNeedle)) score += 170;
      if (combinedHaystack && normalizeSupportLookup(name) && combinedHaystack.includes(normalizeSupportLookup(name))) score += 90;
      if (score <= 0) return;
      ranked.push({
        score,
        row: {
          name,
          platformShortName,
          filePath
        }
      });
    });

    return ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.row);
  }

  function findRelevantGamesFromDb(payload, platformsMatched = []) {
    const platformSet = new Set(
      (Array.isArray(platformsMatched) ? platformsMatched : [])
        .map((cfg) => normalizeSupportPlatformKey(cfg?.shortName))
        .filter(Boolean)
    );
    const combinedHaystackRaw = `${payload?.issueSummary || ""} ${payload?.errorText || ""} ${payload?.details || ""}`;
    const combinedHaystack = normalizeSupportLookup(combinedHaystackRaw);
    const compactHaystack = combinedHaystack.replace(/\s+/g, "");
    const rows = Array.isArray(getGamesState()) ? getGamesState() : [];
    const ranked = [];

    rows.forEach((game) => {
      const name = normalizeText(game?.name);
      const filePath = normalizeText(game?.filePath);
      if (!name) return;
      const platformShortName = normalizeSupportPlatformKey(game?.platformShortName || game?.platform);
      const gameCode = normalizeText(game?.code || game?.productCode || game?.serial || game?.gameCode).toUpperCase();
      const fileName = normalizeText(path.basename(filePath));
      let score = 0;
      if (platformShortName && platformSet.has(platformShortName)) score += 25;

      const nameLookup = normalizeSupportLookup(name);
      if (nameLookup.length >= 6 && combinedHaystack.includes(nameLookup)) score += 150;
      else if (nameLookup.length >= 4) {
        const tokens = nameLookup.split(" ").filter((token) => token.length >= 4).slice(0, 6);
        const tokenHits = tokens.filter((token) => combinedHaystack.includes(token)).length;
        if (tokenHits >= 2) score += 70;
      }

      if (gameCode) {
        const compactCode = gameCode.replace(/[^A-Z0-9]/g, "");
        if (compactCode && compactHaystack.includes(compactCode.toLowerCase())) score += 170;
      }
      if (fileName) {
        const fileLookup = normalizeSupportLookup(fileName);
        if (fileLookup.length >= 6 && combinedHaystack.includes(fileLookup)) score += 85;
      }
      if (score <= 0) return;
      ranked.push({
        score,
        row: {
          name,
          platformShortName: platformShortName || normalizeText(game?.platformShortName || game?.platform),
          code: gameCode,
          filePath
        }
      });
    });

    return ranked
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((entry) => entry.row);
  }

  function buildSupportHelpSearchQuery(payload = {}, plan = {}) {
    const explicitTerms = (Array.isArray(plan?.searchTerms) ? plan.searchTerms : [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean);
    if (explicitTerms.length) return explicitTerms.join(" ");
    return normalizeText(
      `${payload?.issueSummary || ""} ${payload?.details || ""} ${payload?.errorText || ""} ${payload?.platform || ""} ${payload?.emulator || ""}`,
      "emubro help"
    );
  }

  async function findRelevantHelpDocs(payload = {}, plan = {}) {
    const query = buildSupportHelpSearchQuery(payload, plan);
    const rows = await searchHelpDocs(query, { limit: 6 });
    return (Array.isArray(rows) ? rows : [])
      .map((entry) => ({
        id: normalizeText(entry?.id),
        title: normalizeText(entry?.title),
        snippet: toSingleLine(entry?.snippet, 220)
      }))
      .filter((entry) => entry.id && entry.title);
  }

  async function buildHelpDocCapabilityLines(query, header) {
    const rows = await searchHelpDocs(query, { limit: 4 });
    const docs = Array.isArray(rows) ? rows : [];
    if (!docs.length) return [];
    const lines = [`- ${header}:`];
    docs.forEach((doc) => {
      const title = normalizeText(doc?.title, normalizeText(doc?.id, "Help"));
      const id = normalizeText(doc?.id);
      const snippet = toSingleLine(doc?.snippet, 200);
      lines.push(`  - ${title}${id ? ` (${id})` : ""}${snippet ? `: ${snippet}` : ""}`);
    });
    return lines;
  }

  async function buildEmuBroCapabilityLines(payload = {}, platformConfigs = [], options = {}) {
    const includeLibrarySummary = options.includeLibrarySummary !== false;
    const includeLauncherSummary = options.includeLauncherSummary !== false;
    const allGames = Array.isArray(getGamesState()) ? getGamesState() : [];
    const allEmulators = Array.isArray(getEmulatorsState()) ? getEmulatorsState() : [];
    const installedGames = allGames.filter((game) => !!game?.isInstalled).length;
    const launcherSummary = collectLauncherIntegrationSummary(platformConfigs);
    const selectedPlatform = normalizeText(payload?.platform, "not specified");
    const selectedEmulator = normalizeText(payload?.emulator, "not specified");

    const lines = [
      "- emuBro app context:",
      `  - support request platform hint: ${selectedPlatform}`,
      `  - support request emulator hint: ${selectedEmulator}`
    ];

    if (includeLibrarySummary) {
      lines.push(`- Local library DB summary: games=${allGames.length}, installedGames=${installedGames}, emulators=${allEmulators.length}`);
    }
    if (includeLauncherSummary && launcherSummary.length) {
      lines.push(`- launcher integrations: ${launcherSummary.join(" | ")}`);
    }

    const docLines = await buildHelpDocCapabilityLines(
      "emubro library tools support settings filters sort import launchers updates",
      "Local help docs for app features"
    );
    lines.push(...docLines);
    return lines;
  }

  async function buildThemeManagerCapabilityLines() {
    const lines = await buildHelpDocCapabilityLines(
      "theme manager themes customize colors fonts logo effects invert",
      "Local help docs for theme manager"
    );
    return lines.length
      ? lines
      : ["- Theme manager capabilities: no matching local help docs found."];
  }

  function extractRepoLookupTokens(payload = {}, plan = {}) {
    const rawParts = [
      ...(Array.isArray(plan?.searchTerms) ? plan.searchTerms : []),
      payload?.issueSummary || "",
      payload?.details || "",
      payload?.errorText || "",
      payload?.platform || "",
      payload?.emulator || ""
    ];
    const joined = normalizeSupportLookup(rawParts.join(" "));
    if (!joined) return [];
    const baseTokens = joined
      .split(" ")
      .map((token) => String(token || "").trim().toLowerCase())
      .filter(Boolean)
      .filter((token) => token.length >= 3)
      .slice(0, 24);
    const deduped = Array.from(new Set(baseTokens));
    return deduped.slice(0, 12);
  }

  async function fetchRepoTreePaths() {
    const now = Date.now();
    if (Array.isArray(supportRepoTreeCache.paths)
      && supportRepoTreeCache.paths.length
      && (now - Number(supportRepoTreeCache.loadedAt || 0)) < EMUBRO_REPO_TREE_TTL_MS) {
      return supportRepoTreeCache.paths;
    }

    if (!payload?.allowWebAccess) {
      const filtered = normalizedLookups.filter((entry) => entry !== "web_search");
      normalizedLookups.length = 0;
      normalizedLookups.push(...filtered);
    }
    if (!Array.isArray(supportRepoTreeCache.paths)) {
      supportRepoTreeCache.paths = [];
    }
    if ((now - Number(supportRepoTreeCache.failedAt || 0)) < EMUBRO_REPO_FAIL_RETRY_MS) {
      return supportRepoTreeCache.paths;
    }
    if (typeof fetch !== "function") {
      supportRepoTreeCache.failedAt = now;
      return supportRepoTreeCache.paths;
    }

    try {
      const response = await fetch(EMUBRO_REPO_TREE_URL, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "accept": "application/vnd.github+json",
          "user-agent": "emuBro-support"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const payload = await response.json();
      const treeRows = Array.isArray(payload?.tree) ? payload.tree : [];
      const paths = treeRows
        .filter((row) => String(row?.type || "").trim().toLowerCase() === "blob")
        .map((row) => String(row?.path || "").trim())
        .filter(Boolean)
        .filter((entry) => {
          const ext = String(path.extname(entry || "") || "").toLowerCase();
          if (!ext) return entry.toLowerCase() === "readme.md";
          return EMUBRO_REPO_ALLOWED_EXT.has(ext);
        });
      supportRepoTreeCache = {
        paths,
        loadedAt: now,
        failedAt: 0
      };
      return paths;
    } catch (error) {
      supportRepoTreeCache.failedAt = now;
      log.warn("support repo tree fetch failed:", error?.message || error);
      return supportRepoTreeCache.paths;
    }
  }

  function pickRepoPaths(tokens = [], repoPaths = []) {
    const tokenList = Array.isArray(tokens) ? tokens : [];
    const paths = Array.isArray(repoPaths) ? repoPaths : [];
    if (!paths.length) return [];

    const rank = [];
    const lowerTokens = tokenList.map((token) => String(token || "").toLowerCase());
    paths.forEach((repoPath) => {
      const filePath = String(repoPath || "").trim();
      if (!filePath) return;
      const fileLookup = normalizeSupportLookup(filePath);
      let score = 0;
      lowerTokens.forEach((token) => {
        if (!token) return;
        if (fileLookup.includes(token)) score += 24;
      });
      if (filePath.toLowerCase() === "readme.md") score += 6;
      if (EMUBRO_REPO_PRIORITY_PATHS.includes(filePath)) score += 12;
      if (/\bsupport\b/.test(fileLookup)) score += 7;
      if (/\btheme\b/.test(fileLookup)) score += 5;
      if (/\bcommunity\b/.test(fileLookup)) score += 4;
      rank.push({ score, filePath });
    });

    const selected = rank
      .sort((a, b) => b.score - a.score)
      .slice(0, EMUBRO_REPO_MAX_FILES)
      .map((entry) => entry.filePath)
      .filter(Boolean);

    if (selected.length) return selected;
    return EMUBRO_REPO_PRIORITY_PATHS.filter((entry) => paths.includes(entry)).slice(0, EMUBRO_REPO_MAX_FILES);
  }

  async function fetchRepoFileText(repoPath) {
    const safePath = String(repoPath || "").trim().replace(/^\/+/, "");
    if (!safePath) return "";
    const cacheEntry = supportRepoFileCache.get(safePath);
    const now = Date.now();
    if (cacheEntry && (now - Number(cacheEntry.at || 0)) < EMUBRO_REPO_FILE_TTL_MS) {
      return String(cacheEntry.text || "");
    }
    if (typeof fetch !== "function") return "";

    const targetUrl = `${EMUBRO_REPO_RAW_BASE}/${safePath}`;
    try {
      const response = await fetch(targetUrl, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "user-agent": "emuBro-support"
        }
      });
      if (!response.ok) return "";
      const text = String(await response.text() || "");
      const trimmed = text.length > EMUBRO_REPO_FILE_MAX_CHARS
        ? text.slice(0, EMUBRO_REPO_FILE_MAX_CHARS)
        : text;
      supportRepoFileCache.set(safePath, { text: trimmed, at: now });
      return trimmed;
    } catch (_error) {
      return "";
    }
  }

  function buildRepoSnippet(text = "", tokens = []) {
    const source = String(text || "");
    if (!source.trim()) return "";
    const lines = source.split(/\r?\n/);
    const lowerTokens = Array.isArray(tokens)
      ? tokens.map((entry) => String(entry || "").trim().toLowerCase()).filter(Boolean)
      : [];
    const hitIndexes = [];
    lines.forEach((line, index) => {
      if (hitIndexes.length >= 3) return;
      const lookup = String(line || "").toLowerCase();
      if (!lookup.trim()) return;
      if (lowerTokens.length > 0 && !lowerTokens.some((token) => lookup.includes(token))) return;
      hitIndexes.push(index);
    });

    const snippets = [];
    if (hitIndexes.length > 0) {
      hitIndexes.forEach((hitIndex) => {
        const from = Math.max(0, hitIndex - 1);
        const to = Math.min(lines.length - 1, hitIndex + 1);
        for (let cursor = from; cursor <= to; cursor += 1) {
          const row = String(lines[cursor] || "").trim();
          if (!row) continue;
          snippets.push(row);
        }
      });
    } else {
      lines.slice(0, 14).forEach((line) => {
        const row = String(line || "").trim();
        if (!row) return;
        snippets.push(row);
      });
    }

    const merged = snippets.join(" ").replace(/\s+/g, " ").trim();
    if (!merged) return "";
    return merged.length > EMUBRO_REPO_SNIPPET_MAX_CHARS
      ? `${merged.slice(0, EMUBRO_REPO_SNIPPET_MAX_CHARS - 3)}...`
      : merged;
  }

  async function buildRepoCodeCapabilityLines(payload = {}, plan = {}) {
    const repoPaths = await fetchRepoTreePaths();
    if (!Array.isArray(repoPaths) || !repoPaths.length) {
      return {
        lines: ["- emuBro GitHub code context: unavailable (offline or API unavailable)."],
        matchedPaths: []
      };
    }

    const tokens = extractRepoLookupTokens(payload, plan);
    const selectedPaths = pickRepoPaths(tokens, repoPaths);
    if (!selectedPaths.length) {
      return {
        lines: ["- emuBro GitHub code context: no matching files for current query."],
        matchedPaths: []
      };
    }

    const lines = [
      `- emuBro GitHub code context (${EMUBRO_REPO_OWNER}/${EMUBRO_REPO_NAME}@${EMUBRO_REPO_BRANCH}): [${EMUBRO_REPO_BROWSE_URL}]`
    ];
    const matchedPaths = [];
    for (const repoPath of selectedPaths) {
      const fileText = await fetchRepoFileText(repoPath);
      if (!fileText) continue;
      const snippet = buildRepoSnippet(fileText, tokens);
      const rawUrl = `${EMUBRO_REPO_RAW_BASE}/${repoPath}`;
      lines.push(`  - ${repoPath}: ${snippet || "Content fetched (no direct keyword hit)."} [${rawUrl}]`);
      matchedPaths.push(repoPath);
    }

    if (!matchedPaths.length) {
      return {
        lines: ["- emuBro GitHub code context: file fetch failed for selected matches."],
        matchedPaths: []
      };
    }
    return { lines, matchedPaths };
  }

  function decodeWebHtml(value = "") {
    return String(value || "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeDuckDuckGoResultUrl(rawUrl = "") {
    const text = String(rawUrl || "").trim();
    if (!text) return "";
    let candidate = text;
    if (candidate.startsWith("//")) {
      candidate = `https:${candidate}`;
    } else if (candidate.startsWith("/")) {
      candidate = `https://duckduckgo.com${candidate}`;
    }

    try {
      const parsed = new URL(candidate);
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) {
        try {
          return decodeURIComponent(uddg);
        } catch (_error) {
          return uddg;
        }
      }
      return parsed.toString();
    } catch (_error) {
      return candidate;
    }
  }

  function deriveSupportWebQuery(payload = {}, plan = {}) {
    const termList = Array.isArray(plan?.searchTerms) ? plan.searchTerms : [];
    const joinedTerms = termList
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
      .join(" ");
    const fallback = [
      normalizeText(payload?.issueSummary),
      normalizeText(payload?.platform),
      normalizeText(payload?.emulator),
      normalizeText(payload?.errorText)
    ].filter(Boolean).join(" ");
    const raw = normalizeText(joinedTerms || fallback);
    if (!raw) return "";
    return raw.replace(/\s+/g, " ").trim().slice(0, SUPPORT_WEB_SEARCH_QUERY_MAX_LEN);
  }

  function parseDuckDuckGoHtmlResults(html = "") {
    const source = String(html || "");
    if (!source) return [];
    const rows = [];
    const anchorRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorRegex.exec(source)) && rows.length < SUPPORT_WEB_SEARCH_MAX_RESULTS) {
      const href = normalizeDuckDuckGoResultUrl(match[1]);
      const title = decodeWebHtml(match[2]);
      if (!href || !title) continue;
      const chunkStart = Math.max(0, Number(match.index || 0));
      const chunk = source.slice(chunkStart, Math.min(source.length, chunkStart + 1600));
      const snippetMatch = chunk.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
      const snippet = snippetMatch ? decodeWebHtml(snippetMatch[1]) : "";
      rows.push({ title, url: href, snippet });
    }
    return rows;
  }

  async function fetchSupportWebResults(query = "") {
    const normalizedQuery = normalizeText(query).toLowerCase();
    if (!normalizedQuery) return [];
    const cached = supportWebSearchCache.get(normalizedQuery);
    const now = Date.now();
    if (cached && (now - Number(cached.at || 0)) < SUPPORT_WEB_SEARCH_TTL_MS) {
      return Array.isArray(cached.rows) ? cached.rows : [];
    }
    if (typeof fetch !== "function") return [];

    try {
      const targetUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(normalizedQuery)}`;
      const response = await fetch(targetUrl, {
        method: "GET",
        redirect: "follow",
        cache: "no-store",
        headers: {
          "user-agent": "emuBro-support"
        }
      });
      if (!response.ok) return [];
      const html = String(await response.text() || "");
      const rows = parseDuckDuckGoHtmlResults(html);
      supportWebSearchCache.set(normalizedQuery, {
        at: now,
        rows
      });
      return rows;
    } catch (_error) {
      return [];
    }
  }

  async function buildWebSearchCapabilityLines(payload = {}, plan = {}) {
    const query = deriveSupportWebQuery(payload, plan);
    if (!query) {
      return {
        lines: ["- Web search: enabled but no usable query was derived."],
        count: 0,
        query: ""
      };
    }
    const rows = await fetchSupportWebResults(query);
    if (!rows.length) {
      return {
        lines: [`- Web search (${query}): no results or network unavailable.`],
        count: 0,
        query
      };
    }

    const lines = [`- Web search results (${query}):`];
    rows.slice(0, SUPPORT_WEB_SEARCH_MAX_RESULTS).forEach((row) => {
      const snippet = normalizeText(row?.snippet);
      lines.push(`  - ${normalizeText(row?.title, "Result")} - ${snippet || "No snippet."} [${normalizeText(row?.url)}]`);
    });
    return {
      lines,
      count: rows.length,
      query
    };
  }

  let supportPlatformConfigCache = [];
  let supportPlatformConfigCacheAt = 0;
  async function getCachedSupportPlatformConfigs() {
    const now = Date.now();
    if (Array.isArray(supportPlatformConfigCache) && supportPlatformConfigCache.length > 0 && (now - supportPlatformConfigCacheAt) < 45000) {
      return supportPlatformConfigCache;
    }
    try {
      const rows = await getPlatformConfigs();
      supportPlatformConfigCache = Array.isArray(rows) ? rows : [];
      supportPlatformConfigCacheAt = now;
      return supportPlatformConfigCache;
    } catch (_error) {
      return Array.isArray(supportPlatformConfigCache) ? supportPlatformConfigCache : [];
    }
  }

  async function buildSupportGroundingContext(payload = {}, retrievalPlan = {}) {
    const platformConfigs = await getCachedSupportPlatformConfigs();
    const plan = normalizeSupportLookupPlan(retrievalPlan, payload);
    const lookupSet = new Set(Array.isArray(plan.lookups) ? plan.lookups : []);

    const platformNeedle = normalizeSupportLookup(payload?.platform).replace(/\s+/g, "");
    const emulatorNeedle = normalizeSupportLookup(payload?.emulator).replace(/\s+/g, "");
    const combinedHaystack = normalizeSupportLookup(
      `${payload?.issueSummary || ""} ${payload?.errorText || ""} ${payload?.details || ""} ${payload?.platform || ""} ${payload?.emulator || ""}`
    );

    const needPlatformRanking =
      lookupSet.has("platform_config")
      || lookupSet.has("emulator_install_paths")
      || lookupSet.has("game_library_matches")
      || lookupSet.has("launcher_integrations");
    const rankedPlatforms = needPlatformRanking
      ? (Array.isArray(platformConfigs) ? platformConfigs : [])
        .map((cfg) => ({ score: scorePlatformContext(cfg, platformNeedle, emulatorNeedle, combinedHaystack), cfg }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((entry) => entry.cfg)
      : [];

    const installedEmulators = lookupSet.has("emulator_install_paths")
      ? findRelevantInstalledEmulators(payload, rankedPlatforms)
      : [];
    const matchedGames = lookupSet.has("game_library_matches")
      ? findRelevantGamesFromDb(payload, rankedPlatforms)
      : [];
    const matchedHelpDocs = lookupSet.has("help_docs")
      ? await findRelevantHelpDocs(payload, plan)
      : [];
    const repoCodeContext = lookupSet.has("emubro_repo_code")
      ? await buildRepoCodeCapabilityLines(payload, plan)
      : { lines: [], matchedPaths: [] };
    const localSignalCount = Number(rankedPlatforms.length || 0)
      + Number(installedEmulators.length || 0)
      + Number(matchedGames.length || 0)
      + Number(matchedHelpDocs.length || 0)
      + Number(Array.isArray(repoCodeContext.matchedPaths) ? repoCodeContext.matchedPaths.length : 0);
    const webLookupReason = (
      payload?.allowWebAccess && lookupSet.has("web_search")
    ) ? "planned" : (
      payload?.allowWebAccess && localSignalCount === 0
    ) ? "auto-if-unsure" : "disabled";
    const webSearchContext = webLookupReason !== "disabled"
      ? await buildWebSearchCapabilityLines(payload, plan)
      : { lines: [], count: 0, query: "" };

    const lines = [];
    lines.push(`- Retrieval plan: ${formatSupportLookupPlanForPrompt(plan)}`);

    if (lookupSet.has("tools_features") || lookupSet.has("library_summary") || lookupSet.has("launcher_integrations")) {
      lines.push(...(await buildEmuBroCapabilityLines(payload, platformConfigs, {
        includeLibrarySummary: lookupSet.has("library_summary"),
        includeLauncherSummary: lookupSet.has("launcher_integrations")
      })));
    }

    if (lookupSet.has("theme_manager_features")) {
      lines.push(...(await buildThemeManagerCapabilityLines()));
    }

    if (lookupSet.has("platform_config")) {
      if (rankedPlatforms.length) {
        rankedPlatforms.forEach((cfg) => {
          lines.push(...buildPlatformConfigSupportLines(cfg));
        });
      } else {
        lines.push("- Platform config: no clear platform match from local configs.");
      }
    }

    if (lookupSet.has("emulator_install_paths")) {
      if (installedEmulators.length) {
        lines.push("- Installed emulators from local DB:");
        installedEmulators.forEach((emu) => {
          lines.push(`  - ${emu.name} [${emu.platformShortName || "unknown"}] path: ${emu.filePath}`);
        });
      } else {
        lines.push("- Installed emulators from local DB: no strong match.");
      }
    }

    if (lookupSet.has("game_library_matches")) {
      if (matchedGames.length) {
        lines.push("- Related games from local DB:");
        matchedGames.forEach((game) => {
          const codeInfo = game.code ? ` code: ${game.code};` : "";
          lines.push(`  - ${game.name} [${game.platformShortName || "unknown"}];${codeInfo} path: ${game.filePath || "unknown"}`);
        });
      } else {
        lines.push("- Related games from local DB: no clear match.");
      }
    }

    if (lookupSet.has("help_docs")) {
      if (matchedHelpDocs.length) {
        lines.push("- Help docs from local resources:");
        matchedHelpDocs.forEach((doc) => {
          lines.push(`  - ${doc.title} (${doc.id}): ${doc.snippet || "No preview available."}`);
        });
      } else {
        lines.push("- Help docs from local resources: no clear match.");
      }
    }

    if (lookupSet.has("emubro_repo_code")) {
      lines.push(...(Array.isArray(repoCodeContext.lines) ? repoCodeContext.lines : []));
    }

    if (webLookupReason === "auto-if-unsure") {
      lines.push("- Web lookup auto-triggered because local grounding was uncertain.");
    }
    if (webLookupReason !== "disabled") {
      lines.push(...(Array.isArray(webSearchContext.lines) ? webSearchContext.lines : []));
    }

    if (plan.followUpQuestions.length) {
      lines.push("- Planner follow-up questions:");
      plan.followUpQuestions.forEach((question) => {
        lines.push(`  - ${question}`);
      });
    }

    const text = lines.join("\n");
    const maxLen = 9800;
    return {
      text: text.length > maxLen ? `${text.slice(0, maxLen - 3)}...` : text,
      meta: {
        plan,
        matchedPlatforms: rankedPlatforms.map((cfg) => normalizeText(cfg?.shortName || cfg?.name)),
        installedEmulatorCount: installedEmulators.length,
        matchedGameCount: matchedGames.length,
        matchedHelpDocCount: matchedHelpDocs.length,
        matchedRepoFileCount: Array.isArray(repoCodeContext.matchedPaths) ? repoCodeContext.matchedPaths.length : 0,
        matchedWebSourceCount: Number(webSearchContext.count || 0),
        webLookupTriggered: webLookupReason !== "disabled",
        webLookupReason,
        webLookupQuery: normalizeText(webSearchContext.query),
        libraryGameCount: Array.isArray(getGamesState()) ? getGamesState().length : 0,
        libraryEmulatorCount: Array.isArray(getEmulatorsState()) ? getEmulatorsState().length : 0
      }
    };
  }

  const supportPrompts = createSupportPrompts({
    normalizeText,
    normalizeSupportMode,
    normalizeSupportChatHistory,
    formatSupportLookupPlanForPrompt
  });

  function buildSupportPrompt(payload = {}) {
    return supportPrompts.buildSupportPrompt(payload);
  }

  function normalizeSupportActionPlan(plan = {}) {
    if (supportIntentsService && typeof supportIntentsService.normalizeActionPlan === "function") {
      return supportIntentsService.normalizeActionPlan(plan);
    }
    return {
      command: "none",
      target: "none",
      intent: "none",
      gameQuery: "",
      emulatorQuery: "",
      platformHint: "",
      installMethod: "",
      osHint: "",
      queryText: "",
      confidence: 0,
      reason: ""
    };
  }

  function buildSupportActionPlannerPrompt(payload = {}) {
    const chatLines = (Array.isArray(payload?.chatHistory) ? payload.chatHistory : [])
      .slice(-8)
      .map((entry) => `${entry.role || "user"}: ${toSingleLine(entry.text, 260)}`)
      .join("\n");
    return [
      "Analyze the user message and decide whether to trigger a direct app action.",
      "The message can be in any language.",
      "",
      "Supported direct actions:",
      "- command=run, target=game: user asks to run/launch/start/open/play a specific game",
      "- command=get, target=game-count: user asks game count (global or by title/topic)",
      "- command=download, target=emulator: user asks to download an emulator package",
      "- command=install, target=emulator: user asks to install an emulator (package manager or download installer)",
      "- command=none: anything else",
      "",
      "Return STRICT JSON only with this schema:",
      "{",
      '  "command": "none|run|get|download|install",',
      '  "target": "none|game|game-count|emulator",',
      '  "args": {',
      '    "game": "game name for run command",',
      '    "query": "topic/title for count command (example: spyro)",',
      '    "emulator": "emulator name for download/install command",',
      '    "platform": "optional platform/system hint",',
      '    "method": "optional install method: download|flatpak|apt",',
      '    "os": "optional os hint if user specified one"',
      "  },",
      '  "confidence": 0.0,',
      '  "reason": "very short reason"',
      "}",
      "",
      "Rules:",
      "- Extract game/platform names even if user writes them casually.",
      "- Do not ask questions, only classify intent and fields.",
      "- If user asks total count, keep args.query empty.",
      "- For install/download emulator requests, fill args.emulator when possible.",
      "- If unclear, set command to \"none\" with low confidence.",
      "",
      "Request context:",
      `- summary: ${normalizeText(payload?.issueSummary)}`,
      `- details: ${normalizeText(payload?.details)}`,
      `- os platform: ${normalizeText(payload?.osPlatform)}`,
      `- platform: ${normalizeText(payload?.platform)}`,
      `- emulator: ${normalizeText(payload?.emulator)}`,
      `- recent chat:\n${chatLines || "none"}`
    ].join("\n");
  }

  async function planSupportAction(payload = {}) {
    const fallback = normalizeSupportActionPlan({});
    const plannerPrompt = buildSupportActionPlannerPrompt(payload);
    const promptChars = Number(String(plannerPrompt || "").length || 0);
    try {
      const plannerText = await requestSupportProviderText(payload, {
        prompt: plannerPrompt,
        systemPrompt: "You are an intent classifier for app actions. Return JSON only.",
        temperature: 0
      });
      const parsed = extractJsonObjectFromText(plannerText);
      if (!parsed) {
        return {
          plan: fallback,
          source: "action-json-parse-fallback",
          raw: normalizeText(plannerText).slice(0, 1200),
          promptChars,
          promptPreview: String(plannerPrompt || "").slice(0, 1200)
        };
      }
      return {
        plan: normalizeSupportActionPlan(parsed),
        source: "llm-action-planner",
        raw: normalizeText(plannerText).slice(0, 1200),
        promptChars,
        promptPreview: String(plannerPrompt || "").slice(0, 1200)
      };
    } catch (_error) {
      return {
        plan: fallback,
        source: "action-exception-fallback",
        raw: "",
        promptChars,
        promptPreview: String(plannerPrompt || "").slice(0, 1200)
      };
    }
  }

  function shouldFetchSpecsBeforeAction(payload = {}) {
    if (!payload?.allowAutoSpecsFetch) return false;
    const hay = normalizeSupportLookup(`${payload?.issueSummary || ""} ${payload?.details || ""} ${payload?.errorText || ""}`);
    if (!hay) return false;
    return /\b(download|install|emulator|flatpak|apt|package manager|linux|windows|mac|os)\b/.test(hay);
  }

  async function planSupportRetrieval(payload = {}) {
    const fallback = normalizeSupportLookupPlan({}, payload);
    const plannerPrompt = buildSupportPlannerPrompt(payload);
    const promptChars = Number(String(plannerPrompt || "").length || 0);
    try {
      const plannerText = await requestSupportProviderText(payload, {
        prompt: plannerPrompt,
        systemPrompt: "You are a retrieval planner. Return JSON only. Do not answer the user directly.",
        temperature: 0.1
      });
      const parsed = extractJsonObjectFromText(plannerText);
      if (!parsed) {
        return {
          plan: fallback,
          source: "heuristic-json-parse-fallback",
          raw: normalizeText(plannerText).slice(0, 1200),
          promptChars,
          promptPreview: String(plannerPrompt || "").slice(0, 1200)
        };
      }
      return {
        plan: normalizeSupportLookupPlan(parsed, payload),
        source: "llm-planner",
        raw: normalizeText(plannerText).slice(0, 1200),
        promptChars,
        promptPreview: String(plannerPrompt || "").slice(0, 1200)
      };
    } catch (_error) {
      return {
        plan: fallback,
        source: "heuristic-exception-fallback",
        raw: "",
        promptChars,
        promptPreview: String(plannerPrompt || "").slice(0, 1200)
      };
    }
  }

  async function handleSupportRequest(payload = {}) {
    const provider = normalizeProvider(payload.provider);
    const safePayload = {
      ...payload,
      provider,
      supportMode: normalizeSupportMode(payload.supportMode),
      chatHistory: normalizeSupportChatHistory(payload.chatHistory, 20),
      debugSupport: !!payload.debugSupport,
      allowAutoSpecsFetch: !!payload.allowAutoSpecsFetch,
      allowWebAccess: !!payload.allowWebAccess,
      issueType: normalizeText(payload.issueType, "other"),
      issueTypeLabel: normalizeText(payload.issueTypeLabel, "Emulation issue"),
      issueSummary: normalizeText(payload.issueSummary),
      osPlatform: (osRef && typeof osRef.platform === "function") ? normalizeText(osRef.platform()) : "",
      platform: normalizeText(payload.platform),
      emulator: normalizeText(payload.emulator),
      errorText: normalizeText(payload.errorText),
      details: normalizeText(payload.details),
      autoSpecsText: "",
      retrievalPlan: normalizeSupportLookupPlan(payload?.retrievalPlan, payload),
      retrievalPlannerSource: "client",
      retrievalPlannerRaw: "",
      groundingContext: "",
      groundingMeta: {
        plan: normalizeSupportLookupPlan(payload?.retrievalPlan, payload),
        matchedPlatforms: [],
        installedEmulatorCount: 0,
        matchedGameCount: 0,
        matchedRepoFileCount: 0,
        matchedWebSourceCount: 0,
        webLookupTriggered: false,
        webLookupReason: "disabled",
        webLookupQuery: ""
      },
      actionPlan: normalizeSupportActionPlan(payload?.actionPlan),
      actionPlannerSource: "client",
      actionPlannerRaw: ""
    };
    const debugSteps = [];
    const pushDebugStep = (step, status, meta = {}) => {
      if (!safePayload.debugSupport) return;
      debugSteps.push({
        step: normalizeText(step, "step"),
        status: normalizeText(status, "ok"),
        ...meta
      });
    };

    if (!safePayload.issueSummary) {
      return {
        success: false,
        provider,
        message: safePayload.supportMode === "chat" ? "Message is required." : "Issue summary is required.",
        answer: ""
      };
    }

    try {
      pushDebugStep("normalize-request", "ok", {
        provider,
        supportMode: safePayload.supportMode,
        allowAutoSpecsFetch: !!safePayload.allowAutoSpecsFetch,
        allowWebAccess: !!safePayload.allowWebAccess
      });

      if (shouldFetchSpecsBeforeAction(safePayload)) {
        const specs = supportSystemSpecsService.getSystemSpecs();
        const specText = normalizeText(specs?.text);
        if (specText) {
          safePayload.autoSpecsText = specText;
          safePayload.details = `${safePayload.details ? `${safePayload.details}\n\n` : ""}[Auto-detected PC Specs]\n${specText}`;
          pushDebugStep("auto-specs-before-action", "included", {
            chars: Number(specText.length || 0)
          });
        }
      } else {
        pushDebugStep("auto-specs-before-action", "skipped");
      }

      const actionPlanResult = await planSupportAction(safePayload);
      safePayload.actionPlan = normalizeSupportActionPlan(actionPlanResult?.plan);
      safePayload.actionPlannerSource = normalizeText(actionPlanResult?.source, "unknown");
      safePayload.actionPlannerRaw = normalizeText(actionPlanResult?.raw);
      pushDebugStep("action-planner", "completed", {
        source: safePayload.actionPlannerSource,
        promptChars: Number(actionPlanResult?.promptChars || 0),
        promptPreview: normalizeText(actionPlanResult?.promptPreview).slice(0, 1200),
        raw: safePayload.actionPlannerRaw,
        actionPlan: safePayload.actionPlan
      });

      const isDirectAction = safePayload.actionPlan.intent !== "none" && safePayload.actionPlan.confidence >= 0.45;
      pushDebugStep("action-decision", isDirectAction ? "direct-action" : "no-direct-action", {
        intent: safePayload.actionPlan.intent,
        confidence: Number(safePayload.actionPlan.confidence || 0)
      });
      if (isDirectAction) {
        const directIntent = await supportIntentsService.handlePlannedIntent(safePayload, safePayload.actionPlan);
        pushDebugStep("direct-action-execution", directIntent?.handled ? "handled" : "not-handled", {
          actionStatus: directIntent?.action?.status || "",
          actionType: directIntent?.action?.type || ""
        });
        if (directIntent?.handled) {
          return {
            success: true,
            provider,
            supportMode: safePayload.supportMode,
            answer: normalizeText(directIntent.answer, "Done."),
            action: directIntent.action || null,
            grounding: safePayload.groundingMeta,
            debug: safePayload.debugSupport ? {
              plannerSource: "direct-intent",
              retrievalPlan: safePayload.retrievalPlan,
              groundingMeta: safePayload.groundingMeta,
              groundingContextPreview: "",
              plannerRaw: "",
              promptChars: 0,
              actionPlan: safePayload.actionPlan,
              actionPlannerSource: safePayload.actionPlannerSource,
              actionPlannerRaw: safePayload.actionPlannerRaw,
              steps: debugSteps
            } : undefined
          };
        }
      }

      if (!safePayload.autoSpecsText && supportSystemSpecsService.shouldFetchSpecs(safePayload)) {
        const specs = supportSystemSpecsService.getSystemSpecs();
        const specText = normalizeText(specs?.text);
        if (specText) {
          safePayload.autoSpecsText = specText;
          safePayload.details = `${safePayload.details ? `${safePayload.details}\n\n` : ""}[Auto-detected PC Specs]\n${specText}`;
          pushDebugStep("auto-specs-support", "included", {
            chars: Number(specText.length || 0)
          });
        }
      } else if (!safePayload.autoSpecsText) {
        pushDebugStep("auto-specs-support", "skipped");
      }

      try {
        const plannerResult = await planSupportRetrieval(safePayload);
        safePayload.retrievalPlan = normalizeSupportLookupPlan(plannerResult?.plan, safePayload);
        safePayload.retrievalPlannerSource = normalizeText(plannerResult?.source, "unknown");
        safePayload.retrievalPlannerRaw = normalizeText(plannerResult?.raw);
        pushDebugStep("retrieval-planner", "completed", {
          source: safePayload.retrievalPlannerSource,
          promptChars: Number(plannerResult?.promptChars || 0),
          promptPreview: normalizeText(plannerResult?.promptPreview).slice(0, 1200),
          raw: safePayload.retrievalPlannerRaw,
          retrievalPlan: safePayload.retrievalPlan
        });
        const grounding = await buildSupportGroundingContext(safePayload, safePayload.retrievalPlan);
        safePayload.groundingContext = normalizeText(grounding?.text);
        safePayload.groundingMeta = grounding?.meta && typeof grounding.meta === "object"
          ? grounding.meta
          : safePayload.groundingMeta;
        pushDebugStep("grounding-build", "completed", {
          matchedGameCount: Number(safePayload.groundingMeta?.matchedGameCount || 0),
          installedEmulatorCount: Number(safePayload.groundingMeta?.installedEmulatorCount || 0),
          matchedHelpDocCount: Number(safePayload.groundingMeta?.matchedHelpDocCount || 0),
          matchedWebSourceCount: Number(safePayload.groundingMeta?.matchedWebSourceCount || 0),
          webLookupTriggered: !!safePayload.groundingMeta?.webLookupTriggered
        });
      } catch (groundingError) {
        log.warn("support grounding context failed:", groundingError?.message || groundingError);
        pushDebugStep("grounding-build", "failed", {
          error: normalizeText(groundingError?.message || groundingError)
        });
      }

      const promptText = buildSupportPrompt(safePayload);
      pushDebugStep("final-answer-prompt", "prepared", {
        promptChars: Number(String(promptText || "").length || 0)
      });
      const answer = await requestSupportProviderText(safePayload, { prompt: promptText });
      const normalizedAnswer = normalizeText(answer);
      pushDebugStep("final-answer-provider", normalizedAnswer ? "completed" : "empty", {
        answerChars: Number(String(normalizedAnswer || "").length || 0)
      });
      if (!normalizedAnswer) {
        return {
          success: false,
          provider,
          message: "Provider returned an empty response.",
          answer: "",
          debug: safePayload.debugSupport ? {
            plannerSource: safePayload.retrievalPlannerSource,
            retrievalPlan: safePayload.retrievalPlan,
            groundingMeta: safePayload.groundingMeta,
            groundingContextPreview: String(safePayload.groundingContext || "").slice(0, 3200),
            plannerRaw: safePayload.retrievalPlannerRaw,
            promptChars: Number(String(promptText || "").length || 0),
            autoSpecsIncluded: !!safePayload.autoSpecsText,
            actionPlan: safePayload.actionPlan,
            actionPlannerSource: safePayload.actionPlannerSource,
            actionPlannerRaw: safePayload.actionPlannerRaw,
            steps: debugSteps
          } : undefined
        };
      }

      return {
        success: true,
        provider,
        supportMode: safePayload.supportMode,
        answer: normalizedAnswer,
        grounding: safePayload.groundingMeta,
        debug: safePayload.debugSupport ? {
          plannerSource: safePayload.retrievalPlannerSource,
          retrievalPlan: safePayload.retrievalPlan,
          groundingMeta: safePayload.groundingMeta,
          groundingContextPreview: String(safePayload.groundingContext || "").slice(0, 3200),
          plannerRaw: safePayload.retrievalPlannerRaw,
          promptChars: Number(String(promptText || "").length || 0),
          autoSpecsIncluded: !!safePayload.autoSpecsText,
          actionPlan: safePayload.actionPlan,
          actionPlannerSource: safePayload.actionPlannerSource,
          actionPlannerRaw: safePayload.actionPlannerRaw,
          steps: debugSteps
        } : undefined
      };
    } catch (error) {
      pushDebugStep("support-request", "failed", {
        error: normalizeText(error?.message || error)
      });
      return {
        success: false,
        provider,
        message: error?.message || String(error),
        answer: "",
        debug: safePayload.debugSupport ? {
          plannerSource: safePayload.retrievalPlannerSource,
          retrievalPlan: safePayload.retrievalPlan,
          groundingMeta: safePayload.groundingMeta,
          groundingContextPreview: String(safePayload.groundingContext || "").slice(0, 3200),
          plannerRaw: safePayload.retrievalPlannerRaw,
          autoSpecsIncluded: !!safePayload.autoSpecsText,
          actionPlan: safePayload.actionPlan,
          actionPlannerSource: safePayload.actionPlannerSource,
          actionPlannerRaw: safePayload.actionPlannerRaw,
          steps: debugSteps,
          error: error?.message || String(error)
        } : undefined
      };
    }
  }

  return {
    normalizeSupportMode,
    normalizeSupportChatHistory,
    normalizeSupportLookupPlan,
    buildSupportPrompt,
    handleSupportRequest
  };
}

module.exports = {
  createSupportSuggestionsService
};
