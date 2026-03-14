<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useShellI18nStore } from "../stores/shell-i18n";
import { useLibraryCategoriesStore } from "../stores/library-categories";
import { useWorkspaceStore } from "../stores/workspace";

defineEmits(["open-ai-settings"]);
const shellI18nStore = useShellI18nStore();
const categoriesStore = useLibraryCategoriesStore();
const workspaceStore = useWorkspaceStore();
const { hasSelection, loading, selectionMode, showAll, sortMode, visibleCategoryRows } = storeToRefs(categoriesStore);
const { stats } = storeToRefs(workspaceStore);

const totalRows = computed(() => categoriesStore.categoryRows.length);
const visibleRowsCount = computed(() => visibleCategoryRows.value.length);
const remainingRowsCount = computed(() => Math.max(0, totalRows.value - visibleRowsCount.value));

onMounted(() => {
  void categoriesStore.initialize();
});
</script>

<template>
  <section class="subcard desktop-library-sidebar-card desktop-library-categories-card">
    <div class="card-header-row">
      <div>
        <h4>{{ shellI18nStore.t("sidebar.categories", "Categories") }}</h4>
        <p class="meta-line">
          {{
            shellI18nStore.t(
              "desktopShell.categories.description",
              "Shell-native tag filters using the same library tag catalog as the legacy sidebar."
            )
          }}
        </p>
      </div>
      <span class="pill">{{ totalRows }} {{ shellI18nStore.t("desktopShell.categories.tagsLabel", "tags") }}</span>
    </div>

    <div class="desktop-sidebar-section">
      <div class="desktop-sidebar-group-title">{{ shellI18nStore.t("sidebar.categories", "Categories") }}</div>
      <div class="desktop-category-list desktop-category-list--library">
        <button
          type="button"
          class="desktop-category-item"
          :class="{ 'is-active': !hasSelection }"
          @click="categoriesStore.clearSelection"
        >
          <strong>{{ shellI18nStore.t("desktopShell.categories.all", "All") }}</strong>
          <span>{{ totalRows }}</span>
        </button>
      </div>
    </div>

    <div class="desktop-sidebar-section">
      <label class="desktop-sidebar-field">
        <span>{{ shellI18nStore.t("categories.categoriesSortBy", "Sort by") }}</span>
        <select :value="sortMode" @change="categoriesStore.setSortMode($event.target.value)">
          <option value="count-desc">{{ shellI18nStore.t("categories.categoriesSortGameCount", "Game Count") }}</option>
          <option value="name-asc">{{ shellI18nStore.t("categories.categoriesSortNameAsc", "Name") }}</option>
        </select>
      </label>
    </div>

    <div class="desktop-sidebar-action-group">
      <button
        type="button"
        class="action-button"
        :class="{ 'is-active': selectionMode === 'multi' }"
        @click="categoriesStore.setSelectionMode('multi')"
      >
        {{ shellI18nStore.t("categories.multiSelect", "Multi Select") }}
      </button>
      <button
        type="button"
        class="action-button"
        @click="$emit('open-ai-settings')"
      >
        {{ shellI18nStore.t("categories.bulkApplyTagsWithLlm", "Add Global Tags With LLM") }}
      </button>
    </div>

    <div v-if="loading" class="desktop-library-empty">
      {{ shellI18nStore.t("desktopShell.categories.loadingCatalog", "Loading category catalog...") }}
    </div>
    <div v-else-if="!totalRows" class="desktop-library-empty">
      {{ shellI18nStore.t("categories.noTagsFound", "No tags found in the current library.") }}
    </div>
    <div v-else class="desktop-category-list desktop-category-list--library">
      <button
        v-for="row in visibleCategoryRows"
        :key="row.id"
        type="button"
        class="desktop-category-item"
        :class="{ 'is-active': row.selected }"
        @click="categoriesStore.toggleTag(row.id)"
      >
        <strong>{{ row.label }}</strong>
        <span>{{ row.count }}</span>
      </button>
    </div>

    <div class="button-row">
      <button v-if="totalRows > visibleRowsCount || showAll" type="button" class="action-button" @click="categoriesStore.toggleShowAll">
        {{
          showAll
            ? shellI18nStore.t("desktopShell.categories.showLess", "Show Less")
            : `${shellI18nStore.t("desktopShell.categories.showAll", "Show More")} (${remainingRowsCount})`
        }}
      </button>
      <button type="button" class="action-button" :disabled="!hasSelection" @click="categoriesStore.clearSelection">
        {{ shellI18nStore.t("desktopShell.categories.clearSelection", "Clear Selection") }}
      </button>
      <button type="button" class="action-button" @click="categoriesStore.refreshCatalog">
        {{ shellI18nStore.t("desktopShell.categories.reloadTags", "Reload Tags") }}
      </button>
    </div>

    <div class="desktop-sidebar-section">
      <div class="desktop-sidebar-group-title">{{ shellI18nStore.t("desktopShell.library.stats", "Stats") }}</div>
      <div class="desktop-sidebar-stat-list">
        <div class="desktop-sidebar-stat">
          <strong>{{ stats.games }}</strong>
          <span>{{ shellI18nStore.t("sidebar.totalGames", "Total Games") }}</span>
        </div>
        <div class="desktop-sidebar-stat">
          <strong>{{ stats.emulators }}</strong>
          <span>{{ shellI18nStore.t("sidebar.totalEmulators", "Total Emulators") }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
