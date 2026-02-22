export function normalizeLaunchCandidateMember(row = {}) {
    return {
        id: Number(row?.id || 0),
        name: String(row?.name || '').trim(),
        filePath: String(row?.filePath || '').trim(),
        platform: String(row?.platform || '').trim(),
        platformShortName: String(row?.platformShortName || '').trim().toLowerCase()
    };
}

export function dedupeLaunchCandidateMembers(rows = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        const candidate = normalizeLaunchCandidateMember(row);
        if (!candidate.id) return;
        if (seen.has(candidate.id)) return;
        seen.add(candidate.id);
        out.push(candidate);
    });
    return out;
}

export function createLaunchCandidateResolver({ getGames, normalizeNameKey }) {
    return {
        getLaunchCandidatesForGame(game) {
            if (!game || typeof game !== 'object') return [];

            const directMembers = dedupeLaunchCandidateMembers(game?.__groupMembers);
            if (directMembers.length > 1) return directMembers;

            const normalizedName = normalizeNameKey(game?.__groupDisplayName || game?.name || '');
            const platformShort = String(game?.platformShortName || '').trim().toLowerCase();
            if (!normalizedName || !platformShort) return directMembers;

            const librarySource = getGames?.();
            const library = Array.isArray(librarySource) ? librarySource : [];
            const fromLibrary = dedupeLaunchCandidateMembers(
                library.filter((row) => {
                    if (!row || Number(row?.id || 0) <= 0) return false;
                    const rowName = normalizeNameKey(row?.name || '');
                    const rowPlatform = String(row?.platformShortName || '').trim().toLowerCase();
                    return rowName === normalizedName && rowPlatform === platformShort;
                })
            );

            if (fromLibrary.length > 1) return fromLibrary;
            return directMembers;
        }
    };
}
