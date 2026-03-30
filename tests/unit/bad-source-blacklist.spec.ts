import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MusicInfo } from '../../src/types/music'

function createTrack(id: string): MusicInfo {
  return {
    id,
    name: '天真的橡皮',
    artist: '周杰伦',
    album: '自定义专辑',
    duration: 240,
    source: 'kw',
    url: '',
    songmid: `${id}-songmid`,
    qualities: [{ type: 'flac', size: '25MB' }],
  }
}

describe('bad-source-blacklist', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T10:00:00+08:00'))
    window.localStorage.clear()
  })

  it('remembers and reads blocked source ids for a track', async () => {
    const blacklist = await import('../../src/modules/playback/badSourceBlacklist')
    const track = createTrack('track-1')

    blacklist.rememberBlockedTrackSource(track, 'aggregate-api', '音频时长异常')
    blacklist.rememberBlockedTrackSource(track, 'backup-api', '返回落地页')

    expect(blacklist.getBlockedSourceIdsForTrack(track)).toEqual([
      'backup-api',
      'aggregate-api',
    ])
    expect(blacklist.getBlockedTrackSourceRecords(track)).toHaveLength(2)
  })

  it('forgets blocked sources for the current track only', async () => {
    const blacklist = await import('../../src/modules/playback/badSourceBlacklist')
    const track = createTrack('track-1')

    blacklist.rememberBlockedTrackSource(track, 'aggregate-api', '音频时长异常')
    blacklist.rememberBlockedTrackSource(track, 'backup-api', '返回落地页')
    blacklist.forgetBlockedTrackSource(track, 'aggregate-api')

    expect(blacklist.getBlockedSourceIdsForTrack(track)).toEqual(['backup-api'])
  })

  it('drops expired records when reading storage', async () => {
    const blacklist = await import('../../src/modules/playback/badSourceBlacklist')
    const track = createTrack('track-1')

    blacklist.rememberBlockedTrackSource(track, 'aggregate-api', '音频时长异常', 1000)
    expect(blacklist.getBlockedSourceIdsForTrack(track)).toEqual(['aggregate-api'])

    await vi.advanceTimersByTimeAsync(1001)

    expect(blacklist.getBlockedSourceIdsForTrack(track)).toEqual([])
  })

  it('clears all persisted blacklist records', async () => {
    const blacklist = await import('../../src/modules/playback/badSourceBlacklist')
    const track = createTrack('track-1')

    blacklist.rememberBlockedTrackSource(track, 'aggregate-api', '音频时长异常')
    blacklist.clearBlockedTrackSourceRecords()

    expect(blacklist.getBlockedTrackSourceRecords(track)).toEqual([])
    expect(window.localStorage.getItem('playbackBadSourceBlacklist')).toBeNull()
  })
})
