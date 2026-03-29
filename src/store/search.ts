import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MusicInfo, SearchChannel, SearchResult } from '../types/music'

const RECENT_KEYWORDS_STORAGE_KEY = 'searchRecentKeywords'
const MAX_RECENT_KEYWORDS = 8

function isSearchChannel(value: string): value is SearchChannel {
  return ['all', 'kw', 'kg', 'tx', 'wy', 'mg'].includes(value)
}

function canUseStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function loadRecentKeywords() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(RECENT_KEYWORDS_STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT_KEYWORDS)
  } catch (error) {
    console.error('Failed to load recent search keywords:', error)
    return []
  }
}

export const useSearchStore = defineStore('search', () => {
  const searchResults = ref<MusicInfo[]>([])
  const isSearching = ref(false)
  const currentKeyword = ref('')
  const currentChannel = ref<SearchChannel>('kw')
  const currentPage = ref(1)
  const totalCount = ref(0)
  const hasNextPage = ref(false)
  const currentError = ref('')
  const recentKeywords = ref<string[]>(loadRecentKeywords())
  const pageSize = 15

  const hasResults = computed(() => searchResults.value.length > 0)
  const canLoadMore = computed(() => hasNextPage.value)
  const canGoPrev = computed(() => currentPage.value > 1)

  function persistRecentKeywords() {
    if (!canUseStorage()) return

    try {
      window.localStorage.setItem(RECENT_KEYWORDS_STORAGE_KEY, JSON.stringify(recentKeywords.value))
    } catch (error) {
      console.error('Failed to save recent search keywords:', error)
    }
  }

  // Clear search results
  function clearResults() {
    searchResults.value = []
    currentKeyword.value = ''
    currentPage.value = 1
    totalCount.value = 0
    hasNextPage.value = false
    currentError.value = ''
  }

  // Set search results
  function setResults(results: SearchResult) {
    searchResults.value = Array.from(results.data)
    totalCount.value = results.total ?? results.data.length
    currentChannel.value = isSearchChannel(results.channel) ? results.channel : 'kw'
    currentPage.value = results.page ?? 1
    hasNextPage.value = results.hasMore ?? false
  }

  // Update current search params
  function setSearchParams(keyword: string, channel: SearchChannel, page = 1) {
    currentKeyword.value = keyword
    currentChannel.value = channel
    currentPage.value = page
  }

  function setKeyword(keyword: string) {
    currentKeyword.value = keyword
  }

  function setChannel(channel: SearchChannel) {
    currentChannel.value = channel
  }

  function setError(message: string) {
    currentError.value = message
  }

  function clearError() {
    currentError.value = ''
  }

  function addRecentKeyword(keyword: string) {
    const normalized = keyword.trim()
    if (!normalized) return

    recentKeywords.value = [
      normalized,
      ...recentKeywords.value.filter((item) => item !== normalized),
    ].slice(0, MAX_RECENT_KEYWORDS)

    persistRecentKeywords()
  }

  function removeRecentKeyword(keyword: string) {
    recentKeywords.value = recentKeywords.value.filter((item) => item !== keyword)
    persistRecentKeywords()
  }

  function clearRecentKeywords() {
    recentKeywords.value = []
    persistRecentKeywords()
  }

  return {
    searchResults,
    isSearching,
    currentKeyword,
    currentChannel,
    currentPage,
    totalCount,
    hasNextPage,
    currentError,
    recentKeywords,
    pageSize,
    hasResults,
    canLoadMore,
    canGoPrev,
    clearResults,
    setResults,
    setSearchParams,
    setKeyword,
    setChannel,
    setError,
    clearError,
    addRecentKeyword,
    removeRecentKeyword,
    clearRecentKeywords,
  }
})
