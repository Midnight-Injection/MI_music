import { beforeEach, describe, expect, it, vi } from 'vitest'

function createSource(id: string, priority: number, createdAt = priority) {
  return {
    id,
    name: id,
    priority,
    created_at: createdAt,
  }
}

describe('source-health store', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-30T10:00:00+08:00'))
    window.localStorage.clear()
  })

  it('persists health records to localStorage and reloads them', async () => {
    const sourceHealth = await import('../../src/modules/source-health/store')

    sourceHealth.markSourceSuccess('kw', 'musicUrl', 'aggregate-api')
    sourceHealth.markSourceFailure('kw', 'musicUrl', 'fallback-api', 'bad gateway')

    vi.resetModules()
    const reloaded = await import('../../src/modules/source-health/store')
    const snapshot = reloaded.getSourceHealthRecordsSnapshot()

    expect(snapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          channel: 'kw',
          action: 'musicUrl',
          sourceId: 'aggregate-api',
          successCount: 1,
          failureCount: 0,
        }),
        expect.objectContaining({
          channel: 'kw',
          action: 'musicUrl',
          sourceId: 'fallback-api',
          successCount: 0,
          failureCount: 1,
          lastError: 'bad gateway',
        }),
      ])
    )
  })

  it('clears expired cooldowns when records are read', async () => {
    const sourceHealth = await import('../../src/modules/source-health/store')

    sourceHealth.markSourceFailure('kw', 'musicUrl', 'aggregate-api', 'temporary failure', 1000)
    expect(sourceHealth.getSourceHealthRecord('kw', 'musicUrl', 'aggregate-api')?.cooldownUntil).toBeTruthy()

    await vi.advanceTimersByTimeAsync(1001)

    const record = sourceHealth.getSourceHealthRecord('kw', 'musicUrl', 'aggregate-api')
    expect(record?.cooldownUntil).toBeUndefined()
    expect(record?.failureCount).toBe(1)
  })

  it('orders sources by preferred source, priority, then health score', async () => {
    const sourceHealth = await import('../../src/modules/source-health/store')

    sourceHealth.markSourceSuccess('kw', 'musicUrl', 'healthy')
    sourceHealth.markSourceSuccess('kw', 'musicUrl', 'healthy')
    sourceHealth.markSourceFailure('kw', 'musicUrl', 'cooling', 'timeout')

    const ordered = sourceHealth.orderSourcesForAction(
      'kw',
      'musicUrl',
      [
        createSource('cooling', 1),
        createSource('healthy', 1),
        createSource('manual-preferred', 3),
      ] as never,
      'manual-preferred'
    )

    expect(ordered.map((item) => item.id)).toEqual([
      'manual-preferred',
      'healthy',
      'cooling',
    ])
  })

  it('clears persisted health records', async () => {
    const sourceHealth = await import('../../src/modules/source-health/store')

    sourceHealth.markSourceSuccess('kw', 'musicUrl', 'aggregate-api')
    expect(sourceHealth.getSourceHealthRecordsSnapshot()).toHaveLength(1)

    sourceHealth.clearSourceHealthRecords()

    expect(sourceHealth.getSourceHealthRecordsSnapshot()).toHaveLength(0)
    expect(window.localStorage.getItem('playbackSourceHealthRecords')).toBeNull()
  })
})
