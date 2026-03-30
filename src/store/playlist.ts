import { defineStore } from 'pinia'
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import {
  buildSourcePlaylistUrl,
  getSourcePlaylistDetail,
  getSourcePlaylistTracks,
} from '../modules/playlistSearch/service'
import type { MusicInfo } from '../types/music'
import type {
  ImportedPlaylistResult,
  Playlist,
  PlaylistInfo,
  PlaylistSearchChannel,
  SourcePlaylistSummary,
} from '../types/playlist'
import { ensureDatabaseInitialized, isTauriContext } from '../utils/tauriDatabase'

interface PlaylistOverviewDto {
  id: number
  name: string
  description?: string | null
  coverUrl?: string | null
  systemKey?: string | null
  importSource?: PlaylistSearchChannel | null
  importSourcePlaylistId?: string | null
  importSourcePlaylistUrl?: string | null
  lastSyncedAt?: string | null
  createdAt: string
  updatedAt: string
  musicCount: number
}

interface CreatedPlaylistDto {
  id: number
}

interface SyncImportedPlaylistDto {
  id: number
}

interface AddTrackToPlaylistDto {
  track: StoredTrackDto
  added: boolean
}

interface StoredTrackDto {
  storageSongId: number
  id: string
  name: string
  artist: string
  album: string
  duration: number
  url: string
  cover?: string | null
  source: string
  sourceId: string
  songmid?: string | null
  hash?: string | null
  strMediaMid?: string | null
  copyrightId?: string | null
  albumId?: string | null
}

interface PlaylistTrackInputDto {
  id: string
  name: string
  artist: string
  album?: string
  duration?: number
  cover?: string
  source: string
  sourceId: string
  songmid?: string
  hash?: string
  strMediaMid?: string
  copyrightId?: string
  albumId?: string
}

function toMusicInfo(track: StoredTrackDto): MusicInfo {
  return {
    id: track.id,
    name: track.name,
    artist: track.artist,
    album: track.album,
    duration: track.duration,
    url: track.url || '',
    cover: track.cover ?? undefined,
    source: track.source,
    sourceId: track.sourceId,
    songmid: track.songmid ?? undefined,
    hash: track.hash ?? undefined,
    strMediaMid: track.strMediaMid ?? undefined,
    copyrightId: track.copyrightId ?? undefined,
    albumId: track.albumId ?? undefined,
    storageSongId: track.storageSongId,
  }
}

function toPlaylistTrackInput(music: MusicInfo): PlaylistTrackInputDto {
  const sourceId = String(
    music.sourceId ||
    music.hash ||
    music.songmid ||
    music.copyrightId ||
    music.id,
  ).trim()

  if (!sourceId) {
    throw new Error(`缺少来源标识，无法保存歌曲：${music.name}`)
  }

  return {
    id: music.id,
    name: music.name,
    artist: music.artist,
    album: music.album,
    duration: music.duration,
    cover: music.cover,
    source: String(music.source || ''),
    sourceId,
    songmid: music.songmid,
    hash: music.hash,
    strMediaMid: music.strMediaMid,
    copyrightId: music.copyrightId,
    albumId: music.albumId,
  }
}

function fallbackPlaylists(): Playlist[] {
  const now = new Date().toISOString()
  return [
    {
      id: 1,
      name: '试听列表',
      systemKey: 'default',
      importSource: null,
      importSourcePlaylistId: null,
      importSourcePlaylistUrl: null,
      lastSyncedAt: null,
      musics: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      name: '我的收藏',
      systemKey: 'love',
      importSource: null,
      importSourcePlaylistId: null,
      importSourcePlaylistUrl: null,
      lastSyncedAt: null,
      musics: [],
      createdAt: now,
      updatedAt: now,
    },
  ]
}

export interface AddMusicToPlaylistResult {
  track: MusicInfo
  status: 'added' | 'alreadyExists'
}

export interface ImportSourcePlaylistResult {
  playlist: Playlist
  status: 'created' | 'updated'
}

function isImportedPlaylist(playlist: Pick<Playlist, 'importSource' | 'importSourcePlaylistId'>): boolean {
  return Boolean(playlist.importSource && playlist.importSourcePlaylistId)
}

export const usePlaylistStore = defineStore('playlist', () => {
  const playlists = ref<Playlist[]>(fallbackPlaylists())
  const currentPlaylistId = ref<number | null>(null)
  const selectedMusicIds = ref<Set<string>>(new Set())
  const isReady = ref(false)
  const isSyncing = ref(false)
  const initError = ref<string | null>(null)
  let initPromise: Promise<void> | null = null

  function applyPlaylistState(overviewList: PlaylistOverviewDto[], trackMap: Map<number, MusicInfo[]>) {
    playlists.value = overviewList.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description ?? null,
      cover: item.coverUrl ?? null,
      systemKey: item.systemKey ?? null,
      importSource: item.importSource ?? null,
      importSourcePlaylistId: item.importSourcePlaylistId ?? null,
      importSourcePlaylistUrl: item.importSourcePlaylistUrl ?? null,
      lastSyncedAt: item.lastSyncedAt ?? null,
      musics: trackMap.get(item.id) ?? [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }))

    if (playlists.value.length === 0) {
      currentPlaylistId.value = null
      return
    }

    if (
      currentPlaylistId.value === null ||
      !playlists.value.some((playlist) => playlist.id === currentPlaylistId.value)
    ) {
      currentPlaylistId.value =
        playlists.value.find((playlist) => playlist.systemKey === 'default')?.id ??
        playlists.value[0]?.id ??
        null
    }
  }

  async function refreshPlaylists() {
    if (!isTauriContext()) {
      playlists.value = fallbackPlaylists()
      currentPlaylistId.value = playlists.value[0]?.id ?? null
      initError.value = null
      return
    }

    isSyncing.value = true
    try {
      await ensureDatabaseInitialized()
      const overviewList = await invoke<PlaylistOverviewDto[]>('get_playlist_overviews')
      const trackPairs = await Promise.all(
        overviewList.map(async (playlist) => [
          playlist.id,
          (await invoke<StoredTrackDto[]>('get_playlist_songs', {
            playlistId: playlist.id,
          })).map(toMusicInfo),
        ] as const),
      )
      applyPlaylistState(overviewList, new Map(trackPairs))
      initError.value = null
    } catch (error) {
      initError.value = error instanceof Error ? error.message : String(error)
      throw error
    } finally {
      isSyncing.value = false
    }
  }

  async function init() {
    if (initPromise) return initPromise

    initPromise = (async () => {
      try {
        await refreshPlaylists()
        isReady.value = true
        initError.value = null
      } catch (error) {
        isReady.value = false
        initError.value = error instanceof Error ? error.message : String(error)
        throw error
      }
    })()

    try {
      await initPromise
    } finally {
      initPromise = null
    }
  }

  async function ensureReady() {
    if (initPromise) {
      await initPromise
      return
    }

    if (!isReady.value) {
      await init()
    }

    if (!isReady.value) {
      throw new Error(initError.value || '歌单尚未初始化完成')
    }
  }

  async function createPlaylist(name: string): Promise<Playlist> {
    await ensureReady()

    if (!isTauriContext()) {
      const newPlaylist: Playlist = {
        id: Date.now(),
        name,
        importSource: null,
        importSourcePlaylistId: null,
        importSourcePlaylistUrl: null,
        lastSyncedAt: null,
        musics: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      playlists.value.push(newPlaylist)
      return newPlaylist
    }

    const created = await invoke<CreatedPlaylistDto>('create_playlist', {
      name,
      description: null,
      coverUrl: null,
    })
    await refreshPlaylists()

    const createdPlaylist = playlists.value.find((playlist) => playlist.id === created.id)
    if (!createdPlaylist) throw new Error('创建歌单后未找到新歌单')
    return createdPlaylist
  }

  async function deletePlaylist(id: number) {
    await ensureReady()

    if (!isTauriContext()) {
      playlists.value = playlists.value.filter((playlist) => playlist.id !== id)
    } else {
      await invoke('delete_playlist', { id })
      await refreshPlaylists()
    }

    if (currentPlaylistId.value === id) {
      currentPlaylistId.value =
        playlists.value.find((playlist) => playlist.systemKey === 'default')?.id ??
        playlists.value[0]?.id ??
        null
    }
    clearSelection()
  }

  function updatePlaylist(id: number, updates: Partial<Playlist>) {
    const playlist = playlists.value.find((item) => item.id === id)
    if (playlist) {
      Object.assign(playlist, updates)
    }
  }

  function getPlaylist(id: number): Playlist | undefined {
    return playlists.value.find((playlist) => playlist.id === id)
  }

  function getPlaylistList(): PlaylistInfo[] {
    return playlists.value.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      musicCount: playlist.musics.length,
      systemKey: playlist.systemKey ?? null,
      importSource: playlist.importSource ?? null,
      importSourcePlaylistId: playlist.importSourcePlaylistId ?? null,
      importSourcePlaylistUrl: playlist.importSourcePlaylistUrl ?? null,
      lastSyncedAt: playlist.lastSyncedAt ?? null,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
    }))
  }

  async function addMusicToPlaylist(playlistId: number, music: MusicInfo): Promise<AddMusicToPlaylistResult> {
    await ensureReady()

    if (!isTauriContext()) {
      const playlist = getPlaylist(playlistId)
      if (!playlist) throw new Error('目标歌单不存在')
      const exists = playlist.musics.some(
        (item) => item.source === music.source && (item.sourceId || item.id) === (music.sourceId || music.id),
      )
      if (!exists) {
        playlist.musics.push({ ...music })
      }
      return {
        track: music,
        status: exists ? 'alreadyExists' : 'added',
      }
    }

    const result = await invoke<AddTrackToPlaylistDto>('add_track_to_playlist', {
      playlistId,
      track: toPlaylistTrackInput(music),
    })
    await refreshPlaylists()
    return {
      track: toMusicInfo(result.track),
      status: result.added ? 'added' : 'alreadyExists',
    }
  }

  async function removeMusicFromPlaylist(playlistId: number, musicId: number) {
    await ensureReady()

    if (!isTauriContext()) {
      const playlist = getPlaylist(playlistId)
      if (!playlist) return
      playlist.musics = playlist.musics.filter((music) => music.storageSongId !== musicId)
      return
    }

    await invoke('remove_song_from_playlist', {
      playlistId,
      songId: musicId,
    })
    await refreshPlaylists()
  }

  function setCurrentPlaylist(id: number | null) {
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
    musicIds.forEach((id) => selectedMusicIds.value.add(id))
  }

  async function reorderMusic(playlistId: number, fromIndex: number, toIndex: number) {
    await ensureReady()

    const playlist = getPlaylist(playlistId)
    if (!playlist) return

    const nextMusics = [...playlist.musics]
    const [removed] = nextMusics.splice(fromIndex, 1)
    nextMusics.splice(toIndex, 0, removed)
    playlist.musics = nextMusics

    if (!isTauriContext()) return

    try {
      await invoke('reorder_playlist_songs', {
        playlistId,
        songIds: nextMusics
          .map((music) => music.storageSongId)
          .filter((id): id is number => typeof id === 'number'),
      })
    } catch (error) {
      await refreshPlaylists()
      throw error
    }
  }

  async function batchRemoveFromPlaylist(playlistId: number, musicIds: number[]) {
    await ensureReady()
    if (musicIds.length === 0) return

    if (!isTauriContext()) {
      const playlist = getPlaylist(playlistId)
      if (playlist) {
        playlist.musics = playlist.musics.filter((music) => !musicIds.includes(music.storageSongId || -1))
      }
      return
    }

    await invoke('remove_tracks_from_playlist', {
      playlistId,
      songIds: musicIds,
    })
    await refreshPlaylists()
  }

  async function importSourcePlaylist(
    playlistSummary: SourcePlaylistSummary,
  ): Promise<ImportSourcePlaylistResult> {
    await ensureReady()

    const detail = await getSourcePlaylistDetail(playlistSummary.source, playlistSummary.id)
    const tracks = await getSourcePlaylistTracks(
      playlistSummary.source,
      playlistSummary.id,
      detail.trackCount ?? playlistSummary.trackCount,
    )
    const sourcePlaylistUrl = buildSourcePlaylistUrl(playlistSummary.source, playlistSummary.id) || null

    if (!isTauriContext()) {
      const existing = playlists.value.find((playlist) =>
        playlist.importSource === playlistSummary.source
        && playlist.importSourcePlaylistId === playlistSummary.id,
      )
      const now = new Date().toISOString()

      if (existing) {
        existing.name = detail.name
        existing.description = detail.description ?? null
        existing.cover = detail.cover ?? null
        existing.importSourcePlaylistUrl = sourcePlaylistUrl
        existing.lastSyncedAt = now
        existing.updatedAt = now
        existing.musics = tracks.map((track) => ({ ...track }))
        return {
          playlist: existing,
          status: 'updated',
        }
      }

      const createdPlaylist: Playlist = {
        id: Date.now(),
        name: detail.name,
        description: detail.description ?? null,
        cover: detail.cover ?? null,
        systemKey: null,
        importSource: playlistSummary.source,
        importSourcePlaylistId: playlistSummary.id,
        importSourcePlaylistUrl: sourcePlaylistUrl,
        lastSyncedAt: now,
        musics: tracks.map((track) => ({ ...track })),
        createdAt: now,
        updatedAt: now,
      }
      playlists.value.push(createdPlaylist)
      return {
        playlist: createdPlaylist,
        status: 'created',
      }
    }

    const result = await invoke<ImportedPlaylistResult>('create_imported_playlist', {
      name: detail.name,
      description: detail.description ?? null,
      coverUrl: detail.cover ?? null,
      importSource: playlistSummary.source,
      importSourcePlaylistId: playlistSummary.id,
      importSourcePlaylistUrl: sourcePlaylistUrl,
      tracks: tracks.map(toPlaylistTrackInput),
    })

    await refreshPlaylists()

    const playlist = playlists.value.find((item) => item.id === result.playlist.id)
    if (!playlist) {
      throw new Error('收藏歌单后未找到对应的本地歌单')
    }

    return {
      playlist,
      status: result.created ? 'created' : 'updated',
    }
  }

  async function syncImportedPlaylist(playlistId: number): Promise<Playlist> {
    await ensureReady()

    const playlist = getPlaylist(playlistId)
    if (!playlist || !isImportedPlaylist(playlist)) {
      throw new Error('当前歌单不是可同步的导入歌单')
    }

    const detail = await getSourcePlaylistDetail(playlist.importSource!, playlist.importSourcePlaylistId!)
    const tracks = await getSourcePlaylistTracks(
      playlist.importSource!,
      playlist.importSourcePlaylistId!,
      detail.trackCount,
    )
    const sourcePlaylistUrl =
      buildSourcePlaylistUrl(playlist.importSource!, playlist.importSourcePlaylistId!) || null

    if (!isTauriContext()) {
      const now = new Date().toISOString()
      playlist.name = detail.name
      playlist.description = detail.description ?? null
      playlist.cover = detail.cover ?? null
      playlist.importSourcePlaylistUrl = sourcePlaylistUrl
      playlist.lastSyncedAt = now
      playlist.updatedAt = now
      playlist.musics = tracks.map((track) => ({ ...track }))
      return playlist
    }

    const result = await invoke<SyncImportedPlaylistDto>('sync_imported_playlist', {
      playlistId,
      name: detail.name,
      description: detail.description ?? null,
      coverUrl: detail.cover ?? null,
      importSourcePlaylistUrl: sourcePlaylistUrl,
      tracks: tracks.map(toPlaylistTrackInput),
    })

    await refreshPlaylists()

    const syncedPlaylist = playlists.value.find((item) => item.id === result.id || item.id === playlistId)
    if (!syncedPlaylist) {
      throw new Error('同步歌单后未找到对应的本地歌单')
    }

    return syncedPlaylist
  }

  return {
    playlists,
    currentPlaylistId,
    selectedMusicIds,
    isReady,
    isSyncing,
    initError,
    init,
    ensureReady,
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
    batchRemoveFromPlaylist,
    importSourcePlaylist,
    syncImportedPlaylist,
    refreshPlaylists,
  }
})
