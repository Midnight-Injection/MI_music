export interface DownloadSettings {
  enabled: boolean
  savePath: string
  namingFormat: NamingFormat
  maxConcurrent: number
  downloadLyrics: boolean
  embedCover: boolean
  embedLyrics: boolean
  downloadTranslation: boolean
  downloadRomanization: boolean
}

export type NamingFormat =
  | 'title-artist'
  | 'artist-title'
  | 'title-album-artist'
  | 'artist-album-title'

export interface DownloadItem {
  id: number
  songId?: number
  title: string
  artist: string
  album?: string
  cover?: string
  url: string
  filename: string
  status: DownloadStatus
  progress: number
  speed: number
  error?: string
  createdAt: string
  updatedAt: string
  filePath?: string
}

export type DownloadStatus =
  | 'pending'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'

export interface DownloadQueue {
  active: DownloadItem[]
  pending: DownloadItem[]
  completed: DownloadItem[]
  failed: DownloadItem[]
}
