import type { ScriptCapability } from '../../composables/useScriptRuntime'
import type {
  BuiltInSearchChannel,
  ChannelSearchResultItem,
  MusicInfo,
  QualityInfo,
  SearchChannel,
  SearchResult,
} from '../../types/music'

export type SearchTrack = MusicInfo

export interface SearchProvider {
  channel: BuiltInSearchChannel
  search(keyword: string, page: number, limit: number): Promise<SearchTrack[]>
}

export interface SearchRuntimeSnapshot {
  builtInChannelIds: BuiltInSearchChannel[]
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

export type AggregateChannelStatus = 'pending' | 'success' | 'failed' | 'timed_out'

export interface AggregateChannelProgress {
  channel: BuiltInSearchChannel
  status: AggregateChannelStatus
  resultCount: number
  error?: string
}

export interface AggregateSearchHandlers {
  onStart?: (channels: BuiltInSearchChannel[]) => void
  onPartial?: (channel: BuiltInSearchChannel, tracks: MusicInfo[]) => void
  onChannelSettled?: (progress: AggregateChannelProgress) => void
  onComplete?: (result: SearchResult) => void
}

export interface SearchStrategyContext {
  searchBuiltInChannel: (
    channel: BuiltInSearchChannel,
    keyword: string,
    page: number,
    limit: number,
    timeoutMs?: number
  ) => Promise<MusicInfo[]>
  getAggregateChannels: () => BuiltInSearchChannel[]
}

export interface SearchExecutionStrategy {
  execute(request: SearchRequest, handlers?: AggregateSearchHandlers): Promise<SearchResult>
}

export type ScriptSearchResultItem = Partial<ChannelSearchResultItem> & {
  singer?: string
  artist?: string
  album?: string
  albumName?: string
  album_name?: string
  interval?: string | number
  duration?: string | number
  dt?: string | number
  img?: string
  pic?: string
  cover?: string
  songmid?: string
  songId?: string | number
  song_id?: string | number
  msgId?: string | number
  msg_id?: string | number
  mid?: string
  hash?: string
  mediaMid?: string
  media_mid?: string
  strMediaMid?: string
  copyrightId?: string
  albumId?: string
  album_id?: string
  source?: string
  type?: string
  __sourceChannel?: string
  qualitys?: string[] | QualityInfo[]
}
