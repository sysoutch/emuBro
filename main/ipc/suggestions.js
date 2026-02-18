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
    const libraryGames = normalizeLibraryGames(payload.libraryGames);

    return [
      "You are emuBro's game recommendation assistant.",
      `Mode: ${mode}`,
      `User mood/preferences: ${query}`,
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
      `Rules:`,
      `- Provide up to ${limit} items in libraryMatches.`,
      `- Provide up to ${limit} items in missingSuggestions only when mode is "library-plus-missing".`,
      `- If mode is "library-only", missingSuggestions must be an empty array.`,
      "- For libraryMatches, prefer exact names from the supplied library list.",
      "- Keep reasons concise (under 20 words).",
      "",
      "Library games JSON:",
      JSON.stringify(libraryGames)
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
      out.push({ name, platform, reason });
      if (out.length >= maxCount) break;
    }
    return out;
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
    const libraryGames = normalizeLibraryGames(payload.libraryGames);
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
        const match = findLibraryMatch(libraryGames, entry.name, entry.platform);
        if (!match) return null;
        return {
          id: Number(match.id || 0),
          name: normalizeText(match.name),
          platform: normalizeText(match.platform || match.platformShortName),
          reason: normalizeText(entry.reason)
        };
      })
      .filter(Boolean);

    const dedupedLibraryMatches = normalizeSuggestionEntries(mappedLibraryMatches, limit);
    const fallbackLibraryMatches = dedupedLibraryMatches.length > 0
      ? dedupedLibraryMatches
      : normalizeSuggestionEntries(
        libraryGames
          .filter((game) => !!game.isInstalled || !!game.lastPlayed)
          .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
          .slice(0, Math.min(5, limit))
          .map((game) => ({
            name: game.name,
            platform: game.platform || game.platformShortName,
            reason: "Good match based on your current library."
          })),
        limit
      );

    const missingSuggestions = mode === "library-only"
      ? []
      : normalizeSuggestionEntries(requestedMissingSuggestions, limit);

    const summary = normalizeText(parsed.summary, "AI suggestions generated.");
    return {
      summary,
      libraryMatches: fallbackLibraryMatches,
      missingSuggestions
    };
  }

  async function requestOllama(payload) {
    const baseUrl = normalizeText(payload.baseUrl, "http://127.0.0.1:11434").replace(/\/+$/g, "");
    const endpoint = `${baseUrl}/api/generate`;
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: normalizeText(payload.model, "llama3.1"),
        prompt: buildPrompt(payload),
        format: "json",
        stream: false
      })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama request failed (${response.status}): ${text.slice(0, 180)}`);
    }
    const json = await response.json();
    return normalizeText(json?.response);
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

  ipcMain.handle("suggestions:recommend-games", async (_event, payload = {}) => {
    const provider = normalizeProvider(payload.provider);
    const mode = normalizeMode(payload.mode);
    const safePayload = {
      ...payload,
      provider,
      mode,
      limit: Math.max(3, Math.min(12, Number(payload.limit) || 8)),
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
}

module.exports = {
  registerSuggestionsIpc
};
