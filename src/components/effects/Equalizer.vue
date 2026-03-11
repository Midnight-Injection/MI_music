<template>
  <div class="equalizer">
    <div class="equalizer-header">
      <h3>10-Band Equalizer</h3>
      <div class="equalizer-controls">
        <button
          class="preset-btn"
          :class="{ active: effectsStore.equalizerPreset === preset }"
          v-for="preset in presets"
          :key="preset"
          @click="applyPreset(preset)"
        >
          {{ presetLabel(preset) }}
        </button>
        <button class="reset-btn" @click="reset">
          <span class="icon">↺</span>
          Reset
        </button>
      </div>
    </div>

    <div class="equalizer-bands">
      <div
        v-for="(band, index) in effectsStore.equalizerBands"
        :key="index"
        class="band"
      >
        <div class="band-slider-container">
          <div class="band-frequency">{{ band.label }}</div>
          <input
            type="range"
            class="band-slider"
            :class="{ positive: band.gain > 0, negative: band.gain < 0 }"
            :value="band.gain"
            min="-12"
            max="12"
            step="0.5"
            orient="vertical"
            @input="setBand(index, $event)"
            :disabled="!effectsStore.equalizerEnabled"
          />
          <div class="band-gain" :class="gainClass(band.gain)">
            {{ band.gain > 0 ? '+' : '' }}{{ band.gain.toFixed(1) }}
          </div>
        </div>
      </div>
    </div>

    <div class="equalizer-visualization">
      <canvas ref="canvas" :width="canvasWidth" :height="canvasHeight"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useEffectsStore } from '@/store/effects'

const effectsStore = useEffectsStore()
const canvas = ref<HTMLCanvasElement | null>(null)
const canvasWidth = 600
const canvasHeight = 120

const presets = ['flat', 'bass_boost', 'treble_boost', 'vocal', 'rock', 'electronic', 'classical', 'jazz'] as const

const presetLabels: Record<string, string> = {
  flat: 'Flat',
  bass_boost: 'Bass Boost',
  treble_boost: 'Treble Boost',
  vocal: 'Vocal',
  rock: 'Rock',
  electronic: 'Electronic',
  classical: 'Classical',
  jazz: 'Jazz',
}

function presetLabel(preset: string): string {
  return presetLabels[preset] || preset
}

function gainClass(gain: number): string {
  if (gain > 3) return 'high-boost'
  if (gain > 0) return 'boost'
  if (gain < -3) return 'high-cut'
  if (gain < 0) return 'cut'
  return 'neutral'
}

async function setBand(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const value = parseFloat(target.value)
  await effectsStore.setEqualizerBand(index, value)
}

async function applyPreset(preset: string) {
  await effectsStore.applyEqualizerPreset(preset)
}

async function reset() {
  await effectsStore.resetEqualizer()
}

function drawVisualization() {
  if (!canvas.value) return

  const ctx = canvas.value.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  const bands = effectsStore.equalizerBands
  const barWidth = canvasWidth / bands.length - 4
  const maxHeight = canvasHeight - 20
  const centerY = canvasHeight / 2

  bands.forEach((band, index) => {
    const x = index * (barWidth + 4) + 2
    const height = (Math.abs(band.gain) / 12) * maxHeight
    const y = band.gain >= 0 ? centerY - height : centerY

    // Draw bar
    const gradient = ctx.createLinearGradient(x, y, x, y + height)
    if (band.gain > 0) {
      gradient.addColorStop(0, '#4a9eff')
      gradient.addColorStop(1, '#2a7ed4')
    } else if (band.gain < 0) {
      gradient.addColorStop(0, '#ff6b6b')
      gradient.addColorStop(1, '#d64a4a')
    } else {
      gradient.addColorStop(0, '#888')
      gradient.addColorStop(1, '#666')
    }

    ctx.fillStyle = gradient
    ctx.fillRect(x, y, barWidth, height)

    // Draw frequency label
    ctx.fillStyle = '#888'
    ctx.font = '11px SF Mono, Monaco, Consolas, monospace'
    ctx.textAlign = 'center'
    ctx.fillText(band.label, x + barWidth / 2, canvasHeight - 5)
  })

  // Draw center line
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, centerY)
  ctx.lineTo(canvasWidth, centerY)
  ctx.stroke()
}

watch(
  () => effectsStore.equalizerBands,
  () => {
    drawVisualization()
  },
  { deep: true }
)

onMounted(() => {
  drawVisualization()
})
</script>

<style scoped>
.equalizer {
  padding: 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  border-radius: 12px;
  border: 1px solid #2a2a2a;
}

.equalizer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.equalizer-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.equalizer-controls {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 6px 12px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #ccc;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-btn:hover {
  background: #3a3a3a;
  border-color: #4a4a4a;
  color: #fff;
}

.preset-btn.active {
  background: #4a9eff;
  border-color: #5aafff;
  color: #fff;
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #ccc;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #3a3a3a;
  border-color: #4a4a4a;
  color: #fff;
}

.reset-btn .icon {
  font-size: 14px;
}

.equalizer-bands {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.band {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.band-slider-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.band-frequency {
  font-size: 12px;
  color: #888;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
}

.band-slider {
  -webkit-appearance: slider-vertical;
  width: 8px;
  height: 150px;
  background: transparent;
  cursor: pointer;
}

.band-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.band-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a9eff;
  cursor: pointer;
  border: 2px solid #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.band-slider::-webkit-slider-runnable-track {
  width: 8px;
  background: linear-gradient(
    to bottom,
    #4a9eff 0%,
    #3a3a3a 45%,
    #3a3a3a 55%,
    #ff6b6b 100%
  );
  border-radius: 4px;
}

.band-slider.positive::-webkit-slider-thumb {
  background: #4a9eff;
}

.band-slider.negative::-webkit-slider-thumb {
  background: #ff6b6b;
}

.band-gain {
  font-size: 12px;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  min-width: 40px;
  text-align: center;
}

.band-gain.high-boost {
  color: #4a9eff;
}

.band-gain.boost {
  color: #5ab3ff;
}

.band-gain.neutral {
  color: #888;
}

.band-gain.cut {
  color: #ff8a8a;
}

.band-gain.high-cut {
  color: #ff6b6b;
}

.equalizer-visualization {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  background: #0a0a0a;
  border: 1px solid #2a2a2a;
}

.equalizer-visualization canvas {
  display: block;
  width: 100%;
  height: auto;
}
</style>
