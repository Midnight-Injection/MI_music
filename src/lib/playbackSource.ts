import type { MusicSource } from '../composables/useScriptRuntime'
import { resolveMusicChannel, type PlaybackResolution } from '../modules/playback/types'
import { CHANNEL_NAMES } from '../types/settings'
import type { MusicInfo } from '../types/music'

interface SourceOption {
  id: string
  name: string
}

export interface PlaybackSourceDisplayInfo {
  compactLabel: string | null
  primaryLabel: string | null
  channelLabel: string | null
  resolverLabel: string | null
  userSourceLabel: string | null
}

export interface PlaybackSourceDisplayInput {
  currentMusic?: MusicInfo | null
  resolvedChannel?: MusicSource | null
  resolvedResolver?: PlaybackResolution['resolver'] | null
  resolvedUserSourceId?: string | null
  userSources?: SourceOption[]
}

const RESOLVER_NAMES: Record<PlaybackResolution['resolver'], string> = {
  'custom-source': '自定义音源',
  'built-in': '内置兜底',
  'direct-url': '直链',
}

export function getChannelDisplayName(channel?: string | null): string | null {
  if (!channel) return null
  return CHANNEL_NAMES[channel] || channel
}

export function getResolverDisplayName(
  resolver?: PlaybackResolution['resolver'] | null,
): string | null {
  if (!resolver) return null
  return RESOLVER_NAMES[resolver]
}

export function getUserSourceDisplayName(
  userSourceId?: string | null,
  userSources: SourceOption[] = [],
): string | null {
  if (!userSourceId) return null
  return userSources.find((source) => source.id === userSourceId)?.name || '自定义音源'
}

export function getPlaybackSourceDisplayInfo(
  input: PlaybackSourceDisplayInput,
): PlaybackSourceDisplayInfo {
  const {
    currentMusic,
    resolvedChannel,
    resolvedResolver,
    resolvedUserSourceId,
    userSources = [],
  } = input

  if (!currentMusic || !resolvedResolver) {
    return {
      compactLabel: null,
      primaryLabel: null,
      channelLabel: null,
      resolverLabel: null,
      userSourceLabel: null,
    }
  }

  const originalChannel = getChannelDisplayName(resolveMusicChannel(currentMusic))
  const actualChannel = getChannelDisplayName(resolvedChannel)
  const resolverLabel = getResolverDisplayName(resolvedResolver)
  const userSourceLabel = getUserSourceDisplayName(resolvedUserSourceId, userSources)
  const shouldShowChannelSwitch =
    Boolean(originalChannel) && Boolean(actualChannel) && originalChannel !== actualChannel

  const channelLabel = shouldShowChannelSwitch
    ? `${originalChannel} -> ${actualChannel}`
    : actualChannel || originalChannel

  let compactLabel: string | null = null
  let primaryLabel: string | null = null
  let resolvedModeLabel = resolverLabel
  switch (resolvedResolver) {
    case 'custom-source':
      primaryLabel = userSourceLabel || '自定义音源'
      compactLabel = `${primaryLabel} · ${actualChannel || originalChannel}`
      break
    case 'built-in':
      primaryLabel = '内置兜底'
      compactLabel = `${actualChannel || originalChannel} · ${primaryLabel}`
      break
    case 'direct-url':
      primaryLabel = '直链'
      compactLabel = `${actualChannel || originalChannel} · ${primaryLabel}`
      break
  }

  return {
    compactLabel,
    primaryLabel,
    channelLabel,
    resolverLabel: resolvedModeLabel,
    userSourceLabel,
  }
}
