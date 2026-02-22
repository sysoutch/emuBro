import { getGameCompanyValue, normalizeNameKey, stripBracketedTitleParts } from './game-utils';

export function normalizeGroupByValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (key === 'platform' || key === 'company') return key;
    return 'none';
}

export function normalizeLanguageFilterValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (
        key === 'en'
        || key === 'de'
        || key === 'fr'
        || key === 'es'
        || key === 'it'
        || key === 'jp'
        || key === 'pt'
        || key === 'nl'
        || key === 'sv'
        || key === 'no'
        || key === 'da'
        || key === 'fi'
        || key === 'pl'
        || key === 'ru'
        || key === 'tr'
        || key === 'cs'
        || key === 'hu'
        || key === 'ko'
        || key === 'zh'
    ) {
        return key;
    }
    return 'all';
}

export function normalizeRegionFilterValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (key === 'eu' || key === 'us' || key === 'jp') return key;
    return 'all';
}

export function normalizeSortModeValue(value) {
    const key = String(value || '').trim().toLowerCase();
    if (
        key === 'name'
        || key === 'rating'
        || key === 'platform'
        || key === 'price'
        || key === 'genre'
        || key === 'status'
        || key === 'recently-played'
    ) {
        return key;
    }
    return 'name';
}

function getBracketedNameSegments(value) {
    const text = String(value || '');
    if (!text) return [];
    const segments = [];
    const regex = /[\(\[\{]([^()\[\]{}]+)[\)\]\}]/g;
    let match = null;
    while ((match = regex.exec(text)) !== null) {
        const segment = String(match[1] || '').trim();
        if (segment) segments.push(segment);
    }
    return segments;
}

const LANGUAGE_TOKEN_TO_CODE = new Map([
    ['english', 'en'],
    ['eng', 'en'],
    ['en', 'en'],
    ['german', 'de'],
    ['deutsch', 'de'],
    ['ger', 'de'],
    ['deu', 'de'],
    ['de', 'de'],
    ['french', 'fr'],
    ['fra', 'fr'],
    ['fre', 'fr'],
    ['francais', 'fr'],
    ['fr', 'fr'],
    ['spanish', 'es'],
    ['espanol', 'es'],
    ['spa', 'es'],
    ['esp', 'es'],
    ['es', 'es'],
    ['italian', 'it'],
    ['ita', 'it'],
    ['it', 'it'],
    ['japanese', 'jp'],
    ['jpn', 'jp'],
    ['jp', 'jp'],
    ['ja', 'jp'],
    ['portuguese', 'pt'],
    ['por', 'pt'],
    ['pt', 'pt'],
    ['dutch', 'nl'],
    ['nederlands', 'nl'],
    ['nld', 'nl'],
    ['nl', 'nl'],
    ['swedish', 'sv'],
    ['svenska', 'sv'],
    ['swe', 'sv'],
    ['sv', 'sv'],
    ['norwegian', 'no'],
    ['norsk', 'no'],
    ['nor', 'no'],
    ['no', 'no'],
    ['danish', 'da'],
    ['dansk', 'da'],
    ['dan', 'da'],
    ['da', 'da'],
    ['finnish', 'fi'],
    ['suomi', 'fi'],
    ['fin', 'fi'],
    ['fi', 'fi'],
    ['polish', 'pl'],
    ['polski', 'pl'],
    ['pol', 'pl'],
    ['pl', 'pl'],
    ['russian', 'ru'],
    ['russkiy', 'ru'],
    ['rus', 'ru'],
    ['ru', 'ru'],
    ['turkish', 'tr'],
    ['turkce', 'tr'],
    ['tur', 'tr'],
    ['tr', 'tr'],
    ['czech', 'cs'],
    ['cesky', 'cs'],
    ['cze', 'cs'],
    ['ces', 'cs'],
    ['cs', 'cs'],
    ['hungarian', 'hu'],
    ['magyar', 'hu'],
    ['hun', 'hu'],
    ['hu', 'hu'],
    ['korean', 'ko'],
    ['kor', 'ko'],
    ['ko', 'ko'],
    ['chinese', 'zh'],
    ['chi', 'zh'],
    ['zho', 'zh'],
    ['zh', 'zh'],
    ['cn', 'zh']
]);

export function getLanguageCodesFromNameBrackets(game) {
    const segments = getBracketedNameSegments(game?.name);
    const out = new Set();
    segments.forEach((segment) => {
        const normalized = String(segment || '')
            .toLowerCase()
            .replace(/[-_/|,;+&]+/g, ' ')
            .replace(/[^a-z0-9\s]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!normalized) return;
        normalized.split(' ').forEach((token) => {
            const code = LANGUAGE_TOKEN_TO_CODE.get(token);
            if (code) out.add(code);
        });
    });
    return out;
}

const REGION_PREFIX_TO_CODE = new Map([
    ['SLES', 'eu'],
    ['SCES', 'eu'],
    ['BLES', 'eu'],
    ['BCES', 'eu'],
    ['NPEB', 'eu'],
    ['NLES', 'eu'],
    ['ULES', 'eu'],
    ['SLUS', 'us'],
    ['SCUS', 'us'],
    ['BLUS', 'us'],
    ['BCUS', 'us'],
    ['NPUB', 'us'],
    ['NPUA', 'us'],
    ['ULUS', 'us'],
    ['SLPS', 'jp'],
    ['SCPS', 'jp'],
    ['BLJS', 'jp'],
    ['BCJS', 'jp'],
    ['NPJB', 'jp'],
    ['ULJM', 'jp'],
    ['SLPM', 'jp']
]);

function inferGameCodeForRegion(game) {
    const direct = game?.code || game?.productCode || game?.serial || game?.gameCode;
    if (direct) return String(direct).trim();

    const fileName = String(game?.filePath || '').trim().split(/[/\\]/).pop() || '';
    const hay = `${String(game?.name || '')} ${fileName}`.toUpperCase();
    const match = hay.match(/\b([A-Z]{4})[-_ ]?(\d{3})[.\-_ ]?(\d{2})\b|\b([A-Z]{4})[-_ ]?(\d{5})\b/);
    if (!match) return '';
    if (match[1] && match[2] && match[3]) return `${match[1]}-${match[2]}${match[3]}`;
    if (match[4] && match[5]) return `${match[4]}-${match[5]}`;
    return '';
}

export function getRegionCodeFromGame(game) {
    const code = inferGameCodeForRegion(game);
    if (code) {
        const letters = String(code).toUpperCase().replace(/[^A-Z]/g, '');
        const prefix = letters.slice(0, 4);
        const mapped = REGION_PREFIX_TO_CODE.get(prefix);
        if (mapped) return mapped;
    }

    const segments = getBracketedNameSegments(game?.name);
    for (const segment of segments) {
        const normalized = String(segment || '')
            .toLowerCase()
            .replace(/[_/|,;+&-]+/g, ' ')
            .replace(/[^a-z0-9\s]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        if (!normalized) continue;
        if (normalized === 'e' || normalized === 'eu') return 'eu';
        if (normalized === 'u' || normalized === 'us' || normalized === 'usa') return 'us';
        if (normalized === 'j' || normalized === 'jp') return 'jp';
        if (/\b(europe|eur|eu|pal)\b/.test(normalized)) return 'eu';
        if (/\b(usa|us|north america|na|ntsc u|ntscu)\b/.test(normalized)) return 'us';
        if (/\b(japan|jpn|jp|ntsc j|ntscj)\b/.test(normalized)) return 'jp';
    }

    return '';
}

export function getGroupValueForGame(game, groupBy) {
    if (groupBy === 'platform') return String(game?.platform || game?.platformShortName || 'Unknown').trim() || 'Unknown';
    if (groupBy === 'company') return getGameCompanyValue(game);
    return '';
}

export function compareGamesBySort(a, b, sortMode, direction = 'asc') {
    const sort = String(sortMode || 'name').trim().toLowerCase();
    const dir = direction === 'desc' ? -1 : 1;
    let val = 0;

    switch (sort) {
        case 'recently-played': {
            const aTime = new Date(a?.lastPlayed || 0).getTime();
            const bTime = new Date(b?.lastPlayed || 0).getTime();
            val = aTime - bTime;
            break;
        }
        case 'rating':
            val = Number(a?.rating || 0) - Number(b?.rating || 0);
            break;
        case 'price':
            val = Number(a?.price || 0) - Number(b?.price || 0);
            break;
        case 'platform':
            val = String(a?.platform || a?.platformShortName || 'Unknown')
                .localeCompare(String(b?.platform || b?.platformShortName || 'Unknown'));
            break;
        case 'genre':
            val = String(a?.genre || 'Unknown').localeCompare(String(b?.genre || 'Unknown'));
            break;
        case 'status':
            val = Number(!!a?.isInstalled) - Number(!!b?.isInstalled);
            break;
        default:
            val = String(a?.name || '').localeCompare(String(b?.name || ''));
    }
    return val * dir;
}

export function groupRowsBySameNames(rows) {
    const source = Array.isArray(rows) ? rows : [];
    const groupedMap = new Map();
    const order = [];

    source.forEach((game) => {
        const normalizedName = normalizeNameKey(game?.name || '');
        const platformShort = String(game?.platformShortName || '').trim().toLowerCase();
        const groupKey = `${normalizedName || String(game?.name || '').toLowerCase()}::${platformShort}`;
        if (!groupedMap.has(groupKey)) {
            groupedMap.set(groupKey, []);
            order.push(groupKey);
        }
        groupedMap.get(groupKey).push(game);
    });

    return order.map((groupKey) => {
        const members = groupedMap.get(groupKey) || [];
        const base = members[0] || {};
        const cleanName = stripBracketedTitleParts(base?.name || '') || String(base?.name || '');
        const mergedTags = new Set();
        members.forEach((row) => {
            (Array.isArray(row?.tags) ? row.tags : []).forEach((tag) => {
                const normalized = String(tag || '').trim().toLowerCase();
                if (normalized) mergedTags.add(normalized);
            });
        });
        const representative = {
            ...base,
            __groupDisplayName: cleanName || String(base?.name || ''),
            __groupCount: members.length,
            tags: Array.from(mergedTags),
            isInstalled: members.some((row) => !!row?.isInstalled),
            __groupMembers: members.map((row) => ({
                id: Number(row?.id || 0),
                name: String(row?.name || ''),
                filePath: String(row?.filePath || ''),
                platform: String(row?.platform || ''),
                platformShortName: String(row?.platformShortName || '')
            }))
        };
        return representative;
    });
}
