import type { MusicSource } from '../../composables/useScriptRuntime'
import type { UserSourceScript } from '../../types/userSource'

export type HealthAction = 'search' | 'musicUrl'

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
}

const SOURCE_FAILURE_COOLDOWN_MS = 3 * 60 * 1000
const sourceHealthRecords = new Map<string, SourceHealthRecord>()

function buildHealthKey(channel: MusicSource, action: HealthAction, sourceId: string) {
  return `${channel}:${action}:${sourceId}`
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
  const key = buildHealthKey(channel, action, sourceId)
  const existing = sourceHealthRecords.get(key)
  if (existing) return existing

  const record: SourceHealthRecord = {
    channel,
    action,
    sourceId,
    successCount: 0,
    failureCount: 0,
  }
  sourceHealthRecords.set(key, record)
  return record
}

export function getSourceHealthRecord(
  channel: MusicSource,
  action: HealthAction,
  sourceId: string,
): SourceHealthRecord | null {
  const key = buildHealthKey(channel, action, sourceId)
  const record = sourceHealthRecords.get(key)
  if (!record) return null

  if (record.cooldownUntil && record.cooldownUntil <= Date.now()) {
    record.cooldownUntil = undefined
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
}

function isCoolingDown(record: SourceHealthRecord | null): boolean {
  return Boolean(record?.cooldownUntil && record.cooldownUntil > Date.now())
}

export function orderSourcesForAction(
  channel: MusicSource,
  action: HealthAction,
  sources: UserSourceScript[],
  preferredSourceId?: string,
): UserSourceScript[] {
  const ordered = [...sources]

  ordered.sort((left, right) => {
    if (preferredSourceId) {
      if (left.id === preferredSourceId) return -1
      if (right.id === preferredSourceId) return 1
    }

    const leftRecord = getSourceHealthRecord(channel, action, left.id)
    const rightRecord = getSourceHealthRecord(channel, action, right.id)
    const leftCoolingDown = isCoolingDown(leftRecord)
    const rightCoolingDown = isCoolingDown(rightRecord)

    if (leftCoolingDown !== rightCoolingDown) return leftCoolingDown ? 1 : -1

    if (left.priority !== right.priority) return left.priority - right.priority

    const leftLastSuccess = leftRecord?.lastSuccessAt || 0
    const rightLastSuccess = rightRecord?.lastSuccessAt || 0
    if (leftLastSuccess !== rightLastSuccess) return rightLastSuccess - leftLastSuccess

    const leftHasRecord = Boolean(leftRecord)
    const rightHasRecord = Boolean(rightRecord)
    if (leftHasRecord !== rightHasRecord) return leftHasRecord ? -1 : 1

    return left.created_at - right.created_at
  })

  return ordered
}

export function getChannelFailureSummary(
  channel: MusicSource,
  action: HealthAction,
  sources: Array<Pick<UserSourceScript, 'id' | 'name'>>,
): string {
  return sources
    .map(source => {
      const record = getSourceHealthRecord(channel, action, source.id)
      if (!record?.lastError) return null
      return `${source.name}: ${record.lastError}`
    })
    .filter(Boolean)
    .join(' | ')
}
