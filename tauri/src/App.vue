<script setup>
import { onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "./stores/app";

const appStore = useAppStore();
const { title, subtitle, ready, theme } = storeToRefs(appStore);

onMounted(() => {
  document.documentElement.setAttribute("data-theme", theme.value);
  appStore.markReady();
});
</script>

<template>
  <main class="shell">
    <header class="titlebar" data-tauri-drag-region>
      <div class="brand" data-tauri-drag-region>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <div class="controls">
        <button type="button" @click="appStore.toggleTheme">Theme</button>
        <button type="button" @click="appStore.minimizeWindow">Min</button>
        <button type="button" @click="appStore.maximizeWindow">Max</button>
        <button type="button" class="danger" @click="appStore.closeWindow">Close</button>
      </div>
    </header>
    <section class="content">
      <div class="card">
        <h2>{{ ready ? "Desktop shell is running" : "Booting..." }}</h2>
        <p>
          This is the new Tauri frontend foundation. Next steps are porting game/library,
          settings, language, and theme modules from Electron to Tauri commands + Pinia stores.
        </p>
      </div>
    </section>
  </main>
</template>
