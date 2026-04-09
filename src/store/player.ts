import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MusicInfo } from '../types/music'
import type { PlayMode } from '../types/player'
import type { LyricLine } from '../components/lyrics/types'
import type { MusicSource } from '../composables/useScriptRuntime'
import { localizePlaybackUrl, warmLocalizedPlaybackUrl } from '../modules/playback/playbackAsset'
import { useLyricResolver } from '../modules/playback/lyricResolver'
import { buildSuspiciousPlaybackMessage } from '../modules/playback/playbackValidation'
import { usePlaybackResolver } from '../modules/playback/playbackResolver'
import { rememberSuccessfulSource, forgetSuccessfulSource } from '../modules/playback/sourceSuccessCache'
import { buildTrackIdentityKey } from '../modules/playback/trackIdentity'
import type { PlaybackResolution } from '../modules/playback/types'
import { rememberPlaybackUrlProbeResult } from '../modules/playback/urlProbe'
import { clearCachedCustomResolution } from '../modules/playback/resolvers/customSourceResolver'
import {
  forgetBlockedTrackSource,
  rememberBlockedTrackSource,
} from '../modules/playback/badSourceBlacklist'
import { markSourceFailure } from '../modules/source-health/store'
import { useSettingsStore } from './settings'
import { createAudioAdapter } from '../modules/playback/audioAdapter'
import type { AudioAdapter } from '../modules/playback/audioAdapter'

const audio: AudioAdapter = createAudioAdapter()
let audioEventsBound = false
let playbackRequestToken = 0
let activePlaybackMetrics: {
  playRequestedAt?: number
  resolvedAt?: number
  startedAt: number
  token: number
  trackName: string
} | null = null

const PLAYBACK_METADATA_TIMEOUT_MS = 4000

interface PersistedPlayerSession {
  playlist: MusicInfo[]
  currentIndex: number
  currentTime?: number
  wasPlaying?: boolean
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }

  return Date.now()
}

function getTrackPlaybackKey(music: MusicInfo) {
  return buildTrackIdentityKey(music)
}

// 暴露 audio adapter 到 window 以便调试
;(window as any).__PLAYER_AUDIO_ADAPTER__ = audio
console.log('[Player] AudioAdapter created:', audio.constructor.name)

export const usePlayerStore = defineStore('player', () => {
  const settingsStore = useSettingsStore()
  const currentMusic = ref<MusicInfo | null>(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(settingsStore.settings.volume)
  const playMode = ref<PlayMode>(settingsStore.settings.defaultPlayMode)
  const playlist = ref<MusicInfo[]>([])
  const currentIndex = ref(0)
  const playbackRate = ref(1)
  const resolvedQuality = ref<string | null>(null)
  const resolvedResolver = ref<PlaybackResolution['resolver'] | null>(null)
  const resolvedChannel = ref<MusicSource | null>(null)
  const resolvedUserSourceId = ref<string | null>(null)
  const playbackNotice = ref('')
  let playbackNoticeTimer: number | null = null

  // Lyrics state
  const lyrics = ref<LyricLine[]>([])
  const currentLyricIndex = ref(0)
  const lyricsOffset = ref(0)
  const showLyrics = ref(false)

  // Resolved URL state
  const resolvedUrl = ref<string | null>(null)
  const isLoadingUrl = ref(false)
  const lyricRequestId = ref(0)
  let loadedTrackKey: string | null = null

  const hasMusic = computed(() => currentMusic.value !== null)
  const hasLyrics = computed(() => lyrics.value.length > 0)

  function syncAudioState() {
    console.log(
      '[Player] syncAudioState: setting volume:',
      volume.value,
      'playbackRate:',
      playbackRate.value
    )
    audio.setVolume(volume.value)
    audio.setPlaybackRate(playbackRate.value)
  }

  function syncCurrentLyricIndexForTime(timeSeconds = currentTime.value) {
    if (!lyrics.value.length) {
      currentLyricIndex.value = 0
      return
    }

    const targetMs = Math.max(0, timeSeconds * 1000 + lyricsOffset.value)
    let activeIndex = 0

    for (let index = 0; index < lyrics.value.length; index += 1) {
      if (lyrics.value[index].time_ms <= targetMs) activeIndex = index
      else break
    }

    currentLyricIndex.value = activeIndex
  }

  function resetLyricsState() {
    lyrics.value = []
    currentLyricIndex.value = 0
    lyricsOffset.value = 0
  }

  async function resolveLyricsForTrack(music: MusicInfo, resolution: PlaybackResolution) {
    const requestId = ++lyricRequestId.value
    const lyricResolver = useLyricResolver()

    resetLyricsState()

    try {
      const result = await lyricResolver.resolve(music, resolution.userSourceId, resolution.channel)

      if (requestId !== lyricRequestId.value) return
      if (!result?.lines.length) {
        resetLyricsState()
        return
      }

      setLyrics(result.lines)
      setLyricsOffset(result.offset)
    } catch (error) {
      if (requestId !== lyricRequestId.value) return
      resetLyricsState()
      console.warn('[Player] Failed to resolve lyrics:', error)
    }
  }

  function bindAudioEvents() {
    if (audioEventsBound) return

    audio.onLoadedMetadata((d) => {
      console.log('[Player] loadedmetadata event, duration:', d)
      duration.value = d
    })

    audio.onCanPlay(() => {
      console.log(
        '[Player] canplay event, duration:',
        audio.duration,
        'volume:',
        audio.volume
      )
      if (activePlaybackMetrics) {
        console.log(
          `[Player][Perf] ${activePlaybackMetrics.trackName} canplay after ${Math.round(nowMs() - activePlaybackMetrics.startedAt)}ms`
        )
      }
    })

    audio.onPlaying(() => {
      console.log('[Player] playing event - audio is now playing')
      isPlaying.value = true
      if (activePlaybackMetrics) {
        console.log(
          `[Player][Perf] ${activePlaybackMetrics.trackName} playing after ${Math.round(nowMs() - activePlaybackMetrics.startedAt)}ms`
        )
      }
    })

    audio.onTimeUpdate((time) => {
      currentTime.value = time
      syncCurrentLyricIndexForTime(time)
    })

    audio.onPause(() => {
      console.log('[Player] pause event - setting isPlaying to false')
      isPlaying.value = false
    })

    audio.onEnded(() => {
      console.log('[Player] ended event - song finished')
      isPlaying.value = false
      clearActivePlaybackMetrics()
      playNext()
    })

    audio.onError((err) => {
      console.error('[Player] Audio playback error:', err.message)
      isPlaying.value = false
      clearActivePlaybackMetrics()
      if (settingsStore.settings.autoSkipOnError && playlist.value.length > 1) {
        playNext()
      }
    })

    audioEventsBound = true
    console.log('[Player] Audio events bound via AudioAdapter')
    syncAudioState()
  }

  bindAudioEvents()

  function applyResolvedPlaybackState(resolution: PlaybackResolution) {
    resolvedQuality.value = resolution.quality || null
    resolvedResolver.value = resolution.resolver
    resolvedChannel.value = resolution.channel
    resolvedUserSourceId.value = resolution.userSourceId || null
  }

  function clearResolvedPlaybackState() {
    resolvedUrl.value = null
    resolvedQuality.value = null
    resolvedResolver.value = null
    resolvedChannel.value = null
    resolvedUserSourceId.value = null
  }

  function setPlaybackNotice(message: string) {
    playbackNotice.value = message

    if (playbackNoticeTimer !== null) {
      window.clearTimeout(playbackNoticeTimer)
    }

    playbackNoticeTimer = window.setTimeout(() => {
      playbackNotice.value = ''
      playbackNoticeTimer = null
    }, 2800)
  }

  function clearPlaybackNotice() {
    playbackNotice.value = ''
    if (playbackNoticeTimer !== null) {
      window.clearTimeout(playbackNoticeTimer)
      playbackNoticeTimer = null
    }
  }

  function clearActivePlaybackMetrics(expectedToken?: number) {
    if (!activePlaybackMetrics) return
    if (expectedToken && activePlaybackMetrics.token !== expectedToken) return
    activePlaybackMetrics = null
  }

  function isRemotePlaybackUrl(url: string) {
    return url.startsWith('https://') || url.startsWith('http://')
  }

  async function startAudioPlayback(src: string) {
    console.log('[Player] startAudioPlayback, src:', src?.substring(0, 60))

    syncAudioState()

    audio.setSrc(src)
    audio.seek(0)

    if (activePlaybackMetrics) {
      activePlaybackMetrics.playRequestedAt = nowMs()
    }

    console.log('[Player] Calling play()...')
    await audio.play()
    console.log(
      '[Player] play() succeeded, paused:',
      audio.paused,
      'currentTime:',
      audio.currentTime
    )
  }

  function stopAudioPlaybackForRetry() {
    try {
      audio.pause()
      audio.reset()
    } catch (error) {
      console.warn('[Player] Failed to reset audio during retry:', error)
    }

    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
  }

  async function waitForPlaybackMetadata(timeoutMs = PLAYBACK_METADATA_TIMEOUT_MS): Promise<number | null> {
    const readDuration = () => {
      const d = audio.duration
      if (!Number.isFinite(d) || d <= 0) return null
      return d
    }

    const immediateDuration = readDuration()
    if (immediateDuration !== null) return immediateDuration

    return new Promise((resolve) => {
      let settled = false
      let timer: number | null = null

      const finish = (value: number | null) => {
        if (settled) return
        settled = true
        if (timer !== null) window.clearTimeout(timer)
        unsubMetadata()
        unsubCanPlay()
        unsubError()
        resolve(value)
      }

      const unsubMetadata = audio.onLoadedMetadata((d) => finish(d || null))
      const unsubCanPlay = audio.onCanPlay(() => finish(readDuration()))
      const unsubError = audio.onError(() => finish(null))

      timer = window.setTimeout(() => {
        finish(readDuration())
      }, timeoutMs)
    })
  }

  function rejectCustomPlaybackSource(
    music: MusicInfo,
    resolution: PlaybackResolution,
    message: string
  ) {
    if (!resolution.userSourceId) return

    console.warn('[Player] Rejecting custom playback source:', {
      track: `${music.name} - ${music.artist}`,
      sourceId: resolution.userSourceId,
      channel: resolution.channel,
      quality: resolution.quality,
      message,
    })

    markSourceFailure(resolution.channel, 'musicUrl', resolution.userSourceId, message)
    rememberBlockedTrackSource(music, resolution.userSourceId, message)
    forgetSuccessfulSource(music, settingsStore.settings.audioQuality, resolution.userSourceId)
    clearCachedCustomResolution(music, settingsStore.settings.audioQuality, resolution.userSourceId)
  }

  async function playMusic(music: MusicInfo): Promise<void> {
    if (!music) {
      throw new Error('无效的音乐信息')
    }

    const currentToken = ++playbackRequestToken
    const requestStartedAt = nowMs()
    activePlaybackMetrics = {
      token: currentToken,
      startedAt: requestStartedAt,
      trackName: music.name,
    }
    isLoadingUrl.value = true
    clearPlaybackNotice()

    try {
      console.log(
        '[Player] Attempting to play:',
        music.name,
        'source:',
        music.source,
        'songmid:',
        music.songmid
      )
      const playbackResolver = usePlaybackResolver()
      currentMusic.value = music
      currentTime.value = 0
      const excludedSourceIds = new Set<string>()

      for (;;) {
        const resolution = await playbackResolver.resolve(music, {
          excludedSourceIds: [...excludedSourceIds],
        })
        if (currentToken !== playbackRequestToken) {
          console.warn('[Player] Skipping stale playback request for:', music.name)
          return
        }
        const currentMetrics: typeof activePlaybackMetrics = activePlaybackMetrics
        activePlaybackMetrics = {
          ...(currentMetrics || {}),
          resolvedAt: nowMs(),
        }
        console.log(
          `[Player][Perf] ${music.name} resolve completed in ${Math.round(nowMs() - requestStartedAt)}ms`
        )
        const url = resolution.url
        console.log(
          '[Player] Resolved URL:',
          url,
          'via:',
          resolution.resolver,
          'channel:',
          resolution.channel
        )

        if (!url) {
          throw new Error(
            `未获取到可播放链接: ${music.name} - source: ${music.source}, songmid: ${music.songmid || 'N/A'}`
          )
        }

        console.log('[Player] Playing:', music.name, 'URL:', url)

        let finalPlaybackUrl = url
        try {
          await startAudioPlayback(url)
        } catch (primaryError) {
          if (!isRemotePlaybackUrl(url)) {
            throw primaryError
          }

          console.warn(
            '[Player] Direct remote playback failed, trying localized fallback:',
            primaryError
          )
          const localizedFallbackUrl = await localizePlaybackUrl(url)
          if (!localizedFallbackUrl || localizedFallbackUrl === url) {
            if (resolution.userSourceId) {
              rejectCustomPlaybackSource(
                music,
                resolution,
                primaryError instanceof Error ? primaryError.message : '音源播放失败'
              )
              excludedSourceIds.add(resolution.userSourceId)
              stopAudioPlaybackForRetry()
              continue
            }
            throw primaryError
          }

          finalPlaybackUrl = localizedFallbackUrl
          await startAudioPlayback(localizedFallbackUrl)
        }

        const actualDuration = await waitForPlaybackMetadata()

        if (!actualDuration || actualDuration <= 0) {
          console.warn(`[Player] Track "${music.name}" has zero duration, skipping to next`)
          stopAudioPlaybackForRetry()
          clearActivePlaybackMetrics(currentToken)
          isLoadingUrl.value = false
          if (playlist.value.length > 1) {
            playNext()
          }
          return
        }

        const suspiciousPlaybackMessage = buildSuspiciousPlaybackMessage(music, actualDuration)
        if (suspiciousPlaybackMessage && resolution.userSourceId) {
          rejectCustomPlaybackSource(music, resolution, suspiciousPlaybackMessage)
          excludedSourceIds.add(resolution.userSourceId)
          stopAudioPlaybackForRetry()
          continue
        }

        resolvedUrl.value = finalPlaybackUrl
        applyResolvedPlaybackState(resolution)
        isPlaying.value = true
        loadedTrackKey = getTrackPlaybackKey(music)
        rememberPlaybackUrlProbeResult(url, true)

        if (resolution.userSourceId) {
          forgetBlockedTrackSource(music, resolution.userSourceId)
          rememberSuccessfulSource(
            music,
            settingsStore.settings.audioQuality,
            resolution.userSourceId,
            resolution.quality
          )
        }

        if (isRemotePlaybackUrl(url)) {
          const expectedTrackKey = getTrackPlaybackKey(music)
          void warmLocalizedPlaybackUrl(url).then((localizedUrl) => {
            if (
              currentToken !== playbackRequestToken ||
              !currentMusic.value ||
              getTrackPlaybackKey(currentMusic.value) !== expectedTrackKey ||
              !localizedUrl ||
              localizedUrl === url
            ) {
              return
            }

            console.log(
              `[Player][Perf] ${music.name} localized playback asset warmed in ${Math.round(nowMs() - requestStartedAt)}ms`
            )
            if (resolvedUrl.value === finalPlaybackUrl) {
              resolvedUrl.value = localizedUrl
            }
          })
        }

        void resolveLyricsForTrack(music, resolution)
        break
      }
    } catch (error) {
      clearActivePlaybackMetrics(currentToken)
      console.error('[Player] playMusic error:', error)
      setPlaybackNotice(error instanceof Error ? error.message : '播放失败，请稍后重试')
      if (
        settingsStore.settings.autoSkipOnError
        && playlist.value.length > 1
        && playlist.value[currentIndex.value]
        && getTrackPlaybackKey(playlist.value[currentIndex.value]) === getTrackPlaybackKey(music)
      ) {
        playNext()
      }
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
      audio.pause()
    } catch (error) {
      console.error('[Player] Failed to pause audio:', error)
    }
  }

  async function resumeMusic() {
    console.log(
      '[Player] resumeMusic called, paused:',
      audio.paused,
      'currentTime:',
      audio.currentTime
    )
    if (isLoadingUrl.value) {
      console.log('[Player] resumeMusic: URL is still loading, ignoring')
      return
    }
    const expectedKey = currentMusic.value ? getTrackPlaybackKey(currentMusic.value) : null
    if (expectedKey && loadedTrackKey !== expectedKey) {
      console.log('[Player] resumeMusic: track mismatch, restarting playback for:', currentMusic.value?.name)
      if (currentMusic.value) {
        await playMusic(currentMusic.value)
      }
      return
    }
    if (audio.paused && audio.currentTime === 0 && !audio.duration) {
      if (currentMusic.value) {
        await playMusic(currentMusic.value)
      } else {
        console.error('[Player] resumeMusic: no src loaded')
      }
      return
    }
    isPlaying.value = true
    try {
      console.log(
        '[Player] resumeMusic: calling play(), currentTime:',
        audio.currentTime,
        'duration:',
        audio.duration
      )
      await audio.play()
      console.log('[Player] resumeMusic: play() succeeded')
    } catch (error) {
      console.error('[Player] Failed to resume audio:', error)
      isPlaying.value = false
    }
  }

  async function setProgress(time: number) {
    currentTime.value = time
    syncCurrentLyricIndexForTime(time)
    try {
      audio.seek(time)
    } catch (error) {
      console.error('[Player] Failed to seek:', error)
    }
  }

  function setDuration(time: number) {
    duration.value = time
  }

  async function setVolume(vol: number, options: { persist?: boolean } = {}) {
    volume.value = Math.max(0, Math.min(1, vol))
    if (options.persist !== false && Math.abs(settingsStore.settings.volume - volume.value) > 0.001) {
      settingsStore.updateSetting('volume', volume.value)
    }
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

  function setPlayMode(mode: PlayMode, options: { persist?: boolean } = {}) {
    playMode.value = mode
    if (options.persist !== false && settingsStore.settings.defaultPlayMode !== mode) {
      settingsStore.updateSetting('defaultPlayMode', mode)
    }
  }

  function setPlaylist(list: MusicInfo[], index = 0) {
    playlist.value = list
    currentIndex.value = index
    if (list[index]) {
      void playMusic(list[index]).catch(() => undefined)
    }
  }

  async function playFromQueueContext(music: MusicInfo): Promise<void> {
    const trackKey = getTrackPlaybackKey(music)
    const nextPlaylist = [...playlist.value]
    let targetIndex = nextPlaylist.findIndex((item) => getTrackPlaybackKey(item) === trackKey)

    if (targetIndex === -1) {
      if (!nextPlaylist.length) {
        nextPlaylist.push(music)
        targetIndex = 0
      } else if (currentMusic.value) {
        const safeCurrentIndex = Math.max(0, Math.min(currentIndex.value, nextPlaylist.length - 1))
        targetIndex = safeCurrentIndex + 1
        nextPlaylist.splice(targetIndex, 0, music)
      } else {
        nextPlaylist.push(music)
        targetIndex = nextPlaylist.length - 1
      }
    }

    playlist.value = nextPlaylist
    currentIndex.value = targetIndex

    const targetTrack = playlist.value[targetIndex] || music
    await playMusic(targetTrack)
  }

  function appendToPlaylist(items: MusicInfo[]): number {
    if (!items.length) return 0

    const existing = [...playlist.value]
    const seenKeys = new Set(existing.map(getTrackPlaybackKey))
    const nextItems = items.filter((item) => {
      const key = getTrackPlaybackKey(item)
      if (seenKeys.has(key)) return false
      seenKeys.add(key)
      return true
    })

    if (!nextItems.length) return 0

    const activeTrackKey = currentMusic.value ? getTrackPlaybackKey(currentMusic.value) : null
    playlist.value = [...existing, ...nextItems]

    if (activeTrackKey) {
      const updatedIndex = playlist.value.findIndex(
        (item) => getTrackPlaybackKey(item) === activeTrackKey
      )
      if (updatedIndex >= 0) {
        currentIndex.value = updatedIndex
      }
    } else if (playlist.value.length > 0) {
      currentIndex.value = Math.min(currentIndex.value, playlist.value.length - 1)
    }

    return nextItems.length
  }

  function enqueueMusic(music: MusicInfo): boolean {
    return appendToPlaylist([music]) > 0
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
      void playMusic(playlist.value[currentIndex.value]).catch(() => undefined)
    }
  }

  function playPrevious() {
    if (playlist.value.length === 0) return

    currentIndex.value =
      currentIndex.value === 0 ? playlist.value.length - 1 : currentIndex.value - 1

    if (playlist.value[currentIndex.value]) {
      void playMusic(playlist.value[currentIndex.value]).catch(() => undefined)
    }
  }

  function clearPlaylist() {
    lyricRequestId.value += 1
    playlist.value = []
    currentIndex.value = 0
    pauseMusic()
    audio.reset()
    currentMusic.value = null
    currentTime.value = 0
    duration.value = 0
    loadedTrackKey = null
    resetLyricsState()
    clearResolvedPlaybackState()
    clearActivePlaybackMetrics()
  }

  function clearQueue() {
    if (!currentMusic.value) {
      clearPlaylist()
      return
    }
    playlist.value = [currentMusic.value]
    currentIndex.value = 0
  }

  function restoreSession(session: PersistedPlayerSession) {
    lyricRequestId.value += 1
    playlist.value = [...(session.playlist || [])]
    currentIndex.value = Math.max(0, Math.min(session.currentIndex || 0, Math.max(playlist.value.length - 1, 0)))
    currentMusic.value = playlist.value[currentIndex.value] || null
    currentTime.value = Math.max(0, session.currentTime || 0)
    duration.value = currentMusic.value?.duration || 0
    isPlaying.value = false
    loadedTrackKey = null
    resetLyricsState()
    clearResolvedPlaybackState()
    clearActivePlaybackMetrics()

    audio.pause()
    audio.reset()
  }

  function setLyrics(lines: LyricLine[]) {
    lyrics.value = [...lines].sort((left, right) => left.time_ms - right.time_ms)
    syncCurrentLyricIndexForTime()
  }

  function setCurrentLyricIndex(index: number) {
    currentLyricIndex.value = index
  }

  function setLyricsOffset(offset: number) {
    lyricsOffset.value = offset
    syncCurrentLyricIndexForTime()
  }

  function toggleLyrics() {
    showLyrics.value = !showLyrics.value
  }

  function clearLyrics() {
    lyricRequestId.value += 1
    resetLyricsState()
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
    resolvedChannel,
    resolvedUserSourceId,
    playbackNotice,
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
    playFromQueueContext,
    appendToPlaylist,
    enqueueMusic,
    playNext,
    playPrevious,
    clearPlaylist,
    clearQueue,
    restoreSession,
    setLyrics,
    setCurrentLyricIndex,
    setLyricsOffset,
    toggleLyrics,
    clearLyrics,
    clearPlaybackNotice,
  }
})
