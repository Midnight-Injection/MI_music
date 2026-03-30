<template>
  <motion.div
    class="player-bar glass-panel"
    :initial="{ opacity: 0, y: 40 }"
    :animate="{ opacity: 1, y: 0, transition: { duration: 0.35 } }"
  >
    <div class="player-bar__main" @click="goToDetail">
      <img
        v-if="player.currentMusic"
        :src="player.currentMusic.cover || defaultCover"
        :alt="player.currentMusic.name"
        class="player-bar__cover"
        @error="handleCoverError"
      />
      <div v-else class="player-bar__cover player-bar__cover--placeholder"></div>

      <div class="player-bar__track">
        <div class="player-bar__title-row">
          <strong>{{ player.currentMusic?.name || '未播放' }}</strong>
          <span v-if="currentQualityLabel" class="player-bar__quality">{{ currentQualityLabel }}</span>
        </div>
        <span>{{ player.currentMusic?.artist || '选择一首歌开始试听' }}</span>
        <span v-if="currentSourceLabel" class="player-bar__source">{{ currentSourceLabel }}</span>
        <span v-if="player.playbackNotice" class="player-bar__notice">{{ player.playbackNotice }}</span>
      </div>
    </div>

    <div class="player-bar__center">
      <div class="player-bar__controls">
        <button class="player-bar__btn" :title="playModeTitle" @click="togglePlayMode">
          {{ playModeIcon }}
        </button>
        <button class="player-bar__btn" title="上一首" @click="player.playPrevious">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" /></svg>
        </button>
        <button class="player-bar__play" :title="player.isPlaying ? '暂停' : '播放'" @click="togglePlay">
          <svg v-if="player.isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </button>
        <button class="player-bar__btn" title="下一首" @click="player.playNext">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" /></svg>
        </button>
      </div>

      <div class="player-bar__timeline">
        <span>{{ formatTime(player.currentTime) }}</span>
        <div
          ref="progressBarRef"
          class="player-bar__progress"
          @click="handleSeek"
          @mousedown="startDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
          @mousemove="handleDragSeek"
        >
          <div class="player-bar__progress-track">
            <div class="player-bar__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
            <div class="player-bar__progress-thumb" :style="{ left: `${progressPercent}%` }"></div>
          </div>
        </div>
        <span>{{ formatTime(player.duration) }}</span>
      </div>
    </div>

    <div class="player-bar__side">
      <button class="player-bar__text-btn" @click="cyclePlaybackRate">{{ player.playbackRate }}x</button>
      <button class="player-bar__text-btn" @click="toggleMute">{{ isMuted ? '取消静音' : '静音' }}</button>
      <input v-model.number="volumeValue" type="range" min="0" max="1" step="0.01" @input="handleVolumeChange" />
    </div>
  </motion.div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'
import { useUserSourceStore } from '../../stores/userSource'
import type { PlayMode } from '../../types/player'
import { getPlaybackSourceDisplayInfo } from '../../lib/playbackSource'
import { formatQualityLabel, getTrackDisplayQuality } from '../../lib/trackQuality'

const router = useRouter()
const player = usePlayerStore()
const userSourceStore = useUserSourceStore()

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="120" height="120"%3E%3Crect fill="%236a53ad" width="120" height="120"/%3E%3Ccircle cx="60" cy="60" r="30" fill="%23ffffff" fill-opacity="0.22"/%3E%3C/svg%3E'
const isDragging = ref(false)
const volumeValue = ref(player.volume)
const isMuted = ref(false)
const previousVolume = ref(1)
const progressBarRef = ref<HTMLElement | null>(null)

const progressPercent = computed(() => {
  if (!player.duration) return 0
  return Math.max(0, Math.min(100, (player.currentTime / player.duration) * 100))
})

const currentQualityLabel = computed(() => {
  return formatQualityLabel(player.resolvedQuality || getTrackDisplayQuality(player.currentMusic))
})

const currentSourceLabel = computed(() => {
  return getPlaybackSourceDisplayInfo({
    currentMusic: player.currentMusic,
    resolvedChannel: player.resolvedChannel,
    resolvedResolver: player.resolvedResolver,
    resolvedUserSourceId: player.resolvedUserSourceId,
    userSources: userSourceStore.userSources,
  }).compactLabel
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

watch(
  () => player.volume,
  (nextValue) => {
    volumeValue.value = nextValue
    isMuted.value = nextValue === 0
  },
  { immediate: true },
)

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

  volumeValue.value = previousVolume.value
  player.setVolume(previousVolume.value)
  isMuted.value = false
}

function togglePlayMode() {
  const modes: PlayMode[] = ['loop', 'single', 'random']
  const currentIndex = modes.indexOf(player.playMode)
  const nextIndex = (currentIndex + 1) % modes.length
  player.setPlayMode(modes[nextIndex])
}

function cyclePlaybackRate() {
  const rates = [0.75, 1, 1.25, 1.5, 1.75, 2]
  const currentIndex = rates.indexOf(player.playbackRate)
  const nextIndex = (currentIndex + 1) % rates.length
  player.setPlaybackRate(rates[nextIndex] ?? 1)
}

function goToDetail() {
  if (player.currentMusic) router.push('/player')
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

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return

  switch (event.code) {
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
    case 'KeyM':
      event.preventDefault()
      toggleMute()
      break
    case 'KeyN':
      event.preventDefault()
      player.playNext()
      break
    case 'KeyB':
      event.preventDefault()
      player.playPrevious()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyboardShortcuts)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyboardShortcuts)
})
</script>

<style scoped lang="scss">
.player-bar {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.35fr) auto;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-width: 0;
  min-height: 64px;
  padding: 10px 14px;
  border-radius: 14px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.1), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow:
    0 6px 14px rgba(9, 5, 22, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.player-bar__main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  cursor: pointer;
}

.player-bar__cover {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 10px rgba(9, 5, 22, 0.08);
}

.player-bar__cover--placeholder {
  background: linear-gradient(135deg, rgba(247, 232, 255, 0.34), rgba(196, 171, 245, 0.26));
}

.player-bar__track {
  min-width: 0;

  .player-bar__title-row {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  strong,
  > span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 0.86rem;
  }

  > span {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 0.68rem;
  }
}

.player-bar__source {
  color: var(--text-tertiary);
  font-size: 0.68rem;
}

.player-bar__notice {
  color: var(--danger-color, #ff8d8d) !important;
  font-size: 0.69rem !important;
  font-weight: 700;
}

.player-bar__quality {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.player-bar__center {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.player-bar__controls,
.player-bar__side {
  display: flex;
  align-items: center;
  gap: 6px;
}

.player-bar__btn,
.player-bar__text-btn,
.player-bar__play {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: var(--text-primary);
}

.player-bar__btn {
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  background: rgba(255, 255, 255, 0.08);

  svg {
    width: 15px;
    height: 15px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

.player-bar__play {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #f3d7ff, #d8bfff);
  color: white;
  color: #5a4096;
  box-shadow: 0 8px 18px rgba(96, 69, 167, 0.14);

  svg {
    width: 17px;
    height: 17px;
  }
}

.player-bar__timeline {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--text-secondary);
  font-size: 0.66rem;
}

.player-bar__progress {
  width: 100%;
  cursor: pointer;
}

.player-bar__progress-track {
  position: relative;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
}

.player-bar__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f4d8ff, #c0efff);
}

.player-bar__progress-thumb {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
  transform: translate(-50%, -50%);
}

.player-bar__side {
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;

  input {
    width: 80px;
    accent-color: var(--primary-color);
  }
}

.player-bar__text-btn {
  min-width: 48px;
  height: 30px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.68rem;
  font-weight: 700;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }
}

</style>
