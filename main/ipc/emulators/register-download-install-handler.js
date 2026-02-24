function registerEmulatorDownloadInstallHandler(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    dialog,
    getMainWindow,
    shell,
    path,
    fsSync,
    getLibraryPathSettings,
    ensureUniqueDestinationPath,
    movePathSafe,
    getArchiveKind,
    extractArchiveToDir,
    integrateDirectoryContents,
    removePathSafe,
    normalizePlatform,
    refreshLibraryFromDb,
    dbUpsertEmulator,
    runtimePlatform,
    normalizeDownloadOsKey,
    normalizeDownloadPackageType,
    ensureHttpUrl,
    resolveEmulatorDownloadTarget,
    getPreferredEmulatorDownloadUrl,
    buildWaybackMachineUrl,
    sanitizePathSegment,
    downloadUrlToFile,
    findEmulatorBinaryInFolder,
    inferDownloadPackageTypeFromName,
    isInstallerLikeName,
    spawn
  } = deps;

  if (!ipcMain) throw new Error("registerEmulatorDownloadInstallHandler requires ipcMain");
  if (!log) throw new Error("registerEmulatorDownloadInstallHandler requires log");
  if (!app) throw new Error("registerEmulatorDownloadInstallHandler requires app");
  if (!dialog) throw new Error("registerEmulatorDownloadInstallHandler requires dialog");
  if (typeof getMainWindow !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires getMainWindow");
  if (!shell) throw new Error("registerEmulatorDownloadInstallHandler requires shell");
  if (!path) throw new Error("registerEmulatorDownloadInstallHandler requires path");
  if (!fsSync) throw new Error("registerEmulatorDownloadInstallHandler requires fsSync");
  if (typeof getLibraryPathSettings !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires getLibraryPathSettings");
  if (typeof ensureUniqueDestinationPath !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires ensureUniqueDestinationPath");
  if (typeof movePathSafe !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires movePathSafe");
  if (typeof getArchiveKind !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires getArchiveKind");
  if (typeof extractArchiveToDir !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires extractArchiveToDir");
  if (typeof integrateDirectoryContents !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires integrateDirectoryContents");
  if (typeof removePathSafe !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires removePathSafe");
  if (typeof normalizePlatform !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires normalizePlatform");
  if (typeof refreshLibraryFromDb !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires refreshLibraryFromDb");
  if (typeof dbUpsertEmulator !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires dbUpsertEmulator");
  if (!runtimePlatform) throw new Error("registerEmulatorDownloadInstallHandler requires runtimePlatform");
  if (typeof normalizeDownloadOsKey !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires normalizeDownloadOsKey");
  if (typeof normalizeDownloadPackageType !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires normalizeDownloadPackageType");
  if (typeof ensureHttpUrl !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires ensureHttpUrl");
  if (typeof resolveEmulatorDownloadTarget !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires resolveEmulatorDownloadTarget");
  if (typeof getPreferredEmulatorDownloadUrl !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires getPreferredEmulatorDownloadUrl");
  if (typeof buildWaybackMachineUrl !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires buildWaybackMachineUrl");
  if (typeof sanitizePathSegment !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires sanitizePathSegment");
  if (typeof downloadUrlToFile !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires downloadUrlToFile");
  if (typeof findEmulatorBinaryInFolder !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires findEmulatorBinaryInFolder");
  if (typeof inferDownloadPackageTypeFromName !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires inferDownloadPackageTypeFromName");
  if (typeof isInstallerLikeName !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires isInstallerLikeName");
  if (typeof spawn !== "function") throw new Error("registerEmulatorDownloadInstallHandler requires spawn");

  function normalizeInstallMethod(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (raw === "flatpak" || raw === "apt") return raw;
    if (raw === "download") return "download";
    return "";
  }

  function buildInstallerCommand(installer = {}, method) {
    const installCommand = String(installer?.install || "").trim();
    if (installCommand) return installCommand;

    if (method === "flatpak") {
      const id = String(installer?.id || "").trim();
      if (!id) return "";
      const remote = String(installer?.remote || "flathub").trim() || "flathub";
      return `flatpak install -y ${remote} ${id}`;
    }

    if (method === "apt") {
      const packages = Array.isArray(installer?.packages)
        ? installer.packages.map((pkg) => String(pkg || "").trim()).filter(Boolean)
        : [];
      if (!packages.length) return "";
      return `sudo apt install -y ${packages.join(" ")}`;
    }

    return "";
  }

  function runShellCommand(command, osKey) {
    return new Promise((resolve) => {
      if (!command) {
        resolve({ success: false, code: 1, stdout: "", stderr: "Missing command" });
        return;
      }
      const useWin = osKey === "windows";
      const exec = useWin ? "cmd.exe" : "bash";
      const args = useWin ? ["/d", "/s", "/c", command] : ["-lc", command];
      const child = spawn(exec, args, { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      if (child.stdout) child.stdout.on("data", (data) => { stdout += data.toString(); });
      if (child.stderr) child.stderr.on("data", (data) => { stderr += data.toString(); });
      child.on("close", (code) => {
        resolve({ success: code === 0, code, stdout, stderr });
      });
      child.on("error", (error) => {
        resolve({ success: false, code: 1, stdout, stderr: error?.message || String(error) });
      });
    });
  }

  function isSudoFailure(stderr = "") {
    const text = String(stderr || "").toLowerCase();
    return text.includes("sudo") || text.includes("password");
  }

  async function openTerminalWithCommand(command) {
    const candidates = [
      { cmd: "x-terminal-emulator", args: ["-e", "bash", "-lc", command] },
      { cmd: "gnome-terminal", args: ["--", "bash", "-lc", command] },
      { cmd: "konsole", args: ["-e", "bash", "-lc", command] },
      { cmd: "xfce4-terminal", args: ["-e", "bash", "-lc", command] },
      { cmd: "xterm", args: ["-e", "bash", "-lc", command] },
      { cmd: "alacritty", args: ["-e", "bash", "-lc", command] },
      { cmd: "kitty", args: ["-e", "bash", "-lc", command] }
    ];

    for (const candidate of candidates) {
      const result = await new Promise((resolve) => {
        try {
          const child = spawn(candidate.cmd, candidate.args, { stdio: "ignore" });
          let settled = false;
          child.on("error", () => {
            if (settled) return;
            settled = true;
            resolve(false);
          });
          setTimeout(() => {
            if (settled) return;
            settled = true;
            resolve(true);
          }, 200);
        } catch (_e) {
          resolve(false);
        }
      });
      if (result) return true;
    }
    return false;
  }

  async function promptRedownloadWhenCached(filePath, displayName, emulatorName) {
    try {
      const ownerWindow = getMainWindow();
      const result = await dialog.showMessageBox(ownerWindow, {
        type: "question",
        buttons: ["Cancel", "Re-download"],
        defaultId: 1,
        cancelId: 0,
        noLink: true,
        title: "Package Already Downloaded",
        message: `A downloaded package already exists for ${emulatorName}.`,
        detail: `File: ${displayName}\nPath: ${filePath}\n\nDo you want to re-download and replace this cached file?`
      });
      return result && result.response === 1;
    } catch (error) {
      log.warn("promptRedownloadWhenCached failed, defaulting to re-download:", error);
      return true;
    }
  }

  async function downloadInstallEmulator(payload = {}) {
    try {
      const emulator = (payload && typeof payload === "object") ? payload : {};
      const name = String(emulator?.name || "").trim();
      const platformName = String(emulator?.platform || "").trim() || "Unknown";
      const platformShortName = normalizePlatform(emulator?.platformShortName) || "unknown";
      if (!name) return { success: false, message: "Missing emulator name" };

      const osKey = normalizeDownloadOsKey(payload?.os || runtimePlatform);
      const installMethod = normalizeInstallMethod(payload?.installMethod || "");

      if ((installMethod === "flatpak" || installMethod === "apt") && osKey === "linux") {
        const installers = (payload?.installers && typeof payload.installers === "object") ? payload.installers : {};
        const linuxInstallers = (installers?.linux && typeof installers.linux === "object") ? installers.linux : {};
        const installer = linuxInstallers?.[installMethod] || null;
        const command = buildInstallerCommand(installer, installMethod);
        if (!command) {
          return { success: false, message: `No ${installMethod} installer command configured for this emulator.` };
        }

        const res = await runShellCommand(command, osKey);
        if (!res.success) {
          if (installMethod === "apt" && isSudoFailure(res.stderr)) {
            const ownerWindow = getMainWindow();
            const prompt = await dialog.showMessageBox(ownerWindow, {
              type: "question",
              buttons: ["Cancel", "Open Terminal"],
              defaultId: 1,
              cancelId: 0,
              noLink: true,
              title: "Permission Required",
              message: "APT install requires admin privileges.",
              detail: `Command:\n${command}`
            });
            if (prompt.response === 1) {
              const opened = await openTerminalWithCommand(command);
              return {
                success: !!opened,
                message: opened
                  ? "Opened a terminal to complete the install."
                  : "Failed to open terminal. Run the command manually.",
                command
              };
            }
          }
          return {
            success: false,
            message: `Failed to run ${installMethod} installer.`,
            stderr: res.stderr || "",
            stdout: res.stdout || ""
          };
        }

        return {
          success: true,
          installed: false,
          installedBy: installMethod,
          message: `Installer finished. Rescan emulators if the binary was not detected automatically.`,
          command
        };
      }

      const useWaybackFallback = !!payload?.useWaybackFallback;
      if (useWaybackFallback) {
        const waybackSourceUrl = ensureHttpUrl(
          payload?.waybackSourceUrl
          || payload?.manualUrl
          || getPreferredEmulatorDownloadUrl(emulator, osKey)
        );
        const waybackUrl = ensureHttpUrl(payload?.waybackUrl || buildWaybackMachineUrl(waybackSourceUrl));
        if (!waybackUrl) {
          return { success: false, message: "No fallback source URL available for Wayback Machine." };
        }
        await shell.openExternal(waybackUrl);
        return {
          success: false,
          manual: true,
          wayback: true,
          message: "Opened Wayback Machine fallback for this emulator.",
          openedUrl: waybackUrl
        };
      }

      const requestedPackageType = normalizeDownloadPackageType(payload?.packageType || "");
      const resolved = await resolveEmulatorDownloadTarget(emulator, osKey, requestedPackageType);
      if (!resolved?.url) {
        return { success: false, message: "No download source found for this emulator" };
      }

      if (!resolved.directDownload) {
        await shell.openExternal(resolved.url);
        return {
          success: false,
          manual: true,
          message: "No direct package found. Opened the download page in your browser.",
          openedUrl: resolved.url
        };
      }

      const selectedPackageType = normalizeDownloadPackageType(resolved?.packageType || requestedPackageType);

      const settings = getLibraryPathSettings();
      const preferredRoot = String(payload?.targetDir || "").trim();
      const baseInstallRoot = preferredRoot
        || (Array.isArray(settings?.emulatorFolders) && settings.emulatorFolders[0])
        || path.join(app.getPath("userData"), "library-storage", "emulators");
      const platformDir = path.join(baseInstallRoot, sanitizePathSegment(platformShortName));
      const emulatorDir = path.join(platformDir, sanitizePathSegment(name));
      fsSync.mkdirSync(emulatorDir, { recursive: true });

      const downloadCacheDir = path.join(app.getPath("userData"), "download-cache", "emulators");
      fsSync.mkdirSync(downloadCacheDir, { recursive: true });

      const urlFileName = (() => {
        try {
          const parsed = new URL(resolved.url);
          return decodeURIComponent(path.basename(parsed.pathname || ""));
        } catch (_e) {
          return "";
        }
      })();

      const suggestedName = String(resolved.fileName || urlFileName || `${sanitizePathSegment(name)}-${Date.now()}`).trim();
      const safeSuggestedName = path.basename(suggestedName);
      const initialDownloadPath = path.join(downloadCacheDir, safeSuggestedName);
      if (fsSync.existsSync(initialDownloadPath)) {
        const shouldRedownload = await promptRedownloadWhenCached(initialDownloadPath, safeSuggestedName, name);
        if (!shouldRedownload) {
          return {
            success: false,
            canceled: true,
            message: "Download canceled. Existing cached package was kept.",
            packagePath: initialDownloadPath
          };
        }
        removePathSafe(initialDownloadPath);
      }
      const downloadMeta = await downloadUrlToFile(resolved.url, initialDownloadPath);
      const finalName = String(downloadMeta?.fileNameFromHeader || path.basename(initialDownloadPath)).trim();
      const safeFinalName = path.basename(finalName);
      let finalDownloadPath = initialDownloadPath;
      if (safeFinalName && safeFinalName !== path.basename(initialDownloadPath)) {
        const headerNamedPath = path.join(downloadCacheDir, safeFinalName);
        if (fsSync.existsSync(headerNamedPath)) {
          const shouldRedownload = await promptRedownloadWhenCached(headerNamedPath, safeFinalName, name);
          if (!shouldRedownload) {
            removePathSafe(initialDownloadPath);
            return {
              success: false,
              canceled: true,
              message: "Download canceled. Existing cached package was kept.",
              packagePath: headerNamedPath
            };
          }
          removePathSafe(headerNamedPath);
        }
        movePathSafe(initialDownloadPath, headerNamedPath);
        finalDownloadPath = headerNamedPath;
      }

      const archiveKind = getArchiveKind(finalDownloadPath);
      let installedPath = "";
      let packagePath = "";

      if (archiveKind) {
        const extractRoot = ensureUniqueDestinationPath(
          path.join(downloadCacheDir, `${sanitizePathSegment(name)}-extract`)
        );
        fsSync.mkdirSync(extractRoot, { recursive: true });
        await extractArchiveToDir(finalDownloadPath, extractRoot);

        const ctx = {
          policy: "",
          operationLabel: "Install Emulator Package",
          discardSkippedSources: true,
          cancelled: false,
          stats: { moved: 0, replaced: 0, keptBoth: 0, skipped: 0, conflicts: 0 }
        };
        const integrated = await integrateDirectoryContents(extractRoot, emulatorDir, ctx);
        removePathSafe(extractRoot);

        if (!integrated || ctx.cancelled) {
          return {
            success: false,
            canceled: true,
            message: "Installation canceled during conflict resolution.",
            installDir: emulatorDir,
            stats: ctx.stats
          };
        }

        packagePath = emulatorDir;
        installedPath = findEmulatorBinaryInFolder(emulatorDir, emulator?.searchString, osKey);
      } else {
        const destination = ensureUniqueDestinationPath(path.join(emulatorDir, path.basename(finalDownloadPath)));
        movePathSafe(finalDownloadPath, destination);
        packagePath = destination;
        installedPath = findEmulatorBinaryInFolder(emulatorDir, emulator?.searchString, osKey) || destination;
      }

      const installedFileName = path.basename(installedPath || "");
      const detectedInstalledType = normalizeDownloadPackageType(
        inferDownloadPackageTypeFromName(installedFileName || path.basename(packagePath || ""), osKey)
      );
      const installerOnly = (detectedInstalledType === "installer")
        || (!installedPath && selectedPackageType === "installer")
        || (installedFileName ? isInstallerLikeName(installedFileName) : false);
      if (installedPath && !installerOnly) {
        dbUpsertEmulator({
          name,
          platform: platformName,
          platformShortName,
          filePath: installedPath
        });
        refreshLibraryFromDb();
      }

      if (!installedPath || installerOnly) {
        const message = installerOnly
          ? `Downloaded installer to ${packagePath}. Run it once, then rescan emulators.`
          : `Downloaded package to ${packagePath}. Could not auto-detect the emulator executable yet.`;
        return {
          success: true,
          installed: false,
          packagePath,
          installDir: emulatorDir,
          packageType: selectedPackageType || detectedInstalledType || "",
          message
        };
      }

      return {
        success: true,
        installed: true,
        installedPath,
        packagePath,
        installDir: emulatorDir,
        packageType: selectedPackageType || detectedInstalledType || "",
        message: `Downloaded and installed ${name}.`
      };
    } catch (error) {
      log.error("download-install-emulator failed:", error);
      return { success: false, message: error.message };
    }
  }

  ipcMain.handle("download-install-emulator", async (_event, payload = {}) => {
    return await downloadInstallEmulator(payload || {});
  });

  return {
    downloadInstallEmulator
  };
}

module.exports = {
  registerEmulatorDownloadInstallHandler
};
