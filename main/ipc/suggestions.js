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
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&amp;/gi, "&");
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
      '- Provide up to {{limit}} items in missingSuggestions only when mode is "library-plus-missing".',
      '- If mode is "library-only", missingSuggestions must be an empty array.',
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

  function buildPrompt(payload) {
    const mode = normalizeMode(payload.mode);
    const query = normalizeText(payload.query, "No specific mood provided.");
    const limit = Math.max(3, Math.min(12, Number(payload.limit) || 8));
    const selectedPlatformOnly = !!payload.selectedPlatformOnly;
    const selectedPlatform = normalizeText(payload.selectedPlatform);
    const platformConstraint = (selectedPlatformOnly && selectedPlatform)
      ? `Only suggest games for platform "${selectedPlatform}".`
      : "No platform restriction.";
    const libraryGames = normalizeLibraryGames(payload.libraryGames);
    const libraryJson = JSON.stringify(libraryGames);
    const template = decodeHtmlEntities(normalizeText(payload.promptTemplate, getDefaultPromptTemplate()));
    let prompt = template;
    prompt = replacePromptToken(prompt, "mode", mode);
    prompt = replacePromptToken(prompt, "query", query);
    prompt = replacePromptToken(prompt, "limit", String(limit));
    prompt = replacePromptToken(prompt, "platformConstraint", platformConstraint);
    prompt = replacePromptToken(prompt, "selectedPlatform", selectedPlatform);
    prompt = replacePromptToken(prompt, "libraryJson", libraryJson);

    if (selectedPlatformOnly && selectedPlatform) {
      prompt += `\n- IMPORTANT: Only suggest games for platform "${selectedPlatform}".`;
    }

    if (!/\{\{\s*libraryJson\s*\}\}/i.test(template)) {
      prompt += `\n\nLibrary games JSON:\n${libraryJson}`;
    }
    if (!/\{\{\s*query\s*\}\}/i.test(template)) {
      prompt += `\nUser mood/preferences: ${query}`;
    }
    if (!/\{\{\s*mode\s*\}\}/i.test(template)) {
      prompt += `\nMode: ${mode}`;
    }
    if (!/\{\{\s*platformConstraint\s*\}\}/i.test(template)) {
      prompt += `\nPlatform constraint: ${platformConstraint}`;
    }

    // Always append a strict context block so custom templates still work.
    prompt += `\n\nContext:\n- mode: ${mode}\n- query: ${query}\n- limit: ${limit}\n- platformConstraint: ${platformConstraint}\n- libraryJson: ${libraryJson}`;
    return prompt;
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
          prompt: buildPrompt(payload),
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
            content: buildPrompt(payload)
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
            parts: [{ text: buildPrompt(payload) }]
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

    // Local fallback: query `ollama list` CLI to avoid missing models on variant APIs/proxies.
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
      libraryGames: normalizeLibraryGames(payload.libraryGames)
    };

    if (!safePayload.libraryGames.length) {
      return { success: false, message: "No library games were provided.", libraryMatches: [], missingSuggestions: [] };
    }

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
}

module.exports = {
  registerSuggestionsIpc
};
