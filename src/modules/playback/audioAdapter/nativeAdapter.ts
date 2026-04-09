import type { AudioAdapter } from './types'

type VoidCb = () => void
type TimeCb = (time: number) => void
type ErrorCb = (err: Error) => void
type DurationCb = (duration: number) => void

/**
 * NativeAudioAdapter — 通过 Tauri invoke 调用 Rust 后端音频播放器
 *
 * 用于 Android 和 Windows 等需要原生音频支持的平台。
 * Rust 后端使用 rodio（桌面）或 Android 原生 ExoPlayer 进行音频解码和输出。
 *
 * 事件回调通过定时轮询 Rust 后端状态来模拟（Tauri command 是 request/response 模式）。
 */
export class NativeAudioAdapter implements AudioAdapter {
  private _src: string = ''
  private _paused: boolean = true
  private _ended: boolean = false
  private _currentTime: number = 0
  private _duration: number = 0
  private _volume: number = 1
  private _playbackRate: number = 1
  private _destroyed = false

  // 轮询定时器
  private pollTimer: number | null = null
  private readonly POLL_INTERVAL = 250 // ms

  // 回调
  private timeUpdateCbs: TimeCb[] = []
  private endedCbs: VoidCb[] = []
  private errorCbs: ErrorCb[] = []
  private loadedMetadataCbs: DurationCb[] = []
  private playingCbs: VoidCb[] = []
  private pauseCbs: VoidCb[] = []
  private canPlayCbs: VoidCb[] = []

  // 上一次轮询状态（用于检测变化触发回调）
  private lastIsPlaying: boolean = false

  constructor() {
    this.startPolling()
  }

  private invoke(command: string, args?: Record<string, unknown>): Promise<unknown> {
    return (window as any).__TAURI_INTERNALS__.invoke(command, args)
  }

  private startPolling() {
    if (this.pollTimer !== null) return
    this.pollTimer = window.setInterval(() => this.poll(), this.POLL_INTERVAL)
  }

  private stopPolling() {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  private async poll() {
    if (this._destroyed) return
    try {
      const state = await this.invoke('get_player_state') as {
        is_playing: boolean
        is_paused: boolean
        position: number
        duration: number
        volume: number
        speed: number
        current_url: string | null
      }

      const wasPlaying = !this._paused
      this._paused = state.is_paused || !state.is_playing
      this._currentTime = state.position
      this._ended = false // 无法从状态直接判断，需通过 play 时的 ended 事件
      const prevDuration = this._duration
      this._duration = state.duration

      // 触发 timeupdate
      for (const cb of this.timeUpdateCbs) cb(this._currentTime)

      // 触发 loadedmetadata（duration 变化时）
      if (prevDuration === 0 && this._duration > 0) {
        for (const cb of this.loadedMetadataCbs) cb(this._duration)
        for (const cb of this.canPlayCbs) cb()
      }

      // 触发 playing / pause（状态变化时）
      const nowPlaying = !this._paused
      if (nowPlaying && !this.lastIsPlaying) {
        for (const cb of this.playingCbs) cb()
      } else if (!nowPlaying && this.lastIsPlaying) {
        for (const cb of this.pauseCbs) cb()
      }
      this.lastIsPlaying = nowPlaying
    } catch (err) {
      // 轮询失败不触发 error 回调（避免频繁触发）
      console.warn('[NativeAudioAdapter] poll failed:', err)
    }
  }

  async play(): Promise<void> {
    if (this._destroyed) return
    try {
      await this.invoke('resume_music')
      this._paused = false
      this.lastIsPlaying = true
      for (const cb of this.playingCbs) cb()
    } catch (err: any) {
      const error = new Error(err?.message || err?.toString?.() || 'Native play failed')
      for (const cb of this.errorCbs) cb(error)
      throw error
    }
  }

  pause(): void {
    if (this._destroyed) return
    this.invoke('pause_music').catch((err: any) => {
      console.error('[NativeAudioAdapter] pause failed:', err)
    })
    this._paused = true
    this.lastIsPlaying = false
    for (const cb of this.pauseCbs) cb()
  }

  stop(): void {
    if (this._destroyed) return
    this.invoke('stop_music').catch((err: any) => {
      console.error('[NativeAudioAdapter] stop failed:', err)
    })
    this._paused = true
    this._currentTime = 0
    this.lastIsPlaying = false
  }

  seek(timeSeconds: number): void {
    if (this._destroyed) return
    this.invoke('seek_to', { position: timeSeconds }).catch((err: any) => {
      console.error('[NativeAudioAdapter] seek failed:', err)
    })
    this._currentTime = timeSeconds
  }

  get currentTime(): number { return this._currentTime }
  get duration(): number { return this._duration }
  get paused(): boolean { return this._paused }
  get ended(): boolean { return this._ended }
  get volume(): number { return this._volume }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v))
    this.invoke('set_volume', { volume: this._volume }).catch((err: any) => {
      console.error('[NativeAudioAdapter] setVolume failed:', err)
    })
  }

  setPlaybackRate(rate: number): void {
    this._playbackRate = Math.max(0.5, Math.min(2, rate))
    this.invoke('set_playback_rate', { rate: this._playbackRate }).catch((err: any) => {
      console.error('[NativeAudioAdapter] setPlaybackRate failed:', err)
    })
  }

  setSrc(url: string): void {
    if (this._src === url) return
    this._src = url
    this._paused = true
    this._currentTime = 0
    this._duration = 0
    this._ended = false
    this.lastIsPlaying = false

    this.invoke('play_music', { url }).then(() => {
      this._paused = false
      this.lastIsPlaying = true
      for (const cb of this.loadedMetadataCbs) cb(this._duration)
      for (const cb of this.canPlayCbs) cb()
      for (const cb of this.playingCbs) cb()
    }).catch((err: any) => {
      const error = new Error(err?.message || err?.toString?.() || 'Failed to load source')
      for (const cb of this.errorCbs) cb(error)
    })
  }

  reset(): void {
    this.invoke('stop_music').catch(() => {})
    this._src = ''
    this._paused = true
    this._currentTime = 0
    this._duration = 0
    this._ended = false
    this.lastIsPlaying = false
  }

  onTimeUpdate(cb: TimeCb): () => void { this.timeUpdateCbs.push(cb); return () => { this.timeUpdateCbs = this.timeUpdateCbs.filter(c => c !== cb) } }
  onEnded(cb: VoidCb): () => void { this.endedCbs.push(cb); return () => { this.endedCbs = this.endedCbs.filter(c => c !== cb) } }
  onError(cb: ErrorCb): () => void { this.errorCbs.push(cb); return () => { this.errorCbs = this.errorCbs.filter(c => c !== cb) } }
  onLoadedMetadata(cb: DurationCb): () => void { this.loadedMetadataCbs.push(cb); return () => { this.loadedMetadataCbs = this.loadedMetadataCbs.filter(c => c !== cb) } }
  onPlaying(cb: VoidCb): () => void { this.playingCbs.push(cb); return () => { this.playingCbs = this.playingCbs.filter(c => c !== cb) } }
  onPause(cb: VoidCb): () => void { this.pauseCbs.push(cb); return () => { this.pauseCbs = this.pauseCbs.filter(c => c !== cb) } }
  onCanPlay(cb: VoidCb): () => void { this.canPlayCbs.push(cb); return () => { this.canPlayCbs = this.canPlayCbs.filter(c => c !== cb) } }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this.stopPolling()
    this.invoke('stop_music').catch(() => {})
    this.timeUpdateCbs = []; this.endedCbs = []; this.errorCbs = []
    this.loadedMetadataCbs = []; this.playingCbs = []; this.pauseCbs = []; this.canPlayCbs = []
  }
}
