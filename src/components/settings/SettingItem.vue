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
      <input
        v-if="type === 'checkbox'"
        v-model="internalValue"
        type="checkbox"
        :disabled="disabled"
        class="setting-item__checkbox"
      />

      <!-- Select dropdown -->
      <select
        v-else-if="type === 'select'"
        v-model="internalValue"
        :disabled="disabled"
        class="setting-item__select"
      >
        <option v-for="option in options" :key="String(option.value)" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <!-- Range slider -->
      <div v-else-if="type === 'range'" class="setting-item__range">
        <input
          v-model.number="internalValue"
          type="range"
          :min="min"
          :max="max"
          :step="step"
          :disabled="disabled"
          class="setting-item__range-input"
        />
        <span class="setting-item__range-value">{{ displayValue }}</span>
      </div>

      <!-- Text input -->
      <input
        v-else-if="type === 'text'"
        v-model="internalValue"
        type="text"
        :disabled="disabled"
        :placeholder="placeholder"
        class="setting-item__input"
      />

      <!-- Number input -->
      <input
        v-else-if="type === 'number'"
        v-model.number="internalValue"
        type="number"
        :disabled="disabled"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        class="setting-item__input"
      />

      <!-- Color input -->
      <div v-else-if="type === 'color'" class="setting-item__color">
        <input
          v-model="internalValue"
          type="text"
          :disabled="disabled"
          :placeholder="placeholder || '#1db954'"
          class="setting-item__input"
        />
        <input
          v-model="internalValue"
          type="color"
          :disabled="disabled"
          class="setting-item__color-input"
        />
      </div>

      <!-- Color palette -->
      <div v-else-if="type === 'color-palette'" class="setting-item__palette">
        <button
          v-for="color in options"
          :key="String(color.value)"
          :class="['setting-item__color-button', { active: internalValue === color.value }]"
          :style="{ backgroundColor: color.color }"
          :disabled="disabled"
          @click="internalValue = color.value"
        />
      </div>

      <!-- Path input -->
      <div v-else-if="type === 'path'" class="setting-item__path">
        <input
          v-model="internalValue"
          type="text"
          :disabled="disabled"
          :placeholder="placeholder"
          class="setting-item__input"
        />
        <button
          :disabled="disabled"
          class="setting-item__button"
          @click="$emit('browse')"
        >
          浏览
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

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

// Auto-save on change
watch(internalValue, (newValue) => {
  emit('update:modelValue', newValue)
}, { deep: true })
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

  &__checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary-color);
  }

  &__select,
  &__input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    font-size: 14px;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__range {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;

    &-input {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: var(--border-color);
      border-radius: 2px;
      outline: none;
      cursor: pointer;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 16px;
        height: 16px;
        background: var(--primary-color);
        border-radius: 50%;
        cursor: pointer;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.2);
        }
      }

      &::-moz-range-thumb {
        width: 16px;
        height: 16px;
        background: var(--primary-color);
        border-radius: 50%;
        cursor: pointer;
        border: none;
        transition: transform 0.2s;

        &:hover {
          transform: scale(1.2);
        }
      }
    }

    &-value {
      min-width: 50px;
      text-align: right;
      font-size: 14px;
      color: var(--text-secondary);
      font-weight: 500;
    }
  }

  &__color {
    display: flex;
    gap: 8px;
    width: 100%;

    .setting-item__input {
      flex: 1;
    }

    &-input {
      width: 40px;
      height: 36px;
      padding: 2px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      cursor: pointer;
      flex-shrink: 0;
    }
  }

  &__palette {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__color-button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      transform: scale(1.1);
    }

    &.active {
      border-color: var(--text-primary);
      box-shadow: 0 0 0 2px var(--bg-primary);
    }
  }

  &__path {
    display: flex;
    gap: 8px;
    width: 100%;

    .setting-item__input {
      flex: 1;
    }
  }

  &__button {
    padding: 8px 16px;
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover:not(:disabled) {
      background: var(--bg-hover);
      border-color: var(--primary-color);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
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
