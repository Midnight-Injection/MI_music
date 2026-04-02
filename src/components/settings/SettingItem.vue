<template>
  <div
    :class="['setting-item', { 'setting-item--disabled': disabled }]"
    v-show="isVisible"
  >
    <div class="setting-item__label">
      <label>{{ label }}</label>
      <span v-if="description" class="setting-item__description">
        {{ description }}
      </span>
    </div>

    <div class="setting-item__control">
      <!-- Checkbox -->
      <NSwitch
        v-if="type === 'checkbox'"
        v-model:value="internalValue"
        :disabled="disabled"
      />

      <!-- Select dropdown -->
      <NSelect
        v-else-if="type === 'select'"
        v-model:value="internalValue"
        :disabled="disabled"
        :options="selectOptions"
        size="small"
      />

      <!-- Range slider -->
      <div v-else-if="type === 'range'" class="setting-item__range">
        <NSlider
          v-model:value="internalValue"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          :format-tooltip="(value: number) => `${value}${suffix}`"
        />
        <span class="setting-item__range-value">{{ displayValue }}</span>
      </div>

      <!-- Text input -->
      <NInput
        v-else-if="type === 'text'"
        v-model:value="internalValue"
        :disabled="disabled"
        :placeholder="placeholder"
        size="small"
      />

      <!-- Number input -->
      <NInputNumber
        v-else-if="type === 'number'"
        v-model:value="internalValue"
        :disabled="disabled"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        size="small"
      />

      <!-- Color input -->
      <div v-else-if="type === 'color'" class="setting-item__color">
        <NColorPicker
          v-model:value="internalValue"
          :disabled="disabled"
          modes="hex"
          :swatches="[]"
          size="small"
        />
      </div>

      <!-- Color palette -->
      <div v-else-if="type === 'color-palette'" class="setting-item__palette">
        <NButton
          v-for="color in options"
          :key="String(color.value)"
          :class="['setting-item__color-button', { active: internalValue === color.value }]"
          :style="{ backgroundColor: color.color }"
          :disabled="disabled"
          size="small"
          circle
          @click="internalValue = color.value"
        />
      </div>

      <!-- Path input -->
      <div v-else-if="type === 'path'" class="setting-item__path">
        <NInput
          v-model:value="internalValue"
          :disabled="disabled"
          :placeholder="placeholder"
          size="small"
          readonly
        />
        <NButton
          :disabled="disabled"
          size="small"
          @click="$emit('browse')"
        >
          浏览
        </NButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { NSwitch, NSelect, NSlider, NInput, NInputNumber, NButton, NColorPicker } from 'naive-ui'

interface Option {
  value: string | number | boolean
  label: string
  color?: string
}

interface Props {
  label: string
  description?: string
  type: 'checkbox' | 'select' | 'range' | 'text' | 'number' | 'color' | 'color-palette' | 'path'
  modelValue: any
  disabled?: boolean
  options?: Option[]
  placeholder?: string
  min?: number
  max?: number
  step?: number
  suffix?: string
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  options: () => [],
  placeholder: '',
  min: 0,
  max: 100,
  step: 1,
  suffix: '',
  visible: true
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  browse: []
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const displayValue = computed(() => {
  if (props.suffix) {
    return `${internalValue.value}${props.suffix}`
  }
  return internalValue.value
})

const isVisible = computed(() => props.visible)

const selectOptions = computed(() => {
  return props.options.map(opt => ({
    label: opt.label,
    value: opt.value
  }))
})

// Note: emit is handled by the computed setter — no separate watcher needed
</script>

<style scoped lang="scss">
.setting-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
  gap: 20px;
  flex-wrap: wrap;

  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  &__label {
    flex: 1;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    gap: 4px;

    label {
      font-size: 14px;
      font-weight: 500;
      color: var(--text-primary);
      cursor: pointer;
    }
  }

  &__description {
    font-size: 12px;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  &__control {
    flex: 0 0 auto;
    min-width: 200px;
    max-width: 400px;
  }

}

@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: flex-start;

    &__label {
      min-width: 100%;
    }

    &__control {
      width: 100%;
      max-width: 100%;
    }
  }
}
</style>
