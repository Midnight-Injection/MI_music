import { watch } from 'vue'
import { usePlayerStore } from '@/store/player'
import { useDesktopLyrics } from './useDesktopLyrics'

/**
 * Composable to sync lyrics with desktop lyrics window
 * Automatically updates desktop lyrics as the player progresses
 */
export function useLyricsSync(lyrics: { text: string; time: number }[]) {
  const playerStore = usePlayerStore()
  const { updateDesktopLyricsWithTime } = useDesktopLyrics()

  /**
   * Find current and next lyrics at given time
   */
  function findLyricsAtTime(time: number): { current: string; next: string } {
    if (!lyrics || lyrics.length === 0) {
      return { current: '', next: '' }
    }

    // Find current line
    let currentIndex = 0
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= time * 1000) {
        currentIndex = i
      } else {
        break
      }
    }

    const current = lyrics[currentIndex]?.text || ''
    const next = lyrics[currentIndex + 1]?.text || ''

    return { current, next }
  }

  // Watch for time updates and sync to desktop lyrics
  watch(
    () => playerStore.currentTime,
    (newTime) => {
      updateDesktopLyricsWithTime(lyrics, newTime * 1000)
    },
    { immediate: true }
  )

  return {
    findLyricsAtTime
  }
}
