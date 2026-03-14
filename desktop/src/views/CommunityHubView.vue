<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useCommunityHubStore } from "../stores/community-hub";
import { useShellI18nStore } from "../stores/shell-i18n";

const appStore = useAppStore();
const communityStore = useCommunityHubStore();
const shellI18nStore = useShellI18nStore();

const { actionBusy, actionStatus, activePlatform, activePlatformId, discordInAppEnabled, error, lastOpenedPlatform, platforms } =
  storeToRefs(communityStore);

const translatedPlatforms = computed(() =>
  platforms.value.map((platform) => ({
    ...platform,
    label: shellI18nStore.t(`desktopShell.community.platforms.${platform.id}.label`, platform.label),
    blurb: shellI18nStore.t(`desktopShell.community.platforms.${platform.id}.blurb`, platform.blurb)
  }))
);

const activePlatformMeta = computed(
  () => translatedPlatforms.value.find((platform) => platform.id === activePlatformId.value) || translatedPlatforms.value[0]
);

const lastOpenedPlatformMeta = computed(() =>
  lastOpenedPlatform.value
    ? translatedPlatforms.value.find((platform) => platform.id === lastOpenedPlatform.value.id) || null
    : null
);

const currentModeLabel = computed(() =>
  activePlatform.value.requiresOptIn && !discordInAppEnabled.value
    ? shellI18nStore.t("desktopShell.community.browserMode", "Browser mode")
    : shellI18nStore.t("desktopShell.community.inAppBrowser", "In-app browser")
);

const communitySummary = computed(() =>
  activePlatform.value.requiresOptIn
    ? shellI18nStore.t(
        "desktopShell.community.summaryOptIn",
        "This destination can use the in-app browser only when the opt-in is enabled."
      )
    : shellI18nStore.t(
        "desktopShell.community.summaryDirect",
        "This destination can open directly in the shell in-app browser without extra opt-in."
      )
);

function useCommunityStartup() {
  appStore.setPreferredStartupSection("community-hub");
}

onMounted(() => {
  communityStore.initialize();
});
</script>

<template>
  <div class="desktop-workspace-layout">
    <aside class="desktop-workspace-sidebar">
      <section class="subcard desktop-workspace-nav-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t("desktopShell.groups.community.label", "Community") }}</div>
            <h4>{{ shellI18nStore.t("desktopShell.community.platformsLabel", "Platforms") }}</h4>
          </div>
          <span class="pill">{{ activePlatformMeta?.label || activePlatform.label }}</span>
        </div>
        <div class="desktop-workspace-nav-list">
          <button
            v-for="platform in translatedPlatforms"
            :key="platform.id"
            type="button"
            class="desktop-workspace-nav-button"
            :class="{ 'is-active': activePlatformId === platform.id }"
            @click="communityStore.setActivePlatform(platform.id)"
          >
            <strong>{{ platform.label }}</strong>
            <small>{{ platform.blurb }}</small>
          </button>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" @click="useCommunityStartup">
            {{ shellI18nStore.t("desktopShell.actions.useAsStartup", "Use As Startup") }}
          </button>
          <button type="button" class="action-button" @click="communityStore.closeCommunityWindows">
            {{ shellI18nStore.t("desktopShell.community.closeInAppWindows", "Close In-App Windows") }}
          </button>
        </div>
      </section>

      <section class="subcard desktop-workspace-nav-card">
        <div class="card-header-row">
          <h4>{{ shellI18nStore.t("desktopShell.community.launchMode", "Launch mode") }}</h4>
          <span class="pill">{{ currentModeLabel }}</span>
        </div>
        <label class="toolbar-checkbox">
          <input :checked="discordInAppEnabled" type="checkbox" @change="communityStore.setDiscordInAppEnabled($event.target.checked)" />
          <span>{{ shellI18nStore.t("desktopShell.community.allowDiscordInApp", "Allow Discord in-app") }}</span>
        </label>
        <div class="desktop-sidebar-stat-list">
          <div class="desktop-sidebar-stat">
            <strong>{{ translatedPlatforms.length }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.community.platformsLabel", "Platforms") }}</span>
          </div>
          <div class="desktop-sidebar-stat">
            <strong>{{ lastOpenedPlatformMeta ? lastOpenedPlatformMeta.label : shellI18nStore.t("desktopShell.community.none", "None") }}</strong>
            <span>{{ shellI18nStore.t("desktopShell.community.lastOpened", "Last opened") }}</span>
          </div>
        </div>
      </section>
    </aside>

    <section class="desktop-workspace-main">
      <section class="card desktop-workspace-hero-card">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ shellI18nStore.t("desktopShell.groups.community.label", "Community") }}</div>
            <h2>{{ shellI18nStore.t("desktopShell.community.heroTitle", "Community hub") }}</h2>
          </div>
          <span class="pill">{{ currentModeLabel }}</span>
        </div>
        <p>{{ shellI18nStore.t("desktopShell.community.heroDescription", "Community is now a shell-native section. It reuses the native in-app browser bridge and keeps the current platform and Discord opt-in state outside the legacy renderer.") }}</p>
        <p class="meta-line">{{ communitySummary }}</p>
        <div class="button-row">
          <button type="button" class="action-button" :disabled="actionBusy" @click="communityStore.openPlatform(activePlatformId)">
            {{
              actionBusy
                ? shellI18nStore.t("desktopShell.community.opening", "Opening...")
                : `${shellI18nStore.t("desktopShell.community.open", "Open")} ${activePlatformMeta?.label || activePlatform.label}`
            }}
          </button>
          <button type="button" class="action-button" :disabled="actionBusy" @click="communityStore.openPlatform(activePlatformId, { external: true })">
            {{ shellI18nStore.t("desktopShell.community.openInBrowser", "Open In Browser") }}
          </button>
        </div>
      </section>

      <section class="grid-two">
        <article class="card">
          <div class="card-header-row">
            <h3>{{ shellI18nStore.t("desktopShell.community.selectedPlatform", "Selected platform") }}</h3>
            <span class="pill">{{ activePlatformMeta?.label || activePlatform.label }}</span>
          </div>
          <p>{{ activePlatformMeta?.blurb || activePlatform.blurb }}</p>
          <ul class="path-list">
            <li>{{ shellI18nStore.t("desktopShell.community.url", "URL") }}: {{ activePlatform.url }}</li>
            <li>
              {{ shellI18nStore.t("desktopShell.community.discordOptInRequired", "Discord opt-in required") }}:
              {{ activePlatform.requiresOptIn ? shellI18nStore.t("buttons.yes", "Yes") : shellI18nStore.t("buttons.no", "No") }}
            </li>
            <li>{{ shellI18nStore.t("desktopShell.community.launchModeNow", "Launch mode now") }}: {{ currentModeLabel }}</li>
          </ul>
        </article>

        <article class="card">
          <div class="card-header-row">
            <h3>{{ shellI18nStore.t("desktopShell.community.status", "Status") }}</h3>
            <span class="pill">{{ actionBusy ? shellI18nStore.t("desktopShell.community.working", "Working") : shellI18nStore.t("desktopShell.community.idle", "Idle") }}</span>
          </div>
          <p v-if="actionStatus" class="meta-line">{{ actionStatus }}</p>
          <p v-else class="meta-line">
            {{ shellI18nStore.t("desktopShell.community.statusDescription", "Use this section to open official emuBro community destinations through the shell.") }}
          </p>
          <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
        </article>
      </section>

      <section class="card">
        <div class="card-header-row">
          <h3>{{ shellI18nStore.t("desktopShell.community.allDestinations", "All community destinations") }}</h3>
          <span class="pill">{{ translatedPlatforms.length }} {{ shellI18nStore.t("desktopShell.community.total", "total") }}</span>
        </div>

        <div class="desktop-section-grid desktop-community-grid">
          <article
            v-for="platform in translatedPlatforms"
            :key="platform.id"
            class="desktop-section-card desktop-community-card"
            :class="{ 'is-active': activePlatformId === platform.id }"
          >
            <div>
              <div class="eyebrow">{{ platform.id }}</div>
              <h4>{{ platform.label }}</h4>
              <p>{{ platform.blurb }}</p>
            </div>
            <div class="button-row">
              <button type="button" class="action-button" @click="communityStore.setActivePlatform(platform.id)">
                {{ shellI18nStore.t("desktopShell.community.select", "Select") }}
              </button>
              <button type="button" class="action-button" :disabled="actionBusy" @click="communityStore.openPlatform(platform.id)">
                {{ shellI18nStore.t("desktopShell.community.open", "Open") }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>
