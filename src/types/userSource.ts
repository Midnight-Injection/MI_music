/// 用户音源脚本信息
export interface UserSourceScript {
  id: string
  name: string
  version: string
  description: string
  author: string
  homepage: string
  script: string
  sources: Record<string, UserSourceInfo>
  allow_show_update_alert: boolean
  enabled: boolean
  created_at: number
  updated_at: number
}

/// 用户音源信息
export interface UserSourceInfo {
  type: 'music'
  actions: ('musicUrl' | 'lyric' | 'pic' | 'search')[]
  qualitys: ('128k' | '320k' | 'flac' | 'wav')[]
}

/// 音源类型
export type UserSourceType = 'music'

/// 音源操作类型
export type UserSourceAction = 'musicUrl' | 'lyric' | 'pic' | 'search'

/// 音质类型
export type Quality = '128k' | '320k' | 'flac' | 'wav'

/// 默认音质映射
export const DEFAULT_QUALITY_MAP: Record<Quality, Quality[]> = {
  '128k': ['128k'],
  '320k': ['128k', '320k'],
  'flac': ['128k', '320k', 'flac'],
  'wav': ['128k', '320k', 'flac', 'wav'],
}
