import {
    normalizeSuggestionProvider,
    loadSuggestionSettings,
    getSuggestionLlmRoutingSettings
} from '../suggestions-settings';
import { showTextInputDialog } from '../ui/text-input-dialog';
import { normalizeNameKey } from './game-utils';

export function createGameDetailsPopupActions(deps = {}) {
    const emubro = deps.emubro || window.emubro;
    const i18n = deps.i18n || window.i18n || { t: (key) => String(key || '') };
    const localStorageRef = deps.localStorage || window.localStorage;
    const escapeHtml = deps.escapeHtml || ((value) => String(value ?? ''));
    const getGames = deps.getGames || (() => []);
    const getEmulators = deps.getEmulators || (() => []);
    const fetchEmulators = deps.fetchEmulators || (async () => []);
    const getGameImagePath = deps.getGameImagePath || (() => '');
    const markGameCoverUpdated = typeof deps.markGameCoverUpdated === 'function'
        ? deps.markGameCoverUpdated
        : (() => {});
    const initializeLazyGameImages = deps.initializeLazyGameImages || (() => {});
    const reloadGamesFromMainAndRender = deps.reloadGamesFromMainAndRender || (async () => {});
    const lazyPlaceholderSrc = String(deps.lazyPlaceholderSrc || '').trim();
    const isLlmHelpersEnabled = typeof deps.isLlmHelpersEnabled === 'function'
        ? deps.isLlmHelpersEnabled
        : (() => true);
    const isLlmAllowUnknownTagsEnabled = typeof deps.isLlmAllowUnknownTagsEnabled === 'function'
        ? deps.isLlmAllowUnknownTagsEnabled
        : (() => false);
    const alertUser = typeof deps.alertUser === 'function'
        ? deps.alertUser
        : ((message) => window.alert(String(message || '')));
    const confirmUser = typeof deps.confirmUser === 'function'
        ? deps.confirmUser
        : ((message) => window.confirm(String(message || '')));
    const t = (key, fallback) => {
        const safeKey = String(key || '').trim();
        try {
            const translated = i18n.t(safeKey);
            if (typeof translated === 'string') {
                const normalized = translated.trim();
                if (normalized && normalized !== safeKey) return normalized;
            } else if (typeof translated === 'number' && Number.isFinite(translated)) {
                return String(translated);
            }
        } catch (_error) {}
        return String(fallback || safeKey || '');
    };

    const GAME_INFO_PIN_STORAGE_KEY = 'emuBro.gameInfoPopupPinned';
    const GROUP_SAME_NAMES_STORAGE_KEY = 'emuBro.groupSameNamesEnabled';
    let gameInfoPopup = null;
    let gameInfoPlatformsCache = null;
    let gameTagCatalogCache = null;
    let gameInfoPopupPinned = false;
    try {
        gameInfoPopupPinned = localStorageRef.getItem(GAME_INFO_PIN_STORAGE_KEY) === 'true';
    } catch (_e) {
        gameInfoPopupPinned = false;
    }

    function getGameInfoPinIconMarkup() {
        return `
        <span class="icon-svg" aria-hidden="true">
            <svg viewBox="0 0 24 24">
                <path d="M8.5 4h7l-1.5 4.8v3.1l1.4 1.5h-6.8l1.4-1.5V8.8L8.5 4Z"></path>
                <path d="M12 13.4V20"></path>
            </svg>
        </span>
    `;
    }

    function setGameInfoPinnedStorage(pinned) {
        gameInfoPopupPinned = !!pinned;
        try {
            localStorageRef.setItem(GAME_INFO_PIN_STORAGE_KEY, gameInfoPopupPinned ? 'true' : 'false');
        } catch (_e) {}
    }

    function applyGameInfoPinnedState() {
        if (!gameInfoPopup) return;
        const pinBtn = gameInfoPopup.querySelector('#pin-game-info');
        const isDocked = gameInfoPopup.classList.contains('docked-right');
        const pinned = !!(isDocked || gameInfoPopupPinned);
        gameInfoPopup.classList.toggle('is-pinned', pinned);
        if (pinBtn) {
            pinBtn.classList.toggle('active', pinned);
            pinBtn.innerHTML = getGameInfoPinIconMarkup();
            pinBtn.title = pinned ? 'Unpin' : 'Pin';
            pinBtn.setAttribute('aria-label', pinned ? 'Unpin details window' : 'Pin details window');
        }
    }

    function hideGameInfoPopup() {
        if (!gameInfoPopup) return;
        gameInfoPopup.style.display = 'none';
        gameInfoPopup.classList.remove('active');
        if (gameInfoPopup.classList.contains('docked-right')) {
            import('../docking-manager').then((m) => m.completelyRemoveFromDock('game-info-modal'));
        } else {
            import('../docking-manager').then((m) => m.removeFromDock('game-info-modal'));
        }
        setGameInfoPinnedStorage(false);
        applyGameInfoPinnedState();
    }

    function ensureGameInfoPopup() {
        if (gameInfoPopup && gameInfoPopup.isConnected) return gameInfoPopup;

        gameInfoPopup = document.getElementById('game-info-modal');
        if (!gameInfoPopup) return null;
        if (gameInfoPopup.dataset.initialized === '1') return gameInfoPopup;

        const closeBtn = gameInfoPopup.querySelector('#close-game-info');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                hideGameInfoPopup();
            });
        }

        const pinBtn = gameInfoPopup.querySelector('#pin-game-info');
        if (pinBtn) {
            pinBtn.addEventListener('click', (event) => {
                event.stopPropagation();
                const shouldPin = !gameInfoPopup.classList.contains('docked-right');
                import('../docking-manager').then((m) => {
                    m.toggleDock('game-info-modal', 'pin-game-info', shouldPin);
                    setGameInfoPinnedStorage(shouldPin);
                    applyGameInfoPinnedState();
                });
            });
        }

        import('../theme-manager').then((m) => m.makeDraggable('game-info-modal', 'game-info-header'));
        gameInfoPopup.dataset.initialized = '1';
        applyGameInfoPinnedState();
        return gameInfoPopup;
    }

    function bindCreateShortcutAction(button, game) {
        if (!button || !window.emubro || typeof window.emubro.createGameShortcut !== 'function') return;
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            button.disabled = true;
            try {
                const res = await window.emubro.createGameShortcut(game.id);
                if (res && res.success) {
                    alertUser(`Shortcut created:\n${res.path}`);
                } else {
                    alertUser(`Failed to create shortcut: ${res?.message || 'Unknown error'}`);
                }
            } catch (err) {
                alertUser(`Failed to create shortcut: ${err?.message || err}`);
            } finally {
                button.disabled = false;
            }
        });
    }

    async function ensurePopupEmulatorsLoaded() {
        const current = Array.isArray(getEmulators()) ? getEmulators() : [];
        if (current.length > 0) return current;
        try {
            await fetchEmulators();
        } catch (_error) {}
        return Array.isArray(getEmulators()) ? getEmulators() : [];
    }

    async function getGameInfoPlatforms() {
        if (Array.isArray(gameInfoPlatformsCache) && gameInfoPlatformsCache.length > 0) {
            return gameInfoPlatformsCache;
        }
        try {
            const rows = await emubro.invoke('get-platforms');
            gameInfoPlatformsCache = Array.isArray(rows) ? rows : [];
        } catch (_error) {
            gameInfoPlatformsCache = [];
        }
        return gameInfoPlatformsCache;
    }

    async function getGameTagCatalog() {
        if (Array.isArray(gameTagCatalogCache) && gameTagCatalogCache.length > 0) {
            return gameTagCatalogCache;
        }
        try {
            const result = await emubro.invoke('tags:list');
            const rows = Array.isArray(result?.tags) ? result.tags : [];
            gameTagCatalogCache = rows
                .map((row) => ({
                    id: normalizeTagId(row?.id),
                    label: String(row?.label || row?.id || '').trim()
                }))
                .filter((row) => row.id && row.label);
        } catch (_error) {
            gameTagCatalogCache = [];
        }
        return gameTagCatalogCache;
    }

    function normalizeTagId(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function isGroupSameNamesEnabled() {
        try {
            return localStorageRef.getItem(GROUP_SAME_NAMES_STORAGE_KEY) === 'true';
        } catch (_error) {
            return false;
        }
    }

    function resolveGroupedCoverTargetIds(game, sourceRows = null) {
        if (!isGroupSameNamesEnabled()) return [];
        const currentId = Number(game?.id || 0);
        if (!currentId) return [];

        const targetIds = new Set();
        const addTargetId = (value) => {
            const id = Number(value || 0);
            if (!id || id === currentId) return;
            targetIds.add(id);
        };

        (Array.isArray(game?.__groupMembers) ? game.__groupMembers : []).forEach((member) => {
            addTargetId(member?.id);
        });

        const normalizedName = normalizeNameKey(game?.name || game?.__groupDisplayName || '');
        const platformShortName = String(game?.platformShortName || game?.platform || '').trim().toLowerCase();
        if (!normalizedName || !platformShortName) {
            return Array.from(targetIds);
        }

        const rows = Array.isArray(sourceRows)
            ? sourceRows
            : (Array.isArray(getGames()) ? getGames() : []);

        rows.forEach((row) => {
            const rowId = Number(row?.id || 0);
            if (!rowId || rowId === currentId) return;
            const rowPlatformShortName = String(row?.platformShortName || row?.platform || '').trim().toLowerCase();
            if (rowPlatformShortName !== platformShortName) return;
            const rowNameKey = normalizeNameKey(row?.name || row?.__groupDisplayName || '');
            if (rowNameKey !== normalizedName) return;
            addTargetId(rowId);
        });

        return Array.from(targetIds);
    }

    async function applyCoverToGroupedGames(game, imageValue, sourceRows = null) {
        const image = String(imageValue || '').trim();
        if (!image) return { updated: 0, failed: 0, total: 0 };

        const targetIds = resolveGroupedCoverTargetIds(game, sourceRows);
        if (!targetIds.length) return { updated: 0, failed: 0, total: 0 };

        let updated = 0;
        let failed = 0;
        for (const targetId of targetIds) {
            try {
                const result = await emubro.invoke('update-game-metadata', {
                    gameId: targetId,
                    image
                });
                if (result?.success) {
                    updated += 1;
                    markGameCoverUpdated(targetId);
                } else {
                    failed += 1;
                }
            } catch (_error) {
                failed += 1;
            }
        }
        return { updated, failed, total: targetIds.length };
    }

    function renderSelectedTagPills(container, selectedTagIds, tagCatalog) {
        if (!container) return;
        const selected = Array.isArray(selectedTagIds) ? selectedTagIds : [];
        const catalog = Array.isArray(tagCatalog) ? tagCatalog : [];
        if (selected.length === 0) {
            container.innerHTML = '<span class="game-tag-pill is-empty">No tags assigned</span>';
            return;
        }

        container.innerHTML = selected.map((tagId) => {
            const info = catalog.find((row) => String(row?.id || '').toLowerCase() === String(tagId || '').toLowerCase());
            const label = info?.label || tagId;
            return `<span class="game-tag-pill">${escapeHtml(label)}</span>`;
        }).join('');
    }

    function applySelectedTagIdsToSelect(select, selectedTagIds) {
        if (!select) return;
        const selected = new Set((Array.isArray(selectedTagIds) ? selectedTagIds : [])
            .map((tag) => normalizeTagId(tag))
            .filter(Boolean));
        Array.from(select.options || []).forEach((option) => {
            option.selected = selected.has(normalizeTagId(option.value));
        });
    }

    async function saveGameTagsAndRefresh(game, tags) {
        const normalizedTags = (Array.isArray(tags) ? tags : [])
            .map((tag) => normalizeTagId(tag))
            .filter(Boolean);

        const result = await emubro.invoke('update-game-metadata', {
            gameId: game.id,
            tags: normalizedTags
        });
        if (!result?.success) {
            throw new Error(result?.message || 'Failed to save tags.');
        }

        game.tags = normalizedTags;
        gameTagCatalogCache = null;
        await reloadGamesFromMainAndRender();
        try {
            window.dispatchEvent(new CustomEvent('emubro:game-tags-updated', {
                detail: { gameId: Number(game.id), tags: normalizedTags }
            }));
        } catch (_error) {}
        const refreshedGame = getGames().find((row) => Number(row.id) === Number(game.id));
        if (refreshedGame) {
            showGameDetails(refreshedGame);
        }
    }

    async function bindLlmTagSuggestionAction(button, select, selectedPreview, game) {
        if (!button || !select || !selectedPreview || !game) return;
        button.addEventListener('click', async () => {
            const catalog = await getGameTagCatalog();
            if (!catalog.length) {
                alertUser('No tags found in emubro-resources/tags.');
                return;
            }

            const tagById = new Set(catalog.map((tag) => normalizeTagId(tag.id)));
            const settings = loadSuggestionSettings(localStorageRef);
            const provider = normalizeSuggestionProvider(settings.provider);
            const model = String(settings.models?.[provider] || '').trim();
            const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
            const apiKey = String(settings.apiKeys?.[provider] || '').trim();
            const routing = getSuggestionLlmRoutingSettings(settings);
            const allowUnknownTags = !!isLlmAllowUnknownTagsEnabled();

            if (routing.llmMode === 'client' && !routing.relayHostUrl) {
                alertUser('Set a relay host URL first in Settings -> AI / LLM.');
                return;
            }
            if (routing.llmMode !== 'client' && (!model || !baseUrl)) {
                alertUser('Configure your LLM provider/model first in Suggested view.');
                return;
            }
            if (routing.llmMode !== 'client' && (provider === 'openai' || provider === 'gemini') && !apiKey) {
                alertUser('API key is missing for the selected provider.');
                return;
            }

            const previousLabel = button.textContent;
            button.disabled = true;
            button.textContent = 'Tagging...';
            try {
                const response = await emubro.invoke('suggestions:suggest-tags-for-game', {
                    provider,
                    model,
                    baseUrl,
                    apiKey,
                    ...routing,
                    maxTags: 6,
                    allowUnknownTags,
                    game: {
                        id: Number(game.id || 0),
                        name: String(game.name || ''),
                        platform: String(game.platform || game.platformShortName || ''),
                        platformShortName: String(game.platformShortName || ''),
                        genre: String(game.genre || ''),
                        description: String(game.description || ''),
                        tags: Array.isArray(game.tags) ? game.tags : []
                    },
                    availableTags: catalog
                });

                if (!response?.success) {
                    alertUser(response?.message || 'Failed to generate tags.');
                    return;
                }

                const suggestedTags = (Array.isArray(response?.tags) ? response.tags : [])
                    .map((tag) => normalizeTagId(tag))
                    .filter((tag) => allowUnknownTags ? !!tag : tagById.has(tag));

                if (!suggestedTags.length) {
                    alertUser(allowUnknownTags
                        ? 'LLM did not return usable tags.'
                        : 'LLM did not return matching tags from your catalog.');
                    return;
                }

                applySelectedTagIdsToSelect(select, suggestedTags);
                renderSelectedTagPills(selectedPreview, suggestedTags, catalog);
                await saveGameTagsAndRefresh(game, suggestedTags);
            } catch (error) {
                alertUser(error?.message || 'Failed to apply LLM tags.');
            } finally {
                button.disabled = false;
                button.textContent = previousLabel;
            }
        });
    }

    async function bindDescriptionActions(textarea, saveBtn, llmBtn, statusEl, game) {
        if (!textarea || !saveBtn || !game) return;

        const setStatus = (message, level = 'info') => {
            if (!statusEl) return;
            statusEl.textContent = String(message || '');
            statusEl.dataset.level = String(level || 'info');
        };

        const saveDescription = async (description) => {
            const result = await emubro.invoke('update-game-metadata', {
                gameId: game.id,
                description: String(description || '').trim()
            });
            if (!result?.success) {
                throw new Error(String(result?.message || 'Failed to save description.'));
            }
            game.description = String(description || '').trim();
            try {
                await reloadGamesFromMainAndRender();
            } catch (_error) {}
        };

        saveBtn.addEventListener('click', async () => {
            const description = String(textarea.value || '').trim();
            saveBtn.disabled = true;
            setStatus('Saving description...', 'info');
            try {
                await saveDescription(description);
                setStatus('Description saved.', 'success');
            } catch (error) {
                setStatus(String(error?.message || 'Failed to save description.'), 'error');
            } finally {
                saveBtn.disabled = false;
            }
        });

        if (!llmBtn) return;
        llmBtn.addEventListener('click', async () => {
            const settings = loadSuggestionSettings(localStorageRef);
            const provider = normalizeSuggestionProvider(settings.provider);
            const model = String(settings.models?.[provider] || '').trim();
            const baseUrl = String(settings.baseUrls?.[provider] || '').trim();
            const apiKey = String(settings.apiKeys?.[provider] || '').trim();
            const routing = getSuggestionLlmRoutingSettings(settings);

            if (routing.llmMode === 'client' && !routing.relayHostUrl) {
                setStatus('Set a relay host URL first in Settings -> AI / LLM.', 'error');
                return;
            }
            if (routing.llmMode !== 'client' && (!model || !baseUrl)) {
                setStatus('Configure your LLM provider/model first in Suggested view.', 'error');
                return;
            }
            if (routing.llmMode !== 'client' && (provider === 'openai' || provider === 'gemini') && !apiKey) {
                setStatus('API key is missing for the selected provider.', 'error');
                return;
            }

            const oldLabel = llmBtn.textContent;
            llmBtn.disabled = true;
            saveBtn.disabled = true;
            llmBtn.textContent = 'Generating...';
            setStatus('Generating description with LLM...', 'info');
            try {
                const response = await emubro.invoke('suggestions:generate-description-for-game', {
                    provider,
                    model,
                    baseUrl,
                    apiKey,
                    ...routing,
                    maxChars: 420,
                    game: {
                        id: Number(game.id || 0),
                        name: String(game.name || ''),
                        platform: String(game.platform || game.platformShortName || ''),
                        platformShortName: String(game.platformShortName || ''),
                        genre: String(game.genre || ''),
                        description: String(textarea.value || game.description || ''),
                        filePath: String(game.filePath || ''),
                        path: String(game.filePath || ''),
                        tags: Array.isArray(game.tags) ? game.tags : []
                    }
                });

                if (!response?.success) {
                    throw new Error(String(response?.message || 'Failed to generate description.'));
                }

                const generated = String(response?.description || '').trim();
                if (!generated) {
                    throw new Error('LLM returned an empty description.');
                }

                textarea.value = generated;
                await saveDescription(generated);
                setStatus('Description generated and saved.', 'success');
            } catch (error) {
                setStatus(String(error?.message || 'Failed to generate description.'), 'error');
            } finally {
                llmBtn.disabled = false;
                saveBtn.disabled = false;
                llmBtn.textContent = oldLabel;
            }
        });
    }

    async function bindTagAssignmentAction(select, saveBtn, clearBtn, renameBtn, deleteBtn, selectedPreview, game) {
        if (!select || !saveBtn || !clearBtn || !selectedPreview || !game) return;

        const catalog = await getGameTagCatalog();
        const getAssignedTagIds = () => Array.from(new Set(
            (Array.isArray(game?.tags) ? game.tags : [])
                .map((tag) => normalizeTagId(tag))
                .filter(Boolean)
        ));
        const currentTags = getAssignedTagIds();
        const currentTagSet = new Set(currentTags);

        if (catalog.length === 0) {
            select.innerHTML = '<option value="">No tags found in emubro-resources/tags</option>';
            select.disabled = true;
            saveBtn.disabled = true;
            clearBtn.disabled = true;
            if (renameBtn) renameBtn.disabled = true;
            if (deleteBtn) deleteBtn.disabled = true;
            renderSelectedTagPills(selectedPreview, [], []);
            return;
        }

        select.innerHTML = catalog.map((tag) => {
            const selected = currentTagSet.has(normalizeTagId(tag.id)) ? ' selected' : '';
            return `<option value="${escapeHtml(tag.id)}"${selected}>${escapeHtml(tag.label)}</option>`;
        }).join('');

        const getSelectedTagIds = () => Array.from(select.selectedOptions || [])
            .map((option) => String(option.value || '').trim().toLowerCase())
            .filter(Boolean);

        const syncPreview = () => {
            renderSelectedTagPills(selectedPreview, getSelectedTagIds(), catalog);
        };

        syncPreview();

        select.addEventListener('change', syncPreview);

        clearBtn.addEventListener('click', () => {
            Array.from(select.options || []).forEach((option) => {
                option.selected = false;
            });
            syncPreview();
        });

        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            try {
                const tags = getSelectedTagIds();
                await saveGameTagsAndRefresh(game, tags);
            } catch (error) {
                alertUser(error?.message || 'Failed to save tags.');
            } finally {
                saveBtn.disabled = false;
            }
        });

        if (renameBtn) {
            renameBtn.addEventListener('click', async () => {
                const selectedTagIds = getSelectedTagIds();
                if (selectedTagIds.length !== 1) {
                    alertUser('Select exactly one tag to rename.');
                    return;
                }
                const targetTagId = selectedTagIds[0] || '';
                if (!targetTagId) {
                    alertUser('Select a tag first.');
                    return;
                }

                const targetInfo = catalog.find((row) => normalizeTagId(row.id) === normalizeTagId(targetTagId));
                const currentLabel = String(targetInfo?.label || targetTagId).trim();
                const nextLabelInput = await showTextInputDialog({
                    title: 'Rename Tag',
                    message: 'Enter a new tag name.',
                    initialValue: currentLabel,
                    confirmLabel: 'Rename',
                    cancelLabel: 'Cancel'
                });
                if (nextLabelInput === null) return;
                const nextLabel = String(nextLabelInput || '').trim();
                if (!nextLabel) {
                    alertUser('Tag name cannot be empty.');
                    return;
                }

                renameBtn.disabled = true;
                try {
                    const result = await emubro.invoke('tags:rename', {
                        oldTagId: targetTagId,
                        newTagName: nextLabel
                    });
                    if (!result?.success) {
                        alertUser(result?.message || 'Failed to rename tag.');
                        return;
                    }

                    const nextTagId = normalizeTagId(result?.newTagId || nextLabel);
                    const remappedTags = Array.from(new Set(
                        getAssignedTagIds()
                            .map((tagId) => normalizeTagId(tagId) === normalizeTagId(targetTagId) ? nextTagId : normalizeTagId(tagId))
                            .filter(Boolean)
                    ));
                    applySelectedTagIdsToSelect(select, remappedTags);
                    gameTagCatalogCache = null;
                    await saveGameTagsAndRefresh(game, remappedTags);
                } catch (error) {
                    alertUser(error?.message || 'Failed to rename tag.');
                } finally {
                    renameBtn.disabled = false;
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', async () => {
                const selectedTagIds = Array.from(new Set(
                    getSelectedTagIds()
                        .map((tagId) => normalizeTagId(tagId))
                        .filter(Boolean)
                ));
                if (selectedTagIds.length === 0) {
                    alertUser('Select one or more tags first.');
                    return;
                }
                const labelMap = new Map(
                    (Array.isArray(catalog) ? catalog : [])
                        .map((row) => [normalizeTagId(row?.id), String(row?.label || row?.id || '').trim()])
                );
                const previewLabels = selectedTagIds
                    .slice(0, 5)
                    .map((tagId) => labelMap.get(tagId) || tagId)
                    .join(', ');
                const hasMore = selectedTagIds.length > 5 ? ` and ${selectedTagIds.length - 5} more` : '';
                const confirmed = confirmUser(
                    `Delete ${selectedTagIds.length} tag(s): ${previewLabels}${hasMore}?\n\nThis removes them from all games.`
                );
                if (!confirmed) return;

                deleteBtn.disabled = true;
                try {
                    const deletedTagIds = [];
                    const failedDeletes = [];
                    for (const targetTagId of selectedTagIds) {
                        // eslint-disable-next-line no-await-in-loop
                        const result = await emubro.invoke('tags:delete', { tagId: targetTagId });
                        if (result?.success) {
                            deletedTagIds.push(targetTagId);
                        } else {
                            failedDeletes.push({
                                tagId: targetTagId,
                                message: String(result?.message || 'Failed to delete tag.')
                            });
                        }
                    }

                    if (deletedTagIds.length === 0) {
                        const firstError = failedDeletes[0];
                        alertUser(firstError?.message || 'Failed to delete selected tags.');
                        return;
                    }

                    const deletedSet = new Set(deletedTagIds.map((tagId) => normalizeTagId(tagId)));
                    const remainingTags = getAssignedTagIds()
                        .filter((tagId) => !deletedSet.has(normalizeTagId(tagId)));
                    applySelectedTagIdsToSelect(select, remainingTags);
                    gameTagCatalogCache = null;
                    await saveGameTagsAndRefresh(game, remainingTags);

                    if (failedDeletes.length > 0) {
                        alertUser(
                            `Deleted ${deletedTagIds.length} tag(s), but ${failedDeletes.length} failed.\n` +
                            failedDeletes.map((entry) => `${entry.tagId}: ${entry.message}`).join('\n')
                        );
                    }
                } catch (error) {
                    alertUser(error?.message || 'Failed to delete tag.');
                } finally {
                    deleteBtn.disabled = false;
                }
            });
        }
    }

    function isKnownGamePlatform(game, platforms) {
        const current = String(game?.platformShortName || '').trim().toLowerCase();
        if (!current) return false;
        const rows = Array.isArray(platforms) ? platforms : [];
        return rows.some((platform) => String(platform?.shortName || '').trim().toLowerCase() === current);
    }

    async function bindShowInExplorerAction(button, game) {
        if (!button || !game) return;
        button.addEventListener('click', async () => {
            const filePath = String(game.filePath || '').trim();
            if (!filePath) {
                alertUser('Game file path is missing.');
                return;
            }
            const result = await emubro.invoke('show-item-in-folder', filePath);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to open file location.');
            }
        });
    }

    function promptRemoveGameOptions(game) {
        return new Promise((resolve) => {
            const safeName = String(game?.name || 'this game').trim() || 'this game';
            const overlay = document.createElement('div');
            overlay.style.cssText = [
                'position:fixed',
                'inset:0',
                'z-index:4000',
                'display:flex',
                'align-items:center',
                'justify-content:center',
                'padding:16px',
                'background:rgba(0,0,0,0.55)'
            ].join(';');

            const dialog = document.createElement('div');
            dialog.className = 'glass';
            dialog.style.cssText = [
                'width:min(520px, 92vw)',
                'border:1px solid var(--border-color)',
                'border-radius:12px',
                'background:var(--bg-secondary)',
                'box-shadow:0 10px 30px rgba(0,0,0,0.35)',
                'padding:16px',
                'display:grid',
                'gap:12px'
            ].join(';');

            const title = document.createElement('div');
            title.style.cssText = 'font-size:18px;font-weight:700;';
            title.textContent = t('gameDetails.removeGameTitle', 'Remove Game');

            const text = document.createElement('div');
            text.style.cssText = 'opacity:0.92;line-height:1.45;';
            text.textContent = t('gameDetails.removeGameConfirm', 'Remove "{{name}}" from library?').replace('{{name}}', safeName);

            const checkboxWrap = document.createElement('label');
            checkboxWrap.style.cssText = 'display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none;';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = false;
            checkboxWrap.appendChild(checkbox);
            const checkboxLabel = document.createElement('span');
            checkboxLabel.textContent = t('gameDetails.removeGameAlsoDisk', 'Also remove on Disk');
            checkboxWrap.appendChild(checkboxLabel);

            const buttons = document.createElement('div');
            buttons.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;';
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'action-btn';
            cancelBtn.type = 'button';
            cancelBtn.textContent = t('buttons.cancel', 'Cancel');
            const removeBtn = document.createElement('button');
            removeBtn.className = 'action-btn remove-btn';
            removeBtn.type = 'button';
            removeBtn.textContent = t('gameDetails.removeGameAction', 'Remove Game');
            buttons.appendChild(cancelBtn);
            buttons.appendChild(removeBtn);

            const cleanup = (result) => {
                window.removeEventListener('keydown', onKeyDown, true);
                overlay.remove();
                resolve(result);
            };

            const onKeyDown = (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    cleanup({ canceled: true, removeFromDisk: false });
                }
            };

            cancelBtn.addEventListener('click', () => cleanup({ canceled: true, removeFromDisk: false }));
            removeBtn.addEventListener('click', () => cleanup({ canceled: false, removeFromDisk: !!checkbox.checked }));

            dialog.appendChild(title);
            dialog.appendChild(text);
            dialog.appendChild(checkboxWrap);
            dialog.appendChild(buttons);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);
            window.addEventListener('keydown', onKeyDown, true);
            checkbox.focus();
        });
    }

    async function bindRemoveGameAction(button, game) {
        if (!button || !game) return;
        button.addEventListener('click', async () => {
            const choice = await promptRemoveGameOptions(game);
            if (!choice || choice.canceled) return;

            button.disabled = true;
            try {
                const result = await emubro.invoke('remove-game', {
                    gameId: game.id,
                    removeFromDisk: !!choice.removeFromDisk
                });
                if (!result?.success) {
                    alertUser(result?.message || 'Failed to remove game.');
                    return;
                }
                hideGameInfoPopup();
                await reloadGamesFromMainAndRender();
                alertUser(result?.message || 'Game removed from library.');
            } catch (error) {
                alertUser(error?.message || 'Failed to remove game.');
            } finally {
                button.disabled = false;
            }
        });
    }

    function normalizeCoverPlatform(value) {
        const raw = String(value || '').trim().toLowerCase();
        if (!raw) return '';
        if (raw === 'psx' || raw === 'ps2') return raw;
        if (raw === 'ps1' || raw === 'ps') return 'psx';
        if (raw === 'playstation' || raw === 'playstation-1') return 'psx';
        if (raw === 'playstation2' || raw === 'playstation-2') return 'ps2';
        return '';
    }

    function stripBracketedTitleParts(value) {
        let text = String(value || '');
        if (!text) return '';

        // Remove bracketed fragments like "(USA)", "[v1.1]" or "{Prototype}".
        let previous = '';
        while (previous !== text) {
            previous = text;
            text = text.replace(/\s*[\(\[\{][^()\[\]{}]*[\)\]\}]\s*/g, ' ');
        }
        return text.replace(/\s+/g, ' ').trim();
    }

    function normalizeTrailingArticleTitle(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        const match = text.match(/^(.+?),\s*the(\b.*)?$/i);
        if (!match) return text;
        const baseTitle = String(match[1] || '').trim();
        const suffix = String(match[2] || '').trimStart();
        return `The ${baseTitle}${suffix ? ` ${suffix}` : ''}`.replace(/\s+/g, ' ').trim();
    }

    function buildCoverSearchPlatformTokens(game) {
        const tokens = [];
        const seen = new Set();
        const pushToken = (value) => {
            const text = String(value || '').trim();
            if (!text) return;
            const key = text.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            tokens.push(text);
        };

        const normalizedPlatform = normalizeCoverPlatform(game?.platformShortName || game?.platform);
        if (normalizedPlatform === 'psx') pushToken('PS1');
        if (normalizedPlatform === 'ps2') pushToken('PS2');
        pushToken(game?.platformShortName);
        pushToken(game?.platform);
        return tokens;
    }

    function buildCoverSearchQuery(game) {
        const gameName = normalizeTrailingArticleTitle(
            stripBracketedTitleParts(game?.name || '')
        );
        const platformTokens = buildCoverSearchPlatformTokens(game);
        return [gameName, ...platformTokens, 'cover'].filter(Boolean).join(' ').trim();
    }

    async function bindCoverDownloadAction(button, statusEl, game) {
        if (!button || !game) return;
        const setStatus = (message, level = 'info') => {
            if (!statusEl) return;
            statusEl.textContent = String(message || '').trim();
            statusEl.dataset.level = level;
        };
        const platform = normalizeCoverPlatform(game.platformShortName || game.platform);
        if (!platform) {
            button.disabled = true;
            button.title = 'PS1/PS2 only';
            setStatus('Cover download supports PS1/PS2 only.', 'warning');
            return;
        }
        setStatus('', 'info');

        button.addEventListener('click', async () => {
            const previousLabel = button.textContent;
            button.disabled = true;
            button.textContent = 'Downloading...';
            setStatus('Downloading cover...', 'info');
            try {
                const result = await emubro.invoke('covers:download-for-game', {
                    gameId: game.id,
                    overwrite: true
                });
                if (!result?.success) {
                    const message = String(result?.message || 'Failed to download cover.');
                    setStatus(message, 'error');
                    alertUser(message);
                    return;
                }

                if (result?.status === 'missing_serial') {
                    setStatus('No serial/game code found for this game.', 'warning');
                    return;
                }
                if (result?.status === 'not_found') {
                    setStatus('No cover found in configured PS1/PS2 sources for this serial.', 'warning');
                    return;
                }

                markGameCoverUpdated(game.id);
                await reloadGamesFromMainAndRender();
                let refreshedGame = getGames().find((row) => Number(row.id) === Number(game.id));
                let groupedCoverResult = { updated: 0, failed: 0, total: 0 };
                const refreshedImage = String(refreshedGame?.image || '').trim();
                if (refreshedImage) {
                    groupedCoverResult = await applyCoverToGroupedGames(refreshedGame || game, refreshedImage, getGames());
                    if (groupedCoverResult.updated > 0) {
                        await reloadGamesFromMainAndRender();
                        refreshedGame = getGames().find((row) => Number(row.id) === Number(game.id)) || refreshedGame;
                    }
                }
                if (refreshedGame) showGameDetails(refreshedGame);
                const groupedNote = groupedCoverResult.updated > 0
                    ? ` Applied to ${groupedCoverResult.updated} grouped game(s).`
                    : '';

                if (result?.status === 'reused_existing_file') {
                    setStatus(`Cover applied from local cache.${groupedNote}`, 'success');
                } else {
                    setStatus(`Cover downloaded and applied.${groupedNote}`, 'success');
                }
            } catch (error) {
                const message = String(error?.message || 'Failed to download cover.');
                setStatus(message, 'error');
                alertUser(message);
            } finally {
                button.disabled = false;
                button.textContent = previousLabel;
            }
        });
    }

    async function openCoverSearchInExternalBrowser(query) {
        const searchQuery = String(query || '').trim();
        if (!searchQuery) return;
        const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(searchQuery)}`;
        try {
            await emubro.invoke('open-external-url', url);
        } catch (_error) {
            if (window?.open) window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    function bindCoverWebSearchAction(button, browserPanel, game) {
        if (!button || !browserPanel || !game) return;

        const queryInput = browserPanel.querySelector('[data-cover-browser-query]');
        const runBtn = browserPanel.querySelector('[data-cover-browser-run]');
        const closeBtn = browserPanel.querySelector('[data-cover-browser-close]');
        const externalBtn = browserPanel.querySelector('[data-cover-browser-open-external]');
        const statusEl = browserPanel.querySelector('[data-cover-browser-status]');
        const resultsEl = browserPanel.querySelector('[data-cover-browser-results]');
        const defaultQuery = buildCoverSearchQuery(game);
        const state = {
            loading: false,
            results: []
        };

        const setStatus = (message, level = 'info') => {
            if (!statusEl) return;
            statusEl.textContent = String(message || '').trim();
            statusEl.dataset.level = level;
        };

        const renderResults = () => {
            if (!resultsEl) return;
            if (!state.results.length) {
                resultsEl.innerHTML = '<div class="game-cover-browser-empty">No web results yet. Run a search.</div>';
                return;
            }
            resultsEl.innerHTML = state.results.map((row, index) => {
                const thumb = escapeHtml(String(row?.thumbnailUrl || row?.imageUrl || '').trim());
                const title = escapeHtml(String(row?.title || row?.source || 'Cover result').trim() || 'Cover result');
                const source = escapeHtml(String(row?.source || '').trim() || 'web');
                return `
                    <button type="button" class="game-cover-browser-card" data-cover-browser-apply-index="${index}" title="Use this cover">
                        <span class="game-cover-browser-thumb-wrap">
                            <img class="game-cover-browser-thumb" src="${thumb}" alt="${title}" loading="lazy" />
                        </span>
                        <span class="game-cover-browser-title">${title}</span>
                        <span class="game-cover-browser-source">${source}</span>
                    </button>
                `;
            }).join('');
        };

        const runSearch = async () => {
            if (state.loading) return;
            const query = String(queryInput?.value || defaultQuery).trim();
            if (!query) return;

            state.loading = true;
            if (runBtn) runBtn.disabled = true;
            setStatus('Searching web cover results...', 'info');
            try {
                const result = await emubro.invoke('covers:search-web', { query, limit: 24 });
                if (!result?.success) {
                    state.results = [];
                    renderResults();
                    setStatus(String(result?.message || 'Cover web search failed.'), 'error');
                    return;
                }
                state.results = Array.isArray(result.results) ? result.results : [];
                renderResults();
                if (!state.results.length) {
                    setStatus('No results found for this query.', 'warning');
                } else {
                    setStatus(`Found ${state.results.length} result(s). Click one to apply.`, 'success');
                }
            } catch (error) {
                state.results = [];
                renderResults();
                setStatus(String(error?.message || 'Cover web search failed.'), 'error');
            } finally {
                state.loading = false;
                if (runBtn) runBtn.disabled = false;
            }
        };

        const closePanel = () => {
            browserPanel.classList.remove('is-open');
            button.classList.remove('is-active');
        };

        const openPanel = () => {
            browserPanel.classList.add('is-open');
            button.classList.add('is-active');
            if (!queryInput?.value && defaultQuery && queryInput) {
                queryInput.value = defaultQuery;
            }
        };

        button.addEventListener('click', async () => {
            const willOpen = !browserPanel.classList.contains('is-open');
            if (!willOpen) {
                closePanel();
                return;
            }
            openPanel();
            if (!state.results.length) {
                await runSearch();
            }
        });

        if (runBtn) {
            runBtn.addEventListener('click', async () => {
                await runSearch();
            });
        }

        if (queryInput) {
            queryInput.addEventListener('keydown', async (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                await runSearch();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closePanel();
            });
        }

        if (externalBtn) {
            externalBtn.addEventListener('click', async () => {
                const query = String(queryInput?.value || defaultQuery).trim();
                await openCoverSearchInExternalBrowser(query);
            });
        }

        if (resultsEl) {
            resultsEl.addEventListener('click', async (event) => {
                const card = event.target.closest('[data-cover-browser-apply-index]');
                if (!card) return;
                const index = Number(card.dataset.coverBrowserApplyIndex);
                if (!Number.isFinite(index) || index < 0) return;
                const row = state.results[index];
                const imageUrl = String(row?.imageUrl || row?.thumbnailUrl || '').trim();
                if (!imageUrl) return;

                card.disabled = true;
                setStatus('Applying selected cover...', 'info');
                try {
                    const result = await emubro.invoke('update-game-metadata', {
                        gameId: game.id,
                        image: imageUrl
                    });
                    if (!result?.success) {
                        throw new Error(String(result?.message || 'Failed to apply cover.'));
                    }
                    markGameCoverUpdated(game.id);
                    const groupedCoverResult = await applyCoverToGroupedGames(game, imageUrl, getGames());
                    await reloadGamesFromMainAndRender();
                    const refreshedGame = getGames().find((rowItem) => Number(rowItem.id) === Number(game.id));
                    if (refreshedGame) {
                        showGameDetails(refreshedGame);
                    }
                    const groupedNote = groupedCoverResult.updated > 0
                        ? ` Applied to ${groupedCoverResult.updated} grouped game(s).`
                        : '';
                    setStatus(`Cover applied from web result.${groupedNote}`, 'success');
                } catch (error) {
                    setStatus(String(error?.message || 'Failed to apply cover.'), 'error');
                } finally {
                    card.disabled = false;
                }
            });
        }
    }

    function isWebEmulatorPath(value) {
        const input = String(value || '').trim();
        if (!input) return false;
        if (/^https?:\/\//i.test(input)) return true;
        return /\.html?(?:$|[?#])/i.test(input);
    }

    async function bindEmulatorOverrideAction(select, game) {
        if (!select || !game) return;

        const rows = await ensurePopupEmulatorsLoaded();
        const gamePlatformShortName = String(game.platformShortName || '').trim().toLowerCase();
        const installedEmulators = rows
            .filter((emu) => {
                const emuPath = String(emu?.filePath || '').trim();
                if (!emuPath) return false;
                const isWebTarget = isWebEmulatorPath(emuPath) || String(emu?.type || '').trim().toLowerCase() === 'web';
                if (!isWebTarget && !emu?.isInstalled) return false;
                if (!gamePlatformShortName) return true;
                const emuPlatformShortName = String(emu?.platformShortName || emu?.platform || '').trim().toLowerCase();
                return emuPlatformShortName === gamePlatformShortName;
            })
            .sort((a, b) => {
                const aPath = String(a?.filePath || '').trim();
                const bPath = String(b?.filePath || '').trim();
                const aWeb = isWebEmulatorPath(aPath) || String(a?.type || '').trim().toLowerCase() === 'web';
                const bWeb = isWebEmulatorPath(bPath) || String(b?.type || '').trim().toLowerCase() === 'web';
                if (aWeb !== bWeb) return aWeb ? 1 : -1;
                return String(a?.name || '').localeCompare(String(b?.name || ''));
            });

        const currentOverride = String(game.emulatorOverridePath || '').trim();
        const defaultLabel = `Default (${game.platform || game.platformShortName || 'platform emulator'})`;
        let options = `<option value="">${escapeHtml(defaultLabel)}</option>`;

        options += installedEmulators.map((emu) => {
            const emuPath = String(emu.filePath || '').trim();
            const emuName = String(emu.name || 'Emulator').trim();
            const emuPlatform = String(emu.platformShortName || emu.platform || '').trim();
            const isWeb = isWebEmulatorPath(emuPath) || String(emu?.type || '').trim().toLowerCase() === 'web';
            const labelBase = emuPlatform ? `${emuName} (${emuPlatform})` : emuName;
            const label = isWeb ? `${labelBase} [Web]` : labelBase;
            const selected = currentOverride && emuPath.toLowerCase() === currentOverride.toLowerCase() ? ' selected' : '';
            return `<option value="${escapeHtml(emuPath)}"${selected}>${escapeHtml(label)}</option>`;
        }).join('');

        if (installedEmulators.length === 0) {
            options += '<option value="" disabled>No installed emulator found for this platform</option>';
        }

        select.innerHTML = options;

        select.addEventListener('change', async () => {
            const nextOverridePath = String(select.value || '').trim();
            const payload = {
                gameId: game.id,
                emulatorOverridePath: nextOverridePath || null
            };
            const result = await emubro.invoke('update-game-metadata', payload);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to save emulator override.');
                return;
            }
            game.emulatorOverridePath = nextOverridePath || null;
        });
    }

    function normalizeRunAsMode(value) {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized === 'admin' || normalized === 'user') return normalized;
        return 'default';
    }

    function applyRunAsUiState(select, input) {
        if (!select || !input) return;
        const mode = normalizeRunAsMode(select.value);
        const needsUser = mode === 'user';
        input.disabled = !needsUser;
        input.style.display = needsUser ? '' : 'none';
    }

    async function bindRunAsAction(select, userInput, game) {
        if (!select || !userInput || !game) return;

        const currentMode = normalizeRunAsMode(game.runAsMode || 'default');
        const currentUser = String(game.runAsUser || '').trim();
        select.value = currentMode;
        userInput.value = currentUser;
        applyRunAsUiState(select, userInput);

        const saveRunAsSettings = async (nextMode, nextUser) => {
            const payload = { gameId: game.id, runAsMode: nextMode };
            if (nextMode === 'user') {
                const trimmedUser = String(nextUser || '').trim();
                if (!trimmedUser) {
                    alertUser('Please enter a username for "Run as user".');
                    return false;
                }
                payload.runAsUser = trimmedUser;
            }

            const result = await emubro.invoke('update-game-metadata', payload);
            if (!result?.success) {
                alertUser(result?.message || 'Failed to save run-as settings.');
                return false;
            }

            game.runAsMode = nextMode;
            if (Object.prototype.hasOwnProperty.call(payload, 'runAsUser')) {
                game.runAsUser = payload.runAsUser;
            }
            return true;
        };

        select.addEventListener('change', async () => {
            const nextMode = normalizeRunAsMode(select.value);
            applyRunAsUiState(select, userInput);
            await saveRunAsSettings(nextMode, userInput.value);
        });

        userInput.addEventListener('change', async () => {
            const nextMode = normalizeRunAsMode(select.value);
            if (nextMode !== 'user') return;
            await saveRunAsSettings(nextMode, userInput.value);
        });
    }

    async function bindChangePlatformAction(select, button, game) {
        if (!select || !button || !game) return;

        const platforms = await getGameInfoPlatforms();
        const platformOptions = [...platforms]
            .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
            .map((platform) => {
                const shortName = String(platform?.shortName || '').trim().toLowerCase();
                const name = String(platform?.name || shortName || 'Unknown').trim();
                if (!shortName) return '';
                const selected = shortName === String(game.platformShortName || '').trim().toLowerCase() ? ' selected' : '';
                return `<option value="${escapeHtml(shortName)}"${selected}>${escapeHtml(name)} (${escapeHtml(shortName)})</option>`;
            })
            .filter(Boolean)
            .join('');

        select.innerHTML = platformOptions || '<option value="">No platforms found</option>';

        button.addEventListener('click', async () => {
            const nextPlatformShortName = String(select.value || '').trim().toLowerCase();
            const currentPlatformShortName = String(game.platformShortName || '').trim().toLowerCase();
            if (!nextPlatformShortName || nextPlatformShortName === currentPlatformShortName) return;

            if (isKnownGamePlatform(game, platforms)) {
                const proceed = confirmUser('This game already has a recognized platform. Changing it can break emulator matching and metadata. Continue?');
                if (!proceed) return;
            }

            button.disabled = true;
            try {
                const result = await emubro.invoke('update-game-metadata', {
                    gameId: game.id,
                    platformShortName: nextPlatformShortName
                });
                if (!result?.success) {
                    alertUser(result?.message || 'Failed to change platform.');
                    return;
                }

                await reloadGamesFromMainAndRender();
                const refreshedGame = getGames().find((row) => Number(row.id) === Number(game.id));
                if (refreshedGame) {
                    showGameDetails(refreshedGame);
                }
            } finally {
                button.disabled = false;
            }
        });
    }

    function buildYouTubeSearchQuery(game) {
        const platformShort = String(game?.platformShortName || game?.platform || '').trim();
        const cleanName = stripBracketedTitleParts(game?.name || '');
        return [platformShort, cleanName].filter(Boolean).join(' ').trim();
    }

    function setYouTubePreviewResult(previewRoot, state) {
        if (!previewRoot || !state) return;

        const titleEl = previewRoot.querySelector('[data-youtube-video-title]');
        const subtitleEl = previewRoot.querySelector('[data-youtube-video-subtitle]');
        const linkEl = previewRoot.querySelector('[data-youtube-video-link]');
        const thumbEl = previewRoot.querySelector('[data-youtube-video-thumb]');
        const countEl = previewRoot.querySelector('[data-youtube-result-count]');
        const copyButtons = [...previewRoot.querySelectorAll('[data-youtube-copy-link]')];
        const nextBtn = previewRoot.querySelector('[data-youtube-next]');
        const searchBtn = previewRoot.querySelector('[data-youtube-open-search]');
        const statusEl = previewRoot.querySelector('[data-youtube-status]');
        const queryEl = previewRoot.querySelector('[data-youtube-query]');
        const loadingEl = previewRoot.querySelector('[data-youtube-loading]');

        const hasResults = Array.isArray(state.results) && state.results.length > 0;
        const current = hasResults ? state.results[state.index] : null;

        if (queryEl) queryEl.textContent = state.query || '';
        if (loadingEl) loadingEl.classList.toggle('is-visible', !!state.loading);
        if (countEl) countEl.textContent = hasResults ? `Result ${state.index + 1} / ${state.results.length}` : 'Result 0 / 0';

        if (statusEl) {
            if (state.loading) {
                statusEl.textContent = 'Searching YouTube...';
            } else if (!hasResults) {
                statusEl.textContent = 'No preview result found.';
            } else {
                statusEl.textContent = '';
            }
        }

        if (!current) {
            if (titleEl) titleEl.textContent = 'No video result';
            if (subtitleEl) subtitleEl.textContent = '';
            if (linkEl) linkEl.removeAttribute('href');
            if (thumbEl) {
                thumbEl.removeAttribute('src');
                thumbEl.alt = 'No preview available';
            }
            copyButtons.forEach((btn) => { btn.disabled = true; });
            if (nextBtn) nextBtn.disabled = true;
            if (searchBtn) searchBtn.disabled = !state.searchUrl;
            return;
        }

        if (titleEl) titleEl.textContent = current.title || 'YouTube Result';
        if (subtitleEl) subtitleEl.textContent = current.channel ? `by ${current.channel}` : '';
        if (linkEl) linkEl.href = current.url || state.searchUrl || '#';
        if (thumbEl) {
            thumbEl.src = current.thumbnail || '';
            thumbEl.alt = current.title || 'YouTube preview thumbnail';
        }
        copyButtons.forEach((btn) => { btn.disabled = !current.url; });
        if (nextBtn) nextBtn.disabled = state.results.length <= 1;
        if (searchBtn) searchBtn.disabled = !state.searchUrl;
    }

    function bindYouTubePreviewAction(button, container, game) {
        if (!button || !container || !game) return;

        const previewRoot = container.querySelector('[data-game-youtube-preview]');
        if (!previewRoot) return;

        const nextBtn = previewRoot.querySelector('[data-youtube-next]');
        const searchBtn = previewRoot.querySelector('[data-youtube-open-search]');
        const copyButtons = [...previewRoot.querySelectorAll('[data-youtube-copy-link]')];
        const mainLink = previewRoot.querySelector('[data-youtube-video-link]');
        const query = buildYouTubeSearchQuery(game);
        const state = {
            loading: false,
            loaded: false,
            query,
            searchUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
            index: 0,
            results: []
        };

        const refresh = () => setYouTubePreviewResult(previewRoot, state);
        refresh();

        const openYouTubeTarget = async (targetUrl) => {
            const url = String(targetUrl || '').trim();
            if (!url) return;
            try {
                const result = await emubro.invoke('youtube:open-video', url);
                if (!result?.success) {
                    throw new Error(result?.message || 'Failed to open YouTube window');
                }
            } catch (error) {
                const statusEl = previewRoot.querySelector('[data-youtube-status]');
                if (statusEl) {
                    statusEl.textContent = 'Could not open embedded YouTube window. Opened externally instead.';
                }
                await emubro.invoke('open-external-url', url);
                console.warn('youtube:open-video failed, fell back to external browser:', error);
            }
        };

        const loadResults = async () => {
            if (state.loading) return;
            state.loading = true;
            refresh();
            try {
                const result = await emubro.invoke('youtube:search-videos', { query: state.query, limit: 8 });
                if (!result?.success) {
                    throw new Error(result?.message || 'Failed to fetch YouTube results');
                }
                state.results = Array.isArray(result.results) ? result.results : [];
                state.searchUrl = String(result.searchUrl || state.searchUrl || '').trim() || state.searchUrl;
                state.index = 0;
                state.loaded = true;
            } catch (error) {
                state.results = [];
                state.loaded = true;
                const message = String(error?.message || error || 'Failed to fetch YouTube results');
                const statusEl = previewRoot.querySelector('[data-youtube-status]');
                if (statusEl) statusEl.textContent = message;
            } finally {
                state.loading = false;
                refresh();
            }
        };

        button.addEventListener('click', async () => {
            previewRoot.classList.add('is-open');
            if (!state.loaded) {
                await loadResults();
                return;
            }
            refresh();
        });

        if (nextBtn) {
            nextBtn.addEventListener('click', async () => {
                if (!state.loaded) {
                    await loadResults();
                    return;
                }
                if (!state.results.length) return;
                state.index = (state.index + 1) % state.results.length;
                refresh();
            });
        }

        if (searchBtn) {
            searchBtn.addEventListener('click', async () => {
                const target = state.searchUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent(state.query)}`;
                await openYouTubeTarget(target);
            });
        }

        if (mainLink) {
            mainLink.addEventListener('click', async (event) => {
                event.preventDefault();
                const current = state.results[state.index];
                const url = String(current?.url || '').trim();
                if (url) {
                    await openYouTubeTarget(url);
                }
            });
        }

        copyButtons.forEach((copyBtn) => {
            copyBtn.addEventListener('click', async () => {
                const current = state.results[state.index];
                const url = String(current?.url || '').trim();
                if (!url) return;
                const oldLabel = copyBtn.textContent;
                try {
                    if (navigator.clipboard?.writeText) {
                        await navigator.clipboard.writeText(url);
                    } else {
                        const helper = document.createElement('textarea');
                        helper.value = url;
                        helper.setAttribute('readonly', '');
                        helper.style.position = 'fixed';
                        helper.style.opacity = '0';
                        document.body.appendChild(helper);
                        helper.select();
                        document.execCommand('copy');
                        helper.remove();
                    }
                    copyBtn.textContent = 'Link Copied';
                    setTimeout(() => {
                        copyBtn.textContent = oldLabel;
                    }, 1200);
                } catch (_error) {
                    alertUser('Failed to copy link.');
                }
            });
        });
    }

    function bindGameDetailsActions(container, game) {
        const tagsSelect = container.querySelector('[data-game-tags-select]');
        const tagsSaveBtn = container.querySelector('[data-game-tags-save]');
        const tagsSelectedPreview = container.querySelector('[data-game-tags-selected]');
        bindDescriptionActions(
            container.querySelector('[data-game-description-input]'),
            container.querySelector('[data-game-description-save]'),
            container.querySelector('[data-game-description-llm]'),
            container.querySelector('[data-game-description-status]'),
            game
        );
        bindCreateShortcutAction(container.querySelector('[data-create-shortcut]'), game);
        bindCoverDownloadAction(
            container.querySelector('[data-download-cover]'),
            container.querySelector('[data-cover-download-status]'),
            game
        );
        bindCoverWebSearchAction(
            container.querySelector('[data-search-cover-web]'),
            container.querySelector('[data-cover-browser]'),
            game
        );
        bindShowInExplorerAction(container.querySelector('[data-show-in-explorer]'), game);
        bindRemoveGameAction(container.querySelector('[data-remove-game]'), game);
        bindEmulatorOverrideAction(container.querySelector('[data-game-emulator-override]'), game);
        bindRunAsAction(
            container.querySelector('[data-game-runas-select]'),
            container.querySelector('[data-game-runas-user]'),
            game
        );
        bindTagAssignmentAction(
            tagsSelect,
            tagsSaveBtn,
            container.querySelector('[data-game-tags-clear]'),
            container.querySelector('[data-game-tags-rename]'),
            container.querySelector('[data-game-tags-delete]'),
            tagsSelectedPreview,
            game
        );
        bindLlmTagSuggestionAction(
            container.querySelector('[data-game-tags-llm]'),
            tagsSelect,
            tagsSelectedPreview,
            game
        );
        bindChangePlatformAction(
            container.querySelector('[data-game-platform-select]'),
            container.querySelector('[data-change-platform]'),
            game
        );
        bindYouTubePreviewAction(container.querySelector('[data-youtube-preview]'), container, game);
    }

    function buildGameDetailButtonIcon(iconKey) {
        switch (String(iconKey || '').trim()) {
            case 'save':
                return '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v6h8V4"/><path d="M9 16h6"/></svg>';
            case 'clear':
                return '<svg viewBox="0 0 24 24"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12h6l1-12"/></svg>';
            case 'rename':
                return '<svg viewBox="0 0 24 24"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/></svg>';
            case 'delete':
                return '<svg viewBox="0 0 24 24"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12h6l1-12"/><path d="M10 11v5"/><path d="M14 11v5"/></svg>';
            case 'llm':
                return '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 3.9L18 9l-4.2 2.1L12 15l-1.8-3.9L6 9l4.2-2.1z"/><path d="M5 16l.9 2L8 19l-2.1 1-.9 2-.9-2L2 19l2.1-1z"/></svg>';
            case 'shortcut':
                return '<svg viewBox="0 0 24 24"><path d="M9 15H5a3 3 0 1 1 0-6h4"/><path d="M15 9h4a3 3 0 1 1 0 6h-4"/><path d="M8 12h8"/></svg>';
            case 'download':
                return '<svg viewBox="0 0 24 24"><path d="M12 4v10"/><path d="M8 10l4 4 4-4"/><path d="M5 19h14"/></svg>';
            case 'search':
                return '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>';
            case 'folder':
                return '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
            case 'youtube':
                return '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="m10 9 6 3-6 3z" class="fill"/></svg>';
            case 'remove':
                return '<svg viewBox="0 0 24 24"><path d="M5 7h14"/><path d="M9 7V5h6v2"/><path d="M8 7l1 12h6l1-12"/></svg>';
            default:
                return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>';
        }
    }

    function buildGameDetailActionButton({ label, icon, attrs = '', extraClasses = '' }) {
        const safeLabel = escapeHtml(String(label || '').trim());
        const className = `action-btn game-detail-icon-btn ${extraClasses}`.trim();
        return `
            <button class="${className}" ${attrs} title="${safeLabel}" aria-label="${safeLabel}">
                <span class="game-detail-btn-icon" aria-hidden="true">${buildGameDetailButtonIcon(icon)}</span>
                <span class="game-detail-btn-label">${safeLabel}</span>
            </button>
        `;
    }

    function renderGameDetailsMarkup(container, game) {
        if (!container || !game) return;
        const safeName = escapeHtml(game.name || 'Unknown Game');
        const platformText = escapeHtml(game.platform || game.platformShortName || t('gameDetails.unknown', 'Unknown'));
        const ratingText = escapeHtml(game.rating !== undefined && game.rating !== null ? String(game.rating) : t('gameDetails.unknown', 'Unknown'));
        const safeDescription = escapeHtml(String(game.description || '').trim());
        const platformLabel = escapeHtml(t('gameDetails.platform', 'Platform'));
        const ratingLabel = escapeHtml(t('gameDetails.rating', 'Rating'));
        const descriptionLabel = escapeHtml(t('gameDetails.description', 'Description'));
        const removeGameActionLabel = t('gameDetails.removeGameAction', 'Remove Game');
        const runAsMode = normalizeRunAsMode(game.runAsMode || 'default');
        const runAsUser = escapeHtml(game.runAsUser || '');
        const saveDescriptionLabel = t('buttons.saveChanges', 'Save Changes');
        const llmDescriptionLabel = t('gameDetails.generateDescriptionWithLlm', 'Generate with LLM');
        const saveTagsLabel = t('gameDetails.saveTags', 'Save Tags');
        const clearTagsLabel = t('common.clear', 'Clear');
        const renameTagLabel = t('gameDetails.renameTag', 'Rename Tag');
        const deleteTagLabel = t('gameDetails.deleteTag', 'Delete Tag');
        const llmTagLabel = t('gameDetails.letLlmAddTags', 'Let LLM add tags');
        const shortcutLabel = t('gameDetails.createDesktopShortcut', 'Create Desktop Shortcut');
        const downloadCoverLabel = t('gameDetails.downloadCoverSerial', 'Download Cover (Serial)');
        const searchCoverLabel = t('gameDetails.searchCoverWeb', 'Search Cover Web');
        const showInExplorerLabel = t('gameDetails.showInExplorer', 'Show in Explorer');
        const youtubePreviewLabel = t('gameDetails.youtubePreview', 'YouTube Preview');

        const llmButtonMarkup = isLlmHelpersEnabled()
            ? buildGameDetailActionButton({
                label: llmTagLabel,
                icon: 'llm',
                attrs: 'data-game-tags-llm type="button"',
                extraClasses: 'launch-btn'
            })
            : '';

        container.innerHTML = `
        <div class="game-detail-row game-detail-title">
            <h3 class="game-detail-name">${safeName}</h3>
        </div>
        <div class="game-detail-row game-detail-media">
            <img src="${escapeHtml(getGameImagePath(game))}" alt="${safeName}" class="detail-game-image" loading="eager" decoding="async" fetchpriority="high" />
        </div>
        <div class="game-detail-row game-detail-meta">
            <p><strong>${platformLabel}:</strong> ${platformText}</p>
            <p><strong>${ratingLabel}:</strong> ${ratingText}</p>
        </div>
        <div class="game-detail-row game-detail-description-control">
            <label for="game-description-input-${Number(game.id)}">${descriptionLabel}</label>
            <textarea id="game-description-input-${Number(game.id)}" data-game-description-input rows="4" placeholder="Add a game description...">${safeDescription}</textarea>
            <div class="game-detail-description-actions">
                ${buildGameDetailActionButton({ label: saveDescriptionLabel, icon: 'save', attrs: 'data-game-description-save type="button"' })}
                ${buildGameDetailActionButton({ label: llmDescriptionLabel, icon: 'llm', attrs: 'data-game-description-llm type="button"', extraClasses: 'launch-btn' })}
            </div>
            <small class="game-detail-description-status" data-game-description-status aria-live="polite"></small>
        </div>
        <div class="game-detail-row game-detail-emulator-control">
            <label for="game-emulator-override-${Number(game.id)}">Emulator</label>
            <select id="game-emulator-override-${Number(game.id)}" data-game-emulator-override>
                <option value="">Loading emulators...</option>
            </select>
        </div>
        <div class="game-detail-row game-detail-runas-control">
            <label for="game-runas-select-${Number(game.id)}">Run As</label>
            <div class="game-detail-runas-inline">
                <select id="game-runas-select-${Number(game.id)}" data-game-runas-select>
                    <option value="default"${runAsMode === 'default' ? ' selected' : ''}>Default</option>
                    <option value="admin"${runAsMode === 'admin' ? ' selected' : ''}>Administrator</option>
                    <option value="user"${runAsMode === 'user' ? ' selected' : ''}>Another user</option>
                </select>
                <input id="game-runas-user-${Number(game.id)}" data-game-runas-user type="text" placeholder="DOMAIN\\User" value="${runAsUser}" />
            </div>
            <small class="game-detail-runas-hint">Windows only. "Run as user" will prompt for credentials.</small>
        </div>
        <div class="game-detail-row game-detail-platform-control">
            <label for="game-platform-select-${Number(game.id)}">Platform</label>
            <div class="game-detail-platform-inline">
                <select id="game-platform-select-${Number(game.id)}" data-game-platform-select>
                    <option value="">Loading platforms...</option>
                </select>
                <button class="action-btn" data-change-platform>Change Platform</button>
            </div>
        </div>
        <div class="game-detail-row game-detail-tags-control">
            <label for="game-tags-select-${Number(game.id)}">Tags</label>
            <select id="game-tags-select-${Number(game.id)}" data-game-tags-select multiple size="7">
                <option value="">Loading tags...</option>
            </select>
            <div class="game-detail-tags-selected" data-game-tags-selected></div>
            <div class="game-detail-tags-actions">
                ${buildGameDetailActionButton({ label: saveTagsLabel, icon: 'save', attrs: 'data-game-tags-save type="button"' })}
                ${buildGameDetailActionButton({ label: clearTagsLabel, icon: 'clear', attrs: 'data-game-tags-clear type="button"' })}
                ${buildGameDetailActionButton({ label: renameTagLabel, icon: 'rename', attrs: 'data-game-tags-rename type="button"' })}
                ${buildGameDetailActionButton({ label: deleteTagLabel, icon: 'delete', attrs: 'data-game-tags-delete type="button"', extraClasses: 'remove-btn' })}
                ${llmButtonMarkup}
            </div>
            <small class="game-detail-tags-hint">Use Ctrl/Cmd + click to select multiple tags.</small>
        </div>
        <div class="game-detail-row game-detail-actions">
            ${buildGameDetailActionButton({ label: shortcutLabel, icon: 'shortcut', attrs: 'data-create-shortcut type="button"' })}
            ${buildGameDetailActionButton({ label: downloadCoverLabel, icon: 'download', attrs: 'data-download-cover type="button"' })}
            ${buildGameDetailActionButton({ label: searchCoverLabel, icon: 'search', attrs: 'data-search-cover-web data-open-cover-browser type="button"' })}
            ${buildGameDetailActionButton({ label: showInExplorerLabel, icon: 'folder', attrs: 'data-show-in-explorer type="button"' })}
            ${buildGameDetailActionButton({ label: youtubePreviewLabel, icon: 'youtube', attrs: 'data-youtube-preview type="button"', extraClasses: 'youtube-preview-btn' })}
            ${buildGameDetailActionButton({ label: removeGameActionLabel, icon: 'remove', attrs: 'data-remove-game type="button"', extraClasses: 'remove-btn' })}
        </div>
        <div class="game-detail-row game-detail-cover-status" data-cover-download-status aria-live="polite"></div>
        <div class="game-detail-row game-detail-cover-browser" data-cover-browser>
            <div class="game-cover-browser-header">
                <h4>Web Cover Search</h4>
                <button class="action-btn small" type="button" data-cover-browser-close>Close</button>
            </div>
            <div class="game-cover-browser-search">
                <input type="text" data-cover-browser-query value="${escapeHtml(buildCoverSearchQuery(game))}" placeholder="Game name + platform + cover" />
                <button class="action-btn small" type="button" data-cover-browser-run>Search</button>
                <button class="action-btn small" type="button" data-cover-browser-open-external>Google</button>
            </div>
            <p class="game-cover-browser-status" data-cover-browser-status aria-live="polite"></p>
            <div class="game-cover-browser-results" data-cover-browser-results>
                <div class="game-cover-browser-empty">No web results yet. Run a search.</div>
            </div>
        </div>
        <div class="game-detail-row game-detail-youtube-preview" data-game-youtube-preview>
            <div class="game-youtube-preview-header">
                <h4>Video Preview</h4>
                <div class="game-youtube-preview-header-right">
                    <span class="game-youtube-preview-query" data-youtube-query></span>
                    <button class="action-btn small" type="button" data-youtube-copy-link>Copy Link</button>
                </div>
            </div>
            <a class="game-youtube-preview-media" href="#" data-youtube-video-link>
                <img class="game-youtube-preview-thumb" data-youtube-video-thumb alt="YouTube preview" />
                <span class="game-youtube-preview-overlay">
                    <span class="game-youtube-preview-title" data-youtube-video-title>Waiting for result...</span>
                    <span class="game-youtube-preview-subtitle" data-youtube-video-subtitle></span>
                </span>
                <span class="game-youtube-preview-play" aria-hidden="true"></span>
            </a>
            <div class="game-youtube-preview-toolbar">
                <button class="action-btn small" type="button" data-youtube-next>Try Next Result</button>
                <button class="action-btn small" type="button" data-youtube-open-search>Open Search on YouTube</button>
                <span class="game-youtube-preview-result-count" data-youtube-result-count>Result 0 / 0</span>
                <button class="action-btn small" type="button" data-youtube-copy-link>Copy Link</button>
            </div>
            <p class="game-youtube-preview-status" data-youtube-status></p>
            <p class="game-youtube-preview-loading" data-youtube-loading>Loading preview...</p>
            <div class="game-youtube-preview-note">
                YouTube preview results can be temporarily rate-limited. If previews fail, open the search link in browser.
            </div>
        </div>
    `;

        initializeLazyGameImages(container);
        bindGameDetailsActions(container, game);
    }

    function showGameDetails(game) {
        if (!game) return;

        const popup = ensureGameInfoPopup();
        if (!popup) return;
        const popupTitle = popup.querySelector('#game-info-popup-title');
        const popupBody = popup.querySelector('#game-info-popup-body');
        if (popupTitle) popupTitle.textContent = 'Game Details';
        renderGameDetailsMarkup(popupBody, game);

        if (gameInfoPopupPinned || popup.classList.contains('docked-right')) {
            import('../docking-manager').then((m) => m.toggleDock('game-info-modal', 'pin-game-info', true));
            setGameInfoPinnedStorage(true);
        } else {
            const hasManualPosition = !!(popup.style.left || popup.style.top || popup.classList.contains('moved'));
            popup.classList.toggle('moved', hasManualPosition);
            popup.style.display = 'flex';
            popup.classList.add('active');
            import('../theme-manager').then((m) => {
                if (typeof m.recenterManagedModalIfMostlyOutOfView === 'function') {
                    m.recenterManagedModalIfMostlyOutOfView('game-info-modal', {
                        padding: 24,
                        forceCenterIfNoManualPosition: !hasManualPosition
                    });
                }
            });
            applyGameInfoPinnedState();
        }
    }

    return {
        ensureGameInfoPopup,
        showGameDetails
    };
}
