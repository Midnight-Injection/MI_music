import { describe, expect, it } from 'vitest'
import { buildSuspiciousPlaybackMessage, isPlaybackDurationSuspicious } from '../../src/modules/playback/playbackValidation'
import type { MusicInfo } from '../../src/types/music'

const baseTrack: MusicInfo = {
  id: 'kw_238210',
  name: '以父之名',
  artist: '周杰伦',
  album: '叶惠美',
  duration: 223,
  source: 'kw',
  url: '',
  songmid: '238210',
}

describe('playbackValidation', () => {
  it('marks obviously short clips as suspicious for normal songs', () => {
    expect(isPlaybackDurationSuspicious(223, 11.5)).toBe(true)
    expect(isPlaybackDurationSuspicious(223, 24)).toBe(true)
  })

  it('allows near-match durations', () => {
    expect(isPlaybackDurationSuspicious(223, 220)).toBe(false)
    expect(isPlaybackDurationSuspicious(223, 205)).toBe(false)
  })

  it('does not over-reject short tracks without reliable expectation', () => {
    expect(isPlaybackDurationSuspicious(32, 11)).toBe(false)
    expect(isPlaybackDurationSuspicious(undefined, 11)).toBe(false)
  })

  it('still rejects very short clips when the source gives no duration but the title is not a snippet', () => {
    expect(buildSuspiciousPlaybackMessage({ ...baseTrack, duration: 0 }, 11.5)).toBe(
      '音源返回疑似错误短音频（实际 12s）'
    )
    expect(
      buildSuspiciousPlaybackMessage({ ...baseTrack, duration: 0, name: '以父之名 (片段)' }, 11.5)
    ).toBeNull()
  })

  it('builds a readable mismatch message', () => {
    expect(buildSuspiciousPlaybackMessage(baseTrack, 11.5)).toBe(
      '音源返回疑似错误音频（实际 12s，预期 223s）'
    )
    expect(buildSuspiciousPlaybackMessage(baseTrack, 221)).toBeNull()
  })
})
