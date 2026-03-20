<template>
  <div class="search-page page-shell">
    <section class="search-stage">
      <div class="search-stage__hero glass-panel">
        <div class="search-stage__copy">
          <div class="search-stage__input-shell">
            <svg class="search-stage__icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              ref="searchInputRef"
              v-model="searchKeyword"
              type="text"
              placeholder="搜索歌曲、歌手、专辑..."
              class="search-stage__input"
              @input="handleSearchInput"
              @keyup.enter="handleSearchSubmit"
            />
            <button v-if="searchKeyword" class="search-stage__clear" @click="handleClear">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          <div class="page-meta-row">
            <button
              v-for="item in quickHistory"
              :key="`${item.keyword}-${item.timestamp}`"
              class="page-meta-pill search-stage__history-pill"
              @click="handleHistoryClick(item)"
            >
              {{ item.keyword }}
            </button>
          </div>

          <div v-if="showHistory && searchHistory.length > 0" class="history-dropdown glass-panel">
            <div class="history-header">
              <span class="history-title">最近搜索</span>
              <button class="clear-history-btn" @click="handleClearHistory">清空</button>
            </div>
            <div class="history-list">
              <div
                v-for="item in searchHistory"
                :key="`${item.keyword}-${item.timestamp}`"
                class="history-item"
                @click="handleHistoryClick(item)"
              >
                <span class="history-keyword">{{ item.keyword }}</span>
                <span class="history-source">{{ getChannelName(item.channel) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section class="channel-tabs">
        <button
          v-for="option in PLATFORM_SOURCE_OPTIONS"
          :key="option.value"
          type="button"
          class="channel-tabs__item"
          :class="{ 'is-active': selectedChannel === option.value, 'is-disabled': !availableChannelSet.has(option.value) }"
          :disabled="!availableChannelSet.has(option.value)"
          @click="handleChannelChange(option.value)"
        >
          {{ option.label }}
        </button>
      </section>
    </section>

    <section class="search-results">
      <div v-if="searchError" class="search-error">{{ searchError }}</div>

      <div v-if="isSearching" class="loading-state glass-panel section-card">
        <div class="spinner"></div>
        <p>搜索中...</p>
      </div>

      <div v-else-if="!hasResults && searchKeyword" class="empty-state glass-panel section-card">
        <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <p>未找到相关歌曲</p>
      </div>

      <div v-else-if="hasResults" class="results-container glass-panel section-card">
        <div class="results-header">
            <div>
              <span class="results-count">第 {{ currentPage }} 页 · 本页 {{ totalCount }} 条</span>
              <p class="results-subtitle">{{ resultsSubtitle }}</p>
            </div>
          </div>

        <div class="song-list" v-auto-animate>
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
            />
          </motion.div>
        </div>

        <div class="pagination-bar">
          <button
            class="pagination-btn"
            :disabled="isLoadingMore || !canGoPrev"
            @click="handlePageChange(currentPage - 1)"
          >
            上一页
          </button>
          <span class="pagination-status" :class="{ 'is-loading': isLoadingMore }">
            {{ isLoadingMore ? '切换中...' : `第 ${currentPage} 页` }}
          </span>
          <button
            class="pagination-btn"
            :disabled="isLoadingMore || !canGoNext"
            @click="handlePageChange(currentPage + 1)"
          >
            下一页
          </button>
        </div>
      </div>

      <div v-else class="initial-state glass-panel section-card">
        <span class="page-kicker">Ready</span>
        <p>从上方输入关键词开始搜索。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { motion } from 'motion-v'
import { useRoute } from 'vue-router'
import SongItem from '../components/SongItem.vue'
import { staggeredEnter } from '../lib/motion'
import { useSearchService, buildSearchResultPayload } from '../modules/search/searchService'
import type { SearchRuntimeSnapshot } from '../modules/search/types'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import { useSearchStore } from '../store/search'
import type { SearchHistoryItem } from '../store/search'
import type { MusicInfo, SearchChannel } from '../types/music'

const PLATFORM_SOURCE_OPTIONS = [
  { value: 'kw', label: '酷我' },
  { value: 'kg', label: '酷狗' },
  { value: 'wy', label: '网易' },
  { value: 'tx', label: '腾讯' },
  { value: 'mg', label: '咪咕' },
] as const

type ChannelId = typeof PLATFORM_SOURCE_OPTIONS[number]['value']

const route = useRoute()
const searchStore = useSearchStore()
const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const searchService = useSearchService()

const searchInputRef = ref<HTMLInputElement>()
const searchKeyword = ref('')
const selectedChannel = ref<ChannelId>('kw')
const showHistory = ref(false)
const isLoadingMore = ref(false)
const isSearchingLocal = ref(false)
const debounceTimer = ref<number>()
const searchError = ref('')
const searchRequestId = ref(0)
const builtInChannelIds = ref<SearchRuntimeSnapshot['builtInChannelIds']>(['kw'])
const scriptCapabilities = ref<SearchRuntimeSnapshot['scriptCapabilities']>({})

const searchResults = computed(() => searchStore.searchResults)
const isSearching = computed(() => isSearchingLocal.value)
const hasResults = computed(() => searchStore.hasResults)
const canGoNext = computed(() => searchStore.canLoadMore)
const canGoPrev = computed(() => searchStore.canGoPrev)
const currentPage = computed(() => searchStore.currentPage)
const totalCount = computed(() => searchStore.totalCount)
const searchHistory = computed(() => searchStore.searchHistory)
const quickHistory = computed(() => searchHistory.value.slice(0, 4))
const availableChannelSet = computed(() =>
  searchService.getAvailableChannelSet(
    {
      builtInChannelIds: builtInChannelIds.value,
      scriptCapabilities: scriptCapabilities.value,
    },
  ),
)
const resultsSubtitle = computed(() => `当前渠道：${getChannelName(selectedChannel.value)} · 每页 ${searchStore.pageSize} 条`)

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
}

function handleSearchInput() {
  showHistory.value = searchKeyword.value.length > 0
}

function handleSearchSubmit() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  return handleSearch()
}

async function handleSearch(page = 1, trackHistory = true) {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  const requestId = createSearchRequestId()
  showHistory.value = false
  searchError.value = ''

  try {
    if (page === 1) {
      isSearchingLocal.value = true
    } else {
      isLoadingMore.value = true
    }
    searchStore.isSearching = true
    const channel = selectedChannel.value
    const result = await searchService.searchTracks({
      keyword,
      channel,
      page,
      limit: searchStore.pageSize,
    })

    if (!isActiveSearchRequest(requestId)) return

    if (page > 1 && result.data.length === 0) {
      searchStore.setResults({
        ...buildSearchResultPayload(searchStore.searchResults, channel, page - 1, searchStore.pageSize),
        hasMore: false,
      })
      return
    }

    searchStore.setSearchParams(keyword, channel, page)
    searchStore.setResults(result)

    if (trackHistory && page === 1) {
      searchStore.addToHistory(keyword, channel)
    }
  } catch (error) {
    if (!isActiveSearchRequest(requestId)) return
    console.error('Search failed:', error)
    if (page === 1) {
      searchStore.clearResults()
    }
    searchError.value = error instanceof Error ? error.message : String(error)
  } finally {
    if (!isActiveSearchRequest(requestId)) return
    if (page === 1) {
      isSearchingLocal.value = false
    } else {
      isLoadingMore.value = false
    }
    searchStore.isSearching = false
  }
}

async function handlePageChange(page: number) {
  if (isLoadingMore.value || page < 1 || page === currentPage.value) return
  await handleSearch(page, false)
}

function handleClear() {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  clearPendingSearchState()
  searchKeyword.value = ''
  showHistory.value = false
  searchError.value = ''
  searchStore.clearResults()
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function handleChannelChange(channel: ChannelId) {
  if (selectedChannel.value === channel) return
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  clearPendingSearchState()
  selectedChannel.value = channel
  showHistory.value = false
  searchError.value = ''

  if (searchKeyword.value.trim()) {
    void handleSearch()
  }
}

function handleClearHistory() {
  searchStore.clearHistory()
}

function handleHistoryClick(item: SearchHistoryItem) {
  if (debounceTimer.value) clearTimeout(debounceTimer.value)
  searchKeyword.value = item.keyword
  selectedChannel.value = availableChannelSet.value.has(item.channel as SearchChannel)
    ? item.channel as ChannelId
    : (Array.from(availableChannelSet.value)[0] as ChannelId | undefined) || 'kw'
  showHistory.value = false
  handleSearch()
}

async function handlePlay(music: MusicInfo) {
  try {
    await playerStore.playMusic(music)
  } catch (error) {
    console.error('[Search] Failed to play music:', error)
    searchError.value = error instanceof Error ? error.message : '播放失败，请重试'
  }
}

function handleAddToList(music: MusicInfo) {
  const currentList = [...playerStore.playlist]
  const index = currentList.findIndex((item) => item.id === music.id)

  if (index === -1) playerStore.setPlaylist([...currentList, music], currentList.length)
  else playerStore.setPlaylist(currentList, index)
}

function handleAddToPlaylist(music: MusicInfo) {
  const defaultPlaylist = playlistStore.playlists[0]
  if (defaultPlaylist) playlistStore.addMusicToPlaylist(defaultPlaylist.id, music)
}

function getChannelName(channel: string): string {
  if (channel === 'all') return '综合(已停用)'
  return PLATFORM_SOURCE_OPTIONS.find((option) => option.value === channel)?.label || channel
}

watch(
  availableChannelSet,
  (channels) => {
    if (!channels.has(selectedChannel.value)) {
      selectedChannel.value = (Array.from(channels)[0] as ChannelId | undefined) || 'kw'
    }
  },
  { immediate: true },
)

onMounted(async () => {
  searchStore.loadHistory()
  await refreshAvailableChannels()

  const query = route.query.q
  if (typeof query === 'string' && query.trim()) {
    searchKeyword.value = query.trim()
    await handleSearch()
  }
})
</script>

<style scoped lang="scss">
.search-page {
  height: 100%;
  overflow-y: auto;

  &.page-shell {
    padding-top: 12px;
  }
}

.search-stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.search-stage__hero {
  position: relative;
  display: block;
  padding: 24px;
  border-radius: var(--radius-lg);
}

.search-stage__copy {
  position: relative;
}

.search-stage__input-shell {
  position: relative;
}

.search-stage__icon {
  position: absolute;
  top: 50%;
  left: 18px;
  width: 20px;
  height: 20px;
  transform: translateY(-50%);
  color: var(--text-secondary);
  pointer-events: none;
}

.search-stage__input {
  width: 100%;
  min-height: 56px;
  padding: 0 56px 0 50px;
  border-radius: 22px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  color: var(--text-primary);
  font-size: 1.02rem;
  outline: none;

  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary-color) 14%, transparent);
  }
}

.search-stage__clear {
  position: absolute;
  top: 50%;
  right: 16px;
  width: 28px;
  height: 28px;
  transform: translateY(-50%);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--text-secondary);

  &:hover {
    background: var(--bg-hover);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.search-stage__history-pill {
  cursor: pointer;
}

.channel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.channel-tabs__item {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--bg-secondary) 84%, transparent);
  color: var(--text-secondary);
  font-weight: 600;

  &.is-active {
    background: color-mix(in srgb, var(--primary-light) 92%, transparent);
    color: var(--primary-color);
    border-color: color-mix(in srgb, var(--primary-color) 22%, transparent);
  }

  &.is-disabled {
    opacity: 0.45;
  }
}

.history-dropdown {
  position: absolute;
  top: calc(100% + 22px);
  left: 12px;
  width: min(calc(100% - 24px), 596px);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  z-index: 20;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-color);
}

.history-title {
  font-size: 0.7rem;
  font-weight: 700;
}

.clear-history-btn {
  color: var(--text-secondary);
  font-size: 0.66rem;
}

.history-list {
  max-height: 280px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 14px;
  cursor: pointer;

  &:hover {
    background: var(--bg-hover);
  }
}

.history-keyword {
  color: var(--text-primary);
  font-size: 0.76rem;
}

.history-source {
  color: var(--text-secondary);
  font-size: 0.66rem;
}

.search-results {
  padding-bottom: 28px;
}

.search-error {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(239, 68, 68, 0.12);
  color: var(--error-color);
  font-size: 0.84rem;
}

.loading-state,
.empty-state,
.initial-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 220px;
  text-align: center;
  color: var(--text-secondary);
}

.empty-icon {
  width: 72px;
  height: 72px;
  opacity: 0.5;
}

.results-container {
  border-radius: var(--radius-lg);
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-color);
}

.results-count {
  display: block;
  font-size: 0.92rem;
  font-weight: 700;
}

.results-subtitle {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 0.82rem;
}

.song-list {
  padding-top: 10px;
}

.song-motion-item + .song-motion-item {
  margin-top: 8px;
}

.pagination-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding-top: 18px;
}

.pagination-btn {
  min-height: 40px;
  min-width: 96px;
  padding: 0 20px;
  border-radius: 999px;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-primary);

  &:hover:not(:disabled) {
    border-color: var(--primary-color);
    background: var(--bg-hover);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.pagination-status {
  min-width: 92px;
  text-align: center;
  font-size: 0.83rem;
  color: var(--text-secondary);

  &.is-loading {
    color: var(--text-primary);
  }
}

@media (max-width: 980px) {
  .channel-tabs {
    gap: 10px;
  }
}
</style>
