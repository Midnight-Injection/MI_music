import type { MusicSource, ScriptMusicInfo } from '../../composables/useScriptRuntime'
import type { MusicInfo } from '../../types/music'
import type { AudioQuality } from '../../types/settings'

export interface PlaybackResolution {
  url: string
  channel: MusicSource
  quality?: string
  resolver: 'custom-source' | 'built-in' | 'cross-source-fallback' | 'direct-url'
  userSourceId?: string
}

export interface PlaybackResolver {
  resolve(track: MusicInfo): Promise<PlaybackResolution>
}

export const MAX_CUSTOM_SOURCE_ATTEMPTS = 3
export const MAX_QUALITY_ATTEMPTS_PER_SOURCE = 2
export const CROSS_SOURCE_FALLBACK_CHANNELS: MusicSource[] = ['tx', 'mg', 'wy', 'kw']
const AUDIO_QUALITY_PREFERENCES: Record<AudioQuality, string[]> = {
  standard: ['128k', '320k', 'flac', 'flac24bit'],
  high: ['320k', '128k', 'flac', 'flac24bit'],
  lossless: ['flac24bit', 'flac', '320k', '128k'],
}

const SOURCE_ID_MAP: Record<string, MusicSource> = {
  kw: 'kw',
  kg: 'kg',
  tx: 'tx',
  wy: 'wy',
  mg: 'mg',
}

export function resolveMusicChannel(music: MusicInfo): MusicSource {
  const preferredChannel = music.searchChannel || music.source
  if (preferredChannel && SOURCE_ID_MAP[preferredChannel]) {
    return SOURCE_ID_MAP[preferredChannel]
  }

  if (music.id) {
    const sourcePart = music.id.split('_')[0]
    if (SOURCE_ID_MAP[sourcePart]) return SOURCE_ID_MAP[sourcePart]
  }

  return 'kw'
}

export function resolvePlaybackQualities(
  music: MusicInfo,
  preferredAudioQuality: AudioQuality = 'high',
): string[] {
  const availableQualities = (music.qualities || [])
    .map(item => item.type)
    .filter(Boolean)

  const result: string[] = []
  const append = (quality?: string) => {
    if (!quality || result.includes(quality)) return
    result.push(quality)
  }
  const preferredOrder = AUDIO_QUALITY_PREFERENCES[preferredAudioQuality] || AUDIO_QUALITY_PREFERENCES.high

  if (availableQualities.length > 0) {
    for (const quality of preferredOrder) {
      if (availableQualities.includes(quality)) append(quality)
    }

    availableQualities.forEach(append)
    return result.length ? result : [...preferredOrder]
  }

  for (const quality of preferredOrder) {
    append(quality)
  }

  return result.length ? result : ['128k']
}

export function getCustomSourceQualityCandidates(
  music: MusicInfo,
  channel: MusicSource,
  source: { sources?: Record<string, { qualitys?: string[] }> },
  preferredAudioQuality: AudioQuality = 'high',
): string[] {
  const candidates = resolvePlaybackQualities(music, preferredAudioQuality)
  const declaredQualities = source.sources?.[channel]?.qualitys?.filter(Boolean) || []

  if (!declaredQualities.length) {
    return candidates.slice(0, MAX_QUALITY_ATTEMPTS_PER_SOURCE)
  }

  const orderedDeclared = declaredQualities.filter(quality => candidates.includes(quality))
  const remaining = candidates.filter(quality => !orderedDeclared.includes(quality))

  return [...orderedDeclared, ...remaining].slice(0, MAX_QUALITY_ATTEMPTS_PER_SOURCE)
}

export function toScriptMusicInfo(music: MusicInfo, sourceId: MusicSource): ScriptMusicInfo {
  const info: ScriptMusicInfo = {
    name: music.name,
    singer: music.artist,
    albumName: music.album,
    interval: music.duration,
    source: sourceId,
  }

  if (music.albumId) info.albumId = music.albumId
  if (music.strMediaMid) info.strMediaMid = music.strMediaMid
  if (music.copyrightId) info.copyrightId = music.copyrightId
  if (sourceId === 'kg') info.hash = music.hash || music.songmid
  else info.songmid = music.songmid

  if (!info.songmid && !info.hash && music.id) {
    const parts = music.id.split('_')
    if (parts.length >= 2) {
      if (sourceId === 'kg') info.hash = parts.slice(1).join('_')
      else info.songmid = parts.slice(1).join('_')
    }
  }

  return info
}
