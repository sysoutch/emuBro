/**
 * Theme appearance utilities
 */

import { darkenHex, hexToRgb, parseColorToHex, rotateHue } from '../ui-utils';

const log = console;

const WINDOW_FRAME_MOTION_OPTIONS = new Set(['static', 'pulse']);
const WINDOW_FRAME_COLOR_MODE_OPTIONS = new Set(['theme-sync', 'hue-rotate', 'custom']);
const WINDOW_FRAME_COLOR_COUNT_OPTIONS = new Set([1, 2, 3, 4]);
const DEFAULT_WINDOW_FRAME_COLORS = Object.freeze(['#7cf2ff', '#7d8cff', '#d171ff', '#ffe29a']);

export const DEFAULT_WINDOW_FRAME_SETTINGS = Object.freeze({
    enabled: true,
    motion: 'static',
    colorMode: 'hue-rotate',
    colors: [...DEFAULT_WINDOW_FRAME_COLORS],
    colorAlpha: 100,
    colorCount: 3,
    rotationSpeed: 18,
    hueRotateSpeed: 18,
    hueRotateSpan: 360,
    thickness: 3,
    shadow: 55,
    radius: 10
});

function clampNumber(rawValue, fallback, min, max) {
    const parsed = Number.parseFloat(String(rawValue ?? ''));
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function normalizeBoolean(rawValue, fallback = true) {
    if (rawValue === undefined || rawValue === null || rawValue === '') return fallback;
    if (typeof rawValue === 'boolean') return rawValue;
    if (typeof rawValue === 'number') return rawValue !== 0;
    const normalized = String(rawValue).trim().toLowerCase();
    if (!normalized) return fallback;
    if (['false', '0', 'off', 'no', 'disabled'].includes(normalized)) return false;
    if (['true', '1', 'on', 'yes', 'enabled'].includes(normalized)) return true;
    return fallback;
}

function normalizeWindowFrameMotion(rawValue) {
    const normalized = String(rawValue || '').trim().toLowerCase();
    return WINDOW_FRAME_MOTION_OPTIONS.has(normalized)
        ? normalized
        : DEFAULT_WINDOW_FRAME_SETTINGS.motion;
}

function normalizeWindowFrameColorMode(rawValue) {
    const normalized = String(rawValue || '').trim().toLowerCase();
    if (normalized === 'stay') {
        return 'custom';
    }
    return WINDOW_FRAME_COLOR_MODE_OPTIONS.has(normalized)
        ? normalized
        : DEFAULT_WINDOW_FRAME_SETTINGS.colorMode;
}

function normalizeWindowFrameColorCount(rawValue) {
    const parsed = Number.parseInt(String(rawValue ?? '').trim(), 10);
    return WINDOW_FRAME_COLOR_COUNT_OPTIONS.has(parsed)
        ? parsed
        : DEFAULT_WINDOW_FRAME_SETTINGS.colorCount;
}

function percentFromAlphaByte(value) {
    const parsed = Number.parseInt(String(value ?? '').trim(), 16);
    if (!Number.isFinite(parsed)) return null;
    return Math.round((parsed / 255) * 100);
}

function buildWindowFramePaletteFromBaseColor(rawColor) {
    const base = parseColorToHex(rawColor) || DEFAULT_WINDOW_FRAME_COLORS[0];
    const second = parseColorToHex(rotateHue(base, 42)) || DEFAULT_WINDOW_FRAME_COLORS[1];
    const third = parseColorToHex(rotateHue(base, 102)) || DEFAULT_WINDOW_FRAME_COLORS[2];
    const fourth = parseColorToHex(darkenHex(rotateHue(base, 162), 6)) || DEFAULT_WINDOW_FRAME_COLORS[3];
    return [base, second, third, fourth];
}

function readWindowFrameColorCandidates(rawColors) {
    if (Array.isArray(rawColors)) {
        return rawColors;
    }
    const source = String(rawColors ?? '').trim();
    if (!source) {
        return [];
    }
    if (source.startsWith('[')) {
        try {
            const parsed = JSON.parse(source);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_error) {
            return [];
        }
    }
    return source.split(/[,\n;]/).map((entry) => String(entry || '').trim()).filter(Boolean);
}

function normalizeWindowFrameColors(rawColors, rawLegacyColor = '') {
    const normalized = readWindowFrameColorCandidates(rawColors)
        .map((value) => parseColorToHex(value))
        .filter(Boolean);
    if (normalized.length) {
        return DEFAULT_WINDOW_FRAME_COLORS.map((fallback, index) => normalized[index] || fallback);
    }
    if (parseColorToHex(rawLegacyColor)) {
        return buildWindowFramePaletteFromBaseColor(rawLegacyColor);
    }
    return [...DEFAULT_WINDOW_FRAME_COLORS];
}

function normalizeWindowFrameAlpha(rawColor, rawAlpha) {
    let alpha = null;
    const source = String(rawColor ?? '').trim();
    const hexMatch = source.match(/^#([0-9a-f]{4}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const normalized = hexMatch[1].toLowerCase();
        alpha = normalized.length === 4
            ? percentFromAlphaByte(normalized[3] + normalized[3])
            : percentFromAlphaByte(normalized.slice(6, 8));
    }
    if (rawAlpha !== undefined && rawAlpha !== null && rawAlpha !== '') {
        alpha = clampNumber(rawAlpha, DEFAULT_WINDOW_FRAME_SETTINGS.colorAlpha, 0, 100);
    }
    return Math.round(alpha ?? DEFAULT_WINDOW_FRAME_SETTINGS.colorAlpha);
}

export function normalizeWindowFrameSettings(settings = {}) {
    const source = settings && typeof settings === 'object' ? settings : {};
    return {
        enabled: normalizeBoolean(source.enabled, DEFAULT_WINDOW_FRAME_SETTINGS.enabled),
        motion: normalizeWindowFrameMotion(source.motion),
        colorMode: normalizeWindowFrameColorMode(source.colorMode),
        colors: normalizeWindowFrameColors(source.colors, source.color),
        colorAlpha: normalizeWindowFrameAlpha(source.color, source.colorAlpha),
        colorCount: normalizeWindowFrameColorCount(source.colorCount ?? source.themeSyncCount),
        rotationSpeed: Math.round(clampNumber(source.rotationSpeed, DEFAULT_WINDOW_FRAME_SETTINGS.rotationSpeed, 6, 90)),
        hueRotateSpeed: Math.round(clampNumber(source.hueRotateSpeed, DEFAULT_WINDOW_FRAME_SETTINGS.hueRotateSpeed, 4, 90)),
        hueRotateSpan: Math.round(clampNumber(source.hueRotateSpan, DEFAULT_WINDOW_FRAME_SETTINGS.hueRotateSpan, 45, 720)),
        thickness: Math.round(clampNumber(source.thickness, DEFAULT_WINDOW_FRAME_SETTINGS.thickness, 0, 24)),
        shadow: Math.round(clampNumber(source.shadow, DEFAULT_WINDOW_FRAME_SETTINGS.shadow, 0, 100)),
        radius: Math.round(clampNumber(source.radius, DEFAULT_WINDOW_FRAME_SETTINGS.radius, 0, 16))
    };
}

export function applyGlassEffect(enable) {
    if (enable) {
        document.documentElement.setAttribute('data-glass-effect', 'enabled');
    } else {
        document.documentElement.removeAttribute('data-glass-effect');
    }
    log.info(`Glass effect: ${enable ? 'ON' : 'OFF'}`);
}

export function applyCornerStyle(style) {
    const root = document.documentElement;
    if (style === 'sharp') {
        root.style.setProperty('--radius-btn', '0px');
        root.style.setProperty('--radius-btn-top-left', '0px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '0px');

        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-input-top-left', '0px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '0px');

        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-sm', '0px');
    } else if (style === 'semi-rounded') {
        root.style.setProperty('--radius-btn', '10px');
        root.style.setProperty('--radius-btn-top-left', '10px');
        root.style.setProperty('--radius-btn-top-right', '10px');
        root.style.setProperty('--radius-btn-bottom-left', '10px');
        root.style.setProperty('--radius-btn-bottom-right', '10px');

        root.style.setProperty('--radius-input', '10px');
        root.style.setProperty('--radius-input-top-left', '10px');
        root.style.setProperty('--radius-input-top-right', '10px');
        root.style.setProperty('--radius-input-bottom-left', '10px');
        root.style.setProperty('--radius-input-bottom-right', '10px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '6px');
    } else if (style === 'futuristic') {
        root.style.setProperty('--radius-btn', '14px');
        root.style.setProperty('--radius-btn-top-left', '3px');
        root.style.setProperty('--radius-btn-top-right', '14px');
        root.style.setProperty('--radius-btn-bottom-left', '14px');
        root.style.setProperty('--radius-btn-bottom-right', '3px');

        root.style.setProperty('--radius-input', '14px');
        root.style.setProperty('--radius-input-top-left', '3px');
        root.style.setProperty('--radius-input-top-right', '14px');
        root.style.setProperty('--radius-input-bottom-left', '14px');
        root.style.setProperty('--radius-input-bottom-right', '3px');

        root.style.setProperty('--radius-card', '16px');
        root.style.setProperty('--radius-sm', '6px');
    } else {
        root.style.setProperty('--radius-btn', '18px');
        root.style.setProperty('--radius-btn-top-left', '18px');
        root.style.setProperty('--radius-btn-top-right', '18px');
        root.style.setProperty('--radius-btn-bottom-left', '18px');
        root.style.setProperty('--radius-btn-bottom-right', '18px');

        root.style.setProperty('--radius-input', '18px');
        root.style.setProperty('--radius-input-top-left', '18px');
        root.style.setProperty('--radius-input-top-right', '18px');
        root.style.setProperty('--radius-input-bottom-left', '18px');
        root.style.setProperty('--radius-input-bottom-right', '18px');

        root.style.setProperty('--radius-card', '18px');
        root.style.setProperty('--radius-sm', '10px');
    }
}

export function applyWindowFrameStyleOptions(settings = {}) {
    const root = document.documentElement;
    const normalized = normalizeWindowFrameSettings(settings);
    const innerRadius = Math.max(0, normalized.radius - normalized.thickness);
    const shadowStrength = normalized.shadow / 100;
    const customAlpha = Math.max(0, Math.min(1, normalized.colorAlpha / 100));
    const underlayOpacity = '0';
    const mainOpacity = '0.94';
    const glowNearBlur = `${Math.round(4 + (shadowStrength * 14))}px`;
    const glowFarBlur = `${Math.round(10 + (shadowStrength * 24))}px`;
    const glowNearMix = `${Math.round(8 + (shadowStrength * 36))}%`;
    const glowFarMix = `${Math.round(4 + (shadowStrength * 24))}%`;
    const rotationSpeed = `${normalized.rotationSpeed}s`;
    const hueRotateSpeed = `${normalized.hueRotateSpeed}s`;
    const hueRotateSpan = `${normalized.hueRotateSpan}deg`;

    root.setAttribute('data-window-frame-enabled', normalized.enabled ? '1' : '0');
    root.setAttribute('data-window-frame-motion', normalized.motion);
    root.setAttribute('data-window-frame-color-mode', normalized.colorMode);
    root.setAttribute('data-window-frame-color-count', String(normalized.colorCount));

    root.style.setProperty('--win-border-w', `${normalized.thickness}px`);
    root.style.setProperty('--radius-window-base', `${normalized.radius}px`);
    root.style.setProperty('--radius-window-inner-base', `${innerRadius}px`);
    root.style.setProperty('--window-frame-custom-alpha', customAlpha.toFixed(3));
    root.style.setProperty('--window-frame-underlay-opacity', underlayOpacity);
    root.style.setProperty('--window-frame-main-opacity', mainOpacity);
    root.style.setProperty('--window-frame-glow-near-blur', glowNearBlur);
    root.style.setProperty('--window-frame-glow-far-blur', glowFarBlur);
    root.style.setProperty('--window-frame-glow-near-mix', glowNearMix);
    root.style.setProperty('--window-frame-glow-far-mix', glowFarMix);
    root.style.setProperty('--window-frame-rotation-speed', rotationSpeed);
    root.style.setProperty('--window-frame-hue-rotate-speed', hueRotateSpeed);
    root.style.setProperty('--window-frame-hue-rotate-span', hueRotateSpan);
    normalized.colors.forEach((color, index) => {
        const rgb = hexToRgb(color) || hexToRgb(DEFAULT_WINDOW_FRAME_COLORS[index]) || { r: 255, g: 255, b: 255 };
        root.style.setProperty(`--window-frame-custom-color-${index + 1}-base`, color);
        root.style.setProperty(
            `--window-frame-custom-color-${index + 1}`,
            `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${customAlpha.toFixed(3)})`
        );
    });

    return normalized;
}
