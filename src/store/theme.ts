/**
 * Theme store for managing theme state
 * Integrates with Tauri for persistence, falls back to localStorage
 */

import { convertFileSrc, isTauri as detectTauri } from '@tauri-apps/api/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { ThemeColorType, ThemeMode } from '../themes'
import { getTheme, createCustomTheme } from '../themes'
import { FONT_FAMILY_STACKS } from '../types/settings'
import type { BaseplateStyle, FontFamilyPreset } from '../types/settings'

export interface ThemeSettings {
  themeColor: ThemeColorType
  themeMode: ThemeMode
  customColor: string
  fontFamilyPreset: FontFamilyPreset
  textColorPrimary: string
  textColorSecondary: string
  baseplateStyle: BaseplateStyle
  baseplateColorA: string
  baseplateColorB: string
  baseplateAngle: number
  baseplateIntensity: number
  baseplateUseThemeAccent: boolean
  baseplateImagePath: string
  baseplateImageOpacity: number
  baseplateImageBlur: number
}

const DEFAULT_THEME: ThemeSettings = {
  themeColor: 'green',
  themeMode: 'auto',
  customColor: '#1db954',
  fontFamilyPreset: 'system',
  textColorPrimary: '#f7fbff',
  textColorSecondary: '#dbe5f3',
  baseplateStyle: 'linear-gradient',
  baseplateColorA: '#102038',
  baseplateColorB: '#415b86',
  baseplateAngle: 140,
  baseplateIntensity: 78,
  baseplateUseThemeAccent: false,
  baseplateImagePath: '',
  baseplateImageOpacity: 72,
  baseplateImageBlur: 10,
}

const STORAGE_KEY = 'theme-settings'

function getSystemThemePreference(): Exclude<ThemeMode, 'auto'> {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function isDatabaseNotInitializedError(error: unknown): boolean {
  return getErrorMessage(error).includes('Database not initialized')
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHex(value: string, fallback: string): string {
  const normalized = String(value || '').trim()
  return /^#([0-9a-f]{6})$/i.test(normalized) ? normalized : fallback
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex, '#000000')
  const parsed = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized)
  if (!parsed) {
    return { r: 0, g: 0, b: 0 }
  }

  return {
    r: parseInt(parsed[1], 16),
    g: parseInt(parsed[2], 16),
    b: parseInt(parsed[3], 16),
  }
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1).toFixed(3)})`
}

function resolveThemeMode(
  mode: ThemeMode,
  systemMode: Exclude<ThemeMode, 'auto'> = getSystemThemePreference(),
): Exclude<ThemeMode, 'auto'> {
  if (mode !== 'auto') return mode
  return systemMode
}

function normalizeThemeColor(value: unknown): ThemeColorType {
  const normalized = String(value || DEFAULT_THEME.themeColor) as ThemeColorType
  return normalized
}

function normalizeThemeMode(value: unknown): ThemeMode {
  const normalized = String(value || DEFAULT_THEME.themeMode) as ThemeMode
  return normalized
}

function normalizeFontFamilyPreset(value: unknown): FontFamilyPreset {
  const normalized = String(value || DEFAULT_THEME.fontFamilyPreset) as FontFamilyPreset
  return Object.prototype.hasOwnProperty.call(FONT_FAMILY_STACKS, normalized)
    ? normalized
    : DEFAULT_THEME.fontFamilyPreset
}

function normalizeBaseplateStyle(value: unknown): BaseplateStyle {
  return value === 'solid'
    || value === 'radial-gradient'
    || value === 'linear-gradient'
    || value === 'image'
    ? value
    : DEFAULT_THEME.baseplateStyle
}

function coerceNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value))
  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return clamp(Math.round(parsed), min, max)
}

function coerceBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  return fallback
}

function sanitizeThemeSettings(raw: Record<string, unknown>): ThemeSettings {
  return {
    themeColor: normalizeThemeColor(raw.themeColor ?? raw.theme_color),
    themeMode: normalizeThemeMode(raw.themeMode ?? raw.theme_mode),
    customColor: normalizeHex(
      String(raw.customColor ?? raw.custom_color ?? DEFAULT_THEME.customColor),
      DEFAULT_THEME.customColor,
    ),
    fontFamilyPreset: normalizeFontFamilyPreset(raw.fontFamilyPreset ?? raw.font_family_preset),
    textColorPrimary: normalizeHex(
      String(raw.textColorPrimary ?? raw.text_color_primary ?? DEFAULT_THEME.textColorPrimary),
      DEFAULT_THEME.textColorPrimary,
    ),
    textColorSecondary: normalizeHex(
      String(raw.textColorSecondary ?? raw.text_color_secondary ?? DEFAULT_THEME.textColorSecondary),
      DEFAULT_THEME.textColorSecondary,
    ),
    baseplateStyle: normalizeBaseplateStyle(raw.baseplateStyle ?? raw.baseplate_style),
    baseplateColorA: normalizeHex(
      String(raw.baseplateColorA ?? raw.baseplate_color_a ?? DEFAULT_THEME.baseplateColorA),
      DEFAULT_THEME.baseplateColorA,
    ),
    baseplateColorB: normalizeHex(
      String(raw.baseplateColorB ?? raw.baseplate_color_b ?? DEFAULT_THEME.baseplateColorB),
      DEFAULT_THEME.baseplateColorB,
    ),
    baseplateAngle: coerceNumber(
      raw.baseplateAngle ?? raw.baseplate_angle,
      DEFAULT_THEME.baseplateAngle,
      0,
      360,
    ),
    baseplateIntensity: coerceNumber(
      raw.baseplateIntensity ?? raw.baseplate_intensity,
      DEFAULT_THEME.baseplateIntensity,
      30,
      100,
    ),
    baseplateUseThemeAccent: coerceBoolean(
      raw.baseplateUseThemeAccent ?? raw.baseplate_use_theme_accent,
      DEFAULT_THEME.baseplateUseThemeAccent,
    ),
    baseplateImagePath: String(
      raw.baseplateImagePath ?? raw.baseplate_image_path ?? DEFAULT_THEME.baseplateImagePath,
    ).trim(),
    baseplateImageOpacity: coerceNumber(
      raw.baseplateImageOpacity ?? raw.baseplate_image_opacity,
      DEFAULT_THEME.baseplateImageOpacity,
      12,
      100,
    ),
    baseplateImageBlur: coerceNumber(
      raw.baseplateImageBlur ?? raw.baseplate_image_blur,
      DEFAULT_THEME.baseplateImageBlur,
      0,
      40,
    ),
  }
}

function buildBaseplateBackground(settings: ThemeSettings): string {
  const baseAlpha = clamp(settings.baseplateIntensity, 30, 100) / 100
  const overlayAlpha = clamp(baseAlpha * 0.42, 0.12, 0.42)
  const neutralHighlight = `radial-gradient(circle at 18% 14%, rgba(255, 255, 255, ${overlayAlpha.toFixed(3)}), transparent 28%)`
  const accentHighlight = settings.baseplateUseThemeAccent
    ? 'radial-gradient(circle at 82% 12%, color-mix(in srgb, var(--primary-color) 28%, transparent), transparent 24%), radial-gradient(circle at 72% 88%, color-mix(in srgb, var(--accent-color) 18%, transparent), transparent 30%)'
    : 'radial-gradient(circle at 82% 12%, rgba(214, 229, 255, 0.120), transparent 22%), radial-gradient(circle at 72% 88%, rgba(255, 255, 255, 0.080), transparent 30%)'

  if (settings.baseplateStyle === 'solid') {
    return [
      neutralHighlight,
      accentHighlight,
      `linear-gradient(180deg, ${rgba(settings.baseplateColorA, clamp(baseAlpha + 0.08, 0, 1))} 0%, ${rgba(settings.baseplateColorA, baseAlpha)} 100%)`,
    ].join(', ')
  }

  if (settings.baseplateStyle === 'radial-gradient') {
    return [
      neutralHighlight,
      accentHighlight,
      `radial-gradient(circle at 18% 18%, ${rgba(settings.baseplateColorA, clamp(baseAlpha + 0.08, 0, 1))} 0%, ${rgba(settings.baseplateColorB, clamp(baseAlpha - 0.06, 0.16, 1))} 72%)`,
      `linear-gradient(180deg, ${rgba(settings.baseplateColorB, clamp(baseAlpha - 0.1, 0.12, 1))} 0%, ${rgba(settings.baseplateColorA, clamp(baseAlpha - 0.18, 0.08, 1))} 100%)`,
    ].join(', ')
  }

  if (settings.baseplateStyle === 'image') {
    return [
      neutralHighlight,
      accentHighlight,
      `linear-gradient(180deg, ${rgba(settings.baseplateColorA, 0.22)} 0%, ${rgba(settings.baseplateColorB, 0.32)} 100%)`,
      'linear-gradient(180deg, rgba(3, 8, 18, 0.18) 0%, rgba(3, 8, 18, 0.42) 100%)',
    ].join(', ')
  }

  return [
    neutralHighlight,
    accentHighlight,
    `linear-gradient(${clamp(settings.baseplateAngle, 0, 360)}deg, ${rgba(settings.baseplateColorA, clamp(baseAlpha + 0.06, 0, 1))} 0%, ${rgba(settings.baseplateColorB, clamp(baseAlpha - 0.04, 0.14, 1))} 100%)`,
  ].join(', ')
}

function buildThemeSurface(settings: ThemeSettings, mode: Exclude<ThemeMode, 'auto'>) {
  const deepShadow = mode === 'dark' ? 'rgba(5, 10, 20, 0.24)' : 'rgba(15, 23, 42, 0.14)'
  const shellSurface = mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.05))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.09))'
  const panelGradient = mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.24), rgba(255, 255, 255, 0.08))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.34), rgba(255, 255, 255, 0.12))'
  const panelMuted = mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0.08))'
  const panelStrong = mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.12))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.16))'
  const contentSurface = mode === 'dark'
    ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.03))'
    : 'linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.05))'

  return {
    shellSurface,
    panelGradient,
    panelMuted,
    panelStrong,
    contentSurface,
    deepShadow,
    background: buildBaseplateBackground(settings),
  }
}

function buildTextSurface(settings: ThemeSettings) {
  return {
    primary: normalizeHex(settings.textColorPrimary, DEFAULT_THEME.textColorPrimary),
    secondary: normalizeHex(settings.textColorSecondary, DEFAULT_THEME.textColorSecondary),
    tertiary: rgba(settings.textColorSecondary, 0.72),
    disabled: rgba(settings.textColorSecondary, 0.46),
  }
}

function resolveBaseplateImageUrl(imagePath: string): string {
  const normalized = String(imagePath || '').trim()
  if (!normalized) return ''

  if (/^(https?:|data:|blob:|asset:|tauri:|file:)/i.test(normalized)) {
    return normalized
  }

  if (detectTauri()) {
    return convertFileSrc(normalized)
  }

  return `file://${normalized}`
}

// Check if running in Tauri
const isTauri = () => {
  return '__TAURI__' in window
}

export const useThemeStore = defineStore('theme', () => {
  const settings = ref<ThemeSettings>({ ...DEFAULT_THEME })
  const isInitialized = ref(false)
  const isTauriAvailable = ref(isTauri())
  const systemTheme = ref<Exclude<ThemeMode, 'auto'>>(getSystemThemePreference())
  const resolvedMode = computed(() => resolveThemeMode(settings.value.themeMode, systemTheme.value))

  // Load theme from localStorage or Tauri
  async function loadTheme() {
    if (isTauriAvailable.value) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const result = await invoke<Record<string, unknown>>('get_theme')
        settings.value = sanitizeThemeSettings(result)
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
        settings.value = sanitizeThemeSettings(parsed)
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
            custom_color: settings.value.customColor,
            font_family_preset: settings.value.fontFamilyPreset,
            text_color_primary: settings.value.textColorPrimary,
            text_color_secondary: settings.value.textColorSecondary,
            baseplate_style: settings.value.baseplateStyle,
            baseplate_color_a: settings.value.baseplateColorA,
            baseplate_color_b: settings.value.baseplateColorB,
            baseplate_angle: settings.value.baseplateAngle,
            baseplate_intensity: settings.value.baseplateIntensity,
            baseplate_use_theme_accent: settings.value.baseplateUseThemeAccent,
            baseplate_image_path: settings.value.baseplateImagePath,
            baseplate_image_opacity: settings.value.baseplateImageOpacity,
            baseplate_image_blur: settings.value.baseplateImageBlur,
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
    settings.value.customColor = normalizeHex(color, DEFAULT_THEME.customColor)
    await saveTheme()
    applyTheme()
  }

  async function setFontFamilyPreset(value: FontFamilyPreset) {
    settings.value.fontFamilyPreset = normalizeFontFamilyPreset(value)
    await saveTheme()
    applyTheme()
  }

  async function updateTextColors(nextSettings: Partial<Pick<ThemeSettings, 'textColorPrimary' | 'textColorSecondary'>>) {
    settings.value = {
      ...settings.value,
      ...(nextSettings.textColorPrimary
        ? { textColorPrimary: normalizeHex(nextSettings.textColorPrimary, DEFAULT_THEME.textColorPrimary) }
        : {}),
      ...(nextSettings.textColorSecondary
        ? { textColorSecondary: normalizeHex(nextSettings.textColorSecondary, DEFAULT_THEME.textColorSecondary) }
        : {}),
    }
    await saveTheme()
    applyTheme()
  }

  async function updateBaseplateSettings(nextSettings: Partial<Pick<
    ThemeSettings,
    'baseplateStyle'
    | 'baseplateColorA'
    | 'baseplateColorB'
    | 'baseplateAngle'
    | 'baseplateIntensity'
    | 'baseplateUseThemeAccent'
    | 'baseplateImagePath'
    | 'baseplateImageOpacity'
    | 'baseplateImageBlur'
  >>) {
    settings.value = {
      ...settings.value,
      ...(nextSettings.baseplateStyle ? { baseplateStyle: nextSettings.baseplateStyle } : {}),
      ...(typeof nextSettings.baseplateUseThemeAccent === 'boolean'
        ? { baseplateUseThemeAccent: nextSettings.baseplateUseThemeAccent }
        : {}),
      ...(typeof nextSettings.baseplateImagePath === 'string'
        ? { baseplateImagePath: nextSettings.baseplateImagePath.trim() }
        : {}),
      baseplateColorA: normalizeHex(nextSettings.baseplateColorA ?? settings.value.baseplateColorA, DEFAULT_THEME.baseplateColorA),
      baseplateColorB: normalizeHex(nextSettings.baseplateColorB ?? settings.value.baseplateColorB, DEFAULT_THEME.baseplateColorB),
      baseplateAngle: clamp(
        Math.round(nextSettings.baseplateAngle ?? settings.value.baseplateAngle),
        0,
        360,
      ),
      baseplateIntensity: clamp(
        Math.round(nextSettings.baseplateIntensity ?? settings.value.baseplateIntensity),
        30,
        100,
      ),
      baseplateImageOpacity: clamp(
        Math.round(nextSettings.baseplateImageOpacity ?? settings.value.baseplateImageOpacity),
        12,
        100,
      ),
      baseplateImageBlur: clamp(
        Math.round(nextSettings.baseplateImageBlur ?? settings.value.baseplateImageBlur),
        0,
        40,
      ),
    }
    await saveTheme()
    applyTheme()
  }

  // Apply theme to document
  function applyTheme() {
    const root = document.documentElement
    const surfaces = buildThemeSurface(settings.value, resolvedMode.value)
    const textSurface = buildTextSurface(settings.value)

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
    root.setAttribute('data-theme-mode', resolvedMode.value)
    root.setAttribute('data-baseplate-style', settings.value.baseplateStyle)
    root.style.setProperty('--app-gradient', surfaces.background)
    root.style.setProperty('--shell-surface', surfaces.shellSurface)
    root.style.setProperty('--panel-gradient', surfaces.panelGradient)
    root.style.setProperty('--panel-muted', surfaces.panelMuted)
    root.style.setProperty('--panel-strong', surfaces.panelStrong)
    root.style.setProperty('--liquid-content-surface', surfaces.contentSurface)
    root.style.setProperty('--liquid-deep-shadow', surfaces.deepShadow)
    root.style.setProperty('--app-font-family', FONT_FAMILY_STACKS[settings.value.fontFamilyPreset])
    root.style.setProperty('--text-primary', textSurface.primary)
    root.style.setProperty('--text-secondary', textSurface.secondary)
    root.style.setProperty('--text-tertiary', textSurface.tertiary)
    root.style.setProperty('--text-disabled', textSurface.disabled)
    root.style.setProperty('--app-baseplate-color-a', settings.value.baseplateColorA)
    root.style.setProperty('--app-baseplate-color-b', settings.value.baseplateColorB)
    root.style.setProperty('--app-baseplate-angle', `${settings.value.baseplateAngle}deg`)
    root.style.setProperty('--app-baseplate-intensity', String(settings.value.baseplateIntensity / 100))
    root.style.setProperty(
      '--app-baseplate-image',
      settings.value.baseplateImagePath
        ? `url("${resolveBaseplateImageUrl(settings.value.baseplateImagePath)}")`
        : 'none',
    )
    root.style.setProperty(
      '--app-baseplate-image-opacity',
      String(settings.value.baseplateImageOpacity / 100),
    )
    root.style.setProperty('--app-baseplate-image-blur', `${settings.value.baseplateImageBlur}px`)

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
      systemTheme.value = mediaQuery.matches ? 'dark' : 'light'
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
    setFontFamilyPreset,
    updateTextColors,
    updateBaseplateSettings,
    applyTheme,
    getCurrentTheme,
    resolvedMode,
    init,
    resetTheme
  }
})
