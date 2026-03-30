import type { MusicInfo } from '../../types/music'
import {
  buildTrackIdentityParts,
  isDurationClose,
} from './trackIdentity'

const ARTIST_SPLIT_PATTERN = /(?:feat\.?|ft\.?|,|&|\/|、|，| x | X | and )/g

function splitNormalizedArtists(value?: string): string[] {
  return String(value || '')
    .split(ARTIST_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean)
}

function isCompatibleArtist(targetArtist?: string, candidateArtist?: string): boolean {
  if (!targetArtist || !candidateArtist) return false
  if (targetArtist === candidateArtist) return true

  const targetArtists = splitNormalizedArtists(targetArtist)
  const candidateArtists = splitNormalizedArtists(candidateArtist)
  if (!targetArtists.length || !candidateArtists.length) return false

  const targetPrimary = targetArtists[0]
  const candidatePrimary = candidateArtists[0]
  if (targetPrimary && candidatePrimary && targetPrimary === candidatePrimary) {
    return true
  }

  return targetArtists.some((artist) => candidateArtists.includes(artist))
}

export function buildTrackSearchKeyword(track: MusicInfo): string {
  return [track.name, track.artist].filter(Boolean).join(' ').trim() || track.name || ''
}

export function pickMatchedTrack(target: MusicInfo, candidates: MusicInfo[]): MusicInfo | null {
  const targetParts = buildTrackIdentityParts(target)
  const targetTitle = targetParts.title
  const targetArtist = targetParts.artist
  const targetAlbum = targetParts.album

  const scoredCandidates = candidates
    .map((candidate) => {
      const candidateParts = buildTrackIdentityParts(candidate)
      if (!candidateParts.title || !candidateParts.artist) return null
      if (!targetTitle || candidateParts.title !== targetTitle) return null
      if (targetArtist && !isCompatibleArtist(targetArtist, candidateParts.artist)) {
        return null
      }
      if (!isDurationClose(target.duration, candidate.duration, 3)) return null
      if (targetAlbum && candidateParts.album && targetAlbum !== candidateParts.album) return null

      let score = 100
      score += 35
      if (targetArtist && candidateParts.artist === targetArtist) score += 25
      if (targetAlbum && candidateParts.album && targetAlbum === candidateParts.album) score += 20
      if (target.duration && candidate.duration) {
        score += 10 - Math.min(10, Math.abs(target.duration - candidate.duration))
      }

      return { candidate, score }
    })
    .filter((item): item is { candidate: MusicInfo; score: number } => Boolean(item))
    .sort((left, right) => right.score - left.score)

  return scoredCandidates[0]?.candidate || null
}
