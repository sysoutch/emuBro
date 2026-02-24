import { clampNumber } from './background-utils';
import {
    loadSuggestionSettings,
    normalizeSuggestionProvider,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings';

export function updateLlmThemeRangeValueLabel(inputId, valueId) {
    const input = document.getElementById(inputId);
    const value = document.getElementById(valueId);
    if (!input || !value) return;
    const parsed = clampNumber(Number.parseInt(String(input.value || '0'), 10), 0, 100);
    value.textContent = `${parsed}%`;
}

export function getThemeLlmConfig() {
    const settings = loadSuggestionSettings(localStorage);
    const provider = normalizeSuggestionProvider(settings?.provider);
    const model = String(settings?.models?.[provider] || '').trim();
    const baseUrl = String(settings?.baseUrls?.[provider] || '').trim();
    const apiKey = String(settings?.apiKeys?.[provider] || '').trim();
    return { provider, model, baseUrl, apiKey, ...getSuggestionLlmRoutingSettings(settings) };
}
