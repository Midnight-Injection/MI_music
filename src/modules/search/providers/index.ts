import { invoke } from '@tauri-apps/api/core'
import type {
  BuiltInSearchChannel,
  ChannelSearchResultItem,
  MusicInfo,
} from '../../../types/music'
import { normalizeChannelSearchResult } from '../normalize'
import type { SearchProvider } from '../types'

function createBuiltInProvider(channel: BuiltInSearchChannel): SearchProvider {
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

export const searchProviders: Record<BuiltInSearchChannel, SearchProvider> = {
  kw: createBuiltInProvider('kw'),
  kg: createBuiltInProvider('kg'),
  tx: createBuiltInProvider('tx'),
  wy: createBuiltInProvider('wy'),
  mg: createBuiltInProvider('mg'),
}

export async function searchBuiltInTracks(
  channel: BuiltInSearchChannel,
  keyword: string,
  page: number,
  limit: number,
): Promise<MusicInfo[]> {
  return searchProviders[channel].search(keyword, page, limit)
}
