import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { AppUpdateService, TauriUpdaterAdapter } from '@/services/appUpdate'
import { useSettingsStore } from './settings'
import type {
  AppUpdateHandle,
  AppUpdateInfo,
  AppUpdateProgress,
  AppUpdateStatus,
  AppUpdaterAdapter,
} from '@/types/appUpdate'

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function buildDefaultAdapter(): AppUpdaterAdapter {
  return new TauriUpdaterAdapter()
}

export const useAppUpdateStore = defineStore('appUpdate', () => {
  const settingsStore = useSettingsStore()

  const currentVersion = ref<string>('...')
  const status = ref<AppUpdateStatus>('idle')
  const availableUpdate = ref<AppUpdateInfo | null>(null)
  const progress = ref<AppUpdateProgress | null>(null)
  const errorMessage = ref<string | null>(null)
  const hasInitialized = ref(false)

  let currentHandle: AppUpdateHandle | null = null
  let serviceFactory: () => AppUpdaterAdapter = buildDefaultAdapter
  let service: AppUpdateService | null = null

  const isBusy = computed(
    () =>
      status.value === 'checking' || status.value === 'downloading' || status.value === 'installing'
  )

  const lastCheckedAt = computed(() => settingsStore.settings.appUpdateLastCheckedAt || null)

  function getService(): AppUpdateService {
    service ??= new AppUpdateService(serviceFactory())
    return service
  }

  async function replaceHandle(nextHandle: AppUpdateHandle | null): Promise<void> {
    if (currentHandle && currentHandle !== nextHandle) {
      try {
        await currentHandle.close()
      } catch (error) {
        console.error('Failed to close updater handle:', error)
      }
    }

    currentHandle = nextHandle
  }

  function resetTransientState(nextStatus: AppUpdateStatus = 'idle'): void {
    status.value = nextStatus
    progress.value = null
    errorMessage.value = null
  }

  function persistLastCheckedAt(value: string): void {
    settingsStore.updateSetting('appUpdateLastCheckedAt', value)
  }

  async function initialize(): Promise<void> {
    if (hasInitialized.value) {
      return
    }

    if (!getService().isSupported()) {
      resetTransientState('unsupported')
      hasInitialized.value = true
      return
    }

    try {
      currentVersion.value = await getService().getCurrentVersion()
      resetTransientState(status.value === 'unsupported' ? 'idle' : status.value)
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      status.value = 'error'
    } finally {
      hasInitialized.value = true
    }
  }

  async function runStartupCheck(): Promise<void> {
    if (!settingsStore.settings.autoCheckAppUpdate) {
      return
    }

    await checkForUpdates({ silent: true })
  }

  async function checkForUpdates(
    options: { silent?: boolean } = {}
  ): Promise<AppUpdateInfo | null> {
    const silent = options.silent ?? false

    await initialize()

    if (!getService().isSupported()) {
      status.value = 'unsupported'
      return null
    }

    if (isBusy.value) {
      return availableUpdate.value
    }

    progress.value = null
    errorMessage.value = null
    status.value = 'checking'

    try {
      const result = await getService().checkForUpdates()
      currentVersion.value = result.currentVersion
      persistLastCheckedAt(result.checkedAt)

      if (!result.update) {
        await replaceHandle(null)
        availableUpdate.value = null
        status.value = 'up-to-date'
        return null
      }

      await replaceHandle(result.update)
      availableUpdate.value = result.update.metadata
      status.value = 'available'

      return availableUpdate.value
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      status.value = 'error'

      if (!silent) {
        console.error('Failed to check app updates:', error)
      }

      return null
    }
  }

  async function installUpdate(): Promise<boolean> {
    if (!currentHandle || !availableUpdate.value) {
      return false
    }

    const installingVersion = availableUpdate.value.version

    errorMessage.value = null
    progress.value = {
      contentLength: null,
      downloadedBytes: 0,
      percent: null,
    }
    status.value = 'downloading'

    try {
      const result = await getService().installUpdate(currentHandle, (event) => {
        if (!progress.value) {
          progress.value = {
            contentLength: null,
            downloadedBytes: 0,
            percent: null,
          }
        }

        if (event.event === 'Started') {
          status.value = 'downloading'
          progress.value.contentLength = event.contentLength
          progress.value.downloadedBytes = 0
          progress.value.percent = event.contentLength ? 0 : null
          return
        }

        if (event.event === 'Progress') {
          status.value = 'downloading'
          progress.value.downloadedBytes += event.chunkLength
          if (progress.value.contentLength && progress.value.contentLength > 0) {
            progress.value.percent = Math.min(
              100,
              Math.round((progress.value.downloadedBytes / progress.value.contentLength) * 100)
            )
          }
          return
        }

        status.value = 'installing'
        progress.value.percent = 100
      })

      currentVersion.value = installingVersion
      availableUpdate.value = null
      await replaceHandle(null)
      status.value = 'completed'

      if (!result.relaunchTriggered) {
        progress.value = {
          contentLength: progress.value?.contentLength ?? null,
          downloadedBytes: progress.value?.downloadedBytes ?? 0,
          percent: 100,
        }
      }

      return true
    } catch (error) {
      errorMessage.value = getErrorMessage(error)
      status.value = 'error'
      return false
    }
  }

  function resetState(): void {
    void replaceHandle(null)
    availableUpdate.value = null
    progress.value = null
    errorMessage.value = null
    status.value = hasInitialized.value && !getService().isSupported() ? 'unsupported' : 'idle'
  }

  return {
    currentVersion,
    status,
    availableUpdate,
    progress,
    errorMessage,
    hasInitialized,
    isBusy,
    lastCheckedAt,
    initialize,
    runStartupCheck,
    checkForUpdates,
    installUpdate,
    resetState,
  }
})
