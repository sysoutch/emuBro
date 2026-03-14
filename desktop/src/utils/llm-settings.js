import {
  getDefaultSuggestionSettings,
  getSuggestionLlmRoutingSettings,
  loadSuggestionSettings,
  normalizeSuggestionLlmMode,
  normalizeSuggestionProvider,
  normalizeSuggestionRelayConfig,
  normalizeSuggestionRelayPort,
  normalizeSuggestionScope,
  saveSuggestionSettings
} from "./suggestion-settings";
import { getShellStorageAdapter } from "./shell-storage-cache";

function getStorage(storageRef) {
  return getShellStorageAdapter(storageRef);
}

export function normalizeRelayAddressList(values) {
  const rows = Array.isArray(values)
    ? values
    : String(values || "")
        .split(/[\r\n,;]+/g)
        .map((row) => String(row || "").trim())
        .filter(Boolean);
  const seen = new Set();
  const normalized = [];
  rows.forEach((row) => {
    const key = row.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(row);
  });
  return normalized;
}

export function normalizeDesktopLlmSettings(rawSettings = {}) {
  const defaults = getDefaultSuggestionSettings();
  const source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
  const provider = normalizeSuggestionProvider(source.provider || defaults.provider);
  const relay = normalizeSuggestionRelayConfig(source.relay || defaults.relay);

  return {
    provider,
    llmMode: normalizeSuggestionLlmMode(source.llmMode || defaults.llmMode),
    scope: normalizeSuggestionScope(source.scope || defaults.scope),
    query: String(source.query || ""),
    promptTemplate: String(source.promptTemplate || defaults.promptTemplate || "").trim() || defaults.promptTemplate,
    selectedPlatformOnly: !!source.selectedPlatformOnly,
    relay: {
      ...defaults.relay,
      ...relay,
      whitelist: normalizeRelayAddressList(relay.whitelist),
      blacklist: normalizeRelayAddressList(relay.blacklist),
      port: normalizeSuggestionRelayPort(relay.port, defaults.relay.port)
    },
    models: {
      ...defaults.models,
      ...(source.models && typeof source.models === "object" ? source.models : {})
    },
    baseUrls: {
      ...defaults.baseUrls,
      ...(source.baseUrls && typeof source.baseUrls === "object" ? source.baseUrls : {})
    },
    apiKeys: {
      ...defaults.apiKeys,
      ...(source.apiKeys && typeof source.apiKeys === "object" ? source.apiKeys : {})
    }
  };
}

export function createDefaultDesktopLlmSettings() {
  return normalizeDesktopLlmSettings(getDefaultSuggestionSettings());
}

export function loadDesktopLlmSettings(storageRef) {
  return normalizeDesktopLlmSettings(loadSuggestionSettings(getStorage(storageRef)));
}

export function saveDesktopLlmSettings(settings, storageRef) {
  const normalized = normalizeDesktopLlmSettings(settings);
  return normalizeDesktopLlmSettings(saveSuggestionSettings(normalized, getStorage(storageRef)));
}

export function getActiveLlmProviderState(settings) {
  const normalized = normalizeDesktopLlmSettings(settings);
  const provider = normalizeSuggestionProvider(normalized.provider);
  return {
    provider,
    model: String(normalized.models?.[provider] || "").trim(),
    baseUrl: String(normalized.baseUrls?.[provider] || "").trim(),
    apiKey: String(normalized.apiKeys?.[provider] || "").trim(),
    ...getSuggestionLlmRoutingSettings(normalized)
  };
}

export function buildRelaySyncPayload(settings) {
  const normalized = normalizeDesktopLlmSettings(settings);
  return {
    provider: normalized.provider,
    models: normalized.models,
    baseUrls: normalized.baseUrls,
    apiKeys: normalized.apiKeys,
    relay: {
      enabled: !!normalized.relay?.enabled,
      port: normalizeSuggestionRelayPort(normalized.relay?.port, 42141),
      authToken: String(normalized.relay?.authToken || "").trim(),
      accessMode: String(normalized.relay?.accessMode || "open").trim().toLowerCase(),
      whitelist: normalizeRelayAddressList(normalized.relay?.whitelist),
      blacklist: normalizeRelayAddressList(normalized.relay?.blacklist)
    }
  };
}

export function buildSupportLlmSettings(settings) {
  const normalized = normalizeDesktopLlmSettings(settings);
  return {
    ...getActiveLlmProviderState(normalized),
    relay: {
      ...normalized.relay
    },
    scope: normalized.scope,
    query: normalized.query,
    promptTemplate: normalized.promptTemplate,
    selectedPlatformOnly: normalized.selectedPlatformOnly
  };
}
