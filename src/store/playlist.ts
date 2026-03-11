import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Playlist, PlaylistInfo } from '../types/playlist'

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>([
    {
      id: 'default',
      name: '试听列表',
      musics: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: 'love',
      name: '我的收藏',
      musics: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ])
  const currentPlaylistId = ref<string>('default')
  const selectedMusicIds = ref<Set<string>>(new Set())

  function createPlaylist(name: string): Playlist {
    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name,
      musics: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    playlists.value.push(newPlaylist)
    return newPlaylist
  }

  function deletePlaylist(id: string) {
    const index = playlists.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      playlists.value.splice(index, 1)
    }
  }

  function updatePlaylist(id: string, updates: Partial<Playlist>) {
    const playlist = playlists.value.find((p) => p.id === id)
    if (playlist) {
      Object.assign(playlist, updates, { updatedAt: Date.now() })
    }
  }

  function getPlaylist(id: string): Playlist | undefined {
    return playlists.value.find((p) => p.id === id)
  }

  function getPlaylistList(): PlaylistInfo[] {
    return playlists.value.map((p) => ({
      id: p.id,
      name: p.name,
      musicCount: p.musics.length,
      createdAt: p.createdAt
    }))
  }

  function addMusicToPlaylist(playlistId: string, musicId: string) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (playlist) {
      playlist.musics.push({
        id: musicId,
        name: '',
        artist: '',
        album: '',
        duration: 0,
        url: ''
      })
      playlist.updatedAt = Date.now()
    }
  }

  function removeMusicFromPlaylist(playlistId: string, musicId: string) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (playlist) {
      const index = playlist.musics.findIndex((m) => m.id === musicId)
      if (index !== -1) {
        playlist.musics.splice(index, 1)
        playlist.updatedAt = Date.now()
      }
    }
  }

  function setCurrentPlaylist(id: string) {
    currentPlaylistId.value = id
  }

  function toggleMusicSelection(musicId: string) {
    if (selectedMusicIds.value.has(musicId)) {
      selectedMusicIds.value.delete(musicId)
    } else {
      selectedMusicIds.value.add(musicId)
    }
  }

  function clearSelection() {
    selectedMusicIds.value.clear()
  }

  function selectAll(musicIds: string[]) {
    musicIds.forEach(id => selectedMusicIds.value.add(id))
  }

  function reorderMusic(playlistId: string, fromIndex: number, toIndex: number) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (playlist) {
      const [removed] = playlist.musics.splice(fromIndex, 1)
      playlist.musics.splice(toIndex, 0, removed)
      playlist.updatedAt = Date.now()
    }
  }

  function batchRemoveFromPlaylist(playlistId: string, musicIds: string[]) {
    const playlist = playlists.value.find((p) => p.id === playlistId)
    if (playlist) {
      playlist.musics = playlist.musics.filter(m => !musicIds.includes(m.id))
      playlist.updatedAt = Date.now()
    }
  }

  return {
    playlists,
    currentPlaylistId,
    selectedMusicIds,
    createPlaylist,
    deletePlaylist,
    updatePlaylist,
    getPlaylist,
    getPlaylistList,
    addMusicToPlaylist,
    removeMusicFromPlaylist,
    setCurrentPlaylist,
    toggleMusicSelection,
    clearSelection,
    selectAll,
    reorderMusic,
    batchRemoveFromPlaylist
  }
})
