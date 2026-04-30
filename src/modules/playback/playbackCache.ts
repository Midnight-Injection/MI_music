import { convertFileSrc, invoke, isTauri } from '@tauri-apps/api/core'
import type { MusicInfo } from '../../types/music'
import { buildTrackIdentityKey } from './trackIdentity'

export interface PlaybackCacheRecord {
  id: number
  trackKey: string
  audioQuality: string
  remoteUrl?: string | null
  localFilePath?: string | null
  sourceId?: string | null
  channel?: string | null
  resolver?: string | null
  actualQuality?: string | null
  fileSizeBytes: number
  lastVerifiedAt?: string | null
  lastAccessedAt: string
  createdAt: string
  updatedAt: string
}

export interface PlaybackCacheStats {
  cacheDir: string
  totalSizeBytes: number
  fileCount: number
  recordCount: number
}

export interface SavePlaybackCachePayload {
  remoteUrl?: string | null
  localFilePath?: string | null
  sourceId?: string | null
  channel?: string | null
  resolver?: string | null
  actualQuality?: string | null
  fileSizeBytes?: number
  lastVerifiedAt?: string | null
  touchAccessedAt?: boolean
}

function isNativeAudioPlatform() {
  if (!('__TAURI_INTERNALS__' in window)) return false

  try {
    const meta = (window as any).__TAURI_INTERNALS__?.metadata
    return meta?.platform === 'android' || meta?.platform === 'ios'
  } catch {
    return false
  }
}

function toPlayableLocalUrl(localFilePath?: string | null) {
  const normalized = String(localFilePath || '').trim()
  if (!normalized) return ''
  if (!isTauri()) return normalized
  if (isNativeAudioPlatform()) return normalized
  return convertFileSrc(normalized)
}

export function getPlaybackCacheKey(track: MusicInfo) {
  return buildTrackIdentityKey(track)
}

export async function getCachedPlayback(
  track: MusicInfo,
  audioQuality: string,
): Promise<(PlaybackCacheRecord & { playableLocalUrl?: string }) | null> {
  if (!isTauri()) return null

  const record = await invoke<PlaybackCacheRecord | null>('get_cached_playback', {
    trackKey: getPlaybackCacheKey(track),
    audioQuality,
  })

  if (!record) return null

  return {
    ...record,
    playableLocalUrl: toPlayableLocalUrl(record.localFilePath),
  }
}

export async function upsertCachedPlayback(
  track: MusicInfo,
  audioQuality: string,
  payload: SavePlaybackCachePayload,
) {
  if (!isTauri()) return null

  return invoke<PlaybackCacheRecord>('upsert_cached_playback', {
    entry: {
      trackKey: getPlaybackCacheKey(track),
      audioQuality,
      remoteUrl: payload.remoteUrl ?? null,
      localFilePath: payload.localFilePath ?? null,
      sourceId: payload.sourceId ?? null,
      channel: payload.channel ?? null,
      resolver: payload.resolver ?? null,
      actualQuality: payload.actualQuality ?? null,
      fileSizeBytes: payload.fileSizeBytes ?? 0,
      lastVerifiedAt: payload.lastVerifiedAt ?? null,
      touchAccessedAt: payload.touchAccessedAt ?? true,
    },
  })
}

export async function clearCachedPlayback(
  track: MusicInfo,
  audioQuality: string,
  options: { clearRemoteUrl?: boolean; clearLocalFile?: boolean } = {},
) {
  if (!isTauri()) return null

  return invoke<PlaybackCacheRecord | null>('clear_cached_playback', {
    trackKey: getPlaybackCacheKey(track),
    audioQuality,
    clearRemoteUrl: options.clearRemoteUrl ?? false,
    clearLocalFile: options.clearLocalFile ?? false,
  })
}

export async function cachePlaybackMedia(
  track: MusicInfo,
  audioQuality: string,
  url: string,
  payload: Pick<SavePlaybackCachePayload, 'sourceId' | 'channel' | 'resolver' | 'actualQuality'> = {},
) {
  if (!isTauri()) return null

  return invoke<PlaybackCacheRecord>('cache_playback_media', {
    trackKey: getPlaybackCacheKey(track),
    audioQuality,
    url,
    sourceId: payload.sourceId ?? null,
    channel: payload.channel ?? null,
    resolver: payload.resolver ?? null,
    actualQuality: payload.actualQuality ?? null,
  })
}

export async function prunePlaybackCache(capacityMb: number) {
  if (!isTauri()) return null
  return invoke<PlaybackCacheStats>('prune_playback_cache', {
    capacityMb: Math.max(0, Math.round(capacityMb)),
  })
}

export async function getPlaybackCacheStats() {
  if (!isTauri()) return null
  return invoke<PlaybackCacheStats>('get_playback_cache_stats')
}
