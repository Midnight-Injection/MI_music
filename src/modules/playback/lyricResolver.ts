import { useScriptRuntime, type MusicSource } from '../../composables/useScriptRuntime'
import type { LyricLine } from '../../components/lyrics/types'
import { useSettingsStore } from '../../store/settings'
import { useUserSourceStore } from '../../stores/userSource'
import type { BuiltInSearchChannel } from '../../types/music'
import type { MusicInfo } from '../../types/music'
import { normalizeScriptSearchResult } from '../search/normalize'
import {
  markSourceFailure,
  markSourceSuccess,
  normalizeSourceErrorMessage,
  orderSourcesForAction,
} from '../source-health/store'
import { parseScriptLyricResult } from './lyricParser'
import { getCachedPreferredSourceId } from './sourceSuccessCache'
import {
  buildTrackIdentityParts,
  isDurationClose,
} from './trackIdentity'
import { resolveMusicChannel, toScriptMusicInfo } from './types'

interface LyricResolution {
  lines: LyricLine[]
  offset: number
  userSourceId: string
  channel: MusicSource
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

function pickMatchedLyricTrack(target: MusicInfo, candidates: MusicInfo[]): MusicInfo | null {
  const targetParts = buildTrackIdentityParts(target)
  const targetTitle = targetParts.title
  const targetArtist = targetParts.artist
  const targetAlbum = targetParts.album

  const scored = candidates
    .map((candidate) => {
      const candidateParts = buildTrackIdentityParts(candidate)
      if (!candidateParts.title || !candidateParts.artist) return null
      if (candidateParts.title !== targetTitle) return null
      if (targetArtist && candidateParts.artist !== targetArtist) return null
      if (!isDurationClose(target.duration, candidate.duration)) return null

      let score = 100
      if (targetAlbum && candidateParts.album && targetAlbum === candidateParts.album) score += 20
      if (target.duration && candidate.duration) score += 10 - Math.min(10, Math.abs(target.duration - candidate.duration))

      return { candidate, score }
    })
    .filter((item): item is { candidate: MusicInfo; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score)

  return scored[0]?.candidate || null
}

export function useLyricResolver() {
  const userSourceStore = useUserSourceStore()
  const settingsStore = useSettingsStore()
  const scriptRuntime = useScriptRuntime()

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

    const keyword = [track.name, track.artist].filter(Boolean).join(' ').trim() || track.name
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

      const matched = pickMatchedLyricTrack(track, candidates)
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

    return null
  }

  return {
    resolve,
  }
}
