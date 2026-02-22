const path = require("path");
const { spawn } = require("child_process");
const { createGameSessionManager } = require("../game-session-manager");

function registerGameIpc(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    BrowserWindow,
    Menu,
    screen,
    dialog,
    shell,
    nativeImage,
    fsSync,
    normalizePlatform,
    inferGameCode,
    classifyPathMedia,
    getMainWindow,
    refreshLibraryFromDb,
    getGamesState,
    getEmulatorsState,
    getTagsState,
    dbGetGameById,
    dbDeleteGameById,
    dbUpdateGameMetadata,
    dbUpsertTags,
    dbUpdateGameFilePath,
    resolveResourcePath,
    getPlatformConfigs,
    getRuntimeDataRules,
    getGameSessionCloseBehaviorPreference,
    setGameSessionCloseBehaviorPreference
  } = deps;

  if (!ipcMain) throw new Error("registerGameIpc requires ipcMain");
  if (!log) throw new Error("registerGameIpc requires log");
  if (!app) throw new Error("registerGameIpc requires app");
  if (!BrowserWindow) throw new Error("registerGameIpc requires BrowserWindow");

  function tryLaunchExecutable(command, args = []) {
    try {
      const child = spawn(command, args, { stdio: "ignore", detached: true });
      if (child && typeof child.unref === "function") child.unref();
      return true;
    } catch (_e) {
      return false;
    }
  }

  function tryOpenLauncherFallback(gamePath) {
    const raw = String(gamePath || "").toLowerCase();
    const isSteam = raw.startsWith("steam://");
    const isEpic = raw.startsWith("com.epicgames.launcher://");
    const isGog = raw.startsWith("goggalaxy://");
    const isHeroic = raw.startsWith("heroic://");
    const platform = process.platform;

    if (platform === "win32") {
      const candidates = [];
      if (isSteam) {
        candidates.push(
          "C:\\\\Program Files (x86)\\\\Steam\\\\steam.exe",
          "C:\\\\Program Files\\\\Steam\\\\steam.exe"
        );
      }
      if (isEpic) {
        candidates.push(
          "C:\\\\Program Files (x86)\\\\Epic Games\\\\Launcher\\\\Portal\\\\Binaries\\\\Win32\\\\EpicGamesLauncher.exe",
          "C:\\\\Program Files (x86)\\\\Epic Games\\\\Launcher\\\\Portal\\\\Binaries\\\\Win64\\\\EpicGamesLauncher.exe",
          "C:\\\\Program Files\\\\Epic Games\\\\Launcher\\\\Portal\\\\Binaries\\\\Win64\\\\EpicGamesLauncher.exe"
        );
      }
      if (isGog) {
        candidates.push(
          "C:\\\\Program Files (x86)\\\\GOG Galaxy\\\\GalaxyClient.exe",
          "C:\\\\Program Files\\\\GOG Galaxy\\\\GalaxyClient.exe"
        );
      }
      if (isHeroic) {
        candidates.push(
          "C:\\\\Program Files\\\\Heroic\\\\Heroic.exe",
          "C:\\\\Program Files (x86)\\\\Heroic\\\\Heroic.exe"
        );
      }
      for (const candidate of candidates) {
        if (fsSync.existsSync(candidate) && tryLaunchExecutable(candidate, [])) return true;
      }
      return false;
    }

    if (platform === "darwin") {
      if (isSteam) return tryLaunchExecutable("open", ["-a", "Steam"]);
      if (isEpic) return tryLaunchExecutable("open", ["-a", "Epic Games Launcher"]);
      if (isGog) return tryLaunchExecutable("open", ["-a", "GOG Galaxy"]);
      if (isHeroic) return tryLaunchExecutable("open", ["-a", "Heroic"]);
      return false;
    }

    // Linux
    if (isSteam) return tryLaunchExecutable("steam", []);
    if (isHeroic || isEpic || isGog) return tryLaunchExecutable("heroic", []);
    return false;
  }

  function tryOpenLauncherUri(uri) {
    const target = String(uri || "").trim();
    if (!target) return false;
    if (process.platform === "win32") {
      return tryLaunchExecutable("cmd.exe", ["/d", "/s", "/c", "start", "", target]);
    }
    if (process.platform === "darwin") {
      return tryLaunchExecutable("open", [target]);
    }
    return tryLaunchExecutable("xdg-open", [target]);
  }

  function getGogAlternateUri(uri) {
    const match = String(uri || "").trim().match(/^goggalaxy:\/\/launch\/(.+)$/i);
    if (!match) return "";
    const id = String(match[1] || "").trim();
    if (!id) return "";
    return `goggalaxy://openGame/${id}`;
  }

  const RUN_AS_DEFAULT = "default";
  const RUN_AS_ADMIN = "admin";
  const RUN_AS_USER = "user";

  function normalizeRunAsMode(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === RUN_AS_ADMIN || normalized === RUN_AS_USER) return normalized;
    return RUN_AS_DEFAULT;
  }

  function quoteWinArg(value) {
    return `"${String(value ?? "").replace(/"/g, '\\"')}"`;
  }

  function buildWindowsAdminLaunch({ target, args, cwd }) {
    const psQuote = (value) => `'${String(value ?? "").replace(/'/g, "''")}'`;
    const argList = Array.isArray(args) && args.length > 0
      ? `@(${args.map(psQuote).join(", ")})`
      : "$null";
    const cwdPart = cwd ? `-WorkingDirectory ${psQuote(cwd)}` : "";
    const argPart = Array.isArray(args) && args.length > 0 ? `-ArgumentList ${argList}` : "";
    const psCommand = [
      "$ErrorActionPreference = 'Stop';",
      `$p = Start-Process -FilePath ${psQuote(target)} ${argPart} ${cwdPart} -Verb RunAs -PassThru;`,
      "$p.WaitForExit();"
    ].join(" ").replace(/\s+/g, " ").trim();

    return {
      launchTarget: "powershell",
      launchArgs: ["-NoProfile", "-Command", psCommand],
      launchCwd: undefined
    };
  }

  function buildWindowsRunAsUserLaunch({ target, args, cwd, username }) {
    const commandLine = [quoteWinArg(target), ...(args || []).map(quoteWinArg)].join(" ");
    const innerCmd = cwd
      ? `cd /d ${quoteWinArg(cwd)} && ${commandLine}`
      : commandLine;
    const runasCommand = `runas /user:${username} ${quoteWinArg(innerCmd)}`;
    return {
      launchTarget: "cmd.exe",
      launchArgs: ["/d", "/s", "/c", "start", "\"\"", "cmd.exe", "/k", runasCommand],
      launchCwd: undefined
    };
  }
  if (!Menu) throw new Error("registerGameIpc requires Menu");
  if (!screen) throw new Error("registerGameIpc requires screen");
  if (!dialog) throw new Error("registerGameIpc requires dialog");
  if (!shell) throw new Error("registerGameIpc requires shell");
  if (!nativeImage) throw new Error("registerGameIpc requires nativeImage");
  if (!fsSync) throw new Error("registerGameIpc requires fsSync");
  if (typeof normalizePlatform !== "function") throw new Error("registerGameIpc requires normalizePlatform");
  if (typeof inferGameCode !== "function") throw new Error("registerGameIpc requires inferGameCode");
  if (typeof classifyPathMedia !== "function") throw new Error("registerGameIpc requires classifyPathMedia");
  if (typeof getMainWindow !== "function") throw new Error("registerGameIpc requires getMainWindow");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerGameIpc requires refreshLibraryFromDb");
  if (typeof getGamesState !== "function") throw new Error("registerGameIpc requires getGamesState");
  if (typeof getEmulatorsState !== "function") throw new Error("registerGameIpc requires getEmulatorsState");
  if (typeof getTagsState !== "function") throw new Error("registerGameIpc requires getTagsState");
  if (typeof dbGetGameById !== "function") throw new Error("registerGameIpc requires dbGetGameById");
  if (typeof dbDeleteGameById !== "function") throw new Error("registerGameIpc requires dbDeleteGameById");
  if (typeof dbUpdateGameMetadata !== "function") throw new Error("registerGameIpc requires dbUpdateGameMetadata");
  if (typeof dbUpsertTags !== "function") throw new Error("registerGameIpc requires dbUpsertTags");
  if (typeof dbUpdateGameFilePath !== "function") throw new Error("registerGameIpc requires dbUpdateGameFilePath");
  if (typeof resolveResourcePath !== "function") throw new Error("registerGameIpc requires resolveResourcePath");
  if (typeof getPlatformConfigs !== "function") throw new Error("registerGameIpc requires getPlatformConfigs");
  if (typeof getRuntimeDataRules !== "function") throw new Error("registerGameIpc requires getRuntimeDataRules");

  const appPath = app.getAppPath();
  const gameSessionManager = createGameSessionManager({
    app,
    fsSync,
    log,
    getMainWindow,
    getRuntimeDataRules
  });
  const sessionOverlayWindows = new Map();
  let sessionOverlayDisplayListenerRegistered = false;
  let overlayTopMostTimer = null;
  let launcherTopMostResetTimer = null;
  const OVERLAY_BUTTON_SIZE = 58;
  const OVERLAY_MARGIN = 12;
  const SESSION_SUSPENDED_WINDOW_FLAG = "__emuBroSessionSuspended";
  const SESSION_RESTORE_IN_PROGRESS_FLAG = "__emuBroSessionRestoreInProgress";
  const SESSION_CLOSE_HANDLER_ATTACHED_FLAG = "__emuBroSessionCloseHandlerAttached";
  const SESSION_CLOSE_ALLOW_ONCE_FLAG = "__emuBroSessionCloseAllowOnce";
  const SESSION_CLOSE_PREF_ASK = "ask";
  const SESSION_CLOSE_PREF_HIDE = "hide";
  const SESSION_CLOSE_PREF_QUIT = "quit";
  let sessionClosePromptInProgress = false;

  function normalizeSessionClosePreference(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === SESSION_CLOSE_PREF_HIDE || normalized === SESSION_CLOSE_PREF_QUIT) return normalized;
    return SESSION_CLOSE_PREF_ASK;
  }

  function getSessionClosePreference() {
    if (typeof getGameSessionCloseBehaviorPreference !== "function") return SESSION_CLOSE_PREF_ASK;
    try {
      return normalizeSessionClosePreference(getGameSessionCloseBehaviorPreference());
    } catch (_error) {
      return SESSION_CLOSE_PREF_ASK;
    }
  }

  function rememberSessionClosePreference(value) {
    if (typeof setGameSessionCloseBehaviorPreference !== "function") return;
    const normalized = normalizeSessionClosePreference(value);
    if (normalized === SESSION_CLOSE_PREF_ASK) return;
    try {
      setGameSessionCloseBehaviorPreference(normalized);
    } catch (_error) {}
  }

  function hideLauncherKeepGameAlive(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow[SESSION_SUSPENDED_WINDOW_FLAG] = true;
    mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = false;
    try {
      if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
        mainWindow.webContents.setBackgroundThrottling(true);
      }
    } catch (_error) {}
    try {
      mainWindow.loadURL(getSuspendedLauncherUrl())
        .catch((error) => {
          log.warn("Failed to load suspended launcher placeholder while hiding:", error?.message || error);
        });
    } catch (_error) {}
    try {
      mainWindow.hide();
    } catch (_error) {
      try {
        mainWindow.minimize();
      } catch (_e) {}
    }
  }

  function attachMainWindowSessionCloseHandler(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow[SESSION_CLOSE_HANDLER_ATTACHED_FLAG]) return;
    mainWindow[SESSION_CLOSE_HANDLER_ATTACHED_FLAG] = true;
    mainWindow[SESSION_CLOSE_ALLOW_ONCE_FLAG] = false;

    mainWindow.on("close", (event) => {
      if (mainWindow[SESSION_CLOSE_ALLOW_ONCE_FLAG]) {
        mainWindow[SESSION_CLOSE_ALLOW_ONCE_FLAG] = false;
        return;
      }

      let activeSession = false;
      try {
        activeSession = !!gameSessionManager.getStatus()?.active;
      } catch (_error) {
        activeSession = false;
      }
      if (!activeSession) return;

      const closePreference = getSessionClosePreference();
      if (closePreference === SESSION_CLOSE_PREF_HIDE) {
        event.preventDefault();
        hideLauncherKeepGameAlive(mainWindow);
        return;
      }
      if (closePreference === SESSION_CLOSE_PREF_QUIT) {
        // User explicitly chose this behavior and asked to remember it.
        return;
      }

      event.preventDefault();
      if (sessionClosePromptInProgress) return;
      sessionClosePromptInProgress = true;

      const ownerWindow = (!mainWindow.isDestroyed()) ? mainWindow : null;
      dialog.showMessageBox(ownerWindow, {
        type: "warning",
        title: "Game session is active",
        message: "A game is still running.",
        detail: "Recommended: close only the emuBro window and keep the game process alive.\n\nIf you quit emuBro completely, game session tracking will stop and some emulators may also close the running game.",
        buttons: ["Close Window (Keep Game Running)", "Quit emuBro", "Cancel"],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
        checkboxLabel: "Remember my choice",
        checkboxChecked: false
      })
        .then(({ response, checkboxChecked }) => {
          const choice = Number(response);
          if (choice === 0) {
            if (checkboxChecked) rememberSessionClosePreference(SESSION_CLOSE_PREF_HIDE);
            hideLauncherKeepGameAlive(mainWindow);
            return;
          }
          if (choice === 1) {
            if (checkboxChecked) rememberSessionClosePreference(SESSION_CLOSE_PREF_QUIT);
            mainWindow[SESSION_CLOSE_ALLOW_ONCE_FLAG] = true;
            setTimeout(() => {
              if (!mainWindow || mainWindow.isDestroyed()) return;
              try {
                mainWindow.close();
              } catch (_error) {}
            }, 0);
          }
        })
        .catch((error) => {
          log.warn("Session close prompt failed:", error?.message || error);
        })
        .finally(() => {
          sessionClosePromptInProgress = false;
        });
    });
  }

  function getSuspendedLauncherUrl() {
    const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>emuBro Session Running</title>
    <style>
      html, body { width: 100%; height: 100%; margin: 0; }
      body {
        display: grid;
        place-items: center;
        background: #05080f;
        color: #7f8da3;
        font-family: Segoe UI, system-ui, sans-serif;
        font-size: 12px;
        letter-spacing: 0.03em;
      }
      .msg { opacity: 0.82; user-select: none; }
    </style>
  </head>
  <body><div class="msg">emuBro launcher is suspended while game session is active.</div></body>
</html>`;
    return `data:text/html;charset=UTF-8,${encodeURIComponent(html)}`;
  }

  function ensureMainWindowUiRestored(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (!mainWindow[SESSION_SUSPENDED_WINDOW_FLAG]) return;
    if (mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG]) return;

    mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = true;
    mainWindow[SESSION_SUSPENDED_WINDOW_FLAG] = false;
    mainWindow.loadFile(path.join(appPath, "index.html"))
      .catch((error) => {
        log.error("Failed to restore launcher UI after game session:", error);
      })
      .finally(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = false;
      });
  }

  function getOverlayWindows() {
    const out = [];
    const staleKeys = [];
    sessionOverlayWindows.forEach((win, key) => {
      if (!win || win.isDestroyed()) {
        staleKeys.push(key);
        return;
      }
      out.push(win);
    });
    staleKeys.forEach((key) => sessionOverlayWindows.delete(key));
    return out;
  }

  function stopOverlayTopMostTimer() {
    if (overlayTopMostTimer) {
      clearInterval(overlayTopMostTimer);
      overlayTopMostTimer = null;
    }
  }

  function enforceSessionOverlayTopMost() {
    const windows = getOverlayWindows();
    windows.forEach((win) => {
      try {
        win.setAlwaysOnTop(true, "screen-saver", 1);
      } catch (_e) {
        win.setAlwaysOnTop(true);
      }
      try {
        win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      } catch (_e) {}
      try {
        if (typeof win.moveTop === "function") {
          win.moveTop();
        }
      } catch (_e) {}
    });
  }

  function startOverlayTopMostTimer() {
    stopOverlayTopMostTimer();
    overlayTopMostTimer = setInterval(() => {
      enforceSessionOverlayTopMost();
    }, 1100);
    if (typeof overlayTopMostTimer.unref === "function") {
      overlayTopMostTimer.unref();
    }
  }

  function positionSessionOverlayWindow(win, display) {
    if (!win || win.isDestroyed()) return;
    const targetDisplay = display || screen.getPrimaryDisplay();
    const workArea = targetDisplay?.workArea || { x: 0, y: 0, width: 1280, height: 720 };
    const bounds = win.getBounds();
    const x = Math.round(workArea.x + Math.max(0, workArea.width - bounds.width - OVERLAY_MARGIN));
    const y = Math.round(workArea.y + OVERLAY_MARGIN);
    try {
      win.setPosition(x, y, false);
    } catch (_e) {}
  }

  function createSessionOverlayWindow(display) {
    const displayId = String(display?.id || "");
    if (displayId && sessionOverlayWindows.has(displayId)) {
      const existing = sessionOverlayWindows.get(displayId);
      if (existing && !existing.isDestroyed()) {
        positionSessionOverlayWindow(existing, display);
        return existing;
      }
      sessionOverlayWindows.delete(displayId);
    }

    const overlay = new BrowserWindow({
      show: false,
      width: OVERLAY_BUTTON_SIZE,
      height: OVERLAY_BUTTON_SIZE,
      minWidth: OVERLAY_BUTTON_SIZE,
      maxWidth: OVERLAY_BUTTON_SIZE,
      minHeight: OVERLAY_BUTTON_SIZE,
      maxHeight: OVERLAY_BUTTON_SIZE,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(appPath, "preload.js"),
        devTools: true
      }
    });

    overlay.setMenuBarVisibility(false);

    overlay.on("closed", () => {
      if (displayId && sessionOverlayWindows.get(displayId) === overlay) {
        sessionOverlayWindows.delete(displayId);
      }
      if (getOverlayWindows().length === 0) {
        stopOverlayTopMostTimer();
      }
    });
    overlay.on("show", () => enforceSessionOverlayTopMost());
    overlay.on("focus", () => enforceSessionOverlayTopMost());
    overlay.on("blur", () => enforceSessionOverlayTopMost());
    overlay.on("restore", () => enforceSessionOverlayTopMost());

    overlay.loadFile(path.join(appPath, "game-session-overlay.html"))
      .catch((error) => {
        log.error("Failed to load game session overlay window:", error);
      });

    if (displayId) {
      sessionOverlayWindows.set(displayId, overlay);
    }
    positionSessionOverlayWindow(overlay, display);
    return overlay;
  }

  function syncSessionOverlayWindowsToDisplays() {
    const displays = (typeof screen.getAllDisplays === "function")
      ? screen.getAllDisplays()
      : [screen.getPrimaryDisplay()];
    const targetIds = new Set(displays.map((row) => String(row?.id || "")));

    // Remove orphaned windows for displays that are no longer available.
    sessionOverlayWindows.forEach((win, id) => {
      if (targetIds.has(String(id || ""))) return;
      try {
        if (win && !win.isDestroyed()) {
          win.close();
        }
      } catch (_e) {}
      sessionOverlayWindows.delete(id);
    });

    // Ensure one overlay window per active display.
    displays.forEach((display) => {
      const displayId = String(display?.id || "");
      const existing = displayId ? sessionOverlayWindows.get(displayId) : null;
      if (existing && !existing.isDestroyed()) {
        positionSessionOverlayWindow(existing, display);
        return;
      }
      createSessionOverlayWindow(display);
    });

    return getOverlayWindows();
  }

  function ensureSessionOverlayDisplayListeners() {
    if (sessionOverlayDisplayListenerRegistered) return;
    if (!screen || typeof screen.on !== "function") return;

    const onDisplayChanged = () => {
      if (getOverlayWindows().length <= 0) return;
      syncSessionOverlayWindowsToDisplays();
      enforceSessionOverlayTopMost();
    };

    screen.on("display-metrics-changed", onDisplayChanged);
    screen.on("display-added", onDisplayChanged);
    screen.on("display-removed", onDisplayChanged);
    sessionOverlayDisplayListenerRegistered = true;
  }

  function showSessionOverlayWindow() {
    try {
      ensureSessionOverlayDisplayListeners();
      const windows = syncSessionOverlayWindowsToDisplays();
      if (windows.length <= 0) {
        log.warn("No overlay windows available to show");
        return;
      }
      log.info(`Showing game session overlay on ${windows.length} display(s)`);
      windows.forEach((overlay) => {
        if (!overlay || overlay.isDestroyed()) return;
        if (overlay.isVisible()) return;
        let shown = false;
        if (typeof overlay.showInactive === "function") {
          try {
            overlay.showInactive();
            shown = overlay.isVisible();
          } catch (_e) {
            shown = false;
          }
        }
        if (!shown) {
          overlay.show();
        }
      });
      enforceSessionOverlayTopMost();
      startOverlayTopMostTimer();
    } catch (error) {
      log.warn("Failed to show game session overlay window:", error?.message || error);
    }
  }

  function closeSessionOverlayWindow() {
    stopOverlayTopMostTimer();
    const windows = getOverlayWindows();
    sessionOverlayWindows.clear();
    windows.forEach((overlay) => {
      if (!overlay || overlay.isDestroyed()) return;
      try {
        overlay.close();
      } catch (_e) {}
      try {
        if (!overlay.isDestroyed()) {
          overlay.destroy();
        }
      } catch (_e) {}
    });
  }

  app.on("before-quit", () => {
    closeSessionOverlayWindow();
  });

  function bringMainWindowToFront(reason = "game-stopped") {
    let requestedWindowsForegroundFallback = false;

    const requestWindowsForegroundFallback = () => {
      if (process.platform !== "win32") return;
      if (requestedWindowsForegroundFallback) return;
      requestedWindowsForegroundFallback = true;

      const script = [
        "$wshell = New-Object -ComObject WScript.Shell",
        "Start-Sleep -Milliseconds 70",
        `[void]$wshell.AppActivate(${Number(process.pid || 0)})`
      ].join("; ");

      try {
        const ps = spawn("powershell", [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-Command",
          script
        ], {
          windowsHide: true,
          stdio: "ignore"
        });
        if (ps && typeof ps.unref === "function") {
          ps.unref();
        }
      } catch (_e) {}
    };

    const runAttempt = (forcePulse = false) => {
      const mainWindow = getMainWindow();
      if (!mainWindow || mainWindow.isDestroyed()) return;

      attachMainWindowSessionCloseHandler(mainWindow);
      ensureMainWindowUiRestored(mainWindow);

      try {
        if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
          mainWindow.webContents.setBackgroundThrottling(false);
        }
      } catch (_e) {}

      try {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        if (!mainWindow.isVisible()) {
          mainWindow.show();
        }
      } catch (_e) {}

      try {
        if (typeof mainWindow.moveTop === "function") {
          mainWindow.moveTop();
        }
      } catch (_e) {}

      try {
        if (typeof app.focus === "function") {
          try {
            app.focus({ steal: true });
          } catch (_e) {
            app.focus();
          }
        }
      } catch (_e) {}

      try {
        mainWindow.focus();
      } catch (_e) {}

      let isFocused = false;
      try {
        isFocused = mainWindow.isFocused();
      } catch (_e) {
        isFocused = false;
      }

      if (forcePulse || !isFocused) {
        try {
          mainWindow.setAlwaysOnTop(true, "screen-saver", 1);
        } catch (_e) {
          try {
            mainWindow.setAlwaysOnTop(true);
          } catch (_err) {}
        }
        try {
          mainWindow.show();
          mainWindow.focus();
        } catch (_e) {}
        try {
          if (typeof mainWindow.flashFrame === "function") {
            mainWindow.flashFrame(true);
          }
        } catch (_e) {}

        if (launcherTopMostResetTimer) {
          clearTimeout(launcherTopMostResetTimer);
          launcherTopMostResetTimer = null;
        }
        launcherTopMostResetTimer = setTimeout(() => {
          const win = getMainWindow();
          if (!win || win.isDestroyed()) return;
          try {
            win.setAlwaysOnTop(false);
          } catch (_e) {}
          try {
            if (typeof win.flashFrame === "function") {
              win.flashFrame(false);
            }
          } catch (_e) {}
          launcherTopMostResetTimer = null;
        }, 2600);

        if (!isFocused) {
          requestWindowsForegroundFallback();
        }
      } else {
        try {
          if (typeof mainWindow.flashFrame === "function") {
            mainWindow.flashFrame(false);
          }
        } catch (_e) {}
      }
    };

    log.info(`Bring emuBro window to front (${reason})`);
    runAttempt(false);
    [140, 420, 980, 1650, 2600, 4200].forEach((delay, idx) => {
      setTimeout(() => runAttempt(idx > 0), delay);
    });
  }

  function toTitleCaseFromSlug(value) {
    return String(value || "")
      .split("-")
      .map((part) => part ? (part.charAt(0).toUpperCase() + part.slice(1)) : "")
      .join(" ")
      .trim();
  }

  function normalizeTagId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function unquoteYamlScalar(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
      text = text.slice(1, -1);
    }
    return text.trim();
  }

  function parseYamlTagLabel(yamlText) {
    const lines = String(yamlText || "").split(/\r?\n/g);
    let inEnglishSection = false;
    const englishValues = [];

    for (const rawLine of lines) {
      const line = String(rawLine || "");
      const trimmed = line.trim();
      if (!trimmed || trimmed === "---") continue;

      const keyMatch = trimmed.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
      if (keyMatch) {
        const key = String(keyMatch[1] || "").trim().toLowerCase();
        const valuePart = String(keyMatch[2] || "").trim();
        inEnglishSection = key === "en";
        if (inEnglishSection && valuePart) {
          const scalar = unquoteYamlScalar(valuePart);
          if (scalar) englishValues.push(scalar);
        }
        continue;
      }

      if (inEnglishSection) {
        const listItemMatch = trimmed.match(/^-+\s*(.+)$/);
        if (listItemMatch) {
          const scalar = unquoteYamlScalar(listItemMatch[1]);
          if (scalar) englishValues.push(scalar);
        } else if (/^[A-Za-z0-9_-]+\s*:/.test(trimmed)) {
          inEnglishSection = false;
        }
      }
    }

    return englishValues.find((value) => String(value || "").trim().length > 0) || "";
  }

  function loadTagCatalog() {
    const tagsDir = resolveResourcePath("tags", { mustExist: true });
    if (!fsSync.existsSync(tagsDir)) return [];

    const files = fsSync.readdirSync(tagsDir, { withFileTypes: true });
    const out = [];
    const seen = new Set();

    for (const file of files) {
      if (!file || !file.isFile()) continue;
      const ext = path.extname(file.name).toLowerCase();
      if (ext !== ".yaml" && ext !== ".yml") continue;

      const slug = String(path.basename(file.name, ext) || "").trim().toLowerCase();
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);

      const absPath = path.join(tagsDir, file.name);
      let label = "";
      try {
        const raw = fsSync.readFileSync(absPath, "utf8");
        label = parseYamlTagLabel(raw);
      } catch (_error) {
        label = "";
      }

      out.push({
        id: slug,
        label: label || toTitleCaseFromSlug(slug)
      });
    }

    out.sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
    return out;
  }

  function collectGameDerivedTags() {
    const rows = Array.isArray(getGamesState()) ? getGamesState() : [];
    const out = [];
    const seen = new Set();
    rows.forEach((game) => {
      const tagRows = Array.isArray(game?.tags) ? game.tags : [];
      tagRows.forEach((rawTag) => {
        const tag = normalizeTagId(rawTag);
        if (!tag || seen.has(tag)) return;
        seen.add(tag);
        out.push({
          id: tag,
          label: toTitleCaseFromSlug(tag),
          source: "game"
        });
      });
    });
    return out;
  }

  function getDeletedTagIdSet() {
    const rows = Array.isArray(getTagsState()) ? getTagsState() : [];
    const deleted = new Set();
    rows.forEach((row) => {
      const id = normalizeTagId(row?.id);
      const source = String(row?.source || "").trim().toLowerCase();
      if (id && source === "deleted") {
        deleted.add(id);
      }
    });
    return deleted;
  }

  function getMergedTagCatalog() {
    const mergedMap = new Map();
    const deletedTagIds = getDeletedTagIdSet();
    const pushRows = (rows) => {
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const id = normalizeTagId(row?.id);
        if (!id) return;
        const label = String(row?.label || "").trim() || toTitleCaseFromSlug(id);
        const source = String(row?.source || "").trim() || "resource";
        const existing = mergedMap.get(id);
        if (!existing) {
          mergedMap.set(id, { id, label, source });
          return;
        }
        if (existing.label === existing.id && label !== id) {
          existing.label = label;
        }
        if (existing.source !== "resource" || source === "resource") {
          existing.source = source;
        }
      });
    };

    pushRows(loadTagCatalog().map((row) => ({ ...row, source: "resource" })));
    pushRows((Array.isArray(getTagsState()) ? getTagsState() : []).filter((row) => {
      return String(row?.source || "").trim().toLowerCase() !== "deleted";
    }));
    pushRows(collectGameDerivedTags());

    const out = Array.from(mergedMap.values()).filter((row) => !deletedTagIds.has(normalizeTagId(row?.id)));
    out.sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id)));
    return out;
  }

  function remapTagAcrossGames(oldTagId, newTagId) {
    const source = Array.isArray(getGamesState()) ? getGamesState() : [];
    let updatedGames = 0;
    source.forEach((gameRow) => {
      const gameId = Number(gameRow?.id || 0);
      if (!gameId) return;
      const existing = Array.isArray(gameRow?.tags) ? gameRow.tags : [];
      if (!existing.length) return;

      let changed = false;
      const next = [];
      const seen = new Set();
      existing.forEach((rawTag) => {
        const tagId = normalizeTagId(rawTag);
        if (!tagId) return;
        const mapped = tagId === oldTagId ? newTagId : tagId;
        if (tagId === oldTagId) changed = true;
        if (!mapped || seen.has(mapped)) return;
        seen.add(mapped);
        next.push(mapped);
      });

      if (!changed) return;
      dbUpdateGameMetadata(gameId, { tags: next });
      updatedGames += 1;
    });
    return updatedGames;
  }

  function removeTagFromGames(tagIdToRemove) {
    const source = Array.isArray(getGamesState()) ? getGamesState() : [];
    let updatedGames = 0;
    source.forEach((gameRow) => {
      const gameId = Number(gameRow?.id || 0);
      if (!gameId) return;
      const existing = Array.isArray(gameRow?.tags) ? gameRow.tags : [];
      if (!existing.length) return;

      let changed = false;
      const next = [];
      const seen = new Set();
      existing.forEach((rawTag) => {
        const tagId = normalizeTagId(rawTag);
        if (!tagId || tagId === tagIdToRemove) {
          if (tagId === tagIdToRemove) changed = true;
          return;
        }
        if (seen.has(tagId)) return;
        seen.add(tagId);
        next.push(tagId);
      });

      if (!changed) return;
      dbUpdateGameMetadata(gameId, { tags: next });
      updatedGames += 1;
    });
    return updatedGames;
  }

  function sanitizeFilename(name) {
    return String(name || "")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "emuBro Shortcut";
  }

  function normalizeRuntimeRuleValueList(values = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
      const value = String(entry || "").trim().toLowerCase();
      if (!value) return;
      if (seen.has(value)) return;
      seen.add(value);
      out.push(value);
    });
    return out;
  }

  function normalizeRuntimeExtensionList(values = []) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
      let value = String(entry || "").trim().toLowerCase();
      if (!value) return;
      if (!value.startsWith(".")) value = `.${value}`;
      value = value.replace(/\s+/g, "");
      if (!value) return;
      if (seen.has(value)) return;
      seen.add(value);
      out.push(value);
    });
    return out;
  }

  function normalizeRuntimeDataRules(input = {}) {
    const source = (input && typeof input === "object") ? input : {};
    return {
      directoryNames: normalizeRuntimeRuleValueList(source.directoryNames),
      fileExtensions: normalizeRuntimeExtensionList(source.fileExtensions),
      fileNameIncludes: normalizeRuntimeRuleValueList(source.fileNameIncludes)
    };
  }

  function resolvePlatformDefaultCoverPath(platformShortName) {
    const psn = normalizePlatform(platformShortName);
    return resolveResourcePath(path.posix.join("platforms", psn, "covers", "default.jpg"), { mustExist: true });
  }

  function resolveGameCoverPath(game) {
    const img = String(game?.image || "").trim();
    if (img) {
      const p = resolveAppOrResourcePath(img);
      if (fsSync.existsSync(p)) return p;
    }

    const fallback = resolvePlatformDefaultCoverPath(game?.platformShortName);
    if (fsSync.existsSync(fallback)) return fallback;

    const appIcon = path.join(appPath, "favicon.ico");
    if (fsSync.existsSync(appIcon)) return appIcon;

    return path.join(appPath, "logo.png");
  }

  function readPngDimensions(pngBuffer) {
    if (!Buffer.isBuffer(pngBuffer) || pngBuffer.length < 24) return { width: 256, height: 256 };
    const sig = pngBuffer.subarray(0, 8);
    const expected = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (!sig.equals(expected)) return { width: 256, height: 256 };
    return {
      width: pngBuffer.readUInt32BE(16),
      height: pngBuffer.readUInt32BE(20)
    };
  }

  function writeIcoFromPng(pngBuffer, icoPath) {
    const { width, height } = readPngDimensions(pngBuffer);
    const w = width >= 256 ? 0 : width;
    const h = height >= 256 ? 0 : height;

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);
    header.writeUInt16LE(1, 2);
    header.writeUInt16LE(1, 4);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(w, 0);
    entry.writeUInt8(h, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(pngBuffer.length, 8);
    entry.writeUInt32LE(6 + 16, 12);

    fsSync.writeFileSync(icoPath, Buffer.concat([header, entry, pngBuffer]));
  }

  function buildDeepLinkForGame(game) {
    const platform = normalizePlatform(game?.platformShortName) || normalizePlatform(game?.platform) || "unknown";
    const code = inferGameCode(game);
    const name = String(game?.name || "").trim();

    const params = new URLSearchParams();
    params.set("platform", platform);
    if (code) params.set("code", code);
    if (name) params.set("name", name);

    return `emubro://launch?${params.toString()}`;
  }

  function getShortcutTargetAndArgs(url) {
    const quoteWinArg = (value) => `"${String(value ?? "").replace(/"/g, '\\"')}"`;
    if (process.defaultApp) {
      const entry = process.argv.length >= 2 ? path.resolve(process.argv[1]) : "";
      const args = entry ? `${quoteWinArg(entry)} ${quoteWinArg(url)}` : quoteWinArg(url);
      return { target: process.execPath, args };
    }
    return { target: process.execPath, args: quoteWinArg(url) };
  }

  function findFileByNameInTree(rootDir, targetFileName, options = {}) {
    const root = String(rootDir || "").trim();
    const target = String(targetFileName || "").trim().toLowerCase();
    if (!root || !target) return "";

    const maxDepth = Number.isFinite(options.maxDepth) ? Math.max(0, Math.floor(options.maxDepth)) : 6;
    const maxVisitedDirs = Number.isFinite(options.maxVisitedDirs) ? Math.max(100, Math.floor(options.maxVisitedDirs)) : 5000;
    const queue = [{ dir: root, depth: 0 }];
    let visitedDirs = 0;

    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) break;
      const { dir, depth } = next;
      visitedDirs += 1;
      if (visitedDirs > maxVisitedDirs) break;

      let entries = [];
      try {
        entries = fsSync.readdirSync(dir, { withFileTypes: true });
      } catch (_e) {
        continue;
      }

      for (const entry of entries) {
        const entryName = String(entry?.name || "");
        if (!entryName) continue;
        const fullPath = path.join(dir, entryName);

        if (entry.isFile()) {
          if (entryName.toLowerCase() === target) return fullPath;
          continue;
        }

        if (!entry.isDirectory()) continue;
        if (entry.isSymbolicLink && entry.isSymbolicLink()) continue;
        if (depth >= maxDepth) continue;
        queue.push({ dir: fullPath, depth: depth + 1 });
      }
    }

    return "";
  }

  function tryRelinkGameInParent(game) {
    const gameId = Number(game?.id);
    const originalPath = String(game?.filePath || "").trim();
    const parentPath = originalPath ? path.dirname(originalPath) : "";
    const fileName = originalPath ? path.basename(originalPath) : "";

    if (!gameId || !originalPath || !parentPath || !fileName) {
      return { found: false, parentExists: false, parentPath, missingPath: originalPath };
    }

    let parentExists = false;
    try {
      parentExists = fsSync.existsSync(parentPath) && fsSync.statSync(parentPath).isDirectory();
    } catch (_e) {
      parentExists = false;
    }

    if (!parentExists) {
      return { found: false, parentExists: false, parentPath, missingPath: originalPath };
    }

    const resolvedPath = findFileByNameInTree(parentPath, fileName, { maxDepth: 2, maxVisitedDirs: 1500 });
    if (!resolvedPath) {
      return { found: false, parentExists: true, parentPath, missingPath: originalPath };
    }

    try {
      const updated = dbUpdateGameFilePath(gameId, resolvedPath);
      if (!updated) {
        return { found: false, parentExists: true, parentPath, missingPath: originalPath };
      }
      refreshLibraryFromDb();
      return {
        found: true,
        parentExists: true,
        parentPath,
        missingPath: originalPath,
        newPath: resolvedPath,
        game: updated
      };
    } catch (error) {
      log.error("Failed to relink missing game in parent folder:", error);
      return { found: false, parentExists: true, parentPath, missingPath: originalPath, error: error.message };
    }
  }

  function launchGameObject(game, options = {}) {
    const platformShortName = String(game?.platformShortName || "").trim().toLowerCase();
    let gameRow = game;
    let gamePath = String(game?.filePath || "").trim();

    const isLauncherUri = /^(steam|com\.epicgames\.launcher|goggalaxy|heroic):\/\//i.test(gamePath);
    if (isLauncherUri) {
      const runAsMode = normalizeRunAsMode(gameRow?.runAsMode || game?.runAsMode);
      const runAsUser = String(gameRow?.runAsUser || game?.runAsUser || "").trim();

      if (runAsMode !== RUN_AS_DEFAULT) {
        if (process.platform !== "win32") {
          return { success: false, message: "Run as admin/user is currently supported on Windows only." };
        }

        let launchTarget = "cmd.exe";
        let launchArgs = ["/d", "/s", "/c", "start", "\"\"", gamePath];
        let launchCwd = "";
        let launchMode = "launcher";

        if (runAsMode === RUN_AS_ADMIN) {
          const wrapped = buildWindowsAdminLaunch({ target: launchTarget, args: launchArgs, cwd: launchCwd });
          launchTarget = wrapped.launchTarget;
          launchArgs = wrapped.launchArgs;
          launchCwd = wrapped.launchCwd || "";
          launchMode = "launcher-admin";
        } else if (runAsMode === RUN_AS_USER) {
          if (!runAsUser) {
            return { success: false, message: "Run-as user is not set for this game." };
          }
          const wrapped = buildWindowsRunAsUserLaunch({
            target: launchTarget,
            args: launchArgs,
            cwd: launchCwd,
            username: runAsUser
          });
          launchTarget = wrapped.launchTarget;
          launchArgs = wrapped.launchArgs;
          launchCwd = wrapped.launchCwd || "";
          launchMode = "launcher-user";
        }

        try {
          const child = spawn(launchTarget, launchArgs, {
            stdio: "ignore",
            cwd: launchCwd || undefined,
            detached: false
          });
          if (child && typeof child.unref === "function") {
            child.unref();
          }
        } catch (error) {
          log.error("Failed to run launcher with elevated permissions:", error);
          return { success: false, message: "Failed to open launcher with run-as mode" };
        }

        const targetGameId = Number(gameRow?.id || game?.id || 0);
        if (targetGameId) {
          dbUpdateGameMetadata(targetGameId, { lastPlayed: new Date().toISOString() });
          refreshLibraryFromDb();
        }

        return {
          success: true,
          message: "Launcher opened with run-as mode",
          launchMode
        };
      }

      let uriOk = tryOpenLauncherUri(gamePath);
      if (!uriOk && /^goggalaxy:\/\/launch\//i.test(gamePath)) {
        const altUri = getGogAlternateUri(gamePath);
        if (altUri) {
          uriOk = tryOpenLauncherUri(altUri);
          if (!uriOk) {
            log.warn(`GOG alternate URI failed for ${gameRow?.name || game?.name}: ${altUri}`);
          }
        }
      }
      if (!uriOk) {
        log.warn(`Launcher URI failed for ${gameRow?.name || game?.name}: ${gamePath}`);
      }
      const fallbackOk = uriOk ? false : tryOpenLauncherFallback(gamePath);
      if (!uriOk && !fallbackOk) {
        return { success: false, message: "Failed to open launcher" };
      }
      const targetGameId = Number(gameRow?.id || game?.id || 0);
      if (targetGameId) {
        dbUpdateGameMetadata(targetGameId, { lastPlayed: new Date().toISOString() });
        refreshLibraryFromDb();
      }
      return {
        success: true,
        message: fallbackOk ? "Launcher opened via fallback" : "Launcher opened",
        launchMode: fallbackOk ? "launcher-fallback" : "launcher"
      };
    }

    if (!gamePath || !fsSync.existsSync(gamePath)) {
      const mediaInfo = classifyPathMedia(gamePath);
      if (mediaInfo.rootPath && !mediaInfo.rootExists) {
        log.warn(`Game root path is unavailable for "${game?.name}": ${mediaInfo.rootPath}`);
        return {
          success: false,
          code: "GAME_FILE_MISSING",
          message: "Game file not found",
          gameId: game?.id ?? null,
          gameName: game?.name || "Unknown Game",
          missingPath: gamePath || "",
          parentPath: gamePath ? path.dirname(gamePath) : "",
          parentExists: false,
          rootPath: mediaInfo.rootPath,
          rootExists: false,
          sourceMedia: mediaInfo.mediaCategory
        };
      }

      const relink = tryRelinkGameInParent(gameRow);
      if (relink.found && relink.newPath && fsSync.existsSync(relink.newPath)) {
        gamePath = relink.newPath;
        gameRow = relink.game || gameRow;
        log.info(`Auto-relocated missing game "${gameRow?.name || game?.name}" to ${gamePath}`);
      } else {
        log.error(`Game file not found at path: ${gamePath}`);
        return {
          success: false,
          code: "GAME_FILE_MISSING",
          message: "Game file not found",
          gameId: game?.id ?? null,
          gameName: game?.name || "Unknown Game",
          missingPath: gamePath || "",
          parentPath: relink?.parentPath || (gamePath ? path.dirname(gamePath) : ""),
          parentExists: !!relink?.parentExists,
          rootPath: mediaInfo.rootPath,
          rootExists: mediaInfo.rootExists,
          sourceMedia: mediaInfo.mediaCategory
        };
      }
    }

    const isWindowsExeGame = process.platform === "win32" && /\.exe$/i.test(gamePath);
    let launchTarget = "";
    let launchArgs = [];
    let launchCwd = "";
    let launchMode = "";
    let resolvedEmulatorPath = "";

    if (isWindowsExeGame) {
      const gameDir = path.dirname(gamePath);
      const cmdPath = String(process.env.ComSpec || "cmd.exe").trim() || "cmd.exe";
      launchTarget = cmdPath;
      launchArgs = ["/d", "/s", "/c", "start", "", "/d", gameDir, "/wait", gamePath];
      launchCwd = gameDir;
      launchMode = "cmd";
    } else {
      const overridePath = String(gameRow?.emulatorOverridePath || game?.emulatorOverridePath || "").trim();
      let emuPath = "";

      if (overridePath && fsSync.existsSync(overridePath)) {
        emuPath = overridePath;
      } else {
        if (overridePath) {
          log.warn(`Game "${gameRow?.name || game?.name}" has an emulator override path that is missing: ${overridePath}`);
        }
        emuPath = getEmulatorsState().find((emu) => String(emu.platformShortName || "").trim().toLowerCase() === platformShortName)?.filePath;
      }

      if (!emuPath) {
        log.error(`No emulator found for platform ${game.platformShortName}`);
        return { success: false, message: "Emulator not found for this game" };
      }
      if (!fsSync.existsSync(emuPath)) {
        log.error(`Emulator executable not found at path: ${emuPath}`);
        return { success: false, message: "Emulator executable not found" };
      }

      launchTarget = emuPath;
      launchArgs = [gamePath];
      launchCwd = path.dirname(emuPath);
      launchMode = overridePath && overridePath === emuPath ? "emulator-override" : "emulator";
      resolvedEmulatorPath = emuPath;
    }

    const runAsMode = normalizeRunAsMode(gameRow?.runAsMode || game?.runAsMode);
    const runAsUser = String(gameRow?.runAsUser || game?.runAsUser || "").trim();
    let launchStdio = "ignore";
    let launchDetached = true;

    if (runAsMode !== RUN_AS_DEFAULT) {
      if (process.platform !== "win32") {
        return { success: false, message: "Run as admin/user is currently supported on Windows only." };
      }

      if (runAsMode === RUN_AS_ADMIN) {
        const wrapped = buildWindowsAdminLaunch({ target: launchTarget, args: launchArgs, cwd: launchCwd });
        launchTarget = wrapped.launchTarget;
        launchArgs = wrapped.launchArgs;
        launchCwd = wrapped.launchCwd || "";
        launchMode = `${launchMode}-admin`;
        launchDetached = false;
      } else if (runAsMode === RUN_AS_USER) {
        if (!runAsUser) {
          return { success: false, message: "Run-as user is not set for this game." };
        }
        const wrapped = buildWindowsRunAsUserLaunch({
          target: launchTarget,
          args: launchArgs,
          cwd: launchCwd,
          username: runAsUser
        });
        launchTarget = wrapped.launchTarget;
        launchArgs = wrapped.launchArgs;
        launchCwd = wrapped.launchCwd || "";
        launchMode = `${launchMode}-user`;
        launchStdio = "ignore";
        launchDetached = false;
      }
    }

    try {
      closeSessionOverlayWindow();
      const child = spawn(launchTarget, launchArgs, {
        stdio: launchStdio,
        cwd: launchCwd || undefined,
        detached: launchDetached
      });
      if (child && typeof child.unref === "function") {
        child.unref();
      }
      const runtimeDataRules = normalizeRuntimeDataRules(options?.runtimeDataRules || {});
      gameSessionManager.startSession({
        child,
        game: gameRow || game,
        gamePath,
        launchTarget,
        launchMode,
        emulatorPath: resolvedEmulatorPath,
        runtimeDataRules
      });
      child.on("error", (error) => {
        closeSessionOverlayWindow();
        log.error(`Error launching game ${gameRow?.name || game?.name}:`, error);
      });

      let handledProcessStop = false;
      const onProcessStopped = () => {
        if (handledProcessStop) return;
        handledProcessStop = true;
        closeSessionOverlayWindow();
        bringMainWindowToFront("game-process-exit");
      };
      child.once("exit", onProcessStopped);
      child.once("close", onProcessStopped);
      child.once("disconnect", onProcessStopped);

      const mainWindow = getMainWindow();
      if (mainWindow) {
        attachMainWindowSessionCloseHandler(mainWindow);
        mainWindow[SESSION_SUSPENDED_WINDOW_FLAG] = true;
        mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = false;
        try {
          if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
            mainWindow.webContents.setBackgroundThrottling(true);
          }
        } catch (_e) {}
        try {
          mainWindow.loadURL(getSuspendedLauncherUrl())
            .catch((error) => {
              log.warn("Failed to load suspended launcher placeholder:", error?.message || error);
            });
        } catch (_e) {}
        log.info("Hiding main window after game launch");
        try {
          mainWindow.hide();
        } catch (_e) {
          // Fallback if hide fails in a platform-specific edge-case.
          try {
            mainWindow.minimize();
          } catch (_err) {}
        }
      }

      showSessionOverlayWindow();

      try {
        const targetGameId = Number(gameRow?.id || game?.id || 0);
        if (targetGameId) {
          dbUpdateGameMetadata(targetGameId, { lastPlayed: new Date().toISOString() });
          refreshLibraryFromDb();
        }
      } catch (error) {
        log.warn("Failed to update lastPlayed after launch:", error?.message || error);
      }

      return {
        success: true,
        message: "Game launched successfully",
        resolvedPath: gamePath !== String(game?.filePath || "").trim() ? gamePath : null,
        launchMode
      };
    } catch (error) {
      closeSessionOverlayWindow();
      log.error(`Error launching game ${gameRow?.name || game?.name}:`, error);
      bringMainWindowToFront("launch-failed");
      return { success: false, message: "Failed to execute launch command" };
    }
  }

  ipcMain.handle("get-games", async () => {
    try {
      refreshLibraryFromDb();
    } catch (_e) {}
    return getGamesState();
  });

  ipcMain.handle("tags:list", async () => {
    try {
      return { success: true, tags: getMergedTagCatalog() };
    } catch (error) {
      log.error("Failed to list tags:", error);
      return { success: false, message: error.message, tags: [] };
    }
  });

  ipcMain.handle("tags:rename", async (_event, payload = {}) => {
    try {
      const oldTagId = normalizeTagId(payload?.oldTagId || payload?.tagId || payload?.oldId);
      const requestedName = String(
        payload?.newTagName
        || payload?.newLabel
        || payload?.newName
        || payload?.name
        || ""
      ).trim();
      if (!oldTagId) {
        return { success: false, message: "Missing source tag ID" };
      }
      if (!requestedName) {
        return { success: false, message: "Missing new tag name" };
      }

      const newTagId = normalizeTagId(requestedName);
      if (!newTagId) {
        return { success: false, message: "Invalid new tag name" };
      }

      const catalogMap = new Map(getMergedTagCatalog().map((row) => [normalizeTagId(row?.id), row]));
      const oldCatalog = catalogMap.get(oldTagId);
      const oldLabel = String(oldCatalog?.label || toTitleCaseFromSlug(oldTagId)).trim() || toTitleCaseFromSlug(oldTagId);
      const newLabel = requestedName;

      let updatedGames = 0;
      let mergedIntoExisting = false;

      if (oldTagId !== newTagId) {
        updatedGames = remapTagAcrossGames(oldTagId, newTagId);
        mergedIntoExisting = catalogMap.has(newTagId);
      }

      dbUpsertTags(
        [{
          id: newTagId,
          label: newLabel || toTitleCaseFromSlug(newTagId),
          source: "user"
        }],
        { source: "user", forceLabel: true, forceSource: true }
      );

      if (oldTagId !== newTagId) {
        dbUpsertTags(
          [{
            id: oldTagId,
            label: oldLabel,
            source: "deleted"
          }],
          { source: "deleted", forceLabel: true, forceSource: true }
        );
      }

      refreshLibraryFromDb();
      return {
        success: true,
        oldTagId,
        newTagId,
        newLabel: newLabel || toTitleCaseFromSlug(newTagId),
        updatedGames,
        merged: mergedIntoExisting
      };
    } catch (error) {
      log.error("Failed to rename tag:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("tags:delete", async (_event, payload = {}) => {
    try {
      const tagId = normalizeTagId(payload?.tagId || payload?.id);
      if (!tagId) return { success: false, message: "Missing tag ID" };

      const catalogMap = new Map(getMergedTagCatalog().map((row) => [normalizeTagId(row?.id), row]));
      const existing = catalogMap.get(tagId);
      const label = String(existing?.label || toTitleCaseFromSlug(tagId)).trim() || toTitleCaseFromSlug(tagId);

      const updatedGames = removeTagFromGames(tagId);
      dbUpsertTags(
        [{
          id: tagId,
          label,
          source: "deleted"
        }],
        { source: "deleted", forceLabel: true, forceSource: true }
      );

      refreshLibraryFromDb();
      return { success: true, tagId, updatedGames };
    } catch (error) {
      log.error("Failed to delete tag:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("get-game-details", async (_event, gameId) => {
    const targetId = Number(gameId);
    return getGamesState().find((game) => Number(game.id) === targetId) || null;
  });

  ipcMain.handle("update-game-metadata", async (_event, payload = {}) => {
    try {
      const gameId = Number(payload?.gameId);
      if (!gameId) return { success: false, message: "Missing game ID" };

      const game = dbGetGameById(gameId) || getGamesState().find((row) => Number(row.id) === gameId);
      if (!game) return { success: false, message: "Game not found" };

      const patch = {};

      if (Object.prototype.hasOwnProperty.call(payload, "emulatorOverridePath")) {
        const nextPath = String(payload?.emulatorOverridePath || "").trim();
        if (nextPath && !fsSync.existsSync(nextPath)) {
          return { success: false, message: "Selected emulator path does not exist" };
        }
        patch.emulatorOverridePath = nextPath || null;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "platformShortName")) {
        const nextPlatformShortName = normalizePlatform(payload?.platformShortName);
        if (!nextPlatformShortName) {
          return { success: false, message: "Missing platform short name" };
        }

        let nextPlatformName = "Unknown";
        if (nextPlatformShortName === "pc") {
          nextPlatformName = "PC";
        } else {
          const platformConfigs = await getPlatformConfigs();
          const config = (platformConfigs || []).find((row) => normalizePlatform(row?.shortName) === nextPlatformShortName);
          if (config) nextPlatformName = String(config?.name || nextPlatformShortName).trim() || nextPlatformShortName;
        }

        patch.platformShortName = nextPlatformShortName;
        patch.platform = nextPlatformName;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "tags")) {
        const rawTags = Array.isArray(payload?.tags) ? payload.tags : [];
        const normalizedTags = [];
        const seen = new Set();
        rawTags.forEach((rawTag) => {
          const tag = normalizeTagId(rawTag);
          if (!tag || seen.has(tag)) return;
          seen.add(tag);
          normalizedTags.push(tag);
        });
        patch.tags = normalizedTags;

        if (normalizedTags.length > 0) {
          const tagCatalogMap = new Map(
            getMergedTagCatalog().map((row) => [String(row?.id || "").toLowerCase(), String(row?.label || "").trim()])
          );
          dbUpsertTags(
            normalizedTags.map((tagId) => ({
              id: tagId,
              label: tagCatalogMap.get(tagId) || toTitleCaseFromSlug(tagId),
              source: "user"
            })),
            { source: "user" }
          );
        }
      }

      if (Object.prototype.hasOwnProperty.call(payload, "lastPlayed")) {
        const raw = payload?.lastPlayed;
        const value = raw == null ? "" : String(raw).trim();
        if (value) {
          const parsed = new Date(value);
          if (!Number.isFinite(parsed.getTime())) {
            return { success: false, message: "Invalid lastPlayed value" };
          }
          patch.lastPlayed = parsed.toISOString();
        } else {
          patch.lastPlayed = null;
        }
      }

      if (Object.prototype.hasOwnProperty.call(payload, "progress")) {
        const progress = Number(payload?.progress);
        if (!Number.isFinite(progress)) {
          return { success: false, message: "Invalid progress value" };
        }
        patch.progress = Math.max(0, Math.min(100, Math.round(progress)));
      }

      if (Object.prototype.hasOwnProperty.call(payload, "runAsMode")) {
        const nextMode = normalizeRunAsMode(payload?.runAsMode);
        if (nextMode === RUN_AS_USER) {
          const nextUser = String(payload?.runAsUser || game?.runAsUser || "").trim();
          if (!nextUser) {
            return { success: false, message: "Run-as user is required when selecting 'Run as user'." };
          }
          patch.runAsUser = nextUser;
        }
        patch.runAsMode = nextMode;
      }

      if (Object.prototype.hasOwnProperty.call(payload, "runAsUser")) {
        const nextUser = String(payload?.runAsUser || "").trim();
        patch.runAsUser = nextUser || null;
      }

      const updated = dbUpdateGameMetadata(gameId, patch);
      if (!updated) return { success: false, message: "Failed to update game metadata" };

      refreshLibraryFromDb();
      return { success: true, game: updated };
    } catch (error) {
      log.error("Failed to update game metadata:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("remove-game", async (_event, gameId) => {
    try {
      const targetId = Number(gameId);
      const game = getGamesState().find((row) => Number(row.id) === targetId) || dbGetGameById(targetId);
      if (!game) return { success: false, message: "Game not found" };

      const removed = dbDeleteGameById(targetId);
      if (removed) {
        refreshLibraryFromDb();
        log.info(`Game ${game.name} removed from library`);
        return { success: true, message: "Game removed from library" };
      }

      return { success: false, message: "Game not found" };
    } catch (error) {
      log.error(`Failed to remove game ${gameId}:`, error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("launch-game", async (_event, payload = 0) => {
    try {
      const targetId = Number((payload && typeof payload === "object")
        ? (payload.gameId || payload.id || 0)
        : payload);
      const game = getGamesState().find((row) => Number(row.id) === targetId) || dbGetGameById(targetId);
      if (!game) return { success: false, message: "Game not found" };
      const runtimeDataRules = (payload && typeof payload === "object")
        ? normalizeRuntimeDataRules(payload.runtimeDataRules || {})
        : normalizeRuntimeDataRules({});
      return launchGameObject(game, { runtimeDataRules });
    } catch (error) {
      log.error("Failed to launch game:", error);
      bringMainWindowToFront("launch-game-handler-error");
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("game-session:get-status", async () => {
    try {
      return gameSessionManager.getStatus();
    } catch (error) {
      log.error("game-session:get-status failed:", error);
      return { success: false, active: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("game-session:show-launcher", async () => {
    try {
      return gameSessionManager.showLauncher();
    } catch (error) {
      log.error("game-session:show-launcher failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("game-session:quit", async () => {
    try {
      return gameSessionManager.quitActiveSession();
    } catch (error) {
      log.error("game-session:quit failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("game-session:send-hotkey", async (_event, payload = {}) => {
    try {
      const action = String(payload?.action || "").trim().toLowerCase();
      return gameSessionManager.sendHotkey(action);
    } catch (error) {
      log.error("game-session:send-hotkey failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("game-session:capture-screenshot", async (_event, payload = {}) => {
    try {
      const reason = String(payload?.reason || "manual").trim().toLowerCase() || "manual";
      return gameSessionManager.captureActiveSessionScreenshot(reason);
    } catch (error) {
      log.error("game-session:capture-screenshot failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("game-session:show-overlay-menu", async (event) => {
    try {
      const senderWindow = BrowserWindow.fromWebContents(event.sender);
      if (!senderWindow || senderWindow.isDestroyed()) {
        return { success: false, message: "Overlay window is not available" };
      }

      const menu = Menu.buildFromTemplate([
        {
          label: "Show emuBro",
          click: () => {
            gameSessionManager.showLauncher();
          }
        },
        {
          label: "Send Alt+Enter",
          click: () => {
            gameSessionManager.sendHotkey("alt_enter");
          }
        },
        {
          label: "Take Screenshot",
          click: () => {
            gameSessionManager.captureActiveSessionScreenshot("manual-overlay");
          }
        },
        { type: "separator" },
        {
          label: "Quit Game",
          click: () => {
            gameSessionManager.quitActiveSession();
          }
        }
      ]);

      menu.popup({
        window: senderWindow
      });
      return { success: true };
    } catch (error) {
      log.error("game-session:show-overlay-menu failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
  });

  ipcMain.handle("search-missing-game-file", async (_event, payload = {}) => {
    try {
      const targetId = Number(payload?.gameId);
      const rootDir = String(payload?.rootDir || "").trim();
      const maxDepth = Number.isFinite(payload?.maxDepth) ? Math.max(0, Math.floor(payload.maxDepth)) : 8;

      if (!targetId) return { success: false, message: "Missing game ID" };
      if (!rootDir) return { success: false, message: "Missing search root folder" };
      if (!fsSync.existsSync(rootDir) || !fsSync.statSync(rootDir).isDirectory()) {
        return { success: false, message: "Search root folder not found" };
      }

      const game = dbGetGameById(targetId) || getGamesState().find((row) => Number(row.id) === targetId);
      if (!game) return { success: false, message: "Game not found" };

      const oldPath = String(game.filePath || "").trim();
      const targetFileName = path.basename(oldPath);
      if (!targetFileName) return { success: false, message: "Game has no file name" };

      const foundPath = findFileByNameInTree(rootDir, targetFileName, { maxDepth, maxVisitedDirs: 15000 });
      if (!foundPath) {
        return {
          success: true,
          found: false,
          gameId: targetId,
          gameName: game.name || "Unknown Game",
          targetFileName
        };
      }

      const updated = dbUpdateGameFilePath(targetId, foundPath);
      if (!updated) return { success: false, message: "Failed to update game path" };
      refreshLibraryFromDb();

      return {
        success: true,
        found: true,
        gameId: targetId,
        gameName: updated.name || game.name || "Unknown Game",
        newPath: foundPath
      };
    } catch (error) {
      log.error("search-missing-game-file failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("relink-game-file", async (_event, payload = {}) => {
    try {
      const targetId = Number(payload?.gameId);
      const selectedPath = String(payload?.filePath || "").trim();

      if (!targetId) return { success: false, message: "Missing game ID" };
      if (!selectedPath) return { success: false, message: "Missing file path" };
      if (!fsSync.existsSync(selectedPath)) return { success: false, message: "Selected file was not found" };

      let stat;
      try {
        stat = fsSync.statSync(selectedPath);
      } catch (_e) {
        stat = null;
      }
      if (!stat || !stat.isFile()) return { success: false, message: "Selected path is not a file" };

      const game = dbGetGameById(targetId) || getGamesState().find((row) => Number(row.id) === targetId);
      if (!game) return { success: false, message: "Game not found" };

      const updated = dbUpdateGameFilePath(targetId, selectedPath);
      if (!updated) return { success: false, message: "Failed to update game path" };
      refreshLibraryFromDb();

      return {
        success: true,
        gameId: targetId,
        gameName: updated.name || game.name || "Unknown Game",
        newPath: selectedPath
      };
    } catch (error) {
      log.error("relink-game-file failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("create-game-shortcut", async (_event, gameId) => {
    try {
      const game = getGamesState().find((row) => Number(row.id) === Number(gameId));
      if (!game) return { success: false, message: "Game not found" };

      const url = buildDeepLinkForGame(game);
      const { target, args } = getShortcutTargetAndArgs(url);

      const desktopDir = app.getPath("desktop");
      const shortcutName = `${sanitizeFilename(`${game.name} (${game.platformShortName || game.platform || "unknown"})`)}.lnk`;
      const shortcutPath = path.join(desktopDir, shortcutName);

      const iconDir = path.join(app.getPath("userData"), "shortcut-icons");
      fsSync.mkdirSync(iconDir, { recursive: true });

      const coverPath = resolveGameCoverPath(game);
      const iconKey = sanitizeFilename(`${game.platformShortName || "unknown"}_${inferGameCode(game) || game.name || "game"}`);
      const icoPath = path.join(iconDir, `${iconKey}.ico`);

      try {
        const img = nativeImage.createFromPath(coverPath).resize({ width: 256, height: 256 });
        const png = img.toPNG();
        writeIcoFromPng(png, icoPath);
      } catch (error) {
        log.warn("Failed to generate shortcut icon, falling back to app icon:", error.message);
      }

      const ok = shell.writeShortcutLink(shortcutPath, {
        target,
        args,
        description: `Launch ${game.name} in emuBro`,
        icon: fsSync.existsSync(icoPath) ? icoPath : undefined,
        iconIndex: 0
      });

      if (!ok) return { success: false, message: "Failed to create shortcut" };
      return { success: true, path: shortcutPath, url };
    } catch (error) {
      log.error("Failed to create shortcut:", error);
      return { success: false, message: error.message };
    }
  });

  return {
    launchGameObject
  };
}

module.exports = {
  registerGameIpc
};
  function resolveAppOrResourcePath(inputPath) {
    const rel = String(inputPath || "").trim().replace(/\\/g, "/");
    if (!rel) return "";
    if (rel.startsWith("emubro-resources/")) {
      const resourceRel = rel.slice("emubro-resources/".length);
      const resolved = resolveResourcePath(resourceRel, { mustExist: true });
      if (resolved) return resolved;
    }
    return path.isAbsolute(rel) ? rel : path.join(appPath, rel);
  }
