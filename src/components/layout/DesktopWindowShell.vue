<template>
  <div
    class="desktop-window-shell"
    :class="{
      'desktop-window-shell--focused': isWindowFocused,
      'desktop-window-shell--maximized': isWindowMaximized,
      'desktop-window-shell--degraded': Boolean(errorMessage) && !isReady,
      'desktop-window-shell--resizing': isResizingWindow,
    }"
    :style="{ cursor: shellCursor }"
    @mousemove.passive="updateResizeHotzone"
    @mouseleave="clearResizeHotzone"
  >
    <div
      v-for="handle in resizeHandles"
      :key="handle.direction"
      class="desktop-window-shell__resize-handle"
      :class="[
        `desktop-window-shell__resize-handle--${handle.className}`,
        { 'desktop-window-shell__resize-handle--active': activeResizeDirection === handle.direction },
      ]"
      aria-hidden="true"
      @mousedown="startWindowResize($event, handle.direction)"
    />

    <div class="desktop-window-shell__frame">
      <header
        class="desktop-window-shell__titlebar"
        @dblclick.stop="toggleWindowMaximize"
        @mousedown="handleTitlebarMouseDown"
      >
        <div class="desktop-window-shell__controls">
          <button
            type="button"
            class="desktop-window-shell__control desktop-window-shell__control--close"
            aria-label="关闭窗口"
            data-window-no-drag
            @mousedown.stop
            @click.stop="handleWindowAction('close')"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 3l6 6M9 3 3 9" />
            </svg>
          </button>

          <button
            type="button"
            class="desktop-window-shell__control desktop-window-shell__control--minimize"
            aria-label="最小化窗口"
            data-window-no-drag
            @mousedown.stop
            @click.stop="handleWindowAction('minimize')"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3 6h6" />
            </svg>
          </button>

          <button
            type="button"
            class="desktop-window-shell__control desktop-window-shell__control--maximize"
            :aria-label="isWindowMaximized ? '还原窗口' : '最大化窗口'"
            data-window-no-drag
            @mousedown.stop
            @click.stop="handleWindowAction('toggle-maximize')"
          >
            <svg v-if="isWindowMaximized" viewBox="0 0 12 12" aria-hidden="true">
              <path d="M3.5 5V3.5H9v5.5H7.5" />
              <path d="M3 3h5.5v5.5H3z" />
            </svg>
            <svg v-else viewBox="0 0 12 12" aria-hidden="true">
              <rect x="3" y="3" width="6" height="6" rx="1" />
            </svg>
          </button>
        </div>

        <div class="desktop-window-shell__meta">
          <span class="desktop-window-shell__eyebrow">Jiyu Music</span>
          <strong class="desktop-window-shell__title">{{ caption }}</strong>
        </div>

        <div class="desktop-window-shell__status">
          <span class="desktop-window-shell__pill">
            {{ statusLabel }}
          </span>
        </div>
      </header>

      <div class="desktop-window-shell__content">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

type ResizeDirection =
  | 'East'
  | 'North'
  | 'NorthEast'
  | 'NorthWest'
  | 'South'
  | 'SouthEast'
  | 'SouthWest'
  | 'West'

const props = withDefaults(
  defineProps<{
    caption?: string
    isReady?: boolean
    errorMessage?: string | null
  }>(),
  {
    caption: '极域音乐',
    isReady: true,
    errorMessage: null,
  }
)

const isWindowFocused = ref(true)
const isWindowMaximized = ref(false)
const isResizingWindow = ref(false)
const activeResizeDirection = ref<ResizeDirection | null>(null)
const isTauriWindow = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const appWindow = isTauriWindow ? getCurrentWindow() : null
const windowUnlisteners: Array<() => void> = []
let resizeInteractionTimer: number | null = null

function handleWindowMouseUp() {
  finishWindowResizeInteraction()
}

function handleWindowBlur() {
  finishWindowResizeInteraction()
}

const resizeHandles: Array<{
  className: string
  direction: ResizeDirection
  label: string
}> = [
  { className: 'north', direction: 'North', label: '调整上边框' },
  { className: 'south', direction: 'South', label: '调整下边框' },
  { className: 'west', direction: 'West', label: '调整左边框' },
  { className: 'east', direction: 'East', label: '调整右边框' },
  { className: 'north-west', direction: 'NorthWest', label: '调整左上角' },
  { className: 'north-east', direction: 'NorthEast', label: '调整右上角' },
  { className: 'south-west', direction: 'SouthWest', label: '调整左下角' },
  { className: 'south-east', direction: 'SouthEast', label: '调整右下角' },
]

const statusLabel = computed(() => {
  if (props.errorMessage && !props.isReady) return '降级运行中'
  return isWindowMaximized.value ? '原生响应式布局' : '桌面窗口模式'
})

const resizeCursorMap: Record<ResizeDirection, string> = {
  North: 'ns-resize',
  South: 'ns-resize',
  West: 'ew-resize',
  East: 'ew-resize',
  NorthWest: 'nwse-resize',
  SouthEast: 'nwse-resize',
  NorthEast: 'nesw-resize',
  SouthWest: 'nesw-resize',
}

const shellCursor = computed(() => {
  if (isWindowMaximized.value || isResizingWindow.value || !activeResizeDirection.value) {
    return 'default'
  }

  return resizeCursorMap[activeResizeDirection.value]
})

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest(
        'button, a, input, select, textarea, summary, label, [role="button"], [data-window-no-drag]'
      )
    )
  )
}

async function syncWindowState(options?: {
  includeFocused?: boolean
  includeMaximized?: boolean
}) {
  if (!appWindow) return

  const { includeFocused = true, includeMaximized = true } = options ?? {}

  try {
    if (includeFocused) {
      isWindowFocused.value = await appWindow.isFocused()
    }

    if (includeMaximized) {
      isWindowMaximized.value = await appWindow.isMaximized()
    }
  } catch (error) {
    console.error('Failed to sync window state:', error)
  }
}

async function handleTitlebarMouseDown(event: MouseEvent) {
  if (!appWindow || isResizingWindow.value || event.button !== 0 || isInteractiveTarget(event.target)) {
    return
  }

  try {
    await appWindow.startDragging()
  } catch (error) {
    console.error('Failed to start window dragging:', error)
  }
}

function clearResizeInteractionTimer() {
  if (resizeInteractionTimer !== null) {
    window.clearTimeout(resizeInteractionTimer)
    resizeInteractionTimer = null
  }
}

function clearResizeHotzone() {
  activeResizeDirection.value = null
}

function finishWindowResizeInteraction() {
  clearResizeInteractionTimer()
  isResizingWindow.value = false
  clearResizeHotzone()
}

function scheduleResizeInteractionFinish(delay = 180) {
  clearResizeInteractionTimer()
  resizeInteractionTimer = window.setTimeout(() => {
    finishWindowResizeInteraction()
    resizeInteractionTimer = null
  }, delay)
}

function resolveResizeDirection(event: MouseEvent) {
  if (isWindowMaximized.value || isResizingWindow.value) {
    return null
  }

  const currentTarget = event.currentTarget
  if (!(currentTarget instanceof HTMLElement)) {
    return null
  }

  const rect = currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const edgeThreshold = 8
  const cornerThreshold = 14
  const nearTop = y <= edgeThreshold
  const nearBottom = y >= rect.height - edgeThreshold
  const nearLeft = x <= edgeThreshold
  const nearRight = x >= rect.width - edgeThreshold
  const inTopCorner = y <= cornerThreshold
  const inBottomCorner = y >= rect.height - cornerThreshold
  const inLeftCorner = x <= cornerThreshold
  const inRightCorner = x >= rect.width - cornerThreshold

  if (inTopCorner && inLeftCorner) return 'NorthWest'
  if (inTopCorner && inRightCorner) return 'NorthEast'
  if (inBottomCorner && inLeftCorner) return 'SouthWest'
  if (inBottomCorner && inRightCorner) return 'SouthEast'
  if (nearTop) return 'North'
  if (nearBottom) return 'South'
  if (nearLeft) return 'West'
  if (nearRight) return 'East'

  return null
}

function updateResizeHotzone(event: MouseEvent) {
  activeResizeDirection.value = resolveResizeDirection(event)
}

async function startWindowResize(event: MouseEvent, direction: ResizeDirection) {
  if (!appWindow || isWindowMaximized.value || isResizingWindow.value || event.button !== 0) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  isResizingWindow.value = true

  try {
    await appWindow.startResizeDragging(direction)
  } catch (error) {
    finishWindowResizeInteraction()
    console.error(`Failed to start ${direction} resize:`, error)
  }
}

async function handleWindowAction(action: 'close' | 'minimize' | 'toggle-maximize') {
  if (!appWindow) return

  try {
    if (action === 'close') {
      await invoke('exit_app')
      return
    }

    if (action === 'minimize') {
      await appWindow.minimize()
      return
    }

    const nextMaximizedState = !isWindowMaximized.value
    isWindowMaximized.value = nextMaximizedState
    finishWindowResizeInteraction()
    await appWindow.toggleMaximize()
    await syncWindowState({ includeFocused: false, includeMaximized: true })
  } catch (error) {
    if (action === 'toggle-maximize') {
      isWindowMaximized.value = !isWindowMaximized.value
    }
    console.error(`Failed to ${action} window:`, error)
  }
}

async function toggleWindowMaximize(event?: MouseEvent) {
  if (!appWindow || (event && isInteractiveTarget(event.target))) return
  await handleWindowAction('toggle-maximize')
}

onMounted(async () => {
  window.addEventListener('mouseup', handleWindowMouseUp, true)
  window.addEventListener('blur', handleWindowBlur)

  if (!appWindow) return

  try {
    await syncWindowState()

    windowUnlisteners.push(
      await appWindow.onResized(() => {
        scheduleResizeInteractionFinish(160)
      })
    )
    windowUnlisteners.push(
      await appWindow.onFocusChanged(({ payload }) => {
        isWindowFocused.value = payload
        if (!payload && isResizingWindow.value) {
          scheduleResizeInteractionFinish(120)
          return
        }

        if (payload) {
          finishWindowResizeInteraction()
        }
      })
    )
  } catch (error) {
    console.error('Failed to initialize custom window controls:', error)
  }
})

onUnmounted(() => {
  finishWindowResizeInteraction()
  window.removeEventListener('mouseup', handleWindowMouseUp, true)
  window.removeEventListener('blur', handleWindowBlur)
  windowUnlisteners.splice(0).forEach((unlisten) => unlisten())
})
</script>

<style scoped lang="scss">
.desktop-window-shell {
  --window-frame-radius: 24px;
  --window-frame-border-color: var(--shell-border);
  --window-frame-border-width: 1px;
  --window-resize-hit-size: 8px;
  --window-resize-corner-size: 14px;
  width: 100%;
  height: 100%;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: var(--window-frame-radius);
  clip-path: inset(0 round var(--window-frame-radius));
  background: transparent;
}

.desktop-window-shell::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  box-shadow:
    inset 0 0 0 var(--window-frame-border-width) var(--window-frame-border-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 34px 110px var(--liquid-deep-shadow);
  z-index: 1;
}

.desktop-window-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    var(--app-gradient),
    radial-gradient(circle at 14% 16%, rgba(255, 255, 255, 0.12), transparent 18%),
    radial-gradient(circle at 82% 10%, rgba(255, 255, 255, 0.06), transparent 16%),
    var(--shell-surface);
  z-index: 0;
}

.desktop-window-shell--focused {
  --window-frame-border-color: color-mix(
    in srgb,
    var(--shell-border) 84%,
    rgba(255, 255, 255, 0.12)
  );
}

.desktop-window-shell--maximized {
  --window-frame-radius: 0px;
  border-radius: 0;
}

.desktop-window-shell--maximized .desktop-window-shell__resize-handle {
  display: none;
}

.desktop-window-shell--resizing .desktop-window-shell__resize-handle {
  pointer-events: none;
}

.desktop-window-shell__frame,
.desktop-window-shell::before,
.desktop-window-shell::after {
  border-radius: inherit;
}

.desktop-window-shell__frame {
  position: relative;
  z-index: 2;
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
}

.desktop-window-shell__frame::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
  background: var(--app-baseplate-image) center / cover no-repeat;
  opacity: var(--app-baseplate-image-opacity);
  filter: blur(var(--app-baseplate-image-blur));
  transform: scale(1.06);
}

.desktop-window-shell__titlebar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: 52px;
  padding: 0 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: var(--panel-muted);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.18),
    0 12px 28px rgba(10, 16, 30, 0.1);
  user-select: none;
  cursor: grab;
}

.desktop-window-shell__controls {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.desktop-window-shell__control {
  width: 13px;
  height: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0;
  box-shadow:
    inset 0 0 0 1px rgba(12, 8, 24, 0.26),
    0 1px 2px rgba(0, 0, 0, 0.24);

  svg {
    width: 7px;
    height: 7px;
    fill: none;
    stroke: rgba(35, 18, 18, 0.9);
    stroke-width: 1.35;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0;
    transition: opacity var(--transition-fast);
  }
}

.desktop-window-shell__titlebar:hover .desktop-window-shell__control svg,
.desktop-window-shell__control:focus-visible svg {
  opacity: 0.88;
}

.desktop-window-shell__control--close {
  background: linear-gradient(180deg, #ff6b6b, #f14b56);
}

.desktop-window-shell__control--minimize {
  background: linear-gradient(180deg, #ffd56e, #f1b93c);
}

.desktop-window-shell__control--maximize {
  background: linear-gradient(180deg, #49dd87, #27c25f);
}

.desktop-window-shell__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.desktop-window-shell__eyebrow {
  font-size: 0.54rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.desktop-window-shell__title {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 3px;
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.desktop-window-shell__status {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
  position: relative;
  z-index: 1;
  pointer-events: none;
}

.desktop-window-shell__pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-secondary);
  font-size: 0.64rem;
  letter-spacing: 0.04em;
}

.desktop-window-shell__content {
  position: relative;
  z-index: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: max(0px, calc(var(--window-frame-radius) - 10px));
  background: var(--liquid-content-surface);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.desktop-window-shell__resize-handle {
  position: absolute;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  appearance: none;
  outline: none;
  pointer-events: none;
  z-index: 12;
}

.desktop-window-shell__resize-handle--active {
  pointer-events: auto;
}

.desktop-window-shell__resize-handle--north,
.desktop-window-shell__resize-handle--south {
  left: var(--window-resize-corner-size);
  right: var(--window-resize-corner-size);
  height: var(--window-resize-hit-size);
}

.desktop-window-shell__resize-handle--north {
  top: 0;
  cursor: ns-resize;
}

.desktop-window-shell__resize-handle--south {
  bottom: 0;
  cursor: ns-resize;
}

.desktop-window-shell__resize-handle--west,
.desktop-window-shell__resize-handle--east {
  top: var(--window-resize-corner-size);
  bottom: var(--window-resize-corner-size);
  width: var(--window-resize-hit-size);
}

.desktop-window-shell__resize-handle--west {
  left: 0;
  cursor: ew-resize;
}

.desktop-window-shell__resize-handle--east {
  right: 0;
  cursor: ew-resize;
}

.desktop-window-shell__resize-handle--north-west,
.desktop-window-shell__resize-handle--north-east,
.desktop-window-shell__resize-handle--south-west,
.desktop-window-shell__resize-handle--south-east {
  width: var(--window-resize-corner-size);
  height: var(--window-resize-corner-size);
}

.desktop-window-shell__resize-handle--north-west {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}

.desktop-window-shell__resize-handle--north-east {
  top: 0;
  right: 0;
  cursor: nesw-resize;
}

.desktop-window-shell__resize-handle--south-west {
  left: 0;
  bottom: 0;
  cursor: nesw-resize;
}

.desktop-window-shell__resize-handle--south-east {
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
}

@media (max-width: 920px) {
  .desktop-window-shell__frame {
    padding: 6px;
    gap: 6px;
  }

  .desktop-window-shell__titlebar {
    min-height: 38px;
    border-radius: 12px;
    gap: 8px;
    padding: 0 10px;
  }

  .desktop-window-shell__eyebrow {
    display: none;
  }

  .desktop-window-shell__status {
    display: none;
  }
}

@media (max-width: 720px) {
  .desktop-window-shell__frame {
    padding: 4px;
    gap: 4px;
  }

  .desktop-window-shell__titlebar {
    min-height: 32px;
    border-radius: 10px;
  }

  .desktop-window-shell__control {
    width: 11px;
    height: 11px;
  }

  .desktop-window-shell__title {
    font-size: 0.78rem;
  }
}
</style>
