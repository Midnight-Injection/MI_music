import type { MusicInfo } from '../../types/music'

const MIN_EXPECTED_DURATION_FOR_VALIDATION_SECONDS = 60
const STRONGLY_SUSPICIOUS_SHORT_DURATION_SECONDS = 30
const UNKNOWN_DURATION_SUSPICIOUS_SECONDS = 20
const MIN_DURATION_MISMATCH_SECONDS = 45
const MAX_ACCEPTABLE_DURATION_RATIO = 0.55
const SHORT_FORM_KEYWORDS = /(片段|铃声|铃音|试听|预告|demo|sample|伴奏|闹铃|提示音)/i

function looksLikeShortFormTrack(track: MusicInfo): boolean {
  const combinedText = [track.name, track.album].filter(Boolean).join(' ')
  return SHORT_FORM_KEYWORDS.test(combinedText)
}

export function isPlaybackDurationSuspicious(
  expectedDuration?: number,
  actualDuration?: number,
  allowUnknownDurationShortClip = false
): boolean {
  if (!Number.isFinite(actualDuration) || !actualDuration) {
    return false
  }

  const actual = Math.round(actualDuration)
  if (
    (!Number.isFinite(expectedDuration) || !expectedDuration || expectedDuration <= 0) &&
    allowUnknownDurationShortClip
  ) {
    return actual <= UNKNOWN_DURATION_SUSPICIOUS_SECONDS
  }

  if (!Number.isFinite(expectedDuration) || !expectedDuration) {
    return false
  }

  const expected = Math.round(expectedDuration)

  if (expected < MIN_EXPECTED_DURATION_FOR_VALIDATION_SECONDS) {
    return false
  }

  const durationDiff = Math.abs(expected - actual)
  const durationRatio = actual / expected
  const isSuspiciousShortClip =
    expected >= 90 && actual <= STRONGLY_SUSPICIOUS_SHORT_DURATION_SECONDS
  const isSevereDurationMismatch =
    durationRatio < MAX_ACCEPTABLE_DURATION_RATIO &&
    durationDiff >= MIN_DURATION_MISMATCH_SECONDS

  return isSuspiciousShortClip || isSevereDurationMismatch
}

export function buildSuspiciousPlaybackMessage(
  track: MusicInfo,
  actualDuration?: number
): string | null {
  const allowUnknownDurationShortClip = !looksLikeShortFormTrack(track)

  if (!isPlaybackDurationSuspicious(track.duration, actualDuration, allowUnknownDurationShortClip)) {
    return null
  }

  const actual = Math.round(actualDuration || 0)
  if (!track.duration || track.duration <= 0) {
    return `音源返回疑似错误短音频（实际 ${actual}s）`
  }

  const expected = Math.round(track.duration)
  return `音源返回疑似错误音频（实际 ${actual}s，预期 ${expected}s）`
}
