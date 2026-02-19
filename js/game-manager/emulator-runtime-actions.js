export function createEmulatorRuntimeActions(deps = {}) {
    const emubro = deps.emubro || window.emubro;
    const log = deps.log || console;
    const getEmulatorConfig = deps.getEmulatorConfig || (() => ({}));
    const normalizeEmulatorDownloadLinks = deps.normalizeEmulatorDownloadLinks || ((raw) => raw || {});
    const alertUser = typeof deps.alertUser === 'function'
        ? deps.alertUser
        : ((message) => window.alert(String(message || '')));

    async function openPathInExplorerAction(targetPath, missingMessage = 'Path not found.') {
        const filePath = String(targetPath || '').trim();
        if (!filePath) {
            alertUser(missingMessage);
            return false;
        }

        try {
            const result = await emubro.invoke('show-item-in-folder', filePath);
            if (!result?.success) {
                alertUser(result?.message || missingMessage || 'Failed to open folder.');
                return false;
            }
            return true;
        } catch (error) {
            log.error('Failed to open path in explorer:', error);
            alertUser('Failed to open folder.');
            return false;
        }
    }

    async function launchEmulatorAction(emulator) {
        if (!emulator?.filePath || !emulator?.isInstalled) {
            alertUser('This emulator is not installed yet.');
            return;
        }

        try {
            const config = getEmulatorConfig(emulator);
            const result = await emubro.invoke('launch-emulator', {
                filePath: emulator.filePath,
                args: config.launchArgs || '',
                workingDirectory: config.workingDirectory || ''
            });

            if (!result?.success) {
                alertUser(result?.message || 'Failed to launch emulator.');
            }
        } catch (error) {
            log.error('Failed to launch emulator:', error);
            alertUser('Failed to launch emulator.');
        }
    }

    async function openEmulatorInExplorerAction(emulator) {
        if (!emulator?.filePath || !emulator?.isInstalled) {
            alertUser('This emulator is not installed yet.');
            return;
        }

        return openPathInExplorerAction(emulator.filePath, 'This emulator is not installed yet.');
    }

    async function openEmulatorWebsiteAction(emulator) {
        try {
            const config = getEmulatorConfig(emulator);
            const website = String(config.website || '').trim();
            const websiteFromConfig = String(emulator.website || '').trim();
            const fallbackSearch = `https://www.google.com/search?q=${encodeURIComponent(`${emulator.name || ''} emulator`)}`;
            const url = website || websiteFromConfig || fallbackSearch;

            const result = await emubro.invoke('open-external-url', url);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to open website.');
            }
        } catch (error) {
            log.error('Failed to open emulator website:', error);
            alertUser('Failed to open website.');
        }
    }

    async function openEmulatorDownloadLinkAction(emulator, osKey = '') {
        try {
            const links = normalizeEmulatorDownloadLinks(emulator?.downloadLinks);
            const normalized = String(osKey || '').toLowerCase();
            const url = normalized === 'windows'
                ? links.windows
                : (normalized === 'linux' ? links.linux : (normalized === 'mac' ? links.mac : ''));
            const fallback = String(emulator?.website || '').trim();
            const target = url || fallback;
            if (!target) {
                alertUser('No download link available for this emulator.');
                return;
            }

            const result = await emubro.invoke('open-external-url', target);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to open download link.');
            }
        } catch (error) {
            log.error('Failed to open emulator download link:', error);
            alertUser('Failed to open download link.');
        }
    }

    return {
        openPathInExplorerAction,
        launchEmulatorAction,
        openEmulatorInExplorerAction,
        openEmulatorWebsiteAction,
        openEmulatorDownloadLinkAction
    };
}
