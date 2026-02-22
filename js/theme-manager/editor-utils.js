import { normalizeBasicIntensity } from './theme-algorithms';

export function normalizeGradientAngle(value, fallback = '160deg') {
    const raw = String(value ?? '').trim();
    const defaultNum = Number.parseInt(String(fallback).replace(/deg$/i, ''), 10);
    const fallbackNum = Number.isFinite(defaultNum) ? defaultNum : 160;
    let num = Number.parseInt(raw.replace(/deg$/i, ''), 10);
    if (!Number.isFinite(num)) num = fallbackNum;
    num = Math.max(0, Math.min(360, num));
    return `${num}deg`;
}

export function updateGradientAngleValueLabel(angleText) {
    const label = document.getElementById('gradient-angle-value');
    if (label) label.textContent = angleText;
}

export function setGradientAngleInputFromValue(angleText) {
    const input = document.getElementById('gradient-angle');
    if (!input) return;
    const num = Number.parseInt(String(angleText).replace(/deg$/i, ''), 10);
    input.value = String(Number.isFinite(num) ? num : 160);
}

export function applyGradientAnglePreview(angleText) {
    document.documentElement.style.setProperty('--app-gradient-angle', normalizeGradientAngle(angleText));
}

export function updateBasicIntensityValueLabel(intensityValue) {
    const label = document.getElementById('theme-basic-intensity-value');
    if (!label) return;
    const normalized = normalizeBasicIntensity(intensityValue);
    label.textContent = `${normalized}%`;
}
