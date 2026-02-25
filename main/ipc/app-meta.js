const path = require("path");
const { spawn } = require("child_process");

function registerAppMetaIpc(deps = {}) {
  const {
    app,
    ipcMain,
    log,
    os,
    fsSync,
    dialog,
    spawnSync,
    getMainWindow,
    getGamesState
  } = deps;

  if (!ipcMain) throw new Error("registerAppMetaIpc requires ipcMain");
  if (!log) throw new Error("registerAppMetaIpc requires log");
  if (!os) throw new Error("registerAppMetaIpc requires os");
  if (!fsSync) throw new Error("registerAppMetaIpc requires fsSync");
  if (!dialog) throw new Error("registerAppMetaIpc requires dialog");
  if (typeof spawnSync !== "function") throw new Error("registerAppMetaIpc requires spawnSync");
  if (typeof getMainWindow !== "function") throw new Error("registerAppMetaIpc requires getMainWindow");
  if (typeof getGamesState !== "function") throw new Error("registerAppMetaIpc requires getGamesState");

  const ECM_REPO_URL = "https://github.com/qeedquan/ecm/tree/master";
  const ECM_SOURCE_ZIP_URL = "https://codeload.github.com/qeedquan/ecm/zip/refs/heads/master";
  const ECM_DEFAULT_FILE_NAME = "ecm-master.zip";
  const ECM_ROOT_DIR = path.join(
    app && typeof app.getPath === "function" ? app.getPath("userData") : path.join(String(os.homedir() || ""), ".emubro"),
    "tools",
    "ecm"
  );

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

  ipcMain.handle("save-file-dialog", async (_event, options) => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return { canceled: true };
    return await dialog.showSaveDialog(mainWindow, options);
  });

  async function downloadToFile(sourceUrl, targetPath) {
    const res = await fetch(sourceUrl, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: {
        "User-Agent": "emuBro"
      }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} while downloading external tool archive.`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer || new ArrayBuffer(0));
    const parentDir = path.dirname(String(targetPath || "").trim());
    if (!parentDir) throw new Error("Invalid destination path.");
    fsSync.mkdirSync(parentDir, { recursive: true });
    fsSync.writeFileSync(targetPath, buffer);
    return buffer.length;
  }

  ipcMain.handle("tools:ecm:get-download-info", async () => {
    return {
      success: true,
      repoUrl: ECM_REPO_URL,
      sourceZipUrl: ECM_SOURCE_ZIP_URL,
      defaultFileName: ECM_DEFAULT_FILE_NAME,
      license: "GPL-2.0-or-later",
      note: "Downloaded as a separate external tool archive."
    };
  });

  ipcMain.handle("tools:ecm:download-source-zip", async (_event, payload = {}) => {
    try {
      let destinationPath = String(payload?.destinationPath || "").trim();
      if (!destinationPath) {
        const ownerWindow = getMainWindow();
        const defaultDownloads = path.join(String(os.homedir() || ""), "Downloads");
        const pick = await dialog.showSaveDialog(ownerWindow || undefined, {
          title: "Save ECM/UNECM Source ZIP",
          defaultPath: path.join(defaultDownloads, ECM_DEFAULT_FILE_NAME),
          filters: [{ name: "ZIP Archive", extensions: ["zip"] }]
        });
        if (pick?.canceled || !pick?.filePath) {
          return { success: false, canceled: true, message: "Download canceled." };
        }
        destinationPath = String(pick.filePath || "").trim();
      }
      if (!destinationPath) {
        return { success: false, message: "Missing destination path." };
      }
      if (!destinationPath.toLowerCase().endsWith(".zip")) {
        destinationPath += ".zip";
      }
      const bytes = await downloadToFile(ECM_SOURCE_ZIP_URL, destinationPath);
      return {
        success: true,
        canceled: false,
        filePath: destinationPath,
        sizeBytes: bytes,
        sourceUrl: ECM_SOURCE_ZIP_URL,
        repoUrl: ECM_REPO_URL
      };
    } catch (error) {
      log.error("tools:ecm:download-source-zip failed:", error);
      return {
        success: false,
        canceled: false,
        message: String(error?.message || error || "Failed to download ECM source archive.")
      };
    }
  });

  function runCommandDetailed(command, args = [], options = {}) {
    try {
      const result = spawnSync(command, Array.isArray(args) ? args : [], {
        encoding: "utf8",
        windowsHide: true,
        cwd: String(options?.cwd || "").trim() || undefined
      });
      return {
        ok: !result.error && Number(result.status) === 0,
        status: Number(result.status),
        stdout: String(result.stdout || "").trim(),
        stderr: String(result.stderr || "").trim(),
        error: result.error ? String(result.error.message || result.error) : "",
        command,
        args: Array.isArray(args) ? args.slice() : []
      };
    } catch (error) {
      return {
        ok: false,
        status: -1,
        stdout: "",
        stderr: "",
        error: String(error?.message || error || "Unknown command error"),
        command,
        args: Array.isArray(args) ? args.slice() : []
      };
    }
  }

  function detectCommand(command, args = ["--version"]) {
    const primary = runCommandDetailed(command, args);
    if (primary.ok) {
      const versionLine = String(primary.stdout || primary.stderr || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) || "";
      return {
        name: command,
        available: true,
        version: versionLine
      };
    }

    const locator = os.platform() === "win32"
      ? runCommandDetailed("where", [command])
      : runCommandDetailed("which", [command]);
    if (locator.ok) {
      return {
        name: command,
        available: true,
        version: ""
      };
    }

    return {
      name: command,
      available: false,
      version: ""
    };
  }

  function escapeShellSingleQuotes(value = "") {
    return String(value || "").replace(/'/g, "'\"'\"'");
  }

  function detectPackageManager(command, args = ["--version"]) {
    const probe = detectCommand(command, args);
    return {
      name: command,
      available: !!probe.available,
      version: String(probe.version || "").trim()
    };
  }

  function buildCompilerInstallerOptions(params = {}) {
    const platform = String(params?.platform || os.platform()).trim().toLowerCase();
    const packageManagers = (params?.packageManagers && typeof params.packageManagers === "object")
      ? params.packageManagers
      : {};
    const options = [];

    const pushOption = (entry = {}) => {
      const id = String(entry.id || "").trim();
      if (!id) return;
      options.push({
        id,
        label: String(entry.label || id).trim(),
        description: String(entry.description || "").trim(),
        action: String(entry.action || "command").trim(),
        command: String(entry.command || "").trim(),
        url: String(entry.url || "").trim(),
        compiler: String(entry.compiler || "").trim(),
        available: entry.available !== false,
        recommended: !!entry.recommended
      });
    };

    const has = (name) => !!packageManagers?.[name]?.available;

    if (platform === "win32") {
      if (has("winget")) {
        pushOption({
          id: "winget-llvm",
          label: "LLVM (winget)",
          description: "Install clang/llvm using winget.",
          action: "command",
          command: "winget install -e --id LLVM.LLVM --accept-source-agreements --accept-package-agreements",
          compiler: "clang",
          recommended: true
        });
      }
      if (has("choco")) {
        pushOption({
          id: "choco-llvm",
          label: "LLVM (Chocolatey)",
          description: "Install clang/llvm using Chocolatey.",
          action: "command",
          command: "choco install llvm -y",
          compiler: "clang"
        });
      }
      if (has("scoop")) {
        pushOption({
          id: "scoop-llvm",
          label: "LLVM (Scoop)",
          description: "Install clang/llvm using Scoop.",
          action: "command",
          command: "scoop install llvm",
          compiler: "clang"
        });
      }
      pushOption({
        id: "download-msys2",
        label: "MSYS2 (download)",
        description: "Download MSYS2 and install mingw-w64 gcc toolchain.",
        action: "url",
        url: "https://www.msys2.org/",
        compiler: "gcc",
        recommended: options.length === 0
      });
      pushOption({
        id: "download-llvm",
        label: "LLVM releases (download)",
        description: "Open LLVM release page to download installer manually.",
        action: "url",
        url: "https://github.com/llvm/llvm-project/releases",
        compiler: "clang"
      });
    } else if (platform === "darwin") {
      pushOption({
        id: "xcode-cli-tools",
        label: "Xcode CLI Tools",
        description: "Install Apple command line developer tools (includes clang).",
        action: "command",
        command: "xcode-select --install",
        compiler: "clang",
        recommended: true
      });
      if (has("brew")) {
        pushOption({
          id: "brew-llvm",
          label: "LLVM (Homebrew)",
          description: "Install LLVM with Homebrew.",
          action: "command",
          command: "brew install llvm",
          compiler: "clang"
        });
      }
    } else {
      if (has("apt-get") || has("apt")) {
        pushOption({
          id: "apt-build-essential",
          label: "build-essential (APT)",
          description: "Install gcc/make using APT.",
          action: "command",
          command: "sudo apt update && sudo apt install -y build-essential",
          compiler: "gcc",
          recommended: true
        });
        pushOption({
          id: "apt-clang",
          label: "clang (APT)",
          description: "Install clang using APT.",
          action: "command",
          command: "sudo apt update && sudo apt install -y clang",
          compiler: "clang"
        });
      }
      if (has("dnf")) {
        pushOption({
          id: "dnf-gcc",
          label: "GCC toolchain (DNF)",
          description: "Install gcc/g++/make using DNF.",
          action: "command",
          command: "sudo dnf install -y gcc gcc-c++ make",
          compiler: "gcc",
          recommended: options.length === 0
        });
      }
      if (has("pacman")) {
        pushOption({
          id: "pacman-base-devel",
          label: "base-devel (pacman)",
          description: "Install gcc/make toolchain using pacman.",
          action: "command",
          command: "sudo pacman -S --needed base-devel",
          compiler: "gcc",
          recommended: options.length === 0
        });
      }
      if (has("zypper")) {
        pushOption({
          id: "zypper-gcc",
          label: "GCC toolchain (zypper)",
          description: "Install gcc/g++/make using zypper.",
          action: "command",
          command: "sudo zypper install -y gcc gcc-c++ make",
          compiler: "gcc",
          recommended: options.length === 0
        });
      }
      if (has("apk")) {
        pushOption({
          id: "apk-build-base",
          label: "build-base (apk)",
          description: "Install gcc/make toolchain using apk.",
          action: "command",
          command: "sudo apk add build-base",
          compiler: "gcc",
          recommended: options.length === 0
        });
      }
      if (options.length === 0) {
        pushOption({
          id: "compiler-docs",
          label: "Compiler setup guide",
          description: "Open GCC installation docs for Linux.",
          action: "url",
          url: "https://gcc.gnu.org/install/",
          compiler: "gcc",
          recommended: true
        });
      }
    }

    if (!options.some((entry) => entry.recommended) && options.length > 0) {
      options[0].recommended = true;
    }
    return options;
  }

  function runShellCommandDetailed(command, options = {}) {
    const cmd = String(command || "").trim();
    if (!cmd) {
      return {
        ok: false,
        status: 1,
        stdout: "",
        stderr: "Missing command",
        error: "",
        command: "",
        args: []
      };
    }
    if (os.platform() === "win32") {
      return runCommandDetailed("cmd.exe", ["/d", "/s", "/c", cmd], options);
    }
    const shellExe = detectCommand("bash").available ? "bash" : "sh";
    return runCommandDetailed(shellExe, ["-lc", cmd], options);
  }

  function openTerminalWithCommand(command) {
    const cmd = String(command || "").trim();
    if (!cmd || os.platform() === "win32") return false;
    const terminals = [
      { exe: "x-terminal-emulator", args: ["-e", "bash", "-lc", cmd] },
      { exe: "gnome-terminal", args: ["--", "bash", "-lc", cmd] },
      { exe: "konsole", args: ["-e", "bash", "-lc", cmd] },
      { exe: "xfce4-terminal", args: ["-e", "bash", "-lc", cmd] },
      { exe: "xterm", args: ["-e", "bash", "-lc", cmd] },
      { exe: "kitty", args: ["-e", "bash", "-lc", cmd] },
      { exe: "alacritty", args: ["-e", "bash", "-lc", cmd] }
    ];
    for (const terminal of terminals) {
      if (!detectCommand(terminal.exe).available) continue;
      try {
        const child = spawn(terminal.exe, terminal.args, {
          detached: true,
          stdio: "ignore"
        });
        child.unref();
        return true;
      } catch (_error) {}
    }
    return false;
  }

  function runCompilerInstallCommand(command) {
    const sourceCommand = String(command || "").trim();
    if (!sourceCommand) {
      return {
        ok: false,
        status: 1,
        stdout: "",
        stderr: "Missing command",
        error: "",
        command: ""
      };
    }

    if (os.platform() !== "win32" && /^\s*sudo\s+/i.test(sourceCommand)) {
      const withoutSudo = sourceCommand.replace(/^\s*sudo\s+/i, "").trim();
      if (detectCommand("pkexec").available && withoutSudo) {
        const wrapped = `pkexec sh -lc '${escapeShellSingleQuotes(withoutSudo)}'`;
        const pkResult = runShellCommandDetailed(wrapped);
        if (pkResult.ok) {
          return { ...pkResult, command: wrapped, elevation: "pkexec" };
        }
      }
    }

    return {
      ...runShellCommandDetailed(sourceCommand),
      command: sourceCommand,
      elevation: "none"
    };
  }

  function shouldSuggestManualTerminal(stderr = "") {
    const text = String(stderr || "").toLowerCase();
    return text.includes("sudo")
      || text.includes("password")
      || text.includes("permission denied")
      || text.includes("interactive");
  }

  function detectEcmBuildEnvironment() {
    const compilerCandidates = ["gcc", "clang", "cc"];
    const compilers = compilerCandidates.map((name) => detectCommand(name));
    const availableCompiler = compilers.find((entry) => entry.available) || null;
    const make = detectCommand("make");
    const unzip = detectCommand("unzip", ["-v"]);
    const tar = detectCommand("tar", ["--version"]);
    const powershell = detectCommand(
      os.platform() === "win32" ? "powershell" : "pwsh",
      ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"]
    );
    const packageManagers = {
      winget: detectPackageManager("winget"),
      choco: detectPackageManager("choco", ["-v"]),
      scoop: detectPackageManager("scoop", ["--version"]),
      brew: detectPackageManager("brew"),
      "apt-get": detectPackageManager("apt-get"),
      apt: detectPackageManager("apt"),
      dnf: detectPackageManager("dnf"),
      pacman: detectPackageManager("pacman"),
      zypper: detectPackageManager("zypper"),
      apk: detectPackageManager("apk")
    };
    const compilerInstallOptions = buildCompilerInstallerOptions({
      platform: os.platform(),
      packageManagers
    });
    const recommendedCompilerInstaller = (
      compilerInstallOptions.find((entry) => entry.recommended) || compilerInstallOptions[0] || {}
    ).id || "";
    return {
      platform: os.platform(),
      arch: os.arch(),
      compilers,
      recommendedCompiler: availableCompiler?.name || "",
      make,
      unzip,
      tar,
      powershell,
      packageManagers,
      compilerInstallOptions,
      recommendedCompilerInstaller
    };
  }

  function ensureDirExists(dirPath) {
    const target = String(dirPath || "").trim();
    if (!target) throw new Error("Missing directory path");
    fsSync.mkdirSync(target, { recursive: true });
    return target;
  }

  function findSourceDirWithEcmFiles(rootPath, maxDepth = 4) {
    const root = String(rootPath || "").trim();
    if (!root || !fsSync.existsSync(root)) return "";
    let stat = null;
    try {
      stat = fsSync.lstatSync(root);
    } catch (_error) {
      return "";
    }
    if (!stat || !stat.isDirectory()) return "";

    const hasSources = (dirPath) => {
      const ecmC = path.join(dirPath, "ecm.c");
      const unecmC = path.join(dirPath, "unecm.c");
      return fsSync.existsSync(ecmC) && fsSync.existsSync(unecmC);
    };
    if (hasSources(root)) return root;

    const queue = [{ dir: root, depth: 0 }];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      if (current.depth >= maxDepth) continue;

      let entries = [];
      try {
        entries = fsSync.readdirSync(current.dir, { withFileTypes: true });
      } catch (_error) {
        entries = [];
      }
      for (const entry of entries) {
        if (!entry || !entry.isDirectory || !entry.isDirectory()) continue;
        const name = String(entry.name || "").trim();
        if (!name || name.startsWith(".") || name === "node_modules" || name === "__pycache__") continue;
        const nextDir = path.join(current.dir, name);
        if (hasSources(nextDir)) return nextDir;
        queue.push({ dir: nextDir, depth: current.depth + 1 });
      }
    }
    return "";
  }

  function extractZipArchiveToDirectory(zipPath, destinationDir) {
    const sourceZip = String(zipPath || "").trim();
    const targetDir = String(destinationDir || "").trim();
    if (!sourceZip || !fsSync.existsSync(sourceZip)) {
      throw new Error("ZIP source file not found.");
    }
    ensureDirExists(targetDir);

    if (os.platform() === "win32") {
      const escapedSrc = sourceZip.replace(/'/g, "''");
      const escapedDst = targetDir.replace(/'/g, "''");
      const script = `Expand-Archive -LiteralPath '${escapedSrc}' -DestinationPath '${escapedDst}' -Force`;
      const res = runCommandDetailed("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);
      if (!res.ok) {
        throw new Error(res.stderr || res.error || "PowerShell Expand-Archive failed.");
      }
      return;
    }

    const unzipRes = runCommandDetailed("unzip", ["-o", sourceZip, "-d", targetDir]);
    if (unzipRes.ok) return;
    const tarRes = runCommandDetailed("tar", ["-xf", sourceZip, "-C", targetDir]);
    if (tarRes.ok) return;
    throw new Error(unzipRes.stderr || tarRes.stderr || "Failed to extract ZIP archive.");
  }

  function compileEcmBinary(compiler, sourceDir, outputDir, baseName) {
    const sourceFile = path.join(sourceDir, `${baseName}.c`);
    if (!fsSync.existsSync(sourceFile)) {
      return {
        ok: false,
        status: -1,
        stdout: "",
        stderr: "",
        error: `Missing source file: ${sourceFile}`,
        target: "",
        args: []
      };
    }
    const isWindows = os.platform() === "win32";
    const targetBinary = path.join(outputDir, `${baseName}${isWindows ? ".exe" : ""}`);
    const primaryArgs = ["-O2", "-s", "-o", targetBinary, sourceFile];
    const fallbackArgs = ["-O2", "-o", targetBinary, sourceFile];

    let result = runCommandDetailed(compiler, primaryArgs, { cwd: sourceDir });
    if (!result.ok) {
      result = runCommandDetailed(compiler, fallbackArgs, { cwd: sourceDir });
    }
    return {
      ...result,
      target: targetBinary
    };
  }

  ipcMain.handle("tools:ecm:detect-build-env", async () => {
    try {
      const env = detectEcmBuildEnvironment();
      return {
        success: true,
        environment: env
      };
    } catch (error) {
      log.error("tools:ecm:detect-build-env failed:", error);
      return {
        success: false,
        message: String(error?.message || error || "Failed to detect ECM/UNECM build environment."),
        environment: null
      };
    }
  });

  ipcMain.handle("tools:ecm:get-compiler-install-options", async () => {
    try {
      const environment = detectEcmBuildEnvironment();
      const options = Array.isArray(environment?.compilerInstallOptions)
        ? environment.compilerInstallOptions
        : [];
      const recommendedOptionId = String(environment?.recommendedCompilerInstaller || "").trim()
        || String((options.find((entry) => entry?.recommended) || options[0] || {}).id || "").trim();
      return {
        success: true,
        platform: String(environment?.platform || os.platform()),
        options,
        recommendedOptionId,
        environment
      };
    } catch (error) {
      log.error("tools:ecm:get-compiler-install-options failed:", error);
      return {
        success: false,
        message: String(error?.message || error || "Failed to get compiler install options."),
        platform: os.platform(),
        options: [],
        recommendedOptionId: "",
        environment: null
      };
    }
  });

  ipcMain.handle("tools:ecm:install-compiler", async (_event, payload = {}) => {
    try {
      const optionId = String(payload?.optionId || "").trim();
      if (!optionId) {
        return { success: false, message: "Missing compiler install option id." };
      }

      const environmentBefore = detectEcmBuildEnvironment();
      const options = Array.isArray(environmentBefore?.compilerInstallOptions)
        ? environmentBefore.compilerInstallOptions
        : [];
      const selectedOption = options.find((entry) => String(entry?.id || "").trim() === optionId);
      if (!selectedOption) {
        return { success: false, message: "Unknown compiler install option." };
      }
      const actionType = String(selectedOption.action || "command").trim().toLowerCase();
      if (actionType !== "command") {
        return {
          success: false,
          message: "Selected option is not a direct command install.",
          option: selectedOption
        };
      }
      const installCommand = String(selectedOption.command || "").trim();
      if (!installCommand) {
        return { success: false, message: "Install command missing for selected option.", option: selectedOption };
      }

      const runResult = runCompilerInstallCommand(installCommand);
      if (!runResult.ok) {
        const needsManual = shouldSuggestManualTerminal(runResult.stderr || runResult.error);
        const canOpenTerminal = needsManual && os.platform() !== "win32";
        let terminalOpened = false;
        if (canOpenTerminal && payload?.allowOpenTerminal === true) {
          terminalOpened = openTerminalWithCommand(installCommand);
        }
        return {
          success: false,
          message: String(runResult.stderr || runResult.error || "Compiler install command failed."),
          option: selectedOption,
          command: installCommand,
          stdout: String(runResult.stdout || ""),
          stderr: String(runResult.stderr || runResult.error || ""),
          status: Number(runResult.status),
          needsManual,
          terminalOpened
        };
      }

      const environmentAfter = detectEcmBuildEnvironment();
      const compilerName = String(selectedOption.compiler || "").trim().toLowerCase();
      const compilerDetected = compilerName
        ? !!(Array.isArray(environmentAfter?.compilers) && environmentAfter.compilers.some((entry) => {
          return String(entry?.name || "").trim().toLowerCase() === compilerName && !!entry?.available;
        }))
        : !!String(environmentAfter?.recommendedCompiler || "").trim();

      return {
        success: true,
        message: compilerDetected
          ? "Compiler installation finished and compiler was detected."
          : "Install command finished. Compiler detection may require reopening shell/session.",
        option: selectedOption,
        command: installCommand,
        stdout: String(runResult.stdout || ""),
        stderr: String(runResult.stderr || ""),
        status: Number(runResult.status),
        compilerDetected,
        environment: environmentAfter
      };
    } catch (error) {
      log.error("tools:ecm:install-compiler failed:", error);
      return {
        success: false,
        message: String(error?.message || error || "Failed to install compiler.")
      };
    }
  });

  ipcMain.handle("tools:ecm:build-binaries", async (_event, payload = {}) => {
    try {
      const sourcePathRaw = String(payload?.sourcePath || "").trim();
      if (!sourcePathRaw) {
        return { success: false, message: "Missing source path. Select a source folder or ZIP first." };
      }
      const sourcePath = path.resolve(sourcePathRaw);
      if (!fsSync.existsSync(sourcePath)) {
        return { success: false, message: "Source path does not exist." };
      }

      let sourceDir = "";
      let extractedFromZip = false;
      let extractedDir = "";

      const sourceStat = fsSync.lstatSync(sourcePath);
      if (sourceStat.isDirectory()) {
        sourceDir = findSourceDirWithEcmFiles(sourcePath, 5);
      } else if (sourceStat.isFile() && sourcePath.toLowerCase().endsWith(".zip")) {
        extractedFromZip = true;
        extractedDir = path.join(ECM_ROOT_DIR, "source", `${Date.now()}-${Math.floor(Math.random() * 1000)}`);
        extractZipArchiveToDirectory(sourcePath, extractedDir);
        sourceDir = findSourceDirWithEcmFiles(extractedDir, 6);
      } else {
        return { success: false, message: "Source path must be a folder or .zip archive." };
      }

      if (!sourceDir) {
        return { success: false, message: "Could not locate ecm.c and unecm.c in source path." };
      }

      const env = detectEcmBuildEnvironment();
      const requestedCompiler = String(payload?.compiler || "").trim();
      const compiler = requestedCompiler || env.recommendedCompiler || "";
      if (!compiler) {
        return {
          success: false,
          message: "No C compiler found (gcc/clang/cc). Install a compiler and try again.",
          environment: env
        };
      }

      const outputDirRaw = String(payload?.outputDir || "").trim();
      const outputDir = outputDirRaw
        ? path.resolve(outputDirRaw)
        : path.join(ECM_ROOT_DIR, "bin", `${os.platform()}-${os.arch()}`);
      ensureDirExists(outputDir);

      const buildResults = [
        compileEcmBinary(compiler, sourceDir, outputDir, "ecm"),
        compileEcmBinary(compiler, sourceDir, outputDir, "unecm")
      ];
      const failed = buildResults.filter((entry) => !entry.ok);
      if (failed.length > 0) {
        return {
          success: false,
          message: failed[0]?.stderr || failed[0]?.error || "Failed to compile ECM/UNECM binaries.",
          compiler,
          sourceDir,
          outputDir,
          extractedFromZip,
          extractedDir,
          buildResults
        };
      }

      const binaries = buildResults.map((entry) => entry.target).filter((target) => fsSync.existsSync(target));
      return {
        success: true,
        compiler,
        sourceDir,
        outputDir,
        extractedFromZip,
        extractedDir,
        binaries,
        buildResults,
        environment: env
      };
    } catch (error) {
      log.error("tools:ecm:build-binaries failed:", error);
      return {
        success: false,
        message: String(error?.message || error || "Failed to build ECM/UNECM binaries.")
      };
    }
  });

  function runWinCommand(exe, args = []) {
    try {
      const res = spawnSync(exe, args, {
        encoding: "utf8",
        windowsHide: true
      });
      if (res.error) return "";
      if (res.status !== 0) return "";
      return String(res.stdout || "").trim();
    } catch (_error) {
      return "";
    }
  }

  function parseWmicValue(outputText, key) {
    const lines = String(outputText || "").split(/\r?\n/);
    const prefix = `${String(key || "").trim()}=`;
    const hit = lines.find((line) => line.trim().toLowerCase().startsWith(prefix.toLowerCase()));
    if (!hit) return "";
    return hit.slice(prefix.length).trim();
  }

  function parseWmicValueList(outputText, key) {
    return String(outputText || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.toLowerCase().startsWith(`${String(key || "").trim().toLowerCase()}=`))
      .map((line) => line.slice(line.indexOf("=") + 1).trim())
      .filter(Boolean);
  }

  function getWindowsSystemSpecs() {
    const cpuOut = runWinCommand("wmic", ["cpu", "get", "Name", "/value"]);
    const gpuOut = runWinCommand("wmic", ["path", "win32_videocontroller", "get", "Name", "/value"]);
    const ramOut = runWinCommand("wmic", ["computersystem", "get", "TotalPhysicalMemory", "/value"]);
    const osOut = runWinCommand("wmic", ["os", "get", "Caption,Version", "/value"]);

    let cpu = parseWmicValue(cpuOut, "Name");
    let gpus = parseWmicValueList(gpuOut, "Name");
    let totalRamBytes = Number(parseWmicValue(ramOut, "TotalPhysicalMemory") || 0);
    const osCaption = parseWmicValue(osOut, "Caption");
    const osVersion = parseWmicValue(osOut, "Version");

    if (!cpu) {
      const psCpu = runWinCommand("powershell", ["-NoProfile", "-Command", "(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)"]);
      cpu = psCpu || "";
    }
    if (!gpus.length) {
      const psGpu = runWinCommand("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name"]);
      gpus = String(psGpu || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    }
    if (!Number.isFinite(totalRamBytes) || totalRamBytes <= 0) {
      totalRamBytes = Number(os.totalmem() || 0);
    }

    const ramGiB = totalRamBytes > 0 ? `${(totalRamBytes / (1024 ** 3)).toFixed(1)} GB` : "Unknown";
    const hostname = String(os.hostname() || "").trim();

    const lines = [
      `OS: ${osCaption || "Windows"}${osVersion ? ` (${osVersion})` : ""}`,
      `CPU: ${cpu || "Unknown"}`,
      `GPU: ${gpus.length ? gpus.join(" | ") : "Unknown"}`,
      `RAM: ${ramGiB}`,
      `Machine: ${hostname || "Unknown"}`
    ];

    return {
      platform: "win32",
      cpu: cpu || "Unknown",
      gpus,
      ramBytes: totalRamBytes || 0,
      ramLabel: ramGiB,
      osLabel: `${osCaption || "Windows"}${osVersion ? ` (${osVersion})` : ""}`,
      machine: hostname || "Unknown",
      text: lines.join("\n")
    };
  }

  function getGenericSystemSpecs() {
    const cpu = String(os.cpus?.()[0]?.model || "").trim() || "Unknown";
    const ramBytes = Number(os.totalmem() || 0);
    const ramLabel = ramBytes > 0 ? `${(ramBytes / (1024 ** 3)).toFixed(1)} GB` : "Unknown";
    const osLabel = `${String(os.type?.() || "Unknown")} ${String(os.release?.() || "").trim()}`.trim();
    const machine = String(os.hostname?.() || "").trim() || "Unknown";
    const lines = [
      `OS: ${osLabel}`,
      `CPU: ${cpu}`,
      "GPU: Unknown",
      `RAM: ${ramLabel}`,
      `Machine: ${machine}`
    ];
    return {
      platform: String(os.platform() || "unknown"),
      cpu,
      gpus: [],
      ramBytes,
      ramLabel,
      osLabel,
      machine,
      text: lines.join("\n")
    };
  }

  ipcMain.handle("system:get-specs", async () => {
    try {
      const specs = os.platform() === "win32" ? getWindowsSystemSpecs() : getGenericSystemSpecs();
      return { success: true, specs };
    } catch (error) {
      log.error("system:get-specs failed:", error);
      return { success: false, message: error?.message || String(error) };
    }
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
