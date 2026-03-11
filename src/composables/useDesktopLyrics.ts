import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

export interface DesktopLyricsState {
  isVisible: boolean
  isLocked: boolean
  isAlwaysOnTop: boolean
}

export function useDesktopLyrics() {
  const state = ref<DesktopLyricsState>({
    isVisible: false,
    isLocked: false,
    isAlwaysOnTop: true
  })

  const currentLyrics = ref<{ current: string; next: string }>({
    current: '',
    next: ''
  })

  /**
   * Toggle the desktop lyrics window visibility
   */
  async function toggleLyricsWindow(): Promise<boolean> {
    try {
      const visible = await invoke<boolean>('toggle_lyrics_window')
      state.value.isVisible = visible
      return visible
    } catch (error) {
      console.error('Failed to toggle lyrics window:', error)
      return false
    }
  }

  /**
   * Set the lyrics window position
   */
  async function setLyricsWindowPosition(x: number, y: number): Promise<void> {
    try {
      await invoke('set_lyrics_window_position', { x, y })
    } catch (error) {
      console.error('Failed to set lyrics window position:', error)
    }
  }

  /**
   * Set the lyrics window size
   */
  async function setLyricsWindowSize(width: number, height: number): Promise<void> {
    try {
      await invoke('set_lyrics_window_size', { width, height })
    } catch (error) {
      console.error('Failed to set lyrics window size:', error)
    }
  }

  /**
   * Set always on top
   */
  async function setLyricsAlwaysOnTop(enabled: boolean): Promise<void> {
    try {
      await invoke('set_lyrics_always_on_top', { enabled })
      state.value.isAlwaysOnTop = enabled
    } catch (error) {
      console.error('Failed to set always on top:', error)
    }
  }

  /**
   * Lock/unlock the lyrics window
   */
  async function lockLyricsWindow(locked: boolean): Promise<void> {
    try {
      await invoke('lock_lyrics_window', { locked })
      state.value.isLocked = locked
    } catch (error) {
      console.error('Failed to lock lyrics window:', error)
    }
  }

  /**
   * Update lyrics in the desktop lyrics window
   */
  async function updateDesktopLyrics(lyrics: { current: string; next: string }): Promise<void> {
    try {
      const payload = JSON.stringify(lyrics)
      await invoke('update_desktop_lyrics', { lyrics: payload })
      currentLyrics.value = lyrics
    } catch (error) {
      console.error('Failed to update desktop lyrics:', error)
    }
  }

  /**
   * Update lyrics with full lyrics array
   */
  async function updateDesktopLyricsWithTime(
    lyrics: { text: string; time: number }[],
    currentTime: number
  ): Promise<void> {
    try {
      const payload = JSON.stringify({
        lyrics,
        currentTime
      })
      await invoke('update_desktop_lyrics', { lyrics: payload })
    } catch (error) {
      console.error('Failed to update desktop lyrics with time:', error)
    }
  }

  return {
    state,
    currentLyrics,
    toggleLyricsWindow,
    setLyricsWindowPosition,
    setLyricsWindowSize,
    setLyricsAlwaysOnTop,
    lockLyricsWindow,
    updateDesktopLyrics,
    updateDesktopLyricsWithTime
  }
}
