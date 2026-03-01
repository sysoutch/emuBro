export function getNestedValue(source, keyPath) {
    if (!source || !keyPath) return '';
    const keys = String(keyPath).split('.');
    let node = source;
    for (const key of keys) {
        if (!node || typeof node !== 'object' || !(key in node)) return '';
        node = node[key];
    }
    return node;
}

export function setNestedValue(target, keyPath, value) {
    if (!target || !keyPath) return;
    const keys = String(keyPath).split('.');
    let node = target;
    keys.forEach((key, idx) => {
        if (idx === keys.length - 1) {
            node[key] = value;
            return;
        }
        if (!node[key] || typeof node[key] !== 'object' || Array.isArray(node[key])) {
            node[key] = {};
        }
        node = node[key];
    });
}

function getLiveEditTarget(startNode, liveEditSelector) {
    const source = startNode instanceof Element
        ? startNode
        : (startNode?.parentElement || null);
    if (!(source instanceof Element)) return null;

    const target = source.closest(liveEditSelector);
    if (!target) return null;

    if (target.id === 'lang-live-edit-toggle') return null;
    if (target.closest('#lang-keys-list')) return null;
    if (target.closest('#lang-live-edit-toggle-wrap')) return null;

    return target;
}

function getTranslationKeyForElement(element) {
    if (!element) return '';
    return String(
        element.getAttribute('data-i18n')
        || element.getAttribute('data-i18n-placeholder')
        || ''
    ).trim();
}

function isPointerInsideLiveEditHotspot(event, element) {
    if (!event || !element || typeof element.getBoundingClientRect !== 'function') return false;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return false;

    const rect = element.getBoundingClientRect();
    // Keep this in sync with the pencil badge geometry from _language-selector.scss.
    // Badge is rendered inside the element bounds (top-right corner).
    const badgeSize = 16;
    const inset = 2;
    const hotspotPadding = 3;
    const hotspotLeft = rect.right - inset - badgeSize - hotspotPadding;
    const hotspotRight = rect.right - inset + hotspotPadding;
    const hotspotTop = rect.top + inset - hotspotPadding;
    const hotspotBottom = rect.top + inset + badgeSize + hotspotPadding;

    return event.clientX >= hotspotLeft
        && event.clientX <= hotspotRight
        && event.clientY >= hotspotTop
        && event.clientY <= hotspotBottom;
}

function applyLiveEditValueToElement(element, key, value) {
    if (!element || !key) return;

    if (element.hasAttribute('data-i18n')) {
        element.textContent = value;
        return;
    }

    if (element.hasAttribute('data-i18n-placeholder')) {
        element.placeholder = value;
    }
}

export function createLiveEditController({
    liveEditSelector,
    showTextInputDialog,
    getCurrentLangData,
    getBaseLanguageRoot,
    getI18nRef,
    onRenderEditorKeys,
    onUpdateUILanguage,
    onSyncAllTranslations
}) {
    let enabled = false;
    let clickHandler = null;

    const attach = () => {
        if (clickHandler) return;
        clickHandler = async (event) => {
            const currentLangData = getCurrentLangData();
            if (!enabled || !currentLangData) return;
            if (event.button !== 0) return;

            const target = getLiveEditTarget(event.target, liveEditSelector);
            if (!target) return;

            const key = getTranslationKeyForElement(target);
            if (!key) return;
            if (!isPointerInsideLiveEditHotspot(event, target)) return;

            event.preventDefault();
            event.stopPropagation();

            const i18nRef = getI18nRef();
            const langRoot = currentLangData.data?.[currentLangData.code] || {};
            const baseRoot = getBaseLanguageRoot() || {};
            const currentValue = String(getNestedValue(langRoot, key) || '');
            const fallbackValue = String(getNestedValue(baseRoot, key) || '');
            const nextValue = await showTextInputDialog({
                title: i18nRef.t('language.managerTitle'),
                message: `Edit translation:\n${key}`,
                initialValue: currentValue || fallbackValue,
                confirmLabel: i18nRef.t('buttons.save'),
                cancelLabel: i18nRef.t('buttons.cancel')
            });

            if (nextValue === null) return;

            if (!currentLangData.data[currentLangData.code]) {
                currentLangData.data[currentLangData.code] = {};
            }
            setNestedValue(currentLangData.data[currentLangData.code], key, nextValue);
            onSyncAllTranslations?.(currentLangData.code, key, nextValue);

            applyLiveEditValueToElement(target, key, nextValue);

            onRenderEditorKeys?.(String(document.getElementById('lang-search-keys')?.value || ''));
            if (i18nRef.getLanguage() === currentLangData.code) {
                onUpdateUILanguage?.();
            }
        };

        document.addEventListener('click', clickHandler, true);
    };

    const detach = () => {
        if (!clickHandler) return;
        document.removeEventListener('click', clickHandler, true);
        clickHandler = null;
    };

    return {
        setEnabled(next) {
            enabled = !!next;
            if (enabled) attach();
            else detach();
        },
        isEnabled() {
            return enabled;
        },
        dispose() {
            enabled = false;
            detach();
        }
    };
}
