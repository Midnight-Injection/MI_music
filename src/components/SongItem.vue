<template>
  <div
    class="song-item"
    :class="{ 'is-playing': isPlaying, 'is-hover': isHover }"
    @mouseenter="isHover = true"
    @mouseleave="isHover = false"
    @focusin="isHover = true"
    @focusout="isHover = false"
    @click="handlePlay"
    @contextmenu.prevent="handleContextMenu"
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
      <div class="song-name-row">
        <div class="song-name" :title="music.name">{{ music.name }}</div>
        <span v-if="sourceLabel" class="song-source app-pill secondary compact">{{ sourceLabel }}</span>
        <span v-if="displayQualityLabel" class="song-quality app-pill accent compact">{{ displayQualityLabel }}</span>
      </div>
      <div class="song-artist" :title="music.artist">{{ music.artist }}</div>
    </div>

    <div class="song-album" :title="music.album">{{ music.album }}</div>

    <div class="song-duration">{{ formatDuration(music.duration) }}</div>

    <div class="song-actions">
      <NButton size="tiny" quaternary circle type="primary" @click.stop="handlePlay" title="播放">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 15px; height: 15px;">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </template>
      </NButton>
      <NButton size="tiny" quaternary circle type="warning" @click.stop="handleAddToPlaylist" title="添加到歌单" aria-label="添加到歌单">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 15px; height: 15px;">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
        </template>
      </NButton>
      <NButton size="tiny" quaternary circle type="info" @click.stop="handleAddToList" title="添加到播放列表" aria-label="添加到播放列表">
        <template #icon>
          <svg viewBox="0 0 24 24" fill="currentColor" style="width: 15px; height: 15px;">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/>
          </svg>
        </template>
      </NButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { NButton } from 'naive-ui'
import { usePlayerStore } from '../store/player'
import type { MusicInfo } from '../types/music'
import { formatQualityLabel, getTrackDisplayQuality } from '../lib/trackQuality'
import { CHANNEL_NAMES } from '../types/settings'

interface Props {
  music: MusicInfo
}

const props = defineProps<Props>()
const emit = defineEmits<{
  play: [music: MusicInfo]
  addToList: [music: MusicInfo]
  addToPlaylist: [music: MusicInfo]
  contextMenu: [event: MouseEvent, music: MusicInfo]
}>()

const playerStore = usePlayerStore()
const isHover = ref(false)

const isPlaying = computed(() => {
  return playerStore.currentMusic?.id === props.music.id && playerStore.isPlaying
})

const displayQualityLabel = computed(() => formatQualityLabel(getTrackDisplayQuality(props.music)))
const sourceLabel = computed(() => {
  const sourceId = String(props.music.source || props.music.searchChannel || '').trim()
  if (!sourceId || sourceId === 'local') return null
  return CHANNEL_NAMES[sourceId] || sourceId
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

function handleContextMenu(event: MouseEvent) {
  emit('contextMenu', event, props.music)
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
  padding: 11px 14px;
  border-radius: 20px;
  transition: background-color 0.2s, transform 0.2s ease, border-color 0.2s ease;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.08);

  &:hover,
  &.is-hover {
    background-color: rgba(255, 255, 255, 0.13);
    border-color: rgba(255, 255, 255, 0.16);
    transform: translateY(-1px);
  }

  &.is-playing {
    border-color: rgba(255, 255, 255, 0.18);

    .song-name {
      color: #fff7ff;
    }
  }

  .song-cover {
    position: relative;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.1);
    margin-right: 12px;
    box-shadow: 0 14px 28px rgba(27, 14, 61, 0.18);
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
      background: rgba(40, 24, 78, 0.52);
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

    .song-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      margin-bottom: 4px;
    }

    .song-name {
      font-size: 0.92rem;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      font-weight: 600;
    }

    .song-artist {
      font-size: 0.74rem;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .song-quality {
      flex-shrink: 0;
      font-size: 10px;
      letter-spacing: 0.04em;
    }

    .song-source {
      flex-shrink: 0;
      font-size: 10px;
      letter-spacing: 0.02em;
    }
  }

  .song-album {
    width: 180px;
    font-size: 0.76rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-right: 16px;
  }

  .song-duration {
    width: 56px;
    font-size: 0.74rem;
    color: var(--text-secondary);
    text-align: right;
    margin-right: 16px;
  }

  .song-actions {
    display: flex;
    gap: 8px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.2s;

    .action-btn {
      svg {
        width: 15px;
        height: 15px;
      }
    }
  }

  &:hover .song-actions {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  &.is-hover .song-actions {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
</style>
