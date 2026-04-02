<template>
  <div class="song-list-page page-shell">
    <section class="search-home glass-panel">
      <div class="search-home__hero">
        <div class="search-home__copy">
          <span class="search-home__eyebrow app-pill accent compact">Playlist Search</span>
          <h1>搜索歌单</h1>
          <p>输入关键词后按渠道分组搜索公开歌单，当前优先接入网易云音乐和 QQ 音乐。</p>
        </div>
      </div>

      <div class="search-home__toolbar">
        <div class="search-home__search-shell">
          <svg class="search-home__icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-home__input"
            placeholder="搜索歌单、歌手、风格..."
            @keyup.enter="handleSearchSubmit"
          />
          <button
            v-if="searchKeyword"
            type="button"
            class="search-home__clear app-icon-button ghost compact"
            @click="handleClear"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <button type="button" class="search-home__submit app-button accent" @click="handleSearchSubmit">
          开始搜索
        </button>
      </div>

      <section class="channel-tabs">
        <button
          v-for="option in PLAYLIST_CHANNEL_OPTIONS"
          :key="option.value"
          type="button"
          :class="[
            'channel-tabs__item',
            'app-pill',
            option.primary ? 'accent' : 'secondary',
            { 'is-active': option.primary, 'is-disabled': !option.supported },
          ]"
        >
          {{ option.label }}
        </button>
      </section>
    </section>

    <div
      v-if="playlistNotice.message"
      class="playlist-notice"
      :class="`is-${playlistNotice.type}`"
    >
      {{ playlistNotice.message }}
    </div>

    <section v-if="!activePlaylistSummary" class="playlist-results glass-panel section-card">
      <header class="playlist-results__header">
        <div>
          <span class="playlist-results__eyebrow app-pill primary compact">分渠道结果</span>
          <h2>搜索结果</h2>
          <p>{{ searchSummary }}</p>
        </div>
        <div class="playlist-results__actions">
          <div class="playlist-sort">
            <button
              v-for="option in SORT_OPTIONS"
              :key="option.value"
              type="button"
              :class="[
                'playlist-sort__item',
                'app-pill',
                selectedSort === option.value ? 'accent' : 'ghost',
                { 'is-active': selectedSort === option.value },
              ]"
              @click="selectedSort = option.value"
            >
              {{ option.label }}
            </button>
          </div>
          <span class="playlist-results__badge app-pill warning compact">{{ resultBadge }}</span>
        </div>
      </header>

      <div v-if="searchError" class="playlist-results__error">{{ searchError }}</div>

      <NEmpty v-if="!hasSearched && !isSearching" description="输入关键词后会按渠道分组展示歌单结果。" />

      <div v-else-if="isSearching" class="playlist-results__loading">
        <div class="spinner"></div>
        <p>正在搜索歌单...</p>
      </div>

      <div v-else class="playlist-groups">
        <section
          v-for="option in visibleChannelOptions"
          :key="option.value"
          class="playlist-group"
        >
          <header class="playlist-group__header">
            <div>
              <h3>{{ option.label }}</h3>
              <p>{{ option.primary ? '优先渠道' : '预留渠道' }}</p>
            </div>
            <span
              :class="['playlist-group__state', 'app-pill', getChannelStateClass(channelStates[option.value].status)]"
            >
              {{ getChannelStateLabel(channelStates[option.value].status) }}
            </span>
          </header>

          <div
            v-if="channelStates[option.value].status === 'success' && channelStates[option.value].items.length"
          >
            <div class="playlist-card-grid">
              <article
                v-for="playlist in getSortedChannelItems(option.value)"
                :key="`${playlist.source}-${playlist.id}`"
                class="playlist-card"
                role="button"
                tabindex="0"
                @click="openPlaylistDetail(playlist)"
                @keydown.enter.prevent="openPlaylistDetail(playlist)"
                @contextmenu.prevent="showPlaylistMenu($event, playlist)"
              >
                <div class="playlist-card__cover-shell">
                  <img
                    v-if="playlist.cover"
                    :src="playlist.cover"
                    :alt="playlist.name"
                    class="playlist-card__cover"
                  />
                  <div v-else class="playlist-card__cover playlist-card__cover--empty">
                    {{ option.label }}
                  </div>
                </div>

                <div class="playlist-card__body">
                  <div class="playlist-card__meta">
                    <span class="playlist-card__source app-pill secondary compact">{{ getChannelName(playlist.source) }}</span>
                    <span v-if="playlist.trackCount" class="playlist-card__tracks app-pill ghost compact">
                      {{ playlist.trackCount }} 首
                    </span>
                  </div>
                  <h4>{{ playlist.name }}</h4>
                  <p>{{ playlist.description || '暂无简介' }}</p>
                  <footer>
                    <span>{{ playlist.creator || '未知创建者' }}</span>
                    <strong>{{ formatPlayCount(playlist.playCount) }}</strong>
                  </footer>
                  <div class="playlist-card__actions">
                    <button
                      type="button"
                      class="playlist-card__favorite app-button secondary compact"
                      :disabled="importingPlaylistKey === `${playlist.source}-${playlist.id}`"
                      @click.stop="handleFavoritePlaylist(playlist)"
                    >
                      {{ importingPlaylistKey === `${playlist.source}-${playlist.id}` ? '收藏中...' : '收藏歌单' }}
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <div class="playlist-group__pagination">
              <button
                type="button"
                class="playlist-group__page-btn app-button secondary compact"
                :disabled="channelStates[option.value].isPaging || channelStates[option.value].page <= 1"
                @click="handleChannelPageChange(option.value, channelStates[option.value].page - 1)"
              >
                上一页
              </button>
              <span class="playlist-group__page-status">
                {{ channelStates[option.value].isPaging ? '切换中...' : `第 ${channelStates[option.value].page} 页` }}
              </span>
              <button
                type="button"
                class="playlist-group__page-btn app-button secondary compact"
                :disabled="channelStates[option.value].isPaging || !channelStates[option.value].hasNextPage"
                @click="handleChannelPageChange(option.value, channelStates[option.value].page + 1)"
              >
                下一页
              </button>
            </div>
          </div>
        </section>

        <NEmpty
          v-if="hasSearched && !visibleChannelOptions.length && !searchError"
          description="没有匹配到可展示的歌单结果。"
        />
      </div>
    </section>

    <section v-else class="playlist-detail glass-panel section-card">
      <header class="playlist-detail__header">
        <button type="button" class="playlist-detail__back app-button secondary compact" @click="closePlaylistDetail">
          返回搜索结果
        </button>
        <span class="playlist-detail__source app-pill accent compact">{{ detailSourceLabel }}</span>
      </header>

      <div v-if="isDetailLoading" class="playlist-results__loading">
        <div class="spinner"></div>
        <p>正在加载歌单详情...</p>
      </div>

      <div v-else-if="detailError" class="playlist-results__error">{{ detailError }}</div>

      <template v-else>
        <section class="playlist-detail__hero">
          <div class="playlist-detail__cover-shell">
            <img
              v-if="detailCover"
              :src="detailCover"
              :alt="detailName"
              class="playlist-detail__cover"
            />
            <div v-else class="playlist-detail__cover playlist-detail__cover--empty">
              {{ detailSourceLabel }}
            </div>
          </div>

          <div class="playlist-detail__meta">
            <span class="playlist-detail__eyebrow app-pill accent compact">Playlist Detail</span>
            <h2>{{ detailName }}</h2>
            <p class="playlist-detail__creator">{{ detailCreator }}</p>
            <p class="playlist-detail__description">{{ detailDescription }}</p>

            <div class="playlist-detail__stats">
              <span>{{ detailTrackCount }} 首</span>
              <span>{{ detailPlayCount }}</span>
              <span v-if="playlistTracks.length">已加载 {{ playlistTracks.length }} 首</span>
            </div>

            <div class="playlist-detail__actions">
              <button
                type="button"
                class="playlist-detail__action app-button accent"
                :disabled="playlistTracks.length === 0"
                @click="handlePlayAll"
              >
                播放全部
              </button>
              <button
                type="button"
                class="playlist-detail__action app-button secondary"
                :disabled="playlistTracks.length === 0"
                @click="handleQueueAll"
              >
                加入当前队列
              </button>
              <button
                v-if="activePlaylistSummary"
                type="button"
                class="playlist-detail__action app-button ghost"
                :disabled="importingPlaylistKey === `${activePlaylistSummary.source}-${activePlaylistSummary.id}`"
                @click="handleFavoritePlaylist(activePlaylistSummary)"
              >
                {{ importingPlaylistKey === `${activePlaylistSummary.source}-${activePlaylistSummary.id}` ? '收藏中...' : '收藏歌单' }}
              </button>
            </div>
          </div>
        </section>

        <section class="playlist-tracks">
          <header class="playlist-tracks__header">
            <div>
              <h3>歌曲列表</h3>
              <p>{{ trackListSummary }}</p>
            </div>
          </header>

          <div v-if="playlistTracks.length" class="playlist-tracks__list">
            <SongItem
              v-for="(music, index) in playlistTracks"
              :key="music.id"
              :music="music"
              @play="handlePlayTrack(index)"
              @add-to-list="handleQueueTrack"
              @add-to-playlist="handleAddToPlaylist"
              @context-menu="showSongMenu($event, music, index)"
            />
          </div>

          <div
            v-if="playlistTracks.length && (isDetailLoadingMore || detailHasMoreTracks)"
            ref="detailLoadAnchorRef"
            class="playlist-tracks__load-state"
          >
            {{ isDetailLoadingMore ? '正在加载更多歌曲...' : '继续下滑加载更多歌曲' }}
          </div>

          <NEmpty v-if="!playlistTracks.length" description="这个歌单暂时没有可展示的歌曲。" />
        </section>
      </template>
    </section>

    <NModal
      v-model:show="addToPlaylistDialog.show"
      preset="card"
      title="添加到歌单"
      style="width: 520px"
      @click-outside="closeAddToPlaylistDialog"
    >
      <p v-if="addToPlaylistDialog.music">
        {{ addToPlaylistDialog.music.name }} · {{ addToPlaylistDialog.music.artist }}
      </p>
      <div v-if="playlistStore.isSyncing && !playlistStore.isReady" class="playlist-dialog__state">
        正在加载歌单...
      </div>
      <div v-else-if="playlistStore.initError" class="playlist-dialog__state is-error">
        <span>{{ playlistStore.initError }}</span>
        <NButton type="warning" size="small" @click="retryPlaylistInit">重试</NButton>
      </div>
      <div v-else-if="playlistStore.playlists.length === 0" class="playlist-dialog__state">
        暂无可用歌单，请先去"我的歌单"创建一个歌单。
      </div>
      <div v-else class="playlist-dialog__list">
        <NButton
          v-for="playlist in playlistStore.playlists"
          :key="playlist.id"
          secondary
          block
          @click="confirmAddToPlaylist(playlist.id)"
        >
          <span>{{ getPlaylistLabel(playlist.systemKey) }}</span>
          <span>{{ playlist.name }} · {{ playlist.musics.length }} 首</span>
        </NButton>
      </div>
    </NModal>

    <FloatingMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="contextMenuItems"
      @select="handleContextMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { NButton, NEmpty, NModal } from 'naive-ui'
import { storeToRefs } from 'pinia'
import FloatingMenu from '../components/context/FloatingMenu.vue'
import SongItem from '../components/SongItem.vue'
import { useTrackDownload } from '../composables/useTrackDownload'
import {
  getSourcePlaylistDetail,
  getSourcePlaylistTracksPage,
  isPlaylistSearchSupported,
  PLAYLIST_TRACK_PAGE_SIZE,
  searchSourcePlaylists,
} from '../modules/playlistSearch/service'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import {
  createInitialPlaylistChannelStates,
  usePlaylistSearchStore,
  type PlaylistChannelStatus,
  type PlaylistSortOption,
} from '../store/playlistSearch'
import type { ContextMenuItem } from '../types/context-menu'
import { CHANNEL_NAMES } from '../types/settings'
import type { MusicInfo } from '../types/music'
import type {
  Playlist,
  PlaylistSearchChannel,
  SourcePlaylistSummary,
} from '../types/playlist'

const PLAYLIST_PAGE_SIZE = 12
const SORT_OPTIONS: Array<{ value: PlaylistSortOption; label: string }> = [
  { value: 'relevance', label: '最相关' },
  { value: 'plays', label: '播放量' },
  { value: 'time', label: '时间' },
]

const PLAYLIST_CHANNEL_OPTIONS = [
  { value: 'kw', label: '酷我', primary: false, supported: false },
  { value: 'kg', label: '酷狗', primary: false, supported: false },
  { value: 'wy', label: '网易', primary: true, supported: true },
  { value: 'tx', label: '腾讯', primary: true, supported: true },
  { value: 'mg', label: '咪咕', primary: false, supported: false },
] as const satisfies ReadonlyArray<{
  value: PlaylistSearchChannel
  label: string
  primary: boolean
  supported: boolean
}>

const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const playlistSearchStore = usePlaylistSearchStore()
const { downloadTrack } = useTrackDownload()
const {
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
} = storeToRefs(playlistSearchStore)
const addToPlaylistDialog = ref<{
  show: boolean
  music: MusicInfo | null
}>({
  show: false,
  music: null,
})
const contextMenu = ref<{
  show: boolean
  x: number
  y: number
  type: 'song' | 'playlist'
  music: MusicInfo | null
  musicIndex: number
  playlist: SourcePlaylistSummary | null
}>({
  show: false,
  x: 0,
  y: 0,
  type: 'song',
  music: null,
  musicIndex: -1,
  playlist: null,
})
const playlistNotice = ref<{
  type: 'success' | 'info' | 'error'
  message: string
}>({
  type: 'info',
  message: '',
})
const importingPlaylistKey = ref('')

let playlistNoticeTimer: number | null = null
const detailLoadAnchorRef = ref<HTMLDivElement | null>(null)
let detailLoadObserver: IntersectionObserver | null = null
const songMenuItems: ContextMenuItem[] = [
  { key: 'play', label: '▶ 立即播放' },
  { key: 'play-next', label: '↳ 下一首播放' },
  { key: 'add-to-playlist', label: '+ 添加到歌单' },
  { key: 'download', label: '↓ 下载歌曲' },
]
const playlistMenuItems: ContextMenuItem[] = [
  { key: 'open-playlist', label: '↗ 打开歌单详情' },
  { key: 'favorite-playlist', label: '☆ 收藏歌单' },
]
const contextMenuItems = computed<ContextMenuItem[]>(() =>
  contextMenu.value.type === 'song' ? songMenuItems : playlistMenuItems,
)

const searchSummary = computed(() => {
  if (!searchKeyword.value.trim()) return '当前保留 5 个渠道入口，网易云和 QQ 音乐优先接入。'
  return `关键词：${searchKeyword.value.trim()}`
})

const resultBadge = computed(() => {
  const total = visibleChannelOptions.value.reduce(
    (count, option) => count + channelStates.value[option.value].items.length,
    0,
  )
  return `${total} 个歌单`
})
const visibleChannelOptions = computed(() =>
  PLAYLIST_CHANNEL_OPTIONS.filter((option) => {
    const state = channelStates.value[option.value]
    return state.status === 'success' && state.items.length > 0
  }),
)

const detailName = computed(
  () => activePlaylistDetail.value?.name || activePlaylistSummary.value?.name || '歌单详情',
)
const detailCover = computed(
  () => activePlaylistDetail.value?.cover || activePlaylistSummary.value?.cover || '',
)
const detailCreator = computed(
  () => activePlaylistDetail.value?.creator || activePlaylistSummary.value?.creator || '未知创建者',
)
const detailDescription = computed(
  () =>
    activePlaylistDetail.value?.description ||
    activePlaylistSummary.value?.description ||
    '暂无简介',
)
const detailTrackCount = computed(
  () =>
    String(
      activePlaylistDetail.value?.trackCount ||
      activePlaylistSummary.value?.trackCount ||
      playlistTracks.value.length ||
      0,
    ),
)
const detailExpectedTrackCount = computed(
  () => activePlaylistDetail.value?.trackCount || activePlaylistSummary.value?.trackCount || 0,
)
const detailPlayCount = computed(() =>
  formatPlayCount(activePlaylistDetail.value?.playCount || activePlaylistSummary.value?.playCount),
)
const detailSourceLabel = computed(() =>
  getChannelName(activePlaylistSummary.value?.source || activePlaylistDetail.value?.source || 'wy'),
)
const trackListSummary = computed(() => {
  const expectedCount =
    activePlaylistDetail.value?.trackCount || activePlaylistSummary.value?.trackCount || 0

  if (expectedCount > playlistTracks.value.length) {
    return `当前展示 ${playlistTracks.value.length} / ${expectedCount} 首`
  }

  return `共 ${playlistTracks.value.length} 首`
})

function mergePlaylistTracks(current: MusicInfo[], incoming: MusicInfo[]) {
  const merged = [...current]
  const seen = new Set(current.map((track) => `${track.source || ''}:${track.id}`))

  incoming.forEach((track) => {
    const key = `${track.source || ''}:${track.id}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push(track)
  })

  return merged
}

function updateDetailTrackState(batch: MusicInfo[], page: number, replace = false) {
  const nextTracks = replace ? mergePlaylistTracks([], batch) : mergePlaylistTracks(playlistTracks.value, batch)
  playlistTracks.value = nextTracks
  detailTrackPage.value = page

  const expectedCount = detailExpectedTrackCount.value
  const hasMoreByCount = expectedCount > 0 ? nextTracks.length < expectedCount : true
  detailHasMoreTracks.value = batch.length >= PLAYLIST_TRACK_PAGE_SIZE && hasMoreByCount
}

function disconnectDetailLoadObserver() {
  if (detailLoadObserver) {
    detailLoadObserver.disconnect()
    detailLoadObserver = null
  }
}

async function ensureDetailLoadObserver() {
  if (!activePlaylistSummary.value || !detailHasMoreTracks.value) {
    disconnectDetailLoadObserver()
    return
  }

  await nextTick()
  const anchor = detailLoadAnchorRef.value
  if (!anchor) return

  disconnectDetailLoadObserver()
  detailLoadObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      void loadMorePlaylistTracks()
    }
  }, {
    root: null,
    rootMargin: '0px 0px 320px 0px',
    threshold: 0,
  })
  detailLoadObserver.observe(anchor)
}

function setPlaylistNotice(type: 'success' | 'info' | 'error', message: string) {
  playlistNotice.value = { type, message }

  if (playlistNoticeTimer !== null) {
    window.clearTimeout(playlistNoticeTimer)
  }

  playlistNoticeTimer = window.setTimeout(() => {
    playlistNotice.value.message = ''
    playlistNoticeTimer = null
  }, 2600)
}

function showPlaylistMenu(event: MouseEvent, playlist: SourcePlaylistSummary) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'playlist',
    music: null,
    musicIndex: -1,
    playlist,
  }
}

function showSongMenu(event: MouseEvent, music: MusicInfo, index: number) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    type: 'song',
    music,
    musicIndex: index,
    playlist: null,
  }
}

function hideContextMenu() {
  contextMenu.value.show = false
}

function getSortedChannelItems(channel: PlaylistSearchChannel): SourcePlaylistSummary[] {
  const items = [...channelStates.value[channel].items]

  if (selectedSort.value === 'plays') {
    return items.sort((left, right) => {
      const delta = (right.playCount || 0) - (left.playCount || 0)
      if (delta !== 0) return delta
      return String(left.id).localeCompare(String(right.id))
    })
  }

  if (selectedSort.value === 'time') {
    return items.sort((left, right) => {
      const leftTime = left.updatedAt || left.createdAt || 0
      const rightTime = right.updatedAt || right.createdAt || 0
      const delta = rightTime - leftTime
      if (delta !== 0) return delta
      return String(left.id).localeCompare(String(right.id))
    })
  }

  return items
}

async function handleSearchSubmit() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  hasSearched.value = true
  isSearching.value = true
  searchError.value = ''
  playlistSearchStore.resetDetailState()

  channelStates.value = createInitialPlaylistChannelStates()

  const supportedChannels = PLAYLIST_CHANNEL_OPTIONS.filter((option) =>
    isPlaylistSearchSupported(option.value),
  )
  const results = await Promise.allSettled(
    supportedChannels.map(async (option) => searchChannelPage(option.value, 1)),
  )

  const failures = results.flatMap((result, index) =>
    result.status === 'rejected'
      ? [{
        channelId: supportedChannels[index].value,
        channel: supportedChannels[index].label,
        reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      }]
      : [],
  )

  for (const failure of failures) {
    channelStates.value[failure.channelId] = {
      status: 'error',
      items: [],
      message: failure.reason,
      page: 1,
      hasNextPage: false,
      isPaging: false,
    }
  }

  if (failures.length === supportedChannels.length) {
    searchError.value = failures.map((item) => `${item.channel}: ${item.reason}`).join('；')
  } else if (failures.length > 0) {
    searchError.value = `部分渠道不可用：${failures.map((item) => `${item.channel}: ${item.reason}`).join('；')}`
  }

  isSearching.value = false
}

async function searchChannelPage(channel: PlaylistSearchChannel, page: number) {
  const previousState = channelStates.value[channel]

  channelStates.value[channel] = {
    ...previousState,
    status: page === 1 ? 'loading' : previousState.status,
    items: page === 1 ? [] : previousState.items,
    message: page === 1 ? '正在搜索...' : previousState.message,
    page,
    isPaging: true,
  }

  try {
    const items = await searchSourcePlaylists(channel, searchKeyword.value.trim(), page, PLAYLIST_PAGE_SIZE)

    if (!items.length && page > 1) {
      channelStates.value[channel] = {
        ...previousState,
        hasNextPage: false,
        isPaging: false,
      }
      return
    }

    channelStates.value[channel] = {
      status: items.length ? 'success' : 'empty',
      items,
      message: items.length ? '' : '没有匹配到歌单。',
      page,
      hasNextPage: items.length >= PLAYLIST_PAGE_SIZE,
      isPaging: false,
    }
  } catch (error) {
    channelStates.value[channel] = {
      ...previousState,
      status: 'error',
      items: page === 1 ? [] : previousState.items,
      message: error instanceof Error ? error.message : '搜索失败，请稍后重试',
      hasNextPage: false,
      isPaging: false,
    }
    throw error
  }
}

async function handleChannelPageChange(channel: PlaylistSearchChannel, page: number) {
  if (page < 1 || channelStates.value[channel].isPaging) return

  try {
    await searchChannelPage(channel, page)
  } catch (error) {
    console.error('[SongList] Failed to change playlist page:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '翻页失败，请稍后重试')
  }
}

async function openPlaylistDetail(playlist: SourcePlaylistSummary) {
  playlistSearchStore.resetDetailState()
  activePlaylistSummary.value = playlist
  isDetailLoading.value = true

  try {
    const [detail, tracks] = await Promise.all([
      getSourcePlaylistDetail(playlist.source, playlist.id),
      getSourcePlaylistTracksPage(playlist.source, playlist.id, 1, PLAYLIST_TRACK_PAGE_SIZE),
    ])

    activePlaylistDetail.value = detail
    updateDetailTrackState(tracks, 1, true)
  } catch (error) {
    console.error('[SongList] Failed to load playlist detail:', error)
    detailError.value = error instanceof Error ? error.message : '歌单详情加载失败，请稍后重试'
  } finally {
    isDetailLoading.value = false
    await ensureDetailLoadObserver()
  }
}

function closePlaylistDetail() {
  disconnectDetailLoadObserver()
  playlistSearchStore.resetDetailState()
}

function handleClear() {
  disconnectDetailLoadObserver()
  playlistSearchStore.resetSearchState()
}

async function loadMorePlaylistTracks() {
  const summary = activePlaylistSummary.value
  if (!summary || isDetailLoading.value || isDetailLoadingMore.value || !detailHasMoreTracks.value) return

  isDetailLoadingMore.value = true

  try {
    const nextPage = detailTrackPage.value + 1
    const batch = await getSourcePlaylistTracksPage(
      summary.source,
      summary.id,
      nextPage,
      PLAYLIST_TRACK_PAGE_SIZE,
    )
    updateDetailTrackState(batch, nextPage)
  } catch (error) {
    console.error('[SongList] Failed to load more playlist tracks:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '加载更多歌曲失败，请稍后重试')
  } finally {
    isDetailLoadingMore.value = false
    await ensureDetailLoadObserver()
  }
}

function handlePlayTrack(index: number) {
  if (!playlistTracks.value[index]) return
  playerStore.setPlaylist([...playlistTracks.value], index)
}

function handleQueueTrack(music: MusicInfo) {
  const added = playerStore.enqueueMusic(music)
  setPlaylistNotice(
    added ? 'success' : 'info',
    added ? '已加入当前播放队列' : '当前播放队列中已存在这首歌',
  )
}

function handlePlayAll() {
  if (!playlistTracks.value.length) return
  playerStore.setPlaylist([...playlistTracks.value], 0)
}

function handleQueueAll() {
  if (!playlistTracks.value.length) return
  const addedCount = playerStore.appendToPlaylist(playlistTracks.value)
  setPlaylistNotice(
    addedCount > 0 ? 'success' : 'info',
    addedCount > 0 ? `已加入 ${addedCount} 首到当前队列` : '当前队列里已经有这些歌曲了',
  )
}

function queueTrackNext(music: MusicInfo) {
  const playlist = [...playerStore.playlist]
  const currentIndex = playerStore.currentIndex
  playlist.splice(currentIndex + 1, 0, music)
  playerStore.setPlaylist(playlist, currentIndex)
}

async function handleAddToPlaylist(music: MusicInfo) {
  addToPlaylistDialog.value = {
    show: true,
    music,
  }

  if (!playlistStore.isReady && !playlistStore.isSyncing) {
    try {
      await playlistStore.init()
    } catch (error) {
      console.error('[SongList] Playlist store init failed while opening dialog:', error)
      setPlaylistNotice('error', playlistStore.initError || '歌单尚未初始化完成，请稍后重试')
    }
  }
}

async function downloadMusicFromContext() {
  const music = contextMenu.value.music
  if (!music) return

  hideContextMenu()
  setPlaylistNotice('info', `正在准备下载：${music.name}`)

  try {
    const result = await downloadTrack(music)
    setPlaylistNotice('success', `已开始下载：${result.filename}`)
  } catch (error) {
    console.error('[SongList] Failed to download music:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '下载失败，请重试')
  }
}

function handleContextMenuSelect(key: string) {
  switch (key) {
    case 'play':
      if (contextMenu.value.musicIndex >= 0) {
        handlePlayTrack(contextMenu.value.musicIndex)
      }
      hideContextMenu()
      return
    case 'play-next':
      if (contextMenu.value.music) {
        queueTrackNext(contextMenu.value.music)
      }
      hideContextMenu()
      return
    case 'add-to-playlist':
      if (contextMenu.value.music) {
        void handleAddToPlaylist(contextMenu.value.music)
      }
      hideContextMenu()
      return
    case 'download':
      void downloadMusicFromContext()
      return
    case 'open-playlist':
      if (contextMenu.value.playlist) {
        void openPlaylistDetail(contextMenu.value.playlist)
      }
      hideContextMenu()
      return
    case 'favorite-playlist':
      if (contextMenu.value.playlist) {
        void handleFavoritePlaylist(contextMenu.value.playlist)
      }
      hideContextMenu()
      return
    default:
      hideContextMenu()
  }
}

function closeAddToPlaylistDialog() {
  addToPlaylistDialog.value = {
    show: false,
    music: null,
  }
}

async function confirmAddToPlaylist(playlistId: number) {
  if (!addToPlaylistDialog.value.music) return

  try {
    await playlistStore.ensureReady()
    const playlist = playlistStore.playlists.find((item) => item.id === playlistId)
    const result = await playlistStore.addMusicToPlaylist(playlistId, addToPlaylistDialog.value.music)
    closeAddToPlaylistDialog()
    setPlaylistNotice(
      result.status === 'added' ? 'success' : 'info',
      result.status === 'added'
        ? `已添加到${playlist?.name || '歌单'}`
        : `${playlist?.name || '该歌单'}中已存在这首歌`,
    )
  } catch (error) {
    console.error('[SongList] Failed to add music to playlist:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '添加到歌单失败，请重试')
  }
}

async function handleFavoritePlaylist(playlist: SourcePlaylistSummary) {
  const playlistKey = `${playlist.source}-${playlist.id}`
  if (importingPlaylistKey.value === playlistKey) return

  importingPlaylistKey.value = playlistKey

  try {
    const result = await playlistStore.importSourcePlaylist(playlist)
    setPlaylistNotice(
      result.status === 'created' ? 'success' : 'info',
      result.status === 'created'
        ? `已收藏到本地歌单：${result.playlist.name}`
        : `已刷新本地歌单：${result.playlist.name}`,
    )
  } catch (error) {
    console.error('[SongList] Failed to favorite source playlist:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '收藏歌单失败，请稍后重试')
  } finally {
    importingPlaylistKey.value = ''
  }
}

async function retryPlaylistInit() {
  try {
    await playlistStore.init()
  } catch (error) {
    console.error('[SongList] Retry playlist init failed:', error)
    setPlaylistNotice('error', playlistStore.initError || '歌单初始化失败，请稍后重试')
  }
}

function getPlaylistLabel(systemKey?: Playlist['systemKey']) {
  switch (systemKey) {
    case 'default':
      return '🎵'
    case 'love':
      return '❤️'
    default:
      return '📋'
  }
}

function getChannelStateLabel(status: PlaylistChannelStatus) {
  switch (status) {
    case 'loading':
      return '搜索中'
    case 'success':
      return '已完成'
    case 'empty':
      return '无结果'
    case 'unsupported':
      return '未接入'
    case 'error':
      return '异常'
    default:
      return '待搜索'
  }
}

function getChannelStateClass(status: PlaylistChannelStatus) {
  switch (status) {
    case 'loading':
      return 'warning'
    case 'success':
      return 'success'
    case 'error':
      return 'danger'
    default:
      return 'secondary'
  }
}

function formatPlayCount(playCount?: number) {
  if (!playCount) return '暂无热度'
  if (playCount >= 100000000) return `${(playCount / 100000000).toFixed(1)} 亿播放`
  if (playCount >= 10000) return `${(playCount / 10000).toFixed(1)} 万播放`
  return `${playCount} 播放`
}

function getChannelName(channel: string): string {
  return CHANNEL_NAMES[channel] || channel
}

watch(
  () => [activePlaylistSummary.value?.id, detailHasMoreTracks.value] as const,
  async ([playlistId, hasMore]) => {
    if (!playlistId || !hasMore) {
      disconnectDetailLoadObserver()
      return
    }

    await ensureDetailLoadObserver()
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
  disconnectDetailLoadObserver()
  if (playlistNoticeTimer !== null) {
    window.clearTimeout(playlistNoticeTimer)
  }
})
</script>

<style scoped lang="scss">
.song-list-page {
  height: 100%;
  overflow-y: auto;

  &.page-shell {
    width: 100%;
    max-width: none;
    padding: 0;
  }
}

.search-home {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--panel-strong);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.search-home__hero {
  display: block;
}

.search-home__eyebrow {
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.search-home__copy {
  h1 {
    margin-top: 6px;
    font-size: clamp(1.52rem, 2.4vw, 2.08rem);
    line-height: 1;
    letter-spacing: -0.05em;
  }

  p {
    max-width: 520px;
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.76rem;
    line-height: 1.45;
  }
}

.playlist-results,
.playlist-detail {
  border-radius: var(--radius-md);
  padding: 18px;
}

.playlist-results__eyebrow,
.playlist-detail__eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.search-home__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.search-home__search-shell {
  position: relative;
  min-height: 48px;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background: var(--input-surface);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
  overflow: hidden;

  :deep(.n-input) {
    width: 100%;
    height: 100%;
    background: var(--input-surface);
    border-radius: 18px;
  }

  :deep(.n-input:hover),
  :deep(.n-input.n-input--focus) {
    background: var(--input-surface-focus);
  }

  :deep(.n-input-wrapper) {
    padding-left: 6px;
    padding-right: 6px;
  }
}

.search-home__icon {
  position: absolute;
  top: 50%;
  left: 16px;
  width: 18px;
  height: 18px;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-home__input {
  width: 100%;
  min-height: 48px;
  padding: 0 44px 0 44px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: var(--input-surface);
  color: var(--text-primary);
  font-size: 0.86rem;
  outline: none;

  &:focus {
    border-color: color-mix(in srgb, var(--primary-color) 42%, var(--border-light));
    background: var(--input-surface-focus);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 14%, transparent);
  }
}

.search-home__clear,
.search-home__submit,
.playlist-detail__back,
.playlist-detail__action {
  border: none;
  cursor: pointer;
}

.search-home__clear {
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);

  svg {
    width: 14px;
    height: 14px;
  }
}

.search-home__submit {
  min-width: 112px;
  min-height: 46px;
}

.channel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.channel-tabs__item {
  font-size: 0.76rem;

  &.is-active {
    box-shadow: var(--button-accent-shadow);
  }

  &.is-disabled {
    opacity: 0.45;
  }
}

.playlist-notice,
.playlist-results__error {
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 0.86rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.playlist-results__error {
  margin-top: 14px;
  background: color-mix(in srgb, #ef4444 14%, rgba(255, 255, 255, 0.04));
  color: #ffc5cf;
}

.playlist-notice {
  &.is-success {
    background: color-mix(in srgb, #22c55e 14%, rgba(255, 255, 255, 0.04));
    color: #baf7cd;
  }

  &.is-info {
    background: color-mix(in srgb, #38bdf8 16%, rgba(255, 255, 255, 0.04));
    color: #b8eaff;
  }

  &.is-error {
    background: color-mix(in srgb, #ef4444 14%, rgba(255, 255, 255, 0.04));
    color: #ffc5cf;
  }
}

.playlist-results__header,
.playlist-group__header,
.playlist-tracks__header,
.playlist-detail__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.playlist-results__header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  h2 {
    margin-top: 6px;
    font-size: 1.3rem;
  }

  p {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 0.84rem;
  }
}

.playlist-results__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.playlist-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  border-radius: 999px;
  background: var(--button-secondary-bg);
}

.playlist-sort__item {
  font-size: 0.74rem;
  cursor: pointer;

  &.is-active {
    box-shadow: var(--button-accent-shadow);
  }
}

.playlist-results__badge,
.playlist-group__state,
.playlist-detail__source {
  font-size: 0.74rem;
}

.playlist-group__state {
  &.secondary {
    color: var(--text-secondary);
  }
}

.playlist-results__empty,
.playlist-group__empty,
.playlist-results__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;
  margin-top: 14px;
  border-radius: 24px;
  background: var(--panel-muted);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  text-align: center;
}

.playlist-results__loading {
  flex-direction: column;
  gap: 12px;
}

.playlist-groups {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.playlist-group {
  padding: 16px;
  border-radius: 28px;
  background: var(--panel-muted);
  border: 1px solid var(--border-color);

  p {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.8rem;
  }
}

.playlist-group__pagination {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.playlist-group__page-btn {
  min-height: 34px;
}

.playlist-group__page-status {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.playlist-card-grid {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.playlist-card {
  display: flex;
  flex-direction: column;
  text-align: left;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 26px;
  overflow: hidden;
  background: var(--liquid-content-surface);
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--border-light);
    background: var(--panel-gradient);
  }
}

.playlist-card__cover-shell {
  width: 100%;
  aspect-ratio: 1 / 1;
  background: var(--panel-gradient);
}

.playlist-card__cover,
.playlist-detail__cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playlist-card__cover--empty,
.playlist-detail__cover--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--secondary-color) 34%, rgba(255, 255, 255, 0.12)),
    color-mix(in srgb, var(--accent-color) 24%, rgba(255, 255, 255, 0.08))
  );
  color: rgba(255, 255, 255, 0.86);
  font-weight: 700;
}

.playlist-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 14px;

  h4 {
    margin-top: 10px;
    font-size: 1rem;
    line-height: 1.4;
  }

  p {
    display: -webkit-box;
    margin-top: 8px;
    line-height: 1.6;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 58px;
  }

  footer {
    margin-top: 14px;
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 0.76rem;
  }
}

.playlist-card__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 12px;
}

.playlist-card__favorite {
  min-width: 92px;
}

.playlist-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.playlist-card__source,
.playlist-card__tracks {
  font-size: 0.72rem;
}

.playlist-detail__back {
  min-height: 38px;
}

.playlist-detail__hero {
  margin-top: 16px;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.playlist-detail__cover-shell {
  width: 220px;
  aspect-ratio: 1 / 1;
  border-radius: 32px;
  overflow: hidden;
  background: var(--panel-gradient);
  box-shadow: var(--shadow-lg);
}

.playlist-detail__meta {
  min-width: 0;

  h2 {
    margin-top: 12px;
    font-size: clamp(1.6rem, 2vw, 2.2rem);
    line-height: 1.2;
  }
}

.playlist-detail__creator,
.playlist-detail__description {
  margin-top: 10px;
  color: var(--text-secondary);
}

.playlist-detail__description {
  line-height: 1.7;
}

.playlist-detail__stats,
.playlist-detail__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.playlist-detail__stats span {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--pill-secondary-bg);
  color: var(--text-primary);
  font-size: 0.78rem;
}

.playlist-detail__action {
  min-height: 42px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.56;
  }
}

.playlist-tracks {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.playlist-tracks__header p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.8rem;
}

.playlist-tracks__list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.playlist-tracks__load-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  margin-top: 10px;
  border-radius: 14px;
  background: var(--panel-muted);
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.spinner {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  border: 3px solid rgba(255, 255, 255, 0.12);
  border-top-color: rgba(255, 255, 255, 0.7);
  animation: spin 0.8s linear infinite;
}

.playlist-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
  backdrop-filter: blur(14px);
}

.playlist-dialog {
  width: min(520px, calc(100vw - 32px));
  padding: 20px;
  border-radius: 28px;
}

.playlist-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;

  h3 {
    font-size: 1.1rem;
  }

  p {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 0.84rem;
  }
}

.playlist-dialog__close {
  font-size: 1rem;
}

.playlist-dialog__list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.playlist-dialog__state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 64px;
  padding: 14px 16px;
  border-radius: 20px;
  background: var(--panel-muted);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);

  &.is-error {
    color: #ffc5cf;
  }
}

.playlist-dialog__retry,
.playlist-dialog__item {
  border-radius: 20px;
}

.playlist-dialog__retry {
  min-height: 34px;
}

.playlist-dialog__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding-inline: 16px;
  border-radius: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .search-home__toolbar {
    grid-template-columns: 1fr;
  }

  .search-home__submit {
    min-height: 50px;
  }

  .playlist-detail__hero {
    grid-template-columns: 1fr;
  }

  .playlist-detail__cover-shell {
    width: min(280px, 100%);
  }
}
</style>
