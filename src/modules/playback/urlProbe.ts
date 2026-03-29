import { invoke } from '@tauri-apps/api/core'

const PROBE_SUCCESS_TTL_MS = 10 * 60 * 1000
const PROBE_FAILURE_TTL_MS = 30 * 1000

interface MediaUrlProbeRecord {
  expiresAt: number
  ok: boolean
}

const mediaUrlProbeCache = new Map<string, MediaUrlProbeRecord>()
const pendingMediaUrlProbes = new Map<string, Promise<boolean>>()

function isSafeLocalUrl(url: string): boolean {
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

function isSupportedRemoteUrl(url: string): boolean {
  return url.startsWith('https://') || url.startsWith('http://')
}

function getCachedProbeResult(url: string): boolean | null {
  const record = mediaUrlProbeCache.get(url)
  if (!record) return null

  if (record.expiresAt <= Date.now()) {
    mediaUrlProbeCache.delete(url)
    return null
  }

  return record.ok
}

function setProbeResult(url: string, ok: boolean) {
  mediaUrlProbeCache.set(url, {
    ok,
    expiresAt: Date.now() + (ok ? PROBE_SUCCESS_TTL_MS : PROBE_FAILURE_TTL_MS),
  })
}

export function rememberPlaybackUrlProbeResult(url?: string | null, ok = true) {
  if (!url) return
  const normalized = url.trim()
  if (!normalized || !isSupportedRemoteUrl(normalized)) return
  setProbeResult(normalized, ok)
}

export function hasFreshPlaybackUrlProbeSuccess(url?: string | null): boolean {
  if (!url) return false
  const normalized = url.trim()
  if (!normalized || !isSupportedRemoteUrl(normalized)) return false
  return getCachedProbeResult(normalized) === true
}

export async function canUsePlaybackUrl(url?: string | null): Promise<boolean> {
  if (!url) return false
  const normalized = url.trim()
  if (!normalized) return false

  if (isSafeLocalUrl(normalized)) return true
  if (!isSupportedRemoteUrl(normalized)) return false

  const cached = getCachedProbeResult(normalized)
  if (cached !== null) {
    return cached
  }

  const pending = pendingMediaUrlProbes.get(normalized)
  if (pending) {
    return pending
  }

  const task = (async () => {
    try {
      const ok = await invoke<boolean>('probe_media_url', { url: normalized })
      setProbeResult(normalized, ok)
      return ok
    } catch (error) {
      console.warn('[PlaybackResolver] URL probe failed:', normalized, error)
      setProbeResult(normalized, false)
      return false
    } finally {
      pendingMediaUrlProbes.delete(normalized)
    }
  })()

  pendingMediaUrlProbes.set(normalized, task)
  return task
}
