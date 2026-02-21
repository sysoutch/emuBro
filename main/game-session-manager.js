const path = require("path");
const { spawnSync } = require("child_process");

function createGameSessionManager(deps = {}) {
  const {
    app,
    fsSync,
    log,
    getMainWindow,
    getRuntimeDataRules
  } = deps;

  if (!app) throw new Error("createGameSessionManager requires app");
  if (!fsSync) throw new Error("createGameSessionManager requires fsSync");
  if (!log) throw new Error("createGameSessionManager requires log");
  if (typeof getMainWindow !== "function") throw new Error("createGameSessionManager requires getMainWindow");
  if (typeof getRuntimeDataRules !== "function") throw new Error("createGameSessionManager requires getRuntimeDataRules");

  let activeSession = null;

  function sanitizePathSegment(value) {
    return String(value || "")
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
      .replace(/\s+/g, " ")
      .slice(0, 80)
      .trim()
      .replace(/[. ]+$/g, "")
      || "item";
  }

  function ensureDir(dirPath) {
    const target = String(dirPath || "").trim();
    if (!target) return;
    fsSync.mkdirSync(target, { recursive: true });
  }

  function uniquePaths(values) {
    const out = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((entry) => {
      const value = String(entry || "").trim();
      if (!value) return;
      const key = value.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(value);
    });
    return out;
  }

  function normalizeDirTag(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  function normalizeFileExtension(value) {
    let ext = String(value || "").trim().toLowerCase();
    if (!ext) return "";
    if (!ext.startsWith(".")) ext = `.${ext}`;
    return ext.replace(/\s+/g, "");
  }

  function normalizeRuleValueList(values = []) {
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

  function compileRuntimeRules(source = {}) {
    const directoryTags = new Set(
      normalizeRuleValueList(source.directoryNames).map((name) => normalizeDirTag(name)).filter(Boolean)
    );
    const fileExtensions = new Set(
      normalizeRuleValueList(source.fileExtensions).map((ext) => normalizeFileExtension(ext)).filter(Boolean)
    );
    const fileNameIncludes = normalizeRuleValueList(source.fileNameIncludes);

    return {
      directoryTags,
      fileExtensions,
      fileNameIncludes
    };
  }

  function getCompiledRuntimeRules() {
    let source = {};
    try {
      source = getRuntimeDataRules() || {};
    } catch (error) {
      log.warn("runtime-data rules read failed:", error?.message || error);
      source = {};
    }
    return compileRuntimeRules(source);
  }

  function shouldCopyRuntimeDirectory(name, compiledRules) {
    const rules = compiledRules || getCompiledRuntimeRules();
    const tag = normalizeDirTag(name);
    if (!tag) return false;
    return rules.directoryTags.has(tag);
  }

  function shouldCopyRuntimeFile(fileName, compiledRules) {
    const rules = compiledRules || getCompiledRuntimeRules();
    const name = String(fileName || "").trim();
    if (!name) return false;
    const lower = name.toLowerCase();
    const ext = normalizeFileExtension(path.extname(lower));
    if (ext && rules.fileExtensions.has(ext)) return true;
    if (Array.isArray(rules.fileNameIncludes) && rules.fileNameIncludes.some((token) => token && lower.includes(token))) {
      return true;
    }
    return false;
  }

  function copyFileWithMeta(sourcePath, targetPath, stats) {
    const source = String(sourcePath || "").trim();
    const target = String(targetPath || "").trim();
    if (!source || !target) return;

    try {
      const sourceStat = fsSync.statSync(source);
      let skip = false;
      if (fsSync.existsSync(target)) {
        const targetStat = fsSync.statSync(target);
        const sameSize = Number(sourceStat.size) === Number(targetStat.size);
        const sourceTime = Number(sourceStat.mtimeMs || 0);
        const targetTime = Number(targetStat.mtimeMs || 0);
        if (sameSize && sourceTime <= targetTime) {
          skip = true;
        }
      }
      if (skip) {
        stats.skipped += 1;
        return;
      }

      ensureDir(path.dirname(target));
      fsSync.copyFileSync(source, target);
      try {
        fsSync.utimesSync(target, sourceStat.atime, sourceStat.mtime);
      } catch (_e) {}
      stats.copied += 1;
    } catch (error) {
      stats.errors += 1;
      log.warn("runtime-data copy file failed:", source, "->", target, error?.message || error);
    }
  }

  function copyDirectoryRecursive(sourceDir, targetDir, stats) {
    let entries = [];
    try {
      entries = fsSync.readdirSync(sourceDir, { withFileTypes: true });
    } catch (error) {
      stats.errors += 1;
      log.warn("runtime-data read dir failed:", sourceDir, error?.message || error);
      return;
    }

    entries.forEach((entry) => {
      const sourcePath = path.join(sourceDir, entry.name);
      const targetPath = path.join(targetDir, entry.name);
      if (entry.isDirectory()) {
        copyDirectoryRecursive(sourcePath, targetPath, stats);
        return;
      }
      if (!entry.isFile()) return;
      copyFileWithMeta(sourcePath, targetPath, stats);
    });
  }

  function copyRuntimeArtifactsFromRoot(sourceRoot, targetRoot, compiledRules) {
    const source = String(sourceRoot || "").trim();
    const target = String(targetRoot || "").trim();
    const stats = {
      copied: 0,
      skipped: 0,
      errors: 0,
      rootsVisited: 0
    };

    if (!source || !target) return stats;
    if (!fsSync.existsSync(source)) return stats;

    let sourceStat;
    try {
      sourceStat = fsSync.statSync(source);
    } catch (_e) {
      return stats;
    }
    if (!sourceStat.isDirectory()) return stats;
    stats.rootsVisited += 1;

    ensureDir(target);
    let entries = [];
    try {
      entries = fsSync.readdirSync(source, { withFileTypes: true });
    } catch (error) {
      stats.errors += 1;
      log.warn("runtime-data root read failed:", source, error?.message || error);
      return stats;
    }

    entries.forEach((entry) => {
      const sourcePath = path.join(source, entry.name);
      const targetPath = path.join(target, entry.name);
      if (entry.isDirectory()) {
        if (!shouldCopyRuntimeDirectory(entry.name, compiledRules)) return;
        copyDirectoryRecursive(sourcePath, targetPath, stats);
        return;
      }
      if (!entry.isFile()) return;
      if (!shouldCopyRuntimeFile(entry.name, compiledRules)) return;
      copyFileWithMeta(sourcePath, targetPath, stats);
    });

    return stats;
  }

  function mergeStats(total, next) {
    const base = total || { copied: 0, skipped: 0, errors: 0, rootsVisited: 0 };
    const value = next || {};
    return {
      copied: Number(base.copied || 0) + Number(value.copied || 0),
      skipped: Number(base.skipped || 0) + Number(value.skipped || 0),
      errors: Number(base.errors || 0) + Number(value.errors || 0),
      rootsVisited: Number(base.rootsVisited || 0) + Number(value.rootsVisited || 0)
    };
  }

  function normalizeSessionReason(value) {
    return sanitizePathSegment(value || "manual")
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  function backupActiveSession(reason = "manual") {
    const session = activeSession;
    if (!session) {
      return { success: false, message: "No active game session" };
    }

    const roots = uniquePaths(session.runtimeRoots);
    if (!roots.length) {
      return { success: false, message: "No runtime roots to back up" };
    }

    const timestamp = Date.now();
    const reasonTag = normalizeSessionReason(reason);
    const snapshotDir = path.join(session.backupRoot, `${timestamp}-${reasonTag}`);
    ensureDir(snapshotDir);
    const compiledRules = session.runtimeRulesCompiled || getCompiledRuntimeRules();

    let aggregate = { copied: 0, skipped: 0, errors: 0, rootsVisited: 0 };
    roots.forEach((sourceRoot) => {
      const folderName = sanitizePathSegment(path.basename(sourceRoot));
      const targetRoot = path.join(snapshotDir, folderName);
      aggregate = mergeStats(aggregate, copyRuntimeArtifactsFromRoot(sourceRoot, targetRoot, compiledRules));
    });

    if (aggregate.copied > 0 || aggregate.skipped > 0) {
      session.lastBackupAt = new Date().toISOString();
    }

    return {
      success: true,
      snapshotDir,
      reason: reasonTag,
      stats: aggregate
    };
  }

  function runWindowsPowerShell(script) {
    const source = String(script || "").trim();
    if (!source) return { success: false, message: "Missing script" };
    if (process.platform !== "win32") {
      return { success: false, message: "Not supported on this platform" };
    }

    try {
      const result = spawnSync("powershell", [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        source
      ], {
        encoding: "utf8",
        windowsHide: true
      });

      if (result.error) {
        return { success: false, message: result.error.message || String(result.error) };
      }
      if (result.status !== 0) {
        return { success: false, message: String(result.stderr || result.stdout || `PowerShell failed (${result.status})`).trim() };
      }
      return { success: true, output: String(result.stdout || "").trim() };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  }

  function sendHotkey(action = "") {
    const normalized = String(action || "").trim().toLowerCase();
    const map = {
      alt_enter: "%{ENTER}",
      screenshot: "{F12}",
      pause: "{PAUSE}",
      escape: "{ESC}"
    };
    const keySequence = map[normalized];
    if (!keySequence) {
      return { success: false, message: "Unsupported hotkey action" };
    }

    const script = [
      "$wshell = New-Object -ComObject WScript.Shell",
      "Start-Sleep -Milliseconds 60",
      `$wshell.SendKeys('${String(keySequence).replace(/'/g, "''")}')`
    ].join("; ");

    const result = runWindowsPowerShell(script);
    if (!result.success) return result;
    return { success: true, action: normalized };
  }

  function captureActiveSessionScreenshot(reason = "manual") {
    const session = activeSession;
    if (!session) return { success: false, message: "No active game session" };
    if (process.platform !== "win32") return { success: false, message: "Screenshot capture is currently available on Windows only" };

    const capturesDir = session.capturesRoot;
    ensureDir(capturesDir);
    const timeTag = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(capturesDir, `${timeTag}-${normalizeSessionReason(reason)}.png`);
    const escapedTarget = String(filePath).replace(/'/g, "''");

    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "Add-Type -AssemblyName System.Drawing",
      "$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds",
      "$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)",
      "$graphics = [System.Drawing.Graphics]::FromImage($bitmap)",
      "$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)",
      `$bitmap.Save('${escapedTarget}', [System.Drawing.Imaging.ImageFormat]::Png)`,
      "$graphics.Dispose()",
      "$bitmap.Dispose()"
    ].join("; ");

    const result = runWindowsPowerShell(script);
    if (!result.success) return result;

    if (fsSync.existsSync(filePath)) {
      session.lastCaptureAt = new Date().toISOString();
      session.captureCount = Number(session.captureCount || 0) + 1;
      session.lastCapturePath = filePath;
      return {
        success: true,
        filePath
      };
    }

    return { success: false, message: "Capture file was not created" };
  }

  function clearSessionTimers(session) {
    if (!session) return;
    if (session.backupInterval) {
      clearInterval(session.backupInterval);
      session.backupInterval = null;
    }
    if (session.captureInterval) {
      clearInterval(session.captureInterval);
      session.captureInterval = null;
    }
    if (session.captureWarmupTimeout) {
      clearTimeout(session.captureWarmupTimeout);
      session.captureWarmupTimeout = null;
    }
  }

  function createRuntimeRoots({ launchTarget, emulatorPath, gamePath }) {
    const roots = [];
    const addDirFromPath = (value) => {
      const source = String(value || "").trim();
      if (!source) return;
      const dir = path.dirname(source);
      if (!dir) return;
      roots.push(dir);
    };
    addDirFromPath(emulatorPath);
    addDirFromPath(launchTarget);
    addDirFromPath(gamePath);
    return uniquePaths(roots).filter((dirPath) => {
      try {
        return fsSync.existsSync(dirPath) && fsSync.statSync(dirPath).isDirectory();
      } catch (_e) {
        return false;
      }
    });
  }

  function startSession(payload = {}) {
    const child = payload?.child;
    if (!child || typeof child.on !== "function") {
      return { success: false, message: "Missing child process handle" };
    }

    if (activeSession) {
      clearSessionTimers(activeSession);
    }

    const game = (payload?.game && typeof payload.game === "object") ? payload.game : {};
    const platformShortName = sanitizePathSegment(game?.platformShortName || game?.platform || "unknown").toLowerCase();
    const gameName = sanitizePathSegment(game?.name || "game");
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const runtimeRoots = createRuntimeRoots({
      launchTarget: payload?.launchTarget,
      emulatorPath: payload?.emulatorPath,
      gamePath: payload?.gamePath
    });

    const backupsRoot = path.join(app.getPath("userData"), "runtime-backups", platformShortName, gameName, sessionId);
    const capturesRoot = path.join(app.getPath("userData"), "runtime-captures", platformShortName, gameName, sessionId);
    ensureDir(backupsRoot);
    ensureDir(capturesRoot);
    const payloadRuntimeRulesCompiled = compileRuntimeRules(payload?.runtimeDataRules || {});
    const hasPayloadRuntimeRules = payloadRuntimeRulesCompiled.directoryTags.size > 0
      || payloadRuntimeRulesCompiled.fileExtensions.size > 0
      || payloadRuntimeRulesCompiled.fileNameIncludes.length > 0;

    activeSession = {
      id: sessionId,
      pid: Number(child.pid || 0),
      gameId: Number(game?.id || 0) || null,
      gameName: String(game?.name || "Unknown Game").trim() || "Unknown Game",
      platformShortName,
      startedAt: new Date().toISOString(),
      runtimeRoots,
      runtimeRulesCompiled: hasPayloadRuntimeRules ? payloadRuntimeRulesCompiled : null,
      backupRoot: backupsRoot,
      capturesRoot,
      lastBackupAt: "",
      lastCaptureAt: "",
      lastCapturePath: "",
      captureCount: 0,
      backupInterval: null,
      captureInterval: null,
      captureWarmupTimeout: null
    };

    try {
      const launchBackup = backupActiveSession("launch");
      if (launchBackup?.success) {
        log.info("Runtime backup snapshot created:", launchBackup.snapshotDir);
      }
    } catch (error) {
      log.warn("Failed to create launch runtime backup:", error?.message || error);
    }

    activeSession.backupInterval = setInterval(() => {
      const result = backupActiveSession("interval");
      if (!result?.success) return;
      if (Number(result?.stats?.copied || 0) > 0) {
        log.info("Runtime periodic backup copied files:", result.stats.copied);
      }
    }, 4 * 60 * 1000);

    if (process.platform === "win32") {
      activeSession.captureWarmupTimeout = setTimeout(() => {
        captureActiveSessionScreenshot("warmup");
      }, 20 * 1000);
      activeSession.captureInterval = setInterval(() => {
        captureActiveSessionScreenshot("interval");
      }, 2 * 60 * 1000);
    }

    child.on("exit", () => {
      try {
        backupActiveSession("exit");
      } catch (_e) {}
      clearSessionTimers(activeSession);
      activeSession = null;
    });

    return {
      success: true,
      sessionId,
      runtimeRoots
    };
  }

  function getStatus() {
    const session = activeSession;
    if (!session) {
      return {
        success: true,
        active: false
      };
    }

    return {
      success: true,
      active: true,
      session: {
        id: session.id,
        pid: session.pid,
        gameId: session.gameId,
        gameName: session.gameName,
        platformShortName: session.platformShortName,
        startedAt: session.startedAt,
        lastBackupAt: session.lastBackupAt,
        lastCaptureAt: session.lastCaptureAt,
        lastCapturePath: session.lastCapturePath,
        captureCount: Number(session.captureCount || 0),
        runtimeRoots: [...session.runtimeRoots],
        runtimeDataRules: session.runtimeRulesCompiled
          ? {
            directoryNames: [...session.runtimeRulesCompiled.directoryTags],
            fileExtensions: [...session.runtimeRulesCompiled.fileExtensions],
            fileNameIncludes: [...session.runtimeRulesCompiled.fileNameIncludes]
          }
          : null,
        backupRoot: session.backupRoot,
        capturesRoot: session.capturesRoot
      }
    };
  }

  function showLauncher() {
    const mainWindow = getMainWindow();
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { success: false, message: "Launcher window is not available" };
    }
    try {
      if (mainWindow.__emuBroSessionSuspended && !mainWindow.__emuBroSessionRestoreInProgress) {
        mainWindow.__emuBroSessionRestoreInProgress = true;
        mainWindow.__emuBroSessionSuspended = false;
        mainWindow.loadFile(path.join(app.getAppPath(), "index.html"))
          .catch((error) => {
            log.error("Failed to restore launcher UI from session overlay:", error);
          })
          .finally(() => {
            if (!mainWindow || mainWindow.isDestroyed()) return;
            mainWindow.__emuBroSessionRestoreInProgress = false;
          });
      }
      if (mainWindow.webContents && !mainWindow.webContents.isDestroyed() && typeof mainWindow.webContents.setBackgroundThrottling === "function") {
        mainWindow.webContents.setBackgroundThrottling(false);
      }
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  }

  function quitActiveSession() {
    const session = activeSession;
    if (!session?.pid) return { success: false, message: "No active game process" };

    try {
      if (process.platform === "win32") {
        const result = spawnSync("taskkill", ["/PID", String(session.pid), "/T", "/F"], {
          encoding: "utf8",
          windowsHide: true
        });
        if (result.error) {
          return { success: false, message: result.error.message || String(result.error) };
        }
        if (result.status !== 0) {
          return { success: false, message: String(result.stderr || result.stdout || "Failed to terminate game process").trim() };
        }
      } else {
        process.kill(session.pid, "SIGTERM");
      }
      return { success: true, pid: session.pid };
    } catch (error) {
      return { success: false, message: error?.message || String(error) };
    }
  }

  function migrateRuntimeArtifacts(sourceExecutablePath, targetExecutablePath) {
    const sourceExe = String(sourceExecutablePath || "").trim();
    const targetExe = String(targetExecutablePath || "").trim();
    if (!sourceExe || !targetExe) {
      return { success: false, message: "Missing source or target executable path", stats: { copied: 0, skipped: 0, errors: 0, rootsVisited: 0 } };
    }

    const sourceRoot = path.dirname(sourceExe);
    const targetRoot = path.dirname(targetExe);
    if (!sourceRoot || !targetRoot) {
      return { success: false, message: "Invalid source/target roots", stats: { copied: 0, skipped: 0, errors: 0, rootsVisited: 0 } };
    }
    if (sourceRoot.toLowerCase() === targetRoot.toLowerCase()) {
      return { success: true, message: "Source and target roots are the same", stats: { copied: 0, skipped: 0, errors: 0, rootsVisited: 0 } };
    }

    const compiledRules = getCompiledRuntimeRules();
    const stats = copyRuntimeArtifactsFromRoot(sourceRoot, targetRoot, compiledRules);
    return {
      success: true,
      sourceRoot,
      targetRoot,
      stats
    };
  }

  return {
    startSession,
    getStatus,
    showLauncher,
    quitActiveSession,
    backupActiveSession,
    captureActiveSessionScreenshot,
    sendHotkey,
    migrateRuntimeArtifacts
  };
}

module.exports = {
  createGameSessionManager
};
