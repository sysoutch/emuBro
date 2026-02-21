let lastWindowWidth = window.innerWidth;
let lastWindowHeight = window.innerHeight;

export function setupWindowControls(options = {}) {
    const emubro = options.emubro;
    if (!emubro) return;

    const minBtn = document.getElementById('win-min-btn');
    const maxBtn = document.getElementById('win-max-btn');
    const closeBtn = document.getElementById('win-close-btn');
    const header = document.querySelector('header.header');

    if (minBtn) minBtn.addEventListener('click', () => emubro.invoke('window:minimize'));
    if (closeBtn) closeBtn.addEventListener('click', () => emubro.invoke('window:close'));
    if (maxBtn) maxBtn.addEventListener('click', async () => {
        await emubro.invoke('window:toggle-maximize');
        updateMaxIcon();
    });

    const setWindowStateAttr = (isMax) => {
        try {
            document.documentElement.setAttribute('data-window-state', isMax ? 'maximized' : 'normal');
        } catch (_e) {}
    };

    const updateMaxIcon = async (forcedIsMax) => {
        if (!maxBtn) return;
        try {
            const isMax = (typeof forcedIsMax === 'boolean')
                ? forcedIsMax
                : await emubro.invoke('window:is-maximized');
            maxBtn.textContent = isMax ? '❐' : '▢';
            maxBtn.title = isMax ? 'Restore' : 'Maximize';
            maxBtn.setAttribute('aria-label', isMax ? 'Restore' : 'Maximize');
            setWindowStateAttr(isMax);
        } catch (_e) {}
    };

    updateMaxIcon();

    if (typeof emubro.onWindowMaximizedChanged === 'function') {
        emubro.onWindowMaximizedChanged((isMax) => updateMaxIcon(!!isMax));
    }

    if (header) {
        header.addEventListener('dblclick', async (event) => {
            if (event.target.closest('button, input, select, textarea, a, .custom-select, .options-list')) return;
            await emubro.invoke('window:toggle-maximize');
            updateMaxIcon();
        });
    }
}

export function setupHeaderThemeControlsToggle(options = {}) {
    const compactQuery = window.matchMedia('(max-width: 1200px)');
    const themeSelect = options.themeSelect || document.getElementById('theme-select');
    const languageManagerBtn = document.getElementById('language-manager-btn');

    const initCompactWrapper = ({
        wrapperSelector,
        toggleId,
        panelId,
        closeOnChangeElement = null
    }) => {
        const wrapper = document.querySelector(wrapperSelector);
        const toggleBtn = document.getElementById(toggleId);
        const panel = document.getElementById(panelId);
        if (!wrapper || !toggleBtn || !panel) return () => {};

        const setOpenState = (open) => {
            const shouldOpen = !!open && compactQuery.matches;
            wrapper.classList.toggle('is-open', shouldOpen);
            toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        };

        const closePanel = () => setOpenState(false);

        toggleBtn.addEventListener('click', (event) => {
            if (!compactQuery.matches) return;
            event.preventDefault();
            event.stopPropagation();
            setOpenState(!wrapper.classList.contains('is-open'));
        });

        document.addEventListener('click', (event) => {
            if (!compactQuery.matches || !wrapper.classList.contains('is-open')) return;
            if (wrapper.contains(event.target)) return;
            closePanel();
        });

        if (closeOnChangeElement) {
            closeOnChangeElement.addEventListener('change', closePanel);
        }

        return closePanel;
    };

    const closeThemePanel = initCompactWrapper({
        wrapperSelector: '.theme-toggle-wrapper',
        toggleId: 'theme-controls-toggle',
        panelId: 'theme-controls-content',
        closeOnChangeElement: themeSelect
    });
    const closeLanguagePanel = initCompactWrapper({
        wrapperSelector: '.language-controls-wrapper',
        toggleId: 'language-controls-toggle',
        panelId: 'language-controls-content'
    });

    const languageOptions = document.getElementById('language-options');
    if (languageOptions) {
        languageOptions.addEventListener('click', (event) => {
            if (!event.target?.closest?.('li')) return;
            closeLanguagePanel();
        });
    }
    if (languageManagerBtn) {
        languageManagerBtn.addEventListener('click', () => {
            closeLanguagePanel();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        closeThemePanel();
        closeLanguagePanel();
    });

    const syncLayout = () => {
        if (compactQuery.matches) return;
        closeThemePanel();
        closeLanguagePanel();
    };

    if (typeof compactQuery.addEventListener === 'function') {
        compactQuery.addEventListener('change', syncLayout);
    } else if (typeof compactQuery.addListener === 'function') {
        compactQuery.addListener(syncLayout);
    }

}

export function setupSidebarRail(options = {}) {
    const setAppMode = typeof options.setAppMode === 'function' ? options.setAppMode : () => {};
    const showToolView = typeof options.showToolView === 'function' ? options.showToolView : () => {};
    const showSupportView = typeof options.showSupportView === 'function' ? options.showSupportView : () => {};
    const showCommunityView = typeof options.showCommunityView === 'function' ? options.showCommunityView : () => {};
    const setActiveRailTarget = typeof options.setActiveRailTarget === 'function' ? options.setActiveRailTarget : () => {};
    const openLibraryPathSettingsModal = typeof options.openLibraryPathSettingsModal === 'function'
        ? options.openLibraryPathSettingsModal
        : async () => {};
    const openProfileModal = typeof options.openProfileModal === 'function' ? options.openProfileModal : async () => {};
    const setActiveLibrarySection = typeof options.setActiveLibrarySection === 'function'
        ? options.setActiveLibrarySection
        : async () => {};
    const getActiveLibrarySection = typeof options.getActiveLibrarySection === 'function'
        ? options.getActiveLibrarySection
        : () => 'all';

    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (!sidebar || !toggleBtn) return;

    const stored = localStorage.getItem('emuBro.sidebarExpanded');
    const initialExpanded = stored === null ? false : stored === 'true';

    const setExpanded = (expanded) => {
        sidebar.classList.toggle('sidebar--expanded', expanded);
        sidebar.classList.toggle('sidebar--collapsed', !expanded);
        toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        toggleBtn.title = expanded ? 'Collapse sidebar' : 'Expand sidebar';
        localStorage.setItem('emuBro.sidebarExpanded', expanded ? 'true' : 'false');
    };

    setExpanded(initialExpanded);

    toggleBtn.addEventListener('click', () => {
        const expanded = sidebar.classList.contains('sidebar--expanded');
        setExpanded(!expanded);
    });

    const railButtons = document.querySelectorAll('.rail-btn.rail-nav[data-rail-target]');
    railButtons.forEach((btn) => {
        btn.addEventListener('click', async () => {
            const target = btn.dataset.railTarget;
            if (target === 'tools') {
                setAppMode('tools');
                showToolView();
                return;
            }

            if (target === 'support') {
                setAppMode('support');
                showSupportView();
                return;
            }

            if (target === 'community') {
                setAppMode('community');
                showCommunityView();
                return;
            }

            if (target === 'settings') {
                setActiveRailTarget('settings');
                await openLibraryPathSettingsModal();
                return;
            }

            if (target === 'profile') {
                setActiveRailTarget('profile');
                await openProfileModal();
                return;
            }

            setAppMode('library');
            await setActiveLibrarySection(getActiveLibrarySection() || 'all');
        });
    });
}

export function setupWindowResizeHandler(options = {}) {
    const recenterManagedModalIfMostlyOutOfView = typeof options.recenterManagedModalIfMostlyOutOfView === 'function'
        ? options.recenterManagedModalIfMostlyOutOfView
        : () => {};

    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        const currentHeight = window.innerHeight;

        const isGettingSmaller = currentWidth < lastWindowWidth || currentHeight < lastWindowHeight;

        lastWindowWidth = currentWidth;
        lastWindowHeight = currentHeight;

        if (!isGettingSmaller) return;

        const modals = [
            'theme-manager-modal',
            'language-manager-modal',
            'game-info-modal',
            'emulator-info-modal'
        ];

        modals.forEach((id) => {
            recenterManagedModalIfMostlyOutOfView(id, {
                visibleThreshold: 0.5,
                smooth: true
            });
        });
    });
}
