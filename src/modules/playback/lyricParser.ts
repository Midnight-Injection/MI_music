import type { LyricLine } from '../../components/lyrics/types'

export interface ParsedLyricResult {
  lines: LyricLine[]
  offset: number
}

interface ScriptLyricPayload {
  lyric?: string | null
  tlyric?: string | null
  rlyric?: string | null
  lxlyric?: string | null
}

const TIMESTAMP_PATTERN = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?]/g
const OFFSET_PATTERN = /\[offset:([+-]?\d+)]/i

function parseTimestampMs(minutes: string, seconds: string, fraction?: string) {
  const mins = Number(minutes) || 0
  const secs = Number(seconds) || 0
  let millis = 0

  if (fraction) {
    if (fraction.length === 3) millis = Number(fraction)
    else if (fraction.length === 2) millis = Number(fraction) * 10
    else millis = Number(fraction) * 100
  }

  return mins * 60_000 + secs * 1000 + millis
}

function parseOffset(text?: string | null): number {
  if (!text) return 0
  const match = text.match(OFFSET_PATTERN)
  return match ? Number(match[1]) || 0 : 0
}

function parseTaggedLrc(text?: string | null): Array<{ time_ms: number; text: string }> {
  if (!text) return []

  const entries: Array<{ time_ms: number; text: string }> = []

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const tags = [...line.matchAll(TIMESTAMP_PATTERN)]
    if (!tags.length) continue

    const content = line.replace(TIMESTAMP_PATTERN, '').trim()
    for (const [, minutes, seconds, fraction] of tags) {
      entries.push({
        time_ms: parseTimestampMs(minutes, seconds, fraction),
        text: content,
      })
    }
  }

  return entries.sort((left, right) => left.time_ms - right.time_ms)
}

function mergeLyricLines(
  base: Array<{ time_ms: number; text: string }>,
  translations: Array<{ time_ms: number; text: string }>,
  romanizations: Array<{ time_ms: number; text: string }>,
): LyricLine[] {
  const translationMap = new Map<number, string>()
  const romanizationMap = new Map<number, string>()

  translations.forEach((item) => {
    if (item.text) translationMap.set(item.time_ms, item.text)
  })
  romanizations.forEach((item) => {
    if (item.text) romanizationMap.set(item.time_ms, item.text)
  })

  return base.map((item) => ({
    time_ms: item.time_ms,
    text: item.text,
    translation: translationMap.get(item.time_ms),
    romanization: romanizationMap.get(item.time_ms),
  }))
}

function normalizeScriptLyricPayload(payload: unknown): ScriptLyricPayload | null {
  if (typeof payload === 'string') {
    return { lyric: payload }
  }

  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  if (
    typeof record.lyric === 'string' ||
    typeof record.tlyric === 'string' ||
    typeof record.rlyric === 'string' ||
    typeof record.lxlyric === 'string'
  ) {
    return {
      lyric: typeof record.lyric === 'string' ? record.lyric : null,
      tlyric: typeof record.tlyric === 'string' ? record.tlyric : null,
      rlyric: typeof record.rlyric === 'string' ? record.rlyric : null,
      lxlyric: typeof record.lxlyric === 'string' ? record.lxlyric : null,
    }
  }

  if (record.data) return normalizeScriptLyricPayload(record.data)
  if (record.result) return normalizeScriptLyricPayload(record.result)

  return null
}

export function parseScriptLyricResult(payload: unknown): ParsedLyricResult | null {
  const normalized = normalizeScriptLyricPayload(payload)
  if (!normalized) return null

  const offset = parseOffset(normalized.lyric) || parseOffset(normalized.tlyric) || parseOffset(normalized.rlyric)
  const lyricLines = parseTaggedLrc(normalized.lyric)
  const translationLines = parseTaggedLrc(normalized.tlyric)
  const romanizationLines = parseTaggedLrc(normalized.rlyric)

  if (lyricLines.length > 0) {
    return {
      lines: mergeLyricLines(lyricLines, translationLines, romanizationLines),
      offset,
    }
  }

  const plainText = String(normalized.lyric || '').trim()
  if (!plainText) return null

  return {
    lines: [{
      time_ms: 0,
      text: plainText,
      translation: String(normalized.tlyric || '').trim() || undefined,
      romanization: String(normalized.rlyric || '').trim() || undefined,
    }],
    offset,
  }
}
