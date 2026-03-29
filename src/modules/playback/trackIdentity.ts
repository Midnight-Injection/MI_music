import type { MusicInfo } from '../../types/music'
import { resolveMusicChannel } from './types'

const TITLE_SUFFIX_PATTERN = /\b(?:live|dj|remix|mix|cover|伴奏|纯音乐|现场版|live版|dj版|remix版)\b/gi

export function normalizeTrackText(value?: string | number | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*]/g, '')
    .replace(TITLE_SUFFIX_PATTERN, '')
    .replace(/[\s\-_/\\|.,!?:;'""`~@#$%^&*+=<>{}[\]()]+/g, '')
    .trim()
}

export function buildTrackIdentityParts(track: MusicInfo) {
  return {
    channel: resolveMusicChannel(track),
    songmid: String(track.songmid || '').trim(),
    hash: String(track.hash || '').trim(),
    copyrightId: String(track.copyrightId || '').trim(),
    albumId: String(track.albumId || '').trim(),
    title: normalizeTrackText(track.name),
    artist: normalizeTrackText(track.artist),
    album: normalizeTrackText(track.album),
    duration: Number.isFinite(track.duration) ? Math.round(track.duration) : 0,
  }
}

export function buildTrackIdentityKey(track: MusicInfo): string {
  const parts = buildTrackIdentityParts(track)

  const idPart = [
    parts.songmid,
    parts.hash,
    parts.copyrightId,
    parts.albumId,
  ].filter(Boolean).join('|')

  if (idPart) {
    return `${parts.channel}:${idPart}`
  }

  return [
    parts.channel,
    parts.title,
    parts.artist,
    parts.album,
    String(parts.duration || 0),
  ].join(':')
}

export function buildTrackSourceCacheKey(track: MusicInfo, targetQuality: string): string {
  return `${buildTrackIdentityKey(track)}:${targetQuality}`
}

export function isDurationClose(left?: number, right?: number, maxDiffSeconds = 6): boolean {
  if (!left || !right) return true
  return Math.abs(left - right) <= maxDiffSeconds
}

export function isSameNormalizedText(left?: string | null, right?: string | null): boolean {
  const normalizedLeft = normalizeTrackText(left)
  const normalizedRight = normalizeTrackText(right)
  if (!normalizedLeft || !normalizedRight) return false
  return normalizedLeft === normalizedRight
}
