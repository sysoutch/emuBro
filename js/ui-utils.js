/**
 * UI Utilities for color manipulation and parsing
 */

export function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

export function rgbToHex(r, g, b) {
    const toHex = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function invertHex(hex) {
    const rgb = hexToRgb(hex);
    return rgbToHex(255 - rgb.r, 255 - rgb.g, 255 - rgb.b);
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h, s, l };
}

export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
}

export function flipLightness(hex) {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    // Invert lightness: 1.0 - l
    const newRgb = hslToRgb(hsl.h, hsl.s, 1.0 - hsl.l);
    return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

export function parseColorToHex(color) {
    if (color === null || color === undefined) return '';
    const raw = String(color).trim();
    if (!raw) return '';

    // Normalize hex values first.
    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (hexMatch) {
        const normalized = hexMatch[1].toLowerCase();
        if (normalized.length === 3) {
            return `#${normalized.split('').map(c => c + c).join('')}`;
        }
        if (normalized.length === 8) {
            // Drop alpha channel for theme color vars.
            return `#${normalized.slice(0, 6)}`;
        }
        return `#${normalized}`;
    }

    // Handle rgb/rgba quickly.
    const rgbMatch = raw.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
    if (rgbMatch) {
        return rgbToHex(parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10));
    }

    // Fallback using canvas for named colors and browser-supported syntaxes.
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '';
    const sentinel = '#010203';
    ctx.fillStyle = sentinel;
    ctx.fillStyle = raw;
    const resolved = String(ctx.fillStyle || '').trim().toLowerCase();
    if (!resolved) return '';
    if (resolved === sentinel && raw.toLowerCase() !== sentinel) return '';

    const resolvedHex = resolved.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
    if (resolvedHex) {
        const value = resolvedHex[1].toLowerCase();
        if (value.length === 3) return `#${value.split('').map(c => c + c).join('')}`;
        if (value.length === 8) return `#${value.slice(0, 6)}`;
        return `#${value}`;
    }

    const resolvedRgb = resolved.match(/^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i);
    if (resolvedRgb) {
        return rgbToHex(parseInt(resolvedRgb[1], 10), parseInt(resolvedRgb[2], 10), parseInt(resolvedRgb[3], 10));
    }

    return '';
}

export function darkenHex(hex, percent) {
    // Remove the hash if it exists
    hex = hex.replace('#', '');
    
    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Darken each channel
    r = Math.floor(r * (1 - percent / 100));
    g = Math.floor(g * (1 - percent / 100));
    b = Math.floor(b * (1 - percent / 100));

    // Convert back to hex and pad with zeros if needed
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
