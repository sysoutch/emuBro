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

    function resolveManagedModal(modalOrId) {
        if (!modalOrId) return null;
        if (typeof modalOrId === 'string') return documentRef.getElementById(modalOrId);
        return modalOrId instanceof HTMLElement ? modalOrId : null;
    }

    function makeDraggable(modalId, headerId) {
        const modal = documentRef.getElementById(modalId);
        const header = documentRef.getElementById(headerId);
        if (!modal || !header) return;

        header.style.cursor = 'move';

        header.addEventListener('mousedown', (e) => {
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
        makeDraggable,
        resetManagedModalPosition,
        recenterManagedModalIfMostlyOutOfView
    };
}
