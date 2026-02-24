function createThemeTagSuggestionsService(deps = {}) {
  const normalizeText = typeof deps.normalizeText === "function"
    ? deps.normalizeText
    : ((value, fallback = "") => {
      const text = String(value ?? "").trim();
      return text || fallback;
    });

  function extractJsonFromText(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return null;

    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch ? fencedMatch[1].trim() : text;
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;

    const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonSlice);
    } catch (_error) {
      return null;
    }
  }

  function getThemeAccentGuidance(payload = {}) {
    const mood = normalizeText(payload.mood).toLowerCase();
    const style = normalizeText(payload.style).toLowerCase();
    const allowBlue = style.includes("cyber") || style.includes("water") || mood.includes("calm");
    let hint = "balanced warm-vs-cool, but avoid defaulting to blue";

    if (style.includes("nature") || mood.includes("cozy")) {
      hint = "green, olive, amber, moss, earthy tones";
    } else if (style.includes("horror") || mood.includes("dark") || mood.includes("mysterious")) {
      hint = "deep crimson, rust, violet, toxic green accents";
    } else if (style.includes("retro") || style.includes("arcade") || mood.includes("playful")) {
      hint = "bold arcade accents: orange, lime, magenta, yellow";
    } else if (style.includes("fantasy") || mood.includes("epic")) {
      hint = "gold, emerald, ruby, amethyst accents";
    } else if (style.includes("minimal")) {
      hint = "subtle but distinct non-blue accents (muted coral, moss, warm amber)";
    }

    return { hint, allowBlue };
  }

  function normalizeHexColor(value, fallback = "") {
    const text = normalizeText(value).replace(/^#/, "");
    if (!text) return fallback;
    if (/^[0-9a-f]{3}$/i.test(text)) {
      const expanded = text.split("").map((c) => `${c}${c}`).join("");
      return `#${expanded.toLowerCase()}`;
    }
    if (!/^[0-9a-f]{6}$/i.test(text)) return fallback;
    return `#${text.toLowerCase()}`;
  }

  function hexToRgbSafe(hex) {
    const normalized = normalizeHexColor(hex, "");
    if (!normalized) return null;
    const raw = normalized.slice(1);
    const r = Number.parseInt(raw.slice(0, 2), 16);
    const g = Number.parseInt(raw.slice(2, 4), 16);
    const b = Number.parseInt(raw.slice(4, 6), 16);
    if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null;
    return { r, g, b };
  }

  function rgbToHslSafe(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const delta = max - min;
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === rn) {
        h = 60 * (((gn - bn) / delta) % 6);
      } else if (max === gn) {
        h = 60 * (((bn - rn) / delta) + 2);
      } else {
        h = 60 * (((rn - gn) / delta) + 4);
      }
    }
    if (h < 0) h += 360;
    return { h, s, l };
  }

  function isBlueishHex(hex) {
    const rgb = hexToRgbSafe(hex);
    if (!rgb) return false;
    const hsl = rgbToHslSafe(rgb.r, rgb.g, rgb.b);
    return hsl.h >= 180 && hsl.h <= 265;
  }

  function deterministicPalettePick(seedText = "", palette = []) {
    const source = String(seedText || "seed");
    let hash = 0;
    for (let i = 0; i < source.length; i += 1) {
      hash = ((hash << 5) - hash) + source.charCodeAt(i);
      hash |= 0;
    }
    const index = Math.abs(hash) % Math.max(1, palette.length);
    return palette[index] || palette[0] || "#ff8c42";
  }

  function darkenHexSimple(hex, percent = 26) {
    const rgb = hexToRgbSafe(hex);
    if (!rgb) return "#8c5a2b";
    const f = Math.max(0, Math.min(100, Number(percent) || 26)) / 100;
    const nextR = Math.max(0, Math.min(255, Math.round(rgb.r * (1 - f))));
    const nextG = Math.max(0, Math.min(255, Math.round(rgb.g * (1 - f))));
    const nextB = Math.max(0, Math.min(255, Math.round(rgb.b * (1 - f))));
    const out = `#${nextR.toString(16).padStart(2, "0")}${nextG.toString(16).padStart(2, "0")}${nextB.toString(16).padStart(2, "0")}`;
    return normalizeHexColor(out, "#8c5a2b");
  }

  function normalizeThemeTextEffectMode(value) {
    const mode = normalizeText(value).toLowerCase();
    const allowed = new Set(["none", "glow", "neon", "gradient", "metallic", "hologram", "scanline", "arcade"]);
    if (!allowed.has(mode)) return "none";
    return mode;
  }

  function buildThemeGenerationPrompt(payload = {}) {
    const mood = normalizeText(payload.mood, "balanced");
    const style = normalizeText(payload.style, "arcade");
    const notes = normalizeText(payload.notes);
    const extraPrompt = normalizeText(payload.extraPrompt);
    const energy = Math.max(0, Math.min(100, Number(payload.energy) || 55));
    const saturation = Math.max(0, Math.min(100, Number(payload.saturation) || 62));
    const variationSeed = normalizeText(payload.variationSeed || `${mood}|${style}|${energy}|${saturation}`);
    const preferTextEffect = !!payload.preferTextEffect;
    const applyEffectToLogo = !!payload.applyEffectToLogo;
    const currentColors = payload.currentColors && typeof payload.currentColors === "object"
      ? payload.currentColors
      : {};

    const accentGuidance = getThemeAccentGuidance(payload);

    return [
      "You are an emuBro theme generator.",
      "Create a cohesive, high-contrast gaming UI palette with strong readability.",
      "Avoid boring defaults. Prioritize unique but practical color combinations.",
      "Return strict JSON only with keys: summary, colors, textEffect.",
      "",
      "Required colors (hex):",
      "- bgPrimary, bgSecondary, bgTertiary",
      "- textPrimary, textSecondary",
      "- accentColor, accentLight, borderColor, brandColor",
      "- btnBg, btnText, btnHover, btnActive",
      "- dangerColor, successColor, warningColor, infoColor",
      "",
      "Text effect object keys:",
      "- mode (none|glow|neon|gradient|metallic|hologram|scanline|arcade)",
      "- speed (0..100)",
      "- intensity (0..100)",
      "- colorA, colorB (hex)",
      "- applyToLogo (boolean)",
      "",
      "Guidance:",
      `- mood: ${mood}`,
      `- style: ${style}`,
      `- energy: ${energy}`,
      `- saturation: ${saturation}`,
      `- variationSeed: ${variationSeed}`,
      `- accent preference: ${accentGuidance.hint}`,
      `- blue accents allowed: ${accentGuidance.allowBlue ? "yes" : "no"}`,
      `- prefer text effect: ${preferTextEffect ? "yes" : "no"}`,
      `- apply effect to logo: ${applyEffectToLogo ? "yes" : "no"}`,
      notes ? `- notes: ${notes}` : "",
      extraPrompt ? `- extra prompt: ${extraPrompt}` : "",
      "",
      "Current color context (optional):",
      JSON.stringify(currentColors),
      "",
      "Rules:",
      "- Use valid 6-digit hex colors.",
      "- Ensure textPrimary/readability against bgPrimary is strong.",
      "- Keep button contrast clear.",
      "- Keep summary under 20 words."
    ].filter(Boolean).join("\n");
  }

  function parseThemeGenerationPayload(rawModelText, payload = {}) {
    const parsed = extractJsonFromText(rawModelText) || {};
    const colorsInput = (parsed.colors && typeof parsed.colors === "object") ? parsed.colors : {};
    const summary = normalizeText(parsed.summary, "Generated theme palette");
    const mood = normalizeText(payload.mood, "balanced");
    const style = normalizeText(payload.style, "arcade");
    const saturation = Math.max(0, Math.min(100, Number(payload.saturation) || 62));
    const variationSeed = normalizeText(payload.variationSeed || `${mood}|${style}|${saturation}`);
    const accentGuidance = getThemeAccentGuidance(payload);
    const warmPalette = ["#ff8c42", "#ff6b35", "#f4b400", "#ff4f64", "#ff9f1c", "#e76f51", "#ef476f", "#f9844a", "#f94144"];
    const coolPalette = ["#2ec4b6", "#00bcd4", "#4cc9f0", "#06d6a0", "#90be6d", "#43aa8b"];
    const accentPalette = accentGuidance.allowBlue ? [...warmPalette, ...coolPalette] : warmPalette;
    const fallbackAccent = deterministicPalettePick(`${variationSeed}|accent`, accentPalette);

    const outColors = {
      bgPrimary: normalizeHexColor(colorsInput.bgPrimary, "#0d1220"),
      bgSecondary: normalizeHexColor(colorsInput.bgSecondary, "#141c2f"),
      bgTertiary: normalizeHexColor(colorsInput.bgTertiary, "#1b2540"),
      textPrimary: normalizeHexColor(colorsInput.textPrimary, "#f5f7ff"),
      textSecondary: normalizeHexColor(colorsInput.textSecondary, "#b8c0da"),
      accentColor: normalizeHexColor(colorsInput.accentColor, fallbackAccent),
      accentLight: normalizeHexColor(colorsInput.accentLight, normalizeHexColor(colorsInput.accentColor, fallbackAccent)),
      borderColor: normalizeHexColor(colorsInput.borderColor, "#2d3a60"),
      brandColor: normalizeHexColor(colorsInput.brandColor, normalizeHexColor(colorsInput.accentColor, fallbackAccent)),
      btnBg: normalizeHexColor(colorsInput.btnBg, normalizeHexColor(colorsInput.bgSecondary, "#141c2f")),
      btnText: normalizeHexColor(colorsInput.btnText, normalizeHexColor(colorsInput.textPrimary, "#f5f7ff")),
      btnHover: normalizeHexColor(colorsInput.btnHover, normalizeHexColor(colorsInput.accentLight, fallbackAccent)),
      btnActive: normalizeHexColor(colorsInput.btnActive, darkenHexSimple(normalizeHexColor(colorsInput.accentColor, fallbackAccent), 20)),
      dangerColor: normalizeHexColor(colorsInput.dangerColor, "#ff4d5a"),
      successColor: normalizeHexColor(colorsInput.successColor, "#2ecc71"),
      warningColor: normalizeHexColor(colorsInput.warningColor, "#f5b942"),
      infoColor: normalizeHexColor(colorsInput.infoColor, "#4ea8de")
    };

    if (!accentGuidance.allowBlue && isBlueishHex(outColors.accentColor)) {
      outColors.accentColor = fallbackAccent;
      outColors.accentLight = deterministicPalettePick(`${variationSeed}|accentLight`, accentPalette);
      outColors.brandColor = outColors.accentColor;
      outColors.btnHover = outColors.accentLight;
      outColors.btnActive = darkenHexSimple(outColors.accentColor, 20);
    }

    const textEffectInput = (parsed.textEffect && typeof parsed.textEffect === "object") ? parsed.textEffect : {};
    const textEffect = {
      mode: normalizeThemeTextEffectMode(textEffectInput.mode),
      speed: Math.max(0, Math.min(100, Number(textEffectInput.speed) || 40)),
      intensity: Math.max(0, Math.min(100, Number(textEffectInput.intensity) || 45)),
      colorA: normalizeHexColor(textEffectInput.colorA, outColors.accentColor),
      colorB: normalizeHexColor(textEffectInput.colorB, outColors.accentLight),
      applyToLogo: typeof textEffectInput.applyToLogo === "boolean" ? textEffectInput.applyToLogo : !!payload.applyEffectToLogo
    };

    return {
      summary,
      colors: outColors,
      textEffect
    };
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

  function normalizeNameForMatch(value) {
    const stripped = stripBracketedTitleParts(value);
    return String(stripped || value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
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
    if (Array.isArray(parsed?.tag_ids)) parsed.tag_ids.forEach(pushSource);
    if (Array.isArray(parsed?.categories)) parsed.categories.forEach(pushSource);
    if (Array.isArray(parsed?.labels)) parsed.labels.forEach(pushSource);
    if (parsed?.tag && typeof parsed.tag === "string") pushSource(parsed.tag);
    if (parsed?.id && typeof parsed.id === "string") pushSource(parsed.id);
    return sourceList;
  }

  function resolveTagSourcesToIds(sourceList, options = {}) {
    const { idMap, labelMap, aliasMap } = createTagResolutionMaps(options.catalogRows);
    const out = [];
    const seen = new Set();
    (Array.isArray(sourceList) ? sourceList : []).forEach((source) => {
      const raw = sanitizeTagSource(source);
      if (!raw) return;
      const lower = raw.toLowerCase();
      const alias = normalizeTagAlias(raw);
      const resolved = idMap.get(lower) || labelMap.get(lower) || aliasMap.get(alias) || "";
      if (!resolved) return;
      const key = resolved.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(resolved);
    });
    return out;
  }

  function buildTagSuggestionPrompt(payload) {
    const maxTags = Math.max(1, Math.min(12, Number(payload.maxTags) || 6));
    const game = payload.game || {};
    const tags = normalizeTagCatalogRows(payload.availableTags);

    return [
      "You are emuBro's game tagging assistant.",
      "Return strict JSON only.",
      "",
      "Output shape:",
      "{",
      '  "tags": ["tag-id-1", "tag-id-2"],',
      '  "reason": "short explanation"',
      "}",
      "",
      "Rules:",
      `- Select up to ${maxTags} tags.`,
      "- Use only IDs from availableTags unless allowUnknownTags is true.",
      "- Prefer precise gameplay/genre/theme tags.",
      "",
      `allowUnknownTags=${payload.allowUnknownTags ? "true" : "false"}`,
      "availableTags:",
      JSON.stringify(tags),
      "",
      "game:",
      JSON.stringify({
        id: Number(game.id || 0),
        name: normalizeText(game.name),
        platform: normalizeText(game.platform || game.platformShortName),
        genre: normalizeText(game.genre),
        description: normalizeText(game.description),
        tags: Array.isArray(game.tags) ? game.tags : []
      })
    ].join("\n");
  }

  function buildBatchTagSuggestionPrompt(payload) {
    const maxTags = Math.max(1, Math.min(12, Number(payload.maxTags) || 6));
    const tags = normalizeTagCatalogRows(payload.availableTags);
    const groupedRows = buildGroupedTagPromptRows(payload.games);

    return [
      "You are emuBro's batch game tagging assistant.",
      "Return strict JSON only.",
      "",
      "Output shape:",
      "{",
      '  "summary": "short summary",',
      '  "results": [',
      '    { "groupId": "group-1", "tags": ["tag-id"], "reason": "short reason" }',
      "  ]",
      "}",
      "",
      "Rules:",
      `- Assign up to ${maxTags} tags per group.`,
      "- Use only IDs from availableTags unless allowUnknownTags is true.",
      "- Every result.groupId must exist in groupedGames.",
      "- Keep reasons concise.",
      "",
      `allowUnknownTags=${payload.allowUnknownTags ? "true" : "false"}`,
      "availableTags:",
      JSON.stringify(tags),
      "",
      "groupedGames:",
      JSON.stringify(groupedRows)
    ].join("\n");
  }

  function parseTagSuggestionPayload(rawModelText, payload) {
    const parsed = extractJsonFromText(rawModelText) || {};
    const sourceList = collectTagSourcesFromParsed(parsed);
    let tags = resolveTagSourcesToIds(sourceList, { catalogRows: payload.availableTags });

    if (payload.allowUnknownTags && (!tags.length || sourceList.length > tags.length)) {
      const unknowns = sourceList
        .map((entry) => normalizeTagId(entry))
        .filter(Boolean)
        .filter((entry) => !tags.includes(entry));
      tags = [...tags, ...unknowns];
    }

    const maxTags = Math.max(1, Math.min(12, Number(payload.maxTags) || 6));
    return {
      tags: tags.slice(0, maxTags),
      reason: normalizeText(parsed.reason, "Suggested based on title/genre.")
    };
  }

  function parseBatchTagSuggestionPayload(rawModelText, payload) {
    const parsed = extractJsonFromText(rawModelText) || {};
    const groupedRows = buildGroupedTagPromptRows(payload.games);
    const groupIdSet = new Set(groupedRows.map((row) => row.groupId));
    const maxTags = Math.max(1, Math.min(12, Number(payload.maxTags) || 6));
    const inputResults = Array.isArray(parsed.results) ? parsed.results : [];

    const results = [];
    inputResults.forEach((entry) => {
      const groupId = normalizeText(entry?.groupId);
      if (!groupId || !groupIdSet.has(groupId)) return;
      const sourceList = collectTagSourcesFromParsed(entry);
      let tags = resolveTagSourcesToIds(sourceList, { catalogRows: payload.availableTags });

      if (payload.allowUnknownTags && (!tags.length || sourceList.length > tags.length)) {
        const unknowns = sourceList
          .map((raw) => normalizeTagId(raw))
          .filter(Boolean)
          .filter((id) => !tags.includes(id));
        tags = [...tags, ...unknowns];
      }

      results.push({
        groupId,
        tags: tags.slice(0, maxTags),
        reason: normalizeText(entry?.reason, "Suggested from grouped variants/platform metadata.")
      });
    });

    return {
      summary: normalizeText(parsed.summary, "Batch tagging suggestions generated."),
      results
    };
  }

  return {
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
  };
}

module.exports = {
  createThemeTagSuggestionsService
};
