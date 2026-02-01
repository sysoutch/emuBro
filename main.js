const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store');
const fs = require('fs').promises;
const fsSync = require('fs');
const os = require('os');
const { emit } = require('process');

// Initialize the store for app settings
const store = new Store();

let mainWindow;
let games = [];
let emulators = [];
const screen = require('electron').screen;

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      devTools: true
    }
  });
  const primaryDisplay = screen.getPrimaryDisplay();

  mainWindow.on('move', () => {
    const [x, y] = mainWindow.getPosition();
    const [screenGoalX, screenGoalY] = [primaryDisplay.bounds.width / 2, primaryDisplay.bounds.height / 2];
    mainWindow.webContents.send('window-moved', { x, y }, { screenGoalX, screenGoalY });
  });

  // Load the main HTML file
  mainWindow.loadFile('index.html');

  // Open DevTools
  // mainWindow.webContents.openDevTools();

  return mainWindow;
}

// Listen for the minimize event from the renderer
ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

// Get available drives on the system
ipcMain.handle('get-drives', async () => {
  try {
    const homeDir = os.homedir();
    const drives = [];
    
    // Get platform-specific drives
    if (os.platform() === 'win32') {
      // For Windows, get all drives
      const driveLetters = ['C:', 'D:', 'E:', 'F:', 'G:', 'H:', 'I:', 'J:', 'K:', 'L:', 'M:', 'N:', 'O:', 'P:', 'Q:', 'R:', 'S:', 'T:', 'U:', 'V:', 'W:', 'X:', 'Y:', 'Z:'];
      for (const drive of driveLetters) {
        try {
          if (fsSync.existsSync(drive)) {
            drives.push(drive);
          }
        } catch (error) {
          // Skip drives that can't be accessed
        }
      }
    } else {
      // For Unix-like systems, use root directory as the only drive
      drives.push('/');
    }
    
    return drives;
  } catch (error) {
    log.error('Failed to get drives:', error);
    return [];
  }
});

// Create the application menu
function createMenu() {
  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        { label: 'Exit', click: () => app.quit() }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', click: () => mainWindow.reload() },
        { label: 'Toggle DevTools', click: () => mainWindow.webContents.toggleDevTools() }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'About' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

// Initialize the application
app.whenReady().then(() => {
  const mainWindow = createWindow();
  createMenu();

  // Handle window close
  mainWindow.on('closed', () => {
    app.quit();
  });
});

// Handle app quit
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Check if a path is a file or directory
ipcMain.handle('check-path-type', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return {
      isDirectory: stats.isDirectory(),
      path: filePath
    };
  } catch (error) {
    log.error('Failed to check path type:', error);
    return { isDirectory: false, path: filePath };
  }
});

// Process a dropped emulator executable file
ipcMain.handle('process-emulator-exe', async (event, filePath) => {
  try {
    log.info('Processing dropped emulator exe:', filePath);
    
    const platformConfigs = await getPlatformConfigs();
    const fileName = path.basename(filePath);
    
    // Use the existing processEmulatorExe function
    processEmulatorExe(filePath, fileName, platformConfigs, emulators, []);
    
    return {
      success: true,
      message: `Emulator ${fileName} processed successfully`
    };
  } catch (error) {
    log.error('Failed to process emulator exe:', error);
    return {
      success: false,
      message: error.message
    };
  }
});

// IPC handlers
ipcMain.handle('get-games', async () => {
  return games;
});

ipcMain.handle('get-game-details', async (event, gameId) => {
  const game = games.find(g => g.id === gameId);
  return game || null;
});

ipcMain.handle('remove-game', async (event, gameId) => {
  try {
    const game = games.find(g => g.id === gameId);
    if (game) {
      game.isInstalled = false;
      game.progress = 0;
      log.info(`Game ${game.name} removed`);
      return { success: true, message: "Removal started successfully" };
    }
    return { success: false, message: "Game not found" };
  } catch (error) {
    log.error(`Failed to remove game ${gameId}:`, error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('launch-game', async (event, gameId) => {
  try {
    const game = games.find(g => g.id === gameId);
    if (game) {
      console.log('(handle) Launching game with ID:', gameId);
      const gamePath = game.filePath;
      const emuPath = emulators.find(emu => emu.platformShortName === game.platformShortName)?.filePath;
      if (!emuPath) {
        log.error(`No emulator found for platform ${game.platformShortName}`);
        return { success: false, message: "Emulator not found for this game" };
      }
      if (!fsSync.existsSync(emuPath)) {
        log.error(`Emulator executable not found at path: ${emuPath}`);
        return { success: false, message: "Emulator executable not found" };
      }
      if (!fsSync.existsSync(gamePath)) {
        log.error(`Game file not found at path: ${gamePath}`);
        return { success: false, message: "Game file not found" };
      }
      // Launch the game executable
      const { exec } = require('child_process');
      const escapedEmuPath = `"${emuPath}"`;
      const escapedGamePath = `"${gamePath}"`;
      exec(`${escapedEmuPath} ${escapedGamePath}`, (error, stdout, stderr) => {
        if (error) {
          log.error(`Error launching game ${game.name}:`, error);
          return { success: false, message: "Failed to execute launch command" };
        }
        log.info(`Game ${game.name} launched successfully`);
        if (mainWindow) {
          log.info('restore main window from minimized state after game stopped');
          mainWindow.restore();
        }
      });
      if (mainWindow) {
        log.info('Minimizing main window after game launch');
        mainWindow.minimize();
      }
      return { success: true, message: "Game launched successfully" };
    }
    return { success: false, message: "Game not found" };
  } catch (error) {
    log.error(`Failed to launch game ${gameId}:`, error);
    mainWindow.restore();
    return { success: false, message: error.message };
  }
});

ipcMain.handle('get-emulators', async () => {
  return emulators;
});

ipcMain.handle('browse-games-and-emus', async (event, selectedDrive) => {
  try {
    log.info('Starting game search');
    const platformConfigs = await getPlatformConfigs();
    let foundPlatforms = [];
    let foundGames = [];
    let foundEmulators = [];
    
    // load more folders to skip from ignore-folders.json
    const ignoreFoldersPath = path.join(__dirname, './emubro-resources', 'ignore-folders.json');
    let ignoreFolders = [];
    try {
      const ignoreData = await fs.readFile(ignoreFoldersPath, 'utf8');
      const ignoreJson = JSON.parse(ignoreData);
      ignoreFolders = ignoreJson['ignore-folders'] || [];
    } catch (ignoreErr) {
      log.warn('Failed to read ignore-folders.json:', ignoreErr.message);
    }

    const systemDirs = [
      process.env.WINDIR, 
      process.env.APPDATA, 
      process.env['PROGRAMFILES'], 
      process.env['PROGRAMFILES(X86)'], 
      process.env.LOCALAPPDATA,
      'C:\\System Volume Information',
      'C:\\$Recycle.Bin',
      'C:\\Config.Msi'
    ];

    async function scanDirectory(dir, depth = 0) {
      try {
        if (!fsSync.existsSync(dir)) return;

        // log.info(`Scanning directory: ${dir}`);
        
        // 2. Wrap readdir in a catch to handle "Access Denied" folders
        const items = await fs.readdir(dir).catch(() => []);

        for (const item of items) {
          const itemPath = path.join(dir, item);

          // 3. INNER TRY/CATCH: This is the most important part.
          // It prevents one bad file from killing the entire scan.
          try {
            // Use lstat so we don't follow Windows Junctions/Symlinks
            const stat = await fs.lstat(itemPath);

            if (item.startsWith('.') || stat.isSymbolicLink()) {
              continue;
            }

            if (stat.isDirectory()) {
              if (item.startsWith('$')) {
                continue;
              }

              if (ignoreFolders.some(folder => item.toLowerCase() === folder.toLowerCase())) {
                continue;
              }
              // --- Windows System Filters ---
              if (os.platform() === 'win32') {
                if (systemDirs.some(sysDir => sysDir && itemPath.toLowerCase().startsWith(sysDir.toLowerCase()))) {
                  continue;
                }
              }

              // --- Recursively scan with incremented depth ---
              await scanDirectory(itemPath, depth + 1);

            } else if (stat.isFile()) {
              // --- Your Game/Emulator Identification Logic ---
              const platformConfig = determinePlatformFromFilename(item, itemPath, platformConfigs);
              if (platformConfig) {
                let game = {
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  name: path.basename(item, path.extname(item)),
                  platform: platformConfig.name || "Unknown",
                  platformShortName: platformConfig.shortName || "unknown",
                  filePath: itemPath,
                };
                games.push(game);
                foundGames.push(game);
                if (!foundPlatforms.includes(game.platformShortName)) {
                  log.info(`Found new platform ${game.platform} shortName ${game.platformShortName}`);
                  foundPlatforms.push(game.platformShortName);
                }
              }
              
              if (itemPath.endsWith('.exe')) {
                processEmulatorExe(itemPath, item, platformConfigs, emulators, foundEmulators);
              }

              // check for emulator archive file matches (e.g., .zip files containing emulators)
              for (const config of platformConfigs) {
                if (config.emulators) {
                  for (const emulator of config.emulators) {
                    if (!emulator.archiveFileMatchWin || !emulator.archiveFileMatchWin.trim()) continue;
                    try {
                      const regex = new RegExp(emulator.archiveFileMatchWin, 'i');
                      if (regex.test(item)) {
                        const emulatorInArchive = emulator.name || "Unknown Emulator";
                        log.info(`Emulator archive matched: ${itemPath} for emulator ${emulatorInArchive} of platform ${config.name}`);
                      }
                    } catch (error) {
                      log.warn(`Invalid regex pattern for emulator ${emulator.name}:`, error.message);
                    }
                  }
                }
              }
            }
          } catch (fileErr) {
            // Silently skip files we can't read (like DumpStack.log)
            continue; 
          }
        }
      } catch (error) {
        log.warn(`Critical failure scanning ${dir}:`, error.message);
      }
    }
    
    // If no drive selected, scan the entire system (limited to user's home directory for safety)
    if (!selectedDrive) {
      const homeDir = os.homedir();
      log.info('Scanning home directory:', homeDir);
      await scanDirectory(homeDir);
    } else {
      // Ensure Windows drive letters have a trailing slash
      let drivePath = selectedDrive;
      if (os.platform() === 'win32' && drivePath.length === 2 && drivePath.endsWith(':')) {
        drivePath += '\\';
      }
      log.info('Scanning selected drive:', drivePath);
      await scanDirectory(drivePath);
    }

    log.info(`Game search completed. Found ${foundGames.length} games and ${foundEmulators.length} emulators.`);
    return { success: true, platforms: foundPlatforms, games: foundGames, emulators: foundEmulators };
  } catch (error) {
    log.error('Failed to search for games and emulators:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('upload-theme', async (event, { author, name, themeObject, base64Image, webhookUrl }) => {
    if (!webhookUrl) {
        log.error("Upload failed: No webhook URL provided.");
        return false;
    }
    const formData = new FormData();

    // Ensure the author field is set in the theme object
    themeObject.author = author;

    // 1. Thread Metadata
    const payload = {
        content: `New theme submission: **${name}** by user **${author}**`,
        thread_name: name,
    };
    formData.append("payload_json", JSON.stringify(payload));

    // 2. Attach theme.json
    const jsonBlob = new Blob([JSON.stringify(themeObject, null, 2)], { type: 'application/json' });
    formData.append("files[0]", jsonBlob, "theme.json");

    // 3. Robust Image/GIF Conversion
    try {
        let imageData;
        let mimeType = 'image/png'; // Default
        let extension = 'png';

        if (base64Image.includes(';base64,')) {
            // It's a full Data URL (e.g., data:image/gif;base64,...)
            const parts = base64Image.split(';base64,');
            mimeType = parts[0].split(':')[1];
            imageData = parts[1];
            extension = mimeType.split('/')[1];
        } else {
            // It's already raw Base64 data
            imageData = base64Image;
            // Attempt to guess extension or keep default
            extension = 'gif'; 
            mimeType = 'image/gif';
        }

        if (!imageData) {
            throw new Error("Base64 data is empty or invalid.");
        }

        // Use the filename from the themeObject if it exists, otherwise use preview
        const imageFileName = (themeObject.background && themeObject.background.image) 
            ? themeObject.background.image 
            : `preview.${extension}`;

        // The Fix: Convert the cleaned string to a Buffer
        const imageBuffer = Buffer.from(imageData, 'base64');
        const imageBlob = new Blob([imageBuffer], { type: mimeType });
        
        formData.append("files[1]", imageBlob, imageFileName);
        console.log(`Successfully prepared ${imageFileName} for upload.`);

    } catch (err) {
        console.error("Image conversion failed:", err.message);
        // We can still return true if the JSON part is okay, or false to stop
    }

    try {
        const response = await fetch(webhookUrl, { method: 'POST', body: formData });
        return response.ok;
    } catch (error) {
        console.error("Webhook Error:", error);
        return false;
    }
});

// Function to read all platform configuration files
async function getPlatformConfigs() {
  const platformConfigs = [];
  const platformsDir = path.join(__dirname, './emubro-resources', 'platforms');
  
  try {
    const platformDirs = await fs.readdir(platformsDir);
    
    for (const platformDir of platformDirs) {
      const configPath = path.join(platformsDir, platformDir, 'config.json');
      
      try {
        if (fsSync.existsSync(configPath)) {
          const configFile = await fs.readFile(configPath, 'utf8');
          const config = JSON.parse(configFile);
          // Add platform directory name for reference
          config.platformDir = platformDir;
          platformConfigs.push(config);
        }
      } catch (error) {
        log.warn(`Failed to read config file for platform ${platformDir}:`, error.message);
      }
    }
  } catch (error) {
    log.error('Failed to read platform configurations:', error);
  }
  
  return platformConfigs;
}

function determinePlatformFromFilename(filename, filePath, platformConfigs) {
  for (const config of platformConfigs) {
    if (config.searchFor) {
      if (!config.searchFor || !config.searchFor.trim()) continue;
      try {
        const regex = new RegExp(config.searchFor, 'i');
        if (regex.test(filename)) {
          return config;
        }
      } catch (error) {
        log.warn(`Invalid regex pattern for platform ${config.name}:`, error.message);
      }
    }
  }
  return null;
}

function determinePlatformFromFilenameEmus(filename, filePath, platformConfigs) {
  for (const config of platformConfigs) {
    if (config.emulators) {
      for (const emulator of config.emulators) {
        if (!emulator.searchString || !emulator.searchString.trim()) continue;
        try {
          const regex = new RegExp(emulator.searchString, 'i');
          if (regex.test(filename)) {
            return config;
          }
        } catch (error) {
          log.warn(`Invalid regex pattern for platform ${config.name}:`, error.message);
        }
      }
    }
  }
  return null;
}

function processEmulatorExe(itemPath, item, platformConfigs, emulators, foundEmulators) {
  const platformConfigEmus = determinePlatformFromFilenameEmus(item, itemPath, platformConfigs);
  if (platformConfigEmus) {
    const emulator = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: path.basename(item, path.extname(item)),
      platform: platformConfigEmus.name || "Unknown",
      platformShortName: platformConfigEmus.shortName || "unknown",
      filePath: itemPath
    };
    log.info(`Emulator found: ${emulator.name} for platform ${emulator.platform} shortName ${emulator.platformShortName} at ${emulator.filePath}`);
    emulators.push(emulator);
    foundEmulators.push(emulator);
  }
}

ipcMain.handle('get-user-info', async () => {
  return {
    username: "Bro",
    avatar: "./logo.png",
    level: 25,
    xp: 12500,
    friends: 128
  };
});

ipcMain.handle('get-library-stats', async () => {
  const totalGames = games.length;
  const installedGames = games.filter(game => game.isInstalled).length;
  const totalPlayTime = Math.floor(Math.random() * 1000) + 500; // Random play time between 500-1500 hours
  
  return {
    totalGames,
    installedGames,
    totalPlayTime,
    recentlyPlayed: [
      { id: 1, name: 'Super Mario Bros 3', playTime: 45 },
      { id: 4, name: 'Super Metroid', playTime: 32 },
      { id: 2, name: 'The Legend of Zelda: A Link to the Past', playTime: 28 }
    ]
  };
});

// Handle app quit
app.on('before-quit', () => {
  log.info('Application is quitting');
});

// Memory card reader functionality
ipcMain.handle('read-memory-card', async (event, cardPath) => {
  try {
    log.info('Reading memory card from:', cardPath);
    
    // Check if file exists
    if (!fsSync.existsSync(cardPath)) {
      return { success: false, message: "Memory card file not found" };
    }
    
    // Read the file
    const data = await fs.readFile(cardPath, 'utf8');
    
    // Parse memory card data (assuming it's JSON format)
    let memoryCardData;
    try {
      memoryCardData = JSON.parse(data);
    } catch (parseError) {
      log.warn('Memory card data is not valid JSON, treating as raw data');
      memoryCardData = { raw: data };
    }
    
    log.info('Memory card read successfully');
    return { success: true, data: memoryCardData };
  } catch (error) {
    log.error('Failed to read memory card:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('browse-memory-cards', async (event, selectedDrive) => {
    log.info('Starting memory card search');
});
