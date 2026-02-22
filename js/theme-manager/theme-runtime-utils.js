export function themeHasBrandEditorOverrides(theme) {
    const editor = theme?.editor || {};
    const overrideKeys = [
        'basicBrandEnabled',
        'basicBrandSource',
        'basicBrandStrength',
        'basicBrandColor',
        'basicUseAccentForBrand',
        'basicBrandFromAccentMode',
        'basicBrandFromAccentStrength'
    ];
    return overrideKeys.some((key) => editor[key] !== undefined && editor[key] !== null && String(editor[key]).trim() !== '');
}

export function resolveThemeLogoBrandColor(theme, runtimeColors = {}, deps = {}) {
    const { parseColorToHex, resolveBrandEditorConfig, resolveBasicBrandColor } = deps;
    if (!themeHasBrandEditorOverrides(theme)) {
        return parseColorToHex(runtimeColors.brandColor || '')
            || parseColorToHex(runtimeColors.accentColor || '')
            || '#2f9ec0';
    }
    const brandEditor = resolveBrandEditorConfig(theme?.editor || {});
    return resolveBasicBrandColor(runtimeColors.accentColor, brandEditor.color || runtimeColors.brandColor || '', {
        enabled: brandEditor.enabled,
        mode: brandEditor.source,
        strength: brandEditor.strength,
        textSecondary: runtimeColors.textSecondary
    });
}
