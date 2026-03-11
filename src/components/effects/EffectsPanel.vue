<template>
  <div class="effects-panel">
    <div class="panel-header">
      <h2>Audio Effects</h2>
      <button class="close-btn" @click="$emit('close')">
        <span>✕</span>
      </button>
    </div>

    <div class="panel-content">
      <!-- Equalizer Section -->
      <div class="effect-section">
        <div class="effect-header">
          <div class="effect-title">
            <h3>Equalizer</h3>
            <span class="effect-status" :class="{ active: effectsStore.equalizerEnabled }">
              {{ effectsStore.equalizerEnabled ? 'ON' : 'OFF' }}
            </span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="effectsStore.equalizerEnabled"
              @change="effectsStore.toggleEqualizer()"
            />
            <span class="slider"></span>
          </label>
        </div>

        <Equalizer v-if="effectsStore.equalizerEnabled" />
      </div>

      <!-- Reverb Section -->
      <div class="effect-section">
        <div class="effect-header">
          <div class="effect-title">
            <h3>Reverb</h3>
            <span class="effect-status" :class="{ active: effectsStore.reverbEnabled }">
              {{ effectsStore.reverbEnabled ? 'ON' : 'OFF' }}
            </span>
          </div>
          <label class="toggle-switch">
            <input
              type="checkbox"
              :checked="effectsStore.reverbEnabled"
              @change="effectsStore.toggleReverb()"
            />
            <span class="slider"></span>
          </label>
        </div>

        <div v-if="effectsStore.reverbEnabled" class="reverb-controls">
          <div class="preset-selector">
            <label>Preset</label>
            <select v-model="selectedReverbPreset" @change="onReverbPresetChange">
              <option
                v-for="preset in effectsStore.reverbPresets"
                :key="preset.value"
                :value="preset.value"
              >
                {{ preset.label }}
              </option>
            </select>
          </div>

          <div class="knob-row">
            <KnobControl
              v-model="reverbMix"
              :min="0"
              :max="1"
              :step="0.01"
              label="Mix"
              unit=""
              :format-value="formatPercent"
              @update:model-value="onReverbMixChange"
            />
          </div>
        </div>
      </div>

      <!-- Master Controls -->
      <div class="master-controls">
        <button class="reset-all-btn" @click="resetAll">
          <span class="icon">↺</span>
          Reset All Effects
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useEffectsStore } from '@/store/effects'
import Equalizer from './Equalizer.vue'
import KnobControl from './KnobControl.vue'

defineEmits<{
  close: []
}>()

const effectsStore = useEffectsStore()
const selectedReverbPreset = ref(effectsStore.reverbPreset)
const reverbMix = ref(effectsStore.reverbMix)

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

async function onReverbPresetChange() {
  await effectsStore.setReverbPreset(selectedReverbPreset.value)
}

async function onReverbMixChange(value: number) {
  await effectsStore.setReverbMix(value)
}

async function resetAll() {
  if (confirm('Reset all effects to default settings?')) {
    await effectsStore.resetAllEffects()
    selectedReverbPreset.value = 'medium_room'
    reverbMix.value = 0.3
  }
}

watch(
  () => effectsStore.reverbPreset,
  (value) => {
    selectedReverbPreset.value = value
  }
)

watch(
  () => effectsStore.reverbMix,
  (value) => {
    reverbMix.value = value
  }
)
</script>

<style scoped>
.effects-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #2a2a2a;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  color: #ccc;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #3a3a3a;
  border-color: #4a4a4a;
  color: #fff;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.effect-section {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
  border-radius: 12px;
  border: 1px solid #2a2a2a;
}

.effect-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.effect-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.effect-title h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.effect-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #2a2a2a;
  color: #666;
  transition: all 0.2s;
}

.effect-status.active {
  background: #4a9eff;
  color: #fff;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch .slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #2a2a2a;
  border: 1px solid #3a3a3a;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-switch .slider:before {
  position: absolute;
  content: '';
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: #888;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .slider {
  background-color: #4a9eff;
  border-color: #5aafff;
}

.toggle-switch input:checked + .slider:before {
  transform: translateX(24px);
  background-color: #fff;
}

.reverb-controls {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.preset-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preset-selector label {
  font-size: 13px;
  font-weight: 500;
  color: #888;
}

.preset-selector select {
  padding: 10px 12px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 6px;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-selector select:hover {
  border-color: #4a4a4a;
}

.preset-selector select:focus {
  outline: none;
  border-color: #4a9eff;
}

.knob-row {
  display: flex;
  justify-content: center;
  padding: 16px;
  background: #0a0a0a;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.master-controls {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: #0a0a0a;
  border-radius: 8px;
  border: 1px solid #2a2a2a;
}

.reset-all-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  color: #ccc;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-all-btn:hover {
  background: #3a3a3a;
  border-color: #4a4a4a;
  color: #fff;
}

.reset-all-btn .icon {
  font-size: 16px;
}
</style>
