<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "./stores/app";

const appStore = useAppStore();
const { title, subtitle, ready, theme } = storeToRefs(appStore);
const legacyFrameReady = ref(false);
const legacyFrameError = ref(false);
const legacyFrameUrl = ref("");
const legacyFrameRef = ref(null);
let cleanupLegacyFrameDragProxy = () => {};

const hasLegacyFrame = computed(
  () => !!legacyFrameUrl.value && !legacyFrameError.value
);

function onLegacyFrameLoad() {
  legacyFrameReady.value = true;
  appStore.markReady();
}

function onLegacyFrameError() {
  legacyFrameError.value = true;
  legacyFrameReady.value = false;
  appStore.markReady();
}

function bindLegacyFrameDragProxy() {
  cleanupLegacyFrameDragProxy();
  cleanupLegacyFrameDragProxy = () => {};
}

onMounted(() => {
  document.documentElement.setAttribute("data-theme", theme.value);

  const legacyEntry =
    typeof __EMUBRO_LEGACY_INDEX__ === "string"
      ? __EMUBRO_LEGACY_INDEX__.trim()
      : "";
  if (legacyEntry) {
    legacyFrameUrl.value = legacyEntry;
    return;
  }

  appStore.markReady();
});

onBeforeUnmount(() => {
  cleanupLegacyFrameDragProxy();
  cleanupLegacyFrameDragProxy = () => {};
});
</script>

<template>
  <main v-if="hasLegacyFrame" class="legacy-shell">
    <iframe
      ref="legacyFrameRef"
      class="legacy-frame"
      :class="{ 'is-ready': legacyFrameReady }"
      :src="legacyFrameUrl"
      title="emuBro Legacy UI"
      @load="onLegacyFrameLoad"
      @error="onLegacyFrameError"
    />
  </main>

  <main v-else class="shell">
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
        <p v-if="legacyFrameError" class="legacy-fallback-note">
          Legacy UI bootstrap failed. Check dev console and Vite `/@fs` access.
        </p>
      </div>
    </section>
  </main>
</template>
