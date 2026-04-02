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
      <label v-if="type === 'checkbox'" class="setting-item__switch">
        <input
          v-model="internalValue"
          :disabled="disabled"
          type="checkbox"
          class="setting-item__switch-input"
        />
        <span class="setting-item__switch-track">
          <span class="setting-item__switch-thumb"></span>
        </span>
      </label>

      <!-- Select dropdown -->
      <select
        v-else-if="type === 'select'"
        v-model="internalValue"
        :disabled="disabled"
        class="setting-item__field setting-item__field--select"
      >
        <option
          v-for="option in selectOptions"
          :key="String(option.value)"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>

      <!-- Range slider -->
      <div v-else-if="type === 'range'" class="setting-item__range">
        <input
          v-model="internalValue"
          class="setting-item__range-input"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
        />
        <span class="setting-item__range-value">{{ displayValue }}</span>
      </div>

      <!-- Text input -->
      <input
        v-else-if="type === 'text'"
        v-model="internalValue"
        :disabled="disabled"
        :placeholder="placeholder"
        type="text"
        class="setting-item__field"
      />

      <!-- Number input -->
      <input
        v-else-if="type === 'number'"
        v-model.number="internalValue"
        :disabled="disabled"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        type="number"
        class="setting-item__field"
      />

      <!-- Color input -->
      <div v-else-if="type === 'color'" class="setting-item__color">
        <input
          v-model="internalValue"
          class="setting-item__color-input"
          type="color"
          :disabled="disabled"
        />
        <span class="setting-item__color-value">{{ internalValue }}</span>
      </div>

      <!-- Color palette -->
      <div v-else-if="type === 'color-palette'" class="setting-item__palette">
        <button
          v-for="color in options"
          :key="String(color.value)"
          type="button"
          :class="['setting-item__color-button', { active: internalValue === color.value }]"
          :style="{ backgroundColor: color.color }"
          :disabled="disabled"
          @click="internalValue = color.value"
        ></button>
      </div>

      <!-- Path input -->
      <div v-else-if="type === 'path'" class="setting-item__path">
        <input
          v-model="internalValue"
          :disabled="disabled"
          :placeholder="placeholder"
          readonly
          type="text"
          class="setting-item__field"
        />
        <button
          type="button"
          class="setting-item__browse"
          :disabled="disabled"
          @click="$emit('browse')"
        >
          浏览
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

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

const selectOptions = computed(() => props.options)

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
    display: flex;
    align-items: center;
    justify-content: flex-end;
    min-height: 36px;
  }

  &__field,
  &__browse,
  &__range-input,
  &__color-input {
    appearance: none;
    border: 1px solid var(--border-color);
    background: var(--input-surface);
    color: var(--text-primary);
    border-radius: 14px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }

  &__field {
    width: min(240px, 100%);
    min-height: 38px;
    padding: 0 12px;
    font-size: 14px;
    outline: none;

    &:focus {
      border-color: var(--border-light);
      background: var(--input-surface-focus);
    }
  }

  &__field--select {
    cursor: pointer;
  }

  &__range {
    width: min(240px, 100%);
    display: flex;
    align-items: center;
    gap: 12px;

    &-input {
      flex: 1;
      min-height: 6px;
      padding: 0;
      border-radius: 999px;
    }
  }

  &__range-value {
    min-width: 48px;
    color: var(--text-secondary);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &__switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: pointer;

    &-input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    &-track {
      position: relative;
      width: 46px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      padding: 3px;
      border-radius: 999px;
      background: var(--button-secondary-bg);
      border: 1px solid var(--border-color);
      transition: background-color var(--transition-fast), border-color var(--transition-fast);
    }

    &-thumb {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
      transition: transform var(--transition-fast);
    }
  }

  &__switch-input:checked + &__switch-track {
    background: var(--primary-color);
    border-color: transparent;
  }

  &__switch-input:checked + &__switch-track &__switch-thumb {
    transform: translateX(18px);
  }

  &__color {
    width: min(240px, 100%);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__color-input {
    width: 52px;
    height: 38px;
    padding: 4px;
  }

  &__color-value {
    color: var(--text-secondary);
    font-size: 13px;
  }

  &__palette {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: min(240px, 100%);
  }

  &__color-button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid transparent;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.14);

    &.active {
      border-color: rgba(255, 255, 255, 0.92);
    }
  }

  &__path {
    width: min(320px, 100%);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__browse {
    min-height: 38px;
    padding: 0 14px;
    cursor: pointer;
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
