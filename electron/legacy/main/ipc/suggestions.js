const path = require("node:path");
const { createSupportSuggestionsService } = require("./suggestions/support-service");
const { createSuggestionsProviderClient } = require("./suggestions/provider-client");
const { createThemeTagSuggestionsService } = require("./suggestions/theme-tag-service");
const { createSuggestionsRelayService } = require("./suggestions/relay-service");

function registerSuggestionsIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const log = deps.log || console;
  const fetchImpl = deps.fetchImpl || fetch;
  const getPlatformConfigs = typeof deps.getPlatformConfigs === "function"
    ? deps.getPlatformConfigs
    : (async () => []);
  const getGamesState = typeof deps.getGamesState === "function"
    ? deps.getGamesState
    : (() => []);
  const getEmulatorsState = typeof deps.getEmulatorsState === "function"
    ? deps.getEmulatorsState
    : (() => []);
  const launchGameObject = typeof deps.launchGameObject === "function"
    ? deps.launchGameObject
    : null;
  const downloadInstallEmulator = typeof deps.downloadInstallEmulator === "function"
    ? deps.downloadInstallEmulator
    : null;
  const searchHelpDocs = typeof deps.searchHelpDocs === "function"
    ? deps.searchHelpDocs
    : (() => []);
  const normalizePlatformRef = typeof deps.normalizePlatform === "function"
    ? deps.normalizePlatform
    : ((value) => String(value || "").trim().toLowerCase());

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

  function normalizeTemperature(value, fallback = 0.7) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(0, Math.min(2, parsed));
  }

  const themeTagService = createThemeTagSuggestionsService({
    normalizeText
  });
  const {
    normalizeTagCatalogRows,
    normalizeGamesForTagSuggestions,
    stripBracketedTitleParts,
    buildGroupedTagPromptRows,
    buildTagSuggestionPrompt,
    buildBatchTagSuggestionPrompt,
    parseThemeGenerationPayload,
    buildThemeGenerationPrompt,
    parseTagSuggestionPayload,
    parseBatchTagSuggestionPayload
  } = themeTagService;

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

  const providerClient = createSuggestionsProviderClient({
    fetchImpl,
    normalizeProvider,
    normalizeText,
    normalizeTemperature,
    buildRequestPrompt
  });
  const relayService = createSuggestionsRelayService({
    log,
    fetchImpl,
    providerClient,
    store: deps.store,
    app: deps.app,
    normalizeProvider,
    normalizeText
  });
  relayService.ensureRelayServer().catch((error) => {
    log.error("suggestions relay startup failed:", error);
  });

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
    const styleHint = normalizeText(payload.styleHint);
    const entries = normalizeLocaleTranslationEntries(payload.entries);
    const entriesJson = JSON.stringify(entries);

    return [
      "You are emuBro's localization assistant.",
      `Translate UI strings from language code "${sourceLanguageCode}" to "${targetLanguageCode}" (${targetLanguageName}).`,
      styleHint ? `Translation style preference: ${styleHint}` : "Translation style preference: neutral, clear software UI language.",
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
    const styleHint = normalizeText(payload.styleHint);
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
      styleHint ? `Translation style preference: ${styleHint}` : "Translation style preference: neutral, clear software UI language.",
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

  async function requestSupportProviderText(payload, options = {}) {
    return providerClient.requestText(payload, options);
  }

  const supportService = createSupportSuggestionsService({
    log,
    getPlatformConfigs,
    getGamesState,
    getEmulatorsState,
    launchGameObject,
    downloadInstallEmulator,
    os: deps.os,
    spawnSync: deps.spawnSync,
    searchHelpDocs,
    normalizePlatform: normalizePlatformRef,
    normalizeProvider,
    requestSupportProviderText
  });

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
      const rawModelText = await providerClient.requestJson(safePayload);
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
      const result = await providerClient.listOllamaModels(payload);
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

  ipcMain.handle("suggestions:relay:sync-host-settings", async (_event, payload = {}) => {
    try {
      return await relayService.syncHostSettings(payload || {});
    } catch (error) {
      log.error("suggestions:relay:sync-host-settings failed:", error);
      return {
        success: false,
        message: error?.message || String(error)
      };
    }
  });

  ipcMain.handle("suggestions:relay:scan-network", async (_event, payload = {}) => {
    try {
      return await relayService.scanNetwork(payload || {});
    } catch (error) {
      log.error("suggestions:relay:scan-network failed:", error);
      return {
        success: false,
        message: error?.message || String(error),
        hosts: []
      };
    }
  });

  ipcMain.handle("suggestions:relay:get-status", async () => {
    try {
      return await relayService.getStatus();
    } catch (error) {
      log.error("suggestions:relay:get-status failed:", error);
      return {
        success: false,
        message: error?.message || String(error)
      };
    }
  });

  ipcMain.handle("suggestions:relay:get-connections", async () => {
    try {
      return await relayService.getConnections();
    } catch (error) {
      log.error("suggestions:relay:get-connections failed:", error);
      return {
        success: false,
        message: error?.message || String(error),
        connections: []
      };
    }
  });

  ipcMain.handle("suggestions:emulation-support", async (_event, payload = {}) => {
    try {
      return await supportService.handleSupportRequest(payload || {});
    } catch (error) {
      log.error("suggestions:emulation-support failed:", error);
      return {
        success: false,
        provider: normalizeProvider(payload?.provider),
        message: error?.message || String(error),
        answer: ""
      };
    }
  });

  ipcMain.handle("suggestions:generate-theme", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const safePayload = {
      ...payload,
      provider,
      mood: normalizeText(payload.mood, "balanced"),
      style: normalizeText(payload.style, "arcade"),
      notes: normalizeText(payload.notes),
      extraPrompt: normalizeText(payload.extraPrompt),
      energy: Math.max(0, Math.min(100, Number(payload.energy) || 55)),
      saturation: Math.max(0, Math.min(100, Number(payload.saturation) || 62)),
      variationSeed: normalizeText(payload.variationSeed),
      preferTextEffect: !!payload.preferTextEffect,
      applyEffectToLogo: !!payload.applyEffectToLogo,
      temperature: normalizeTemperature(payload.temperature, 1.05),
      currentColors: payload.currentColors && typeof payload.currentColors === "object"
        ? payload.currentColors
        : {}
    };

    safePayload.prompt = buildThemeGenerationPrompt(safePayload);

    try {
      const rawModelText = await providerClient.requestJson(safePayload);
      const parsed = parseThemeGenerationPayload(rawModelText, safePayload);
      return {
        success: true,
        provider,
        summary: parsed.summary,
        colors: parsed.colors,
        textEffect: parsed.textEffect
      };
    } catch (error) {
      log.error("suggestions:generate-theme failed:", error);
      return {
        success: false,
        provider,
        message: error?.message || String(error)
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
      styleHint: normalizeText(payload.styleHint).slice(0, 280),
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
      const rawModelText = await providerClient.requestJson(safePayload);
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
      const rawModelText = await providerClient.requestJson(safePayload);
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
      const rawModelText = await providerClient.requestJson(safePayload);
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
