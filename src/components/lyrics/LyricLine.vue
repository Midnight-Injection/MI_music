<template>
  <div
    class="lyric-line"
    :class="{
      active: isActive,
      prev: isPrev,
      next: isNext
    }"
  >
    <div class="lyric-text">{{ line.text }}</div>
    <div v-if="line.translation" class="lyric-translation">
      {{ line.translation }}
    </div>
    <div v-if="line.romanization" class="lyric-romanization">
      {{ line.romanization }}
    </div>
    <div v-if="showWords && line.words" class="lyric-words">
      <span
        v-for="(word, index) in line.words"
        :key="index"
        class="lyric-word"
        :class="{ active: currentWordIndex === index }"
      >
        {{ word.text }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LyricLine as LyricLineType } from './types'

const props = defineProps<{
  line: LyricLineType
  isActive?: boolean
  isPrev?: boolean
  isNext?: boolean
  currentWordIndex?: number
  showWords?: boolean
}>()
</script>

<style scoped lang="scss">
.lyric-line {
  padding: 12px 16px;
  margin: 4px 0;
  border-radius: 8px;
  transition: all 0.3s ease;
  opacity: 0.4;
  transform: scale(0.95);

  &.active {
    opacity: 1;
    transform: scale(1);
    background: rgba(29, 185, 84, 0.1);
    border-left: 3px solid #1db954;

    .lyric-text {
      color: #ffffff;
      font-weight: 600;
      font-size: 18px;
    }
  }

  &.prev,
  &.next {
    opacity: 0.6;
  }

  .lyric-text {
    color: rgba(255, 255, 255, 0.7);
    font-size: 16px;
    line-height: 1.5;
    transition: all 0.3s ease;
  }

  .lyric-translation {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
    margin-top: 4px;
    line-height: 1.4;
  }

  .lyric-romanization {
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    margin-top: 2px;
    line-height: 1.3;
    font-style: italic;
  }

  .lyric-words {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;

    .lyric-word {
      padding: 2px 6px;
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      transition: all 0.2s ease;

      &.active {
        color: #1db954;
        background: rgba(29, 185, 84, 0.15);
        font-weight: 500;
      }
    }
  }
}

@media (max-width: 768px) {
  .lyric-line {
    padding: 8px 12px;
    margin: 2px 0;

    &.active .lyric-text {
      font-size: 16px;
    }

    .lyric-text {
      font-size: 14px;
    }

    .lyric-translation {
      font-size: 13px;
    }

    .lyric-romanization {
      font-size: 12px;
    }
  }
}
</style>
