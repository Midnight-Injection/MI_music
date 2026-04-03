import { defineStore } from 'pinia'
import { usePlayerStore } from './player'
import { usePlaylistStore } from './playlist'
import { usePlaylistSearchStore } from './playlistSearch'
import { useSettingsStore } from './settings'
import { useSearchStore } from './search'
import { useEffectsStore } from './effects'
import { useThemeStore } from './theme'
import { useAppUpdateStore } from './appUpdate'

export const useStore = defineStore('main', {
  state: () => ({
    version: '0.1.1' as const,
  }),
  actions: {},
})

export {
  usePlayerStore,
  usePlaylistStore,
  usePlaylistSearchStore,
  useSettingsStore,
  useSearchStore,
  useEffectsStore,
  useThemeStore,
  useAppUpdateStore,
}
