import { defineStore } from "pinia";
import { useShellI18nStore } from "./shell-i18n";

function snapshotGamepads() {
  if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
    return [];
  }

  return Array.from(navigator.getGamepads() || [])
    .filter(Boolean)
    .map((pad) => ({
      key: `pad-${pad.index}`,
      index: Number(pad.index || 0),
      id: String(pad.id || "Unknown Gamepad").trim(),
      connected: !!pad.connected,
      mapping: String(pad.mapping || "standard").trim(),
      timestamp: Number(pad.timestamp || 0),
      axes: Array.from(pad.axes || []).map((value) => Number(value || 0)),
      buttons: Array.from(pad.buttons || []).map((button, index) => ({
        index,
        pressed: !!button?.pressed,
        touched: !!button?.touched,
        value: Number(button?.value || 0)
      }))
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

export const useGamepadTesterStore = defineStore("gamepadTester", {
  state: () => ({
    initialized: false,
    running: false,
    supported: typeof navigator !== "undefined" && typeof navigator.getGamepads === "function",
    status: "",
    statusTone: "",
    gamepads: [],
    selectedIndex: -1,
    pollTimer: null
  }),
  getters: {
    selectedGamepad(state) {
      return state.gamepads.find((pad) => pad.index === state.selectedIndex) || state.gamepads[0] || null;
    }
  },
  actions: {
    setStatus(message, tone = "") {
      this.status = String(message || "").trim();
      this.statusTone = String(tone || "").trim();
    },
    refresh() {
      this.gamepads = snapshotGamepads();
      if (!this.gamepads.some((pad) => pad.index === this.selectedIndex)) {
        this.selectedIndex = this.gamepads[0]?.index ?? -1;
      }
      if (!this.supported) {
        this.setStatus(translate("desktopShell.gamepadTester.apiUnavailable", "Gamepad API is not available in this environment."), "warning");
      } else if (!this.gamepads.length) {
        this.setStatus(translate("tools.gamepad.noGamepadsDetected", "No gamepads detected. Connect a controller and press a button."), "warning");
      } else {
        this.setStatus(translate("desktopShell.gamepadTester.detectedPads", `Detected ${this.gamepads.length} connected gamepad(s).`, { count: this.gamepads.length }), "success");
      }
      return this.gamepads;
    },
    selectGamepad(index) {
      this.selectedIndex = Number(index || 0);
    },
    start() {
      if (this.running) {
        return;
      }
      this.running = true;
      this.refresh();
      this.pollTimer = window.setInterval(() => {
        this.refresh();
      }, 120);
    },
    stop() {
      this.running = false;
      if (this.pollTimer) {
        window.clearInterval(this.pollTimer);
        this.pollTimer = null;
      }
      this.setStatus(translate("tools.gamepad.testingStopped", "Testing stopped."));
    },
    initialize() {
      if (this.initialized) {
        return;
      }
      this.supported = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
      this.refresh();
      const handleRefresh = () => this.refresh();
      window.addEventListener("gamepadconnected", handleRefresh);
      window.addEventListener("gamepaddisconnected", handleRefresh);
      this.initialized = true;
    }
  }
});
