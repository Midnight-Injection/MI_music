import { invoke, isTauri } from '@tauri-apps/api/core'

const localPlaybackCache = new Map<string, string>()
const pendingLocalizations = new Map<string, Promise<string>>()

interface CachedMediaBlob {
  mimeType: string
  bytes: number[]
}

function isLocalPlaybackUrl(url: string): boolean {
  return (
    url.startsWith('blob:') ||
    url.startsWith('data:') ||
    url.startsWith('asset:') ||
    url.startsWith('tauri:') ||
    url.startsWith('filesystem:') ||
    url.startsWith('http://asset.localhost/') ||
    url.startsWith('https://asset.localhost/')
  )
}

function isRemoteMediaUrl(url: string): boolean {
  return url.startsWith('https://')
}

export async function localizePlaybackUrl(url?: string | null): Promise<string> {
  const normalized = String(url || '').trim()
  if (!normalized) return ''

  if (!isTauri() || isLocalPlaybackUrl(normalized) || !isRemoteMediaUrl(normalized)) {
    return normalized
  }

  const cached = localPlaybackCache.get(normalized)
  if (cached) return cached

  const existingTask = pendingLocalizations.get(normalized)
  if (existingTask) return existingTask

  const task = (async () => {
    try {
      const payload = await invoke<CachedMediaBlob>('load_cached_media_blob', { url: normalized })
      const blob = new Blob([new Uint8Array(payload.bytes)], {
        type: payload.mimeType || 'audio/mpeg',
      })
      const blobUrl = URL.createObjectURL(blob)
      localPlaybackCache.set(normalized, blobUrl)
      return blobUrl
    } catch (error) {
      console.warn('[Playback] Failed to localize media URL:', normalized, error)
      return normalized
    } finally {
      pendingLocalizations.delete(normalized)
    }
  })()

  pendingLocalizations.set(normalized, task)
  return task
}
