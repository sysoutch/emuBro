import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./emubro-bridge";
import "./styles/main.scss";
import { useShellI18nStore } from "./stores/shell-i18n";
import { useShellLanguageStore } from "./stores/shell-language";
import { initializeShellStorageCache } from "./utils/shell-storage-cache";

function readLegacyEntryUrl() {
  return typeof __EMUBRO_LEGACY_INDEX__ === "string"
    ? __EMUBRO_LEGACY_INDEX__.trim()
    : "";
}

function shouldBootDesktopShell(legacyEntryUrl) {
  if (window.__EMUBRO_OVERLAY_WINDOW__) return false;
  if (!legacyEntryUrl) return true;

  try {
    const currentUrl = new URL(window.location.href);
    const desktopParam = String(currentUrl.searchParams.get("desktop") || "").trim().toLowerCase();
    const legacyParam = String(currentUrl.searchParams.get("legacy") || "").trim().toLowerCase();
    const sectionParam = String(currentUrl.searchParams.get("section") || "").trim();

    // Recovery mode: legacy/classic is the default again.
    // The migrated shell is still available when explicitly requested.
    if (desktopParam === "1" || desktopParam === "true") return true;
    if (legacyParam === "hosted") return true;
    if (sectionParam) return true;
    if (currentUrl.hash.replace(/^#/, "").trim()) return true;
  } catch (_error) {}

  return false;
}

const legacyEntryUrl = readLegacyEntryUrl();

async function bootDesktopShell() {
  await initializeShellStorageCache();

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  const shellI18nStore = useShellI18nStore(pinia);
  const shellLanguageStore = useShellLanguageStore(pinia);
  await shellI18nStore.initialize();
  await shellLanguageStore.initialize();

  app.mount("#app");
}

if (shouldBootDesktopShell(legacyEntryUrl)) {
  void bootDesktopShell();
} else if (!window.__EMUBRO_OVERLAY_WINDOW__) {
  window.location.replace(legacyEntryUrl);
}
