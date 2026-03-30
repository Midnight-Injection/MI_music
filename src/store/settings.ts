import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '../types/settings'
import { DEFAULT_CHANNEL_CONFIGS, ChannelConfig, DEFAULT_SETTINGS } from '../types/settings'

type ThemeSettingsSubset = Pick<Settings, 'themeColor' | 'themeMode' | 'customColor'>

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({ ...DEFAULT_SETTINGS })
  const channelConfigs = ref<ChannelConfig[]>([...DEFAULT_CHANNEL_CONFIGS])

  // Settings management
  function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    settings.value[key] = value
    if (key === 'sources' && Array.isArray(value)) {
      channelConfigs.value = [...value] as ChannelConfig[]
    }
  }

  function updateSettings(newSettings: Partial<Settings>) {
    settings.value = { ...settings.value, ...newSettings }
    if (newSettings.sources) {
      channelConfigs.value = [...newSettings.sources]
      settings.value.sources = [...newSettings.sources]
    }
  }

  function resetSettings() {
    settings.value = { ...DEFAULT_SETTINGS }
    channelConfigs.value = [...DEFAULT_CHANNEL_CONFIGS]
  }

  function loadSettings(savedSettings: Settings) {
    settings.value = { ...DEFAULT_SETTINGS, ...savedSettings }
    const savedSources = savedSettings.sources?.length
      ? savedSettings.sources
      : DEFAULT_CHANNEL_CONFIGS
    channelConfigs.value = [...savedSources]
    settings.value.sources = [...savedSources]
  }

  function syncThemeSettings(themeSettings: ThemeSettingsSubset) {
    settings.value = {
      ...settings.value,
      ...themeSettings,
    }
  }

  // Source management methods
  function updateChannelConfig(id: string, enabled: boolean) {
    const config = channelConfigs.value.find(c => c.id === id)
    if (config) {
      config.enabled = enabled
      // Persist to settings
      settings.value.sources = [...channelConfigs.value]
    }
  }

  function getEnabledChannelIds(): string[] {
    return channelConfigs.value
      .filter(c => c.enabled)
      .map(c => c.id)
  }

  return {
    settings,
    channelConfigs,
    updateSetting,
    updateSettings,
    resetSettings,
    loadSettings,
    syncThemeSettings,
    updateChannelConfig,
    getEnabledChannelIds
  }
})
