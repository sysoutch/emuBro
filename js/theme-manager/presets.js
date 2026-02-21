export const FONT_STACK_QUICKSAND = "'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
export const FONT_STACK_MONTSERRAT = "'Montserrat', 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
export const FONT_STACK_LUCKIEST = "'Luckiest Guy', 'Montserrat', 'Quicksand', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
export const FONT_STACK_GAMEBOY = "'Press Start 2P', 'VT323', 'Courier New', monospace";

export const FONT_PRESET_STACKS = {
    quicksand: FONT_STACK_QUICKSAND,
    montserrat: FONT_STACK_MONTSERRAT,
    luckiest: FONT_STACK_LUCKIEST,
    gameboy: FONT_STACK_GAMEBOY
};

export const DEFAULT_THEME_FONTS = {
    body: FONT_STACK_QUICKSAND,
    heading: FONT_STACK_MONTSERRAT,
    pixelMode: false
};

export const DEFAULT_BASIC_BRAND_MODE = 'darker';
export const DEFAULT_BASIC_BRAND_STRENGTH = 30;

export const DEFAULT_TEXT_EFFECT_MODE = 'none';
export const DEFAULT_TEXT_EFFECT_SPEED = 7;
export const DEFAULT_TEXT_EFFECT_INTENSITY = 72;
export const DEFAULT_TEXT_EFFECT_CUSTOM_COLORS = {
    color1: '#66d8ff',
    color2: '#2f7dff',
    color3: '#14306a',
    color4: '#0d1742'
};
export const DEFAULT_TEXT_EFFECT_ANGLE = 140;

export const ARCADE_THEME_FONTS = {
    body: FONT_STACK_MONTSERRAT,
    heading: FONT_STACK_LUCKIEST,
    pixelMode: false
};

export const GAMEBOY_THEME_FONTS = {
    body: FONT_STACK_GAMEBOY,
    heading: FONT_STACK_GAMEBOY,
    pixelMode: true
};

export const DEFAULT_PRESET_LOGO_TEXT_EFFECT = {
    logo: {
        enabled: true,
        mode: 'slimey-green',
        speed: DEFAULT_TEXT_EFFECT_SPEED,
        intensity: DEFAULT_TEXT_EFFECT_INTENSITY,
        applyToLogo: true
    }
};

const BUILT_IN_PRESET_THEMES = [
    {
        id: 'spyro',
        name: 'Spyro',
        colors: {
            bgPrimary: '#130d26',
            bgSecondary: '#1d1336',
            bgTertiary: '#281a46',
            bgQuaternary: '#1a1132',
            textPrimary: '#f4e9ff',
            textSecondary: '#c6b1e6',
            accentColor: '#b56dff',
            borderColor: '#5a3a8f',
            bgHeader: '#1f1439',
            bgSidebar: '#281a46',
            bgActionbar: '#1a1132',
            appGradientA: '#1a1134',
            appGradientB: '#2a1b52',
            appGradientC: '#4f2d79',
            appGradientAngle: '155deg',
            successColor: '#5fca81',
            dangerColor: '#ff6d7d'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: ARCADE_THEME_FONTS,
        textEffects: DEFAULT_PRESET_LOGO_TEXT_EFFECT
    },
    {
        id: 'red_bloody',
        name: 'Red Bloody',
        colors: {
            bgPrimary: '#150709',
            bgSecondary: '#220d12',
            bgTertiary: '#2d1217',
            bgQuaternary: '#1c0a0e',
            textPrimary: '#ffe8ea',
            textSecondary: '#dba6ac',
            accentColor: '#d62d3a',
            borderColor: '#6b2730',
            bgHeader: '#220d12',
            bgSidebar: '#2d1217',
            bgActionbar: '#1c0a0e',
            appGradientA: '#1a090d',
            appGradientB: '#3a0f17',
            appGradientC: '#5a111c',
            appGradientAngle: '160deg',
            successColor: '#6eca88',
            dangerColor: '#ff4f5f'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: DEFAULT_THEME_FONTS,
        textEffects: DEFAULT_PRESET_LOGO_TEXT_EFFECT
    },
    {
        id: 'crash_bandicoot',
        name: 'Crash Bandicoot',
        colors: {
            bgPrimary: '#16110a',
            bgSecondary: '#24190e',
            bgTertiary: '#342211',
            bgQuaternary: '#1c140b',
            textPrimary: '#fff2df',
            textSecondary: '#e5c392',
            accentColor: '#ff8d2e',
            borderColor: '#7b4c1f',
            bgHeader: '#2a1c0f',
            bgSidebar: '#342211',
            bgActionbar: '#1c140b',
            appGradientA: '#1f140a',
            appGradientB: '#3a230f',
            appGradientC: '#6a3712',
            appGradientAngle: '150deg',
            successColor: '#73d191',
            dangerColor: '#ff6e54'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: ARCADE_THEME_FONTS,
        textEffects: DEFAULT_PRESET_LOGO_TEXT_EFFECT
    },
    {
        id: 'mario',
        name: 'Mario',
        colors: {
            bgPrimary: '#140b10',
            bgSecondary: '#21111a',
            bgTertiary: '#2d1822',
            bgQuaternary: '#1b0f16',
            textPrimary: '#fff5ef',
            textSecondary: '#e6c4bc',
            accentColor: '#ff4040',
            borderColor: '#7f3441',
            bgHeader: '#22121b',
            bgSidebar: '#2d1822',
            bgActionbar: '#1b0f16',
            appGradientA: '#1a0d14',
            appGradientB: '#3a1d2b',
            appGradientC: '#174ea8',
            appGradientAngle: '150deg',
            successColor: '#73d98f',
            dangerColor: '#ff4e4e'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: ARCADE_THEME_FONTS,
        textEffects: DEFAULT_PRESET_LOGO_TEXT_EFFECT
    },
    {
        id: 'gameboy',
        name: 'Gameboy',
        colors: {
            bgPrimary: '#0f1711',
            bgSecondary: '#162218',
            bgTertiary: '#1f2d1f',
            bgQuaternary: '#131e14',
            textPrimary: '#d8f2b8',
            textSecondary: '#9ebd7f',
            accentColor: '#7ec850',
            borderColor: '#486538',
            bgHeader: '#19261b',
            bgSidebar: '#1f2d1f',
            bgActionbar: '#131e14',
            appGradientA: '#10190f',
            appGradientB: '#1d2c1a',
            appGradientC: '#32472c',
            appGradientAngle: '158deg',
            successColor: '#8fe267',
            dangerColor: '#cf6f76'
        },
        background: { image: null, position: 'centered', scale: 'crop', repeat: 'no-repeat', topImage: null },
        cardEffects: { glassEffect: true },
        fonts: GAMEBOY_THEME_FONTS,
        textEffects: DEFAULT_PRESET_LOGO_TEXT_EFFECT
    }
];

function cloneThemeDefinition(theme) {
    if (!theme) return null;
    try {
        return JSON.parse(JSON.stringify(theme));
    } catch (_error) {
        return null;
    }
}

export function getBuiltInPresetTheme(themeId) {
    const normalizedId = String(themeId || '').trim().toLowerCase();
    const found = BUILT_IN_PRESET_THEMES.find((theme) => theme.id === normalizedId);
    return cloneThemeDefinition(found);
}

export function getBuiltInPresetThemes() {
    return BUILT_IN_PRESET_THEMES.map((theme) => cloneThemeDefinition(theme)).filter(Boolean);
}
