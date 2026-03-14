export function refreshLanguageManagerLayout({
    modal = document.getElementById('language-manager-modal'),
    keysList = document.getElementById('lang-keys-list'),
    windowRef = window
} = {}) {
    if (!modal) return;

    const themeBody = modal.querySelector('.theme-manager-body');
    const activeTab = modal.querySelector('.tab-content:not([style*="display: none"])');

    requestAnimationFrame(() => {
        if (themeBody) themeBody.style.overflowY = 'auto';
        if (activeTab) activeTab.style.minHeight = '0';
        if (keysList) keysList.style.minHeight = '0';
        windowRef.dispatchEvent(new Event('resize'));
    });
}

export function switchLanguageManagerTab({
    tabName,
    modal = document.getElementById('language-manager-modal'),
    onReturnToList = null,
    onAfterSwitch = null
} = {}) {
    if (!modal || !tabName) return;

    const contents = modal.querySelectorAll('.tab-content');
    const tabs = modal.querySelectorAll('.tab-btn');

    contents.forEach((content) => {
        content.style.display = 'none';
    });
    tabs.forEach((tab) => {
        tab.classList.remove('active');
    });

    const targetContent = document.getElementById(`${tabName}-view`);
    const targetTab = modal.querySelector(`[data-tab="${tabName}"]`);

    if (targetContent) targetContent.style.display = 'flex';
    if (targetTab) targetTab.classList.add('active');

    if (tabName === 'lang-list') {
        onReturnToList?.(modal);
    }

    onAfterSwitch?.(modal);
}
