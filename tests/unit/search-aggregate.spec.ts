import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MusicInfo } from '../../src/types/music'

const invokeMock = vi.fn()
const searchBuiltInTracksMock = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: invokeMock,
}))

vi.mock('../../src/store/settings', () => ({
  useSettingsStore: () => ({
    getEnabledChannelIds: () => ['kw', 'kg', 'wy', 'tx', 'mg'],
  }),
}))

vi.mock('../../src/modules/search/providers', () => ({
  searchBuiltInTracks: searchBuiltInTracksMock,
}))

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

function createTrack(source: MusicInfo['source'], name: string): MusicInfo {
  return {
    id: `${source}_${name}`,
    name,
    artist: '周杰伦',
    album: '测试专辑',
    duration: 220,
    url: '',
    source,
    songmid: `${source}-${name}`,
  }
}

describe('Aggregate search strategy', () => {
  beforeEach(() => {
    vi.resetModules()
    invokeMock.mockReset()
    searchBuiltInTracksMock.mockReset()
    delete (window as any).__TAURI__
  })

  it('emits partial aggregate results before final completion', async () => {
    const kw = createDeferred<MusicInfo[]>()
    const kg = createDeferred<MusicInfo[]>()
    const wy = createDeferred<MusicInfo[]>()
    const tx = createDeferred<MusicInfo[]>()
    const mg = createDeferred<MusicInfo[]>()

    searchBuiltInTracksMock.mockImplementation((channel: string) => {
      switch (channel) {
        case 'kw': return kw.promise
        case 'kg': return kg.promise
        case 'wy': return wy.promise
        case 'tx': return tx.promise
        case 'mg': return mg.promise
        default: return Promise.resolve([])
      }
    })

    const { useSearchService } = await import('../../src/modules/search/searchService')
    const searchService = useSearchService()
    const partials: string[] = []
    const settled: string[] = []

    const searchPromise = searchService.runSearch({
      keyword: '周杰伦',
      channel: 'all',
      page: 1,
      limit: 15,
    }, {
      onStart(channels) {
        expect(channels).toEqual(['kw', 'kg', 'wy', 'tx', 'mg'])
      },
      onPartial(channel, tracks) {
        partials.push(`${channel}:${tracks.length}`)
      },
      onChannelSettled(progress) {
        settled.push(`${progress.channel}:${progress.status}`)
      },
    })

    kw.resolve([createTrack('kw', '晴天')])
    await new Promise((resolve) => window.setTimeout(resolve, 0))

    expect(partials).toEqual(['kw:1'])
    expect(settled).toContain('kw:success')

    kg.resolve([createTrack('kg', '七里香')])
    wy.resolve([])
    tx.reject(new Error('tx failed'))
    mg.resolve([])

    const result = await searchPromise

    expect(result.channel).toBe('all')
    expect(result.total).toBe(2)
    expect(result.data.some((item) => item.source === 'kw')).toBe(true)
    expect(result.data.some((item) => item.source === 'kg')).toBe(true)
    expect(settled).toContain('tx:failed')
  })

  it('includes all channel in available set when built-in channels exist', async () => {
    invokeMock.mockResolvedValue(['kw', 'kg'])
    ;(window as any).__TAURI__ = {}

    const { useSearchService } = await import('../../src/modules/search/searchService')
    const searchService = useSearchService()
    const snapshot = await searchService.refreshAvailability(true)
    const channelSet = searchService.getAvailableChannelSet(snapshot)

    expect(channelSet.has('all')).toBe(true)
    expect(channelSet.has('kw')).toBe(true)
    expect(channelSet.has('kg')).toBe(true)
  })
})
