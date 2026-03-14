export const PLATFORM_GAMEPAD_BINDINGS_STORAGE_KEY = 'emuBro.platformGamepadBindings.v1';
export const INPUT_BINDING_CHANNELS = ['keyboard', 'gamepad'];

export const GAMEPAD_BINDING_ACTIONS = [
    'up',
    'down',
    'left',
    'right',
    'a',
    'b',
    'x',
    'y',
    'start',
    'select',
    'l1',
    'r1',
    'l2',
    'r2',
    'l3',
    'r3',
    'home'
];

export const GAMEPAD_BINDING_LABELS = {
    up: 'D-Pad Up',
    down: 'D-Pad Down',
    left: 'D-Pad Left',
    right: 'D-Pad Right',
    a: 'A / Cross',
    b: 'B / Circle',
    x: 'X / Square',
    y: 'Y / Triangle',
    start: 'Start',
    select: 'Select / Back',
    l1: 'L1 / LB',
    r1: 'R1 / RB',
    l2: 'L2 / LT',
    r2: 'R2 / RT',
    l3: 'L3',
    r3: 'R3',
    home: 'Home / Guide'
};

function normalizePlatformKey(platformShortName) {
    return String(platformShortName || '').trim().toLowerCase();
}

function normalizeBindingMap(input = {}) {
    const source = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
    const out = {};
    GAMEPAD_BINDING_ACTIONS.forEach((action) => {
        const value = String(source[action] || '').trim();
        if (value) out[action] = value;
    });
    return out;
}

export function normalizeGamepadBindings(input = {}) {
    return normalizeBindingMap(input);
}

export function normalizeInputBindingProfile(input = {}) {
    const source = (input && typeof input === 'object' && !Array.isArray(input)) ? input : {};
    const hasChannels = Object.prototype.hasOwnProperty.call(source, 'keyboard')
        || Object.prototype.hasOwnProperty.call(source, 'gamepad');

    if (!hasChannels) {
        return {
            keyboard: {},
            gamepad: normalizeBindingMap(source)
        };
    }

    return {
        keyboard: normalizeBindingMap(source.keyboard || {}),
        gamepad: normalizeBindingMap(source.gamepad || {})
    };
}

export function buildEffectiveGamepadBindings(platformBindings = {}, emulatorBindings = {}) {
    const platformProfile = normalizeInputBindingProfile(platformBindings);
    const emulatorProfile = normalizeInputBindingProfile(emulatorBindings);
    return {
        keyboard: {
            ...platformProfile.keyboard,
            ...emulatorProfile.keyboard
        },
        gamepad: {
            ...platformProfile.gamepad,
            ...emulatorProfile.gamepad
        }
    };
}

export function getInputBindingChannel(profile = {}, channel = 'gamepad') {
    const key = String(channel || '').trim().toLowerCase();
    const normalized = normalizeInputBindingProfile(profile);
    if (key === 'keyboard') return normalized.keyboard;
    return normalized.gamepad;
}

function hasAnyBindings(profile = {}) {
    const normalized = normalizeInputBindingProfile(profile);
    return Object.keys(normalized.keyboard).length > 0 || Object.keys(normalized.gamepad).length > 0;
}

function createEmptyProfile() {
    return {
        keyboard: {},
        gamepad: {}
    };
}

export function loadPlatformGamepadBindingsMap(storageRef = window.localStorage) {
    try {
        const raw = storageRef.getItem(PLATFORM_GAMEPAD_BINDINGS_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};
        const out = {};
        Object.entries(parsed).forEach(([platformShortName, rawBindings]) => {
            const key = normalizePlatformKey(platformShortName);
            if (!key) return;
            const normalized = normalizeInputBindingProfile(rawBindings);
            if (hasAnyBindings(normalized)) out[key] = normalized;
        });
        return out;
    } catch (_e) {
        return {};
    }
}

export function savePlatformGamepadBindingsMap(nextMap = {}, storageRef = window.localStorage) {
    try {
        const source = (nextMap && typeof nextMap === 'object') ? nextMap : {};
        const out = {};
        Object.entries(source).forEach(([platformShortName, rawBindings]) => {
            const key = normalizePlatformKey(platformShortName);
            if (!key) return;
            const normalized = normalizeInputBindingProfile(rawBindings);
            if (hasAnyBindings(normalized)) out[key] = normalized;
        });
        storageRef.setItem(PLATFORM_GAMEPAD_BINDINGS_STORAGE_KEY, JSON.stringify(out));
    } catch (_e) {}
}

export function getPlatformGamepadBindings(platformShortName, storageRef = window.localStorage) {
    const key = normalizePlatformKey(platformShortName);
    if (!key) return createEmptyProfile();
    const map = loadPlatformGamepadBindingsMap(storageRef);
    return normalizeInputBindingProfile(map[key] || {});
}

export function setPlatformGamepadBindings(platformShortName, bindings = {}, storageRef = window.localStorage) {
    const key = normalizePlatformKey(platformShortName);
    if (!key) return;
    const map = loadPlatformGamepadBindingsMap(storageRef);
    const normalized = normalizeInputBindingProfile(bindings);
    if (hasAnyBindings(normalized)) map[key] = normalized;
    else delete map[key];
    savePlatformGamepadBindingsMap(map, storageRef);
}
