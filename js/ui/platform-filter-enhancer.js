function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function buildPlatformLogoPath(platformKey) {
    const normalized = String(platformKey || '').trim().toLowerCase();
    if (!normalized || normalized === 'all') return '';
    return `emubro-resources/platforms/${normalized}/logos/default.png`;
}

function getOptionLabel(option) {
    return String(option?.dataset?.baseLabel || option?.textContent || '').replace(/^\*\s*/, '').trim();
}

function renderOptionMarkup(option) {
    const value = String(option?.value || '').trim().toLowerCase();
    const label = getOptionLabel(option);
    const iconPath = String(option?.dataset?.platformLogo || buildPlatformLogoPath(value) || '').trim();
    const iconMarkup = iconPath
        ? `<img class="platform-filter-menu-icon" src="${escapeHtml(iconPath)}" alt="" loading="lazy" />`
        : `<span class="platform-filter-menu-icon platform-filter-menu-icon--generic" aria-hidden="true"></span>`;

    return `
        <button
            type="button"
            class="platform-filter-menu-option"
            data-platform-value="${escapeHtml(value)}"
            title="${escapeHtml(label)}"
        >
            ${iconMarkup}
            <span class="platform-filter-menu-label">${escapeHtml(label)}</span>
        </button>
    `;
}

function renderSelectedMarkup(option, fallbackLabel = 'All Platforms') {
    const value = String(option?.value || '').trim().toLowerCase();
    const label = getOptionLabel(option) || fallbackLabel;
    const iconPath = String(option?.dataset?.platformLogo || buildPlatformLogoPath(value) || '').trim();
    const iconMarkup = iconPath
        ? `<img class="platform-filter-selected-icon" src="${escapeHtml(iconPath)}" alt="" loading="lazy" />`
        : `<span class="platform-filter-selected-icon platform-filter-selected-icon--generic" aria-hidden="true"></span>`;

    return `
        ${iconMarkup}
        <span class="platform-filter-selected-label">${escapeHtml(label)}</span>
        <span class="platform-filter-selected-caret" aria-hidden="true"></span>
    `;
}

export function enhancePlatformFilterSelect(documentRef = document) {
    const select = documentRef.getElementById('platform-filter');
    if (!(select instanceof HTMLSelectElement)) return null;

    let shell = select.closest('.platform-filter-shell');
    let trigger = shell?.querySelector?.('.platform-filter-trigger');
    let menuId = String(select.dataset.platformFilterMenuId || '').trim();
    if (!menuId) {
        menuId = `platform-filter-menu-${Math.random().toString(36).slice(2, 10)}`;
        select.dataset.platformFilterMenuId = menuId;
    }

    let menu = documentRef.getElementById(menuId);

    if (!shell) {
        shell = documentRef.createElement('div');
        shell.className = 'platform-filter-shell';
        select.parentNode?.insertBefore(shell, select);
        shell.appendChild(select);

        trigger = documentRef.createElement('button');
        trigger.type = 'button';
        trigger.className = 'platform-filter-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', menuId);
        shell.appendChild(trigger);
    }

    trigger?.setAttribute('aria-controls', menuId);

    if (!menu) {
        menu = documentRef.createElement('div');
        menu.id = menuId;
        menu.className = 'platform-filter-menu';
        menu.setAttribute('role', 'listbox');
        menu.hidden = true;
        documentRef.body?.appendChild(menu);
    } else {
        menu.id = menuId;
        if (menu.parentElement !== documentRef.body) {
            documentRef.body?.appendChild(menu);
        }
    }

    const floatingScrollHost = shell.closest('.view-controls');
    let floatingListenersBound = false;

    const positionMenu = () => {
        if (menu.hidden) return;

        const rect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth || documentRef.documentElement.clientWidth || 0;
        const viewportHeight = window.innerHeight || documentRef.documentElement.clientHeight || 0;
        const gap = 6;
        const sideMargin = 12;
        const availableWidth = Math.max(180, viewportWidth - (sideMargin * 2));
        const targetWidth = Math.min(Math.max(rect.width, 220), Math.min(360, availableWidth));

        menu.style.minWidth = `${Math.min(rect.width, targetWidth)}px`;
        menu.style.maxWidth = `${Math.min(360, availableWidth)}px`;
        menu.style.width = `${targetWidth}px`;

        const measuredWidth = menu.offsetWidth || targetWidth;
        const spaceBelow = viewportHeight - rect.bottom - gap - sideMargin;
        const spaceAbove = rect.top - gap - sideMargin;
        const preferredHeight = Math.min(menu.scrollHeight || 360, 360);
        const shouldOpenAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
        const availableHeight = shouldOpenAbove ? Math.max(140, spaceAbove) : Math.max(140, spaceBelow);
        const top = shouldOpenAbove
            ? Math.max(sideMargin, rect.top - gap - Math.min(preferredHeight, availableHeight))
            : Math.min(viewportHeight - sideMargin - Math.min(preferredHeight, availableHeight), rect.bottom + gap);
        const left = Math.min(
            Math.max(rect.left, sideMargin),
            Math.max(sideMargin, viewportWidth - measuredWidth - sideMargin)
        );

        menu.style.left = `${Math.round(left)}px`;
        menu.style.top = `${Math.round(top)}px`;
        menu.style.maxHeight = `${Math.round(Math.min(availableHeight, 360))}px`;
    };

    const handleFloatingLayoutChange = () => {
        window.requestAnimationFrame(positionMenu);
    };

    const bindFloatingListeners = () => {
        if (floatingListenersBound) return;
        floatingListenersBound = true;
        window.addEventListener('resize', handleFloatingLayoutChange);
        window.addEventListener('scroll', handleFloatingLayoutChange, true);
        floatingScrollHost?.addEventListener('scroll', handleFloatingLayoutChange, { passive: true });
    };

    const unbindFloatingListeners = () => {
        if (!floatingListenersBound) return;
        floatingListenersBound = false;
        window.removeEventListener('resize', handleFloatingLayoutChange);
        window.removeEventListener('scroll', handleFloatingLayoutChange, true);
        floatingScrollHost?.removeEventListener('scroll', handleFloatingLayoutChange);
    };

    const closeMenu = () => {
        shell.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
        unbindFloatingListeners();
    };

    const openMenu = () => {
        shell.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
        bindFloatingListeners();
        positionMenu();
    };

    const syncUi = () => {
        const options = Array.from(select.options || []);
        const selectedOption = options[select.selectedIndex] || options.find((option) => option.value === 'all') || options[0];
        const fallbackLabel = String(options.find((option) => option.value === 'all')?.dataset?.baseLabel || 'All Platforms');

        trigger.innerHTML = renderSelectedMarkup(selectedOption, fallbackLabel);
        menu.innerHTML = options.map((option) => renderOptionMarkup(option)).join('');
        Array.from(menu.querySelectorAll('[data-platform-value]')).forEach((button) => {
            const value = String(button.getAttribute('data-platform-value') || '').trim().toLowerCase();
            button.classList.toggle('is-selected', value === String(select.value || '').trim().toLowerCase());
        });
    };

    if (shell.dataset.platformFilterEnhanced !== 'true') {
        shell.dataset.platformFilterEnhanced = 'true';

        trigger.addEventListener('click', (event) => {
            event.preventDefault();
            if (shell.classList.contains('is-open')) closeMenu();
            else openMenu();
        });

        menu.addEventListener('click', (event) => {
            const button = event.target instanceof HTMLElement ? event.target.closest('[data-platform-value]') : null;
            if (!(button instanceof HTMLElement)) return;
            const nextValue = String(button.getAttribute('data-platform-value') || '').trim().toLowerCase();
            if (!nextValue) return;
            select.value = nextValue;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            syncUi();
            closeMenu();
        });

        documentRef.addEventListener('click', (event) => {
            if (!shell.contains(event.target) && !menu.contains(event.target)) {
                closeMenu();
            }
        });

        documentRef.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeMenu();
        });

        select.addEventListener('change', syncUi);
        select.addEventListener('platform-filter-sync', syncUi);

        if (typeof MutationObserver !== 'undefined') {
            const observer = new MutationObserver(() => {
                syncUi();
            });
            observer.observe(select, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['label', 'value']
            });
        }
    }

    syncUi();
    return { select, shell, trigger, menu, syncUi, closeMenu };
}
