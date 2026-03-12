import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MusicInfo, SearchResult } from '../types/music'

export interface SearchHistoryItem {
  keyword: string
  channel: string
  timestamp: number
}

export const useSearchStore = defineStore('search', () => {
  const searchResults = ref<MusicInfo[]>([])
  const isSearching = ref(false)
  const currentKeyword = ref('')
  const currentChannel = ref('kw')
  const currentPage = ref(1)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const pageSize = 30

  const searchHistory = ref<SearchHistoryItem[]>([])
  const maxHistoryItems = 20

  const hasResults = computed(() => searchResults.value.length > 0)
  const canLoadMore = computed(() => hasNextPage.value)
  const canGoPrev = computed(() => currentPage.value > 1)

  // Load search history from localStorage
  function loadHistory() {
    try {
      const saved = localStorage.getItem('searchHistory')
      if (saved) {
        searchHistory.value = JSON.parse(saved).map((item: any) => ({
          keyword: item.keyword,
          channel: item.channel ?? item.source ?? 'kw',
          timestamp: item.timestamp ?? Date.now(),
        }))
      }
    } catch (e) {
      console.error('Failed to load search history:', e)
    }
  }

  // Save search history to localStorage
  function saveHistory() {
    try {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
    } catch (e) {
      console.error('Failed to save search history:', e)
    }
  }

  // Add item to search history
  function addToHistory(keyword: string, channel: string) {
    if (!keyword.trim()) return

    // Remove existing entry if present
    const index = searchHistory.value.findIndex(
      (item) => item.keyword === keyword && item.channel === channel
    )
    if (index !== -1) {
      searchHistory.value.splice(index, 1)
    }

    // Add new entry at the beginning
    searchHistory.value.unshift({
      keyword,
      channel,
      timestamp: Date.now()
    })

    // Limit history size
    if (searchHistory.value.length > maxHistoryItems) {
      searchHistory.value = searchHistory.value.slice(0, maxHistoryItems)
    }

    saveHistory()
  }

  // Clear search history
  function clearHistory() {
    searchHistory.value = []
    saveHistory()
  }

  // Clear search results
  function clearResults() {
    searchResults.value = []
    currentKeyword.value = ''
    currentPage.value = 1
    totalCount.value = 0
    hasNextPage.value = false
  }

  // Set search results
  function setResults(results: SearchResult) {
    searchResults.value = Array.from(results.data)
    totalCount.value = results.total ?? results.data.length
    currentChannel.value = results.channel
    currentPage.value = results.page ?? 1
    hasNextPage.value = results.hasMore ?? false
  }

  // Update current search params
  function setSearchParams(keyword: string, channel: string, page = 1) {
    currentKeyword.value = keyword
    currentChannel.value = channel
    currentPage.value = page
  }

  return {
    searchResults,
    isSearching,
    currentKeyword,
    currentChannel,
    currentPage,
    totalCount,
    hasNextPage,
    pageSize,
    searchHistory,
    hasResults,
    canLoadMore,
    canGoPrev,
    loadHistory,
    addToHistory,
    clearHistory,
    clearResults,
    setResults,
    setSearchParams,
  }
})
