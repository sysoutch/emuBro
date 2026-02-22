/**
 * Theme brand control helpers
 */

import { DEFAULT_BASIC_BRAND_MODE } from './presets';
import {
    normalizeBasicBrandStrength,
    normalizeBasicBrandMode,
    normalizeBasicBrandUseAccent
} from './theme-algorithms';

export function updateBasicBrandStrengthValueLabel(strengthValue) {
    const label = document.getElementById('theme-basic-brand-strength-value');
    if (!label) return;
    const normalized = normalizeBasicBrandStrength(strengthValue);
    label.textContent = `${normalized}%`;
}

export function getBasicBrandModeFromControls() {
    const selected = document.querySelector('input[name="theme-basic-brand-mode"]:checked');
    return normalizeBasicBrandMode(selected?.value || DEFAULT_BASIC_BRAND_MODE);
}

export function setBasicBrandModeInControls(modeValue) {
    const mode = normalizeBasicBrandMode(modeValue);
    const radios = document.querySelectorAll('input[name="theme-basic-brand-mode"]');
    if (!radios || radios.length === 0) return;
    radios.forEach((radio) => {
        radio.checked = normalizeBasicBrandMode(radio.value) === mode;
    });
}

export function setBasicBrandControlState(useAccentValue, modeValue = null) {
    const useAccent = normalizeBasicBrandUseAccent(useAccentValue);
    const mode = normalizeBasicBrandMode(modeValue || getBasicBrandModeFromControls());
    const modeInputs = document.querySelectorAll('input[name="theme-basic-brand-mode"]');
    const strengthInput = document.getElementById('theme-basic-brand-strength');
    const colorInput = document.getElementById('theme-basic-brand-color');

    modeInputs.forEach((input) => {
        input.disabled = !useAccent;
    });
    if (strengthInput) {
        strengthInput.disabled = !useAccent || mode === 'accent' || mode === 'custom';
    }
    if (colorInput) {
        colorInput.disabled = !useAccent || mode !== 'custom';
    }
}
