function createAppBootstrapManager(deps = {}) {
  const {
    app,
    BrowserWindow,
    Menu,
    screen,
    path,
    dialog,
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

  function createWindow() {
    const isWin = proc.platform === "win32";
    let didFinishLoad = false;
    let isReadyToShow = false;
    let isRevealed = false;

    setMainWindowRendererReady(false);
    setRequestRevealMainWindow(null);

    const mainWindow = new BrowserWindow({
      show: false,
      width: 1200,
      height: 800,
      minWidth: 1000,
      minHeight: 700,
      icon: path.join(app.getAppPath(), "icon.png"),
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
        preload: path.join(app.getAppPath(), "preload.js"),
        devTools: true
      }
    });

    setMainWindow(mainWindow);

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

    mainWindow.loadFile("index.html");

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
          dialog.showMessageBox({
            type: "error",
            title: "emuBro",
            message: "Failed to launch game",
            detail: launchResult.message || "Unknown error"
          });
        } else if (keepLauncherHiddenOnLaunch) {
          setSuppressMainWindowReveal(true);
          const win = getMainWindow();
          if (win && !win.isDestroyed()) {
            try {
              win.minimize();
            } catch (_e) {}
          }
        }
      } else {
        setSuppressMainWindowReveal(false);
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

    const mainWindow = createWindow();
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
            mainWindow.minimize();
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
