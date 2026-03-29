<template>
  <div class="player-detail">
    <div class="player-detail__backdrop" :style="backdropStyle"></div>
    <div class="player-detail__overlay"></div>

    <div class="player-detail__shell">
      <header class="detail-topbar">
        <button class="back-btn" @click="goBack" title="返回">
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
            <div v-if="player.hasLyrics" class="lyrics-lines">
              <div
                v-for="(line, index) in lyricRows"
                :key="`${line.time_ms}-${index}`"
                :ref="(el) => setLyricLineRef(el, index)"
                class="lyric-line"
                :class="{ active: index === player.currentLyricIndex }"
              >
                <p class="lyric-line__text">{{ line.text || '...' }}</p>
                <p v-if="line.translation" class="lyric-line__translation">{{ line.translation }}</p>
              </div>
            </div>
            <div v-else class="lyrics-empty">
              <p>当前歌曲暂无歌词</p>
              <span>切换歌曲后会自动更新</span>
            </div>
          </div>
        </section>

        <aside class="queue-stage glass-panel">
          <div class="section-head">
            <div>
              <p class="section-head__eyebrow">队列</p>
              <h2>接下来播放</h2>
            </div>
            <p class="section-head__note">{{ player.playlist.length }} 首歌曲</p>
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
              @click="togglePlayMode"
              :title="playModeTitle"
            >
              <span class="mode-icon">{{ playModeIcon }}</span>
            </button>

            <button class="control-btn-large" @click="player.playPrevious" title="上一首">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <button
              class="play-btn-large"
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

            <button class="control-btn-large" @click="player.playNext" title="下一首">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="controls-strip__tools">
            <button class="control-btn-large" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
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
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../store/player'
import { useUserSourceStore } from '../stores/userSource'
import type { PlayMode } from '../types/player'
import { getPlaybackSourceDisplayInfo } from '../lib/playbackSource'
import { formatQualityLabel } from '../lib/trackQuality'

const router = useRouter()
const player = usePlayerStore()
const userSourceStore = useUserSourceStore()

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
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: var(--sidebar-width);
  overflow: hidden;
  color: #fff7ff;
  background: transparent;
}

.player-detail__backdrop,
.player-detail__overlay {
  position: absolute;
  inset: 0;
}

.player-detail__backdrop {
  background:
    radial-gradient(circle at top left, rgba(124, 82, 255, 0.18), transparent 28%),
    radial-gradient(circle at bottom right, rgba(255, 79, 139, 0.14), transparent 24%);
  background-size: cover;
  background-position: center;
  filter: blur(34px) saturate(1.2);
  transform: scale(1.08);
  opacity: 0.26;
}

.player-detail__overlay {
  background:
    linear-gradient(180deg, rgba(19, 8, 34, 0.52) 0%, rgba(19, 8, 34, 0.76) 100%),
    linear-gradient(135deg, rgba(31, 14, 52, 0.88) 0%, rgba(22, 10, 37, 0.82) 100%);
}

.player-detail__shell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 18px;
  height: 100%;
  padding: 24px 28px 22px;
}

.glass-panel {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.06), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  box-shadow: 0 8px 18px rgba(4, 2, 14, 0.1);
  backdrop-filter: blur(18px);
}

.detail-topbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
}

.back-btn {
  width: 46px;
  height: 46px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
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
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.detail-topbar__hint {
  margin: 6px 0 0;
  color: rgba(255, 255, 255, 0.78);
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
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.82rem;
}

.detail-chip--accent {
  background: rgba(255, 79, 139, 0.16);
  color: #ffd7e4;
}

.detail-stage {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr) minmax(280px, 340px);
  gap: 18px;
}

.detail-rail {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.cover-card {
  position: relative;
  padding: 16px;
  border-radius: 30px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.cover-card__glow {
  position: absolute;
  right: -18%;
  bottom: -18%;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 79, 139, 0.2), transparent 70%);
  pointer-events: none;
}

.album-art {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.34);
}

.album-art--placeholder {
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1rem;
  letter-spacing: 0.08em;
}

.track-copy {
  padding: 2px 4px;
}

.track-copy__title {
  margin: 12px 0 0;
  font-size: clamp(2.4rem, 4vw, 4.4rem);
  line-height: 0.94;
  letter-spacing: -0.04em;
  word-break: break-word;
}

.track-copy__subtitle {
  margin: 14px 0 0;
  color: rgba(255, 255, 255, 0.68);
  font-size: 1rem;
  line-height: 1.6;
}

.detail-facts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.detail-facts__row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.detail-facts__label {
  color: rgba(255, 255, 255, 0.48);
  font-size: 0.82rem;
}

.detail-facts__value {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.94rem;
  line-height: 1.45;
  word-break: break-word;
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
  color: rgba(255, 255, 255, 0.54);
  font-size: 0.85rem;
  text-align: right;
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
  color: rgba(255, 255, 255, 0.32);
  transition: color 0.22s ease, transform 0.22s ease, opacity 0.22s ease;
  opacity: 0.74;
}

.lyric-line.active {
  color: #f8fafc;
  opacity: 1;
  transform: translateX(12px);
}

.lyric-line__text,
.lyric-line__translation {
  margin: 0;
}

.lyric-line__text {
  font-size: clamp(1.28rem, 2.2vw, 2.3rem);
  line-height: 1.34;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.lyric-line__translation {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.96rem;
  line-height: 1.5;
}

.lyrics-empty,
.queue-empty {
  flex: 1;
  display: grid;
  place-items: center;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
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
  background: linear-gradient(135deg, rgba(255, 79, 139, 0.16), rgba(124, 82, 255, 0.14));
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
  color: #fff;
  font-size: 0.95rem;
}

.queue-item__artist,
.queue-item__duration {
  color: rgba(255, 255, 255, 0.54);
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
  color: rgba(255, 255, 255, 0.54);
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
  background: #fff;
  box-shadow: 0 6px 18px rgba(255, 255, 255, 0.3);
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
    color: rgba(255, 255, 255, 0.56);
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
  color: #fff;
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
  background: rgba(255, 255, 255, 0.08);
}

.play-btn-large {
  width: 64px;
  height: 64px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--primary-color), #ff7ca7);
  box-shadow: 0 18px 36px rgba(255, 79, 139, 0.28);
}

.mode-icon {
  font-size: 1.05rem;
}

.volume-slider-large {
  width: 128px;
  accent-color: var(--primary-color);
}

</style>
