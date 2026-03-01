function registerEmulatorDownloadOptionsHandler(deps = {}) {
  const {
    ipcMain,
    log,
    runtimePlatform,
    normalizeDownloadOsKey,
    normalizeDownloadPackageType,
    ensureHttpUrl,
    resolveEmulatorDownloadTarget
  } = deps;

  if (!ipcMain) throw new Error("registerEmulatorDownloadOptionsHandler requires ipcMain");
  if (!log) throw new Error("registerEmulatorDownloadOptionsHandler requires log");
  if (!runtimePlatform) throw new Error("registerEmulatorDownloadOptionsHandler requires runtimePlatform");
  if (typeof normalizeDownloadOsKey !== "function") throw new Error("registerEmulatorDownloadOptionsHandler requires normalizeDownloadOsKey");
  if (typeof normalizeDownloadPackageType !== "function") throw new Error("registerEmulatorDownloadOptionsHandler requires normalizeDownloadPackageType");
  if (typeof ensureHttpUrl !== "function") throw new Error("registerEmulatorDownloadOptionsHandler requires ensureHttpUrl");
  if (typeof resolveEmulatorDownloadTarget !== "function") throw new Error("registerEmulatorDownloadOptionsHandler requires resolveEmulatorDownloadTarget");

  ipcMain.handle("get-emulator-download-options", async (_event, payload = {}) => {
    try {
      const emulator = (payload && typeof payload === "object") ? payload : {};
      const name = String(emulator?.name || "").trim();
      if (!name) return { success: false, message: "Missing emulator name" };

      const osKey = normalizeDownloadOsKey(payload?.os || runtimePlatform);
      const resolved = await resolveEmulatorDownloadTarget(emulator, osKey, "");
      return {
        success: true,
        osKey,
        options: Array.isArray(resolved?.options) ? resolved.options : [],
        recommendedType: normalizeDownloadPackageType(resolved?.packageType || ""),
        manualUrl: ensureHttpUrl(resolved?.releaseUrl || resolved?.url || ""),
        waybackUrl: ensureHttpUrl(resolved?.waybackUrl || "")
      };
    } catch (error) {
      log.error("get-emulator-download-options failed:", error);
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerEmulatorDownloadOptionsHandler
};
