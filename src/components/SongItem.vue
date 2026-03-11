<template>
  <div
    class="song-item"
    :class="{ 'is-playing': isPlaying, 'is-hover': isHover }"
    @mouseenter="isHover = true"
    @mouseleave="isHover = false"
    @dblclick="handlePlay"
  >
    <div class="song-cover">
      <img v-if="music.cover" :src="music.cover" :alt="music.name" />
      <div v-else class="no-cover">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <div v-if="isHover || isPlaying" class="play-overlay" @click="handlePlay">
        <svg v-if="isPlaying" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
    </div>

    <div class="song-info">
      <div class="song-name" :title="music.name">{{ music.name }}</div>
      <div class="song-artist" :title="music.artist">{{ music.artist }}</div>
    </div>

    <div class="song-album" :title="music.album">{{ music.album }}</div>

    <div class="song-duration">{{ formatDuration(music.duration) }}</div>

    <div v-if="isHover" class="song-actions">
      <button class="action-btn" @click="handlePlay" title="播放">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
      <button class="action-btn" @click="handleAddToList" title="添加到播放列表">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
      <button class="action-btn" @click="handleAddToPlaylist" title="添加到歌单">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import type { MusicInfo } from '../types/music'

interface Props {
  music: MusicInfo
}

const props = defineProps<Props>()
const emit = defineEmits<{
  play: [music: MusicInfo]
  addToList: [music: MusicInfo]
  addToPlaylist: [music: MusicInfo]
}>()

const playerStore = usePlayerStore()
const isHover = ref(false)

const isPlaying = computed(() => {
  return playerStore.currentMusic?.id === props.music.id && playerStore.isPlaying
})

function handlePlay() {
  emit('play', props.music)
}

function handleAddToList() {
  emit('addToList', props.music)
}

function handleAddToPlaylist() {
  emit('addToPlaylist', props.music)
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
</script>

<style scoped lang="scss">
.song-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-radius: 4px;
  transition: background-color 0.2s;
  cursor: pointer;

  &:hover,
  &.is-hover {
    background-color: var(--bg-hover);
  }

  &.is-playing {
    .song-name {
      color: var(--primary-color);
    }
  }

  .song-cover {
    position: relative;
    width: 48px;
    height: 48px;
    border-radius: 4px;
    overflow: hidden;
    background: var(--bg-secondary);
    margin-right: 12px;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-cover {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);

      svg {
        width: 24px;
        height: 24px;
      }
    }

    .play-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;

      svg {
        width: 24px;
        height: 24px;
      }
    }
  }

  .song-info {
    flex: 1;
    min-width: 0;
    margin-right: 16px;

    .song-name {
      font-size: 14px;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 4px;
    }

    .song-artist {
      font-size: 12px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .song-album {
    width: 200px;
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 16px;
  }

  .song-duration {
    width: 60px;
    font-size: 12px;
    color: var(--text-secondary);
    text-align: right;
    margin-right: 16px;
  }

  .song-actions {
    display: flex;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 4px;
      background: var(--bg-secondary);
      color: var(--text-primary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s, transform 0.1s;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        background: var(--primary-color);
        color: white;
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }

  &:hover .song-actions {
    opacity: 1;
  }
}
</style>
