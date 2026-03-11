export interface LyricLine {
  time_ms: number
  text: string
  translation?: string
  romanization?: string
  words?: WordTimestamp[]
}

export interface WordTimestamp {
  time_ms: number
  text: string
  duration: number
}

export interface LyricsMetadata {
  title?: string
  artist?: string
  album?: string
  author?: string
  length?: number
  by?: string
}

export interface Lyrics {
  lines: LyricLine[]
  metadata: LyricsMetadata
  offset: number
}

export interface CurrentLineInfo {
  current_index: number
  current_line?: LyricLine
  prev_line?: LyricLine
  next_line?: LyricLine
  line_changed: boolean
  progress_to_next: number
  has_word_level: boolean
}
