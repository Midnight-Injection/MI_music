import { invoke } from '@tauri-apps/api/core'
import { decorateTrackForPlayback, normalizeChannelSearchResult } from '../search/normalize'
import type { ChannelSearchResultItem, MusicInfo } from '../../types/music'
import type {
  PlaylistSearchChannel,
  SourcePlaylistDetail,
  SourcePlaylistSummary,
} from '../../types/playlist'

const SUPPORTED_PLAYLIST_CHANNELS: PlaylistSearchChannel[] = ['wy', 'tx']
export const PLAYLIST_TRACK_PAGE_SIZE = 50

export function buildSourcePlaylistUrl(source: PlaylistSearchChannel, playlistId: string): string {
  switch (source) {
    case 'wy':
      return `https://music.163.com/#/playlist?id=${encodeURIComponent(playlistId)}`
    case 'tx':
      return `https://y.qq.com/n/ryqq/playlist/${encodeURIComponent(playlistId)}`
    case 'kw':
      return `https://www.kuwo.cn/playlist_detail/${encodeURIComponent(playlistId)}`
    case 'kg':
      return `https://www.kugou.com/songlist/${encodeURIComponent(playlistId)}`
    case 'mg':
      return `https://music.migu.cn/v3/music/playlist/${encodeURIComponent(playlistId)}`
    default:
      return ''
  }
}

function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

export function isPlaylistSearchSupported(channel: PlaylistSearchChannel): boolean {
  return SUPPORTED_PLAYLIST_CHANNELS.includes(channel)
}

export function getPlaylistUnsupportedMessage(channel: PlaylistSearchChannel): string {
  if (channel === 'kw' || channel === 'kg' || channel === 'mg') {
    return '第一版暂不支持该渠道的歌单搜索。'
  }

  return '当前渠道暂不支持歌单搜索。'
}

export async function searchSourcePlaylists(
  source: PlaylistSearchChannel,
  keyword: string,
  page = 1,
  limit = 12,
): Promise<SourcePlaylistSummary[]> {
  if (!isTauriContext()) return []
  if (!isPlaylistSearchSupported(source)) {
    throw new Error(getPlaylistUnsupportedMessage(source))
  }

  return invoke<SourcePlaylistSummary[]>('search_source_playlists', {
    keyword,
    source,
    page,
    limit,
  })
}

export async function getSourcePlaylistDetail(
  source: PlaylistSearchChannel,
  playlistId: string,
): Promise<SourcePlaylistDetail> {
  if (!isTauriContext()) {
    throw new Error('当前环境不支持歌单详情加载')
  }

  return invoke<SourcePlaylistDetail>('get_source_playlist_detail', {
    playlistId,
    source,
  })
}

export async function getSourcePlaylistTracksPage(
  source: PlaylistSearchChannel,
  playlistId: string,
  page: number,
  pageSize: number,
): Promise<MusicInfo[]> {
  const result = await invoke<ChannelSearchResultItem[]>('get_source_playlist', {
    playlistId,
    source,
    page,
    pageSize,
  })

  return result.map((item) =>
    decorateTrackForPlayback(
      normalizeChannelSearchResult(item),
      source,
      'built-in-search',
    ),
  )
}

export async function getSourcePlaylistTracks(
  source: PlaylistSearchChannel,
  playlistId: string,
  trackCount?: number,
): Promise<MusicInfo[]> {
  if (!isTauriContext()) return []

  const targetCount = typeof trackCount === 'number' && trackCount > 0 ? trackCount : Number.POSITIVE_INFINITY
  const pages = Number.isFinite(targetCount)
    ? Math.max(1, Math.ceil(targetCount / PLAYLIST_TRACK_PAGE_SIZE))
    : Number.MAX_SAFE_INTEGER
  const tracks: MusicInfo[] = []

  for (let page = 1; page <= pages; page += 1) {
    const batch = await getSourcePlaylistTracksPage(
      source,
      playlistId,
      page,
      PLAYLIST_TRACK_PAGE_SIZE,
    )
    tracks.push(...batch)

    if (tracks.length >= targetCount) break
    if (batch.length < PLAYLIST_TRACK_PAGE_SIZE) break
  }

  return Number.isFinite(targetCount) ? tracks.slice(0, targetCount) : tracks
}
