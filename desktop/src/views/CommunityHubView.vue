<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useAppStore } from "../stores/app";
import { useCommunityHubStore } from "../stores/community-hub";
import { useShellI18nStore } from "../stores/shell-i18n";

const appStore = useAppStore();
const communityStore = useCommunityHubStore();
const shellI18nStore = useShellI18nStore();

const {
  actionBusy,
  actionStatus,
  activePlatform,
  activePlatformFeed,
  activePlatformFeedError,
  activePlatformFeedItems,
  activePlatformFeedLoading,
  activePlatformId,
  discordInAppEnabled,
  error,
  lastOpenedPlatform,
  platforms
} = storeToRefs(communityStore);

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

const communitySummary = computed(() => activePlatformMeta.value?.viewDescription || activePlatform.value?.blurb || "");

const activePlatformCards = computed(() => activePlatformMeta.value?.highlightCards || []);

const activePlatformMode = computed(() => {
  const feedMode = String(activePlatformFeed.value?.mode || "").trim();
  if (feedMode) return feedMode;
  return String(activePlatformMeta.value?.viewKind || "guide").trim();
});

const activeFeedMessage = computed(() => {
  const message = String(activePlatformFeed.value?.message || "").trim();
  return message || communitySummary.value;
});

const statusLabel = computed(() => {
  if (actionBusy.value || activePlatformFeedLoading.value) {
    return shellI18nStore.t("desktopShell.community.working", "Working");
  }
  return shellI18nStore.t("desktopShell.community.idle", "Idle");
});

const lastUpdatedLabel = computed(() => {
  const rawValue = activePlatformFeed.value?.cachedAt || activePlatformFeed.value?.fetchedAt || "";
  return formatFeedTime(rawValue);
});

function useCommunityStartup() {
  appStore.setPreferredStartupSection("community-hub");
}

function normalizeDateInput(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1000000000000 ? value : value * 1000;
  }
  const text = String(value || "").trim();
  if (!text) return null;
  if (/^\d+$/.test(text)) {
    const numeric = Number(text);
    return numeric > 1000000000000 ? numeric : numeric * 1000;
  }
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFeedTime(value) {
  const normalized = normalizeDateInput(value);
  if (!normalized) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(normalized));
  } catch (_error) {
    return "";
  }
}

function feedItemActionLabel(item) {
  const badge = String(item?.badge || "").trim().toLowerCase();
  if (badge === "video") return "Open Video";
  if (badge === "thread") return "Open Thread";
  if (badge === "post") return "Open Post";
  return "Open Item";
}

function openPlatformFeedItem(item) {
  const url = String(item?.url || "").trim();
  if (!url) return;
  const label = String(item?.title || activePlatformMeta.value?.label || "community item").trim();
  void communityStore.openFeedItem(url, label);
}

function refreshFeed() {
  void communityStore.refreshActivePlatformFeed();
}

onMounted(() => {
  void communityStore.initialize();
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
            <h2>{{ activePlatformMeta?.viewTitle || shellI18nStore.t("desktopShell.community.heroTitle", "Community hub") }}</h2>
          </div>
          <span class="pill">{{ currentModeLabel }}</span>
        </div>
        <p>{{ activePlatformMeta?.viewDescription || shellI18nStore.t("desktopShell.community.heroDescription", "Community is now a shell-native section.") }}</p>
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
          <button
            v-if="activePlatformMeta?.viewKind === 'feed'"
            type="button"
            class="action-button"
            :disabled="activePlatformFeedLoading"
            @click="refreshFeed"
          >
            {{ activePlatformFeedLoading ? "Refreshing..." : "Refresh Feed" }}
          </button>
        </div>
      </section>

      <section class="card desktop-community-platform-shell" :data-platform="activePlatformId">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">{{ activePlatformMeta?.viewEyebrow || activePlatformMeta?.label }}</div>
            <h3>{{ activePlatformMeta?.viewTitle || activePlatformMeta?.label }}</h3>
          </div>
          <span class="pill">{{ activePlatformMeta?.label }}</span>
        </div>

        <div class="desktop-community-platform-layout">
          <div class="desktop-community-platform-main">
            <template v-if="activePlatformMode === 'feed'">
              <div v-if="activePlatformFeedLoading" class="desktop-community-feed-empty">
                Loading latest {{ activePlatformMeta?.label }} updates...
              </div>

              <div v-else-if="activePlatformFeedError" class="desktop-community-feed-empty is-error">
                {{ activePlatformFeedError }}
              </div>

              <div v-else-if="activePlatformFeedItems.length" class="desktop-community-feed-list">
                <article
                  v-for="item in activePlatformFeedItems"
                  :key="item.id || item.url"
                  class="desktop-community-feed-item"
                  :class="{ 'has-media': !!item.thumbnail, 'no-media': !item.thumbnail }"
                >
                  <div v-if="item.thumbnail" class="desktop-community-feed-item-media">
                    <img :src="item.thumbnail" :alt="item.title || activePlatformMeta?.label" loading="lazy" />
                  </div>
                  <div v-else class="desktop-community-feed-item-media is-placeholder">
                    <div class="desktop-community-feed-item-media-copy">
                      <span class="pill">{{ item.badge || activePlatformMeta?.label }}</span>
                      <strong>{{ shellI18nStore.t("desktopShell.community.noPreviewImage", "No preview image") }}</strong>
                    </div>
                  </div>
                  <div class="desktop-community-feed-item-body">
                    <div class="card-header-row">
                      <div>
                        <div class="eyebrow">{{ item.badge || activePlatformMeta?.label }}</div>
                        <h4>{{ item.title }}</h4>
                      </div>
                      <span v-if="formatFeedTime(item.publishedAt)" class="pill">{{ formatFeedTime(item.publishedAt) }}</span>
                    </div>
                    <p>{{ item.excerpt }}</p>
                    <div class="desktop-community-feed-meta">
                      <span v-if="item.author" class="pill">{{ item.author }}</span>
                      <span v-for="stat in item.stats || []" :key="stat" class="pill">{{ stat }}</span>
                    </div>
                    <div class="button-row">
                      <button type="button" class="action-button" @click="openPlatformFeedItem(item)">
                        {{ feedItemActionLabel(item) }}
                      </button>
                    </div>
                  </div>
                </article>
              </div>

              <div v-else class="desktop-community-feed-empty">
                No recent {{ activePlatformMeta?.label }} items yet.
              </div>
            </template>

            <template v-else>
              <div class="desktop-community-guide-grid">
                <article v-for="card in activePlatformCards" :key="card.title" class="desktop-community-guide-card">
                  <h4>{{ card.title }}</h4>
                  <p>{{ card.copy }}</p>
                </article>
              </div>
              <p v-if="activeFeedMessage" class="meta-line desktop-community-guide-note">{{ activeFeedMessage }}</p>
            </template>
          </div>

          <aside class="desktop-community-platform-aside">
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
                <li v-if="lastUpdatedLabel">Last updated: {{ lastUpdatedLabel }}</li>
              </ul>
            </article>

            <article class="card">
              <div class="card-header-row">
                <h3>{{ shellI18nStore.t("desktopShell.community.status", "Status") }}</h3>
                <span class="pill">{{ statusLabel }}</span>
              </div>
              <p v-if="actionStatus" class="meta-line">{{ actionStatus }}</p>
              <p v-else class="meta-line">
                {{ activeFeedMessage || shellI18nStore.t("desktopShell.community.statusDescription", "Use this section to open official emuBro community destinations through the shell.") }}
              </p>
              <p v-if="error" class="legacy-fallback-note">{{ error }}</p>
            </article>
          </aside>
        </div>
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
            role="button"
            tabindex="0"
            @click="communityStore.setActivePlatform(platform.id)"
          >
            <div>
              <div class="eyebrow">{{ platform.viewEyebrow || platform.id }}</div>
              <h4>{{ platform.label }}</h4>
              <p>{{ platform.blurb }}</p>
            </div>
            <div class="button-row">
              <button type="button" class="action-button" @click.stop="communityStore.setActivePlatform(platform.id)">
                View
              </button>
              <button type="button" class="action-button" :disabled="actionBusy" @click.stop="communityStore.openPlatform(platform.id)">
                {{ shellI18nStore.t("desktopShell.community.open", "Open") }}
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  </div>
</template>
