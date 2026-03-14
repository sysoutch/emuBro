<script setup>
import { onBeforeUnmount, onMounted, ref, useAttrs, watch } from "vue";

const props = defineProps({
  src: {
    type: String,
    default: ""
  },
  alt: {
    type: String,
    default: ""
  },
  eager: {
    type: Boolean,
    default: false
  },
  rootMargin: {
    type: String,
    default: "280px"
  }
});

const emit = defineEmits(["error", "load"]);
const attrs = useAttrs();
const imageEl = ref(null);
const isVisible = ref(!!props.eager);
const currentSrc = ref("");
let observer = null;

function applySource() {
  currentSrc.value = isVisible.value ? String(props.src || "").trim() : "";
}

function stopObserving() {
  if (!observer) {
    return;
  }
  observer.disconnect();
  observer = null;
}

function handleIntersection(entries) {
  if (!Array.isArray(entries) || !entries.some((entry) => entry?.isIntersecting)) {
    return;
  }

  isVisible.value = true;
  applySource();
  stopObserving();
}

function startObserving() {
  stopObserving();

  if (props.eager) {
    isVisible.value = true;
    applySource();
    return;
  }

  if (typeof window === "undefined" || typeof window.IntersectionObserver !== "function") {
    isVisible.value = true;
    applySource();
    return;
  }

  if (!imageEl.value) {
    return;
  }

  observer = new window.IntersectionObserver(handleIntersection, {
    root: null,
    rootMargin: props.rootMargin,
    threshold: 0.01
  });
  observer.observe(imageEl.value);
}

watch(
  () => props.src,
  () => {
    applySource();
  }
);

onMounted(() => {
  applySource();
  startObserving();
});

onBeforeUnmount(() => {
  stopObserving();
});
</script>

<template>
  <img
    ref="imageEl"
    v-bind="attrs"
    :src="currentSrc || undefined"
    :alt="alt"
    :loading="eager ? 'eager' : 'lazy'"
    :decoding="eager ? 'sync' : 'async'"
    :fetchpriority="eager ? 'high' : 'low'"
    @error="emit('error', $event)"
    @load="emit('load', $event)"
  />
</template>
