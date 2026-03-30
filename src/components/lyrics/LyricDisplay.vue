<template>
  <div class="lyric-display" :class="`lyric-display--${lyricPositionClass}`">
    <div v-if="loading" class="lyric-loading">
      <div class="loading-spinner"></div>
      <p>加载歌词中...</p>
    </div>

    <div v-else-if="!settingsStore.settings.lyricShow" class="lyric-empty">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.94 17.94A10.94 10.94 0 0112 19C7 19 2.73 15.89 1 12c.73-1.63 1.85-3.06 3.23-4.22M9.9 4.24A10.94 10.94 0 0112 5c5 0 9.27 3.11 11 7a10.96 10.96 0 01-4.06 4.94M1 1l22 22"/>
      </svg>
      <p>歌词显示已关闭</p>
      <p class="hint">可在设置中重新开启歌词显示</p>
    </div>

    <div v-else-if="error" class="lyric-error">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!lyrics || lyrics.length === 0" class="lyric-empty">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
      </svg>
      <p>暂无歌词</p>
      <p class="hint">播放音乐时自动加载歌词</p>
    </div>

    <div v-else class="lyric-content">
      <div class="lyric-lines-container" ref="linesContainerRef">
        <LyricLine
          v-for="(line, index) in visibleLines"
          :key="index"
          :line="line"
          :is-active="index === currentLineIndex - startLine"
          :is-prev="index === currentLineIndex - startLine - 1"
          :is-next="index === currentLineIndex - startLine + 1"
          :current-word-index="currentWordIndex"
          :show-words="showWordLevel"
          :show-translation="settingsStore.settings.showTranslation"
          :show-romanization="settingsStore.settings.showRomanization"
          :font-size="settingsStore.settings.lyricFontSize"
        />
      </div>
    </div>

    <div v-if="lyrics && lyrics.length > 0" class="lyric-controls">
      <button
        class="control-btn"
        @click="adjustOffset(-100)"
        title="延迟 -100ms"
      >
        -0.1s
      </button>
      <span class="offset-display">{{ offsetDisplay }}</span>
      <button
        class="control-btn"
        @click="adjustOffset(100)"
        title="提前 +100ms"
      >
        +0.1s
      </button>
      <button
        class="control-btn"
        @click="resetOffset"
        title="重置偏移"
      >
        重置
      </button>
      <button
        class="control-btn"
        :class="{ active: showWordLevel }"
        @click="toggleWordLevel"
        title="逐字歌词"
      >
        逐字
      </button>
    </div>

    <div v-if="romanizationUnavailable" class="lyric-capability-note">
      当前歌词源暂不支持注音显示
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import LyricLine from './LyricLine.vue'
import type { LyricLine as LyricLineType } from './types'
import { useSettingsStore } from '../../store/settings'

const props = defineProps<{
  currentTime: number
}>()

const settingsStore = useSettingsStore()
const linesContainerRef = ref<HTMLElement>()

const loading = ref(false)
const error = ref<string>()
const lyrics = ref<LyricLineType[]>([])
const currentLineIndex = ref(0)
const currentWordIndex = ref<number>()
const offset = ref(0)
const showWordLevel = ref(false)

// Display options
const visibleLineCount = 15
const startLine = computed(() => {
  return Math.max(0, currentLineIndex.value - Math.floor(visibleLineCount / 2))
})

const visibleLines = computed(() => {
  const endLine = Math.min(lyrics.value.length, startLine.value + visibleLineCount)
  return lyrics.value.slice(startLine.value, endLine)
})

const offsetDisplay = computed(() => {
  const seconds = offset.value / 1000
  return seconds >= 0 ? `+${seconds.toFixed(1)}s` : `${seconds.toFixed(1)}s`
})
const lyricPositionClass = computed(() => settingsStore.settings.lyricPosition)
const romanizationUnavailable = computed(() => (
  settingsStore.settings.showRomanization
  && lyrics.value.length > 0
  && !lyrics.value.some((line) => Boolean(line.romanization))
))

async function loadLyrics() {
  try {
    loading.value = true
    error.value = undefined

    const allLyrics = await invoke<LyricLineType[]>('get_all_lyrics')
    lyrics.value = allLyrics

    // Get current offset
    const currentOffset = await invoke<number>('get_lyrics_offset')
    offset.value = currentOffset
  } catch (err) {
    error.value = '加载歌词失败'
    console.error('Failed to load lyrics:', err)
  } finally {
    loading.value = false
  }
}

async function updateCurrentLine() {
  if (!lyrics.value || lyrics.value.length === 0) return

  try {
    const timeMs = Math.floor(props.currentTime * 1000)
    const result = await invoke<{
      current_index: number
      current_word_index?: number
      has_word_level: boolean
    }>('get_current_line', { timeMs })

    currentLineIndex.value = result.current_index
    currentWordIndex.value = result.current_word_index
    showWordLevel.value = result.has_word_level

    await scrollToCurrentLine()
  } catch (err) {
    console.error('Failed to get current line:', err)
  }
}

async function scrollToCurrentLine() {
  await nextTick()

  if (!linesContainerRef.value) return

  const activeLine = linesContainerRef.value.querySelector('.lyric-line.active')
  if (!activeLine) return

  const container = linesContainerRef.value
  const containerHeight = container.clientHeight
  const lineTop = (activeLine as HTMLElement).offsetTop
  const lineHeight = (activeLine as HTMLElement).clientHeight

  container.scrollTo({
    top: lineTop - containerHeight / 2 + lineHeight / 2,
    behavior: 'smooth'
  })
}

async function adjustOffset(deltaMs: number) {
  const newOffset = offset.value + deltaMs
  try {
    await invoke('set_lyrics_offset', { offsetMs: newOffset })
    offset.value = newOffset
  } catch (err) {
    console.error('Failed to set offset:', err)
  }
}

async function resetOffset() {
  try {
    await invoke('set_lyrics_offset', { offsetMs: 0 })
    offset.value = 0
  } catch (err) {
    console.error('Failed to reset offset:', err)
  }
}

function toggleWordLevel() {
  showWordLevel.value = !showWordLevel.value
}

// Watch current time changes
watch(() => props.currentTime, () => {
  updateCurrentLine()
}, { immediate: true })

onMounted(() => {
  loadLyrics()
})

// Expose refresh method
defineExpose({
  refresh: loadLyrics
})
</script>

<style scoped lang="scss">
.lyric-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.lyric-display--top .lyric-lines-container {
  align-content: flex-start;
}

.lyric-display--center .lyric-lines-container {
  align-content: center;
}

.lyric-display--bottom .lyric-lines-container {
  align-content: flex-end;
}

.lyric-loading,
.lyric-error,
.lyric-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);

  p {
    margin: 0;
    font-size: 14px;
  }

  .hint {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.3);
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lyric-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.lyric-lines-container {
  height: 100%;
  overflow-y: auto;
  padding: 20px 16px;
  display: grid;
  align-content: center;
  scroll-behavior: smooth;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }
  }
}

.lyric-capability-note {
  padding: 0 16px 12px;
  color: var(--text-secondary);
  font-size: 12px;
}

.lyric-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.4);
  border-top: 1px solid rgba(255, 255, 255, 0.1);

  .control-btn {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }

    &.active {
      background: color-mix(in srgb, var(--primary-color) 20%, transparent);
      color: var(--primary-color);
      border-color: var(--primary-color);
    }
  }

  .offset-display {
    min-width: 60px;
    text-align: center;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    font-family: monospace;
  }
}

@media (max-width: 768px) {
  .lyric-controls {
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;

    .control-btn {
      padding: 4px 8px;
      font-size: 11px;
    }

    .offset-display {
      font-size: 12px;
      min-width: 50px;
    }
  }
}
</style>
