function registerMemoryCardIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const ps1Handler = deps.ps1Handler;
  const fs = deps.fs;
  const path = deps.path;
  const os = deps.os;
  const log = deps.log || console;

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerMemoryCardIpc requires ipcMain");
  }
  if (!ps1Handler || !fs || !path || !os) {
    throw new Error("registerMemoryCardIpc requires ps1Handler/fs/path/os");
  }

  ipcMain.handle("read-memory-card", async (_event, cardPath) => {
    return await ps1Handler.readCard(cardPath);
  });

  ipcMain.handle("delete-save", async (_event, { filePath, slot }) => {
    return await ps1Handler.deleteSave(filePath, slot);
  });

  ipcMain.handle("rename-save", async (_event, { filePath, slot, newName }) => {
    return await ps1Handler.renameSave(filePath, slot, newName);
  });

  ipcMain.handle("format-card", async (_event, filePath) => {
    return await ps1Handler.formatCard(filePath);
  });

  ipcMain.handle("memory-card:create-empty", async (_event, payload = {}) => {
    const targetPath = typeof payload === "string" ? payload : payload?.filePath;
    return await ps1Handler.createEmptyCard(targetPath);
  });

  ipcMain.handle("copy-save", async (_event, payload = {}) => {
    const sourcePath = String(payload?.sourcePath || "").trim();
    const sourceSlot = Number(payload?.sourceSlot || 0);
    const targetPath = String(payload?.targetPath || "").trim();
    if (!sourcePath || !sourceSlot || !targetPath) {
      return { success: false, message: "Missing source/slot/target for copy-save." };
    }
    return await ps1Handler.copySaveToCard(sourcePath, sourceSlot, targetPath);
  });

  ipcMain.handle("export-save", async (_event, payload = {}) => {
    const filePath = String(payload?.filePath || "").trim();
    const slot = Number(payload?.slot || 0);
    const outputPath = String(payload?.outputPath || "").trim();
    if (!filePath || !slot || !outputPath) {
      return { success: false, message: "Missing file/slot/output for export-save." };
    }
    return await ps1Handler.exportSave(filePath, slot, outputPath);
  });

  ipcMain.handle("import-save", async (_event, payload = {}) => {
    const filePath = String(payload?.filePath || "").trim();
    const importPath = String(payload?.importPath || "").trim();
    if (!filePath || !importPath) {
      return { success: false, message: "Missing target card/import file for import-save." };
    }
    return await ps1Handler.importSave(filePath, importPath);
  });

  ipcMain.handle("undelete-save", async (_event, payload = {}) => {
    const filePath = String(payload?.filePath || "").trim();
    const slot = Number(payload?.slot || 0);
    const deletedEntry = String(payload?.deletedEntry || "").trim();
    if (!filePath || !slot || !deletedEntry) {
      return { success: false, message: "Missing undelete payload." };
    }
    return await ps1Handler.undeleteSave(filePath, slot, deletedEntry);
  });

  function parsePS2MemoryCard(buffer) {
    const magic = buffer.toString("ascii", 0, 28);
    if (magic !== "Sony PS2 Memory Card Format ") {
      return { success: false, message: "Invalid PS2 Memory Card format" };
    }

    const pageSize = buffer.readUInt16LE(0x28);
    const pagesPerBlock = buffer.readUInt16LE(0x2A);
    const pagesPerCluster = buffer.readUInt16LE(0x2C);

    return {
      success: true,
      data: {
        format: "PlayStation 2",
        totalSize: buffer.length,
        pageSize,
        pagesPerBlock,
        pagesPerCluster,
        message: "PS2 Card identified. Detailed directory parsing coming soon."
      }
    };
  }

  void parsePS2MemoryCard;

  ipcMain.handle("browse-memory-cards", async (_event, selectedDrive) => {
    try {
      log.info("Starting memory card search in:", selectedDrive);
      const foundCards = [];
      const extensions = [".mcr", ".mcd", ".gme", ".ps2", ".max", ".psu"];

      async function scan(dir) {
        try {
          const items = await fs.readdir(dir).catch(() => []);
          for (const item of items) {
            const itemPath = path.join(dir, item);
            try {
              const stat = await fs.lstat(itemPath);
              if (stat.isDirectory()) {
                if (!item.startsWith("$") && !item.startsWith(".")) {
                  await scan(itemPath);
                }
              } else if (stat.isFile()) {
                const ext = path.extname(item).toLowerCase();
                if (extensions.includes(ext)) {
                  foundCards.push({
                    name: item,
                    path: itemPath,
                    size: stat.size,
                    modified: stat.mtime
                  });
                }
              }
            } catch (_e) {}
          }
        } catch (_e) {}
      }

      let searchPath = selectedDrive;
      if (os.platform() === "win32" && searchPath && searchPath.length === 2 && searchPath.endsWith(":")) {
        searchPath += "\\";
      }

      if (!searchPath) {
        searchPath = os.homedir();
      }

      await scan(searchPath);
      return { success: true, cards: foundCards };
    } catch (error) {
      log.error("Failed to browse memory cards:", error);
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerMemoryCardIpc
};
