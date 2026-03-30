import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChannelSearchResultItem, MusicInfo } from '../../src/types/music'

const invokeMock = vi.fn()
const resolveWithCustomSourcesMock = vi.fn()
const userSourceStoreState = {
  isLoaded: true,
  enabledSources: [] as Array<{ id: string }>,
  loadUserSources: vi.fn(),
}

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('../../src/composables/useScriptRuntime', () => ({
  useScriptRuntime: () => ({
    initialize: vi.fn(),
  }),
}))

vi.mock('../../src/stores/userSource', () => ({
  useUserSourceStore: () => userSourceStoreState,
}))

vi.mock('../../src/store/settings', () => ({
  useSettingsStore: () => ({
    settings: {
      audioQuality: 'high',
      activeUserSourceId: '',
    },
    getEnabledChannelIds: () => ['tx', 'kw', 'kg', 'mg', 'wy'],
  }),
}))

vi.mock('../../src/modules/playback/resolvers/customSourceResolver', () => ({
  resolveWithCustomSources: resolveWithCustomSourcesMock,
}))

describe('Tencent playback fallback', () => {
  beforeEach(() => {
    vi.resetModules()
    invokeMock.mockReset()
    resolveWithCustomSourcesMock.mockReset()
    resolveWithCustomSourcesMock.mockResolvedValue(null)
    userSourceStoreState.isLoaded = true
    userSourceStoreState.enabledSources = []
    userSourceStoreState.loadUserSources = vi.fn()

    invokeMock.mockImplementation((command: string, args?: Record<string, unknown>) => {
      if (command === 'probe_media_url') return Promise.resolve(true)

      if (command === 'search_music_sources') {
        if (args?.source === 'kw') {
          return Promise.resolve([
            {
              id: 'kw_4401',
              name: '那天下雨了',
              singer: '周杰伦',
              source: 'kw',
              songmid: 'kw-mid-4401',
              album_id: 'kw-album-1',
              interval: '03:43',
              album_name: '太阳之子',
              types: [{ type: '320k', size: '8.5MB' }],
              img: 'https://example.com/kw-cover.jpg',
            } satisfies ChannelSearchResultItem,
          ])
        }

        return Promise.resolve([])
      }

      return Promise.resolve([])
    })
  })

  it('throws no available source when no custom source is enabled', async () => {
    const track: MusicInfo = {
      id: 'tx_0044SaFh0apuR2',
      name: '那天下雨了',
      artist: '周杰伦',
      album: '太阳之子',
      duration: 223,
      url: '',
      source: 'tx',
      songmid: '0044SaFh0apuR2',
      songId: '649556362',
      msgId: '13',
      strMediaMid: '0044SaFh0apuR2',
      copyrightId: '649556362',
      albumId: '0041WVfh2vtlJE',
      qualities: [{ type: '320k', size: '8.5MB' }],
    }

    const { usePlaybackResolver } = await import('../../src/modules/playback/playbackResolver')
    await expect(usePlaybackResolver().resolve(track)).rejects.toThrow('暂无可用音源')
    expect(resolveWithCustomSourcesMock).not.toHaveBeenCalled()
  })

  it('exhausts tx custom fallback candidates before reporting no available source', async () => {
    userSourceStoreState.enabledSources = [{ id: 'aggregate-api' }]

    invokeMock.mockImplementation((command: string, args?: Record<string, unknown>) => {
      if (command === 'probe_media_url') return Promise.resolve(true)

      if (command === 'search_music_sources') {
        if (args?.source === 'kw') {
          return Promise.resolve([
            {
              id: 'kw_4401',
              name: '那天下雨了',
              singer: '周杰伦',
              source: 'kw',
              songmid: 'kw-mid-4401',
              album_id: 'kw-album-1',
              interval: '03:43',
              album_name: '太阳之子',
              types: [{ type: '320k', size: '8.5MB' }],
              img: 'https://example.com/kw-cover.jpg',
            } satisfies ChannelSearchResultItem,
          ])
        }

        if (args?.source === 'kg') {
          return Promise.resolve([
            {
              id: 'kg_5502',
              name: '那天下雨了',
              singer: '周杰伦',
              source: 'kg',
              songmid: 'kg-mid-5502',
              album_id: 'kg-album-2',
              interval: '03:42',
              album_name: '太阳之子',
              types: [{ type: '320k', size: '8.5MB' }],
              img: 'https://example.com/kg-cover.jpg',
            } satisfies ChannelSearchResultItem,
          ])
        }

        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const track: MusicInfo = {
      id: 'tx_0044SaFh0apuR2',
      name: '那天下雨了',
      artist: '周杰伦',
      album: '太阳之子',
      duration: 223,
      url: '',
      source: 'tx',
      songmid: '0044SaFh0apuR2',
      songId: '649556362',
      msgId: '13',
      strMediaMid: '0044SaFh0apuR2',
      copyrightId: '649556362',
      albumId: '0041WVfh2vtlJE',
      qualities: [{ type: '320k', size: '8.5MB' }],
    }

    const { usePlaybackResolver } = await import('../../src/modules/playback/playbackResolver')
    await expect(usePlaybackResolver().resolve(track)).rejects.toThrow('暂无可用音源')
    expect(resolveWithCustomSourcesMock).toHaveBeenCalledTimes(3)
    expect(resolveWithCustomSourcesMock.mock.calls.map(([music]) => (music as MusicInfo).songmid)).toEqual([
      '0044SaFh0apuR2',
      'kw-mid-4401',
      'kg-mid-5502',
    ])
  })

  it('still resolves tx playback from matched fallback candidates through custom sources only', async () => {
    userSourceStoreState.enabledSources = [{ id: 'aggregate-api' }]

    resolveWithCustomSourcesMock.mockImplementation(async (track: MusicInfo) => {
      if (track.songmid === 'kg-mid-5502') {
        return {
          url: 'https://example.com/custom-kg.mp3',
          channel: 'kg',
          resolver: 'custom-source',
          userSourceId: 'aggregate-api',
        }
      }

      return null
    })

    invokeMock.mockImplementation((command: string, args?: Record<string, unknown>) => {
      if (command === 'probe_media_url') return Promise.resolve(true)

      if (command === 'search_music_sources') {
        if (args?.source === 'kw') {
          return Promise.resolve([
            {
              id: 'kw_4401',
              name: '那天下雨了',
              singer: '周杰伦',
              source: 'kw',
              songmid: 'kw-mid-4401',
              album_id: 'kw-album-1',
              interval: '03:43',
              album_name: '太阳之子',
              types: [{ type: '320k', size: '8.5MB' }],
              img: 'https://example.com/kw-cover.jpg',
            } satisfies ChannelSearchResultItem,
          ])
        }

        if (args?.source === 'kg') {
          return Promise.resolve([
            {
              id: 'kg_5502',
              name: '那天下雨了',
              singer: '周杰伦',
              source: 'kg',
              songmid: 'kg-mid-5502',
              album_id: 'kg-album-2',
              interval: '03:42',
              album_name: '太阳之子',
              types: [{ type: '320k', size: '8.5MB' }],
              img: 'https://example.com/kg-cover.jpg',
            } satisfies ChannelSearchResultItem,
          ])
        }

        return Promise.resolve([])
      }

      return Promise.resolve([])
    })

    const track: MusicInfo = {
      id: 'tx_0044SaFh0apuR2',
      name: '那天下雨了',
      artist: '周杰伦',
      album: '太阳之子',
      duration: 223,
      url: '',
      source: 'tx',
      songmid: '0044SaFh0apuR2',
      songId: '649556362',
      msgId: '13',
      strMediaMid: '0044SaFh0apuR2',
      copyrightId: '649556362',
      albumId: '0041WVfh2vtlJE',
      qualities: [{ type: '320k', size: '8.5MB' }],
    }

    const { usePlaybackResolver } = await import('../../src/modules/playback/playbackResolver')
    const resolution = await usePlaybackResolver().resolve(track)

    expect(resolution.url).toBe('https://example.com/custom-kg.mp3')
    expect(resolution.channel).toBe('kg')
    expect(resolution.resolver).toBe('custom-source')
    expect(resolution.userSourceId).toBe('aggregate-api')
    expect(resolution.matchedTrack?.songmid).toBe('kg-mid-5502')
    expect(resolveWithCustomSourcesMock).toHaveBeenCalledTimes(3)
  })

  it('ignores search-derived track urls so custom sources still get first playback attempt', async () => {
    userSourceStoreState.enabledSources = [{ id: 'aggregate-api' }]

    resolveWithCustomSourcesMock.mockResolvedValue({
      url: 'https://example.com/custom-search-result.mp3',
      channel: 'kw',
      resolver: 'custom-source',
      userSourceId: 'aggregate-api',
    })

    const track: MusicInfo = {
      id: 'kw_118980',
      name: '夜曲',
      artist: '周杰伦',
      album: '十一月的萧邦',
      duration: 226,
      url: 'https://er-sycdn.kuwo.cn/direct-from-search.flac',
      source: 'kw',
      searchChannel: 'kw',
      resolvedBy: 'built-in-search',
      songmid: '118980',
      qualities: [{ type: 'flac', size: '29MB' }],
    }

    const { usePlaybackResolver } = await import('../../src/modules/playback/playbackResolver')
    const resolution = await usePlaybackResolver().resolve(track)

    expect(resolution.url).toBe('https://example.com/custom-search-result.mp3')
    expect(resolution.resolver).toBe('custom-source')
    expect(resolveWithCustomSourcesMock).toHaveBeenCalledTimes(1)
    expect(resolveWithCustomSourcesMock).toHaveBeenCalledWith(track, expect.any(Object), {})
  })

  it('keeps official cdn links returned by custom sources classified as custom-source playback', async () => {
    userSourceStoreState.enabledSources = [{ id: 'aggregate-api' }]

    resolveWithCustomSourcesMock.mockResolvedValue({
      url: 'https://er-sycdn.kuwo.cn/custom-resolved.flac?from=aggregate-api',
      channel: 'kw',
      quality: 'flac',
      resolver: 'custom-source',
      userSourceId: 'aggregate-api',
    })

    const track: MusicInfo = {
      id: 'kw_118980',
      name: '夜曲',
      artist: '周杰伦',
      album: '十一月的萧邦',
      duration: 226,
      url: '',
      source: 'kw',
      songmid: '118980',
      qualities: [{ type: 'flac', size: '29MB' }],
    }

    const { usePlaybackResolver } = await import('../../src/modules/playback/playbackResolver')
    const resolution = await usePlaybackResolver().resolve(track)

    expect(resolution.url).toBe('https://er-sycdn.kuwo.cn/custom-resolved.flac?from=aggregate-api')
    expect(resolution.resolver).toBe('custom-source')
    expect(resolution.userSourceId).toBe('aggregate-api')
  })

  it('still uses direct urls immediately for non-search tracks', async () => {
    userSourceStoreState.enabledSources = [{ id: 'aggregate-api' }]

    const track: MusicInfo = {
      id: 'local_track_1',
      name: '本地试听',
      artist: '未知歌手',
      album: '本地文件',
      duration: 180,
      url: 'https://example.com/local-or-stored.mp3',
      source: 'local',
    }

    const { usePlaybackResolver } = await import('../../src/modules/playback/playbackResolver')
    const resolution = await usePlaybackResolver().resolve(track)

    expect(resolution.url).toBe('https://example.com/local-or-stored.mp3')
    expect(resolution.resolver).toBe('direct-url')
    expect(resolveWithCustomSourcesMock).not.toHaveBeenCalled()
  })
})
