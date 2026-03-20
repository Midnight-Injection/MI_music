/**
 * Theme store for managing theme state
 * Integrates with Tauri for persistence, falls back to localStorage
 */

import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ThemeColorType, ThemeMode } from '../themes'
import { themes, getTheme, createCustomTheme } from '../themes'

export interface ThemeSettings {
  themeColor: ThemeColorType
  themeMode: ThemeMode
  customColor: string
}

const DEFAULT_THEME: ThemeSettings = {
  themeColor: 'green',
  themeMode: 'auto',
  customColor: '#1db954'
}

const STORAGE_KEY = 'theme-settings'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isDatabaseNotInitializedError(error: unknown): boolean {
  return getErrorMessage(error).includes('Database not initialized')
}

// Check if running in Tauri
const isTauri = () => {
  return '__TAURI__' in window
}

export const useThemeStore = defineStore('theme', () => {
  const settings = ref<ThemeSettings>({ ...DEFAULT_THEME })
  const isInitialized = ref(false)
  const isTauriAvailable = ref(isTauri())

  // Load theme from localStorage or Tauri
  async function loadTheme() {
    if (isTauriAvailable.value) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const result = await invoke<any>('get_theme')
        settings.value = {
          themeColor: result.theme_color as ThemeColorType,
          themeMode: result.theme_mode as ThemeMode,
          customColor: result.custom_color
        }
      } catch (e) {
        if (!isDatabaseNotInitializedError(e)) {
          console.error('Failed to load theme from Tauri, falling back to localStorage:', e)
        }
        loadFromLocalStorage()
      }
    } else {
      loadFromLocalStorage()
    }
    isInitialized.value = true
  }

  // Load from localStorage as fallback
  function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        settings.value = { ...DEFAULT_THEME, ...parsed }
      } catch (e) {
        console.error('Failed to load theme settings from localStorage:', e)
        settings.value = { ...DEFAULT_THEME }
      }
    }
  }

  // Save theme to localStorage or Tauri
  async function saveTheme() {
    if (isTauriAvailable.value) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('set_theme', {
          settings: {
            theme_color: settings.value.themeColor,
            theme_mode: settings.value.themeMode,
            custom_color: settings.value.customColor
          }
        })
      } catch (e) {
        if (!isDatabaseNotInitializedError(e)) {
          console.error('Failed to save theme to Tauri, falling back to localStorage:', e)
        }
        saveToLocalStorage()
      }
    } else {
      saveToLocalStorage()
    }
  }

  // Save to localStorage as fallback
  function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
  }

  // Update theme color
  async function setThemeColor(color: ThemeColorType, customColor?: string) {
    settings.value.themeColor = color
    if (color === 'custom' && customColor) {
      settings.value.customColor = customColor
    }
    await saveTheme()
    applyTheme()
  }

  // Update theme mode
  async function setThemeMode(mode: ThemeMode) {
    settings.value.themeMode = mode
    await saveTheme()
    applyTheme()
  }

  // Update custom color
  async function setCustomColor(color: string) {
    settings.value.customColor = color
    await saveTheme()
    applyTheme()
  }

  // Apply theme to document
  function applyTheme() {
    const root = document.documentElement

    // Disable transitions during theme change
    root.classList.add('theme-transition-disabled')

    // Apply theme color
    root.setAttribute('data-theme-color', settings.value.themeColor)

    // Apply custom color if needed
    if (settings.value.themeColor === 'custom') {
      const customTheme = createCustomTheme(settings.value.customColor)
      root.style.setProperty('--custom-primary-color', customTheme.colors.primary)
      root.style.setProperty('--custom-primary-hover', customTheme.colors.hover)
      root.style.setProperty('--custom-primary-active', customTheme.colors.active)
      root.style.setProperty('--custom-primary-light', customTheme.colors.light)
    } else {
      root.style.removeProperty('--custom-primary-color')
      root.style.removeProperty('--custom-primary-hover')
      root.style.removeProperty('--custom-primary-active')
      root.style.removeProperty('--custom-primary-light')
    }

    // Apply theme mode
    if (settings.value.themeMode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.setAttribute('data-theme-mode', prefersDark ? 'dark' : 'light')
    } else {
      root.setAttribute('data-theme-mode', settings.value.themeMode)
    }

    // Re-enable transitions after a brief delay
    setTimeout(() => {
      root.classList.remove('theme-transition-disabled')
    }, 50)
  }

  // Get current theme object
  function getCurrentTheme() {
    if (settings.value.themeColor === 'custom') {
      return createCustomTheme(settings.value.customColor)
    }
    return getTheme(settings.value.themeColor)
  }

  // Listen for system theme changes
  function watchSystemTheme() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (settings.value.themeMode === 'auto') {
        applyTheme()
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }

  // Initialize theme store
  async function init() {
    if (!isInitialized.value) {
      await loadTheme()
      applyTheme()
      watchSystemTheme()

      // Watch for changes
      watch(settings, async () => {
        await saveTheme()
        applyTheme()
      }, { deep: true })
    }
  }

  // Reset to defaults
  async function resetTheme() {
    settings.value = { ...DEFAULT_THEME }

    if (isTauriAvailable.value) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        await invoke('reset_theme')
      } catch (e) {
        if (!isDatabaseNotInitializedError(e)) {
          console.error('Failed to reset theme via Tauri:', e)
        }
        saveToLocalStorage()
      }
    } else {
      saveToLocalStorage()
    }

    applyTheme()
  }

  return {
    settings,
    isInitialized,
    loadTheme,
    saveTheme,
    setThemeColor,
    setThemeMode,
    setCustomColor,
    applyTheme,
    getCurrentTheme,
    init,
    resetTheme
  }
})
