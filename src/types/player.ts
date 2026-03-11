import type { MusicInfo } from './music'

export type PlayMode = 'loop' | 'single' | 'random'

export interface PlayerState {
  currentMusic: MusicInfo | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playMode: PlayMode
  playlist: MusicInfo[]
  currentIndex: number
}
