function registerHelpDocsIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const log = deps.log || console;
  const helpDocsService = deps.helpDocsService;

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerHelpDocsIpc requires ipcMain");
  }
  if (!helpDocsService || typeof helpDocsService.listDocs !== "function" || typeof helpDocsService.getDocById !== "function" || typeof helpDocsService.searchDocs !== "function") {
    throw new Error("registerHelpDocsIpc requires helpDocsService");
  }

  ipcMain.handle("help:docs:list", async (_event, payload = {}) => {
    try {
      const query = String(payload?.query || "").trim();
      const limit = Number(payload?.limit || 200);
      const docs = helpDocsService.listDocs({ query, limit });
      return { success: true, docs };
    } catch (error) {
      log.error("help:docs:list failed:", error);
      return { success: false, message: error?.message || String(error), docs: [] };
    }
  });

  ipcMain.handle("help:docs:get", async (_event, payload = {}) => {
    try {
      const id = String(payload?.id || "").trim();
      if (!id) return { success: false, message: "Doc id is required." };
      const doc = helpDocsService.getDocById(id);
      if (!doc) return { success: false, message: "Doc not found." };
      return { success: true, doc };
    } catch (error) {
      log.error("help:docs:get failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("help:docs:search", async (_event, payload = {}) => {
    try {
      const query = String(payload?.query || "").trim();
      const limit = Number(payload?.limit || 6);
      const rows = helpDocsService.searchDocs(query, { limit });
      return { success: true, rows };
    } catch (error) {
      log.error("help:docs:search failed:", error);
      return { success: false, message: error?.message || String(error), rows: [] };
    }
  });
}

module.exports = {
  registerHelpDocsIpc
};
