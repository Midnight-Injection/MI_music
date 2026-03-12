import { invoke } from '@tauri-apps/api/core'
import type {
  ChannelSearchResultItem,
  MusicInfo,
  SearchChannel,
} from '../../../types/music'
import { normalizeChannelSearchResult } from '../normalize'
import type { SearchProvider } from '../types'

function createBuiltInProvider(channel: SearchChannel): SearchProvider {
  return {
    channel,
    async search(keyword: string, page: number, limit: number): Promise<MusicInfo[]> {
      const result = await invoke<ChannelSearchResultItem[]>('search_music_sources', {
        keyword,
        source: channel,
        page,
        limit,
      })
      return result.map(normalizeChannelSearchResult)
    },
  }
}

export const searchProviders: Record<SearchChannel, SearchProvider> = {
  kw: createBuiltInProvider('kw'),
  kg: createBuiltInProvider('kg'),
  tx: createBuiltInProvider('tx'),
  wy: createBuiltInProvider('wy'),
  mg: createBuiltInProvider('mg'),
}

export async function searchBuiltInTracks(
  channel: SearchChannel,
  keyword: string,
  page: number,
  limit: number,
): Promise<MusicInfo[]> {
  return searchProviders[channel].search(keyword, page, limit)
}
