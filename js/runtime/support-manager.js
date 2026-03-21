import {
    loadSuggestionSettings,
    normalizeSupportContextWindowMessages,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings';
import {
    getGames,
    getEmulators
} from '../game-manager';
import {
    setTheme
} from '../theme-manager';

const emubro = window.emubro;
const SUPPORT_DRAFT_STORAGE_KEY = 'emuBro.supportDraft.v1';
const SUPPORT_CHAT_HISTORY_STORAGE_KEY = 'emuBro.supportChatHistory.v1';
const SUPPORT_DEBUG_STORAGE_KEY = 'emuBro.supportDebug.v1';
const SUPPORT_AUTO_SPECS_STORAGE_KEY = 'emuBro.supportAutoSpecs.v1';
const SUPPORT_WEB_ACCESS_STORAGE_KEY = 'emuBro.supportWebAccess.v1';
const SUPPORT_HELP_STATE_STORAGE_KEY = 'emuBro.supportHelpState.v1';
const SUPPORT_CONTEXT_WINDOW_DEFAULT = 20;
const SUPPORT_TASK_PROTOCOL = 'shell-v1';
const SUPPORT_STREAM_EVENT_NAME = 'emubro:support-stream';
const SUPPORT_ASSISTANT_TASK_FETCH_SPECS = 'FETCH_SPECS';
const SUPPORT_ASSISTANT_TASK_RUN_GAME = 'RUN_GAME';
const SUPPORT_ASSISTANT_TASK_RUN_EMULATOR = 'RUN_EMULATOR';
const SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR = 'DOWNLOAD_INSTALL_EMULATOR';
const SUPPORT_ASSISTANT_TASK_READ_LIBRARY = 'READ_LIBRARY';
const SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY = 'REFRESH_LIBRARY';
const SUPPORT_ASSISTANT_TASK_ADD_TAGS = 'ADD_TAGS';
const SUPPORT_ASSISTANT_TASK_REMOVE_TAGS = 'REMOVE_TAGS';
const SUPPORT_ASSISTANT_TASK_LIST_TAGS = 'LIST_TAGS';
const SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS = 'LIST_HELP_DOCS';
const SUPPORT_ASSISTANT_TASK_READ_HELP_DOC = 'READ_HELP_DOC';
const SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS = 'LIST_SELF_TASK_DOCS';
const SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC = 'READ_SELF_TASK_DOC';
const SUPPORT_ASSISTANT_TASK_RELEASE_DATE = 'RELEASE_DATE';
const SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE = 'GAME_RELEASE_DATE';
const SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER = 'FETCH_GAME_COVER';
const SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER = 'ADD_GAME_COVER';
const SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW = 'OPEN_YOUTUBE_PREVIEW';
const SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL = 'OPEN_EXTERNAL_URL';
const SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL = 'OPEN_SETTINGS_PANEL';
const SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE = 'CHANGE_SUPPORT_MODE';
const SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM = 'CHANGE_PLATFORM';
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR = 'CHANGE_EMULATOR';
const SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE = 'CHANGE_ISSUE_TYPE';
const SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY = 'CHANGE_ISSUE_SUMMARY';
const SUPPORT_ASSISTANT_TASK_APPEND_DETAILS = 'APPEND_DETAILS';
const SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD = 'CLEAR_SUPPORT_FIELD';
const SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION = 'CLEAR_SUPPORT_SESSION';
const SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS = 'TOGGLE_AUTO_SPECS';
const SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS = 'TOGGLE_WEB_ACCESS';
const SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT = 'TOGGLE_DEBUG_CONTEXT';
const SUPPORT_ASSISTANT_TASK_CHANGE_THEME = 'CHANGE_THEME';
const SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE = 'CHANGE_LANGUAGE';
const SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS = 'DOWNLOAD_LIBRARY_COVERS';
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION = 'CHANGE_LIBRARY_SECTION';
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW = 'CHANGE_LIBRARY_VIEW';
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH = 'CHANGE_LIBRARY_SEARCH';
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER = 'CHANGE_LIBRARY_PLATFORM_FILTER';
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT = 'CHANGE_LIBRARY_SORT';
const SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE = 'CHANGE_LIBRARY_EMULATOR_TYPE';
const SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS = 'CLEAR_LIBRARY_FILTERS';
const SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS = 'OPEN_GAME_DETAILS';
const SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS = 'OPEN_EMULATOR_DETAILS';
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE = 'CHANGE_EMULATOR_WEBSITE';
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS = 'CHANGE_EMULATOR_LAUNCH_ARGS';
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY = 'CHANGE_EMULATOR_WORKING_DIRECTORY';
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH = 'CHANGE_EMULATOR_CONFIG_PATH';
const SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE = 'CHANGE_EMULATOR_RUN_COMMANDS_BEFORE';
const SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS = 'CLEAR_EMULATOR_OVERRIDE_FIELDS';
const SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE = 0.55;
const SUPPORT_MAX_AUTO_TASK_DEPTH = 3;
const SUPPORT_RESPONSE_TYPE_REPLY = 'reply';
const SUPPORT_RESPONSE_TYPE_TASK = 'task';
const SUPPORT_RESPONSE_TYPE_BLOCKED = 'blocked';
const PC_SPECS_BLOCK_HEADER = '[PC Specs]';
const SUPPORT_LIBRARY_QUERY_LIMIT = 1200;
const SUPPORT_EMULATOR_CONFIG_STORAGE_KEY = 'emuBro.emulatorConfigs.v1';
let activeSupportViewDisposer = null;

const ISSUE_TYPES = [
    { value: 'launch', labelKey: 'support.issueTypes.launch', fallback: 'Game does not launch' },
    { value: 'performance', labelKey: 'support.issueTypes.performance', fallback: 'Low FPS / stutter' },
    { value: 'audio', labelKey: 'support.issueTypes.audio', fallback: 'Audio crackling or delay' },
    { value: 'controls', labelKey: 'support.issueTypes.controls', fallback: 'Controller not detected' },
    { value: 'graphics', labelKey: 'support.issueTypes.graphics', fallback: 'Visual glitches / black screen' },
    { value: 'save', labelKey: 'support.issueTypes.save', fallback: 'Save or memory card issues' },
    { value: 'bios', labelKey: 'support.issueTypes.bios', fallback: 'BIOS missing / invalid' },
    { value: 'network', labelKey: 'support.issueTypes.network', fallback: 'Netplay / online issues' },
    { value: 'other', labelKey: 'support.issueTypes.other', fallback: 'Other emulation issue' }
];

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function applyTemplate(input, data = {}) {
    let text = String(input ?? '');
    Object.keys(data || {}).forEach((key) => {
        const value = String(data[key] ?? '');
        text = text
            .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
            .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value);
    });
    return text;
}

function t(key, fallback, data = {}) {
    const i18nRef = (typeof i18n !== 'undefined' && i18n && typeof i18n.t === 'function')
        ? i18n
        : (window?.i18n && typeof window.i18n.t === 'function' ? window.i18n : null);
    let translated = '';
    if (i18nRef && typeof i18nRef.t === 'function') {
        translated = i18nRef.t(key);
        if (typeof translated === 'string' && translated && translated !== key) {
            return applyTemplate(translated, data);
        }
    }
    return applyTemplate(String(fallback || key), data);
}

function stringifySupportDebugValue(value) {
    if (typeof value === 'string') return value;
    try {
        return JSON.stringify(value, null, 2);
    } catch (_error) {
        return String(value ?? '');
    }
}

function buildSupportDebugSections(debugPayload = null) {
    if (!debugPayload || typeof debugPayload !== 'object' || Array.isArray(debugPayload)) return [];

    const sections = [];
    const promptEntries = Array.isArray(debugPayload.prompts)
        ? debugPayload.prompts
        : [
            debugPayload.systemPrompt ? { label: 'System Prompt', text: debugPayload.systemPrompt } : null,
            debugPayload.userPrompt ? { label: 'User Prompt', text: debugPayload.userPrompt } : null
        ].filter(Boolean);

    promptEntries.forEach((entry, index) => {
        const title = String(entry?.label || entry?.title || `Prompt ${index + 1}`).trim();
        const text = String(entry?.text || entry?.prompt || '').trim();
        if (!title || !text) return;
        sections.push({ title, body: text });
    });

    const providerError = String(debugPayload.providerError || '').trim();
    if (providerError) {
        sections.push({
            title: t('support.debugProviderError', 'Provider Error'),
            body: providerError
        });
    }

    const exceptionText = String(debugPayload.exception || '').trim();
    if (exceptionText) {
        sections.push({
            title: t('support.debugException', 'Exception'),
            body: exceptionText
        });
    }

    if (debugPayload.streaming && typeof debugPayload.streaming === 'object' && !Array.isArray(debugPayload.streaming)) {
        sections.push({
            title: t('support.debugStreamingState', 'Streaming State'),
            body: stringifySupportDebugValue(debugPayload.streaming)
        });
    }

    if (debugPayload.envelope && typeof debugPayload.envelope === 'object' && !Array.isArray(debugPayload.envelope)) {
        sections.push({
            title: t('support.debugAssistantEnvelope', 'Assistant Envelope'),
            body: stringifySupportDebugValue(debugPayload.envelope)
        });
    }

    sections.push({
        title: t('support.debugRawJson', 'Raw Debug JSON'),
        body: stringifySupportDebugValue(debugPayload)
    });

    return sections.filter((section) => String(section?.body || '').trim());
}

function renderSupportDebugPayloadHtml(debugPayload = null) {
    const sections = buildSupportDebugSections(debugPayload);
    if (!sections.length) {
        return `<p class="support-debug-empty">${escapeHtml(t('support.debugEmpty', 'Debug output will appear after a request.'))}</p>`;
    }
    return `
        <div class="support-debug-stack">
            ${sections.map((section) => `
                <details class="support-debug-section">
                    <summary>${escapeHtml(section.title)}</summary>
                    <pre>${escapeHtml(section.body)}</pre>
                </details>
            `).join('')}
        </div>
    `;
}

function getSpeechRecognitionCtor() {
    if (typeof window === 'undefined') return null;
    if (typeof window.SpeechRecognition === 'function') return window.SpeechRecognition;
    if (typeof window.webkitSpeechRecognition === 'function') return window.webkitSpeechRecognition;
    return null;
}

async function ensureMicrophoneAccess() {
    if (!navigator?.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        return { ok: false, reason: 'media-devices-unavailable' };
    }
    let stream = null;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return { ok: true };
    } catch (error) {
        const name = String(error?.name || '').trim();
        const message = String(error?.message || '').trim();
        const lower = `${name} ${message}`.toLowerCase();
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || lower.includes('denied')) {
            return { ok: false, reason: 'denied' };
        }
        if (name === 'NotFoundError' || lower.includes('no audio input') || lower.includes('device not found')) {
            return { ok: false, reason: 'no-device' };
        }
        if (name === 'NotReadableError' || lower.includes('device is busy') || lower.includes('could not start')) {
            return { ok: false, reason: 'device-busy' };
        }
        if (name === 'SecurityError') {
            return { ok: false, reason: 'security' };
        }
        return { ok: false, reason: 'failed', detail: message || name };
    } finally {
        try {
            if (stream) {
                stream.getTracks().forEach((track) => {
                    try { track.stop(); } catch (_error) {}
                });
            }
        } catch (_error) {}
    }
}

function getIssueTypeLabel(value) {
    const normalized = String(value || '').trim().toLowerCase();
    const match = ISSUE_TYPES.find((entry) => entry.value === normalized);
    if (!match) {
        return t('support.issueTypes.other', 'Other emulation issue');
    }
    return t(match.labelKey, match.fallback);
}

function normalizeSupportDraft(raw) {
    const draft = raw && typeof raw === 'object' ? raw : {};
    const modeRaw = String(draft.mode || '').trim().toLowerCase();
    const mode = (modeRaw === 'chat' || modeRaw === 'help') ? modeRaw : 'troubleshoot';
    return {
        mode,
        issueType: ISSUE_TYPES.some((entry) => entry.value === String(draft.issueType || '').trim().toLowerCase())
            ? String(draft.issueType).trim().toLowerCase()
            : 'launch',
        issueSummary: String(draft.issueSummary || '').trim(),
        platform: String(draft.platform || '').trim(),
        emulator: String(draft.emulator || '').trim(),
        errorText: String(draft.errorText || '').trim(),
        details: String(draft.details || '').trim()
    };
}

function normalizeSupportHelpState(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return {
        query: String(source.query || '').trim(),
        selectedDocId: String(source.selectedDocId || '').trim()
    };
}

function normalizeSupportChatHistory(raw, contextWindowMessages = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
    const limit = normalizeSupportContextWindowMessages(contextWindowMessages, SUPPORT_CONTEXT_WINDOW_DEFAULT);
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((entry) => ({
            role: String(entry?.role || '').trim().toLowerCase() === 'assistant' ? 'assistant' : 'user',
            text: String(entry?.text || '').trim(),
            attachments: normalizeSupportMessageAttachments(entry?.attachments)
        }))
        .filter((entry) => !!entry.text || entry.attachments.length > 0)
        .slice(-limit);
}

function normalizeSupportMessageAttachments(raw) {
    const rows = Array.isArray(raw) ? raw : [];
    return rows
        .map((entry) => {
            const kind = String(entry?.kind || entry?.type || '').trim().toLowerCase();
            if (kind !== 'cover') return null;
            const imageUrl = String(entry?.imageUrl || entry?.image || entry?.src || '').trim();
            const thumbnailUrl = String(entry?.thumbnailUrl || entry?.thumbUrl || imageUrl).trim();
            if (!imageUrl && !thumbnailUrl) return null;
            const gameId = Number(entry?.gameId || 0);
            return {
                kind: 'cover',
                title: String(entry?.title || entry?.name || '').trim(),
                subtitle: String(entry?.subtitle || entry?.platform || '').trim(),
                imageUrl: imageUrl || thumbnailUrl,
                thumbnailUrl: thumbnailUrl || imageUrl,
                source: String(entry?.source || '').trim(),
                sourceUrl: String(entry?.sourceUrl || entry?.pageUrl || '').trim(),
                pageUrl: String(entry?.pageUrl || entry?.sourceUrl || '').trim(),
                gameId: Number.isFinite(gameId) && gameId > 0 ? gameId : 0,
                gameKey: String(entry?.gameKey || '').trim()
            };
        })
        .filter(Boolean)
        .slice(0, 6);
}

function looksLikeDefaultSupportImage(value) {
    const image = String(value || '').trim().toLowerCase();
    if (!image) return true;
    return image.includes('/default.png')
        || image.includes('/default.jpg')
        || image.includes('/default.jpeg')
        || image.includes('/default.webp');
}

function buildSupportCoverSearchQuery(gameRow = null, fallbackQuery = '') {
    const gameName = String(gameRow?.name || fallbackQuery || '').trim();
    const platform = String(gameRow?.platform || gameRow?.platformShortName || '').trim();
    return [gameName, platform, 'cover']
        .filter(Boolean)
        .join(' ')
        .trim();
}

function normalizeSupportCoverSearchTokens(value = '') {
    const stopWords = new Set([
        'a', 'an', 'and', 'art', 'artwork', 'box', 'cover', 'covers', 'display', 'edition',
        'fetch', 'for', 'game', 'image', 'images', 'me', 'of', 'poster', 'preview', 'show',
        'the', 'this'
    ]);
    return String(value || '')
        .toLowerCase()
        .replace(/[\(\)\[\]\{\}:_\-]+/g, ' ')
        .split(/[^a-z0-9]+/g)
        .map((token) => token.trim())
        .filter((token) => token && !stopWords.has(token) && (token.length >= 2 || /^\d+$/.test(token)));
}

function buildSupportCoverSearchNeedles(gameRow = null, fallbackQuery = '') {
    const query = String(gameRow?.name || fallbackQuery || '').trim();
    const tokens = normalizeSupportCoverSearchTokens(query);
    const platformTokens = normalizeSupportCoverSearchTokens(
        `${String(gameRow?.platform || '').trim()} ${String(gameRow?.platformShortName || '').trim()}`
    );
    return {
        query: query.toLowerCase(),
        tokens,
        platformTokens
    };
}

function scoreSupportCoverSearchResult(result = {}, gameRow = null, fallbackQuery = '') {
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
    ].map((value) => String(value || '').toLowerCase()).join(' ');
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

function buildSupportCoverAttachmentFromGameRow(gameRow = null, source = 'library') {
    const imageUrl = String(gameRow?.image || gameRow?.coverImage || '').trim();
    if (!imageUrl || looksLikeDefaultSupportImage(imageUrl)) {
        return null;
    }
    return normalizeSupportMessageAttachments([{
        kind: 'cover',
        title: String(gameRow?.name || '').trim(),
        subtitle: String(gameRow?.platform || gameRow?.platformShortName || '').trim(),
        imageUrl,
        thumbnailUrl: imageUrl,
        source,
        gameId: Number(gameRow?.id || 0),
        gameKey: String(gameRow?.key || '').trim()
    }])[0] || null;
}

function buildSupportCoverAttachmentFromResult(result = {}, gameRow = null, source = 'download') {
    const imageUrl = String(result?.imageUrl || result?.image || result?.thumbnailUrl || '').trim();
    if (!imageUrl) {
        return null;
    }
    return normalizeSupportMessageAttachments([{
        kind: 'cover',
        title: String(gameRow?.name || result?.title || '').trim(),
        subtitle: String(gameRow?.platform || gameRow?.platformShortName || '').trim(),
        imageUrl,
        thumbnailUrl: String(result?.thumbnailUrl || imageUrl).trim(),
        source,
        sourceUrl: String(result?.sourceUrl || result?.pageUrl || '').trim(),
        pageUrl: String(result?.pageUrl || result?.sourceUrl || '').trim(),
        gameId: Number(gameRow?.id || 0),
        gameKey: String(gameRow?.key || '').trim()
    }])[0] || null;
}

function buildSupportCoverAttachmentsFromSearchResults(results = [], gameRow = null, limit = 4, fallbackQuery = '') {
    const cappedLimit = Math.max(1, Math.min(6, Number(limit) || 4));
    const gameName = String(gameRow?.name || fallbackQuery || '').trim();
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
            kind: 'cover',
            title: String(row?.title || gameRow?.name || '').trim(),
            subtitle: String(gameRow?.platform || gameRow?.platformShortName || '').trim(),
            imageUrl: String(row?.imageUrl || row?.thumbnailUrl || '').trim(),
            thumbnailUrl: String(row?.thumbnailUrl || row?.imageUrl || '').trim(),
            source: String(row?.source || 'web').trim(),
            sourceUrl: String(row?.pageUrl || row?.imageUrl || '').trim(),
            pageUrl: String(row?.pageUrl || '').trim(),
            gameId: Number(gameRow?.id || 0),
            gameKey: String(gameRow?.key || '').trim()
        }))
    );
}

function collectRecentSupportCoverAttachments(chatHistory = []) {
    const rows = Array.isArray(chatHistory) ? chatHistory : [];
    const attachments = [];
    for (let index = rows.length - 1; index >= 0; index -= 1) {
        const entry = rows[index];
        if (String(entry?.role || '').trim().toLowerCase() !== 'assistant') {
            continue;
        }
        const normalized = normalizeSupportMessageAttachments(entry?.attachments);
        normalized.forEach((attachment) => attachments.push(attachment));
    }
    return attachments;
}

function resolveSupportCoverAttachmentSelection(chatHistory = [], task = {}, gameRow = null) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const explicitImageUrl = String(
        args.imageUrl || args.image || args.url || args.coverUrl || args.thumbnailUrl || ''
    ).trim();
    if (explicitImageUrl) {
        return normalizeSupportMessageAttachments([{
            kind: 'cover',
            title: String(gameRow?.name || args.gameName || args.title || '').trim(),
            subtitle: String(gameRow?.platform || gameRow?.platformShortName || '').trim(),
            imageUrl: explicitImageUrl,
            thumbnailUrl: String(args.thumbnailUrl || explicitImageUrl).trim(),
            source: String(args.source || 'manual').trim(),
            sourceUrl: String(args.sourceUrl || args.pageUrl || explicitImageUrl).trim(),
            pageUrl: String(args.pageUrl || args.sourceUrl || '').trim(),
            gameId: Number(gameRow?.id || args.gameId || 0),
            gameKey: String(gameRow?.key || args.gameKey || '').trim()
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
        args.query || args.gameName || args.title || args.name || gameRow?.name || ''
    ).trim().toLowerCase();
    const matching = requestedQuery
        ? attachments.filter((attachment) => {
            const text = [
                attachment?.title,
                attachment?.subtitle,
                attachment?.source,
                attachment?.sourceUrl
            ].map((value) => String(value || '').toLowerCase()).join(' ');
            if (gameRow?.id && Number(attachment?.gameId || 0) === Number(gameRow.id || 0)) {
                return true;
            }
            if (gameRow?.key && String(attachment?.gameKey || '').trim() === String(gameRow.key || '').trim()) {
                return true;
            }
            return requestedQuery ? text.includes(requestedQuery) : true;
        })
        : attachments;

    return matching[selectionIndex] || matching[0] || attachments[selectionIndex] || attachments[0] || null;
}

function normalizeSupportTaskType(rawValue) {
    const normalized = String(rawValue || '').trim().toUpperCase();
    switch (normalized) {
        case SUPPORT_ASSISTANT_TASK_FETCH_SPECS:
        case 'GET_SPECS':
        case 'SYSTEM:GET-SPECS':
        case 'SYSTEM_GET_SPECS':
            return SUPPORT_ASSISTANT_TASK_FETCH_SPECS;
        case SUPPORT_ASSISTANT_TASK_RUN_GAME:
        case 'LAUNCH-GAME':
        case 'LAUNCH_GAME':
            return SUPPORT_ASSISTANT_TASK_RUN_GAME;
        case SUPPORT_ASSISTANT_TASK_RUN_EMULATOR:
        case 'LAUNCH-EMULATOR':
        case 'LAUNCH_EMULATOR':
            return SUPPORT_ASSISTANT_TASK_RUN_EMULATOR;
        case SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR:
        case 'DOWNLOAD-INSTALL-EMULATOR':
        case 'DOWNLOAD_EMULATOR':
        case 'INSTALL_EMULATOR':
            return SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR;
        case SUPPORT_ASSISTANT_TASK_READ_LIBRARY:
        case 'READ_CONTEXT':
        case 'SCAN_LIBRARY':
        case 'QUERY_LIBRARY':
        case 'SEARCH_LIBRARY':
        case 'LIST_LIBRARY':
        case 'LIST_GAMES':
            return SUPPORT_ASSISTANT_TASK_READ_LIBRARY;
        case SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY:
        case 'RELOAD_LIBRARY':
        case 'REFRESH_CONTEXT':
            return SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY;
        case SUPPORT_ASSISTANT_TASK_ADD_TAGS:
        case 'TAG_GAME':
        case 'APPLY_TAGS':
            return SUPPORT_ASSISTANT_TASK_ADD_TAGS;
        case SUPPORT_ASSISTANT_TASK_REMOVE_TAGS:
        case 'DELETE_TAGS':
        case 'UNTAG_GAME':
            return SUPPORT_ASSISTANT_TASK_REMOVE_TAGS;
        case SUPPORT_ASSISTANT_TASK_LIST_TAGS:
        case 'GET_TAGS':
        case 'READ_TAGS':
        case 'SHOW_TAGS':
            return SUPPORT_ASSISTANT_TASK_LIST_TAGS;
        case SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS:
        case 'SEARCH_HELP_DOCS':
        case 'SHOW_HELP_DOCS':
        case 'HELP_DOCS_LIST':
            return SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS;
        case SUPPORT_ASSISTANT_TASK_READ_HELP_DOC:
        case 'OPEN_HELP_DOC':
        case 'GET_HELP_DOC':
        case 'SHOW_HELP_DOC':
            return SUPPORT_ASSISTANT_TASK_READ_HELP_DOC;
        case SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS:
        case 'SEARCH_SELF_TASK_DOCS':
        case 'SHOW_SELF_TASK_DOCS':
        case 'LIST_TASK_DOCS':
            return SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS;
        case SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC:
        case 'OPEN_SELF_TASK_DOC':
        case 'GET_SELF_TASK_DOC':
        case 'READ_TASK_DOC':
            return SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC;
        case SUPPORT_ASSISTANT_TASK_RELEASE_DATE:
        case 'GET_RELEASE_DATE':
        case 'READ_RELEASE_DATE':
        case 'PLATFORM_RELEASE_DATE':
            return SUPPORT_ASSISTANT_TASK_RELEASE_DATE;
        case SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE:
        case 'GET_GAME_RELEASE_DATE':
        case 'READ_GAME_RELEASE_DATE':
            return SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE;
        case SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER:
        case 'SHOW_GAME_COVER':
        case 'GET_GAME_COVER':
        case 'SEARCH_GAME_COVER':
        case 'FETCH_COVER':
        case 'SHOW_COVER':
            return SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER;
        case SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER:
        case 'APPLY_GAME_COVER':
        case 'SAVE_GAME_COVER':
        case 'SET_GAME_COVER':
            return SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER;
        case SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW:
        case 'WATCH_GAME_VIDEO':
        case 'OPEN_YOUTUBE':
            return SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW;
        case SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL:
        case 'OPEN_URL':
        case 'BROWSE_URL':
            return SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL;
        case SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL:
        case 'OPEN_PANEL':
        case 'OPEN_SETTINGS':
            return SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL;
        case SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE:
        case 'SET_SUPPORT_MODE':
        case 'SWITCH_SUPPORT_MODE':
        case 'CHANGE_MODE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE;
        case SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM:
        case 'SET_PLATFORM':
        case 'CHANGE_SUPPORT_PLATFORM':
            return SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM;
        case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR:
        case 'SET_EMULATOR':
        case 'CHANGE_SUPPORT_EMULATOR':
            return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR;
        case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE:
        case 'SET_ISSUE_TYPE':
        case 'CHANGE_PROBLEM_TYPE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE;
        case SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY:
        case 'SET_ISSUE_SUMMARY':
        case 'SET_CHAT_MESSAGE':
        case 'CHANGE_SUMMARY':
            return SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY;
        case SUPPORT_ASSISTANT_TASK_APPEND_DETAILS:
        case 'ADD_DETAILS':
        case 'UPDATE_DETAILS':
            return SUPPORT_ASSISTANT_TASK_APPEND_DETAILS;
        case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD:
        case 'CLEAR_FIELD':
        case 'RESET_FIELD':
            return SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD;
        case SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION:
        case 'RESET_SUPPORT_SESSION':
        case 'CLEAR_SUPPORT':
            return SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION;
        case SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS:
        case 'SET_AUTO_SPECS':
            return SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS;
        case SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS:
        case 'SET_WEB_ACCESS':
            return SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS;
        case SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT:
        case 'SET_DEBUG_CONTEXT':
        case 'SET_DEBUG_SUPPORT':
            return SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT;
        case SUPPORT_ASSISTANT_TASK_CHANGE_THEME:
        case 'SET_THEME':
        case 'SWITCH_THEME':
        case 'SET_THEME_TONE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_THEME;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE:
        case 'SET_LANGUAGE':
        case 'SWITCH_LANGUAGE':
        case 'SET_LOCALE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE;
        case SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS:
        case 'DOWNLOAD_COVERS':
        case 'FETCH_LIBRARY_COVERS':
        case 'BULK_DOWNLOAD_COVERS':
        case 'REFRESH_COVERS':
            return SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION:
        case 'SET_LIBRARY_SECTION':
        case 'SWITCH_LIBRARY_SECTION':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW:
        case 'SET_LIBRARY_VIEW':
        case 'SWITCH_LIBRARY_VIEW':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH:
        case 'SET_LIBRARY_SEARCH':
        case 'SEARCH_LIBRARY_VIEW':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER:
        case 'SET_LIBRARY_PLATFORM_FILTER':
        case 'FILTER_LIBRARY_PLATFORM':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT:
        case 'SET_LIBRARY_SORT':
        case 'SORT_LIBRARY_VIEW':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT;
        case SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE:
        case 'SET_LIBRARY_EMULATOR_TYPE':
        case 'FILTER_EMULATOR_TYPE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE;
        case SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS:
        case 'RESET_LIBRARY_FILTERS':
        case 'CLEAR_LIBRARY_SEARCH':
            return SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS;
        case SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS:
        case 'SHOW_GAME_DETAILS':
        case 'OPEN_GAME_MODAL':
            return SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS;
        case SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS:
        case 'SHOW_EMULATOR_DETAILS':
        case 'OPEN_EMULATOR_MODAL':
            return SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS;
        case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE:
        case 'SET_EMULATOR_WEBSITE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE;
        case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS:
        case 'SET_EMULATOR_LAUNCH_ARGS':
            return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS;
        case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY:
        case 'SET_EMULATOR_WORKING_DIRECTORY':
            return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY;
        case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH:
        case 'SET_EMULATOR_CONFIG_PATH':
        case 'SET_EMULATOR_CONFIG_FILE_PATH':
            return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH;
        case SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE:
        case 'SET_EMULATOR_RUN_COMMANDS_BEFORE':
            return SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE;
        case SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS:
        case 'RESET_EMULATOR_OVERRIDES':
        case 'CLEAR_EMULATOR_OVERRIDES':
            return SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS;
        default:
            return normalized;
    }
}

function normalizeSupportTaskConfidence(rawValue) {
    const confidence = Number(rawValue);
    if (!Number.isFinite(confidence)) return 1;
    return Math.max(0, Math.min(1, confidence));
}

function normalizeSupportTaskArgs(task) {
    return task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
}

function readSupportTaskStringArg(task, keys = []) {
    const args = normalizeSupportTaskArgs(task);
    for (const key of keys) {
        const value = String(args?.[key] || '').trim();
        if (value) return value;
    }
    return '';
}

function normalizeSupportTaskModeTarget(task) {
    const mode = String(readSupportTaskStringArg(task, ['mode', 'targetMode', 'view', 'tab', 'value']) || '').trim().toLowerCase();
    return (mode === 'chat' || mode === 'help') ? mode : 'troubleshoot';
}

function normalizeSupportTaskIssueTypeTarget(task) {
    const value = String(readSupportTaskStringArg(task, ['issueType', 'type', 'problemType', 'value']) || '').trim().toLowerCase();
    return ISSUE_TYPES.some((entry) => entry.value === value) ? value : 'launch';
}

function normalizeSupportTaskBooleanValue(task, fallback = null) {
    const args = normalizeSupportTaskArgs(task);
    const direct = args.enabled ?? args.value ?? args.checked ?? args.on ?? args.allow ?? null;
    if (typeof direct === 'boolean') return direct;
    const normalized = String(direct ?? '').trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on', 'enable', 'enabled', 'allow', 'allowed'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off', 'disable', 'disabled', 'deny', 'denied'].includes(normalized)) return false;
    return fallback;
}

function normalizeSupportTaskClearFields(task) {
    const args = normalizeSupportTaskArgs(task);
    const rawValues = [];
    if (typeof args.field === 'string') rawValues.push(args.field);
    if (typeof args.target === 'string') rawValues.push(args.target);
    if (Array.isArray(args.fields)) rawValues.push(...args.fields);
    const aliasMap = new Map([
        ['summary', 'issueSummary'],
        ['issue-summary', 'issueSummary'],
        ['message', 'issueSummary'],
        ['chat-message', 'issueSummary'],
        ['platform', 'platform'],
        ['emulator', 'emulator'],
        ['error', 'errorText'],
        ['error-text', 'errorText'],
        ['details', 'details']
    ]);
    return Array.from(new Set(
        rawValues
            .map((value) => String(value || '').trim().toLowerCase())
            .map((value) => aliasMap.get(value) || '')
            .filter(Boolean)
    ));
}

function normalizeSupportTaskThemeTarget(task) {
    const raw = String(readSupportTaskStringArg(task, ['theme', 'tone', 'mode', 'value', 'name', 'query']) || '').trim().toLowerCase();
    if (raw === 'light' || raw === 'light theme') return 'light';
    if (raw === 'dark' || raw === 'dark theme') return 'dark';
    return '';
}

function normalizeSupportTaskLanguageTarget(task) {
    return String(readSupportTaskStringArg(task, ['language', 'code', 'locale', 'value', 'name', 'query']) || '').trim();
}

function normalizeSupportTaskLibrarySectionTarget(task) {
    const raw = String(readSupportTaskStringArg(task, ['section', 'librarySection', 'target', 'view', 'tab', 'name', 'value', 'query']) || '').trim().toLowerCase();
    if (!raw) return '';
    if (['all', 'all games', 'games', 'library'].includes(raw)) return 'all';
    if (['favorite', 'favorites'].includes(raw)) return 'favorite';
    if (['suggested', 'suggestions', 'recommended'].includes(raw)) return 'suggested';
    if (['recent', 'recently played', 'history'].includes(raw)) return 'recent';
    if (['emulators', 'emulator'].includes(raw)) return 'emulators';
    return '';
}

function normalizeSupportTaskLibraryViewTarget(task) {
    const raw = String(readSupportTaskStringArg(task, ['viewMode', 'view', 'mode', 'target', 'name', 'value', 'query']) || '').trim().toLowerCase();
    if (!raw) return '';
    if (['cover', 'covers', 'grid', 'cover grid'].includes(raw)) return 'cover';
    if (['list', 'table'].includes(raw)) return 'list';
    if (['focus', 'focused'].includes(raw)) return 'focus';
    if (['slideshow', 'slide', 'carousel'].includes(raw)) return 'slideshow';
    if (['random', 'shuffle'].includes(raw)) return 'random';
    return '';
}

function normalizeSupportTaskLibrarySearchTarget(task) {
    return String(readSupportTaskStringArg(task, ['query', 'search', 'searchQuery', 'term', 'text', 'value', 'name']) || '').trim();
}

function normalizeSupportTaskLibraryPlatformTarget(task) {
    const raw = String(readSupportTaskStringArg(task, ['platform', 'platformId', 'platformShortName', 'target', 'value', 'query']) || '').trim();
    if (!raw) return '';
    const normalized = raw.toLowerCase();
    if (['all', 'any', 'every'].includes(normalized)) return 'all';
    return normalized;
}

function normalizeSupportTaskLibrarySortTarget(task) {
    const raw = String(readSupportTaskStringArg(task, ['sort', 'sortBy', 'target', 'value', 'query']) || '').trim().toLowerCase();
    if (!raw) return '';
    if (['name', 'title', 'alphabetical', 'alphabetic'].includes(raw)) return 'name';
    if (['platform', 'system'].includes(raw)) return 'platform';
    if (['rating', 'score'].includes(raw)) return 'rating';
    if (['recent', 'recently played', 'last played'].includes(raw)) return 'recently-played';
    return '';
}

function normalizeSupportTaskLibraryEmulatorTypeTarget(task) {
    const raw = String(readSupportTaskStringArg(task, ['emulatorType', 'type', 'target', 'value', 'query']) || '').trim().toLowerCase();
    if (!raw) return '';
    if (['standalone', 'standalone emulator'].includes(raw)) return 'standalone';
    if (['core', 'cores', 'libretro core', 'libretro cores'].includes(raw)) return 'core';
    if (['web', 'browser', 'web emulator'].includes(raw)) return 'web';
    return '';
}

function normalizeSupportTaskLibraryClearFields(task) {
    const args = normalizeSupportTaskArgs(task);
    const rawValues = [];
    if (typeof args.field === 'string') rawValues.push(args.field);
    if (typeof args.target === 'string') rawValues.push(args.target);
    if (Array.isArray(args.fields)) rawValues.push(...args.fields);
    if (!rawValues.length) {
        return ['all'];
    }
    const aliasMap = new Map([
        ['all', 'all'],
        ['filters', 'all'],
        ['library-filters', 'all'],
        ['search', 'query'],
        ['query', 'query'],
        ['platform', 'platform'],
        ['platform-filter', 'platform'],
        ['sort', 'sort'],
        ['sortby', 'sort'],
        ['view', 'view'],
        ['section', 'section'],
        ['emulator-type', 'emulatorType'],
        ['type', 'emulatorType']
    ]);
    return Array.from(new Set(
        rawValues
            .map((value) => String(value || '').trim().toLowerCase())
            .map((value) => aliasMap.get(value) || '')
            .filter(Boolean)
    ));
}

function normalizeSupportTaskEmulatorConfigValue(task, keys = []) {
    return String(readSupportTaskStringArg(task, Array.isArray(keys) && keys.length ? keys : ['value', 'text', 'query', 'path', 'url']) || '').trim();
}

function normalizeSupportTaskEmulatorClearFields(task) {
    const args = normalizeSupportTaskArgs(task);
    const rawValues = [];
    if (typeof args.field === 'string') rawValues.push(args.field);
    if (typeof args.target === 'string') rawValues.push(args.target);
    if (Array.isArray(args.fields)) rawValues.push(...args.fields);
    if (!rawValues.length) {
        return ['all'];
    }
    const aliasMap = new Map([
        ['all', 'all'],
        ['overrides', 'all'],
        ['website', 'website'],
        ['launch-args', 'launchArgs'],
        ['args', 'launchArgs'],
        ['working-directory', 'workingDirectory'],
        ['workingdir', 'workingDirectory'],
        ['config-path', 'configFilePath'],
        ['config-file-path', 'configFilePath'],
        ['config', 'configFilePath'],
        ['run-commands-before', 'runCommandsBefore'],
        ['runcommandsbefore', 'runCommandsBefore'],
        ['prelaunch', 'runCommandsBefore']
    ]);
    return Array.from(new Set(
        rawValues
            .map((value) => String(value || '').trim().toLowerCase())
            .map((value) => aliasMap.get(value) || '')
            .filter(Boolean)
    ));
}

function getSupportEmulatorConfigStorageMap() {
    try {
        const raw = localStorage.getItem(SUPPORT_EMULATOR_CONFIG_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_error) {
        return {};
    }
}

function setSupportEmulatorConfigStorageMap(nextMap) {
    try {
        localStorage.setItem(SUPPORT_EMULATOR_CONFIG_STORAGE_KEY, JSON.stringify(nextMap || {}));
    } catch (_error) {}
}

function getSupportEmulatorConfigStorageKey(emulatorRow = null) {
    const filePath = String(emulatorRow?.filePath || '').trim().toLowerCase();
    if (filePath) return filePath;
    return String(emulatorRow?.id || emulatorRow?.name || 'emu').trim().toLowerCase();
}

function normalizeSupportStoredEmulatorConfigPatch(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
        website: String(source.website || '').trim(),
        launchArgs: String(source.launchArgs || '').trim(),
        workingDirectory: String(source.workingDirectory || '').trim(),
        configFilePath: String(source.configFilePath || '').trim(),
        runCommandsBefore: String(source.runCommandsBefore || '').trim()
    };
}

function updateSupportEmulatorStoredConfig(emulatorRow = null, patch = {}) {
    const key = getSupportEmulatorConfigStorageKey(emulatorRow);
    if (!key) return {};
    const map = getSupportEmulatorConfigStorageMap();
    const current = map[key] && typeof map[key] === 'object' ? map[key] : {};
    map[key] = {
        ...normalizeSupportStoredEmulatorConfigPatch(current),
        ...normalizeSupportStoredEmulatorConfigPatch(patch)
    };
    setSupportEmulatorConfigStorageMap(map);
    return map[key];
}

function buildSupportStreamRequestId() {
    return `support-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSupportTauriEventListen() {
    const tauri = window.__TAURI__;
    const globalListen = tauri && tauri.event && typeof tauri.event.listen === 'function' ? tauri.event.listen : null;
    if (typeof globalListen === 'function') return globalListen;

    const internals = window.__TAURI_INTERNALS__;
    if (!internals || typeof internals.invoke !== 'function' || typeof internals.transformCallback !== 'function') {
        return null;
    }

    return (eventName, handler, options) => {
        const normalizedEvent = String(eventName || '').trim();
        if (!normalizedEvent) return Promise.resolve(() => {});
        const target = typeof options?.target === 'string'
            ? { kind: 'AnyLabel', label: options.target }
            : (options?.target ?? { kind: 'Any' });

        return internals.invoke('plugin:event|listen', {
            event: normalizedEvent,
            target,
            handler: internals.transformCallback(handler)
        }).then((eventId) => {
            return () => {
                try {
                    window.__TAURI_EVENT_PLUGIN_INTERNALS__?.unregisterListener?.(normalizedEvent, eventId);
                } catch (_error) {}
                return internals.invoke('plugin:event|unlisten', {
                    event: normalizedEvent,
                    eventId
                }).catch(() => {});
            };
        });
    };
}

function subscribeToSupportStream(listener) {
    if (typeof listener !== 'function') return null;
    if (emubro && typeof emubro.onSupportStream === 'function') {
        return emubro.onSupportStream(listener);
    }

    const tauriListen = getSupportTauriEventListen();
    if (!tauriListen) return null;

    let disposed = false;
    let unlisten = null;
    const handleEvent = (event) => {
        if (disposed) return;
        const payload = event && typeof event === 'object' && Object.prototype.hasOwnProperty.call(event, 'payload')
            ? event.payload
            : event;
        listener(payload);
    };
    const subscription = tauriListen(SUPPORT_STREAM_EVENT_NAME, handleEvent);
    if (subscription && typeof subscription.then === 'function') {
        subscription.then((nextUnlisten) => {
            if (disposed) {
                try {
                    const result = typeof nextUnlisten === 'function' ? nextUnlisten() : null;
                    if (result && typeof result.then === 'function') {
                        result.catch(() => {});
                    }
                } catch (_error) {}
                return;
            }
            unlisten = nextUnlisten;
        }).catch(() => {});
    } else if (typeof subscription === 'function') {
        unlisten = subscription;
    }

    return () => {
        disposed = true;
        if (typeof unlisten === 'function') {
            try {
                const result = unlisten();
                if (result && typeof result.then === 'function') {
                    result.catch(() => {});
                }
            } catch (_error) {}
        }
    };
}

function canUseSupportStreamingBridge() {
    return (emubro && typeof emubro.onSupportStream === 'function') || !!getSupportTauriEventListen();
}

function shouldUseSupportStreaming(payload = {}) {
    if (!canUseSupportStreamingBridge()) return false;
    if (String(payload?.llmMode || '').trim().toLowerCase() === 'client') return false;
    return String(payload?.provider || '').trim().toLowerCase() === 'ollama';
}

function decodePartialJsonStringValue(rawText, fieldName) {
    const source = String(rawText || '');
    const marker = `"${String(fieldName || '').trim()}"`;
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) return '';

    let index = markerIndex + marker.length;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== ':') return '';
    index += 1;
    while (index < source.length && /\s/.test(source[index])) index += 1;
    if (source[index] !== '"') return '';
    index += 1;

    let output = '';
    let escaping = false;
    for (; index < source.length; index += 1) {
        const char = source[index];
        if (escaping) {
            if (char === 'n') output += '\n';
            else if (char === 'r') output += '\r';
            else if (char === 't') output += '\t';
            else if (char === '"') output += '"';
            else if (char === '\\') output += '\\';
            else if (char === '/') output += '/';
            else output += char;
            escaping = false;
            continue;
        }
        if (char === '\\') {
            escaping = true;
            continue;
        }
        if (char === '"') break;
        output += char;
    }
    return output;
}

function deriveSupportLiveResponseText(rawText) {
    const source = String(rawText || '');
    if (!source.trim()) return '';

    const message = decodePartialJsonStringValue(source, 'message').trim();
    if (message) return message;

    const reason = decodePartialJsonStringValue(source, 'reason').trim();
    if (reason) return reason;

    if (/^\s*\{/.test(source)) return '';
    return source.trim();
}

function inferSupportLibraryIntent({
    issueSummary = '',
    platform = '',
    emulator = ''
} = {}) {
    if (!String(issueSummary || '').trim() && !String(platform || '').trim() && !String(emulator || '').trim()) {
        return { active: false, reason: 'empty' };
    }
    return { active: false, reason: 'task-driven' };
}

function summarizeSupportLibraryRows(rows, kind = 'game', limit = 12) {
    return (Array.isArray(rows) ? rows : [])
        .slice(0, Math.max(1, Number(limit) || 12))
        .map((row) => ({
            id: Number(row?.id || 0),
            key: String(row?.key || '').trim(),
            kind,
            name: String(row?.name || '').trim(),
            platform: String(row?.platform || row?.platformShortName || '').trim(),
            platformShortName: String(row?.platformShortName || '').trim(),
            tags: kind === 'game'
                ? (Array.isArray(row?.tags)
                    ? row.tags.map((value) => String(value || '').trim()).filter(Boolean)
                    : [])
                : [],
            tagLabels: kind === 'game'
                ? (Array.isArray(row?.tagLabels)
                    ? row.tagLabels.map((value) => String(value || '').trim()).filter(Boolean)
                    : [])
                : [],
            installed: kind === 'emulator' ? !!(row?.isInstalled ?? row?.installed) : undefined,
            isInstalled: kind === 'emulator' ? !!(row?.isInstalled ?? row?.installed) : undefined,
            filePath: kind === 'emulator' ? String(row?.filePath || '').trim() : '',
            filePaths: kind === 'emulator'
                ? (Array.isArray(row?.filePaths)
                    ? row.filePaths.map((value) => String(value || '').trim()).filter(Boolean)
                    : [])
                : [],
            downloadable: kind === 'emulator' ? !!(row?.downloadUrl || row?.website || row?.downloadLinks) : undefined,
            type: kind === 'emulator' ? String(row?.type || '').trim() : ''
        }))
        .filter((row) => !!row.name);
}

function summarizeSupportCatalogRows(rows, kind = 'game', limit = 220) {
    return summarizeSupportLibraryRows(
        (Array.isArray(rows) ? rows : [])
            .slice()
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || ''))),
        kind,
        limit
    );
}

function normalizeSupportLibraryTaskQuery(task = {}) {
    const queries = normalizeSupportLibraryTaskQueries(task);
    if (queries.length) return queries[0];
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    return String(
        args.query
        || args.search
        || args.searchQuery
        || args.title
        || args.gameName
        || args.emulatorName
        || args.name
        || ''
    ).trim();
}

function normalizeSupportLibraryTaskQueries(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const rows = [];
    const pushValues = (value) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => pushValues(entry));
            return;
        }
        const text = String(value || '').trim();
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
            || ''
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
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const raw = String(args.kind || args.target || '').trim().toLowerCase();
    if (raw === 'game' || raw === 'games' || raw === 'title' || raw === 'titles' || raw === 'rom' || raw === 'roms') {
        return 'games';
    }
    if (raw === 'emulator' || raw === 'emulators') {
        return 'emulators';
    }
    if (args.gameId || args.gameKey || args.gameName) {
        return 'games';
    }
    if (args.emulatorId || args.emulatorKey || args.emulatorName) {
        return 'emulators';
    }
    return 'all';
}

function normalizeSupportLibraryTaskLimit(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
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
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    return String(
        args.platform
        || args.platformName
        || args.shortName
        || args.name
        || args.query
        || args.value
        || ''
    ).trim();
}

function normalizeSupportReleaseDateRegions(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const raw = []
        .concat(args.region || [])
        .concat(args.regions || [])
        .concat(args.market || [])
        .concat(args.markets || []);
    const rows = (Array.isArray(raw) ? raw : [raw])
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
    const aliases = {
        usa: 'us',
        na: 'us',
        northamerica: 'us',
        europe: 'eu',
        eur: 'eu',
        japan: 'jp',
        jpn: 'jp'
    };
    const seen = new Set();
    return rows
        .map((value) => aliases[value.replace(/[^a-z]/g, '')] || value)
        .filter((value) => {
            if (!value || seen.has(value)) return false;
            seen.add(value);
            return true;
        })
        .slice(0, 8);
}

function buildSupportReleaseDateSummary(platformRow = null, task = {}) {
    const releaseDate = platformRow?.releaseDate && typeof platformRow.releaseDate === 'object' && !Array.isArray(platformRow.releaseDate)
        ? platformRow.releaseDate
        : {};
    const preferredRegions = normalizeSupportReleaseDateRegions(task);
    const entries = Object.entries(releaseDate)
        .map(([key, value]) => [String(key || '').trim().toLowerCase(), String(value || '').trim()])
        .filter(([key, value]) => key && value);
    if (!entries.length) {
        return {
            found: false,
            message: '',
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
        message: lines.join('\n'),
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
        .map((value) => String(value || '').trim())
        .filter(Boolean);
    const preferred = values.find((value) => /\d{4}/.test(value)) || values[0] || '';
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
        .map((value) => String(value || '').trim().toLowerCase())
        .filter(Boolean);
    const normalizedBase = baseKeys.map((value) => value.replace(/[^a-z0-9]+/g, ''));
    const aliasMap = {
        snes: ['super nintendo entertainment system', 'super nintendo', 'super nes'],
        nes: ['nintendo entertainment system', 'famicom'],
        psx: ['playstation', 'sony playstation', 'sony playstation 1', 'playstation 1', 'ps1'],
        ps2: ['playstation 2', 'sony playstation 2'],
        ps3: ['playstation 3', 'sony playstation 3'],
        psp: ['playstation portable', 'sony playstation portable'],
        gcn: ['gamecube', 'nintendo gamecube'],
        n64: ['nintendo64', 'nintendo 64'],
        nds: ['ds', 'nintendo ds', 'nintendo dual screen'],
        gba: ['gameboyadvance', 'game boy advance'],
        gameboy: ['gb', 'game boy'],
        '3ds': ['nintendo 3ds', '3ds'],
        'wii-u': ['wii u', 'nintendo wii u'],
        xbox: ['original xbox', 'microsoft xbox'],
        xbox360: ['xbox 360', 'microsoft xbox 360'],
        pc: ['windows', 'microsoft windows', 'windows pc', 'pc']
    };
    const aliasKeys = [];
    normalizedBase.forEach((value) => {
        const aliases = aliasMap[value] || [];
        aliases.forEach((alias) => {
            aliasKeys.push(String(alias || '').trim().toLowerCase());
        });
    });
    const allKeys = baseKeys.concat(aliasKeys);
    const seen = new Set();
    return allKeys.filter((value) => {
        const normalized = String(value || '').trim().toLowerCase();
        if (!normalized || seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
    });
}

function findSupportPlatformRowByQuery(platformRows = [], query = '') {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const normalizedCompactQuery = normalizedQuery.replace(/[^a-z0-9]+/g, '');
    const rows = Array.isArray(platformRows) ? platformRows : [];
    if (!normalizedQuery) return rows[0] || null;
    const exact = rows.find((row) => {
        const keys = buildSupportPlatformSearchKeys(row);
        return keys.includes(normalizedQuery) || keys.some((value) => value.replace(/[^a-z0-9]+/g, '') === normalizedCompactQuery);
    });
    if (exact) return exact;
    const contains = rows.find((row) => {
        const haystack = buildSupportPlatformSearchKeys(row).join(' ');
        return haystack.includes(normalizedQuery) || haystack.replace(/[^a-z0-9]+/g, '').includes(normalizedCompactQuery);
    });
    return contains || null;
}

function normalizeSupportCoverTaskLimit(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const parsed = Number(args.limit ?? args.count ?? args.maxResults ?? args.maxRows ?? 1);
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, Math.min(6, Math.round(parsed)));
}

function normalizeSupportCoverTaskMode(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const raw = String(args.mode || args.source || args.action || args.strategy || '').trim().toLowerCase();
    if (['web', 'search', 'browse', 'options', 'gallery', 'results'].includes(raw)) {
        return 'search';
    }
    if (['library', 'current', 'existing', 'local'].includes(raw)) {
        return 'library';
    }
    return 'auto';
}

function summarizeSupportLibraryQueryResults(rows, matchLimit) {
    return (Array.isArray(rows) ? rows : [])
        .slice(0, 24)
        .map((entry) => ({
            query: String(entry?.query || '').trim(),
            gameCount: Number(entry?.gameCount || 0),
            emulatorCount: Number(entry?.emulatorCount || 0),
            gameRowsReturned: Number(entry?.gameRowsReturned || (Array.isArray(entry?.games) ? entry.games.length : 0)),
            emulatorRowsReturned: Number(entry?.emulatorRowsReturned || (Array.isArray(entry?.emulators) ? entry.emulators.length : 0)),
            gameRowsTruncated: !!entry?.gameRowsTruncated,
            emulatorRowsTruncated: !!entry?.emulatorRowsTruncated,
            games: summarizeSupportLibraryRows(entry?.games || [], 'game', matchLimit),
            emulators: summarizeSupportLibraryRows(entry?.emulators || [], 'emulator', matchLimit)
        }))
        .filter((entry) => entry.query);
}

function buildSupportLibraryContextPayload(matches, fallbackQuery = '') {
    const source = matches && typeof matches === 'object' ? matches : {};
    const matchReason = String(source?.reason || '').trim().toLowerCase();
    const requestedMatchLimit = Number(source?.limit || 0);
    const matchLimit = matchReason === 'task-query' || matchReason === 'task-catalog'
        ? (Number.isFinite(requestedMatchLimit) && requestedMatchLimit > 0 ? requestedMatchLimit : SUPPORT_LIBRARY_QUERY_LIMIT)
        : 12;
    return {
        active: !!source?.active,
        reason: String(source?.reason || '').trim(),
        query: source?.active ? String(source?.query || '').trim() : '',
        queries: Array.isArray(source?.queries) ? source.queries.map((value) => String(value || '').trim()).filter(Boolean).slice(0, 24) : [],
        batchQuery: !!source?.batchQuery,
        limit: Number.isFinite(requestedMatchLimit) && requestedMatchLimit > 0 ? requestedMatchLimit : matchLimit,
        gameCount: Number(source?.gameCount || 0),
        emulatorCount: Number(source?.emulatorCount || 0),
        gameRowsReturned: Number(source?.gameRowsReturned || (Array.isArray(source?.games) ? source.games.length : 0)),
        emulatorRowsReturned: Number(source?.emulatorRowsReturned || (Array.isArray(source?.emulators) ? source.emulators.length : 0)),
        gameRowsTruncated: !!source?.gameRowsTruncated,
        emulatorRowsTruncated: !!source?.emulatorRowsTruncated,
        games: summarizeSupportLibraryRows(source?.games || [], 'game', matchLimit),
        emulators: summarizeSupportLibraryRows(source?.emulators || [], 'emulator', matchLimit),
        queryResults: summarizeSupportLibraryQueryResults(source?.queryResults || [], matchLimit),
        catalog: {
            gameTotal: Number(source?.catalog?.gameTotal || 0),
            emulatorTotal: Number(source?.catalog?.emulatorTotal || 0),
            gamePlatforms: Array.isArray(source?.catalog?.gamePlatforms) ? source.catalog.gamePlatforms : [],
            emulatorPlatforms: Array.isArray(source?.catalog?.emulatorPlatforms) ? source.catalog.emulatorPlatforms : [],
            games: summarizeSupportLibraryRows(source?.catalog?.games || [], 'game', 220),
            emulators: summarizeSupportLibraryRows(source?.catalog?.emulators || [], 'emulator', 220)
        }
    };
}

function describeSupportLibraryQueryResult(matches, query = '') {
    const source = matches && typeof matches === 'object' ? matches : {};
    const queries = Array.isArray(source?.queries) ? source.queries.filter(Boolean) : [];
    const gameCount = Number(source?.gameCount || 0);
    const emulatorCount = Number(source?.emulatorCount || 0);
    if (queries.length > 1) {
        return `Library batch query checked ${queries.length} requested title${queries.length === 1 ? '' : 's'}. Continuing support...`;
    }
    if (!String(query || '').trim()) {
        if (gameCount > 0 && emulatorCount > 0) {
            return `Loaded full library context (${gameCount} games, ${emulatorCount} emulators). Continuing support...`;
        }
        if (gameCount > 0) {
            return `Loaded full game library context (${gameCount} games). Continuing support...`;
        }
        if (emulatorCount > 0) {
            return `Loaded full emulator library context (${emulatorCount} emulators). Continuing support...`;
        }
        return 'Loaded full library context with no rows. Continuing support...';
    }
    const label = ` for "${query}"`;
    if (gameCount > 0 && emulatorCount > 0) {
        return `Library query${label} found ${gameCount} games and ${emulatorCount} emulators. Continuing support...`;
    }
    if (gameCount > 0) {
        return `Library query${label} found ${gameCount} matching game${gameCount === 1 ? '' : 's'}. Continuing support...`;
    }
    if (emulatorCount > 0) {
        return `Library query${label} found ${emulatorCount} matching emulator${emulatorCount === 1 ? '' : 's'}. Continuing support...`;
    }
    return `Library query${label} found no matches. Continuing support...`;
}

function buildSupportPlatformCounts(rows = []) {
    const counter = new Map();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const platform = String(row?.platform || row?.platformShortName || '').trim();
        if (!platform) return;
        counter.set(platform, Number(counter.get(platform) || 0) + 1);
    });
    return Array.from(counter.entries())
        .map(([platform, count]) => ({ platform, count }))
        .sort((a, b) => b.count - a.count || a.platform.localeCompare(b.platform))
        .slice(0, 40);
}

function resolveSupportLibraryMatches({
    games = [],
    emulators = [],
    issueSummary = '',
    platform = '',
    emulator = ''
} = {}) {
    const intent = inferSupportLibraryIntent({ issueSummary, platform, emulator });
    const gameRows = Array.isArray(games) ? games : [];
    const emulatorRows = Array.isArray(emulators) ? emulators : [];
    return {
        active: false,
        reason: intent.reason,
        query: '',
        games: [],
        emulators: [],
        gameCount: 0,
        emulatorCount: 0,
        catalog: {
            gameTotal: gameRows.length,
            emulatorTotal: emulatorRows.length,
            gamePlatforms: buildSupportPlatformCounts(gameRows),
            emulatorPlatforms: buildSupportPlatformCounts(emulatorRows),
            games: summarizeSupportCatalogRows(gameRows, 'game'),
            emulators: summarizeSupportCatalogRows(emulatorRows, 'emulator')
        }
    };
}

function findSupportGameByTask(games, task = {}) {
    const args = task.args && typeof task.args === 'object' ? task.args : {};
    const targetId = Number(args.gameId || args.id || 0);
    const targetKey = String(args.gameKey || args.key || '').trim();
    if (Number.isFinite(targetId) && targetId > 0) {
        const match = (Array.isArray(games) ? games : []).find((row) => Number(row?.id || 0) === targetId);
        if (match) return match;
    }
    if (targetKey) {
        const match = (Array.isArray(games) ? games : []).find((row) => String(row?.key || '').trim() === targetKey);
        if (match) return match;
    }
    const rows = Array.isArray(games) ? games : [];
    const candidateNames = normalizeSupportTaskNameCandidates(task);
    for (const targetName of candidateNames) {
        const exact = rows.find((row) => String(row?.name || '').trim().toLowerCase() === targetName);
        if (exact) return exact;
    }
    for (const targetName of candidateNames) {
        const partial = rows.find((row) => String(row?.name || '').trim().toLowerCase().includes(targetName));
        if (partial) return partial;
    }
    return null;
}

function findSupportEmulatorByTask(emulators, task = {}) {
    const args = task.args && typeof task.args === 'object' ? task.args : {};
    const targetId = Number(args.emulatorId || args.id || 0);
    const targetKey = String(args.emulatorKey || args.key || '').trim();
    if (Number.isFinite(targetId) && targetId > 0) {
        const match = (Array.isArray(emulators) ? emulators : []).find((row) => Number(row?.id || 0) === targetId);
        if (match) return match;
    }
    if (targetKey) {
        const match = (Array.isArray(emulators) ? emulators : []).find((row) => String(row?.key || '').trim() === targetKey);
        if (match) return match;
    }
    const rows = Array.isArray(emulators) ? emulators : [];
    const candidateNames = normalizeSupportTaskNameCandidates(task);
    for (const targetName of candidateNames) {
        const exact = rows.find((row) => String(row?.name || '').trim().toLowerCase() === targetName);
        if (exact) return exact;
    }
    for (const targetName of candidateNames) {
        const partial = rows.find((row) => String(row?.name || '').trim().toLowerCase().includes(targetName));
        if (partial) return partial;
    }
    return null;
}

function normalizeSupportTaskNameCandidates(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const rows = [];
    const pushValue = (value) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => pushValue(entry));
            return;
        }
        const text = String(value || '').trim().toLowerCase();
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
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const rows = [];
    const pushValue = (value) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => pushValue(entry));
            return;
        }
        const text = String(value || '').trim().toLowerCase();
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
            .sort((a, b) => String(a?.name || a?.label || '').localeCompare(String(b?.name || b?.label || '')));
    }
    return rows
        .filter((row) => {
            const name = String(row?.name || row?.label || '').trim().toLowerCase();
            const id = String(row?.id || '').trim().toLowerCase();
            return candidates.some((candidate) => candidate === id || name.includes(candidate));
        })
        .sort((a, b) => String(a?.name || a?.label || '').localeCompare(String(b?.name || b?.label || '')));
}

function resolveSupportTagIdsForTask(tags, task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const ids = new Set(
        (Array.isArray(args.tagIds) ? args.tagIds : [])
            .map((value) => String(value || '').trim())
            .filter(Boolean)
    );
    const candidates = normalizeSupportTagCandidates(task);
    if (!candidates.length) return Array.from(ids);
    (Array.isArray(tags) ? tags : []).forEach((row) => {
        const name = String(row?.name || row?.label || '').trim().toLowerCase();
        const id = String(row?.id || '').trim();
        if (!name || !id) return;
        if (candidates.some((candidate) => candidate === id.toLowerCase() || name === candidate || name.includes(candidate))) {
            ids.add(id);
        }
    });
    return Array.from(ids);
}

function normalizeSupportHelpDocQuery(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    return String(
        args.query
        || args.search
        || args.searchQuery
        || args.docTitle
        || args.title
        || args.name
        || args.docId
        || args.id
        || ''
    ).trim();
}

function findSupportHelpDocByTask(docs, task = {}) {
    const rows = Array.isArray(docs) ? docs : [];
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const targetId = String(args.docId || args.id || '').trim().toLowerCase();
    if (targetId) {
        const byId = rows.find((row) => String(row?.id || '').trim().toLowerCase() === targetId);
        if (byId) return byId;
    }
    const query = normalizeSupportHelpDocQuery(task).toLowerCase();
    if (!query) return null;
    const exact = rows.find((row) => {
        const id = String(row?.id || '').trim().toLowerCase();
        const title = String(row?.title || '').trim().toLowerCase();
        return id === query || title === query;
    });
    if (exact) return exact;
    return rows.find((row) => {
        const haystack = `${String(row?.id || '')} ${String(row?.title || '')} ${String(row?.preview || row?.snippet || '')}`.toLowerCase();
        return haystack.includes(query);
    }) || null;
}

function normalizeSupportPanelTarget(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const raw = String(
        args.panel
        || args.target
        || args.section
        || args.tab
        || args.view
        || args.name
        || args.query
        || ''
    ).trim().toLowerCase();
    if (!raw) return '';
    if (['settings', 'general', 'library settings'].includes(raw)) return 'settings';
    if (['library-paths', 'paths', 'library paths'].includes(raw)) return 'library-paths';
    if (['import', 'imports', 'launcher-import'].includes(raw)) return 'import';
    if (['gamepad', 'controller', 'controllers'].includes(raw)) return 'gamepad';
    if (['ai', 'llm', 'ai / llm'].includes(raw)) return 'ai';
    if (['updates', 'update'].includes(raw)) return 'updates';
    if (['languages', 'language', 'locale', 'locales'].includes(raw)) return 'languages';
    if (raw === 'profile') return 'profile';
    if (['theme', 'theme-manager'].includes(raw)) return 'theme';
    if (['help', 'help-docs', 'docs', 'documentation'].includes(raw)) return 'help';
    if (raw === 'about') return 'about';
    if (raw === 'support') return 'support';
    if (raw === 'community') return 'community';
    if (['tools', 'toolbox'].includes(raw)) return 'tools';
    if (['overview', 'home', 'desktop-home'].includes(raw)) return 'overview';
    if (['library', 'browse', 'library-views'].includes(raw)) return 'library';
    return '';
}

function describeSupportPanelTarget(target = '') {
    switch (String(target || '').trim().toLowerCase()) {
        case 'settings':
            return 'settings workspace';
        case 'library-paths':
            return 'library paths settings';
        case 'import':
            return 'import settings';
        case 'gamepad':
            return 'gamepad settings';
        case 'ai':
            return 'AI settings';
        case 'updates':
            return 'updates workspace';
        case 'languages':
            return 'language manager';
        case 'profile':
            return 'profile modal';
        case 'theme':
            return 'theme manager';
        case 'help':
            return 'help docs';
        case 'about':
            return 'about dialog';
        case 'support':
            return 'support view';
        case 'community':
            return 'community view';
        case 'tools':
            return 'tools view';
        case 'overview':
            return 'overview view';
        case 'library':
            return 'library view';
        default:
            return 'requested app panel';
    }
}

function formatSupportTagListMarkdown(tagRows, query = '') {
    const rows = Array.isArray(tagRows) ? tagRows : [];
    const title = query ? `## Matching Tags for \`${query}\`` : '## Available Tags';
    if (!rows.length) {
        return `${title}\n\nNo matching tags were found.`;
    }
    return `${title}\n\n${rows.map((row) => `- \`${String(row?.id || '').trim()}\` - ${String(row?.name || row?.label || 'Untitled tag').trim()}`).join('\n')}`;
}

function formatSupportHelpDocListMarkdown(docs, query = '') {
    const rows = Array.isArray(docs) ? docs : [];
    const title = query ? `## Help Docs for \`${query}\`` : '## Help Docs';
    if (!rows.length) {
        return `${title}\n\nNo matching help docs were found.`;
    }
    return `${title}\n\n${rows.map((doc) => {
        const id = String(doc?.id || '').trim();
        const label = String(doc?.title || id || 'Help Doc').trim();
        const preview = String(doc?.preview || doc?.snippet || '').trim();
        return `- **${label}**${id ? ` (\`${id}\`)` : ''}${preview ? `\n  ${preview}` : ''}`;
    }).join('\n')}`;
}

function formatSupportHelpDocMarkdown(doc = {}) {
    const title = String(doc?.title || doc?.id || 'Help Doc').trim();
    const body = String(doc?.text || doc?.preview || '').trim();
    return body ? `## ${title}\n\n${body}` : `## ${title}`;
}

function formatSupportSelfTaskDocListMarkdown(docs, query = '') {
    const rows = Array.isArray(docs) ? docs : [];
    const title = query ? `## Self-Task Docs for \`${query}\`` : '## Self-Task Docs';
    if (!rows.length) {
        return `${title}\n\nNo matching self-task docs were found.`;
    }
    return `${title}\n\n${rows.map((doc) => {
        const id = String(doc?.id || '').trim();
        const label = String(doc?.title || id || 'Self Task Doc').trim();
        const summary = String(doc?.summary || '').trim();
        const tasks = Array.isArray(doc?.tasks) ? doc.tasks.map((value) => String(value || '').trim()).filter(Boolean) : [];
        return `- **${label}**${id ? ` (\`${id}\`)` : ''}${tasks.length ? `\n  Tasks: ${tasks.map((value) => `\`${value}\``).join(', ')}` : ''}${summary ? `\n  ${summary}` : ''}`;
    }).join('\n')}`;
}

function normalizeSupportSelfTaskDocQuery(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    return String(args.query || args.topic || args.title || args.docTitle || args.search || '').trim();
}

function normalizeSupportSelfTaskDocIds(task = {}) {
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const ids = [];
    const pushValue = (value) => {
        if (Array.isArray(value)) {
            value.forEach((entry) => pushValue(entry));
            return;
        }
        const text = String(value || '').trim();
        if (text) ids.push(text);
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
    const args = task?.args && typeof task.args === 'object' && !Array.isArray(task.args) ? task.args : {};
    const parsed = Number(args.limit ?? args.maxDocs ?? args.maxResults ?? 3);
    if (!Number.isFinite(parsed)) return 3;
    return Math.max(1, Math.min(6, Math.round(parsed)));
}

function buildSupportSelfTaskDocsOverride(docs, query = '', action = 'read') {
    return {
        active: true,
        action: String(action || 'read').trim(),
        query: String(query || '').trim(),
        docs: (Array.isArray(docs) ? docs : [])
            .map((doc) => ({
                id: String(doc?.id || '').trim(),
                title: String(doc?.title || '').trim(),
                summary: String(doc?.summary || '').trim(),
                tasks: Array.isArray(doc?.tasks) ? doc.tasks.map((value) => String(value || '').trim()).filter(Boolean) : [],
                text: String(doc?.text || '').trim()
            }))
            .filter((doc) => doc.id || doc.title)
            .slice(0, 6)
    };
}

function buildSupportTaskResultOverride(taskType, messageText, extra = {}) {
    const normalizedTaskType = normalizeSupportTaskType(taskType);
    return {
        active: !!normalizedTaskType,
        success: extra?.success !== false,
        taskType: normalizedTaskType,
        message: String(messageText || '').trim(),
        entityKind: String(extra?.entityKind || '').trim(),
        entityName: String(extra?.entityName || '').trim(),
        details: String(extra?.details || '').trim(),
        data: extra?.data && typeof extra.data === 'object' && !Array.isArray(extra.data)
            ? extra.data
            : {}
    };
}

function buildSupportTaskApproval(task = {}) {
    const type = String(task?.type || '').trim().toUpperCase();
    const reason = String(task?.reason || '').trim();
    if (type === SUPPORT_ASSISTANT_TASK_FETCH_SPECS) {
        return {
            task,
            title: 'Assistant Request',
            message: 'The assistant wants to fetch your PC specs before continuing.',
            actionLabel: 'Approve'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_RUN_GAME) {
        return {
            task,
            title: 'Launch Game',
            message: reason || 'The assistant wants to launch a game from your library.',
            actionLabel: 'Launch'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_RUN_EMULATOR) {
        return {
            task,
            title: 'Launch Emulator',
            message: reason || 'The assistant wants to launch an emulator.',
            actionLabel: 'Launch'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR) {
        return {
            task,
            title: 'Download Emulator',
            message: reason || 'The assistant wants to download and install an emulator.',
            actionLabel: 'Download'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_READ_LIBRARY) {
        const query = normalizeSupportLibraryTaskQuery(task);
        return {
            task,
            title: 'Read Library',
            message: reason || `The assistant wants to query and inspect your current local library context${query ? ` for "${query}"` : ''}.`,
            actionLabel: 'Allow'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY) {
        return {
            task,
            title: 'Refresh Library',
            message: reason || 'The assistant wants to refresh your local library context.',
            actionLabel: 'Refresh'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_ADD_TAGS) {
        return {
            task,
            title: 'Add Tags',
            message: reason || 'The assistant wants to apply tags to a game.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_REMOVE_TAGS) {
        return {
            task,
            title: 'Remove Tags',
            message: reason || 'The assistant wants to remove tags from a game.',
            actionLabel: 'Remove'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_LIST_TAGS) {
        return {
            task,
            title: 'List Tags',
            message: reason || 'The assistant wants to inspect your available tags.',
            actionLabel: 'List'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS) {
        return {
            task,
            title: 'List Help Docs',
            message: reason || 'The assistant wants to search your local help docs.',
            actionLabel: 'Search'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_READ_HELP_DOC) {
        return {
            task,
            title: 'Read Help Doc',
            message: reason || 'The assistant wants to open a local help doc.',
            actionLabel: 'Open'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS) {
        return {
            task,
            title: 'List Self-Task Docs',
            message: reason || 'The assistant wants to inspect the available detailed self-task docs.',
            actionLabel: 'List'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC) {
        return {
            task,
            title: 'Read Self-Task Docs',
            message: reason || 'The assistant wants to read detailed local self-task docs before continuing.',
            actionLabel: 'Read'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_RELEASE_DATE) {
        return {
            task,
            title: 'Platform Release Date',
            message: reason || 'The assistant wants to read the platform release date from local platform config first.',
            actionLabel: 'Lookup'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE) {
        return {
            task,
            title: 'Game Release Date',
            message: reason || 'The assistant wants to resolve a game release date using local game data first.',
            actionLabel: 'Lookup'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER) {
        return {
            task,
            title: 'Add Game Cover',
            message: reason || 'The assistant wants to apply a cover image to a game.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW) {
        return {
            task,
            title: 'Open YouTube',
            message: reason || 'The assistant wants to open a YouTube preview for a game.',
            actionLabel: 'Open'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL) {
        return {
            task,
            title: 'Open Link',
            message: reason || 'The assistant wants to open an external URL.',
            actionLabel: 'Open'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL) {
        return {
            task,
            title: 'Open Panel',
            message: reason || 'The assistant wants to open a local app panel.',
            actionLabel: 'Open'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE) {
        return {
            task,
            title: 'Change Mode',
            message: reason || 'The assistant wants to switch the current support mode.',
            actionLabel: 'Switch'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM) {
        return {
            task,
            title: 'Set Platform',
            message: reason || 'The assistant wants to update the support platform field.',
            actionLabel: 'Set'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR) {
        return {
            task,
            title: 'Set Emulator',
            message: reason || 'The assistant wants to update the support emulator field.',
            actionLabel: 'Set'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE) {
        return {
            task,
            title: 'Set Issue Type',
            message: reason || 'The assistant wants to change the current issue type.',
            actionLabel: 'Set'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY) {
        return {
            task,
            title: 'Set Summary',
            message: reason || 'The assistant wants to update the support summary/message.',
            actionLabel: 'Set'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_APPEND_DETAILS) {
        return {
            task,
            title: 'Append Details',
            message: reason || 'The assistant wants to append more details to the support context.',
            actionLabel: 'Append'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD) {
        return {
            task,
            title: 'Clear Field',
            message: reason || 'The assistant wants to clear one or more support fields.',
            actionLabel: 'Clear'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION) {
        return {
            task,
            title: 'Clear Session',
            message: reason || 'The assistant wants to clear the current support session.',
            actionLabel: 'Clear'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS) {
        return {
            task,
            title: 'Toggle Auto Specs',
            message: reason || 'The assistant wants to change the auto specs setting.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS) {
        return {
            task,
            title: 'Toggle Web Access',
            message: reason || 'The assistant wants to change the web access setting.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT) {
        return {
            task,
            title: 'Toggle Debug Context',
            message: reason || 'The assistant wants to change the debug-context setting.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_THEME) {
        return {
            task,
            title: 'Change Theme',
            message: reason || 'The assistant wants to change the app theme.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE) {
        return {
            task,
            title: 'Change Language',
            message: reason || 'The assistant wants to change the app language.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS) {
        return {
            task,
            title: 'Download Covers',
            message: reason || 'The assistant wants to download cover art for your library.',
            actionLabel: 'Download'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION) {
        return {
            task,
            title: 'Change Library Section',
            message: reason || 'The assistant wants to switch the library section.',
            actionLabel: 'Switch'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW) {
        return {
            task,
            title: 'Change Library View',
            message: reason || 'The assistant wants to change the library view mode.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH) {
        return {
            task,
            title: 'Search Library',
            message: reason || 'The assistant wants to update the library search query.',
            actionLabel: 'Search'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER) {
        return {
            task,
            title: 'Filter Library Platform',
            message: reason || 'The assistant wants to change the library platform filter.',
            actionLabel: 'Filter'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT) {
        return {
            task,
            title: 'Sort Library',
            message: reason || 'The assistant wants to change the library sort order.',
            actionLabel: 'Sort'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE) {
        return {
            task,
            title: 'Filter Emulator Type',
            message: reason || 'The assistant wants to change the emulator type filter.',
            actionLabel: 'Filter'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS) {
        return {
            task,
            title: 'Clear Library Filters',
            message: reason || 'The assistant wants to clear the library filters.',
            actionLabel: 'Clear'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS) {
        return {
            task,
            title: 'Open Game Details',
            message: reason || 'The assistant wants to open a game details view.',
            actionLabel: 'Open'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS) {
        return {
            task,
            title: 'Open Emulator Details',
            message: reason || 'The assistant wants to open an emulator details view.',
            actionLabel: 'Open'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE) {
        return {
            task,
            title: 'Change Emulator Website',
            message: reason || 'The assistant wants to update an emulator website override.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS) {
        return {
            task,
            title: 'Change Emulator Launch Args',
            message: reason || 'The assistant wants to update emulator launch arguments.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY) {
        return {
            task,
            title: 'Change Emulator Working Directory',
            message: reason || 'The assistant wants to update the emulator working directory.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH) {
        return {
            task,
            title: 'Change Emulator Config Path',
            message: reason || 'The assistant wants to update the emulator config file path.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE) {
        return {
            task,
            title: 'Change Emulator Pre-Launch Commands',
            message: reason || 'The assistant wants to update emulator pre-launch commands.',
            actionLabel: 'Apply'
        };
    }
    if (type === SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS) {
        return {
            task,
            title: 'Clear Emulator Override Fields',
            message: reason || 'The assistant wants to clear one or more emulator override fields.',
            actionLabel: 'Clear'
        };
    }
    return {
        task,
        title: 'Assistant Request',
        message: reason || `The assistant wants to run ${type || 'a task'}.`,
        actionLabel: 'Run'
    };
}

function buildSupportDownloadPayload(emulatorRow = {}) {
    return {
        name: String(emulatorRow?.name || '').trim(),
        platform: String(emulatorRow?.platform || '').trim(),
        platformShortName: String(emulatorRow?.platformShortName || '').trim(),
        website: String(emulatorRow?.website || '').trim(),
        downloadUrl: String(emulatorRow?.downloadUrl || '').trim(),
        downloadLinks: emulatorRow?.downloadLinks || null,
        searchString: String(emulatorRow?.searchString || '').trim(),
        archiveFileMatchWin: String(emulatorRow?.archiveFileMatchWin || '').trim(),
        archiveFileMatchLinux: String(emulatorRow?.archiveFileMatchLinux || '').trim(),
        archiveFileMatchMac: String(emulatorRow?.archiveFileMatchMac || '').trim(),
        setupFileMatchWin: String(emulatorRow?.setupFileMatchWin || '').trim(),
        setupFileMatchLinux: String(emulatorRow?.setupFileMatchLinux || '').trim(),
        setupFileMatchMac: String(emulatorRow?.setupFileMatchMac || '').trim(),
        executableFileMatchWin: String(emulatorRow?.executableFileMatchWin || '').trim(),
        executableFileMatchLinux: String(emulatorRow?.executableFileMatchLinux || '').trim(),
        executableFileMatchMac: String(emulatorRow?.executableFileMatchMac || '').trim(),
        installers: emulatorRow?.installers || null,
        startParameters: String(emulatorRow?.startParameters || emulatorRow?.args || '').trim(),
        type: String(emulatorRow?.type || 'standalone').trim() || 'standalone'
    };
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
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return null;

    const directTask = normalizeSupportTaskType(
        rawValue.task
        || rawValue.type
        || rawValue.action
        || rawValue.command
        || rawValue.name
        || ''
    );
    if (directTask && isExecutableSupportTaskType(directTask)) {
        return {
            type: directTask,
            confidence: normalizeSupportTaskConfidence(rawValue.confidence ?? rawValue.score ?? rawValue.probability),
            reason: String(rawValue.reason || rawValue.why || rawValue.message || '').trim(),
            args: rawValue.args && typeof rawValue.args === 'object' && !Array.isArray(rawValue.args)
                ? rawValue.args
                : (rawValue.payload && typeof rawValue.payload === 'object' && !Array.isArray(rawValue.payload) ? rawValue.payload : {})
        };
    }

    if (rawValue.task && typeof rawValue.task === 'object' && !Array.isArray(rawValue.task)) {
        return extractSupportAssistantTaskObject(rawValue.task);
    }

    return null;
}

function extractSupportAssistantEnvelopeObject(rawValue) {
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return null;

    const envelopeType = String(rawValue.type || rawValue.kind || '').trim().toLowerCase();
    if (envelopeType === SUPPORT_RESPONSE_TYPE_REPLY) {
        const followUpTask = extractSupportAssistantTaskObject(rawValue.followUpTask && typeof rawValue.followUpTask === 'object'
            ? rawValue.followUpTask
            : (rawValue.nextAction && typeof rawValue.nextAction === 'object' ? rawValue.nextAction : null));
        return {
            kind: SUPPORT_RESPONSE_TYPE_REPLY,
            message: String(rawValue.message || rawValue.reply || rawValue.answer || '').trim(),
            task: followUpTask && Number(followUpTask.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE ? followUpTask : null
        };
    }

    if (envelopeType === SUPPORT_RESPONSE_TYPE_TASK) {
        const task = extractSupportAssistantTaskObject({
            ...rawValue,
            ...((rawValue.task && typeof rawValue.task === 'object' && !Array.isArray(rawValue.task)) ? rawValue.task : {})
        });
        if (!task || Number(task.confidence || 0) < SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE) return null;
        return {
            kind: SUPPORT_RESPONSE_TYPE_TASK,
            task,
            message: String(rawValue.message || '').trim()
        };
    }

    if (envelopeType === SUPPORT_RESPONSE_TYPE_BLOCKED) {
        const nextAction = rawValue.nextAction && typeof rawValue.nextAction === 'object' && !Array.isArray(rawValue.nextAction)
            ? rawValue.nextAction
            : {};
        const task = extractSupportAssistantTaskObject({
            ...nextAction,
            task: nextAction.task || nextAction.name || nextAction.command || rawValue.task || ''
        });
        return {
            kind: SUPPORT_RESPONSE_TYPE_BLOCKED,
            message: String(rawValue.message || rawValue.reason || rawValue.answer || '').trim(),
            reason: String(rawValue.reason || '').trim(),
            task: task && Number(task.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE ? task : null
        };
    }

    const task = extractSupportAssistantTaskObject(rawValue);
    if (task && Number(task.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE) {
        return {
            kind: SUPPORT_RESPONSE_TYPE_TASK,
            task,
            message: ''
        };
    }

    return null;
}

function shouldAutoExecuteSupportTask(task = null, allowAutoSpecs = false) {
    const type = normalizeSupportTaskType(task?.type || task?.task || '');
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

function parseSupportAssistantEnvelope(answerText) {
    const normalized = String(answerText || '').trim();
    if (!normalized) return null;

    const stripped = normalized
        .replace(/^```[a-z0-9_-]*\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    if (!stripped) return null;

    const candidates = [];
    if ((stripped.startsWith('{') && stripped.endsWith('}')) || (stripped.startsWith('[') && stripped.endsWith(']'))) {
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
            if (envelope) return envelope;
        } catch (_error) {}
    }

    return null;
}

function parseSupportAssistantTask(answerText) {
    const normalized = String(answerText || '').trim();
    if (!normalized) return null;

    const stripped = normalized
        .replace(/^```[a-z0-9_-]*\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    if (!stripped) return null;

    const candidates = [];
    if ((stripped.startsWith('{') && stripped.endsWith('}')) || (stripped.startsWith('[') && stripped.endsWith(']'))) {
        candidates.push(stripped);
    }
    const objectMatch = stripped.match(/\{[\s\S]*\}/);
    if (objectMatch && objectMatch[0] !== stripped) {
        candidates.push(objectMatch[0]);
    }

    for (const candidate of candidates) {
        try {
            const parsed = JSON.parse(candidate);
            const task = extractSupportAssistantTaskObject(parsed);
            if (task && Number(task.confidence || 0) >= SUPPORT_ASSISTANT_TASK_MIN_CONFIDENCE) return task;
        } catch (_error) {}
    }

    return null;
}

function formatSupportSystemSpecsText(result) {
    const directText = String(result?.specs?.text || result?.text || '').trim();
    if (directText) return directText;

    const specs = result?.specs && typeof result.specs === 'object' ? result.specs : {};
    const lines = [
        specs.platform ? `Platform: ${String(specs.platform).trim()}` : '',
        specs.arch ? `Architecture: ${String(specs.arch).trim()}` : '',
        Number.isFinite(Number(specs.cpuCores)) ? `CPU Cores: ${Number(specs.cpuCores)}` : ''
    ].filter(Boolean);
    return lines.join('\n').trim();
}

function upsertPcSpecsBlock(details, specsText) {
    const base = String(details || '')
        .replace(/\r\n?/g, '\n')
        .replace(/\n*\[PC Specs\][\s\S]*$/i, '')
        .trim();
    const block = `${PC_SPECS_BLOCK_HEADER}\n${String(specsText || '').trim()}`.trim();
    if (!block || block === PC_SPECS_BLOCK_HEADER) {
        return base;
    }
    return `${base}\n\n${block}`.trim();
}

function summarizeSpecsForChat(specsText, maxLines = 10) {
    const lines = String(specsText || '')
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    if (!lines.length) return '';
    const clipped = lines.slice(0, Math.max(1, Number(maxLines || 10)));
    const suffix = lines.length > clipped.length ? '\n...' : '';
    return `${clipped.join('\n')}${suffix}`;
}

function loadSupportChatHistory(contextWindowMessages = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
    try {
        const raw = localStorage.getItem(SUPPORT_CHAT_HISTORY_STORAGE_KEY);
        if (!raw) return [];
        return normalizeSupportChatHistory(JSON.parse(raw), contextWindowMessages);
    } catch (_error) {
        return [];
    }
}

function saveSupportChatHistory(history, contextWindowMessages = SUPPORT_CONTEXT_WINDOW_DEFAULT) {
    try {
        localStorage.setItem(
            SUPPORT_CHAT_HISTORY_STORAGE_KEY,
            JSON.stringify(normalizeSupportChatHistory(history, contextWindowMessages))
        );
    } catch (_error) {}
}

function loadSupportDebugEnabled() {
    try {
        return localStorage.getItem(SUPPORT_DEBUG_STORAGE_KEY) === 'true';
    } catch (_error) {
        return false;
    }
}

function saveSupportDebugEnabled(enabled) {
    try {
        localStorage.setItem(SUPPORT_DEBUG_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch (_error) {}
}

function loadSupportAutoSpecsEnabled() {
    try {
        return localStorage.getItem(SUPPORT_AUTO_SPECS_STORAGE_KEY) === 'true';
    } catch (_error) {
        return false;
    }
}

function saveSupportAutoSpecsEnabled(enabled) {
    try {
        localStorage.setItem(SUPPORT_AUTO_SPECS_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch (_error) {}
}

function loadSupportWebAccessEnabled() {
    try {
        return localStorage.getItem(SUPPORT_WEB_ACCESS_STORAGE_KEY) === 'true';
    } catch (_error) {
        return false;
    }
}

function saveSupportWebAccessEnabled(enabled) {
    try {
        localStorage.setItem(SUPPORT_WEB_ACCESS_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch (_error) {}
}

function loadSupportHelpState() {
    try {
        const raw = localStorage.getItem(SUPPORT_HELP_STATE_STORAGE_KEY);
        if (!raw) return normalizeSupportHelpState({});
        return normalizeSupportHelpState(JSON.parse(raw));
    } catch (_error) {
        return normalizeSupportHelpState({});
    }
}

function saveSupportHelpState(state) {
    try {
        localStorage.setItem(SUPPORT_HELP_STATE_STORAGE_KEY, JSON.stringify(normalizeSupportHelpState(state)));
    } catch (_error) {}
}

function loadSupportDraft() {
    try {
        const raw = localStorage.getItem(SUPPORT_DRAFT_STORAGE_KEY);
        if (!raw) return normalizeSupportDraft({});
        return normalizeSupportDraft(JSON.parse(raw));
    } catch (_error) {
        return normalizeSupportDraft({});
    }
}

function saveSupportDraft(draft) {
    try {
        localStorage.setItem(SUPPORT_DRAFT_STORAGE_KEY, JSON.stringify(normalizeSupportDraft(draft)));
    } catch (_error) {}
}

function buildSupportPayload(formState, extra = {}) {
    const settings = loadSuggestionSettings();
    const provider = normalizeSuggestionProvider(settings.provider);
    const model = String(settings.models?.[provider] || '').trim();
    const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
    const apiKey = String(settings.apiKeys?.[provider] || '').trim();
    const routing = getSuggestionLlmRoutingSettings(settings);

    return {
        provider,
        model,
        baseUrl,
        apiKey,
        ...routing,
        supportTaskProtocol: SUPPORT_TASK_PROTOCOL,
        issueType: String(formState.issueType || 'other'),
        issueTypeLabel: getIssueTypeLabel(formState.issueType),
        issueSummary: String(formState.issueSummary || '').trim(),
        platform: String(formState.platform || '').trim(),
        emulator: String(formState.emulator || '').trim(),
        errorText: String(formState.errorText || '').trim(),
        details: String(formState.details || '').trim(),
        supportMode: String(formState.mode || 'troubleshoot').trim().toLowerCase() === 'chat' ? 'chat' : 'troubleshoot',
        chatHistory: Array.isArray(extra?.chatHistory) ? extra.chatHistory : [],
        debugSupport: !!extra?.debugSupport,
        allowAutoSpecsFetch: !!extra?.allowAutoSpecsFetch,
        allowWebAccess: !!extra?.allowWebAccess,
        libraryMatches: extra?.libraryMatches && typeof extra.libraryMatches === 'object'
            ? extra.libraryMatches
            : undefined
    };
}

function renderSupportInlineMarkdown(text) {
    let html = escapeHtml(text);
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/gi, (_m, label, url) => {
        const safeLabel = String(label || '');
        const safeUrl = String(url || '');
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
    });
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return html;
}

function renderSupportMarkdown(markdownText) {
    const source = String(markdownText || '').replace(/\r\n?/g, '\n');
    const lines = source.split('\n');
    const out = [];
    let inCodeBlock = false;
    let codeBuffer = [];
    let paragraphBuffer = [];
    let listType = null;
    let listItems = [];

    const flushParagraph = () => {
        if (!paragraphBuffer.length) return;
        const paragraph = paragraphBuffer.join(' ').trim();
        if (paragraph) out.push(`<p>${renderSupportInlineMarkdown(paragraph)}</p>`);
        paragraphBuffer = [];
    };
    const flushList = () => {
        if (!listType || !listItems.length) {
            listType = null;
            listItems = [];
            return;
        }
        out.push(`<${listType}>${listItems.map((item) => `<li>${renderSupportInlineMarkdown(item)}</li>`).join('')}</${listType}>`);
        listType = null;
        listItems = [];
    };

    lines.forEach((rawLine) => {
        const line = String(rawLine || '');
        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            flushParagraph();
            flushList();
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeBuffer = [];
            } else {
                const codeText = codeBuffer.join('\n');
                out.push(`<pre><code>${escapeHtml(codeText)}</code></pre>`);
                inCodeBlock = false;
                codeBuffer = [];
            }
            return;
        }

        if (inCodeBlock) {
            codeBuffer.push(line);
            return;
        }

        if (!trimmed) {
            flushParagraph();
            flushList();
            return;
        }

        const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            flushParagraph();
            flushList();
            const level = Math.max(1, Math.min(6, headingMatch[1].length));
            out.push(`<h${level}>${renderSupportInlineMarkdown(headingMatch[2])}</h${level}>`);
            return;
        }

        const ulMatch = line.match(/^\s*[-*+]\s+(.+)$/);
        if (ulMatch) {
            flushParagraph();
            if (listType && listType !== 'ul') flushList();
            listType = 'ul';
            listItems.push(ulMatch[1].trim());
            return;
        }

        const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
        if (olMatch) {
            flushParagraph();
            if (listType && listType !== 'ol') flushList();
            listType = 'ol';
            listItems.push(olMatch[1].trim());
            return;
        }

        flushList();
        paragraphBuffer.push(trimmed);
    });

    if (inCodeBlock && codeBuffer.length) {
        out.push(`<pre><code>${escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
    }
    flushParagraph();
    flushList();

    return out.join('');
}

function renderSupportMessageAttachmentsHtml(attachments = []) {
    const rows = normalizeSupportMessageAttachments(attachments);
    if (!rows.length) return '';
    return `
        <div class="support-chat-attachments">
            ${rows.map((attachment, index) => `
                <article
                    class="support-chat-attachment-card support-chat-attachment-card-${escapeHtml(String(attachment.kind || 'attachment'))}"
                    data-support-attachment-open="1"
                    data-support-attachment-index="${index}"
                    tabindex="0"
                    role="button"
                >
                    <div class="support-chat-attachment-image">
                        <img src="${escapeHtml(String(attachment.thumbnailUrl || attachment.imageUrl || ''))}" alt="${escapeHtml(String(attachment.title || attachment.subtitle || 'Support attachment'))}" loading="lazy" />
                    </div>
                    <div class="support-chat-attachment-copy">
                        <strong>${escapeHtml(String(attachment.title || t('support.coverAttachmentTitle', 'Cover')))}</strong>
                        ${attachment.subtitle ? `<small>${escapeHtml(String(attachment.subtitle))}</small>` : ''}
                        ${attachment.source ? `<span class="support-chat-attachment-source">${escapeHtml(String(attachment.source))}</span>` : ''}
                    </div>
                </article>
            `).join('')}
        </div>
    `;
}

function renderSupportChatTranscript(history = [], pendingAssistantText = '') {
    const rows = Array.isArray(history) ? history : [];
    const pendingText = String(pendingAssistantText || '').trim();
    const renderRows = pendingText
        ? [...rows, { role: 'assistant', text: pendingText, pending: true }]
        : rows;
    if (!renderRows.length) {
        return `<div class="support-chat-empty">${escapeHtml(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'))}</div>`;
    }
    return renderRows.map((entry, entryIndex) => {
        const role = String(entry?.role || '').trim().toLowerCase() === 'assistant' ? 'assistant' : 'user';
        const text = String(entry?.text || '').trim();
        const attachmentsHtml = renderSupportMessageAttachmentsHtml(entry?.attachments);
        const roleLabel = role === 'assistant'
            ? t('support.roleAssistant', 'Assistant')
            : t('support.roleUser', 'You');
        const body = role === 'assistant'
            ? renderSupportMarkdown(text)
            : `<p>${escapeHtml(text)}</p>`;
        return `
            <article class="support-chat-item support-chat-item-${role}${entry?.pending ? ' is-pending' : ''}" data-support-entry-index="${entryIndex}">
                <header>${escapeHtml(roleLabel)}</header>
                <div class="support-chat-body support-output-markdown">${body}</div>
                ${attachmentsHtml}
            </article>
        `;
    }).join('');
}

export function teardownSupportView() {
    if (typeof activeSupportViewDisposer === 'function') {
        try {
            activeSupportViewDisposer();
        } catch (_error) {}
    }
    activeSupportViewDisposer = null;
}

export function showSupportView() {
    teardownSupportView();
    const gamesContainer = document.getElementById('games-container');
    const gamesHeader = document.getElementById('games-header');
    if (!gamesContainer) return;

    if (gamesHeader) gamesHeader.textContent = t('support.title', 'Support');

    const draft = loadSupportDraft();
    const readContextWindowMessages = () => {
        const settings = loadSuggestionSettings();
        return normalizeSupportContextWindowMessages(settings?.contextWindowMessages, SUPPORT_CONTEXT_WINDOW_DEFAULT);
    };
    let contextWindowMessages = readContextWindowMessages();
    let chatHistory = loadSupportChatHistory(contextWindowMessages);
    const helpState = loadSupportHelpState();
    let currentMode = (() => {
        const value = String(draft.mode || 'troubleshoot').trim().toLowerCase();
        return (value === 'chat' || value === 'help') ? value : 'troubleshoot';
    })();
    let debugSupportEnabled = loadSupportDebugEnabled();
    let autoSpecsEnabled = loadSupportAutoSpecsEnabled();
    let webAccessEnabled = loadSupportWebAccessEnabled();
    let helpDocsLoaded = false;
    let currentHelpDocId = String(helpState.selectedDocId || '').trim();

    gamesContainer.className = 'games-container support-view';
    gamesContainer.innerHTML = `
        <div class="support-mode-tabs" role="tablist" aria-label="${escapeHtml(t('support.modeLabel', 'Mode'))}">
            <button type="button" class="action-btn small support-mode-tab" data-support-mode="troubleshoot" role="tab" aria-selected="false" tabindex="-1">${escapeHtml(t('support.modeTroubleshoot', 'Troubleshoot'))}</button>
            <button type="button" class="action-btn small support-mode-tab" data-support-mode="chat" role="tab" aria-selected="false" tabindex="-1">${escapeHtml(t('support.modeChat', 'General Chat'))}</button>
            <button type="button" class="action-btn small support-mode-tab" data-support-mode="help" role="tab" aria-selected="false" tabindex="-1">${escapeHtml(t('support.modeHelp', 'Help Docs'))}</button>
        </div>
        <section class="support-view-shell">
            <article class="support-form-card">
                <div class="support-mode-switch">
                    <div class="support-mode-tabs-row">
                        <span class="support-mode-label">${escapeHtml(t('support.modeLabel', 'Mode'))}</span>
                    </div>
                    <div class="support-mode-toggles">
                        <label class="support-debug-toggle">
                            <input type="checkbox" data-support-auto-specs-toggle ${autoSpecsEnabled ? 'checked' : ''} />
                            <span>${escapeHtml(t('support.autoSpecsToggle', 'Allow auto specs fetch'))}</span>
                        </label>
                        <label class="support-debug-toggle">
                            <input type="checkbox" data-support-web-access-toggle ${webAccessEnabled ? 'checked' : ''} />
                            <span>${escapeHtml(t('support.webAccessToggle', 'Allow web access'))}</span>
                        </label>
                        <label class="support-debug-toggle">
                            <input type="checkbox" data-support-debug-toggle ${debugSupportEnabled ? 'checked' : ''} />
                            <span>${escapeHtml(t('support.debugContext', 'Debug Context'))}</span>
                        </label>
                    </div>
                </div>
                <div class="support-form-grid" data-support-llm-only data-support-troubleshoot-only>
                    <label class="support-field" data-support-troubleshoot-only>
                        <span>${escapeHtml(t('support.issueTypeLabel', 'Issue Type'))}</span>
                        <select data-support-input="issue-type">
                            ${ISSUE_TYPES.map((issue) => `<option value="${escapeHtml(issue.value)}"${issue.value === draft.issueType ? ' selected' : ''}>${escapeHtml(t(issue.labelKey, issue.fallback))}</option>`).join('')}
                        </select>
                    </label>

                    <label class="support-field">
                        <span>${escapeHtml(t('support.platformOptionalLabel', 'Platform (optional)'))}</span>
                        <input type="text" data-support-input="platform" value="${escapeHtml(draft.platform)}" placeholder="${escapeHtml(t('support.platformPlaceholder', 'e.g. PS1, SNES, N64'))}" />
                    </label>

                    <label class="support-field">
                        <span>${escapeHtml(t('support.emulatorOptionalLabel', 'Emulator (optional)'))}</span>
                        <input type="text" data-support-input="emulator" value="${escapeHtml(draft.emulator)}" placeholder="${escapeHtml(t('support.emulatorPlaceholder', 'e.g. DuckStation, RetroArch, PCSX2'))}" />
                    </label>
                </div>

                <label class="support-field" data-support-llm-only data-support-troubleshoot-only>
                    <span data-support-summary-label>${escapeHtml(t('support.issueSummaryLabel', 'Short problem summary'))}</span>
                    <input type="text" data-support-input="issue-summary" value="${escapeHtml(draft.issueSummary)}" placeholder="${escapeHtml(t('support.issueSummaryPlaceholder', 'e.g. Game boots to black screen after intro'))}" />
                </label>

                <label class="support-field" data-support-llm-only data-support-troubleshoot-only>
                    <span>${escapeHtml(t('support.errorTextOptionalLabel', 'Error message (optional)'))}</span>
                    <input type="text" data-support-input="error-text" value="${escapeHtml(draft.errorText)}" placeholder="${escapeHtml(t('support.errorTextPlaceholder', 'Paste exact error text if you have one'))}" />
                </label>

                <label class="support-field" data-support-llm-only data-support-troubleshoot-only>
                    <span>${escapeHtml(t('support.detailsLabel', 'Details'))}</span>
                    <textarea rows="7" data-support-input="details" placeholder="${escapeHtml(t('support.detailsPlaceholder', 'What did you try already? What changed recently? Any hardware/driver info?'))}">${escapeHtml(draft.details)}</textarea>
                </label>

                <div class="support-help-controls" data-support-help-only>
                    <label class="support-field">
                        <span>${escapeHtml(t('support.helpSearchLabel', 'Search Help Docs'))}</span>
                        <input
                            type="text"
                            data-support-input="help-query"
                            value="${escapeHtml(helpState.query)}"
                            placeholder="${escapeHtml(t('support.helpSearchPlaceholder', 'Search docs (theme, launchers, covers, import, updates...)'))}"
                        />
                    </label>
                    <div class="support-actions">
                        <button type="button" class="action-btn small" data-support-action="search-help">${escapeHtml(t('support.helpSearchAction', 'Search Docs'))}</button>
                        <button type="button" class="action-btn small" data-support-action="reload-help">${escapeHtml(t('support.helpReloadAction', 'Reload'))}</button>
                    </div>
                    <div class="support-help-list" data-support-help-list></div>
                </div>

                <div class="support-actions">
                    <button type="button" class="action-btn small" data-support-action="insert-specs" data-support-llm-only data-support-troubleshoot-only>${escapeHtml(t('support.insertPcSpecs', 'Insert PC Specs'))}</button>
                    <button type="button" class="action-btn small" data-support-action="voice-input" data-support-llm-only data-support-troubleshoot-only>${escapeHtml(t('support.voiceInput', 'Voice Input'))}</button>
                    <button type="button" class="action-btn launch-btn" data-support-action="run" data-support-llm-only data-support-troubleshoot-only>${escapeHtml(t('support.getHelp', 'Get Help'))}</button>
                    <button type="button" class="action-btn small" data-support-action="clear">${escapeHtml(t('support.clear', 'Clear'))}</button>
                </div>
                <p class="support-status" data-support-status aria-live="polite"></p>
            </article>

            <article class="support-output-card">
                <h3 data-support-output-title>${escapeHtml(t('support.suggestedFixSteps', 'Suggested Fix Steps'))}</h3>
                <div class="support-output-pre support-output-markdown" data-support-output>${renderSupportMarkdown(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'))}</div>
                <div class="support-chat-thread" data-support-chat-thread></div>
                <section class="support-task-approval" data-support-task-approval hidden>
                    <div class="support-task-approval-copy">
                        <strong data-support-task-title>${escapeHtml(t('support.taskApprovalTitle', 'Assistant Request'))}</strong>
                        <p data-support-task-message>${escapeHtml(t('support.taskApprovalSpecs', 'The assistant wants to fetch your PC specs before continuing.'))}</p>
                    </div>
                    <div class="support-task-approval-actions">
                        <button type="button" class="action-btn small" data-support-action="approve-task">${escapeHtml(t('support.approveTask', 'Approve'))}</button>
                        <button type="button" class="action-btn small" data-support-action="dismiss-task">${escapeHtml(t('support.dismissTaskRequest', 'Not now'))}</button>
                    </div>
                </section>
                <footer class="support-chat-composer" data-support-chat-composer>
                    <div class="support-chat-composer-row">
                        <textarea
                            class="support-chat-input"
                            data-support-chat-input
                            rows="3"
                            placeholder="${escapeHtml(t('support.chatMessagePlaceholder', 'Ask anything about emuBro features, settings, tools, launchers, or emulator setup...'))}"
                        >${escapeHtml(draft.issueSummary)}</textarea>
                        <button type="button" class="action-btn launch-btn" data-support-action="chat-send">${escapeHtml(t('support.send', 'Send'))}</button>
                    </div>
                    <div class="support-chat-composer-meta">
                        <p class="support-chat-composer-hint">${escapeHtml(t('support.enterToSendHint', 'Enter to send. Shift+Enter for newline.'))}</p>
                        <span class="support-chat-context-badge" data-support-context-badge>${escapeHtml(t('support.contextWindowBadge', 'Context window: {{count}} msgs', { count: contextWindowMessages }))}</span>
                    </div>
                </footer>
                <div class="support-lightbox" data-support-lightbox hidden>
                    <button type="button" class="action-btn small support-lightbox-close" data-support-lightbox-close>${escapeHtml(t('buttons.close', 'Close'))}</button>
                    <div class="support-lightbox-card">
                        <img class="support-lightbox-image" data-support-lightbox-image alt="${escapeHtml(t('support.coverAttachmentTitle', 'Cover'))}" />
                        <div class="support-lightbox-copy">
                            <strong data-support-lightbox-title></strong>
                            <small data-support-lightbox-subtitle></small>
                        </div>
                    </div>
                </div>
                <details class="support-debug-panel" data-support-debug-panel>
                    <summary>${escapeHtml(t('support.debugDetails', 'Planner / Retrieval Details'))}</summary>
                    <div data-support-debug-content>${renderSupportDebugPayloadHtml(null)}</div>
                </details>
            </article>
        </section>
    `;

    const issueTypeSelect = gamesContainer.querySelector('[data-support-input="issue-type"]');
    const issueSummaryInput = gamesContainer.querySelector('[data-support-input="issue-summary"]');
    const platformInput = gamesContainer.querySelector('[data-support-input="platform"]');
    const emulatorInput = gamesContainer.querySelector('[data-support-input="emulator"]');
    const errorTextInput = gamesContainer.querySelector('[data-support-input="error-text"]');
    const detailsInput = gamesContainer.querySelector('[data-support-input="details"]');
    const statusEl = gamesContainer.querySelector('[data-support-status]');
    const outputEl = gamesContainer.querySelector('[data-support-output]');
    const chatThreadEl = gamesContainer.querySelector('[data-support-chat-thread]');
    const taskApprovalEl = gamesContainer.querySelector('[data-support-task-approval]');
    const taskApprovalTitleEl = gamesContainer.querySelector('[data-support-task-title]');
    const taskApprovalMessageEl = gamesContainer.querySelector('[data-support-task-message]');
    const outputTitleEl = gamesContainer.querySelector('[data-support-output-title]');
    const summaryLabelEl = gamesContainer.querySelector('[data-support-summary-label]');
    const chatComposerEl = gamesContainer.querySelector('[data-support-chat-composer]');
    const chatInputEl = gamesContainer.querySelector('[data-support-chat-input]');
    const contextWindowBadgeEl = gamesContainer.querySelector('[data-support-context-badge]');
    const lightboxEl = gamesContainer.querySelector('[data-support-lightbox]');
    const lightboxImageEl = gamesContainer.querySelector('[data-support-lightbox-image]');
    const lightboxTitleEl = gamesContainer.querySelector('[data-support-lightbox-title]');
    const lightboxSubtitleEl = gamesContainer.querySelector('[data-support-lightbox-subtitle]');
    const lightboxCloseBtn = gamesContainer.querySelector('[data-support-lightbox-close]');
    const chatSendBtn = gamesContainer.querySelector('[data-support-action="chat-send"]');
    const approveTaskBtn = gamesContainer.querySelector('[data-support-action="approve-task"]');
    const dismissTaskBtn = gamesContainer.querySelector('[data-support-action="dismiss-task"]');
    const runBtn = gamesContainer.querySelector('[data-support-action="run"]');
    const clearBtn = gamesContainer.querySelector('[data-support-action="clear"]');
    const insertSpecsBtn = gamesContainer.querySelector('[data-support-action="insert-specs"]');
    const voiceInputBtn = gamesContainer.querySelector('[data-support-action="voice-input"]');
    const searchHelpBtn = gamesContainer.querySelector('[data-support-action="search-help"]');
    const reloadHelpBtn = gamesContainer.querySelector('[data-support-action="reload-help"]');
    const modeButtons = Array.from(gamesContainer.querySelectorAll('[data-support-mode]'));
    const autoSpecsToggleInput = gamesContainer.querySelector('[data-support-auto-specs-toggle]');
    const webAccessToggleInput = gamesContainer.querySelector('[data-support-web-access-toggle]');
    const debugToggleInput = gamesContainer.querySelector('[data-support-debug-toggle]');
    const debugPanelEl = gamesContainer.querySelector('[data-support-debug-panel]');
    const debugContentEl = gamesContainer.querySelector('[data-support-debug-content]');
    const helpQueryInput = gamesContainer.querySelector('[data-support-input="help-query"]');
    const helpListEl = gamesContainer.querySelector('[data-support-help-list]');
    const llmOnlyEls = Array.from(gamesContainer.querySelectorAll('[data-support-llm-only]'));
    const helpOnlyEls = Array.from(gamesContainer.querySelectorAll('[data-support-help-only]'));

    if (!issueTypeSelect || !issueSummaryInput || !platformInput || !emulatorInput || !errorTextInput || !detailsInput || !statusEl || !outputEl || !chatThreadEl || !taskApprovalEl || !taskApprovalTitleEl || !taskApprovalMessageEl || !approveTaskBtn || !dismissTaskBtn || !runBtn || !clearBtn || !insertSpecsBtn || !voiceInputBtn || !outputTitleEl || !summaryLabelEl || !chatComposerEl || !chatInputEl || !chatSendBtn || !debugToggleInput || !autoSpecsToggleInput || !webAccessToggleInput || !debugPanelEl || !debugContentEl || !helpQueryInput || !helpListEl || !searchHelpBtn || !reloadHelpBtn || !lightboxEl || !lightboxImageEl || !lightboxTitleEl || !lightboxSubtitleEl || !lightboxCloseBtn) {
        return;
    }

    const renderDebugPayload = (debugPayload = null) => {
        if (!debugContentEl) return;
        debugContentEl.innerHTML = renderSupportDebugPayloadHtml(debugPayload);
    };

    const syncDebugToggleUi = () => {
        debugToggleInput.checked = !!debugSupportEnabled;
        autoSpecsToggleInput.checked = !!autoSpecsEnabled;
        webAccessToggleInput.checked = !!webAccessEnabled;
        if (debugPanelEl) {
            debugPanelEl.style.display = debugSupportEnabled ? '' : 'none';
        }
    };

    const renderContextWindowBadge = () => {
        if (!contextWindowBadgeEl) return;
        contextWindowBadgeEl.textContent = t(
            'support.contextWindowBadge',
            'Context window: {{count}} msgs',
            { count: contextWindowMessages }
        );
    };

    const syncContextWindowMessages = ({ persist = true, rerenderThread = false } = {}) => {
        const nextWindow = readContextWindowMessages();
        if (nextWindow === contextWindowMessages) {
            renderContextWindowBadge();
            return;
        }
        contextWindowMessages = nextWindow;
        chatHistory = normalizeSupportChatHistory(chatHistory, contextWindowMessages);
        if (persist) {
            saveSupportChatHistory(chatHistory, contextWindowMessages);
        }
        if (rerenderThread && currentMode === 'chat') {
            renderChatThread();
        }
        renderContextWindowBadge();
    };

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    let voiceRecognition = null;
    let voiceListening = false;
    let voiceStopRequested = false;
    let runningRequest = false;
    let streamRequestId = '';
    let liveResponseRaw = '';
    let liveResponseText = '';
    let pendingSupportTask = null;
    let pendingTaskBusy = false;
    let activeSupportUserMessage = '';
    let activeAttachmentLightbox = null;
    let activeAttachmentLightboxSrc = '';
    let activeAttachmentLightboxFallbackSrc = '';
    let latestLibrarySnapshot = {
        games: Array.isArray(getGames()) ? getGames() : [],
        emulators: Array.isArray(getEmulators()) ? getEmulators() : []
    };

    const updateVoiceButtonState = () => {
        const unsupported = !SpeechRecognitionCtor;
        voiceInputBtn.disabled = unsupported || currentMode === 'help';
        voiceInputBtn.classList.toggle('is-recording', voiceListening);
        voiceInputBtn.textContent = voiceListening
            ? t('support.voiceStop', 'Stop Voice')
            : t('support.voiceInput', 'Voice Input');
        if (unsupported) {
            voiceInputBtn.title = t('support.status.voiceUnsupported', 'Voice input is not supported in this runtime.');
        } else {
            voiceInputBtn.removeAttribute('title');
        }
    };

    const stopVoiceInput = (silently = false) => {
        if (!voiceRecognition) {
            voiceListening = false;
            updateVoiceButtonState();
            return;
        }
        voiceStopRequested = true;
        try {
            voiceRecognition.stop();
        } catch (_error) {}
        if (!silently) {
            statusEl.textContent = t('support.status.voiceStopped', 'Voice input stopped.');
        }
    };

    const startVoiceInput = async () => {
        if (!SpeechRecognitionCtor) {
            statusEl.textContent = t('support.status.voiceUnsupported', 'Voice input is not supported in this runtime.');
            updateVoiceButtonState();
            return;
        }
        if (voiceListening) return;

        const micAccess = await ensureMicrophoneAccess();
        if (!micAccess.ok) {
            if (micAccess.reason === 'denied' || micAccess.reason === 'security') {
                statusEl.textContent = t('support.status.voiceDenied', 'Microphone permission denied.');
            } else if (micAccess.reason === 'no-device') {
                statusEl.textContent = t('support.status.voiceNoMic', 'No microphone device was found.');
            } else if (micAccess.reason === 'device-busy') {
                statusEl.textContent = t('support.status.voiceMicBusy', 'Microphone is busy in another app.');
            } else {
                statusEl.textContent = t('support.status.voiceFailed', 'Voice input failed.');
            }
            updateVoiceButtonState();
            return;
        }

        const recognition = new SpeechRecognitionCtor();
        voiceRecognition = recognition;
        voiceStopRequested = false;
        voiceListening = true;
        updateVoiceButtonState();

        const baseText = String(issueSummaryInput.value || '').trim();
        let finalTranscript = '';

        recognition.lang = String(navigator?.language || 'en-US').trim() || 'en-US';
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.continuous = false;

        recognition.onstart = () => {
            statusEl.textContent = t('support.status.voiceListening', 'Listening... speak now.');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = Number(event?.resultIndex || 0); i < Number(event?.results?.length || 0); i += 1) {
                const result = event.results[i];
                const transcript = String(result?.[0]?.transcript || '').trim();
                if (!transcript) continue;
                if (result.isFinal) finalTranscript = `${finalTranscript} ${transcript}`.trim();
                else interimTranscript = `${interimTranscript} ${transcript}`.trim();
            }
            const combinedText = [baseText, finalTranscript, interimTranscript]
                .map((value) => String(value || '').trim())
                .filter(Boolean)
                .join(' ')
                .trim();
            issueSummaryInput.value = combinedText;
            persistDraft();
        };

        recognition.onerror = (event) => {
            const code = String(event?.error || '').trim().toLowerCase();
            if (code === 'not-allowed' || code === 'service-not-allowed') {
                statusEl.textContent = t('support.status.voiceDenied', 'Microphone permission denied.');
            } else if (code === 'network') {
                statusEl.textContent = t('support.status.voiceNetwork', 'Voice recognition network request failed. Try again or use manual input.');
            } else if (code === 'no-speech' || code === 'aborted') {
                if (!voiceStopRequested) statusEl.textContent = t('support.status.voiceNoSpeech', 'No speech detected.');
            } else {
                statusEl.textContent = t('support.status.voiceFailed', 'Voice input failed.');
            }
        };

        recognition.onend = () => {
            voiceRecognition = null;
            const hadResult = !!String(finalTranscript || '').trim();
            voiceListening = false;
            updateVoiceButtonState();
            if (voiceStopRequested) {
                voiceStopRequested = false;
                return;
            }
            if (hadResult) {
                statusEl.textContent = t('support.status.voiceCaptured', 'Voice input captured.');
            } else if (!String(statusEl.textContent || '').trim()) {
                statusEl.textContent = t('support.status.voiceNoSpeech', 'No speech detected.');
            }
        };

        try {
            recognition.start();
        } catch (_error) {
            voiceRecognition = null;
            voiceListening = false;
            statusEl.textContent = t('support.status.voiceFailed', 'Voice input failed.');
            updateVoiceButtonState();
        }
    };

    const collectFormState = () => ({
        mode: currentMode,
        issueType: String(issueTypeSelect.value || 'other').trim().toLowerCase(),
        issueSummary: String(issueSummaryInput.value || '').trim(),
        platform: String(platformInput.value || '').trim(),
        emulator: String(emulatorInput.value || '').trim(),
        errorText: String(errorTextInput.value || '').trim(),
        details: String(detailsInput.value || '').trim()
    });

    const resolveSupportIssueSummary = (issueSummary = '', { allowHistoryFallback = false } = {}) => {
        const direct = String(issueSummary || '').trim();
        if (direct) return direct;
        if (!allowHistoryFallback) return '';
        const active = String(activeSupportUserMessage || '').trim();
        if (active) return active;
        if (currentMode !== 'chat') return '';
        for (let index = chatHistory.length - 1; index >= 0; index -= 1) {
            const entry = chatHistory[index];
            if (String(entry?.role || '').trim().toLowerCase() !== 'user') continue;
            const text = String(entry?.text || '').trim();
            if (text) return text;
        }
        return '';
    };

    const persistDraft = () => {
        saveSupportDraft(collectFormState());
    };

    const syncChatInputFromSummary = () => {
        if (String(chatInputEl.value || '') === String(issueSummaryInput.value || '')) return;
        chatInputEl.value = issueSummaryInput.value || '';
    };

    const updateChatComposerState = () => {
        const isChat = currentMode === 'chat';
        const hasMessage = !!String(chatInputEl.value || '').trim();
        chatComposerEl.style.display = isChat ? '' : 'none';
        chatInputEl.disabled = !isChat || runningRequest;
        chatSendBtn.disabled = !isChat || runningRequest || !hasMessage;
        chatSendBtn.textContent = runningRequest
            ? t('suggested.status.running', 'Running...')
            : t('support.send', 'Send');
        renderPendingSupportTask();
    };

    const scrollChatThreadToBottom = (behavior = 'auto') => {
        try {
            chatThreadEl.scrollTo({ top: chatThreadEl.scrollHeight, behavior });
        } catch (_error) {
            chatThreadEl.scrollTop = chatThreadEl.scrollHeight;
        }
    };

    const renderChatThread = () => {
        const livePreview = runningRequest ? String(liveResponseText || '').trim() : '';
        chatThreadEl.innerHTML = renderSupportChatTranscript(chatHistory, livePreview);
        scrollChatThreadToBottom('auto');
    };

    const appendSupportAssistantMessage = (messageText, { attachments = [] } = {}) => {
        const text = String(messageText || '').trim();
        const normalizedAttachments = normalizeSupportMessageAttachments(attachments);
        if (!text && !normalizedAttachments.length) return;
        if (currentMode === 'chat') {
            chatHistory = normalizeSupportChatHistory([
                ...chatHistory,
                { role: 'assistant', text, attachments: normalizedAttachments }
            ], contextWindowMessages);
            saveSupportChatHistory(chatHistory, contextWindowMessages);
            renderChatThread();
            issueSummaryInput.value = '';
            chatInputEl.value = '';
            persistDraft();
            return;
        }
        outputEl.innerHTML = renderSupportMarkdown(text);
    };

    const renderPendingSupportTask = () => {
        if (!taskApprovalEl) return;
        const taskType = String(pendingSupportTask?.task?.type || '').trim();
        const hidden = !taskType || currentMode === 'help';
        taskApprovalEl.hidden = hidden;
        if (hidden) {
            return;
        }
        taskApprovalTitleEl.textContent = String(
            pendingSupportTask?.title
            || t('support.taskApprovalTitle', 'Assistant Request')
        ).trim();
        taskApprovalMessageEl.textContent = String(
            pendingSupportTask?.message
            || t('support.taskApprovalSpecs', 'The assistant wants to fetch your PC specs before continuing.')
        ).trim();
        approveTaskBtn.textContent = String(
            pendingSupportTask?.actionLabel
            || t('support.approveTask', 'Approve')
        ).trim();
        const actionsDisabled = runningRequest || voiceListening || pendingTaskBusy;
        approveTaskBtn.disabled = actionsDisabled;
        dismissTaskBtn.disabled = actionsDisabled;
    };

    const resetLiveResponse = () => {
        streamRequestId = '';
        liveResponseRaw = '';
        liveResponseText = '';
    };

    const closeAttachmentLightbox = () => {
        activeAttachmentLightbox = null;
        activeAttachmentLightboxSrc = '';
        activeAttachmentLightboxFallbackSrc = '';
        lightboxEl.hidden = true;
        lightboxImageEl.removeAttribute('src');
        lightboxTitleEl.textContent = '';
        lightboxSubtitleEl.textContent = '';
    };

    closeAttachmentLightbox();

    const openAttachmentLightbox = (attachment) => {
        const normalized = normalizeSupportMessageAttachments([attachment])[0] || null;
        const imageUrl = String(normalized?.imageUrl || normalized?.thumbnailUrl || '').trim();
        if (!normalized || !imageUrl) return;
        activeAttachmentLightbox = normalized;
        activeAttachmentLightboxSrc = imageUrl;
        activeAttachmentLightboxFallbackSrc = String(normalized?.thumbnailUrl || normalized?.imageUrl || '').trim();
        lightboxImageEl.src = activeAttachmentLightboxSrc;
        lightboxImageEl.alt = String(normalized.title || normalized.subtitle || t('support.coverAttachmentTitle', 'Cover')).trim();
        lightboxTitleEl.textContent = String(normalized.title || t('support.coverAttachmentTitle', 'Cover')).trim();
        lightboxSubtitleEl.textContent = String(normalized.subtitle || '').trim();
        lightboxSubtitleEl.style.display = lightboxSubtitleEl.textContent ? '' : 'none';
        lightboxEl.hidden = false;
    };

    lightboxImageEl.addEventListener('error', () => {
        const fallback = String(activeAttachmentLightboxFallbackSrc || '').trim();
        const current = String(activeAttachmentLightboxSrc || '').trim();
        if (fallback && fallback !== current) {
            activeAttachmentLightboxSrc = fallback;
            lightboxImageEl.src = fallback;
            return;
        }
        closeAttachmentLightbox();
    });

    const consumeSupportStreamEvent = (eventPayload) => {
        const eventName = String(eventPayload?.event || eventPayload?.name || SUPPORT_STREAM_EVENT_NAME).trim();
        if (eventName && eventName !== SUPPORT_STREAM_EVENT_NAME) return;
        const requestId = String(eventPayload?.requestId || '').trim();
        if (!requestId || requestId !== streamRequestId) return;

        const state = String(eventPayload?.state || '').trim().toLowerCase();
        if (state === 'chunk') {
            const chunk = String(eventPayload?.chunk || '');
            if (!chunk) return;
            liveResponseRaw += chunk;
            liveResponseText = deriveSupportLiveResponseText(liveResponseRaw);
            if (currentMode === 'chat') {
                renderChatThread();
            } else if (liveResponseText) {
                outputEl.innerHTML = renderSupportMarkdown(liveResponseText);
            }
            return;
        }

        if (state === 'error') {
            statusEl.textContent = String(eventPayload?.message || t('support.status.requestFailed', 'Support request failed.'));
            if (currentMode !== 'chat' && liveResponseText) {
                outputEl.innerHTML = renderSupportMarkdown(liveResponseText);
            }
            return;
        }

        if (state === 'done' && currentMode !== 'chat' && liveResponseText) {
            outputEl.innerHTML = renderSupportMarkdown(liveResponseText);
        }
    };

    const fetchSupportLibraryRows = async () => {
        const snapshot = {
            games: Array.isArray(getGames()) ? getGames() : [],
            emulators: Array.isArray(getEmulators()) ? getEmulators() : []
        };
        if (!emubro || typeof emubro.invoke !== 'function') {
            latestLibrarySnapshot = snapshot;
            return snapshot;
        }
        try {
            const [gamesRows, emulatorRows] = await Promise.all([
                emubro.invoke('get-games').catch(() => snapshot.games),
                emubro.invoke('get-emulators').catch(() => snapshot.emulators)
            ]);
            latestLibrarySnapshot = {
                games: Array.isArray(gamesRows) ? gamesRows : snapshot.games,
                emulators: Array.isArray(emulatorRows) ? emulatorRows : snapshot.emulators
            };
            return latestLibrarySnapshot;
        } catch (_error) {
            latestLibrarySnapshot = snapshot;
            return snapshot;
        }
    };

    const resolveSupportLibraryContext = async (formState, { overrideMatches = null } = {}) => {
        const matches = overrideMatches && typeof overrideMatches === 'object'
            ? overrideMatches
            : null;
        if (matches) {
            return buildSupportLibraryContextPayload(matches, formState.issueSummary);
        }

        const rows = await fetchSupportLibraryRows();
        const resolvedMatches = resolveSupportLibraryMatches({
            games: rows.games,
            emulators: rows.emulators,
            issueSummary: formState.issueSummary,
            platform: formState.platform,
            emulator: formState.emulator
        });
        return buildSupportLibraryContextPayload(resolvedMatches, formState.issueSummary);
    };

    const requestSupportAppPanelOpen = (target = '') => {
        const normalized = String(target || '').trim().toLowerCase();
        if (!normalized) return false;
        try {
            window.dispatchEvent(new CustomEvent('emubro:open-app-panel', {
                detail: {
                    target: normalized,
                    source: 'support-self-task'
                }
            }));
            return true;
        } catch (_error) {
            return false;
        }
    };

    const requestSupportLibraryWorkspaceAction = (action = '', payload = {}) => {
        const normalizedAction = String(action || '').trim().toLowerCase();
        if (!normalizedAction) {
            return Promise.resolve({ success: false, message: 'Missing library workspace action.' });
        }
        const requestId = `support-library-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        return new Promise((resolve) => {
            let settled = false;
            const cleanup = () => {
                window.removeEventListener('emubro:library-self-task-result', onResult);
                if (timeoutId) window.clearTimeout(timeoutId);
            };
            const finish = (result) => {
                if (settled) return;
                settled = true;
                cleanup();
                resolve(result);
            };
            const onResult = (event) => {
                const detail = event?.detail && typeof event.detail === 'object' ? event.detail : {};
                if (String(detail.requestId || '').trim() !== requestId) return;
                finish(detail.result && typeof detail.result === 'object'
                    ? detail.result
                    : { success: false, message: 'Library workspace request returned no result.' });
            };
            const timeoutId = window.setTimeout(() => {
                finish({ success: false, message: 'Library workspace request timed out.' });
            }, 2000);
            window.addEventListener('emubro:library-self-task-result', onResult);
            try {
                window.dispatchEvent(new CustomEvent('emubro:library-self-task', {
                    detail: {
                        requestId,
                        action: normalizedAction,
                        payload: payload && typeof payload === 'object' ? payload : {}
                    }
                }));
            } catch (_error) {
                finish({ success: false, message: 'Failed to dispatch library workspace request.' });
            }
        });
    };

    const appendSupportTaskMessageAndContinue = async (messageText, {
        taskType = '',
        taskDepth = 1,
        skipUserHistoryAppend = true,
        libraryMatchesOverride = null,
        selfTaskDocsOverride = null,
        attachments = null,
        resultData = null,
        entityKind = '',
        entityName = '',
        details = ''
    } = {}) => {
        const text = String(messageText || '').trim();
        const normalizedAttachments = normalizeSupportMessageAttachments(attachments);
        if (text) {
            appendSupportAssistantMessage(text, { attachments: normalizedAttachments });
        }
        await runSupportRequest({
            skipUserHistoryAppend,
            taskDepth: taskDepth + 1,
            libraryMatchesOverride,
            selfTaskDocsOverride,
            taskResultOverride: buildSupportTaskResultOverride(taskType, text, {
                entityKind,
                entityName,
                details,
                data: resultData && typeof resultData === 'object' && !Array.isArray(resultData) ? resultData : {}
            })
        });
    };

    const executeSupportAssistantTask = async (taskInput, { skipUserHistoryAppend = true, taskDepth = 1 } = {}) => {
        const task = taskInput && typeof taskInput === 'object' ? taskInput : null;
        if (!task) return false;
        const taskType = normalizeSupportTaskType(task.type || task.task || '');
        if (!taskType) return false;

        const libraryRows = await fetchSupportLibraryRows();

        if (taskType === SUPPORT_ASSISTANT_TASK_FETCH_SPECS) {
            statusEl.textContent = t('support.status.collectingSpecs', 'Collecting system specs...');
            const specsResult = await emubro.invoke('system:get-specs');
            const specText = formatSupportSystemSpecsText(specsResult);
            if (!specsResult?.success || !specText) {
                statusEl.textContent = t('support.status.specsFailed', 'Failed to collect system specs.');
                return true;
            }
            detailsInput.value = upsertPcSpecsBlock(detailsInput.value, specText);
            persistDraft();
            const preview = summarizeSpecsForChat(specText);
            if (currentMode === 'chat') {
                if (preview) {
                    chatHistory = normalizeSupportChatHistory([
                        ...chatHistory,
                        { role: 'assistant', text: `Fetched your PC specs:\n\n\`\`\`\n${preview}\n\`\`\`` }
                    ], contextWindowMessages);
                    saveSupportChatHistory(chatHistory, contextWindowMessages);
                    renderChatThread();
                }
            }
            statusEl.textContent = 'System specs attached. Continuing support request...';
            await runSupportRequest({
                skipUserHistoryAppend,
                taskDepth: taskDepth + 1,
                taskResultOverride: buildSupportTaskResultOverride(
                    taskType,
                    preview
                        ? `Fetched your PC specs:\n\n\`\`\`\n${preview}\n\`\`\``
                        : 'Fetched your PC specs.',
                    {
                        entityKind: 'system'
                    }
                )
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_RUN_GAME) {
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            if (!gameRow) {
                const emulatorRow = findSupportEmulatorByTask(libraryRows.emulators, task);
                if (!emulatorRow) {
                    statusEl.textContent = 'Assistant requested a game launch, but no matching game was found.';
                    return true;
                }
                const filePath = String(
                    emulatorRow?.filePath
                    || (Array.isArray(emulatorRow?.filePaths) ? emulatorRow.filePaths[0] : '')
                    || ''
                ).trim();
                if (!filePath) {
                    statusEl.textContent = `No launch path is recorded for ${String(emulatorRow?.name || 'this emulator')}.`;
                    return true;
                }
                const launchResult = await emubro.invoke('launch-emulator', {
                    filePath,
                    args: String(emulatorRow?.launchArgs || emulatorRow?.args || '').trim(),
                    workingDirectory: String(emulatorRow?.workingDirectory || '').trim(),
                    runAsAdmin: !!emulatorRow?.runAsAdmin,
                    runAsUser: String(emulatorRow?.runAsUser || '').trim(),
                    inputBindings: emulatorRow?.inputBindings || null,
                    gamepadBindings: emulatorRow?.gamepadBindings || {},
                    runCommandsBefore: Array.isArray(emulatorRow?.runCommandsBefore) ? emulatorRow.runCommandsBefore : [],
                    name: String(emulatorRow?.name || 'Emulator')
                });
            if (!launchResult?.success) {
                statusEl.textContent = String(launchResult?.message || `Failed to launch ${emulatorRow.name}.`);
                return true;
            }
            statusEl.textContent = String(launchResult?.message || `Launched ${emulatorRow.name}.`);
            await appendSupportTaskMessageAndContinue(`Launched **${String(emulatorRow.name || 'emulator')}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'emulator',
                entityName: String(emulatorRow.name || '').trim(),
                resultData: {
                    emulatorId: Number(emulatorRow.id || 0),
                    emulatorKey: String(emulatorRow.key || '').trim()
                }
            });
            return true;
        }
            const launchResult = await emubro.invoke('launch-game', { gameId: Number(gameRow.id || 0) });
            if (!launchResult?.success) {
                statusEl.textContent = String(launchResult?.message || `Failed to launch ${gameRow.name}.`);
                return true;
            }
            statusEl.textContent = String(launchResult?.message || `Launched ${gameRow.name}.`);
            await appendSupportTaskMessageAndContinue(`Launched **${String(gameRow.name || 'game')}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'game',
                entityName: String(gameRow.name || '').trim(),
                resultData: {
                    gameId: Number(gameRow.id || 0),
                    gameKey: String(gameRow.key || '').trim()
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_RUN_EMULATOR) {
            const emulatorRow = findSupportEmulatorByTask(libraryRows.emulators, task);
            if (!emulatorRow) {
                const gameRow = findSupportGameByTask(libraryRows.games, task);
                if (!gameRow) {
                    statusEl.textContent = 'Assistant requested an emulator launch, but no matching emulator was found.';
                    return true;
                }
                const launchResult = await emubro.invoke('launch-game', { gameId: Number(gameRow.id || 0) });
                if (!launchResult?.success) {
                    statusEl.textContent = String(launchResult?.message || `Failed to launch ${gameRow.name}.`);
                    return true;
                }
                statusEl.textContent = String(launchResult?.message || `Launched ${gameRow.name}.`);
                await appendSupportTaskMessageAndContinue(`Launched **${String(gameRow.name || 'game')}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'game',
                    entityName: String(gameRow.name || '').trim(),
                    resultData: {
                        gameId: Number(gameRow.id || 0),
                        gameKey: String(gameRow.key || '').trim()
                    }
                });
                return true;
            }
            const filePath = String(
                emulatorRow?.filePath
                || (Array.isArray(emulatorRow?.filePaths) ? emulatorRow.filePaths[0] : '')
                || ''
            ).trim();
            if (!filePath) {
                statusEl.textContent = `No launch path is recorded for ${String(emulatorRow?.name || 'this emulator')}.`;
                return true;
            }
            const launchResult = await emubro.invoke('launch-emulator', {
                filePath,
                args: String(emulatorRow?.launchArgs || emulatorRow?.args || '').trim(),
                workingDirectory: String(emulatorRow?.workingDirectory || '').trim(),
                runAsAdmin: !!emulatorRow?.runAsAdmin,
                runAsUser: String(emulatorRow?.runAsUser || '').trim(),
                inputBindings: emulatorRow?.inputBindings || null,
                gamepadBindings: emulatorRow?.gamepadBindings || {},
                runCommandsBefore: Array.isArray(emulatorRow?.runCommandsBefore) ? emulatorRow.runCommandsBefore : [],
                name: String(emulatorRow?.name || 'Emulator')
            });
            if (!launchResult?.success) {
                statusEl.textContent = String(launchResult?.message || `Failed to launch ${String(emulatorRow?.name || 'emulator')}.`);
                return true;
            }
            statusEl.textContent = String(launchResult?.message || `Launched ${String(emulatorRow?.name || 'emulator')}.`);
            await appendSupportTaskMessageAndContinue(`Launched **${String(emulatorRow?.name || 'emulator')}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'emulator',
                entityName: String(emulatorRow?.name || '').trim(),
                resultData: {
                    emulatorId: Number(emulatorRow?.id || 0),
                    emulatorKey: String(emulatorRow?.key || '').trim()
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_DOWNLOAD_INSTALL_EMULATOR) {
            const emulatorRow = findSupportEmulatorByTask(libraryRows.emulators, task);
            if (!emulatorRow) {
                statusEl.textContent = 'Assistant requested an emulator download, but no matching emulator was found.';
                return true;
            }
            const downloadPayload = {
                ...buildSupportDownloadPayload(emulatorRow),
                os: String(window?.emubro?.platform || 'windows').trim().toLowerCase(),
                installMethod: 'download',
                packageType: '',
                specificUrl: '',
                useWaybackFallback: false,
                waybackSourceUrl: String(emulatorRow?.website || emulatorRow?.downloadUrl || '').trim(),
                waybackUrl: ''
            };
            const result = await emubro.invoke('download-install-emulator', downloadPayload);
            if (!result?.success && !result?.manual) {
                statusEl.textContent = String(result?.message || 'Failed to download emulator.');
                return true;
            }
            statusEl.textContent = String(
                result?.message
                || (result?.manual
                    ? `Opened download source for ${String(emulatorRow?.name || 'emulator')}.`
                    : `Download/install finished for ${String(emulatorRow?.name || 'emulator')}.`)
            );
            await appendSupportTaskMessageAndContinue(
                result?.manual
                    ? `Opened the download source for **${String(emulatorRow?.name || 'emulator')}**.`
                    : `Started install for **${String(emulatorRow?.name || 'emulator')}**.`,
                {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'emulator',
                    entityName: String(emulatorRow?.name || '').trim(),
                    resultData: {
                        emulatorId: Number(emulatorRow?.id || 0),
                        emulatorKey: String(emulatorRow?.key || '').trim(),
                        manual: !!result?.manual
                    }
                }
            );
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_REFRESH_LIBRARY) {
            const kind = normalizeSupportLibraryTaskKind(task);
            const limit = normalizeSupportLibraryTaskLimit(task);
            statusEl.textContent = 'Refreshing local library context...';
            const queryResult = await emubro.invoke('support:query-library', {
                query: '',
                queries: [],
                kind,
                limit
            });
            if (!queryResult?.success) {
                statusEl.textContent = String(queryResult?.message || 'Failed to refresh local library context.');
                return true;
            }
            statusEl.textContent = `Library refreshed. ${describeSupportLibraryQueryResult(queryResult, '')}`;
            await runSupportRequest({
                skipUserHistoryAppend: true,
                taskDepth: taskDepth + 1,
                libraryMatchesOverride: queryResult
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_READ_LIBRARY) {
            const queries = normalizeSupportLibraryTaskQueries(task);
            const query = queries[0] || '';
            const kind = normalizeSupportLibraryTaskKind(task);
            const limit = normalizeSupportLibraryTaskLimit(task);
            let matchesOverride = null;
            if (!emubro || typeof emubro.invoke !== 'function') {
                statusEl.textContent = 'Support library task bridge is unavailable.';
                return true;
            }
            statusEl.textContent = queries.length > 1
                ? `Querying local library for ${queries.length} requested titles...`
                : (query ? `Querying local library for "${query}"...` : 'Loading full library context...');
            const queryResult = await emubro.invoke('support:query-library', {
                query,
                queries,
                kind,
                limit
            });
            if (!queryResult?.success) {
                statusEl.textContent = String(queryResult?.message || 'Failed to query local library.');
                return true;
            }
            matchesOverride = queryResult;
            statusEl.textContent = describeSupportLibraryQueryResult(queryResult, query);
            await runSupportRequest({
                skipUserHistoryAppend: true,
                taskDepth: taskDepth + 1,
                libraryMatchesOverride: matchesOverride
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_LIST_TAGS) {
            const result = await emubro.invoke('tags:list');
            const query = normalizeSupportTagCandidates(task)[0] || '';
            const tagRows = filterSupportTagsByTask(result?.tags || [], task);
            statusEl.textContent = query
                ? `Loaded ${tagRows.length} matching tags for "${query}".`
                : `Loaded ${tagRows.length} tags.`;
            appendSupportAssistantMessage(formatSupportTagListMarkdown(tagRows, query));
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_ADD_TAGS) {
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            if (!gameRow) {
                statusEl.textContent = 'Assistant requested tags update, but no matching game was found.';
                return true;
            }
            const args = task.args && typeof task.args === 'object' ? task.args : {};
            const tagsResult = await emubro.invoke('tags:list');
            const tagRows = Array.isArray(tagsResult?.tags) ? tagsResult.tags : [];
            const tagByName = new Map();
            const tagLabelById = new Map();
            tagRows.forEach((row) => {
                const tagName = String(row?.name || row?.label || '').trim().toLowerCase();
                const tagId = String(row?.id || '').trim();
                if (!tagName || !tagId) return;
                if (!tagByName.has(tagName)) tagByName.set(tagName, tagId);
                if (!tagLabelById.has(tagId)) tagLabelById.set(tagId, String(row?.name || row?.label || row?.id || '').trim());
            });

            const rawNames = Array.isArray(args.tags) ? args.tags : (Array.isArray(args.tagNames) ? args.tagNames : []);
            const rawIds = Array.isArray(args.tagIds) ? args.tagIds : [];
            const mergedTags = new Set(
                (Array.isArray(gameRow?.tags) ? gameRow.tags : [])
                    .map((value) => String(value || '').trim())
                    .filter(Boolean)
            );
            rawNames.forEach((value) => {
                const normalizedName = String(value || '').trim().toLowerCase();
                if (!normalizedName) return;
                const mappedTag = String(tagByName.get(normalizedName) || normalizedName).trim();
                if (mappedTag) mergedTags.add(mappedTag);
            });
            rawIds.forEach((value) => {
                const normalizedId = String(value || '').trim();
                if (normalizedId) mergedTags.add(normalizedId);
            });
            if (!mergedTags.size) {
                statusEl.textContent = 'No valid tags were provided by the assistant task.';
                return true;
            }
            const resolvedTagNames = Array.from(mergedTags)
                .map((id) => String(tagLabelById.get(String(id || '').trim()) || '').trim())
                .filter(Boolean);
            const updateResult = await emubro.invoke('update-game-metadata', {
                gameId: Number(gameRow.id || 0),
                tags: Array.from(mergedTags)
            });
            if (!updateResult?.success) {
                statusEl.textContent = String(updateResult?.message || 'Failed to update game tags.');
                return true;
            }
            statusEl.textContent = `Applied tags to ${String(gameRow.name || 'game')}.`;
            await appendSupportTaskMessageAndContinue(`Applied tags to **${String(gameRow.name || 'game')}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'game',
                entityName: String(gameRow.name || '').trim(),
                resultData: {
                    gameId: Number(gameRow.id || 0),
                    gameKey: String(gameRow.key || '').trim(),
                    tagIds: Array.from(mergedTags),
                    tagNames: resolvedTagNames
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_REMOVE_TAGS) {
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            if (!gameRow) {
                statusEl.textContent = 'Assistant requested tag removal, but no matching game was found.';
                return true;
            }
            const tagsResult = await emubro.invoke('tags:list');
            const tagRows = Array.isArray(tagsResult?.tags) ? tagsResult.tags : [];
            const tagLabelById = new Map();
            tagRows.forEach((row) => {
                const tagId = String(row?.id || '').trim();
                if (!tagId) return;
                if (!tagLabelById.has(tagId)) tagLabelById.set(tagId, String(row?.name || row?.label || row?.id || '').trim());
            });
            const removeIds = resolveSupportTagIdsForTask(tagRows, task);
            if (!removeIds.length) {
                statusEl.textContent = 'No valid tags were provided to remove.';
                return true;
            }
            const existingIds = Array.isArray(gameRow?.tags)
                ? gameRow.tags.map((value) => String(value || '').trim()).filter(Boolean)
                : [];
            const removeSet = new Set(removeIds.map((value) => String(value || '').trim()).filter(Boolean));
            const nextTags = existingIds.filter((value) => !removeSet.has(String(value || '').trim()));
            if (nextTags.length === existingIds.length) {
                statusEl.textContent = `None of the requested tags are currently assigned to ${String(gameRow.name || 'this game')}.`;
                return true;
            }
            const removedTagNames = removeIds
                .map((id) => String(tagLabelById.get(String(id || '').trim()) || '').trim())
                .filter(Boolean);
            const updateResult = await emubro.invoke('update-game-metadata', {
                gameId: Number(gameRow.id || 0),
                tags: nextTags
            });
            if (!updateResult?.success) {
                statusEl.textContent = String(updateResult?.message || 'Failed to update game tags.');
                return true;
            }
            statusEl.textContent = `Removed tags from ${String(gameRow.name || 'game')}.`;
            await appendSupportTaskMessageAndContinue(`Removed tags from **${String(gameRow.name || 'game')}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'game',
                entityName: String(gameRow.name || '').trim(),
                resultData: {
                    gameId: Number(gameRow.id || 0),
                    gameKey: String(gameRow.key || '').trim(),
                    removedTagIds: removeIds,
                    removedTagNames
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_LIST_HELP_DOCS) {
            const query = normalizeSupportHelpDocQuery(task);
            const limit = Math.max(1, Math.min(50, Number(task?.args?.limit || 20) || 20));
            const result = await emubro.invoke('help:docs:list', { query, limit });
            if (!result?.success) {
                statusEl.textContent = String(result?.message || 'Failed to load help docs.');
                return true;
            }
            const docs = Array.isArray(result.docs) ? result.docs : [];
            helpQueryInput.value = query;
            statusEl.textContent = query
                ? `Found ${docs.length} help docs for "${query}".`
                : `Loaded ${docs.length} help docs.`;
            appendSupportAssistantMessage(formatSupportHelpDocListMarkdown(docs, query));
            if (currentMode === 'help') {
                await refreshHelpDocs({ openFirst: false });
            } else {
                persistHelpState();
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_READ_HELP_DOC) {
            let docId = String(task?.args?.docId || task?.args?.id || '').trim();
            let query = normalizeSupportHelpDocQuery(task);
            if (!docId) {
                const listResult = await emubro.invoke('help:docs:list', {
                    query,
                    limit: Math.max(1, Math.min(50, Number(task?.args?.limit || 20) || 20))
                });
                if (!listResult?.success) {
                    statusEl.textContent = String(listResult?.message || 'Failed to search help docs.');
                    return true;
                }
                const docs = Array.isArray(listResult.docs) ? listResult.docs : [];
                const match = findSupportHelpDocByTask(docs, task);
                if (!match) {
                    statusEl.textContent = 'No matching help doc was found.';
                    return true;
                }
                docId = String(match?.id || '').trim();
                if (!query) {
                    query = String(match?.title || match?.id || '').trim();
                }
            }
            const result = await emubro.invoke('help:docs:get', { id: docId });
            if (!result?.success || !result?.doc) {
                statusEl.textContent = String(result?.message || 'Failed to load help doc.');
                return true;
            }
            const doc = result.doc;
            helpQueryInput.value = query;
            currentHelpDocId = String(doc?.id || docId).trim();
            persistHelpState();
            statusEl.textContent = `Loaded help doc ${String(doc?.title || doc?.id || 'Help Doc').trim()}.`;
            appendSupportAssistantMessage(formatSupportHelpDocMarkdown(doc));
            if (currentMode === 'help') {
                await openHelpDoc(currentHelpDocId);
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_LIST_SELF_TASK_DOCS) {
            if (!emubro || typeof emubro.invoke !== 'function') {
                statusEl.textContent = 'Self-task-doc bridge is unavailable.';
                return true;
            }
            const query = normalizeSupportSelfTaskDocQuery(task);
            const limit = Math.max(1, Math.min(20, Number(task?.args?.limit || 12) || 12));
            const result = await emubro.invoke('support:self-task-docs:list', { query, limit });
            if (!result?.success) {
                statusEl.textContent = String(result?.message || 'Failed to list self-task docs.');
                return true;
            }
            const docs = Array.isArray(result.docs) ? result.docs : [];
            const docsOverride = buildSupportSelfTaskDocsOverride(docs, query, 'list');
            statusEl.textContent = query
                ? `Loaded ${docs.length} self-task docs for "${query}". Continuing support...`
                : `Loaded ${docs.length} self-task docs. Continuing support...`;
            await runSupportRequest({
                skipUserHistoryAppend: true,
                taskDepth: taskDepth + 1,
                selfTaskDocsOverride: docsOverride
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_READ_SELF_TASK_DOC) {
            if (!emubro || typeof emubro.invoke !== 'function') {
                statusEl.textContent = 'Self-task-doc bridge is unavailable.';
                return true;
            }
            const query = normalizeSupportSelfTaskDocQuery(task);
            const maxDocs = normalizeSupportSelfTaskDocLimit(task);
            let targetIds = normalizeSupportSelfTaskDocIds(task);
            if (!targetIds.length) {
                const listResult = await emubro.invoke('support:self-task-docs:list', {
                    query,
                    limit: maxDocs
                });
                if (!listResult?.success) {
                    statusEl.textContent = String(listResult?.message || 'Failed to search self-task docs.');
                    return true;
                }
                targetIds = (Array.isArray(listResult.docs) ? listResult.docs : [])
                    .map((doc) => String(doc?.id || '').trim())
                    .filter(Boolean)
                    .slice(0, maxDocs);
            }
            if (!targetIds.length) {
                statusEl.textContent = 'No matching self-task docs were found.';
                return true;
            }
            const docs = [];
            for (const docId of targetIds.slice(0, maxDocs)) {
                const docResult = await emubro.invoke('support:self-task-docs:get', { id: docId });
                if (docResult?.success && docResult?.doc) {
                    docs.push(docResult.doc);
                }
            }
            if (!docs.length) {
                statusEl.textContent = 'Failed to load the requested self-task docs.';
                return true;
            }
            const docsOverride = buildSupportSelfTaskDocsOverride(docs, query || targetIds.join(', '), 'read');
            statusEl.textContent = `Loaded ${docs.length} self-task doc${docs.length === 1 ? '' : 's'}. Continuing support...`;
            await runSupportRequest({
                skipUserHistoryAppend: true,
                taskDepth: taskDepth + 1,
                selfTaskDocsOverride: docsOverride
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_RELEASE_DATE) {
            const query = normalizeSupportReleaseDateQuery(task);
            if (!query) {
                throw new Error('Assistant requested a platform release date lookup, but no platform query was provided.');
            }
            const platforms = await emubro.invoke('get-platforms');
            const platformRow = findSupportPlatformRowByQuery(platforms, query);
            if (!platformRow) {
                throw new Error(`No matching platform config was found for "${query}".`);
            }
            const releaseSummary = buildSupportReleaseDateSummary(platformRow, task);
            const platformLabel = String(platformRow?.name || platformRow?.shortName || query).trim();
            if (!releaseSummary.found) {
                statusEl.textContent = `No local release date is recorded for ${platformLabel}. Continuing with fallback reasoning...`;
                await appendSupportTaskMessageAndContinue(`**Local config:** No release date is recorded for **${platformLabel}** in emuBro platform config.

**Fallback reasoning:** I'll now rely on general model knowledge for the date.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'platform',
                    entityName: platformLabel,
                    resultData: {
                        found: false,
                        source: 'platform-config',
                        platformName: platformLabel,
                        shortName: String(platformRow?.shortName || '').trim(),
                        platformDir: String(platformRow?.platformDir || '').trim()
                    }
                });
                return true;
            }
            const messageText = `**Local config:** Release date for **${platformLabel}**
${releaseSummary.message}`;
            statusEl.textContent = `Loaded release date for ${platformLabel}.`;
            await appendSupportTaskMessageAndContinue(messageText, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'platform',
                entityName: platformLabel,
                resultData: {
                    found: true,
                    source: 'platform-config',
                    platformName: platformLabel,
                    shortName: String(platformRow?.shortName || '').trim(),
                    platformDir: String(platformRow?.platformDir || '').trim(),
                    companyName: String(platformRow?.companyName || '').trim(),
                    releaseDate: releaseSummary.releaseDate
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_GAME_RELEASE_DATE) {
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            const query = normalizeSupportTaskNameCandidates(task)[0] || '';
            if (!gameRow) {
                throw new Error(query
                    ? `No matching game was found for "${query}".`
                    : 'Assistant requested a game release date lookup, but no matching game was found.');
            }
            const gameSummary = buildSupportGameReleaseDateSummary(gameRow);
            const gameLabel = String(gameRow?.name || query || 'game').trim();
            const platformLabel = String(gameRow?.platform || gameRow?.platformShortName || '').trim();
            if (!gameSummary.found) {
                statusEl.textContent = `No local game release date is recorded for ${gameLabel}. Continuing with fallback reasoning...`;
                await appendSupportTaskMessageAndContinue(`**Local library:** No release date is recorded for **${gameLabel}**${platformLabel ? ` on **${platformLabel}**` : ''}.\n\n**Fallback reasoning:** I'll now rely on general model knowledge${allowWebAccessEnabled ? ' or web-backed reasoning if needed' : ''} for the game's release date.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'game',
                    entityName: gameLabel,
                    resultData: {
                        found: false,
                        source: 'game-library',
                        gameName: gameLabel,
                        platform: platformLabel,
                        gameId: Number(gameRow?.id || 0) || null
                    }
                });
                return true;
            }
            const messageText = `**Local library:** Release date for **${gameLabel}**${platformLabel ? ` (${platformLabel})` : ''}\n${gameSummary.value}`;
            statusEl.textContent = `Loaded game release date for ${gameLabel}.`;
            await appendSupportTaskMessageAndContinue(messageText, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'game',
                entityName: gameLabel,
                resultData: {
                    found: true,
                    source: 'game-library',
                    gameName: gameLabel,
                    platform: platformLabel,
                    gameId: Number(gameRow?.id || 0) || null,
                    releaseDate: gameSummary.value
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_FETCH_GAME_COVER) {
            const args = task.args && typeof task.args === 'object' ? task.args : {};
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            const directQuery = String(
                args.query
                || args.title
                || args.gameName
                || args.name
                || ''
            ).trim();
            const mode = normalizeSupportCoverTaskMode(task);
            const limit = normalizeSupportCoverTaskLimit(task);
            const existingCover = gameRow ? buildSupportCoverAttachmentFromGameRow(gameRow, 'library') : null;
            let coverAttachments = [];
            let resultSource = 'library';
            let resolvedQuery = buildSupportCoverSearchQuery(gameRow, directQuery);

            if ((mode === 'library' || mode === 'auto') && existingCover) {
                coverAttachments = [existingCover];
                resultSource = 'library';
            }

            if (!coverAttachments.length && gameRow && mode !== 'search') {
                const downloadResult = await emubro.invoke('covers:download-for-game', {
                    gameId: Number(gameRow.id || 0),
                    overwrite: false,
                    onlyMissing: true
                });
                if (downloadResult?.success) {
                    const downloadedCover = buildSupportCoverAttachmentFromResult(downloadResult, gameRow, 'download');
                    if (downloadedCover) {
                        coverAttachments = [downloadedCover];
                        resultSource = 'download';
                    }
                }
            }

            if (!coverAttachments.length) {
                if (!resolvedQuery) {
                    throw new Error('Assistant requested a game cover, but no game title or query was provided.');
                }
                if (!webAccessEnabled) {
                    throw new Error(gameRow
                        ? `No recorded cover was found for ${String(gameRow.name || 'that game')}, and web cover search is disabled.`
                        : 'Web cover search is disabled. Enable support web access or ask for a recorded local cover.');
                }
                const searchResult = await emubro.invoke('covers:search-web', {
                    query: resolvedQuery,
                    limit
                });
                if (!searchResult?.success) {
                    throw new Error(String(searchResult?.message || 'Failed to search web covers.'));
                }
            coverAttachments = buildSupportCoverAttachmentsFromSearchResults(searchResult?.results, gameRow, limit, directQuery || resolvedQuery);
                resultSource = 'web-search';
            }

            if (!coverAttachments.length) {
                throw new Error(gameRow
                    ? `No usable cover image was found for ${String(gameRow.name || 'that game')}.`
                    : 'No usable cover image was found for that query.');
            }

            const coverLabel = String(gameRow?.name || directQuery || coverAttachments[0]?.title || 'that game').trim();
            const messageText = coverAttachments.length === 1
                ? `Here is the cover for **${coverLabel}**.`
                : `Here are ${coverAttachments.length} cover results for **${coverLabel}**.`;
            statusEl.textContent = messageText;
            await appendSupportTaskMessageAndContinue(messageText, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                attachments: coverAttachments,
                entityKind: 'game',
                entityName: coverLabel,
                resultData: {
                    source: resultSource,
                    query: resolvedQuery,
                    gameId: Number(gameRow?.id || 0),
                    gameKey: String(gameRow?.key || '').trim(),
                    coverCount: coverAttachments.length,
                    covers: coverAttachments
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_ADD_GAME_COVER) {
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            if (!gameRow?.id) {
                throw new Error('Assistant requested a game cover update, but no matching game was found.');
            }
            const selectedCover = resolveSupportCoverAttachmentSelection(chatHistory, task, gameRow);
            const imageUrl = String(selectedCover?.imageUrl || selectedCover?.thumbnailUrl || '').trim();
            if (!imageUrl) {
                throw new Error('No cover image is available to apply yet. Ask me to show or fetch the cover first.');
            }
            const updateResult = await emubro.invoke('update-game-metadata', {
                gameId: Number(gameRow.id || 0),
                image: imageUrl
            });
            if (!updateResult?.success) {
                throw new Error(String(updateResult?.message || 'Failed to apply the selected game cover.'));
            }
            const coverLabel = String(gameRow?.name || selectedCover?.title || 'that game').trim();
            statusEl.textContent = `Applied the selected cover to ${coverLabel}.`;
            await appendSupportTaskMessageAndContinue(`Applied the selected cover to **${coverLabel}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                attachments: selectedCover ? [selectedCover] : [],
                entityKind: 'game',
                entityName: coverLabel,
                resultData: {
                    gameId: Number(gameRow?.id || 0),
                    gameKey: String(gameRow?.key || '').trim(),
                    imageUrl,
                    source: String(selectedCover?.source || '').trim(),
                    sourceUrl: String(selectedCover?.sourceUrl || selectedCover?.pageUrl || '').trim()
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_YOUTUBE_PREVIEW) {
            const args = task.args && typeof task.args === 'object' ? task.args : {};
            const gameRow = findSupportGameByTask(libraryRows.games, task);
            const directUrl = String(args.url || args.videoUrl || '').trim();
            const query = String(args.query || gameRow?.name || issueSummaryInput.value || '').trim();
            const target = /^https?:\/\//i.test(directUrl)
                ? directUrl
                : `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            const openResult = await emubro.invoke('open-external-url', target);
            if (!openResult?.success) {
                statusEl.textContent = String(openResult?.message || 'Failed to open YouTube preview.');
                return true;
            }
            statusEl.textContent = String(openResult?.message || 'Opened YouTube preview.');
            await appendSupportTaskMessageAndContinue(
                `Opened YouTube preview${gameRow?.name ? ` for **${String(gameRow.name)}**` : ''}.`,
                {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: gameRow?.name ? 'game' : '',
                    entityName: String(gameRow?.name || '').trim(),
                    resultData: {
                        url: target
                    }
                }
            );
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_SUPPORT_MODE) {
            const nextMode = normalizeSupportTaskModeTarget(task);
            setMode(nextMode, { persist: true });
            statusEl.textContent = `Switched support mode to ${nextMode}.`;
            await appendSupportTaskMessageAndContinue(`Switched support mode to **${nextMode}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-mode',
                entityName: nextMode,
                resultData: {
                    mode: nextMode
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_PLATFORM) {
            const platformValue = readSupportTaskStringArg(task, ['platform', 'value', 'name', 'query']);
            if (!platformValue) {
                statusEl.textContent = 'Assistant requested a platform change, but no platform value was provided.';
                return true;
            }
            platformInput.value = platformValue;
            persistDraft();
            statusEl.textContent = `Updated platform to ${platformValue}.`;
            await appendSupportTaskMessageAndContinue(`Updated the support platform to **${platformValue}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-field',
                entityName: 'platform',
                resultData: {
                    field: 'platform',
                    value: platformValue
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR) {
            const emulatorValue = readSupportTaskStringArg(task, ['emulator', 'value', 'name', 'query']);
            if (!emulatorValue) {
                statusEl.textContent = 'Assistant requested an emulator change, but no emulator value was provided.';
                return true;
            }
            emulatorInput.value = emulatorValue;
            persistDraft();
            statusEl.textContent = `Updated emulator to ${emulatorValue}.`;
            await appendSupportTaskMessageAndContinue(`Updated the support emulator to **${emulatorValue}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-field',
                entityName: 'emulator',
                resultData: {
                    field: 'emulator',
                    value: emulatorValue
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_TYPE) {
            const issueTypeValue = normalizeSupportTaskIssueTypeTarget(task);
            issueTypeSelect.value = issueTypeValue;
            persistDraft();
            statusEl.textContent = `Updated issue type to ${issueTypeValue}.`;
            await appendSupportTaskMessageAndContinue(`Updated the issue type to **${issueTypeValue}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-field',
                entityName: 'issueType',
                resultData: {
                    field: 'issueType',
                    value: issueTypeValue
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_ISSUE_SUMMARY) {
            const summaryValue = readSupportTaskStringArg(task, ['summary', 'issueSummary', 'message', 'text', 'value']);
            if (!summaryValue) {
                statusEl.textContent = 'Assistant requested a summary change, but no summary text was provided.';
                return true;
            }
            issueSummaryInput.value = summaryValue;
            syncChatInputFromSummary();
            persistDraft();
            updateChatComposerState();
            statusEl.textContent = 'Updated the support summary.';
            await appendSupportTaskMessageAndContinue(`Updated the support summary to:\n\n> ${summaryValue}`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-field',
                entityName: 'issueSummary',
                resultData: {
                    field: 'issueSummary',
                    value: summaryValue
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_APPEND_DETAILS) {
            const detailText = readSupportTaskStringArg(task, ['details', 'text', 'message', 'value']);
            if (!detailText) {
                statusEl.textContent = 'Assistant requested a details update, but no detail text was provided.';
                return true;
            }
            detailsInput.value = detailsInput.value
                ? `${String(detailsInput.value).trim()}\n\n${detailText}`
                : detailText;
            persistDraft();
            statusEl.textContent = 'Appended support details.';
            await appendSupportTaskMessageAndContinue('Appended additional support details.', {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-field',
                entityName: 'details',
                resultData: {
                    field: 'details',
                    appendedText: detailText
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_FIELD) {
            const fields = normalizeSupportTaskClearFields(task);
            if (!fields.length) {
                statusEl.textContent = 'Assistant requested a field clear, but no supported field target was provided.';
                return true;
            }
            fields.forEach((field) => {
                if (field === 'issueSummary') {
                    issueSummaryInput.value = '';
                } else if (field === 'platform') {
                    platformInput.value = '';
                } else if (field === 'emulator') {
                    emulatorInput.value = '';
                } else if (field === 'errorText') {
                    errorTextInput.value = '';
                } else if (field === 'details') {
                    detailsInput.value = '';
                }
            });
            syncChatInputFromSummary();
            persistDraft();
            updateChatComposerState();
            statusEl.textContent = `Cleared ${fields.join(', ')}.`;
            await appendSupportTaskMessageAndContinue(`Cleared support field${fields.length === 1 ? '' : 's'}: **${fields.join('**, **')}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-field',
                entityName: fields.join(', '),
                resultData: {
                    fields
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CLEAR_SUPPORT_SESSION) {
            clearBtn.click();
            statusEl.textContent = 'Cleared the current support session.';
            await appendSupportTaskMessageAndContinue('Cleared the current support session.', {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-session',
                entityName: 'current',
                resultData: {
                    cleared: true
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_TOGGLE_AUTO_SPECS) {
            const enabled = normalizeSupportTaskBooleanValue(task, !autoSpecsEnabled);
            autoSpecsEnabled = enabled;
            saveSupportAutoSpecsEnabled(autoSpecsEnabled);
            syncDebugToggleUi();
            statusEl.textContent = `Auto specs ${enabled ? 'enabled' : 'disabled'}.`;
            await appendSupportTaskMessageAndContinue(`${enabled ? 'Enabled' : 'Disabled'} automatic specs fetching.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-setting',
                entityName: 'autoSpecs',
                resultData: {
                    enabled
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_TOGGLE_WEB_ACCESS) {
            const enabled = normalizeSupportTaskBooleanValue(task, !webAccessEnabled);
            webAccessEnabled = enabled;
            saveSupportWebAccessEnabled(webAccessEnabled);
            syncDebugToggleUi();
            statusEl.textContent = `Web access ${enabled ? 'enabled' : 'disabled'}.`;
            await appendSupportTaskMessageAndContinue(`${enabled ? 'Enabled' : 'Disabled'} web access for support.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-setting',
                entityName: 'webAccess',
                resultData: {
                    enabled
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_TOGGLE_DEBUG_CONTEXT) {
            const enabled = normalizeSupportTaskBooleanValue(task, !debugSupportEnabled);
            debugSupportEnabled = enabled;
            saveSupportDebugEnabled(debugSupportEnabled);
            syncDebugToggleUi();
            renderDebugPayload(debugSupportEnabled ? lastDebugPayload : null);
            statusEl.textContent = `Debug context ${enabled ? 'enabled' : 'disabled'}.`;
            await appendSupportTaskMessageAndContinue(`${enabled ? 'Enabled' : 'Disabled'} debug context.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'support-setting',
                entityName: 'debugContext',
                resultData: {
                    enabled
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_THEME) {
            const nextTone = normalizeSupportTaskThemeTarget(task);
            if (!nextTone) {
                statusEl.textContent = 'Assistant requested a theme change, but no supported theme tone was provided.';
                return true;
            }
            try {
                localStorage.setItem('theme', nextTone);
            } catch (_error) {}
            setTheme(nextTone, { force: true, allowSameForce: true });
            statusEl.textContent = `Theme changed to ${nextTone}.`;
            await appendSupportTaskMessageAndContinue(`Changed the app theme to **${nextTone}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'app-setting',
                entityName: 'theme',
                resultData: {
                    tone: nextTone
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LANGUAGE) {
            const targetLanguage = normalizeSupportTaskLanguageTarget(task);
            if (!targetLanguage) {
                statusEl.textContent = 'Assistant requested a language change, but no language target was provided.';
                return true;
            }
            const normalizedTarget = targetLanguage.trim().toLowerCase();
            const i18nRef = window?.i18n && typeof window.i18n.setLanguage === 'function'
                ? window.i18n
                : null;
            if (!i18nRef) {
                statusEl.textContent = 'Language bridge is unavailable in this window.';
                return true;
            }
            try {
                localStorage.setItem('language', normalizedTarget);
            } catch (_error) {}
            i18nRef.setLanguage(normalizedTarget);
            statusEl.textContent = `Language changed to ${normalizedTarget}.`;
            await appendSupportTaskMessageAndContinue(`Changed the app language to **${normalizedTarget.toUpperCase()}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'app-setting',
                entityName: 'language',
                resultData: {
                    code: normalizedTarget
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_DOWNLOAD_LIBRARY_COVERS) {
            if (!emubro || typeof emubro.invoke !== 'function') {
                statusEl.textContent = 'Cover download bridge is unavailable.';
                return true;
            }
            const args = task.args && typeof task.args === 'object' ? task.args : {};
            const overwrite = !!(args.overwrite === true || args.force === true);
            const onlyMissing = args.onlyMissing === false ? false : !overwrite;
            statusEl.textContent = 'Downloading library covers...';
            const result = await emubro.invoke('covers:download-for-library', {
                onlyMissing,
                overwrite
            });
            if (!result?.success) {
                statusEl.textContent = String(result?.message || 'Cover download failed.');
                return true;
            }
            const summary = `Processed ${Number(result?.total || 0)} game(s): ${Number(result?.downloaded || 0)} downloaded, ${Number(result?.skipped || 0)} skipped, ${Number(result?.failed || 0)} failed.`;
            statusEl.textContent = summary;
            await appendSupportTaskMessageAndContinue(summary, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'library-covers',
                entityName: 'library',
                resultData: {
                    total: Number(result?.total || 0),
                    downloaded: Number(result?.downloaded || 0),
                    skipped: Number(result?.skipped || 0),
                    failed: Number(result?.failed || 0),
                    onlyMissing,
                    overwrite
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SECTION) {
            const targetSection = normalizeSupportTaskLibrarySectionTarget(task);
            if (!targetSection) {
                statusEl.textContent = 'Assistant requested a library section change, but no valid section was provided.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('change-section', { section: targetSection });
            statusEl.textContent = String(result?.message || `Library section changed to ${targetSection}.`);
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(`Changed the library section to **${targetSection}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'library',
                    entityName: 'section',
                    resultData: { section: targetSection }
                });
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_VIEW) {
            const targetView = normalizeSupportTaskLibraryViewTarget(task);
            if (!targetView) {
                statusEl.textContent = 'Assistant requested a library view change, but no supported view mode was provided.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('change-view', { viewMode: targetView });
            statusEl.textContent = String(result?.message || `Library view changed to ${targetView}.`);
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(`Changed the library view to **${targetView}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'library',
                    entityName: 'view',
                    resultData: { viewMode: targetView }
                });
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SEARCH) {
            const targetQuery = normalizeSupportTaskLibrarySearchTarget(task);
            const result = await requestSupportLibraryWorkspaceAction('change-search', { query: targetQuery });
            statusEl.textContent = String(result?.message || (targetQuery
                ? `Library search changed to "${targetQuery}".`
                : 'Library search cleared.'));
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(
                    targetQuery ? `Updated the library search to **${targetQuery}**.` : 'Cleared the library search query.',
                    {
                        taskType,
                        taskDepth,
                        skipUserHistoryAppend,
                        entityKind: 'library',
                        entityName: 'search',
                        resultData: { query: targetQuery }
                    }
                );
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_PLATFORM_FILTER) {
            const targetPlatform = normalizeSupportTaskLibraryPlatformTarget(task);
            if (!targetPlatform) {
                statusEl.textContent = 'Assistant requested a library platform filter change, but no platform target was provided.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('change-platform-filter', { platform: targetPlatform });
            statusEl.textContent = String(result?.message || (targetPlatform === 'all'
                ? 'Library platform filter cleared.'
                : `Library platform filter changed to ${targetPlatform}.`));
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(
                    targetPlatform === 'all'
                        ? 'Cleared the library platform filter.'
                        : `Changed the library platform filter to **${targetPlatform}**.`,
                    {
                        taskType,
                        taskDepth,
                        skipUserHistoryAppend,
                        entityKind: 'library',
                        entityName: 'platform-filter',
                        resultData: { platform: targetPlatform }
                    }
                );
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_SORT) {
            const targetSort = normalizeSupportTaskLibrarySortTarget(task);
            if (!targetSort) {
                statusEl.textContent = 'Assistant requested a library sort change, but no supported sort mode was provided.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('change-sort', { sortBy: targetSort });
            statusEl.textContent = String(result?.message || `Library sort changed to ${targetSort}.`);
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(`Changed the library sort to **${targetSort}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'library',
                    entityName: 'sort',
                    resultData: { sortBy: targetSort }
                });
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_LIBRARY_EMULATOR_TYPE) {
            const targetType = normalizeSupportTaskLibraryEmulatorTypeTarget(task);
            if (!targetType) {
                statusEl.textContent = 'Assistant requested an emulator type filter change, but no supported type was provided.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('change-emulator-type', { emulatorType: targetType });
            statusEl.textContent = String(result?.message || `Emulator type filter changed to ${targetType}.`);
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(`Changed the emulator type filter to **${targetType}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'library',
                    entityName: 'emulator-type',
                    resultData: { emulatorType: targetType }
                });
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_CLEAR_LIBRARY_FILTERS) {
            const fields = normalizeSupportTaskLibraryClearFields(task);
            const result = await requestSupportLibraryWorkspaceAction('clear-filters', { fields });
            statusEl.textContent = String(result?.message || 'Library filters cleared.');
            if (result?.success) {
                await appendSupportTaskMessageAndContinue('Cleared the active library filters.', {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'library',
                    entityName: 'filters',
                    resultData: { fields }
                });
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_GAME_DETAILS) {
            const gameRow = findSupportGameByTask(getGames(), task);
            if (!gameRow) {
                statusEl.textContent = 'Assistant requested a game details view, but no matching game was found.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('open-game-details', {
                gameId: Number(gameRow?.id || 0),
                gameKey: String(gameRow?.key || '').trim()
            });
            statusEl.textContent = String(result?.message || `Opened details for ${String(gameRow?.name || 'game').trim()}.`);
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(`Opened the game details for **${String(gameRow?.name || 'game').trim()}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'game',
                    entityName: String(gameRow?.name || '').trim(),
                    resultData: {
                        gameId: Number(gameRow?.id || 0),
                        gameKey: String(gameRow?.key || '').trim()
                    }
                });
            }
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_EMULATOR_DETAILS) {
            const emulatorRow = findSupportEmulatorByTask(getEmulators(), task);
            if (!emulatorRow) {
                statusEl.textContent = 'Assistant requested an emulator details view, but no matching emulator was found.';
                return true;
            }
            const result = await requestSupportLibraryWorkspaceAction('open-emulator-details', {
                emulatorId: Number(emulatorRow?.id || 0),
                emulatorKey: String(emulatorRow?.key || '').trim()
            });
            statusEl.textContent = String(result?.message || `Opened details for ${String(emulatorRow?.name || 'emulator').trim()}.`);
            if (result?.success) {
                await appendSupportTaskMessageAndContinue(`Opened the emulator details for **${String(emulatorRow?.name || 'emulator').trim()}**.`, {
                    taskType,
                    taskDepth,
                    skipUserHistoryAppend,
                    entityKind: 'emulator',
                    entityName: String(emulatorRow?.name || '').trim(),
                    resultData: {
                        emulatorId: Number(emulatorRow?.id || 0),
                        emulatorKey: String(emulatorRow?.key || '').trim()
                    }
                });
            }
            return true;
        }

        if (
            taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE
            || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS
            || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY
            || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH
            || taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE
            || taskType === SUPPORT_ASSISTANT_TASK_CLEAR_EMULATOR_OVERRIDE_FIELDS
        ) {
            const emulatorRow = findSupportEmulatorByTask(getEmulators(), task);
            if (!emulatorRow) {
                statusEl.textContent = 'Assistant requested an emulator config change, but no matching emulator was found.';
                return true;
            }

            let resultLabel = '';
            let resultData = {};
            if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WEBSITE) {
                const value = normalizeSupportTaskEmulatorConfigValue(task, ['website', 'url', 'value', 'query']);
                updateSupportEmulatorStoredConfig(emulatorRow, { website: value });
                resultLabel = value ? `Updated the emulator website override for **${emulatorRow.name}**.` : `Cleared the emulator website override for **${emulatorRow.name}**.`;
                resultData = { field: 'website', value };
            } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_LAUNCH_ARGS) {
                const value = normalizeSupportTaskEmulatorConfigValue(task, ['launchArgs', 'args', 'value', 'query']);
                updateSupportEmulatorStoredConfig(emulatorRow, { launchArgs: value });
                resultLabel = value ? `Updated the launch arguments for **${emulatorRow.name}**.` : `Cleared the launch arguments for **${emulatorRow.name}**.`;
                resultData = { field: 'launchArgs', value };
            } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_WORKING_DIRECTORY) {
                const value = normalizeSupportTaskEmulatorConfigValue(task, ['workingDirectory', 'path', 'value', 'query']);
                updateSupportEmulatorStoredConfig(emulatorRow, { workingDirectory: value });
                resultLabel = value ? `Updated the working directory for **${emulatorRow.name}**.` : `Cleared the working directory override for **${emulatorRow.name}**.`;
                resultData = { field: 'workingDirectory', value };
            } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_CONFIG_PATH) {
                const value = normalizeSupportTaskEmulatorConfigValue(task, ['configFilePath', 'configPath', 'path', 'value', 'query']);
                updateSupportEmulatorStoredConfig(emulatorRow, { configFilePath: value });
                resultLabel = value ? `Updated the config file path for **${emulatorRow.name}**.` : `Cleared the config file path override for **${emulatorRow.name}**.`;
                resultData = { field: 'configFilePath', value };
            } else if (taskType === SUPPORT_ASSISTANT_TASK_CHANGE_EMULATOR_RUN_COMMANDS_BEFORE) {
                const value = normalizeSupportTaskEmulatorConfigValue(task, ['runCommandsBefore', 'commands', 'command', 'value', 'query']);
                updateSupportEmulatorStoredConfig(emulatorRow, { runCommandsBefore: value });
                resultLabel = value ? `Updated the pre-launch commands for **${emulatorRow.name}**.` : `Cleared the pre-launch commands for **${emulatorRow.name}**.`;
                resultData = { field: 'runCommandsBefore', value };
            } else {
                const fields = normalizeSupportTaskEmulatorClearFields(task);
                const clearAll = !fields.length || fields.includes('all');
                const patch = clearAll
                    ? {
                        website: '',
                        launchArgs: '',
                        workingDirectory: '',
                        configFilePath: '',
                        runCommandsBefore: ''
                    }
                    : Object.fromEntries(fields.map((field) => [field, '']));
                updateSupportEmulatorStoredConfig(emulatorRow, patch);
                resultLabel = clearAll
                    ? `Cleared emulator override fields for **${emulatorRow.name}**.`
                    : `Cleared ${fields.join(', ')} for **${emulatorRow.name}**.`;
                resultData = { field: 'clear', fields: clearAll ? ['all'] : fields };
            }

            statusEl.textContent = resultLabel.replace(/\*\*/g, '');
            await appendSupportTaskMessageAndContinue(resultLabel, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                entityKind: 'emulator',
                entityName: String(emulatorRow?.name || '').trim(),
                resultData: {
                    emulatorId: Number(emulatorRow?.id || 0),
                    emulatorKey: String(emulatorRow?.key || '').trim(),
                    ...resultData
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_EXTERNAL_URL) {
            const args = task.args && typeof task.args === 'object' ? task.args : {};
            let target = String(args.url || args.link || args.href || args.query || '').trim();
            if (!target) {
                statusEl.textContent = 'Assistant requested an external URL, but no URL was provided.';
                return true;
            }
            if (/^www\./i.test(target)) {
                target = `https://${target}`;
            }
            const openResult = await emubro.invoke('open-external-url', target);
            if (!openResult?.success) {
                statusEl.textContent = String(openResult?.message || 'Failed to open external URL.');
                return true;
            }
            statusEl.textContent = String(openResult?.message || 'Opened external URL.');
            await appendSupportTaskMessageAndContinue(`Opened external URL: ${target}`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                resultData: {
                    url: target
                }
            });
            return true;
        }

        if (taskType === SUPPORT_ASSISTANT_TASK_OPEN_SETTINGS_PANEL) {
            const target = normalizeSupportPanelTarget(task);
            if (!target) {
                statusEl.textContent = 'Assistant requested a local panel, but no valid panel target was provided.';
                return true;
            }
            if (target === 'help') {
                setMode('help');
                await refreshHelpDocs({ openFirst: true });
            } else if (target === 'support') {
                setMode('chat');
            } else {
                const opened = requestSupportAppPanelOpen(target);
                if (!opened) {
                    statusEl.textContent = 'Failed to open the requested app panel.';
                    return true;
                }
            }
            const label = describeSupportPanelTarget(target);
            statusEl.textContent = `Opened ${label}.`;
            await appendSupportTaskMessageAndContinue(`Opened **${label}**.`, {
                taskType,
                taskDepth,
                skipUserHistoryAppend,
                resultData: {
                    panel: target
                }
            });
            return true;
        }

        statusEl.textContent = `Unsupported support task: ${taskType}`;
        return true;
    };

    const dismissPendingSupportTask = () => {
        if (pendingTaskBusy) return;
        pendingSupportTask = null;
        renderPendingSupportTask();
        statusEl.textContent = t('support.status.taskDismissed', 'Assistant request dismissed.');
    };

    const approvePendingSupportTask = async () => {
        const task = pendingSupportTask?.task;
        if (!task || !String(task.type || '').trim()) return;
        pendingTaskBusy = true;
        pendingSupportTask = null;
        renderPendingSupportTask();
        statusEl.textContent = t('support.status.runningTask', 'Running assistant request...');
        try {
            await executeSupportAssistantTask(task, {
                skipUserHistoryAppend: true,
                taskDepth: 1
            });
        } finally {
            pendingTaskBusy = false;
            renderPendingSupportTask();
            updateChatComposerState();
        }
    };

    const persistHelpState = () => {
        saveSupportHelpState({
            query: String(helpQueryInput.value || '').trim(),
            selectedDocId: currentHelpDocId
        });
    };

    const renderHelpList = (docs = []) => {
        const rows = Array.isArray(docs) ? docs : [];
        if (!rows.length) {
            helpListEl.innerHTML = `<div class="support-help-empty">${escapeHtml(t('support.helpNoResults', 'No help docs found.'))}</div>`;
            return;
        }
        helpListEl.innerHTML = rows.map((doc) => {
            const id = String(doc?.id || '').trim();
            const title = String(doc?.title || id || '').trim();
            const preview = String(doc?.preview || doc?.snippet || '').trim();
            const activeClass = id && id === currentHelpDocId ? ' is-active' : '';
            return `
                <button type="button" class="support-help-item${activeClass}" data-help-doc-id="${escapeHtml(id)}">
                    <strong>${escapeHtml(title || id)}</strong>
                    ${preview ? `<span>${escapeHtml(preview)}</span>` : ''}
                </button>
            `;
        }).join('');
    };

    const renderHelpDoc = (doc = null) => {
        if (!doc || typeof doc !== 'object') {
            outputTitleEl.textContent = t('support.helpTitle', 'Help Docs');
            outputEl.innerHTML = renderSupportMarkdown(t('support.helpInitialOutput', 'Select a help topic to read it here.'));
            return;
        }
        const title = String(doc.title || doc.id || '').trim() || t('support.helpTitle', 'Help Docs');
        const format = String(doc.format || '').trim().toLowerCase();
        const html = String(doc.html || '').trim();
        const text = String(doc.text || '').trim();
        outputTitleEl.textContent = title;
        if ((format === '.html' || format === '.htm') && html) {
            outputEl.innerHTML = html;
        } else {
            outputEl.innerHTML = renderSupportMarkdown(text || t('support.helpInitialOutput', 'Select a help topic to read it here.'));
        }
    };

    const openHelpDoc = async (docId) => {
        const id = String(docId || '').trim();
        if (!id) return;
        if (!emubro || typeof emubro.invoke !== 'function') {
            statusEl.textContent = t('support.status.apiMissing', 'App API is not available in this window.');
            return;
        }

        statusEl.textContent = t('support.status.loadingHelpDoc', 'Loading help doc...');
        const response = await emubro.invoke('help:docs:get', { id });
        if (!response?.success || !response?.doc) {
            statusEl.textContent = String(response?.message || t('support.status.helpDocFailed', 'Failed to open help doc.'));
            return;
        }

        currentHelpDocId = String(response.doc.id || id).trim();
        persistHelpState();
        renderHelpDoc(response.doc);
        helpListEl.querySelectorAll('.support-help-item').forEach((button) => button.classList.remove('is-active'));
        helpListEl.querySelectorAll('.support-help-item').forEach((button) => {
            if (String(button?.dataset?.helpDocId || '').trim() === currentHelpDocId) {
                button.classList.add('is-active');
            }
        });
        statusEl.textContent = t('support.status.helpDocReady', 'Help doc loaded.');
    };

    const refreshHelpDocs = async (options = {}) => {
        if (!emubro || typeof emubro.invoke !== 'function') {
            statusEl.textContent = t('support.status.apiMissing', 'App API is not available in this window.');
            return;
        }
        const query = String(helpQueryInput.value || '').trim();
        persistHelpState();
        helpDocsLoaded = true;
        statusEl.textContent = t('support.status.loadingHelpList', 'Loading help docs...');
        const response = await emubro.invoke('help:docs:list', { query, limit: 200 });
        if (!response?.success) {
            helpListEl.innerHTML = `<div class="support-help-empty">${escapeHtml(String(response?.message || t('support.status.helpListFailed', 'Failed to load help docs.')))}</div>`;
            statusEl.textContent = String(response?.message || t('support.status.helpListFailed', 'Failed to load help docs.'));
            return;
        }
        const docs = Array.isArray(response.docs) ? response.docs : [];
        renderHelpList(docs);
        const shouldOpenFirst = !!options.openFirst && docs.length > 0;
        const hasSelected = !!currentHelpDocId && docs.some((doc) => String(doc?.id || '').trim() === currentHelpDocId);
        if (!hasSelected && shouldOpenFirst) {
            currentHelpDocId = String(docs[0]?.id || '').trim();
        }
        if (currentHelpDocId && docs.some((doc) => String(doc?.id || '').trim() === currentHelpDocId)) {
            await openHelpDoc(currentHelpDocId);
            return;
        }
        renderHelpDoc(null);
        statusEl.textContent = t('support.status.helpListReady', 'Help docs loaded.');
    };

    const setMode = (nextMode, options = {}) => {
        const raw = String(nextMode || '').trim().toLowerCase();
        const normalized = (raw === 'chat' || raw === 'help') ? raw : 'troubleshoot';
        currentMode = normalized;
        syncContextWindowMessages({ persist: true, rerenderThread: false });
        modeButtons.forEach((button) => {
            const isActive = String(button.dataset.supportMode || '') === normalized;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        const isChat = normalized === 'chat';
        const isHelp = normalized === 'help';
        if (isHelp && voiceListening) {
            stopVoiceInput(true);
        }
        gamesContainer.classList.toggle('support-mode-chat', isChat);
        gamesContainer.classList.toggle('support-mode-help', isHelp);
        llmOnlyEls.forEach((el) => {
            el.style.display = isHelp ? 'none' : '';
        });
        helpOnlyEls.forEach((el) => {
            el.style.display = isHelp ? '' : 'none';
        });
        summaryLabelEl.textContent = isChat
            ? t('support.chatMessageLabel', 'Message')
            : t('support.issueSummaryLabel', 'Short problem summary');
        issueSummaryInput.placeholder = isChat
            ? t('support.chatMessagePlaceholder', 'Ask anything about emuBro features, settings, tools, launchers, or emulator setup...')
            : t('support.issueSummaryPlaceholder', 'e.g. Game boots to black screen after intro');
        runBtn.textContent = isChat
            ? t('support.send', 'Send')
            : t('support.getHelp', 'Get Help');
        outputTitleEl.textContent = isHelp
            ? t('support.helpTitle', 'Help Docs')
            : (isChat ? t('support.conversation', 'Conversation') : t('support.suggestedFixSteps', 'Suggested Fix Steps'));
        outputEl.style.display = isChat ? 'none' : '';
        chatThreadEl.style.display = isChat ? '' : 'none';
        if (isHelp) {
            outputEl.style.display = '';
            chatThreadEl.style.display = 'none';
            if (!helpDocsLoaded) {
                void refreshHelpDocs({ openFirst: true });
            } else if (currentHelpDocId) {
                void openHelpDoc(currentHelpDocId);
            } else {
                renderHelpDoc(null);
            }
        } else if (isChat) {
            syncChatInputFromSummary();
            renderChatThread();
        } else if (!String(outputEl.textContent || '').trim()) {
            outputEl.innerHTML = renderSupportMarkdown(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'));
        }
        if (options.persist !== false) {
            persistDraft();
        }
        updateVoiceButtonState();
        updateChatComposerState();
    };

    [issueTypeSelect, issueSummaryInput, platformInput, emulatorInput, errorTextInput, detailsInput].forEach((input) => {
        input.addEventListener('input', persistDraft);
        input.addEventListener('change', persistDraft);
    });

    helpQueryInput.addEventListener('input', persistHelpState);
    helpQueryInput.addEventListener('change', persistHelpState);
    helpQueryInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            void refreshHelpDocs({ openFirst: true });
        }
    });

    searchHelpBtn.addEventListener('click', () => {
        void refreshHelpDocs({ openFirst: true });
    });

    reloadHelpBtn.addEventListener('click', () => {
        helpDocsLoaded = false;
        void refreshHelpDocs({ openFirst: true });
    });

    helpListEl.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target.closest('[data-help-doc-id]') : null;
        if (!target) return;
        const id = String(target.getAttribute('data-help-doc-id') || '').trim();
        if (!id) return;
        void openHelpDoc(id);
    });

    modeButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setMode(button.dataset.supportMode, { persist: true });
        });
        button.addEventListener('keydown', (event) => {
            const currentIndex = modeButtons.indexOf(button);
            if (currentIndex < 0) return;
            let nextIndex = currentIndex;
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                nextIndex = (currentIndex + 1) % modeButtons.length;
            } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                nextIndex = (currentIndex - 1 + modeButtons.length) % modeButtons.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = modeButtons.length - 1;
            } else {
                return;
            }
            event.preventDefault();
            const nextButton = modeButtons[nextIndex];
            if (!nextButton) return;
            setMode(nextButton.dataset.supportMode, { persist: true });
            nextButton.focus();
        });
    });

    debugToggleInput.addEventListener('change', () => {
        debugSupportEnabled = !!debugToggleInput.checked;
        saveSupportDebugEnabled(debugSupportEnabled);
        syncDebugToggleUi();
    });

    autoSpecsToggleInput.addEventListener('change', () => {
        autoSpecsEnabled = !!autoSpecsToggleInput.checked;
        saveSupportAutoSpecsEnabled(autoSpecsEnabled);
        syncDebugToggleUi();
    });

    webAccessToggleInput.addEventListener('change', () => {
        webAccessEnabled = !!webAccessToggleInput.checked;
        saveSupportWebAccessEnabled(webAccessEnabled);
        syncDebugToggleUi();
    });

    clearBtn.addEventListener('click', () => {
        if (voiceListening) {
            stopVoiceInput(true);
        }
        pendingSupportTask = null;
        pendingTaskBusy = false;
        activeSupportUserMessage = '';
        issueTypeSelect.value = 'launch';
        issueSummaryInput.value = '';
        chatInputEl.value = '';
        platformInput.value = '';
        emulatorInput.value = '';
        errorTextInput.value = '';
        detailsInput.value = '';
        helpQueryInput.value = '';
        currentHelpDocId = '';
        statusEl.textContent = '';
        if (currentMode === 'chat') {
            chatHistory = [];
            saveSupportChatHistory(chatHistory, contextWindowMessages);
            renderChatThread();
        } else if (currentMode === 'help') {
            saveSupportHelpState({ query: '', selectedDocId: '' });
            helpDocsLoaded = false;
            renderHelpDoc(null);
            helpListEl.innerHTML = '';
            void refreshHelpDocs({ openFirst: true });
        } else {
            outputEl.innerHTML = renderSupportMarkdown(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'));
        }
        renderDebugPayload(null);
        persistDraft();
        renderPendingSupportTask();
        updateChatComposerState();
    });

    insertSpecsBtn.addEventListener('click', async () => {
        if (!emubro || typeof emubro.invoke !== 'function') {
            statusEl.textContent = t('support.status.apiMissing', 'App API is not available in this window.');
            return;
        }
        insertSpecsBtn.disabled = true;
        statusEl.textContent = t('support.status.collectingSpecs', 'Collecting system specs...');
        try {
            const result = await emubro.invoke('system:get-specs');
            if (!result?.success) {
                statusEl.textContent = t('support.status.specsFailed', 'Failed to collect system specs.');
                return;
            }
            const specText = formatSupportSystemSpecsText(result);
            if (!specText) {
                statusEl.textContent = t('support.status.specsFailed', 'Failed to collect system specs.');
                return;
            }
            detailsInput.value = upsertPcSpecsBlock(detailsInput.value, specText);
            persistDraft();
            statusEl.textContent = t('support.status.specsInserted', 'System specs inserted into details.');
        } catch (_error) {
            statusEl.textContent = t('support.status.specsFailed', 'Failed to collect system specs.');
        } finally {
            insertSpecsBtn.disabled = false;
        }
    });

    voiceInputBtn.addEventListener('click', () => {
        if (voiceListening) {
            stopVoiceInput();
            return;
        }
        void startVoiceInput();
    });

    approveTaskBtn.addEventListener('click', async () => {
        if (approveTaskBtn.disabled) return;
        await approvePendingSupportTask();
    });

    dismissTaskBtn.addEventListener('click', () => {
        if (dismissTaskBtn.disabled) return;
        dismissPendingSupportTask();
    });

    const supportStreamUnsubscribe = subscribeToSupportStream((payload) => {
        if (!payload || typeof payload !== 'object') return;
        consumeSupportStreamEvent(payload);
    });

    const runSupportRequest = async ({ skipUserHistoryAppend = false, taskDepth = 0, libraryMatchesOverride = null, selfTaskDocsOverride = null, taskResultOverride = null } = {}) => {
        if (currentMode === 'help') {
            return;
        }
        if (voiceListening) {
            stopVoiceInput(true);
        }
        const formState = collectFormState();
        formState.issueSummary = resolveSupportIssueSummary(formState.issueSummary, {
            allowHistoryFallback: !!skipUserHistoryAppend
        });
        persistDraft();

        if (!formState.issueSummary) {
            statusEl.textContent = currentMode === 'chat'
                ? t('support.status.addQuestion', 'Type a question first.')
                : t('support.status.addSummary', 'Add a short problem summary first.');
            if (currentMode === 'chat') chatInputEl.focus();
            else issueSummaryInput.focus();
            return;
        }

        if (!emubro || typeof emubro.invoke !== 'function') {
            statusEl.textContent = t('support.status.apiMissing', 'App API is not available in this window.');
            return;
        }

        syncContextWindowMessages({ persist: true, rerenderThread: false });

        const libraryMatches = await resolveSupportLibraryContext(formState, { overrideMatches: libraryMatchesOverride });
        const payload = buildSupportPayload(formState, {
            chatHistory: normalizeSupportChatHistory(chatHistory, contextWindowMessages),
            debugSupport: debugSupportEnabled,
            allowAutoSpecsFetch: autoSpecsEnabled,
            allowWebAccess: webAccessEnabled,
            libraryMatches
        });
        if (selfTaskDocsOverride && typeof selfTaskDocsOverride === 'object' && selfTaskDocsOverride.active) {
            payload.selfTaskDocs = selfTaskDocsOverride;
        }
        if (taskResultOverride && typeof taskResultOverride === 'object' && taskResultOverride.active) {
            payload.lastTaskResult = taskResultOverride;
        }
        const useLiveStream = shouldUseSupportStreaming(payload);
        const nextStreamRequestId = useLiveStream ? buildSupportStreamRequestId() : '';
        if (useLiveStream) {
            payload.streamResponse = true;
            payload.streamRequestId = nextStreamRequestId;
        }
        const providerLabel = String(payload.provider || (payload.llmMode === 'client' ? 'relay' : 'support engine')).trim();

        if (currentMode === 'chat' && !skipUserHistoryAppend) {
            const userMessage = String(formState.issueSummary || '').trim();
            chatHistory = normalizeSupportChatHistory([
                ...chatHistory,
                { role: 'user', text: userMessage }
            ], contextWindowMessages);
            activeSupportUserMessage = userMessage;
            saveSupportChatHistory(chatHistory, contextWindowMessages);
            renderChatThread();
            payload.chatHistory = chatHistory;
        } else if (!skipUserHistoryAppend) {
            activeSupportUserMessage = String(formState.issueSummary || '').trim();
        }

        runningRequest = true;
        pendingSupportTask = null;
        pendingTaskBusy = false;
        runBtn.disabled = true;
        streamRequestId = nextStreamRequestId;
        liveResponseRaw = '';
        liveResponseText = '';
        renderChatThread();
        updateChatComposerState();
        statusEl.textContent = currentMode === 'chat'
            ? t('support.status.generatingChat', 'Generating reply with {{provider}}...', { provider: providerLabel })
            : t('support.status.generating', 'Generating support steps with {{provider}}...', { provider: providerLabel });
        if (currentMode !== 'chat') {
            outputEl.innerHTML = renderSupportMarkdown(t('support.status.thinking', 'Thinking...'));
        }

        try {
            const response = await emubro.invoke('suggestions:emulation-support', payload);
            if (!response?.success) {
                statusEl.textContent = String(response?.message || t('support.status.requestFailed', 'Support request failed.'));
                if (debugSupportEnabled) {
                    renderDebugPayload(response?.debug || { error: response?.message || 'Support request failed.' });
                }
                if (currentMode !== 'chat') {
                    outputEl.innerHTML = renderSupportMarkdown(t('support.status.noResponse', 'No response available.'));
                }
                return;
            }

            const answerText = String(response?.answer || '').trim();
            const providerError = String(response?.providerError || response?.debug?.providerError || '').trim();
            const usedProviderFallback = String(response?.provider || '').trim().toLowerCase() === 'local-fallback';
            const assistantEnvelope = parseSupportAssistantEnvelope(answerText);
            const assistantTask = assistantEnvelope?.task || parseSupportAssistantTask(answerText);
            if (assistantTask) {
                const envelopeMessage = assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_REPLY
                    ? String(assistantEnvelope.message || '').trim()
                    : '';
                const canAutoExecute = shouldAutoExecuteSupportTask(assistantTask, autoSpecsEnabled);
                if (envelopeMessage) {
                    appendSupportAssistantMessage(envelopeMessage);
                }
                if (taskDepth >= SUPPORT_MAX_AUTO_TASK_DEPTH) {
                    statusEl.textContent = assistantEnvelope?.message || 'Assistant requested another action even though the previous task already ran.';
                    return;
                }
                if (canAutoExecute) {
                    await executeSupportAssistantTask(assistantTask, {
                        skipUserHistoryAppend: true,
                        taskDepth: taskDepth + 1
                    });
                    return;
                }
                pendingSupportTask = buildSupportTaskApproval(assistantTask);
                renderPendingSupportTask();
                statusEl.textContent = assistantEnvelope?.message || pendingSupportTask.message;
                return;
            }

            const resolvedReplyText = assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_REPLY
                ? String(assistantEnvelope.message || '').trim()
                : (assistantEnvelope?.kind === SUPPORT_RESPONSE_TYPE_BLOCKED
                    ? String(assistantEnvelope.message || assistantEnvelope.reason || '').trim()
                    : answerText);
            const finalReplyText = resolvedReplyText || String(liveResponseText || '').trim();

            appendSupportAssistantMessage(finalReplyText || t('support.status.noSupportText', 'No support text returned.'));
            if (debugSupportEnabled) {
                renderDebugPayload(response?.debug || null);
            }
            statusEl.textContent = providerError && usedProviderFallback
                ? `LLM provider error: ${providerError}`
                : t('support.status.ready', 'Support response ready ({{provider}}).', {
                    provider: String(response.provider || providerLabel || 'support').trim()
                });
        } catch (error) {
            statusEl.textContent = String(error?.message || error || t('support.status.requestFailed', 'Support request failed.'));
            if (debugSupportEnabled) {
                renderDebugPayload({ exception: String(error?.message || error || 'Unknown error') });
            }
            if (currentMode !== 'chat') {
                outputEl.innerHTML = renderSupportMarkdown(t('support.status.noResponse', 'No response available.'));
            }
        } finally {
            runningRequest = false;
            runBtn.disabled = false;
            resetLiveResponse();
            renderPendingSupportTask();
            if (currentMode === 'chat') renderChatThread();
            updateChatComposerState();
        }
    };

    runBtn.addEventListener('click', async () => {
        await runSupportRequest();
    });

    chatInputEl.addEventListener('input', () => {
        issueSummaryInput.value = chatInputEl.value;
        persistDraft();
        updateChatComposerState();
    });

    chatInputEl.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        event.preventDefault();
        if (chatSendBtn.disabled) return;
        void runSupportRequest();
    });

    chatSendBtn.addEventListener('click', async () => {
        if (chatSendBtn.disabled) return;
        await runSupportRequest();
    });

    chatThreadEl.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target.closest('[data-support-attachment-open="1"]') : null;
        if (!target) return;
        const entryHost = target.closest('[data-support-entry-index]');
        const entryIndex = Number(entryHost?.getAttribute('data-support-entry-index') || -1);
        const attachmentIndex = Number(target.getAttribute('data-support-attachment-index') || -1);
        const entry = Number.isFinite(entryIndex) && entryIndex >= 0 ? chatHistory[entryIndex] : null;
        const attachment = Array.isArray(entry?.attachments) && Number.isFinite(attachmentIndex) && attachmentIndex >= 0
            ? entry.attachments[attachmentIndex]
            : null;
        openAttachmentLightbox(attachment);
    });

    chatThreadEl.addEventListener('keydown', (event) => {
        const target = event.target instanceof HTMLElement ? event.target.closest('[data-support-attachment-open="1"]') : null;
        if (!target) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const entryHost = target.closest('[data-support-entry-index]');
        const entryIndex = Number(entryHost?.getAttribute('data-support-entry-index') || -1);
        const attachmentIndex = Number(target.getAttribute('data-support-attachment-index') || -1);
        const entry = Number.isFinite(entryIndex) && entryIndex >= 0 ? chatHistory[entryIndex] : null;
        const attachment = Array.isArray(entry?.attachments) && Number.isFinite(attachmentIndex) && attachmentIndex >= 0
            ? entry.attachments[attachmentIndex]
            : null;
        openAttachmentLightbox(attachment);
    });

    lightboxEl.addEventListener('click', (event) => {
        if (event.target === lightboxEl) {
            closeAttachmentLightbox();
        }
    });

    lightboxCloseBtn.addEventListener('click', () => {
        closeAttachmentLightbox();
    });

    const onSupportViewKeydown = (event) => {
        if (event.key === 'Escape' && !lightboxEl.hidden) {
            closeAttachmentLightbox();
        }
    };

    if (typeof document !== 'undefined') {
        document.addEventListener('keydown', onSupportViewKeydown);
    }

    setMode(currentMode, { persist: false });
    renderContextWindowBadge();
    syncDebugToggleUi();
    updateVoiceButtonState();
    updateChatComposerState();
    renderPendingSupportTask();
    renderDebugPayload(null);

    activeSupportViewDisposer = () => {
        try {
            stopVoiceInput(true);
        } catch (_error) {}
        if (typeof supportStreamUnsubscribe === 'function') {
            try {
                supportStreamUnsubscribe();
            } catch (_error) {}
        }
        voiceRecognition = null;
        voiceListening = false;
        voiceStopRequested = false;
        resetLiveResponse();
        closeAttachmentLightbox();
        if (typeof document !== 'undefined') {
            document.removeEventListener('keydown', onSupportViewKeydown);
        }
    };
}
