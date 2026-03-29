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
  compareSearchTracks,
  decorateTrackForPlayback,
} from './normalize'
import type { SearchRuntimeSnapshot, UserSourceOption } from './types'
import type { SearchRequest } from './types'

const AGGREGATE_CHANNELS: BuiltInSearchChannel[] = ['tx', 'wy', 'kg', 'kw', 'mg']
const DEFAULT_SEARCH_TIMEOUT_MS = 12000
const AGGREGATE_SEARCH_TIMEOUT_MS = 5000

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
  void settingsStore

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
        'built-in-search'
      )
    )
  }

  async function refreshAvailability(): Promise<SearchRuntimeSnapshot> {
    let builtInChannelIds: BuiltInSearchChannel[] = ['kw']
    const scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities'] = {}

    if (!isTauriContext()) {
      return { builtInChannelIds, scriptCapabilities }
    }

    try {
      builtInChannelIds = (await invoke<BuiltInSearchChannel[]>('get_available_sources'))
        .filter((channel) => AGGREGATE_CHANNELS.includes(channel))
    } catch (error) {
      console.error('Failed to load built-in channels:', error)
    }

    return {
      builtInChannelIds,
      scriptCapabilities,
    }
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
    return new Set<SearchChannel>([
      ...snapshot.builtInChannelIds,
      ...getCustomSearchChannelIds(snapshot.scriptCapabilities, selectedUserSourceId),
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

  async function searchAggregateTracks(request: SearchRequest): Promise<SearchResult> {
    if (!isTauriContext()) {
      return {
        data: [],
        total: 0,
        channel: 'all',
        page: request.page,
        hasMore: false,
      }
    }

    const availability = await refreshAvailability()
    const channels = availability.builtInChannelIds

    if (!channels.length) {
      return {
        data: [],
        total: 0,
        channel: 'all',
        page: request.page,
        hasMore: false,
      }
    }

    const channelResults = await Promise.allSettled(
      channels.map(async (channel) => ({
        channel,
        data: await searchBuiltInChannel(
          channel,
          request.keyword,
          request.page,
          request.limit,
          AGGREGATE_SEARCH_TIMEOUT_MS,
        ),
      })),
    )

    const successfulResults = channelResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : []
    )
    const failedResults = channelResults.flatMap((result, index) =>
      result.status === 'rejected'
        ? [{
          channel: channels[index],
          reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
        }]
        : []
    )

    if (failedResults.length > 0) {
      console.warn('[Search] Aggregate search skipped failed channels:', failedResults)
    }

    if (successfulResults.length === 0) {
      const reasonSummary = failedResults
        .map(({ channel, reason }) => `${channel}: ${reason}`)
        .join('；')
      throw new Error(
        reasonSummary
          ? `综合搜索失败，所有渠道均不可用（${reasonSummary}）`
          : '综合搜索失败，请稍后重试'
      )
    }

    const merged = successfulResults
      .flatMap((item) => item.data)
      .sort((left, right) => compareSearchTracks(left, right, request.keyword))

    return {
      data: merged,
      total: merged.length,
      channel: 'all',
      page: request.page,
      hasMore: successfulResults.some((item) => item.data.length >= request.limit),
    }
  }

  async function searchTracks(request: SearchRequest): Promise<SearchResult> {
    if (request.channel === 'all') {
      return searchAggregateTracks(request)
    }

    const builtInResults = await searchBuiltinTracks(request)
    return buildSearchResultPayload(
      builtInResults,
      request.channel,
      request.page,
      request.limit,
    )
  }

  return {
    refreshAvailability,
    getUserSourceOptions,
    getPreferredPlaybackUserSourceId,
    getCustomSearchChannelIds,
    getAvailableChannelSet,
    searchBuiltinTracks,
    searchAggregateTracks,
    searchTracks,
  }
}
