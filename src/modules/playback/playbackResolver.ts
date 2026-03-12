import { useScriptRuntime } from '../../composables/useScriptRuntime'
import { useSettingsStore } from '../../store/settings'
import { useUserSourceStore } from '../../stores/userSource'
import type { MusicInfo } from '../../types/music'
import { resolveMusicChannel, type PlaybackResolution, type PlaybackResolver } from './types'
import { resolveWithBuiltinSource } from './resolvers/builtinResolver'
import { resolveWithCrossSourceFallback } from './resolvers/crossSourceFallbackResolver'
import { resolveWithCustomSources } from './resolvers/customSourceResolver'
import { getChannelFailureSummary } from '../source-health/store'

export function usePlaybackResolver(): PlaybackResolver {
  const userSourceStore = useUserSourceStore()
  const settingsStore = useSettingsStore()
  const scriptRuntime = useScriptRuntime()

  async function resolveInternal(track: MusicInfo): Promise<PlaybackResolution | null> {
    const customResolution = await resolveWithCustomSources(track, {
      userSourceStore,
      settingsStore,
      scriptRuntime,
    })
    if (customResolution) return customResolution

    const preferredAudioQuality = settingsStore.settings.audioQuality
    const builtInResolution = await resolveWithBuiltinSource(track, preferredAudioQuality)
    if (builtInResolution) return builtInResolution

    return resolveWithCrossSourceFallback(track, resolveInternal)
  }

  async function resolve(track: MusicInfo): Promise<PlaybackResolution> {
    const resolution = await resolveInternal(track)
    if (resolution) return resolution

    if (track.url) {
      return {
        url: track.url,
        channel: resolveMusicChannel(track),
        resolver: 'direct-url',
      }
    }

    const channel = resolveMusicChannel(track)
    const failureSummary = getChannelFailureSummary(
      channel,
      'musicUrl',
      userSourceStore.enabledSources,
    )

    throw new Error(
      failureSummary
        ? `未获取到可播放链接: ${failureSummary}`
        : `未获取到可播放链接: ${track.name} - source: ${track.source}, songmid: ${track.songmid || 'N/A'}`,
    )
  }

  return {
    resolve,
  }
}
