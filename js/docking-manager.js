/**
 * Docking Manager
 * Handles docking of floating panels to the sidebar with tabbed support
 */

const dockedPanels = new Set();
let activeDockedPanel = null;

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
        });
        return;
    }

    const collapsedCount = visibleIds.length - 1;
    let collapsedIndex = 0;

    visibleIds.forEach((id) => {
        const modal = document.getElementById(id);
        if (!modal) return;

        modal.style.bottom = 'auto';

        if (id === activeId) {
            const expandedTop = `calc(var(--dock-edge-inset) + (${collapsedCount} * var(--dock-accordion-header-h)))`;
            const expandedHeight = `calc(100vh - (var(--dock-edge-inset) * 2) - (${collapsedCount} * var(--dock-accordion-header-h)))`;
            modal.style.top = expandedTop;
            modal.style.height = expandedHeight;
            modal.style.maxHeight = expandedHeight;
        } else {
            const collapsedTop = `calc(var(--dock-edge-inset) + (${collapsedIndex} * var(--dock-accordion-header-h)))`;
            modal.style.top = collapsedTop;
            modal.style.height = 'var(--dock-accordion-header-h)';
            modal.style.maxHeight = 'var(--dock-accordion-header-h)';
            collapsedIndex += 1;
        }
    });
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
    
    console.log(`[toggleDock] modalId: ${modalId}, pinBtnId: ${pinBtnId}, forceState: ${forceState}`);
    
    if (!modal) {
        console.error(`[toggleDock] Modal ${modalId} not found`);
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
    
    console.log(`[toggleDock] isDocked: ${isDocked}`);
    
    if (pinBtn) {
        if (isDocked) pinBtn.classList.add('active');
        else pinBtn.classList.remove('active');
    }

    if (isDocked) {
        console.log(`[toggleDock] Docking panel ${modalId}`);
        dockedPanels.add(modalId);
        
        // If it was closed/hidden, make sure it's shown before activating
        modal.style.display = 'flex';
        modal.classList.add('active');

        activatePanel(modalId);
    } else {
        console.log(`[toggleDock] Undocking panel ${modalId}`);
        completelyRemoveFromDock(modalId);
        undockPanel(modalId);
    }
    
    updateDockedTabs();
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
        activeDockedPanel = dockedPanels.size > 0 ? [...dockedPanels].find(id => id !== modalId && document.getElementById(id)?.style.display !== 'none') || null : null;
        if (activeDockedPanel) {
            activatePanel(activeDockedPanel);
        }
    }
    
    // Check if any OTHER panel is still docked AND visible
    const anyPanelVisible = [...dockedPanels].some(id => {
        const modal = document.getElementById(id);
        return modal && modal.style.display !== 'none';
    });

    if (!anyPanelVisible) {
        document.body.classList.remove('panel-docked');
    }
    
    updateDockedTabs();
}

export function completelyRemoveFromDock(modalId) {
    dockedPanels.delete(modalId);
    
    if (activeDockedPanel === modalId) {
        activeDockedPanel = dockedPanels.size > 0 ? [...dockedPanels][0] : null;
        if (activeDockedPanel) {
            activatePanel(activeDockedPanel);
        }
    }

    if (dockedPanels.size === 0) {
        document.body.classList.remove('panel-docked');
        document.body.classList.remove('docking-accordion');
    } else {
        // If there's still a panel docked, ensure layout is correct
        document.body.classList.add('panel-docked');
        if (dockedPanels.size === 1) {
            document.body.classList.remove('docking-accordion');
            // Ensure the remaining panel is expanded correctly
            const remainingId = [...dockedPanels][0];
            const modal = document.getElementById(remainingId);
            if (modal) {
                modal.classList.remove('accordion-collapsed');
                modal.classList.remove('accordion-expanded');
            }
        }
    }
    
    updateDockedTabs();
}

export function activatePanel(modalId) {
    activeDockedPanel = modalId;
    
    if (dockedPanels.has(modalId)) {
        // Force layout class to be present
        document.body.classList.add('panel-docked');
        console.log("Activating docked panel, adding panel-docked class");
        
        if (dockedPanels.size > 1) {
            document.body.classList.add('docking-accordion');
        } else {
            document.body.classList.remove('docking-accordion');
        }
    }

    dockedPanels.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
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
    
    updateDockedTabs();
}

function undockPanel(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    modal.classList.remove('docked-right');
    modal.classList.remove('accordion-collapsed');
    modal.classList.remove('accordion-expanded');
    
    // Ensure it's visible and centered
    modal.style.display = 'flex';
    modal.style.top = '50%';
    modal.style.left = '50%';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.classList.remove('moved');
    
    // Reset body classes
    document.body.classList.remove('panel-docked');
    document.body.classList.remove('docking-accordion');
    
    updateDockedTabs();
}

export function updateDockedTabs() {
    const container = document.getElementById('docked-tabs-container');
    if (!container) return;
    
    if (dockedPanels.size <= 0) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'flex';
    container.innerHTML = '';
    
    dockedPanels.forEach(id => {
        const tab = document.createElement('div');
        tab.className = `docked-tab ${activeDockedPanel === id ? 'active' : ''}`;
        tab.innerHTML = getDockedTabIcon(id);
        tab.title = id.replace('-modal', '').replace('-', ' ');
        
        tab.addEventListener('click', () => activatePanel(id));
        container.appendChild(tab);
    });

    applyDockedAccordionLayout();
}

export function isPanelDocked(modalId) {
    return dockedPanels.has(modalId);
}
