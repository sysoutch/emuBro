export function getGlobalSearchTerm(documentRef = document) {
    return String(
        documentRef.getElementById('global-game-search')?.value
        || documentRef.querySelector('.search-bar input')?.value
        || ''
    ).trim().toLowerCase();
}

export function normalizeCoverCardMode(value) {
    return String(value || '').trim().toLowerCase() === 'cover-only' ? 'cover-only' : 'cover-title';
}

export function getStoredCoverCardMode(storageRef = null) {
    const storage = storageRef
        || (typeof window !== 'undefined' && window?.localStorage ? window.localStorage : null);
    if (!storage || typeof storage.getItem !== 'function') return 'cover-title';
    try {
        return normalizeCoverCardMode(storage.getItem('emuBro.coverCardMode') || 'cover-title');
    } catch (_error) {
        return 'cover-title';
    }
}

export function buildGamesContainerClass(view = 'cover', coverCardMode = 'cover-title') {
    const normalizedView = String(view || 'cover').trim().toLowerCase() || 'cover';
    const classNames = ['games-container', `${normalizedView}-view`];
    if (normalizedView === 'cover') {
        classNames.push(
            normalizeCoverCardMode(coverCardMode) === 'cover-only'
                ? 'cover-mode-cover-only'
                : 'cover-mode-cover-title'
        );
    }
    return classNames.join(' ');
}

export function buildGamesRenderSignature({
    rows = [],
    view = 'cover',
    currentGroupBy = 'none',
    currentSort = 'name',
    currentSortDir = 'asc',
    coverCardMode = 'cover-title',
    viewScale = '1'
} = {}) {
    const list = Array.isArray(rows) ? rows : [];
    const total = list.length;
    const first = total > 0 ? list[0] : null;
    const last = total > 0 ? list[total - 1] : null;
    const firstId = String(first?.id ?? first?.name ?? '');
    const lastId = String(last?.id ?? last?.name ?? '');
    return [
        String(view || 'cover'),
        String(currentGroupBy || 'none'),
        String(currentSort || 'name'),
        String(currentSortDir || 'asc'),
        String(normalizeCoverCardMode(coverCardMode || 'cover-title')),
        String(viewScale || '1'),
        total,
        firstId,
        lastId
    ].join('|');
}

export function buildViewGamePool(sourceGames, maxSize) {
    const source = Array.isArray(sourceGames) ? sourceGames : [];
    const cap = Number(maxSize) > 0 ? Number(maxSize) : source.length;
    if (source.length <= cap) return source;

    const sampled = [];
    const step = source.length / cap;
    for (let i = 0; i < cap; i += 1) {
        const idx = Math.min(source.length - 1, Math.floor(i * step));
        sampled.push(source[idx]);
    }
    return sampled;
}
