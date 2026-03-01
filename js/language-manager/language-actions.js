export async function renameLanguage({
    lang,
    showRenameLanguageDialog,
    languageCodePattern,
    flagCodePattern,
    emubro,
    i18nRef,
    onRefreshRuntimeState,
    onReloadList
}) {
    if (!lang || !lang.filename || !lang.canRename) return;
    const next = await showRenameLanguageDialog(lang);
    if (!next) return;

    if (!languageCodePattern.test(next.code)) {
        alert(i18nRef.t('language.invalidCode'));
        return;
    }
    if (!next.name) {
        alert(i18nRef.t('language.addDialogInvalidName'));
        return;
    }
    if (!flagCodePattern.test(next.flag)) {
        alert(i18nRef.t('language.addDialogInvalidFlag'));
        return;
    }

    const result = await emubro.locales.rename({
        oldFilename: lang.filename,
        oldCode: lang.code,
        newCode: next.code,
        newName: next.name,
        newAbbreviation: next.abbreviation || next.code.toUpperCase(),
        newFlag: next.flag
    });
    if (!result?.success) {
        throw new Error(result?.message || 'Rename failed');
    }
    if (String(i18nRef.getLanguage() || '').trim().toLowerCase() === String(lang.code || '').trim().toLowerCase()) {
        i18nRef.setLanguage(String(result.code || next.code || 'en').trim().toLowerCase());
    }
    await onRefreshRuntimeState?.();
    onReloadList?.();
}

export async function changeLanguageFlag({
    lang,
    flagCodePattern,
    emubro,
    i18nRef,
    showTextInputDialog,
    onRefreshRuntimeState,
    onReloadList
}) {
    if (!lang || !lang.filename || !lang.code) return;
    const langInfo = lang?.data?.[lang?.code]?.language || {};
    const currentFlag = String(langInfo.flag || 'us').trim().toLowerCase();

    const chosenFlag = await showTextInputDialog({
        title: 'Change Flag',
        message: 'Enter a 2-letter flag code (example: us, de, fr).',
        initialValue: currentFlag,
        confirmLabel: 'Next',
        cancelLabel: i18nRef.t('buttons.cancel')
    });
    if (chosenFlag === null) return;
    const flagCode = String(chosenFlag || '').trim().toLowerCase();
    if (!flagCodePattern.test(flagCode)) {
        alert(i18nRef.t('language.addDialogInvalidFlag'));
        return;
    }

    let usedCustomUpload = false;
    const pick = await emubro.invoke('open-file-dialog', {
        title: `Optional: select custom SVG for '${flagCode}'`,
        properties: ['openFile'],
        filters: [{ name: 'SVG', extensions: ['svg'] }]
    });
    if (pick && !pick.canceled && Array.isArray(pick.filePaths) && pick.filePaths[0]) {
        const filePath = String(pick.filePaths[0] || '').trim();
        try {
            const writeResult = await emubro.locales.writeFlagFromFile({ flagCode, filePath });
            if (!writeResult?.success) {
                throw new Error(writeResult?.message || 'Failed to save custom flag');
            }
            usedCustomUpload = true;
        } catch (error) {
            alert(`Custom flag upload failed: ${String(error?.message || error || 'Unknown error')}`);
            return;
        }
    }

    const nextJson = JSON.parse(JSON.stringify(lang.data || {}));
    if (!nextJson[lang.code]) {
        nextJson[lang.code] = {};
    }
    if (!nextJson[lang.code].language || typeof nextJson[lang.code].language !== 'object') {
        nextJson[lang.code].language = {};
    }
    nextJson[lang.code].language.flag = flagCode;
    await emubro.locales.write(lang.filename, nextJson);

    await onRefreshRuntimeState?.();
    onReloadList?.();
    if (usedCustomUpload) {
        alert('Flag changed and custom icon uploaded.');
    }
}

export async function deleteLanguage({
    lang,
    emubro,
    i18nRef,
    onRefreshRuntimeState,
    onReloadList
}) {
    if (!lang || !lang.filename || !lang.canDelete) return;
    const info = lang?.data?.[lang?.code]?.language || {};
    const label = String(info?.name || lang.code || lang.filename);
    const confirmed = window.confirm(`Delete language '${label}'?`);
    if (!confirmed) return;

    const result = await emubro.locales.delete(lang.filename);
    if (!result?.success) {
        throw new Error(result?.message || 'Delete failed');
    }

    if (String(i18nRef.getLanguage() || '').trim().toLowerCase() === String(lang.code || '').trim().toLowerCase()) {
        i18nRef.setLanguage('en');
    }
    await onRefreshRuntimeState?.();
    onReloadList?.();
}
