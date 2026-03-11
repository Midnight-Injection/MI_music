import type { MusicInfo } from './music'

export interface Playlist {
  id: string
  name: string
  cover?: string
  musics: MusicInfo[]
  createdAt: number
  updatedAt: number
}

export interface PlaylistInfo {
  id: string
  name: string
  musicCount: number
  createdAt: number
}
