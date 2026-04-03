import { onUnmounted, ref } from 'vue'
import { usePlaylistStore } from '../store/playlist'
import { usePlayerStore } from '../store/player'
import { useAppUpdateStore } from '../store/appUpdate'
import { useSettingsStore } from '../store/settings'
import { useThemeStore } from '../store/theme'
import { useUserSourceStore } from '../stores/userSource'
import { ensureDatabaseInitialized } from '../utils/tauriDatabase'
import { useAppliedSettings } from './useAppliedSettings'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useAppBootstrap() {
  const settingsStore = useSettingsStore()
  const themeStore = useThemeStore()
  const playlistStore = usePlaylistStore()
  const playerStore = usePlayerStore()
  const appUpdateStore = useAppUpdateStore()
  const userSourceStore = useUserSourceStore()
  const appliedSettings = useAppliedSettings()

  const hasBootstrapped = ref(false)
  const isLoading = ref(false)
  const isReady = ref(false)
  const errorMessage = ref<string | null>(null)

  let bootstrapPromise: Promise<void> | null = null
  let unsubscribeSettings: (() => void) | null = null
  let unsubscribePlayer: (() => void) | null = null

  function hydrateSettingsFromLocalStorage() {
    const saved = localStorage.getItem('settings')
    if (!saved) return

    try {
      settingsStore.loadSettings(JSON.parse(saved))
    } catch (error) {
      console.error('Failed to load settings from localStorage:', error)
    }
  }

  function ensureSettingsPersistence() {
    if (unsubscribeSettings) return

    unsubscribeSettings = settingsStore.$subscribe((_mutation, state) => {
      localStorage.setItem('settings', JSON.stringify(state.settings))
    })
  }

  function hydratePlayerSessionFromLocalStorage() {
    const saved = localStorage.getItem('player-session')
    if (!saved) return null

    try {
      const parsed = JSON.parse(saved)
      playerStore.restoreSession(parsed)
      return parsed
    } catch (error) {
      console.error('Failed to load player session from localStorage:', error)
      return null
    }
  }

  function ensurePlayerPersistence() {
    if (unsubscribePlayer) return

    unsubscribePlayer = playerStore.$subscribe((_mutation, state) => {
      localStorage.setItem(
        'player-session',
        JSON.stringify({
          playlist: state.playlist,
          currentIndex: state.currentIndex,
          currentTime: state.currentTime,
          wasPlaying: state.isPlaying,
        })
      )
    })
  }

  async function bootstrapApp() {
    if (bootstrapPromise) return bootstrapPromise

    bootstrapPromise = (async () => {
      isLoading.value = true
      errorMessage.value = null

      hydrateSettingsFromLocalStorage()
      const restoredPlayerSession = hydratePlayerSessionFromLocalStorage()

      const errors: string[] = []

      try {
        await ensureDatabaseInitialized()
      } catch (error) {
        console.error('Failed to initialize database:', error)
        errors.push(`数据库初始化失败：${getErrorMessage(error)}`)
      }

      try {
        await themeStore.init()
      } catch (error) {
        console.error('Failed to initialize theme:', error)
        errors.push(`主题初始化失败：${getErrorMessage(error)}`)
      }

      appliedSettings.init()

      try {
        await playlistStore.init()
      } catch (error) {
        console.error('Failed to initialize playlists:', error)
        errors.push(`歌单初始化失败：${getErrorMessage(error)}`)
      }

      try {
        await userSourceStore.loadUserSources()
      } catch (error) {
        console.error('Failed to load user sources during bootstrap:', error)
        errors.push(`用户音源加载失败：${getErrorMessage(error)}`)
      }

      ensureSettingsPersistence()
      ensurePlayerPersistence()

      try {
        await appUpdateStore.initialize()
        await appUpdateStore.runStartupCheck()
      } catch (error) {
        console.warn('Failed to initialize app updater:', error)
      }

      if (
        restoredPlayerSession?.wasPlaying &&
        settingsStore.settings.startupAutoPlay &&
        playerStore.currentMusic
      ) {
        try {
          await playerStore.playMusic(playerStore.currentMusic)
        } catch (error) {
          console.error('Failed to auto resume last track:', error)
          errors.push(`自动恢复播放失败：${getErrorMessage(error)}`)
        }
      }

      errorMessage.value = errors.length ? errors.join('；') : null
      isReady.value = errors.length === 0
      hasBootstrapped.value = true
    })()

    try {
      await bootstrapPromise
    } finally {
      isLoading.value = false
      bootstrapPromise = null
    }
  }

  function dispose() {
    appliedSettings.dispose()
    if (unsubscribeSettings) {
      unsubscribeSettings()
      unsubscribeSettings = null
    }
    if (unsubscribePlayer) {
      unsubscribePlayer()
      unsubscribePlayer = null
    }
  }

  onUnmounted(() => {
    dispose()
  })

  return {
    hasBootstrapped,
    isLoading,
    isReady,
    errorMessage,
    bootstrapApp,
    dispose,
  }
}
