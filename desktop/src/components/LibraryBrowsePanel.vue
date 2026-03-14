<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useSettingsToolsStore } from "../stores/settings-tools";
import { useLibraryBrowseStore } from "../stores/library-browse";
import { useWorkspaceStore } from "../stores/workspace";

const props = defineProps({
  visibleGameIds: {
    type: Array,
    default: () => []
  },
  allGameIds: {
    type: Array,
    default: () => []
  }
});

const browseStore = useLibraryBrowseStore();
const settingsToolsStore = useSettingsToolsStore();
const workspaceStore = useWorkspaceStore();
const { browseScope, coverBusy, lastDiscovery, notifications, quickSearchReady, searchBusy } = storeToRefs(browseStore);

const latestArchiveCount = computed(() => lastDiscovery.value.archives.length);
const latestSetupCount = computed(() => lastDiscovery.value.setupFiles.length);
const hasLibraryFolders = computed(() => workspaceStore.totalLibraryFolders > 0);

function openLibraryPathSettings() {
  settingsToolsStore.openPanel("settings");
}

onMounted(() => {
  browseStore.initialize();
  settingsToolsStore.initialize();
});
</script>

<template>
  <section class="subcard desktop-library-sidebar-card">
    <div class="card-header-row">
      <div>
        <h4>Browse and Scan</h4>
        <p class="meta-line">Shell-native search, quick-search seeds, discovery results, and cover downloads.</p>
      </div>
      <span class="pill">{{ searchBusy ? "Scanning" : "Ready" }}</span>
    </div>

    <div class="segmented-control">
      <button
        type="button"
        class="segmented-control-button"
        :class="{ 'is-active': browseScope === 'both' }"
        @click="browseStore.setBrowseScope('both')"
      >
        Both
      </button>
      <button
        type="button"
        class="segmented-control-button"
        :class="{ 'is-active': browseScope === 'games' }"
        @click="browseStore.setBrowseScope('games')"
      >
        Games
      </button>
      <button
        type="button"
        class="segmented-control-button"
        :class="{ 'is-active': browseScope === 'emulators' }"
        @click="browseStore.setBrowseScope('emulators')"
      >
        Emulators
      </button>
    </div>

    <div class="desktop-sidebar-action-group">
      <strong class="desktop-sidebar-group-title">Discovery</strong>
      <div class="button-row">
        <button type="button" class="action-button" :disabled="searchBusy" @click="browseStore.runBrowseSearch('full')">
          {{ searchBusy ? "Searching..." : "Full Search" }}
        </button>
        <button type="button" class="action-button" :disabled="searchBusy || !quickSearchReady" @click="browseStore.runBrowseSearch('quick')">
          Quick Search
        </button>
        <button type="button" class="action-button" :disabled="searchBusy" @click="browseStore.runBrowseSearch('custom')">
          Custom Folder
        </button>
      </div>
    </div>

    <div class="desktop-sidebar-action-group">
      <strong class="desktop-sidebar-group-title">Covers</strong>
      <div class="button-row">
        <button
          type="button"
          class="action-button"
          :disabled="coverBusy || props.visibleGameIds.length === 0"
          @click="browseStore.downloadMissingCovers(props.visibleGameIds)"
        >
          {{ coverBusy ? "Downloading..." : `Missing Covers (${props.visibleGameIds.length})` }}
        </button>
        <button
          type="button"
          class="action-button"
          :disabled="coverBusy || props.allGameIds.length === 0"
          @click="browseStore.downloadMissingCovers(props.allGameIds)"
        >
          {{ coverBusy ? "Downloading..." : `Full Library Covers (${props.allGameIds.length})` }}
        </button>
        <button type="button" class="action-button" :disabled="notifications.length === 0" @click="browseStore.clearNotifications">
          Clear Log
        </button>
      </div>
    </div>

    <div v-if="!hasLibraryFolders" class="desktop-library-empty">
      No library folders are configured yet.
      <div class="button-row">
        <button type="button" class="action-button" @click="openLibraryPathSettings">Open Library Paths</button>
      </div>
    </div>

    <div class="desktop-browse-discovery">
      <div class="card-header-row">
        <h5>Latest discovery</h5>
        <span class="pill">{{ lastDiscovery.scannedAt ? "Available" : "Empty" }}</span>
      </div>
      <div class="pill-row">
        <span class="pill">Archives {{ latestArchiveCount }}</span>
        <span class="pill">Setup Files {{ latestSetupCount }}</span>
      </div>
      <div v-if="latestArchiveCount || latestSetupCount" class="desktop-browse-discovery-grid">
        <div v-if="latestArchiveCount" class="desktop-browse-discovery-list">
          <strong>Archives</strong>
          <button
            v-for="(path, index) in lastDiscovery.archives.slice(0, 6)"
            :key="`archive-${index}`"
            type="button"
            class="desktop-docs-list-item"
            @click="browseStore.openPath(path)"
          >
            <strong>{{ path.split(/[\\/]/).pop() }}</strong>
            <small>{{ path }}</small>
          </button>
        </div>
        <div v-if="latestSetupCount" class="desktop-browse-discovery-list">
          <strong>Setup Files</strong>
          <button
            v-for="(path, index) in lastDiscovery.setupFiles.slice(0, 6)"
            :key="`setup-${index}`"
            type="button"
            class="desktop-docs-list-item"
            @click="browseStore.openPath(path)"
          >
            <strong>{{ path.split(/[\\/]/).pop() }}</strong>
            <small>{{ path }}</small>
          </button>
        </div>
      </div>
      <div v-else class="desktop-library-empty">Run a shell search to inspect discovered archives and setup files here.</div>
    </div>

    <div class="desktop-browse-notifications">
      <div class="card-header-row">
        <h5>Activity</h5>
        <span class="pill">{{ notifications.length }} entries</span>
      </div>
      <div v-if="notifications.length" class="desktop-notification-list">
        <article v-for="item in notifications" :key="item.id" class="desktop-notification-item" :class="`is-${item.level}`">
          <strong>{{ item.stamp }}</strong>
          <p>{{ item.message }}</p>
        </article>
      </div>
      <div v-else class="desktop-library-empty">Search and cover actions will log here.</div>
    </div>
  </section>
</template>
