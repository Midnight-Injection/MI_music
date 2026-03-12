import type { ScriptCapability } from '../../composables/useScriptRuntime'
import type {
  ChannelSearchResultItem,
  MusicInfo,
  QualityInfo,
  SearchChannel,
} from '../../types/music'

export type SearchTrack = MusicInfo

export interface SearchProvider {
  channel: SearchChannel
  search(keyword: string, page: number, limit: number): Promise<SearchTrack[]>
}

export interface SearchRuntimeSnapshot {
  builtInChannelIds: SearchChannel[]
  scriptCapabilities: Record<string, ScriptCapability>
}

export interface SearchRequest {
  keyword: string
  channel: SearchChannel
  page: number
  limit: number
  selectedUserSourceId?: string
  preferredPlaybackUserSourceId?: string
}

export interface UserSourceOption {
  id: string
  name: string
  canSearch: boolean
  channels: string[]
}

export type ScriptSearchResultItem = Partial<ChannelSearchResultItem> & {
  singer?: string
  artist?: string
  album?: string
  albumName?: string
  album_name?: string
  interval?: string | number
  img?: string
  pic?: string
  cover?: string
  songmid?: string
  mid?: string
  hash?: string
  strMediaMid?: string
  copyrightId?: string
  albumId?: string
  album_id?: string
  source?: string
  type?: string
  __sourceChannel?: string
  qualitys?: string[] | QualityInfo[]
}
