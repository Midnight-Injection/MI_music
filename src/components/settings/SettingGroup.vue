<template>
  <div v-show="isVisible" class="setting-group">
    <h3 v-if="title" class="setting-group__title">{{ title }}</h3>
    <div v-if="description" class="setting-group__description">
      {{ description }}
    </div>
    <div class="setting-group__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title?: string
  description?: string
  visible?: boolean
  searchQuery?: string
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  searchQuery: ''
})

const isVisible = computed(() => {
  if (!props.searchQuery) {
    return props.visible
  }

  // Check if any children match the search query
  const query = props.searchQuery.toLowerCase()
  const titleMatch = props.title?.toLowerCase().includes(query) || false
  const descMatch = props.description?.toLowerCase().includes(query) || false

  return props.visible && (titleMatch || descMatch)
})
</script>

<style scoped lang="scss">
.setting-group {
  margin-bottom: 32px;
  padding: 20px;
  background: var(--bg-secondary);
  border-radius: 12px;
  border: 1px solid var(--border-color);

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 8px 0;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--primary-color);
  }

  &__description {
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 16px;
    line-height: 1.5;
  }

  &__content {
    > :last-child {
      border-bottom: none;
    }
  }
}
</style>
