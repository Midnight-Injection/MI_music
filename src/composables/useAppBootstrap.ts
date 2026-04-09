import { onUnmounted, ref } from 'vue'
import { usePlaylistStore } from '../store/playlist'
import { usePlayerStore } from '../store/player'
import { useAppUpdateStore } from '../store/appUpdate'
import { useSettingsStore } from '../store/settings'
import { useThemeStore } from '../store/theme'
import { useUserSourceStore } from '../stores/userSource'
import { ensureDatabaseInitialized } from '../utils/tauriDatabase'
import { useAppliedSettings } from './useAppliedSettings'

const STARTUP_TIMEOUT_MS = 10000

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = STARTUP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label}超时（>${Math.round(timeoutMs / 1000)}s）`))
    }, timeoutMs)

    promise
      .then(value => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch(error => {
        window.clearTimeout(timer)
        reject(error)
      })
  })
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
  const bootstrapErrors: string[] = []

  function commitBootstrapState() {
    errorMessage.value = bootstrapErrors.length ? bootstrapErrors.join('；') : null
    isReady.value = bootstrapErrors.length === 0
  }

  function recordBootstrapError(message: string) {
    if (!bootstrapErrors.includes(message)) {
      bootstrapErrors.push(message)
      commitBootstrapState()
    }
  }

  async function runStartupTask(
    label: string,
    task: () => Promise<void> | void,
    options: { critical?: boolean; timeoutMs?: number } = {}
  ) {
    try {
      await withTimeout(Promise.resolve().then(() => task()), label, options.timeoutMs)
    } catch (error) {
      const message = `${label}失败：${getErrorMessage(error)}`
      if (options.critical) {
        console.error(`[Bootstrap] ${message}`, error)
      } else {
        console.warn(`[Bootstrap] ${message}`, error)
      }
      recordBootstrapError(message)
    }
  }

  function scheduleBackgroundTask(
    label: string,
    task: () => Promise<void> | void,
    timeoutMs = STARTUP_TIMEOUT_MS
  ) {
    void runStartupTask(label, task, { timeoutMs })
  }

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
      bootstrapErrors.length = 0
      isReady.value = false

      hydrateSettingsFromLocalStorage()
      const restoredPlayerSession = hydratePlayerSessionFromLocalStorage()
      commitBootstrapState()

      await runStartupTask('数据库初始化', ensureDatabaseInitialized, { critical: true })
      await runStartupTask('主题初始化', () => themeStore.init(), { critical: true })
      await runStartupTask('应用设置初始化', () => appliedSettings.init(), { critical: true })

      ensureSettingsPersistence()
      ensurePlayerPersistence()

      hasBootstrapped.value = true
      commitBootstrapState()

      scheduleBackgroundTask('歌单初始化', () => playlistStore.init())
      scheduleBackgroundTask('用户音源加载', () => userSourceStore.loadUserSources())
      scheduleBackgroundTask('应用更新初始化', async () => {
        await appUpdateStore.initialize()
        await appUpdateStore.runStartupCheck()
      }, 8000)

      if (
        restoredPlayerSession?.wasPlaying &&
        settingsStore.settings.startupAutoPlay &&
        playerStore.currentMusic
      ) {
        scheduleBackgroundTask('自动恢复播放', () => playerStore.playMusic(playerStore.currentMusic!), 15000)
      }
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
