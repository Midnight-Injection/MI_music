import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import type { MusicInfo } from '../../src/types/music'

const invokeMock = vi.fn()
const openMock = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: {},
  }),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: openMock,
}))

vi.mock('motion-v', async () => {
  const vue = await import('vue')

  return {
    motion: {
      div: vue.defineComponent({
        name: 'MockMotionDiv',
        inheritAttrs: false,
        setup(_, { attrs, slots }) {
          return () => vue.h('div', attrs, slots.default ? slots.default() : [])
        },
      }),
    },
  }
})

describe('Search add-to-playlist flow', () => {
  beforeEach(() => {
    localStorage.clear()
    invokeMock.mockReset()
    openMock.mockReset()
    invokeMock.mockImplementation((command: string) => {
      if (command === 'probe_media_url') return Promise.resolve(true)
      if (command === 'get_song_url') return Promise.resolve('https://example.com/test-song.mp3')
      if (command === 'create_download_task') return Promise.resolve(91)
      if (command === 'start_download') return Promise.resolve()
      return Promise.resolve([])
    })
  })

  function createTrack(): MusicInfo {
    return {
      id: 'kw_song_1',
      name: '测试歌曲',
      artist: '测试歌手',
      album: '测试专辑',
      duration: 200,
      url: '',
      source: 'kw',
      songmid: 'songmid_1',
      sourceId: 'songmid_1',
    }
  }

  async function mountSearch() {
    const pinia = createPinia()
    setActivePinia(pinia)

    const { useSearchStore } = await import('../../src/store/search')
    const Search = (await import('../../src/views/Search.vue')).default

    const searchStore = useSearchStore()
    searchStore.setKeyword('测试')
    searchStore.setResults({
      data: [createTrack()],
      channel: 'kw',
      page: 1,
      hasMore: false,
      total: 1,
    })

    const wrapper = mount(Search, {
      global: {
        plugins: [pinia],
        directives: {
          'auto-animate': {},
        },
      },
    })

    await flushPromises()

    return {
      wrapper,
      searchStore,
      usePlaylistStore: (await import('../../src/store/playlist')).usePlaylistStore,
    }
  }

  it('opens the playlist dialog when the add button is clicked', async () => {
    const { wrapper } = await mountSearch()

    await wrapper.findComponent({ name: 'SongItem' }).trigger('mouseenter')
    await flushPromises()

    const actionButtons = wrapper.findAll('.action-btn')
    expect(actionButtons).toHaveLength(3)

    await actionButtons[1].trigger('click')
    await flushPromises()

    expect(wrapper.find('.playlist-dialog-overlay').exists()).toBe(true)
    expect(wrapper.text()).toContain('添加到歌单')
  })

  it('adds the track to the selected playlist and shows success feedback', async () => {
    const { wrapper, usePlaylistStore } = await mountSearch()
    const playlistStore = usePlaylistStore()

    await wrapper.findComponent({ name: 'SongItem' }).trigger('mouseenter')
    await flushPromises()

    const actionButtons = wrapper.findAll('.action-btn')
    expect(actionButtons).toHaveLength(3)

    await actionButtons[1].trigger('click')
    await flushPromises()

    const playlistButtons = wrapper.findAll('.playlist-dialog__item')
    expect(playlistButtons.length).toBeGreaterThan(0)

    await playlistButtons[0].trigger('click')
    await flushPromises()

    expect(wrapper.find('.playlist-dialog-overlay').exists()).toBe(false)
    expect(wrapper.text()).toContain('已添加到试听列表')
    expect(playlistStore.playlists[0].musics).toHaveLength(1)
    expect(playlistStore.playlists[0].musics[0].name).toBe('测试歌曲')
  })

  it('stores recent keywords in recency order without duplicates', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)

    const { useSearchStore } = await import('../../src/store/search')
    const searchStore = useSearchStore()

    searchStore.addRecentKeyword('周杰伦')
    searchStore.addRecentKeyword('陈奕迅')
    searchStore.addRecentKeyword('周杰伦')

    expect(searchStore.recentKeywords).toEqual(['周杰伦', '陈奕迅'])
    expect(JSON.parse(localStorage.getItem('searchRecentKeywords') || '[]')).toEqual(['周杰伦', '陈奕迅'])
  })

  it('opens a song context menu and starts downloading to the configured folder', async () => {
    const { wrapper } = await mountSearch()
    const { useSettingsStore } = await import('../../src/store/settings')
    const settingsStore = useSettingsStore()
    settingsStore.updateSetting('downloadPath', '/mock/downloads')

    await wrapper.findComponent({ name: 'SongItem' }).trigger('contextmenu')
    await flushPromises()

    const menuItems = Array.from(document.body.querySelectorAll('.floating-menu__item'))
    const downloadItem = menuItems.find((item) => item.textContent?.includes('下载歌曲'))
    expect(downloadItem).toBeTruthy()

    ;(downloadItem as HTMLButtonElement).click()
    await flushPromises()

    expect(invokeMock).toHaveBeenCalledWith('get_song_url', {
      songId: 'songmid_1',
      source: 'kw',
      quality: '128k',
      albumId: undefined,
    })
    expect(invokeMock).toHaveBeenCalledWith('create_download_task', {
      songId: null,
      url: 'https://example.com/test-song.mp3',
      filename: '测试歌手 - 测试歌曲.mp3',
    })
    expect(invokeMock).toHaveBeenCalledWith('start_download', {
      id: 91,
      savePath: '/mock/downloads',
    })
    expect(wrapper.text()).toContain('已开始下载：测试歌手 - 测试歌曲.mp3')
  })
})
