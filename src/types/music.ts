export type BuiltInSearchChannel = 'kw' | 'kg' | 'tx' | 'wy' | 'mg'
export type SearchChannel = BuiltInSearchChannel | 'all'
export type TrackSource = BuiltInSearchChannel | 'local'

export interface QualityInfo {
  type: string
  size: string
}

export interface UnifiedTrack {
  id: string
  name: string
  artist: string
  album: string
  duration: number
  url: string
  cover?: string
  source?: TrackSource | string
  sourceId?: string
  songmid?: string
  songId?: string
  msgId?: string
  hash?: string
  strMediaMid?: string
  copyrightId?: string
  albumId?: string
  storageSongId?: number
  qualities?: QualityInfo[]
  playbackUserSourceId?: string
  searchChannel?: SearchChannel | string
  resolvedBy?: 'built-in-search' | 'custom-search'
}

export type MusicInfo = UnifiedTrack

export interface ChannelSearchResultItem {
  id: string
  name: string
  singer: string
  source: BuiltInSearchChannel
  songmid: string
  album_id: string
  hash?: string
  song_id?: string
  msg_id?: string
  str_media_mid?: string
  copyright_id?: string
  interval: string
  album_name: string
  types: QualityInfo[]
  img?: string
}

export interface SearchParams {
  keyword: string
  source?: string
  limit?: number
}

export interface SearchResult {
  data: UnifiedTrack[]
  total?: number
  channel: SearchChannel | string
  page?: number
  hasMore?: boolean
}
