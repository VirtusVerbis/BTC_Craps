import type { Candle } from '../../data/candles'
import { candleOpenTimeMs } from '../../data/heatmapVenueMidHistory'
import type { VenueMidHistory } from '../../data/heatmapVenueMidHistory'
import { heatmapPriceToTopPercent, type HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { HEATMAP_VENUE_MID_LINE_VENUES } from '../../data/microstructure/depthHeatmapVenueMids'
import type { VenueId } from '../../data/microstructure/types'
import { DEPTH_VENUE_ORDER } from './depthVenueTheme'
import { formatVenueMid, venueMidChartLabelColor } from './depthVenueMidFormat'
import type { HeatmapTimeRange } from './depthHeatmapCandles'

/** Trailing Y-axis prices for venues with kline / mid lines on the session heatmap. */
export const HEATMAP_VENUE_AXIS_LABEL_VENUES: readonly VenueId[] = DEPTH_VENUE_ORDER.filter(
  (v) => v === 'binanceSpot' || HEATMAP_VENUE_MID_LINE_VENUES.includes(v),
)

export type HeatmapVenueAxisLabel = {
  venue: VenueId
  price: number
  topPct: number
  text: string
  color: string
}

export const latestKlineCloseInWindow = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
): number => {
  const pad = Math.max(1000, barMs)
  const endSlack = Math.max(1000, barMs)
  let bestT = -Infinity
  let close = 0
  for (const c of candles) {
    const t = candleOpenTimeMs(c.openTime)
    if (t < timeRange.start - pad || t >= timeRange.end + endSlack) continue
    if (!(c.close > 0)) continue
    if (t >= bestT) {
      bestT = t
      close = c.close
    }
  }
  return close
}

export const resolveHeatmapVenueLatestCloses = (
  venues: readonly VenueId[],
  history: VenueMidHistory | null,
  spotCandles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
): Partial<Record<VenueId, number>> => {
  const out: Partial<Record<VenueId, number>> = {}
  for (const venue of venues) {
    if (venue === 'binanceSpot') {
      const close = latestKlineCloseInWindow(spotCandles, timeRange, barMs)
      if (close > 0) out[venue] = close
      continue
    }
    const close = latestKlineCloseInWindow(history?.[venue] ?? [], timeRange, barMs)
    if (close > 0) out[venue] = close
  }
  return out
}

const inViewPrice = (price: number, axis: HeatmapPriceAxis): boolean =>
  price >= axis.priceMin && price <= axis.priceMax

/** Minimum vertical separation between venue labels as % of axis height. */
export const venueAxisLabelMinGapPct = (chartHeightPx: number, linePx = 14): number => {
  if (!(chartHeightPx > 0)) return 4
  return Math.max(2.25, (linePx / chartHeightPx) * 100)
}

const RESERVED_TICK_BANDS_PCT = [0, 50, 100] as const
const TICK_CLEARANCE_PCT = 3.5

const nudgeFromStaticTicks = (topPct: number, minGap: number): number => {
  let y = topPct
  for (const tick of RESERVED_TICK_BANDS_PCT) {
    if (Math.abs(y - tick) < TICK_CLEARANCE_PCT) {
      y = y < tick ? tick - TICK_CLEARANCE_PCT : tick + TICK_CLEARANCE_PCT
    }
  }
  return Math.min(100, Math.max(0, y))
}

/** Stack / separate labels on the price rail when closes cluster. */
export const layoutHeatmapVenueAxisLabels = (
  labels: readonly HeatmapVenueAxisLabel[],
  chartHeightPx: number,
): HeatmapVenueAxisLabel[] => {
  if (labels.length === 0) return []
  const minGap = venueAxisLabelMinGapPct(chartHeightPx)
  const sorted = labels.map((l) => ({ ...l })).sort((a, b) => a.topPct - b.topPct)
  for (let i = 1; i < sorted.length; i++) {
    const minNext = sorted[i - 1]!.topPct + minGap
    if (sorted[i]!.topPct < minNext) sorted[i]!.topPct = minNext
  }
  const maxPct = 100
  if (sorted[sorted.length - 1]!.topPct > maxPct) {
    const overflow = sorted[sorted.length - 1]!.topPct - maxPct
    for (const row of sorted) row.topPct -= overflow
  }
  if (sorted[0]!.topPct < 0) {
    const under = -sorted[0]!.topPct
    for (const row of sorted) row.topPct += under
  }
  for (const row of sorted) {
    row.topPct = nudgeFromStaticTicks(row.topPct, minGap)
  }
  return sorted
}

export const buildHeatmapVenueAxisLabels = (
  venues: readonly VenueId[],
  history: VenueMidHistory | null,
  spotCandles: readonly Candle[],
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  barMs: number,
  chartHeightPx: number,
): HeatmapVenueAxisLabel[] => {
  const closes = resolveHeatmapVenueLatestCloses(venues, history, spotCandles, timeRange, barMs)
  const raw: HeatmapVenueAxisLabel[] = []
  for (const venue of venues) {
    const price = closes[venue] ?? 0
    if (!inViewPrice(price, axis)) continue
    raw.push({
      venue,
      price,
      topPct: heatmapPriceToTopPercent(price, axis),
      text: formatVenueMid(price),
      color: venueMidChartLabelColor(venue, price),
    })
  }
  return layoutHeatmapVenueAxisLabels(raw, chartHeightPx)
}