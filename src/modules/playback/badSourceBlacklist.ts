import type { MusicInfo } from '../../types/music'
import { buildTrackIdentityKey } from './trackIdentity'

export interface BlockedTrackSourceRecord {
  key: string
  sourceId: string
  reason: string
  expiresAt: number
  updatedAt: number
}

const BLOCKED_TRACK_SOURCE_STORAGE_KEY = 'playbackBadSourceBlacklist'
const BLOCKED_TRACK_SOURCE_MAX_RECORDS = 300
const DEFAULT_BLOCK_TTL_MS = 24 * 60 * 60 * 1000

let blockedTrackSourceRecords: BlockedTrackSourceRecord[] | null = null

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function buildBlockedTrackKey(track: MusicInfo) {
  return buildTrackIdentityKey(track)
}

function loadBlockedTrackSourceRecords(): BlockedTrackSourceRecord[] {
  if (blockedTrackSourceRecords) return blockedTrackSourceRecords
  if (!canUseStorage()) {
    blockedTrackSourceRecords = []
    return blockedTrackSourceRecords
  }

  try {
    const raw = window.localStorage.getItem(BLOCKED_TRACK_SOURCE_STORAGE_KEY)
    if (!raw) {
      blockedTrackSourceRecords = []
      return blockedTrackSourceRecords
    }

    const parsed = JSON.parse(raw)
    blockedTrackSourceRecords = Array.isArray(parsed)
      ? parsed.filter(
          (item): item is BlockedTrackSourceRecord =>
            Boolean(item)
            && typeof item === 'object'
            && typeof item.key === 'string'
            && typeof item.sourceId === 'string'
            && typeof item.reason === 'string'
            && typeof item.expiresAt === 'number'
            && typeof item.updatedAt === 'number',
        )
      : []
  } catch (error) {
    console.warn('[PlaybackBadSourceBlacklist] Failed to load records:', error)
    blockedTrackSourceRecords = []
  }

  pruneExpiredBlockedTrackSourceRecords()
  return blockedTrackSourceRecords
}

function persistBlockedTrackSourceRecords() {
  if (!canUseStorage() || !blockedTrackSourceRecords) return

  pruneExpiredBlockedTrackSourceRecords()
  try {
    if (!blockedTrackSourceRecords.length) {
      window.localStorage.removeItem(BLOCKED_TRACK_SOURCE_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      BLOCKED_TRACK_SOURCE_STORAGE_KEY,
      JSON.stringify(blockedTrackSourceRecords),
    )
  } catch (error) {
    console.warn('[PlaybackBadSourceBlacklist] Failed to persist records:', error)
  }
}

function pruneExpiredBlockedTrackSourceRecords() {
  if (!blockedTrackSourceRecords) return
  blockedTrackSourceRecords = blockedTrackSourceRecords
    .filter((item) => item.expiresAt > Date.now())
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, BLOCKED_TRACK_SOURCE_MAX_RECORDS)
}

function refreshBlockedTrackSourceRecords() {
  if (!blockedTrackSourceRecords) {
    loadBlockedTrackSourceRecords()
    return
  }

  const beforeLength = blockedTrackSourceRecords.length
  pruneExpiredBlockedTrackSourceRecords()
  if (blockedTrackSourceRecords.length !== beforeLength) {
    persistBlockedTrackSourceRecords()
  }
}

export function rememberBlockedTrackSource(
  track: MusicInfo,
  sourceId: string,
  reason: string,
  ttlMs = DEFAULT_BLOCK_TTL_MS,
) {
  const key = buildBlockedTrackKey(track)
  const records = loadBlockedTrackSourceRecords().filter(
    (item) => !(item.key === key && item.sourceId === sourceId),
  )

  records.unshift({
    key,
    sourceId,
    reason,
    expiresAt: Date.now() + ttlMs,
    updatedAt: Date.now(),
  })

  blockedTrackSourceRecords = records
  persistBlockedTrackSourceRecords()
}

export function getBlockedSourceIdsForTrack(track: MusicInfo): string[] {
  refreshBlockedTrackSourceRecords()
  const key = buildBlockedTrackKey(track)
  return loadBlockedTrackSourceRecords()
    .filter((item) => item.key === key)
    .map((item) => item.sourceId)
}

export function getBlockedTrackSourceRecords(track: MusicInfo): BlockedTrackSourceRecord[] {
  refreshBlockedTrackSourceRecords()
  const key = buildBlockedTrackKey(track)
  return loadBlockedTrackSourceRecords().filter((item) => item.key === key)
}

export function forgetBlockedTrackSource(track: MusicInfo, sourceId?: string) {
  const key = buildBlockedTrackKey(track)
  const nextRecords = loadBlockedTrackSourceRecords().filter((item) => {
    if (item.key !== key) return true
    if (sourceId && item.sourceId !== sourceId) return true
    return false
  })

  blockedTrackSourceRecords = nextRecords
  persistBlockedTrackSourceRecords()
}

export function clearBlockedTrackSourceRecords() {
  blockedTrackSourceRecords = []
  if (canUseStorage()) {
    window.localStorage.removeItem(BLOCKED_TRACK_SOURCE_STORAGE_KEY)
  }
}
