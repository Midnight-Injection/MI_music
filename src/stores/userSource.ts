import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { UserSourceScript } from '../types/userSource'
import { clearCachedSourcesById } from '../modules/playback/sourceSuccessCache'

// Dynamic import with environment detection
let invokeFn: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | undefined
let openFn: any = undefined
let tauriReady = false
let tauriInitPromise: Promise<void> | null = null

// Check if running in Tauri context - check at runtime, not at module load time
function checkTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

// Initialize Tauri APIs asynchronously
async function initTauriAPIs() {
  // Check context at runtime
  const isTauriContext = checkTauriContext()
  console.log('[UserSourceStore] initTauriAPIs - isTauriContext:', isTauriContext, 'tauriReady:', tauriReady)

  if (!isTauriContext || tauriReady) return

  try {
    const tauriCore = await import('@tauri-apps/api/core')
    const tauriDialog = await import('@tauri-apps/plugin-dialog')
    invokeFn = tauriCore.invoke
    openFn = tauriDialog.open
    tauriReady = true
    console.log('[UserSourceStore] Tauri APIs initialized successfully')
  } catch (error) {
    console.warn('[UserSourceStore] Failed to load Tauri APIs, running in fallback mode:', error)
  }
}

// Start initialization when module loads (will check context at runtime)
tauriInitPromise = initTauriAPIs()

// Ensure Tauri APIs are ready before use
async function ensureTauriReady() {
  // Always try to initialize if not ready yet
  if (!tauriReady) {
    await initTauriAPIs()
  }
  if (tauriInitPromise) {
    await tauriInitPromise
    tauriInitPromise = null // Clear after first await
  }
}

export const useUserSourceStore = defineStore('userSource', () => {
  // 状态
  const userSources = ref<UserSourceScript[]>([])
  const isLoading = ref(false)
  const isLoaded = ref(false)
  let hasTriedImportDefaults = false

  function sortSources(sources: UserSourceScript[]): UserSourceScript[] {
    return [...sources].sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority
      return left.created_at - right.created_at
    })
  }

  // 计算属性：启用的音源
  const enabledSources = computed(() =>
    sortSources(userSources.value.filter(s => s.enabled))
  )
  const sortedUserSources = computed(() => sortSources(userSources.value))

  // 加载用户音源
  async function loadUserSources(force = false) {
    console.log('[UserSourceStore] loadUserSources called, isLoading:', isLoading.value, 'isLoaded:', isLoaded.value, 'force:', force)

    // 如果已经加载完成且不强制刷新，直接返回
    if (isLoaded.value && !force) return

    // 如果正在加载，等待加载完成
    if (isLoading.value) {
      console.log('[UserSourceStore] Already loading, waiting...')
      // 等待加载完成（使用轮询方式，因为 watch 不能在普通函数中使用）
      while (isLoading.value) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      console.log('[UserSourceStore] Loading complete, enabledSources:', enabledSources.value.length)
      return
    }

    isLoading.value = true
    try {
      // Wait for Tauri APIs to be ready
      await ensureTauriReady()
      console.log('[UserSourceStore] Tauri ready check complete, isTauriContext:', checkTauriContext(), 'invokeFn available:', !!invokeFn)

      // Check if invoke is available
      if (!invokeFn) {
        console.warn('[UserSourceStore] Tauri invoke not available, skipping user sources load')
        userSources.value = []
        isLoaded.value = true
        return
      }
      let sources = await invokeFn('get_user_sources') as UserSourceScript[]

      if (!sources.length && !hasTriedImportDefaults) {
        hasTriedImportDefaults = true
        try {
          await invokeFn('import_default_sources')
          sources = await invokeFn('get_user_sources') as UserSourceScript[]
        } catch (error) {
          console.warn('[UserSourceStore] Failed to auto-import default sources:', error)
        }
      }

      userSources.value = sources
      isLoaded.value = true
      console.log('[UserSourceStore] Loaded', sources.length, 'user sources, enabled:', sources.filter(s => s.enabled).length)
    } catch (error) {
      console.error('[UserSourceStore] Failed to load user sources:', error)
      // Don't throw error, just mark as loaded with empty sources
      userSources.value = []
      isLoaded.value = true
    } finally {
      isLoading.value = false
    }
  }

  // 导入音源
  async function importSource(): Promise<UserSourceScript | null> {
    try {
      // Wait for Tauri APIs to be ready
      await ensureTauriReady()

      // Check if open and invoke are available
      if (!openFn || !invokeFn) {
        console.warn('[UserSourceStore] Tauri APIs not available')
        return null
      }

      // 打开文件选择对话框
      const selected = await openFn({
        multiple: false,
        filters: [{
          name: 'JavaScript',
          extensions: ['js']
        }]
      })

      if (!selected) {
        return null
      }

      const filePath = Array.isArray(selected) ? selected[0] : selected
      if (!filePath) {
        return null
      }

      const source = await invokeFn('import_user_source_from_file', {
        filePath
      }) as UserSourceScript

      // 添加到列表
      userSources.value.push(source)
      isLoaded.value = true

      return source
    } catch (error) {
      console.error('Failed to import user source:', error)
      throw error
    }
  }

  // 切换音源启用状态
  async function toggleSource(id: string, enabled: boolean) {
    try {
      if (!invokeFn) {
        console.warn('[UserSourceStore] Tauri invoke not available')
        return
      }
      const updated = await invokeFn('update_user_source', {
        id,
        enabled
      }) as UserSourceScript

      // 更新本地状态
      const index = userSources.value.findIndex(s => s.id === id)
      if (index !== -1) {
        userSources.value[index] = updated
      }

      if (!enabled) {
        clearCachedSourcesById(id)
      }
    } catch (error) {
      console.error('Failed to toggle user source:', error)
      throw error
    }
  }

  async function updateSourcePriority(id: string, priority: number) {
    try {
      if (!invokeFn) {
        console.warn('[UserSourceStore] Tauri invoke not available')
        return
      }
      const normalizedPriority = Math.max(1, Math.floor(priority || 1))
      const updated = await invokeFn('update_user_source', {
        id,
        priority: normalizedPriority
      }) as UserSourceScript

      const index = userSources.value.findIndex(s => s.id === id)
      if (index !== -1) {
        userSources.value[index] = updated
      }
    } catch (error) {
      console.error('Failed to update user source priority:', error)
      throw error
    }
  }

  // 删除音源
  async function deleteSource(id: string) {
    try {
      if (!invokeFn) {
        console.warn('[UserSourceStore] Tauri invoke not available')
        return
      }
      await invokeFn('delete_user_source', { id })

      // 从列表中移除
      const index = userSources.value.findIndex(s => s.id === id)
      if (index !== -1) {
        userSources.value.splice(index, 1)
      }

      clearCachedSourcesById(id)
    } catch (error) {
      console.error('Failed to delete user source:', error)
      throw error
    }
  }

  // 导出音源脚本
  async function exportSource(id: string): Promise<string> {
    try {
      if (!invokeFn) {
        console.warn('[UserSourceStore] Tauri invoke not available')
        return ''
      }
      const script = await invokeFn('export_user_source', { id }) as string
      return script
    } catch (error) {
      console.error('Failed to export user source:', error)
      throw error
    }
  }

  // 根据 ID 获取音源
  function getSourceById(id: string): UserSourceScript | undefined {
    return userSources.value.find(s => s.id === id)
  }

  return {
    userSources,
    isLoading,
    isLoaded,
    enabledSources,
    sortedUserSources,
    loadUserSources,
    importSource,
    toggleSource,
    updateSourcePriority,
    deleteSource,
    exportSource,
    getSourceById,
  }
})
