export function bindUpdateActionHandlers({
    modal,
    emubro,
    applyUpdateState,
    applyResourcesUpdateState,
    render,
    getResourcesUpdateState
}) {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const pollAppUpdateStateUntilIdle = async ({
        timeoutMs = 30 * 60 * 1000,
        intervalMs = 700
    } = {}) => {
        const deadline = Date.now() + Math.max(2000, Number(timeoutMs) || 0);
        let lastState = null;
        while (Date.now() < deadline) {
            try {
                const state = await emubro?.updates?.getState?.();
                if (state && typeof state === 'object') {
                    applyUpdateState(state);
                    render();
                    lastState = state;
                }
            } catch (_error) {}
            const isBusy = !!(lastState?.checking || lastState?.downloading || lastState?.installing);
            if (!isBusy) {
                return lastState;
            }
            await sleep(intervalMs);
        }
        return lastState;
    };

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
                if (action === 'check') {
                    applyUpdateState({
                        checking: true,
                        downloading: false,
                        installing: false,
                        lastError: '',
                        lastMessage: 'Checking for updates...'
                    });
                    render();
                }
                if (action === 'download') {
                    applyUpdateState({
                        checking: false,
                        downloading: true,
                        installing: false,
                        downloaded: false,
                        progressPercent: 0,
                        lastError: '',
                        lastMessage: 'Starting update download...'
                    });
                    render();
                }
                if (action === 'install') {
                    applyUpdateState({
                        checking: false,
                        downloading: false,
                        installing: true,
                        lastError: '',
                        lastMessage: 'Opening installer...'
                    });
                    render();
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

                if (action === 'check') {
                    await pollAppUpdateStateUntilIdle({ timeoutMs: 15 * 1000, intervalMs: 450 });
                }
                if (action === 'download' || action === 'install') {
                    await pollAppUpdateStateUntilIdle();
                }
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
                if (action === 'check') {
                    applyResourcesUpdateState({
                        checking: true,
                        installing: false,
                        lastError: '',
                        lastMessage: 'Checking resource updates...'
                    });
                    render();
                }
                if (action === 'install') {
                    applyResourcesUpdateState({
                        checking: false,
                        installing: true,
                        progressPercent: 0,
                        lastError: '',
                        lastMessage: 'Installing resources...'
                    });
                    render();
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
