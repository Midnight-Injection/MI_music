<template>
  <div class="desktop-lyrics-control">
    <button
      @click="toggleLyrics"
      :class="{ active: state.isVisible }"
      title="Desktop Lyrics"
    >
      <svg v-if="state.isVisible" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v9.28c-.47-.17-.97-.28-1.5-.28C8.01 12 6 14.01 6 16.5S8.01 21 10.5 21c2.31 0 4.2-1.75 4.45-4H15V6h4V3h-7z"/>
      </svg>
    </button>

    <div v-if="state.isVisible" class="lyrics-settings">
      <button
        @click="toggleLock"
        :class="{ active: state.isLocked }"
        title="Lock/Unlock Window"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path v-if="state.isLocked" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
          <path v-else d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6h1.9c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm0 12H6V10h12v10z"/>
        </svg>
      </button>

      <button
        @click="toggleAlwaysOnTop"
        :class="{ active: state.isAlwaysOnTop }"
        title="Always on Top"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDesktopLyrics } from '@/composables/useDesktopLyrics'

const { state, toggleLyricsWindow, lockLyricsWindow, setLyricsAlwaysOnTop } = useDesktopLyrics()

async function toggleLyrics() {
  await toggleLyricsWindow()
}

async function toggleLock() {
  await lockLyricsWindow(!state.value.isLocked)
}

async function toggleAlwaysOnTop() {
  await setLyricsAlwaysOnTop(!state.value.isAlwaysOnTop)
}
</script>

<style scoped>
.desktop-lyrics-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.desktop-lyrics-control button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #ffffff;
  transition: all 0.2s;
}

.desktop-lyrics-control button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.desktop-lyrics-control button.active {
  background: rgba(255, 255, 255, 0.2);
  color: #4CAF50;
}

.lyrics-settings {
  display: flex;
  gap: 4px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
