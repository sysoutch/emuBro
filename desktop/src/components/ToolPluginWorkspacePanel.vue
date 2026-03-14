<script setup>
import { ref } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useWorkspaceStore } from "../stores/workspace";

const shellI18nStore = useShellI18nStore();
const workspaceStore = useWorkspaceStore();
const { lastPluginScaffold, pluginChannelsReady, pluginScaffoldBusy, pluginScaffoldError } = storeToRefs(workspaceStore);

const pluginName = ref("Custom Tool Plugin");
const pluginId = ref("");

async function createPluginScaffold() {
  await workspaceStore.createToolPluginScaffold({
    name: pluginName.value,
    pluginId: pluginId.value
  });
}
</script>

<template>
  <div class="desktop-settings-stack">
    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("desktopShell.pluginWorkspace.title", "Managed tool plugin scaffold") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.pluginWorkspace.description", "Generate a desktop-managed HTML/CSS/JS plugin inside the shell workspace.") }}</p>
        </div>
        <span class="pill">{{ pluginChannelsReady ? shellI18nStore.t("desktopShell.pluginWorkspace.bridgeReady", "Bridge ready") : shellI18nStore.t("desktopShell.pluginWorkspace.bridgeUnavailable", "Bridge unavailable") }}</span>
      </div>

      <div class="form-grid">
        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.pluginWorkspace.pluginName", "Plugin name") }}</span>
          <input v-model="pluginName" type="text" :placeholder="shellI18nStore.t('desktopShell.pluginWorkspace.pluginNamePlaceholder', 'Custom Tool Plugin')" />
        </label>
        <label class="field">
          <span>{{ shellI18nStore.t("desktopShell.pluginWorkspace.pluginId", "Plugin id") }}</span>
          <input v-model="pluginId" type="text" :placeholder="shellI18nStore.t('desktopShell.pluginWorkspace.pluginIdPlaceholder', 'optional-plugin-id')" />
        </label>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="pluginScaffoldBusy" @click="createPluginScaffold">
          {{ pluginScaffoldBusy ? shellI18nStore.t("desktopShell.pluginWorkspace.creating", "Creating...") : shellI18nStore.t("desktopShell.pluginWorkspace.createPluginScaffold", "Create Plugin Scaffold") }}
        </button>
      </div>

      <p v-if="pluginScaffoldError" class="legacy-fallback-note">{{ pluginScaffoldError }}</p>
    </section>

    <div v-if="lastPluginScaffold" class="grid-two">
      <article class="subcard desktop-tool-surface-card">
        <h4>{{ shellI18nStore.t("desktopShell.pluginWorkspace.generatedFiles", "Generated files") }}</h4>
        <ul class="path-list">
          <li>{{ lastPluginScaffold.pluginDir }}</li>
          <li>{{ lastPluginScaffold.htmlFilePath }}</li>
          <li>{{ lastPluginScaffold.cssFilePath }}</li>
          <li>{{ lastPluginScaffold.jsFilePath }}</li>
        </ul>
      </article>
      <article class="subcard desktop-tool-surface-card">
        <h4>{{ shellI18nStore.t("desktopShell.pluginWorkspace.scaffoldPreview", "Scaffold preview") }}</h4>
        <ul class="path-list">
          <li>HTML: {{ lastPluginScaffold.files?.html?.length || 0 }} chars</li>
          <li>CSS: {{ lastPluginScaffold.files?.css?.length || 0 }} chars</li>
          <li>JS: {{ lastPluginScaffold.files?.js?.length || 0 }} chars</li>
        </ul>
      </article>
    </div>
  </div>
</template>
