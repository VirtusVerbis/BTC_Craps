import type { Candle } from '../../data/candles'
import { candleOpenTimeMs } from '../../data/heatmapVenueMidHistory'
import type { VenueMidHistory } from '../../data/heatmapVenueMidHistory'
import {
  heatmapAxisMidRangePrice,
  heatmapPriceToTopPercent,
  type HeatmapPriceAxis,
} from '../../data/microstructure/depthHeatmapPriceAxis'
import { spotKlineTip } from '../../data/microstructure/depthHeatmapSpotKline'
import { HEATMAP_VENUE_MID_LINE_VENUES } from '../../data/microstructure/depthHeatmapVenueMids'
import type { VenueId } from '../../data/microstructure/types'
import { DEPTH_VENUE_ORDER } from './depthVenueTheme'
import { formatVenueMid, venueMidChartLabelColor } from './depthVenueMidFormat'
import type { HeatmapTimeRange } from './depthHeatmapCandles'
import { formatSpotAvgLabel } from './depthHeatmapSpotAvg'

/** Trailing Y-axis prices for venues with kline / mid lines on the session heatmap. */
export const HEATMAP_VENUE_AXIS_LABEL_VENUES: readonly VenueId[] = DEPTH_VENUE_ORDER.filter(
  (v) => v === 'binanceSpot' || HEATMAP_VENUE_MID_LINE_VENUES.includes(v),
)

export type HeatmapVenueAxisLabel = {
  venue: VenueId | 'spotAvg'
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
  rangeEnd: number,
  liveSpotMid?: number,
  liveVenueMids?: Partial<Record<VenueId, number>>,
): Partial<Record<VenueId, number>> => {
  const out: Partial<Record<VenueId, number>> = {}
  for (const venue of venues) {
    if (venue === 'binanceSpot') {
      const tip = spotKlineTip(spotCandles, timeRange, barMs, rangeEnd, liveSpotMid)
      if (tip && tip.close > 0) out[venue] = tip.close
      continue
    }
    const live = liveVenueMids?.[venue]
    if (live != null && live > 0) {
      out[venue] = live
      continue
    }
    const close = latestKlineCloseInWindow(history?.[venue] ?? [], timeRange, barMs)
    if (close > 0) out[venue] = close
  }
  return out
}

const inViewPrice = (price: number, axis: HeatmapPriceAxis): boolean =>
  price >= axis.priceMin && price <= axis.priceMax

/** Tunable chip height estimate; see {@link HEATMAP_VENUE_AXIS_LABEL_CHIP_PX}. */
export const HEATMAP_VENUE_AXIS_LABEL_LINE_PX = 16.2

/** Measured chip box (~0.96875rem × 1.15 + pad) for overlap checks. */
export const HEATMAP_VENUE_AXIS_LABEL_CHIP_PX = 19

/** Labels use translateY(-50%); center spacing must clear the full chip. */
const HEATMAP_VENUE_AXIS_LABEL_GAP_SCALE =
  HEATMAP_VENUE_AXIS_LABEL_CHIP_PX / HEATMAP_VENUE_AXIS_LABEL_LINE_PX

/** Minimum vertical separation between venue labels as % of axis height. */
export const venueAxisLabelMinGapPct = (
  chartHeightPx: number,
  linePx = HEATMAP_VENUE_AXIS_LABEL_LINE_PX,
): number => {
  if (!(chartHeightPx > 0)) return 4.05 * HEATMAP_VENUE_AXIS_LABEL_GAP_SCALE
  return Math.max(
    2.7 * HEATMAP_VENUE_AXIS_LABEL_GAP_SCALE,
    ((linePx * HEATMAP_VENUE_AXIS_LABEL_GAP_SCALE) / chartHeightPx) * 100,
  )
}

const TICK_CLEARANCE_PCT = 3.5

const nudgeFromStaticTicks = (topPct: number, reservedBands: readonly number[]): number => {
  let y = topPct
  for (const tick of reservedBands) {
    if (Math.abs(y - tick) < TICK_CLEARANCE_PCT) {
      y = y < tick ? tick - TICK_CLEARANCE_PCT : tick + TICK_CLEARANCE_PCT
    }
  }
  return Math.min(100, Math.max(0, y))
}

/** Fixed mid y-axis tick: price center of the plot band (stays at ~50%). */
export type HeatmapAxisMidRailAnchor = {
  price: number
  topPct: number
}

export const heatmapAxisMidRailAnchor = (axis: HeatmapPriceAxis): HeatmapAxisMidRailAnchor => {
  const price = heatmapAxisMidRangePrice(axis)
  return { price, topPct: heatmapPriceToTopPercent(price, axis) }
}

const AXIS_MID_RESERVED_BANDS = [0, 50, 100] as const

const spreadOverlapsInOrder = (rows: HeatmapVenueAxisLabel[], minGap: number): void => {
  for (let i = 1; i < rows.length; i++) {
    const floor = rows[i - 1]!.topPct + minGap
    if (rows[i]!.topPct < floor) rows[i]!.topPct = floor
  }
}

const clampHalfToViewport = (rows: HeatmapVenueAxisLabel[]): void => {
  if (rows.length === 0) return
  const overflow = rows[rows.length - 1]!.topPct - 100
  if (overflow > 0) {
    for (const row of rows) row.topPct -= overflow
  }
  const under = -rows[0]!.topPct
  if (under > 0) {
    for (const row of rows) row.topPct += under
  }
  for (const row of rows) row.topPct = Math.min(100, Math.max(0, row.topPct))
}

/** Keep price-based Y; nudge overlaps only within each visual half of the mid tick. */
const layoutPriceHalvesAroundAxisMid = (
  labels: HeatmapVenueAxisLabel[],
  axisMid: HeatmapAxisMidRailAnchor,
  minGap: number,
): void => {
  const clearance = Math.max(TICK_CLEARANCE_PCT, minGap * 0.45)
  const midY = axisMid.topPct

  const above = labels
    .filter((l) => l.topPct < midY - clearance)
    .sort((a, b) => a.topPct - b.topPct || String(a.venue).localeCompare(String(b.venue)))
  const below = labels
    .filter((l) => l.topPct > midY + clearance)
    .sort((a, b) => a.topPct - b.topPct || String(a.venue).localeCompare(String(b.venue)))

  spreadOverlapsInOrder(above, minGap)
  spreadOverlapsInOrder(below, minGap)
  clampHalfToViewport(above)
  clampHalfToViewport(below)
}

const separateTopPcts = (topPcts: number[], minGap: number): number[] => {
  if (topPcts.length === 0) return topPcts
  const out = [...topPcts]
  for (let i = 1; i < out.length; i++) {
    const minNext = out[i - 1]! + minGap
    if (out[i]! < minNext) out[i] = minNext
  }
  return out
}

const clampTopPctRun = (topPcts: number[]): number[] => {
  if (topPcts.length === 0) return topPcts
  const out = [...topPcts]
  const overflow = out[out.length - 1]! - 100
  if (overflow > 0) {
    for (let i = 0; i < out.length; i++) out[i]! -= overflow
  }
  if (out[0]! < 0) {
    const under = -out[0]!
    for (let i = 0; i < out.length; i++) out[i]! += under
  }
  return out
}

const applyTopPctLayout = (
  topPcts: number[],
  minGap: number,
  nudgeTicks: boolean,
  reservedBands: readonly number[],
): number[] => {
  let rows = separateTopPcts(topPcts, minGap)
  rows = clampTopPctRun(rows)
  if (nudgeTicks) rows = rows.map((y) => nudgeFromStaticTicks(y, reservedBands))
  rows = separateTopPcts(rows, minGap)
  rows = clampTopPctRun(rows)
  return rows
}

/** Stack / separate labels on the price rail when closes cluster. */
export const layoutHeatmapVenueAxisLabels = (
  labels: readonly HeatmapVenueAxisLabel[],
  chartHeightPx: number,
  axis?: HeatmapPriceAxis,
): HeatmapVenueAxisLabel[] => {
  if (labels.length === 0) return []
  const minGap = venueAxisLabelMinGapPct(chartHeightPx)
  const reserved = AXIS_MID_RESERVED_BANDS
  const axisMid = axis ? heatmapAxisMidRailAnchor(axis) : undefined

  const sorted = labels.map((l) => ({ ...l }))

  if (axisMid && axisMid.price > 0) {
    layoutPriceHalvesAroundAxisMid(sorted, axisMid, minGap)
    for (const row of sorted) {
      row.topPct = nudgeFromStaticTicks(row.topPct, reserved)
    }
    layoutPriceHalvesAroundAxisMid(sorted, axisMid, minGap)
    return [...sorted].sort((a, b) => a.topPct - b.topPct)
  }

  const byTopPct = [...sorted].sort((a, b) => a.topPct - b.topPct)
  const laid = applyTopPctLayout(
    byTopPct.map((r) => r.topPct),
    minGap,
    true,
    reserved,
  )
  for (let i = 0; i < byTopPct.length; i++) byTopPct[i]!.topPct = laid[i]!
  return byTopPct
}

export const buildHeatmapVenueAxisLabels = (
  venues: readonly VenueId[],
  history: VenueMidHistory | null,
  spotCandles: readonly Candle[],
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  barMs: number,
  chartHeightPx: number,
  rangeEnd: number,
  liveSpotMid?: number,
  liveVenueMids?: Partial<Record<VenueId, number>>,
  includeSpotAvg = true,
): HeatmapVenueAxisLabel[] => {
  const tip = spotKlineTip(spotCandles, timeRange, barMs, rangeEnd, liveSpotMid)

  const closes = resolveHeatmapVenueLatestCloses(
    venues,
    history,
    spotCandles,
    timeRange,
    barMs,
    rangeEnd,
    liveSpotMid,
    liveVenueMids,
  )
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

  if (includeSpotAvg) {
    if (tip && tip.typical > 0 && inViewPrice(tip.typical, axis)) {
      raw.push({
        venue: 'spotAvg',
        price: tip.typical,
        topPct: heatmapPriceToTopPercent(tip.typical, axis),
        text: formatSpotAvgLabel(tip.typical),
        color: 'transparent',
      })
    }
  }

  return layoutHeatmapVenueAxisLabels(raw, chartHeightPx, axis)
}