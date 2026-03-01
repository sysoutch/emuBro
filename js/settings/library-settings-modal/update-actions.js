export function bindUpdateActionHandlers({
    modal,
    emubro,
    applyUpdateState,
    applyResourcesUpdateState,
    render,
    getResourcesUpdateState
}) {
    modal.querySelectorAll('[data-update-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = String(button.dataset.updateAction || '').trim().toLowerCase();
            if (!action) return;

            button.disabled = true;
            try {
                let result = null;
                if (action === 'save-auto-config') {
                    const startupToggle = modal.querySelector('[data-update-auto-check-startup]');
                    const intervalInput = modal.querySelector('[data-update-auto-check-interval]');
                    const autoCheckOnStartup = !!startupToggle?.checked;
                    const autoCheckIntervalMinutes = Number(intervalInput?.value || 60);
                    const appConfigResult = await emubro.updates?.setConfig?.({
                        autoCheckOnStartup,
                        autoCheckIntervalMinutes
                    });
                    const resourcesConfigResult = await emubro.resourcesUpdates?.setConfig?.({
                        autoCheckOnStartup,
                        autoCheckIntervalMinutes
                    });
                    if (appConfigResult && typeof appConfigResult === 'object') applyUpdateState(appConfigResult);
                    if (resourcesConfigResult && typeof resourcesConfigResult === 'object') applyResourcesUpdateState(resourcesConfigResult);
                    result = { success: true };
                }
                if (action === 'check') result = await emubro.updates?.check?.();
                if (action === 'download') result = await emubro.updates?.download?.();
                if (action === 'install') result = await emubro.updates?.install?.();
                if (result && typeof result === 'object') {
                    applyUpdateState(result);
                    if (result.success === false && result.message) {
                        applyUpdateState({ lastError: String(result.message) });
                    }
                }
                render();
            } catch (error) {
                applyUpdateState({ lastError: String(error?.message || error || 'Update action failed') });
                render();
            } finally {
                button.disabled = false;
            }
        });
    });

    modal.querySelectorAll('[data-resource-update-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = String(button.dataset.resourceUpdateAction || '').trim().toLowerCase();
            if (!action) return;

            button.disabled = true;
            try {
                let result = null;
                if (action === 'save-config') {
                    const urlInput = modal.querySelector('[data-resource-manifest-url]');
                    const storageInput = modal.querySelector('[data-resource-storage-path]');
                    const resourcesUpdateState = getResourcesUpdateState();
                    result = await emubro.resourcesUpdates?.setConfig?.({
                        manifestUrl: String(urlInput?.value || '').trim(),
                        storagePath: String(storageInput?.value || '').trim(),
                        autoCheckOnStartup: resourcesUpdateState.autoCheckOnStartup,
                        autoCheckIntervalMinutes: resourcesUpdateState.autoCheckIntervalMinutes
                    });
                }
                if (action === 'check') result = await emubro.resourcesUpdates?.check?.();
                if (action === 'install') result = await emubro.resourcesUpdates?.install?.();
                if (result && typeof result === 'object') {
                    applyResourcesUpdateState(result);
                    if (result.success === false && result.message) {
                        applyResourcesUpdateState({ lastError: String(result.message) });
                    }
                }
                render();
            } catch (error) {
                applyResourcesUpdateState({ lastError: String(error?.message || error || 'Resource update action failed') });
                render();
            } finally {
                button.disabled = false;
            }
        });
    });

    modal.querySelectorAll('[data-resource-storage-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const action = String(button.dataset.resourceStorageAction || '').trim().toLowerCase();
            if (!action) return;

            const storageInput = modal.querySelector('[data-resource-storage-path]');
            if (!storageInput) return;

            if (action === 'use-default') {
                storageInput.value = '';
                return;
            }
            if (action !== 'browse') return;

            const resourcesUpdateState = getResourcesUpdateState();
            const defaultPath = String(
                storageInput.value
                || resourcesUpdateState.storagePath
                || resourcesUpdateState.effectiveStoragePath
                || resourcesUpdateState.defaultStoragePath
                || ''
            ).trim();
            const pick = await emubro.invoke('open-file-dialog', {
                title: 'Select emubro-resources folder',
                properties: ['openDirectory', 'createDirectory'],
                defaultPath
            });
            if (!pick || pick.canceled || !Array.isArray(pick.filePaths) || pick.filePaths.length === 0) return;
            storageInput.value = String(pick.filePaths[0] || '').trim();
        });
    });
}
