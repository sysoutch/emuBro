<script setup>
import { storeToRefs } from "pinia";
import { useHeaderFiltersStore } from "../stores/header-filters";

const filtersStore = useHeaderFiltersStore();
const { coverSize, groupSameNames, librarySection, query, selectedGroup, summary, viewMode } = storeToRefs(filtersStore);
</script>

<template>
  <div class="stack">
    <section class="card">
      <h2>Header, search, and filter state</h2>
      <p>
        This toolbar is now shared by the migrated shell instead of being trapped in a placeholder view. The library workspace
        consumes the same store, so query, grouping, sorting, cover mode, and cover size now flow through one desktop-owned state model.
      </p>
    </section>

    <section class="grid-two">
      <article class="card">
        <h3>Persisted shell state</h3>
        <div class="metrics metrics-compact">
          <div class="metric">
            <span class="metric-label">Library section</span>
            <strong>{{ summary.librarySectionLabel }}</strong>
            <small>Controls whether the shell browser shows all games, favorites, recently played, or emulators.</small>
          </div>
          <div class="metric">
            <span class="metric-label">Query</span>
            <strong>{{ query || "None" }}</strong>
            <small>Stored in the desktop shell state DB and reused across shell sections.</small>
          </div>
          <div class="metric">
            <span class="metric-label">View mode</span>
            <strong>{{ viewMode }}</strong>
            <small>Shared with the migrated library view, including focus, slideshow, and random shell modes.</small>
          </div>
          <div class="metric">
            <span class="metric-label">Cover size</span>
            <strong>{{ coverSize }}%</strong>
            <small>Used directly by the migrated cover grid sizing logic.</small>
          </div>
        </div>
      </article>

      <article class="card">
        <h3>Current summary</h3>
        <div class="pill-row">
          <span class="pill">Section: {{ summary.librarySectionLabel }}</span>
          <span class="pill">{{ summary.platformLabel }}</span>
          <span v-if="librarySection !== 'emulators'" class="pill">{{ summary.regionLabel }}</span>
          <span v-if="librarySection !== 'emulators'" class="pill">{{ summary.languageLabel }}</span>
          <span v-if="librarySection !== 'emulators'" class="pill">Group: {{ summary.groupLabel }}</span>
          <span v-else class="pill">Type: {{ summary.emulatorTypeLabel }}</span>
          <span class="pill">Sort: {{ summary.sortLabel }}</span>
          <span v-if="librarySection !== 'emulators'" class="pill">Duplicates: {{ groupSameNames ? "Grouped" : "Separate" }}</span>
        </div>
        <p class="meta-line">
          {{ librarySection === "emulators" ? `Selected emulator type: ${summary.emulatorTypeLabel}` : `Selected group mode id: ${selectedGroup}` }}
        </p>
      </article>
    </section>
  </div>
</template>
