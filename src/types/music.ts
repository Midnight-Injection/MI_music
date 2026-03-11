export interface QualityInfo {
  type: string
  size: string
}

export interface MusicInfo {
  id: string
  name: string
  artist: string
  album: string
  duration: number
  url: string
  cover?: string
  source?: string
  songmid?: string
  hash?: string
  albumId?: string
  qualities?: QualityInfo[]
  playbackUserSourceId?: string
  searchChannel?: string
  resolvedBy?: 'built-in-search' | 'custom-search'
}

export interface ChannelSearchResultItem {
  id: string
  name: string
  singer: string
  source: string
  songmid: string
  album_id: string
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
  data: MusicInfo[]
  total: number
  channel: string
}
