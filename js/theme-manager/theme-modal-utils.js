export function createThemeModalUtils(deps = {}) {
    const {
        clampNumber,
        documentRef = document,
        windowRef = window
    } = deps;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let modalInitialX = 0;
    let modalInitialY = 0;
    let highestManagedModalZ = 0;

    function resolveManagedModal(modalOrId) {
        if (!modalOrId) return null;
        if (typeof modalOrId === 'string') return documentRef.getElementById(modalOrId);
        return modalOrId instanceof HTMLElement ? modalOrId : null;
    }

    function getManagedModalBaseZ(modal) {
        if (!modal) return 2000;
        const cached = Number.parseInt(String(modal.dataset.managedModalBaseZ || ''), 10);
        if (Number.isFinite(cached) && cached > 0) {
            return cached;
        }
        const computed = Number.parseInt(String(windowRef.getComputedStyle(modal).zIndex || ''), 10);
        const baseZ = Number.isFinite(computed) && computed > 0 ? computed : 2000;
        modal.dataset.managedModalBaseZ = String(baseZ);
        return baseZ;
    }

    function focusManagedModal(modalOrId) {
        const modal = resolveManagedModal(modalOrId);
        if (!modal) return false;
        if (modal.classList.contains('docked-right')) {
            return false;
        }

        const baseZ = getManagedModalBaseZ(modal);
        let maxZ = Math.max(highestManagedModalZ, baseZ);
        documentRef.querySelectorAll('[data-managed-modal-base-z]').forEach((candidate) => {
            if (!(candidate instanceof HTMLElement) || candidate === modal) return;
            const currentZ = Number.parseInt(String(candidate.style.zIndex || candidate.dataset.managedModalZ || ''), 10);
            const candidateBase = Number.parseInt(String(candidate.dataset.managedModalBaseZ || ''), 10);
            if (Number.isFinite(currentZ)) {
                maxZ = Math.max(maxZ, currentZ);
            } else if (Number.isFinite(candidateBase)) {
                maxZ = Math.max(maxZ, candidateBase);
            }
            candidate.removeAttribute('data-managed-modal-active');
        });

        const nextZ = Math.max(baseZ, maxZ + 1);
        highestManagedModalZ = nextZ;
        modal.style.zIndex = String(nextZ);
        modal.dataset.managedModalZ = String(nextZ);
        modal.setAttribute('data-managed-modal-active', '1');
        return true;
    }

    function makeDraggable(modalId, headerId) {
        const modal = documentRef.getElementById(modalId);
        const header = documentRef.getElementById(headerId);
        if (!modal || !header) return;

        if (modal.dataset.managedModalDragBound === '1') {
            focusManagedModal(modal);
            return;
        }
        modal.dataset.managedModalDragBound = '1';

        header.style.cursor = 'move';
        getManagedModalBaseZ(modal);

        const focusModal = () => {
            focusManagedModal(modal);
        };

        modal.addEventListener('mousedown', focusModal);
        modal.addEventListener('focusin', focusModal);

        header.addEventListener('mousedown', (e) => {
            focusManagedModal(modal);
            if (e.target.closest('button, input, select, textarea')) return;

            if (modal.classList.contains('accordion-collapsed')) {
                import('../docking-manager').then(m => m.activatePanel(modalId));
                return;
            }

            if (modal.classList.contains('docked-right')) {
                return;
            }

            isDragging = true;
            const rect = modal.getBoundingClientRect();

            modal.style.transform = 'none';
            modal.style.top = `${rect.top}px`;
            modal.style.left = `${rect.left}px`;
            modal.style.margin = '0';

            startX = e.clientX;
            startY = e.clientY;
            modalInitialX = rect.left;
            modalInitialY = rect.top;

            documentRef.addEventListener('mousemove', onMouseMove);
            documentRef.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            modal.style.left = `${modalInitialX + dx}px`;
            modal.style.top = `${modalInitialY + dy}px`;
        }

        function onMouseUp() {
            isDragging = false;
            documentRef.removeEventListener('mousemove', onMouseMove);
            documentRef.removeEventListener('mouseup', onMouseUp);
        }
    }

    function resetManagedModalPosition(modalOrId, options = {}) {
        const modal = resolveManagedModal(modalOrId);
        if (!modal) return false;

        const smooth = options.smooth !== false;
        if (smooth) modal.classList.add('smooth-reset');

        modal.style.top = '';
        modal.style.left = '';
        modal.style.transform = '';
        modal.classList.remove('moved');

        if (smooth) {
            const duration = Number.isFinite(Number(options.smoothDurationMs))
                ? Math.max(0, Number(options.smoothDurationMs))
                : 800;
            windowRef.setTimeout(() => {
                modal.classList.remove('smooth-reset');
            }, duration);
        }

        return true;
    }

    function recenterManagedModalIfMostlyOutOfView(modalOrId, options = {}) {
        const modal = resolveManagedModal(modalOrId);
        if (!modal) return false;
        if (modal.classList.contains('docked-right')) return false;
        if (!options.allowInactive && !modal.classList.contains('active')) return false;

        const rect = modal.getBoundingClientRect();
        if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
            return false;
        }

        const viewportWidth = windowRef.innerWidth;
        const viewportHeight = windowRef.innerHeight;
        const visibleLeft = Math.max(0, rect.left);
        const visibleRight = Math.min(viewportWidth, rect.right);
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(viewportHeight, rect.bottom);
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = rect.width * rect.height;
        if (totalArea <= 0) return false;

        const threshold = Number.isFinite(Number(options.visibleThreshold))
            ? clampNumber(Number(options.visibleThreshold), 0, 1)
            : 0.5;

        if (visibleArea >= totalArea * threshold) return false;

        return resetManagedModalPosition(modal, {
            smooth: options.smooth !== false,
            smoothDurationMs: options.smoothDurationMs
        });
    }

    return {
        focusManagedModal,
        makeDraggable,
        resetManagedModalPosition,
        recenterManagedModalIfMostlyOutOfView
    };
}
