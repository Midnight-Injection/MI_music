<template>
  <div class="lyrics-window" :class="{ locked: isLocked }" @mousedown="handleMouseDown">
    <div class="lyrics-container">
      <div v-if="currentLyric" class="lyric-line current">
        {{ currentLyric }}
      </div>
      <div v-if="nextLyric" class="lyric-line next">
        {{ nextLyric }}
      </div>
      <div v-if="!currentLyric" class="lyric-line empty">
        No lyrics
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const currentLyric = ref('')
const nextLyric = ref('')
const isLocked = ref(false)
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

let lyrics: { text: string; time: number }[] = []
let _currentIndex = 0

onMounted(async () => {
  // Listen for lyrics updates from the main window
  const unlisten = await getCurrentWebviewWindow().listen('lyrics-update', (event: { payload: string }) => {
    if (event.payload) {
      parseLyricsUpdate(event.payload)
    }
  })

  onUnmounted(() => {
    unlisten.then(fn => fn())
  })
})

function parseLyricsUpdate(data: string) {
  try {
    const parsed = JSON.parse(data)
    if (parsed.current && parsed.next) {
      currentLyric.value = parsed.current
      nextLyric.value = parsed.next
    } else if (parsed.lyrics) {
      lyrics = parsed.lyrics
      updateLyricLines(parsed.currentTime || 0)
    }
  } catch (e) {
    // If it's just plain text, show it as current lyric
    currentLyric.value = data
    nextLyric.value = ''
  }
}

function updateLyricLines(currentTime: number) {
  if (!lyrics.length) return

  // Find current line
  let idx = 0
  for (let i = 0; i < lyrics.length; i++) {
    if (lyrics[i].time <= currentTime) {
      idx = i
    } else {
      break
    }
  }

  currentLyric.value = lyrics[idx]?.text || ''
  nextLyric.value = lyrics[idx + 1]?.text || ''
}

async function handleMouseDown(e: MouseEvent) {
  if (isLocked.value) return

  isDragging.value = true
  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function handleMouseMove(e: MouseEvent) {
  if (!isDragging.value) return

  const dx = e.clientX - dragOffset.value.x
  const dy = e.clientY - dragOffset.value.y

  getCurrentWebviewWindow().then(window => {
    window.getPosition().then(pos => {
      window.setPosition({
        x: pos.x + dx,
        y: pos.y + dy
      })
    })
  })

  dragOffset.value = {
    x: e.clientX,
    y: e.clientY
  }
}

function handleMouseUp() {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}
</script>

<style scoped>
.lyrics-window {
  width: 100%;
  height: 100%;
  background: transparent;
  cursor: move;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.lyrics-window.locked {
  cursor: default;
}

.lyrics-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}

.lyric-line {
  text-align: center;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.6;
  transition: all 0.3s ease;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lyric-line.current {
  font-size: 24px;
  font-weight: 600;
  opacity: 1;
}

.lyric-line.next {
  font-size: 16px;
  opacity: 0.6;
  margin-top: 4px;
}

.lyric-line.empty {
  opacity: 0.5;
  font-style: italic;
}
</style>
