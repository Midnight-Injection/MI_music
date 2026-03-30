import { useScriptRuntime } from '../../composables/useScriptRuntime'
import { useSettingsStore } from '../../store/settings'
import { useUserSourceStore } from '../../stores/userSource'
import type { BuiltInSearchChannel, MusicInfo } from '../../types/music'
import {
  resolveMusicChannel,
  type PlaybackResolution,
  type PlaybackResolver,
  type PlaybackResolveOptions,
} from './types'
import { resolveWithCustomSources } from './resolvers/customSourceResolver'
import { getChannelFailureSummary } from '../source-health/store'
import { canUsePlaybackUrl } from './urlProbe'
import { searchBuiltInTracks } from '../search/providers'
import { buildTrackSearchKeyword, pickMatchedTrack } from './matchedTrack'

const TX_FALLBACK_CHANNEL_PRIORITY: BuiltInSearchChannel[] = ['kw', 'kg', 'mg', 'wy']
const TX_DIRECT_RESOLUTION_TIMEOUT_MS = 12000
const TX_FALLBACK_SEARCH_TIMEOUT_MS = 4500

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('搜索超时')), timeoutMs)
    }),
  ])
}

const NO_AVAILABLE_SOURCE_MESSAGE = '暂无可用音源'

export function usePlaybackResolver(): PlaybackResolver {
  const userSourceStore = useUserSourceStore()
  const settingsStore = useSettingsStore()
  const scriptRuntime = useScriptRuntime()

  async function ensureUserSourcesReady() {
    if (!userSourceStore.isLoaded) {
      await userSourceStore.loadUserSources()
    }
  }

  async function hasEnabledCustomSources(): Promise<boolean> {
    await ensureUserSourcesReady()
    return userSourceStore.enabledSources.length > 0
  }

  function isSearchDerivedTrack(track: MusicInfo): boolean {
    return Boolean(track.resolvedBy || track.searchChannel)
  }

  function shouldUseTrackDirectUrl(track: MusicInfo): boolean {
    if (!track.url?.trim()) return false
    if (track.source === 'local') return true
    return !isSearchDerivedTrack(track)
  }

  async function resolveDirectUrl(track: MusicInfo): Promise<PlaybackResolution | null> {
    if (!shouldUseTrackDirectUrl(track)) {
      if (track.url?.trim() && isSearchDerivedTrack(track)) {
        console.info('[PlaybackResolver] Ignoring search-derived track.url to preserve custom-source playback priority:', {
          name: track.name,
          artist: track.artist,
          source: track.source,
          searchChannel: track.searchChannel,
          resolvedBy: track.resolvedBy,
        })
      }
      return null
    }

    const directUrl = track.url?.trim()
    if (directUrl && (await canUsePlaybackUrl(directUrl))) {
      console.info('[PlaybackResolver] Using existing track URL directly:', {
        name: track.name,
        artist: track.artist,
        source: track.source,
      })
      return {
        url: directUrl,
        channel: resolveMusicChannel(track),
        resolver: 'direct-url',
      }
    }

    return null
  }

  async function resolveCustomOnly(
    track: MusicInfo,
    options?: PlaybackResolveOptions
  ): Promise<PlaybackResolution | null> {
    return resolveWithCustomSources(track, {
      userSourceStore,
      settingsStore,
      scriptRuntime,
    }, options)
  }

  function createNoAvailableSourceError(
    track: MusicInfo,
    channel: ReturnType<typeof resolveMusicChannel>,
  ) {
    const failureSummary = getChannelFailureSummary(
      channel,
      'musicUrl',
      userSourceStore.enabledSources,
    )

    console.warn('[PlaybackResolver] No custom playback source available for track:', {
      name: track.name,
      artist: track.artist,
      channel,
      enabledCustomSources: userSourceStore.enabledSources.length,
      failureSummary: failureSummary || null,
    })

    return new Error(NO_AVAILABLE_SOURCE_MESSAGE)
  }

  function getTxFallbackChannels(): BuiltInSearchChannel[] {
    const enabledFallbackChannels = settingsStore
      .getEnabledChannelIds()
      .filter((channel): channel is BuiltInSearchChannel =>
        TX_FALLBACK_CHANNEL_PRIORITY.includes(channel as BuiltInSearchChannel),
      )

    const prioritizedChannels = [
      ...TX_FALLBACK_CHANNEL_PRIORITY.filter((channel) => enabledFallbackChannels.includes(channel)),
      ...enabledFallbackChannels.filter((channel) => !TX_FALLBACK_CHANNEL_PRIORITY.includes(channel)),
    ]

    return prioritizedChannels.length ? prioritizedChannels : TX_FALLBACK_CHANNEL_PRIORITY
  }

  async function collectTencentFallbackCandidates(track: MusicInfo): Promise<MusicInfo[]> {
    const keyword = buildTrackSearchKeyword(track)
    if (!keyword) return []

    const matchedCandidates: MusicInfo[] = []

    for (const fallbackChannel of getTxFallbackChannels()) {
      let candidates: MusicInfo[] = []

      try {
        candidates = await withTimeout(
          searchBuiltInTracks(fallbackChannel, keyword, 1, 12),
          TX_FALLBACK_SEARCH_TIMEOUT_MS,
        )
      } catch (error) {
        console.warn(
          '[PlaybackResolver] TX fallback search failed:',
          fallbackChannel,
          error instanceof Error ? error.message : String(error),
        )
        continue
      }

      const matchedTrack = pickMatchedTrack(track, candidates)
      if (!matchedTrack) continue

      console.info('[PlaybackResolver] TX fallback matched track:', {
        original: `${track.name} - ${track.artist}`,
        fallback: `${matchedTrack.name} - ${matchedTrack.artist}`,
        fallbackChannel,
        fallbackSongmid: matchedTrack.songmid || matchedTrack.hash || matchedTrack.id,
      })

      matchedCandidates.push(matchedTrack)
    }

    return matchedCandidates
  }

  async function resolve(
    track: MusicInfo,
    options: PlaybackResolveOptions = {}
  ): Promise<PlaybackResolution> {
    const channel = resolveMusicChannel(track)
    const directResolution = await resolveDirectUrl(track)
    if (directResolution) return directResolution

    const customPlaybackEnabled = await hasEnabledCustomSources()
    let txFallbackCandidates: MusicInfo[] = []

    if (!customPlaybackEnabled) {
      throw createNoAvailableSourceError(track, channel)
    }

    if (channel === 'tx') {
      let didTimeout = false
      const customResolutionTask = resolveCustomOnly(track, options).catch((error) => {
        console.warn(
          '[PlaybackResolver] TX custom resolution failed before fallback candidate search:',
          error instanceof Error ? error.message : String(error),
        )
        return null
      })
      const customResolution = await Promise.race([
        customResolutionTask,
        new Promise<PlaybackResolution | null>((resolve) => {
          window.setTimeout(() => {
            didTimeout = true
            resolve(null)
          }, TX_DIRECT_RESOLUTION_TIMEOUT_MS)
        }),
      ])

      if (customResolution) return customResolution
      if (didTimeout) {
        console.warn(
          `[PlaybackResolver] TX custom resolution timed out after ${TX_DIRECT_RESOLUTION_TIMEOUT_MS}ms, switching to fallback candidate search`,
        )
      }

      txFallbackCandidates = await collectTencentFallbackCandidates(track)
      for (const candidate of txFallbackCandidates) {
        const candidateCustomResolution = await resolveCustomOnly(candidate, options)
        if (!candidateCustomResolution) continue
        return {
          ...candidateCustomResolution,
          matchedTrack: candidate,
        }
      }

      if (didTimeout) {
        const delayedResolution = await customResolutionTask
        if (delayedResolution) return delayedResolution
      }
    } else {
      const customResolution = await resolveCustomOnly(track, options)
      if (customResolution) return customResolution
    }

    throw createNoAvailableSourceError(track, channel)
  }

  return {
    resolve,
  }
}
