const DEFAULT_SEQUENCE = [
    'ArrowUp',
    'ArrowUp',
    'ArrowDown',
    'ArrowDown',
    'ArrowLeft',
    'ArrowRight',
    'ArrowLeft',
    'ArrowRight',
    'b',
    'a'
];

function normalizeKey(event) {
    const key = String(event?.key || '').trim();
    if (!key) return '';
    if (key.length === 1) return key.toLowerCase();
    return key;
}

function shouldIgnoreTarget(target) {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [data-konami-ignore="true"]'));
}

function ensureUiElements() {
    let overlay = document.getElementById('konami-boost-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'konami-boost-overlay';
        overlay.className = 'konami-boost-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.appendChild(overlay);
    }

    let toast = document.getElementById('konami-boost-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'konami-boost-toast';
        toast.className = 'konami-boost-toast';
        toast.setAttribute('aria-live', 'polite');
        toast.setAttribute('aria-atomic', 'true');
        document.body.appendChild(toast);
    }

    return { overlay, toast };
}

export function setupKonamiEasterEgg(options = {}) {
    const sequence = Array.isArray(options.sequence) && options.sequence.length
        ? options.sequence
        : DEFAULT_SEQUENCE;
    const maxGapMs = Number.isFinite(options.maxGapMs) ? Math.max(500, options.maxGapMs) : 3600;
    const effectDurationMs = Number.isFinite(options.effectDurationMs) ? Math.max(2000, options.effectDurationMs) : 9000;
    const toastDurationMs = Number.isFinite(options.toastDurationMs) ? Math.max(1200, options.toastDurationMs) : 3200;
    const message = String(options.message || 'Konami code unlocked. Retro boost enabled.');

    const { toast } = ensureUiElements();
    let index = 0;
    let lastKeyAt = 0;
    let effectTimer = null;
    let toastTimer = null;

    const showToast = (text) => {
        toast.textContent = text;
        toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.classList.remove('is-visible');
        }, toastDurationMs);
    };

    const activate = () => {
        document.body.classList.add('konami-boost-active');
        clearTimeout(effectTimer);
        effectTimer = window.setTimeout(() => {
            document.body.classList.remove('konami-boost-active');
        }, effectDurationMs);
        showToast(message);
    };

    const onKeyDown = (event) => {
        if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
        if (shouldIgnoreTarget(event.target)) return;

        const pressed = normalizeKey(event);
        if (!pressed) return;

        const now = Date.now();
        if (now - lastKeyAt > maxGapMs) {
            index = 0;
        }
        lastKeyAt = now;

        const expected = sequence[index];
        if (pressed === expected) {
            index += 1;
            if (index >= sequence.length) {
                index = 0;
                activate();
            }
            return;
        }

        index = pressed === sequence[0] ? 1 : 0;
    };

    document.addEventListener('keydown', onKeyDown, true);

    return () => {
        document.removeEventListener('keydown', onKeyDown, true);
        clearTimeout(effectTimer);
        clearTimeout(toastTimer);
        document.body.classList.remove('konami-boost-active');
        const activeToast = document.getElementById('konami-boost-toast');
        activeToast?.classList.remove('is-visible');
    };
}
