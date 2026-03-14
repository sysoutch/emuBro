import { normalizeNameKey } from "./library-data";

const SUPPORT_MATCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "app",
  "ask",
  "about",
  "cant",
  "cannot",
  "count",
  "could",
  "does",
  "dont",
  "emu",
  "emubro",
  "emuros",
  "emulator",
  "emulators",
  "feature",
  "for",
  "from",
  "game",
  "games",
  "get",
  "have",
  "help",
  "how",
  "i",
  "in",
  "is",
  "it",
  "launch",
  "launcher",
  "me",
  "my",
  "many",
  "not",
  "number",
  "of",
  "on",
  "or",
  "please",
  "setup",
  "something",
  "support",
  "tell",
  "that",
  "the",
  "them",
  "they",
  "this",
  "to",
  "use",
  "what",
  "why",
  "with"
]);

const SUPPORT_CASUAL_CHAT_PATTERNS = [
  /^(hi|hello|hey|yo|sup|thanks|thank you|thx|good morning|good afternoon|good evening)\b[!.? ]*$/i,
  /^(how are you|what'?s up|whats up)\b[!? ]*$/i
];

const SUPPORT_LIBRARY_INTENT_PATTERNS = [
  /\bhow many\b/i,
  /\bcount\b/i,
  /\bnumber of\b/i,
  /\bdo i have\b/i,
  /\bhave any\b/i,
  /\bin my library\b/i,
  /\bfrom my library\b/i,
  /\bmy (games|game|emulators|emulator|roms|rom|titles|title|library)\b/i,
  /\b(list|show|find|search)\b.*\b(games|game|emulators|emulator|roms|rom|titles|title|library)\b/i,
  /\b(which|what)\b.*\b(games|game|emulators|emulator|roms|rom|titles|title)\b/i,
  /\b(installed|owned)\b.*\b(games|game|emulators|emulator|roms|rom|titles|title)\b/i
];

function normalizeSupportText(value) {
  return normalizeNameKey(String(value || "").trim());
}

function isCasualChatMessage(value) {
  const text = String(value || "").trim();
  if (!text) {
    return true;
  }
  return SUPPORT_CASUAL_CHAT_PATTERNS.some((pattern) => pattern.test(text));
}

export function inferSupportLibraryIntent({
  issueSummary = ""
} = {}) {
  const text = String(issueSummary || "").trim();
  if (!text) {
    return {
      active: false,
      reason: "empty"
    };
  }
  if (isCasualChatMessage(text)) {
    return {
      active: false,
      reason: "casual-chat"
    };
  }
  if (SUPPORT_LIBRARY_INTENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      active: true,
      reason: "explicit-library-query"
    };
  }
  return {
    active: false,
    reason: "general-chat"
  };
}

function tokenizeSupportText(value) {
  const normalized = normalizeSupportText(value);
  if (!normalized) {
    return [];
  }
  return Array.from(
    new Set(
      normalized
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !SUPPORT_MATCH_STOP_WORDS.has(token))
    )
  );
}

function scoreTokenPresence(haystack, tokens, strongWeight, weakWeight = 0) {
  if (!haystack || !tokens.length) {
    return 0;
  }

  let score = 0;
  tokens.forEach((token) => {
    if (!haystack.includes(token)) {
      return;
    }
    score += strongWeight;
    if (token.length >= 6) {
      score += weakWeight;
    }
  });
  return score;
}

function scoreExactPhrase(haystack, phrase, weight) {
  if (!haystack || !phrase) {
    return 0;
  }
  return haystack.includes(phrase) ? weight : 0;
}

function rankMatches(rows, buildEntry, minimumScore = 20, limit = 6) {
  const ranked = (Array.isArray(rows) ? rows : [])
    .map((row) => buildEntry(row))
    .filter((entry) => entry && entry.score >= minimumScore)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return String(left.label || "").localeCompare(String(right.label || ""));
    });

  return {
    total: ranked.length,
    rows: ranked.slice(0, limit).map((entry) => entry.row)
  };
}

export function resolveSupportLibraryMatches({
  games = [],
  emulators = [],
  issueSummary = "",
  platform = "",
  emulator = ""
} = {}) {
  const intent = inferSupportLibraryIntent({ issueSummary });
  if (!intent.active) {
    return {
      active: false,
      reason: intent.reason,
      query: "",
      games: [],
      emulators: [],
      gameCount: 0,
      emulatorCount: 0
    };
  }

  const issuePhrase = normalizeSupportText(issueSummary);
  const platformPhrase = normalizeSupportText(platform);
  const emulatorPhrase = normalizeSupportText(emulator);
  const issueTokens = tokenizeSupportText(issueSummary);
  const platformTokens = tokenizeSupportText(platform);
  const emulatorTokens = tokenizeSupportText(emulator);
  const combinedTokens = Array.from(new Set([
    ...issueTokens,
    ...platformTokens,
    ...emulatorTokens
  ]));

  const matchedGames = rankMatches(games, (row) => {
    const name = normalizeSupportText(row?.name);
    const meta = normalizeSupportText([
      row?.platform,
      row?.platformShortName,
      row?.genre,
      row?.company,
      row?.description,
      Array.isArray(row?.tags) ? row.tags.join(" ") : ""
    ].join(" "));
    let score = 0;
    score += scoreExactPhrase(name, issuePhrase, 72);
    score += scoreTokenPresence(name, combinedTokens, 18, 5);
    score += scoreTokenPresence(meta, combinedTokens, 7, 2);
    score += scoreExactPhrase(meta, platformPhrase, 20);
    score += scoreTokenPresence(meta, platformTokens, 10, 0);
    return {
      row,
      score,
      label: row?.name || ""
    };
  });

  const matchedEmulators = rankMatches(emulators, (row) => {
    const name = normalizeSupportText(row?.name);
    const meta = normalizeSupportText([
      row?.platform,
      row?.platformShortName,
      row?.type,
      row?.description,
      row?.website,
      row?.filePath
    ].join(" "));
    let score = 0;
    score += scoreExactPhrase(name, emulatorPhrase, 80);
    score += scoreExactPhrase(name, issuePhrase, 56);
    score += scoreTokenPresence(name, combinedTokens, 18, 5);
    score += scoreTokenPresence(meta, combinedTokens, 8, 2);
    score += scoreExactPhrase(meta, platformPhrase, 24);
    score += scoreTokenPresence(meta, platformTokens, 12, 0);
    return {
      row,
      score,
      label: row?.name || ""
    };
  });

  return {
    active: true,
    reason: intent.reason,
    query: String(issueSummary || "").trim(),
    games: matchedGames.rows,
    emulators: matchedEmulators.rows,
    gameCount: matchedGames.total,
    emulatorCount: matchedEmulators.total
  };
}
