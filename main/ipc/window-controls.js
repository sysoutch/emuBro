function getLiveWindow(getMainWindow) {
  const win = typeof getMainWindow === "function" ? getMainWindow() : null;
  if (!win || win.isDestroyed()) return null;
  return win;
}

function registerWindowControlsIpc({
  ipcMain,
  getMainWindow,
  onMainWindowRendererReady
}) {
  if (!ipcMain || typeof ipcMain.handle !== "function" || typeof ipcMain.on !== "function") {
    throw new Error("registerWindowControlsIpc requires a valid ipcMain instance");
  }
  if (typeof getMainWindow !== "function") {
    throw new Error("registerWindowControlsIpc requires getMainWindow()");
  }

  // Legacy channel used by older renderer code paths.
  ipcMain.on("minimize-window", () => {
    const win = getLiveWindow(getMainWindow);
    if (win) win.minimize();
  });

  ipcMain.handle("window:minimize", () => {
    const win = getLiveWindow(getMainWindow);
    if (win) win.minimize();
    return true;
  });

  ipcMain.handle("window:toggle-maximize", () => {
    const win = getLiveWindow(getMainWindow);
    if (!win) return false;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
    return true;
  });

  ipcMain.handle("window:close", () => {
    const win = getLiveWindow(getMainWindow);
    if (win) win.close();
    return true;
  });

  ipcMain.handle("window:is-maximized", () => {
    const win = getLiveWindow(getMainWindow);
    if (!win) return false;
    return win.isMaximized();
  });

  ipcMain.handle("app:renderer-ready", (event) => {
    const win = getLiveWindow(getMainWindow);
    if (!win) return { success: false };
    if (event.sender !== win.webContents) return { success: false };
    if (typeof onMainWindowRendererReady === "function") {
      onMainWindowRendererReady(win);
    }
    return { success: true };
  });
}

module.exports = {
  registerWindowControlsIpc
};
