import type { BuiltInSearchChannel, MusicInfo } from './music'

export interface Playlist {
  id: number
  name: string
  cover?: string | null
  description?: string | null
  systemKey?: string | null
  musics: MusicInfo[]
  createdAt: string
  updatedAt: string
}

export interface PlaylistInfo {
  id: number
  name: string
  musicCount: number
  systemKey?: string | null
  createdAt: string
  updatedAt: string
}

export type PlaylistSearchChannel = BuiltInSearchChannel

export interface SourcePlaylistSummary {
  id: string
  source: PlaylistSearchChannel
  name: string
  cover?: string
  creator?: string
  description?: string
  trackCount?: number
  playCount?: number
  createdAt?: number
  updatedAt?: number
}

export interface SourcePlaylistDetail {
  id: string
  source: PlaylistSearchChannel
  name: string
  cover?: string
  creator?: string
  description?: string
  trackCount?: number
  playCount?: number
  createdAt?: number
  updatedAt?: number
}
