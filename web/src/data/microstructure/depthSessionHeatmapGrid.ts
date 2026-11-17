import { DEPTH_BUCKET_MS, snapTimelineNow } from './depthTimelineGrid'
import { mergePriceBuckets, type PriceBucket } from './depthHeatmapPriceBins'
import type { DepthSample, FeedStatus, VenueId } from './types'

/** Full selected window on the X axis (15 / 30 / 60m), aligned to coarse depth columns. */
export const heatmapWindowTimeRange = (
  bucketCount: number,
  timelineEnd: number,
  groupSize: number,
): { start: number; end: number; groupMs: number } => {
  const groupMs = groupSize * DEPTH_BUCKET_MS
  const displayCols = Math.ceil(bucketCount / groupSize)
  const spanMs = displayCols * groupMs
  const rangeEnd = snapTimelineNow(timelineEnd)
  let rangeStart = rangeEnd - spanMs
  rangeStart = Math.floor(rangeStart / groupMs) * groupMs
  return { start: rangeStart, end: rangeEnd, groupMs }
}

export interface HeatmapGridColumn {
  intervalStart: number
  intervalEnd: number
  buckets: PriceBucket[]
  /** Binance perp mid at this column (price line reference). */
  refMid: number
  gap: boolean
}

const pickSampleInCoarseColumn = (
  samples: readonly DepthSample[],
  rangeStart: number,
  intervalStart: number,
  intervalEnd: number,
): DepthSample | null => {
  const sorted = [...samples].filter((s) => s.at >= rangeStart - DEPTH_BUCKET_MS).sort((a, b) => a.at - b.at)
  for (let j = sorted.length - 1; j >= 0; j--) {
    const s = sorted[j]!
    if (s.at >= intervalStart && s.at < intervalEnd) return s
  }
  for (let j = sorted.length - 1; j >= 0; j--) {
    const s = sorted[j]!
    if (s.at < intervalStart && s.at >= rangeStart) return s
  }
  return null
}

/** Coarse time columns with resting USD at absolute BTC prices (venues merged). */
export const buildMergedSessionHeatmap = (
  samplesByVenue: Record<VenueId, readonly DepthSample[]>,
  statuses: Record<VenueId, FeedStatus>,
  venues: readonly VenueId[],
  bucketCount: number,
  timelineEnd: number,
  groupSize: number,
): HeatmapGridColumn[] => {
  const { start: rangeStart, groupMs } = heatmapWindowTimeRange(bucketCount, timelineEnd, groupSize)
  const displayCols = Math.ceil(bucketCount / groupSize)

  const out: HeatmapGridColumn[] = []
  for (let c = 0; c < displayCols; c++) {
    const intervalStart = rangeStart + c * groupMs
    const intervalEnd = intervalStart + groupMs
    const venueBuckets: PriceBucket[][] = []
    let anyConnected = false
    for (const venue of venues) {
      if (statuses[venue] === 'connected') anyConnected = true
      const pick = pickSampleInCoarseColumn(samplesByVenue[venue] ?? [], rangeStart, intervalStart, intervalEnd)
      if (pick?.priceBuckets?.length) venueBuckets.push(pick.priceBuckets)
    }
    const bnPick = pickSampleInCoarseColumn(samplesByVenue.binancePerp ?? [], rangeStart, intervalStart, intervalEnd)
    const refMid = bnPick?.mid ?? 0

    if (venueBuckets.length > 0) {
      out.push({
        intervalStart,
        intervalEnd,
        buckets: mergePriceBuckets(venueBuckets),
        refMid,
        gap: false,
      })
    } else {
      out.push({
        intervalStart,
        intervalEnd,
        buckets: [],
        refMid,
        gap: !anyConnected,
      })
    }
  }
  return out
}

export const heatmapGridMax = (columns: readonly HeatmapGridColumn[]): number => {
  let max = 1
  for (const col of columns) {
    for (const b of col.buckets) max = Math.max(max, b.usd)
  }
  return max
}