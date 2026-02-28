import { defineStore } from "pinia";
import { getCurrentWindow } from "@tauri-apps/api/window";

export const useAppStore = defineStore("app", {
  state: () => ({
    title: "emuBro",
    subtitle: "Tauri + Vue + Pinia migration in progress",
    theme: "dark",
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
