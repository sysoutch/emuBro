function registerUpdatesIpc(deps = {}) {
  let autoUpdater = null;
  const ipcMain = deps.ipcMain;
  const app = deps.app;
  const store = deps.store || null;
  const log = deps.log || console;
  const getMainWindow = typeof deps.getMainWindow === "function" ? deps.getMainWindow : () => null;

  if (!ipcMain || typeof ipcMain.handle !== "function") {
    throw new Error("registerUpdatesIpc requires ipcMain");
  }
  if (!app) {
    throw new Error("registerUpdatesIpc requires app");
  }

  let initialized = false;
  let checking = false;
  let downloading = false;
  let downloaded = false;
  let available = false;
  let currentVersion = String(app.getVersion() || "").trim();
  let latestVersion = "";
  let releaseNotes = "";
  let lastMessage = "";
  let lastError = "";
  let lastProgress = 0;
  let autoCheckOnStartup = true;
  let autoCheckIntervalMinutes = 60;
  let autoCheckTimer = null;
  const AUTO_CHECK_ON_STARTUP_KEY = "updates:auto-check-on-startup:v1";
  const AUTO_CHECK_INTERVAL_MINUTES_KEY = "updates:auto-check-interval-minutes:v1";

  function emitStatus(extra = {}) {
    const payload = {
      checking,
      downloading,
      downloaded,
      available,
      currentVersion,
      latestVersion,
      releaseNotes,
      lastMessage,
      lastError,
      progressPercent: lastProgress,
      autoCheckOnStartup,
      autoCheckIntervalMinutes,
      ...extra
    };
    const mainWindow = getMainWindow();
    try {
      if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && !mainWindow.webContents.isDestroyed()) {
        mainWindow.webContents.send("app:update-status", payload);
      }
    } catch (_error) {}
    return payload;
  }

  function normalizeReleaseNotes(notes) {
    if (!notes) return "";
    if (typeof notes === "string") return notes;
    if (Array.isArray(notes)) {
      return notes
        .map((entry) => String(entry?.note || entry || "").trim())
        .filter(Boolean)
        .join("\n\n");
    }
    if (typeof notes === "object") {
      return String(notes.note || "").trim();
    }
    return "";
  }

  function ensureInitialized() {
    if (initialized) return;
    const updaterModule = require("electron-updater");
    autoUpdater = updaterModule.autoUpdater;
    initialized = true;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.logger = log;

    autoUpdater.on("checking-for-update", () => {
      checking = true;
      lastError = "";
      lastMessage = "Checking for updates...";
      emitStatus();
    });

    autoUpdater.on("update-available", (info) => {
      checking = false;
      available = true;
      downloaded = false;
      latestVersion = String(info?.version || "").trim();
      releaseNotes = normalizeReleaseNotes(info?.releaseNotes);
      lastMessage = `Update available: ${latestVersion || "new version"}`;
      lastError = "";
      emitStatus();
    });

    autoUpdater.on("update-not-available", () => {
      checking = false;
      available = false;
      downloaded = false;
      latestVersion = "";
      releaseNotes = "";
      lastMessage = "You are on the latest version.";
      lastError = "";
      emitStatus();
    });

    autoUpdater.on("download-progress", (progress) => {
      downloading = true;
      const percent = Number(progress?.percent);
      lastProgress = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : lastProgress;
      lastMessage = `Downloading update... ${Math.round(lastProgress)}%`;
      emitStatus();
    });

    autoUpdater.on("update-downloaded", (info) => {
      downloading = false;
      downloaded = true;
      available = true;
      latestVersion = String(info?.version || latestVersion || "").trim();
      releaseNotes = normalizeReleaseNotes(info?.releaseNotes || releaseNotes);
      lastProgress = 100;
      lastMessage = "Update downloaded. Restart to install.";
      lastError = "";
      emitStatus();
    });

    autoUpdater.on("error", (error) => {
      checking = false;
      downloading = false;
      lastError = String(error?.message || error || "Unknown update error");
      lastMessage = "";
      emitStatus();
    });
  }

  function readAutoCheckConfigFromStore() {
    const storedStartup = store && typeof store.get === "function"
      ? store.get(AUTO_CHECK_ON_STARTUP_KEY, true)
      : true;
    autoCheckOnStartup = storedStartup !== false;

    const storedMinutes = Number(store && typeof store.get === "function"
      ? store.get(AUTO_CHECK_INTERVAL_MINUTES_KEY, 60)
      : 60);
    autoCheckIntervalMinutes = Number.isFinite(storedMinutes)
      ? Math.max(5, Math.min(1440, Math.round(storedMinutes)))
      : 60;
  }

  function writeAutoCheckConfigToStore(nextConfig = {}) {
    const startup = nextConfig.autoCheckOnStartup !== false;
    const parsedMinutes = Number(nextConfig.autoCheckIntervalMinutes);
    const minutes = Number.isFinite(parsedMinutes)
      ? Math.max(5, Math.min(1440, Math.round(parsedMinutes)))
      : autoCheckIntervalMinutes;

    autoCheckOnStartup = startup;
    autoCheckIntervalMinutes = minutes;

    if (store && typeof store.set === "function") {
      store.set(AUTO_CHECK_ON_STARTUP_KEY, autoCheckOnStartup);
      store.set(AUTO_CHECK_INTERVAL_MINUTES_KEY, autoCheckIntervalMinutes);
    }
  }

  function scheduleAutoCheck() {
    if (autoCheckTimer) {
      clearInterval(autoCheckTimer);
      autoCheckTimer = null;
    }
    if (!autoCheckOnStartup) return;
    const periodMs = autoCheckIntervalMinutes * 60 * 1000;
    autoCheckTimer = setInterval(() => {
      void checkForUpdates();
    }, periodMs);
  }

  async function checkForUpdates() {
    if (!app.isPackaged) {
      lastError = "Auto-update is available only in packaged builds.";
      lastMessage = "";
      return {
        success: false,
        message: lastError,
        ...emitStatus()
      };
    }
    ensureInitialized();
    try {
      const result = await autoUpdater.checkForUpdates();
      const info = result?.updateInfo || {};
      const nextVersion = String(info?.version || "").trim();
      if (nextVersion && nextVersion !== currentVersion) {
        available = true;
        latestVersion = nextVersion;
      }
      return {
        success: true,
        available,
        latestVersion: latestVersion || nextVersion || "",
        ...emitStatus()
      };
    } catch (error) {
      lastError = String(error?.message || error || "Failed to check for updates");
      lastMessage = "";
      return {
        success: false,
        message: lastError,
        ...emitStatus()
      };
    }
  }

  async function downloadUpdate() {
    if (!app.isPackaged) {
      lastError = "Auto-update is available only in packaged builds.";
      lastMessage = "";
      return {
        success: false,
        message: lastError,
        ...emitStatus()
      };
    }
    ensureInitialized();
    try {
      downloading = true;
      lastProgress = 0;
      emitStatus();
      await autoUpdater.downloadUpdate();
      return {
        success: true,
        downloaded,
        ...emitStatus()
      };
    } catch (error) {
      downloading = false;
      lastError = String(error?.message || error || "Failed to download update");
      return {
        success: false,
        message: lastError,
        ...emitStatus()
      };
    }
  }

  ipcMain.handle("update:get-state", async () => {
    return {
      success: true,
      ...emitStatus()
    };
  });

  ipcMain.handle("update:check", async () => {
    return await checkForUpdates();
  });

  ipcMain.handle("update:get-config", async () => {
    return {
      success: true,
      autoCheckOnStartup,
      autoCheckIntervalMinutes
    };
  });

  ipcMain.handle("update:set-config", async (_event, payload = {}) => {
    writeAutoCheckConfigToStore({
      autoCheckOnStartup: payload?.autoCheckOnStartup,
      autoCheckIntervalMinutes: payload?.autoCheckIntervalMinutes
    });
    scheduleAutoCheck();
    return {
      success: true,
      autoCheckOnStartup,
      autoCheckIntervalMinutes,
      ...emitStatus()
    };
  });

  ipcMain.handle("update:download", async () => {
    return await downloadUpdate();
  });

  ipcMain.handle("update:install", async () => {
    if (!downloaded) {
      return {
        success: false,
        message: "No downloaded update is ready to install.",
        ...emitStatus()
      };
    }
    try {
      emitStatus({ lastMessage: "Installing update and restarting..." });
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall(false, true);
        } catch (_error) {}
      }, 120);
      return { success: true, ...emitStatus() };
    } catch (error) {
      lastError = String(error?.message || error || "Failed to install update");
      return { success: false, message: lastError, ...emitStatus() };
    }
  });

  readAutoCheckConfigFromStore();
  scheduleAutoCheck();
  if (app.isPackaged) ensureInitialized();
  if (autoCheckOnStartup) {
    setTimeout(() => {
      void checkForUpdates();
    }, app.isPackaged ? 8000 : 3000);
  }
}

module.exports = {
  registerUpdatesIpc
};
