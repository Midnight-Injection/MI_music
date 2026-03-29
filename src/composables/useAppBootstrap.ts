import { onUnmounted, ref } from 'vue'
import { usePlaylistStore } from '../store/playlist'
import { useSettingsStore } from '../store/settings'
import { useThemeStore } from '../store/theme'
import { useUserSourceStore } from '../stores/userSource'
import { ensureDatabaseInitialized } from '../utils/tauriDatabase'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function useAppBootstrap() {
  const settingsStore = useSettingsStore()
  const themeStore = useThemeStore()
  const playlistStore = usePlaylistStore()
  const userSourceStore = useUserSourceStore()

  const hasBootstrapped = ref(false)
  const isLoading = ref(false)
  const isReady = ref(false)
  const errorMessage = ref<string | null>(null)

  let bootstrapPromise: Promise<void> | null = null
  let unsubscribeSettings: (() => void) | null = null

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

  async function bootstrapApp() {
    if (bootstrapPromise) return bootstrapPromise

    bootstrapPromise = (async () => {
      isLoading.value = true
      errorMessage.value = null

      hydrateSettingsFromLocalStorage()

      const errors: string[] = []

      try {
        await themeStore.init()
      } catch (error) {
        console.error('Failed to initialize theme:', error)
        errors.push(`主题初始化失败：${getErrorMessage(error)}`)
      }

      try {
        await ensureDatabaseInitialized()
        await playlistStore.init()
      } catch (error) {
        console.error('Failed to initialize database and playlists:', error)
        errors.push(`数据库初始化失败：${getErrorMessage(error)}`)
      }

      try {
        await userSourceStore.loadUserSources()
      } catch (error) {
        console.error('Failed to load user sources during bootstrap:', error)
        errors.push(`用户音源加载失败：${getErrorMessage(error)}`)
      }

      ensureSettingsPersistence()

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
    if (unsubscribeSettings) {
      unsubscribeSettings()
      unsubscribeSettings = null
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
