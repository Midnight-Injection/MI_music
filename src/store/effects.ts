import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { invoke } from '@tauri-apps/api/core'

export interface EqualizerBand {
  frequency: number
  label: string
  gain: number
}

export interface EqualizerSettings {
  enabled: boolean
  bands: EqualizerBand[]
  preset?: string
}

export interface ReverbSettings {
  enabled: boolean
  mix: number
  preset: string
}

export const useEffectsStore = defineStore('effects', () => {
  // Equalizer state
  const equalizerEnabled = ref(false)
  const equalizerBands = ref<EqualizerBand[]>([
    { frequency: 31, label: '31', gain: 0 },
    { frequency: 62, label: '62', gain: 0 },
    { frequency: 125, label: '125', gain: 0 },
    { frequency: 250, label: '250', gain: 0 },
    { frequency: 500, label: '500', gain: 0 },
    { frequency: 1000, label: '1k', gain: 0 },
    { frequency: 2000, label: '2k', gain: 0 },
    { frequency: 4000, label: '4k', gain: 0 },
    { frequency: 8000, label: '8k', gain: 0 },
    { frequency: 16000, label: '16k', gain: 0 },
  ])
  const equalizerPreset = ref<string>('flat')

  // Reverb state
  const reverbEnabled = ref(false)
  const reverbMix = ref(0.3)
  const reverbPreset = ref('medium_room')

  // Available presets
  const equalizerPresets = ref<string[]>([
    'flat',
    'bass_boost',
    'treble_boost',
    'vocal',
    'rock',
    'electronic',
    'classical',
    'jazz',
  ])

  const reverbPresets = ref<Array<{ value: string; label: string }>>([
    { value: 'small_room', label: 'Small Room' },
    { value: 'medium_room', label: 'Medium Room' },
    { value: 'large_room', label: 'Large Room' },
    { value: 'large_hall', label: 'Large Hall' },
    { value: 'cathedral', label: 'Cathedral' },
    { value: 'plate', label: 'Plate' },
    { value: 'spring', label: 'Spring' },
  ])

  // Computed
  const equalizerSettings = computed<EqualizerSettings>(() => ({
    enabled: equalizerEnabled.value,
    bands: equalizerBands.value,
    preset: equalizerPreset.value,
  }))

  const reverbSettings = computed<ReverbSettings>(() => ({
    enabled: reverbEnabled.value,
    mix: reverbMix.value,
    preset: reverbPreset.value,
  }))

  const anyEffectEnabled = computed(
    () => equalizerEnabled.value || reverbEnabled.value
  )

  // Actions
  async function setEqualizerBand(bandIndex: number, gain: number) {
    try {
      await invoke('set_equalizer_band', { band: bandIndex, gain })
      equalizerBands.value[bandIndex].gain = gain
    } catch (error) {
      console.error('Failed to set equalizer band:', error)
      throw error
    }
  }

  async function resetEqualizer() {
    try {
      await invoke('reset_equalizer')
      equalizerBands.value.forEach(band => {
        band.gain = 0
      })
      equalizerPreset.value = 'flat'
    } catch (error) {
      console.error('Failed to reset equalizer:', error)
      throw error
    }
  }

  async function applyEqualizerPreset(preset: string) {
    try {
      await invoke('apply_equalizer_preset', { preset })
      equalizerPreset.value = preset

      // Update band gains based on preset
      const presetGains: Record<string, number[]> = {
        flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        bass_boost: [6, 5, 4, 2, 0, -1, -1, -1, -1, -2],
        treble_boost: [-2, -2, -1, -1, 0, 1, 2, 4, 5, 6],
        vocal: [-2, -1, 0, 2, 4, 5, 4, 2, 0, -1],
        rock: [5, 4, 3, 1, -1, -1, 0, 2, 3, 4],
        electronic: [4, 3, 2, 0, 1, 2, 3, 4, 4, 3],
        classical: [4, 3, 2, 1, 0, 0, 0, 1, 2, 3],
        jazz: [3, 2, 1, 2, 2, 0, -1, -1, 1, 2],
      }

      const gains = presetGains[preset]
      if (gains) {
        gains.forEach((gain, index) => {
          equalizerBands.value[index].gain = gain
        })
      }
    } catch (error) {
      console.error('Failed to apply equalizer preset:', error)
      throw error
    }
  }

  async function setReverbMix(mix: number) {
    try {
      await invoke('set_reverb_mix', { mix })
      reverbMix.value = Math.max(0, Math.min(1, mix))
    } catch (error) {
      console.error('Failed to set reverb mix:', error)
      throw error
    }
  }

  async function setReverbPreset(preset: string) {
    try {
      await invoke('set_reverb_preset', { preset })
      reverbPreset.value = preset
    } catch (error) {
      console.error('Failed to set reverb preset:', error)
      throw error
    }
  }

  async function setEffectEnabled(effect: 'equalizer' | 'reverb', enabled: boolean) {
    try {
      await invoke('set_effect_enabled', { effect, enabled })
      if (effect === 'equalizer') {
        equalizerEnabled.value = enabled
      } else {
        reverbEnabled.value = enabled
      }
    } catch (error) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} ${effect}:`, error)
      throw error
    }
  }

  async function toggleEqualizer() {
    await setEffectEnabled('equalizer', !equalizerEnabled.value)
  }

  async function toggleReverb() {
    await setEffectEnabled('reverb', !reverbEnabled.value)
  }

  function resetAllEffects() {
    equalizerEnabled.value = false
    reverbEnabled.value = false
    resetEqualizer()
    reverbMix.value = 0.3
    reverbPreset.value = 'medium_room'
  }

  return {
    // State
    equalizerEnabled,
    equalizerBands,
    equalizerPreset,
    reverbEnabled,
    reverbMix,
    reverbPreset,
    equalizerPresets,
    reverbPresets,

    // Computed
    equalizerSettings,
    reverbSettings,
    anyEffectEnabled,

    // Actions
    setEqualizerBand,
    resetEqualizer,
    applyEqualizerPreset,
    setReverbMix,
    setReverbPreset,
    setEffectEnabled,
    toggleEqualizer,
    toggleReverb,
    resetAllEffects,
  }
})
