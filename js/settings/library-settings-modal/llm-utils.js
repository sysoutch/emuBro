export function normalizeLlmMode(value) {
    return String(value || '').trim().toLowerCase() === 'client' ? 'client' : 'host';
}

export function normalizeRelayAccessMode(value) {
    const mode = String(value || '').trim().toLowerCase();
    if (mode === 'whitelist' || mode === 'blacklist') return mode;
    return 'open';
}

export function normalizeRelayAddressList(values) {
    const rows = Array.isArray(values)
        ? values
        : String(values || '')
            .split(/[\r\n,;]+/g)
            .map((row) => String(row || '').trim())
            .filter(Boolean);
    const seen = new Set();
    const out = [];
    rows.forEach((row) => {
        const key = row.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(row);
    });
    return out;
}

export function normalizeRelayPort(value, fallback = 42141) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    const rounded = Math.round(parsed);
    if (rounded < 1 || rounded > 65535) return fallback;
    return rounded;
}

export function normalizeSupportContextWindowMessages(value, fallback = 20) {
    const allowed = [10, 20, 40, 80];
    const normalizedFallback = allowed.includes(Number(fallback)) ? Number(fallback) : 20;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return normalizedFallback;
    const rounded = Math.round(parsed);
    return allowed.includes(rounded) ? rounded : normalizedFallback;
}

export function createInitialLlmDraft(llmSettings = {}) {
    return {
        provider: String(llmSettings.provider || 'ollama'),
        llmMode: normalizeLlmMode(llmSettings.llmMode),
        contextWindowMessages: normalizeSupportContextWindowMessages(llmSettings.contextWindowMessages, 20),
        models: llmSettings.models || {},
        baseUrls: llmSettings.baseUrls || {},
        apiKeys: llmSettings.apiKeys || {},
        relay: {
            hostUrl: String(llmSettings.relay?.hostUrl || '').trim(),
            authToken: String(llmSettings.relay?.authToken || '').trim(),
            port: normalizeRelayPort(llmSettings.relay?.port, 42141),
            enabled: !!llmSettings.relay?.enabled,
            accessMode: normalizeRelayAccessMode(llmSettings.relay?.accessMode),
            whitelist: normalizeRelayAddressList(llmSettings.relay?.whitelist),
            blacklist: normalizeRelayAddressList(llmSettings.relay?.blacklist)
        },
        promptTemplate: llmSettings.promptTemplate || ''
    };
}
