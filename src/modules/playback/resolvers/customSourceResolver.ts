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
  MAX_CUSTOM_SOURCE_ATTEMPTS,
  resolveMusicChannel,
  getCustomSourceQualityCandidates,
  toScriptMusicInfo,
  type PlaybackResolution,
} from '../types'
import type { MusicInfo } from '../../../types/music'
import { canUsePlaybackUrl } from '../urlProbe'

interface CustomSourceResolverDeps {
  userSourceStore: ReturnType<typeof useUserSourceStore>
  settingsStore: ReturnType<typeof useSettingsStore>
  scriptRuntime: ReturnType<typeof useScriptRuntime>
}

export async function resolveWithCustomSources(
  track: MusicInfo,
  deps: CustomSourceResolverDeps,
): Promise<PlaybackResolution | null> {
  if (!deps.userSourceStore.isLoaded) {
    await deps.userSourceStore.loadUserSources()
  }

  const channel = resolveMusicChannel(track)
  const activeUserSourceId = deps.settingsStore.settings.activeUserSourceId
  const boundUserSourceId = track.playbackUserSourceId
  const enabledSources = deps.userSourceStore.enabledSources
  const sourcesToTry = orderSourcesForAction(
    channel,
    'musicUrl',
    enabledSources,
    boundUserSourceId || activeUserSourceId || undefined,
  ).slice(0, MAX_CUSTOM_SOURCE_ATTEMPTS)

  if (!sourcesToTry.length) return null

  await deps.scriptRuntime.initialize()
  const scriptInfo = toScriptMusicInfo(track, channel)

  for (const userSource of sourcesToTry) {
    const qualityCandidates = getCustomSourceQualityCandidates(
      track,
      channel,
      userSource,
      deps.settingsStore.settings.audioQuality,
    )
    let lastSourceError = ''

    for (const quality of qualityCandidates) {
      try {
        const url = await deps.scriptRuntime.getMusicUrl(channel, scriptInfo, quality, userSource.id)
        if (!url) {
          lastSourceError = `未返回播放地址 (${quality})`
          continue
        }
        if (!(await canUsePlaybackUrl(url))) {
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
}
