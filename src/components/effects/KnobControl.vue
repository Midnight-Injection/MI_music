<template>
  <div class="knob-control" :class="{ disabled: disabled }">
    <div
      class="knob"
      :style="knobStyle"
      @mousedown="startDrag"
      @touchstart.prevent="startDrag"
    >
      <div class="knob-indicator" :style="indicatorStyle"></div>
    </div>
    <div class="knob-label">{{ label }}</div>
    <div class="knob-value">{{ displayValue }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  label?: string
  disabled?: boolean
  unit?: string
  formatValue?: (value: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  label: '',
  disabled: false,
  unit: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const isDragging = ref(false)
const startY = ref(0)
const startValue = ref(0)

const normalizedValue = computed(() => {
  return (props.modelValue - props.min) / (props.max - props.min)
})

const displayValue = computed(() => {
  if (props.formatValue) {
    return props.formatValue(props.modelValue)
  }
  return `${props.modelValue.toFixed(1)}${props.unit}`
})

const rotation = computed(() => {
  return -135 + normalizedValue.value * 270
})

const knobStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
}))

const indicatorStyle = computed(() => ({
  transform: `rotate(${-rotation.value}deg)`,
}))

function startDrag(event: MouseEvent | TouchEvent) {
  if (props.disabled) return

  isDragging.value = true
  startY.value = 'touches' in event ? event.touches[0].clientY : event.clientY
  startValue.value = props.modelValue

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('touchend', stopDrag)
}

function onDrag(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return

  const currentY = 'touches' in event ? event.touches[0].clientY : event.clientY
  const deltaY = startY.value - currentY
  const range = props.max - props.min
  const sensitivity = 0.5 // pixels per unit

  let newValue = startValue.value + (deltaY / sensitivity) * props.step

  // Snap to step
  newValue = Math.round(newValue / props.step) * props.step

  // Clamp to range
  newValue = Math.max(props.min, Math.min(props.max, newValue))

  emit('update:modelValue', newValue)

  if ('touches' in event) {
    event.preventDefault()
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('touchend', stopDrag)
})
</script>

<style scoped>
.knob-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.knob-control.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.knob {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border: 2px solid #3a3a3a;
  box-shadow:
    0 4px 8px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  cursor: ns-resize;
  transition: box-shadow 0.2s;
}

.knob:hover {
  box-shadow:
    0 6px 12px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.knob-indicator {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 4px;
  height: 12px;
  background: #4a9eff;
  border-radius: 2px;
  transform: translateX(-50%);
  box-shadow: 0 0 6px rgba(74, 158, 255, 0.6);
}

.knob-label {
  font-size: 12px;
  color: #888;
  text-align: center;
  font-weight: 500;
}

.knob-value {
  font-size: 14px;
  color: #fff;
  font-weight: 600;
  min-width: 60px;
  text-align: center;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}
</style>
