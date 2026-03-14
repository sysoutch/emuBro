<script setup>
import { computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useHeaderFiltersStore } from "../stores/header-filters";
import { useShellI18nStore } from "../stores/shell-i18n";

const filtersStore = useHeaderFiltersStore();
const shellI18nStore = useShellI18nStore();
const {
  coverSize,
  emulatorType,
  emulatorTypeOptions,
  groupOptions,
  groupSameNames,
  librarySection,
  languageOptions,
  loading,
  platformOptions,
  regionOptions,
  selectedGroup,
  selectedLanguage,
  selectedPlatform,
  selectedRegion,
  sortBy,
  sortOptions,
  viewModeOptions,
  viewMode
} = storeToRefs(filtersStore);

function translateViewMode(option) {
  const keyMap = {
    cover: "views.cover",
    list: "views.list",
    focus: "views.focus",
    slideshow: "views.slideshow",
    random: "views.random"
  };
  return shellI18nStore.t(keyMap[option?.id], option?.label || "");
}

function translateRegion(option) {
  const keyMap = {
    all: "desktopShell.library.allRegions",
    us: "desktopShell.library.regionUsa",
    eu: "desktopShell.library.regionEurope",
    jp: "desktopShell.library.regionJapan"
  };
  return shellI18nStore.t(keyMap[option?.id], option?.label || "");
}

function translateGroup(option) {
  const keyMap = {
    none: "filters.groupNone",
    platform: "filters.groupPlatform",
    company: "filters.groupCompany",
    series: "desktopShell.library.groupSeries"
  };
  return shellI18nStore.t(keyMap[option?.id], option?.label || "");
}

function translateSort(option) {
  const keyMap = {
    name: "gameGrid.sortByName",
    platform: "gameGrid.sortByPlatform",
    rating: "gameGrid.sortByRating",
    recent: "desktopShell.library.sortByRecent"
  };
  return shellI18nStore.t(keyMap[option?.id], option?.label || "");
}

function translateEmulatorType(option) {
  const keyMap = {
    all: "desktopShell.library.allTypes",
    standalone: "desktopShell.library.typeStandalone",
    core: "desktopShell.library.typeCores",
    web: "desktopShell.library.typeWeb"
  };
  return shellI18nStore.t(keyMap[option?.id], option?.label || "");
}

const translatedViewModeOptions = computed(() =>
  viewModeOptions.value.map((option) => ({
    ...option,
    label: translateViewMode(option)
  }))
);

const translatedPlatformOptions = computed(() =>
  platformOptions.value.map((option) => ({
    ...option,
    label: option.id === "all" ? shellI18nStore.t("gameGrid.allPlatforms", option.label || "All Platforms") : option.label
  }))
);

const translatedRegionOptions = computed(() =>
  regionOptions.value.map((option) => ({
    ...option,
    label: translateRegion(option)
  }))
);

const translatedLanguageOptions = computed(() =>
  languageOptions.value.map((option) => ({
    ...option,
    label: option.id === "all" ? shellI18nStore.t("desktopShell.library.allLanguages", option.label || "All Languages") : option.label
  }))
);

const translatedGroupOptions = computed(() =>
  groupOptions.value.map((option) => ({
    ...option,
    label: translateGroup(option)
  }))
);

const translatedSortOptions = computed(() =>
  sortOptions.value.map((option) => ({
    ...option,
    label: translateSort(option)
  }))
);

const translatedEmulatorTypeOptions = computed(() =>
  emulatorTypeOptions.value.map((option) => ({
    ...option,
    label: translateEmulatorType(option)
  }))
);

onMounted(() => {
  void (async () => {
    await filtersStore.initialize();
    filtersStore.persist();
  })();
});
</script>

<template>
  <section class="card shell-toolbar-card">
    <div class="toolbar-row">
      <div class="segmented-control">
        <button
          v-for="option in translatedViewModeOptions.filter((row) => librarySection === 'emulators' ? row.id === 'cover' || row.id === 'list' : true)"
          :key="option.id"
          type="button"
          class="segmented-control-button"
          :class="{ 'is-active': viewMode === option.id }"
          @click="filtersStore.updateField('viewMode', option.id)"
        >
          {{ option.label }}
        </button>
      </div>

      <label class="toolbar-size-field">
        <span>{{ shellI18nStore.t("views.size", "Size") }}</span>
        <input
          :value="coverSize"
          type="range"
          min="30"
          max="100"
          step="1"
          :disabled="librarySection !== 'emulators' && viewMode === 'random'"
          @input="filtersStore.updateField('coverSize', Number($event.target.value))"
        />
        <strong>{{ coverSize }}%</strong>
      </label>
    </div>

    <div class="toolbar-row toolbar-row-filters">
      <select :value="selectedPlatform" @change="filtersStore.updateField('selectedPlatform', $event.target.value)">
        <option v-for="option in translatedPlatformOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select>

      <template v-if="librarySection !== 'emulators'">
        <select :value="selectedRegion" @change="filtersStore.updateField('selectedRegion', $event.target.value)">
          <option v-for="option in translatedRegionOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>

        <select :value="selectedLanguage" @change="filtersStore.updateField('selectedLanguage', $event.target.value)">
          <option v-for="option in translatedLanguageOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>

        <select :value="selectedGroup" @change="filtersStore.updateField('selectedGroup', $event.target.value)">
          <option v-for="option in translatedGroupOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
        </select>
      </template>

      <select v-else :value="emulatorType" @change="filtersStore.updateField('emulatorType', $event.target.value)">
        <option v-for="option in translatedEmulatorTypeOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select>

      <select :value="sortBy" @change="filtersStore.updateField('sortBy', $event.target.value)">
        <option v-for="option in translatedSortOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
      </select>

      <label v-if="librarySection !== 'emulators'" class="toolbar-checkbox">
        <input
          :checked="groupSameNames"
          type="checkbox"
          @change="filtersStore.updateField('groupSameNames', $event.target.checked)"
        />
        <span>{{ shellI18nStore.t("filters.groupSameNames", "Group same names") }}</span>
      </label>

      <span class="pill">
        {{
          loading
            ? shellI18nStore.t("desktopShell.library.loadingFilters", "Loading filters...")
            : shellI18nStore.t("desktopShell.library.filterCatalogReady", "Filter catalog ready")
        }}
      </span>

      <button type="button" class="action-button" @click="filtersStore.reset">
        {{ shellI18nStore.t("desktopShell.library.resetFilters", "Reset") }}
      </button>
    </div>
  </section>
</template>
