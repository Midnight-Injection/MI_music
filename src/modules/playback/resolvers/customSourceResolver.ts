import type { useScriptRuntime } from '../../../composables/useScriptRuntime'
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
} from '../types'
import type { MusicInfo } from '../../../types/music'
import { buildTrackSourceCacheKey } from '../trackIdentity'
import { canUsePlaybackUrl, hasFreshPlaybackUrlProbeSuccess } from '../urlProbe'
import { getCachedPreferredSourceRecord } from '../sourceSuccessCache'

interface CustomSourceResolverDeps {
  userSourceStore: ReturnType<typeof useUserSourceStore>
  settingsStore: ReturnType<typeof useSettingsStore>
  scriptRuntime: ReturnType<typeof useScriptRuntime>
}

const CUSTOM_RESOLUTION_CACHE_TTL_MS = 10 * 60 * 1000

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

function prioritizeQuality(candidates: string[], preferredQuality?: string) {
  if (!preferredQuality || !candidates.includes(preferredQuality)) return candidates
  return [preferredQuality, ...candidates.filter((quality) => quality !== preferredQuality)]
}

export async function resolveWithCustomSources(
  track: MusicInfo,
  deps: CustomSourceResolverDeps
): Promise<PlaybackResolution | null> {
  if (!deps.userSourceStore.isLoaded) {
    await deps.userSourceStore.loadUserSources()
  }

  const channel = resolveMusicChannel(track)
  const enabledSources = deps.userSourceStore.enabledSources
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
    const scriptInfo = toScriptMusicInfo(track, channel)

    for (const userSource of sourcesToTry) {
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
          const url = await deps.scriptRuntime.getMusicUrl(
            channel,
            scriptInfo,
            quality,
            userSource.id
          )
          if (!url) {
            lastSourceError = `未返回播放地址 (${quality})`
            continue
          }
          const usable = hasFreshPlaybackUrlProbeSuccess(url) || (await canUsePlaybackUrl(url))
          if (!usable) {
            lastSourceError = `播放地址不可用 (${quality})`
            continue
          }

          markSourceSuccess(channel, 'musicUrl', userSource.id)
          const resolution: PlaybackResolution = {
            url,
            channel,
            quality,
            resolver: 'custom-source',
            userSourceId: userSource.id,
          }
          writeCachedCustomResolution(resolutionCacheKey, resolution)
          return resolution
        } catch (error) {
          lastSourceError = normalizeSourceErrorMessage(error)
        }
      }

      markSourceFailure(channel, 'musicUrl', userSource.id, lastSourceError || '自定义音源解析失败')
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
