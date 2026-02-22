/**
 * Theme marketplace utilities
 */

const log = console;
let remoteCommunityThemes = null;

export async function fetchCommunityThemes(forceRefresh = false) {
    if (remoteCommunityThemes && !forceRefresh) return remoteCommunityThemes;

    try {
        const repoOwner = 'sysoutch';
        const repoName = 'emuBro-themes';
        const themesPath = 'community-themes';

        const response = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/contents/${themesPath}`);
        if (!response.ok) throw new Error('Failed to fetch themes list');

        const contents = await response.json();
        const themeFiles = contents.filter(item =>
            item.type === 'file' &&
            item.name.endsWith('.json')
        );

        const fetchedThemes = [];

        for (const file of themeFiles) {
            try {
                const themeRes = await fetch(file.download_url);
                if (themeRes.ok) {
                    const theme = await themeRes.json();
                    if (theme.background?.image) {
                        const img = theme.background.image;
                        if (!img.startsWith('http') && !img.startsWith('data:')) {
                            console.warn(`Theme ${file.name} has a relative image path which may no longer exist.`);
                        }
                    }
                    fetchedThemes.push(theme);
                }
            } catch (err) {
                log.error(`Failed to fetch theme file ${file.name}:`, err);
            }
        }

        remoteCommunityThemes = fetchedThemes;
        return fetchedThemes;
    } catch (error) {
        log.error('Error fetching community themes:', error);
        return [];
    }
}
