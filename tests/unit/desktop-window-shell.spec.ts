import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { EventCallback } from '@tauri-apps/api/event'

const tauriMocks = vi.hoisted(() => {
  let resizedHandler: EventCallback<{ width: number; height: number }> | null = null
  let focusChangedHandler: EventCallback<boolean> | null = null

  const unlistenResized = vi.fn()
  const unlistenFocusChanged = vi.fn()

  const appWindow = {
    isFocused: vi.fn(async () => true),
    isMaximized: vi.fn(async () => false),
    startDragging: vi.fn(async () => {}),
    startResizeDragging: vi.fn(async () => {}),
    setFocus: vi.fn(async () => {}),
    minimize: vi.fn(async () => {}),
    toggleMaximize: vi.fn(async () => {}),
    onResized: vi.fn(async (handler: EventCallback<{ width: number; height: number }>) => {
      resizedHandler = handler
      return unlistenResized
    }),
    onFocusChanged: vi.fn(async (handler: EventCallback<boolean>) => {
      focusChangedHandler = handler
      return unlistenFocusChanged
    }),
  }

  return {
    appWindow,
    emitResized(payload = { width: 1180, height: 860 }) {
      resizedHandler?.({ event: 'tauri://resize', id: 1, payload })
    },
    emitFocusChanged(payload: boolean) {
      focusChangedHandler?.({ event: 'tauri://focus', id: 1, payload })
    },
    resetHandlers() {
      resizedHandler = null
      focusChangedHandler = null
    },
    unlistenResized,
    unlistenFocusChanged,
  }
})

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => tauriMocks.appWindow,
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(async () => undefined),
}))

describe('DesktopWindowShell', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    tauriMocks.resetHandlers()
    ;(window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__ = {}
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    delete (window as Window & { __TAURI_INTERNALS__?: object }).__TAURI_INTERNALS__
  })

  async function mountShell() {
    const DesktopWindowShell = (await import('../../src/components/layout/DesktopWindowShell.vue')).default
    const wrapper = mount(DesktopWindowShell, {
      props: {
        caption: '测试窗口',
      },
      slots: {
        default: '<div class="shell-content">content</div>',
      },
    })

    await nextTick()
    await Promise.resolve()

    return wrapper
  }

  async function flushAsyncState() {
    await Promise.resolve()
    await nextTick()
    await Promise.resolve()
  }

  it('does not query maximized state again or force focus recovery after resize ends', async () => {
    const wrapper = await mountShell()

    expect(tauriMocks.appWindow.isMaximized).toHaveBeenCalledTimes(1)

    await wrapper.find('.desktop-window-shell__resize-handle--east').trigger('mousedown', {
      button: 0,
    })

    expect(tauriMocks.appWindow.startResizeDragging).toHaveBeenCalledWith('East')

    tauriMocks.emitResized()
    await vi.advanceTimersByTimeAsync(200)
    await flushAsyncState()

    expect(tauriMocks.appWindow.isMaximized).toHaveBeenCalledTimes(1)
    expect(tauriMocks.appWindow.setFocus).not.toHaveBeenCalled()
  })

  it('re-reads maximized state only after an explicit maximize toggle', async () => {
    tauriMocks.appWindow.isMaximized
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    const wrapper = await mountShell()

    await wrapper.find('.desktop-window-shell__control--maximize').trigger('click')
    await flushAsyncState()

    expect(tauriMocks.appWindow.toggleMaximize).toHaveBeenCalledTimes(1)
    expect(tauriMocks.appWindow.isMaximized).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.desktop-window-shell__control--maximize').attributes('aria-label')).toBe('还原窗口')
  })

  it('ends resize interaction when focus changes without re-querying maximize state', async () => {
    const wrapper = await mountShell()

    await wrapper.find('.desktop-window-shell__resize-handle--south').trigger('mousedown', {
      button: 0,
    })

    tauriMocks.emitFocusChanged(false)
    await vi.advanceTimersByTimeAsync(150)
    await flushAsyncState()

    expect(tauriMocks.appWindow.isMaximized).toHaveBeenCalledTimes(1)
  })
})
