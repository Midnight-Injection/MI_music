/**
 * Theme composable for Tauri integration
 * Provides theme persistence and system preference detection
 */

import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'
import type { ThemeColorType, ThemeMode } from '../themes'
import type { BaseplateStyle, FontFamilyPreset } from '../types/settings'

export interface ThemeSettings {
  theme_color: ThemeColorType
  theme_mode: ThemeMode
  custom_color: string
  font_family_preset: FontFamilyPreset
  text_color_primary: string
  text_color_secondary: string
  baseplate_style: BaseplateStyle
  baseplate_color_a: string
  baseplate_color_b: string
  baseplate_angle: number
  baseplate_intensity: number
  baseplate_use_theme_accent: boolean
  baseplate_image_path: string
  baseplate_image_opacity: number
  baseplate_image_blur: number
}

export function useTheme() {
  const settings = ref<ThemeSettings>({
    theme_color: 'green',
    theme_mode: 'auto',
    custom_color: '#1db954',
    font_family_preset: 'system',
    text_color_primary: '#f7fbff',
    text_color_secondary: '#dbe5f3',
    baseplate_style: 'linear-gradient',
    baseplate_color_a: '#102038',
    baseplate_color_b: '#415b86',
    baseplate_angle: 140,
    baseplate_intensity: 78,
    baseplate_use_theme_accent: false,
    baseplate_image_path: '',
    baseplate_image_opacity: 72,
    baseplate_image_blur: 10,
  })

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Load theme settings from Tauri backend
   */
  async function loadTheme() {
    isLoading.value = true
    error.value = null

    try {
      const result = await invoke<ThemeSettings>('get_theme')
      settings.value = result
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = message
      console.error('Failed to load theme:', message)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Save theme settings to Tauri backend
   */
  async function saveTheme(newSettings: Partial<ThemeSettings>) {
    isLoading.value = true
    error.value = null

    try {
      const updated = { ...settings.value, ...newSettings }
      const result = await invoke<ThemeSettings>('set_theme', { settings: updated })
      settings.value = result
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = message
      console.error('Failed to save theme:', message)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Reset theme to defaults
   */
  async function resetTheme() {
    isLoading.value = true
    error.value = null

    try {
      const result = await invoke<ThemeSettings>('reset_theme')
      settings.value = result
      return result
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      error.value = message
      console.error('Failed to reset theme:', message)
      throw e
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Set theme color
   */
  async function setThemeColor(color: ThemeColorType, customColor?: string) {
    const update: Partial<ThemeSettings> = { theme_color: color }
    if (color === 'custom' && customColor) {
      update.custom_color = customColor
    }
    return saveTheme(update)
  }

  /**
   * Set theme mode
   */
  async function setThemeMode(mode: ThemeMode) {
    return saveTheme({ theme_mode: mode })
  }

  /**
   * Set custom color
   */
  async function setCustomColor(color: string) {
    return saveTheme({ custom_color: color, theme_color: 'custom' })
  }

  /**
   * Get current theme mode (resolves 'auto' to actual mode)
   */
  function getCurrentThemeMode(): ThemeMode {
    if (settings.value.theme_mode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      return prefersDark ? 'dark' : 'light'
    }
    return settings.value.theme_mode
  }

  return {
    settings,
    isLoading,
    error,
    loadTheme,
    saveTheme,
    resetTheme,
    setThemeColor,
    setThemeMode,
    setCustomColor,
    getCurrentThemeMode
  }
}
