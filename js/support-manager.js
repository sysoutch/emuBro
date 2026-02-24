import {
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings
} from './suggestions-settings';

const emubro = window.emubro;
const SUPPORT_DRAFT_STORAGE_KEY = 'emuBro.supportDraft.v1';
const SUPPORT_CHAT_HISTORY_STORAGE_KEY = 'emuBro.supportChatHistory.v1';
const SUPPORT_DEBUG_STORAGE_KEY = 'emuBro.supportDebug.v1';
const SUPPORT_AUTO_SPECS_STORAGE_KEY = 'emuBro.supportAutoSpecs.v1';
const SUPPORT_WEB_ACCESS_STORAGE_KEY = 'emuBro.supportWebAccess.v1';
const SUPPORT_HELP_STATE_STORAGE_KEY = 'emuBro.supportHelpState.v1';
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

function normalizeSupportChatHistory(raw) {
    const list = Array.isArray(raw) ? raw : [];
    return list
        .map((entry) => ({
            role: String(entry?.role || '').trim().toLowerCase() === 'assistant' ? 'assistant' : 'user',
            text: String(entry?.text || '').trim()
        }))
        .filter((entry) => !!entry.text)
        .slice(-20);
}

function loadSupportChatHistory() {
    try {
        const raw = localStorage.getItem(SUPPORT_CHAT_HISTORY_STORAGE_KEY);
        if (!raw) return [];
        return normalizeSupportChatHistory(JSON.parse(raw));
    } catch (_error) {
        return [];
    }
}

function saveSupportChatHistory(history) {
    try {
        localStorage.setItem(SUPPORT_CHAT_HISTORY_STORAGE_KEY, JSON.stringify(normalizeSupportChatHistory(history)));
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
        allowWebAccess: !!extra?.allowWebAccess
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

function renderSupportChatTranscript(history = []) {
    const rows = Array.isArray(history) ? history : [];
    if (!rows.length) {
        return `<div class="support-chat-empty">${escapeHtml(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'))}</div>`;
    }
    return rows.map((entry) => {
        const role = String(entry?.role || '').trim().toLowerCase() === 'assistant' ? 'assistant' : 'user';
        const text = String(entry?.text || '').trim();
        const roleLabel = role === 'assistant'
            ? t('support.roleAssistant', 'Assistant')
            : t('support.roleUser', 'You');
        const body = role === 'assistant'
            ? renderSupportMarkdown(text)
            : `<p>${escapeHtml(text)}</p>`;
        return `
            <article class="support-chat-item support-chat-item-${role}">
                <header>${escapeHtml(roleLabel)}</header>
                <div class="support-chat-body support-output-markdown">${body}</div>
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
    let chatHistory = loadSupportChatHistory();
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
        <section class="support-view-shell">
            <article class="support-hero">
                <span class="support-hero-badge">${escapeHtml(t('support.heroBadge', 'LLM Troubleshooter'))}</span>
                <h2 class="support-hero-title">${escapeHtml(t('support.heroTitle', 'Support Assistant'))}</h2>
                <p class="support-hero-copy">
                    ${escapeHtml(t('support.heroCopy', 'Describe your emulator issue and get practical fix steps using your configured AI provider.'))}
                </p>
                <p class="support-hero-hint">${escapeHtml(t('support.heroHint', 'Provider/model come from Settings -> AI / LLM.'))}</p>
            </article>

            <article class="support-form-card">
                <div class="support-mode-switch">
                    <span>${escapeHtml(t('support.modeLabel', 'Mode'))}</span>
                    <button type="button" class="action-btn small" data-support-mode="troubleshoot">${escapeHtml(t('support.modeTroubleshoot', 'Troubleshoot'))}</button>
                    <button type="button" class="action-btn small" data-support-mode="chat">${escapeHtml(t('support.modeChat', 'General Chat'))}</button>
                    <button type="button" class="action-btn small" data-support-mode="help">${escapeHtml(t('support.modeHelp', 'Help Docs'))}</button>
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
                <div class="support-form-grid" data-support-llm-only>
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

                <label class="support-field" data-support-llm-only>
                    <span data-support-summary-label>${escapeHtml(t('support.issueSummaryLabel', 'Short problem summary'))}</span>
                    <input type="text" data-support-input="issue-summary" value="${escapeHtml(draft.issueSummary)}" placeholder="${escapeHtml(t('support.issueSummaryPlaceholder', 'e.g. Game boots to black screen after intro'))}" />
                </label>

                <label class="support-field" data-support-llm-only>
                    <span>${escapeHtml(t('support.errorTextOptionalLabel', 'Error message (optional)'))}</span>
                    <input type="text" data-support-input="error-text" value="${escapeHtml(draft.errorText)}" placeholder="${escapeHtml(t('support.errorTextPlaceholder', 'Paste exact error text if you have one'))}" />
                </label>

                <label class="support-field" data-support-llm-only>
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
                    <button type="button" class="action-btn small" data-support-action="insert-specs" data-support-llm-only>${escapeHtml(t('support.insertPcSpecs', 'Insert PC Specs'))}</button>
                    <button type="button" class="action-btn small" data-support-action="voice-input" data-support-llm-only>${escapeHtml(t('support.voiceInput', 'Voice Input'))}</button>
                    <button type="button" class="action-btn launch-btn" data-support-action="run" data-support-llm-only>${escapeHtml(t('support.getHelp', 'Get Help'))}</button>
                    <button type="button" class="action-btn small" data-support-action="clear">${escapeHtml(t('support.clear', 'Clear'))}</button>
                </div>
                <p class="support-status" data-support-status aria-live="polite"></p>
            </article>

            <article class="support-output-card">
                <h3 data-support-output-title>${escapeHtml(t('support.suggestedFixSteps', 'Suggested Fix Steps'))}</h3>
                <div class="support-output-pre support-output-markdown" data-support-output>${renderSupportMarkdown(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'))}</div>
                <div class="support-chat-thread" data-support-chat-thread></div>
                <details class="support-debug-panel" data-support-debug-panel ${debugSupportEnabled ? 'open' : ''}>
                    <summary>${escapeHtml(t('support.debugDetails', 'Planner / Retrieval Details'))}</summary>
                    <pre data-support-debug-content>${escapeHtml(t('support.debugEmpty', 'Debug output will appear after a request.'))}</pre>
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
    const outputTitleEl = gamesContainer.querySelector('[data-support-output-title]');
    const summaryLabelEl = gamesContainer.querySelector('[data-support-summary-label]');
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

    if (!issueTypeSelect || !issueSummaryInput || !platformInput || !emulatorInput || !errorTextInput || !detailsInput || !statusEl || !outputEl || !runBtn || !clearBtn || !insertSpecsBtn || !voiceInputBtn || !chatThreadEl || !outputTitleEl || !summaryLabelEl || !debugToggleInput || !autoSpecsToggleInput || !webAccessToggleInput || !debugPanelEl || !debugContentEl || !helpQueryInput || !helpListEl || !searchHelpBtn || !reloadHelpBtn) {
        return;
    }

    const renderDebugPayload = (debugPayload = null) => {
        if (!debugContentEl) return;
        if (!debugPayload || typeof debugPayload !== 'object') {
            debugContentEl.textContent = t('support.debugEmpty', 'Debug output will appear after a request.');
            return;
        }
        try {
            debugContentEl.textContent = JSON.stringify(debugPayload, null, 2);
        } catch (_error) {
            debugContentEl.textContent = String(debugPayload);
        }
    };

    const syncDebugToggleUi = () => {
        debugToggleInput.checked = !!debugSupportEnabled;
        autoSpecsToggleInput.checked = !!autoSpecsEnabled;
        webAccessToggleInput.checked = !!webAccessEnabled;
        if (debugPanelEl) {
            debugPanelEl.style.display = debugSupportEnabled ? '' : 'none';
            if (debugSupportEnabled) debugPanelEl.setAttribute('open', 'open');
            else debugPanelEl.removeAttribute('open');
        }
    };

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    let voiceRecognition = null;
    let voiceListening = false;
    let voiceStopRequested = false;

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

    const persistDraft = () => {
        saveSupportDraft(collectFormState());
    };

    const renderChatThread = () => {
        chatThreadEl.innerHTML = renderSupportChatTranscript(chatHistory);
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
        modeButtons.forEach((button) => {
            button.classList.toggle('is-active', String(button.dataset.supportMode || '') === normalized);
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
            renderChatThread();
        } else if (!String(outputEl.textContent || '').trim()) {
            outputEl.innerHTML = renderSupportMarkdown(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'));
        }
        if (options.persist !== false) {
            persistDraft();
        }
        updateVoiceButtonState();
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
        issueTypeSelect.value = 'launch';
        issueSummaryInput.value = '';
        platformInput.value = '';
        emulatorInput.value = '';
        errorTextInput.value = '';
        detailsInput.value = '';
        helpQueryInput.value = '';
        currentHelpDocId = '';
        statusEl.textContent = '';
        if (currentMode === 'chat') {
            chatHistory = [];
            saveSupportChatHistory(chatHistory);
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
            const specText = String(result?.specs?.text || '').trim();
            if (!specText) {
                statusEl.textContent = t('support.status.specsFailed', 'Failed to collect system specs.');
                return;
            }
            const block = `\n\n[PC Specs]\n${specText}`;
            detailsInput.value = `${String(detailsInput.value || '').trim()}${block}`.trim();
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

    runBtn.addEventListener('click', async () => {
        if (currentMode === 'help') {
            return;
        }
        if (voiceListening) {
            stopVoiceInput(true);
        }
        const formState = collectFormState();
        persistDraft();

        if (!formState.issueSummary) {
            statusEl.textContent = currentMode === 'chat'
                ? t('support.status.addQuestion', 'Type a question first.')
                : t('support.status.addSummary', 'Add a short problem summary first.');
            issueSummaryInput.focus();
            return;
        }

        if (!emubro || typeof emubro.invoke !== 'function') {
            statusEl.textContent = t('support.status.apiMissing', 'App API is not available in this window.');
            return;
        }

        const payload = buildSupportPayload(formState, {
            chatHistory,
            debugSupport: debugSupportEnabled,
            allowAutoSpecsFetch: autoSpecsEnabled,
            allowWebAccess: webAccessEnabled
        });
        if (!payload.model) {
            // In client mode the host side provider/model settings are used.
            if (payload.llmMode !== 'client') {
                statusEl.textContent = t('support.status.missingModel', 'Set an LLM model first in Settings -> AI / LLM.');
                return;
            }
        }
        if (payload.llmMode === 'client' && !payload.relayHostUrl) {
            statusEl.textContent = t('support.status.missingRelayHost', 'Set a relay host URL first in Settings -> AI / LLM.');
            return;
        }
        if (payload.llmMode !== 'client' && !payload.baseUrl) {
            statusEl.textContent = t('support.status.missingBaseUrl', 'Set a provider URL first in Settings -> AI / LLM.');
            return;
        }
        if (payload.llmMode !== 'client' && (payload.provider === 'openai' || payload.provider === 'gemini') && !payload.apiKey) {
            statusEl.textContent = t('support.status.missingApiKey', 'API key is required for the selected provider.');
            return;
        }

        if (currentMode === 'chat') {
            const userMessage = String(formState.issueSummary || '').trim();
            chatHistory = normalizeSupportChatHistory([
                ...chatHistory,
                { role: 'user', text: userMessage }
            ]);
            saveSupportChatHistory(chatHistory);
            renderChatThread();
            payload.chatHistory = chatHistory;
        }

        runBtn.disabled = true;
        statusEl.textContent = currentMode === 'chat'
            ? t('support.status.generatingChat', 'Generating reply with {{provider}}...', { provider: payload.provider })
            : t('support.status.generating', 'Generating support steps with {{provider}}...', { provider: payload.provider });
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
            if (currentMode === 'chat') {
                if (answerText) {
                    chatHistory = normalizeSupportChatHistory([
                        ...chatHistory,
                        { role: 'assistant', text: answerText }
                    ]);
                    saveSupportChatHistory(chatHistory);
                    renderChatThread();
                    issueSummaryInput.value = '';
                    persistDraft();
                }
            } else {
                outputEl.innerHTML = renderSupportMarkdown(answerText || t('support.status.noSupportText', 'No support text returned.'));
            }
            if (debugSupportEnabled) {
                renderDebugPayload(response?.debug || null);
            }
            statusEl.textContent = t('support.status.ready', 'Support response ready ({{provider}}).', { provider: String(response.provider || payload.provider || '').trim() });
        } catch (error) {
            statusEl.textContent = String(error?.message || error || t('support.status.requestFailed', 'Support request failed.'));
            if (debugSupportEnabled) {
                renderDebugPayload({ exception: String(error?.message || error || 'Unknown error') });
            }
            if (currentMode !== 'chat') {
                outputEl.innerHTML = renderSupportMarkdown(t('support.status.noResponse', 'No response available.'));
            }
        } finally {
            runBtn.disabled = false;
        }
    });

    setMode(currentMode, { persist: false });
    syncDebugToggleUi();
    updateVoiceButtonState();
    renderDebugPayload(null);

    activeSupportViewDisposer = () => {
        try {
            stopVoiceInput(true);
        } catch (_error) {}
        voiceRecognition = null;
        voiceListening = false;
        voiceStopRequested = false;
    };
}
