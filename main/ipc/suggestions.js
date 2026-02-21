const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);

function registerSuggestionsIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const log = deps.log || console;
  const fetchImpl = deps.fetchImpl || fetch;

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerSuggestionsIpc requires ipcMain");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("registerSuggestionsIpc requires fetch implementation");
  }

  function normalizeProvider(provider) {
    const value = String(provider || "").trim().toLowerCase();
    if (value === "openai" || value === "gemini") return value;
    return "ollama";
  }

  function normalizeMode(mode) {
    const value = String(mode || "").trim().toLowerCase();
    if (value === "library-only" || value === "library-plus-missing") return value;
    return "library-plus-missing";
  }

  function normalizeText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function decodeHtmlEntities(value) {
    return String(value || "")
      .replace(/</gi, "<")
      .replace(/>/gi, ">")
      .replace(/"/gi, '"')
      .replace(/&#39;|'/gi, "'")
      .replace(/&/gi, "&");
  }

  function replacePromptToken(template, token, value) {
    const safeValue = String(value ?? "");
    const bracePattern = new RegExp(`\\{\\{\\s*${token}\\s*\\}\\}`, "gi");
    const singleBracePattern = new RegExp(`\\{\\s*${token}\\s*\\}`, "gi");
    return String(template || "")
      .replace(bracePattern, safeValue)
      .replace(singleBracePattern, safeValue);
  }

  function normalizeOllamaBaseUrl(baseUrl) {
    return normalizeText(baseUrl, "http://127.0.0.1:11434").replace(/\/+$/g, "");
  }

  function isLocalhostHostname(hostname) {
    const value = String(hostname || "").trim().toLowerCase();
    return value === "localhost" || value === "127.0.0.1" || value === "::1";
  }

  function parseUrlSafe(rawUrl) {
    const text = String(rawUrl || "").trim();
    if (!text) return null;
    try {
      return new URL(text);
    } catch (_error) {
      try {
        return new URL(`http://${text}`);
      } catch (_error2) {
        return null;
      }
    }
  }

  function isLocalOllamaBaseUrl(baseUrl) {
    const parsed = parseUrlSafe(baseUrl);
    if (!parsed) return false;
    return isLocalhostHostname(parsed.hostname);
  }

  function getOllamaHostEnv(baseUrl) {
    const parsed = parseUrlSafe(baseUrl);
    if (!parsed) return "127.0.0.1:11434";
    const host = String(parsed.hostname || "127.0.0.1");
    const port = Number(parsed.port || 0) > 0 ? String(parsed.port) : "11434";
    return `${host}:${port}`;
  }

  function parseOllamaListOutput(stdoutText) {
    const lines = String(stdoutText || "")
      .split(/\r?\n/g)
      .map((line) => String(line || "").trim())
      .filter(Boolean);
    if (!lines.length) return [];

    const out = [];
    for (const line of lines) {
      if (/^name\s+/i.test(line)) continue;
      const parts = line.split(/\s{2,}/g).map((v) => String(v || "").trim()).filter(Boolean);
      if (!parts.length) continue;
      const modelName = parts[0];
      if (!modelName || modelName.toLowerCase() === "name") continue;
      out.push(modelName);
    }
    return out;
  }

  async function listOllamaModels(payload = {}) {
    const baseUrl = normalizeOllamaBaseUrl(payload.baseUrl);
    const endpoints = [
      { url: getOllamaApiEndpoint(baseUrl, "tags"), type: "tags" },
      { url: getOllamaV1Endpoint(baseUrl, "models"), type: "v1" }
    ];
    const errors = [];
    const names = [];

    for (const endpoint of endpoints) {
      try {
        const response = await fetchImpl(endpoint.url, {
          method: "GET",
          headers: {
            "content-type": "application/json"
          }
        });
        if (!response.ok) {
          const text = await response.text();
          errors.push(`${endpoint.url} -> ${response.status}: ${text.slice(0, 140)}`);
          continue;
        }

        const json = await response.json();
        const rows = endpoint.type === "v1"
          ? (Array.isArray(json?.data) ? json.data : [])
          : (Array.isArray(json?.models) ? json.models : []);

        const parsed = rows
          .map((row) => normalizeText(row?.name || row?.model || row?.id))
          .filter(Boolean);

        names.push(...parsed);
      } catch (error) {
        errors.push(`${endpoint.url} -> ${error?.message || String(error)}`);
      }
    }

    if (isLocalOllamaBaseUrl(baseUrl)) {
      try {
        const cliNames = await listOllamaModelsViaCli(baseUrl);
        names.push(...cliNames);
      } catch (error) {
        errors.push(`ollama list -> ${error?.message || String(error)}`);
      }
    }

    if (names.length === 0) {
      throw new Error(`Ollama model list failed. ${errors.join(" | ")}`.trim());
    }

    const seen = new Set();
    const deduped = [];
    names.forEach((name) => {
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(name);
    });

    deduped.sort((a, b) => a.localeCompare(b));
    return {
      baseUrl,
      models: deduped
    };
  }

  async function listOllamaModelsViaCli(baseUrl) {
    const env = {
      ...process.env,
      OLLAMA_HOST: getOllamaHostEnv(baseUrl)
    };
    const result = await execFileAsync("ollama", ["list"], { env, windowsHide: true, maxBuffer: 2 * 1024 * 1024 });
    return parseOllamaListOutput(result?.stdout);
  }

  function getOllamaApiEndpoint(baseUrl, pathPart) {
    const normalizedBase = normalizeOllamaBaseUrl(baseUrl);
    const normalizedPath = String(pathPart || "").replace(/^\/+/, "");
    if (normalizedBase.toLowerCase().endsWith("/api")) {
      return `${normalizedBase}/${normalizedPath}`;
    }
    return `${normalizedBase}/api/${normalizedPath}`;
  }

  function getOllamaV1Endpoint(baseUrl, pathPart) {
    const normalizedBase = normalizeOllamaBaseUrl(baseUrl);
    const normalizedPath = String(pathPart || "").replace(/^\/+/, "");
    if (normalizedBase.toLowerCase().endsWith("/v1")) {
      return `${normalizedBase}/${normalizedPath}`;
    }
    return `${normalizedBase}/v1/${normalizedPath}`;
  }

  function getDefaultPromptTemplate() {
    return [
      "You are emuBro's game recommendation assistant.",
      "Mode: {{mode}}",
      "User mood/preferences: {{query}}",
      "Platform constraint: {{platformConstraint}}",
      "",
      "Return valid JSON only with this exact shape:",
      "{",
      '  "summary": "short explanation",',
      '  "libraryMatches": [',
      '    {"name":"", "platform":"", "reason":""}',
      "  ],",
      '  "missingSuggestions": [',
      '    {"name":"", "platform":"", "reason":""}',
      "  ]",
      "}",
      "",
      "Rules:",
      "- Provide up to {{limit}} items in libraryMatches.",
      '- Provide up to {{limit}} items in missingSuggestions. If mode is "library-only", this array must be empty.',
      '- When mode is "library-plus-missing", provide {{limit}} new games I do not own in missingSuggestions.',
      "- For libraryMatches, prefer exact names from the supplied library list.",
      "- Keep reasons concise (under 20 words).",
      "",
      "Library games JSON:",
      "{{libraryJson}}"
    ].join("\n");
  }

  function normalizeLibraryGames(rows, maxCount = 420) {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      const name = normalizeText(row?.name);
      if (!name) continue;
      const platform = normalizeText(row?.platform || row?.platformShortName);
      const key = `${name.toLowerCase()}::${platform.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        id: Number(row?.id || 0),
        name,
        platform,
        platformShortName: normalizeText(row?.platformShortName),
        genre: normalizeText(row?.genre),
        rating: Number.isFinite(Number(row?.rating)) ? Number(row.rating) : null,
        isInstalled: !!row?.isInstalled,
        lastPlayed: normalizeText(row?.lastPlayed)
      });
      if (out.length >= maxCount) break;
    }
    return out;
  }

  function groupLibraryGamesForPrompt(rows, maxCount = 420) {
    const normalizedRows = normalizeLibraryGames(rows, Math.max(420, maxCount * 4));
    const groups = new Map();

    normalizedRows.forEach((game) => {
      const cleanName = stripBracketedTitleParts(game?.name) || normalizeText(game?.name, "Unknown game");
      const platformShortName = normalizeText(game?.platformShortName || game?.platform).toLowerCase();
      const normalizedNameKey = normalizeNameForMatch(cleanName || game?.name);
      const groupKey = `${normalizedNameKey || "unknown"}::${platformShortName || "unknown"}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          id: Number(game?.id || 0),
          name: cleanName || normalizeText(game?.name, "Unknown game"),
          cleanName: cleanName || normalizeText(game?.name, "Unknown game"),
          platform: normalizeText(game?.platform || game?.platformShortName),
          platformShortName: normalizeText(game?.platformShortName),
          genre: normalizeText(game?.genre),
          rating: Number.isFinite(Number(game?.rating)) ? Number(game.rating) : null,
          isInstalled: !!game?.isInstalled,
          lastPlayed: normalizeText(game?.lastPlayed),
          variants: [],
          gameIds: [],
          duplicateCount: 0
        });
      }

      const group = groups.get(groupKey);
      const gameId = Number(game?.id || 0);
      const variant = normalizeText(game?.name);
      if (variant && !group.variants.some((row) => row.toLowerCase() === variant.toLowerCase())) {
        group.variants.push(variant);
      }
      if (gameId > 0 && !group.gameIds.includes(gameId)) {
        group.gameIds.push(gameId);
      }
      group.duplicateCount += 1;
      if (!group.isInstalled && !!game?.isInstalled) {
        group.isInstalled = true;
      }
      if (!group.platformShortName && game?.platformShortName) {
        group.platformShortName = normalizeText(game.platformShortName);
      }
      if (!group.genre && game?.genre) {
        group.genre = normalizeText(game.genre);
      }
      const gameLastPlayed = normalizeText(game?.lastPlayed);
      if (gameLastPlayed) {
        const nextDate = new Date(gameLastPlayed).getTime();
        const currentDate = new Date(group.lastPlayed || "").getTime();
        if (!group.lastPlayed || (Number.isFinite(nextDate) && nextDate > currentDate)) {
          group.lastPlayed = gameLastPlayed;
        }
      }
    });

    const out = Array.from(groups.values());
    out.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    return out.slice(0, Math.max(1, Number(maxCount) || 420));
  }

  function buildPrompt(payload) {
    const mode = normalizeMode(payload.mode);
    const query = normalizeText(payload.query, "No specific mood provided.");
    const limit = Math.max(3, Math.min(12, Number(payload.limit) || 8));
    const selectedPlatformOnly = !!payload.selectedPlatformOnly;
    const selectedPlatform = normalizeText(payload.selectedPlatform);
    
    let platformConstraint = "";
    if (selectedPlatformOnly && selectedPlatform) {
       platformConstraint = `Only suggest games for platform "${selectedPlatform}".`;
    } else {
       platformConstraint = "Suggest games for platforms supported by emuBro (NES, SNES, N64, GameCube, Wii, Switch, GameBoy, GBA, DS, 3DS, PS1, PS2, PS3, PSP, Genesis, Dreamcast, Saturn, etc.).";
    }
    
    const libraryGames = groupLibraryGamesForPrompt(payload.libraryGames || []);
    const hasLibrary = libraryGames.length > 0;
    const libraryJson = hasLibrary ? JSON.stringify(libraryGames) : "NO LIBRARY CONTEXT PROVIDED. Ignore the library list and use your general knowledge of popular games for the selected platform(s).";
    
    let template = decodeHtmlEntities(normalizeText(payload.promptTemplate, getDefaultPromptTemplate()));
    if (!hasLibrary) {
        template += "\n\nIMPORTANT: I have not provided my library list. Please suggest great games from your internal knowledge that are available on the specified platforms.";
    }
    let prompt = template;
    prompt = replacePromptToken(prompt, "mode", mode);
    prompt = replacePromptToken(prompt, "query", query);
    prompt = replacePromptToken(prompt, "limit", String(limit));
    prompt = replacePromptToken(prompt, "platformConstraint", platformConstraint);
    prompt = replacePromptToken(prompt, "selectedPlatform", selectedPlatform || "Any");
    prompt = replacePromptToken(prompt, "libraryJson", libraryJson);

    // Always append a strict context block
    prompt += `\n\nContext:\n- mode: ${mode}\n- query: ${query}\n- limit: ${limit}\n- platformConstraint: ${platformConstraint}\n- hasLibrary: ${hasLibrary}`;
    
    return prompt;
  }

  function buildRequestPrompt(payload) {
    const directPrompt = normalizeText(payload?.prompt);
    if (directPrompt) return directPrompt;
    return buildPrompt(payload);
  }

  function buildSupportPrompt(payload = {}) {
    const issueTypeLabel = normalizeText(payload.issueTypeLabel, "Emulation issue");
    const issueSummary = normalizeText(payload.issueSummary, "No summary provided.");
    const platform = normalizeText(payload.platform, "Not specified");
    const emulator = normalizeText(payload.emulator, "Not specified");
    const errorText = normalizeText(payload.errorText, "No explicit error message.");
    const details = normalizeText(payload.details, "No additional details.");

    return [
      "You are emuBro's emulation troubleshooting assistant.",
      "Give practical, safe, legal troubleshooting advice for emulator issues.",
      "Do not suggest piracy, cracked BIOS, or illegal downloads.",
      "",
      "Issue context:",
      `- Type: ${issueTypeLabel}`,
      `- Summary: ${issueSummary}`,
      `- Platform: ${platform}`,
      `- Emulator: ${emulator}`,
      `- Error message: ${errorText}`,
      `- Extra details: ${details}`,
      "",
      "Output format rules:",
      "- Keep it concise but actionable.",
      "- Use these exact sections with plain text headings:",
      "  1) Likely Cause",
      "  2) Fix Steps",
      "  3) If Still Broken",
      "- In Fix Steps, provide numbered steps and mention where settings are usually found.",
      "- If information is missing, list short follow-up checks under If Still Broken."
    ].join("\n");
  }

  function normalizeTagCatalogRows(rows) {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      const id = normalizeText(row?.id || row?.key || row?.name).toLowerCase();
      if (!id) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({
        id,
        label: normalizeText(row?.label, id)
      });
    }
    return out;
  }

  function normalizeGamesForTagSuggestions(rows, maxCount = 240) {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      const id = Number(row?.id || 0);
      const name = normalizeText(row?.name);
      if (!id && !name) continue;
      const key = id > 0 ? `id:${id}` : `name:${name.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cleanName = stripBracketedTitleParts(name);
      out.push({
        id: id > 0 ? id : 0,
        name,
        cleanName: cleanName || name,
        platform: normalizeText(row?.platform || row?.platformShortName),
        platformShortName: normalizeText(row?.platformShortName),
        genre: normalizeText(row?.genre),
        description: normalizeText(row?.description),
        tags: Array.isArray(row?.tags)
          ? row.tags.map((tag) => normalizeText(tag).toLowerCase()).filter(Boolean)
          : []
      });
      if (out.length >= maxCount) break;
    }
    return out;
  }

  function stripBracketedTitleParts(value) {
    let text = normalizeText(value);
    if (!text) return "";
    let previous = "";
    while (previous !== text) {
      previous = text;
      text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, " ");
    }
    return text.replace(/\s+/g, " ").trim();
  }

  function buildGroupedTagPromptRows(gamesInput) {
    const games = normalizeGamesForTagSuggestions(gamesInput);
    const groups = new Map();
    let seq = 0;

    games.forEach((game) => {
      const cleanName = normalizeText(game?.cleanName || game?.name);
      const platformShortName = normalizeText(game?.platformShortName || game?.platform).toLowerCase();
      const normalizedNameKey = normalizeNameForMatch(cleanName || game?.name);
      const groupKey = `${normalizedNameKey || "unknown"}::${platformShortName || "unknown"}`;
      if (!groups.has(groupKey)) {
        seq += 1;
        groups.set(groupKey, {
          groupId: `group-${seq}`,
          groupKey,
          canonicalName: cleanName || normalizeText(game?.name, "Unknown game"),
          platform: normalizeText(game?.platform || game?.platformShortName),
          platformShortName: platformShortName || normalizeText(game?.platformShortName),
          genre: normalizeText(game?.genre),
          description: normalizeText(game?.description),
          existingTags: new Set(),
          variants: [],
          gameIds: []
        });
      }

      const group = groups.get(groupKey);
      const gameId = Number(game?.id || 0);
      if (gameId > 0 && !group.gameIds.includes(gameId)) {
        group.gameIds.push(gameId);
      }

      const variantName = normalizeText(game?.name);
      if (variantName && !group.variants.includes(variantName)) {
        group.variants.push(variantName);
      }

      if (!group.genre && normalizeText(game?.genre)) {
        group.genre = normalizeText(game?.genre);
      }
      if (!group.description && normalizeText(game?.description)) {
        group.description = normalizeText(game?.description);
      }

      (Array.isArray(game?.tags) ? game.tags : []).forEach((tag) => {
        const normalizedTag = normalizeText(tag).toLowerCase();
        if (normalizedTag) group.existingTags.add(normalizedTag);
      });
    });

    return Array.from(groups.values()).map((group) => ({
      groupId: group.groupId,
      canonicalName: group.canonicalName,
      platform: group.platform,
      platformShortName: group.platformShortName,
      genre: group.genre,
      description: group.description,
      existingTags: Array.from(group.existingTags),
      variants: group.variants,
      gameIds: group.gameIds
    }));
  }

  function normalizeTagAlias(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }

  function normalizeTagId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sanitizeTagSource(value) {
    let text = normalizeText(value);
    if (!text) return "";

    text = text
      .replace(/\btag[\s_-]*id\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) return "";

    const collapsed = text.replace(/[\s\-_:;,.|/\\]+/g, "");
    if (collapsed.length <= 1) return "";
    if (/^\d+$/.test(collapsed)) return "";

    return text;
  }

  function createTagResolutionMaps(catalogRows) {
    const idMap = new Map();
    const labelMap = new Map();
    const aliasMap = new Map();
    const rows = normalizeTagCatalogRows(catalogRows);
    rows.forEach((row) => {
      const id = normalizeText(row?.id).toLowerCase();
      const label = normalizeText(row?.label).toLowerCase();
      if (!id) return;
      idMap.set(id, row.id);
      if (label) labelMap.set(label, row.id);
      aliasMap.set(normalizeTagAlias(row.id), row.id);
      if (label) aliasMap.set(normalizeTagAlias(row.label), row.id);
    });
    return { idMap, labelMap, aliasMap };
  }

  function collectTagSourcesFromParsed(parsed) {
    const sourceList = [];
    const pushSource = (value) => {
      const text = sanitizeTagSource(value);
      if (!text) return;
      sourceList.push(text);
    };

    if (Array.isArray(parsed?.tags)) {
      parsed.tags.forEach((entry) => {
        if (entry && typeof entry === "object") {
          pushSource(entry.id || entry.tag || entry.name || entry.label);
        } else {
          pushSource(entry);
        }
      });
    }
    if (Array.isArray(parsed?.tagIds)) parsed.tagIds.forEach(pushSource);
    if (Array.isArray(parsed?.categories)) parsed.categories.forEach(pushSource);
    if (sourceList.length === 0) {
      const csvLike = normalizeText(parsed?.tags || parsed?.tagIds || parsed?.categories);
      if (csvLike) {
        csvLike
          .split(/[,\n;|]+/g)
          .map((part) => normalizeText(part))
          .filter(Boolean)
          .forEach(pushSource);
      }
    }
    return sourceList;
  }

  function resolveTagSourcesToIds(sourceList, options = {}) {
    const allowUnknownTags = !!options?.allowUnknownTags;
    const maxTags = Math.max(1, Math.min(24, Number(options?.maxTags) || 6));
    const maps = options?.maps || createTagResolutionMaps(options?.catalog || []);
    const out = [];
    const seen = new Set();

    (Array.isArray(sourceList) ? sourceList : []).forEach((sourceValue) => {
      const sanitizedSource = sanitizeTagSource(sourceValue);
      const lower = normalizeText(sanitizedSource).toLowerCase();
      if (!lower) return;
      const alias = normalizeTagAlias(sanitizedSource);
      const matchedId = maps.idMap.get(lower) || maps.labelMap.get(lower) || maps.aliasMap.get(alias) || "";
      const resolvedId = matchedId || (allowUnknownTags ? normalizeTagId(sanitizedSource) : "");
      if (!resolvedId) return;
      const key = resolvedId.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(resolvedId);
    });

    return out.slice(0, maxTags);
  }

  function buildTagSuggestionPrompt(payload) {
    const game = payload?.game || {};
    const maxTags = Math.max(1, Math.min(12, Number(payload?.maxTags) || 6));
    const allowUnknownTags = !!payload?.allowUnknownTags;
    const availableTags = normalizeTagCatalogRows(payload?.availableTags);
    const gameName = normalizeText(game?.name, "Unknown game");
    const platform = normalizeText(game?.platform || game?.platformShortName, "Unknown");
    const genre = normalizeText(game?.genre, "Unknown");
    const description = normalizeText(game?.description, "");
    const existingTags = Array.isArray(game?.tags)
      ? game.tags.map((tag) => normalizeText(tag).toLowerCase()).filter(Boolean)
      : [];
    const tagsJson = JSON.stringify(availableTags);

    return [
      "You are emuBro's metadata assistant.",
      "Task: choose the best matching tags for a game.",
      "",
      "Return strict JSON only in this shape:",
      "{",
      '  "tags": ["single player", "multi player", "Action", "Snowboarding"],',
      '  "reason": "short reason"',
      "}",
      "",
      "Rules:",
      allowUnknownTags
        ? `- Prefer tag name from availableTags. If needed, you may add new short tag names (max ${maxTags} tags total).`
        : `- Use only tag names from the provided availableTags list (max ${maxTags} tags).`,
      "- Keep tags relevant to genre, gameplay style, and known franchise context.",
      allowUnknownTags
        ? "- For new tags, use concise kebab-case IDs (example: couch-coop, metroidvania)."
        : "- Do not invent tags.",
      "",
      "Game:",
      JSON.stringify({
        name: gameName,
        cleanName: stripBracketedTitleParts(gameName) || gameName,
        platform,
        platformShortName: normalizeText(game?.platformShortName),
        genre,
        description,
        existingTags
      }),
      "",
      "availableTags:",
      tagsJson
    ].join("\n");
  }

  function buildBatchTagSuggestionPrompt(payload) {
    const maxTags = Math.max(1, Math.min(12, Number(payload?.maxTags) || 6));
    const allowUnknownTags = !!payload?.allowUnknownTags;
    const availableTags = normalizeTagCatalogRows(payload?.availableTags);
    const games = buildGroupedTagPromptRows(payload?.games);
    const gameJson = JSON.stringify(
      games.map((game) => ({
        groupId: normalizeText(game.groupId),
        gameIds: Array.isArray(game.gameIds) ? game.gameIds : [],
        name: normalizeText(game.canonicalName),
        platform: normalizeText(game.platform),
        platformShortName: normalizeText(game.platformShortName),
        genre: normalizeText(game.genre),
        description: normalizeText(game.description),
        existingTags: Array.isArray(game.existingTags) ? game.existingTags : [],
        variants: Array.isArray(game.variants) ? game.variants : []
      }))
    );
    const tagsJson = JSON.stringify(availableTags);

    return [
      "You are emuBro's metadata assistant.",
      "Task: choose the best matching tags for each game.",
      "",
      "Return strict JSON only in this exact shape:",
      "{",
      '  "results": [',
      '    {"groupId": "group-1", "tags": ["tag-id-1", "tag-id-2"], "reason": "short reason"}',
      "  ]",
      "}",
      "",
      "Rules:",
      `- Return exactly one result object for each provided groupId in input order (max ${maxTags} tags per group).`,
      "- Apply tags to all gameIds in each group (same cleaned name + platformShortName).",
      allowUnknownTags
        ? "- Prefer availableTags. If needed, you may add short kebab-case tag IDs."
        : "- Use only tag IDs from availableTags. Do not invent tags.",
      "- Keep reason concise (under 20 words).",
      "- If a game has no suitable tags, return an empty tags array for that game.",
      "",
      "games:",
      gameJson,
      "",
      "availableTags:",
      tagsJson
    ].join("\n");
  }

  function extractJsonFromText(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (_error) {}

    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch && fencedMatch[1]) {
      try {
        return JSON.parse(fencedMatch[1].trim());
      } catch (_error) {}
    }

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const slice = text.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch (_error) {}
    }

    return null;
  }

  function normalizeSuggestionEntries(rows, maxCount = 8) {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      const name = normalizeText(row?.name || row?.title);
      if (!name) continue;
      const platform = normalizeText(row?.platform);
      const reason = normalizeText(row?.reason);
      const key = `${name.toLowerCase()}::${platform.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const entry = { name, platform, reason };
      const numericId = Number(row?.id || 0);
      if (numericId > 0) {
        entry.id = numericId;
      }
      const platformShortName = normalizeText(row?.platformShortName);
      if (platformShortName) {
        entry.platformShortName = platformShortName;
      }
      out.push(entry);
      if (out.length >= maxCount) break;
    }
    return out;
  }

  function matchesPlatformConstraint(value, selectedPlatform) {
    const candidate = normalizeText(value).toLowerCase();
    const target = normalizeText(selectedPlatform).toLowerCase();
    if (!target) return true;
    if (!candidate) return false;
    return (
      candidate === target
      || candidate.includes(target)
      || target.includes(candidate)
    );
  }

  function gameMatchesPlatformConstraint(game, selectedPlatform) {
    return (
      matchesPlatformConstraint(game?.platformShortName, selectedPlatform)
      || matchesPlatformConstraint(game?.platform, selectedPlatform)
    );
  }

  function normalizeNameForMatch(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, " ")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function findLibraryMatch(libraryGames, suggestionName, suggestionPlatform) {
    const targetName = normalizeNameForMatch(suggestionName);
    const targetPlatform = normalizeText(suggestionPlatform).toLowerCase();
    if (!targetName) return null;

    const rows = Array.isArray(libraryGames) ? libraryGames : [];
    const exact = rows.find((game) => {
      const gameName = normalizeNameForMatch(game?.name);
      const gamePlatform = normalizeText(game?.platform || game?.platformShortName).toLowerCase();
      if (gameName !== targetName) return false;
      if (!targetPlatform) return true;
      return gamePlatform === targetPlatform || gamePlatform.includes(targetPlatform) || targetPlatform.includes(gamePlatform);
    });
    if (exact) return exact;

    const partial = rows.find((game) => normalizeNameForMatch(game?.name).includes(targetName) || targetName.includes(normalizeNameForMatch(game?.name)));
    return partial || null;
  }

  function parseSuggestionPayload(rawModelText, payload) {
    const mode = normalizeMode(payload.mode);
    const limit = Math.max(3, Math.min(12, Number(payload.limit) || 8));
    const selectedPlatformOnly = !!payload.selectedPlatformOnly;
    const selectedPlatform = normalizeText(payload.selectedPlatform).toLowerCase();
    const libraryGames = normalizeLibraryGames(payload.libraryGames);
    const scopedLibraryGames = selectedPlatformOnly && selectedPlatform
      ? libraryGames.filter((game) => gameMatchesPlatformConstraint(game, selectedPlatform))
      : libraryGames;
    const libraryGamesForMatching = scopedLibraryGames.length > 0 ? scopedLibraryGames : libraryGames;
    const parsed = extractJsonFromText(rawModelText) || {};

    const rawLibraryMatches = Array.isArray(parsed.libraryMatches)
      ? parsed.libraryMatches
      : (Array.isArray(parsed.recommendations) ? parsed.recommendations : []);
    const rawMissingSuggestions = Array.isArray(parsed.missingSuggestions)
      ? parsed.missingSuggestions
      : (Array.isArray(parsed.newSuggestions) ? parsed.newSuggestions : []);

    const requestedLibraryMatches = normalizeSuggestionEntries(rawLibraryMatches, limit);
    const requestedMissingSuggestions = normalizeSuggestionEntries(rawMissingSuggestions, limit);

    const mappedLibraryMatches = requestedLibraryMatches
      .map((entry) => {
        const match = findLibraryMatch(libraryGamesForMatching, entry.name, entry.platform);
        if (!match) return null;
        return {
          id: Number(match.id || 0),
          name: normalizeText(match.name),
          platform: normalizeText(match.platform || match.platformShortName),
          platformShortName: normalizeText(match.platformShortName),
          reason: normalizeText(entry.reason)
        };
      })
      .filter(Boolean);

    const dedupedLibraryMatches = normalizeSuggestionEntries(mappedLibraryMatches, limit);
    const platformFilteredLibraryMatches = selectedPlatformOnly && selectedPlatform
      ? dedupedLibraryMatches.filter((entry) => {
          const platform = normalizeText(entry?.platform).toLowerCase();
          if (!platform) return false;
          return platform === selectedPlatform || platform.includes(selectedPlatform) || selectedPlatform.includes(platform);
        })
      : dedupedLibraryMatches;
    const fallbackLibraryMatches = platformFilteredLibraryMatches.length > 0
      ? platformFilteredLibraryMatches
      : normalizeSuggestionEntries(
        libraryGamesForMatching
          .filter((game) => !!game.isInstalled || !!game.lastPlayed)
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
          .slice(0, Math.min(5, limit))
          .map((game) => ({
            id: Number(game.id || 0),
            name: game.name,
            platform: game.platform || game.platformShortName,
            platformShortName: game.platformShortName,
            reason: "Good match based on your current library."
          })),
        limit
      );

    const safeFallbackLibraryMatches = fallbackLibraryMatches.length > 0
      ? fallbackLibraryMatches
      : normalizeSuggestionEntries(
        libraryGamesForMatching
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
          .slice(0, Math.min(5, limit))
          .map((game) => ({
            id: Number(game.id || 0),
            name: game.name,
            platform: game.platform || game.platformShortName,
            platformShortName: game.platformShortName,
            reason: "Potential match from your current library."
          })),
        limit
      );

    const missingSuggestionsRaw = mode === "library-only"
      ? []
      : normalizeSuggestionEntries(requestedMissingSuggestions, limit);
    const missingSuggestions = selectedPlatformOnly && selectedPlatform
      ? missingSuggestionsRaw.filter((entry) => {
          const platform = normalizeText(entry?.platform).toLowerCase();
          if (!platform) return false;
          return platform === selectedPlatform || platform.includes(selectedPlatform) || selectedPlatform.includes(platform);
        })
      : missingSuggestionsRaw;

    const summary = normalizeText(parsed.summary, "AI suggestions generated.");
    return {
      summary,
      libraryMatches: safeFallbackLibraryMatches,
      missingSuggestions
    };
  }

  function parseTagSuggestionPayload(rawModelText, payload) {
    const catalog = normalizeTagCatalogRows(payload?.availableTags);
    const maxTags = Math.max(1, Math.min(12, Number(payload?.maxTags) || 6));
    const allowUnknownTags = !!payload?.allowUnknownTags;
    const maps = createTagResolutionMaps(catalog);
    const parsed = extractJsonFromText(rawModelText) || {};

    return {
      tags: resolveTagSourcesToIds(collectTagSourcesFromParsed(parsed), {
        allowUnknownTags,
        maxTags,
        maps
      }),
      reason: normalizeText(parsed?.reason, "Tags generated by AI suggestion.")
    };
  }

  function parseBatchTagSuggestionPayload(rawModelText, payload) {
    const catalog = normalizeTagCatalogRows(payload?.availableTags);
    const maxTags = Math.max(1, Math.min(12, Number(payload?.maxTags) || 6));
    const allowUnknownTags = !!payload?.allowUnknownTags;
    const games = normalizeGamesForTagSuggestions(payload?.games);
    const groups = buildGroupedTagPromptRows(payload?.games);
    const maps = createTagResolutionMaps(catalog);
    const parsed = extractJsonFromText(rawModelText);

    const gameIdMap = new Map();
    const gameNameMap = new Map();
    games.forEach((game) => {
      const id = Number(game.id || 0);
      const nameKey = normalizeNameForMatch(game.name);
      if (id > 0) gameIdMap.set(id, game);
      if (nameKey) gameNameMap.set(nameKey, game);
    });

    const groupIdMap = new Map();
    const groupGameIdsMap = new Map();
    groups.forEach((group) => {
      const groupId = normalizeText(group?.groupId);
      if (!groupId) return;
      groupIdMap.set(groupId, group);
      groupGameIdsMap.set(groupId, (Array.isArray(group?.gameIds) ? group.gameIds : [])
        .map((id) => Number(id || 0))
        .filter((id) => id > 0));
    });

    const resolveGamesFromEntry = (entry) => {
      const rawGroupId = normalizeText(entry?.groupId || entry?.group?.id);
      if (rawGroupId && groupIdMap.has(rawGroupId)) {
        return (groupGameIdsMap.get(rawGroupId) || [])
          .map((id) => gameIdMap.get(id))
          .filter(Boolean);
      }

      const rawGameId = Number(entry?.gameId || entry?.id || entry?.game?.id || 0);
      if (rawGameId > 0 && gameIdMap.has(rawGameId)) return [gameIdMap.get(rawGameId)];

      const rawName = normalizeText(entry?.name || entry?.gameName || entry?.game?.name);
      if (!rawName) return [];
      const nameKey = normalizeNameForMatch(rawName);
      if (!nameKey) return [];
      const matched = gameNameMap.get(nameKey);
      return matched ? [matched] : [];
    };

    const collectRawResultRows = () => {
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.results)) return parsed.results;
      if (Array.isArray(parsed?.games)) return parsed.games;
      if (Array.isArray(parsed?.items)) return parsed.items;
      if (parsed && typeof parsed === "object") {
        const objectEntries = Object.entries(parsed).filter(([key]) => !["summary", "reason", "message"].includes(String(key).toLowerCase()));
        if (objectEntries.length > 0) {
          return objectEntries.map(([key, value]) => {
            if (value && typeof value === "object") {
              return {
                groupId: normalizeText(value.groupId || (/^group-\d+$/i.test(String(key)) ? key : "")),
                gameId: Number(key) || Number(value.gameId || value.id || 0),
                name: normalizeText(value.name || value.gameName),
                tags: value.tags || value.tagIds || value.categories || [],
                reason: value.reason
              };
            }
            return {
              groupId: /^group-\d+$/i.test(String(key)) ? String(key) : "",
              gameId: Number(key) || 0,
              tags: value
            };
          });
        }
      }
      return [];
    };

    const rows = collectRawResultRows();
    const collectedByGameId = new Map();
    rows.forEach((entry) => {
      const tags = resolveTagSourcesToIds(collectTagSourcesFromParsed(entry), {
        allowUnknownTags,
        maxTags,
        maps
      });
      const matchedGames = resolveGamesFromEntry(entry);
      matchedGames.forEach((game) => {
        if (!game || Number(game.id || 0) <= 0) return;
        const gameId = Number(game.id);
        const previous = collectedByGameId.get(gameId);
        if (!previous || (Array.isArray(previous.tags) && previous.tags.length === 0 && tags.length > 0)) {
          collectedByGameId.set(gameId, {
            gameId,
            tags,
            reason: normalizeText(entry?.reason, "Tags generated by AI suggestion.")
          });
        }
      });
    });

    const results = games
      .map((game) => {
        const gameId = Number(game.id || 0);
        if (gameId <= 0) return null;
        const found = collectedByGameId.get(gameId);
        if (found) return found;
        return {
          gameId,
          tags: [],
          reason: "No tags returned for this game."
        };
      })
      .filter(Boolean);

    return {
      summary: normalizeText(parsed?.summary, "Batch tag suggestions generated."),
      results
    };
  }

  function collectTemplateTokenSignature(value) {
    const matches = String(value || "").match(/\{\{\s*[^{}]+\s*\}\}|\{[a-zA-Z0-9_]+\}/g);
    if (!Array.isArray(matches) || matches.length === 0) return "";
    return matches.map((token) => String(token).trim()).sort().join("||");
  }

  function normalizeLocaleTranslationEntries(rows, maxCount = 80) {
    const out = [];
    const seen = new Set();
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      const key = normalizeText(row?.key || row?.id);
      const text = normalizeText(row?.text || row?.source || row?.value);
      if (!key || !text) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ key, text });
      if (out.length >= Math.max(1, Number(maxCount) || 80)) break;
    }
    return out;
  }

  function normalizeLocaleTranslationMode(mode) {
    const value = normalizeText(mode).toLowerCase();
    if (value === "one-by-one" || value === "all-in-one-json") return value;
    return "one-by-one";
  }

  function normalizeLocaleObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value;
  }

  function flattenLocaleStringValues(value, prefix = "", target = {}) {
    const source = normalizeLocaleObject(value);
    Object.keys(source).forEach((key) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      const node = source[key];
      if (typeof node === "string") {
        target[nextPrefix] = node;
        return;
      }
      if (node && typeof node === "object" && !Array.isArray(node)) {
        flattenLocaleStringValues(node, nextPrefix, target);
      }
    });
    return target;
  }

  function buildLocaleTranslationPrompt(payload = {}) {
    const sourceLanguageCode = normalizeText(payload.sourceLanguageCode, "en");
    const targetLanguageCode = normalizeText(payload.targetLanguageCode, "target");
    const targetLanguageName = normalizeText(payload.targetLanguageName, targetLanguageCode);
    const entries = normalizeLocaleTranslationEntries(payload.entries);
    const entriesJson = JSON.stringify(entries);

    return [
      "You are emuBro's localization assistant.",
      `Translate UI strings from language code "${sourceLanguageCode}" to "${targetLanguageCode}" (${targetLanguageName}).`,
      "",
      "Return strict JSON only in this exact shape:",
      "{",
      '  "translations": {',
      '    "some.key.path": "translated text"',
      "  }",
      "}",
      "",
      "Rules:",
      "- Translate naturally for software UI labels/messages.",
      "- Keep placeholders exactly unchanged (examples: {{count}}, {name}).",
      "- Keep key names unchanged.",
      "- Preserve product/brand names such as emuBro, Discord, Reddit, YouTube, OpenAI, Gemini, Ollama.",
      "- If unsure, return the source text for that key.",
      "",
      "entries:",
      entriesJson
    ].join("\n");
  }

  function buildLocaleTranslationFullJsonPrompt(payload = {}) {
    const sourceLanguageCode = normalizeText(payload.sourceLanguageCode, "en");
    const targetLanguageCode = normalizeText(payload.targetLanguageCode, "target");
    const targetLanguageName = normalizeText(payload.targetLanguageName, targetLanguageCode);
    const retranslateExisting = !!payload.retranslateExisting;
    const entries = normalizeLocaleTranslationEntries(payload.entries, 5000);
    const translationKeys = entries.map((entry) => entry.key);
    const sourceLocaleObject = normalizeLocaleObject(payload.sourceLocaleObject);
    const targetLocaleObject = normalizeLocaleObject(payload.targetLocaleObject);

    const sourceLocaleJson = JSON.stringify(sourceLocaleObject);
    const targetLocaleJson = JSON.stringify(targetLocaleObject);
    const translationKeysJson = JSON.stringify(translationKeys);

    return [
      "You are emuBro's localization assistant.",
      `Translate UI strings from language code "${sourceLanguageCode}" to "${targetLanguageCode}" (${targetLanguageName}).`,
      "",
      "Return strict JSON only in this exact shape, minified on one line:",
      '{"locale":{"some":{"nested":"translated text"}}}',
      "",
      "Rules:",
      "- Keep the exact object structure from targetLocale.",
      "- Only update keys listed in translationKeys.",
      retranslateExisting
        ? "- You may update existing non-empty targetLocale strings for keys in translationKeys."
        : "- Keep all existing non-empty targetLocale strings unchanged.",
      "- Keep placeholders exactly unchanged (examples: {{count}}, {name}).",
      "- Preserve product/brand names such as emuBro, Discord, Reddit, YouTube, OpenAI, Gemini, Ollama.",
      "- If unsure, keep the source text from sourceLocale.",
      "",
      "sourceLocale:",
      sourceLocaleJson,
      "",
      "targetLocale:",
      targetLocaleJson,
      "",
      "translationKeys:",
      translationKeysJson
    ].join("\n");
  }

  function parseLocaleTranslationPayload(rawModelText, entries) {
    const requestedEntries = normalizeLocaleTranslationEntries(entries, 500);
    const parsed = extractJsonFromText(rawModelText);

    let rawTranslations = {};
    if (parsed && typeof parsed === "object") {
      if (parsed.translations && typeof parsed.translations === "object") {
        rawTranslations = parsed.translations;
      } else {
        rawTranslations = parsed;
      }
    }

    const out = {};
    requestedEntries.forEach((entry) => {
      const sourceText = normalizeText(entry?.text);
      if (!sourceText) return;

      const candidateRaw = Object.prototype.hasOwnProperty.call(rawTranslations, entry.key)
        ? rawTranslations[entry.key]
        : "";
      const candidateText = normalizeText(candidateRaw);
      let translated = candidateText || sourceText;

      const sourceSignature = collectTemplateTokenSignature(sourceText);
      const translatedSignature = collectTemplateTokenSignature(translated);
      if (sourceSignature !== translatedSignature) {
        translated = sourceText;
      }

      out[entry.key] = translated;
    });

    return out;
  }

  function parseLocaleTranslationFullJsonPayload(rawModelText, payload = {}) {
    const requestedEntries = normalizeLocaleTranslationEntries(payload.entries, 5000);
    const parsed = extractJsonFromText(rawModelText);

    let localeObject = {};
    let rawTranslations = {};
    if (parsed && typeof parsed === "object") {
      if (parsed.locale && typeof parsed.locale === "object" && !Array.isArray(parsed.locale)) {
        localeObject = parsed.locale;
      } else if (parsed.targetLocale && typeof parsed.targetLocale === "object" && !Array.isArray(parsed.targetLocale)) {
        localeObject = parsed.targetLocale;
      } else {
        localeObject = parsed;
      }

      if (parsed.translations && typeof parsed.translations === "object") {
        rawTranslations = parsed.translations;
      }
    }

    const flattenedLocale = flattenLocaleStringValues(localeObject);
    const out = {};
    requestedEntries.forEach((entry) => {
      const sourceText = normalizeText(entry?.text);
      if (!sourceText) return;

      const translationByKey = Object.prototype.hasOwnProperty.call(rawTranslations, entry.key)
        ? rawTranslations[entry.key]
        : "";
      const translationByLocale = Object.prototype.hasOwnProperty.call(flattenedLocale, entry.key)
        ? flattenedLocale[entry.key]
        : "";
      const candidateText = normalizeText(translationByKey || translationByLocale);

      let translated = candidateText || sourceText;
      const sourceSignature = collectTemplateTokenSignature(sourceText);
      const translatedSignature = collectTemplateTokenSignature(translated);
      if (sourceSignature !== translatedSignature) {
        translated = sourceText;
      }

      out[entry.key] = translated;
    });

    return {
      translations: out,
      localeJsonMinified: JSON.stringify(normalizeLocaleObject(localeObject))
    };
  }

  async function requestOllama(payload) {
    const endpoint = getOllamaApiEndpoint(payload.baseUrl, "generate");
    const runWithModel = async (modelName) => {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: normalizeText(modelName, "llama3.1"),
          prompt: buildRequestPrompt(payload),
          format: "json",
          stream: false
        })
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    };

    const initialModel = normalizeText(payload.model, "llama3.1");
    let firstRun = await runWithModel(initialModel);
    if (!firstRun.ok) {
      const modelNotFound = firstRun.status === 404 || /model\s+['"]?.+?['"]?\s+not\s+found/i.test(firstRun.text);
      if (modelNotFound) {
        try {
          const listed = await listOllamaModels({ baseUrl: payload.baseUrl });
          const fallbackModel = normalizeText(listed?.models?.[0]);
          if (fallbackModel && fallbackModel.toLowerCase() !== initialModel.toLowerCase()) {
            firstRun = await runWithModel(fallbackModel);
          }
        } catch (_error) {}
      }
    }

    if (!firstRun.ok) {
      throw new Error(`Ollama request failed (${firstRun.status}): ${String(firstRun.text || "").slice(0, 180)}`);
    }

    let json = null;
    try {
      json = JSON.parse(String(firstRun.text || "{}"));
    } catch (_error) {}
    return normalizeText(json?.response, String(firstRun.text || ""));
  }

  async function requestOpenAI(payload) {
    const baseUrl = normalizeText(payload.baseUrl, "https://api.openai.com/v1").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/chat/completions`;
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for OpenAI provider.");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: normalizeText(payload.model, "gpt-4o-mini"),
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "Return strict JSON only. No markdown."
          },
          {
            role: "user",
            content: buildRequestPrompt(payload)
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    return normalizeText(json?.choices?.[0]?.message?.content);
  }

  async function requestGemini(payload) {
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for Gemini provider.");

    const model = encodeURIComponent(normalizeText(payload.model, "gemini-1.5-flash"));
    const baseUrl = normalizeText(payload.baseUrl, "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildRequestPrompt(payload) }]
          }
        ],
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => normalizeText(part?.text)).filter(Boolean).join("\n");
  }

  async function requestOllamaText(payload) {
    const endpoint = getOllamaApiEndpoint(payload.baseUrl, "generate");
    const runWithModel = async (modelName) => {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: normalizeText(modelName, "llama3.1"),
          prompt: buildSupportPrompt(payload),
          stream: false
        })
      });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text };
    };

    const initialModel = normalizeText(payload.model, "llama3.1");
    let firstRun = await runWithModel(initialModel);
    if (!firstRun.ok) {
      const modelNotFound = firstRun.status === 404 || /model\s+['"]?.+?['"]?\s+not\s+found/i.test(firstRun.text);
      if (modelNotFound) {
        try {
          const listed = await listOllamaModels({ baseUrl: payload.baseUrl });
          const fallbackModel = normalizeText(listed?.models?.[0]);
          if (fallbackModel && fallbackModel.toLowerCase() !== initialModel.toLowerCase()) {
            firstRun = await runWithModel(fallbackModel);
          }
        } catch (_error) {}
      }
    }

    if (!firstRun.ok) {
      throw new Error(`Ollama request failed (${firstRun.status}): ${String(firstRun.text || "").slice(0, 180)}`);
    }

    let json = null;
    try {
      json = JSON.parse(String(firstRun.text || "{}"));
    } catch (_error) {}
    return normalizeText(json?.response, String(firstRun.text || ""));
  }

  async function requestOpenAIText(payload) {
    const baseUrl = normalizeText(payload.baseUrl, "https://api.openai.com/v1").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/chat/completions`;
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for OpenAI provider.");

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: normalizeText(payload.model, "gpt-4o-mini"),
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: "You are an emulator support assistant. Return plain text troubleshooting guidance."
          },
          {
            role: "user",
            content: buildSupportPrompt(payload)
          }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    return normalizeText(json?.choices?.[0]?.message?.content);
  }

  async function requestGeminiText(payload) {
    const apiKey = normalizeText(payload.apiKey);
    if (!apiKey) throw new Error("Missing API key for Gemini provider.");

    const model = encodeURIComponent(normalizeText(payload.model, "gemini-1.5-flash"));
    const baseUrl = normalizeText(payload.baseUrl, "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildSupportPrompt(payload) }]
          }
        ],
        generationConfig: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini request failed (${response.status}): ${text.slice(0, 180)}`);
    }

    const json = await response.json();
    const parts = json?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts.map((part) => normalizeText(part?.text)).filter(Boolean).join("\n");
  }

  ipcMain.handle("suggestions:recommend-games", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const mode = normalizeMode(payload.mode);
    const safePayload = {
      ...payload,
      provider,
      mode,
      limit: Math.max(3, Math.min(12, Number(payload.limit) || 8)),
      selectedPlatformOnly: !!payload.selectedPlatformOnly,
      selectedPlatform: normalizeText(payload.selectedPlatform),
      libraryGames: Array.isArray(payload.libraryGames) ? payload.libraryGames : []
    };

    try {
      let rawModelText = "";
      if (provider === "openai") {
        rawModelText = await requestOpenAI(safePayload);
      } else if (provider === "gemini") {
        rawModelText = await requestGemini(safePayload);
      } else {
        rawModelText = await requestOllama(safePayload);
      }

      const parsed = parseSuggestionPayload(rawModelText, safePayload);
      return {
        success: true,
        provider,
        mode,
        summary: parsed.summary,
        libraryMatches: parsed.libraryMatches,
        missingSuggestions: parsed.missingSuggestions
      };
    } catch (error) {
      log.error("suggestions:recommend-games failed:", error);
      return {
        success: false,
        provider,
        mode,
        message: error?.message || String(error),
        libraryMatches: [],
        missingSuggestions: []
      };
    }
  });

  ipcMain.handle("suggestions:list-ollama-models", async (_event, payload = {}) => {
    try {
      const result = await listOllamaModels(payload);
      return {
        success: true,
        baseUrl: result.baseUrl,
        models: result.models
      };
    } catch (error) {
      log.error("suggestions:list-ollama-models failed:", error);
      return {
        success: false,
        message: error?.message || String(error),
        models: []
      };
    }
  });

  ipcMain.handle("suggestions:emulation-support", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const safePayload = {
      ...payload,
      provider,
      issueType: normalizeText(payload.issueType, "other"),
      issueTypeLabel: normalizeText(payload.issueTypeLabel, "Emulation issue"),
      issueSummary: normalizeText(payload.issueSummary),
      platform: normalizeText(payload.platform),
      emulator: normalizeText(payload.emulator),
      errorText: normalizeText(payload.errorText),
      details: normalizeText(payload.details)
    };

    if (!safePayload.issueSummary) {
      return { success: false, provider, message: "Issue summary is required.", answer: "" };
    }

    try {
      let answer = "";
      if (provider === "openai") {
        answer = await requestOpenAIText(safePayload);
      } else if (provider === "gemini") {
        answer = await requestGeminiText(safePayload);
      } else {
        answer = await requestOllamaText(safePayload);
      }

      const normalizedAnswer = normalizeText(answer);
      if (!normalizedAnswer) {
        return { success: false, provider, message: "Provider returned an empty response.", answer: "" };
      }

      return {
        success: true,
        provider,
        answer: normalizedAnswer
      };
    } catch (error) {
      log.error("suggestions:emulation-support failed:", error);
      return {
        success: false,
        provider,
        message: error?.message || String(error),
        answer: ""
      };
    }
  });

  ipcMain.handle("suggestions:translate-locale-missing", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const mode = normalizeLocaleTranslationMode(payload.mode);
    const safeEntries = normalizeLocaleTranslationEntries(
      payload.entries,
      mode === "all-in-one-json" ? 5000 : 90
    );
    const safePayload = {
      ...payload,
      provider,
      mode,
      entries: safeEntries,
      sourceLanguageCode: normalizeText(payload.sourceLanguageCode, "en"),
      targetLanguageCode: normalizeText(payload.targetLanguageCode),
      targetLanguageName: normalizeText(payload.targetLanguageName),
      retranslateExisting: !!payload.retranslateExisting,
      sourceLocaleObject: normalizeLocaleObject(payload.sourceLocaleObject),
      targetLocaleObject: normalizeLocaleObject(payload.targetLocaleObject)
    };

    if (!safePayload.targetLanguageCode) {
      return { success: false, provider, mode, message: "Target language code is required.", translations: {} };
    }
    if (!safeEntries.length) {
      return { success: false, provider, mode, message: "No translation entries were provided.", translations: {} };
    }

    safePayload.prompt = mode === "all-in-one-json"
      ? buildLocaleTranslationFullJsonPrompt(safePayload)
      : buildLocaleTranslationPrompt(safePayload);

    try {
      let rawModelText = "";
      if (provider === "openai") {
        rawModelText = await requestOpenAI(safePayload);
      } else if (provider === "gemini") {
        rawModelText = await requestGemini(safePayload);
      } else {
        rawModelText = await requestOllama(safePayload);
      }

      const parsedResult = mode === "all-in-one-json"
        ? parseLocaleTranslationFullJsonPayload(rawModelText, safePayload)
        : {
          translations: parseLocaleTranslationPayload(rawModelText, safeEntries),
          localeJsonMinified: ""
        };
      return {
        success: true,
        provider,
        mode,
        translations: parsedResult.translations,
        localeJsonMinified: parsedResult.localeJsonMinified
      };
    } catch (error) {
      log.error("suggestions:translate-locale-missing failed:", error);
      return {
        success: false,
        provider,
        mode,
        message: error?.message || String(error),
        translations: {}
      };
    }
  });

  ipcMain.handle("suggestions:suggest-tags-for-game", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const safePayload = {
      ...payload,
      provider,
      game: payload?.game && typeof payload.game === "object" ? payload.game : {},
      availableTags: normalizeTagCatalogRows(payload?.availableTags),
      maxTags: Math.max(1, Math.min(12, Number(payload.maxTags) || 6)),
      allowUnknownTags: !!payload?.allowUnknownTags
    };

    if (!safePayload.game?.name) {
      return { success: false, provider, message: "No game was provided.", tags: [] };
    }
    if (!safePayload.availableTags.length) {
      return { success: false, provider, message: "No tag catalog was provided.", tags: [] };
    }

    safePayload.prompt = buildTagSuggestionPrompt(safePayload);

    try {
      let rawModelText = "";
      if (provider === "openai") {
        rawModelText = await requestOpenAI(safePayload);
      } else if (provider === "gemini") {
        rawModelText = await requestGemini(safePayload);
      } else {
        rawModelText = await requestOllama(safePayload);
      }

      const parsed = parseTagSuggestionPayload(rawModelText, safePayload);
      return {
        success: true,
        provider,
        tags: parsed.tags,
        reason: parsed.reason
      };
    } catch (error) {
      log.error("suggestions:suggest-tags-for-game failed:", error);
      return {
        success: false,
        provider,
        message: error?.message || String(error),
        tags: []
      };
    }
  });

  ipcMain.handle("suggestions:suggest-tags-for-games-batch", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const safePayload = {
      ...payload,
      provider,
      availableTags: normalizeTagCatalogRows(payload?.availableTags),
      games: normalizeGamesForTagSuggestions(payload?.games),
      maxTags: Math.max(1, Math.min(12, Number(payload?.maxTags) || 6)),
      allowUnknownTags: !!payload?.allowUnknownTags
    };

    if (!safePayload.games.length) {
      return { success: false, provider, message: "No games were provided.", results: [] };
    }
    if (!safePayload.availableTags.length) {
      return { success: false, provider, message: "No tag catalog was provided.", results: [] };
    }

    safePayload.prompt = buildBatchTagSuggestionPrompt(safePayload);

    try {
      let rawModelText = "";
      if (provider === "openai") {
        rawModelText = await requestOpenAI(safePayload);
      } else if (provider === "gemini") {
        rawModelText = await requestGemini(safePayload);
      } else {
        rawModelText = await requestOllama(safePayload);
      }

      const parsed = parseBatchTagSuggestionPayload(rawModelText, safePayload);
      return {
        success: true,
        provider,
        summary: parsed.summary,
        results: parsed.results
      };
    } catch (error) {
      log.error("suggestions:suggest-tags-for-games-batch failed:", error);
      return {
        success: false,
        provider,
        message: error?.message || String(error),
        results: []
      };
    }
  });
}

module.exports = {
  registerSuggestionsIpc
};
