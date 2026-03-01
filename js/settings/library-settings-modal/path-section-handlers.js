export function attachPathSectionHandlers({
    modal,
    key,
    draft,
    normalizePathList,
    render,
    emubro,
    addFooterNotification
}) {
    const listWrap = modal.querySelector(`[data-list="${key}"]`);
    if (listWrap) {
        listWrap.querySelectorAll('[data-remove-index]').forEach((button) => {
            button.addEventListener('click', () => {
                const index = Number(button.dataset.removeIndex);
                if (!Number.isFinite(index) || index < 0) return;
                draft[key] = draft[key].filter((_path, rowIndex) => rowIndex !== index);
                render();
            });
        });

        listWrap.querySelectorAll('[data-relocate-index]').forEach((button) => {
            button.addEventListener('click', async () => {
                const index = Number(button.dataset.relocateIndex);
                if (!Number.isFinite(index) || index < 0) return;

                const sourcePath = String(draft[key]?.[index] || '').trim();
                if (!sourcePath) return;

                const pick = await emubro.invoke('open-file-dialog', {
                    title: 'Select destination folder',
                    properties: ['openDirectory', 'createDirectory'],
                    defaultPath: sourcePath
                });
                if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;

                const targetPath = String(pick.filePaths[0] || '').trim();
                if (!targetPath || targetPath.toLowerCase() === sourcePath.toLowerCase()) return;

                button.disabled = true;
                const previousLabel = button.textContent;
                button.textContent = 'Moving...';
                try {
                    const previewResult = await emubro.invoke('settings:preview-relocate-managed-folder', {
                        kind: key,
                        sourcePath,
                        targetPath
                    });
                    if (!previewResult?.success) {
                        throw new Error(previewResult?.message || 'Failed to preview relocation.');
                    }

                    const confirmResult = await emubro.invoke('settings:confirm-relocate-preview', {
                        kind: key,
                        sourcePath,
                        targetPath,
                        preview: previewResult?.preview || {}
                    });
                    if (!confirmResult?.success) {
                        throw new Error(confirmResult?.message || 'Failed to confirm relocation.');
                    }
                    if (!confirmResult?.proceed) {
                        addFooterNotification('Relocation canceled.', 'warning');
                        return;
                    }

                    const relocateResult = await emubro.invoke('settings:relocate-managed-folder', {
                        kind: key,
                        sourcePath,
                        targetPath,
                        conflictPolicy: String(confirmResult?.policy || '').trim()
                    });
                    if (!relocateResult?.success) {
                        if (relocateResult?.canceled) {
                            addFooterNotification('Relocation canceled.', 'warning');
                            return;
                        }
                        throw new Error(relocateResult?.message || 'Failed to relocate folder.');
                    }

                    const nextSettings = relocateResult?.settings;
                    if (nextSettings && typeof nextSettings === 'object') {
                        draft.scanFolders = normalizePathList(nextSettings.scanFolders);
                        draft.gameFolders = normalizePathList(nextSettings.gameFolders);
                        draft.emulatorFolders = normalizePathList(nextSettings.emulatorFolders);
                    } else {
                        draft[key] = normalizePathList(
                            draft[key].map((entryPath, entryIndex) => (entryIndex === index ? targetPath : entryPath))
                        );
                    }

                    const stats = relocateResult?.stats || {};
                    addFooterNotification(
                        `Relocated folder. Moved: ${Number(stats.moved || 0)}, replaced: ${Number(stats.replaced || 0)}, kept both: ${Number(stats.keptBoth || 0)}, skipped: ${Number(stats.skipped || 0)}.`,
                        'success'
                    );
                    render();
                } catch (error) {
                    alert(error?.message || 'Failed to relocate managed folder.');
                } finally {
                    button.disabled = false;
                    button.textContent = previousLabel;
                }
            });
        });
    }

    const addManualButton = modal.querySelector(`[data-add-manual="${key}"]`);
    const input = modal.querySelector(`[data-input="${key}"]`);
    if (addManualButton && input) {
        addManualButton.addEventListener('click', () => {
            const value = String(input.value || '').trim();
            if (!value) return;
            draft[key] = normalizePathList([...draft[key], value]);
            render();
        });
    }

    const addBrowseButton = modal.querySelector(`[data-add-browse="${key}"]`);
    if (addBrowseButton) {
        addBrowseButton.addEventListener('click', async () => {
            const pick = await emubro.invoke('open-file-dialog', {
                title: 'Select folder',
                properties: ['openDirectory']
            });
            if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
            draft[key] = normalizePathList([...draft[key], pick.filePaths[0]]);
            render();
        });
    }
}
