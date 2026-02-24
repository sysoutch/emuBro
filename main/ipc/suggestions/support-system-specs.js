function createSupportSystemSpecsService(deps = {}) {
  const os = deps.os || require("node:os");
  const spawnSync = typeof deps.spawnSync === "function" ? deps.spawnSync : null;
  const normalizeText = typeof deps.normalizeText === "function"
    ? deps.normalizeText
    : ((value, fallback = "") => {
      const text = String(value ?? "").trim();
      return text || fallback;
    });

  function runWinCommand(exe, args = []) {
    if (!spawnSync) return "";
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
      cpu = runWinCommand("powershell", ["-NoProfile", "-Command", "(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)"]) || "";
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
      text: lines.join("\n")
    };
  }

  function getSystemSpecs() {
    try {
      if (os.platform() === "win32") return getWindowsSystemSpecs();
      return getGenericSystemSpecs();
    } catch (_error) {
      return {
        platform: String(os.platform() || "unknown"),
        text: "OS: Unknown\nCPU: Unknown\nGPU: Unknown\nRAM: Unknown\nMachine: Unknown"
      };
    }
  }

  function shouldFetchSpecs(payload = {}) {
    if (!payload?.allowAutoSpecsFetch) return false;
    const hay = normalizeText(`${payload?.issueSummary || ""} ${payload?.details || ""} ${payload?.errorText || ""}`).toLowerCase();
    if (!hay) return false;
    return /\b(spec|specs|hardware|gpu|cpu|ram|driver|fps|stutter|performance|opengl|vulkan|directx|dxvk|requirements|windows|os)\b/.test(hay);
  }

  return {
    shouldFetchSpecs,
    getSystemSpecs
  };
}

module.exports = {
  createSupportSystemSpecsService
};
