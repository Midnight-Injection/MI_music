import type {
  BuiltInSearchChannel,
  MusicInfo,
  SearchResult,
} from '../../types/music'
import {
  compareSearchTracks,
} from './normalize'
import type {
  AggregateChannelProgress,
  AggregateChannelStatus,
  AggregateSearchHandlers,
  SearchExecutionStrategy,
  SearchRequest,
  SearchStrategyContext,
} from './types'

const AGGREGATE_CHANNEL_TIMEOUT_MS = 2500
const AGGREGATE_TOTAL_TIMEOUT_MS = 4500

function normalizeAggregateErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || '未知错误'
  if (typeof error === 'string') return error
  return String(error || '未知错误')
}

function isTimeoutError(error: unknown): boolean {
  const message = normalizeAggregateErrorMessage(error).toLowerCase()
  return message.includes('timeout') || message.includes('超时')
}

function sortAggregateTracks(
  tracksByChannel: Map<BuiltInSearchChannel, MusicInfo[]>,
  channels: BuiltInSearchChannel[],
  keyword: string,
): MusicInfo[] {
  const merged: Array<{ track: MusicInfo; rank: number }> = []

  channels.forEach((channel, channelIndex) => {
    const tracks = tracksByChannel.get(channel) || []
    tracks.forEach((track, trackIndex) => {
      merged.push({
        track,
        rank: channelIndex * 10_000 + trackIndex,
      })
    })
  })

  return merged
    .sort((left, right) => {
      const scoreDelta = compareSearchTracks(left.track, right.track, keyword)
      if (scoreDelta !== 0) return scoreDelta
      return left.rank - right.rank
    })
    .map((item) => item.track)
}

function buildAggregateResult(
  request: SearchRequest,
  channels: BuiltInSearchChannel[],
  tracksByChannel: Map<BuiltInSearchChannel, MusicInfo[]>,
): SearchResult {
  const merged = sortAggregateTracks(tracksByChannel, channels, request.keyword)

  return {
    data: merged,
    total: merged.length,
    channel: 'all',
    page: request.page,
    hasMore: channels.some((channel) => (tracksByChannel.get(channel) || []).length >= request.limit),
  }
}

export function createSingleChannelSearchStrategy(
  context: SearchStrategyContext,
): SearchExecutionStrategy {
  return {
    async execute(request: SearchRequest): Promise<SearchResult> {
      const data = await context.searchBuiltInChannel(
        request.channel as BuiltInSearchChannel,
        request.keyword,
        request.page,
        request.limit,
      )

      return {
        data,
        total: data.length,
        channel: request.channel,
        page: request.page,
        hasMore: data.length >= request.limit,
      }
    },
  }
}

export function createAggregateSearchStrategy(
  context: SearchStrategyContext,
): SearchExecutionStrategy {
  return {
    async execute(request: SearchRequest, handlers?: AggregateSearchHandlers): Promise<SearchResult> {
      const channels = context.getAggregateChannels()
      handlers?.onStart?.(channels)

      if (!channels.length) {
        const emptyResult: SearchResult = {
          data: [],
          total: 0,
          channel: 'all',
          page: request.page,
          hasMore: false,
        }
        handlers?.onComplete?.(emptyResult)
        return emptyResult
      }

      return new Promise<SearchResult>((resolve, reject) => {
        const tracksByChannel = new Map<BuiltInSearchChannel, MusicInfo[]>()
        const failures: Array<{ channel: BuiltInSearchChannel; reason: string }> = []
        const settledChannels = new Set<BuiltInSearchChannel>()
        let isFinished = false

        const settleChannel = (progress: AggregateChannelProgress) => {
          if (isFinished || settledChannels.has(progress.channel)) return
          settledChannels.add(progress.channel)
          handlers?.onChannelSettled?.(progress)
          if (progress.status !== 'success' && progress.error) {
            failures.push({
              channel: progress.channel,
              reason: progress.error,
            })
          }
          if (settledChannels.size === channels.length) {
            finalize()
          }
        }

        const finalize = () => {
          if (isFinished) return
          isFinished = true
          window.clearTimeout(totalTimeoutId)

          const result = buildAggregateResult(request, channels, tracksByChannel)

          if (result.data.length === 0 && failures.length) {
            reject(
              new Error(
                `综合搜索失败，所有渠道均不可用（${failures
                  .map(({ channel, reason }) => `${channel}: ${reason}`)
                  .join('；')}）`,
              ),
            )
            return
          }

          if (failures.length) {
            console.warn('[Search] Aggregate search skipped failed channels:', failures)
          }

          handlers?.onComplete?.(result)
          resolve(result)
        }

        const totalTimeoutId = window.setTimeout(() => {
          channels.forEach((channel) => {
            if (settledChannels.has(channel)) return
            settleChannel({
              channel,
              status: 'timed_out',
              resultCount: 0,
              error: '搜索超时，请稍后重试',
            })
          })
        }, AGGREGATE_TOTAL_TIMEOUT_MS)

        channels.forEach((channel) => {
          void context.searchBuiltInChannel(
            channel,
            request.keyword,
            request.page,
            request.limit,
            AGGREGATE_CHANNEL_TIMEOUT_MS,
          )
            .then((tracks) => {
              if (isFinished || settledChannels.has(channel)) return
              tracksByChannel.set(channel, tracks)
              handlers?.onPartial?.(channel, tracks)
              settleChannel({
                channel,
                status: 'success',
                resultCount: tracks.length,
              })
            })
            .catch((error) => {
              const message = normalizeAggregateErrorMessage(error)
              settleChannel({
                channel,
                status: isTimeoutError(error) ? 'timed_out' : 'failed',
                resultCount: 0,
                error: message,
              })
            })
        })
      })
    },
  }
}
