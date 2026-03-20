export function normalizeTagCategory(value) {
    const tag = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!tag || tag === 'all') return 'all';
    return tag;
}

export function getRowTagIds(row) {
    const rows = Array.isArray(row?.tags) ? row.tags : [];
    const out = [];
    const seen = new Set();
    rows.forEach((tag) => {
        const normalized = normalizeTagCategory(tag);
        if (normalized === 'all' || seen.has(normalized)) return;
        seen.add(normalized);
        out.push(normalized);
    });
    return out;
}

export function getGameTagIds(game) {
    return getRowTagIds(game);
}

export function getTagCategoryCounts(rows, options = {}) {
    const source = Array.isArray(rows) ? rows : [];
    const getLabel = typeof options.getLabel === 'function'
        ? options.getLabel
        : ((tagId) => String(tagId || '').trim());
    const counts = new Map();
    source.forEach((row) => {
        getRowTagIds(row).forEach((tagId) => {
            counts.set(tagId, (counts.get(tagId) || 0) + 1);
        });
    });
    return Array.from(counts.entries())
        .map(([id, count]) => ({
            id,
            count: Number(count) || 0,
            label: getLabel(id)
        }))
        .sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
}
