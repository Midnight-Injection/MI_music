<template>
  <div
    class="player-bar"
    :class="{ 'mini-mode': isMiniMode }"
    v-motion
    :initial="{ opacity: 0, y: 100 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 500, ease: 'easeOut' } }"
  >
    <!-- Song Info Section -->
    <div class="song-info" @click="goToDetail">
      <div v-if="player.currentMusic" class="cover-wrapper">
        <img
          :src="player.currentMusic.cover || defaultCover"
          :alt="player.currentMusic.name"
          class="cover"
          @error="handleCoverError"
          loading="lazy"
        />
        <div class="cover-tooltip">
          <img :src="player.currentMusic.cover || defaultCover" alt="" />
        </div>
      </div>
      <div v-else class="cover-wrapper">
        <div class="cover-placeholder">🎵</div>
      </div>

      <div v-if="player.currentMusic" class="track-info">
        <div class="track-name scroll-text" :data-text="player.currentMusic.name">
          {{ player.currentMusic.name }}
        </div>
        <div class="track-artist">{{ player.currentMusic.artist }}</div>
      </div>
      <div v-else class="track-info empty">
        <div class="track-name">未播放</div>
      </div>
    </div>

    <!-- Main Controls Section -->
    <div class="main-controls">
      <!-- Play Mode Toggle -->
      <button
        class="control-btn mode-btn"
        @click="togglePlayMode"
        :title="playModeTitle"
      >
        <span>{{ playModeIcon }}</span>
      </button>

      <!-- Previous Track -->
      <button class="control-btn" @click="player.playPrevious" title="上一首">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>

      <!-- Play/Pause -->
      <button
        class="control-btn play-btn"
        @click="togglePlay"
        :title="player.isPlaying ? '暂停 (Space)' : '播放 (Space)'"
      >
        <svg v-if="player.isPlaying" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>

      <!-- Next Track -->
      <button class="control-btn" @click="player.playNext" title="下一首">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>

      <!-- Playback Rate -->
      <button
        class="control-btn rate-btn"
        @click="cyclePlaybackRate"
        :title="`播放速度: ${player.playbackRate}x`"
      >
        <span class="rate-text">{{ player.playbackRate }}x</span>
      </button>
    </div>

    <!-- Progress Bar Section -->
    <div class="progress-section">
      <span class="time current-time">{{ formatTime(player.currentTime) }}</span>
      <div
        class="progress-bar"
        @click="handleSeek"
        @mousedown="startDrag"
        @mouseup="stopDrag"
        @mouseleave="stopDrag"
        @mousemove="handleDragSeek"
        ref="progressBarRef"
      >
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: progressPercent + '%' }"
          ></div>
          <div
            class="progress-thumb"
            :style="{ left: progressPercent + '%' }"
          ></div>
          <!-- Hover Preview -->
          <div
            v-if="hoverTime !== null"
            class="hover-preview"
            :style="{ left: hoverPercent + '%' }"
          >
            <span class="hover-time">{{ formatTime(hoverTime) }}</span>
          </div>
        </div>
      </div>
      <span class="time duration">{{ formatTime(player.duration) }}</span>
    </div>

    <!-- Extra Controls Section -->
    <div class="extra-controls">
      <!-- Mini/Full Mode Toggle -->
      <button
        class="control-btn"
        @click="toggleMiniMode"
        :title="isMiniMode ? '展开播放器' : '迷你模式'"
      >
        <svg v-if="isMiniMode" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
        </svg>
      </button>

      <!-- Lyrics Toggle -->
      <button
        class="control-btn"
        @click="toggleLyrics"
        :class="{ active: showLyrics }"
        title="歌词 (L)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </button>

      <!-- Playlist Toggle -->
      <button
        class="control-btn"
        @click="togglePlaylist"
        :class="{ active: showPlaylist }"
        title="播放列表 (P)"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z"/>
        </svg>
      </button>

      <!-- Volume Control -->
      <div class="volume-control">
        <button
          class="control-btn"
          @click="toggleMute"
          :title="isMuted ? '取消静音 (M)' : '静音 (M)'"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path v-if="isMuted || volumeValue === 0" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            <path v-else-if="volumeValue < 0.5" d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
            <path v-else d="M3 9v6h4l5 5V4L9 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
        <input
          v-model.number="volumeValue"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="volume-slider"
          @input="handleVolumeChange"
          title="音量"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'
import type { PlayMode } from '../../types/player'

const router = useRouter()
const player = usePlayerStore()

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="48"%3E🎵%3C/text%3E%3C/svg%3E'
const showLyrics = ref(false)
const showPlaylist = ref(false)
const isDragging = ref(false)
const volumeValue = ref(player.volume)
const isMuted = ref(false)
const previousVolume = ref(1)
const isMiniMode = ref(false)
const progressBarRef = ref<HTMLElement | null>(null)
const hoverTime = ref<number | null>(null)
const hoverPercent = ref(0)

const progressPercent = computed(() => {
  if (player.duration === 0) return 0
  return (player.currentTime / player.duration) * 100
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

function togglePlay() {
  if (player.isPlaying) {
    player.pauseMusic()
  } else {
    player.resumeMusic()
  }
}

function toggleMute() {
  if (volumeValue.value > 0) {
    previousVolume.value = volumeValue.value
    volumeValue.value = 0
    player.setVolume(0)
    isMuted.value = true
  } else {
    volumeValue.value = previousVolume.value
    player.setVolume(previousVolume.value)
    isMuted.value = false
  }
}

function togglePlayMode() {
  const modes: PlayMode[] = ['loop', 'single', 'random']
  const currentIndex = modes.indexOf(player.playMode)
  const nextIndex = (currentIndex + 1) % modes.length
  player.setPlayMode(modes[nextIndex])
}

function cyclePlaybackRate() {
  const rates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
  const currentIndex = rates.indexOf(player.playbackRate)
  const nextIndex = (currentIndex + 1) % rates.length
  player.setPlaybackRate(rates[nextIndex])
}

function toggleLyrics() {
  showLyrics.value = !showLyrics.value
}

function togglePlaylist() {
  showPlaylist.value = !showPlaylist.value
}

function toggleMiniMode() {
  isMiniMode.value = !isMiniMode.value
}

function goToDetail() {
  if (player.currentMusic) {
    router.push('/player')
  }
}

function handleSeek(event: MouseEvent) {
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const newTime = percent * player.duration
  player.setProgress(newTime)
}

function startDrag() {
  isDragging.value = true
}

function stopDrag() {
  isDragging.value = false
}

function handleDragSeek(event: MouseEvent) {
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))

  // Update hover preview
  hoverPercent.value = percent * 100
  hoverTime.value = percent * player.duration

  if (isDragging.value) {
    const newTime = percent * player.duration
    player.setProgress(newTime)
  }
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
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  // Ignore if typing in input
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

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
    case 'ArrowUp':
      event.preventDefault()
      const newVolUp = Math.min(1, player.volume + 0.1)
      volumeValue.value = newVolUp
      player.setVolume(newVolUp)
      break
    case 'ArrowDown':
      event.preventDefault()
      const newVolDown = Math.max(0, player.volume - 0.1)
      volumeValue.value = newVolDown
      player.setVolume(newVolDown)
      break
    case 'KeyM':
      event.preventDefault()
      toggleMute()
      break
    case 'KeyL':
      event.preventDefault()
      toggleLyrics()
      break
    case 'KeyP':
      event.preventDefault()
      togglePlaylist()
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
  position: fixed;
  bottom: 0;
  left: 200px;
  right: 0;
  height: 80px;
  background: rgba(24, 24, 24, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 24px;
  z-index: 1000;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    left: 0;
    padding: 0 16px;
    gap: 16px;
  }

  &.mini-mode {
    height: 4px;
    padding: 0;
    gap: 0;

    .song-info,
    .main-controls,
    .extra-controls {
      display: none;
    }

    .progress-section {
      width: 100%;
      gap: 0;

      .time {
        display: none;
      }

      .progress-bar {
        .progress-track {
          background: rgba(255, 255, 255, 0.05);
        }
      }
    }
  }
}

// Song Info Section
.song-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
  flex-shrink: 0;
  cursor: pointer;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }

  .cover-wrapper {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

    .cover {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }

    &:hover .cover {
      transform: scale(1.1);
    }

    .cover-tooltip {
      position: absolute;
      bottom: 70px;
      left: 50%;
      transform: translateX(-50%) scale(0.8);
      width: 200px;
      height: 200px;
      border-radius: 8px;
      overflow: hidden;
      background: rgba(0, 0, 0, 0.9);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      opacity: 0;
      pointer-events: none;
      transition: all 0.2s ease;
      z-index: 1001;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &:hover .cover-tooltip {
      opacity: 1;
      transform: translateX(-50%) scale(1);
    }
  }

  .cover-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    font-size: 24px;
  }

  .track-info {
    flex: 1;
    min-width: 0;
    overflow: hidden;

    .track-name {
      font-size: 14px;
      font-weight: 500;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;

      &.scroll-text {
        display: inline-block;
        animation: scroll 20s linear infinite;
      }
    }

    .track-artist {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.6);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &.empty .track-name {
      color: rgba(255, 255, 255, 0.4);
    }
  }
}

@keyframes scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

// Main Controls
.main-controls {
  display: flex;
  align-items: center;
  gap: 8px;

  .control-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }

    &.play-btn {
      width: 48px;
      height: 48px;
      background: #ffffff;
      color: #000000;

      &:hover {
        background: rgba(255, 255, 255, 0.9);
        transform: scale(1.08);
      }
    }

    &.mode-btn {
      font-size: 18px;
    }

    &.rate-btn {
      width: 48px;
      font-size: 11px;
      font-weight: 600;

      .rate-text {
        color: #1db954;
      }
    }
  }
}

// Progress Section
.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  .time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    font-variant-numeric: tabular-nums;
    min-width: 40px;
    text-align: center;
  }

  .progress-bar {
    flex: 1;
    height: 12px;
    display: flex;
    align-items: center;
    cursor: pointer;
    position: relative;

    .progress-track {
      position: relative;
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      overflow: visible;

      .progress-fill {
        position: absolute;
        left: 0;
        top: 0;
        height: 100%;
        background: linear-gradient(90deg, #1db954, #1ed760);
        border-radius: 2px;
        transition: width 0.1s ease;
        pointer-events: none;
      }

      .progress-thumb {
        position: absolute;
        top: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        background: #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        opacity: 0;
        transition: opacity 0.2s ease, left 0.1s ease;
        pointer-events: none;
      }

      .hover-preview {
        position: absolute;
        bottom: 20px;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 11px;
        pointer-events: none;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;

        .hover-time {
          font-variant-numeric: tabular-nums;
        }
      }
    }

    &:hover .progress-thumb {
      opacity: 1;
    }

    &:hover .progress-track {
      background: rgba(255, 255, 255, 0.15);
    }

    &:hover .hover-preview {
      opacity: 1;
    }
  }
}

// Extra Controls
.extra-controls {
  display: flex;
  align-items: center;
  gap: 8px;

  .control-btn {
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      transform: scale(1.05);
    }

    &.active {
      color: #1db954;
      background: rgba(29, 185, 84, 0.1);

      &:hover {
        background: rgba(29, 185, 84, 0.2);
      }
    }
  }

  .volume-control {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 120px;

    .volume-slider {
      flex: 1;
      height: 4px;
      -webkit-appearance: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      outline: none;
      cursor: pointer;

      &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 12px;
        height: 12px;
        background: #ffffff;
        border-radius: 50%;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: transform 0.2s ease;

        &:hover {
          transform: scale(1.2);
        }
      }

      &::-webkit-slider-runnable-track {
        height: 4px;
        border-radius: 2px;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
  }
}

// Responsive Design
@media (max-width: 1024px) {
  .song-info {
    min-width: 160px;

    .cover-wrapper {
      width: 48px;
      height: 48px;
    }
  }

  .extra-controls {
    .volume-control {
      width: 100px;
    }
  }

  .main-controls .rate-btn {
    width: 40px;
  }
}

@media (max-width: 768px) {
  .player-bar {
    height: 70px;
    padding: 0 12px;
    gap: 12px;
  }

  .song-info {
    min-width: 120px;
    gap: 8px;

    .cover-wrapper {
      width: 44px;
      height: 44px;

      .cover-tooltip {
        display: none;
      }
    }

    .track-info {
      .track-name {
        font-size: 13px;
      }

      .track-artist {
        font-size: 11px;
      }
    }
  }

  .main-controls .control-btn {
    width: 36px;
    height: 36px;

    &.play-btn {
      width: 42px;
      height: 42px;
    }

    &.rate-btn {
      display: none;
    }
  }

  .extra-controls {
    gap: 4px;

    .volume-control {
      width: 80px;
    }
  }

  .progress-section {
    gap: 8px;

    .time {
      font-size: 10px;
      min-width: 35px;
    }
  }
}
</style>
