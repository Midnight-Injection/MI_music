import { invoke } from '@tauri-apps/api/core'
import type { MusicInfo } from '../../../types/music'
import type { AudioQuality } from '../../../types/settings'
import { canUsePlaybackUrl } from '../urlProbe'
import {
  MAX_QUALITY_ATTEMPTS_PER_SOURCE,
  resolveMusicChannel,
  resolvePlaybackQualities,
  type PlaybackResolution,
} from '../types'

export async function resolveWithBuiltinSource(
  track: MusicInfo,
  preferredAudioQuality: AudioQuality = 'high',
): Promise<PlaybackResolution | null> {
  const channel = resolveMusicChannel(track)
  const songId = channel === 'kg' ? (track.hash || track.songmid) : track.songmid
  const qualities = resolvePlaybackQualities(track, preferredAudioQuality)
    .slice(0, MAX_QUALITY_ATTEMPTS_PER_SOURCE)

  if (!songId) return null

  for (const quality of qualities) {
    try {
      const url = await invoke<string>('get_song_url', {
        songId,
        source: channel,
        quality,
        albumId: channel === 'kg' ? track.albumId : undefined,
      })

      if (!url) continue
      if (!(await canUsePlaybackUrl(url))) continue

      return {
        url,
        channel,
        quality,
        resolver: 'built-in',
      }
    } catch (error) {
      console.error(
        '[PlaybackResolver] Built-in resolver failed:',
        channel,
        quality,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return null
}
