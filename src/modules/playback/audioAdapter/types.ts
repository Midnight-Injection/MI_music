/**
 * AudioAdapter — 跨平台音频播放抽象接口
 *
 * 桌面端 (PC/TV) 使用 Html5AudioAdapter（封装 HTMLAudioElement）
 * Android 端使用 NativeAudioAdapter（通过 Tauri command 调用原生播放器）
 */
export interface AudioAdapter {
  // ── 播放控制 ──────────────────────────────────────
  play(): Promise<void>
  pause(): void
  stop(): void
  seek(timeSeconds: number): void

  // ── 只读状态 ──────────────────────────────────────
  readonly currentTime: number
  readonly duration: number
  readonly paused: boolean
  readonly ended: boolean
  readonly volume: number

  // ── 设置 ──────────────────────────────────────────
  setVolume(v: number): void
  setPlaybackRate(rate: number): void
  setSrc(url: string): void
  /** 完全重置播放器（清除 src、停止播放、归零时间） */
  reset(): void

  // ── 事件回调（返回 unsubscribe 函数） ─────────────
  onTimeUpdate(cb: (time: number) => void): () => void
  onEnded(cb: () => void): () => void
  onError(cb: (err: Error) => void): () => void
  onLoadedMetadata(cb: (duration: number) => void): () => void
  onPlaying(cb: () => void): () => void
  onPause(cb: () => void): () => void
  onCanPlay(cb: () => void): () => void

  // ── 生命周期 ──────────────────────────────────────
  destroy(): void
}
