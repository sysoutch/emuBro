import { defineStore } from "pinia";
import {
  buildSupportLlmSettings,
  loadDesktopLlmSettings
} from "../utils/llm-settings";
import { resolveEffectiveEmulatorConfig } from "../utils/emulator-config";
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
const SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE = 0.72;
const PC_SPECS_BLOCK_HEADER = "[PC Specs]";

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

function normalizeSupportChatHistory(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  return rows
    .map((entry) => ({
      role: String(entry?.role || "").trim().toLowerCase() === "assistant" ? "assistant" : "user",
      text: String(entry?.text || "").trim()
    }))
    .filter((entry) => entry.text)
    .slice(-20);
}

function summarizeSupportLibraryRows(rows, kind = "game") {
  return (Array.isArray(rows) ? rows : [])
    .slice(0, 12)
    .map((row) => ({
      id: Number(row?.id || 0),
      key: String(row?.key || "").trim(),
      kind,
      name: String(row?.name || "").trim(),
      platform: String(row?.platform || row?.platformShortName || "").trim(),
      platformShortName: String(row?.platformShortName || "").trim(),
      installed: kind === "emulator" ? !!row?.installed : undefined,
      downloadable: kind === "emulator" ? !!(row?.downloadUrl || row?.website || row?.downloadLinks) : undefined,
      type: kind === "emulator" ? String(row?.type || "").trim() : ""
    }))
    .filter((row) => row.name);
}

function getIssueTypeLabel(issueType) {
  return ISSUE_TYPES.find((row) => row.value === issueType)?.label || ISSUE_TYPES[ISSUE_TYPES.length - 1].label;
}

function loadSupportSettings() {
  return buildSupportLlmSettings(loadDesktopLlmSettings());
}

function normalizeSupportTaskType(rawValue) {
  const normalized = String(rawValue || "").trim().toUpperCase();
  switch (normalized) {
    case SUPPORT_ASSISTANT_TASK_FETCH_SPECS:
    case "GET_SPECS":
    case "SYSTEM_GET_SPECS":
      return SUPPORT_ASSISTANT_TASK_FETCH_SPECS;
    case SUPPORT_ASSISTANT_TASK_RUN_GAME:
    case "LAUNCH_GAME":
      return SUPPORT_ASSISTANT_TASK_RUN_GAME;
    case SUPPORT_ASSISTANT_TASK_RUN_EMULATOR:
    case "LAUNCH_EMULATOR":
      return SUPPORT_ASSISTANT_TASK_RUN_EMULATOR;
    case SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR:
    case "DOWNLOAD_EMULATOR":
    case "INSTALL_EMULATOR":
      return SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR;
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
  if (directTask) {
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
    return {
      kind: SUPPORT_RESPONSE_TYPE_REPLY,
      message: String(rawValue.message || rawValue.reply || rawValue.answer || "").trim()
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

  if (stripped.toUpperCase() === SUPPORT_ASSISTANT_TASK_FETCH_SPECS) {
    return {
      kind: SUPPORT_RESPONSE_TYPE_TASK,
      task: { type: SUPPORT_ASSISTANT_TASK_FETCH_SPECS, confidence: 1, reason: "", args: {} },
      message: ""
    };
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
  return null;
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

function normalizeSupportState(raw = {}) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    draft: normalizeSupportDraft(source.draft || source),
    help: normalizeSupportHelpState(source.help || {}),
    chatHistory: normalizeSupportChatHistory(source.chatHistory || []),
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
    debugPayload: null,
    pendingSupportTask: null,
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
      });
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
      writeStorageJson(SUPPORT_CHAT_HISTORY_STORAGE_KEY, this.chatHistory, normalizeSupportChatHistory);
      this.persistNativeState();
    },
    async hydrateFromStorage() {
      const persisted = normalizeSupportState(
        await readNativeShellState(SUPPORT_STATE_KEY, {
          draft: readStorageJson(SUPPORT_DRAFT_STORAGE_KEY, {}, normalizeSupportDraft),
          help: readStorageJson(SUPPORT_HELP_STATE_STORAGE_KEY, {}, normalizeSupportHelpState),
          chatHistory: readStorageJson(SUPPORT_CHAT_HISTORY_STORAGE_KEY, [], normalizeSupportChatHistory),
          flags: {
            debugSupportEnabled: readStorageBoolean(SUPPORT_DEBUG_STORAGE_KEY, false),
            autoSpecsEnabled: readStorageBoolean(SUPPORT_AUTO_SPECS_STORAGE_KEY, false),
            webAccessEnabled: readStorageBoolean(SUPPORT_WEB_ACCESS_STORAGE_KEY, false)
          }
        })
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
      this.chatHistory = persisted.chatHistory;
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
      this.pendingSupportTask = null;
      if (this.statusTone !== "error") {
        this.status = "";
        this.statusTone = "";
      }
    },
    async approvePendingSupportTask() {
      const task = this.pendingSupportTask?.task;
      if (!task || !String(task.type || "").trim()) {
        return;
      }
      this.pendingSupportTask = null;
      await this.executeSupportAssistantTask(task, {
        skipUserHistoryAppend: true,
        taskDepth: 1
      });
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
          this.status = "System specs attached. Continuing support request...";
          await this.runSupport({
            skipUserHistoryAppend,
            taskDepth
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
            throw new Error("Assistant requested a game launch, but no matching game row was found.");
          }
          const result = await bridge.invoke("launch-game", { gameId: gameRow.id });
          if (!result?.success) {
            throw new Error(String(result?.message || "Failed to launch game."));
          }
          this.status = String(result?.message || `Launched ${gameRow.name}.`);
          this.statusTone = "success";
          if (this.mode === "chat") {
            this.chatHistory = normalizeSupportChatHistory([
              ...this.chatHistory,
              { role: "assistant", text: `Launched **${gameRow.name}**.` }
            ]);
            this.persistChatHistory();
          } else {
            this.outputMarkdown = `Launched **${gameRow.name}**.`;
          }
          return;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_RUN_EMULATOR) {
          const emulatorRow = findSupportEmulatorByTask(workspaceStore.emulators, task);
          if (!emulatorRow) {
            throw new Error("Assistant requested an emulator launch, but no matching emulator row was found.");
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
          if (this.mode === "chat") {
            this.chatHistory = normalizeSupportChatHistory([
              ...this.chatHistory,
              { role: "assistant", text: `Launched **${emulatorRow.name}**.` }
            ]);
            this.persistChatHistory();
          } else {
            this.outputMarkdown = `Launched **${emulatorRow.name}**.`;
          }
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
          if (this.mode === "chat") {
            this.chatHistory = normalizeSupportChatHistory([
              ...this.chatHistory,
              { role: "assistant", text: result?.manual ? `Opened the download source for **${emulatorRow.name}**.` : `Started install for **${emulatorRow.name}**.` }
            ]);
            this.persistChatHistory();
          } else {
            this.outputMarkdown = result?.manual
              ? `Opened the download source for **${emulatorRow.name}**.`
              : `Started install for **${emulatorRow.name}**.`;
          }
          return;
        }

        this.status = `Unsupported support task: ${taskType}`;
        this.statusTone = "error";
      } catch (error) {
        this.status = error instanceof Error ? error.message : `Failed to run support task ${taskType}.`;
        this.statusTone = "error";
      }
    },
    async resolveLibraryMatches() {
      const workspaceStore = useWorkspaceStore();
      await workspaceStore.initialize();
      const matches = resolveSupportLibraryMatches({
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

      const issueSummary = String(this.issueSummary || "").trim();
      if (!issueSummary) {
        this.status = this.mode === "chat" ? "Type a question first." : "Add a short problem summary first.";
        this.statusTone = "error";
        return;
      }

      const llm = loadSupportSettings();
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
        chatHistory: this.mode === "chat" ? this.chatHistory : [],
        debugSupport: this.debugSupportEnabled,
        allowAutoSpecsFetch: this.autoSpecsEnabled,
        allowWebAccess: this.webAccessEnabled
      };
      const providerLabel = String(payload.provider || (payload.llmMode === "client" ? "relay" : "support engine")).trim();

      if (this.mode === "chat" && !skipUserHistoryAppend) {
        this.chatHistory = normalizeSupportChatHistory([
          ...this.chatHistory,
          { role: "user", text: issueSummary }
        ]);
        payload.chatHistory = this.chatHistory;
        this.persistChatHistory();
      }

      const libraryMatches = await this.resolveLibraryMatches();
      payload.libraryMatches = {
        active: !!libraryMatches?.active,
        reason: String(libraryMatches?.reason || "").trim(),
        query: libraryMatches?.active ? String(libraryMatches?.query || issueSummary).trim() : "",
        gameCount: Number(libraryMatches?.gameCount || 0),
        emulatorCount: Number(libraryMatches?.emulatorCount || 0),
        games: summarizeSupportLibraryRows(libraryMatches?.games || [], "game"),
        emulators: summarizeSupportLibraryRows(libraryMatches?.emulators || [], "emulator")
      };

      this.running = true;
      this.pendingSupportTask = null;
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
        const assistantEnvelope = parseSupportAssistantEnvelope(answerText);
        if (assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_TASK || assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_BLOCKED) {
          const nextTask = assistantEnvelope.task;
          this.debugPayload = this.debugSupportEnabled ? response?.debug || { envelope: assistantEnvelope } : null;
          if (
            nextTask
            && nextTask.type === SUPPORT_ASSISTANT_TASK_FETCH_SPECS
            && taskDepth < 1
            && this.autoSpecsEnabled
          ) {
            await this.executeSupportAssistantTask(nextTask, {
              skipUserHistoryAppend: true,
              taskDepth: taskDepth + 1
            });
            return;
          }
          if (nextTask && taskDepth < 1) {
            this.pendingSupportTask = buildSupportTaskApproval(nextTask);
            this.status = assistantEnvelope.message || this.pendingSupportTask.message;
            this.statusTone = "";
            return;
          }
          this.status = assistantEnvelope.message || "Assistant requested another action even though the previous task already ran.";
          this.statusTone = "error";
          return;
        }

        const resolvedReply = assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_REPLY
          ? String(assistantEnvelope.message || "").trim()
          : answerText;

        if (this.mode === "chat") {
          if (resolvedReply) {
            this.chatHistory = normalizeSupportChatHistory([
              ...this.chatHistory,
              { role: "assistant", text: resolvedReply }
            ]);
            this.issueSummary = "";
            this.persistDraft();
            this.persistChatHistory();
          }
        } else {
          this.outputMarkdown = resolvedReply || "No support text returned.";
        }

        this.debugPayload = this.debugSupportEnabled ? response?.debug || null : null;
        this.status = `Support response ready (${String(response?.provider || providerLabel || "support").trim()}).`;
        this.statusTone = "success";
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
