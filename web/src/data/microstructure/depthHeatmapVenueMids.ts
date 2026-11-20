import type { Candle } from '../candles'
import { candleOpenTimeMs, type VenueMidHistory } from '../heatmapVenueMidHistory'
import { pickSampleInCoarseColumn } from './depthSessionHeatmapGrid'
import type { HeatmapGridColumn } from './depthSessionHeatmapGrid'
import { DEPTH_VENUE_ORDER } from './venueOrder'
import type { DepthSample, MicrostructureState, VenueId } from './types'

/** Spot BTC candle covers BN-S; mid tracks for the other depth venues. */
export const HEATMAP_VENUE_MID_LINE_VENUES: readonly VenueId[] = DEPTH_VENUE_ORDER.filter(
  (v) => v !== 'binanceSpot',
)

export type HeatmapMidPoint = { t: number; mid: number }

/** One continuous polyline segment; gaps in time/samples start a new segment. */
export type HeatmapMidSegment = HeatmapMidPoint[]

export type HeatmapVenueMidPolylines = Record<VenueId, HeatmapMidSegment[]>

const columnTimeCenter = (col: HeatmapGridColumn): number =>
  col.intervalStart + (col.intervalEnd - col.intervalStart) / 2

const midForVenueColumn = (
  venue: VenueId,
  col: HeatmapGridColumn,
  columnIndex: number,
  lastIndex: number,
  samplesByVenue: Record<VenueId, readonly DepthSample[]>,
  micro: MicrostructureState,
  rangeStart: number,
): number => {
  if (columnIndex === lastIndex) {
    const snap = micro.venues[venue]
    if (snap.status === 'connected' && snap.mid > 0) return snap.mid
  }
  const pick = pickSampleInCoarseColumn(
    samplesByVenue[venue] ?? [],
    rangeStart,
    col.intervalStart,
    col.intervalEnd,
  )
  return pick?.mid ?? 0
}

/** Piecewise-linear venue mids aligned to heatmap coarse columns (gap breaks segments). */
export const buildVenueMidPolylines = (
  columns: readonly HeatmapGridColumn[],
  samplesByVenue: Record<VenueId, readonly DepthSample[]>,
  micro: MicrostructureState,
  rangeStart: number,
  venues: readonly VenueId[] = HEATMAP_VENUE_MID_LINE_VENUES,
): HeatmapVenueMidPolylines => {
  const out = {} as HeatmapVenueMidPolylines
  for (const venue of venues) {
    out[venue] = []
  }
  if (columns.length === 0) return out

  const lastIndex = columns.length - 1
  for (const venue of venues) {
    const segments: HeatmapMidSegment[] = []
    let current: HeatmapMidPoint[] = []

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!
      if (col.gap) {
        if (current.length > 0) {
          segments.push(current)
          current = []
        }
        continue
      }
      const mid = midForVenueColumn(venue, col, i, lastIndex, samplesByVenue, micro, rangeStart)
      if (mid > 0) {
        current.push({ t: columnTimeCenter(col), mid })
      } else if (current.length > 0) {
        segments.push(current)
        current = []
      }
    }
    if (current.length > 0) segments.push(current)
    out[venue] = segments
  }
  return out
}

const inferSeriesStepMs = (candles: readonly Candle[], fallbackBarMs: number): number => {
  if (candles.length < 2) return fallbackBarMs
  const dt = candleOpenTimeMs(candles[1]!.openTime) - candleOpenTimeMs(candles[0]!.openTime)
  if (dt > 0 && dt <= 15 * 60_000) return dt
  return fallbackBarMs
}

/** REST series already windowed at fetch; use full series for X placement. */
const midPointsFromCandleHistory = (candles: readonly Candle[], nominalBarMs: number): HeatmapMidPoint[] => {
  const sorted = [...candles]
    .map((c) => ({ ...c, openTime: candleOpenTimeMs(c.openTime) }))
  .filter((c) => c.close > 0 && c.openTime > 0)
    .sort((a, b) => a.openTime - b.openTime)
  if (sorted.length === 0) return []
  const stepMs = inferSeriesStepMs(sorted, nominalBarMs)
  const centerOffset = Math.max(500, stepMs / 2)
  const points: HeatmapMidPoint[] = []
  for (const c of sorted) {
    points.push({ t: c.openTime + centerOffset, mid: c.close })
  }
  return points
}

const appendLiveMidTip = (
  points: HeatmapMidPoint[],
  liveMid: number,
  rangeEnd: number,
): HeatmapMidPoint[] => {
  if (!(liveMid > 0)) return points
  const next = [...points]
  if (next.length === 0) return [{ t: rangeEnd, mid: liveMid }]
  const last = next[next.length - 1]!
  if (rangeEnd - last.t < 500) next[next.length - 1] = { t: rangeEnd, mid: liveMid }
  else next.push({ t: rangeEnd, mid: liveMid })
  return next
}

/** Kline close series for the heatmap window; live mid updates the right edge. */
export const buildVenueMidPolylinesFromHistory = (
  history: VenueMidHistory,
  barMs: number,
  micro: MicrostructureState,
  _rangeStart: number,
  rangeEnd: number,
  venues: readonly VenueId[] = HEATMAP_VENUE_MID_LINE_VENUES,
  appendLiveTip = true,
): HeatmapVenueMidPolylines => {
  const out = {} as HeatmapVenueMidPolylines
  for (const venue of venues) {
    const snap = micro.venues[venue]
    const liveMid = snap?.status === 'connected' && snap.mid > 0 ? snap.mid : 0
    let points = midPointsFromCandleHistory(history[venue] ?? [], barMs)
    if (appendLiveTip) points = appendLiveMidTip(points, liveMid, rangeEnd)
    out[venue] = points.length >= 2 ? [points] : []
  }
  return out
}

const flattenMidSegments = (segments: readonly HeatmapMidSegment[]): HeatmapMidPoint[] => {
  const out: HeatmapMidPoint[] = []
  for (const seg of segments) {
    for (const p of seg) out.push(p)
  }
  return out
}

/**
 * Cached / REST mids before the first live sample column; from there use the
 * streamed column mids (same path as when no history exists).
 */
export const stitchHistoryMidPolylinesToSamples = (
  historyPoints: readonly HeatmapMidPoint[],
  sampleSegments: readonly HeatmapMidSegment[],
  liveMid: number,
  rangeEnd: number,
): HeatmapMidSegment[] => {
  const samplePoints = flattenMidSegments(sampleSegments)
  if (samplePoints.length === 0) {
    const tipped = appendLiveMidTip([...historyPoints], liveMid, rangeEnd)
    return tipped.length >= 2 ? [tipped] : []
  }

  const stitchT = Math.min(...samplePoints.map((p) => p.t))
  const prefix = historyPoints.filter((p) => p.t < stitchT)
  const out: HeatmapMidSegment[] = []
  let prefixPending = [...prefix]

  for (const seg of sampleSegments) {
    const tail = seg.filter((p) => p.t >= stitchT - 1)
    if (tail.length === 0) continue
    if (prefixPending.length > 0) {
      out.push([...prefixPending, ...tail])
      prefixPending = []
    } else {
      out.push([...tail])
    }
  }

  if (prefixPending.length >= 2) out.unshift([...prefixPending])

  return out.filter((s) => s.length >= 2)
}

const venueHasStreamedDepthSamples = (
  samples: readonly DepthSample[] | undefined,
  rangeStart: number,
): boolean => {
  if (!samples || samples.length === 0) return false
  return samples.some((s) => s.mid > 0 && s.at >= rangeStart)
}

/** Cached klines for backfill; streamed depth samples from the first live column onward. */
export const resolveVenueMidPolylines = (
  history: VenueMidHistory | null,
  barMs: number,
  columns: readonly HeatmapGridColumn[],
  samplesByVenue: Record<VenueId, readonly DepthSample[]>,
  micro: MicrostructureState,
  rangeStart: number,
  rangeEnd: number,
  venues: readonly VenueId[] = HEATMAP_VENUE_MID_LINE_VENUES,
): HeatmapVenueMidPolylines => {
  const fromSamples = buildVenueMidPolylines(columns, samplesByVenue, micro, rangeStart, venues)
  const out = {} as HeatmapVenueMidPolylines
  for (const venue of venues) {
    const streamed = venueHasStreamedDepthSamples(samplesByVenue[venue], rangeStart)
    const sampleSegs = streamed ? (fromSamples[venue] ?? []) : []
    const snap = micro.venues[venue]
    const liveMid = snap?.status === 'connected' && snap.mid > 0 ? snap.mid : 0
    const historyPoints =
      history != null ? midPointsFromCandleHistory(history[venue] ?? [], barMs) : []
    out[venue] = stitchHistoryMidPolylinesToSamples(historyPoints, sampleSegs, liveMid, rangeEnd)
    if (out[venue].length === 0 && sampleSegs.length > 0) {
      out[venue] = sampleSegs.filter((s) => s.length >= 2)
    }
    if (out[venue].length === 0 && !streamed) {
      const tail = buildVenueMidPolylines(columns, samplesByVenue, micro, rangeStart, [venue])[venue] ?? []
      out[venue] = tail.filter((s) => s.length >= 2)
    }
  }
  return out
}