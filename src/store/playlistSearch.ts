import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getPlaylistUnsupportedMessage } from '../modules/playlistSearch/service'
import type { MusicInfo } from '../types/music'
import type {
  PlaylistSearchChannel,
  SourcePlaylistDetail,
  SourcePlaylistSummary,
} from '../types/playlist'

export type PlaylistChannelStatus = 'idle' | 'loading' | 'success' | 'empty' | 'unsupported' | 'error'
export type PlaylistSortOption = 'relevance' | 'plays' | 'time'

export interface PlaylistChannelState {
  status: PlaylistChannelStatus
  items: SourcePlaylistSummary[]
  message: string
  page: number
  hasNextPage: boolean
  isPaging: boolean
}

export function createInitialPlaylistChannelStates(): Record<PlaylistSearchChannel, PlaylistChannelState> {
  return {
    wy: { status: 'idle', items: [], message: '输入关键词后开始搜索。', page: 1, hasNextPage: false, isPaging: false },
    tx: { status: 'idle', items: [], message: '输入关键词后开始搜索。', page: 1, hasNextPage: false, isPaging: false },
    kg: { status: 'unsupported', items: [], message: getPlaylistUnsupportedMessage('kg'), page: 1, hasNextPage: false, isPaging: false },
    kw: { status: 'unsupported', items: [], message: getPlaylistUnsupportedMessage('kw'), page: 1, hasNextPage: false, isPaging: false },
    mg: { status: 'unsupported', items: [], message: getPlaylistUnsupportedMessage('mg'), page: 1, hasNextPage: false, isPaging: false },
  }
}

export const usePlaylistSearchStore = defineStore('playlistSearch', () => {
  const searchKeyword = ref('')
  const selectedSort = ref<PlaylistSortOption>('relevance')
  const hasSearched = ref(false)
  const isSearching = ref(false)
  const searchError = ref('')
  const channelStates = ref<Record<PlaylistSearchChannel, PlaylistChannelState>>(createInitialPlaylistChannelStates())
  const activePlaylistSummary = ref<SourcePlaylistSummary | null>(null)
  const activePlaylistDetail = ref<SourcePlaylistDetail | null>(null)
  const isDetailLoading = ref(false)
  const isDetailLoadingMore = ref(false)
  const detailTrackPage = ref(0)
  const detailHasMoreTracks = ref(false)
  const detailError = ref('')
  const playlistTracks = ref<MusicInfo[]>([])

  function resetDetailState() {
    activePlaylistSummary.value = null
    activePlaylistDetail.value = null
    isDetailLoading.value = false
    isDetailLoadingMore.value = false
    detailTrackPage.value = 0
    detailHasMoreTracks.value = false
    detailError.value = ''
    playlistTracks.value = []
  }

  function resetSearchState() {
    searchKeyword.value = ''
    selectedSort.value = 'relevance'
    hasSearched.value = false
    isSearching.value = false
    searchError.value = ''
    channelStates.value = createInitialPlaylistChannelStates()
    resetDetailState()
  }

  return {
    searchKeyword,
    selectedSort,
    hasSearched,
    isSearching,
    searchError,
    channelStates,
    activePlaylistSummary,
    activePlaylistDetail,
    isDetailLoading,
    isDetailLoadingMore,
    detailTrackPage,
    detailHasMoreTracks,
    detailError,
    playlistTracks,
    resetDetailState,
    resetSearchState,
  }
})
