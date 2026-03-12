import { invoke } from '@tauri-apps/api/core'

const mediaUrlProbeCache = new Map<string, boolean>()

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
  return url.startsWith('https://')
}

export async function canUsePlaybackUrl(url?: string | null): Promise<boolean> {
  if (!url) return false
  const normalized = url.trim()
  if (!normalized) return false

  if (isSafeLocalUrl(normalized)) return true
  if (!isSupportedRemoteUrl(normalized)) return false

  if (mediaUrlProbeCache.has(normalized)) {
    return mediaUrlProbeCache.get(normalized) || false
  }

  try {
    const ok = await invoke<boolean>('probe_media_url', { url: normalized })
    mediaUrlProbeCache.set(normalized, ok)
    return ok
  } catch (error) {
    console.warn('[PlaybackResolver] URL probe failed:', normalized, error)
    mediaUrlProbeCache.set(normalized, false)
    return false
  }
}
