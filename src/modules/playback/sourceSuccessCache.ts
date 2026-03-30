import type { MusicInfo } from '../../types/music'
import { buildTrackSourceCacheKey } from './trackIdentity'

export interface PlaybackSourceCacheRecord {
  key: string
  sourceId: string
  actualQuality?: string
  updatedAt: number
}

export interface CachedPreferredSourceRecord {
  sourceId: string
  actualQuality?: string
}

const STORAGE_KEY = 'playbackSourceSuccessCache'
const MAX_CACHE_RECORDS = 200

let cacheRecords: PlaybackSourceCacheRecord[] | null = null

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function loadCacheRecords(): PlaybackSourceCacheRecord[] {
  if (cacheRecords) return cacheRecords
  if (!canUseStorage()) {
    cacheRecords = []
    return cacheRecords
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      cacheRecords = []
      return cacheRecords
    }

    const parsed = JSON.parse(raw)
    cacheRecords = Array.isArray(parsed)
      ? parsed
          .filter(
            (item): item is PlaybackSourceCacheRecord =>
              Boolean(item) &&
              typeof item === 'object' &&
              typeof item.key === 'string' &&
              typeof item.sourceId === 'string' &&
              typeof item.updatedAt === 'number'
          )
          .slice(0, MAX_CACHE_RECORDS)
      : []
  } catch (error) {
    console.warn('[PlaybackSourceCache] Failed to load cache:', error)
    cacheRecords = []
  }

  return cacheRecords
}

function persistCacheRecords() {
  if (!canUseStorage() || !cacheRecords) return

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheRecords))
  } catch (error) {
    console.warn('[PlaybackSourceCache] Failed to persist cache:', error)
  }
}

export function getCachedPreferredSourceRecord(
  track: MusicInfo,
  targetQuality: string,
  enabledSourceIds: string[]
): CachedPreferredSourceRecord | undefined {
  const key = buildTrackSourceCacheKey(track, targetQuality)
  const record = loadCacheRecords().find((item) => item.key === key)
  if (!record || !enabledSourceIds.includes(record.sourceId)) return undefined

  return {
    sourceId: record.sourceId,
    actualQuality: record.actualQuality,
  }
}

export function getCachedPreferredSourceId(
  track: MusicInfo,
  targetQuality: string,
  enabledSourceIds: string[]
): string | undefined {
  return getCachedPreferredSourceRecord(track, targetQuality, enabledSourceIds)?.sourceId
}

export function rememberSuccessfulSource(
  track: MusicInfo,
  targetQuality: string,
  sourceId: string,
  actualQuality?: string
) {
  const key = buildTrackSourceCacheKey(track, targetQuality)
  const records = loadCacheRecords().filter((item) => item.key !== key)

  records.unshift({
    key,
    sourceId,
    actualQuality,
    updatedAt: Date.now(),
  })

  cacheRecords = records.slice(0, MAX_CACHE_RECORDS)
  persistCacheRecords()
}

export function forgetSuccessfulSource(
  track: MusicInfo,
  targetQuality: string,
  sourceId?: string
) {
  const key = buildTrackSourceCacheKey(track, targetQuality)
  const nextRecords = loadCacheRecords().filter((item) => {
    if (item.key !== key) return true
    if (sourceId && item.sourceId !== sourceId) return true
    return false
  })

  if (nextRecords.length === loadCacheRecords().length) return
  cacheRecords = nextRecords
  persistCacheRecords()
}

export function clearCachedSourcesById(sourceId: string) {
  const nextRecords = loadCacheRecords().filter((item) => item.sourceId !== sourceId)
  if (nextRecords.length === loadCacheRecords().length) return
  cacheRecords = nextRecords
  persistCacheRecords()
}

export function getPlaybackSourceCacheSnapshot(): PlaybackSourceCacheRecord[] {
  return [...loadCacheRecords()]
}

export function getPlaybackSourceCacheRecord(
  track: MusicInfo,
  targetQuality: string,
): PlaybackSourceCacheRecord | undefined {
  const key = buildTrackSourceCacheKey(track, targetQuality)
  return loadCacheRecords().find((item) => item.key === key)
}

export function clearPlaybackSourceCache() {
  cacheRecords = []
  if (canUseStorage()) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
