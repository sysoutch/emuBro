function applyTemplate(input, data = {}) {
    let text = String(input ?? '');
    Object.keys(data || {}).forEach((key) => {
        const value = String(data[key] ?? '');
        text = text
            .replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value)
            .replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'g'), value);
    });
    return text;
}

function createTranslator(i18nRef) {
    return (key, fallback, data = {}) => {
        if (i18nRef && typeof i18nRef.t === 'function') {
            const translated = i18nRef.t(key, data);
            if (translated && translated !== key) return String(translated);
        }
        return applyTemplate(String(fallback || key), data);
    };
}

function ensureOverlayStyles() {
    if (document.getElementById('game-session-overlay-styles')) return;
    const style = document.createElement('style');
    style.id = 'game-session-overlay-styles';
    style.textContent = `
        .game-session-overlay {
            position: fixed;
            right: 16px;
            top: 76px;
            z-index: 3605;
            display: none;
            flex-direction: column;
            align-items: flex-end;
            gap: 8px;
            pointer-events: none;
        }
        .game-session-overlay.is-visible {
            display: flex;
        }
        .game-session-overlay-btn,
        .game-session-overlay-panel {
            pointer-events: auto;
        }
        .game-session-overlay-btn {
            border: 1px solid var(--border-color);
            border-radius: 999px;
            padding: 8px 12px;
            font-size: 0.82rem;
            font-weight: 700;
            color: var(--text-primary);
            background: color-mix(in srgb, var(--bg-secondary), transparent 8%);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.28);
            cursor: pointer;
        }
        .game-session-overlay-panel {
            width: min(320px, 88vw);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            background: color-mix(in srgb, var(--bg-secondary), transparent 4%);
            box-shadow: 0 18px 34px rgba(0, 0, 0, 0.36);
            padding: 10px;
            display: none;
            grid-template-columns: 1fr;
            gap: 8px;
        }
        .game-session-overlay-panel.is-open {
            display: grid;
        }
        .game-session-overlay-title {
            font-size: 0.82rem;
            color: var(--text-secondary);
            margin: 0;
            line-height: 1.3;
        }
        .game-session-overlay-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
        }
        .game-session-overlay-action {
            border: 1px solid var(--border-color);
            border-radius: 8px;
            background: color-mix(in srgb, var(--bg-primary), transparent 16%);
            color: var(--text-primary);
            font-size: 0.8rem;
            padding: 7px 9px;
            cursor: pointer;
            text-align: left;
        }
        .game-session-overlay-action:hover {
            border-color: color-mix(in srgb, var(--accent-color), var(--border-color) 40%);
        }
        .game-session-overlay-action.is-danger {
            border-color: color-mix(in srgb, #d94747, var(--border-color));
            color: color-mix(in srgb, #ffafaf, #fff 12%);
        }
        @media (max-width: 860px) {
            .game-session-overlay {
                right: 10px;
                top: 68px;
            }
            .game-session-overlay-actions {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
}

export function setupGameSessionOverlay(options = {}) {
    const emubro = options.emubro || window.emubro;
    if (!emubro || typeof emubro.invoke !== 'function') {
        return { destroy: () => {} };
    }

    const t = createTranslator(options.i18n || window.i18n);
    const onNotify = typeof options.onNotify === 'function' ? options.onNotify : () => {};
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};

    ensureOverlayStyles();

    const root = document.createElement('div');
    root.className = 'game-session-overlay';
    root.innerHTML = `
        <button type="button" class="game-session-overlay-btn" data-overlay-toggle>${t('overlay.gameSession', 'Game Session')}</button>
        <div class="game-session-overlay-panel" data-overlay-panel>
            <p class="game-session-overlay-title" data-overlay-title>${t('overlay.noActiveSession', 'No active game session')}</p>
            <div class="game-session-overlay-actions">
                <button type="button" class="game-session-overlay-action" data-overlay-action="show-launcher">${t('overlay.showLauncher', 'Show emuBro')}</button>
                <button type="button" class="game-session-overlay-action" data-overlay-action="alt-enter">${t('overlay.altEnter', 'Send Alt+Enter')}</button>
                <button type="button" class="game-session-overlay-action" data-overlay-action="screenshot">${t('overlay.screenshot', 'Take Screenshot')}</button>
                <button type="button" class="game-session-overlay-action is-danger" data-overlay-action="quit">${t('overlay.quitGame', 'Quit Game')}</button>
            </div>
        </div>
    `;
    document.body.appendChild(root);

    const toggleBtn = root.querySelector('[data-overlay-toggle]');
    const panel = root.querySelector('[data-overlay-panel]');
    const titleEl = root.querySelector('[data-overlay-title]');
    let isOpen = false;
    let pollTimer = null;
    let lastSessionId = '';

    const setOpen = (open) => {
        isOpen = !!open;
        if (panel) panel.classList.toggle('is-open', isOpen);
    };

    const setVisible = (visible) => {
        root.classList.toggle('is-visible', !!visible);
        if (!visible) setOpen(false);
    };

    const runAction = async (action) => {
        if (action === 'show-launcher') {
            const result = await emubro.invoke('game-session:show-launcher');
            if (result?.success) {
                setAppMode('library');
                return;
            }
            onNotify(result?.message || t('overlay.showLauncherFailed', 'Failed to show launcher'), 'error');
            return;
        }

        if (action === 'alt-enter') {
            const result = await emubro.invoke('game-session:send-hotkey', { action: 'alt_enter' });
            if (!result?.success) {
                onNotify(result?.message || t('overlay.hotkeyFailed', 'Failed to send hotkey'), 'error');
            }
            return;
        }

        if (action === 'screenshot') {
            const result = await emubro.invoke('game-session:capture-screenshot', { reason: 'manual-overlay' });
            if (result?.success) {
                onNotify(t('overlay.screenshotSaved', 'Screenshot saved'), 'success');
                return;
            }
            onNotify(result?.message || t('overlay.screenshotFailed', 'Failed to capture screenshot'), 'error');
            return;
        }

        if (action === 'quit') {
            const confirmed = window.confirm(t('overlay.confirmQuit', 'Quit the active game process now?'));
            if (!confirmed) return;
            const result = await emubro.invoke('game-session:quit');
            if (!result?.success) {
                onNotify(result?.message || t('overlay.quitFailed', 'Failed to quit game process'), 'error');
            }
        }
    };

    const refreshStatus = async () => {
        try {
            const response = await emubro.invoke('game-session:get-status');
            const session = response?.session || null;
            const active = !!response?.active && !!session;
            setVisible(active);
            if (!active) {
                lastSessionId = '';
                if (titleEl) titleEl.textContent = t('overlay.noActiveSession', 'No active game session');
                return;
            }

            const sessionId = String(session?.id || '');
            if (sessionId && sessionId !== lastSessionId) {
                lastSessionId = sessionId;
                setOpen(false);
            }

            const gameName = String(session?.gameName || '').trim() || t('overlay.unknownGame', 'Unknown Game');
            if (titleEl) {
                titleEl.textContent = t('overlay.runningGame', 'Running: {{name}}', { name: gameName });
            }
        } catch (_error) {
            setVisible(false);
        }
    };

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            setOpen(!isOpen);
        });
    }

    if (panel) {
        panel.querySelectorAll('[data-overlay-action]').forEach((button) => {
            button.addEventListener('click', async () => {
                const action = String(button.dataset.overlayAction || '').trim();
                if (!action) return;
                button.disabled = true;
                try {
                    await runAction(action);
                    await refreshStatus();
                } finally {
                    button.disabled = false;
                }
            });
        });
    }

    const onDocClick = (event) => {
        if (!isOpen) return;
        if (root.contains(event.target)) return;
        setOpen(false);
    };
    document.addEventListener('click', onDocClick, true);

    pollTimer = window.setInterval(() => {
        void refreshStatus();
    }, 2500);
    void refreshStatus();

    return {
        refreshStatus,
        destroy: () => {
            if (pollTimer) {
                window.clearInterval(pollTimer);
                pollTimer = null;
            }
            document.removeEventListener('click', onDocClick, true);
            root.remove();
        }
    };
}
