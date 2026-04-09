<template>
  <div class="player-detail">
    <div class="player-detail__backdrop" :style="backdropStyle"></div>
    <div class="player-detail__overlay"></div>

    <div class="player-detail__shell">
      <header
        class="detail-topbar"
        @mousedown="handleTopbarDragStart"
      >
        <button
          class="back-btn"
          data-window-no-drag
          @mousedown.stop
          @click="goBack"
          title="返回"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>

        <div class="detail-topbar__copy">
          <p class="detail-topbar__eyebrow">正在播放</p>
          <p class="detail-topbar__hint">{{ topbarHint }}</p>
        </div>

        <div class="detail-topbar__status">
          <span class="detail-chip">{{ currentSourceSummary }}</span>
          <span v-if="player.resolvedQuality" class="detail-chip detail-chip--accent">
            {{ formatQualityLabel(player.resolvedQuality) }}
          </span>
        </div>
      </header>

      <section class="detail-stage">
        <aside class="detail-rail">
          <div class="cover-card">
            <img
              v-if="player.currentMusic"
              :src="player.currentMusic.cover || defaultCover"
              :alt="player.currentMusic.name"
              class="album-art"
              @error="handleCoverError"
            />
            <div v-else class="album-art album-art--placeholder">
              <span>未播放</span>
            </div>

            <div class="cover-card__glow"></div>
          </div>

          <div class="track-copy">
            <p class="track-copy__eyebrow">{{ currentSourceSummary }}</p>
            <h1 class="track-copy__title">{{ player.currentMusic?.name || '未播放' }}</h1>
            <p class="track-copy__subtitle">{{ currentSubtitle }}</p>
          </div>

          <div v-if="playbackInfoRows.length" class="detail-facts">
            <div
              v-for="item in playbackInfoRows"
              :key="item.label"
              class="detail-facts__row"
            >
              <span class="detail-facts__label">{{ item.label }}</span>
              <span class="detail-facts__value">{{ item.value }}</span>
            </div>
          </div>
        </aside>

        <section class="lyrics-stage glass-panel">
          <div class="section-head section-head--lyrics">
            <div>
              <p class="section-head__eyebrow">歌词</p>
              <h2>当前歌词</h2>
            </div>
            <p class="section-head__note">{{ lyricsHeaderText }}</p>
          </div>

          <div ref="lyricsScrollerRef" class="lyrics-scroller">
            <div v-if="settingsStore.settings.lyricShow && player.hasLyrics" class="lyrics-lines">
              <div
                v-for="(line, index) in lyricRows"
                :key="`${line.time_ms}-${index}`"
                :ref="(el) => setLyricLineRef(el, index)"
                class="lyric-line"
                :class="{ active: index === player.currentLyricIndex }"
                :style="{ '--detail-lyric-font-size': `${settingsStore.settings.lyricFontSize}px` }"
              >
                <p class="lyric-line__text">{{ line.text || '...' }}</p>
                <p
                  v-if="settingsStore.settings.showTranslation && line.translation"
                  class="lyric-line__translation"
                >
                  {{ line.translation }}
                </p>
              </div>
            </div>
            <div v-else class="lyrics-empty">
              <p>{{ settingsStore.settings.lyricShow ? '当前歌曲暂无歌词' : '歌词显示已关闭' }}</p>
              <span>{{ settingsStore.settings.lyricShow ? '切换歌曲后会自动更新' : '可在设置中重新开启歌词显示' }}</span>
            </div>
          </div>
        </section>

        <aside class="queue-stage glass-panel">
          <div class="section-head">
            <div>
              <p class="section-head__eyebrow">队列</p>
              <h2>接下来播放</h2>
            </div>
            <div class="section-head__actions">
              <p class="section-head__note">{{ player.playlist.length }} 首歌曲</p>
              <button
                v-if="player.playlist.length > 1"
                type="button"
                class="queue-clear-btn"
                @click="player.clearQueue()"
              >
                清空队列
              </button>
            </div>
          </div>

          <div v-if="player.playlist.length" class="queue-list">
            <button
              v-for="(track, index) in player.playlist"
              :key="track.id"
              type="button"
              class="queue-item"
              :class="{ active: index === player.currentIndex }"
              @click="playTrack(index)"
            >
              <img
                class="queue-item__cover"
                :src="track.cover || defaultCover"
                :alt="track.name"
                @error="handleCoverError"
              />
              <div class="queue-item__info">
                <span class="queue-item__title">{{ track.name }}</span>
                <span class="queue-item__artist">{{ track.artist }}</span>
              </div>
              <span class="queue-item__duration">{{ formatTime(track.duration) }}</span>
            </button>
          </div>
          <div v-else class="queue-empty">
            <p>播放队列为空</p>
          </div>
        </aside>
      </section>

      <section class="controls-strip glass-panel">
        <div class="progress-container">
          <span class="time-label">{{ formatTime(player.currentTime) }}</span>
          <div
            ref="progressBarRef"
            class="progress-bar-large"
            @click="handleSeek"
            @mousedown="startDrag"
            @mouseup="stopDrag"
            @mouseleave="stopDrag"
            @mousemove="handleDragSeek"
          >
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
              <div class="progress-thumb" :style="{ left: `${progressPercent}%` }"></div>
            </div>
          </div>
          <span class="time-label">{{ formatTime(player.duration) }}</span>
        </div>

        <div class="controls-strip__body">
          <div class="controls-strip__track">
            <img
              v-if="player.currentMusic"
              :src="player.currentMusic.cover || defaultCover"
              :alt="player.currentMusic.name"
              class="controls-strip__cover"
              @error="handleCoverError"
            />
            <div v-else class="controls-strip__cover controls-strip__cover--placeholder"></div>

            <div class="controls-strip__copy">
              <strong>{{ player.currentMusic?.name || '未播放' }}</strong>
              <span>{{ player.currentMusic?.artist || '选择一首歌曲开始播放' }}</span>
            </div>
          </div>

          <div class="control-buttons">
            <button
              class="control-btn-large"
              data-window-no-drag
              @click="togglePlayMode"
              :title="playModeTitle"
            >
              <span class="mode-icon">{{ playModeIcon }}</span>
            </button>

            <button class="control-btn-large" data-window-no-drag @click="player.playPrevious" title="上一首">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button
              class="play-btn-large"
              data-window-no-drag
              @click="togglePlay"
              :title="player.isPlaying ? '暂停' : '播放'"
            >
              <svg v-if="player.isPlaying" width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              <svg v-else width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <button class="control-btn-large" data-window-no-drag @click="player.playNext" title="下一首">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="controls-strip__tools">
            <button class="control-btn-large" data-window-no-drag @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path v-if="isMuted || volumeValue === 0" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                <path v-else d="M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </button>

            <input
              v-model.number="volumeValue"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="volume-slider-large"
              data-window-no-drag
              @mousedown.stop
              @input="handleVolumeChange"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../store/player'
import { useSettingsStore } from '../store/settings'
import { useUserSourceStore } from '../stores/userSource'
import type { PlayMode } from '../types/player'
import { getPlaybackSourceDisplayInfo } from '../lib/playbackSource'
import { formatQualityLabel } from '../lib/trackQuality'

const router = useRouter()
const player = usePlayerStore()
const settingsStore = useSettingsStore()
const userSourceStore = useUserSourceStore()
const isTauriWindow = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const appWindow = isTauriWindow ? getCurrentWindow() : null

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23111b2e" width="200" height="200"/%3E%3Ccircle cx="100" cy="100" r="54" fill="%23ffffff" fill-opacity="0.08"/%3E%3C/svg%3E'
const isDragging = ref(false)
const volumeValue = ref(player.volume)
const isMuted = ref(player.volume === 0)
const previousVolume = ref(player.volume || 1)
const progressBarRef = ref<HTMLElement | null>(null)
const lyricsScrollerRef = ref<HTMLElement | null>(null)
const lyricLineRefs = ref<HTMLElement[]>([])

const lyricRows = computed(() => player.lyrics)
const progressPercent = computed(() => {
  if (!player.duration) return 0
  return Math.max(0, Math.min(100, (player.currentTime / player.duration) * 100))
})

const playbackSourceInfo = computed(() => getPlaybackSourceDisplayInfo({
  currentMusic: player.currentMusic,
  resolvedChannel: player.resolvedChannel,
  resolvedResolver: player.resolvedResolver,
  resolvedUserSourceId: player.resolvedUserSourceId,
  userSources: userSourceStore.userSources,
}))

const playbackInfoRows = computed(() => {
  const rows: Array<{ label: string; value: string }> = []
  if (playbackSourceInfo.value.primaryLabel) rows.push({ label: '当前音源', value: playbackSourceInfo.value.primaryLabel })
  if (playbackSourceInfo.value.userSourceLabel) rows.push({ label: '自定义音源', value: playbackSourceInfo.value.userSourceLabel })
  if (playbackSourceInfo.value.channelLabel) rows.push({ label: '播放渠道', value: playbackSourceInfo.value.channelLabel })
  if (playbackSourceInfo.value.resolverLabel) rows.push({ label: '解析方式', value: playbackSourceInfo.value.resolverLabel })
  if (player.resolvedQuality) rows.push({ label: '实际音质', value: formatQualityLabel(player.resolvedQuality) })
  return rows
})

const currentSubtitle = computed(() => {
  if (!player.currentMusic) return '选择一首歌曲开始播放'
  const artist = player.currentMusic.artist || '未知歌手'
  const album = player.currentMusic.album || '未知专辑'
  return `${artist} · ${album}`
})

const currentSourceSummary = computed(() => playbackSourceInfo.value.compactLabel || '播放详情')
const lyricsHeaderText = computed(() => player.hasLyrics ? '跟随当前播放位置自动聚焦' : '当前歌曲暂无歌词')
const topbarHint = computed(() => `${player.isPlaying ? '正在播放' : '已暂停'} · Esc 返回 · 空格播放`)

const backdropStyle = computed(() => {
  const cover = player.currentMusic?.cover
  if (!cover) return {}
  return { backgroundImage: `url("${cover}")` }
})

const playModeIcon = computed(() => {
  switch (player.playMode) {
    case 'loop':
      return '🔁'
    case 'single':
      return '🔂'
    case 'random':
      return '🔀'
    default:
      return '🔁'
  }
})

const playModeTitle = computed(() => {
  switch (player.playMode) {
    case 'loop':
      return '列表循环'
    case 'single':
      return '单曲循环'
    case 'random':
      return '随机播放'
    default:
      return '列表循环'
  }
})

watch(() => player.volume, (value) => {
  volumeValue.value = value
  isMuted.value = value === 0
  if (value > 0) previousVolume.value = value
}, { immediate: true })

watch(lyricRows, () => {
  lyricLineRefs.value = []
})

watch(() => player.currentLyricIndex, () => {
  scrollActiveLyricIntoView()
}, { flush: 'post' })

watch(() => player.currentMusic?.id, async () => {
  lyricLineRefs.value = []
  await nextTick()
  scrollActiveLyricIntoView(false)
}, { flush: 'post' })

function goBack() {
  router.back()
}

function isTopbarInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement
    && Boolean(target.closest('button, input, select, textarea, a, [data-window-no-drag]'))
  )
}

async function handleTopbarDragStart(event: MouseEvent) {
  if (!appWindow || event.button !== 0 || isTopbarInteractiveTarget(event.target)) {
    return
  }

  try {
    await appWindow.startDragging()
  } catch (error) {
    console.error('Failed to start window dragging from player detail:', error)
  }
}

function togglePlay() {
  if (player.isPlaying) player.pauseMusic()
  else player.resumeMusic()
}

function toggleMute() {
  if (volumeValue.value > 0) {
    previousVolume.value = volumeValue.value
    volumeValue.value = 0
    player.setVolume(0)
    isMuted.value = true
    return
  }

  volumeValue.value = previousVolume.value || 1
  player.setVolume(volumeValue.value)
  isMuted.value = volumeValue.value === 0
}

function togglePlayMode() {
  const modes: PlayMode[] = ['loop', 'single', 'random']
  const currentIndex = modes.indexOf(player.playMode)
  player.setPlayMode(modes[(currentIndex + 1) % modes.length] ?? 'loop')
}

function playTrack(index: number) {
  if (!player.playlist[index]) return
  player.setPlaylist([...player.playlist], index)
}

function handleSeek(event: MouseEvent) {
  const progressBar = progressBarRef.value ?? (event.currentTarget as HTMLElement | null)
  if (!progressBar || !player.duration) return
  const rect = progressBar.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  player.setProgress(percent * player.duration)
}

function startDrag() {
  isDragging.value = true
}

function stopDrag() {
  isDragging.value = false
}

function handleDragSeek(event: MouseEvent) {
  if (!isDragging.value) return
  handleSeek(event)
}

function handleVolumeChange() {
  player.setVolume(volumeValue.value)
  isMuted.value = volumeValue.value === 0
}

function handleCoverError(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = defaultCover
}

function setLyricLineRef(element: unknown, index: number) {
  const target = element instanceof HTMLElement
    ? element
    : (typeof element === 'object' && element !== null && '$el' in element && element.$el instanceof HTMLElement
        ? element.$el
        : null)

  if (!target) return
  lyricLineRefs.value[index] = target
}

function scrollActiveLyricIntoView(smooth = true) {
  const container = lyricsScrollerRef.value
  const activeLine = lyricLineRefs.value[player.currentLyricIndex]
  if (!container || !activeLine) return

  const containerRect = container.getBoundingClientRect()
  const activeRect = activeLine.getBoundingClientRect()
  const activeTop = activeRect.top - containerRect.top + container.scrollTop
  const targetTop = activeTop - container.clientHeight * 0.5 + activeRect.height * 0.5

  container.scrollTo({
    top: Math.max(0, targetTop),
    behavior: smooth ? 'smooth' : 'auto',
  })
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  switch (event.code) {
    case 'Escape':
      event.preventDefault()
      goBack()
      break
    case 'Space':
      event.preventDefault()
      togglePlay()
      break
    case 'ArrowLeft':
      event.preventDefault()
      player.setProgress(Math.max(0, player.currentTime - 5))
      break
    case 'ArrowRight':
      event.preventDefault()
      player.setProgress(Math.min(player.duration, player.currentTime + 5))
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyboardShortcuts)
  nextTick(() => {
    scrollActiveLyricIntoView(false)
  })
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})
</script>

<style scoped lang="scss">
.player-detail {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--text-primary);
  background: transparent;
  border-radius: calc(var(--radius-lg) + 6px);
  isolation: isolate;
}

.player-detail__backdrop,
.player-detail__overlay {
  position: absolute;
  inset: 0;
}

.player-detail__backdrop {
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary-hover) 18%, transparent), transparent 28%),
    radial-gradient(circle at bottom right, color-mix(in srgb, var(--primary-color) 14%, transparent), transparent 24%);
  background-size: cover;
  background-position: center;
  filter: blur(28px) saturate(1.06);
  transform: scale(1.08);
  opacity: 0.22;
}

.player-detail__overlay {
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 72%, transparent) 0%, color-mix(in srgb, var(--bg-elevated) 88%, transparent) 100%),
    linear-gradient(135deg, color-mix(in srgb, var(--bg-secondary) 90%, transparent) 0%, color-mix(in srgb, var(--bg-primary) 84%, transparent) 100%);
}

.player-detail__shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 18px;
  height: 100%;
  min-height: 0;
  padding: 16px 18px 18px;
}

.glass-panel {
  border: 1px solid var(--border-color);
  background: var(--panel-gradient);
  box-shadow: var(--panel-shadow-soft);
  backdrop-filter: var(--glass-blur);
}

.detail-topbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 10px 14px;
  border-radius: 22px;
  border: 1px solid var(--border-color);
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--primary-color) 10%, transparent), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.back-btn {
  width: 46px;
  height: 46px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(255, 255, 255, 0.18);
    transform: translateX(-2px);
  }
}

.detail-topbar__copy {
  min-width: 0;
}

.detail-topbar__eyebrow,
.section-head__eyebrow,
.track-copy__eyebrow {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.detail-topbar__hint {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.detail-topbar__status {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.detail-chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--pill-secondary-bg);
  color: var(--text-primary);
  font-size: 0.82rem;
  border: 1px solid var(--pill-secondary-border);
  box-shadow: 0 10px 22px rgba(10, 6, 26, 0.12);
}

.detail-chip--accent {
  background: var(--pill-accent-bg);
  border-color: var(--pill-accent-border);
  color: var(--text-primary);
}

.detail-stage {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr) minmax(280px, 340px);
  gap: 18px;
}

.detail-rail {
  min-height: 0;
  overflow: hidden;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto auto;
  gap: 14px;
}

.cover-card {
  position: relative;
  padding: 12px;
  border-radius: 26px;
  background: var(--panel-gradient);
  border: 1px solid var(--border-color);
  overflow: hidden;
  box-shadow: var(--panel-shadow-soft);
  min-height: 0;
}

.cover-card__glow {
  position: absolute;
  right: -18%;
  bottom: -18%;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary-color) 22%, transparent), transparent 70%);
  pointer-events: none;
}

.album-art {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: var(--shadow-lg);
}

.album-art--placeholder {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
  letter-spacing: 0.08em;
}

.track-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 2px 4px;
  min-width: 0;
}

.track-copy__title {
  margin: 0;
  font-size: clamp(1.4rem, 2.5vw, 2.2rem);
  line-height: 1.1;
  letter-spacing: -0.04em;
  word-break: break-word;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.track-copy__subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
}

.detail-facts {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
}

.detail-facts__row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.detail-facts__label {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-size: 0.74rem;
  min-width: 64px;
}

.detail-facts__value {
  color: var(--text-primary);
  font-size: 0.8rem;
  line-height: 1.35;
  word-break: break-word;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lyrics-stage,
.queue-stage,
.controls-strip {
  min-width: 0;
}

.lyrics-stage,
.queue-stage {
  min-height: 0;
  border-radius: 30px;
  padding: 24px 24px 20px;
  display: flex;
  flex-direction: column;
}

.section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;

  h2 {
    margin: 8px 0 0;
    font-size: 1.28rem;
    line-height: 1.1;
  }
}

.section-head__note {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.85rem;
  text-align: right;
}

.section-head__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.queue-clear-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;

  &:hover {
    background: rgba(255, 107, 129, 0.14);
    border-color: rgba(255, 107, 129, 0.28);
    color: #ffc5cf;
  }
}

.section-head--lyrics h2 {
  font-size: 1.4rem;
}

.lyrics-scroller,
.queue-list {
  min-height: 0;
  overflow: auto;
}

.lyrics-scroller {
  position: relative;
  flex: 1;
  padding: 24px 12px 48px 0;
  mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%);
}

.lyrics-lines {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.lyric-line {
  max-width: 88%;
  color: color-mix(in srgb, var(--text-secondary) 44%, transparent);
  transition: color 0.22s ease, transform 0.22s ease, opacity 0.22s ease;
  opacity: 0.74;
}

.lyric-line.active {
  color: var(--text-primary);
  opacity: 1;
  transform: translateX(12px);
}

.lyric-line__text,
.lyric-line__translation {
  margin: 0;
}

.lyric-line__text {
  font-size: var(--detail-lyric-font-size, clamp(1.28rem, 2.2vw, 2.3rem));
  line-height: 1.34;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.lyric-line__translation {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: calc(var(--detail-lyric-font-size, 1.28rem) - 4px);
  line-height: 1.5;
}

.lyrics-empty,
.queue-empty {
  flex: 1;
  display: grid;
  place-items: center;
  text-align: center;
  color: var(--text-secondary);
  min-height: 180px;
}

.lyrics-empty span {
  display: block;
  margin-top: 8px;
  font-size: 0.88rem;
}

.queue-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 2px;
}

.queue-item {
  width: 100%;
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.035);
  color: inherit;
  text-align: left;
  transition: background 0.18s ease, transform 0.18s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    transform: translateX(2px);
  }
}

.queue-item.active {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--primary-color) 16%, transparent),
    color-mix(in srgb, var(--primary-hover) 12%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--primary-color) 18%, var(--border-color));
}

.queue-item__cover {
  width: 54px;
  height: 54px;
  object-fit: cover;
  border-radius: 14px;
}

.queue-item__info {
  min-width: 0;
}

.queue-item__title,
.queue-item__artist {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-item__title {
  color: var(--text-primary);
  font-size: 0.95rem;
}

.queue-item__artist,
.queue-item__duration {
  color: var(--text-tertiary);
  font-size: 0.82rem;
}

.controls-strip {
  border-radius: 28px;
  padding: 16px 20px 18px;
}

.progress-container {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
}

.time-label {
  color: var(--text-tertiary);
  font-size: 0.82rem;
}

.progress-bar-large {
  padding: 12px 0;
  cursor: pointer;
}

.progress-track {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
}

.progress-thumb {
  position: absolute;
  top: 50%;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--primary-color) 22%, transparent);
  transform: translate(-50%, -50%);
}

.controls-strip__body {
  display: grid;
  grid-template-columns: minmax(0, 260px) auto minmax(0, 220px);
  align-items: center;
  gap: 18px;
  margin-top: 12px;
}

.controls-strip__track {
  display: grid;
  grid-template-columns: 54px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.controls-strip__cover {
  width: 54px;
  height: 54px;
  object-fit: cover;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
}

.controls-strip__cover--placeholder {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

.controls-strip__copy {
  min-width: 0;

  strong,
  span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.96rem;
  }

  span {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.84rem;
  }
}

.control-buttons,
.controls-strip__tools {
  display: flex;
  align-items: center;
}

.control-buttons {
  justify-content: center;
  gap: 12px;
}

.controls-strip__tools {
  justify-content: flex-end;
  gap: 12px;
}

.control-btn-large,
.play-btn-large {
  border: 0;
  color: var(--text-primary);
  transition: transform 0.16s ease, background 0.16s ease;

  &:hover {
    transform: translateY(-1px);
  }
}

.control-btn-large {
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--button-secondary-bg);
  border: 1px solid var(--button-secondary-border);
  box-shadow: 0 12px 26px rgba(10, 6, 26, 0.14);

  &:hover {
    background: var(--pill-accent-bg);
    border-color: var(--pill-accent-border);
  }
}

.play-btn-large {
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
  box-shadow: 0 18px 36px color-mix(in srgb, var(--primary-color) 28%, transparent);
}

.mode-icon {
  font-size: 1.05rem;
}

.volume-slider-large {
  width: 128px;
  accent-color: var(--primary-color);
}

@media (max-width: 1320px) {
  .detail-stage {
    grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  }

  .queue-stage {
    grid-column: 1 / -1;
  }
}

@media (max-width: 920px) {
  .player-detail__shell {
    gap: 14px;
    padding: 12px;
  }

  .detail-topbar {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .detail-topbar__status {
    grid-column: 1 / -1;
    justify-content: flex-start;
  }

  .detail-stage {
    grid-template-columns: minmax(0, 1fr);
  }

  .detail-rail,
  .lyrics-stage,
  .queue-stage {
    min-height: 0;
  }

  .controls-strip__body {
    grid-template-columns: minmax(0, 1fr);
    justify-items: stretch;
  }

  .controls-strip__track,
  .controls-strip__tools {
    justify-content: flex-start;
  }
}

</style>
