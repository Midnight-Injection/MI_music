import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from '../../src/store/settings'

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should have default settings', () => {
    const store = useSettingsStore()
    expect(store.settings.language).toBe('zh-CN')
    expect(store.settings.themeMode).toBe('auto')
    expect(store.settings.volume).toBe(0.8)
  })

  it('should update a single setting', () => {
    const store = useSettingsStore()
    store.updateSetting('language', 'en-US')
    expect(store.settings.language).toBe('en-US')
  })

  it('should update multiple settings', () => {
    const store = useSettingsStore()
    store.updateSettings({
      language: 'en-US',
      themeMode: 'dark',
      volume: 0.5
    })
    expect(store.settings.language).toBe('en-US')
    expect(store.settings.themeMode).toBe('dark')
    expect(store.settings.volume).toBe(0.5)
  })

  it('should reset to default settings', () => {
    const store = useSettingsStore()
    store.updateSetting('language', 'en-US')
    store.resetSettings()
    expect(store.settings.language).toBe('zh-CN')
  })

  it('should load saved settings', () => {
    const store = useSettingsStore()
    const savedSettings = {
      language: 'en-US' as const,
      themeMode: 'dark' as const,
      volume: 0.5
    }
    store.loadSettings({
      ...store.settings,
      ...savedSettings,
    })
    expect(store.settings.language).toBe('en-US')
    expect(store.settings.themeMode).toBe('dark')
    expect(store.settings.volume).toBe(0.5)
  })
})
