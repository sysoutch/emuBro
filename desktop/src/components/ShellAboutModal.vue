<script setup>
import { storeToRefs } from "pinia";
import { useWindowChromeStore } from "../stores/window-chrome";

const windowChromeStore = useWindowChromeStore();
const {
  aboutOpen,
  aboutReleaseNotes,
  aboutVersionLine,
  latestVersionLine,
  resourcesVersionLine,
  appState,
  resourcesState,
  userInfo,
  platformLabel,
  socialLinks,
  actionStatus,
  changelogOpen,
  error,
  updateLabel
} = storeToRefs(windowChromeStore);
</script>

<template>
  <div v-if="aboutOpen" class="desktop-modal-backdrop" @click.self="windowChromeStore.closeAbout()">
    <section class="desktop-modal-card desktop-about-modal">
      <div class="card-header-row">
        <div>
          <div class="eyebrow">About</div>
          <h3>emuBro desktop runtime</h3>
        </div>
        <button type="button" class="action-button" @click="windowChromeStore.closeAbout()">Close</button>
      </div>

      <div class="desktop-about-layout">
        <div class="desktop-about-hero">
          <span class="desktop-about-logo-wrap">
            <img src="/logo.png" alt="emuBro" class="desktop-about-logo" />
          </span>
          <div class="desktop-about-copy">
            <strong>EMU<em>BRO</em></strong>
            <small>{{ platformLabel }}</small>
          </div>
          <p class="meta-line">
            Shell-native about surface. This no longer depends on the legacy header button and old DOM modal.
          </p>
        </div>

        <div class="desktop-about-content">
          <div class="metrics">
            <div class="metric">
              <span class="metric-label">App Version</span>
              <strong>{{ aboutVersionLine }}</strong>
              <small>Latest: {{ latestVersionLine }}</small>
            </div>
            <div class="metric">
              <span class="metric-label">Resources</span>
              <strong>{{ resourcesVersionLine }}</strong>
              <small>{{ resourcesState.missingLocalResources ? "Resources missing locally" : updateLabel }}</small>
            </div>
            <div class="metric">
              <span class="metric-label">Profile</span>
              <strong>{{ userInfo.displayName }}</strong>
              <small>{{ userInfo.username }} | {{ userInfo.id }}</small>
            </div>
          </div>

          <article class="subcard desktop-about-section">
            <div class="card-header-row">
              <div>
                <h4>Update state</h4>
                <p class="meta-line">
                  {{ appState.downloaded ? "App download is ready to install." : appState.lastMessage || "No app update action recorded yet." }}
                </p>
              </div>
              <button type="button" class="action-button" @click="windowChromeStore.openUpdatesPanel()">Open Updates</button>
            </div>
            <div class="button-row">
              <button type="button" class="action-button" @click="windowChromeStore.openExternal('https://github.com/sysoutch/emuBro/releases')">
                Open Releases
              </button>
              <button type="button" class="action-button" @click="windowChromeStore.toggleChangelog()">
                {{ changelogOpen ? "Hide Changelog" : "Show Changelog" }}
              </button>
            </div>
            <pre v-if="changelogOpen" class="desktop-about-changelog">{{ aboutReleaseNotes }}</pre>
          </article>

          <article class="subcard desktop-about-section">
            <div class="card-header-row">
              <div>
                <h4>Community</h4>
                <p class="meta-line">Open community links through the desktop shell.</p>
              </div>
            </div>
            <div class="button-row">
              <button
                v-for="entry in socialLinks"
                :key="entry.id"
                type="button"
                class="action-button"
                @click="windowChromeStore.openExternal(entry.url)"
              >
                {{ entry.label }}
              </button>
            </div>
          </article>

          <p v-if="actionStatus" class="meta-line meta-line-success">{{ actionStatus }}</p>
          <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
