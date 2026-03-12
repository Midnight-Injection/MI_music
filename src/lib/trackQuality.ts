import type { MusicInfo, QualityInfo } from '../types/music'

const QUALITY_DISPLAY_PRIORITY = ['flac24bit', 'flac', '320k', '128k'] as const

function normalizeQuality(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

export function pickDisplayQualityFromList(qualities?: QualityInfo[]): string | null {
  if (!qualities?.length) return null

  const normalized = qualities
    .map((item) => normalizeQuality(item.type))
    .filter(Boolean)

  for (const quality of QUALITY_DISPLAY_PRIORITY) {
    if (normalized.includes(quality)) return quality
  }

  return normalized[0] || null
}

export function getTrackDisplayQuality(track?: MusicInfo | null): string | null {
  if (!track) return null
  return pickDisplayQualityFromList(track.qualities)
}

export function formatQualityLabel(quality?: string | null): string {
  const normalized = normalizeQuality(quality)
  if (!normalized) return ''

  switch (normalized) {
    case 'flac24bit':
      return 'Hi-Res'
    case 'flac':
      return 'FLAC'
    case '320k':
      return '320K'
    case '128k':
      return '128K'
    default:
      return normalized.toUpperCase()
  }
}
