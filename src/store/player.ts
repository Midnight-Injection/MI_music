import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MusicInfo } from '../types/music'
import type { PlayMode } from '../types/player'
import type { LyricLine } from '../components/lyrics/types'
import { localizePlaybackUrl } from '../modules/playback/playbackAsset'
import { usePlaybackResolver } from '../modules/playback/playbackResolver'

const audioElement = typeof Audio !== 'undefined' ? new Audio() : null
let audioEventsBound = false

// 暴露 audioElement 到 window 以便调试
;(() => {
  if (audioElement) {
    (window as any).__PLAYER_AUDIO__ = audioElement
    console.log('[Player] audioElement exposed to window.__PLAYER_AUDIO__')
    console.log('[Player] Initial audioElement state:', {
      volume: audioElement.volume,
      muted: audioElement.muted,
      paused: audioElement.paused,
      src: audioElement.src,
      defaultMuted: audioElement.defaultMuted
    })
  }
})()

export const usePlayerStore = defineStore('player', () => {
  const currentMusic = ref<MusicInfo | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const playMode = ref<PlayMode>('loop')
  const playlist = ref<MusicInfo[]>([])
  const currentIndex = ref(0)
  const playbackRate = ref(1)
  const resolvedQuality = ref<string | null>(null)
  const resolvedResolver = ref<string | null>(null)

  // Lyrics state
  const lyrics = ref<LyricLine[]>([])
  const currentLyricIndex = ref(0)
  const lyricsOffset = ref(0)
  const showLyrics = ref(false)
  
  // Resolved URL state
  const resolvedUrl = ref<string | null>(null)
  const isLoadingUrl = ref(false)

  const hasMusic = computed(() => currentMusic.value !== null)
  const hasLyrics = computed(() => lyrics.value.length > 0)

  function syncAudioState() {
    if (!audioElement) {
      console.log('[Player] syncAudioState: audioElement is null')
      return
    }
    console.log('[Player] syncAudioState: setting volume:', volume.value, 'playbackRate:', playbackRate.value, 'current volume:', audioElement.volume, 'muted:', audioElement.muted)
    audioElement.volume = volume.value
    audioElement.playbackRate = playbackRate.value
  }

  function bindAudioEvents() {
    if (!audioElement || audioEventsBound) return

    audioElement.preload = 'auto'

    audioElement.addEventListener('loadedmetadata', () => {
      console.log('[Player] loadedmetadata event, duration:', audioElement.duration)
      duration.value = Number.isFinite(audioElement.duration) ? audioElement.duration : 0
    })

    audioElement.addEventListener('canplay', () => {
      console.log('[Player] canplay event, readyState:', audioElement.readyState, 'duration:', audioElement.duration, 'volume:', audioElement.volume, 'muted:', audioElement.muted)
    })

    audioElement.addEventListener('playing', () => {
      console.log('[Player] playing event - audio is now playing')
    })

    audioElement.addEventListener('timeupdate', () => {
      currentTime.value = audioElement.currentTime
    })

    audioElement.addEventListener('play', () => {
      console.log('[Player] play event - setting isPlaying to true')
      isPlaying.value = true
    })

    audioElement.addEventListener('pause', () => {
      console.log('[Player] pause event - setting isPlaying to false')
      isPlaying.value = false
    })

    audioElement.addEventListener('ended', () => {
      console.log('[Player] ended event - song finished')
      isPlaying.value = false
      playNext()
    })

    audioElement.addEventListener('error', () => {
      console.error('[Player] Audio element playback failed:', audioElement.error, 'code:', audioElement.error?.code, 'message:', audioElement.error?.message)
      isPlaying.value = false
    })

    audioElement.addEventListener('volumechange', () => {
      console.log('[Player] volumechange event - volume:', audioElement.volume, 'muted:', audioElement.muted)
    })

    audioEventsBound = true
    console.log('[Player] Audio events bound, audioElement id:', audioElement.id, 'volume:', audioElement.volume, 'muted:', audioElement.muted)
    syncAudioState()
  }

  bindAudioEvents()

  async function playMusic(music: MusicInfo): Promise<void> {
    if (!music) {
      throw new Error('无效的音乐信息')
    }

    isLoadingUrl.value = true

    try {
      console.log('[Player] Attempting to play:', music.name, 'source:', music.source, 'songmid:', music.songmid)
      const playbackResolver = usePlaybackResolver()
      const resolution = await playbackResolver.resolve(music)
      const url = resolution.url
      const playbackUrl = await localizePlaybackUrl(url)
      console.log(
        '[Player] Resolved URL:',
        url,
        'playback:',
        playbackUrl,
        'via:',
        resolution.resolver,
        'channel:',
        resolution.channel,
      )

      if (!url) {
        throw new Error(`未获取到可播放链接: ${music.name} - source: ${music.source}, songmid: ${music.songmid || 'N/A'}`)
      }

      resolvedUrl.value = playbackUrl || url
      resolvedQuality.value = resolution.quality || null
      resolvedResolver.value = resolution.resolver
      currentMusic.value = music
      currentTime.value = 0

      console.log('[Player] Playing:', music.name, 'URL:', playbackUrl || url)

      if (!audioElement) {
        throw new Error('当前环境不支持音频播放')
      }

      // 添加详细的音频状态日志
      console.log('[Player] Before sync - audioElement state:', {
        src: audioElement.src?.substring(0, 60),
        paused: audioElement.paused,
        volume: audioElement.volume,
        muted: audioElement.muted,
        currentTime: audioElement.currentTime,
        readyState: audioElement.readyState
      })

      syncAudioState()

      console.log('[Player] After sync - audioElement state:', {
        volume: audioElement.volume,
        muted: audioElement.muted,
        playbackRate: audioElement.playbackRate
      })

      const nextSrc = playbackUrl || url
      if (audioElement.src !== nextSrc) {
        console.log('[Player] Setting new src, old:', audioElement.src?.substring(0, 50), 'new:', nextSrc?.substring(0, 50))
        audioElement.src = nextSrc
      }
      audioElement.currentTime = 0

      console.log('[Player] Calling play()...')
      await audioElement.play()
      console.log('[Player] play() succeeded, audioElement.paused:', audioElement.paused, 'audioElement.currentTime:', audioElement.currentTime)

      isPlaying.value = true
    } catch (error) {
      console.error('[Player] playMusic error:', error)
      // Clear loading state
      isLoadingUrl.value = false
      // Re-throw the error so caller can handle it
      throw error
    } finally {
      isLoadingUrl.value = false
    }
  }

  async function pauseMusic() {
    isPlaying.value = false
    try {
      audioElement?.pause()
    } catch (error) {
      console.error('[Player] Failed to pause audio:', error)
    }
  }

  async function resumeMusic() {
    console.log('[Player] resumeMusic called, audioElement:', !!audioElement, 'src:', audioElement?.src?.substring(0, 50))
    if (!audioElement) {
      console.error('[Player] resumeMusic: audioElement is null')
      return
    }
    if (!audioElement.src) {
      console.error('[Player] resumeMusic: audioElement has no src')
      return
    }
    isPlaying.value = true
    try {
      console.log('[Player] resumeMusic: calling play(), currentTime:', audioElement.currentTime, 'duration:', audioElement.duration)
      await audioElement.play()
      console.log('[Player] resumeMusic: play() succeeded')
    } catch (error) {
      console.error('[Player] Failed to resume audio:', error, 'src:', audioElement.src?.substring(0, 50))
      isPlaying.value = false
    }
  }

  async function setProgress(time: number) {
    currentTime.value = time
    try {
      if (audioElement) {
        audioElement.currentTime = Math.max(0, time)
      }
    } catch (error) {
      console.error('[Player] Failed to seek:', error)
    }
  }

  function setDuration(time: number) {
    duration.value = time
  }

  async function setVolume(vol: number) {
    volume.value = Math.max(0, Math.min(1, vol))
    try {
      syncAudioState()
    } catch (error) {
      console.error('[Player] Failed to set volume:', error)
    }
  }

  async function setPlaybackRate(rate: number) {
    playbackRate.value = Math.max(0.5, Math.min(2, rate))
    try {
      syncAudioState()
    } catch (error) {
      console.error('[Player] Failed to set playback rate:', error)
    }
  }

  function setPlayMode(mode: PlayMode) {
    playMode.value = mode
  }

  function setPlaylist(list: MusicInfo[], index = 0) {
    playlist.value = list
    currentIndex.value = index
    if (list[index]) {
      playMusic(list[index])
    }
  }

  function playNext() {
    if (playlist.value.length === 0) return

    switch (playMode.value) {
      case 'single':
        currentTime.value = 0
        break
      case 'random':
        currentIndex.value = Math.floor(Math.random() * playlist.value.length)
        break
      default:
        currentIndex.value = (currentIndex.value + 1) % playlist.value.length
    }

    if (playlist.value[currentIndex.value]) {
      playMusic(playlist.value[currentIndex.value])
    }
  }

  function playPrevious() {
    if (playlist.value.length === 0) return

    currentIndex.value =
      currentIndex.value === 0
        ? playlist.value.length - 1
        : currentIndex.value - 1

    if (playlist.value[currentIndex.value]) {
      playMusic(playlist.value[currentIndex.value])
    }
  }

  function clearPlaylist() {
    playlist.value = []
    currentIndex.value = 0
    pauseMusic()
    if (audioElement) {
      audioElement.removeAttribute('src')
      audioElement.load()
    }
    currentMusic.value = null
    currentTime.value = 0
    duration.value = 0
    resolvedUrl.value = null
    resolvedQuality.value = null
    resolvedResolver.value = null
  }

  function setLyrics(lines: LyricLine[]) {
    lyrics.value = lines
    currentLyricIndex.value = 0
  }

  function setCurrentLyricIndex(index: number) {
    currentLyricIndex.value = index
  }

  function setLyricsOffset(offset: number) {
    lyricsOffset.value = offset
  }

  function toggleLyrics() {
    showLyrics.value = !showLyrics.value
  }

  function clearLyrics() {
    lyrics.value = []
    currentLyricIndex.value = 0
    lyricsOffset.value = 0
  }

  return {
    currentMusic,
    isPlaying,
    currentTime,
    duration,
    volume,
    playMode,
    playlist,
    currentIndex,
    playbackRate,
    lyrics,
    currentLyricIndex,
    lyricsOffset,
    showLyrics,
    hasMusic,
    hasLyrics,
    resolvedUrl,
    resolvedQuality,
    resolvedResolver,
    isLoadingUrl,
    playMusic,
    pauseMusic,
    resumeMusic,
    setProgress,
    setDuration,
    setVolume,
    setPlaybackRate,
    setPlayMode,
    setPlaylist,
    playNext,
    playPrevious,
    clearPlaylist,
    setLyrics,
    setCurrentLyricIndex,
    setLyricsOffset,
    toggleLyrics,
    clearLyrics
  }
})
