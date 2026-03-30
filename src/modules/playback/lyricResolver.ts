import { invoke } from '@tauri-apps/api/core'
import { useScriptRuntime, type MusicSource } from '../../composables/useScriptRuntime'
import type { LyricLine } from '../../components/lyrics/types'
import { useSettingsStore } from '../../store/settings'
import { useUserSourceStore } from '../../stores/userSource'
import type { BuiltInSearchChannel } from '../../types/music'
import type { MusicInfo } from '../../types/music'
import { searchBuiltInTracks } from '../search/providers'
import { normalizeScriptSearchResult } from '../search/normalize'
import {
  markSourceFailure,
  markSourceSuccess,
  normalizeSourceErrorMessage,
  orderSourcesForAction,
} from '../source-health/store'
import { parseScriptLyricResult } from './lyricParser'
import {
  buildTrackSearchKeyword,
  pickMatchedTrack,
} from './matchedTrack'
import { getCachedPreferredSourceId } from './sourceSuccessCache'
import { resolveMusicChannel, toScriptMusicInfo } from './types'

interface LyricResolution {
  lines: LyricLine[]
  offset: number
  userSourceId: string | null
  channel: MusicSource
}

interface NativeLyricPayload {
  lyric?: string | null
  tlyric?: string | null
  rlyric?: string | null
  lxlyric?: string | null
}

function getSourceActionChannels(
  source: { sources?: Record<string, { actions?: string[] }> },
  action: 'lyric' | 'search',
): MusicSource[] {
  return Object.entries(source.sources || {})
    .filter(([, info]) => info.actions?.includes(action))
    .map(([channel]) => channel as MusicSource)
}

function isBuiltInSearchChannel(channel: MusicSource): channel is BuiltInSearchChannel {
  return channel !== 'local'
}

function getBuiltInLyricSongId(track: MusicInfo, channel: BuiltInSearchChannel): string | null {
  if (channel === 'kg') {
    return track.hash || track.songmid || track.id || null
  }

  return track.songmid || track.hash || track.copyrightId || track.id || null
}

function getPreferredSourceId(
  track: MusicInfo,
  targetQuality: string,
  enabledSources: Array<{ id: string }>,
  explicitSourceId?: string | null,
  activeUserSourceId?: string,
): string | undefined {
  const enabledSourceIds = enabledSources.map((item) => item.id)

  if (explicitSourceId && enabledSourceIds.includes(explicitSourceId)) {
    return explicitSourceId
  }

  const cached = getCachedPreferredSourceId(track, targetQuality, enabledSourceIds)
  if (cached) return cached

  if (activeUserSourceId && enabledSourceIds.includes(activeUserSourceId)) {
    return activeUserSourceId
  }

  return undefined
}

export function useLyricResolver() {
  const userSourceStore = useUserSourceStore()
  const settingsStore = useSettingsStore()
  const scriptRuntime = useScriptRuntime()

  async function tryBuiltInLyricLookup(
    channel: BuiltInSearchChannel,
    track: MusicInfo,
  ): Promise<{ lines: LyricLine[]; offset: number } | null> {
    const songId = getBuiltInLyricSongId(track, channel)
    if (!songId) return null

    const payload = await invoke<NativeLyricPayload>('get_lyric', {
      songId,
      source: channel,
    })
    const parsed = parseScriptLyricResult(payload)
    if (!parsed?.lines.length) return null
    return parsed
  }

  async function tryDirectLyricLookup(
    sourceId: string,
    channel: MusicSource,
    track: MusicInfo,
  ): Promise<{ lines: LyricLine[]; offset: number } | null> {
    const payload = await scriptRuntime.getLyric(sourceId, channel, toScriptMusicInfo(track, channel))
    const parsed = parseScriptLyricResult(payload)
    if (!parsed?.lines.length) return null
    return parsed
  }

  async function trySearchMatchedLyricLookup(
    source: { id: string; sources?: Record<string, { actions?: string[] }> },
    track: MusicInfo,
    preferredChannel: MusicSource,
  ): Promise<LyricResolution | null> {
    const supportedSearchChannels = getSourceActionChannels(source, 'search')
    const searchChannelSequence = (
      supportedSearchChannels.includes(preferredChannel)
        ? [preferredChannel, ...supportedSearchChannels.filter((channel) => channel !== preferredChannel)]
        : supportedSearchChannels
    ).filter(isBuiltInSearchChannel)

    if (!searchChannelSequence.length) return null

    const keyword = buildTrackSearchKeyword(track)
    const seenCandidateIds = new Set<string>()

    for (const searchChannel of searchChannelSequence) {
      const rawResults = await scriptRuntime.search(source.id, keyword, 1, 12, searchChannel)
      const candidates = rawResults
        .map((item) => normalizeScriptSearchResult(item, searchChannel))
        .filter((item) => {
          if (!item.id || seenCandidateIds.has(item.id)) return false
          seenCandidateIds.add(item.id)
          return true
        })

      const matched = pickMatchedTrack(track, candidates)
      if (!matched) continue

      const lyricChannel = resolveMusicChannel(matched)
      const parsed = await tryDirectLyricLookup(source.id, lyricChannel, matched)
      if (!parsed) continue

      return {
        lines: parsed.lines,
        offset: parsed.offset,
        userSourceId: source.id,
        channel: lyricChannel,
      }
    }

    return null
  }

  async function tryBuiltInMatchedLyricLookup(
    track: MusicInfo,
    preferredChannel: BuiltInSearchChannel,
  ): Promise<LyricResolution | null> {
    const searchChannelSequence: BuiltInSearchChannel[] = [
      preferredChannel,
      ...(['kw', 'kg', 'tx', 'wy', 'mg'] as BuiltInSearchChannel[]).filter(
        (channel) => channel !== preferredChannel,
      ),
    ]

    const keyword = buildTrackSearchKeyword(track)

    for (const searchChannel of searchChannelSequence) {
      const candidates = await searchBuiltInTracks(searchChannel, keyword, 1, 12)
      const matched = pickMatchedTrack(track, candidates)
      if (!matched) continue

      const lyricChannel = resolveMusicChannel(matched)
      if (!isBuiltInSearchChannel(lyricChannel)) continue

      const parsed = await tryBuiltInLyricLookup(lyricChannel, matched)
      if (!parsed) continue

      return {
        lines: parsed.lines,
        offset: parsed.offset,
        userSourceId: null,
        channel: lyricChannel,
      }
    }

    return null
  }

  async function resolve(
    track: MusicInfo,
    preferredSourceId?: string | null,
    preferredChannel?: MusicSource | null,
  ): Promise<LyricResolution | null> {
    if (!track?.name) return null

    if (!userSourceStore.isLoaded) {
      await userSourceStore.loadUserSources()
    }

    const enabledSources = userSourceStore.enabledSources
    if (!enabledSources.length) return null

    await scriptRuntime.initialize()

    const primaryChannel = preferredChannel || resolveMusicChannel(track)
    const builtInPrimaryChannel = isBuiltInSearchChannel(primaryChannel)
      ? primaryChannel
      : resolveMusicChannel(track)
    const orderedSources = orderSourcesForAction(
      primaryChannel,
      'lyric',
      enabledSources,
      getPreferredSourceId(
        track,
        settingsStore.settings.audioQuality,
        enabledSources,
        preferredSourceId,
        settingsStore.settings.activeUserSourceId,
      ),
    )

    for (const source of orderedSources) {
      const lyricChannels = getSourceActionChannels(source, 'lyric')
      const directChannels = lyricChannels.includes(primaryChannel)
        ? [primaryChannel, ...lyricChannels.filter((channel) => channel !== primaryChannel)]
        : lyricChannels

      let lastError = ''

      for (const channel of directChannels) {
        try {
          const directLyric = await tryDirectLyricLookup(source.id, channel, track)
          if (directLyric) {
            markSourceSuccess(primaryChannel, 'lyric', source.id)
            return {
              lines: directLyric.lines,
              offset: directLyric.offset,
              userSourceId: source.id,
              channel,
            }
          }
        } catch (error) {
          lastError = normalizeSourceErrorMessage(error)
        }
      }

      try {
        const matchedLyric = await trySearchMatchedLyricLookup(source, track, primaryChannel)
        if (matchedLyric) {
          markSourceSuccess(primaryChannel, 'lyric', source.id)
          return matchedLyric
        }
      } catch (error) {
        lastError = normalizeSourceErrorMessage(error)
      }

      markSourceFailure(primaryChannel, 'lyric', source.id, lastError || '歌词匹配失败')
    }

    if (isBuiltInSearchChannel(builtInPrimaryChannel)) {
      try {
        const directBuiltInLyric = await tryBuiltInLyricLookup(builtInPrimaryChannel, track)
        if (directBuiltInLyric) {
          return {
            lines: directBuiltInLyric.lines,
            offset: directBuiltInLyric.offset,
            userSourceId: null,
            channel: builtInPrimaryChannel,
          }
        }
      } catch {
        // Fallback to matched built-in lookup below.
      }

      try {
        const matchedBuiltInLyric = await tryBuiltInMatchedLyricLookup(track, builtInPrimaryChannel)
        if (matchedBuiltInLyric) {
          return matchedBuiltInLyric
        }
      } catch {
        // Keep null return semantics for lyric resolution failures.
      }
    }

    return null
  }

  return {
    resolve,
  }
}
