import { invoke } from '@tauri-apps/api/core'
import { watch, type WatchStopHandle } from 'vue'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { useThemeStore } from '../store/theme'
import type { WindowSize } from '../types/settings'

const WINDOW_SIZE_PRESETS: Record<Exclude<WindowSize, 'custom'>, { width: number; height: number }> = {
  small: { width: 1180, height: 780 },
  medium: { width: 1360, height: 880 },
  large: { width: 1540, height: 980 },
}

function isTauriContext() {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export function useAppliedSettings() {
  const settingsStore = useSettingsStore()
  const themeStore = useThemeStore()
  const playerStore = usePlayerStore()

  let stopHandles: WatchStopHandle[] = []

  function applyDocumentSettings() {
    const root = document.documentElement
    root.lang = settingsStore.settings.language
    root.setAttribute('data-animation', settingsStore.settings.animation ? 'on' : 'off')
    root.setAttribute('data-control-position', settingsStore.settings.controlPosition)
    root.style.setProperty('--app-font-size', `${settingsStore.settings.fontSize}px`)
    root.style.setProperty('--lyric-font-size', `${settingsStore.settings.lyricFontSize}px`)
  }

  async function applyWindowSize(windowSize: WindowSize) {
    if (!isTauriContext() || windowSize === 'custom') return

    try {
      const [{ getCurrentWindow, LogicalSize }, size] = await Promise.all([
        import('@tauri-apps/api/window'),
        Promise.resolve(WINDOW_SIZE_PRESETS[windowSize]),
      ])

      await getCurrentWindow().setSize(new LogicalSize(size.width, size.height))
    } catch (error) {
      console.error('Failed to apply window size:', error)
    }
  }

  async function applyNetworkProxy() {
    if (!isTauriContext()) return

    try {
      await invoke('set_network_proxy', {
        enabled: settingsStore.settings.proxyEnabled,
        host: settingsStore.settings.proxyHost.trim() || null,
        port: settingsStore.settings.proxyPort,
      })
    } catch (error) {
      console.error('Failed to apply network proxy:', error)
    }
  }

  function syncPlayerSettings() {
    if (Math.abs(playerStore.volume - settingsStore.settings.volume) > 0.001) {
      void playerStore.setVolume(settingsStore.settings.volume, { persist: false })
    }

    if (playerStore.playMode !== settingsStore.settings.defaultPlayMode) {
      playerStore.setPlayMode(settingsStore.settings.defaultPlayMode, { persist: false })
    }
  }

  function init() {
    if (stopHandles.length) return

    settingsStore.syncThemeSettings(themeStore.settings)
    applyDocumentSettings()
    syncPlayerSettings()
    void applyWindowSize(settingsStore.settings.windowSize)
    void applyNetworkProxy()

    stopHandles = [
      watch(
        () => ({ ...themeStore.settings }),
        (nextThemeSettings) => {
          settingsStore.syncThemeSettings(nextThemeSettings)
        },
        { deep: true, immediate: true },
      ),
      watch(
        () => ({
          language: settingsStore.settings.language,
          animation: settingsStore.settings.animation,
          fontSize: settingsStore.settings.fontSize,
          lyricFontSize: settingsStore.settings.lyricFontSize,
          controlPosition: settingsStore.settings.controlPosition,
        }),
        applyDocumentSettings,
        { deep: true },
      ),
      watch(
        () => settingsStore.settings.windowSize,
        (value) => {
          void applyWindowSize(value)
        },
      ),
      watch(
        () => ({
          proxyEnabled: settingsStore.settings.proxyEnabled,
          proxyHost: settingsStore.settings.proxyHost,
          proxyPort: settingsStore.settings.proxyPort,
        }),
        () => {
          void applyNetworkProxy()
        },
        { deep: true },
      ),
      watch(
        () => ({
          volume: settingsStore.settings.volume,
          defaultPlayMode: settingsStore.settings.defaultPlayMode,
        }),
        syncPlayerSettings,
        { deep: true, immediate: true },
      ),
    ]
  }

  function dispose() {
    stopHandles.forEach((stop) => stop())
    stopHandles = []
  }

  return {
    init,
    dispose,
  }
}
