export type Language = 'zh-CN' | 'zh-TW' | 'en-US'
export type WindowSize = 'small' | 'medium' | 'large' | 'custom'
export type PlayMode = 'loop' | 'single' | 'random'
export type AudioQuality = 'standard' | 'high' | 'lossless'
export type ThemeColorType =
  | 'green'
  | 'blue'
  | 'red'
  | 'pink'
  | 'purple'
  | 'orange'
  | 'black'
  | 'grey'
  | 'custom'
export type ThemeMode = 'light' | 'dark' | 'auto'
export type BaseplateStyle = 'solid' | 'linear-gradient' | 'radial-gradient' | 'image'
export type ControlPosition = 'left' | 'right'
export type FontFamilyPreset = 'system' | 'apple' | 'windows' | 'serif'

export const FONT_FAMILY_STACKS: Record<FontFamilyPreset, string> = {
  system:
    '"Avenir Next", "SF Pro Display", "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  apple:
    '"SF Pro Display", "SF Pro Text", "PingFang SC", "Hiragino Sans GB", -apple-system, BlinkMacSystemFont, sans-serif',
  windows: '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", sans-serif',
  serif: '"Songti SC", "STSong", "Noto Serif CJK SC", "Source Han Serif SC", serif',
}

export interface ChannelConfig {
  id: string
  name: string
  enabled: boolean
}

// Default music source configurations
export const DEFAULT_CHANNEL_CONFIGS: ChannelConfig[] = [
  { id: 'kw', name: '酷我', enabled: true },
  { id: 'kg', name: '酷狗', enabled: false },
  { id: 'wy', name: '网易', enabled: false },
  { id: 'tx', name: '腾讯', enabled: false },
  { id: 'mg', name: '咪咕', enabled: false },
]

// Source name mapping for display
export const CHANNEL_NAMES: Record<string, string> = {
  all: '综合搜索',
  kw: '酷我音乐',
  kg: '酷狗音乐',
  wy: '网易云音乐',
  tx: 'QQ音乐',
  mg: '咪咕音乐',
}

// Settings interface
export interface Settings {
  // General
  language: Language
  windowSize: WindowSize
  fontSize: number
  animation: boolean
  controlPosition: ControlPosition
  autoCheckAppUpdate: boolean
  appUpdateLastCheckedAt: string

  // Player
  startupAutoPlay: boolean
  defaultPlayMode: PlayMode
  audioQuality: AudioQuality
  volume: number
  autoSkipOnError: boolean

  // Lyrics
  lyricShow: boolean
  showTranslation: boolean
  showRomanization: boolean
  lyricFontSize: number
  lyricPosition: 'top' | 'center' | 'bottom'

  // Download
  downloadEnabled: boolean
  downloadPath: string
  fileNaming: string
  maxDownloads: number
  downloadLyrics: boolean

  // Theme
  themeColor: ThemeColorType
  themeMode: ThemeMode
  customColor: string
  fontFamilyPreset: FontFamilyPreset
  textColorPrimary: string
  textColorSecondary: string
  baseplateStyle: BaseplateStyle
  baseplateColorA: string
  baseplateColorB: string
  baseplateAngle: number
  baseplateIntensity: number
  baseplateUseThemeAccent: boolean
  baseplateImagePath: string
  baseplateImageOpacity: number
  baseplateImageBlur: number

  // Network
  proxyEnabled: boolean
  proxyHost: string
  proxyPort: number

  // Sync
  syncMode: 'disabled' | 'server' | 'client'
  syncPort: number
  syncHost: string

  // Sources
  sources?: ChannelConfig[]
  activeUserSourceId?: string
}

// Default settings
export const DEFAULT_SETTINGS: Settings = {
  // General
  language: 'zh-CN',
  windowSize: 'medium',
  fontSize: 14,
  animation: true,
  controlPosition: 'left',
  autoCheckAppUpdate: true,
  appUpdateLastCheckedAt: '',

  // Player
  startupAutoPlay: false,
  defaultPlayMode: 'loop',
  audioQuality: 'standard',
  volume: 0.8,
  autoSkipOnError: true,

  // Lyrics
  lyricShow: true,
  showTranslation: false,
  showRomanization: false,
  lyricFontSize: 16,
  lyricPosition: 'center',

  // Download
  downloadEnabled: true,
  downloadPath: '',
  fileNaming: '{artist} - {title}',
  maxDownloads: 3,
  downloadLyrics: true,

  // Theme
  themeColor: 'green',
  themeMode: 'auto',
  customColor: '#1db954',
  fontFamilyPreset: 'system',
  textColorPrimary: '#f7fbff',
  textColorSecondary: '#dbe5f3',
  baseplateStyle: 'linear-gradient',
  baseplateColorA: '#102038',
  baseplateColorB: '#415b86',
  baseplateAngle: 140,
  baseplateIntensity: 78,
  baseplateUseThemeAccent: false,
  baseplateImagePath: '',
  baseplateImageOpacity: 72,
  baseplateImageBlur: 10,

  // Network
  proxyEnabled: false,
  proxyHost: '',
  proxyPort: 8080,

  // Sync
  syncMode: 'disabled',
  syncPort: 9527,
  syncHost: 'localhost',

  // Sources
  sources: [...DEFAULT_CHANNEL_CONFIGS],
  activeUserSourceId: '',
}
