<script setup>
import { Teleport, computed, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  x: {
    type: Number,
    default: 0
  },
  y: {
    type: Number,
    default: 0
  },
  items: {
    type: Array,
    default: () => []
  },
  ariaLabel: {
    type: String,
    default: "Context menu"
  }
});

const emit = defineEmits(["close"]);

function closeMenu() {
  emit("close");
}

function buildMenuIcon(iconKey = "") {
  switch (String(iconKey || "").trim()) {
    case "play":
      return '<svg viewBox="0 0 24 24"><path d="m8 5 11 7-11 7z"></path></svg>';
    case "details":
      return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 10v6"></path><path d="M12 7h.01"></path></svg>';
    case "folder":
      return '<svg viewBox="0 0 24 24"><path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>';
    case "copy":
      return '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"></rect><rect x="4" y="4" width="11" height="11" rx="2"></rect></svg>';
    case "link":
      return '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L17 13"></path><path d="M14 11a5 5 0 0 1 0 7L12.5 19.5a5 5 0 0 1-7-7L7 11"></path></svg>';
    case "download":
      return '<svg viewBox="0 0 24 24"><path d="M12 4v10"></path><path d="m8.5 10.5 3.5 3.5 3.5-3.5"></path><path d="M5 19h14"></path></svg>';
    default:
      return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"></circle></svg>';
  }
}

const menuStyle = computed(() => ({
  left: `${Math.max(12, Number(props.x || 0))}px`,
  top: `${Math.max(12, Number(props.y || 0))}px`
}));

function onPointerDown(event) {
  if (!(event.target instanceof Element)) {
    closeMenu();
    return;
  }
  if (event.target.closest(".desktop-context-menu")) {
    return;
  }
  closeMenu();
}

function onKeyDown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
  }
}

function onViewportMutation() {
  closeMenu();
}

watch(
  () => props.visible,
  (visible) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }
    if (visible) {
      document.addEventListener("pointerdown", onPointerDown, true);
      window.addEventListener("keydown", onKeyDown, true);
      window.addEventListener("resize", onViewportMutation);
      window.addEventListener("scroll", onViewportMutation, true);
      return;
    }
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", onViewportMutation);
    window.removeEventListener("scroll", onViewportMutation, true);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    document.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", onViewportMutation);
    window.removeEventListener("scroll", onViewportMutation, true);
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="desktop-context-menu" :style="menuStyle" role="menu" :aria-label="ariaLabel">
      <template v-for="item in items" :key="item.id || item.label">
        <div v-if="item.separator" class="desktop-context-menu__separator"></div>
        <button
          v-else
          type="button"
          class="desktop-context-menu__item"
          :class="{ 'is-danger': item.danger }"
          :disabled="item.disabled"
          role="menuitem"
          @click="item.onSelect?.(); closeMenu();"
        >
          <span class="desktop-context-menu__label">{{ item.label }}</span>
          <span class="desktop-context-menu__icon" aria-hidden="true" v-html="buildMenuIcon(item.icon)"></span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
