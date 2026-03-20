<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import LazyArtwork from "./LazyArtwork.vue";

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: "cover"
  },
  selectedKey: {
    type: String,
    default: ""
  }
});

const emit = defineEmits(["select", "launch", "details", "show-folder", "create-shortcut"]);

const currentIndex = ref(0);
let slideshowTimer = null;

const activeRow = computed(() => props.rows[currentIndex.value] || null);

function syncCurrentIndex(preferredKey = props.selectedKey) {
  const rows = Array.isArray(props.rows) ? props.rows : [];
  if (!rows.length) {
    currentIndex.value = 0;
    return;
  }

  const preferredIndex = rows.findIndex((row) => row?.key === preferredKey);
  currentIndex.value = preferredIndex >= 0 ? preferredIndex : Math.min(currentIndex.value, rows.length - 1);
  const active = rows[currentIndex.value];
  if (active) {
    emit("select", active);
  }
}

function stopSlideshow() {
  if (slideshowTimer) {
    window.clearInterval(slideshowTimer);
    slideshowTimer = null;
  }
}

function startSlideshow() {
  stopSlideshow();
  if (props.mode !== "slideshow" || props.rows.length <= 1) {
    return;
  }
  slideshowTimer = window.setInterval(() => {
    nextRow();
  }, 5000);
}

function selectRowByIndex(index) {
  if (!props.rows.length) {
    return;
  }
  const normalized = ((Number(index) % props.rows.length) + props.rows.length) % props.rows.length;
  currentIndex.value = normalized;
  const active = props.rows[normalized];
  if (active) {
    emit("select", active);
  }
}

function previousRow() {
  selectRowByIndex(currentIndex.value - 1);
}

function nextRow() {
  selectRowByIndex(currentIndex.value + 1);
}

function rerollRandom() {
  if (!props.rows.length) {
    return;
  }
  const nextIndex = Math.floor(Math.random() * props.rows.length);
  selectRowByIndex(nextIndex);
}

watch(
  () => [props.rows, props.selectedKey, props.mode],
  () => {
    syncCurrentIndex();
    startSlideshow();
  },
  { immediate: true, deep: false }
);

onBeforeUnmount(() => {
  stopSlideshow();
});
</script>

<template>
  <div v-if="!rows.length" class="desktop-library-empty">No games match the current immersive view filters.</div>

  <section v-else-if="mode === 'focus'" class="desktop-immersive-focus">
    <aside class="desktop-immersive-focus-list">
      <button
        v-for="(row, index) in rows"
        :key="row.key"
        type="button"
        class="desktop-immersive-focus-item"
        :class="{ 'is-active': activeRow?.key === row.key }"
        @click="selectRowByIndex(index)"
      >
        <LazyArtwork :src="row.image" :alt="row.name" />
        <div>
          <strong>{{ row.name }}</strong>
          <small>{{ row.platform }} | {{ row.company }}</small>
        </div>
      </button>
    </aside>

    <article v-if="activeRow" class="desktop-immersive-focus-preview">
      <div class="desktop-immersive-hero">
        <LazyArtwork class="desktop-immersive-hero-image" :src="activeRow.image" :alt="activeRow.name" eager />
        <div class="desktop-immersive-hero-content">
          <div class="pill-row">
            <span class="pill">{{ activeRow.platform }}</span>
            <span class="pill">Rating {{ activeRow.rating }}</span>
            <span class="pill">{{ currentIndex + 1 }} / {{ rows.length }}</span>
          </div>
          <h3>{{ activeRow.name }}</h3>
          <p>{{ activeRow.description || activeRow.company }}</p>
          <div class="button-row">
            <button type="button" class="action-button" @click="$emit('launch', activeRow)">Launch</button>
            <button type="button" class="action-button" @click="$emit('details', activeRow)">Details</button>
            <button type="button" class="action-button" @click="$emit('show-folder', activeRow)">Show Folder</button>
            <button type="button" class="action-button" @click="$emit('create-shortcut', activeRow)">Shortcut</button>
          </div>
        </div>
      </div>
    </article>
  </section>

  <section v-else-if="mode === 'slideshow'" class="desktop-immersive-slideshow">
    <article v-if="activeRow" class="desktop-immersive-slide">
      <LazyArtwork class="desktop-immersive-slide-image" :src="activeRow.image" :alt="activeRow.name" eager />
      <div class="desktop-immersive-slide-overlay">
        <div class="card-header-row">
          <div>
            <div class="eyebrow">Slideshow</div>
            <h3>{{ activeRow.name }}</h3>
          </div>
          <span class="pill">{{ currentIndex + 1 }} / {{ rows.length }}</span>
        </div>
        <p>{{ activeRow.description || `${activeRow.company} | ${activeRow.genre}` }}</p>
        <div class="button-row">
          <button type="button" class="action-button" @click="previousRow">Previous</button>
          <button type="button" class="action-button" @click="nextRow">Next</button>
          <button type="button" class="action-button" @click="$emit('launch', activeRow)">Launch</button>
          <button type="button" class="action-button" @click="$emit('details', activeRow)">Details</button>
        </div>
      </div>
    </article>
  </section>

  <section v-else class="desktop-immersive-random">
    <article v-if="activeRow" class="desktop-immersive-random-card">
      <LazyArtwork class="desktop-immersive-random-image" :src="activeRow.image" :alt="activeRow.name" eager />
      <div class="desktop-immersive-random-content">
        <div class="eyebrow">Random Pick</div>
        <h3>{{ activeRow.name }}</h3>
        <p>{{ activeRow.platform }} | {{ activeRow.company }}</p>
        <div class="pill-row">
          <span class="pill">Rating {{ activeRow.rating }}</span>
          <span class="pill" v-if="activeRow.regionCode">Region {{ activeRow.regionCode.toUpperCase() }}</span>
        </div>
        <div class="button-row">
          <button type="button" class="action-button" @click="rerollRandom">Roll Again</button>
          <button type="button" class="action-button" @click="$emit('launch', activeRow)">Launch</button>
          <button type="button" class="action-button" @click="$emit('details', activeRow)">Details</button>
          <button type="button" class="action-button" @click="$emit('show-folder', activeRow)">Show Folder</button>
        </div>
      </div>
    </article>
  </section>
</template>
