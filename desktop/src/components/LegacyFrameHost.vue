<script setup>
defineProps({
  ready: {
    type: Boolean,
    default: false
  },
  src: {
    type: String,
    default: ""
  }
});

defineEmits(["load", "error"]);
</script>

<template>
  <main class="legacy-shell">
    <iframe
      class="legacy-frame"
      :class="{ 'is-ready': ready }"
      :src="src"
      title="emuBro Legacy UI"
      @load="$emit('load')"
      @error="$emit('error')"
    />
  </main>
</template>

