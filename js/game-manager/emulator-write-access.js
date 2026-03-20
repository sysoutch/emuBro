function normalizePath(value) {
    return String(value || '').trim();
}

export async function checkEmulatorWriteAccess(emubro, emulator = {}) {
    const filePath = normalizePath(typeof emulator === 'string' ? emulator : emulator?.filePath);
    const workingDirectory = normalizePath(typeof emulator === 'object' ? emulator?.workingDirectory : '');
    const targetPath = workingDirectory || filePath;
    if (!emubro || !targetPath) {
        return {
            success: false,
            writable: true,
            targetPath,
            resolvedDirectory: '',
            skipped: true,
            message: ''
        };
    }

    try {
        const result = await emubro.invoke('check-path-write-access', targetPath);
        return {
            success: !!result?.success,
            writable: result?.writable !== false,
            targetPath,
            resolvedDirectory: String(result?.resolvedDirectory || ''),
            skipped: false,
            message: String(result?.message || '')
        };
    } catch (error) {
        return {
            success: false,
            writable: true,
            targetPath,
            resolvedDirectory: '',
            skipped: true,
            message: error?.message || String(error || '')
        };
    }
}

export function buildEmulatorWriteAccessWarning(emulator = {}, writeAccess = {}, context = 'launch') {
    const name = normalizePath(emulator?.name) || 'This emulator';
    const folderPath = normalizePath(writeAccess?.resolvedDirectory) || normalizePath(writeAccess?.targetPath);
    const locationLabel = context === 'add' ? 'when adding it' : 'before launching a game with it';
    const guidance = normalizePath(emulator?.workingDirectory)
        ? 'Choose a writable working directory in the emulator settings, or move the emulator to a writable folder.'
        : 'Move the emulator to a writable folder, or set a writable working directory in the emulator settings.';

    return [
        `${name} is in a folder that does not seem writable.`,
        folderPath ? `Folder: ${folderPath}` : '',
        '',
        `emuBro is warning you ${locationLabel} because some emulators need write access for configs, saves, memory cards, caches, or shaders.`,
        guidance
    ].filter(Boolean).join('\n');
}

export async function warnIfEmulatorFolderNotWritable(emubro, emulator, alertFn = window.alert, context = 'add') {
    const writeAccess = await checkEmulatorWriteAccess(emubro, emulator);
    if (writeAccess.skipped || writeAccess.writable) return { warned: false, writeAccess };
    alertFn(buildEmulatorWriteAccessWarning(emulator, writeAccess, context));
    return { warned: true, writeAccess };
}

export async function confirmWritableEmulatorFolderForLaunch(emubro, emulator, confirmFn = window.confirm) {
    const writeAccess = await checkEmulatorWriteAccess(emubro, emulator);
    if (writeAccess.skipped || writeAccess.writable) return true;
    return !!confirmFn(`${buildEmulatorWriteAccessWarning(emulator, writeAccess, 'launch')}\n\nLaunch anyway?`);
}
