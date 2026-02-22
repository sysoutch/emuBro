function createAppBootstrapManager(deps = {}) {
  const {
    app,
    BrowserWindow,
    Menu,
    screen,
    path,
    fs = require("fs"),
    dialog,
    log,
    processRef,
    createSplashWindow,
    closeSplashWindow,
    refreshLibraryFromDb,
    findGameByPlatformAndCodeOrName,
    getGameLaunchHandler,
    getMainWindow,
    setMainWindow,
    getAppBootstrapStarted,
    setAppBootstrapStarted,
    getMainWindowRendererReady,
    setMainWindowRendererReady,
    getRequestRevealMainWindow,
    setRequestRevealMainWindow,
    onMainWindowRevealed
  } = deps;

  const protocol = "emubro";
  const proc = processRef || process;
  const pendingDeepLinks = [];
  let suppressMainWindowReveal = false;
  const SESSION_SUSPENDED_WINDOW_FLAG = "__emuBroSessionSuspended";
  const SESSION_RESTORE_IN_PROGRESS_FLAG = "__emuBroSessionRestoreInProgress";

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

  function setMainWindowSuspendedState(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow[SESSION_SUSPENDED_WINDOW_FLAG] = true;
    mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = false;
    try {
      if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
        mainWindow.webContents.setBackgroundThrottling(true);
      }
    } catch (_e) {}
  }

  function hideMainWindowToBackground(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    setMainWindowSuspendedState(mainWindow);
    try {
      mainWindow.loadURL(getSuspendedLauncherUrl()).catch(() => {});
    } catch (_e) {}
    try {
      mainWindow.hide();
    } catch (_e) {
      try {
        mainWindow.minimize();
      } catch (_err) {}
    }
  }

  function restoreMainWindowForForeground(mainWindow) {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const isSuspended = !!mainWindow[SESSION_SUSPENDED_WINDOW_FLAG];
    if (!isSuspended) {
      try {
        if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
          mainWindow.webContents.setBackgroundThrottling(false);
        }
      } catch (_e) {}
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return;
    }

    if (mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG]) return;
    mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = true;
    mainWindow[SESSION_SUSPENDED_WINDOW_FLAG] = false;
    mainWindow.loadFile("index.html")
      .catch(() => {})
      .finally(() => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        mainWindow[SESSION_RESTORE_IN_PROGRESS_FLAG] = false;
        try {
          if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
            mainWindow.webContents.setBackgroundThrottling(false);
          }
        } catch (_e) {}
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      });
  }

  function setSuppressMainWindowReveal(value) {
    suppressMainWindowReveal = !!value;
    if (!suppressMainWindowReveal) {
      const revealFn = getRequestRevealMainWindow();
      if (typeof revealFn === "function") {
        try {
          revealFn();
        } catch (_e) {}
      }
    }
  }

  function isMainWindowRevealSuppressed() {
    return suppressMainWindowReveal;
  }

  function findDeepLinkArg(args = []) {
    return (Array.isArray(args) ? args : [])
      .find((arg) => String(arg || "").toLowerCase().startsWith(`${protocol}://`)) || "";
  }

  function parseDeepLink(rawUrl) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch (_e) {
      return null;
    }

    const action = String(parsed.hostname || "").trim().toLowerCase();
    if (!action) return null;

    return {
      action,
      platform: parsed.searchParams.get("platform"),
      name: parsed.searchParams.get("name"),
      code: parsed.searchParams.get("code")
    };
  }

  if (!app) throw new Error("createAppBootstrapManager requires app");
  if (!BrowserWindow) throw new Error("createAppBootstrapManager requires BrowserWindow");
  if (!Menu) throw new Error("createAppBootstrapManager requires Menu");
  if (!screen) throw new Error("createAppBootstrapManager requires screen");
  if (!path) throw new Error("createAppBootstrapManager requires path");
  if (!dialog) throw new Error("createAppBootstrapManager requires dialog");
  if (!log) throw new Error("createAppBootstrapManager requires log");
  if (typeof createSplashWindow !== "function") throw new Error("createAppBootstrapManager requires createSplashWindow");
  if (typeof closeSplashWindow !== "function") throw new Error("createAppBootstrapManager requires closeSplashWindow");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("createAppBootstrapManager requires refreshLibraryFromDb");
  if (typeof findGameByPlatformAndCodeOrName !== "function") throw new Error("createAppBootstrapManager requires findGameByPlatformAndCodeOrName");
  if (typeof getGameLaunchHandler !== "function") throw new Error("createAppBootstrapManager requires getGameLaunchHandler");
  if (typeof getMainWindow !== "function") throw new Error("createAppBootstrapManager requires getMainWindow");
  if (typeof setMainWindow !== "function") throw new Error("createAppBootstrapManager requires setMainWindow");
  if (typeof getAppBootstrapStarted !== "function") throw new Error("createAppBootstrapManager requires getAppBootstrapStarted");
  if (typeof setAppBootstrapStarted !== "function") throw new Error("createAppBootstrapManager requires setAppBootstrapStarted");
  if (typeof getMainWindowRendererReady !== "function") throw new Error("createAppBootstrapManager requires getMainWindowRendererReady");
  if (typeof setMainWindowRendererReady !== "function") throw new Error("createAppBootstrapManager requires setMainWindowRendererReady");
  if (typeof getRequestRevealMainWindow !== "function") throw new Error("createAppBootstrapManager requires getRequestRevealMainWindow");
  if (typeof setRequestRevealMainWindow !== "function") throw new Error("createAppBootstrapManager requires setRequestRevealMainWindow");
  if (onMainWindowRevealed != null && typeof onMainWindowRevealed !== "function") {
    throw new Error("createAppBootstrapManager requires onMainWindowRevealed to be a function when provided");
  }

  function createWindow(options = {}) {
    const isWin = proc.platform === "win32";
    const startSuspended = !!options.startSuspended;
    let didFinishLoad = false;
    let isReadyToShow = false;
    let isRevealed = false;

    setMainWindowRendererReady(false);
    setRequestRevealMainWindow(null);

    const resolveAppIcon = () => {
      const basePath = proc.resourcesPath || app.getAppPath();
      const candidates = [
        path.join(basePath, "favicon.ico"),
        path.join(basePath, "favicon.ico"),
        path.join(app.getAppPath(), "build", "favicon.ico"),
        path.join(app.getAppPath(), "build", "favicon.ico"),
        path.join(app.getAppPath(), "favicon.ico")
      ];
      return candidates.find((p) => {
        try {
          return fs.existsSync(p);
        } catch (_e) {
          return false;
        }
      });
    };

    const mainWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 700,
      icon: resolveAppIcon(),
      backgroundColor: "#0b1220",
      ...(isWin
        ? {
            frame: false,
            thickFrame: true,
            autoHideMenuBar: true,
            roundedCorners: true,
            backgroundMaterial: "acrylic"
          }
        : {}),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webviewTag: true,
        preload: path.join(app.getAppPath(), "preload.js"),
        devTools: true
      }
    });

    setMainWindow(mainWindow);

    // Mirror renderer console output/errors into main log for startup diagnostics.
    try {
      mainWindow.webContents.on("console-message", (event) => {
        const level = Number(event?.level ?? 0);
        const message = String(event?.message || "");
        const line = Number(event?.lineNumber || 0);
        const sourceId = String(event?.sourceId || "unknown");
        const text = `[renderer:${level}] ${message} (${sourceId}:${line})`;
        if (level >= 3) {
          log.error(text);
        } else if (level === 2) {
          log.warn(text);
        } else {
          log.info(text);
        }
      });
    } catch (_e) {}

    try {
      mainWindow.webContents.on("render-process-gone", (_event, details) => {
        log.error("Renderer process gone:", details);
      });
    } catch (_e) {}

    const primaryDisplay = screen.getPrimaryDisplay();
    mainWindow.on("move", () => {
      const [x, y] = mainWindow.getPosition();
      const [screenGoalX, screenGoalY] = [primaryDisplay.bounds.width / 2, primaryDisplay.bounds.height / 2];
      mainWindow.webContents.send("window-moved", { x, y }, { screenGoalX, screenGoalY });
    });

    const revealMainWindow = () => {
      const windowRef = getMainWindow();
      if (isRevealed) return;
      if (isMainWindowRevealSuppressed()) return;
      if (!didFinishLoad || !isReadyToShow || !getMainWindowRendererReady()) return;
      if (!windowRef || windowRef.isDestroyed()) return;

      isRevealed = true;
      closeSplashWindow();
      windowRef.show();
      windowRef.focus();
      if (typeof onMainWindowRevealed === "function") {
        try {
          onMainWindowRevealed(windowRef);
        } catch (_e) {}
      }
    };
    setRequestRevealMainWindow(revealMainWindow);

    if (startSuspended) {
      setMainWindowSuspendedState(mainWindow);
      mainWindow.loadURL(getSuspendedLauncherUrl())
        .catch(() => {
          mainWindow.loadFile("index.html");
        });
    } else {
      mainWindow.loadFile("index.html");
    }

    mainWindow.once("ready-to-show", () => {
      isReadyToShow = true;
      revealMainWindow();
    });

    mainWindow.webContents.on("did-finish-load", () => {
      didFinishLoad = true;
      flushPendingDeepLinks();
      try {
        mainWindow.webContents.send("window:maximized-changed", mainWindow.isMaximized());
      } catch (_e) {}
      // Optional leak diagnostics: auto-switch theme once and log renderer memory/chunk stats.
      if (String(proc.env.EMUBRO_DEBUG_THEME_LEAK || "") === "1") {
        setTimeout(() => {
          if (!mainWindow || mainWindow.isDestroyed() || !mainWindow.webContents || mainWindow.webContents.isDestroyed()) {
            return;
          }
          const diagnosticScript = `
            (() => {
              if (window.__emuBroThemeLeakDiagActive) return;
              window.__emuBroThemeLeakDiagActive = true;
              const select = document.getElementById('theme-select');
              if (!select) {
                console.log('[diag-theme-leak] theme-select missing');
                return;
              }
              const options = Array.from(select.options || []).map((opt) => String(opt.value || '').trim()).filter(Boolean);
              const current = String(select.value || '').trim();
              const next = options.find((value) => value && value !== current) || (current === 'dark' ? 'light' : 'dark');
              console.log('[diag-theme-leak] start current=' + current + ' next=' + next + ' options=' + options.join(','));
              const switchTheme = () => {
                try {
                  select.value = next;
                  select.dispatchEvent(new Event('change', { bubbles: true }));
                  console.log('[diag-theme-leak] switched theme to ' + next);
                } catch (error) {
                  console.log('[diag-theme-leak] switch failed: ' + String(error && error.message ? error.message : error));
                }
              };
              window.setTimeout(switchTheme, 2600);
              let ticks = 0;
              const maxTicks = 80;
              const interval = window.setInterval(() => {
                ticks += 1;
                try {
                  const perfMemory = performance && performance.memory ? performance.memory : null;
                  const usedHeapMb = perfMemory && Number.isFinite(perfMemory.usedJSHeapSize)
                    ? Math.round((perfMemory.usedJSHeapSize / 1024 / 1024) * 10) / 10
                    : -1;
                  const totalHeapMb = perfMemory && Number.isFinite(perfMemory.totalJSHeapSize)
                    ? Math.round((perfMemory.totalJSHeapSize / 1024 / 1024) * 10) / 10
                    : -1;
                  const chunkCount = document.querySelectorAll('.games-virtual-chunk').length;
                  const rowCount = document.querySelectorAll('.games-table tbody tr').length;
                  const cardCount = document.querySelectorAll('.game-card').length;
                  const listItemCount = document.querySelectorAll('.game-list-item').length;
                  const gameGrid = document.querySelector('main.game-grid');
                  const scrollBody = document.querySelector('.game-scroll-body');
                  const view = document.querySelector('.view-btn.active')?.dataset?.view || 'unknown';
                  const nav = document.querySelector('.navigation a.active')?.dataset?.navTarget || 'unknown';
                  const scrollTop = scrollBody ? Math.round(Number(scrollBody.scrollTop || 0)) : -1;
                  const scrollHeight = scrollBody ? Math.round(Number(scrollBody.scrollHeight || 0)) : -1;
                  const clientHeight = scrollBody ? Math.round(Number(scrollBody.clientHeight || 0)) : -1;
                  console.log(
                    '[diag-theme-leak] t=' + ticks +
                    ' nav=' + nav +
                    ' view=' + view +
                    ' theme=' + String(document.documentElement.getAttribute('data-theme') || '') +
                    ' heap=' + usedHeapMb + '/' + totalHeapMb + 'MB' +
                    ' chunks=' + chunkCount +
                    ' cards=' + cardCount +
                    ' list=' + listItemCount +
                    ' rows=' + rowCount +
                    ' scroll=' + scrollTop + '/' + scrollHeight + '/' + clientHeight +
                    ' grid=' + (gameGrid ? '1' : '0')
                  );
                } catch (error) {
                  console.log('[diag-theme-leak] tick failed: ' + String(error && error.message ? error.message : error));
                }
                if (ticks >= maxTicks) {
                  window.clearInterval(interval);
                  console.log('[diag-theme-leak] done');
                }
              }, 500);
            })();
          `;
          mainWindow.webContents.executeJavaScript(diagnosticScript).catch((error) => {
            log.warn("Failed to execute theme leak diagnostic script:", error?.message || error);
          });
        }, 1200);
      }
      revealMainWindow();
    });

    mainWindow.webContents.on("did-fail-load", () => {
      closeSplashWindow({ force: true });
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
    });

    mainWindow.on("closed", () => {
      setRequestRevealMainWindow(null);
      setMainWindowRendererReady(false);
    });

    const sendMaxState = () => {
      try {
        const windowRef = getMainWindow();
        if (windowRef && !windowRef.isDestroyed()) {
          windowRef.webContents.send("window:maximized-changed", windowRef.isMaximized());
        }
      } catch (_e) {}
    };
    mainWindow.on("maximize", sendMaxState);
    mainWindow.on("unmaximize", sendMaxState);
    mainWindow.on("restore", sendMaxState);

    return mainWindow;
  }

  function createMenu() {
    const menuTemplate = [
      {
        label: "File",
        submenu: [
          { label: "Exit", click: () => app.quit() }
        ]
      },
      {
        label: "View",
        submenu: [
          { label: "Reload", click: () => getMainWindow()?.reload() },
          { label: "Toggle DevTools", click: () => getMainWindow()?.webContents.toggleDevTools() }
        ]
      },
      {
        label: "Help",
        submenu: [
          { label: "About" }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
  }

  function flushPendingDeepLinks() {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.webContents.isLoadingMainFrame()) return;

    while (pendingDeepLinks.length > 0) {
      const payload = pendingDeepLinks.shift();
      mainWindow.webContents.send("emubro:launch", payload);
    }
  }

  function handleDeepLink(rawUrl, options = {}) {
    const payload = parseDeepLink(rawUrl);
    if (!payload) return { handled: false, payload: null, launchResult: null };

    const keepLauncherHiddenOnLaunch = !!options.keepLauncherHiddenOnLaunch;
    let launchResult = null;

    if (payload.action === "launch") {
      const game = findGameByPlatformAndCodeOrName(payload);
      if (game) {
        const launchFn = getGameLaunchHandler();
        launchResult = typeof launchFn === "function"
          ? launchFn(game)
          : { success: false, message: "Game launch service not ready" };

        if (!launchResult.success) {
          setSuppressMainWindowReveal(false);
          restoreMainWindowForForeground(getMainWindow());
          dialog.showMessageBox({
            type: "error",
            title: "emuBro",
            message: "Failed to launch game",
            detail: launchResult.message || "Unknown error"
          });
        } else if (keepLauncherHiddenOnLaunch) {
          setSuppressMainWindowReveal(true);
          hideMainWindowToBackground(getMainWindow());
        }
      } else {
        setSuppressMainWindowReveal(false);
        restoreMainWindowForForeground(getMainWindow());
        dialog.showMessageBox({
          type: "warning",
          title: "emuBro",
          message: "Game not found in library",
          detail: "Open emuBro and rescan so the game and emulator are detected, then try again."
        });
      }
    }

    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isLoadingMainFrame()) {
      pendingDeepLinks.push(payload);
      return { handled: true, payload, launchResult };
    }

    mainWindow.webContents.send("emubro:launch", payload);
    return { handled: true, payload, launchResult };
  }

  function startApplicationBootstrap(options = {}) {
    if (getAppBootstrapStarted()) return;
    setAppBootstrapStarted(true);

    try {
      refreshLibraryFromDb();
    } catch (_e) {}

    const startupDeepLink = String(options.deepLink || findDeepLinkArg(proc.argv || []) || "");
    const startupPayload = parseDeepLink(startupDeepLink);
    const keepLauncherHiddenOnLaunch = !!(startupPayload && startupPayload.action === "launch" && options.keepLauncherHiddenOnLaunch);
    setSuppressMainWindowReveal(keepLauncherHiddenOnLaunch);

    const mainWindow = createWindow({ startSuspended: keepLauncherHiddenOnLaunch });
    createMenu();

    setTimeout(() => {
      if (isMainWindowRevealSuppressed()) return;
      const windowRef = getMainWindow();
      if (windowRef && !windowRef.isDestroyed() && !windowRef.isVisible()) {
        closeSplashWindow({ force: true });
        windowRef.show();
        windowRef.focus();
      }
    }, 15000);

    try {
      if (proc.platform === "win32" && mainWindow) {
        mainWindow.setMenuBarVisibility(false);
      }
    } catch (_e) {}

    if (startupDeepLink) {
      handleDeepLink(startupDeepLink, { keepLauncherHiddenOnLaunch });
    }

    mainWindow.on("closed", () => {
      closeSplashWindow({ force: true });
      app.quit();
    });
  }

  function initLifecycle() {
    if (proc.defaultApp) {
      if ((proc.argv || []).length >= 2) {
        app.setAsDefaultProtocolClient(protocol, proc.execPath, [path.resolve(proc.argv[1])]);
      }
    } else {
      app.setAsDefaultProtocolClient(protocol);
    }

    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return;
    }

    app.on("second-instance", (_event, commandLine) => {
      const url = findDeepLinkArg(commandLine || []);
      const payload = parseDeepLink(url);
      const isLaunchShortcut = !!(payload && payload.action === "launch");
      if (url) {
        handleDeepLink(url, { keepLauncherHiddenOnLaunch: isLaunchShortcut });
      }

      const mainWindow = getMainWindow();
      if (mainWindow) {
        if (isLaunchShortcut) {
          try {
            hideMainWindowToBackground(mainWindow);
          } catch (_e) {}
          return;
        }
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });

    app.on("open-url", (event, url) => {
      event.preventDefault();
      const payload = parseDeepLink(url);
      handleDeepLink(url, { keepLauncherHiddenOnLaunch: !!(payload && payload.action === "launch") });
    });

    app.on("before-quit", () => {
      closeSplashWindow({ force: true });
    });

    app.on("window-all-closed", () => {
      closeSplashWindow({ force: true });
      if (proc.platform !== "darwin") {
        app.quit();
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    app.whenReady().then(() => {
      const startupDeepLink = findDeepLinkArg(proc.argv || []);
      const startupPayload = parseDeepLink(startupDeepLink);
      const isLaunchShortcutStartup = !!(startupPayload && startupPayload.action === "launch");
      const startSoon = () => setTimeout(() => {
        startApplicationBootstrap({
          deepLink: startupDeepLink,
          keepLauncherHiddenOnLaunch: isLaunchShortcutStartup
        });
      }, 120);

      if (isLaunchShortcutStartup) {
        closeSplashWindow({ force: true });
        startSoon();
      } else {
        const splash = createSplashWindow();
        if (splash && !splash.isDestroyed()) {
          if (splash.isVisible()) startSoon();
          else splash.once("show", startSoon);
        } else {
          startSoon();
        }
      }

      setTimeout(() => {
        startApplicationBootstrap();
      }, 1200);
    });
  }

  return {
    createWindow,
    flushPendingDeepLinks,
    handleDeepLink,
    startApplicationBootstrap,
    initLifecycle
  };
}

module.exports = {
  createAppBootstrapManager
};
