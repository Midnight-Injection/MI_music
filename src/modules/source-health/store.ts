import type { MusicSource } from '../../composables/useScriptRuntime'
import type { UserSourceScript } from '../../types/userSource'

export type HealthAction = 'search' | 'musicUrl' | 'lyric'

export interface SourceHealthRecord {
  channel: MusicSource
  action: HealthAction
  sourceId: string
  successCount: number
  failureCount: number
  lastSuccessAt?: number
  lastFailureAt?: number
  lastError?: string
  cooldownUntil?: number
  updatedAt?: number
}

const SOURCE_FAILURE_COOLDOWN_MS = 3 * 60 * 1000
const SOURCE_HEALTH_STORAGE_KEY = 'playbackSourceHealthRecords'
const SOURCE_HEALTH_MAX_RECORDS = 400
const SOURCE_HEALTH_STALE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const sourceHealthRecords = new Map<string, SourceHealthRecord>()
let sourceHealthLoaded = false

function buildHealthKey(channel: MusicSource, action: HealthAction, sourceId: string) {
  return `${channel}:${action}:${sourceId}`
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function isValidHealthRecord(value: unknown): value is SourceHealthRecord {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.channel === 'string'
    && typeof candidate.action === 'string'
    && typeof candidate.sourceId === 'string'
    && typeof candidate.successCount === 'number'
    && typeof candidate.failureCount === 'number'
  )
}

function normalizeLoadedRecord(record: SourceHealthRecord): SourceHealthRecord | null {
  const updatedAt = record.updatedAt || record.lastSuccessAt || record.lastFailureAt || Date.now()
  if (updatedAt + SOURCE_HEALTH_STALE_TTL_MS <= Date.now()) return null

  return {
    ...record,
    updatedAt,
    cooldownUntil:
      record.cooldownUntil && record.cooldownUntil > Date.now()
        ? record.cooldownUntil
        : undefined,
  }
}

function ensureLoaded() {
  if (sourceHealthLoaded) return
  sourceHealthLoaded = true
  if (!canUseStorage()) return

  try {
    const raw = window.localStorage.getItem(SOURCE_HEALTH_STORAGE_KEY)
    if (!raw) return

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return

    for (const item of parsed) {
      if (!isValidHealthRecord(item)) continue
      const normalized = normalizeLoadedRecord(item)
      if (!normalized) continue
      sourceHealthRecords.set(
        buildHealthKey(normalized.channel, normalized.action, normalized.sourceId),
        normalized,
      )
    }
  } catch (error) {
    console.warn('[SourceHealth] Failed to load records:', error)
  }
}

function persistRecords() {
  if (!canUseStorage()) return

  try {
    const records = [...sourceHealthRecords.values()]
      .filter((record) => (record.updatedAt || 0) + SOURCE_HEALTH_STALE_TTL_MS > Date.now())
      .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
      .slice(0, SOURCE_HEALTH_MAX_RECORDS)

    sourceHealthRecords.clear()
    for (const record of records) {
      sourceHealthRecords.set(buildHealthKey(record.channel, record.action, record.sourceId), record)
    }

    if (!records.length) {
      window.localStorage.removeItem(SOURCE_HEALTH_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(SOURCE_HEALTH_STORAGE_KEY, JSON.stringify(records))
  } catch (error) {
    console.warn('[SourceHealth] Failed to persist records:', error)
  }
}

function touchRecord(record: SourceHealthRecord) {
  record.updatedAt = Date.now()
}

export function normalizeSourceErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || '未知错误'
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error || '未知错误')
}

function getOrCreateRecord(
  channel: MusicSource,
  action: HealthAction,
  sourceId: string,
): SourceHealthRecord {
  ensureLoaded()
  const key = buildHealthKey(channel, action, sourceId)
  const existing = sourceHealthRecords.get(key)
  if (existing) return existing

  const record: SourceHealthRecord = {
    channel,
    action,
    sourceId,
    successCount: 0,
    failureCount: 0,
    updatedAt: Date.now(),
  }
  sourceHealthRecords.set(key, record)
  return record
}

export function getSourceHealthRecord(
  channel: MusicSource,
  action: HealthAction,
  sourceId: string,
): SourceHealthRecord | null {
  ensureLoaded()
  const key = buildHealthKey(channel, action, sourceId)
  const record = sourceHealthRecords.get(key)
  if (!record) return null

  if (record.cooldownUntil && record.cooldownUntil <= Date.now()) {
    record.cooldownUntil = undefined
    touchRecord(record)
    persistRecords()
  }

  return record
}

export function markSourceSuccess(
  channel: MusicSource,
  action: HealthAction,
  sourceId: string,
) {
  const record = getOrCreateRecord(channel, action, sourceId)
  record.successCount += 1
  record.lastSuccessAt = Date.now()
  record.lastError = undefined
  record.cooldownUntil = undefined
  touchRecord(record)
  persistRecords()
}

export function markSourceFailure(
  channel: MusicSource,
  action: HealthAction,
  sourceId: string,
  error: unknown,
  cooldownMs = SOURCE_FAILURE_COOLDOWN_MS,
) {
  const record = getOrCreateRecord(channel, action, sourceId)
  record.failureCount += 1
  record.lastFailureAt = Date.now()
  record.lastError = normalizeSourceErrorMessage(error)
  record.cooldownUntil = Date.now() + cooldownMs
  touchRecord(record)
  persistRecords()
}

function compareHealthPriority(
  channel: MusicSource,
  action: HealthAction,
  left: UserSourceScript,
  right: UserSourceScript,
) {
  const leftRecord = getSourceHealthRecord(channel, action, left.id)
  const rightRecord = getSourceHealthRecord(channel, action, right.id)
  const leftCoolingDown = Boolean(leftRecord?.cooldownUntil && leftRecord.cooldownUntil > Date.now())
  const rightCoolingDown = Boolean(rightRecord?.cooldownUntil && rightRecord.cooldownUntil > Date.now())

  if (leftCoolingDown !== rightCoolingDown) {
    return leftCoolingDown ? 1 : -1
  }

  const leftScore = (leftRecord?.successCount || 0) - (leftRecord?.failureCount || 0)
  const rightScore = (rightRecord?.successCount || 0) - (rightRecord?.failureCount || 0)
  if (leftScore !== rightScore) {
    return rightScore - leftScore
  }

  const leftSuccessAt = leftRecord?.lastSuccessAt || 0
  const rightSuccessAt = rightRecord?.lastSuccessAt || 0
  if (leftSuccessAt !== rightSuccessAt) {
    return rightSuccessAt - leftSuccessAt
  }

  const leftFailureAt = leftRecord?.lastFailureAt || 0
  const rightFailureAt = rightRecord?.lastFailureAt || 0
  if (leftFailureAt !== rightFailureAt) {
    return leftFailureAt - rightFailureAt
  }

  return 0
}

export function orderSourcesForAction(
  channel: MusicSource,
  action: HealthAction,
  sources: UserSourceScript[],
  preferredSourceId?: string,
): UserSourceScript[] {
  ensureLoaded()
  const ordered = [...sources]

  ordered.sort((left, right) => {
    if (preferredSourceId) {
      if (left.id === preferredSourceId) return -1
      if (right.id === preferredSourceId) return 1
    }

    if (left.priority !== right.priority) return left.priority - right.priority

    const healthCompare = compareHealthPriority(channel, action, left, right)
    if (healthCompare !== 0) return healthCompare

    return left.created_at - right.created_at
  })

  return ordered
}

export function getChannelFailureSummary(
  channel: MusicSource,
  action: HealthAction,
  sources: Array<Pick<UserSourceScript, 'id' | 'name'>>,
): string {
  ensureLoaded()
  return sources
    .map(source => {
      const record = getSourceHealthRecord(channel, action, source.id)
      if (!record?.lastError) return null
      return `${source.name}: ${record.lastError}`
    })
    .filter(Boolean)
    .join(' | ')
}

export function getSourceHealthRecordsSnapshot(): SourceHealthRecord[] {
  ensureLoaded()
  return [...sourceHealthRecords.values()]
    .map((record) => ({
      ...record,
      cooldownUntil:
        record.cooldownUntil && record.cooldownUntil > Date.now()
          ? record.cooldownUntil
          : undefined,
    }))
    .sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
}

export function clearSourceHealthRecords() {
  ensureLoaded()
  sourceHealthRecords.clear()
  if (canUseStorage()) {
    window.localStorage.removeItem(SOURCE_HEALTH_STORAGE_KEY)
  }
}
