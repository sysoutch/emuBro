import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./emubro-bridge";
import "./style.css";

function readLegacyEntryUrl() {
  return typeof __EMUBRO_LEGACY_INDEX__ === "string"
    ? __EMUBRO_LEGACY_INDEX__.trim()
    : "";
}

function shouldBootLegacyDirectly(legacyEntryUrl) {
  if (window.__EMUBRO_OVERLAY_WINDOW__) return false;
  if (!legacyEntryUrl) return false;

  try {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("shell") === "desktop") {
      return false;
    }
  } catch (_error) {}

  return true;
}

const legacyEntryUrl = readLegacyEntryUrl();

if (shouldBootLegacyDirectly(legacyEntryUrl)) {
  window.location.replace(legacyEntryUrl);
} else if (!window.__EMUBRO_OVERLAY_WINDOW__) {
  const app = createApp(App);
  app.use(createPinia());
  app.mount("#app");
}
