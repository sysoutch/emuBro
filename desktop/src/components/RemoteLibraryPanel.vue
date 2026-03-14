<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useRemoteLibraryStore } from "../stores/remote-library";

import { useShellI18nStore } from "../stores/shell-i18n";

const shellI18nStore = useShellI18nStore();
const remoteStore = useRemoteLibraryStore();
const {
  activeHostId,
  clientHosts,
  downloadBusy,
  hostConfig,
  hostLoading,
  hostStatus,
  manualPath,
  pairCodes,
  pairing,
  remoteGames,
  scanBusy,
  selectedRemotePaths,
  status,
  statusTone
} = storeToRefs(remoteStore);

const allowedRootsText = computed({
  get: () => remoteStore.allowedRootsText,
  set: (value) => remoteStore.setAllowedRootsText(value)
});

const selectedCount = computed(() => selectedRemotePaths.value.length);

function setPairCode(hostId, event) {
  remoteStore.setPairCode(hostId, event?.target?.value || "");
}

onMounted(() => {
  void remoteStore.initialize();
});
</script>

<template>
  <div class="desktop-settings-stack">
    <div class="grid-two desktop-remote-top-grid">
      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <div>
            <h4>{{ shellI18nStore.t("tools.remoteLibraryHost", "Host (this device)") }}</h4>
            <p class="meta-line">{{ shellI18nStore.t("desktopShell.remoteLibrary.hostDescription", "Expose your local library to other emuBro clients on the LAN.") }}</p>
          </div>
          <span class="pill">{{ hostStatus.running ? `${shellI18nStore.t("desktopShell.remoteLibrary.runningOn", "Running on")} ${hostStatus.port}` : shellI18nStore.t("tools.remoteLibraryHostStopped", "Stopped") }}</span>
        </div>

        <label class="toolbar-checkbox">
          <input :checked="hostConfig.enabled" type="checkbox" @change="remoteStore.setHostField('enabled', $event.target.checked)" />
          <span>{{ shellI18nStore.t("tools.remoteLibraryEnableHost", "Enable remote host") }}</span>
        </label>

        <div class="form-grid">
          <label class="field">
            <span>{{ shellI18nStore.t("tools.remoteLibraryPort", "Host Port") }}</span>
            <input :value="hostConfig.port" type="number" min="1" max="65535" @input="remoteStore.setHostField('port', $event.target.value)" />
          </label>
          <label class="field">
            <span>{{ shellI18nStore.t("tools.remoteLibraryDiscoveryPort", "Discovery Port") }}</span>
            <input :value="hostConfig.discoveryPort" type="number" min="1" max="65535" @input="remoteStore.setHostField('discoveryPort', $event.target.value)" />
          </label>
        </div>

        <label class="field">
          <span>{{ shellI18nStore.t("tools.remoteLibraryAllowedRoots", "Allowed transfer roots") }}</span>
          <textarea v-model="allowedRootsText" class="desktop-textarea-input" rows="4" />
        </label>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="hostLoading" @click="remoteStore.saveHostConfig">
            {{ hostLoading ? shellI18nStore.t("desktopShell.themeWindow.saving", "Saving...") : shellI18nStore.t("desktopShell.remoteLibrary.saveHostSettings", "Save Host Settings") }}
          </button>
          <button type="button" class="action-button" @click="remoteStore.rotatePairing">{{ shellI18nStore.t("tools.remoteLibraryRotateCode", "New Pairing Code") }}</button>
        </div>

        <p class="desktop-status-line" data-tone="info">{{ shellI18nStore.tf("tools.remoteLibraryPairingCode", { code: pairing.code || shellI18nStore.t("desktopShell.remoteLibrary.notAvailable", "not available") }, `Pairing code: ${pairing.code || shellI18nStore.t("desktopShell.remoteLibrary.notAvailable", "not available")}`) }}</p>
      </section>

      <section class="subcard desktop-tool-surface-card">
        <div class="card-header-row">
          <div>
            <h4>{{ shellI18nStore.t("tools.remoteLibraryClient", "Remote hosts") }}</h4>
            <p class="meta-line">{{ shellI18nStore.t("desktopShell.remoteLibrary.clientDescription", "Discover peers, pair with them, then browse their shared games.") }}</p>
          </div>
          <span class="pill">{{ clientHosts.length }} {{ shellI18nStore.t("desktopShell.remoteLibrary.hostsLabel", "hosts") }}</span>
        </div>

        <div class="button-row">
          <button type="button" class="action-button" :disabled="scanBusy" @click="remoteStore.scanHosts">
            {{ scanBusy ? shellI18nStore.t("desktopShell.remoteLibrary.scanning", "Scanning...") : shellI18nStore.t("tools.remoteLibraryScan", "Scan LAN") }}
          </button>
          <button type="button" class="action-button" :disabled="scanBusy || !clientHosts.length" @click="remoteStore.clearHosts">{{ shellI18nStore.t("buttons.clear", "Clear") }}</button>
        </div>

        <div class="desktop-tool-list desktop-remote-host-list">
          <article
            v-for="host in clientHosts"
            :key="host.hostId"
            class="desktop-tool-host-card"
            :class="{ 'is-active': activeHostId === host.hostId }"
          >
            <div class="card-header-row">
              <div>
                <strong>{{ host.name || host.address || shellI18nStore.t("desktopShell.remoteLibrary.hostLabel", "Host") }}</strong>
                <p class="meta-line">{{ host.url }}</p>
              </div>
              <span class="pill">{{ host.token ? shellI18nStore.t("tools.remoteLibraryPaired", "Paired") : shellI18nStore.t("desktopShell.remoteLibrary.unpaired", "Unpaired") }}</span>
            </div>

            <label v-if="!host.token" class="field">
              <span>{{ shellI18nStore.t("desktopShell.remoteLibrary.pairingCode", "Pairing code") }}</span>
              <input :value="pairCodes[host.hostId] || ''" type="text" :placeholder="shellI18nStore.t('desktopShell.remoteLibrary.pairCodePlaceholder', '123456')" @input="setPairCode(host.hostId, $event)" />
            </label>

            <div class="button-row">
              <button v-if="!host.token" type="button" class="action-button" @click="remoteStore.pairHost(host.hostId)">{{ shellI18nStore.t("tools.remoteLibraryPair", "Pair") }}</button>
              <button type="button" class="action-button" @click="remoteStore.browseHost(host.hostId)">{{ shellI18nStore.t("tools.remoteLibraryBrowse", "Browse") }}</button>
            </div>
          </article>
          <div v-if="!clientHosts.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.remoteLibraryNoHosts", "No hosts yet. Scan your LAN to discover hosts.") }}</div>
        </div>
      </section>
    </div>

    <section class="subcard desktop-tool-surface-card">
      <div class="card-header-row">
        <div>
          <h4>{{ shellI18nStore.t("tools.remoteLibraryGames", "Remote games") }}</h4>
          <p class="meta-line">{{ shellI18nStore.t("desktopShell.remoteLibrary.gamesDescription", "Select one or more remote games to copy into your local library.") }}</p>
        </div>
        <span class="pill">{{ selectedCount }} {{ shellI18nStore.t("desktopShell.remoteLibrary.selectedLabel", "selected") }}</span>
      </div>

      <div class="button-row">
        <button type="button" class="action-button" :disabled="downloadBusy || !selectedCount" @click="remoteStore.downloadSelected()">
          {{ downloadBusy ? shellI18nStore.t("desktopShell.updates.downloading", "Downloading...") : shellI18nStore.t("tools.remoteLibraryCopy", "Copy Selected") }}
        </button>
        <button type="button" class="action-button" :disabled="downloadBusy || !selectedCount" @click="remoteStore.downloadSelected({ launchAfter: true })">
          {{ shellI18nStore.t("tools.remoteLibraryCopyRun", "Copy + Run") }}
        </button>
      </div>

      <div class="desktop-tool-list desktop-remote-games-list">
        <label v-for="game in remoteGames" :key="game.key" class="desktop-tool-game-row">
          <input :checked="selectedRemotePaths.includes(game.path)" type="checkbox" @change="remoteStore.toggleRemoteSelection(game.path)" />
          <div>
            <strong>{{ game.title }}</strong>
            <small>{{ game.platform || shellI18nStore.t("desktopShell.remoteLibrary.unknownPlatform", "Unknown platform") }}</small>
          </div>
          <span class="pill">{{ game.path.split(/[\\/]/).pop() }}</span>
        </label>
        <div v-if="!remoteGames.length" class="desktop-tool-empty-state">{{ shellI18nStore.t("tools.remoteLibrarySelectHost", "Select a paired host and browse it to see remote games here.") }}</div>
      </div>

      <div class="desktop-path-entry-row">
        <input :value="manualPath" type="text" :placeholder="shellI18nStore.t('tools.remoteLibraryManualPath', '/path/to/file.7z')" @input="remoteStore.setManualPath($event.target.value)" />
        <button type="button" class="action-button" :disabled="downloadBusy" @click="remoteStore.downloadManualPath">{{ shellI18nStore.t("tools.remoteLibraryDownloadFile", "Download File") }}</button>
      </div>

      <p v-if="status" class="desktop-status-line" :data-tone="statusTone || 'info'">{{ status }}</p>
    </section>
  </div>
</template>
