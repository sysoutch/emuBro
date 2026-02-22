export function getGlobalSearchTerm(documentRef = document) {
    return String(
        documentRef.getElementById('global-game-search')?.value
        || documentRef.querySelector('.search-bar input')?.value
        || ''
    ).trim().toLowerCase();
}

export function buildGamesRenderSignature({ rows = [], view = 'cover', currentGroupBy = 'none', currentSort = 'name', currentSortDir = 'asc' } = {}) {
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
