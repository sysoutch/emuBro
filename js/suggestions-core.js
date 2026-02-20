export function tokenizeSuggestionQuery(query) {
    return String(query || '')
        .toLowerCase()
        .split(/[\s,;:|/\\]+/g)
        .map((part) => part.trim())
        .filter((part) => part.length >= 2)
        .slice(0, 10);
}

function gameMatchesSuggestionTerms(game, terms) {
    if (!Array.isArray(terms) || terms.length === 0) return false;
    const haystack = [
        String(game?.name || ''),
        String(game?.cleanName || ''),
        Array.isArray(game?.variants) ? game.variants.join(' ') : '',
        String(game?.genre || ''),
        String(game?.platform || ''),
        String(game?.platformShortName || '')
    ].join(' ').toLowerCase();
    return terms.some((term) => haystack.includes(term));
}

export function stripSuggestionBracketedTitleParts(value) {
    let text = String(value || '').trim();
    if (!text) return '';
    let previous = '';
    while (previous !== text) {
        previous = text;
        text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, ' ');
    }
    return text.replace(/\s+/g, ' ').trim();
}

export function normalizeSuggestionMatchName(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function platformMatchesSuggestionTarget(game, targetPlatform) {
    const target = String(targetPlatform || '').trim().toLowerCase();
    if (!target) return true;

    const gamePlatformShort = String(game?.platformShortName || '').trim().toLowerCase();
    const gamePlatformName = String(game?.platform || '').trim().toLowerCase();
    if (gamePlatformShort && gamePlatformShort === target) return true;
    if (gamePlatformName && gamePlatformName === target) return true;
    if (gamePlatformName && (gamePlatformName.includes(target) || target.includes(gamePlatformName))) return true;
    return false;
}

export function getGameIdentityKey(game) {
    const numericId = Number(game?.id || 0);
    if (numericId > 0) return `id:${numericId}`;
    const name = String(game?.name || '').trim().toLowerCase();
    const platform = String(game?.platformShortName || game?.platform || '').trim().toLowerCase();
    return `${name}::${platform}`;
}

export function groupSuggestionLibraryRows(rows = []) {
    const source = Array.isArray(rows) ? rows : [];
    const groups = new Map();
    source.forEach((game) => {
        const rawName = String(game?.name || '').trim();
        const cleanName = stripSuggestionBracketedTitleParts(rawName) || rawName;
        const platformShort = String(game?.platformShortName || game?.platform || '').trim().toLowerCase();
        const nameKey = normalizeSuggestionMatchName(cleanName || rawName) || normalizeSuggestionMatchName(rawName);
        const groupKey = `${nameKey || 'unknown'}::${platformShort || 'unknown'}`;
        if (!groups.has(groupKey)) {
            groups.set(groupKey, {
                id: Number(game?.id || 0),
                name: cleanName || rawName,
                cleanName: cleanName || rawName,
                platform: String(game?.platform || game?.platformShortName || '').trim(),
                platformShortName: String(game?.platformShortName || '').trim(),
                genre: String(game?.genre || '').trim(),
                rating: Number.isFinite(Number(game?.rating)) ? Number(game.rating) : null,
                isInstalled: !!game?.isInstalled,
                lastPlayed: String(game?.lastPlayed || '').trim(),
                variants: [],
                gameIds: [],
                duplicateCount: 0
            });
        }
        const group = groups.get(groupKey);
        const gameId = Number(game?.id || 0);
        const variant = String(game?.name || '').trim();
        if (variant && !group.variants.some((row) => row.toLowerCase() === variant.toLowerCase())) {
            group.variants.push(variant);
        }
        if (gameId > 0 && !group.gameIds.includes(gameId)) {
            group.gameIds.push(gameId);
        }
        group.duplicateCount += 1;
        if (!group.isInstalled && !!game?.isInstalled) group.isInstalled = true;
        const gameLastPlayed = String(game?.lastPlayed || '').trim();
        if (gameLastPlayed) {
            const nextDate = new Date(gameLastPlayed).getTime();
            const currentDate = new Date(group.lastPlayed || 0).getTime();
            if (!group.lastPlayed || (Number.isFinite(nextDate) && nextDate > currentDate)) {
                group.lastPlayed = gameLastPlayed;
            }
        }
        if (!group.platformShortName && game?.platformShortName) {
            group.platformShortName = String(game.platformShortName).trim();
        }
        if (!group.genre && game?.genre) {
            group.genre = String(game.genre).trim();
        }
    });

    return Array.from(groups.values());
}

export function buildSuggestionLibraryPayloadFromRows(rows, query = '', options = {}) {
    const selectedPlatform = String(options?.selectedPlatform || '').trim().toLowerCase();
    const selectedPlatformOnly = !!options?.selectedPlatformOnly && !!selectedPlatform;
    const maxCount = Math.max(1, Number(options?.maxCount) || 420);

    const normalizedRows = (Array.isArray(rows) ? rows : [])
        .map((game) => ({
            id: Number(game?.id || 0),
            name: String(game?.name || '').trim(),
            platform: String(game?.platform || game?.platformShortName || '').trim(),
            platformShortName: String(game?.platformShortName || '').trim(),
            genre: String(game?.genre || '').trim(),
            rating: Number.isFinite(Number(game?.rating)) ? Number(game.rating) : null,
            isInstalled: !!game?.isInstalled,
            lastPlayed: String(game?.lastPlayed || '').trim()
        }))
        .filter((game) => game.name.length > 0)
        .filter((game) => {
            if (!selectedPlatformOnly) return true;
            return String(game.platformShortName || '').trim().toLowerCase() === selectedPlatform;
        });

    const groupedRows = groupSuggestionLibraryRows(normalizedRows);
    if (groupedRows.length === 0) return [];

    const terms = tokenizeSuggestionQuery(query);
    const out = [];
    const seen = new Set();
    const pushUnique = (game) => {
        const key = `${String(game.name || '').toLowerCase()}::${String(game.platformShortName || game.platform || '').toLowerCase()}`;
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(game);
    };

    if (terms.length > 0) {
        groupedRows.filter((game) => gameMatchesSuggestionTerms(game, terms)).forEach(pushUnique);
    }

    groupedRows
        .filter((game) => game.lastPlayed)
        .sort((a, b) => new Date(b.lastPlayed).getTime() - new Date(a.lastPlayed).getTime())
        .slice(0, 120)
        .forEach(pushUnique);

    groupedRows
        .filter((game) => game.isInstalled)
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 220)
        .forEach(pushUnique);

    groupedRows
        .sort((a, b) => a.name.localeCompare(b.name))
        .forEach(pushUnique);

    return out.slice(0, maxCount);
}

export function findSuggestedGameMatch(sourceGames, entry) {
    const games = Array.isArray(sourceGames) ? sourceGames : [];
    if (games.length === 0 || !entry) return null;

    const entryId = Number(entry?.id || 0);
    if (entryId > 0) {
        const byId = games.find((game) => Number(game?.id || 0) === entryId);
        if (byId) return byId;
    }

    const targetName = normalizeSuggestionMatchName(entry?.name || entry?.title || '');
    if (!targetName) return null;
    const targetPlatform = String(entry?.platform || '').trim().toLowerCase();

    const exact = games.find((game) => {
        const gameName = normalizeSuggestionMatchName(game?.name || '');
        if (gameName !== targetName) return false;
        return platformMatchesSuggestionTarget(game, targetPlatform);
    });
    if (exact) return exact;

    return games.find((game) => {
        const gameName = normalizeSuggestionMatchName(game?.name || '');
        if (!gameName) return false;
        if (!(gameName.includes(targetName) || targetName.includes(gameName))) return false;
        return platformMatchesSuggestionTarget(game, targetPlatform);
    }) || null;
}

export function mapSuggestionLibraryMatchesToGames(response, sourceGames, options = {}) {
    const libraryMatches = Array.isArray(response?.libraryMatches) ? response.libraryMatches : [];
    const games = Array.isArray(sourceGames) ? sourceGames : [];
    const selectedPlatform = String(options?.selectedPlatform || '').trim().toLowerCase();
    const out = [];
    const seen = new Set();

    libraryMatches.forEach((entry) => {
        const match = findSuggestedGameMatch(games, entry);
        if (!match) return;
        if (selectedPlatform && String(match?.platformShortName || '').trim().toLowerCase() !== selectedPlatform) return;
        const key = getGameIdentityKey(match);
        if (seen.has(key)) return;
        seen.add(key);
        out.push(match);
    });

    return out;
}
