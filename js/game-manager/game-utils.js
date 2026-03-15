export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function stripBracketedTitleParts(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    let previous = '';
    while (previous !== text) {
        previous = text;
        text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, ' ');
    }
    return text.replace(/\s+/g, ' ').trim();
}

export function normalizeNameKey(value) {
    return stripBracketedTitleParts(value)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

const PLATFORM_COMPANY_FALLBACKS = new Map([
    ['3ds', 'Nintendo'],
    ['android', 'Google'],
    ['amiga', 'Commodore'],
    ['atari2600', 'Atari'],
    ['atari5200', 'Atari'],
    ['atari7800', 'Atari'],
    ['atari-st', 'Atari'],
    ['dc', 'Sega'],
    ['dreamcast', 'Sega'],
    ['gameboy', 'Nintendo'],
    ['gb', 'Nintendo'],
    ['gba', 'Nintendo'],
    ['gbc', 'Nintendo'],
    ['gcn', 'Nintendo'],
    ['gamecube', 'Nintendo'],
    ['microsoft windows', 'Microsoft'],
    ['n64', 'Nintendo'],
    ['nds', 'Nintendo'],
    ['nes', 'Nintendo'],
    ['ps1', 'Sony'],
    ['ps2', 'Sony'],
    ['ps3', 'Sony'],
    ['psp', 'Sony'],
    ['psx', 'Sony'],
    ['scummvm', 'ScummVM'],
    ['snes', 'Nintendo'],
    ['super nintendo', 'Nintendo'],
    ['switch', 'Nintendo'],
    ['wii', 'Nintendo'],
    ['wii u', 'Nintendo'],
    ['wii-u', 'Nintendo'],
    ['windows', 'Microsoft'],
    ['xbox', 'Microsoft'],
    ['xbox360', 'Microsoft']
]);

function normalizePlatformCompanyKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_]+/g, '-')
        .replace(/\s+/g, ' ');
}

function inferCompanyFromPlatform(game) {
    const directKeys = [
        game?.platformShortName,
        game?.shortName,
        game?.platform,
        game?.platformName
    ];

    for (const key of directKeys) {
        const normalized = normalizePlatformCompanyKey(key);
        if (!normalized) continue;
        if (PLATFORM_COMPANY_FALLBACKS.has(normalized)) {
            return PLATFORM_COMPANY_FALLBACKS.get(normalized);
        }
        const collapsed = normalized.replace(/\s+/g, '');
        if (PLATFORM_COMPANY_FALLBACKS.has(collapsed)) {
            return PLATFORM_COMPANY_FALLBACKS.get(collapsed);
        }
        const dashed = normalized.replace(/\s+/g, '-');
        if (PLATFORM_COMPANY_FALLBACKS.has(dashed)) {
            return PLATFORM_COMPANY_FALLBACKS.get(dashed);
        }
    }

    const platformText = String(game?.platform || game?.platformName || game?.platformShortName || '').toLowerCase();
    if (platformText.includes('nintendo')) return 'Nintendo';
    if (platformText.includes('playstation') || platformText.includes('sony')) return 'Sony';
    if (platformText.includes('xbox') || platformText.includes('windows') || platformText.includes('microsoft')) return 'Microsoft';
    if (platformText.includes('sega')) return 'Sega';
    if (platformText.includes('atari')) return 'Atari';
    if (platformText.includes('commodore')) return 'Commodore';
    if (platformText.includes('android')) return 'Google';
    return '';
}

export function getGameCompanyValue(game) {
    const raw = game?.company || game?.publisher || game?.developer || game?.studio || game?.manufacturer;
    const text = String(raw || '').trim();
    return text || inferCompanyFromPlatform(game) || 'Unknown';
}
