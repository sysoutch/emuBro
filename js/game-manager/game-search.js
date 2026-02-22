export function normalizeSearchScope(scope) {
    const value = String(scope || '').trim().toLowerCase();
    if (value === 'games' || value === 'emulators' || value === 'both') return value;
    return 'both';
}

export function createGameSearchActions(deps = {}) {
    const {
        emubro,
        log = console,
        setGames,
        setFilteredGames,
        renderGames,
        initializePlatformFilterOptions,
        alertUser = (message) => alert(message),
        documentRef = document
    } = deps;

    async function searchForGamesAndEmulators(scanTargets = [], options = {}) {
        const searchBtn = documentRef.getElementById('search-games-btn');
        const normalizedScope = normalizeSearchScope(options?.scope);
        if (searchBtn) {
            searchBtn.disabled = true;
            searchBtn.textContent = 'Searching...';
        }

        try {
            const rawTargets = Array.isArray(scanTargets) ? scanTargets : [];
            const targets = rawTargets
                .map((v) => String(v || '').trim())
                .filter(Boolean);
            const dedupedTargets = Array.from(new Set(targets.map((v) => v.toLowerCase())))
                .map((key) => targets.find((t) => t.toLowerCase() === key))
                .filter(Boolean);

            if (dedupedTargets.length === 0) dedupedTargets.push('');

            let totalFoundGames = 0;
            let totalFoundEmulators = 0;
            const foundGamePaths = [];
            const foundEmulatorPaths = [];
            const foundArchives = [];
            const foundSetupFiles = [];
            let anySuccess = false;

            for (const target of dedupedTargets) {
                const result = await emubro.invoke('browse-games-and-emus', target, { scope: normalizedScope });
                if (!result?.success) continue;
                anySuccess = true;
                const gamesFound = Array.isArray(result.games) ? result.games : [];
                const emulatorsFound = Array.isArray(result.emulators) ? result.emulators : [];
                totalFoundGames += gamesFound.length;
                totalFoundEmulators += emulatorsFound.length;
                gamesFound.forEach((game) => {
                    const filePath = String(game?.filePath || '').trim();
                    if (filePath) foundGamePaths.push(filePath);
                });
                emulatorsFound.forEach((emu) => {
                    const filePath = String(emu?.filePath || '').trim();
                    if (filePath) foundEmulatorPaths.push(filePath);
                });
                (Array.isArray(result.archives) ? result.archives : []).forEach((archivePath) => {
                    const filePath = String(archivePath || '').trim();
                    if (filePath) foundArchives.push(filePath);
                });
                (Array.isArray(result.setupFiles) ? result.setupFiles : []).forEach((setupPath) => {
                    const filePath = String(setupPath || '').trim();
                    if (filePath) foundSetupFiles.push(filePath);
                });
            }

            if (anySuccess) {
                const updatedGames = await emubro.invoke('get-games');
                setGames(updatedGames);
                setFilteredGames([...updatedGames]);
                renderGames(updatedGames);
                initializePlatformFilterOptions();
                alertUser(`Found ${totalFoundGames} games and ${totalFoundEmulators} emulators.`);
            }

            return {
                success: anySuccess,
                scope: normalizedScope,
                scanTargets: dedupedTargets,
                totalFoundGames,
                totalFoundEmulators,
                foundGamePaths,
                foundEmulatorPaths,
                foundArchives: Array.from(new Set(foundArchives.map((entry) => entry.toLowerCase())))
                    .map((key) => foundArchives.find((entry) => entry.toLowerCase() === key))
                    .filter(Boolean),
                foundSetupFiles: Array.from(new Set(foundSetupFiles.map((entry) => entry.toLowerCase())))
                    .map((key) => foundSetupFiles.find((entry) => entry.toLowerCase() === key))
                    .filter(Boolean)
            };
        } catch (error) {
            log.error('Search failed:', error);
            return {
                success: false,
                scope: normalizedScope,
                scanTargets: [],
                totalFoundGames: 0,
                totalFoundEmulators: 0,
                foundGamePaths: [],
                foundEmulatorPaths: [],
                foundArchives: [],
                foundSetupFiles: [],
                error: error?.message || String(error)
            };
        } finally {
            if (searchBtn) {
                searchBtn.disabled = false;
                searchBtn.textContent = 'Search Games';
            }
        }
    }

    return {
        searchForGamesAndEmulators
    };
}
