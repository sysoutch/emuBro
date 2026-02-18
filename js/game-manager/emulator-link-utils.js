export function normalizeEmulatorDownloadLinks(raw) {
    const links = (raw && typeof raw === 'object') ? raw : {};
    const normalizeUrl = (value) => {
        const rawUrl = String(value || '').trim();
        if (!rawUrl) return '';
        return /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    };
    return {
        windows: normalizeUrl(links.windows || links.win || links.win32 || ''),
        linux: normalizeUrl(links.linux || ''),
        mac: normalizeUrl(links.mac || links.macos || links.darwin || '')
    };
}

export function hasAnyDownloadLink(emulator) {
    const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
    const website = String(emulator?.website || '').trim();
    return !!(links.windows || links.linux || links.mac || website);
}
