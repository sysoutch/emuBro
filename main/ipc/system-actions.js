const path = require("path");
const { spawn } = require("child_process");

function registerSystemActionsIpc(deps = {}) {
  const {
    ipcMain,
    log,
    fsSync,
    shell
  } = deps;

  if (!ipcMain) throw new Error("registerSystemActionsIpc requires ipcMain");
  if (!log) throw new Error("registerSystemActionsIpc requires log");
  if (!fsSync) throw new Error("registerSystemActionsIpc requires fsSync");
  if (!shell) throw new Error("registerSystemActionsIpc requires shell");

  function parseLaunchArgs(raw) {
    const str = String(raw || "").trim();
    if (!str) return [];

    const args = [];
    const re = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      args.push(m[1] ?? m[2] ?? m[3] ?? "");
    }
    return args.filter(Boolean);
  }

  ipcMain.handle("launch-emulator", async (_event, payload = {}) => {
    try {
      const exePath = String(payload.filePath || "").trim();
      if (!exePath) return { success: false, message: "Missing emulator path" };
      if (!fsSync.existsSync(exePath)) return { success: false, message: "Emulator executable not found" };

      const args = Array.isArray(payload.args) ? payload.args : parseLaunchArgs(payload.args);
      const cwd = String(payload.workingDirectory || "").trim() || path.dirname(exePath);

      const child = spawn(exePath, args, {
        cwd,
        detached: true,
        stdio: "ignore"
      });

      child.on("error", (error) => {
        log.error("Failed to launch emulator:", error);
      });
      child.unref();

      return { success: true };
    } catch (error) {
      log.error("launch-emulator failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("show-item-in-folder", async (_event, filePath) => {
    try {
      const p = String(filePath || "").trim();
      if (!p) return { success: false, message: "Missing path" };
      if (!fsSync.existsSync(p)) return { success: false, message: "Path not found" };
      shell.showItemInFolder(p);
      return { success: true };
    } catch (error) {
      log.error("show-item-in-folder failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("open-external-url", async (_event, rawUrl) => {
    try {
      let url = String(rawUrl || "").trim();
      if (!url) return { success: false, message: "Missing URL" };
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      await shell.openExternal(url);
      return { success: true, url };
    } catch (error) {
      log.error("open-external-url failed:", error);
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerSystemActionsIpc
};
