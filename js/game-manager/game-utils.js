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

export function getGameCompanyValue(game) {
    const raw = game?.company || game?.publisher || game?.developer || game?.studio || game?.manufacturer;
    const text = String(raw || '').trim();
    return text || 'Unknown';
}
