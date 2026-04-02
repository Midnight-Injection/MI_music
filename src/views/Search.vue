<template>
  <div class="search-page page-shell">
    <section class="search-home glass-panel">
      <div class="search-home__hero">
        <div class="search-home__copy">
          <span class="search-home__eyebrow app-pill accent compact">Search Home</span>
          <h1>搜索歌曲</h1>
          <p>输入关键词后直接搜索、试听，并加入当前播放队列或歌单。</p>
        </div>
      </div>

      <div class="search-home__toolbar">
        <div class="search-home__search-shell">
          <NInput
            ref="searchInputRef"
            v-model:value="searchKeyword"
            type="text"
            placeholder="搜索歌曲、歌手、专辑..."
            round
            clearable
            @keyup.enter="handleSearchSubmit"
          >
            <template #prefix>
              <svg
                style="width: 18px; height: 18px; color: var(--text-secondary)"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
            </template>
          </NInput>
        </div>

        <NButton type="primary" round @click="handleSearchSubmit">开始搜索</NButton>
      </div>

      <section class="channel-tabs">
        <NButton
          v-for="option in PLATFORM_SOURCE_OPTIONS"
          :key="option.value"
          size="small"
          round
          :type="selectedChannel === option.value ? 'primary' : 'default'"
          :disabled="!availableChannelSet.has(option.value)"
          @click="handleChannelChange(option.value)"
        >
          {{ option.label }}
        </NButton>
      </section>
    </section>

    <section class="search-results">
      <NAlert v-if="searchError" type="error" :show-icon="false">{{ searchError }}</NAlert>
      <NAlert
        v-if="playlistNotice.message"
        :type="
          playlistNotice.type === 'success'
            ? 'success'
            : playlistNotice.type === 'error'
              ? 'error'
              : 'info'
        "
        :show-icon="false"
      >
        {{ playlistNotice.message }}
      </NAlert>

      <div class="results-container glass-panel section-card">
        <div class="results-header">
          <div>
            <span class="results-count">搜索结果</span>
            <p class="results-subtitle">{{ resultsSubtitle }}</p>
          </div>
          <span class="results-badge app-pill primary compact">{{ resultsBadge }}</span>
        </div>

        <div v-if="hasResults" class="results-columns">
          <span>#</span>
          <span>Title</span>
          <span>Artist</span>
          <span>Album</span>
          <span>Time</span>
        </div>

        <div v-if="isSearching" class="loading-state">
          <NSpin size="medium" />
          <p>搜索中...</p>
        </div>

        <template v-else-if="hasResults">
          <div class="song-list">
            <motion.div
              v-for="(music, index) in searchResults"
              :key="music.id"
              class="song-motion-item"
              :initial="staggeredEnter(index).initial"
              :animate="staggeredEnter(index).animate"
            >
              <SongItem
                :music="music"
                @play="handlePlay"
                @add-to-list="handleAddToList"
                @add-to-playlist="handleAddToPlaylist"
                @context-menu="showSongMenu"
              />
            </motion.div>
          </div>

          <div class="pagination-bar">
            <NButton
              size="small"
              secondary
              :disabled="isLoadingMore || !canGoPrev"
              @click="handlePageChange(currentPage - 1)"
            >
              上一页
            </NButton>
            <span class="pagination-status" :class="{ 'is-loading': isLoadingMore }">
              {{ isLoadingMore ? '切换中...' : `第 ${currentPage} 页` }}
            </span>
            <NButton
              size="small"
              secondary
              :disabled="isLoadingMore || !canGoNext"
              @click="handlePageChange(currentPage + 1)"
            >
              下一页
            </NButton>
          </div>
        </template>
      </div>
    </section>
    <NModal
      v-model:show="addToPlaylistDialog.show"
      :mask-closable="true"
      @after-leave="closeAddToPlaylistDialog"
    >
      <NCard
        class="playlist-dialog"
        :title="'添加到歌单'"
        :bordered="false"
        size="small"
        style="width: min(420px, 100%); border-radius: 26px"
      >
        <template #header-extra>
          <NButton text @click="closeAddToPlaylistDialog">×</NButton>
        </template>
        <p
          v-if="addToPlaylistDialog.music"
          style="margin-top: 6px; color: var(--text-secondary); font-size: 0.76rem"
        >
          {{ addToPlaylistDialog.music.name }} · {{ addToPlaylistDialog.music.artist }}
        </p>
        <div class="playlist-dialog__list">
          <div
            v-if="playlistStore.isSyncing && !playlistStore.isReady"
            class="playlist-dialog__state"
          >
            正在加载歌单...
          </div>
          <div v-else-if="playlistStore.initError" class="playlist-dialog__state is-error">
            <span>{{ playlistStore.initError }}</span>
            <NButton size="small" warning type="warning" @click="retryPlaylistInit">重试</NButton>
          </div>
          <div v-else-if="playlistStore.playlists.length === 0" class="playlist-dialog__state">
            暂无可用歌单，请先去"我的歌单"创建一个歌单。
          </div>
          <NButton
            v-else
            v-for="playlist in playlistStore.playlists"
            :key="playlist.id"
            size="medium"
            secondary
            block
            @click="confirmAddToPlaylist(playlist.id)"
            style="margin-bottom: 8px"
          >
            <span style="display: flex; justify-content: space-between; width: 100%">
              <span>{{ getPlaylistLabel(playlist.systemKey) }}</span>
              <span>{{ playlist.name }} · {{ playlist.musics.length }} 首</span>
            </span>
          </NButton>
        </div>
      </NCard>
    </NModal>

    <FloatingMenu
      :show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      :items="songMenuItems"
      @select="handleSongMenuSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { useRoute } from 'vue-router'
import { NInput, NButton, NModal, NCard, NSpin, NAlert, useMessage, type InputInst } from 'naive-ui'
import FloatingMenu from '../components/context/FloatingMenu.vue'
import SongItem from '../components/SongItem.vue'
import { useTrackDownload } from '../composables/useTrackDownload'
import { staggeredEnter } from '../lib/motion'
import { useSearchService, buildSearchResultPayload } from '../modules/search/searchService'
import type { SearchRuntimeSnapshot } from '../modules/search/types'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import { useSearchStore } from '../store/search'
import type { ContextMenuItem } from '../types/context-menu'
import type { Playlist } from '../types/playlist'
import type { MusicInfo, SearchChannel } from '../types/music'
import type { AggregateChannelProgress } from '../modules/search/types'

const message = useMessage()

const PLATFORM_SOURCE_OPTIONS = [
  { value: 'all', label: '综合' },
  { value: 'kw', label: '酷我' },
  { value: 'kg', label: '酷狗' },
  { value: 'wy', label: '网易' },
  { value: 'tx', label: '腾讯' },
  { value: 'mg', label: '咪咕' },
] as const

type ChannelOption = (typeof PLATFORM_SOURCE_OPTIONS)[number]
type ChannelId = ChannelOption['value']

const route = useRoute()
const searchStore = useSearchStore()
const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const searchService = useSearchService()
const { downloadTrack } = useTrackDownload()

const searchInputRef = ref<InputInst>()
const isLoadingMore = ref(false)
const isSearchingLocal = ref(false)
const debounceTimer = ref<number>()
const searchRequestId = ref(0)
const builtInChannelIds = ref<SearchRuntimeSnapshot['builtInChannelIds']>(['kw'])
const scriptCapabilities = ref<SearchRuntimeSnapshot['scriptCapabilities']>({})
const addToPlaylistDialog = ref<{
  show: boolean
  music: MusicInfo | null
}>({
  show: false,
  music: null,
})
const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  music: null as MusicInfo | null,
})
const playlistNotice = ref<{
  type: 'success' | 'info' | 'error'
  message: string
}>({
  type: 'info',
  message: '',
})
let playlistNoticeTimer: number | null = null
const songMenuItems: ContextMenuItem[] = [
  { key: 'play', label: '▶ 立即播放' },
  { key: 'play-next', label: '↳ 下一首播放' },
  { key: 'add-to-playlist', label: '+ 添加到歌单' },
  { key: 'download', label: '↓ 下载歌曲' },
]

const searchKeyword = computed({
  get: () => searchStore.currentKeyword,
  set: (value: string) => searchStore.setKeyword(value),
})
const selectedChannel = computed<ChannelId>({
  get: () => searchStore.currentChannel as ChannelId,
  set: (value) => searchStore.setChannel(value),
})

const searchResults = computed(() => searchStore.searchResults)
const isSearching = computed(() => isSearchingLocal.value)
const hasResults = computed(() => searchStore.hasResults)
const canGoNext = computed(() => searchStore.canLoadMore)
const canGoPrev = computed(() => searchStore.canGoPrev)
const currentPage = computed(() => searchStore.currentPage)
const totalCount = computed(() => searchStore.totalCount)
const searchError = computed(() => searchStore.currentError)
const aggregateSummary = computed(() => searchStore.aggregateSummary)
const isAggregateSettling = computed(() => searchStore.isSettling)
const availableChannelSet = computed(() =>
  searchService.getAvailableChannelSet({
    builtInChannelIds: builtInChannelIds.value,
    scriptCapabilities: scriptCapabilities.value,
  })
)
const resultsSubtitle = computed(() => {
  if (selectedChannel.value !== 'all') {
    return `当前渠道：${getChannelName(selectedChannel.value)} · 每页 ${searchStore.pageSize} 条`
  }

  const summary = aggregateSummary.value
  if (!summary.totalChannels) {
    return `当前渠道：综合搜索 · 每页 ${searchStore.pageSize} 条`
  }

  if (isAggregateSettling.value) {
    return `综合搜索 · 已完成 ${summary.completedChannels}/${summary.totalChannels} 渠道`
  }

  return `综合搜索 · 成功 ${summary.successChannels} · 失败 ${summary.failedChannels} · 超时 ${summary.timedOutChannels}`
})
const resultsBadge = computed(() => {
  const baseText = `第 ${currentPage.value} 页 · ${totalCount.value || searchResults.value.length} 条`
  if (selectedChannel.value === 'all' && isAggregateSettling.value) {
    return `${baseText} · 聚合中`
  }
  return baseText
})

async function refreshAvailableChannels() {
  const availability = await searchService.refreshAvailability()
  builtInChannelIds.value = availability.builtInChannelIds
  scriptCapabilities.value = availability.scriptCapabilities
}

function createSearchRequestId() {
  searchRequestId.value += 1
  return searchRequestId.value
}

function isActiveSearchRequest(requestId: number) {
  return searchRequestId.value === requestId
}

function clearPendingSearchState() {
  searchRequestId.value += 1
  isSearchingLocal.value = false
  isLoadingMore.value = false
  searchStore.isSearching = false
  searchStore.cancelActiveSearch()
}

function handleSearchSubmit() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  return handleSearch()
}

async function handleSearch(page = 1) {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  const requestId = createSearchRequestId()
  const channel = selectedChannel.value

  searchStore.clearError()
  searchStore.beginSearch(requestId, keyword, channel, page)
  if (page === 1) {
    searchStore.addRecentKeyword(keyword)
  }

  try {
    if (page === 1) {
      isSearchingLocal.value = true
    } else {
      isLoadingMore.value = true
    }
    searchStore.isSearching = true
    const result = await searchService.runSearch(
      {
        keyword,
        channel,
        page,
        limit: searchStore.pageSize,
      },
      channel === 'all'
        ? {
            onStart(channels) {
              searchStore.beginAggregateSearch(requestId, channels, {
                clearResults: page === 1,
              })
            },
            onPartial(partialChannel, tracks) {
              searchStore.mergeAggregateResults(requestId, partialChannel, tracks, keyword, page)
            },
            onChannelSettled(progress: AggregateChannelProgress) {
              searchStore.markAggregateChannel(requestId, progress)
            },
            onComplete(aggregateResult) {
              searchStore.finalizeAggregateSearch(requestId, aggregateResult)
            },
          }
        : undefined
    )

    if (!isActiveSearchRequest(requestId)) return

    if (page > 1 && result.data.length === 0) {
      searchStore.setResults({
        ...buildSearchResultPayload(
          searchStore.searchResults,
          channel,
          page - 1,
          searchStore.pageSize
        ),
        hasMore: false,
      })
      return
    }

    searchStore.setSearchParams(keyword, channel, page)
    if (channel !== 'all') {
      searchStore.setResults(result)
    } else {
      searchStore.finalizeAggregateSearch(requestId, result)
    }
    searchStore.clearError()
  } catch (error) {
    if (!isActiveSearchRequest(requestId)) return
    console.error('Search failed:', error)
    if (page === 1) {
      searchStore.clearResults()
    }
    searchStore.setError(error instanceof Error ? error.message : String(error))
  } finally {
    if (isActiveSearchRequest(requestId)) {
      if (page === 1) {
        isSearchingLocal.value = false
      } else {
        isLoadingMore.value = false
      }
      searchStore.isSearching = false
    }
  }
}

async function handlePageChange(page: number) {
  if (isLoadingMore.value || page < 1 || page === currentPage.value) return
  await handleSearch(page)
}

function handleClear() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  clearPendingSearchState()
  searchKeyword.value = ''
  searchStore.clearResults()
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function handleChannelChange(channel: SearchChannel) {
  if (selectedChannel.value === channel) return
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  clearPendingSearchState()
  selectedChannel.value = channel
  searchStore.clearError()

  if (searchKeyword.value.trim()) {
    void handleSearch()
  }
}

async function handlePlay(music: MusicInfo) {
  try {
    await playerStore.playFromQueueContext(music)
  } catch (error) {
    console.error('[Search] Failed to play music:', error)
    searchStore.setError(error instanceof Error ? error.message : '播放失败，请重试')
  }
}

function handleAddToList(music: MusicInfo) {
  const currentList = [...playerStore.playlist]
  const index = currentList.findIndex((item) => item.id === music.id)

  if (index === -1) playerStore.setPlaylist([...currentList, music], currentList.length)
  else playerStore.setPlaylist(currentList, index)
}

function showSongMenu(event: MouseEvent, music: MusicInfo) {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    music,
  }
}

function hideContextMenu() {
  contextMenu.value.show = false
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

async function handleAddToPlaylist(music: MusicInfo) {
  addToPlaylistDialog.value = {
    show: true,
    music,
  }

  if (!playlistStore.isReady && !playlistStore.isSyncing) {
    try {
      await playlistStore.init()
    } catch (error) {
      console.error('[Search] Playlist store init failed while opening dialog:', error)
      setPlaylistNotice('error', playlistStore.initError || '歌单尚未初始化完成，请稍后重试')
    }
  }
}

function closeAddToPlaylistDialog() {
  addToPlaylistDialog.value = {
    show: false,
    music: null,
  }
}

function queueMusicNext(music: MusicInfo) {
  const playlist = [...playerStore.playlist]
  const currentIndex = playerStore.currentIndex
  playlist.splice(currentIndex + 1, 0, music)
  playerStore.setPlaylist(playlist, currentIndex)
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
    console.error('[Search] Failed to download music:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '下载失败，请重试')
  }
}

function handleSongMenuSelect(key: string) {
  const music = contextMenu.value.music
  if (!music) {
    hideContextMenu()
    return
  }

  switch (key) {
    case 'play':
      void handlePlay(music)
      hideContextMenu()
      return
    case 'play-next':
      queueMusicNext(music)
      hideContextMenu()
      return
    case 'add-to-playlist':
      void handleAddToPlaylist(music)
      hideContextMenu()
      return
    case 'download':
      void downloadMusicFromContext()
      return
    default:
      hideContextMenu()
  }
}

async function confirmAddToPlaylist(playlistId: number) {
  if (!addToPlaylistDialog.value.music) return

  try {
    await playlistStore.ensureReady()
    const playlist = playlistStore.playlists.find((item) => item.id === playlistId)
    const result = await playlistStore.addMusicToPlaylist(
      playlistId,
      addToPlaylistDialog.value.music
    )
    closeAddToPlaylistDialog()
    setPlaylistNotice(
      result.status === 'added' ? 'success' : 'info',
      result.status === 'added'
        ? `已添加到${playlist?.name || '歌单'}`
        : `${playlist?.name || '该歌单'}中已存在这首歌`
    )
  } catch (error) {
    console.error('[Search] Failed to add music to playlist:', error)
    setPlaylistNotice('error', error instanceof Error ? error.message : '添加到歌单失败，请重试')
  }
}

async function retryPlaylistInit() {
  try {
    await playlistStore.init()
  } catch (error) {
    console.error('[Search] Retry playlist init failed:', error)
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

function getChannelName(channel: string): string {
  if (channel === 'all') return '综合搜索'
  return PLATFORM_SOURCE_OPTIONS.find((option) => option.value === channel)?.label || channel
}

watch(
  availableChannelSet,
  (channels) => {
    if (!channels.has(selectedChannel.value)) {
      selectedChannel.value = (Array.from(channels)[0] as ChannelId | undefined) || 'kw'
    }
  },
  { immediate: true }
)

watch(
  () => [route.query.q, route.query.stamp],
  async ([query]) => {
    if (route.name !== 'Search') return

    const normalizedQuery = typeof query === 'string' ? query.trim() : ''
    if (!normalizedQuery) return

    if (normalizedQuery !== searchKeyword.value.trim()) {
      searchKeyword.value = normalizedQuery
    }

    await handleSearch()
  },
  { immediate: true }
)

onMounted(async () => {
  document.addEventListener('click', hideContextMenu)
  await refreshAvailableChannels()
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  if (playlistNoticeTimer !== null) {
    window.clearTimeout(playlistNoticeTimer)
  }
})
</script>

<style scoped lang="scss">
.search-page {
  height: 100%;
  overflow-y: auto;

  &.page-shell {
    width: 100%;
    max-width: none;
    padding: 0 0 0 0;
  }
}

.search-home {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 24%),
    radial-gradient(circle at bottom left, rgba(231, 215, 255, 0.18), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08));
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

.search-home__toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.search-home__search-shell {
  position: relative;
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
  background: rgba(101, 76, 157, 0.32);
  color: var(--text-primary);
  font-size: 0.86rem;
  outline: none;

  &:focus {
    border-color: rgba(255, 255, 255, 0.22);
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
  }
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

.search-results {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 12px;
}

.search-error,
.playlist-notice {
  padding: 12px 14px;
  border-radius: 16px;
  font-size: 0.86rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.search-error {
  background: color-mix(in srgb, #ff6b81 14%, rgba(255, 255, 255, 0.04));
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

.results-container {
  padding: 16px 18px 14px;
  border-radius: var(--radius-md);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.results-count {
  display: block;
  font-size: 1rem;
  font-weight: 700;
}

.results-subtitle {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.76rem;
}

.results-badge {
  font-size: 0.72rem;
}

.results-columns {
  display: grid;
  grid-template-columns: 40px minmax(0, 1.5fr) minmax(0, 1fr) minmax(120px, 0.9fr) 56px;
  gap: 12px;
  align-items: center;
  padding: 10px 14px 8px;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.song-list {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
}

.song-motion-item + .song-motion-item {
  margin-top: 0;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 320px;
  text-align: center;
  color: var(--text-secondary);
}

.pagination-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding-top: 14px;
}

.pagination-btn {
  min-width: 92px;
}

.pagination-status {
  color: var(--text-secondary);
  font-size: 0.76rem;

  &.is-loading {
    color: var(--text-primary);
  }
}

.spinner {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.16);
  border-top-color: rgba(255, 255, 255, 0.78);
  animation: spin 0.9s linear infinite;
}

.playlist-dialog-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(25, 15, 46, 0.34);
  backdrop-filter: blur(10px);
  z-index: 30;
}

.playlist-dialog {
  width: min(420px, 100%);
  padding: 18px;
  border-radius: 26px;
}

.playlist-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;

  h3 {
    font-size: 1rem;
  }

  p {
    margin-top: 6px;
    color: var(--text-secondary);
    font-size: 0.76rem;
  }
}

.playlist-dialog__close {
  font-size: 1rem;
}

.playlist-dialog__list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.playlist-dialog__state {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
  font-size: 0.78rem;

  &.is-error {
    color: #ffd1da;
  }
}

.playlist-dialog__retry,
.playlist-dialog__item {
  min-height: 44px;
  border-radius: 16px;
}

.playlist-dialog__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-inline: 14px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .search-home__toolbar {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .search-home,
  .results-container {
    padding: 16px;
  }

  .search-home__stats,
  .results-columns,
  .search-preview-row {
    grid-template-columns: 1fr;
  }

  .results-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .song-list {
    max-height: none;
  }

  .search-preview-list {
    max-height: none;
  }
}
</style>
