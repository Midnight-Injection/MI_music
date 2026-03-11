<template>
  <div v-show="isVisible" class="setting-section">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  searchQuery?: string
  sectionKeywords?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  searchQuery: '',
  sectionKeywords: () => []
})

const isVisible = computed(() => {
  if (!props.searchQuery) {
    return true
  }

  const query = props.searchQuery.toLowerCase()

  // Check if section keywords match
  const keywordMatch = props.sectionKeywords.some(keyword =>
    keyword.toLowerCase().includes(query)
  )

  return keywordMatch
})
</script>

<style scoped lang="scss">
.setting-section {
  animation: fadeIn 0.2s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
