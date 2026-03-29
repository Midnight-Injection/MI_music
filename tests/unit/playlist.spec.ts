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
})
