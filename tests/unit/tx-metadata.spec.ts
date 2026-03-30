import { describe, expect, it } from 'vitest'
import { normalizeChannelSearchResult } from '../../src/modules/search/normalize'
import { toScriptMusicInfo } from '../../src/modules/playback/types'
import type { ChannelSearchResultItem, MusicInfo } from '../../src/types/music'

describe('Tencent metadata compatibility', () => {
  it('preserves tx search metadata for playback resolution', () => {
    const track = normalizeChannelSearchResult({
      id: 'tx_0044SaFh0apuR2',
      name: '那天下雨了',
      singer: '周杰伦',
      source: 'tx',
      songmid: '0044SaFh0apuR2',
      song_id: '649556362',
      msg_id: '13',
      album_id: '0041WVfh2vtlJE',
      str_media_mid: '0044SaFh0apuR2',
      copyright_id: '649556362',
      interval: '03:43',
      album_name: '太阳之子',
      types: [{ type: '320k', size: '8.5MB' }],
      img: 'https://example.com/cover.jpg',
    } satisfies ChannelSearchResultItem)

    expect(track.songmid).toBe('0044SaFh0apuR2')
    expect(track.songId).toBe('649556362')
    expect(track.msgId).toBe('13')
    expect(track.strMediaMid).toBe('0044SaFh0apuR2')
    expect(track.copyrightId).toBe('649556362')
    expect(track.albumId).toBe('0041WVfh2vtlJE')
  })

  it('adds tx aliases expected by aggregate user sources', () => {
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
      albumId: '0041WVfh2vtlJE',
    }

    const scriptInfo = toScriptMusicInfo(track, 'tx')

    expect(scriptInfo.songmid).toBe('0044SaFh0apuR2')
    expect(scriptInfo.mid).toBe('0044SaFh0apuR2')
    expect(scriptInfo.strMediaMid).toBe('0044SaFh0apuR2')
    expect(scriptInfo.mediaMid).toBe('0044SaFh0apuR2')
    expect(scriptInfo.media_mid).toBe('0044SaFh0apuR2')
    expect(scriptInfo.songId).toBe('649556362')
    expect(scriptInfo.songid).toBe('649556362')
    expect(scriptInfo.msgId).toBe('13')
    expect(scriptInfo.msgid).toBe('13')
    expect(scriptInfo.copyrightId).toBe('649556362')
    expect(scriptInfo.albumId).toBe('0041WVfh2vtlJE')
  })
})
