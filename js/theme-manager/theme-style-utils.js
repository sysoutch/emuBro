/**
 * Theme appearance utilities
 */

const log = console;

export function applyGlassEffect(enable) {
    if (enable) {
        document.documentElement.setAttribute('data-glass-effect', 'enabled');
    } else {
        document.documentElement.removeAttribute('data-glass-effect');
    }
    log.info(`Glass effect: ${enable ? 'ON' : 'OFF'}`);
}

export function applyCornerStyle(style) {
    const root = document.documentElement;
    if (style === 'sharp') {
        root.style.setProperty('--radius-btn', '0px');
        root.style.setProperty('--radius-btn-top-left', '0px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '0px');

        root.style.setProperty('--radius-input', '0px');
        root.style.setProperty('--radius-input-top-left', '0px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '0px');

        root.style.setProperty('--radius-card', '0px');
        root.style.setProperty('--radius-sm', '0px');
    } else if (style === 'semi-rounded') {
        root.style.setProperty('--radius-btn', '4px');
        root.style.setProperty('--radius-btn-top-left', '4px');
        root.style.setProperty('--radius-btn-top-right', '4px');
        root.style.setProperty('--radius-btn-bottom-left', '4px');
        root.style.setProperty('--radius-btn-bottom-right', '4px');

        root.style.setProperty('--radius-input', '4px');
        root.style.setProperty('--radius-input-top-left', '4px');
        root.style.setProperty('--radius-input-top-right', '4px');
        root.style.setProperty('--radius-input-bottom-left', '4px');
        root.style.setProperty('--radius-input-bottom-right', '4px');

        root.style.setProperty('--radius-card', '4px');
        root.style.setProperty('--radius-sm', '2px');
    } else if (style === 'futuristic') {
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-btn-top-left', '20px');
        root.style.setProperty('--radius-btn-top-right', '0px');
        root.style.setProperty('--radius-btn-bottom-left', '0px');
        root.style.setProperty('--radius-btn-bottom-right', '20px');

        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-input-top-left', '20px');
        root.style.setProperty('--radius-input-top-right', '0px');
        root.style.setProperty('--radius-input-bottom-left', '0px');
        root.style.setProperty('--radius-input-bottom-right', '20px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    } else {
        root.style.setProperty('--radius-btn', '20px');
        root.style.setProperty('--radius-btn-top-left', '20px');
        root.style.setProperty('--radius-btn-top-right', '20px');
        root.style.setProperty('--radius-btn-bottom-left', '20px');
        root.style.setProperty('--radius-btn-bottom-right', '20px');

        root.style.setProperty('--radius-input', '20px');
        root.style.setProperty('--radius-input-top-left', '20px');
        root.style.setProperty('--radius-input-top-right', '20px');
        root.style.setProperty('--radius-input-bottom-left', '20px');
        root.style.setProperty('--radius-input-bottom-right', '20px');

        root.style.setProperty('--radius-card', '12px');
        root.style.setProperty('--radius-sm', '4px');
    }
}
