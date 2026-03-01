function registerMonitorIpc(deps = {}) {
  const ipcMain = deps.ipcMain;
  const execFile = deps.execFile;
  const path = deps.path;
  const os = deps.os;
  const fsSync = deps.fsSync;
  const log = deps.log || console;
  const appRootDir = String(deps.appRootDir || "").trim();

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerMonitorIpc requires ipcMain");
  }
  if (typeof execFile !== "function" || !path || !os || !fsSync || !appRootDir) {
    throw new Error("registerMonitorIpc requires execFile/path/os/fsSync/appRootDir");
  }

  const multiMonitorToolPath = path.join(appRootDir, "resources", "MultiMonitorTool.exe");

  async function getMonitors() {
    if (os.platform() !== "win32") {
      return [];
    }

    return new Promise((resolve) => {
      const tempPath = path.join(os.tmpdir(), `monitors_${Date.now()}.csv`);

      execFile(multiMonitorToolPath, ["/scomma", tempPath], (error) => {
        if (error) {
          log.error("Failed to run MultiMonitorTool:", error);
          resolve([]);
          return;
        }

        try {
          if (fsSync.existsSync(tempPath)) {
            const content = fsSync.readFileSync(tempPath, "utf8");
            fsSync.unlinkSync(tempPath);

            const lines = content.trim().split("\n");
            if (lines.length < 2) {
              resolve([]);
              return;
            }

            const headers = lines[0].split(",").map((h) => h.trim());
            const monitors = [];

            for (let i = 1; i < lines.length; i++) {
              const values = lines[i].split(",").map((v) => v.trim());
              const monitor = {};
              headers.forEach((h, idx) => {
                if (idx < values.length) monitor[h] = values[idx];
              });

              monitors.push({
                id: monitor["Name"] || `Monitor ${i}`,
                name: monitor["Name"],
                deviceId: monitor["Monitor ID"] || monitor["Name"],
                width: parseInt(monitor["Width"]) || 0,
                height: parseInt(monitor["Height"]) || 0,
                isPrimary: monitor["Primary"] === "Yes",
                orientation: parseInt(monitor["Orientation"]) || 0,
                connected: monitor["Active"] === "Yes"
              });
            }
            resolve(monitors);
          } else {
            resolve([]);
          }
        } catch (err) {
          log.error("Error parsing monitor info:", err);
          resolve([]);
        }
      });
    });
  }

  ipcMain.handle("get-monitor-info", async () => {
    return await getMonitors();
  });

  ipcMain.handle("detect-monitors", async () => {
    return await getMonitors();
  });

  ipcMain.handle("set-monitor-orientation", async (_event, monitorIndex, orientation) => {
    try {
      const monitors = await getMonitors();
      if (monitorIndex >= 0 && monitorIndex < monitors.length) {
        const monitor = monitors[monitorIndex];
        return new Promise((resolve) => {
          execFile(multiMonitorToolPath, ["/SetOrientation", monitor.id, orientation.toString()], (error) => {
            if (error) {
              resolve({ success: false, message: error.message });
            } else {
              resolve({ success: true });
            }
          });
        });
      }
      return { success: false, message: "Monitor index out of range" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("toggle-monitor-orientation", async (_event, monitorIndex, targetOrientation) => {
    try {
      const monitors = await getMonitors();
      if (monitorIndex >= 0 && monitorIndex < monitors.length) {
        const monitor = monitors[monitorIndex];
        return new Promise((resolve) => {
          execFile(multiMonitorToolPath, ["/SetOrientation", monitor.id, targetOrientation.toString()], (error) => {
            if (error) {
              resolve({ success: false, message: error.message });
            } else {
              resolve({ success: true });
            }
          });
        });
      }
      return { success: false, message: "Monitor index out of range" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("set-monitor-display-state", async (_event, monitorIndex, state) => {
    try {
      const monitors = await getMonitors();
      if (monitorIndex >= 0 && monitorIndex < monitors.length) {
        const monitor = monitors[monitorIndex];
        const command = state === "enable" ? "/Enable" : "/Disable";

        return new Promise((resolve) => {
          execFile(multiMonitorToolPath, [command, monitor.id], (error) => {
            if (error) {
              resolve({ success: false, message: error.message });
            } else {
              resolve({ success: true });
            }
          });
        });
      }
      return { success: false, message: "Monitor index out of range" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("set-primary-monitor", async (_event, monitorIndex) => {
    try {
      const monitors = await getMonitors();
      if (monitorIndex >= 0 && monitorIndex < monitors.length) {
        const monitor = monitors[monitorIndex];
        return new Promise((resolve) => {
          execFile(multiMonitorToolPath, ["/SetPrimary", monitor.id], (error) => {
            if (error) {
              resolve({ success: false, message: error.message });
            } else {
              resolve({ success: true });
            }
          });
        });
      }
      return { success: false, message: "Monitor index out of range" };
    } catch (error) {
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerMonitorIpc
};
