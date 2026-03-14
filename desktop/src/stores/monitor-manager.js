import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

function getDesktopBridge() {
  if (typeof window === "undefined" || !window.emubro) {
    return null;
  }
  return window.emubro;
}

function normalizeMonitorRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row, index) => ({
    key: String(row?.id || row?.deviceId || `monitor-${index}`),
    index,
    id: String(row?.id || "").trim(),
    name: String(row?.name || `Monitor ${index + 1}`).trim(),
    deviceId: String(row?.deviceId || "").trim(),
    width: Number(row?.width || 0),
    height: Number(row?.height || 0),
    isPrimary: !!row?.isPrimary,
    orientation: Number(row?.orientation || 0),
    connected: !!row?.connected
  }));
}

function translate(key, fallback, params = null) {
  try {
    const shellI18nStore = useShellI18nStore();
    return params ? shellI18nStore.tf(key, params, fallback) : shellI18nStore.t(key, fallback);
  } catch (_error) {
    if (!params) {
      return fallback;
    }
    return Object.entries(params).reduce(
      (result, [name, value]) => String(result).replaceAll(`{{${name}}}`, String(value ?? "")),
      String(fallback || "")
    );
  }
}

export const useMonitorManagerStore = defineStore("monitorManager", {
  state: () => ({
    initialized: false,
    loading: false,
    status: "",
    statusTone: "",
    monitors: [],
    platform: typeof window !== "undefined" && window.emubro ? String(window.emubro.platform || "web") : "web"
  }),
  getters: {
    isWindows(state) {
      return state.platform === "win32";
    }
  },
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    async refresh(channel = "get-monitor-info") {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return [];
      }
      this.loading = true;
      this.setStatus(channel === "detect-monitors" ? translate("desktopShell.monitor.detecting", "Detecting monitors...") : translate("desktopShell.monitor.loadingInfo", "Loading monitor information..."));
      try {
        const payload = await bridge.invoke(channel);
        const rows = Array.isArray(payload?.monitors) ? payload.monitors : Array.isArray(payload) ? payload : [];
        this.monitors = normalizeMonitorRows(rows);
        this.setStatus(this.monitors.length ? translate("desktopShell.monitor.loaded", "Monitor information loaded.") : translate("tools.monitor.noMonitorsDetected", "No monitors detected."), this.monitors.length ? "success" : "warning");
        return this.monitors;
      } catch (error) {
        this.setStatus(error instanceof Error ? error.message : String(error || "Failed to retrieve monitor information."), "error");
        return [];
      } finally {
        this.loading = false;
      }
    },
    async detect() {
      return this.refresh("detect-monitors");
    },
    async setOrientation(monitorIndex, orientation) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      const result = await bridge.invoke("set-monitor-orientation", monitorIndex, Number(orientation || 0));
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to set monitor orientation."), "error");
        return null;
      }
      this.setStatus(translate("desktopShell.monitor.orientationUpdated", `Monitor ${Number(monitorIndex) + 1} orientation updated.`, { number: Number(monitorIndex) + 1 }), "success");
      await this.refresh();
      return result;
    },
    async setDisplayState(monitorIndex, state) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      const result = await bridge.invoke("set-monitor-display-state", monitorIndex, String(state || "enable"));
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to set monitor state."), "error");
        return null;
      }
      this.setStatus(translate("desktopShell.monitor.stateUpdated", `Monitor ${Number(monitorIndex) + 1} ${String(state || "enable")}d successfully.`, { number: Number(monitorIndex) + 1, state: String(state || "enable") }), "success");
      await this.refresh();
      return result;
    },
    async setPrimary(monitorIndex) {
      const bridge = getDesktopBridge();
      if (!bridge?.invoke) {
        this.setStatus(translate("desktopShell.tools.bridgeUnavailable", "Desktop bridge unavailable."), "error");
        return null;
      }
      const result = await bridge.invoke("set-primary-monitor", monitorIndex);
      if (!result?.success) {
        this.setStatus(String(result?.message || "Failed to set primary monitor."), "error");
        return null;
      }
      this.setStatus(translate("desktopShell.monitor.setPrimary", `Monitor ${Number(monitorIndex) + 1} set as primary.`, { number: Number(monitorIndex) + 1 }), "success");
      await this.refresh();
      return result;
    },
    async initialize() {
      if (this.initialized) {
        return;
      }
      await this.refresh();
      this.initialized = true;
    }
  }
});
