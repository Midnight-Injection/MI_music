<template>
  <div class="desktop-lyrics-example">
    <h3>Desktop Lyrics Example</h3>

    <div class="controls">
      <DesktopLyricsControl />

      <div class="manual-controls">
        <button @click="sendTestLyrics">Send Test Lyrics</button>
        <button @click="sendEmptyLyrics">Clear Lyrics</button>
      </div>
    </div>

    <div class="lyrics-input">
      <label>Current Lyric:</label>
      <input v-model="currentLyric" @input="updateLyrics" placeholder="Enter current lyric" />

      <label>Next Lyric:</label>
      <input v-model="nextLyric" @input="updateLyrics" placeholder="Enter next lyric" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import DesktopLyricsControl from './DesktopLyricsControl.vue'
import { useDesktopLyrics } from '@/composables/useDesktopLyrics'

const { updateDesktopLyrics } = useDesktopLyrics()

const currentLyric = ref('Hello World')
const nextLyric = ref('This is the next line')

function updateLyrics() {
  updateDesktopLyrics({
    current: currentLyric.value,
    next: nextLyric.value
  })
}

function sendTestLyrics() {
  updateDesktopLyrics({
    current: '♪ Test Lyrics Playing ♪',
    next: 'Next line will appear here'
  })
}

function sendEmptyLyrics() {
  updateDesktopLyrics({
    current: '',
    next: ''
  })
}
</script>

<style scoped>
.desktop-lyrics-example {
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin: 20px;
}

.desktop-lyrics-example h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

.controls {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 20px;
}

.manual-controls {
  display: flex;
  gap: 8px;
}

.manual-controls button {
  padding: 8px 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.manual-controls button:hover {
  background: #f0f0f0;
}

.lyrics-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lyrics-input label {
  font-weight: 500;
  font-size: 14px;
}

.lyrics-input input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 14px;
}
</style>
