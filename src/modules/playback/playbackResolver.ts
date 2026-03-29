import { useScriptRuntime } from '../../composables/useScriptRuntime'
import { useSettingsStore } from '../../store/settings'
import { useUserSourceStore } from '../../stores/userSource'
import type { MusicInfo } from '../../types/music'
import { resolveMusicChannel, type PlaybackResolution, type PlaybackResolver } from './types'
import { resolveWithCustomSources } from './resolvers/customSourceResolver'
import { resolveWithBuiltinSource } from './resolvers/builtinResolver'
import { getChannelFailureSummary } from '../source-health/store'
import { canUsePlaybackUrl } from './urlProbe'

export function usePlaybackResolver(): PlaybackResolver {
  const userSourceStore = useUserSourceStore()
  const settingsStore = useSettingsStore()
  const scriptRuntime = useScriptRuntime()

  async function resolveCustomOnly(track: MusicInfo): Promise<PlaybackResolution | null> {
    return resolveWithCustomSources(track, {
      userSourceStore,
      settingsStore,
      scriptRuntime,
    })
  }

  async function resolve(track: MusicInfo): Promise<PlaybackResolution> {
    const directUrl = track.url?.trim()
    if (directUrl && (await canUsePlaybackUrl(directUrl))) {
      return {
        url: directUrl,
        channel: resolveMusicChannel(track),
        resolver: 'direct-url',
      }
    }

    const customResolution = await resolveCustomOnly(track)
    if (customResolution) return customResolution

    const builtinResolution = await resolveWithBuiltinSource(
      track,
      settingsStore.settings.audioQuality,
    )
    if (builtinResolution) return builtinResolution

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
