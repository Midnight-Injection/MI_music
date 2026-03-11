<template>
  <div class="search-page">
    <div class="search-container">
      <!-- Search Input Section -->
      <div class="search-header">
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            ref="searchInputRef"
            v-model="searchKeyword"
            type="text"
            placeholder="搜索歌曲、歌手..."
            class="search-input"
            @input="handleSearchInput"
            @keyup.enter="handleSearch"
          />
          <button
            v-if="searchKeyword"
            class="clear-btn"
            @click="handleClear"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div class="source-selectors">
          <!-- 自定义音源选择器 -->
          <div class="selector-group">
            <label class="selector-label">自定义音源</label>
            <select v-model="selectedUserSourceId" class="source-select" :disabled="userSourceOptions.length === 0">
              <option value="">自动选择（使用所有已启用音源）</option>
              <option
                v-for="source in userSourceOptions"
                :key="source.id"
                :value="source.id"
              >
                {{ source.name }} {{ source.canSearch ? '' : '(不支持搜索)' }}
              </option>
            </select>
          </div>

          <!-- 平台渠道选择器 -->
          <div class="selector-group">
            <label class="selector-label">平台渠道</label>
            <select v-model="selectedChannel" class="source-select">
              <option
                v-for="option in platformSourceOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>

          <p class="source-hint">
            平台渠道用于搜索；自定义音源用于播放。指定音源时，搜索结果会绑定该音源播放，并在相同渠道下尝试补充搜索结果。
          </p>
        </div>
      </div>

      <!-- Search History Dropdown -->
      <div v-if="showHistory && searchHistory.length > 0" class="history-dropdown">
        <div class="history-header">
          <span class="history-title">搜索历史</span>
          <button class="clear-history-btn" @click="handleClearHistory">清空</button>
        </div>
        <div class="history-list">
          <div
            v-for="item in searchHistory"
            :key="`${item.keyword}-${item.timestamp}`"
            class="history-item"
            @click="handleHistoryClick(item)"
          >
            <svg class="history-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
            </svg>
            <span class="history-keyword">{{ item.keyword }}</span>
            <span class="history-source">{{ getChannelName(item.channel) }}</span>
          </div>
        </div>
      </div>

      <!-- Search Results -->
      <div v-if="!showHistory" class="search-results">
        <div v-if="searchError" class="search-error">{{ searchError }}</div>

        <div v-if="isSearching" class="loading-state">
          <div class="spinner"></div>
          <p>搜索中...</p>
        </div>

        <div v-else-if="!hasResults && searchKeyword" class="empty-state">
          <svg class="empty-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <p>未找到相关歌曲</p>
        </div>

        <div v-else-if="hasResults" class="results-container">
          <div class="results-header">
            <span class="results-count">找到 {{ totalCount }} 首歌曲</span>
            <span class="results-source">渠道: {{ getChannelName(selectedChannel) }}</span>
          </div>

          <div class="song-list">
            <SongItem
              v-for="(music, index) in searchResults"
              :key="music.id"
              :music="music"
              v-motion
              :initial="{ opacity: 0, y: 20 }"
              :enter="{ opacity: 1, y: 0, transition: { delay: index * 50, duration: 300 } }"
              @play="handlePlay"
              @add-to-list="handleAddToList"
              @add-to-playlist="handleAddToPlaylist"
            />
          </div>

          <div v-if="canLoadMore" class="load-more">
            <button
              class="load-more-btn"
              :disabled="isLoadingMore"
              @click="handleLoadMore"
            >
              {{ isLoadingMore ? '加载中...' : '加载更多' }}
            </button>
          </div>
        </div>

        <div v-else class="initial-state">
          <svg class="search-icon-large" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <p>在上方输入框搜索歌曲、歌手...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useSearchStore } from '../store/search'
import { usePlayerStore } from '../store/player'
import { usePlaylistStore } from '../store/playlist'
import { useUserSourceStore } from '../stores/userSource'
import { useSettingsStore } from '../store/settings'
import { useScriptRuntime, type MusicSource, type ScriptCapability } from '../composables/useScriptRuntime'
import SongItem from '../components/SongItem.vue'
import { invoke } from '@tauri-apps/api/core'
import type { MusicInfo, ChannelSearchResultItem, QualityInfo } from '../types/music'
import type { SearchHistoryItem } from '../store/search'

const PLATFORM_SOURCE_OPTIONS = [
  { value: 'kw', label: '酷我' },
  { value: 'kg', label: '酷狗' },
  { value: 'wy', label: '网易' },
  { value: 'tx', label: '腾讯' },
  { value: 'mg', label: '咪咕' },
] as const

type ChannelId = typeof PLATFORM_SOURCE_OPTIONS[number]['value']

type ScriptSearchResultItem = Partial<ChannelSearchResultItem> & {
  singer?: string
  artist?: string
  album?: string
  albumName?: string
  album_name?: string
  interval?: string | number
  img?: string
  pic?: string
  cover?: string
  songmid?: string
  mid?: string
  hash?: string
  albumId?: string
  album_id?: string
  source?: string
  type?: string
  __sourceChannel?: string
  qualitys?: string[]
}

const searchStore = useSearchStore()
const playerStore = usePlayerStore()
const playlistStore = usePlaylistStore()
const userSourceStore = useUserSourceStore()
const settingsStore = useSettingsStore()
const scriptRuntime = useScriptRuntime()

const searchInputRef = ref<HTMLInputElement>()
const searchKeyword = ref('')
const selectedChannel = ref<ChannelId>('kw')
const showHistory = ref(false)
const isLoadingMore = ref(false)
const isSearchingLocal = ref(false)
const debounceTimer = ref<number>()
const searchError = ref('')
const builtInChannelIds = ref<string[]>(['kw'])
const selectedUserSourceId = ref<string>(settingsStore.settings.activeUserSourceId || '') // 从设置中读取初始值
const scriptCapabilities = ref<Record<string, ScriptCapability>>({})

// 自定义音源选项（包含搜索能力信息）
interface UserSourceOption {
  id: string
  name: string
  canSearch: boolean
  channels: string[]
}
const userSourceOptions = computed<UserSourceOption[]>(() => {
  const capabilities = scriptCapabilities.value
  return userSourceStore.enabledSources.map(source => {
    const cap = capabilities[source.id]
    return {
      id: source.id,
      name: source.name,
      canSearch: cap?.canSearch ?? false,
      channels: cap?.channels ?? [],
    }
  })
})

const searchResults = computed(() => searchStore.searchResults)
const isSearching = computed(() => isSearchingLocal.value)
const hasResults = computed(() => searchStore.hasResults)
const canLoadMore = computed(() => searchStore.canLoadMore)
const totalCount = computed(() => searchStore.totalCount)
const searchHistory = computed(() => searchStore.searchHistory)
const customSearchChannelIds = computed(() => {
  if (selectedUserSourceId.value) {
    const capability = scriptCapabilities.value[selectedUserSourceId.value]
    return capability?.canSearch ? capability.channels : []
  }

  return userSourceOptions.value
    .filter(source => source.canSearch)
    .flatMap(source => source.channels)
})
const availableChannelSet = computed(() => new Set([...builtInChannelIds.value, ...customSearchChannelIds.value]))
const platformSourceOptions = computed(() =>
  PLATFORM_SOURCE_OPTIONS.filter(option => availableChannelSet.value.has(option.value)),
)

function getPreferredPlaybackUserSourceId() {
  if (!selectedUserSourceId.value) return undefined

  const capability = scriptCapabilities.value[selectedUserSourceId.value]
  if (capability?.canGetMusicUrl) {
    return selectedUserSourceId.value
  }

  return undefined
}

function normalizeMusicContext(
  music: MusicInfo,
  searchChannel: string,
  resolvedBy: MusicInfo['resolvedBy'],
): MusicInfo {
  return {
    ...music,
    searchChannel,
    resolvedBy,
    playbackUserSourceId: getPreferredPlaybackUserSourceId(),
  }
}

function buildMusicIdentity(music: MusicInfo): string {
  const channel = music.searchChannel || music.source || 'unknown'
  const songKey = music.hash || music.songmid || music.id
  return `${channel}:${songKey}:${music.name}:${music.artist}`
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 12000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error('搜索超时，请稍后重试')), timeoutMs)
    }),
  ])
}

function parseDuration(interval?: string | number): number {
  if (typeof interval === 'number') return interval
  const match = /^(\d+):(\d+)$/.exec(interval || '')
  if (!match) return 0
  return Number(match[1]) * 60 + Number(match[2])
}

function normalizeQualities(qualities?: unknown): QualityInfo[] | undefined {
  if (!Array.isArray(qualities) || qualities.length === 0) return undefined

  return qualities.map((quality) => {
    if (quality && typeof quality === 'object' && 'type' in quality) {
      const item = quality as QualityInfo
      return {
        type: String(item.type || ''),
        size: String(item.size || ''),
      }
    }

    return {
      type: String(quality || ''),
      size: '',
    }
  })
}

function getItemChannel(item: ScriptSearchResultItem, fallbackChannel: string): string {
  return String(item.source || item.type || item.__sourceChannel || fallbackChannel)
}

function normalizeChannelSearchResult(item: ChannelSearchResultItem): MusicInfo {
  return normalizeMusicContext({
    id: item.id,
    name: item.name,
    artist: item.singer,
    album: item.album_name,
    duration: parseDuration(item.interval),
    url: '',
    cover: item.img,
    source: item.source,
    songmid: item.songmid,
    hash: item.source === 'kg' ? item.songmid : undefined,
    albumId: item.album_id,
    qualities: item.types,
  }, item.source, 'built-in-search')
}

function normalizeScriptSearchResult(item: ScriptSearchResultItem, fallbackChannel: string): MusicInfo {
  const source = getItemChannel(item, fallbackChannel)
  const songmid = String(item.songmid || item.mid || item.id || item.hash || '')
  const id = String(item.id || `${source}_${songmid || `${item.name || 'unknown'}_${item.artist || item.singer || ''}`}`)

  return normalizeMusicContext({
    id,
    name: String(item.name || ''),
    artist: String(item.singer || item.artist || ''),
    album: String(item.album_name || item.albumName || item.album || ''),
    duration: parseDuration(item.interval),
    url: '',
    cover: (item.img || item.pic || item.cover) || undefined,
    source,
    songmid: songmid || undefined,
    hash: item.hash || (source === 'kg' ? songmid : undefined),
    albumId: String(item.album_id || item.albumId || '') || undefined,
    qualities: normalizeQualities(item.types || item.qualitys),
  }, fallbackChannel, 'custom-search')
}

// Helper function to check if running in Tauri context
function isTauriContext(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window
}

async function refreshAvailableChannels() {
  // Check if running in Tauri context
  if (!isTauriContext()) {
    console.warn('[Search] Not running in Tauri context, using default channels')
    builtInChannelIds.value = ['kw']
    scriptCapabilities.value = {}
    return
  }

  try {
    builtInChannelIds.value = await invoke<string[]>('get_available_sources')
  } catch (error) {
    console.error('Failed to load built-in channels:', error)
    builtInChannelIds.value = ['kw']
  }

  try {
    await userSourceStore.loadUserSources()
    if (userSourceStore.enabledSources.length > 0) {
      await scriptRuntime.initialize()
      scriptCapabilities.value = scriptRuntime.getSourceCapabilities()
    } else {
      scriptCapabilities.value = {}
    }
  } catch (error) {
    console.error('Failed to load custom search channels:', error)
    scriptCapabilities.value = {}
  }
}

async function searchWithCustomSource(keyword: string, source: string, page: number, limit: number) {
  if (!selectedUserSourceId.value) {
    return null
  }

  console.log('[Search] Starting custom source search for:', keyword, 'on channel:', source, 'selectedSource:', selectedUserSourceId.value || 'auto')

  await userSourceStore.loadUserSources()
  console.log('[Search] User sources loaded:', userSourceStore.enabledSources.length, 'enabled')

  await scriptRuntime.initialize()
  scriptCapabilities.value = scriptRuntime.getSourceCapabilities()
  console.log('[Search] Script runtime initialized')

  const allCapabilities = scriptCapabilities.value

  // 确定要使用的音源列表
  const sourcesToTry = [selectedUserSourceId.value]
  console.log('[Search] Using selected source:', selectedUserSourceId.value)

  // 依次尝试每个音源
  for (const sourceId of sourcesToTry) {
    const capability = allCapabilities[sourceId]
    console.log('[Search] Checking source:', sourceId, 'capability:', capability)

    if (!capability?.canSearch) {
      console.log('[Search] Source cannot search:', sourceId)
      continue
    }

    if (!capability.channels.includes(source)) {
      console.log('[Search] Source does not support channel:', source, 'available:', capability.channels)
      continue
    }

    try {
      console.log('[Search] Calling scriptRuntime.search with sourceId:', sourceId)
      const result = await withTimeout(scriptRuntime.search(sourceId, keyword, page, limit, source as MusicSource))
      console.log('[Search] Search result count:', result.length)

      if (result.length > 0) {
        return result
          .map(item => item as ScriptSearchResultItem)
          .filter(item => getItemChannel(item, source) === source)
          .map(item => normalizeScriptSearchResult(item, source))
      }
    } catch (error) {
      console.error('[Search] Source search failed:', sourceId, error)
      // 继续尝试下一个音源
    }
  }

  console.log('[Search] No results from any custom source')
  return null
}

async function searchWithBuiltInSource(keyword: string, source: string, page: number, limit: number) {
  if (!isTauriContext() || !builtInChannelIds.value.includes(source)) {
    return []
  }

  const result = await withTimeout(invoke<ChannelSearchResultItem[]>('search_music_sources', {
    keyword,
    source,
    page,
    limit,
  }))

  return result.map(normalizeChannelSearchResult)
}

async function runSearch(keyword: string, source: string, page: number, limit: number) {
  const builtInResults = await searchWithBuiltInSource(keyword, source, page, limit)
  const customResults = await searchWithCustomSource(keyword, source, page, limit)

  if (!customResults?.length) {
    return builtInResults
  }

  if (!builtInResults.length) {
    return customResults
  }

  const mergedResults = [...builtInResults]
  const seen = new Set(builtInResults.map(buildMusicIdentity))

  for (const music of customResults) {
    const identity = buildMusicIdentity(music)
    if (seen.has(identity)) continue
    seen.add(identity)
    mergedResults.push(music)
  }

  return mergedResults
}

function handleSearchInput() {
  showHistory.value = searchKeyword.value.length > 0

  if (debounceTimer.value) clearTimeout(debounceTimer.value)

  debounceTimer.value = window.setTimeout(() => {
    if (searchKeyword.value.trim()) handleSearch()
  }, 300)
}

async function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) return

  showHistory.value = false
  searchError.value = ''

  searchStore.setSearchParams(keyword, selectedChannel.value)
  searchStore.addToHistory(keyword, selectedChannel.value)

  try {
    isSearchingLocal.value = true
    searchStore.isSearching = true
    console.log('[Search] handleSearch: starting search for:', keyword, 'channel:', selectedChannel.value)
    const data = await runSearch(keyword, selectedChannel.value, 1, searchStore.pageSize)
    console.log('[Search] handleSearch: got results:', data.length, 'items')
    searchStore.setResults({ data, total: data.length, channel: selectedChannel.value })
    console.log('[Search] handleSearch: setResults called, store.searchResults.length:', searchStore.searchResults.length)
  } catch (error) {
    console.error('Search failed:', error)
    searchStore.clearResults()
    searchError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isSearchingLocal.value = false
    searchStore.isSearching = false
  }
}

async function handleLoadMore() {
  if (isLoadingMore.value || !canLoadMore.value) return

  isLoadingMore.value = true
  searchError.value = ''
  searchStore.nextPage()

  try {
    const data = await runSearch(searchStore.currentKeyword, searchStore.currentChannel, searchStore.currentPage, searchStore.pageSize)
    searchStore.appendResults({ data, total: data.length, channel: searchStore.currentChannel })
  } catch (error) {
    console.error('Load more failed:', error)
    searchError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoadingMore.value = false
  }
}

function handleClear() {
  searchKeyword.value = ''
  showHistory.value = false
  searchError.value = ''
  searchStore.clearResults()
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

function handleClearHistory() {
  searchStore.clearHistory()
}

function handleHistoryClick(item: SearchHistoryItem) {
  searchKeyword.value = item.keyword
  selectedChannel.value = item.channel as ChannelId
  showHistory.value = false
  handleSearch()
}

async function handlePlay(music: MusicInfo) {
  try {
    await playerStore.playMusic(music)
  } catch (error) {
    console.error('[Search] Failed to play music:', error)
    // Show user-friendly error message
    searchError.value = error instanceof Error ? error.message : '播放失败，请重试'
  }
}

function handleAddToList(music: MusicInfo) {
  const currentList = [...playerStore.playlist]
  const index = currentList.findIndex(m => m.id === music.id)

  if (index === -1) playerStore.setPlaylist([...currentList, music], currentList.length)
  else playerStore.setPlaylist(currentList, index)
}

function handleAddToPlaylist(music: MusicInfo) {
  const defaultPlaylist = playlistStore.playlists[0]
  if (defaultPlaylist) playlistStore.addMusicToPlaylist(defaultPlaylist.id, music.id)
}

function getChannelName(channel: string): string {
  return PLATFORM_SOURCE_OPTIONS.find(option => option.value === channel)?.label || channel
}

watch(platformSourceOptions, (options) => {
  const availableChannels = options.map(option => option.value)
  if (!availableChannels.includes(selectedChannel.value)) {
    selectedChannel.value = (availableChannels[0] || 'kw') as ChannelId
  }
}, { immediate: true })

onMounted(async () => {
  searchStore.loadHistory()
  await refreshAvailableChannels()
})
</script>

<style scoped lang="scss">
.search-page {

  .search-error {
    margin-bottom: 16px;
    padding: 12px 14px;
    border-radius: 8px;
    background: rgba(244, 67, 54, 0.1);
    color: #d93025;
    font-size: 13px;
    line-height: 1.5;
  }

  padding: 20px;
  height: 100%;
  overflow-y: auto;

  .search-container {
    max-width: 1200px;
    margin: 0 auto;
  }

  .search-header {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;

    .search-input-wrapper {
      position: relative;
      flex: 1;
      max-width: 600px;

      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        color: var(--text-secondary);
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        padding: 12px 48px 12px 44px;
        font-size: 14px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-secondary);
        color: var(--text-primary);
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;

        &:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(29, 185, 84, 0.1);
        }
      }

      .clear-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        border: none;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s, color 0.2s;

        svg {
          width: 16px;
          height: 16px;
        }

        &:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
      }
    }

    .source-selectors {
      display: flex;
      gap: 12px;
      align-items: flex-start;

      .selector-group {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .selector-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .source-select {
          padding: 10px 14px;
          font-size: 14px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          outline: none;
          cursor: pointer;
          min-width: 160px;
          transition: border-color 0.2s;

          &:focus {
            border-color: var(--primary-color);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }

      .source-hint {
        flex: 1;
        max-width: 400px;
        font-size: 12px;
        line-height: 1.5;
        color: var(--text-secondary);
        margin-top: 20px;
      }
    }
  }

  .history-dropdown {
    position: absolute;
    top: 80px;
    left: 20px;
    right: 20px;
    max-width: 600px;
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    box-shadow: var(--shadow);
    z-index: 100;

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-color);

      .history-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--text-primary);
      }

      .clear-history-btn {
        padding: 4px 12px;
        font-size: 12px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--text-secondary);
        cursor: pointer;
        transition: color 0.2s;

        &:hover {
          color: var(--primary-color);
        }
      }
    }

    .history-list {
      max-height: 300px;
      overflow-y: auto;

      .history-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        cursor: pointer;
        transition: background-color 0.2s;

        &:hover {
          background: var(--bg-hover);
        }

        .history-icon {
          width: 16px;
          height: 16px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .history-keyword {
          flex: 1;
          font-size: 14px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .history-source {
          font-size: 12px;
          color: var(--text-secondary);
          flex-shrink: 0;
        }
      }
    }
  }

  .search-results {
    .loading-state,
    .empty-state,
    .initial-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-secondary);

      svg {
        width: 64px;
        height: 64px;
        margin-bottom: 16px;
        opacity: 0.5;
      }

      p {
        font-size: 14px;
        margin: 0;
      }
    }

    .initial-state {
      .search-icon-large {
        width: 80px;
        height: 80px;
        opacity: 0.3;
      }
    }

    .results-container {
      .results-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--bg-secondary);
        border-radius: 8px 8px 0 0;
        border-bottom: 1px solid var(--border-color);

        .results-count {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 500;
        }

        .results-source {
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .song-list {
        background: var(--bg-secondary);
        border-radius: 0 0 8px 8px;
        overflow: hidden;
      }

      .load-more {
        display: flex;
        justify-content: center;
        padding: 20px;

        .load-more-btn {
          padding: 10px 32px;
          font-size: 14px;
          border: 1px solid var(--border-color);
          border-radius: 20px;
          background: var(--bg-primary);
          color: var(--text-primary);
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s;

          &:hover:not(:disabled) {
            background: var(--bg-hover);
            border-color: var(--primary-color);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        }
      }
    }
  }
}
</style>
