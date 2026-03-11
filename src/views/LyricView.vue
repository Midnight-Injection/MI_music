<template>
  <div class="lyric-view">
    <div class="lyric-header">
      <button class="back-btn" @click="goBack">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
        </svg>
      </button>
      <div v-if="player.currentMusic" class="track-info">
        <h2 class="track-name">{{ player.currentMusic.name }}</h2>
        <p class="track-artist">{{ player.currentMusic.artist }}</p>
      </div>
    </div>

    <div class="lyric-body">
      <LyricDisplay
        ref="lyricDisplayRef"
        :current-time="player.currentTime"
      />
    </div>

    <div v-if="player.currentMusic" class="lyric-background">
      <img
        :src="player.currentMusic.cover || defaultCover"
        :alt="player.currentMusic.name"
        class="bg-image"
      />
      <div class="bg-overlay"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '../store/player'
import LyricDisplay from '../components/lyrics/LyricDisplay.vue'

const router = useRouter()
const player = usePlayerStore()
const lyricDisplayRef = ref<InstanceType<typeof LyricDisplay>>()

const defaultCover = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="48"%3E🎵%3C/text%3E%3C/svg%3E'

function goBack() {
  router.back()
}
</script>

<style scoped lang="scss">
.lyric-view {
  position: fixed;
  top: 0;
  left: 200px;
  right: 0;
  bottom: 80px;
  display: flex;
  flex-direction: column;
  background: #121212;
  overflow: hidden;

  @media (max-width: 768px) {
    left: 0;
  }
}

.lyric-header {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  .back-btn {
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
    flex-shrink: 0;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }
  }

  .track-info {
    flex: 1;
    margin-left: 16px;
    min-width: 0;

    .track-name {
      font-size: 18px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track-artist {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.lyric-body {
  position: relative;
  z-index: 10;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}

.lyric-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  overflow: hidden;

  .bg-image {
    position: absolute;
    top: -10%;
    left: -10%;
    width: 120%;
    height: 120%;
    object-fit: cover;
    filter: blur(40px) brightness(0.3);
    transform: scale(1.1);
  }

  .bg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(
      to bottom,
      rgba(18, 18, 18, 0.7) 0%,
      rgba(18, 18, 18, 0.3) 50%,
      rgba(18, 18, 18, 0.7) 100%
    );
  }
}

@media (max-width: 768px) {
  .lyric-header {
    padding: 12px 16px;

    .track-info {
      margin-left: 12px;

      .track-name {
        font-size: 16px;
      }

      .track-artist {
        font-size: 13px;
      }
    }
  }

  .lyric-body {
    padding: 12px;
  }
}
</style>
