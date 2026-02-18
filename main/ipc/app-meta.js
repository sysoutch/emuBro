function registerAppMetaIpc(deps = {}) {
  const {
    ipcMain,
    log,
    os,
    fsSync,
    dialog,
    getMainWindow,
    getGamesState
  } = deps;

  if (!ipcMain) throw new Error("registerAppMetaIpc requires ipcMain");
  if (!log) throw new Error("registerAppMetaIpc requires log");
  if (!os) throw new Error("registerAppMetaIpc requires os");
  if (!fsSync) throw new Error("registerAppMetaIpc requires fsSync");
  if (!dialog) throw new Error("registerAppMetaIpc requires dialog");
  if (typeof getMainWindow !== "function") throw new Error("registerAppMetaIpc requires getMainWindow");
  if (typeof getGamesState !== "function") throw new Error("registerAppMetaIpc requires getGamesState");

  ipcMain.handle("get-drives", async () => {
    try {
      const drives = [];
      if (os.platform() === "win32") {
        const driveLetters = [
          "C:", "D:", "E:", "F:", "G:", "H:", "I:", "J:", "K:", "L:", "M:", "N:",
          "O:", "P:", "Q:", "R:", "S:", "T:", "U:", "V:", "W:", "X:", "Y:", "Z:"
        ];
        for (const drive of driveLetters) {
          try {
            if (fsSync.existsSync(drive)) {
              drives.push(drive);
            }
          } catch (_error) {}
        }
      } else {
        drives.push("/");
      }
      return drives;
    } catch (error) {
      log.error("Failed to get drives:", error);
      return [];
    }
  });

  ipcMain.handle("get-user-info", async () => {
    return {
      username: "Bro",
      avatar: "./logo.png",
      level: 25,
      xp: 12500,
      friends: 128
    };
  });

  ipcMain.handle("open-file-dialog", async (_event, options) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { canceled: true };
    return await dialog.showOpenDialog(mainWindow, options);
  });

  ipcMain.handle("get-library-stats", async () => {
    const games = getGamesState();
    const totalGames = games.length;
    const installedGames = games.filter((game) => game.isInstalled).length;
    const totalPlayTime = Math.floor(Math.random() * 1000) + 500;

    return {
      totalGames,
      installedGames,
      totalPlayTime,
      recentlyPlayed: [
        { id: 1, name: "Super Mario Bros 3", playTime: 45 },
        { id: 4, name: "Super Metroid", playTime: 32 },
        { id: 2, name: "The Legend of Zelda: A Link to the Past", playTime: 28 }
      ]
    };
  });
}

module.exports = {
  registerAppMetaIpc
};
