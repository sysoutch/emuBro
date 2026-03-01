import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import "./emubro-bridge";
import "./style.css";

if (!window.__EMUBRO_OVERLAY_WINDOW__) {
  const app = createApp(App);
  app.use(createPinia());
  app.mount("#app");
}
