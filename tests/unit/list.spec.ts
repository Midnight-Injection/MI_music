import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import type { MusicInfo } from '../../src/types/music'

const invokeMock = vi.fn()
const openMock = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: openMock,
}))

function createTrack(id: string, name: string): MusicInfo {
  return {
    id,
    name,
    artist: '测试歌手',
    album: '测试专辑',
    duration: 200,
    url: '',
    source: 'kw',
    songmid: `${id}_songmid`,
    sourceId: `${id}_source`,
    storageSongId: Number(id.replace(/\D/g, '')) || undefined,
  }
}

describe('Playlist view playback interactions', () => {
  let pinia: ReturnType<typeof createPinia>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    vi.restoreAllMocks()
    invokeMock.mockReset()
    openMock.mockReset()
    invokeMock.mockImplementation((command: string) => {
      if (command === 'probe_media_url') return Promise.resolve(true)
      if (command === 'get_song_url') return Promise.resolve('https://example.com/list-track.mp3')
      if (command === 'create_download_task') return Promise.resolve(15)
      if (command === 'start_download') return Promise.resolve()
      return Promise.resolve([])
    })
  })

  async function mountList() {
    const { usePlaylistStore } = await import('../../src/store/playlist')
    const { usePlayerStore } = await import('../../src/store/player')
    const List = (await import('../../src/views/List.vue')).default

    const playlistStore = usePlaylistStore()
    const playerStore = usePlayerStore()

    const musics = [
      createTrack('song_1', '第一首'),
      createTrack('song_2', '第二首'),
    ]

    playlistStore.playlists = [
      {
        id: 1,
        name: '我的收藏',
        systemKey: 'love',
        musics,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    playlistStore.currentPlaylistId = 1

    const setPlaylistSpy = vi.spyOn(playerStore, 'setPlaylist').mockImplementation(() => {})

    const wrapper = mount(List, {
      global: {
        plugins: [pinia],
      },
    })

    return { wrapper, setPlaylistSpy, musics }
  }

  it('plays the clicked song when the row play button is pressed', async () => {
    const { wrapper, setPlaylistSpy, musics } = await mountList()

    const playButtons = wrapper.findAll('.song-row__play')
    expect(playButtons).toHaveLength(2)

    await playButtons[1].trigger('click')

    expect(setPlaylistSpy).toHaveBeenCalledTimes(1)
    expect(setPlaylistSpy.mock.calls[0][0]).toEqual(musics)
    expect(setPlaylistSpy.mock.calls[0][1]).toBe(1)
  })

  it('plays the clicked song when the row is double-clicked', async () => {
    const { wrapper, setPlaylistSpy, musics } = await mountList()

    const rows = wrapper.findAll('.song-row')
    expect(rows).toHaveLength(2)

    await rows[0].trigger('dblclick')

    expect(setPlaylistSpy).toHaveBeenCalledTimes(1)
    expect(setPlaylistSpy.mock.calls[0][0]).toEqual(musics)
    expect(setPlaylistSpy.mock.calls[0][1]).toBe(0)
  })

  it('downloads a song from the playlist context menu', async () => {
    const { wrapper } = await mountList()
    const { useSettingsStore } = await import('../../src/store/settings')
    const settingsStore = useSettingsStore()
    settingsStore.updateSetting('downloadPath', '/mock/list-downloads')

    const rows = wrapper.findAll('.song-row')
    await rows[0].trigger('contextmenu')

    const menuItems = Array.from(document.body.querySelectorAll('.floating-menu__item'))
    const downloadItem = menuItems.find((item) => item.textContent?.includes('下载歌曲'))
    expect(downloadItem).toBeTruthy()

    ;(downloadItem as HTMLButtonElement).click()
    await flushPromises()

    expect(invokeMock).toHaveBeenCalledWith('create_download_task', {
      songId: 1,
      url: 'https://example.com/list-track.mp3',
      filename: '测试歌手 - 第一首.mp3',
    })
    expect(invokeMock).toHaveBeenCalledWith('start_download', {
      id: 15,
      savePath: '/mock/list-downloads',
    })
    expect(wrapper.text()).toContain('已开始下载：测试歌手 - 第一首.mp3')
  })
})
