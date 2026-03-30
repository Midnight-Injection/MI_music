import type { useScriptRuntime, MusicSource } from '../../../composables/useScriptRuntime'
import type { useSettingsStore } from '../../../store/settings'
import type { useUserSourceStore } from '../../../stores/userSource'
import {
  getChannelFailureSummary,
  markSourceFailure,
  markSourceSuccess,
  normalizeSourceErrorMessage,
  orderSourcesForAction,
} from '../../source-health/store'
import {
  resolveMusicChannel,
  getCustomSourceQualityCandidates,
  toScriptMusicInfo,
  type PlaybackResolution,
  type PlaybackResolveOptions,
} from '../types'
import type { BuiltInSearchChannel, MusicInfo } from '../../../types/music'
import { buildTrackSourceCacheKey } from '../trackIdentity'
import { canUsePlaybackUrl, hasFreshPlaybackUrlProbeSuccess } from '../urlProbe'
import { getCachedPreferredSourceRecord } from '../sourceSuccessCache'
import { buildTrackSearchKeyword, pickMatchedTrack } from '../matchedTrack'
import { normalizeScriptSearchResult } from '../../search/normalize'
import { getBlockedSourceIdsForTrack } from '../badSourceBlacklist'

interface CustomSourceResolverDeps {
  userSourceStore: ReturnType<typeof useUserSourceStore>
  settingsStore: ReturnType<typeof useSettingsStore>
  scriptRuntime: ReturnType<typeof useScriptRuntime>
}

const CUSTOM_RESOLUTION_CACHE_TTL_MS = 10 * 60 * 1000
const CUSTOM_SOURCE_PARALLEL_BATCH_SIZE = 3

interface CachedCustomResolutionRecord {
  expiresAt: number
  resolution: PlaybackResolution
}

const customResolutionCache = new Map<string, CachedCustomResolutionRecord>()
const pendingCustomResolutions = new Map<string, Promise<PlaybackResolution | null>>()

function readCachedCustomResolution(
  cacheKey: string,
  preferredSourceId: string | undefined,
  enabledSourceIds: string[]
): PlaybackResolution | null {
  const record = customResolutionCache.get(cacheKey)
  if (!record) return null

  if (record.expiresAt <= Date.now()) {
    customResolutionCache.delete(cacheKey)
    return null
  }

  if (!record.resolution.userSourceId) return null
  if (!enabledSourceIds.includes(record.resolution.userSourceId)) return null
  if (preferredSourceId && record.resolution.userSourceId !== preferredSourceId) return null

  return record.resolution
}

function writeCachedCustomResolution(cacheKey: string, resolution: PlaybackResolution) {
  customResolutionCache.set(cacheKey, {
    resolution,
    expiresAt: Date.now() + CUSTOM_RESOLUTION_CACHE_TTL_MS,
  })
}

export function clearCachedCustomResolution(
  track: MusicInfo,
  targetQuality: string,
  sourceId?: string
) {
  const keyPrefix = `${buildTrackSourceCacheKey(track, targetQuality)}:`

  for (const [cacheKey, record] of customResolutionCache.entries()) {
    if (!cacheKey.startsWith(keyPrefix)) continue
    if (sourceId && record.resolution.userSourceId !== sourceId) continue
    customResolutionCache.delete(cacheKey)
  }

  for (const cacheKey of pendingCustomResolutions.keys()) {
    if (!cacheKey.startsWith(keyPrefix)) continue
    pendingCustomResolutions.delete(cacheKey)
  }
}

function prioritizeQuality(candidates: string[], preferredQuality?: string) {
  if (!preferredQuality || !candidates.includes(preferredQuality)) return candidates
  return [preferredQuality, ...candidates.filter((quality) => quality !== preferredQuality)]
}

function getSourceActionChannels(
  source: { sources?: Record<string, { actions?: string[] }> },
  action: 'search' | 'musicUrl'
): MusicSource[] {
  return Object.entries(source.sources || {})
    .filter(([, info]) => info.actions?.includes(action))
    .map(([channel]) => channel as MusicSource)
}

function isBuiltInSearchChannel(channel: MusicSource): channel is BuiltInSearchChannel {
  return channel === 'kw' || channel === 'kg' || channel === 'tx' || channel === 'wy' || channel === 'mg'
}

async function tryResolveTrackFromSource(
  track: MusicInfo,
  channel: ReturnType<typeof resolveMusicChannel>,
  userSource: CustomSourceResolverDeps['userSourceStore']['enabledSources'][number],
  deps: CustomSourceResolverDeps,
  cachedPreferredSource: ReturnType<typeof getCachedPreferredSourceRecord>,
  shouldIgnoreResult?: () => boolean
): Promise<PlaybackResolution | null> {
  const scriptInfo = toScriptMusicInfo(track, channel)
  const qualityCandidates = prioritizeQuality(
    getCustomSourceQualityCandidates(
      track,
      channel,
      userSource,
      deps.settingsStore.settings.audioQuality
    ),
    cachedPreferredSource?.sourceId === userSource.id
      ? cachedPreferredSource.actualQuality
      : undefined
  )
  let lastSourceError = ''

  for (const quality of qualityCandidates) {
    try {
      const url = await deps.scriptRuntime.getMusicUrl(channel, scriptInfo, quality, userSource.id)
      if (shouldIgnoreResult?.()) return null
      if (!url) {
        lastSourceError = `未返回播放地址 (${quality})`
        continue
      }

      const usable = hasFreshPlaybackUrlProbeSuccess(url) || (await canUsePlaybackUrl(url))
      if (shouldIgnoreResult?.()) return null
      if (!usable) {
        if (channel === 'tx') {
          console.warn('[PlaybackResolver] TX custom-source returned unusable url:', {
            userSourceId: userSource.id,
            quality,
            url,
          })
        }
        lastSourceError = `播放地址不可用 (${quality})`
        continue
      }

      markSourceSuccess(channel, 'musicUrl', userSource.id)
      return {
        url,
        channel,
        quality,
        resolver: 'custom-source',
        userSourceId: userSource.id,
      }
    } catch (error) {
      if (shouldIgnoreResult?.()) return null
      lastSourceError = normalizeSourceErrorMessage(error)
    }
  }

  if (!shouldIgnoreResult?.()) {
    markSourceFailure(channel, 'musicUrl', userSource.id, lastSourceError || '自定义音源解析失败')
  }

  return null
}

async function tryResolveMatchedTrackFromSearch(
  track: MusicInfo,
  preferredChannel: BuiltInSearchChannel,
  userSource: CustomSourceResolverDeps['userSourceStore']['enabledSources'][number],
  deps: CustomSourceResolverDeps,
  cachedPreferredSource: ReturnType<typeof getCachedPreferredSourceRecord>,
  shouldIgnoreResult?: () => boolean
): Promise<PlaybackResolution | null> {
  const keyword = buildTrackSearchKeyword(track)
  if (!keyword) return null

  const supportedSearchChannels = getSourceActionChannels(userSource, 'search')
    .filter(isBuiltInSearchChannel)
  if (!supportedSearchChannels.length) return null

  const searchChannelSequence = supportedSearchChannels.includes(preferredChannel)
    ? [preferredChannel, ...supportedSearchChannels.filter((channel) => channel !== preferredChannel)]
    : supportedSearchChannels

  for (const searchChannel of searchChannelSequence) {
    try {
      const rawResults = await deps.scriptRuntime.search(userSource.id, keyword, 1, 12, searchChannel)
      if (shouldIgnoreResult?.()) return null

      const candidates = rawResults.map((item) => normalizeScriptSearchResult(item, searchChannel))
      const matchedTrack = pickMatchedTrack(track, candidates)
      if (!matchedTrack) continue

      const matchedChannel = resolveMusicChannel(matchedTrack)
      const resolution = await tryResolveTrackFromSource(
        matchedTrack,
        matchedChannel,
        userSource,
        deps,
        cachedPreferredSource,
        shouldIgnoreResult
      )
      if (resolution) {
        return {
          ...resolution,
          matchedTrack,
        }
      }
    } catch (error) {
      if (shouldIgnoreResult?.()) return null
      console.warn(
        '[PlaybackResolver] Custom source matched search failed:',
        userSource.id,
        searchChannel,
        error instanceof Error ? error.message : String(error)
      )
    }
  }

  return null
}

async function tryResolveSource(
  track: MusicInfo,
  channel: ReturnType<typeof resolveMusicChannel>,
  userSource: CustomSourceResolverDeps['userSourceStore']['enabledSources'][number],
  deps: CustomSourceResolverDeps,
  cachedPreferredSource: ReturnType<typeof getCachedPreferredSourceRecord>,
  shouldIgnoreResult?: () => boolean
): Promise<PlaybackResolution | null> {
  const directResolution = await tryResolveTrackFromSource(
    track,
    channel,
    userSource,
    deps,
    cachedPreferredSource,
    shouldIgnoreResult
  )
  if (directResolution) return directResolution

  const matchedResolution = await tryResolveMatchedTrackFromSearch(
    track,
    isBuiltInSearchChannel(channel) ? channel : 'kw',
    userSource,
    deps,
    cachedPreferredSource,
    shouldIgnoreResult
  )
  if (matchedResolution) return matchedResolution

  return null
}

async function resolveSourceBatch(
  sources: CustomSourceResolverDeps['userSourceStore']['enabledSources'],
  resolveSource: (
    source: CustomSourceResolverDeps['userSourceStore']['enabledSources'][number],
    shouldIgnoreResult: () => boolean
  ) => Promise<PlaybackResolution | null>
): Promise<PlaybackResolution | null> {
  if (!sources.length) return null

  return new Promise((resolve) => {
    let settled = false
    let completed = 0
    const shouldIgnoreResult = () => settled

    const onComplete = (result: PlaybackResolution | null) => {
      if (settled) return

      if (result) {
        settled = true
        resolve(result)
        return
      }

      completed += 1
      if (completed >= sources.length) {
        resolve(null)
      }
    }

    for (const source of sources) {
      void resolveSource(source, shouldIgnoreResult)
        .then(onComplete)
        .catch(() => {
          onComplete(null)
        })
    }
  })
}

export async function resolveWithCustomSources(
  track: MusicInfo,
  deps: CustomSourceResolverDeps,
  options: PlaybackResolveOptions = {}
): Promise<PlaybackResolution | null> {
  if (!deps.userSourceStore.isLoaded) {
    await deps.userSourceStore.loadUserSources()
  }

  const channel = resolveMusicChannel(track)
  const excludedSourceIds = new Set([
    ...(options.excludedSourceIds || []),
    ...getBlockedSourceIdsForTrack(track),
  ])
  const enabledSources = deps.userSourceStore.enabledSources.filter(
    (source) => !excludedSourceIds.has(source.id)
  )
  const enabledSourceIds = enabledSources.map((source) => source.id)
  const cachedPreferredSource = getCachedPreferredSourceRecord(
    track,
    deps.settingsStore.settings.audioQuality,
    enabledSourceIds
  )
  const preferredSourceId =
    cachedPreferredSource?.sourceId ||
    track.playbackUserSourceId ||
    deps.settingsStore.settings.activeUserSourceId
  const resolutionCacheKey = `${buildTrackSourceCacheKey(track, deps.settingsStore.settings.audioQuality)}:${preferredSourceId || 'auto'}`

  const cachedResolution = readCachedCustomResolution(
    resolutionCacheKey,
    preferredSourceId,
    enabledSourceIds
  )
  if (cachedResolution) {
    return cachedResolution
  }

  const pendingResolution = pendingCustomResolutions.get(resolutionCacheKey)
  if (pendingResolution) {
    return pendingResolution
  }

  const resolutionTask = (async () => {
    const sourcesToTry = orderSourcesForAction(
      channel,
      'musicUrl',
      enabledSources,
      preferredSourceId
    )

    if (!sourcesToTry.length) return null

    await deps.scriptRuntime.initialize()

    if (channel === 'tx') {
      const scriptInfo = toScriptMusicInfo(track, channel)
      console.info('[PlaybackResolver] TX custom-source context:', {
        name: track.name,
        artist: track.artist,
        songmid: scriptInfo.songmid,
        mid: scriptInfo.mid,
        strMediaMid: scriptInfo.strMediaMid,
        mediaMid: scriptInfo.mediaMid,
        songId: scriptInfo.songId,
        msgId: scriptInfo.msgId,
        copyrightId: scriptInfo.copyrightId,
        albumId: scriptInfo.albumId,
      })
    }

    const preferredSource = preferredSourceId
      ? sourcesToTry.find((source) => source.id === preferredSourceId)
      : undefined

    if (preferredSource) {
      const preferredResolution = await tryResolveSource(
        track,
        channel,
        preferredSource,
        deps,
        cachedPreferredSource
      )
      if (preferredResolution) {
        writeCachedCustomResolution(resolutionCacheKey, preferredResolution)
        return preferredResolution
      }
    }

    const fallbackSources = preferredSource
      ? sourcesToTry.filter((source) => source.id !== preferredSource.id)
      : sourcesToTry

    for (let index = 0; index < fallbackSources.length; index += CUSTOM_SOURCE_PARALLEL_BATCH_SIZE) {
      const sourceBatch = fallbackSources.slice(index, index + CUSTOM_SOURCE_PARALLEL_BATCH_SIZE)
      const batchResolution = await resolveSourceBatch(sourceBatch, (source, shouldIgnoreResult) =>
        tryResolveSource(track, channel, source, deps, cachedPreferredSource, shouldIgnoreResult)
      )

      if (batchResolution) {
        writeCachedCustomResolution(resolutionCacheKey, batchResolution)
        return batchResolution
      }
    }

    const failureSummary = getChannelFailureSummary(channel, 'musicUrl', sourcesToTry)
    if (failureSummary) {
      console.warn('[PlaybackResolver] Custom source resolution failed:', channel, failureSummary)
    }

    return null
  })()

  pendingCustomResolutions.set(resolutionCacheKey, resolutionTask)

  try {
    return await resolutionTask
  } finally {
    pendingCustomResolutions.delete(resolutionCacheKey)
  }
}
