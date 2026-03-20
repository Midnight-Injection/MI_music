import type {
  BuiltInSearchChannel,
  ChannelSearchResultItem,
  MusicInfo,
  QualityInfo,
  SearchChannel,
} from '../../types/music'
import type { ScriptSearchResultItem } from './types'

const SEARCH_CHANNEL_TIEBREAK_ORDER: BuiltInSearchChannel[] = ['tx', 'wy', 'kg', 'kw', 'mg']

export function parseDuration(interval?: string | number): number {
  if (typeof interval === 'number') return interval
  if (!interval) return 0

  const parts = String(interval).split(':').map(value => Number(value) || 0)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}

export function normalizeQualities(qualities?: unknown): QualityInfo[] | undefined {
  if (!Array.isArray(qualities) || qualities.length === 0) return undefined

  return qualities.map((quality) => {
    if (quality && typeof quality === 'object' && 'type' in quality) {
      const item = quality as QualityInfo
      return {
        type: String(item.type || ''),
        size: String(item.size || ''),
      }
    }

    return {
      type: String(quality || ''),
      size: '',
    }
  })
}

export function getScriptItemChannel(
  item: ScriptSearchResultItem,
  fallbackChannel: SearchChannel,
): SearchChannel {
  return String(item.source || item.type || item.__sourceChannel || fallbackChannel) as SearchChannel
}

export function decorateTrackForPlayback(
  track: MusicInfo,
  searchChannel: SearchChannel,
  resolvedBy: MusicInfo['resolvedBy'],
  preferredPlaybackUserSourceId?: string,
): MusicInfo {
  return {
    ...track,
    searchChannel,
    resolvedBy,
    playbackUserSourceId: preferredPlaybackUserSourceId,
  }
}

export function normalizeChannelSearchResult(item: ChannelSearchResultItem): MusicInfo {
  return {
    id: item.id,
    name: item.name,
    artist: item.singer,
    album: item.album_name,
    duration: parseDuration(item.interval),
    url: '',
    cover: item.img,
    source: item.source,
    songmid: item.songmid,
    hash: item.hash || (item.source === 'kg' ? item.songmid : undefined),
    strMediaMid: item.str_media_mid,
    copyrightId: item.copyright_id,
    albumId: item.album_id,
    qualities: item.types,
    resolvedBy: 'built-in-search',
  }
}

export function normalizeScriptSearchResult(
  item: ScriptSearchResultItem,
  fallbackChannel: SearchChannel,
): MusicInfo {
  const source = getScriptItemChannel(item, fallbackChannel)
  const songmid = String(item.songmid || item.mid || item.id || item.hash || '')
  const id = String(item.id || `${source}_${songmid || `${item.name || 'unknown'}_${item.artist || item.singer || ''}`}`)

  return {
    id,
    name: String(item.name || ''),
    artist: String(item.singer || item.artist || ''),
    album: String(item.album_name || item.albumName || item.album || ''),
    duration: parseDuration(item.interval),
    url: '',
    cover: item.img || item.pic || item.cover || undefined,
    source,
    songmid: songmid || undefined,
    hash: item.hash || (source === 'kg' ? songmid : undefined),
    strMediaMid: String(item.strMediaMid || item.str_media_mid || '') || undefined,
    copyrightId: String(item.copyrightId || item.copyright_id || '') || undefined,
    albumId: String(item.album_id || item.albumId || '') || undefined,
    qualities: normalizeQualities(item.types || item.qualitys),
    resolvedBy: 'custom-search',
  }
}

export function buildMusicIdentity(music: MusicInfo): string {
  const channel = music.searchChannel || music.source || 'unknown'
  const songKey = music.hash || music.songmid || music.id
  return `${channel}:${songKey}:${music.name}:${music.artist}`
}

export function normalizeSearchText(value?: string | number | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)|（[^）]*）/g, '')
    .replace(/[\s\-_/\\|.,!?:;'""`~@#$%^&*+=<>{}\[\]()]+/g, '')
    .trim()
}

export function getSearchMatchScore(track: MusicInfo, keyword: string): number {
  const query = normalizeSearchText(keyword)
  const name = normalizeSearchText(track.name)
  const artist = normalizeSearchText(track.artist)
  const album = normalizeSearchText(track.album)
  const nameArtist = `${name}${artist}`
  const artistName = `${artist}${name}`

  if (!query) return 0

  let score = 0
  if (nameArtist === query || artistName === query) score += 1400
  if (name === query) score += 1100
  if (artist === query) score += 700
  if (album === query) score += 200

  if (name.startsWith(query)) score += 500
  else if (name.includes(query)) score += 360

  if (artist.startsWith(query)) score += 220
  else if (artist.includes(query)) score += 160

  if (album.includes(query)) score += 80
  if (nameArtist.includes(query) || artistName.includes(query)) score += 120

  const queryTerms = String(keyword)
    .toLowerCase()
    .split(/\s+/)
    .map(term => normalizeSearchText(term))
    .filter(Boolean)

  for (const term of queryTerms) {
    if (name === term) score += 160
    else if (name.includes(term)) score += 90

    if (artist === term) score += 100
    else if (artist.includes(term)) score += 55

    if (album.includes(term)) score += 20
  }

  return score
}

export function compareSearchTracks(
  left: MusicInfo,
  right: MusicInfo,
  keyword: string,
): number {
  const scoreDelta = getSearchMatchScore(right, keyword) - getSearchMatchScore(left, keyword)
  if (scoreDelta !== 0) return scoreDelta

  const leftChannel = String(left.source || left.searchChannel || '')
  const rightChannel = String(right.source || right.searchChannel || '')
  const leftIndex = SEARCH_CHANNEL_TIEBREAK_ORDER.indexOf(leftChannel as BuiltInSearchChannel)
  const rightIndex = SEARCH_CHANNEL_TIEBREAK_ORDER.indexOf(rightChannel as BuiltInSearchChannel)
  if (leftIndex !== rightIndex) {
    return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
      (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
  }

  return String(left.id).localeCompare(String(right.id))
}
