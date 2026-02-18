const DEFAULT_STORAGE_KEY = 'emuBro.emulatorConfigs.v1';

export function createEmulatorConfigActions(deps = {}) {
    const localStorageRef = deps.localStorageRef || window.localStorage;
    const storageKey = String(deps.storageKey || DEFAULT_STORAGE_KEY).trim() || DEFAULT_STORAGE_KEY;

    function getEmulatorKey(emulator) {
        const filePath = String(emulator?.filePath || '').trim();
        if (filePath) return filePath.toLowerCase();
        const fallback = String(emulator?.id || emulator?.name || 'emu').trim();
        return fallback.toLowerCase();
    }

    function loadEmulatorConfigMap() {
        try {
            const raw = localStorageRef.getItem(storageKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        } catch (_e) {}
        return {};
    }

    function saveEmulatorConfigMap(map) {
        try {
            localStorageRef.setItem(storageKey, JSON.stringify(map || {}));
        } catch (_e) {}
    }

    function getEmulatorConfig(emulator) {
        const key = getEmulatorKey(emulator);
        return loadEmulatorConfigMap()[key] || {};
    }

    function promptEmulatorConfigModal(emulator, existing = {}) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'emulator-config-overlay';

            const modal = document.createElement('div');
            modal.className = 'emulator-config-modal glass';

            const title = document.createElement('h3');
            title.textContent = `Edit Emulator: ${emulator?.name || 'Unknown'}`;

            const makeField = (labelText, value, key, multiline = false) => {
                const row = document.createElement('label');
                row.className = 'emulator-config-row';

                const label = document.createElement('span');
                label.className = 'emulator-config-label';
                label.textContent = labelText;

                let input;
                if (multiline) {
                    input = document.createElement('textarea');
                    input.rows = 3;
                } else {
                    input = document.createElement('input');
                    input.type = 'text';
                }

                input.className = 'emulator-config-input';
                input.value = String(value || '');
                input.dataset.key = key;

                row.appendChild(label);
                row.appendChild(input);
                return row;
            };

            const form = document.createElement('div');
            form.className = 'emulator-config-form';
            form.appendChild(makeField('Website URL', existing.website, 'website'));
            form.appendChild(makeField('Launch Arguments', existing.launchArgs, 'launchArgs'));
            form.appendChild(makeField('Working Directory', existing.workingDirectory, 'workingDirectory'));
            form.appendChild(makeField('Notes', existing.notes, 'notes', true));

            const actions = document.createElement('div');
            actions.className = 'emulator-config-actions';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'action-btn';
            cancelBtn.textContent = 'Cancel';

            const resetBtn = document.createElement('button');
            resetBtn.className = 'action-btn remove-btn';
            resetBtn.textContent = 'Reset';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'action-btn launch-btn';
            saveBtn.textContent = 'Save';

            actions.appendChild(cancelBtn);
            actions.appendChild(resetBtn);
            actions.appendChild(saveBtn);

            modal.appendChild(title);
            modal.appendChild(form);
            modal.appendChild(actions);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const close = (payload) => {
                overlay.remove();
                resolve(payload);
            };

            cancelBtn.addEventListener('click', () => close(null));
            resetBtn.addEventListener('click', () => close({ reset: true }));
            saveBtn.addEventListener('click', () => {
                const values = {};
                modal.querySelectorAll('.emulator-config-input').forEach((input) => {
                    const key = String(input.dataset.key || '').trim();
                    if (!key) return;
                    values[key] = input.value;
                });
                close(values);
            });

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay) close(null);
            });
        });
    }

    async function openEmulatorConfigEditor(emulator) {
        const key = getEmulatorKey(emulator);
        const existing = getEmulatorConfig(emulator);
        const result = await promptEmulatorConfigModal(emulator, existing);
        if (!result) return false;

        if (result.reset) {
            const map = loadEmulatorConfigMap();
            delete map[key];
            saveEmulatorConfigMap(map);
            return true;
        }

        const map = loadEmulatorConfigMap();
        map[key] = {
            website: String(result.website || '').trim(),
            launchArgs: String(result.launchArgs || '').trim(),
            workingDirectory: String(result.workingDirectory || '').trim(),
            notes: String(result.notes || '').trim()
        };
        saveEmulatorConfigMap(map);
        return true;
    }

    return {
        getEmulatorKey,
        loadEmulatorConfigMap,
        saveEmulatorConfigMap,
        getEmulatorConfig,
        promptEmulatorConfigModal,
        openEmulatorConfigEditor
    };
}
