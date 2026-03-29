<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="floating-menu glass-panel"
      :class="{ 'floating-menu--compact': compact }"
      :style="{ top: `${y}px`, left: `${x}px` }"
    >
      <div v-if="title" class="floating-menu__title">{{ title }}</div>
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="floating-menu__item"
        :class="{ 'floating-menu__item--danger': item.danger }"
        :disabled="item.disabled"
        @click.stop="handleSelect(item.key, item.disabled)"
      >
        {{ item.label }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { ContextMenuItem } from '../../types/context-menu'

interface Props {
  show: boolean
  x: number
  y: number
  items: ContextMenuItem[]
  title?: string
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  compact: false,
})

const emit = defineEmits<{
  select: [key: string]
}>()

function handleSelect(key: string, disabled = false) {
  if (disabled) return
  emit('select', key)
}
</script>

<style scoped lang="scss">
.floating-menu {
  position: fixed;
  z-index: 60;
  min-width: 220px;
  padding: 7px;
  border-radius: var(--radius-md);
  backdrop-filter: blur(22px);
  box-shadow: var(--shadow-md);
}

.floating-menu--compact {
  min-width: 240px;
}

.floating-menu__title {
  padding: 7px 9px 8px;
  color: var(--text-secondary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.floating-menu__item {
  display: block;
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-radius: 12px;
  color: var(--text-primary);
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s ease, opacity 0.18s ease;
  font-size: 0.82rem;
  text-align: left;
  background: transparent;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
  }

  &:disabled {
    opacity: 0.48;
    cursor: not-allowed;
  }
}

.floating-menu__item--danger {
  color: #ffc5cf;
}
</style>
