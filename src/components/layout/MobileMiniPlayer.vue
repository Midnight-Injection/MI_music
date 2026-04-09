<template>
  <div v-if="player.hasMusic" class="mobile-mini-player" @click="goToDetail">
    <img
      v-if="player.currentMusic?.cover"
      :src="player.currentMusic.cover"
      :alt="player.currentMusic?.name"
      class="mobile-mini-player__cover"
    />
    <div v-else class="mobile-mini-player__cover mobile-mini-player__cover--placeholder">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M9 18V5l12-2v13M9 18c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3ZM21 16c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3Z" />
      </svg>
    </div>

    <div class="mobile-mini-player__info">
      <div class="mobile-mini-player__title">{{ player.currentMusic?.name || '未知曲目' }}</div>
      <div class="mobile-mini-player__artist">{{ player.currentMusic?.artist || '未知歌手' }}</div>
    </div>

    <button class="mobile-mini-player__btn" @click.stop="togglePlay">
      <svg v-if="player.isPlaying" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1" />
        <rect x="14" y="4" width="4" height="16" rx="1" />
      </svg>
      <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5v14l11-7z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../../store/player'

const player = usePlayerStore()
const router = useRouter()

function togglePlay() {
  if (player.isPlaying) {
    player.pauseMusic()
  }
  else {
    player.resumeMusic()
  }
}

function goToDetail() {
  if (player.currentMusic) {
    router.push('/player')
  }
}
</script>
