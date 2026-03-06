import { defineStore } from "pinia";
import { getCurrentWindow } from "@tauri-apps/api/window";

function getInitialThemeTone() {
  if (typeof document !== "undefined") {
    const attr = String(document.documentElement.getAttribute("data-theme") || "").trim().toLowerCase();
    if (attr === "light" || attr === "dark") return attr;
  }
  return "dark";
}

export const useAppStore = defineStore("app", {
  state: () => ({
    title: "emuBro",
    subtitle: "Desktop shell + Vue + Pinia migration in progress",
    theme: getInitialThemeTone(),
    ready: false
  }),
  actions: {
    markReady() {
      this.ready = true;
    },
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", this.theme);
    },
    async minimizeWindow() {
      await getCurrentWindow().minimize();
    },
    async maximizeWindow() {
      await getCurrentWindow().toggleMaximize();
    },
    async closeWindow() {
      await getCurrentWindow().close();
    }
  }
});
