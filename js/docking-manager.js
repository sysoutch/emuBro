/**
 * Docking Manager
 * Handles docking of floating panels to the sidebar with tabbed support
 */

const dockedPanels = new Set();
let activeDockedPanel = null;
let dockMetricsReady = false;
let dockLayoutFrame = null;
let headerResizeObserver = null;
let dockResizeHandleEl = null;
let dockHostEl = null;
let dockResizeActive = false;
let dockResizeStartX = 0;
let dockResizeStartWidth = 0;
let dockResizeInitialized = false;
const modalOriginParentMap = new Map();
const modalOriginSiblingMap = new Map();

const DOCK_WIDTH_STORAGE_KEY = 'emuBro.dockPanelWidth';
const DOCK_WIDTH_MIN = 280;
const DOCK_WIDTH_MAX = 760;

function clampDockWidth(value) {
    const width = Number(value || 0);
    const viewportWidth = Number(window?.innerWidth || 0);
    const sidebarWidth = Number(document.querySelector('.sidebar')?.getBoundingClientRect?.().width || 74);
    const reservedContentWidth = 260;
    const viewportBoundMax = Math.max(180, Math.round(viewportWidth - sidebarWidth - reservedContentWidth));
    const maxAllowed = Math.max(180, Math.min(DOCK_WIDTH_MAX, viewportBoundMax));
    const minAllowed = Math.min(DOCK_WIDTH_MIN, maxAllowed);
    const fallback = Math.min(400, maxAllowed);
    if (!Number.isFinite(width)) return fallback;
    return Math.max(minAllowed, Math.min(maxAllowed, Math.round(width)));
}

function getCurrentDockWidth() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--dock-panel-width');
    const parsed = Number.parseInt(String(raw || '').replace(/px/g, '').trim(), 10);
    return clampDockWidth(parsed);
}

function setDockPanelWidth(width, persist = true) {
    const clamped = clampDockWidth(width);
    document.documentElement.style.setProperty('--dock-panel-width', `${clamped}px`);
    if (!persist) return;
    try {
        localStorage.setItem(DOCK_WIDTH_STORAGE_KEY, String(clamped));
    } catch (_error) {}
}

function restoreDockPanelWidth() {
    if (dockResizeInitialized) return;
    dockResizeInitialized = true;
    try {
        const raw = Number.parseInt(String(localStorage.getItem(DOCK_WIDTH_STORAGE_KEY) || ''), 10);
        if (Number.isFinite(raw) && raw > 0) {
            setDockPanelWidth(raw, false);
        }
    } catch (_error) {}
}

function onDockResizePointerMove(event) {
    if (!dockResizeActive) return;
    const clientX = Number(event?.clientX || 0);
    const delta = dockResizeStartX - clientX;
    setDockPanelWidth(dockResizeStartWidth + delta, true);
    scheduleDockLayoutUpdate();
}

function stopDockResize() {
    if (!dockResizeActive) return;
    dockResizeActive = false;
    document.body.classList.remove('dock-resizing');
    window.removeEventListener('pointermove', onDockResizePointerMove);
    window.removeEventListener('pointerup', stopDockResize);
    window.removeEventListener('pointercancel', stopDockResize);

    try {
        window.dispatchEvent(new CustomEvent('emubro:layout-width-changed', {
            detail: { dockResized: true }
        }));
    } catch (_error) {}
}

function ensureDockHost() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return null;

    dockHostEl = document.getElementById('docked-panel-host');
    if (!dockHostEl) {
        dockHostEl = document.createElement('div');
        dockHostEl.id = 'docked-panel-host';
        dockHostEl.className = 'docked-panel-host';
    }

    if (dockHostEl.parentElement !== mainContent) {
        mainContent.appendChild(dockHostEl);
    }

    return dockHostEl;
}

function setDockHostActive(active) {
    const host = ensureDockHost();
    if (!host) return;
    host.classList.toggle('is-active', !!active);
}

function ensureDockResizeHandle() {
    const mainContent = document.querySelector('.main-content');
    const host = ensureDockHost();
    if (!mainContent || !host) return;

    dockResizeHandleEl = document.getElementById('dock-resize-handle');
    if (!dockResizeHandleEl) {
        dockResizeHandleEl = document.createElement('div');
        dockResizeHandleEl.id = 'dock-resize-handle';
        dockResizeHandleEl.className = 'dock-split-resize-handle';
        dockResizeHandleEl.setAttribute('aria-hidden', 'true');
    }

    if (dockResizeHandleEl.parentElement !== mainContent || dockResizeHandleEl.nextElementSibling !== host) {
        mainContent.insertBefore(dockResizeHandleEl, host);
    }

    if (dockResizeHandleEl.dataset.bound === '1') return;
    dockResizeHandleEl.dataset.bound = '1';
    dockResizeHandleEl.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (!document.body.classList.contains('panel-docked')) return;

        dockResizeActive = true;
        dockResizeStartX = Number(event.clientX || 0);
        dockResizeStartWidth = getCurrentDockWidth();

        document.body.classList.add('dock-resizing');
        window.addEventListener('pointermove', onDockResizePointerMove);
        window.addEventListener('pointerup', stopDockResize);
        window.addEventListener('pointercancel', stopDockResize);

        try {
            dockResizeHandleEl.setPointerCapture(event.pointerId);
        } catch (_error) {}

        event.preventDefault();
    });
}

function rememberModalOrigin(modalId, modal) {
    if (!modal || modalOriginParentMap.has(modalId)) return;
    modalOriginParentMap.set(modalId, modal.parentNode || document.body);
    modalOriginSiblingMap.set(modalId, modal.nextSibling || null);
}

function moveModalToDockHost(modalId, modal) {
    const host = ensureDockHost();
    if (!host || !modal) return;
    rememberModalOrigin(modalId, modal);
    if (modal.parentNode !== host) {
        host.appendChild(modal);
    }
}

function restoreModalOrigin(modalId, modal) {
    if (!modal) return;
    const parent = modalOriginParentMap.get(modalId) || document.body;
    const sibling = modalOriginSiblingMap.get(modalId);
    const safeSibling = sibling && sibling.parentNode === parent ? sibling : null;

    try {
        if (modal.parentNode !== parent) {
            parent.insertBefore(modal, safeSibling);
        }
    } catch (_error) {
        document.body.appendChild(modal);
    }
}

function applyDockRootState() {
    const visibleIds = getVisibleDockedPanelIds();
    const hasVisiblePanels = visibleIds.length > 0;
    document.body.classList.toggle('panel-docked', hasVisiblePanels);
    document.body.classList.toggle('docking-accordion', visibleIds.length > 1);
    setDockHostActive(hasVisiblePanels);

    try {
        window.dispatchEvent(new CustomEvent('emubro:layout-width-changed', {
            detail: { panelDocked: hasVisiblePanels }
        }));
    } catch (_error) {}

    if (!hasVisiblePanels) {
        activeDockedPanel = null;
        stopDockResize();
        return;
    }

    if (!activeDockedPanel || !visibleIds.includes(activeDockedPanel)) {
        activeDockedPanel = visibleIds[0];
    }
}

function updateDockHeaderOffset() {
    const header = document.querySelector('.header');
    const height = header ? Math.max(0, Math.round(header.getBoundingClientRect().height)) : 0;
    document.documentElement.style.setProperty('--dock-header-offset', `${height}px`);
}

function scheduleDockLayoutUpdate() {
    if (dockLayoutFrame !== null) return;
    dockLayoutFrame = window.requestAnimationFrame(() => {
        dockLayoutFrame = null;
        setDockPanelWidth(getCurrentDockWidth(), false);
        updateDockHeaderOffset();
        if (dockedPanels.size > 0) {
            applyDockedAccordionLayout();
        }
    });
}

function ensureDockMetrics() {
    if (dockMetricsReady) return;
    dockMetricsReady = true;

    updateDockHeaderOffset();
    window.addEventListener('resize', scheduleDockLayoutUpdate, { passive: true });

    const header = document.querySelector('.header');
    if (header && typeof ResizeObserver !== 'undefined') {
        headerResizeObserver = new ResizeObserver(() => {
            scheduleDockLayoutUpdate();
        });
        headerResizeObserver.observe(header);
    }
}

export function requestDockLayoutRefresh() {
    ensureDockMetrics();
    scheduleDockLayoutUpdate();
}

function clearDockInlineLayout(modal) {
    if (!modal) return;
    modal.style.removeProperty('top');
    modal.style.removeProperty('bottom');
    modal.style.removeProperty('height');
    modal.style.removeProperty('max-height');
}

function getVisibleDockedPanelIds() {
    return [...dockedPanels].filter((id) => {
        const modal = document.getElementById(id);
        if (!modal) return false;
        if (!modal.classList.contains('docked-right')) return false;
        if (modal.style.display === 'none') return false;
        return true;
    });
}

function applyDockedAccordionLayout() {
    const visibleIds = getVisibleDockedPanelIds();
    if (visibleIds.length === 0) return;

    const activeId = (activeDockedPanel && visibleIds.includes(activeDockedPanel))
        ? activeDockedPanel
        : visibleIds[0];

    // Single panel: let stylesheet defaults handle full-height dock mode.
    if (visibleIds.length <= 1 || !document.body.classList.contains('docking-accordion')) {
        visibleIds.forEach((id) => {
            const modal = document.getElementById(id);
            if (!modal) return;
            clearDockInlineLayout(modal);
            modal.classList.remove('accordion-collapsed');
            modal.classList.remove('accordion-expanded');
        });
        return;
    }

    const collapsedIds = visibleIds.filter((id) => id !== activeId);
    const collapsedCount = collapsedIds.length;

    collapsedIds.forEach((id, collapsedIndex) => {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.style.setProperty('top', 'auto', 'important');
        const collapsedBottom = `calc(${collapsedIndex} * var(--dock-accordion-header-h))`;
        modal.style.setProperty('bottom', collapsedBottom, 'important');
        modal.style.setProperty('height', 'var(--dock-accordion-header-h)', 'important');
        modal.style.setProperty('max-height', 'var(--dock-accordion-header-h)', 'important');
    });

    const activeModal = document.getElementById(activeId);
    if (activeModal) {
        activeModal.style.setProperty('bottom', 'auto', 'important');
        const expandedBottom = `calc(${collapsedCount} * var(--dock-accordion-header-h))`;
        activeModal.style.setProperty('top', '0', 'important');
        activeModal.style.setProperty('bottom', expandedBottom, 'important');
        activeModal.style.setProperty('height', 'auto', 'important');
        activeModal.style.setProperty('max-height', 'none', 'important');
    }
}

function getDockedTabIcon(id) {
    if (id === 'theme-manager-modal') {
        return `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <path d="M14 4 20 10 11 19H5v-6L14 4Z"></path>
                    <path d="M14 4 17 7"></path>
                </svg>
            </span>
        `;
    }

    if (id === 'language-manager-modal') {
        return `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M3 12h18"></path>
                    <path d="M12 3c2.7 2.4 4.2 5.7 4.2 9s-1.5 6.6-4.2 9"></path>
                    <path d="M12 3c-2.7 2.4-4.2 5.7-4.2 9s1.5 6.6 4.2 9"></path>
                </svg>
            </span>
        `;
    }

  if (id === 'game-info-modal') {
        return `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 10.3v5.5"></path>
                    <circle cx="12" cy="7.2" r="0.8" fill="currentColor" stroke="none"></circle>
                </svg>
            </span>
        `;
    }

    if (id === 'emulator-info-modal') {
        return `
            <span class="icon-svg" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                    <rect x="5" y="8" width="14" height="9" rx="2"></rect>
                    <path d="M8 17v2"></path>
                    <path d="M16 17v2"></path>
                    <circle cx="10" cy="12.5" r="0.7" fill="currentColor" stroke="none"></circle>
                    <circle cx="14" cy="12.5" r="0.7" fill="currentColor" stroke="none"></circle>
                </svg>
            </span>
        `;
    }

    return '<span aria-hidden="true">P</span>';
}

export function initDocking() {
    ensureDockMetrics();
    restoreDockPanelWidth();
    ensureDockResizeHandle();
    ensureDockHost();

    // Create tab container if it doesn't exist
    if (!document.getElementById('docked-tabs-container')) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            const tabContainer = document.createElement('div');
            tabContainer.id = 'docked-tabs-container';
            tabContainer.className = 'docked-tabs-container';
            sidebar.appendChild(tabContainer);
        }
    }
}

export function toggleDock(modalId, pinBtnId, forceState = null) {
    const modal = document.getElementById(modalId);
    const pinBtn = document.getElementById(pinBtnId);

    if (!modal) {
        return;
    }

    let isDocked;
    if (forceState !== null) {
        isDocked = forceState;
        if (isDocked) modal.classList.add('docked-right');
        else modal.classList.remove('docked-right');
    } else {
        isDocked = modal.classList.toggle('docked-right');
    }

    if (pinBtn) {
        if (isDocked) pinBtn.classList.add('active');
        else pinBtn.classList.remove('active');
    }

    if (isDocked) {
        moveModalToDockHost(modalId, modal);
        dockedPanels.add(modalId);
        clearDockInlineLayout(modal);
        modal.style.removeProperty('left');
        modal.style.removeProperty('transform');
        modal.classList.remove('moved');
        modal.style.display = 'flex';
        modal.classList.add('active');
        activatePanel(modalId);
    } else {
        dockedPanels.delete(modalId);
        undockPanel(modalId);
    }
}

export function removeFromDock(modalId) {
    // We don't remove it from the Set if we just closed the window
    // because we want to remember it's docked if reopened.
    // dockedPanels.delete(modalId); 
    
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }

    if (activeDockedPanel === modalId) {
        activeDockedPanel = getVisibleDockedPanelIds()[0] || null;
    }

    applyDockRootState();
    updateDockedTabs();
    scheduleDockLayoutUpdate();
}

export function completelyRemoveFromDock(modalId) {
    dockedPanels.delete(modalId);

    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('docked-right');
        modal.classList.remove('accordion-collapsed');
        modal.classList.remove('accordion-expanded');
        clearDockInlineLayout(modal);
        restoreModalOrigin(modalId, modal);
    }
    
    if (activeDockedPanel === modalId) {
        activeDockedPanel = null;
    }

    applyDockRootState();
    if (activeDockedPanel) {
        activatePanel(activeDockedPanel);
    } else {
        updateDockedTabs();
        scheduleDockLayoutUpdate();
    }
}

export function activatePanel(modalId) {
    activeDockedPanel = modalId;
    
    if (dockedPanels.has(modalId)) {
        const activeModal = document.getElementById(modalId);
        if (activeModal) {
            moveModalToDockHost(modalId, activeModal);
            activeModal.classList.add('docked-right');
        }
    }

    dockedPanels.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            moveModalToDockHost(id, modal);
            modal.classList.add('docked-right');
            modal.classList.add('active');
            modal.style.display = 'flex';

            if (id === modalId) {
                modal.classList.add('accordion-expanded');
                modal.classList.remove('accordion-collapsed');
            } else {
                modal.classList.remove('accordion-expanded');
                modal.classList.add('accordion-collapsed');
            }
        }
    });

    applyDockRootState();
    updateDockedTabs();
}

function undockPanel(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('docked-right');
    modal.classList.remove('accordion-collapsed');
    modal.classList.remove('accordion-expanded');
    clearDockInlineLayout(modal);
    restoreModalOrigin(modalId, modal);

    // Ensure it's visible and centered
    modal.style.display = 'flex';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.classList.remove('moved');

    applyDockRootState();
    updateDockedTabs();
    scheduleDockLayoutUpdate();
}

export function updateDockedTabs() {
    ensureDockMetrics();

    const container = document.getElementById('docked-tabs-container');
    if (!container) return;

    const visibleIds = getVisibleDockedPanelIds();
    if (visibleIds.length <= 0) {
        container.style.display = 'none';
        setDockHostActive(false);
        return;
    }

    if (!activeDockedPanel || !visibleIds.includes(activeDockedPanel)) {
        activeDockedPanel = visibleIds[0];
    }

    container.style.display = 'flex';
    container.innerHTML = '';

    visibleIds.forEach(id => {
        const tab = document.createElement('div');
        tab.className = `docked-tab ${activeDockedPanel === id ? 'active' : ''}`;
        tab.innerHTML = getDockedTabIcon(id);
        tab.title = id.replace('-modal', '').replace('-', ' ');

        tab.addEventListener('click', () => activatePanel(id));
        container.appendChild(tab);
    });

    applyDockRootState();
    scheduleDockLayoutUpdate();
}

export function isPanelDocked(modalId) {
    return dockedPanels.has(modalId);
}
