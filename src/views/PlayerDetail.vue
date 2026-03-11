<template>
  <div class="player-detail">
    <!-- Back Button -->
    <button class="back-btn" @click="goBack" title="返回">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
      </svg>
    </button>

    <!-- Main Content -->
    <div class="player-content">
      <!-- Album Art -->
      <div class="album-art-section">
        <div class="album-art-wrapper">
          <img
            v-if="player.currentMusic"
            :src="player.currentMusic.cover || defaultCover"
            :alt="player.currentMusic.name"
            class="album-art"
            @error="handleCoverError"
          />
          <div v-else class="album-art-placeholder">
            <span class="placeholder-icon">🎵</span>
          </div>
        </div>

        <!-- Track Info -->
        <div v-if="player.currentMusic" class="track-detail">
          <h1 class="track-title">{{ player.currentMusic.name }}</h1>
          <p class="track-artist-album">
            {{ player.currentMusic.artist }} · {{ player.currentMusic.album }}
          </p>
        </div>
        <div v-else class="track-detail">
          <h1 class="track-title">未播放</h1>
          <p class="track-artist-album">选择一首歌曲开始播放</p>
        </div>
      </div>

      <!-- Lyrics Section -->
      <div class="lyrics-section">
        <div class="lyrics-header">
          <h2>歌词</h2>
          <button
            class="lyrics-toggle"
            @click="toggleLyricsView"
            :title="showFullLyrics ? '收起' : '展开'"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path v-if="showFullLyrics" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
              <path v-else d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
            </svg>
          </button>
        </div>

        <div class="lyrics-content" :class="{ expanded: showFullLyrics }">
          <div v-if="lyrics.length > 0" class="lyrics-lines">
            <p
              v-for="(line, index) in lyrics"
              :key="index"
              class="lyric-line"
              :class="{ active: isCurrentLyric(index) }"
            >
              {{ line }}
            </p>
          </div>
          <div v-else class="no-lyrics">
            <p>暂无歌词</p>
          </div>
        </div>
      </div>

      <!-- Queue Section -->
      <div class="queue-section">
        <div class="queue-header">
          <h2>播放队列</h2>
          <span class="queue-count">{{ player.playlist.length }} 首歌曲</span>
        </div>

        <div class="queue-list">
          <div
            v-for="(track, index) in player.playlist"
            :key="track.id"
            class="queue-item"
            :class="{ active: index === player.currentIndex }"
            @click="playTrack(index)"
          >
            <div class="queue-item-cover">
              <img
                :src="track.cover || defaultCover"
                :alt="track.name"
                @error="handleCoverError"
              />
              <div v-if="index === player.currentIndex && player.isPlaying" class="playing-indicator">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
              </div>
            </div>
            <div class="queue-item-info">
              <div class="queue-item-title">{{ track.name }}</div>
              <div class="queue-item-artist">{{ track.artist }}</div>
            </div>
            <div class="queue-item-duration">{{ formatTime(track.duration) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Controls -->
    <div class="bottom-controls">
      <!-- Progress Bar -->
      <div class="progress-container">
        <span class="time-label">{{ formatTime(player.currentTime) }}</span>
        <div
          class="progress-bar-large"
          @click="handleSeek"
          @mousedown="startDrag"
          @mouseup="stopDrag"
          @mouseleave="stopDrag"
          @mousemove="handleDragSeek"
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
          </div>
        </div>
        <span class="time-label">{{ formatTime(player.duration) }}</span>
      </div>

      <!-- Control Buttons -->
      <div class="control-buttons">
        <!-- Play Mode -->
        <button
          class="control-btn-large"
          @click="togglePlayMode"
          :title="playModeTitle"
        >
          <span class="mode-icon">{{ playModeIcon }}</span>
        </button>

        <!-- Previous -->
        <button class="control-btn-large" @click="player.playPrevious" title="上一首">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
          </svg>
        </button>

        <!-- Play/Pause -->
        <button
          class="play-btn-large"
          @click="togglePlay"
          :title="player.isPlaying ? '暂停' : '播放'"
        >
          <svg v-if="player.isPlaying" width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </button>

        <!-- Next -->
        <button class="control-btn-large" @click="player.playNext" title="下一首">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
          </svg>
        </button>

        <!-- Volume -->
        <div class="volume-control-large">
          <button class="control-btn-large" @click="toggleMute" :title="isMuted ? '取消静音' : '静音'">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../store/player'
import type { PlayMode } from '../types/player'

const router = useRouter()
const player = usePlayerStore()

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="48"%3E🎵%3C/text%3E%3C/svg%3E'
const showFullLyrics = ref(false)
const isDragging = ref(false)
const volumeValue = ref(player.volume)
const isMuted = ref(false)
const previousVolume = ref(1)

// Mock lyrics data - in a real app, this would come from the player store or API
const lyrics = ref<string[]>([
  '这是示例歌词第一行',
  '这是示例歌词第二行',
  '这是示例歌词第三行',
  '这是示例歌词第四行',
  '这是示例歌词第五行',
  '歌词会随着音乐滚动',
  '提供更好的用户体验',
  '在实际应用中',
  '歌词应该从音乐文件或API获取',
  '并同步高亮显示当前行'
])

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

function goBack() {
  router.back()
}

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

function toggleLyricsView() {
  showFullLyrics.value = !showFullLyrics.value
}

function playTrack(index: number) {
  if (player.playlist[index]) {
    player.playMusic(player.playlist[index])
  }
}

function isCurrentLyric(index: number): boolean {
  // Simple logic - in a real app, this would use lyric timestamps
  const currentLyricIndex = Math.floor((player.currentTime / player.duration) * lyrics.value.length)
  return index === currentLyricIndex
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
  if (!isDragging.value) return
  const progressBar = event.currentTarget as HTMLElement
  const rect = progressBar.getBoundingClientRect()
  const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
  const newTime = percent * player.duration
  player.setProgress(newTime)
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
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return
  }

  switch (event.code) {
    case 'Escape':
      event.preventDefault()
      goBack()
      break
    case 'Space':
      event.preventDefault()
      togglePlay()
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
.player-detail {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex;
  flex-direction: column;
  z-index: 2000;
  overflow: hidden;
}

.back-btn {
  position: absolute;
  top: 24px;
  left: 24px;
  width: 48px;
  height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
}

.player-content {
  flex: 1;
  display: flex;
  gap: 48px;
  padding: 100px 48px 48px;
  overflow: hidden;

  @media (max-width: 1024px) {
    flex-direction: column;
    padding: 80px 24px 24px;
    gap: 24px;
    overflow-y: auto;
  }
}

.album-art-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 500px;

  @media (max-width: 1024px) {
    max-width: 100%;
  }
}

.album-art-wrapper {
  width: 100%;
  aspect-ratio: 1;
  max-width: 400px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  margin-bottom: 32px;

  @media (max-width: 768px) {
    max-width: 300px;
  }
}

.album-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.album-art-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

  .placeholder-icon {
    font-size: 80px;
  }
}

.track-detail {
  text-align: center;

  .track-title {
    font-size: 32px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 12px;

    @media (max-width: 768px) {
      font-size: 24px;
    }
  }

  .track-artist-album {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.7);

    @media (max-width: 768px) {
      font-size: 14px;
    }
  }
}

.lyrics-section,
.queue-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  overflow: hidden;

  @media (max-width: 1024px) {
    max-height: 400px;
  }
}

.lyrics-header,
.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }

  .queue-count {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
  }
}

.lyrics-toggle {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
}

.lyrics-content {
  flex: 1;
  overflow-y: auto;
  mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);

  &.expanded {
    mask-image: none;
    -webkit-mask-image: none;
  }

  .lyrics-lines {
    .lyric-line {
      font-size: 16px;
      line-height: 2;
      color: rgba(255, 255, 255, 0.6);
      transition: all 0.3s ease;
      cursor: pointer;
      padding: 4px 0;

      &:hover {
        color: rgba(255, 255, 255, 0.8);
      }

      &.active {
        font-size: 18px;
        font-weight: 600;
        color: #1db954;
      }
    }
  }

  .no-lyrics {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgba(255, 255, 255, 0.4);
  }
}

.queue-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  &.active {
    background: rgba(29, 185, 84, 0.2);

    .queue-item-title {
      color: #1db954;
    }
  }
}

.queue-item-cover {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .playing-indicator {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;

    .bar {
      width: 3px;
      background: #1db954;
      animation: equalizer 1s ease-in-out infinite;

      &:nth-child(1) {
        height: 12px;
        animation-delay: 0s;
      }

      &:nth-child(2) {
        height: 18px;
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        height: 14px;
        animation-delay: 0.4s;
      }
    }
  }
}

@keyframes equalizer {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.5);
  }
}

.queue-item-info {
  flex: 1;
  min-width: 0;
}

.queue-item-title {
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-item-artist {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-item-duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.bottom-controls {
  flex-shrink: 0;
  padding: 32px 48px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);

  @media (max-width: 768px) {
    padding: 24px;
  }
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  .time-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-variant-numeric: tabular-nums;
    min-width: 45px;
    text-align: center;
  }
}

.progress-bar-large {
  flex: 1;
  height: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;

  .progress-track {
    position: relative;
    width: 100%;
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: visible;

    .progress-fill {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background: linear-gradient(90deg, #1db954, #1ed760);
      border-radius: 3px;
      transition: width 0.1s ease;
    }

    .progress-thumb {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 16px;
      height: 16px;
      background: #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      opacity: 0;
      transition: opacity 0.2s ease;
    }
  }

  &:hover .progress-thumb {
    opacity: 1;
  }

  &:hover .progress-track {
    background: rgba(255, 255, 255, 0.15);
  }
}

.control-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;

  @media (max-width: 768px) {
    gap: 16px;
  }
}

.control-btn-large {
  width: 56px;
  height: 56px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
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

  .mode-icon {
    font-size: 24px;
  }
}

.play-btn-large {
  width: 64px;
  height: 64px;
  border: none;
  background: #1db954;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(29, 185, 84, 0.4);

  &:hover {
    background: #1ed760;
    transform: scale(1.08);
    box-shadow: 0 6px 20px rgba(29, 185, 84, 0.5);
  }

  @media (max-width: 768px) {
    width: 56px;
    height: 56px;
  }
}

.volume-control-large {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 160px;

  .volume-slider-large {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 14px;
      height: 14px;
      background: #ffffff;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s ease;

      &:hover {
        transform: scale(1.2);
      }
    }

    &::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 2px;
    }
  }
}

@media (max-width: 768px) {
  .volume-control-large {
    width: 120px;
  }

  .control-btn-large {
    width: 48px;
    height: 48px;
  }
}
</style>
