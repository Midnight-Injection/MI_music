import { invoke } from '@tauri-apps/api/core'
import type {
  BuiltInSearchChannel,
  MusicInfo,
  SearchChannel,
  SearchResult,
} from '../../types/music'
import { useSettingsStore } from '../../store/settings'
import { searchBuiltInTracks as searchBuiltInTracksByChannel } from './providers'
import {
  decorateTrackForPlayback,
} from './normalize'
import {
  createAggregateSearchStrategy,
  createSingleChannelSearchStrategy,
} from './strategies'
import type { SearchRuntimeSnapshot, UserSourceOption } from './types'
import type {
  AggregateSearchHandlers,
  SearchRequest,
  SearchExecutionStrategy,
} from './types'

const AGGREGATE_CHANNELS: BuiltInSearchChannel[] = ['tx', 'wy', 'kg', 'kw', 'mg']
const DEFAULT_SEARCH_TIMEOUT_MS = 12000
let cachedRuntimeSnapshot: SearchRuntimeSnapshot | null = null

function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('搜索超时，请稍后重试')), timeoutMs)
    }),
  ])
}

function resolveBuiltInSearchChannel(
  track: MusicInfo,
  fallbackChannel: BuiltInSearchChannel,
): BuiltInSearchChannel {
  const source = track.source
  return AGGREGATE_CHANNELS.includes(source as BuiltInSearchChannel)
    ? source as BuiltInSearchChannel
    : fallbackChannel
}

export function buildSearchResultPayload(
  data: MusicInfo[],
  channel: SearchChannel,
  page: number,
  pageSize: number,
): SearchResult {
  return {
    data,
    total: data.length,
    channel,
    page,
    hasMore: data.length >= pageSize,
  }
}

export function useSearchService() {
  const settingsStore = useSettingsStore()

  function getEnabledBuiltInChannels(): BuiltInSearchChannel[] {
    return settingsStore
      .getEnabledChannelIds()
      .filter((channel): channel is BuiltInSearchChannel =>
        AGGREGATE_CHANNELS.includes(channel as BuiltInSearchChannel),
      )
  }

  async function searchBuiltInChannel(
    channel: BuiltInSearchChannel,
    keyword: string,
    page: number,
    limit: number,
    timeoutMs = DEFAULT_SEARCH_TIMEOUT_MS
  ): Promise<MusicInfo[]> {
    const results = await withTimeout(
      searchBuiltInTracksByChannel(channel, keyword, page, limit),
      timeoutMs
    )

    return results.map((track) =>
      decorateTrackForPlayback(
        track,
        resolveBuiltInSearchChannel(track, channel),
        'built-in-search',
      )
    )
  }

  async function refreshAvailability(force = false): Promise<SearchRuntimeSnapshot> {
    if (!force && cachedRuntimeSnapshot) {
      return cachedRuntimeSnapshot
    }

    let builtInChannelIds: BuiltInSearchChannel[] = ['kw']
    const scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities'] = {}

    if (!isTauriContext()) {
      const snapshot = {
        builtInChannelIds,
        scriptCapabilities,
      }
      cachedRuntimeSnapshot = snapshot
      return snapshot
    }

    try {
      builtInChannelIds = (await invoke<BuiltInSearchChannel[]>('get_available_sources'))
        .filter((channel) => AGGREGATE_CHANNELS.includes(channel))
    } catch (error) {
      console.error('Failed to load built-in channels:', error)
    }

    const enabledChannels = new Set(getEnabledBuiltInChannels())

    builtInChannelIds = builtInChannelIds.filter((channel) => enabledChannels.has(channel))

    const snapshot = {
      builtInChannelIds,
      scriptCapabilities,
    }

    cachedRuntimeSnapshot = snapshot
    return snapshot
  }

  function getUserSourceOptions(
    scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities']
  ): UserSourceOption[] {
    void scriptCapabilities
    return []
  }

  function getPreferredPlaybackUserSourceId(options: {
    selectedUserSourceId?: string
    activeUserSourceId?: string
    scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities']
  }): string | undefined {
    void options
    return undefined
  }

  function getCustomSearchChannelIds(
    scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities'],
    selectedUserSourceId?: string
  ): SearchChannel[] {
    void scriptCapabilities
    void selectedUserSourceId
    return []
  }

  function getAvailableChannelSet(
    snapshot: SearchRuntimeSnapshot,
    selectedUserSourceId?: string
  ): Set<SearchChannel> {
    const channels = [
      ...snapshot.builtInChannelIds,
      ...getCustomSearchChannelIds(snapshot.scriptCapabilities, selectedUserSourceId),
    ]

    return new Set<SearchChannel>([
      ...(snapshot.builtInChannelIds.length ? ['all' as const] : []),
      ...channels,
    ])
  }

  async function searchBuiltinTracks(request: SearchRequest): Promise<MusicInfo[]> {
    if (!isTauriContext()) return []
    if (request.channel === 'all') return []
    return searchBuiltInChannel(
      request.channel as BuiltInSearchChannel,
      request.keyword,
      request.page,
      request.limit,
    )
  }

  function getAggregateChannels(): BuiltInSearchChannel[] {
    const cachedChannels = cachedRuntimeSnapshot?.builtInChannelIds || []
    if (cachedChannels.length) return cachedChannels

    const enabledChannels = getEnabledBuiltInChannels()
    return enabledChannels.length ? enabledChannels : ['kw']
  }

  const singleChannelStrategy: SearchExecutionStrategy = createSingleChannelSearchStrategy({
    searchBuiltInChannel,
    getAggregateChannels,
  })

  const aggregateSearchStrategy: SearchExecutionStrategy = createAggregateSearchStrategy({
    searchBuiltInChannel,
    getAggregateChannels,
  })

  async function searchAggregateTracks(request: SearchRequest): Promise<SearchResult> {
    return aggregateSearchStrategy.execute(request)
  }

  async function runSearch(
    request: SearchRequest,
    handlers?: AggregateSearchHandlers,
  ): Promise<SearchResult> {
    if (request.channel === 'all') {
      return aggregateSearchStrategy.execute(request, handlers)
    }

    return singleChannelStrategy.execute(request)
  }

  async function searchTracks(request: SearchRequest): Promise<SearchResult> {
    return runSearch(request)
  }

  return {
    refreshAvailability,
    getUserSourceOptions,
    getPreferredPlaybackUserSourceId,
    getCustomSearchChannelIds,
    getAvailableChannelSet,
    searchBuiltinTracks,
    searchAggregateTracks,
    runSearch,
    searchTracks,
  }
}
