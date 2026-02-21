import { loadSuggestionSettings, normalizeSuggestionProvider } from './suggestions-settings';

const emubro = window.emubro;
const SUPPORT_DRAFT_STORAGE_KEY = 'emuBro.supportDraft.v1';

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
    if (i18nRef && typeof i18nRef.t === 'function') {
        const translated = i18nRef.t(key, data);
        if (translated && translated !== key) return String(translated);
    }
    return applyTemplate(String(fallback || key), data);
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
    return {
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

function buildSupportPayload(formState) {
    const settings = loadSuggestionSettings();
    const provider = normalizeSuggestionProvider(settings.provider);
    const model = String(settings.models?.[provider] || '').trim();
    const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
    const apiKey = String(settings.apiKeys?.[provider] || '').trim();

    return {
        provider,
        model,
        baseUrl,
        apiKey,
        issueType: String(formState.issueType || 'other'),
        issueTypeLabel: getIssueTypeLabel(formState.issueType),
        issueSummary: String(formState.issueSummary || '').trim(),
        platform: String(formState.platform || '').trim(),
        emulator: String(formState.emulator || '').trim(),
        errorText: String(formState.errorText || '').trim(),
        details: String(formState.details || '').trim()
    };
}

export function showSupportView() {
    const gamesContainer = document.getElementById('games-container');
    const gamesHeader = document.getElementById('games-header');
    if (!gamesContainer) return;

    if (gamesHeader) gamesHeader.textContent = t('support.title', 'Support');

    const draft = loadSupportDraft();

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
                <div class="support-form-grid">
                    <label class="support-field">
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

                <label class="support-field">
                    <span>${escapeHtml(t('support.issueSummaryLabel', 'Short problem summary'))}</span>
                    <input type="text" data-support-input="issue-summary" value="${escapeHtml(draft.issueSummary)}" placeholder="${escapeHtml(t('support.issueSummaryPlaceholder', 'e.g. Game boots to black screen after intro'))}" />
                </label>

                <label class="support-field">
                    <span>${escapeHtml(t('support.errorTextOptionalLabel', 'Error message (optional)'))}</span>
                    <input type="text" data-support-input="error-text" value="${escapeHtml(draft.errorText)}" placeholder="${escapeHtml(t('support.errorTextPlaceholder', 'Paste exact error text if you have one'))}" />
                </label>

                <label class="support-field">
                    <span>${escapeHtml(t('support.detailsLabel', 'Details'))}</span>
                    <textarea rows="7" data-support-input="details" placeholder="${escapeHtml(t('support.detailsPlaceholder', 'What did you try already? What changed recently? Any hardware/driver info?'))}">${escapeHtml(draft.details)}</textarea>
                </label>

                <div class="support-actions">
                    <button type="button" class="action-btn launch-btn" data-support-action="run">${escapeHtml(t('support.getHelp', 'Get Help'))}</button>
                    <button type="button" class="action-btn small" data-support-action="clear">${escapeHtml(t('support.clear', 'Clear'))}</button>
                </div>
                <p class="support-status" data-support-status aria-live="polite"></p>
            </article>

            <article class="support-output-card">
                <h3>${escapeHtml(t('support.suggestedFixSteps', 'Suggested Fix Steps'))}</h3>
                <pre class="support-output-pre" data-support-output>${escapeHtml(t('support.initialOutput', 'Run a support request to get troubleshooting steps.'))}</pre>
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
    const runBtn = gamesContainer.querySelector('[data-support-action="run"]');
    const clearBtn = gamesContainer.querySelector('[data-support-action="clear"]');

    if (!issueTypeSelect || !issueSummaryInput || !platformInput || !emulatorInput || !errorTextInput || !detailsInput || !statusEl || !outputEl || !runBtn || !clearBtn) {
        return;
    }

    const collectFormState = () => ({
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

    [issueTypeSelect, issueSummaryInput, platformInput, emulatorInput, errorTextInput, detailsInput].forEach((input) => {
        input.addEventListener('input', persistDraft);
        input.addEventListener('change', persistDraft);
    });

    clearBtn.addEventListener('click', () => {
        issueTypeSelect.value = 'launch';
        issueSummaryInput.value = '';
        platformInput.value = '';
        emulatorInput.value = '';
        errorTextInput.value = '';
        detailsInput.value = '';
        statusEl.textContent = '';
        outputEl.textContent = t('support.initialOutput', 'Run a support request to get troubleshooting steps.');
        persistDraft();
    });

    runBtn.addEventListener('click', async () => {
        const formState = collectFormState();
        persistDraft();

        if (!formState.issueSummary) {
            statusEl.textContent = t('support.status.addSummary', 'Add a short problem summary first.');
            issueSummaryInput.focus();
            return;
        }

        if (!emubro || typeof emubro.invoke !== 'function') {
            statusEl.textContent = t('support.status.apiMissing', 'App API is not available in this window.');
            return;
        }

        const payload = buildSupportPayload(formState);
        if (!payload.model) {
            statusEl.textContent = t('support.status.missingModel', 'Set an LLM model first in Settings -> AI / LLM.');
            return;
        }
        if (!payload.baseUrl) {
            statusEl.textContent = t('support.status.missingBaseUrl', 'Set a provider URL first in Settings -> AI / LLM.');
            return;
        }
        if ((payload.provider === 'openai' || payload.provider === 'gemini') && !payload.apiKey) {
            statusEl.textContent = t('support.status.missingApiKey', 'API key is required for the selected provider.');
            return;
        }

        runBtn.disabled = true;
        statusEl.textContent = t('support.status.generating', 'Generating support steps with {{provider}}...', { provider: payload.provider });
        outputEl.textContent = t('support.status.thinking', 'Thinking...');

        try {
            const response = await emubro.invoke('suggestions:emulation-support', payload);
            if (!response?.success) {
                statusEl.textContent = String(response?.message || t('support.status.requestFailed', 'Support request failed.'));
                outputEl.textContent = t('support.status.noResponse', 'No response available.');
                return;
            }

            const answerText = String(response?.answer || '').trim();
            outputEl.textContent = answerText || t('support.status.noSupportText', 'No support text returned.');
            statusEl.textContent = t('support.status.ready', 'Support response ready ({{provider}}).', { provider: String(response.provider || payload.provider || '').trim() });
        } catch (error) {
            statusEl.textContent = String(error?.message || error || t('support.status.requestFailed', 'Support request failed.'));
            outputEl.textContent = t('support.status.noResponse', 'No response available.');
        } finally {
            runBtn.disabled = false;
        }
    });
}
