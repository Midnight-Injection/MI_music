import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type UIMode = 'pc' | 'tv' | 'mobile'

const STORAGE_KEY = 'ui-mode'

function detectPlatform(): UIMode {
  // 1. 检测 Tauri 移动端
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const meta = (window as any).__TAURI_INTERNALS__?.metadata
      if (meta?.platform === 'android' || meta?.platform === 'ios') {
        return 'mobile'
      }
    } catch {}
  }

  // 2. 检测 Android TV
  if (/Android\s+TV/i.test(navigator.userAgent)) {
    return 'tv'
  }

  // 3. 触屏 + 小屏幕 → 移动端
  if ('ontouchstart' in window && window.innerWidth <= 768) {
    return 'mobile'
  }

  return 'pc'
}

export const useUIModeStore = defineStore('uiMode', () => {
  const mode = ref<UIMode>('pc')
  const isInitialized = ref(false)

  const isPC = computed(() => mode.value === 'pc')
  const isTV = computed(() => mode.value === 'tv')
  const isMobile = computed(() => mode.value === 'mobile')

  function setMode(next: UIMode) {
    mode.value = next
    document.documentElement.setAttribute('data-ui-mode', next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  function init() {
    if (isInitialized.value) return

    // 优先级: 环境变量 > localStorage > 运行时检测 > 默认 pc
    const envMode = import.meta.env.VITE_UI_MODE as UIMode | undefined
    const savedMode = localStorage.getItem(STORAGE_KEY) as UIMode | null

    const validModes: UIMode[] = ['pc', 'tv', 'mobile']

    const resolvedMode: UIMode =
      envMode && validModes.includes(envMode) ? envMode
      : savedMode && validModes.includes(savedMode) ? savedMode
      : detectPlatform()

    setMode(resolvedMode)
    isInitialized.value = true
  }

  return { mode, isPC, isTV, isMobile, isInitialized, setMode, init }
})
