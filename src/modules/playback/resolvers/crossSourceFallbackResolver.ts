import { searchBuiltInTracks } from '../../search/providers'
import type { MusicInfo, SearchChannel } from '../../../types/music'
import {
  CROSS_SOURCE_FALLBACK_CHANNELS,
  resolveMusicChannel,
  type PlaybackResolution,
} from '../types'

function normalizeMatchText(value?: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)|（[^）]*）/g, '')
    .replace(/\s+/g, '')
    .trim()
}

function pickCrossSourceCandidate(
  track: MusicInfo,
  results: MusicInfo[],
): MusicInfo | null {
  const targetName = normalizeMatchText(track.name)
  const targetArtist = normalizeMatchText(track.artist)

  const exactMatch = results.find((item) => {
    const itemName = normalizeMatchText(item.name)
    const itemArtist = normalizeMatchText(item.artist)
    return (
      itemName === targetName &&
      (!targetArtist || itemArtist.includes(targetArtist) || targetArtist.includes(itemArtist))
    )
  })

  if (exactMatch) return exactMatch
  return results.find((item) => normalizeMatchText(item.name) === targetName) || null
}

export async function resolveWithCrossSourceFallback(
  track: MusicInfo,
  resolveTrack: (track: MusicInfo) => Promise<PlaybackResolution | null>,
): Promise<PlaybackResolution | null> {
  const channel = resolveMusicChannel(track)
  if (track.crossSourceFallbackAttempted || channel === 'local') return null

  for (const fallbackChannel of CROSS_SOURCE_FALLBACK_CHANNELS) {
    if (fallbackChannel === channel) continue

    try {
      const results = await searchBuiltInTracks(
        fallbackChannel as SearchChannel,
        track.name,
        1,
        5,
      )
      const candidate = pickCrossSourceCandidate(track, results)
      if (!candidate) continue

      const resolution = await resolveTrack({
        ...candidate,
        crossSourceFallbackAttempted: true,
      })

      if (resolution) {
        return {
          ...resolution,
          resolver: 'cross-source-fallback',
        }
      }
    } catch (error) {
      console.warn(
        '[PlaybackResolver] Cross-source fallback failed:',
        channel,
        '->',
        fallbackChannel,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  return null
}
