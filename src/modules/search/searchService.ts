import { invoke } from '@tauri-apps/api/core'
import { useScriptRuntime, type MusicSource } from '../../composables/useScriptRuntime'
import { useUserSourceStore } from '../../stores/userSource'
import type {
  MusicInfo,
  SearchChannel,
  SearchResult,
} from '../../types/music'
import { searchBuiltInTracks } from './providers'
import {
  buildMusicIdentity,
  decorateTrackForPlayback,
  getScriptItemChannel,
  normalizeScriptSearchResult,
} from './normalize'
import type {
  ScriptSearchResultItem,
  SearchRequest,
  SearchRuntimeSnapshot,
  UserSourceOption,
} from './types'

function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('搜索超时，请稍后重试')), timeoutMs)
    }),
  ])
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
  const userSourceStore = useUserSourceStore()
  const scriptRuntime = useScriptRuntime()

  async function refreshAvailability(): Promise<SearchRuntimeSnapshot> {
    let builtInChannelIds: SearchChannel[] = ['kw']
    let scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities'] = {}

    if (!isTauriContext()) {
      return { builtInChannelIds, scriptCapabilities }
    }

    try {
      builtInChannelIds = await invoke<SearchChannel[]>('get_available_sources')
    } catch (error) {
      console.error('Failed to load built-in channels:', error)
    }

    try {
      await userSourceStore.loadUserSources()
      if (userSourceStore.enabledSources.length > 0) {
        await scriptRuntime.initialize()
        scriptCapabilities = scriptRuntime.getSourceCapabilities()
      }
    } catch (error) {
      console.error('Failed to load custom search channels:', error)
    }

    return {
      builtInChannelIds,
      scriptCapabilities,
    }
  }

  function getUserSourceOptions(
    scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities'],
  ): UserSourceOption[] {
    return userSourceStore.enabledSources.map((source) => {
      const capability = scriptCapabilities[source.id]
      return {
        id: source.id,
        name: source.name,
        canSearch: capability?.canSearch ?? false,
        channels: capability?.channels ?? [],
      }
    })
  }

  function getPreferredPlaybackUserSourceId(options: {
    selectedUserSourceId?: string
    activeUserSourceId?: string
    scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities']
  }): string | undefined {
    const preferredSourceId = options.selectedUserSourceId || options.activeUserSourceId
    if (preferredSourceId) {
      const capability = options.scriptCapabilities[preferredSourceId]
      if (capability?.canGetMusicUrl) return preferredSourceId
    }

    const fallbackSource = getUserSourceOptions(options.scriptCapabilities).find((source) => {
      const capability = options.scriptCapabilities[source.id]
      return source.canSearch || capability?.canGetMusicUrl
    })

    return fallbackSource?.id
  }

  function getCustomSearchChannelIds(
    scriptCapabilities: SearchRuntimeSnapshot['scriptCapabilities'],
    selectedUserSourceId?: string,
  ): SearchChannel[] {
    if (selectedUserSourceId) {
      const capability = scriptCapabilities[selectedUserSourceId]
      return (capability?.canSearch ? capability.channels : []) as SearchChannel[]
    }

    return getUserSourceOptions(scriptCapabilities)
      .filter((source) => source.canSearch)
      .flatMap((source) => source.channels) as SearchChannel[]
  }

  function getAvailableChannelSet(
    snapshot: SearchRuntimeSnapshot,
    selectedUserSourceId?: string,
  ): Set<SearchChannel> {
    return new Set([
      ...snapshot.builtInChannelIds,
      ...getCustomSearchChannelIds(snapshot.scriptCapabilities, selectedUserSourceId),
    ])
  }

  async function searchBuiltinTracks(request: SearchRequest): Promise<MusicInfo[]> {
    if (!isTauriContext()) return []

    const results = await withTimeout(
      searchBuiltInTracks(request.channel, request.keyword, request.page, request.limit),
    )

    return results.map((track) =>
      decorateTrackForPlayback(
        track,
        request.channel,
        'built-in-search',
        request.preferredPlaybackUserSourceId,
      ),
    )
  }

  async function searchCustomTracks(request: SearchRequest): Promise<MusicInfo[] | null> {
    if (!request.selectedUserSourceId) return null

    await userSourceStore.loadUserSources()
    await scriptRuntime.initialize()

    const capabilities = scriptRuntime.getSourceCapabilities()
    const capability = capabilities[request.selectedUserSourceId]
    if (!capability?.canSearch || !capability.channels.includes(request.channel)) {
      return null
    }

    try {
      const result = await withTimeout(
        scriptRuntime.search(
          request.selectedUserSourceId,
          request.keyword,
          request.page,
          request.limit,
          request.channel as MusicSource,
        ),
      )

      if (!result.length) return null

      return result
        .map((item) => item as ScriptSearchResultItem)
        .filter((item) => getScriptItemChannel(item, request.channel) === request.channel)
        .map((item) =>
          decorateTrackForPlayback(
            normalizeScriptSearchResult(item, request.channel),
            request.channel,
            'custom-search',
            request.preferredPlaybackUserSourceId,
          ),
        )
    } catch (error) {
      console.error('[Search] Source search failed:', request.selectedUserSourceId, error)
      return null
    }
  }

  async function searchTracks(request: SearchRequest): Promise<MusicInfo[]> {
    const builtInResults = await searchBuiltinTracks(request)
    const customResults = await searchCustomTracks(request)

    if (!customResults?.length) return builtInResults
    if (!builtInResults.length) return customResults

    const mergedResults = [...builtInResults]
    const seen = new Set(builtInResults.map(buildMusicIdentity))

    for (const track of customResults) {
      const identity = buildMusicIdentity(track)
      if (seen.has(identity)) continue
      seen.add(identity)
      mergedResults.push(track)
    }

    return mergedResults
  }

  return {
    refreshAvailability,
    getUserSourceOptions,
    getPreferredPlaybackUserSourceId,
    getCustomSearchChannelIds,
    getAvailableChannelSet,
    searchBuiltinTracks,
    searchCustomTracks,
    searchTracks,
  }
}
