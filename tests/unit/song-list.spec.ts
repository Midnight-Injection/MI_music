import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import type { MusicInfo } from '../../src/types/music'
import type { SourcePlaylistDetail, SourcePlaylistSummary } from '../../src/types/playlist'

const invokeMock = vi.fn()
const openMock = vi.fn()
const searchSourcePlaylistsMock = vi.fn()
const getSourcePlaylistDetailMock = vi.fn()
const getSourcePlaylistTracksMock = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: openMock,
}))

vi.mock('../../src/modules/playlistSearch/service', () => ({
  searchSourcePlaylists: searchSourcePlaylistsMock,
  getSourcePlaylistDetail: getSourcePlaylistDetailMock,
  getSourcePlaylistTracksPage: getSourcePlaylistTracksMock,
  isPlaylistSearchSupported: (channel: string) => channel === 'wy' || channel === 'tx',
  getPlaylistUnsupportedMessage: (channel: string) => `${channel} 第一版暂不支持该渠道的歌单搜索。`,
  PLAYLIST_TRACK_PAGE_SIZE: 50,
}))

function createPlaylist(source: 'wy' | 'tx', id: string, name: string): SourcePlaylistSummary {
  return {
    id,
    source,
    name,
    cover: 'https://example.com/cover.jpg',
    creator: '测试用户',
    description: `${name} 简介`,
    trackCount: 2,
    playCount: 120000,
    createdAt: 1,
    updatedAt: 1,
  }
}

function createPlaylistDetail(source: 'wy' | 'tx', id: string, name: string): SourcePlaylistDetail {
  return {
    id,
    source,
    name,
    cover: 'https://example.com/cover.jpg',
    creator: '测试用户',
    description: `${name} 详情`,
    trackCount: 2,
    playCount: 120000,
  }
}

function createTrack(id: string, name: string): MusicInfo {
  return {
    id,
    name,
    artist: '测试歌手',
    album: '测试专辑',
    duration: 180,
    url: '',
    cover: 'https://example.com/track.jpg',
    source: 'wy',
    songmid: id,
    sourceId: id,
  }
}

describe('SongList playlist search', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    invokeMock.mockReset()
    openMock.mockReset()
    searchSourcePlaylistsMock.mockReset()
    getSourcePlaylistDetailMock.mockReset()
    getSourcePlaylistTracksMock.mockReset()
    localStorage.clear()
    invokeMock.mockResolvedValue(true)
  })

  async function mountSongList() {
    const pinia = createPinia()
    setActivePinia(pinia)
    const SongList = (await import('../../src/views/SongList.vue')).default
    const { usePlayerStore } = await import('../../src/store/player')
    const playerStore = usePlayerStore()

    const setPlaylistSpy = vi.spyOn(playerStore, 'setPlaylist').mockImplementation(() => {})
    const appendToPlaylistSpy = vi.spyOn(playerStore, 'appendToPlaylist')

    const wrapper = mount(SongList, {
      global: {
        plugins: [pinia],
      },
    })

    return { wrapper, setPlaylistSpy, appendToPlaylistSpy }
  }

  it('renders only channels that currently have results', async () => {
    searchSourcePlaylistsMock.mockImplementation(async (source: 'wy' | 'tx') => {
      if (source === 'wy') return [createPlaylist('wy', 'wy_1', '网易歌单')]
      return []
    })

    const { wrapper } = await mountSongList()

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    expect(searchSourcePlaylistsMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('网易歌单')
    expect(wrapper.text()).not.toContain('QQ 歌单')
    expect(wrapper.text()).not.toContain('第一版暂不支持该渠道的歌单搜索。')
    expect(wrapper.text()).not.toContain('没有匹配到歌单。')
  })

  it('opens playlist detail and plays all tracks', async () => {
    searchSourcePlaylistsMock.mockResolvedValue([createPlaylist('wy', 'wy_1', '网易歌单')])
    getSourcePlaylistDetailMock.mockResolvedValue(createPlaylistDetail('wy', 'wy_1', '网易歌单'))
    getSourcePlaylistTracksMock.mockResolvedValue([
      createTrack('song_1', '第一首'),
      createTrack('song_2', '第二首'),
    ])

    const { wrapper, setPlaylistSpy } = await mountSongList()

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    await wrapper.find('.playlist-card').trigger('click')
    await flushPromises()

    expect(getSourcePlaylistDetailMock).toHaveBeenCalledWith('wy', 'wy_1')
    expect(getSourcePlaylistTracksMock).toHaveBeenCalledWith('wy', 'wy_1', 1, 50)
    expect(wrapper.text()).toContain('网易歌单 详情')

    await wrapper.find('.playlist-detail__action.is-primary').trigger('click')
    expect(setPlaylistSpy).toHaveBeenCalledTimes(1)
    expect(setPlaylistSpy.mock.calls[0][0]).toHaveLength(2)
    expect(setPlaylistSpy.mock.calls[0][1]).toBe(0)
  })

  it('adds all tracks to the current queue from detail view', async () => {
    searchSourcePlaylistsMock.mockResolvedValue([createPlaylist('wy', 'wy_1', '网易歌单')])
    getSourcePlaylistDetailMock.mockResolvedValue(createPlaylistDetail('wy', 'wy_1', '网易歌单'))
    getSourcePlaylistTracksMock.mockResolvedValue([
      createTrack('song_1', '第一首'),
      createTrack('song_2', '第二首'),
    ])

    const { wrapper, appendToPlaylistSpy } = await mountSongList()
    appendToPlaylistSpy.mockReturnValue(2)

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    await wrapper.find('.playlist-card').trigger('click')
    await flushPromises()

    const actions = wrapper.findAll('.playlist-detail__action')
    await actions[1].trigger('click')

    expect(appendToPlaylistSpy).toHaveBeenCalledTimes(1)
    expect(appendToPlaylistSpy.mock.calls[0][0]).toHaveLength(2)
    expect(wrapper.text()).toContain('已加入 2 首到当前队列')
  })

  it('supports paging for a single channel group', async () => {
    searchSourcePlaylistsMock.mockImplementation(
      async (source: 'wy' | 'tx', _keyword: string, page: number) => {
        if (source === 'tx') return []
        if (page === 1) {
          return Array.from({ length: 12 }, (_, index) =>
            createPlaylist('wy', `wy_${index + 1}`, `网易歌单 ${index + 1}`),
          )
        }

        return [createPlaylist('wy', 'wy_13', '网易歌单 13')]
      },
    )

    const { wrapper } = await mountSongList()

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('第 1 页')

    const nextButton = wrapper.findAll('.playlist-group__page-btn')[1]
    await nextButton.trigger('click')
    await flushPromises()

    expect(searchSourcePlaylistsMock).toHaveBeenCalledWith('wy', '周杰伦', 2, 12)
    expect(wrapper.text()).toContain('网易歌单 13')
    expect(wrapper.text()).toContain('第 2 页')
  })

  it('sorts a channel group by play count', async () => {
    searchSourcePlaylistsMock.mockResolvedValue([
      { ...createPlaylist('wy', 'wy_1', '低播放'), playCount: 100 },
      { ...createPlaylist('wy', 'wy_2', '高播放'), playCount: 900 },
    ])

    const { wrapper } = await mountSongList()

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    const sortButtons = wrapper.findAll('.playlist-sort__item')
    await sortButtons[1].trigger('click')
    await flushPromises()

    const titles = wrapper.findAll('.playlist-card h4').map((node) => node.text())
    expect(titles[0]).toBe('高播放')
    expect(titles[1]).toBe('低播放')
  })

  it('sorts a channel group by time', async () => {
    searchSourcePlaylistsMock.mockResolvedValue([
      { ...createPlaylist('wy', 'wy_1', '旧歌单'), updatedAt: 1000 },
      { ...createPlaylist('wy', 'wy_2', '新歌单'), updatedAt: 9000 },
    ])

    const { wrapper } = await mountSongList()

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    const sortButtons = wrapper.findAll('.playlist-sort__item')
    await sortButtons[2].trigger('click')
    await flushPromises()

    const titles = wrapper.findAll('.playlist-card h4').map((node) => node.text())
    expect(titles[0]).toBe('新歌单')
    expect(titles[1]).toBe('旧歌单')
  })

  it('opens a playlist context menu from search results and enters detail view', async () => {
    searchSourcePlaylistsMock.mockResolvedValue([createPlaylist('wy', 'wy_1', '网易歌单')])
    getSourcePlaylistDetailMock.mockResolvedValue(createPlaylistDetail('wy', 'wy_1', '网易歌单'))
    getSourcePlaylistTracksMock.mockResolvedValue([
      createTrack('song_1', '第一首'),
    ])

    const { wrapper } = await mountSongList()

    await wrapper.find('input').setValue('周杰伦')
    await wrapper.find('.search-home__submit').trigger('click')
    await flushPromises()

    await wrapper.find('.playlist-card').trigger('contextmenu')
    await flushPromises()

    const menuItems = Array.from(document.body.querySelectorAll('.floating-menu__item'))
    const openItem = menuItems.find((item) => item.textContent?.includes('打开歌单详情'))
    expect(openItem).toBeTruthy()

    ;(openItem as HTMLButtonElement).click()
    await flushPromises()

    expect(getSourcePlaylistDetailMock).toHaveBeenCalledWith('wy', 'wy_1')
    expect(wrapper.text()).toContain('网易歌单 详情')
  })
})
