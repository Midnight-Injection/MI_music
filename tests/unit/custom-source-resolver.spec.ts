import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MusicInfo } from '../../src/types/music'

const canUsePlaybackUrlMock = vi.fn()
const hasFreshPlaybackUrlProbeSuccessMock = vi.fn()
const getCachedPreferredSourceRecordMock = vi.fn()
const markSourceFailureMock = vi.fn()
const markSourceSuccessMock = vi.fn()
const getBlockedSourceIdsForTrackMock = vi.fn()

vi.mock('../../src/modules/playback/urlProbe', () => ({
  canUsePlaybackUrl: canUsePlaybackUrlMock,
  hasFreshPlaybackUrlProbeSuccess: hasFreshPlaybackUrlProbeSuccessMock,
}))

vi.mock('../../src/modules/playback/sourceSuccessCache', () => ({
  getCachedPreferredSourceRecord: getCachedPreferredSourceRecordMock,
}))

vi.mock('../../src/modules/playback/badSourceBlacklist', () => ({
  getBlockedSourceIdsForTrack: getBlockedSourceIdsForTrackMock,
}))

vi.mock('../../src/modules/source-health/store', () => ({
  getChannelFailureSummary: vi.fn(() => ''),
  markSourceFailure: markSourceFailureMock,
  markSourceSuccess: markSourceSuccessMock,
  normalizeSourceErrorMessage: (error: unknown) =>
    error instanceof Error ? error.message : String(error),
  orderSourcesForAction: (
    _channel: string,
    _action: string,
    sources: Array<{ id: string; priority: number; created_at: number }>,
    preferredSourceId?: string
  ) =>
    [...sources].sort((left, right) => {
      if (preferredSourceId) {
        if (left.id === preferredSourceId) return -1
        if (right.id === preferredSourceId) return 1
      }

      if (left.priority !== right.priority) return left.priority - right.priority
      return left.created_at - right.created_at
    }),
}))

function createTrack(id: string): MusicInfo {
  return {
    id,
    name: '晴天',
    artist: '周杰伦',
    album: '叶惠美',
    duration: 269,
    source: 'kw',
    url: '',
    songmid: `${id}-songmid`,
    qualities: [{ type: '320k', size: '9MB' }],
  }
}

function createSource(id: string, priority: number) {
  return {
    id,
    name: id,
    priority,
    created_at: priority,
    sources: {
      kw: {
        actions: ['musicUrl'],
        qualitys: ['320k'],
      },
    },
  }
}

function createSearchableSource(id: string, priority: number) {
  return {
    ...createSource(id, priority),
    sources: {
      kw: {
        actions: ['musicUrl', 'search'],
        qualitys: ['320k'],
      },
    },
  }
}

describe('resolveWithCustomSources', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    canUsePlaybackUrlMock.mockReset()
    hasFreshPlaybackUrlProbeSuccessMock.mockReset()
    getCachedPreferredSourceRecordMock.mockReset()
    markSourceFailureMock.mockReset()
    markSourceSuccessMock.mockReset()
    getBlockedSourceIdsForTrackMock.mockReset()

    canUsePlaybackUrlMock.mockResolvedValue(true)
    hasFreshPlaybackUrlProbeSuccessMock.mockReturnValue(false)
    getCachedPreferredSourceRecordMock.mockReturnValue(undefined)
    getBlockedSourceIdsForTrackMock.mockReturnValue([])
    window.localStorage.clear()
  })

  it('returns the first playable source from a concurrent batch without waiting for hung sources', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('parallel-fast-winner')
    const sources = [
      createSource('slow-hang', 1),
      createSource('fast-success', 2),
      createSource('late-success', 3),
    ]

    const scriptRuntime = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getMusicUrl: vi.fn((_channel, _track, _quality, sourceId: string) => {
        if (sourceId === 'slow-hang') {
          return new Promise<string | null>(() => undefined)
        }

        return new Promise<string | null>((resolve) => {
          globalThis.setTimeout(() => {
            resolve(`https://example.com/${sourceId}.mp3`)
          }, sourceId === 'fast-success' ? 20 : 120)
        })
      }),
      search: vi.fn().mockResolvedValue([]),
    }

    const resolutionPromise = resolveWithCustomSources(track, {
      userSourceStore: {
        isLoaded: true,
        enabledSources: sources,
        loadUserSources: vi.fn(),
      } as never,
      settingsStore: {
        settings: {
          audioQuality: 'high',
          activeUserSourceId: '',
        },
      } as never,
      scriptRuntime: scriptRuntime as never,
    })

    await vi.advanceTimersByTimeAsync(21)
    await expect(resolutionPromise).resolves.toMatchObject({
      userSourceId: 'fast-success',
      resolver: 'custom-source',
      url: 'https://example.com/fast-success.mp3',
    })
  })

  it('tries the cached preferred source before starting parallel fallback sources', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('preferred-source-first')
    const sources = [createSource('preferred-source', 1), createSource('other-source', 2)]

    getCachedPreferredSourceRecordMock.mockReturnValue({
      sourceId: 'preferred-source',
      actualQuality: '320k',
    })

    const scriptRuntime = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getMusicUrl: vi.fn((_channel, _track, _quality, sourceId: string) => {
        return new Promise<string | null>((resolve) => {
          globalThis.setTimeout(() => {
            resolve(`https://example.com/${sourceId}.mp3`)
          }, sourceId === 'preferred-source' ? 40 : 5)
        })
      }),
      search: vi.fn().mockResolvedValue([]),
    }

    const resolutionPromise = resolveWithCustomSources(track, {
      userSourceStore: {
        isLoaded: true,
        enabledSources: sources,
        loadUserSources: vi.fn(),
      } as never,
      settingsStore: {
        settings: {
          audioQuality: 'high',
          activeUserSourceId: '',
        },
      } as never,
      scriptRuntime: scriptRuntime as never,
    })

    await vi.advanceTimersByTimeAsync(41)
    await expect(resolutionPromise).resolves.toMatchObject({
      userSourceId: 'preferred-source',
      url: 'https://example.com/preferred-source.mp3',
    })
    expect(scriptRuntime.getMusicUrl).toHaveBeenCalledTimes(1)
    expect(scriptRuntime.getMusicUrl).toHaveBeenCalledWith(
      'kw',
      expect.objectContaining({ name: '晴天', singer: '周杰伦' }),
      '320k',
      'preferred-source'
    )
  })

  it('skips cached preferred source when that source has been explicitly excluded', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('skip-bad-preferred-source')
    const sources = [createSource('preferred-source', 1), createSource('healthy-source', 2)]

    getCachedPreferredSourceRecordMock.mockReturnValue({
      sourceId: 'preferred-source',
      actualQuality: '320k',
    })

    const scriptRuntime = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getMusicUrl: vi.fn((_channel, _track, _quality, sourceId: string) =>
        Promise.resolve(`https://example.com/${sourceId}.mp3`)
      ),
      search: vi.fn().mockResolvedValue([]),
    }

    await expect(
      resolveWithCustomSources(
        track,
        {
          userSourceStore: {
            isLoaded: true,
            enabledSources: sources,
            loadUserSources: vi.fn(),
          } as never,
          settingsStore: {
            settings: {
              audioQuality: 'high',
              activeUserSourceId: '',
            },
          } as never,
          scriptRuntime: scriptRuntime as never,
        },
        {
          excludedSourceIds: ['preferred-source'],
        }
      )
    ).resolves.toMatchObject({
      userSourceId: 'healthy-source',
      url: 'https://example.com/healthy-source.mp3',
    })

    expect(scriptRuntime.getMusicUrl).toHaveBeenCalledTimes(1)
    expect(scriptRuntime.getMusicUrl).toHaveBeenCalledWith(
      'kw',
      expect.objectContaining({ name: '晴天', singer: '周杰伦' }),
      '320k',
      'healthy-source'
    )
  })

  it('skips sources blacklisted for the current track before resolving playback', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('skip-blacklisted-source')
    const sources = [createSource('blacklisted-source', 1), createSource('healthy-source', 2)]

    getBlockedSourceIdsForTrackMock.mockReturnValue(['blacklisted-source'])

    const scriptRuntime = {
      initialize: vi.fn().mockResolvedValue(undefined),
      getMusicUrl: vi.fn((_channel, _track, _quality, sourceId: string) =>
        Promise.resolve(`https://example.com/${sourceId}.mp3`)
      ),
      search: vi.fn().mockResolvedValue([]),
    }

    await expect(
      resolveWithCustomSources(track, {
        userSourceStore: {
          isLoaded: true,
          enabledSources: sources,
          loadUserSources: vi.fn(),
        } as never,
        settingsStore: {
          settings: {
            audioQuality: 'high',
            activeUserSourceId: '',
          },
        } as never,
        scriptRuntime: scriptRuntime as never,
      })
    ).resolves.toMatchObject({
      userSourceId: 'healthy-source',
      url: 'https://example.com/healthy-source.mp3',
    })

    expect(scriptRuntime.getMusicUrl).toHaveBeenCalledTimes(1)
    expect(scriptRuntime.getMusicUrl).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      'blacklisted-source'
    )
  })

  it('returns null when every source resolver reports failure', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('all-source-failed')

    const resolutionPromise = resolveWithCustomSources(track, {
      userSourceStore: {
        isLoaded: true,
        enabledSources: [createSource('dead-source', 1)],
        loadUserSources: vi.fn(),
      } as never,
      settingsStore: {
        settings: {
          audioQuality: 'high',
          activeUserSourceId: '',
        },
      } as never,
      scriptRuntime: {
        initialize: vi.fn().mockResolvedValue(undefined),
        getMusicUrl: vi.fn().mockRejectedValue(new Error('script timeout after 12000ms')),
        search: vi.fn().mockResolvedValue([]),
      } as never,
    })

    await expect(resolutionPromise).resolves.toBeNull()
    expect(markSourceFailureMock).toHaveBeenCalledWith(
      'kw',
      'musicUrl',
      'dead-source',
      'script timeout after 12000ms'
    )
  })

  it('re-searches within the custom source when direct metadata resolution fails', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('builtin-kw-track')
    const source = createSearchableSource('aggregate-api', 1)

    const getMusicUrlMock = vi.fn(
      (_channel, musicInfo: { songmid?: string }, _quality, sourceId: string) => {
        if (sourceId !== 'aggregate-api') return Promise.resolve(null)
        if (musicInfo.songmid === 'builtin-kw-track-songmid') return Promise.resolve(null)
        if (musicInfo.songmid === 'aggregate-search-songmid') {
          return Promise.resolve('https://example.com/aggregate-api.mp3')
        }
        return Promise.resolve(null)
      }
    )

    const searchMock = vi.fn().mockResolvedValue([
      {
        id: 'kw_aggregate-search-songmid',
        source: 'kw',
        name: '晴天',
        singer: '周杰伦',
        album_name: '叶惠美',
        interval: '04:29',
        songmid: 'aggregate-search-songmid',
        types: [{ type: '320k', size: '9MB' }],
      },
    ])

    const resolution = await resolveWithCustomSources(track, {
      userSourceStore: {
        isLoaded: true,
        enabledSources: [source],
        loadUserSources: vi.fn(),
      } as never,
      settingsStore: {
        settings: {
          audioQuality: 'high',
          activeUserSourceId: 'aggregate-api',
        },
      } as never,
      scriptRuntime: {
        initialize: vi.fn().mockResolvedValue(undefined),
        getMusicUrl: getMusicUrlMock,
        search: searchMock,
      } as never,
    })

    expect(searchMock).toHaveBeenCalledWith('aggregate-api', '晴天 周杰伦', 1, 12, 'kw')
    expect(getMusicUrlMock).toHaveBeenCalledTimes(2)
    expect(resolution).toMatchObject({
      resolver: 'custom-source',
      userSourceId: 'aggregate-api',
      url: 'https://example.com/aggregate-api.mp3',
    })
    expect(resolution?.matchedTrack?.songmid).toBe('aggregate-search-songmid')
  })

  it('rejects loosely matched search candidates when titles are not exactly the same song', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track: MusicInfo = {
      id: 'kw_song_1',
      name: '以父之名',
      artist: '周杰伦',
      album: '叶惠美',
      duration: 223,
      source: 'kw',
      url: '',
      songmid: 'kw-song-1',
      qualities: [{ type: '320k', size: '8MB' }],
    }
    const source = createSearchableSource('aggregate-api', 1)

    const resolution = await resolveWithCustomSources(track, {
      userSourceStore: {
        isLoaded: true,
        enabledSources: [source],
        loadUserSources: vi.fn(),
      } as never,
      settingsStore: {
        settings: {
          audioQuality: 'high',
          activeUserSourceId: 'aggregate-api',
        },
      } as never,
      scriptRuntime: {
        initialize: vi.fn().mockResolvedValue(undefined),
        getMusicUrl: vi.fn().mockResolvedValue(null),
        search: vi.fn().mockResolvedValue([
          {
            id: 'kw_wrong-song',
            source: 'kw',
            name: '以爱之名',
            singer: '周杰伦',
            album_name: '叶惠美',
            interval: '03:43',
            songmid: 'wrong-songmid',
            types: [{ type: '320k', size: '8MB' }],
          },
        ]),
      } as never,
    })

    expect(resolution).toBeNull()
  })

  it('treats html landing pages as unusable and continues trying other custom sources', async () => {
    const { resolveWithCustomSources } = await import(
      '../../src/modules/playback/resolvers/customSourceResolver'
    )
    const track = createTrack('builtin-kw-track')
    const sources = [
      createSearchableSource('landing-source', 1),
      createSearchableSource('good-source', 2),
    ]

    canUsePlaybackUrlMock.mockImplementation(async (url: string) => !url.includes('landing-page'))

    const resolution = await resolveWithCustomSources(track, {
      userSourceStore: {
        isLoaded: true,
        enabledSources: sources,
        loadUserSources: vi.fn(),
      } as never,
      settingsStore: {
        settings: {
          audioQuality: 'high',
          activeUserSourceId: '',
        },
      } as never,
      scriptRuntime: {
        initialize: vi.fn().mockResolvedValue(undefined),
        getMusicUrl: vi.fn(
          (_channel, musicInfo: { songmid?: string }, _quality, sourceId: string) => {
            if (musicInfo.songmid === 'builtin-kw-track-songmid') return Promise.resolve(null)
            if (musicInfo.songmid !== 'aggregate-search-songmid') return Promise.resolve(null)
            if (sourceId === 'landing-source') {
              return Promise.resolve('https://example.com/landing-page')
            }
            if (sourceId === 'good-source') {
              return Promise.resolve('https://example.com/good-source.flac')
            }
            return Promise.resolve(null)
          }
        ),
        search: vi.fn().mockResolvedValue([
          {
            id: 'kw_aggregate-search-songmid',
            source: 'kw',
            name: '晴天',
            singer: '周杰伦',
            album_name: '叶惠美',
            interval: '04:29',
            songmid: 'aggregate-search-songmid',
            types: [{ type: '320k', size: '9MB' }],
          },
        ]),
      } as never,
    })

    expect(resolution).toMatchObject({
      url: 'https://example.com/good-source.flac',
      userSourceId: 'good-source',
      resolver: 'custom-source',
    })
  })
})
