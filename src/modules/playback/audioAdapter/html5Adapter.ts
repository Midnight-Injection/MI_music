import type { AudioAdapter } from './types'

type VoidCb = () => void
type TimeCb = (time: number) => void
type ErrorCb = (err: Error) => void
type DurationCb = (duration: number) => void

/**
 * Html5AudioAdapter — 基于 HTMLAudioElement 的播放适配器
 *
 * 适用于 macOS (WebKit) 和 Linux (WebKitGTK)，HTML5 Audio 原生运行良好。
 * Windows (WebView2) 需要在 Rust 层设置 autoplay 策略后才能正常使用。
 */
export class Html5AudioAdapter implements AudioAdapter {
  private el: HTMLAudioElement
  private _destroyed = false

  private timeUpdateCbs: TimeCb[] = []
  private endedCbs: VoidCb[] = []
  private errorCbs: ErrorCb[] = []
  private loadedMetadataCbs: DurationCb[] = []
  private playingCbs: VoidCb[] = []
  private pauseCbs: VoidCb[] = []
  private canPlayCbs: VoidCb[] = []

  private boundHandlers: {
    timeupdate: () => void
    ended: () => void
    error: () => void
    loadedmetadata: () => void
    playing: () => void
    pause: () => void
    canplay: () => void
  }

  constructor() {
    this.el = new Audio()
    this.el.preload = 'auto'

    this.boundHandlers = {
      timeupdate: () => {
        const t = this.el.currentTime
        for (const cb of this.timeUpdateCbs) cb(t)
      },
      ended: () => {
        for (const cb of this.endedCbs) cb()
      },
      error: () => {
        const mediaError = this.el.error
        const err = new Error(
          mediaError
            ? `Audio error ${mediaError.code}: ${mediaError.message || 'unknown'}`
            : 'Unknown audio error'
        )
        for (const cb of this.errorCbs) cb(err)
      },
      loadedmetadata: () => {
        const d = this.el.duration
        for (const cb of this.loadedMetadataCbs) cb(Number.isFinite(d) ? d : 0)
      },
      playing: () => {
        for (const cb of this.playingCbs) cb()
      },
      pause: () => {
        for (const cb of this.pauseCbs) cb()
      },
      canplay: () => {
        for (const cb of this.canPlayCbs) cb()
      },
    }

    this.el.addEventListener('timeupdate', this.boundHandlers.timeupdate)
    this.el.addEventListener('ended', this.boundHandlers.ended)
    this.el.addEventListener('error', this.boundHandlers.error)
    this.el.addEventListener('loadedmetadata', this.boundHandlers.loadedmetadata)
    this.el.addEventListener('playing', this.boundHandlers.playing)
    this.el.addEventListener('pause', this.boundHandlers.pause)
    this.el.addEventListener('canplay', this.boundHandlers.canplay)
  }

  async play(): Promise<void> {
    if (this._destroyed) return
    await this.el.play()
  }

  pause(): void {
    this.el.pause()
  }

  stop(): void {
    this.el.pause()
    this.el.currentTime = 0
  }

  seek(timeSeconds: number): void {
    this.el.currentTime = Math.max(0, timeSeconds)
  }

  get currentTime(): number { return this.el.currentTime }
  get duration(): number { const d = this.el.duration; return Number.isFinite(d) ? d : 0 }
  get paused(): boolean { return this.el.paused }
  get ended(): boolean { return this.el.ended }
  get volume(): number { return this.el.volume }

  setVolume(v: number): void { this.el.volume = Math.max(0, Math.min(1, v)) }
  setPlaybackRate(rate: number): void { this.el.playbackRate = rate }
  setSrc(url: string): void { if (this.el.src !== url) this.el.src = url }

  reset(): void {
    this.el.pause()
    this.el.removeAttribute('src')
    this.el.load()
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
    this.el.pause()
    this.el.removeAttribute('src')
    this.el.load()
    this.el.removeEventListener('timeupdate', this.boundHandlers.timeupdate)
    this.el.removeEventListener('ended', this.boundHandlers.ended)
    this.el.removeEventListener('error', this.boundHandlers.error)
    this.el.removeEventListener('loadedmetadata', this.boundHandlers.loadedmetadata)
    this.el.removeEventListener('playing', this.boundHandlers.playing)
    this.el.removeEventListener('pause', this.boundHandlers.pause)
    this.el.removeEventListener('canplay', this.boundHandlers.canplay)
    this.timeUpdateCbs = []; this.endedCbs = []; this.errorCbs = []
    this.loadedMetadataCbs = []; this.playingCbs = []; this.pauseCbs = []; this.canPlayCbs = []
  }
}
