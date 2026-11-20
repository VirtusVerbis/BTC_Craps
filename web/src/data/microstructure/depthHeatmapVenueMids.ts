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
): HeatmapVenueMidPolylines => {
  const out = {} as HeatmapVenueMidPolylines
  for (const venue of venues) {
    const snap = micro.venues[venue]
    const liveMid = snap?.status === 'connected' && snap.mid > 0 ? snap.mid : 0
    let points = midPointsFromCandleHistory(history[venue] ?? [], barMs)
    points = appendLiveMidTip(points, liveMid, rangeEnd)
    out[venue] = points.length >= 2 ? [points] : []
  }
  return out
}

/** Prefer REST history; fall back to in-session depth samples per venue. */
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
  const fromHistory =
    history != null
      ? buildVenueMidPolylinesFromHistory(history, barMs, micro, rangeStart, rangeEnd, venues)
      : null
  const fromSamples = buildVenueMidPolylines(columns, samplesByVenue, micro, rangeStart, venues)
  const out = {} as HeatmapVenueMidPolylines
  for (const venue of venues) {
    const hist = fromHistory?.[venue] ?? []
    const sample = fromSamples[venue] ?? []
    const histSeg = hist.length > 0 && (hist[0]?.length ?? 0) >= 2 ? hist[0]! : null
    if (histSeg) {
      out[venue] = [histSeg]
    } else {
      out[venue] = sample
    }
  }
  return out
}