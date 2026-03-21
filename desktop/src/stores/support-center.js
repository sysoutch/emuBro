import { defineStore } from "pinia";
import { useAppStore } from "./app";
import { useCoverDownloaderStore } from "./cover-downloader";
import { useHeaderFiltersStore } from "./header-filters";
import { useSettingsToolsStore } from "./settings-tools";
import { useShellLanguageStore } from "./shell-language";
import { useShellThemeStore } from "./shell-theme";
import {
  buildSupportLlmSettings,
  loadDesktopLlmSettings
} from "../utils/llm-settings";
import { resolveEffectiveEmulatorConfig, saveStoredEmulatorConfig } from "../utils/emulator-config";
import { loadSelectedLaunchPath } from "../utils/emulator-preferences";
import { readNativeShellState, writeNativeShellState } from "../utils/shell-state";
import { getShellStorageValue, setShellStorageValue } from "../utils/shell-storage-cache";
import { resolveSupportLibraryMatches } from "../utils/support-library-matches";
import { useWorkspaceStore } from "./workspace";

const SUPPORT_DRAFT_STORAGE_KEY = "emuBro.supportDraft.v1";
const SUPPORT_CHAT_HISTORY_STORAGE_KEY = "emuBro.supportChatHistory.v1";
const SUPPORT_DEBUG_STORAGE_KEY = "emuBro.supportDebug.v1";
const SUPPORT_AUTO_SPECS_STORAGE_KEY = "emuBro.supportAutoSpecs.v1";
const SUPPORT_WEB_ACCESS_STORAGE_KEY = "emuBro.supportWebAccess.v1";
const SUPPORT_HELP_STATE_STORAGE_KEY = "emuBro.supportHelpState.v1";
const SUPPORT_MODE_QUERY_KEY = "supportMode";
const SUPPORT_STATE_KEY = "support-center";
const SUPPORT_TASK_PROTOCOL = "shell-v1";
const SUPPORT_RESPONSE_TYPE_REPLY = "reply";
const SUPPORT_RESPONSE_TYPE_TASK = "task";
const SUPPORT_RESPONSE_TYPE_BLOCKED = "blocked";
const SUPPORT_ASSISTANT_TASK_FETCH_SPECS = "FETCH_SPECS";
const SUPPORT_ASSISTANT_TASK_RUN_GAME = "RUN_GAME";
const SUPPORT_ASSISTANT_TASK_RUN_EMULATOR = "RUN_EMULATOR";
const SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR = "DOWNLOAD_INSTALL_EMULATOR";
const SUPPORT_ASSISTANT_TASK_READ_LIBRARY = "READ_LIBRARY";
const SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY = "REFRESH_LIBRARY";
const SUPPORT_ASSISTANT_TASK_ADD_TAGS = "ADD_TAGS";
const SUPPORT_ASSISTANT_TASK_REMOVE_TAGS = "REMOVE_TAGS";
const SUPPORT_ASSISTANT_TASK_LIST_TAGS = "LIST_TAGS";
const SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS = "LIST_HELP_DOCS";
const SUPPORT_ASSISTANT_TASK_READ_HELP_DOC = "READ_HELP_DOC";
const SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS = "LIST_SELF_TASK_DOCS";
const SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC = "READ_SELF_TASK_DOC";
const SUPPORT_ASSISTANT_TASK_RELEASE_DATE = "RELEASE_DATE";
const SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE = "GAME_RELEASE_DATE";
const SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER = "FETCH_GAME_COVER";
const SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER = "ADD_GAME_COVER";
const SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW = "OPEN_YOUTUBE_PREVIEW";
const SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL = "OPEN_EXTERNAL_URL";
const SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL = "OPEN_SETTINGS_PANEL";
const SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE = "CHANGE_SUPPORT_MODE";
const SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM = "CHANGE_PLATFORM";
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR = "CHANGE_EMULATOR";
const SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE = "CHANGE_ISSUE_TYPE";
const SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY = "CHANGE_ISSUE_SUMMARY";
const SUPPORT_ASSISTANT_TASK_APPEND_DETAILS = "APPEND_DETAILS";
const SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD = "CLEAR_SUPPORT_FIELD";
const SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION = "CLEAR_SUPPORT_SESSION";
const SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS = "TOGGLE_AUTO_SPECS";
const SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS = "TOGGLE_WEB_ACCESS";
const SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT = "TOGGLE_DEBUG_CONTEXT";
const SUPPORT_ASSISTANT_TASK_CHANGE_THEME = "CHANGE_THEME";
const SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE = "CHANGE_LANGUAGE";
const SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS = "DOWNLOAD_LIBRARY_COVERS";
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION = "CHANGE_LIBRARY_SECTION";
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW = "CHANGE_LIBRARY_VIEW";
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH = "CHANGE_LIBRARY_SEARCH";
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER = "CHANGE_LIBRARY_PLATFORM_FILTER";
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT = "CHANGE_LIBRARY_SORT";
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE = "CHANGE_LIBRARY_EMULATOR_TYPE";
const SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS = "CLEAR_LIBRARY_FILTERS";
const SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS = "OPEN_GAME_DETAILS";
const SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS = "OPEN_EMULATOR_DETAILS";
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE = "CHANGE_EMULATOR_WEBSITE";
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS = "CHANGE_EMULATOR_LAUNCH_ARGS";
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY = "CHANGE_EMULATOR_WORKING_DIRECTORY";
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH = "CHANGE_EMULATOR_CONFIG_PATH";
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE = "CHANGE_EMULATOR_RUN_COMMANDS_BEFORE";
const SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS = "CLEAR_EMULATOR_OVERRIDE_FIELDS";
const SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE = 0.55;
const SUPPORT_MAX_AUTO_TASK_DEPTH = 3;
const PC_SPECS_BLOCK_HEADER = "[PC Specs]";
const SUPPORT_STREAM_EVENT_NAME = "emubro:support-stream";
const SUPPORT_CONTEXT_WINDOW_OPTIONS = [10, 20, 40, 80];
const SUPPORT_CONTEXT_WINDOW_DEFAULT = 20;
const SUPPORT_LIBRARY_QUERY_LIMIT = 1200;

let supportStreamUnsubscribe = null;

const ISSUE_TYPES = [
  { value: "launch", label: "Game does not launch" },
  { value: "performance", label: "Low FPS / stutter" },
  { value: "audio", label: "Audio crackling or delay" },
  { value: "controls", label: "Controller not detected" },
  { value: "graphics", label: "Visual glitches / black screen" },
  { value: "save", label: "Save or memory card issues" },
  { value: "bios", label: "BIOS missing / invalid" },
  { value: "network", label: "Netplay / online issues" },
  { value: "other", label: "Other emulation issue" }
];

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function readStorageBoolean(key, fallback = false) {
  return String(getShellStorageValue(key, fallback ? "true" : "false")) === "true";
}

function writeStorageBoolean(key, value) {
  setShellStorageValue(key, value ? "true" : "false");
}

function readStorageJson(key, fallback, normalize) {
  try {
    const raw = getShellStorageValue(key, "");
    if (!raw) return normalize(fallback);
    return normalize(JSON.parse(raw));
  } catch (_error) {
    return normalize(fallback);
  }
}

function writeStorageJson(key, value, normalize) {
  setShellStorageValue(key, JSON.stringify(normalize(value)));
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return mode === "chat" || mode === "help" ? mode : "troubleshoot";
}

function normalizeIssueType(value) {
  const issueType = String(value || "").trim().toLowerCase();
  return ISSUE_TYPES.some((row) => row.value === issueType) ? issueType : "launch";
}

function normalizeSupportDraft(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    mode: normalizeMode(source.mode),
    issueType: normalizeIssueType(source.issueType),
    issueSummary: String(source.issueSummary || "").trim(),
    platform: String(source.platform || "").trim(),
    emulator: String(source.emulator || "").trim(),
    errorText: String(source.errorText || "").trim(),
    details: String(source.details || "").trim()
  };
}

function normalizeSupportHelpState(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    query: String(source.query || "").trim(),
    selectedDocId: String(source.selectedDocId || "").trim()
  };
}

function readLocationSupportMode() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (sectionId !== "support-center" && sectionId !== "support") {
      return "";
    }
    return normalizeMode(currentUrl.searchParams.get(SUPPORT_MODE_QUERY_KEY));
  } catch (_error) {
    return "";
  }
}

function syncLocationSupportMode(mode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentUrl = new URL(window.location.href);
    const sectionId = String(currentUrl.searchParams.get("section") || "").trim().toLowerCase();
    if (sectionId !== "support-center" && sectionId !== "support") {
      return;
    }

    const normalized = normalizeMode(mode);
    if (normalized === "troubleshoot") {
      currentUrl.searchParams.delete(SUPPORT_MODE_QUERY_KEY);
    } else {
      currentUrl.searchParams.set(SUPPORT_MODE_QUERY_KEY, normalized);
    }
    window.history.replaceState({}, "", currentUrl.toString());
  } catch (_error) {}
}

function normalizeSupportChatHistory(raw, contextWindowMessages = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
  return normalizeSupportChatHistoryWithLimit(raw, contextWindowMessages);
}

function normalizeSupportContextWindowMessages(value, fallback = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
  const parsed = Number(value);
  const normalizedFallback = SUPPORT_CONTEXT_WINDOW_OPTIONS.includes(Number(fallback))
    ? Number(fallback)
    : SUPPORT_CONTEXT_WINDOW_DEFAULT;
  if (!Number.isFinite(parsed)) {
    return normalizedFallback;
  }
  const rounded = Math.round(parsed);
  return SUPPORT_CONTEXT_WINDOW_OPTIONS.includes(rounded)
    ? rounded
    : normalizedFallback;
}

function normalizeSupportChatHistoryWithLimit(raw, contextWindowMessages = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
  const limit = normalizeSupportContextWindowMessages(contextWindowMessages, SUPPORT_CONTEXT_WINDOW_DEFAULT);
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((entry) => ({
      role: String(entry?.role || "").trim().toLowerCase() === "assistant" ? "assistant" : "user",
      text: String(entry?.text || "").trim(),
      attachments: normalizeSupportMessageAttachments(entry?.attachments)
    }))
    .filter((entry) => entry.text || entry.attachments.length > 0)
    .slice(-limit);
}

function normalizeSupportMessageAttachments(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((entry) => {
      const kind = String(entry?.kind || entry?.type || "").trim().toLowerCase();
      if (kind !== "cover") {
        return null;
      }
      const imageUrl = String(entry?.imageUrl || entry?.image || entry?.src || "").trim();
      const thumbnailUrl = String(entry?.thumbnailUrl || entry?.thumbUrl || imageUrl).trim();
      if (!imageUrl && !thumbnailUrl) {
        return null;
      }
      const gameId = Number(entry?.gameId || 0);
      return {
        kind: "cover",
        title: String(entry?.title || entry?.name || "").trim(),
        subtitle: String(entry?.subtitle || entry?.platform || "").trim(),
        imageUrl: imageUrl || thumbnailUrl,
        thumbnailUrl: thumbnailUrl || imageUrl,
        source: String(entry?.source || "").trim(),
        sourceUrl: String(entry?.sourceUrl || entry?.pageUrl || "").trim(),
        pageUrl: String(entry?.pageUrl || entry?.sourceUrl || "").trim(),
        gameId: Number.isFinite(gameId) && gameId > 0 ? gameId : 0,
        gameKey: String(entry?.gameKey || "").trim()
      };
    })
    .filter(Boolean)
    .slice(0, 6);
}

function looksLikeDefaultSupportImage(value) {
  const image = String(value || "").trim().toLowerCase();
  if (!image) {
    return true;
  }
  return image.includes("/default.png")
    || image.includes("/default.jpg")
    || image.includes("/default.jpeg")
    || image.includes("/default.webp");
}

function buildSupportCoverSearchQuery(gameRow = null, fallbackQuery = "") {
  const gameName = String(gameRow?.name || fallbackQuery || "").trim();
  const platform = String(gameRow?.platform || gameRow?.platformShortName || "").trim();
  return [gameName, platform, "cover"]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function normalizeSupportCoverSearchTokens(value = "") {
  const stopWords = new Set([
    "a", "an", "and", "art", "artwork", "box", "cover", "covers", "display", "edition",
    "fetch", "for", "game", "image", "images", "me", "of", "poster", "preview", "show",
    "the", "this"
  ]);
  return String(value || "")
    .toLowerCase()
    .replace(/[\(\)\[\]\{\}:_\-]+/g, " ")
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token && !stopWords.has(token) && (token.length >= 2 || /^\d+$/.test(token)));
}

function buildSupportCoverSearchNeedles(gameRow = null, fallbackQuery = "") {
  const query = String(gameRow?.name || fallbackQuery || "").trim();
  const tokens = normalizeSupportCoverSearchTokens(query);
  const platformTokens = normalizeSupportCoverSearchTokens(
    `${String(gameRow?.platform || "").trim()} ${String(gameRow?.platformShortName || "").trim()}`
  );
  return {
    query: query.toLowerCase(),
    tokens,
    platformTokens
  };
}

function scoreSupportCoverSearchResult(result = {}, gameRow = null, fallbackQuery = "") {
  const needles = buildSupportCoverSearchNeedles(gameRow, fallbackQuery);
  if (!needles.tokens.length && !needles.query) {
    return 1;
  }

  const haystack = [
    result?.title,
    result?.source,
    result?.pageUrl,
    result?.imageUrl,
    result?.thumbnailUrl
  ].map((value) => String(value || "").toLowerCase()).join(" ");
  if (!haystack) {
    return 0;
  }

  let score = 0;
  if (needles.query && haystack.includes(needles.query)) {
    score += 8;
  }
  needles.tokens.forEach((token) => {
    if (haystack.includes(token)) {
      score += 3;
    }
  });
  needles.platformTokens.forEach((token) => {
    if (haystack.includes(token)) {
      score += 1;
    }
  });
  return score;
}

function buildSupportCoverAttachmentFromGameRow(gameRow = null, source = "library") {
  const imageUrl = String(gameRow?.image || gameRow?.coverImage || "").trim();
  if (!imageUrl || looksLikeDefaultSupportImage(imageUrl)) {
    return null;
  }
  return normalizeSupportMessageAttachments([{
    kind: "cover",
    title: String(gameRow?.name || "").trim(),
    subtitle: String(gameRow?.platform || gameRow?.platformShortName || "").trim(),
    imageUrl,
    thumbnailUrl: imageUrl,
    source,
    gameId: Number(gameRow?.id || 0),
    gameKey: String(gameRow?.key || "").trim()
  }])[0] || null;
}

function buildSupportCoverAttachmentFromResult(result = {}, gameRow = null, source = "download") {
  const imageUrl = String(result?.imageUrl || result?.image || result?.thumbnailUrl || "").trim();
  if (!imageUrl) {
    return null;
  }
  return normalizeSupportMessageAttachments([{
    kind: "cover",
    title: String(gameRow?.name || result?.title || "").trim(),
    subtitle: String(gameRow?.platform || gameRow?.platformShortName || "").trim(),
    imageUrl,
    thumbnailUrl: String(result?.thumbnailUrl || imageUrl).trim(),
    source,
    sourceUrl: String(result?.sourceUrl || result?.pageUrl || "").trim(),
    pageUrl: String(result?.pageUrl || result?.sourceUrl || "").trim(),
    gameId: Number(gameRow?.id || 0),
    gameKey: String(gameRow?.key || "").trim()
  }])[0] || null;
}

function buildSupportCoverAttachmentsFromSearchResults(results = [], gameRow = null, limit = 4, fallbackQuery = "") {
  const cappedLimit = Math.max(1, Math.min(6, Number(limit) || 4));
  const gameName = String(gameRow?.name || fallbackQuery || "").trim();
  const filteredRows = (Array.isArray(results) ? results : [])
    .map((row, index) => ({
      row,
      index,
      score: scoreSupportCoverSearchResult(row, gameRow, gameName)
    }))
    .filter((entry) => entry.score > 0 || !gameName)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.row)
    .slice(0, cappedLimit);
  return normalizeSupportMessageAttachments(
    filteredRows.map((row) => ({
      kind: "cover",
      title: String(row?.title || gameRow?.name || "").trim(),
      subtitle: String(gameRow?.platform || gameRow?.platformShortName || "").trim(),
      imageUrl: String(row?.imageUrl || row?.thumbnailUrl || "").trim(),
      thumbnailUrl: String(row?.thumbnailUrl || row?.imageUrl || "").trim(),
      source: String(row?.source || "web").trim(),
      sourceUrl: String(row?.pageUrl || row?.imageUrl || "").trim(),
      pageUrl: String(row?.pageUrl || "").trim(),
      gameId: Number(gameRow?.id || 0),
      gameKey: String(gameRow?.key || "").trim()
    }))
  );
}

function collectRecentSupportCoverAttachments(chatHistory = []) {
  const rows = Array.isArray(chatHistory) ? chatHistory : [];
  const attachments = [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const entry = rows[index];
    if (String(entry?.role || "").trim().toLowerCase() !== "assistant") {
      continue;
    }
    const normalized = normalizeSupportMessageAttachments(entry?.attachments);
    normalized.forEach((attachment) => attachments.push(attachment));
  }
  return attachments;
}

function resolveSupportCoverAttachmentSelection(chatHistory = [], task = {}, gameRow = null) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const explicitImageUrl = String(
    args.imageUrl || args.image || args.url || args.coverUrl || args.thumbnailUrl || ""
  ).trim();
  if (explicitImageUrl) {
    return normalizeSupportMessageAttachments([{
      kind: "cover",
      title: String(gameRow?.name || args.gameName || args.title || "").trim(),
      subtitle: String(gameRow?.platform || gameRow?.platformShortName || "").trim(),
      imageUrl: explicitImageUrl,
      thumbnailUrl: String(args.thumbnailUrl || explicitImageUrl).trim(),
      source: String(args.source || "manual").trim(),
      sourceUrl: String(args.sourceUrl || args.pageUrl || explicitImageUrl).trim(),
      pageUrl: String(args.pageUrl || args.sourceUrl || "").trim(),
      gameId: Number(gameRow?.id || args.gameId || 0),
      gameKey: String(gameRow?.key || args.gameKey || "").trim()
    }])[0] || null;
  }

  const attachments = collectRecentSupportCoverAttachments(chatHistory);
  if (!attachments.length) {
    return null;
  }

  const selectionIndex = Math.max(
    0,
    Math.round(Number(args.index ?? args.selectionIndex ?? args.coverIndex ?? 1) || 1) - 1
  );
  const requestedQuery = String(
    args.query || args.gameName || args.title || args.name || gameRow?.name || ""
  ).trim().toLowerCase();
  const matching = requestedQuery
    ? attachments.filter((attachment) => {
        const text = [
          attachment?.title,
          attachment?.subtitle,
          attachment?.source,
          attachment?.sourceUrl
        ].map((value) => String(value || "").toLowerCase()).join(" ");
        if (gameRow?.id && Number(attachment?.gameId || 0) === Number(gameRow.id || 0)) {
          return true;
        }
        if (gameRow?.key && String(attachment?.gameKey || "").trim() === String(gameRow.key || "").trim()) {
          return true;
        }
        return requestedQuery ? text.includes(requestedQuery) : true;
      })
    : attachments;

  return matching[selectionIndex] || matching[0] || attachments[selectionIndex] || attachments[0] || null;
}

function resolveSupportIssueSummary(issueSummary, mode, chatHistory, activeUserMessage = "", allowHistoryFallback = false) {
  const direct = String(issueSummary || "").trim();
  if (direct) return direct;
  if (!allowHistoryFallback) {
    return "";
  }
  const active = String(activeUserMessage || "").trim();
  if (active) return active;
  if (String(mode || "").trim().toLowerCase() !== "chat") {
    return "";
  }
  const rows = Array.isArray(chatHistory) ? chatHistory : [];
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const entry = rows[index];
    if (String(entry?.role || "").trim().toLowerCase() !== "user") continue;
    const text = String(entry?.text || "").trim();
    if (text) return text;
  }
  return "";
}

function summarizeSupportLibraryRows(rows, kind = "game", limit = 12) {
  return (Array.isArray(rows) ? rows : [])
    .slice(0, Math.max(1, Number(limit) || 12))
    .map((row) => ({
      id: Number(row?.id || 0),
      key: String(row?.key || "").trim(),
      kind,
      name: String(row?.name || "").trim(),
      platform: String(row?.platform || row?.platformShortName || "").trim(),
      platformShortName: String(row?.platformShortName || "").trim(),
      tags: kind === "game"
        ? (Array.isArray(row?.tags)
          ? row.tags.map((value) => String(value || "").trim()).filter(Boolean)
          : [])
        : [],
      tagLabels: kind === "game"
        ? (Array.isArray(row?.tagLabels)
          ? row.tagLabels.map((value) => String(value || "").trim()).filter(Boolean)
          : [])
        : [],
      installed: kind === "emulator" ? !!(row?.isInstalled ?? row?.installed) : undefined,
      isInstalled: kind === "emulator" ? !!(row?.isInstalled ?? row?.installed) : undefined,
      filePath: kind === "emulator" ? String(row?.filePath || "").trim() : "",
      filePaths: kind === "emulator"
        ? (Array.isArray(row?.filePaths)
          ? row.filePaths.map((value) => String(value || "").trim()).filter(Boolean)
          : [])
        : [],
      downloadable: kind === "emulator" ? !!(row?.downloadUrl || row?.website || row?.downloadLinks) : undefined,
      type: kind === "emulator" ? String(row?.type || "").trim() : ""
    }))
    .filter((row) => row.name);
}

function normalizeSupportLibraryTaskQuery(task = {}) {
  const queries = normalizeSupportLibraryTaskQueries(task);
  return queries[0] || "";
}

function normalizeSupportLibraryTaskQueries(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const rows = [];
  const pushValues = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => pushValues(entry));
      return;
    }
    const text = String(value || "").trim();
    if (!text) return;
    rows.push(text);
  };
  pushValues(args.queries);
  pushValues(args.titles);
  pushValues(args.names);
  pushValues(args.games);
  if (!rows.length) {
    const single = String(
      args.query
        || args.search
        || args.searchQuery
        || args.title
        || args.gameName
        || args.emulatorName
        || args.name
        || ""
    ).trim();
    if (single) rows.push(single);
  }
  const seen = new Set();
  return rows.filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 24);
}

function normalizeSupportLibraryTaskKind(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const raw = String(args.kind || args.target || "").trim().toLowerCase();
  if (raw === "game" || raw === "games" || raw === "title" || raw === "titles" || raw === "rom" || raw === "roms") {
    return "games";
  }
  if (raw === "emulator" || raw === "emulators") {
    return "emulators";
  }
  if (args.gameId || args.gameKey || args.gameName) {
    return "games";
  }
  if (args.emulatorId || args.emulatorKey || args.emulatorName) {
    return "emulators";
  }
  return "all";
}

function normalizeSupportLibraryTaskLimit(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const parsed = Number(
    args.limit
      ?? args.maxResults
      ?? args.maxRows
      ?? SUPPORT_LIBRARY_QUERY_LIMIT
  );
  if (!Number.isFinite(parsed)) return SUPPORT_LIBRARY_QUERY_LIMIT;
  return Math.max(1, Math.min(5000, Math.round(parsed)));
}

function normalizeSupportReleaseDateQuery(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  return String(
    args.platform
      || args.platformName
      || args.shortName
      || args.name
      || args.query
      || args.value
      || ""
  ).trim();
}

function normalizeSupportReleaseDateRegions(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const raw = []
    .concat(args.region || [])
    .concat(args.regions || [])
    .concat(args.market || [])
    .concat(args.markets || []);
  const rows = (Array.isArray(raw) ? raw : [raw])
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const aliases = {
    usa: "us",
    na: "us",
    northamerica: "us",
    europe: "eu",
    eur: "eu",
    japan: "jp",
    jpn: "jp"
  };
  const seen = new Set();
  return rows
    .map((value) => aliases[value.replace(/[^a-z]/g, "")] || value)
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, 8);
}

function buildSupportReleaseDateSummary(platformRow = null, task = {}) {
  const releaseDate = platformRow?.releaseDate && typeof platformRow.releaseDate === "object" && !Array.isArray(platformRow.releaseDate)
    ? platformRow.releaseDate
    : {};
  const preferredRegions = normalizeSupportReleaseDateRegions(task);
  const entries = Object.entries(releaseDate)
    .map(([key, value]) => [String(key || "").trim().toLowerCase(), String(value || "").trim()])
    .filter(([key, value]) => key && value);
  if (!entries.length) {
    return {
      found: false,
      message: "",
      releaseDate: {}
    };
  }
  const entryMap = new Map(entries);
  const orderedKeys = preferredRegions.length
    ? preferredRegions.filter((key) => entryMap.has(key)).concat(entries.map(([key]) => key).filter((key) => !preferredRegions.includes(key)))
    : entries.map(([key]) => key);
  const lines = [];
  const emitted = new Set();
  orderedKeys.forEach((key) => {
    if (!entryMap.has(key) || emitted.has(key)) return;
    emitted.add(key);
    lines.push(`${key.toUpperCase()}: ${entryMap.get(key)}`);
  });
  return {
    found: lines.length > 0,
    message: lines.join("\n"),
    releaseDate: Object.fromEntries(entries)
  };
}

function buildSupportGameReleaseDateSummary(gameRow = {}) {
  const values = [
    gameRow?.releaseDate,
    gameRow?.release_date,
    gameRow?.releaseYear,
    gameRow?.release_year,
    gameRow?.year,
    gameRow?.date,
    gameRow?.metadata?.releaseDate,
    gameRow?.metadata?.release_date,
    gameRow?.metadata?.releaseYear,
    gameRow?.metadata?.release_year,
    gameRow?.metadata?.year,
    gameRow?.metadata?.date
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const preferred = values.find((value) => /\d{4}/.test(value)) || values[0] || "";
  return {
    found: Boolean(preferred),
    value: preferred
  };
}

function buildSupportPlatformSearchKeys(platformRow = {}) {
  const rawValues = [
    platformRow?.name,
    platformRow?.shortName,
    platformRow?.platformDir,
    platformRow?.companyName
  ];
  const baseKeys = rawValues
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
  const normalizedBase = baseKeys.map((value) => value.replace(/[^a-z0-9]+/g, ""));
  const aliasMap = {
    snes: [
      "super nintendo entertainment system",
      "super nintendo",
      "super nes"
    ],
    nes: [
      "nintendo entertainment system",
      "famicom"
    ],
    psx: [
      "playstation",
      "sony playstation",
      "sony playstation 1",
      "playstation 1",
      "ps1"
    ],
    ps2: [
      "playstation 2",
      "sony playstation 2"
    ],
    ps3: [
      "playstation 3",
      "sony playstation 3"
    ],
    psp: [
      "playstation portable",
      "sony playstation portable"
    ],
    gcn: [
      "gamecube",
      "nintendo gamecube"
    ],
    n64: [
      "nintendo64",
      "nintendo 64"
    ],
    nds: [
      "ds",
      "nintendo ds",
      "nintendo dual screen"
    ],
    gba: [
      "gameboyadvance",
      "game boy advance"
    ],
    gameboy: [
      "gb",
      "game boy"
    ],
    "3ds": [
      "nintendo 3ds",
      "3ds"
    ],
    "wii-u": [
      "wii u",
      "nintendo wii u"
    ],
    xbox: [
      "original xbox",
      "microsoft xbox"
    ],
    xbox360: [
      "xbox 360",
      "microsoft xbox 360"
    ],
    pc: [
      "windows",
      "microsoft windows",
      "windows pc",
      "pc"
    ]
  };
  const aliasKeys = [];
  normalizedBase.forEach((value) => {
    const aliases = aliasMap[value] || [];
    aliases.forEach((alias) => {
      aliasKeys.push(String(alias || "").trim().toLowerCase());
    });
  });
  const allKeys = baseKeys.concat(aliasKeys);
  const seen = new Set();
  return allKeys.filter((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function findSupportPlatformRowByQuery(platformRows = [], query = "") {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedCompactQuery = normalizedQuery.replace(/[^a-z0-9]+/g, "");
  const rows = Array.isArray(platformRows) ? platformRows : [];
  if (!normalizedQuery) return rows[0] || null;
  const exact = rows.find((row) => {
    const keys = buildSupportPlatformSearchKeys(row);
    return keys.includes(normalizedQuery) || keys.some((value) => value.replace(/[^a-z0-9]+/g, "") === normalizedCompactQuery);
  });
  if (exact) return exact;
  const contains = rows.find((row) => {
    const haystack = buildSupportPlatformSearchKeys(row).join(" ");
    return haystack.includes(normalizedQuery) || haystack.replace(/[^a-z0-9]+/g, "").includes(normalizedCompactQuery);
  });
  return contains || null;
}

function normalizeSupportCoverTaskLimit(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const parsed = Number(args.limit ?? args.count ?? args.maxResults ?? args.maxRows ?? 1);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.min(6, Math.round(parsed)));
}

function normalizeSupportCoverTaskMode(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const raw = String(args.mode || args.source || args.action || args.strategy || "").trim().toLowerCase();
  if (["web", "search", "browse", "options", "gallery", "results"].includes(raw)) {
    return "search";
  }
  if (["library", "current", "existing", "local"].includes(raw)) {
    return "library";
  }
  return "auto";
}

function summarizeSupportLibraryQueryResults(rows, matchLimit) {
  return (Array.isArray(rows) ? rows : [])
    .slice(0, 24)
    .map((entry) => ({
      query: String(entry?.query || "").trim(),
      gameCount: Number(entry?.gameCount || 0),
      emulatorCount: Number(entry?.emulatorCount || 0),
      gameRowsReturned: Number(entry?.gameRowsReturned || (Array.isArray(entry?.games) ? entry.games.length : 0)),
      emulatorRowsReturned: Number(entry?.emulatorRowsReturned || (Array.isArray(entry?.emulators) ? entry.emulators.length : 0)),
      gameRowsTruncated: !!entry?.gameRowsTruncated,
      emulatorRowsTruncated: !!entry?.emulatorRowsTruncated,
      games: summarizeSupportLibraryRows(entry?.games || [], "game", matchLimit),
      emulators: summarizeSupportLibraryRows(entry?.emulators || [], "emulator", matchLimit)
    }))
    .filter((entry) => entry.query);
}

function buildSupportLibraryMatchesPayload(libraryMatches, fallbackQuery = "") {
  const source = libraryMatches && typeof libraryMatches === "object" ? libraryMatches : {};
  const matchReason = String(source?.reason || "").trim().toLowerCase();
  const requestedMatchLimit = Number(source?.limit || 0);
  const matchLimit = matchReason === "task-query" || matchReason === "task-catalog"
    ? (Number.isFinite(requestedMatchLimit) && requestedMatchLimit > 0 ? requestedMatchLimit : SUPPORT_LIBRARY_QUERY_LIMIT)
    : 12;

  return {
    active: !!source?.active,
    reason: String(source?.reason || "").trim(),
    query: source?.active ? String(source?.query || "").trim() : "",
    queries: Array.isArray(source?.queries) ? source.queries.map((value) => String(value || "").trim()).filter(Boolean).slice(0, 24) : [],
    batchQuery: !!source?.batchQuery,
    limit: Number.isFinite(requestedMatchLimit) && requestedMatchLimit > 0 ? requestedMatchLimit : matchLimit,
    gameCount: Number(source?.gameCount || 0),
    emulatorCount: Number(source?.emulatorCount || 0),
    gameRowsReturned: Number(source?.gameRowsReturned || (Array.isArray(source?.games) ? source.games.length : 0)),
    emulatorRowsReturned: Number(source?.emulatorRowsReturned || (Array.isArray(source?.emulators) ? source.emulators.length : 0)),
    gameRowsTruncated: !!source?.gameRowsTruncated,
    emulatorRowsTruncated: !!source?.emulatorRowsTruncated,
    games: summarizeSupportLibraryRows(source?.games || [], "game", matchLimit),
    emulators: summarizeSupportLibraryRows(source?.emulators || [], "emulator", matchLimit),
    queryResults: summarizeSupportLibraryQueryResults(source?.queryResults || [], matchLimit),
    catalog: {
      gameTotal: Number(source?.catalog?.gameTotal || 0),
      emulatorTotal: Number(source?.catalog?.emulatorTotal || 0),
      gamePlatforms: Array.isArray(source?.catalog?.gamePlatforms) ? source.catalog.gamePlatforms : [],
      emulatorPlatforms: Array.isArray(source?.catalog?.emulatorPlatforms) ? source.catalog.emulatorPlatforms : [],
      games: summarizeSupportLibraryRows(source?.catalog?.games || [], "game", 220),
      emulators: summarizeSupportLibraryRows(source?.catalog?.emulators || [], "emulator", 220)
    }
  };
}

function describeSupportLibraryQueryResult(libraryMatches, query = "") {
  const matches = libraryMatches && typeof libraryMatches === "object" ? libraryMatches : {};
  const queries = Array.isArray(matches?.queries) ? matches.queries.filter(Boolean) : [];
  const gameCount = Number(matches?.gameCount || 0);
  const emulatorCount = Number(matches?.emulatorCount || 0);
  if (queries.length > 1) {
    return `Library batch query checked ${queries.length} requested title${queries.length === 1 ? "" : "s"}. Continuing support...`;
  }
  if (!String(query || "").trim()) {
    if (gameCount > 0 && emulatorCount > 0) {
      return `Loaded full library context (${gameCount} games, ${emulatorCount} emulators). Continuing support...`;
    }
    if (gameCount > 0) {
      return `Loaded full game library context (${gameCount} games). Continuing support...`;
    }
    if (emulatorCount > 0) {
      return `Loaded full emulator library context (${emulatorCount} emulators). Continuing support...`;
    }
    return "Loaded full library context with no rows. Continuing support...";
  }
  const label = ` for "${query}"`;
  if (gameCount > 0 && emulatorCount > 0) {
    return `Library query${label} found ${gameCount} game${gameCount === 1 ? "" : "s"} and ${emulatorCount} emulator${emulatorCount === 1 ? "" : "s"}. Continuing support...`;
  }
  if (gameCount > 0) {
    return `Library query${label} found ${gameCount} matching game${gameCount === 1 ? "" : "s"}. Continuing support...`;
  }
  if (emulatorCount > 0) {
    return `Library query${label} found ${emulatorCount} matching emulator${emulatorCount === 1 ? "" : "s"}. Continuing support...`;
  }
  return `Library query${label} found no matches. Continuing support...`;
}

function getIssueTypeLabel(issueType) {
  return ISSUE_TYPES.find((row) => row.value === issueType)?.label || ISSUE_TYPES[ISSUE_TYPES.length - 1].label;
}

function loadSupportSettings() {
  return buildSupportLlmSettings(loadDesktopLlmSettings());
}

function resolveSupportContextWindowFromSettings(settings = null) {
  const source = settings && typeof settings === "object" ? settings : loadSupportSettings();
  return normalizeSupportContextWindowMessages(source?.contextWindowMessages, SUPPORT_CONTEXT_WINDOW_DEFAULT);
}

function buildSupportStreamRequestId() {
  return `support-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function shouldUseSupportStreaming(llmSettings, bridge) {
  if (!bridge || typeof bridge.onSupportStream !== "function") {
    return false;
  }
  if (String(llmSettings?.llmMode || "").trim().toLowerCase() === "client") {
    return false;
  }
  return String(llmSettings?.provider || "").trim().toLowerCase() === "ollama";
}

function decodePartialJsonStringValue(rawText, fieldName) {
  const source = String(rawText || "");
  const marker = `"${String(fieldName || "").trim()}"`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) {
    return "";
  }

  let index = markerIndex + marker.length;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  if (source[index] !== ":") {
    return "";
  }
  index += 1;
  while (index < source.length && /\s/.test(source[index])) {
    index += 1;
  }
  if (source[index] !== "\"") {
    return "";
  }
  index += 1;

  let output = "";
  let escaping = false;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (escaping) {
      if (char === "n") output += "\n";
      else if (char === "r") output += "\r";
      else if (char === "t") output += "\t";
      else if (char === "\"") output += "\"";
      else if (char === "\\") output += "\\";
      else if (char === "/") output += "/";
      else output += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (char === "\"") {
      break;
    }
    output += char;
  }
  return output;
}

function deriveSupportLiveResponseText(rawText) {
  const source = String(rawText || "");
  if (!source.trim()) {
    return "";
  }

  const message = decodePartialJsonStringValue(source, "message").trim();
  if (message) {
    return message;
  }

  const reason = decodePartialJsonStringValue(source, "reason").trim();
  if (reason) {
    return reason;
  }

  if (/^\s*\{/.test(source)) {
    return "";
  }

  return source.trim();
}

function ensureSupportStreamBridge(store) {
  if (supportStreamUnsubscribe) {
    return;
  }
  const bridge = getDesktopBridge();
  if (!bridge || typeof bridge.onSupportStream !== "function") {
    return;
  }
  supportStreamUnsubscribe = bridge.onSupportStream((payload) => {
    if (!payload || typeof payload !== "object") {
      return;
    }
    store.consumeSupportStreamEvent(payload);
  });
}

function normalizeSupportTaskType(rawValue) {
  const normalized = String(rawValue || "").trim().toUpperCase();
  switch (normalized) {
    case SUPPORT_ASSISTANT_TASK_FETCH_SPECS:
    case "GET_SPECS":
    case "SYSTEM:GET-SPECS":
    case "SYSTEM_GET_SPECS":
      return SUPPORT_ASSISTANT_TASK_FETCH_SPECS;
    case SUPPORT_ASSISTANT_TASK_RUN_GAME:
    case "LAUNCH-GAME":
    case "LAUNCH_GAME":
      return SUPPORT_ASSISTANT_TASK_RUN_GAME;
    case SUPPORT_ASSISTANT_TASK_RUN_EMULATOR:
    case "LAUNCH-EMULATOR":
    case "LAUNCH_EMULATOR":
      return SUPPORT_ASSISTANT_TASK_RUN_EMULATOR;
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR:
    case "DOWNLOAD-INSTALL-EMULATOR":
    case "DOWNLOAD_EMULATOR":
    case "INSTALL_EMULATOR":
      return SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR;
    case SUPPORT_ASSISTANT_TASK_READ_LIBRARY:
    case "READ_CONTEXT":
    case "SCAN_LIBRARY":
    case "QUERY_LIBRARY":
    case "SEARCH_LIBRARY":
    case "LIST_LIBRARY":
    case "LIST_GAMES":
      return SUPPORT_ASSISTANT_TASK_READ_LIBRARY;
    case SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY:
    case "RELOAD_LIBRARY":
    case "REFRESH_CONTEXT":
      return SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY;
    case SUPPORT_ASSISTANT_TASK_ADD_TAGS:
    case "TAG_GAME":
    case "APPLY_TAGS":
      return SUPPORT_ASSISTANT_TASK_ADD_TAGS;
    case SUPPORT_ASSISTANT_TASK_REMOVE_TAGS:
    case "DELETE_TAGS":
    case "UNTAG_GAME":
      return SUPPORT_ASSISTANT_TASK_REMOVE_TAGS;
    case SUPPORT_ASSISTANT_TASK_LIST_TAGS:
    case "GET_TAGS":
    case "READ_TAGS":
    case "SHOW_TAGS":
      return SUPPORT_ASSISTANT_TASK_LIST_TAGS;
    case SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS:
    case "SEARCH_HELP_DOCS":
    case "SHOW_HELP_DOCS":
    case "HELP_DOCS_LIST":
      return SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS;
    case SUPPORT_ASSISTANT_TASK_READ_HELP_DOC:
    case "OPEN_HELP_DOC":
    case "GET_HELP_DOC":
    case "SHOW_HELP_DOC":
      return SUPPORT_ASSISTANT_TASK_READ_HELP_DOC;
    case SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS:
    case "SEARCH_SELF_TASK_DOCS":
    case "SHOW_SELF_TASK_DOCS":
    case "LIST_TASK_DOCS":
      return SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS;
    case SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC:
    case "OPEN_SELF_TASK_DOC":
    case "GET_SELF_TASK_DOC":
    case "READ_TASK_DOC":
      return SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC;
    case SUPPORT_ASSISTANT_TASK_RELEASE_DATE:
    case "GET_RELEASE_DATE":
    case "READ_RELEASE_DATE":
    case "PLATFORM_RELEASE_DATE":
      return SUPPORT_ASSISTANT_TASK_RELEASE_DATE;
    case SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE:
    case "GET_GAME_RELEASE_DATE":
    case "READ_GAME_RELEASE_DATE":
      return SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE;
    case SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER:
    case "SHOW_GAME_COVER":
    case "GET_GAME_COVER":
    case "SEARCH_GAME_COVER":
    case "FETCH_COVER":
    case "SHOW_COVER":
      return SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER;
    case SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER:
    case "APPLY_GAME_COVER":
    case "SAVE_GAME_COVER":
    case "SET_GAME_COVER":
      return SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER;
    case SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW:
    case "WATCH_GAME_VIDEO":
    case "OPEN_YOUTUBE":
      return SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW;
    case SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL:
    case "OPEN_URL":
    case "BROWSE_URL":
      return SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL;
    case SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL:
    case "OPEN_PANEL":
    case "OPEN_SETTINGS":
      return SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL;
    case SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE:
    case "SET_SUPPORT_MODE":
    case "SWITCH_SUPPORT_MODE":
    case "CHANGE_MODE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE;
    case SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM:
    case "SET_PLATFORM":
    case "CHANGE_SUPPORT_PLATFORM":
      return SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM;
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR:
    case "SET_EMULATOR":
    case "CHANGE_SUPPORT_EMULATOR":
      return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR;
    case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE:
    case "SET_ISSUE_TYPE":
    case "CHANGE_PROBLEM_TYPE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE;
    case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY:
    case "SET_ISSUE_SUMMARY":
    case "SET_CHAT_MESSAGE":
    case "CHANGE_SUMMARY":
      return SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY;
    case SUPPORT_ASSISTANT_TASK_APPEND_DETAILS:
    case "ADD_DETAILS":
    case "UPDATE_DETAILS":
      return SUPPORT_ASSISTANT_TASK_APPEND_DETAILS;
    case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD:
    case "CLEAR_FIELD":
    case "RESET_FIELD":
      return SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD;
    case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION:
    case "RESET_SUPPORT_SESSION":
    case "CLEAR_SUPPORT":
      return SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION;
    case SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS:
    case "SET_AUTO_SPECS":
      return SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS;
    case SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS:
    case "SET_WEB_ACCESS":
      return SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS;
    case SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT:
    case "SET_DEBUG_CONTEXT":
    case "SET_DEBUG_SUPPORT":
      return SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT;
    case SUPPORT_ASSISTANT_TASK_CHANGE_THEME:
    case "SET_THEME":
    case "SWITCH_THEME":
    case "SET_THEME_TONE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_THEME;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE:
    case "SET_LANGUAGE":
    case "SWITCH_LANGUAGE":
    case "SET_LOCALE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE;
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS:
    case "DOWNLOAD_COVERS":
    case "FETCH_LIBRARY_COVERS":
    case "BULK_DOWNLOAD_COVERS":
    case "REFRESH_COVERS":
      return SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION:
    case "SET_LIBRARY_SECTION":
    case "SWITCH_LIBRARY_SECTION":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW:
    case "SET_LIBRARY_VIEW":
    case "SWITCH_LIBRARY_VIEW":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH:
    case "SET_LIBRARY_SEARCH":
    case "SEARCH_LIBRARY_VIEW":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER:
    case "SET_LIBRARY_PLATFORM_FILTER":
    case "FILTER_LIBRARY_PLATFORM":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT:
    case "SET_LIBRARY_SORT":
    case "SORT_LIBRARY_VIEW":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT;
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE:
    case "SET_LIBRARY_EMULATOR_TYPE":
    case "FILTER_EMULATOR_TYPE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE;
    case SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS:
    case "RESET_LIBRARY_FILTERS":
    case "CLEAR_LIBRARY_SEARCH":
      return SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS;
    case SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS:
    case "SHOW_GAME_DETAILS":
    case "OPEN_GAME_MODAL":
      return SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS;
    case SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS:
    case "SHOW_EMULATOR_DETAILS":
    case "OPEN_EMULATOR_MODAL":
      return SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS;
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE:
    case "SET_EMULATOR_WEBSITE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE;
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS:
    case "SET_EMULATOR_LAUNCH_ARGS":
      return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS;
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY:
    case "SET_EMULATOR_WORKING_DIRECTORY":
      return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY;
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH:
    case "SET_EMULATOR_CONFIG_PATH":
      return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH;
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE:
    case "SET_EMULATOR_RUN_COMMANDS_BEFORE":
      return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE;
    case SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS:
    case "RESET_EMULATOR_OVERRIDE_FIELDS":
    case "CLEAR_EMULATOR_OVERRIDES":
      return SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS;
    default:
      return normalized;
  }
}

function normalizeSupportTaskConfidence(rawValue) {
  const confidence = Number(rawValue);
  if (!Number.isFinite(confidence)) {
    return 1;
  }
  return Math.max(0, Math.min(1, confidence));
}

function normalizeSupportTaskArgs(task) {
  return task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
}

function readSupportTaskStringArg(task, keys = []) {
  const args = normalizeSupportTaskArgs(task);
  for (const key of keys) {
    const value = String(args?.[key] || "").trim();
    if (value) {
      return value;
    }
  }
  return "";
}

function normalizeSupportTaskModeTarget(task) {
  return normalizeMode(readSupportTaskStringArg(task, ["mode", "targetMode", "view", "tab", "value"]));
}

function normalizeSupportTaskIssueTypeTarget(task) {
  return normalizeIssueType(readSupportTaskStringArg(task, ["issueType", "type", "problemType", "value"]));
}

function normalizeSupportTaskBooleanValue(task, fallback = null) {
  const args = normalizeSupportTaskArgs(task);
  const direct = args.enabled ?? args.value ?? args.checked ?? args.on ?? args.allow ?? null;
  if (typeof direct === "boolean") {
    return direct;
  }
  const normalized = String(direct ?? "").trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }
  if (["1", "true", "yes", "on", "enable", "enabled", "allow", "allowed"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disable", "disabled", "deny", "denied"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function normalizeSupportTaskClearFields(task) {
  const args = normalizeSupportTaskArgs(task);
  const rawValues = [];
  if (typeof args.field === "string") rawValues.push(args.field);
  if (typeof args.target === "string") rawValues.push(args.target);
  if (Array.isArray(args.fields)) rawValues.push(...args.fields);
  const aliasMap = new Map([
    ["summary", "issueSummary"],
    ["issue-summary", "issueSummary"],
    ["message", "issueSummary"],
    ["chat-message", "issueSummary"],
    ["platform", "platform"],
    ["emulator", "emulator"],
    ["error", "errorText"],
    ["error-text", "errorText"],
    ["details", "details"]
  ]);
  return Array.from(
    new Set(
      rawValues
        .map((value) => String(value || "").trim().toLowerCase())
        .map((value) => aliasMap.get(value) || "")
        .filter(Boolean)
    )
  );
}

function normalizeSupportTaskThemeTarget(task) {
  const args = normalizeSupportTaskArgs(task);
  const raw = String(args.theme ?? args.tone ?? args.mode ?? args.value ?? args.name ?? args.query ?? "").trim().toLowerCase();
  if (raw === "light" || raw === "light theme") return "light";
  if (raw === "dark" || raw === "dark theme") return "dark";
  return "";
}

function normalizeSupportTaskLanguageTarget(task) {
  const args = normalizeSupportTaskArgs(task);
  return String(args.language ?? args.code ?? args.locale ?? args.value ?? args.name ?? args.query ?? "").trim();
}

function normalizeSupportTaskLibrarySectionTarget(task) {
  const raw = readSupportTaskStringArg(task, ["section", "librarySection", "target", "view", "tab", "name", "value", "query"])
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (["all", "all games", "games", "library"].includes(raw)) return "all";
  if (["suggested", "suggestions", "recommended"].includes(raw)) return "suggested";
  if (["recent", "recently played", "history"].includes(raw)) return "recent";
  if (["emulators", "emulator"].includes(raw)) return "emulators";
  return "";
}

function normalizeSupportTaskLibraryViewTarget(task) {
  const raw = readSupportTaskStringArg(task, ["viewMode", "view", "mode", "target", "name", "value", "query"])
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (["cover", "covers", "grid", "cover grid"].includes(raw)) return "cover";
  if (["list", "table"].includes(raw)) return "list";
  if (["focus", "focused"].includes(raw)) return "focus";
  if (["slideshow", "slide", "carousel"].includes(raw)) return "slideshow";
  if (["random", "shuffle"].includes(raw)) return "random";
  return "";
}

function normalizeSupportTaskLibrarySearchTarget(task) {
  return readSupportTaskStringArg(task, ["query", "search", "searchQuery", "term", "text", "value", "name"]);
}

function normalizeSupportTaskLibraryPlatformTarget(task, platformOptions = []) {
  const raw = readSupportTaskStringArg(task, ["platform", "platformId", "platformShortName", "target", "value", "query"])
    .trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase();
  if (["all", "any", "every"].includes(normalized)) return "all";
  const options = Array.isArray(platformOptions) ? platformOptions : [];
  const matched = options.find((row) => {
    const id = String(row?.id || "").trim().toLowerCase();
    const label = String(row?.label || "").trim().toLowerCase();
    return id === normalized || label === normalized;
  });
  return matched?.id || raw;
}

function normalizeSupportTaskLibrarySortTarget(task) {
  const raw = readSupportTaskStringArg(task, ["sort", "sortBy", "target", "value", "query"])
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (["name", "title", "alphabetical", "alphabetic"].includes(raw)) return "name";
  if (["platform", "system"].includes(raw)) return "platform";
  if (["rating", "score"].includes(raw)) return "rating";
  if (["recent", "recently played", "last played"].includes(raw)) return "recent";
  return "";
}

function normalizeSupportTaskLibraryEmulatorTypeTarget(task) {
  const raw = readSupportTaskStringArg(task, ["emulatorType", "type", "target", "value", "query"])
    .trim()
    .toLowerCase();
  if (!raw) return "";
  if (["all", "any"].includes(raw)) return "all";
  if (["standalone", "standalone emulator"].includes(raw)) return "standalone";
  if (["core", "cores", "libretro core", "libretro cores"].includes(raw)) return "core";
  if (["web", "browser", "web emulator"].includes(raw)) return "web";
  return "";
}

function normalizeSupportTaskLibraryClearFields(task) {
  const args = normalizeSupportTaskArgs(task);
  const rawValues = [];
  if (typeof args.field === "string") rawValues.push(args.field);
  if (typeof args.target === "string") rawValues.push(args.target);
  if (Array.isArray(args.fields)) rawValues.push(...args.fields);
  if (!rawValues.length) {
    return ["all"];
  }
  const aliasMap = new Map([
    ["all", "all"],
    ["filters", "all"],
    ["library-filters", "all"],
    ["search", "query"],
    ["query", "query"],
    ["platform", "selectedPlatform"],
    ["platform-filter", "selectedPlatform"],
    ["sort", "sortBy"],
    ["sortby", "sortBy"],
    ["view", "viewMode"],
    ["section", "librarySection"],
    ["emulator-type", "emulatorType"],
    ["type", "emulatorType"]
  ]);
  return Array.from(
    new Set(
      rawValues
        .map((value) => String(value || "").trim().toLowerCase())
        .map((value) => aliasMap.get(value) || "")
        .filter(Boolean)
    )
  );
}

function normalizeSupportTaskEmulatorConfigValue(task, keys = []) {
  return readSupportTaskStringArg(task, Array.isArray(keys) && keys.length ? keys : ["value", "text", "query", "path", "url"]);
}

function normalizeSupportTaskEmulatorClearFields(task) {
  const args = normalizeSupportTaskArgs(task);
  const rawValues = [];
  if (typeof args.field === "string") rawValues.push(args.field);
  if (typeof args.target === "string") rawValues.push(args.target);
  if (Array.isArray(args.fields)) rawValues.push(...args.fields);
  if (!rawValues.length) {
    return ["all"];
  }
  const aliasMap = new Map([
    ["all", "all"],
    ["overrides", "all"],
    ["website", "website"],
    ["launch-args", "launchArgs"],
    ["args", "launchArgs"],
    ["working-directory", "workingDirectory"],
    ["workingdir", "workingDirectory"],
    ["config-path", "configFilePath"],
    ["config-file-path", "configFilePath"],
    ["config", "configFilePath"],
    ["run-commands-before", "runCommandsBefore"],
    ["runcommandsbefore", "runCommandsBefore"],
    ["prelaunch", "runCommandsBefore"]
  ]);
  return Array.from(
    new Set(
      rawValues
        .map((value) => String(value || "").trim().toLowerCase())
        .map((value) => aliasMap.get(value) || "")
        .filter(Boolean)
    )
  );
}

function updateSupportEmulatorStoredConfig(emulatorRow, patch = {}) {
  const current = resolveEffectiveEmulatorConfig(emulatorRow);
  const next = {
    ...current,
    ...(patch && typeof patch === "object" ? patch : {})
  };
  saveStoredEmulatorConfig(emulatorRow, next);
  return next;
}

function requestDesktopLibraryDetailOpen(kind = "", row = null) {
  const normalizedKind = String(kind || "").trim().toLowerCase();
  if (!normalizedKind || !row || typeof window === "undefined") {
    return false;
  }
  try {
    window.__EMU_BRO_LIBRARY_DETAIL_REQUEST__ = {
      kind: normalizedKind,
      rowKey: String(row?.key || "").trim(),
      rowId: Number(row?.id || 0)
    };
    window.dispatchEvent(new CustomEvent("emubro:library-detail-request", {
      detail: window.__EMU_BRO_LIBRARY_DETAIL_REQUEST__
    }));
    return true;
  } catch (_error) {
    return false;
  }
}

function isExecutableSupportTaskType(taskType) {
  switch (normalizeSupportTaskType(taskType)) {
    case SUPPORT_ASSISTANT_TASK_FETCH_SPECS:
    case SUPPORT_ASSISTANT_TASK_RUN_GAME:
    case SUPPORT_ASSISTANT_TASK_RUN_EMULATOR:
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR:
    case SUPPORT_ASSISTANT_TASK_READ_LIBRARY:
    case SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY:
    case SUPPORT_ASSISTANT_TASK_ADD_TAGS:
    case SUPPORT_ASSISTANT_TASK_REMOVE_TAGS:
    case SUPPORT_ASSISTANT_TASK_LIST_TAGS:
    case SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS:
    case SUPPORT_ASSISTANT_TASK_READ_HELP_DOC:
    case SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS:
    case SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC:
    case SUPPORT_ASSISTANT_TASK_RELEASE_DATE:
    case SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE:
    case SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER:
    case SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER:
    case SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW:
    case SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL:
    case SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL:
    case SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE:
    case SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM:
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR:
    case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE:
    case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY:
    case SUPPORT_ASSISTANT_TASK_APPEND_DETAILS:
    case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD:
    case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION:
    case SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS:
    case SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS:
    case SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT:
    case SUPPORT_ASSISTANT_TASK_CHANGE_THEME:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE:
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT:
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE:
    case SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS:
    case SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS:
    case SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS:
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE:
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS:
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY:
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH:
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE:
    case SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS:
      return true;
    default:
      return false;
  }
}

function extractSupportAssistantTaskObject(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return null;
  }

  const directTask = normalizeSupportTaskType(
    rawValue.task
      || rawValue.type
      || rawValue.action
      || rawValue.command
      || rawValue.name
      || ""
  );
  if (directTask && isExecutableSupportTaskType(directTask)) {
    return {
      type: directTask,
      confidence: normalizeSupportTaskConfidence(rawValue.confidence ?? rawValue.score ?? rawValue.probability),
      reason: String(rawValue.reason || rawValue.why || rawValue.message || "").trim(),
      args: rawValue.args && typeof rawValue.args === "object" && !Array.isArray(rawValue.args)
        ? rawValue.args
        : (rawValue.payload && typeof rawValue.payload === "object" && !Array.isArray(rawValue.payload) ? rawValue.payload : {})
    };
  }

  if (rawValue.task && typeof rawValue.task === "object" && !Array.isArray(rawValue.task)) {
    return extractSupportAssistantTaskObject(rawValue.task);
  }

  return null;
}

function extractSupportAssistantEnvelopeObject(rawValue) {
  if (!rawValue || typeof rawValue !== "object" || Array.isArray(rawValue)) {
    return null;
  }

  const envelopeType = String(rawValue.type || rawValue.kind || "").trim().toLowerCase();
  if (envelopeType === SUPPORT_RESPONSE_TYPE_REPLY) {
    const followUpTask = extractSupportAssistantTaskObject(rawValue.followUpTask && typeof rawValue.followUpTask === "object"
      ? rawValue.followUpTask
      : (rawValue.nextAction && typeof rawValue.nextAction === "object" ? rawValue.nextAction : null));
    return {
      kind: SUPPORT_RESPONSE_TYPE_REPLY,
      message: String(rawValue.message || rawValue.reply || rawValue.answer || "").trim(),
      task: followUpTask && Number(followUpTask.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE ? followUpTask : null
    };
  }

  if (envelopeType === SUPPORT_RESPONSE_TYPE_TASK) {
    const task = extractSupportAssistantTaskObject({
      ...rawValue,
      ...((rawValue.task && typeof rawValue.task === "object" && !Array.isArray(rawValue.task)) ? rawValue.task : {})
    });
    if (!task || Number(task.confidence || 0) < SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE) {
      return null;
    }
    return {
      kind: SUPPORT_RESPONSE_TYPE_TASK,
      task,
      message: String(rawValue.message || "").trim()
    };
  }

  if (envelopeType === SUPPORT_RESPONSE_TYPE_BLOCKED) {
    const nextAction = rawValue.nextAction && typeof rawValue.nextAction === "object" && !Array.isArray(rawValue.nextAction)
      ? rawValue.nextAction
      : {};
    const task = extractSupportAssistantTaskObject({
      ...nextAction,
      task: nextAction.task || nextAction.name || nextAction.command || rawValue.task || ""
    });
    return {
      kind: SUPPORT_RESPONSE_TYPE_BLOCKED,
      message: String(rawValue.message || rawValue.reason || rawValue.answer || "").trim(),
      reason: String(rawValue.reason || "").trim(),
      task: task && Number(task.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE ? task : null
    };
  }

  const task = extractSupportAssistantTaskObject(rawValue);
  if (task && Number(task.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE) {
    return {
      kind: SUPPORT_RESPONSE_TYPE_TASK,
      task,
      message: ""
    };
  }

  return null;
}

function parseSupportAssistantEnvelope(answerText) {
  const normalized = String(answerText || "").trim();
  if (!normalized) {
    return null;
  }
  const stripped = normalized
    .replace(/^```[a-z0-9_-]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (!stripped) {
    return null;
  }

  const candidates = [];
  if ((stripped.startsWith("{") && stripped.endsWith("}")) || (stripped.startsWith("[") && stripped.endsWith("]"))) {
    candidates.push(stripped);
  }
  const objectMatch = stripped.match(/\{[\s\S]*\}/);
  if (objectMatch && objectMatch[0] !== stripped) {
    candidates.push(objectMatch[0]);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const envelope = extractSupportAssistantEnvelopeObject(parsed);
      if (envelope) {
        return envelope;
      }
    } catch (_error) {}
  }

  return null;
}

function buildSupportAssistantReplyEnvelope(message) {
  return {
    kind: SUPPORT_RESPONSE_TYPE_REPLY,
    message: String(message || "").trim()
  };
}

function shouldAutoExecuteSupportTask(task = null, allowAutoSpecs = false) {
  const type = normalizeSupportTaskType(task?.type || task?.task || "");
  if (!type) return false;
  if (
    type === SUPPORT_ASSISTANT_TASK_READ_LIBRARY
    || type === SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY
    || type === SUPPORT_ASSISTANT_TASK_LIST_TAGS
    || type === SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS
    || type === SUPPORT_ASSISTANT_TASK_READ_HELP_DOC
    || type === SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS
    || type === SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC
    || type === SUPPORT_ASSISTANT_TASK_RELEASE_DATE
    || type === SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE
    || type === SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER
    || type === SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER
    || type === SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY
    || type === SUPPORT_ASSISTANT_TASK_APPEND_DETAILS
    || type === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD
    || type === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION
    || type === SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS
    || type === SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS
    || type === SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_THEME
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE
    || type === SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS
    || type === SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS
    || type === SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH
    || type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE
    || type === SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS
  ) return true;
  if (type === SUPPORT_ASSISTANT_TASK_FETCH_SPECS) return !!allowAutoSpecs;
  return false;
}

function appendSupportAssistantMessage(store, messageText, { attachments = [] } = {}) {
  const text = String(messageText || "").trim();
  const normalizedAttachments = normalizeSupportMessageAttachments(attachments);
  if (!text && !normalizedAttachments.length) return;
  if (store.mode === "chat") {
    store.chatHistory = normalizeSupportChatHistory([
      ...store.chatHistory,
      { role: "assistant", text, attachments: normalizedAttachments }
    ], store.chatContextWindowSize);
    store.issueSummary = "";
    store.persistDraft();
    store.persistChatHistory();
    return;
  }
  store.outputMarkdown = text;
}

function buildSupportTaskResultOverride(taskType, messageText, extra = {}) {
  const normalizedTaskType = normalizeSupportTaskType(taskType);
  return {
    active: !!normalizedTaskType,
    success: extra?.success !== false,
    taskType: normalizedTaskType,
    message: String(messageText || "").trim(),
    entityKind: String(extra?.entityKind || "").trim(),
    entityName: String(extra?.entityName || "").trim(),
    details: String(extra?.details || "").trim(),
    data: extra?.data && typeof extra.data === "object" && !Array.isArray(extra.data)
      ? extra.data
      : {}
  };
}

async function appendSupportTaskMessageAndContinue(store, messageText, {
  taskType = "",
  taskDepth = 1,
  skipUserHistoryAppend = true,
  libraryMatchesOverride = null,
  selfTaskDocsOverride = null,
  attachments = null,
  resultData = null,
  entityKind = "",
  entityName = "",
  details = ""
} = {}) {
  const text = String(messageText || "").trim();
  const normalizedAttachments = normalizeSupportMessageAttachments(attachments);
  if (text) {
    appendSupportAssistantMessage(store, text, { attachments: normalizedAttachments });
  }
  await store.runSupport({
    skipUserHistoryAppend,
    taskDepth: taskDepth + 1,
    libraryMatchesOverride,
    selfTaskDocsOverride,
    taskResultOverride: buildSupportTaskResultOverride(taskType, text, {
      entityKind,
      entityName,
      details,
      data: resultData && typeof resultData === "object" && !Array.isArray(resultData) ? resultData : {}
    })
  });
}

function findSupportGameByTask(games, task = {}) {
  const args = task.args && typeof task.args === "object" ? task.args : {};
  const targetId = Number(args.gameId || args.id || 0);
  const targetKey = String(args.gameKey || args.key || "").trim();
  if (Number.isFinite(targetId) && targetId > 0) {
    const match = (Array.isArray(games) ? games : []).find((row) => Number(row?.id || 0) === targetId);
    if (match) return match;
  }
  if (targetKey) {
    const match = (Array.isArray(games) ? games : []).find((row) => String(row?.key || "").trim() === targetKey);
    if (match) return match;
  }
  const rows = Array.isArray(games) ? games : [];
  const candidateNames = normalizeSupportTaskNameCandidates(task);
  for (const targetName of candidateNames) {
    const exact = rows.find((row) => String(row?.name || "").trim().toLowerCase() === targetName);
    if (exact) return exact;
  }
  for (const targetName of candidateNames) {
    const partial = rows.find((row) => String(row?.name || "").trim().toLowerCase().includes(targetName));
    if (partial) return partial;
  }
  return null;
}

function findSupportEmulatorByTask(emulators, task = {}) {
  const args = task.args && typeof task.args === "object" ? task.args : {};
  const targetId = Number(args.emulatorId || args.id || 0);
  const targetKey = String(args.emulatorKey || args.key || "").trim();
  if (Number.isFinite(targetId) && targetId > 0) {
    const match = (Array.isArray(emulators) ? emulators : []).find((row) => Number(row?.id || 0) === targetId);
    if (match) return match;
  }
  if (targetKey) {
    const match = (Array.isArray(emulators) ? emulators : []).find((row) => String(row?.key || "").trim() === targetKey);
    if (match) return match;
  }
  const rows = Array.isArray(emulators) ? emulators : [];
  const candidateNames = normalizeSupportTaskNameCandidates(task);
  for (const targetName of candidateNames) {
    const exact = rows.find((row) => String(row?.name || "").trim().toLowerCase() === targetName);
    if (exact) return exact;
  }
  for (const targetName of candidateNames) {
    const partial = rows.find((row) => String(row?.name || "").trim().toLowerCase().includes(targetName));
    if (partial) return partial;
  }
  return null;
}

function normalizeSupportTaskNameCandidates(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const rows = [];
  const pushValue = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => pushValue(entry));
      return;
    }
    const text = String(value || "").trim().toLowerCase();
    if (!text) return;
    rows.push(text);
  };

  pushValue(args.gameName);
  pushValue(args.emulatorName);
  pushValue(args.gameTitle);
  pushValue(args.emulatorTitle);
  pushValue(args.title);
  pushValue(args.name);
  pushValue(args.query);
  pushValue(args.search);
  pushValue(args.searchQuery);
  pushValue(args.target);
  pushValue(args.item);
  pushValue(args.selection);
  pushValue(args.game);
  pushValue(args.emulator);
  pushValue(args.games);
  pushValue(args.emulators);
  pushValue(args.titles);
  pushValue(args.names);
  pushValue(args.queries);

  const seen = new Set();
  return rows.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function normalizeSupportTagCandidates(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const rows = [];
  const pushValue = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => pushValue(entry));
      return;
    }
    const text = String(value || "").trim().toLowerCase();
    if (!text) return;
    rows.push(text);
  };
  pushValue(args.tags);
  pushValue(args.tagNames);
  pushValue(args.names);
  pushValue(args.query);
  pushValue(args.search);
  pushValue(args.searchQuery);
  pushValue(args.tag);
  pushValue(args.name);
  pushValue(args.title);

  const seen = new Set();
  return rows.filter((value) => {
    if (!value || seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function filterSupportTagsByTask(tags, task = {}) {
  const rows = Array.isArray(tags) ? tags : [];
  const candidates = normalizeSupportTagCandidates(task);
  if (!candidates.length) {
    return rows
      .slice()
      .sort((a, b) => String(a?.name || a?.label || "").localeCompare(String(b?.name || b?.label || "")));
  }
  return rows
    .filter((row) => {
      const name = String(row?.name || row?.label || "").trim().toLowerCase();
      const id = String(row?.id || "").trim().toLowerCase();
      return candidates.some((candidate) => candidate === id || name.includes(candidate));
    })
    .sort((a, b) => String(a?.name || a?.label || "").localeCompare(String(b?.name || b?.label || "")));
}

function resolveSupportTagIdsForTask(tags, task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const ids = new Set(
    (Array.isArray(args.tagIds) ? args.tagIds : [])
      .map((value) => Number(value || 0))
      .filter((value) => Number.isFinite(value) && value > 0)
  );
  const candidates = normalizeSupportTagCandidates(task);
  if (!candidates.length) {
    return Array.from(ids);
  }
  (Array.isArray(tags) ? tags : []).forEach((row) => {
    const name = String(row?.name || row?.label || "").trim().toLowerCase();
    const id = Number(row?.id || 0);
    if (!name || !(Number.isFinite(id) && id > 0)) return;
    if (candidates.some((candidate) => candidate === String(id) || name === candidate || name.includes(candidate))) {
      ids.add(id);
    }
  });
  return Array.from(ids);
}

function normalizeSupportHelpDocQuery(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  return String(
    args.query
    || args.search
    || args.searchQuery
    || args.docTitle
    || args.title
    || args.name
    || args.docId
    || args.id
    || ""
  ).trim();
}

function findSupportHelpDocByTask(docs, task = {}) {
  const rows = Array.isArray(docs) ? docs : [];
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const targetId = String(args.docId || args.id || "").trim().toLowerCase();
  if (targetId) {
    const byId = rows.find((row) => String(row?.id || "").trim().toLowerCase() === targetId);
    if (byId) return byId;
  }
  const query = normalizeSupportHelpDocQuery(task).toLowerCase();
  if (!query) return null;
  const exact = rows.find((row) => {
    const id = String(row?.id || "").trim().toLowerCase();
    const title = String(row?.title || "").trim().toLowerCase();
    return id === query || title === query;
  });
  if (exact) return exact;
  return rows.find((row) => {
    const haystack = `${String(row?.id || "")} ${String(row?.title || "")} ${String(row?.preview || row?.snippet || "")}`.toLowerCase();
    return haystack.includes(query);
  }) || null;
}

function normalizeSupportPanelTarget(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const raw = String(
    args.panel
    || args.target
    || args.section
    || args.tab
    || args.view
    || args.name
    || args.query
    || ""
  ).trim().toLowerCase();
  if (!raw) return "";
  if (["settings", "general", "library settings"].includes(raw)) return "settings";
  if (["library-paths", "paths", "library paths"].includes(raw)) return "library-paths";
  if (["import", "imports", "launcher-import"].includes(raw)) return "import";
  if (["gamepad", "controller", "controllers"].includes(raw)) return "gamepad";
  if (["ai", "llm", "ai / llm"].includes(raw)) return "ai";
  if (["updates", "update"].includes(raw)) return "updates";
  if (["languages", "language", "locale", "locales"].includes(raw)) return "languages";
  if (raw === "profile") return "profile";
  if (["theme", "theme-manager"].includes(raw)) return "theme";
  if (["help", "help-docs", "docs", "documentation"].includes(raw)) return "help";
  if (raw === "about") return "about";
  if (raw === "support") return "support";
  if (raw === "community") return "community";
  if (["tools", "toolbox"].includes(raw)) return "tools";
  if (["library", "browse", "library-views"].includes(raw)) return "library";
  if (["home", "overview", "desktop-home"].includes(raw)) return "overview";
  return "";
}

function describeSupportPanelTarget(target = "") {
  switch (String(target || "").trim().toLowerCase()) {
    case "settings":
      return "settings workspace";
    case "library-paths":
      return "library paths settings";
    case "import":
      return "import settings";
    case "gamepad":
      return "gamepad settings";
    case "ai":
      return "AI settings";
    case "updates":
      return "updates workspace";
    case "languages":
      return "language manager";
    case "profile":
      return "profile workspace";
    case "theme":
      return "theme workspace";
    case "help":
      return "help docs";
    case "about":
      return "about view";
    case "support":
      return "support center";
    case "community":
      return "community hub";
    case "tools":
      return "settings and tools workspace";
    case "library":
      return "library workspace";
    case "overview":
      return "desktop overview";
    default:
      return "requested app panel";
  }
}

function formatSupportTagListMarkdown(tagRows, query = "") {
  const rows = Array.isArray(tagRows) ? tagRows : [];
  const title = query ? `## Matching Tags for \`${query}\`` : "## Available Tags";
  if (!rows.length) {
    return `${title}\n\nNo matching tags were found.`;
  }
  return `${title}\n\n${rows.map((row) => `- \`${String(row?.id || "").trim()}\` - ${String(row?.name || row?.label || "Untitled tag").trim()}`).join("\n")}`;
}

function formatSupportHelpDocListMarkdown(docs, query = "") {
  const rows = Array.isArray(docs) ? docs : [];
  const title = query ? `## Help Docs for \`${query}\`` : "## Help Docs";
  if (!rows.length) {
    return `${title}\n\nNo matching help docs were found.`;
  }
  return `${title}\n\n${rows.map((doc) => {
    const id = String(doc?.id || "").trim();
    const label = String(doc?.title || id || "Help Doc").trim();
    const preview = String(doc?.preview || doc?.snippet || "").trim();
    return `- **${label}**${id ? ` (\`${id}\`)` : ""}${preview ? `\n  ${preview}` : ""}`;
  }).join("\n")}`;
}

function formatSupportHelpDocMarkdown(doc = {}) {
  const title = String(doc?.title || doc?.id || "Help Doc").trim();
  const body = String(doc?.text || doc?.preview || "").trim();
  return body ? `## ${title}\n\n${body}` : `## ${title}`;
}

function formatSupportSelfTaskDocListMarkdown(docs, query = "") {
  const rows = Array.isArray(docs) ? docs : [];
  const title = query ? `## Self-Task Docs for \`${query}\`` : "## Self-Task Docs";
  if (!rows.length) {
    return `${title}\n\nNo matching self-task docs were found.`;
  }
  return `${title}\n\n${rows.map((doc) => {
    const id = String(doc?.id || "").trim();
    const label = String(doc?.title || id || "Self Task Doc").trim();
    const summary = String(doc?.summary || "").trim();
    const tasks = Array.isArray(doc?.tasks) ? doc.tasks.map((value) => String(value || "").trim()).filter(Boolean) : [];
    return `- **${label}**${id ? ` (\`${id}\`)` : ""}${tasks.length ? `\n  Tasks: ${tasks.map((value) => `\`${value}\``).join(", ")}` : ""}${summary ? `\n  ${summary}` : ""}`;
  }).join("\n")}`;
}

function normalizeSupportSelfTaskDocQuery(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  return String(args.query || args.topic || args.title || args.docTitle || args.search || "").trim();
}

function normalizeSupportSelfTaskDocIds(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const ids = [];
  const pushValue = (value) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => pushValue(entry));
      return;
    }
    const text = String(value || "").trim();
    if (text) {
      ids.push(text);
    }
  };
  pushValue(args.docIds);
  pushValue(args.docs);
  pushValue(args.ids);
  pushValue(args.docId);
  pushValue(args.id);
  const seen = new Set();
  return ids.filter((value) => {
    const key = value.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function normalizeSupportSelfTaskDocLimit(task = {}) {
  const args = task?.args && typeof task.args === "object" && !Array.isArray(task.args) ? task.args : {};
  const parsed = Number(args.limit ?? args.maxDocs ?? args.maxResults ?? 3);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(6, Math.round(parsed)));
}

function buildSupportSelfTaskDocsOverride(docs, query = "", action = "read") {
  return {
    active: true,
    action: String(action || "read").trim(),
    query: String(query || "").trim(),
    docs: (Array.isArray(docs) ? docs : [])
      .map((doc) => ({
        id: String(doc?.id || "").trim(),
        title: String(doc?.title || "").trim(),
        summary: String(doc?.summary || "").trim(),
        tasks: Array.isArray(doc?.tasks) ? doc.tasks.map((value) => String(value || "").trim()).filter(Boolean) : [],
        text: String(doc?.text || "").trim()
      }))
      .filter((doc) => doc.id || doc.title)
      .slice(0, 6)
  };
}

function buildSupportTaskApproval(task) {
  const reason = String(task?.reason || "").trim();
  switch (String(task?.type || "").trim().toUpperCase()) {
    case SUPPORT_ASSISTANT_TASK_FETCH_SPECS:
      return {
        task,
        title: "Assistant Request",
        message: "The assistant wants to fetch your PC specs before continuing.",
        actionLabel: "Approve"
      };
    case SUPPORT_ASSISTANT_TASK_RUN_GAME:
      return {
        task,
        title: "Launch Game",
        message: reason || "The assistant wants to launch a game from your library.",
        actionLabel: "Launch"
      };
    case SUPPORT_ASSISTANT_TASK_RUN_EMULATOR:
      return {
        task,
        title: "Launch Emulator",
        message: reason || "The assistant wants to launch an emulator.",
        actionLabel: "Launch"
      };
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR:
      return {
        task,
        title: "Download Emulator",
        message: reason || "The assistant wants to download and install an emulator.",
        actionLabel: "Download"
      };
    case SUPPORT_ASSISTANT_TASK_READ_LIBRARY:
      {
        const queries = normalizeSupportLibraryTaskQueries(task);
        const query = queries[0] || "";
        const label = queries.length > 1
          ? ` for ${queries.length} requested titles`
          : (query ? ` for "${query}"` : "");
        return {
          task,
          title: "Read Library",
          message: reason || `The assistant wants to query and inspect your current local library context${label}.`,
          actionLabel: "Allow"
        };
      }
    case SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY:
      return {
        task,
        title: "Refresh Library",
        message: reason || "The assistant wants to refresh your local library context.",
        actionLabel: "Refresh"
      };
    case SUPPORT_ASSISTANT_TASK_ADD_TAGS:
      return {
        task,
        title: "Add Tags",
        message: reason || "The assistant wants to apply tags to a game.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_REMOVE_TAGS:
      return {
        task,
        title: "Remove Tags",
        message: reason || "The assistant wants to remove tags from a game.",
        actionLabel: "Remove"
      };
    case SUPPORT_ASSISTANT_TASK_LIST_TAGS:
      return {
        task,
        title: "List Tags",
        message: reason || "The assistant wants to inspect your available tag catalog.",
        actionLabel: "List"
      };
    case SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS:
      return {
        task,
        title: "List Help Docs",
        message: reason || "The assistant wants to search your local help docs.",
        actionLabel: "Search"
      };
    case SUPPORT_ASSISTANT_TASK_READ_HELP_DOC:
      return {
        task,
        title: "Read Help Doc",
        message: reason || "The assistant wants to open a local help doc.",
        actionLabel: "Open"
      };
    case SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS:
      return {
        task,
        title: "List Self-Task Docs",
        message: reason || "The assistant wants to inspect the available detailed self-task docs.",
        actionLabel: "List"
      };
    case SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC:
      return {
        task,
        title: "Read Self-Task Docs",
        message: reason || "The assistant wants to read detailed local self-task docs before continuing.",
        actionLabel: "Read"
      };
    case SUPPORT_ASSISTANT_TASK_RELEASE_DATE:
      return {
        task,
        title: "Platform Release Date",
        message: reason || "The assistant wants to read the platform release date from local platform config first.",
        actionLabel: "Lookup"
      };
    case SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE:
      return {
        task,
        title: "Game Release Date",
        message: reason || "The assistant wants to resolve a game release date using local game data first.",
        actionLabel: "Lookup"
      };
    case SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER:
      return {
        task,
        title: "Add Game Cover",
        message: reason || "The assistant wants to apply a cover image to a game.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW:
      return {
        task,
        title: "Open YouTube",
        message: reason || "The assistant wants to open a YouTube preview for a game.",
        actionLabel: "Open"
      };
    case SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL:
      return {
        task,
        title: "Open Link",
        message: reason || "The assistant wants to open an external URL.",
        actionLabel: "Open"
      };
    case SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL:
      return {
        task,
        title: "Open Panel",
        message: reason || "The assistant wants to open a local app panel.",
        actionLabel: "Open"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE:
      return {
        task,
        title: "Change Mode",
        message: reason || "The assistant wants to switch the current support mode.",
        actionLabel: "Switch"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM:
      return {
        task,
        title: "Set Platform",
        message: reason || "The assistant wants to update the support platform field.",
        actionLabel: "Set"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR:
      return {
        task,
        title: "Set Emulator",
        message: reason || "The assistant wants to update the support emulator field.",
        actionLabel: "Set"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE:
      return {
        task,
        title: "Set Issue Type",
        message: reason || "The assistant wants to change the current issue type.",
        actionLabel: "Set"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY:
      return {
        task,
        title: "Set Summary",
        message: reason || "The assistant wants to update the support summary/message.",
        actionLabel: "Set"
      };
    case SUPPORT_ASSISTANT_TASK_APPEND_DETAILS:
      return {
        task,
        title: "Append Details",
        message: reason || "The assistant wants to append more details to the support context.",
        actionLabel: "Append"
      };
    case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD:
      return {
        task,
        title: "Clear Field",
        message: reason || "The assistant wants to clear one or more support fields.",
        actionLabel: "Clear"
      };
    case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION:
      return {
        task,
        title: "Clear Session",
        message: reason || "The assistant wants to clear the current support session.",
        actionLabel: "Clear"
      };
    case SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS:
      return {
        task,
        title: "Toggle Auto Specs",
        message: reason || "The assistant wants to change the auto specs setting.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS:
      return {
        task,
        title: "Toggle Web Access",
        message: reason || "The assistant wants to change the web access setting.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT:
      return {
        task,
        title: "Toggle Debug Context",
        message: reason || "The assistant wants to change the debug-context setting.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_THEME:
      return {
        task,
        title: "Change Theme",
        message: reason || "The assistant wants to change the app theme.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE:
      return {
        task,
        title: "Change Language",
        message: reason || "The assistant wants to change the app language.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS:
      return {
        task,
        title: "Download Covers",
        message: reason || "The assistant wants to download cover art for your library.",
        actionLabel: "Download"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION:
      return {
        task,
        title: "Change Library Section",
        message: reason || "The assistant wants to switch the library section.",
        actionLabel: "Switch"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW:
      return {
        task,
        title: "Change Library View",
        message: reason || "The assistant wants to change the library view mode.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH:
      return {
        task,
        title: "Search Library",
        message: reason || "The assistant wants to update the library search query.",
        actionLabel: "Search"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER:
      return {
        task,
        title: "Filter Library Platform",
        message: reason || "The assistant wants to change the library platform filter.",
        actionLabel: "Filter"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT:
      return {
        task,
        title: "Sort Library",
        message: reason || "The assistant wants to change the library sort order.",
        actionLabel: "Sort"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE:
      return {
        task,
        title: "Filter Emulator Type",
        message: reason || "The assistant wants to change the emulator type filter.",
        actionLabel: "Filter"
      };
    case SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS:
      return {
        task,
        title: "Clear Library Filters",
        message: reason || "The assistant wants to clear the library filters.",
        actionLabel: "Clear"
      };
    case SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS:
      return {
        task,
        title: "Open Game Details",
        message: reason || "The assistant wants to open a game details view.",
        actionLabel: "Open"
      };
    case SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS:
      return {
        task,
        title: "Open Emulator Details",
        message: reason || "The assistant wants to open an emulator details view.",
        actionLabel: "Open"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE:
      return {
        task,
        title: "Change Emulator Website",
        message: reason || "The assistant wants to update an emulator website override.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS:
      return {
        task,
        title: "Change Emulator Launch Args",
        message: reason || "The assistant wants to update emulator launch arguments.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY:
      return {
        task,
        title: "Change Emulator Working Directory",
        message: reason || "The assistant wants to update the emulator working directory.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH:
      return {
        task,
        title: "Change Emulator Config Path",
        message: reason || "The assistant wants to update the emulator config file path.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE:
      return {
        task,
        title: "Change Emulator Pre-Launch Commands",
        message: reason || "The assistant wants to update emulator pre-launch commands.",
        actionLabel: "Apply"
      };
    case SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS:
      return {
        task,
        title: "Clear Emulator Override Fields",
        message: reason || "The assistant wants to clear one or more emulator override fields.",
        actionLabel: "Clear"
      };
    default:
      return {
        task,
        title: "Assistant Request",
        message: reason || `The assistant wants to run ${String(task?.type || "a task").trim()}.`,
        actionLabel: "Run"
      };
  }
}

function buildSupportDownloadPayload(emulatorRow, currentOs = "windows") {
  const currentConfig = resolveEffectiveEmulatorConfig(emulatorRow);
  return {
    name: emulatorRow?.name || "",
    platform: emulatorRow?.platform || "",
    platformShortName: emulatorRow?.platformShortName || "",
    website: currentConfig.website || emulatorRow?.website || "",
    downloadUrl: emulatorRow?.downloadUrl || "",
    downloadLinks: emulatorRow?.downloadLinks || null,
    searchString: currentConfig.searchString || emulatorRow?.searchString || "",
    archiveFileMatchWin: emulatorRow?.archiveFileMatchWin || "",
    archiveFileMatchLinux: emulatorRow?.archiveFileMatchLinux || "",
    archiveFileMatchMac: emulatorRow?.archiveFileMatchMac || "",
    setupFileMatchWin: emulatorRow?.setupFileMatchWin || "",
    setupFileMatchLinux: emulatorRow?.setupFileMatchLinux || "",
    setupFileMatchMac: emulatorRow?.setupFileMatchMac || "",
    executableFileMatchWin: emulatorRow?.executableFileMatchWin || "",
    executableFileMatchLinux: emulatorRow?.executableFileMatchLinux || "",
    executableFileMatchMac: emulatorRow?.executableFileMatchMac || "",
    installers: emulatorRow?.installers || null,
    startParameters: currentConfig.startParameters || emulatorRow?.startParameters || emulatorRow?.args || "",
    type: emulatorRow?.type || "standalone",
    os: currentOs
  };
}

function formatSupportSystemSpecsText(result) {
  const directText = String(result?.specs?.text || result?.text || "").trim();
  if (directText) {
    return directText;
  }

  const specs = result?.specs && typeof result.specs === "object" ? result.specs : {};
  const lines = [
    specs.platform ? `Platform: ${String(specs.platform).trim()}` : "",
    specs.arch ? `Architecture: ${String(specs.arch).trim()}` : "",
    Number.isFinite(Number(specs.cpuCores)) ? `CPU Cores: ${Number(specs.cpuCores)}` : ""
  ].filter(Boolean);
  return lines.join("\n").trim();
}

function upsertPcSpecsBlock(details, specsText) {
  const base = String(details || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n*\[PC Specs\][\s\S]*$/i, "")
    .trim();
  const block = `${PC_SPECS_BLOCK_HEADER}\n${String(specsText || "").trim()}`.trim();
  if (!block || block === PC_SPECS_BLOCK_HEADER) {
    return base;
  }
  return `${base}\n\n${block}`.trim();
}

function summarizeSpecsForChat(specsText, maxLines = 10) {
  const lines = String(specsText || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return "";
  const clipped = lines.slice(0, Math.max(1, Number(maxLines || 10)));
  const suffix = lines.length > clipped.length ? "\n..." : "";
  return `${clipped.join("\n")}${suffix}`;
}

function normalizeSupportState(raw = {}, contextWindowMessages = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
  const source = raw && typeof raw === "object" ? raw : {};
  const normalizedContextWindow = normalizeSupportContextWindowMessages(contextWindowMessages, SUPPORT_CONTEXT_WINDOW_DEFAULT);
  return {
    draft: normalizeSupportDraft(source.draft || source),
    help: normalizeSupportHelpState(source.help || {}),
    chatHistory: normalizeSupportChatHistory(source.chatHistory || [], normalizedContextWindow),
    flags: {
      debugSupportEnabled: !!source.flags?.debugSupportEnabled,
      autoSpecsEnabled: !!source.flags?.autoSpecsEnabled,
      webAccessEnabled: !!source.flags?.webAccessEnabled
    }
  };
}

export const useSupportCenterStore = defineStore("supportCenter", {
  state: () => ({
    initialized: false,
    loading: false,
    running: false,
    specsBusy: false,
    helpLoading: false,
    status: "",
    statusTone: "",
    mode: "troubleshoot",
    issueType: "launch",
    issueSummary: "",
    platform: "",
    emulator: "",
    errorText: "",
    details: "",
    outputTitle: "Suggested Fix Steps",
    outputMarkdown: "Run a support request to get troubleshooting steps.",
    liveResponseText: "",
    liveResponseRaw: "",
    streamRequestId: "",
    debugPayload: null,
    pendingSupportTask: null,
    pendingTaskBusy: false,
    activeUserMessage: "",
    chatContextWindowSize: SUPPORT_CONTEXT_WINDOW_DEFAULT,
    chatHistory: [],
    matchedGameKeys: [],
    matchedEmulatorKeys: [],
    matchedGameCount: 0,
    matchedEmulatorCount: 0,
    lastMatchedQuery: "",
    helpQuery: "",
    helpDocs: [],
    selectedHelpDocId: "",
    selectedHelpDoc: null,
    debugSupportEnabled: false,
    autoSpecsEnabled: false,
    webAccessEnabled: false
  }),
  getters: {
    issueTypes() {
      return ISSUE_TYPES;
    }
  },
  actions: {
    buildPersistedState() {
      return normalizeSupportState({
        draft: {
          mode: this.mode,
          issueType: this.issueType,
          issueSummary: this.issueSummary,
          platform: this.platform,
          emulator: this.emulator,
          errorText: this.errorText,
          details: this.details
        },
        help: {
          query: this.helpQuery,
          selectedDocId: this.selectedHelpDocId
        },
        chatHistory: this.chatHistory,
        flags: {
          debugSupportEnabled: this.debugSupportEnabled,
          autoSpecsEnabled: this.autoSpecsEnabled,
          webAccessEnabled: this.webAccessEnabled
        }
      }, this.chatContextWindowSize);
    },
    persistNativeState() {
      void writeNativeShellState(SUPPORT_STATE_KEY, this.buildPersistedState());
    },
    persistDraft() {
      writeStorageJson(
        SUPPORT_DRAFT_STORAGE_KEY,
        {
          mode: this.mode,
          issueType: this.issueType,
          issueSummary: this.issueSummary,
          platform: this.platform,
          emulator: this.emulator,
          errorText: this.errorText,
          details: this.details
        },
        normalizeSupportDraft
      );
      this.persistNativeState();
    },
    persistHelpState() {
      writeStorageJson(
        SUPPORT_HELP_STATE_STORAGE_KEY,
        {
          query: this.helpQuery,
          selectedDocId: this.selectedHelpDocId
        },
        normalizeSupportHelpState
      );
      this.persistNativeState();
    },
    persistChatHistory() {
      writeStorageJson(
        SUPPORT_CHAT_HISTORY_STORAGE_KEY,
        this.chatHistory,
        (value) => normalizeSupportChatHistory(value, this.chatContextWindowSize)
      );
      this.persistNativeState();
    },
    refreshChatContextWindowSize(settings = null) {
      const nextSize = resolveSupportContextWindowFromSettings(settings);
      if (this.chatContextWindowSize === nextSize) {
        return false;
      }
      this.chatContextWindowSize = nextSize;
      this.chatHistory = normalizeSupportChatHistory(this.chatHistory, this.chatContextWindowSize);
      this.persistChatHistory();
      return true;
    },
    resetLiveResponse() {
      this.liveResponseText = "";
      this.liveResponseRaw = "";
      this.streamRequestId = "";
    },
    consumeSupportStreamEvent(event) {
      const eventName = String(event?.event || event?.name || SUPPORT_STREAM_EVENT_NAME).trim();
      if (eventName && eventName !== SUPPORT_STREAM_EVENT_NAME) {
        return;
      }

      const requestId = String(event?.requestId || "").trim();
      if (!requestId || requestId !== this.streamRequestId) {
        return;
      }

      const state = String(event?.state || "").trim().toLowerCase();
      if (state === "chunk") {
        const chunk = String(event?.chunk || "");
        if (!chunk) {
          return;
        }
        this.liveResponseRaw += chunk;
        this.liveResponseText = deriveSupportLiveResponseText(this.liveResponseRaw);
        if (this.mode !== "chat" && this.liveResponseText) {
          this.outputMarkdown = this.liveResponseText;
        }
        return;
      }

      if (state === "error") {
        this.status = String(event?.message || "Support request failed while streaming.");
        this.statusTone = "error";
        return;
      }

      if (state === "done") {
        if (this.mode !== "chat" && this.liveResponseText) {
          this.outputMarkdown = this.liveResponseText;
        }
      }
    },
    async hydrateFromStorage() {
      const llmSettings = loadSupportSettings();
      const contextWindowMessages = resolveSupportContextWindowFromSettings(llmSettings);
      const persisted = normalizeSupportState(
        await readNativeShellState(SUPPORT_STATE_KEY, {
          draft: readStorageJson(SUPPORT_DRAFT_STORAGE_KEY, {}, normalizeSupportDraft),
          help: readStorageJson(SUPPORT_HELP_STATE_STORAGE_KEY, {}, normalizeSupportHelpState),
          chatHistory: readStorageJson(
            SUPPORT_CHAT_HISTORY_STORAGE_KEY,
            [],
            (value) => normalizeSupportChatHistory(value, contextWindowMessages)
          ),
          flags: {
            debugSupportEnabled: readStorageBoolean(SUPPORT_DEBUG_STORAGE_KEY, false),
            autoSpecsEnabled: readStorageBoolean(SUPPORT_AUTO_SPECS_STORAGE_KEY, false),
            webAccessEnabled: readStorageBoolean(SUPPORT_WEB_ACCESS_STORAGE_KEY, false)
          }
        }),
        contextWindowMessages
      );
      const draft = persisted.draft;
      const helpState = persisted.help;

      this.mode = draft.mode;
      const locationMode = readLocationSupportMode();
      if (locationMode) {
        this.mode = locationMode;
      }
      this.issueType = draft.issueType;
      this.issueSummary = draft.issueSummary;
      this.platform = draft.platform;
      this.emulator = draft.emulator;
      this.errorText = draft.errorText;
      this.details = draft.details;
      this.helpQuery = helpState.query;
      this.selectedHelpDocId = helpState.selectedDocId;
      this.chatContextWindowSize = contextWindowMessages;
      this.chatHistory = normalizeSupportChatHistory(persisted.chatHistory, this.chatContextWindowSize);
      this.resetLiveResponse();
      this.debugSupportEnabled = persisted.flags.debugSupportEnabled;
      this.autoSpecsEnabled = persisted.flags.autoSpecsEnabled;
      this.webAccessEnabled = persisted.flags.webAccessEnabled;
      this.outputTitle = this.mode === "chat" ? "Conversation" : this.mode === "help" ? "Help Docs" : "Suggested Fix Steps";
      this.outputMarkdown =
        this.mode === "help"
          ? "Select a help topic to read it here."
          : "Run a support request to get troubleshooting steps.";
      syncLocationSupportMode(this.mode);
      this.persistNativeState();
    },
    setMode(nextMode, { persist = true } = {}) {
      this.mode = normalizeMode(nextMode);
      this.outputTitle = this.mode === "chat" ? "Conversation" : this.mode === "help" ? "Help Docs" : "Suggested Fix Steps";

      if (this.mode === "help") {
        if (!this.selectedHelpDoc) {
          this.outputMarkdown = "Select a help topic to read it here.";
        }
        if (!this.helpDocs.length) {
          void this.refreshHelpDocs({ openFirst: true });
        }
      } else if (this.mode === "troubleshoot") {
        this.outputMarkdown = "Run a support request to get troubleshooting steps.";
      }

      if (persist) {
        this.persistDraft();
      }
      syncLocationSupportMode(this.mode);
    },
    updateField(field, value) {
      const allowedFields = new Set(["issueSummary", "platform", "emulator", "errorText", "details"]);
      if (!allowedFields.has(field)) {
        return;
      }
      this[field] = String(value ?? "");
      this.persistDraft();
    },
    setIssueType(value) {
      this.issueType = normalizeIssueType(value);
      this.persistDraft();
    },
    setHelpQuery(value) {
      this.helpQuery = String(value || "");
      this.persistHelpState();
    },
    setDebugSupportEnabled(value) {
      this.debugSupportEnabled = !!value;
      writeStorageBoolean(SUPPORT_DEBUG_STORAGE_KEY, this.debugSupportEnabled);
      this.persistNativeState();
    },
    setAutoSpecsEnabled(value) {
      this.autoSpecsEnabled = !!value;
      writeStorageBoolean(SUPPORT_AUTO_SPECS_STORAGE_KEY, this.autoSpecsEnabled);
      this.persistNativeState();
    },
    setWebAccessEnabled(value) {
      this.webAccessEnabled = !!value;
      writeStorageBoolean(SUPPORT_WEB_ACCESS_STORAGE_KEY, this.webAccessEnabled);
      this.persistNativeState();
    },
    clearSession() {
      this.issueSummary = "";
      this.platform = "";
      this.emulator = "";
      this.errorText = "";
      this.details = "";
      this.status = "";
      this.statusTone = "";
      this.debugPayload = null;
      this.pendingSupportTask = null;
      this.pendingTaskBusy = false;
      this.activeUserMessage = "";
      this.resetLiveResponse();

      if (this.mode === "chat") {
        this.chatHistory = [];
        this.persistChatHistory();
      }
      if (this.mode === "help") {
        this.helpQuery = "";
        this.selectedHelpDocId = "";
        this.selectedHelpDoc = null;
        this.persistHelpState();
        void this.refreshHelpDocs({ openFirst: true });
      } else {
        this.outputMarkdown = "Run a support request to get troubleshooting steps.";
      }
      this.matchedGameKeys = [];
      this.matchedEmulatorKeys = [];
      this.matchedGameCount = 0;
      this.matchedEmulatorCount = 0;
      this.lastMatchedQuery = "";

      this.persistDraft();
    },
    async fetchSupportSystemSpecsText() {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        throw new Error("Desktop bridge unavailable.");
      }
      const result = await bridge.invoke("system:get-specs");
      const specsText = formatSupportSystemSpecsText(result);
      if (!result?.success || !specsText) {
        throw new Error("Failed to collect system specs.");
      }
      return specsText;
    },
    dismissPendingSupportTask() {
      if (this.pendingTaskBusy) {
        return;
      }
      this.pendingSupportTask = null;
      this.status = "Assistant request dismissed.";
      this.statusTone = "";
      this.persistNativeState();
    },
    async approvePendingSupportTask() {
      const task = this.pendingSupportTask?.task;
      if (!task || !String(task.type || "").trim()) {
        return;
      }
      this.pendingTaskBusy = true;
      this.pendingSupportTask = null;
      this.status = "Running assistant request...";
      this.statusTone = "";
      try {
        await this.executeSupportAssistantTask(task, {
          skipUserHistoryAppend: true,
          taskDepth: 1
        });
      } finally {
        this.pendingTaskBusy = false;
      }
    },
    async executeSupportAssistantTask(taskInput, { skipUserHistoryAppend = true, taskDepth = 1 } = {}) {
      const task = typeof taskInput === "string"
        ? { type: normalizeSupportTaskType(taskInput), confidence: 1, reason: "", args: {} }
        : {
            type: normalizeSupportTaskType(taskInput?.type || ""),
            confidence: normalizeSupportTaskConfidence(taskInput?.confidence),
            reason: String(taskInput?.reason || "").trim(),
            args: taskInput?.args && typeof taskInput.args === "object" && !Array.isArray(taskInput.args) ? taskInput.args : {}
          };
      const taskType = String(task.type || "").trim().toUpperCase();
      if (!taskType) {
        this.status = "Unsupported support task: unknown";
        this.statusTone = "error";
        return;
      }

      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.status = "Desktop bridge unavailable.";
        this.statusTone = "error";
        return;
      }

      if (taskType === SUPPORT_ASSISTANT_TASK_FETCH_SPECS) {
        this.specsBusy = true;
        this.status = "Collecting system specs...";
        this.statusTone = "";
        try {
          const specsText = await this.fetchSupportSystemSpecsText();
          this.details = upsertPcSpecsBlock(this.details, specsText);
          this.persistDraft();
          const preview = summarizeSpecsForChat(specsText);
          if (this.mode === "chat") {
            if (preview) {
              this.chatHistory = normalizeSupportChatHistory([
                ...this.chatHistory,
                { role: "assistant", text: `Fetched your PC specs:\n\n\`\`\`\n${preview}\n\`\`\`` }
              ], this.chatContextWindowSize);
              this.persistChatHistory();
            }
          }
          this.status = "System specs attached. Continuing support request...";
          await this.runSupport({
            skipUserHistoryAppend,
            taskDepth,
            taskResultOverride: buildSupportTaskResultOverride(
              taskType,
              preview
                ? `Fetched your PC specs:\n\n\`\`\`\n${preview}\n\`\`\``
                : "Fetched your PC specs.",
              {
                entityKind: "system"
              }
            )
          });
        } catch (error) {
          this.status = error instanceof Error ? error.message : "Failed to collect system specs.";
          this.statusTone = "error";
        } finally {
          this.specsBusy = false;
        }
        return;
      }

      const workspaceStore = useWorkspaceStore();
      await workspaceStore.initialize();

      try {
        if (taskType === SUPPORT_ASSISTANT_TASK_RUN_GAME) {
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          if (!gameRow) {
            const emulatorRow = findSupportEmulatorByTask(workspaceStore.emulators, task);
            if (!emulatorRow) {
              throw new Error("Assistant requested a game launch, but no matching game row was found.");
            }
            const config = resolveEffectiveEmulatorConfig(emulatorRow);
            const launchPath =
              loadSelectedLaunchPath(emulatorRow, Array.isArray(emulatorRow.filePaths) ? emulatorRow.filePaths : [emulatorRow.filePath]) || emulatorRow.filePath;
            if (!launchPath) {
              throw new Error(`No launch path is recorded for ${emulatorRow.name}.`);
            }
            const result = await bridge.invoke("launch-emulator", {
              filePath: launchPath,
              args: String(config.launchArgs || "").trim(),
              workingDirectory: config.workingDirectory || emulatorRow.workingDirectory,
              inputBindings: config.effectiveInputBindings,
              gamepadBindings: config.effectiveGamepadBindings?.gamepad || {},
              runCommandsBefore: config.runCommandsBefore,
              name: emulatorRow.name
            });
            if (!result?.success) {
              throw new Error(String(result?.message || "Failed to launch emulator."));
            }
            this.status = String(result?.message || `Launched ${emulatorRow.name}.`);
            this.statusTone = "success";
            await appendSupportTaskMessageAndContinue(this, `Launched **${emulatorRow.name}**.`, {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "emulator",
              entityName: String(emulatorRow.name || "").trim(),
              resultData: {
                emulatorId: Number(emulatorRow.id || 0),
                emulatorKey: String(emulatorRow.key || "").trim()
              }
            });
            return;
          }
          const result = await bridge.invoke("launch-game", { gameId: gameRow.id });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to launch game."));
          }
          this.status = String(result?.message || `Launched ${gameRow.name}.`);
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Launched **${gameRow.name}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "game",
            entityName: String(gameRow.name || "").trim(),
            resultData: {
              gameId: Number(gameRow.id || 0),
              gameKey: String(gameRow.key || "").trim()
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_RUN_EMULATOR) {
          const emulatorRow = findSupportEmulatorByTask(workspaceStore.emulators, task);
          if (!emulatorRow) {
            const gameRow = findSupportGameByTask(workspaceStore.games, task);
            if (!gameRow) {
              throw new Error("Assistant requested an emulator launch, but no matching emulator row was found.");
            }
            const result = await bridge.invoke("launch-game", { gameId: gameRow.id });
            if (!result?.success) {
              throw new Error(String(result?.message || "Failed to launch game."));
            }
            this.status = String(result?.message || `Launched ${gameRow.name}.`);
            this.statusTone = "success";
            await appendSupportTaskMessageAndContinue(this, `Launched **${gameRow.name}**.`, {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "game",
              entityName: String(gameRow.name || "").trim(),
              resultData: {
                gameId: Number(gameRow.id || 0),
                gameKey: String(gameRow.key || "").trim()
              }
            });
            return;
          }
          const config = resolveEffectiveEmulatorConfig(emulatorRow);
          const launchPath =
            loadSelectedLaunchPath(emulatorRow, Array.isArray(emulatorRow.filePaths) ? emulatorRow.filePaths : [emulatorRow.filePath]) || emulatorRow.filePath;
          if (!launchPath) {
            throw new Error(`No launch path is recorded for ${emulatorRow.name}.`);
          }
          const result = await bridge.invoke("launch-emulator", {
            filePath: launchPath,
            args: String(config.launchArgs || "").trim(),
            workingDirectory: config.workingDirectory || emulatorRow.workingDirectory,
            inputBindings: config.effectiveInputBindings,
            gamepadBindings: config.effectiveGamepadBindings?.gamepad || {},
            runCommandsBefore: config.runCommandsBefore,
            name: emulatorRow.name
          });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to launch emulator."));
          }
          this.status = String(result?.message || `Launched ${emulatorRow.name}.`);
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Launched **${emulatorRow.name}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "emulator",
            entityName: String(emulatorRow.name || "").trim(),
            resultData: {
              emulatorId: Number(emulatorRow.id || 0),
              emulatorKey: String(emulatorRow.key || "").trim()
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR) {
          const emulatorRow = findSupportEmulatorByTask(workspaceStore.emulators, task);
          if (!emulatorRow) {
            throw new Error("Assistant requested an emulator download, but no matching emulator row was found.");
          }
          const payload = {
            ...buildSupportDownloadPayload(emulatorRow, String(window?.emubro?.platform || "windows").trim().toLowerCase()),
            installMethod: "download",
            packageType: "",
            specificUrl: "",
            useWaybackFallback: false,
            waybackSourceUrl: String(emulatorRow.website || emulatorRow.downloadUrl || "").trim(),
            waybackUrl: ""
          };
          const result = await bridge.invoke("download-install-emulator", payload);
          if (!result?.success && !result?.manual) {
            throw new Error(String(result?.message || "Failed to download emulator."));
          }
          await workspaceStore.refresh();
          this.status = String(
            result?.message || (result?.manual ? `Opened download source for ${emulatorRow.name}.` : `Download/install finished for ${emulatorRow.name}.`)
          );
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(
            this,
            result?.manual
              ? `Opened the download source for **${emulatorRow.name}**.`
              : `Started install for **${emulatorRow.name}**.`,
            {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "emulator",
              entityName: String(emulatorRow.name || "").trim(),
              resultData: {
                emulatorId: Number(emulatorRow.id || 0),
                emulatorKey: String(emulatorRow.key || "").trim(),
                manual: !!result?.manual
              }
            }
          );
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY) {
          const kind = normalizeSupportLibraryTaskKind(task);
          const limit = normalizeSupportLibraryTaskLimit(task);
          this.status = "Refreshing local library context...";
          this.statusTone = "";
          await workspaceStore.refresh();
          const result = await bridge.invoke("support:query-library", {
            query: "",
            queries: [],
            kind,
            limit
          });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to refresh local library context."));
          }
          const matches = await this.resolveLibraryMatches({ overrideMatches: result });
          this.status = `Library refreshed. ${describeSupportLibraryQueryResult(matches, "")}`;
          this.statusTone = "success";
          await this.runSupport({
            skipUserHistoryAppend: true,
            taskDepth: taskDepth + 1,
            libraryMatchesOverride: matches
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_READ_LIBRARY) {
          const queries = normalizeSupportLibraryTaskQueries(task);
          const query = queries[0] || "";
          const kind = normalizeSupportLibraryTaskKind(task);
          const limit = normalizeSupportLibraryTaskLimit(task);
          this.status = queries.length > 1
            ? `Querying local library for ${queries.length} requested titles...`
            : (query ? `Querying local library for "${query}"...` : "Loading full library context...");
          this.statusTone = "";

          const result = await bridge.invoke("support:query-library", {
            query,
            queries,
            kind,
            limit
          });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to query local library."));
          }
          const matches = await this.resolveLibraryMatches({ overrideMatches: result });
          this.status = describeSupportLibraryQueryResult(matches, query);

          this.statusTone = "success";
          await this.runSupport({
            skipUserHistoryAppend: true,
            taskDepth: taskDepth + 1,
            libraryMatchesOverride: matches
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_LIST_TAGS) {
          const result = await bridge.invoke("tags:list");
          const query = normalizeSupportTagCandidates(task)[0] || "";
          const tagRows = filterSupportTagsByTask(result?.tags || [], task);
          this.status = query
            ? `Loaded ${tagRows.length} matching tags for "${query}".`
            : `Loaded ${tagRows.length} tags.`;
          this.statusTone = "success";
          appendSupportAssistantMessage(this, formatSupportTagListMarkdown(tagRows, query));
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_ADD_TAGS) {
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          if (!gameRow) {
            throw new Error("Assistant requested tag changes, but no matching game row was found.");
          }
          const tagsResult = await bridge.invoke("tags:list");
          const tagRows = Array.isArray(tagsResult?.tags) ? tagsResult.tags : [];
          const tagByName = new Map();
          const tagLabelById = new Map();
          tagRows.forEach((row) => {
            const tagName = String(row?.name || "").trim().toLowerCase();
            const tagId = Number(row?.id || 0);
            if (!tagName || !tagId) return;
            if (!tagByName.has(tagName)) tagByName.set(tagName, tagId);
            if (!tagLabelById.has(tagId)) tagLabelById.set(tagId, String(row?.name || row?.label || row?.id || "").trim());
          });
          const args = task.args && typeof task.args === "object" ? task.args : {};
          const incomingNamesRaw = Array.isArray(args.tags) ? args.tags : (Array.isArray(args.tagNames) ? args.tagNames : []);
          const incomingNames = incomingNamesRaw.map((v) => String(v || "").trim().toLowerCase()).filter(Boolean);
          const incomingIdsRaw = Array.isArray(args.tagIds) ? args.tagIds : [];
          const incomingIds = incomingIdsRaw
            .map((v) => Number(v || 0))
            .filter((v) => Number.isFinite(v) && v > 0);
          incomingNames.forEach((name) => {
            const id = Number(tagByName.get(name) || 0);
            if (id > 0) incomingIds.push(id);
          });
          const existingIds = Array.isArray(gameRow?.tags)
            ? gameRow.tags.map((v) => Number(v || 0)).filter((v) => Number.isFinite(v) && v > 0)
            : [];
          const merged = Array.from(new Set([...existingIds, ...incomingIds]));
          if (!merged.length) {
            throw new Error("No valid tags were provided. Use existing tag names/ids.");
          }
          const resolvedTagNames = merged
            .map((id) => String(tagLabelById.get(Number(id)) || "").trim())
            .filter(Boolean);
          const updateResult = await bridge.invoke("update-game-metadata", {
            gameId: Number(gameRow.id || 0),
            tags: merged
          });
          if (!updateResult?.success) {
            throw new Error(String(updateResult?.message || "Failed to update game tags."));
          }
          await workspaceStore.refresh();
          this.status = `Applied tags to ${gameRow.name}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Applied tags to **${gameRow.name}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "game",
            entityName: String(gameRow.name || "").trim(),
            resultData: {
              gameId: Number(gameRow.id || 0),
              gameKey: String(gameRow.key || "").trim(),
              tagIds: merged,
              tagNames: resolvedTagNames
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_REMOVE_TAGS) {
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          if (!gameRow) {
            throw new Error("Assistant requested tag removal, but no matching game row was found.");
          }
          const tagsResult = await bridge.invoke("tags:list");
          const tagRows = Array.isArray(tagsResult?.tags) ? tagsResult.tags : [];
          const tagLabelById = new Map();
          tagRows.forEach((row) => {
            const tagId = Number(row?.id || 0);
            if (!tagId) return;
            if (!tagLabelById.has(tagId)) tagLabelById.set(tagId, String(row?.name || row?.label || row?.id || "").trim());
          });
          const removeIds = resolveSupportTagIdsForTask(tagRows, task);
          if (!removeIds.length) {
            throw new Error("No valid tags were provided to remove.");
          }
          const existingIds = Array.isArray(gameRow?.tags)
            ? gameRow.tags.map((value) => Number(value || 0)).filter((value) => Number.isFinite(value) && value > 0)
            : [];
          const removeSet = new Set(removeIds);
          const nextTags = existingIds.filter((value) => !removeSet.has(value));
          if (nextTags.length === existingIds.length) {
            throw new Error(`None of the requested tags are currently assigned to ${gameRow.name}.`);
          }
          const removedTagNames = removeIds
            .map((id) => String(tagLabelById.get(Number(id)) || "").trim())
            .filter(Boolean);
          const updateResult = await bridge.invoke("update-game-metadata", {
            gameId: Number(gameRow.id || 0),
            tags: nextTags
          });
          if (!updateResult?.success) {
            throw new Error(String(updateResult?.message || "Failed to update game tags."));
          }
          await workspaceStore.refresh();
          this.status = `Removed tags from ${gameRow.name}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Removed tags from **${gameRow.name}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "game",
            entityName: String(gameRow.name || "").trim(),
            resultData: {
              gameId: Number(gameRow.id || 0),
              gameKey: String(gameRow.key || "").trim(),
              removedTagIds: removeIds,
              removedTagNames
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS) {
          if (!bridge?.helpDocs) {
            throw new Error("Desktop help-docs bridge unavailable.");
          }
          const query = normalizeSupportHelpDocQuery(task);
          const limit = Math.max(1, Math.min(50, Number(task?.args?.limit || 20) || 20));
          const result = await bridge.helpDocs.list({ query, limit });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to load help docs."));
          }
          const docs = Array.isArray(result.docs) ? result.docs : [];
          this.helpQuery = query;
          this.helpDocs = docs;
          if (!this.selectedHelpDocId && docs.length) {
            this.selectedHelpDocId = String(docs[0]?.id || "").trim();
          }
          this.persistHelpState();
          this.status = query
            ? `Found ${docs.length} help docs for "${query}".`
            : `Loaded ${docs.length} help docs.`;
          this.statusTone = "success";
          appendSupportAssistantMessage(this, formatSupportHelpDocListMarkdown(docs, query));
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_READ_HELP_DOC) {
          if (!bridge?.helpDocs) {
            throw new Error("Desktop help-docs bridge unavailable.");
          }
          let docId = String(task?.args?.docId || task?.args?.id || "").trim();
          let query = normalizeSupportHelpDocQuery(task);
          if (!docId) {
            const listResult = await bridge.helpDocs.list({
              query,
              limit: Math.max(1, Math.min(50, Number(task?.args?.limit || 20) || 20))
            });
            if (!listResult?.success) {
              throw new Error(String(listResult?.message || "Failed to search help docs."));
            }
            const docs = Array.isArray(listResult.docs) ? listResult.docs : [];
            const match = findSupportHelpDocByTask(docs, task);
            if (!match) {
              throw new Error("No matching help doc was found.");
            }
            docId = String(match?.id || "").trim();
            if (!query) {
              query = String(match?.title || match?.id || "").trim();
            }
          }
          if (!docId) {
            throw new Error("Help doc id is required.");
          }
          const result = await bridge.helpDocs.get({ id: docId });
          if (!result?.success || !result?.doc) {
            throw new Error(String(result?.message || "Failed to load help doc."));
          }
          const doc = result.doc;
          this.helpQuery = query;
          this.selectedHelpDocId = String(doc?.id || docId).trim();
          this.helpDoc = doc;
          this.persistHelpState();
          this.status = `Loaded help doc ${String(doc?.title || doc?.id || "Help Doc").trim()}.`;
          this.statusTone = "success";
          appendSupportAssistantMessage(this, formatSupportHelpDocMarkdown(doc));
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS) {
          if (!bridge?.supportTaskDocs) {
            throw new Error("Desktop self-task-doc bridge unavailable.");
          }
          const query = normalizeSupportSelfTaskDocQuery(task);
          const limit = Math.max(1, Math.min(20, Number(task?.args?.limit || 12) || 12));
          const result = await bridge.supportTaskDocs.list({ query, limit });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to list self-task docs."));
          }
          const docs = Array.isArray(result.docs) ? result.docs : [];
          const docsOverride = buildSupportSelfTaskDocsOverride(docs, query, "list");
          this.status = query
            ? `Loaded ${docs.length} self-task docs for "${query}". Continuing support...`
            : `Loaded ${docs.length} self-task docs. Continuing support...`;
          this.statusTone = "success";
          await this.runSupport({
            skipUserHistoryAppend: true,
            taskDepth: taskDepth + 1,
            selfTaskDocsOverride: docsOverride
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC) {
          if (!bridge?.supportTaskDocs) {
            throw new Error("Desktop self-task-doc bridge unavailable.");
          }
          const query = normalizeSupportSelfTaskDocQuery(task);
          const docIds = normalizeSupportSelfTaskDocIds(task);
          const maxDocs = normalizeSupportSelfTaskDocLimit(task);
          let targetIds = docIds;

          if (!targetIds.length) {
            const listResult = await bridge.supportTaskDocs.list({
              query,
              limit: maxDocs
            });
            if (!listResult?.success) {
              throw new Error(String(listResult?.message || "Failed to search self-task docs."));
            }
            targetIds = (Array.isArray(listResult.docs) ? listResult.docs : [])
              .map((doc) => String(doc?.id || "").trim())
              .filter(Boolean)
              .slice(0, maxDocs);
          }

          if (!targetIds.length) {
            throw new Error("No matching self-task docs were found.");
          }

          const docs = [];
          for (const docId of targetIds.slice(0, maxDocs)) {
            const docResult = await bridge.supportTaskDocs.get({ id: docId });
            if (docResult?.success && docResult?.doc) {
              docs.push(docResult.doc);
            }
          }
          if (!docs.length) {
            throw new Error("Failed to load the requested self-task docs.");
          }

          const docsOverride = buildSupportSelfTaskDocsOverride(docs, query || targetIds.join(", "), "read");
          this.status = `Loaded ${docs.length} self-task doc${docs.length === 1 ? "" : "s"}. Continuing support...`;
          this.statusTone = "success";
          await this.runSupport({
            skipUserHistoryAppend: true,
            taskDepth: taskDepth + 1,
            selfTaskDocsOverride: docsOverride
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_RELEASE_DATE) {
          const query = normalizeSupportReleaseDateQuery(task);
          if (!query) {
            throw new Error("Assistant requested a platform release date lookup, but no platform query was provided.");
          }
          const platforms = await bridge.invoke("get-platforms");
          const platformRow = findSupportPlatformRowByQuery(platforms, query);
          if (!platformRow) {
            throw new Error(`No matching platform config was found for "${query}".`);
          }
          const releaseSummary = buildSupportReleaseDateSummary(platformRow, task);
          const platformLabel = String(platformRow?.name || platformRow?.shortName || query).trim();
          if (!releaseSummary.found) {
            this.status = `No local release date is recorded for ${platformLabel}. Continuing with fallback reasoning...`;
            this.statusTone = "";
            await appendSupportTaskMessageAndContinue(this, `**Local config:** No release date is recorded for **${platformLabel}** in emuBro platform config.

**Fallback reasoning:** I'll now rely on general model knowledge for the date.`, {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "platform",
              entityName: platformLabel,
              resultData: {
                found: false,
                source: "platform-config",
                platformName: platformLabel,
                shortName: String(platformRow?.shortName || "").trim(),
                platformDir: String(platformRow?.platformDir || "").trim()
              }
            });
            return;
          }
          const messageText = `**Local config:** Release date for **${platformLabel}**
${releaseSummary.message}`;
          this.status = `Loaded release date for ${platformLabel}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, messageText, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "platform",
            entityName: platformLabel,
            resultData: {
              found: true,
              source: "platform-config",
              platformName: platformLabel,
              shortName: String(platformRow?.shortName || "").trim(),
              platformDir: String(platformRow?.platformDir || "").trim(),
              companyName: String(platformRow?.companyName || "").trim(),
              releaseDate: releaseSummary.releaseDate
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE) {
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          const query = normalizeSupportTaskNameCandidates(task)[0] || "";
          if (!gameRow) {
            throw new Error(query
              ? `No matching game was found for "${query}".`
              : "Assistant requested a game release date lookup, but no matching game was found.");
          }
          const gameSummary = buildSupportGameReleaseDateSummary(gameRow);
          const gameLabel = String(gameRow?.name || query || "game").trim();
          const platformLabel = String(gameRow?.platform || gameRow?.platformShortName || "").trim();
          if (!gameSummary.found) {
            this.status = `No local game release date is recorded for ${gameLabel}. Continuing with fallback reasoning...`;
            this.statusTone = "";
            await appendSupportTaskMessageAndContinue(this, `**Local library:** No release date is recorded for **${gameLabel}**${platformLabel ? ` on **${platformLabel}**` : ""}.\n\n**Fallback reasoning:** I'll now rely on general model knowledge${this.webAccessEnabled ? " or web-backed reasoning if needed" : ""} for the game's release date.`, {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "game",
              entityName: gameLabel,
              resultData: {
                found: false,
                source: "game-library",
                gameName: gameLabel,
                platform: platformLabel,
                gameId: Number(gameRow?.id || 0) || null
              }
            });
            return;
          }
          const messageText = `**Local library:** Release date for **${gameLabel}**${platformLabel ? ` (${platformLabel})` : ""}\n${gameSummary.value}`;
          this.status = `Loaded game release date for ${gameLabel}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, messageText, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "game",
            entityName: gameLabel,
            resultData: {
              found: true,
              source: "game-library",
              gameName: gameLabel,
              platform: platformLabel,
              gameId: Number(gameRow?.id || 0) || null,
              releaseDate: gameSummary.value
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER) {
          const args = task.args && typeof task.args === "object" ? task.args : {};
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          const directQuery = String(
            args.query
              || args.title
              || args.gameName
              || args.name
              || ""
          ).trim();
          const mode = normalizeSupportCoverTaskMode(task);
          const limit = normalizeSupportCoverTaskLimit(task);
          const existingCover = gameRow ? buildSupportCoverAttachmentFromGameRow(gameRow, "library") : null;
          let coverAttachments = [];
          let resultSource = "library";
          let resolvedQuery = buildSupportCoverSearchQuery(gameRow, directQuery);

          if ((mode === "library" || mode === "auto") && existingCover) {
            coverAttachments = [existingCover];
            resultSource = "library";
          }

          if (!coverAttachments.length && gameRow && mode !== "search") {
            const downloadResult = await bridge.invoke("covers:download-for-game", {
              gameId: Number(gameRow.id || 0),
              overwrite: false,
              onlyMissing: true
            });
            if (downloadResult?.success) {
              const downloadedCover = buildSupportCoverAttachmentFromResult(downloadResult, gameRow, "download");
              if (downloadedCover) {
                coverAttachments = [downloadedCover];
                resultSource = "download";
              }
            }
          }

          if (!coverAttachments.length) {
            if (!resolvedQuery) {
              throw new Error("Assistant requested a game cover, but no game title or query was provided.");
            }
            if (!this.webAccessEnabled) {
              throw new Error(
                gameRow
                  ? `No recorded cover was found for ${String(gameRow.name || "that game")}, and web cover search is disabled.`
                  : "Web cover search is disabled. Enable support web access or ask for a recorded local cover."
              );
            }
            const searchResult = await bridge.invoke("covers:search-web", {
              query: resolvedQuery,
              limit
            });
            if (!searchResult?.success) {
              throw new Error(String(searchResult?.message || "Failed to search web covers."));
            }
            coverAttachments = buildSupportCoverAttachmentsFromSearchResults(searchResult?.results, gameRow, limit, directQuery || resolvedQuery);
            resultSource = "web-search";
          }

          if (!coverAttachments.length) {
            throw new Error(gameRow
              ? `No usable cover image was found for ${String(gameRow.name || "that game")}.`
              : "No usable cover image was found for that query.");
          }

          const coverLabel = String(gameRow?.name || directQuery || coverAttachments[0]?.title || "that game").trim();
          const messageText = coverAttachments.length === 1
            ? `Here is the cover for **${coverLabel}**.`
            : `Here are ${coverAttachments.length} cover results for **${coverLabel}**.`;
          this.status = messageText;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, messageText, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            attachments: coverAttachments,
            entityKind: "game",
            entityName: coverLabel,
            resultData: {
              source: resultSource,
              query: resolvedQuery,
              gameId: Number(gameRow?.id || 0),
              gameKey: String(gameRow?.key || "").trim(),
              coverCount: coverAttachments.length,
              covers: coverAttachments
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER) {
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          if (!gameRow?.id) {
            throw new Error("Assistant requested a game cover update, but no matching game was found.");
          }
          const selectedCover = resolveSupportCoverAttachmentSelection(this.chatHistory, task, gameRow);
          const imageUrl = String(selectedCover?.imageUrl || selectedCover?.thumbnailUrl || "").trim();
          if (!imageUrl) {
            throw new Error("No cover image is available to apply yet. Ask me to show or fetch the cover first.");
          }
          const updateResult = await bridge.invoke("update-game-metadata", {
            gameId: Number(gameRow.id || 0),
            image: imageUrl
          });
          if (!updateResult?.success) {
            throw new Error(String(updateResult?.message || "Failed to apply the selected game cover."));
          }
          const coverLabel = String(gameRow?.name || selectedCover?.title || "that game").trim();
          this.status = `Applied the selected cover to ${coverLabel}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Applied the selected cover to **${coverLabel}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            attachments: selectedCover ? [selectedCover] : [],
            entityKind: "game",
            entityName: coverLabel,
            resultData: {
              gameId: Number(gameRow?.id || 0),
              gameKey: String(gameRow?.key || "").trim(),
              imageUrl,
              source: String(selectedCover?.source || "").trim(),
              sourceUrl: String(selectedCover?.sourceUrl || selectedCover?.pageUrl || "").trim()
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW) {
          const args = task.args && typeof task.args === "object" ? task.args : {};
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          const directUrl = String(args.url || args.videoUrl || "").trim();
          const query = String(args.query || gameRow?.name || this.issueSummary || "").trim();
          const target = /^https?:\/\//i.test(directUrl)
            ? directUrl
            : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          const openResult = await bridge.invoke("open-external-url", target);
          if (!openResult?.success) {
            throw new Error(String(openResult?.message || "Failed to open YouTube preview."));
          }
          this.status = String(openResult?.message || "Opened YouTube preview.");
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(
            this,
            `Opened YouTube preview${gameRow?.name ? ` for **${gameRow.name}**` : ""}.`,
            {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: gameRow?.name ? "game" : "",
              entityName: String(gameRow?.name || "").trim(),
              resultData: {
                url: target
              }
            }
          );
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE) {
          const nextMode = normalizeSupportTaskModeTarget(task);
          this.setMode(nextMode);
          this.status = `Switched support mode to ${nextMode}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Switched support mode to **${nextMode}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-mode",
            entityName: nextMode,
            resultData: { mode: nextMode }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM) {
          const platformValue = readSupportTaskStringArg(task, ["platform", "value", "name", "query"]);
          if (!platformValue) {
            throw new Error("Assistant requested a platform change, but no platform value was provided.");
          }
          this.updateField("platform", platformValue);
          this.status = `Updated platform to ${platformValue}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Updated the support platform to **${platformValue}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-field",
            entityName: "platform",
            resultData: { field: "platform", value: platformValue }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR) {
          const emulatorValue = readSupportTaskStringArg(task, ["emulator", "value", "name", "query"]);
          if (!emulatorValue) {
            throw new Error("Assistant requested an emulator change, but no emulator value was provided.");
          }
          this.updateField("emulator", emulatorValue);
          this.status = `Updated emulator to ${emulatorValue}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Updated the support emulator to **${emulatorValue}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-field",
            entityName: "emulator",
            resultData: { field: "emulator", value: emulatorValue }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE) {
          const issueTypeValue = normalizeSupportTaskIssueTypeTarget(task);
          this.setIssueType(issueTypeValue);
          this.status = `Updated issue type to ${issueTypeValue}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Updated the issue type to **${issueTypeValue}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-field",
            entityName: "issueType",
            resultData: { field: "issueType", value: issueTypeValue }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY) {
          const summaryValue = readSupportTaskStringArg(task, ["summary", "issueSummary", "message", "text", "value"]);
          if (!summaryValue) {
            throw new Error("Assistant requested a summary change, but no summary text was provided.");
          }
          this.updateField("issueSummary", summaryValue);
          this.status = "Updated the support summary.";
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Updated the support summary to:\n\n> ${summaryValue}`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-field",
            entityName: "issueSummary",
            resultData: { field: "issueSummary", value: summaryValue }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_APPEND_DETAILS) {
          const detailText = readSupportTaskStringArg(task, ["details", "text", "message", "value"]);
          if (!detailText) {
            throw new Error("Assistant requested a details update, but no detail text was provided.");
          }
          const nextDetails = this.details
            ? `${String(this.details).trim()}\n\n${detailText}`
            : detailText;
          this.updateField("details", nextDetails);
          this.status = "Appended support details.";
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Appended additional support details.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-field",
            entityName: "details",
            resultData: { field: "details", appendedText: detailText }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD) {
          const fields = normalizeSupportTaskClearFields(task);
          if (!fields.length) {
            throw new Error("Assistant requested a field clear, but no supported field target was provided.");
          }
          fields.forEach((field) => {
            if (field === "issueSummary") {
              this.updateField("issueSummary", "");
            } else if (field === "platform") {
              this.updateField("platform", "");
            } else if (field === "emulator") {
              this.updateField("emulator", "");
            } else if (field === "errorText") {
              this.updateField("errorText", "");
            } else if (field === "details") {
              this.updateField("details", "");
            }
          });
          this.status = `Cleared ${fields.join(", ")}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Cleared support field${fields.length === 1 ? "" : "s"}: **${fields.join("**, **")}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-field",
            entityName: fields.join(", "),
            resultData: { fields }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION) {
          this.clearSession();
          this.status = "Cleared the current support session.";
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Cleared the current support session.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-session",
            entityName: "current",
            resultData: { cleared: true }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS) {
          const enabled = normalizeSupportTaskBooleanValue(task, !this.autoSpecsEnabled);
          this.setAutoSpecsEnabled(enabled);
          this.status = `Auto specs ${enabled ? "enabled" : "disabled"}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `${enabled ? "Enabled" : "Disabled"} automatic specs fetching.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-setting",
            entityName: "autoSpecs",
            resultData: { enabled }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS) {
          const enabled = normalizeSupportTaskBooleanValue(task, !this.webAccessEnabled);
          this.setWebAccessEnabled(enabled);
          this.status = `Web access ${enabled ? "enabled" : "disabled"}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `${enabled ? "Enabled" : "Disabled"} web access for support.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-setting",
            entityName: "webAccess",
            resultData: { enabled }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT) {
          const enabled = normalizeSupportTaskBooleanValue(task, !this.debugSupportEnabled);
          this.setDebugSupportEnabled(enabled);
          this.status = `Debug context ${enabled ? "enabled" : "disabled"}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `${enabled ? "Enabled" : "Disabled"} debug context.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "support-setting",
            entityName: "debugContext",
            resultData: { enabled }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_THEME) {
          const nextTone = normalizeSupportTaskThemeTarget(task);
          if (!nextTone) {
            throw new Error("Assistant requested a theme change, but no supported theme tone was provided.");
          }
          const shellThemeStore = useShellThemeStore();
          await shellThemeStore.initialize();
          shellThemeStore.useTonePreset(nextTone);
          await shellThemeStore.save();
          this.status = `Theme changed to ${nextTone}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Changed the app theme to **${nextTone}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "app-setting",
            entityName: "theme",
            resultData: {
              tone: nextTone
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE) {
          const targetLanguage = normalizeSupportTaskLanguageTarget(task);
          if (!targetLanguage) {
            throw new Error("Assistant requested a language change, but no language target was provided.");
          }
          const shellLanguageStore = useShellLanguageStore();
          await shellLanguageStore.initialize();
          const normalizedTarget = targetLanguage.trim().toLowerCase();
          const matchedLanguage = (Array.isArray(shellLanguageStore.rows) ? shellLanguageStore.rows : []).find((row) => {
            const code = String(row?.code || "").trim().toLowerCase();
            const label = String(row?.label || "").trim().toLowerCase();
            const abbreviation = String(row?.abbreviation || "").trim().toLowerCase();
            return code === normalizedTarget || label === normalizedTarget || abbreviation === normalizedTarget;
          });
          const appliedCode = await shellLanguageStore.setCurrentLanguage(matchedLanguage?.code || normalizedTarget);
          const appliedLabel = String(matchedLanguage?.label || appliedCode || targetLanguage).trim();
          this.status = `Language changed to ${appliedLabel}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Changed the app language to **${appliedLabel}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "app-setting",
            entityName: "language",
            resultData: {
              code: appliedCode,
              label: appliedLabel
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS) {
          const coverDownloaderStore = useCoverDownloaderStore();
          await coverDownloaderStore.initialize();
          const args = task.args && typeof task.args === "object" ? task.args : {};
          const overwrite = !!(args.overwrite === true || args.force === true);
          const onlyMissing = args.onlyMissing === false ? false : !overwrite;
          coverDownloaderStore.onlyMissing = onlyMissing;
          coverDownloaderStore.overwrite = overwrite;
          const result = await coverDownloaderStore.runDownload();
          if (!result?.success) {
            throw new Error(String(coverDownloaderStore.status || result?.message || "Cover download failed."));
          }
          this.status = String(coverDownloaderStore.summary || "Cover download completed.");
          this.statusTone = coverDownloaderStore.summaryTone || "success";
          await appendSupportTaskMessageAndContinue(this, String(coverDownloaderStore.summary || "Finished downloading library covers."), {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "library-covers",
            entityName: "library",
            resultData: {
              total: Number(result?.total || 0),
              downloaded: Number(result?.downloaded || 0),
              skipped: Number(result?.skipped || 0),
              failed: Number(result?.failed || 0),
              onlyMissing,
              overwrite
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION) {
          const targetSection = normalizeSupportTaskLibrarySectionTarget(task);
          if (!targetSection) {
            throw new Error("Assistant requested a library section change, but no valid section was provided.");
          }
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          appStore.setActiveSection("library-views");
          headerFiltersStore.updateField("librarySection", targetSection);
          this.status = `Library section changed to ${targetSection}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Changed the library section to **${targetSection}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "library",
            entityName: "section",
            resultData: { section: targetSection }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW) {
          const targetView = normalizeSupportTaskLibraryViewTarget(task);
          if (!targetView) {
            throw new Error("Assistant requested a library view change, but no supported view mode was provided.");
          }
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          appStore.setActiveSection("library-views");
          headerFiltersStore.updateField("viewMode", targetView);
          this.status = `Library view changed to ${targetView}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Changed the library view to **${targetView}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "library",
            entityName: "view",
            resultData: { viewMode: targetView }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH) {
          const targetQuery = normalizeSupportTaskLibrarySearchTarget(task);
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          appStore.setActiveSection("library-views");
          headerFiltersStore.updateField("query", targetQuery);
          this.status = targetQuery
            ? `Library search changed to "${targetQuery}".`
            : "Library search cleared.";
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(
            this,
            targetQuery ? `Updated the library search to **${targetQuery}**.` : "Cleared the library search query.",
            {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "library",
              entityName: "search",
              resultData: { query: targetQuery }
            }
          );
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER) {
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          const targetPlatform = normalizeSupportTaskLibraryPlatformTarget(task, headerFiltersStore.platformOptions);
          if (!targetPlatform) {
            throw new Error("Assistant requested a library platform filter change, but no platform target was provided.");
          }
          appStore.setActiveSection("library-views");
          headerFiltersStore.updateField("selectedPlatform", targetPlatform);
          const platformLabel = headerFiltersStore.platformOptions.find((row) => String(row?.id || "").trim() === targetPlatform)?.label
            || targetPlatform;
          this.status = targetPlatform === "all"
            ? "Library platform filter cleared."
            : `Library platform filter changed to ${platformLabel}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(
            this,
            targetPlatform === "all"
              ? "Cleared the library platform filter."
              : `Changed the library platform filter to **${platformLabel}**.`,
            {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "library",
              entityName: "platform-filter",
              resultData: {
                platform: targetPlatform,
                label: platformLabel
              }
            }
          );
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT) {
          const targetSort = normalizeSupportTaskLibrarySortTarget(task);
          if (!targetSort) {
            throw new Error("Assistant requested a library sort change, but no supported sort mode was provided.");
          }
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          appStore.setActiveSection("library-views");
          headerFiltersStore.updateField("sortBy", targetSort);
          this.status = `Library sort changed to ${targetSort}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Changed the library sort to **${targetSort}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "library",
            entityName: "sort",
            resultData: { sortBy: targetSort }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE) {
          const targetType = normalizeSupportTaskLibraryEmulatorTypeTarget(task);
          if (!targetType) {
            throw new Error("Assistant requested an emulator type filter change, but no supported type was provided.");
          }
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          appStore.setActiveSection("library-views");
          headerFiltersStore.updateField("librarySection", "emulators");
          headerFiltersStore.updateField("emulatorType", targetType);
          this.status = targetType === "all"
            ? "Emulator type filter cleared."
            : `Emulator type filter changed to ${targetType}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(
            this,
            targetType === "all"
              ? "Cleared the emulator type filter."
              : `Changed the emulator type filter to **${targetType}**.`,
            {
              taskType,
              taskDepth,
              skipUserHistoryAppend,
              entityKind: "library",
              entityName: "emulator-type",
              resultData: { emulatorType: targetType }
            }
          );
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS) {
          const appStore = useAppStore();
          const headerFiltersStore = useHeaderFiltersStore();
          await headerFiltersStore.initialize();
          appStore.setActiveSection("library-views");
          const fields = normalizeSupportTaskLibraryClearFields(task);
          if (!fields.length || fields.includes("all")) {
            headerFiltersStore.reset();
          } else {
            for (const field of fields) {
              switch (field) {
                case "query":
                  headerFiltersStore.updateField("query", "");
                  break;
                case "selectedPlatform":
                  headerFiltersStore.updateField("selectedPlatform", "all");
                  break;
                case "sortBy":
                  headerFiltersStore.updateField("sortBy", "name");
                  break;
                case "viewMode":
                  headerFiltersStore.updateField("viewMode", "cover");
                  break;
                case "librarySection":
                  headerFiltersStore.updateField("librarySection", "all");
                  break;
                case "emulatorType":
                  headerFiltersStore.updateField("emulatorType", "all");
                  break;
                default:
                  break;
              }
            }
          }
          this.status = "Library filters cleared.";
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, "Cleared the active library filters.", {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "library",
            entityName: "filters",
            resultData: { fields: fields.includes("all") ? ["all"] : fields }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS) {
          const workspaceStore = useWorkspaceStore();
          await workspaceStore.initialize();
          const gameRow = findSupportGameByTask(workspaceStore.games, task);
          if (!gameRow) {
            throw new Error("Assistant requested a game details view, but no matching game was found.");
          }
          const appStore = useAppStore();
          appStore.setActiveSection("library-views");
          const opened = requestDesktopLibraryDetailOpen("game", gameRow);
          if (!opened) {
            throw new Error("Failed to open the requested game details view.");
          }
          this.status = `Opened details for ${gameRow.name}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Opened the game details for **${gameRow.name}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "game",
            entityName: String(gameRow.name || "").trim(),
            resultData: {
              gameId: Number(gameRow.id || 0),
              gameKey: String(gameRow.key || "").trim()
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS) {
          const workspaceStore = useWorkspaceStore();
          await workspaceStore.initialize();
          const emulatorRow = findSupportEmulatorByTask(workspaceStore.emulators, task);
          if (!emulatorRow) {
            throw new Error("Assistant requested an emulator details view, but no matching emulator was found.");
          }
          const appStore = useAppStore();
          appStore.setActiveSection("library-views");
          const opened = requestDesktopLibraryDetailOpen("emulator", emulatorRow);
          if (!opened) {
            throw new Error("Failed to open the requested emulator details view.");
          }
          this.status = `Opened details for ${emulatorRow.name}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Opened the emulator details for **${emulatorRow.name}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "emulator",
            entityName: String(emulatorRow.name || "").trim(),
            resultData: {
              emulatorId: Number(emulatorRow.id || 0),
              emulatorKey: String(emulatorRow.key || "").trim()
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE
          || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS
          || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY
          || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH
          || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE
          || taskType === SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS) {
          const workspaceStore = useWorkspaceStore();
          await workspaceStore.initialize();
          const emulatorRow = findSupportEmulatorByTask(workspaceStore.emulators, task);
          if (!emulatorRow) {
            throw new Error("Assistant requested an emulator config change, but no matching emulator was found.");
          }

          let resultLabel = "";
          let resultData = {};
          if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE) {
            const value = normalizeSupportTaskEmulatorConfigValue(task, ["website", "url", "value", "query"]);
            updateSupportEmulatorStoredConfig(emulatorRow, { website: value });
            resultLabel = value ? `Updated the emulator website override for **${emulatorRow.name}**.` : `Cleared the emulator website override for **${emulatorRow.name}**.`;
            resultData = { field: "website", value };
          } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS) {
            const value = normalizeSupportTaskEmulatorConfigValue(task, ["launchArgs", "args", "value", "query"]);
            updateSupportEmulatorStoredConfig(emulatorRow, { launchArgs: value });
            resultLabel = value ? `Updated the launch arguments for **${emulatorRow.name}**.` : `Cleared the launch arguments for **${emulatorRow.name}**.`;
            resultData = { field: "launchArgs", value };
          } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY) {
            const value = normalizeSupportTaskEmulatorConfigValue(task, ["workingDirectory", "path", "value", "query"]);
            updateSupportEmulatorStoredConfig(emulatorRow, { workingDirectory: value });
            resultLabel = value ? `Updated the working directory for **${emulatorRow.name}**.` : `Cleared the working directory override for **${emulatorRow.name}**.`;
            resultData = { field: "workingDirectory", value };
          } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH) {
            const value = normalizeSupportTaskEmulatorConfigValue(task, ["configFilePath", "configPath", "path", "value", "query"]);
            updateSupportEmulatorStoredConfig(emulatorRow, { configFilePath: value });
            resultLabel = value ? `Updated the config file path for **${emulatorRow.name}**.` : `Cleared the config file path override for **${emulatorRow.name}**.`;
            resultData = { field: "configFilePath", value };
          } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE) {
            const value = normalizeSupportTaskEmulatorConfigValue(task, ["runCommandsBefore", "commands", "command", "value", "query"]);
            updateSupportEmulatorStoredConfig(emulatorRow, { runCommandsBefore: value });
            resultLabel = value ? `Updated the pre-launch commands for **${emulatorRow.name}**.` : `Cleared the pre-launch commands for **${emulatorRow.name}**.`;
            resultData = { field: "runCommandsBefore", value };
          } else {
            const fields = normalizeSupportTaskEmulatorClearFields(task);
            const clearAll = !fields.length || fields.includes("all");
            const patch = clearAll
              ? {
                  website: "",
                  launchArgs: "",
                  workingDirectory: "",
                  configFilePath: "",
                  runCommandsBefore: ""
                }
              : Object.fromEntries(fields.map((field) => [field, ""]));
            updateSupportEmulatorStoredConfig(emulatorRow, patch);
            resultLabel = clearAll
              ? `Cleared emulator override fields for **${emulatorRow.name}**.`
              : `Cleared ${fields.join(", ")} for **${emulatorRow.name}**.`;
            resultData = { field: "clear", fields: clearAll ? ["all"] : fields };
          }

          const appStore = useAppStore();
          appStore.setActiveSection("library-views");
          this.status = resultLabel.replace(/\*\*/g, "");
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, resultLabel, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            entityKind: "emulator",
            entityName: String(emulatorRow.name || "").trim(),
            resultData: {
              emulatorId: Number(emulatorRow.id || 0),
              emulatorKey: String(emulatorRow.key || "").trim(),
              ...resultData
            }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL) {
          const args = task.args && typeof task.args === "object" ? task.args : {};
          let target = String(args.url || args.link || args.href || args.query || "").trim();
          if (!target) {
            throw new Error("Assistant requested an external URL, but no URL was provided.");
          }
          if (/^www\./i.test(target)) {
            target = `https://${target}`;
          }
          const result = await bridge.invoke("open-external-url", target);
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to open external URL."));
          }
          this.status = String(result?.message || "Opened external URL.");
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Opened external URL: ${target}`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            resultData: { url: target }
          });
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL) {
          const target = normalizeSupportPanelTarget(task);
          if (!target) {
            throw new Error("Assistant requested a local panel, but no valid panel target was provided.");
          }
          const appStore = useAppStore();
          const settingsToolsStore = useSettingsToolsStore();
          await settingsToolsStore.initialize().catch(() => {});

          switch (target) {
            case "settings":
            case "library-paths":
            case "import":
              settingsToolsStore.openPanel("settings");
              break;
            case "gamepad":
              settingsToolsStore.openPanel("gamepad");
              break;
            case "ai":
              settingsToolsStore.openPanel("ai");
              break;
            case "updates":
              settingsToolsStore.openPanel("updates");
              break;
            case "languages":
              settingsToolsStore.openPanel("languages");
              break;
            case "profile":
              settingsToolsStore.openPanel("profile");
              break;
            case "theme":
              appStore.setActiveSection("theme-window");
              break;
            case "help":
              appStore.setActiveSection("support-center");
              this.setMode("help");
              await this.refreshHelpDocs({ openFirst: true });
              break;
            case "support":
              appStore.setActiveSection("support-center");
              break;
            case "community":
              appStore.setActiveSection("community-hub");
              break;
            case "tools":
              appStore.setActiveSection("settings-tools");
              break;
            case "library":
              appStore.setActiveSection("library-views");
              break;
            case "overview":
              appStore.setActiveSection("desktop-home");
              break;
            case "about":
              throw new Error("About dialog is not exposed as a shell panel yet.");
            default:
              throw new Error("Unsupported panel target.");
          }

          const label = describeSupportPanelTarget(target);
          this.status = `Opened ${label}.`;
          this.statusTone = "success";
          await appendSupportTaskMessageAndContinue(this, `Opened **${label}**.`, {
            taskType,
            taskDepth,
            skipUserHistoryAppend,
            resultData: { panel: target }
          });
          return;
        }

        this.status = `Unsupported support task: ${taskType}`;
        this.statusTone = "error";
      } catch (error) {
        this.status = error instanceof Error ? error.message : `Failed to run support task ${taskType}.`;
        this.statusTone = "error";
      }
    },
    async resolveLibraryMatches({ overrideMatches = null } = {}) {
      const workspaceStore = useWorkspaceStore();
      await workspaceStore.initialize();
      const matches = overrideMatches && typeof overrideMatches === "object"
        ? overrideMatches
        : resolveSupportLibraryMatches({
            games: workspaceStore.games,
            emulators: workspaceStore.emulators,
            issueSummary: this.issueSummary,
            platform: this.platform,
            emulator: this.emulator
          });
      this.matchedGameKeys = matches.games.map((row) => String(row?.key || "").trim()).filter(Boolean);
      this.matchedEmulatorKeys = matches.emulators.map((row) => String(row?.key || "").trim()).filter(Boolean);
      this.matchedGameCount = Number(matches.gameCount || 0);
      this.matchedEmulatorCount = Number(matches.emulatorCount || 0);
      this.lastMatchedQuery = matches.active ? String(matches.query || "").trim() : "";
      return matches;
    },
    async refreshHelpDocs({ openFirst = false } = {}) {
      const bridge = getDesktopBridge();
      if (!bridge?.helpDocs) {
        this.status = "Desktop help-docs bridge unavailable.";
        this.statusTone = "error";
        return;
      }

      this.helpLoading = true;
      this.status = "Loading help docs...";
      this.statusTone = "";
      this.persistHelpState();

      try {
        const result = await bridge.helpDocs.list({
          query: this.helpQuery,
          limit: 200
        });
        if (!result?.success) {
          this.helpDocs = [];
          this.status = String(result?.message || "Failed to load help docs.");
          this.statusTone = "error";
          return;
        }

        this.helpDocs = Array.isArray(result.docs) ? result.docs : [];
        const hasSelected = this.helpDocs.some((doc) => String(doc?.id || "").trim() === this.selectedHelpDocId);
        if (!hasSelected && openFirst) {
          this.selectedHelpDocId = String(this.helpDocs[0]?.id || "").trim();
        }
        if (this.selectedHelpDocId && this.helpDocs.some((doc) => String(doc?.id || "").trim() === this.selectedHelpDocId)) {
          await this.selectHelpDoc(this.selectedHelpDocId);
          return;
        }

        this.selectedHelpDoc = null;
        this.outputTitle = "Help Docs";
        this.outputMarkdown = "Select a help topic to read it here.";
        this.status = "Help docs loaded.";
      } catch (error) {
        this.helpDocs = [];
        this.status = error instanceof Error ? error.message : String(error || "Unknown error");
        this.statusTone = "error";
      } finally {
        this.helpLoading = false;
      }
    },
    async selectHelpDoc(docId) {
      const bridge = getDesktopBridge();
      const id = String(docId || "").trim();
      if (!bridge?.helpDocs || !id) {
        return;
      }

      this.helpLoading = true;
      this.status = "Loading help doc...";
      this.statusTone = "";

      try {
        const result = await bridge.helpDocs.get({ id });
        if (!result?.success || !result.doc) {
          this.status = String(result?.message || "Failed to open help doc.");
          this.statusTone = "error";
          return;
        }

        this.selectedHelpDoc = result.doc;
        this.selectedHelpDocId = String(result.doc.id || id).trim();
        this.outputTitle = String(result.doc.title || result.doc.id || "Help Docs");
        this.persistHelpState();
        this.status = "Help doc loaded.";
      } catch (error) {
        this.status = error instanceof Error ? error.message : String(error || "Unknown error");
        this.statusTone = "error";
      } finally {
        this.helpLoading = false;
      }
    },
    async insertSystemSpecs() {
      this.specsBusy = true;
      this.status = "Collecting system specs...";
      this.statusTone = "";

      try {
        const specsText = await this.fetchSupportSystemSpecsText();
        this.details = upsertPcSpecsBlock(this.details, specsText);
        this.persistDraft();
        this.status = "System specs inserted into details.";
        this.statusTone = "success";
      } catch (error) {
        this.status = error instanceof Error ? error.message : "Failed to collect system specs.";
        this.statusTone = "error";
      } finally {
        this.specsBusy = false;
      }
    },
    async runSupport(options = {}) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.status = "Desktop bridge unavailable.";
        this.statusTone = "error";
        return;
      }
      const skipUserHistoryAppend = !!options.skipUserHistoryAppend;
      const taskDepth = Math.max(0, Number(options.taskDepth || 0));
      const libraryMatchesOverride = options.libraryMatchesOverride && typeof options.libraryMatchesOverride === "object"
        ? options.libraryMatchesOverride
        : null;
      const selfTaskDocsOverride = options.selfTaskDocsOverride && typeof options.selfTaskDocsOverride === "object"
        ? options.selfTaskDocsOverride
        : null;
      const taskResultOverride = options.taskResultOverride && typeof options.taskResultOverride === "object"
        ? options.taskResultOverride
        : null;

      const issueSummary = resolveSupportIssueSummary(
        this.issueSummary,
        this.mode,
        this.chatHistory,
        this.activeUserMessage,
        skipUserHistoryAppend
      );
      if (!issueSummary) {
        this.status = this.mode === "chat" ? "Type a question first." : "Add a short problem summary first.";
        this.statusTone = "error";
        return;
      }

      const llm = loadSupportSettings();
      this.refreshChatContextWindowSize(llm);
      const useLiveStream = shouldUseSupportStreaming(llm, bridge);
      const streamRequestId = useLiveStream ? buildSupportStreamRequestId() : "";
      const payload = {
        provider: llm.provider,
        model: llm.model,
        baseUrl: llm.baseUrl,
        apiKey: llm.apiKey,
        llmMode: llm.llmMode,
        relayHostUrl: llm.relayHostUrl,
        relayAuthToken: llm.relayAuthToken,
        relayPort: llm.relayPort,
        supportTaskProtocol: SUPPORT_TASK_PROTOCOL,
        issueType: this.issueType,
        issueTypeLabel: getIssueTypeLabel(this.issueType),
        issueSummary,
        platform: String(this.platform || "").trim(),
        emulator: String(this.emulator || "").trim(),
        errorText: String(this.errorText || "").trim(),
        details: String(this.details || "").trim(),
        supportMode: this.mode === "chat" ? "chat" : "troubleshoot",
        chatHistory: this.mode === "chat" ? normalizeSupportChatHistory(this.chatHistory, this.chatContextWindowSize) : [],
        debugSupport: this.debugSupportEnabled,
        allowAutoSpecsFetch: this.autoSpecsEnabled,
        allowWebAccess: this.webAccessEnabled
      };
      if (selfTaskDocsOverride?.active) {
        payload.selfTaskDocs = selfTaskDocsOverride;
      }
      if (taskResultOverride?.active) {
        payload.lastTaskResult = taskResultOverride;
      }
      if (useLiveStream) {
        ensureSupportStreamBridge(this);
        payload.streamResponse = true;
        payload.streamRequestId = streamRequestId;
      }
      const providerLabel = String(payload.provider || (payload.llmMode === "client" ? "relay" : "support engine")).trim();

      if (this.mode === "chat" && !skipUserHistoryAppend) {
        this.chatHistory = normalizeSupportChatHistory([
          ...this.chatHistory,
          { role: "user", text: issueSummary }
        ], this.chatContextWindowSize);
        this.activeUserMessage = issueSummary;
        payload.chatHistory = this.chatHistory;
        this.persistChatHistory();
      } else if (!skipUserHistoryAppend) {
        this.activeUserMessage = issueSummary;
      }

      const libraryMatches = await this.resolveLibraryMatches({ overrideMatches: libraryMatchesOverride });
      payload.libraryMatches = buildSupportLibraryMatchesPayload(libraryMatches, issueSummary);

      this.running = true;
      this.pendingSupportTask = null;
      this.pendingTaskBusy = false;
      this.liveResponseText = "";
      this.liveResponseRaw = "";
      this.streamRequestId = streamRequestId;
      this.status =
        this.mode === "chat"
          ? `Generating reply with ${providerLabel}...`
          : `Generating support steps with ${providerLabel}...`;
      this.statusTone = "";
      if (this.mode !== "chat") {
        this.outputMarkdown = "Thinking...";
      }

      try {
        const response = await bridge.invoke("suggestions:emulation-support", payload);
        if (!response?.success) {
          this.status = String(response?.message || "Support request failed.");
          this.statusTone = "error";
          if (this.mode !== "chat") {
            this.outputMarkdown = "No response available.";
          }
          this.debugPayload = this.debugSupportEnabled ? response?.debug || { error: this.status } : null;
          return;
        }

        const answerText = String(response?.answer || "").trim();
        const providerError = String(response?.providerError || response?.debug?.providerError || "").trim();
        const usedProviderFallback = String(response?.provider || "").trim().toLowerCase() === "local-fallback";
        const assistantEnvelope = parseSupportAssistantEnvelope(answerText);
        const assistantTask = assistantEnvelope?.task || parseSupportAssistantTask(answerText);
        if (assistantTask) {
          const envelopeMessage = assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_REPLY
            ? String(assistantEnvelope.message || "").trim()
            : "";
          const canAutoExecute = shouldAutoExecuteSupportTask(assistantTask, this.autoSpecsEnabled);
          this.debugPayload = this.debugSupportEnabled ? response?.debug || { envelope: assistantEnvelope } : null;
          if (envelopeMessage) {
            appendSupportAssistantMessage(this, envelopeMessage);
          }
          if (taskDepth >= SUPPORT_MAX_AUTO_TASK_DEPTH) {
            this.status = assistantEnvelope?.message || "Assistant requested another action even though the previous task already ran.";
            this.statusTone = "error";
            return;
          }
          if (canAutoExecute) {
            await this.executeSupportAssistantTask(assistantTask, {
              skipUserHistoryAppend: true,
              taskDepth: taskDepth + 1
            });
            return;
          }
          this.pendingSupportTask = buildSupportTaskApproval(assistantTask);
          this.status = assistantEnvelope?.message || this.pendingSupportTask.message;
          this.statusTone = "";
          return;
        }

        const resolvedReply = assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_REPLY
          ? String(assistantEnvelope.message || "").trim()
          : (assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_BLOCKED
            ? String(assistantEnvelope.message || assistantEnvelope.reason || "").trim()
            : answerText);
        const finalReplyText = resolvedReply || this.liveResponseText || "";

        appendSupportAssistantMessage(this, finalReplyText || "No support text returned.");

        this.debugPayload = this.debugSupportEnabled ? response?.debug || null : null;
        if (providerError && usedProviderFallback) {
          this.status = `LLM provider error: ${providerError}`;
          this.statusTone = "error";
        } else {
          this.status = `Support response ready (${String(response?.provider || providerLabel || "support").trim()}).`;
          this.statusTone = "success";
        }
      } catch (error) {
        this.status = error instanceof Error ? error.message : String(error || "Support request failed.");
        this.statusTone = "error";
        this.debugPayload = this.debugSupportEnabled
          ? { exception: error instanceof Error ? error.message : String(error || "Unknown error") }
          : null;
        if (this.mode !== "chat") {
          this.outputMarkdown = "No response available.";
        }
      } finally {
        this.resetLiveResponse();
        this.running = false;
      }
    },
    async initialize() {
      if (this.initialized || this.loading) {
        return;
      }

      this.loading = true;
      try {
        await this.hydrateFromStorage();
        if (this.mode === "help") {
          await this.refreshHelpDocs({ openFirst: true });
        }
        syncLocationSupportMode(this.mode);
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    }
  }
});
