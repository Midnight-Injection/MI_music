import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const invokeMock = vi.fn()
const appDataDirMock = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: appDataDirMock,
}))

describe('Playlist Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    invokeMock.mockReset()
    appDataDirMock.mockReset()
    appDataDirMock.mockResolvedValue('/mock/app-data')
    invokeMock.mockImplementation((command: string) => {
      if (command === 'init_database') return Promise.resolve()
      if (command === 'get_playlist_overviews') return Promise.resolve([])
      return Promise.resolve([])
    })

    Object.defineProperty(window, '__TAURI__', {
      value: {},
      configurable: true,
      writable: true,
    })
  })

  it('initializes the database before loading playlists in tauri', async () => {
    const { usePlaylistStore } = await import('../../src/store/playlist')
    const store = usePlaylistStore()

    await store.init()

    expect(appDataDirMock).toHaveBeenCalledTimes(1)
    expect(invokeMock).toHaveBeenNthCalledWith(1, 'init_database', { appPath: '/mock/app-data' })
    expect(invokeMock).toHaveBeenNthCalledWith(2, 'get_playlist_overviews')
    expect(store.isReady).toBe(true)
  })

  it('hydrates imported playlist metadata from tauri overviews', async () => {
    invokeMock.mockImplementation((command: string, payload?: { playlistId?: number }) => {
      if (command === 'init_database') return Promise.resolve()
      if (command === 'get_playlist_overviews') {
        return Promise.resolve([
          {
            id: 9,
            name: '远程歌单',
            description: '收藏自搜索',
            coverUrl: 'https://example.com/cover.jpg',
            systemKey: null,
            importSource: 'wy',
            importSourcePlaylistId: 'wy_123',
            importSourcePlaylistUrl: 'https://example.com/wy/wy_123',
            lastSyncedAt: '2026-03-30T10:00:00.000Z',
            createdAt: '2026-03-30T09:00:00.000Z',
            updatedAt: '2026-03-30T10:00:00.000Z',
            musicCount: 1,
          },
        ])
      }
      if (command === 'get_playlist_songs' && payload?.playlistId === 9) {
        return Promise.resolve([
          {
            storageSongId: 11,
            id: 'song_11',
            name: '收藏歌曲',
            artist: '测试歌手',
            album: '测试专辑',
            duration: 188,
            url: '',
            source: 'wy',
            sourceId: 'song_11',
          },
        ])
      }
      return Promise.resolve([])
    })

    const { usePlaylistStore } = await import('../../src/store/playlist')
    const store = usePlaylistStore()

    await store.init()

    expect(store.playlists).toHaveLength(1)
    expect(store.playlists[0].importSource).toBe('wy')
    expect(store.playlists[0].importSourcePlaylistId).toBe('wy_123')
    expect(store.playlists[0].importSourcePlaylistUrl).toBe('https://example.com/wy/wy_123')
    expect(store.playlists[0].lastSyncedAt).toBe('2026-03-30T10:00:00.000Z')
    expect(store.playlists[0].musics).toHaveLength(1)
  })
})
