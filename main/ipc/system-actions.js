const path = require("path");
const { spawn } = require("child_process");

function registerSystemActionsIpc(deps = {}) {
  const {
    ipcMain,
    log,
    app,
    fsSync,
    shell
  } = deps;

  if (!ipcMain) throw new Error("registerSystemActionsIpc requires ipcMain");
  if (!log) throw new Error("registerSystemActionsIpc requires log");
  if (!app) throw new Error("registerSystemActionsIpc requires app");
  if (!fsSync) throw new Error("registerSystemActionsIpc requires fsSync");
  if (!shell) throw new Error("registerSystemActionsIpc requires shell");

  function resolveEmulatorConfigPath(emulatorPath, configFilePath) {
    const exePath = String(emulatorPath || "").trim();
    const cfgPath = String(configFilePath || "").trim();
    if (!exePath || !cfgPath) return "";

    const emulatorDir = path.dirname(exePath);
    const hasDriveLetter = /^[a-zA-Z]:[\\/]/.test(cfgPath);
    const isUnc = /^\\\\/.test(cfgPath);

    if (path.isAbsolute(cfgPath) && (hasDriveLetter || isUnc)) {
      return path.normalize(cfgPath);
    }

    // Config paths like "/config/project64.cfg" should be treated as emulator-relative.
    const relativeCfgPath = cfgPath.replace(/^[\\/]+/, "");
    return path.normalize(path.join(emulatorDir, relativeCfgPath));
  }

  function parseLaunchArgs(raw) {
    const str = String(raw || "").trim();
    if (!str) return [];

    const args = [];
    const re = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let m;
    while ((m = re.exec(str)) !== null) {
      args.push(m[1] ?? m[2] ?? m[3] ?? "");
    }
    return args.filter(Boolean);
  }

  function normalizeBindingsMap(rawBindings = {}) {
    const source = (rawBindings && typeof rawBindings === "object" && !Array.isArray(rawBindings))
      ? rawBindings
      : {};
    return Object.entries(source)
      .filter(([key, value]) => String(key || "").trim() && String(value || "").trim())
      .reduce((acc, [key, value]) => {
        acc[String(key).trim()] = String(value).trim();
        return acc;
      }, {});
  }

  function normalizeInputBindingsProfile(rawBindings = {}) {
    const source = (rawBindings && typeof rawBindings === "object" && !Array.isArray(rawBindings))
      ? rawBindings
      : {};
    const hasChannels = Object.prototype.hasOwnProperty.call(source, "keyboard")
      || Object.prototype.hasOwnProperty.call(source, "gamepad");
    if (!hasChannels) {
      return {
        keyboard: {},
        gamepad: normalizeBindingsMap(source)
      };
    }
    return {
      keyboard: normalizeBindingsMap(source.keyboard),
      gamepad: normalizeBindingsMap(source.gamepad)
    };
  }

  ipcMain.handle("launch-emulator", async (_event, payload = {}) => {
    try {
      const exePath = String(payload.filePath || "").trim();
      if (!exePath) return { success: false, message: "Missing emulator path" };
      if (!fsSync.existsSync(exePath)) return { success: false, message: "Emulator executable not found" };

      const args = Array.isArray(payload.args) ? payload.args : parseLaunchArgs(payload.args);
      const cwd = String(payload.workingDirectory || "").trim() || path.dirname(exePath);
      const rawInputBindings = payload?.inputBindings;
      const rawGamepadBindings = payload?.gamepadBindings;
      const inputBindings = normalizeInputBindingsProfile(
        (rawInputBindings && typeof rawInputBindings === "object" && !Array.isArray(rawInputBindings))
          ? rawInputBindings
          : rawGamepadBindings
      );
      const keyboardBindingEntries = inputBindings.keyboard;
      const gamepadBindingEntries = inputBindings.gamepad;
      const hasKeyboardBindings = Object.keys(keyboardBindingEntries).length > 0;
      const hasGamepadBindings = Object.keys(gamepadBindingEntries).length > 0;
      const hasAnyBindings = hasKeyboardBindings || hasGamepadBindings;
      const childEnv = hasAnyBindings
        ? {
          ...process.env,
          EMUBRO_INPUT_BINDINGS: JSON.stringify(inputBindings),
          ...(hasKeyboardBindings ? { EMUBRO_KEYBOARD_BINDINGS: JSON.stringify(keyboardBindingEntries) } : {}),
          ...(hasGamepadBindings ? { EMUBRO_GAMEPAD_BINDINGS: JSON.stringify(gamepadBindingEntries) } : {})
        }
        : process.env;

      const child = spawn(exePath, args, {
        cwd,
        detached: true,
        stdio: "ignore",
        env: childEnv
      });

      child.on("error", (error) => {
        log.error("Failed to launch emulator:", error);
      });
      child.unref();

      return { success: true };
    } catch (error) {
      log.error("launch-emulator failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("show-item-in-folder", async (_event, filePath) => {
    try {
      const p = String(filePath || "").trim();
      if (!p) return { success: false, message: "Missing path" };
      if (!fsSync.existsSync(p)) return { success: false, message: "Path not found" };
      shell.showItemInFolder(p);
      return { success: true };
    } catch (error) {
      log.error("show-item-in-folder failed:", error);
      return { success: false, message: error.message };
    }
  });

  ipcMain.handle("emulator:read-config-file", async (_event, payload = {}) => {
    try {
      const emulatorPath = String(payload?.emulatorPath || payload?.filePath || "").trim();
      const configFilePath = String(payload?.configFilePath || "").trim();
      if (!emulatorPath) {
        return { success: false, message: "Missing emulator path", exists: false, resolvedPath: "", text: "" };
      }
      if (!configFilePath) {
        return { success: false, message: "Missing config file path", exists: false, resolvedPath: "", text: "" };
      }
      if (!fsSync.existsSync(emulatorPath)) {
        return { success: false, message: "Emulator executable not found", exists: false, resolvedPath: "", text: "" };
      }

      const resolvedPath = resolveEmulatorConfigPath(emulatorPath, configFilePath);
      if (!resolvedPath) {
        return { success: false, message: "Failed to resolve config file path", exists: false, resolvedPath: "", text: "" };
      }
      if (!fsSync.existsSync(resolvedPath)) {
        return { success: false, message: "Config file not found", exists: false, resolvedPath, text: "" };
      }

      const text = fsSync.readFileSync(resolvedPath, "utf8");
      return { success: true, exists: true, resolvedPath, text: String(text || "") };
    } catch (error) {
      log.error("emulator:read-config-file failed:", error);
      return { success: false, message: error?.message || String(error), exists: false, resolvedPath: "", text: "" };
    }
  });

  ipcMain.handle("emulator:write-config-file", async (_event, payload = {}) => {
    try {
      const emulatorPath = String(payload?.emulatorPath || payload?.filePath || "").trim();
      const configFilePath = String(payload?.configFilePath || "").trim();
      const contents = Object.prototype.hasOwnProperty.call(payload, "contents")
        ? String(payload.contents ?? "")
        : String(payload?.text ?? "");

      if (!emulatorPath) return { success: false, message: "Missing emulator path", resolvedPath: "" };
      if (!configFilePath) return { success: false, message: "Missing config file path", resolvedPath: "" };
      if (!fsSync.existsSync(emulatorPath)) {
        return { success: false, message: "Emulator executable not found", resolvedPath: "" };
      }

      const resolvedPath = resolveEmulatorConfigPath(emulatorPath, configFilePath);
      if (!resolvedPath) {
        return { success: false, message: "Failed to resolve config file path", resolvedPath: "" };
      }

      const targetDir = path.dirname(resolvedPath);
      if (targetDir && !fsSync.existsSync(targetDir)) {
        fsSync.mkdirSync(targetDir, { recursive: true });
      }

      fsSync.writeFileSync(resolvedPath, contents, "utf8");
      return {
        success: true,
        resolvedPath,
        bytesWritten: Buffer.byteLength(contents, "utf8")
      };
    } catch (error) {
      log.error("emulator:write-config-file failed:", error);
      return { success: false, message: error?.message || String(error), resolvedPath: "" };
    }
  });

  ipcMain.handle("get-file-icon-data-url", async (_event, filePath) => {
    try {
      const p = String(filePath || "").trim();
      if (!p) return { success: false, message: "Missing path", dataUrl: "" };
      if (!fsSync.existsSync(p)) return { success: false, message: "Path not found", dataUrl: "" };
      const iconProvider = (app && typeof app.getFileIcon === "function")
        ? app
        : (shell && typeof shell.getFileIcon === "function" ? shell : null);
      if (!iconProvider) {
        return { success: false, message: "File icon API not available", dataUrl: "" };
      }

      const icon = await iconProvider.getFileIcon(p, { size: "normal" });
      if (!icon || typeof icon.isEmpty !== "function" || icon.isEmpty()) {
        return { success: false, message: "No icon available", dataUrl: "" };
      }
      const dataUrl = typeof icon.toDataURL === "function" ? String(icon.toDataURL() || "").trim() : "";
      if (!dataUrl) {
        return { success: false, message: "No icon data", dataUrl: "" };
      }
      return { success: true, dataUrl };
    } catch (error) {
      log.error("get-file-icon-data-url failed:", error);
      return { success: false, message: error.message || String(error), dataUrl: "" };
    }
  });

  ipcMain.handle("open-external-url", async (_event, rawUrl) => {
    try {
      let url = String(rawUrl || "").trim();
      if (!url) return { success: false, message: "Missing URL" };
      if (!/^https?:\/\//i.test(url)) {
        url = `https://${url}`;
      }
      await shell.openExternal(url);
      return { success: true, url };
    } catch (error) {
      log.error("open-external-url failed:", error);
      return { success: false, message: error.message };
    }
  });
}

module.exports = {
  registerSystemActionsIpc
};
