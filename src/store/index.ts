import { defineStore } from 'pinia'
import { usePlayerStore } from './player'
import { usePlaylistStore } from './playlist'
import { useSettingsStore } from './settings'
import { useSearchStore } from './search'
import { useEffectsStore } from './effects'
import { useThemeStore } from './theme'

export const useStore = defineStore('main', {
  state: () => ({
    version: '0.1.0' as const,
  }),
  actions: {
    async init() {
      // Initialize all stores
      const searchStore = useSearchStore()
      searchStore.loadHistory()
    },
  },
})

export { usePlayerStore, usePlaylistStore, useSettingsStore, useSearchStore, useEffectsStore, useThemeStore }
