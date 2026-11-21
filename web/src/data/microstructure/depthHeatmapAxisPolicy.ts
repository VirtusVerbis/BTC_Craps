import type { Candle } from '../candles'
import { candleOpenTimeMs } from '../heatmapVenueMidHistory'
import type { HeatmapTimelineWindowMin } from '../heatmapCandleSeries'
import type { HeatmapTimeRange } from '../../ui/depth/depthHeatmapCandles'
import type { HeatmapGridColumn } from './depthSessionHeatmapGrid'
import type { HeatmapVenueMidPolylines } from './depthHeatmapVenueMids'
import { spotKlineTip } from './depthHeatmapSpotKline'
import { heatmapPriceAxis, type HeatmapPriceAxis } from './depthHeatmapPriceAxis'
import type { HeatmapPriceAxisOpts } from './depthHeatmapPriceAxis'

/** Volatility bps threshold at 30m; scales linearly with window length. */
export const volatilityThresholdBpsForWindow = (windowMin: HeatmapTimelineWindowMin): number =>
  15 * (windowMin / 30)

const columnIntersectsRange = (
  col: HeatmapGridColumn,
  start: number,
  end: number,
): boolean => col.intervalEnd > start && col.intervalStart < end

/** Spot high/low in window; forming bar extended with live spot mid when provided. */
export const inWindowCandleExtent = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  liveSpotMid?: number,
): number[] => {
  const pad = barMs
  const extent: number[] = []
  for (const c of candles) {
    const t = candleOpenTimeMs(c.openTime)
    if (t < timeRange.start - pad || t >= timeRange.end + pad) continue
    if (c.high > 0) extent.push(c.high)
    if (c.low > 0) extent.push(c.low)
  }

  const tip = spotKlineTip(candles, timeRange, barMs, timeRange.end, liveSpotMid)
  if (tip?.bar) {
    let hi = tip.bar.high
    let lo = tip.bar.low
    if (liveSpotMid != null && liveSpotMid > 0) {
      hi = Math.max(hi, liveSpotMid)
      lo = Math.min(lo, liveSpotMid)
    }
    if (hi > 0) extent.push(hi)
    if (lo > 0) extent.push(lo)
  }

  return extent
}

export const inWindowRefMids = (
  columns: readonly HeatmapGridColumn[],
  polylines: HeatmapVenueMidPolylines,
  timeRange: HeatmapTimeRange,
  livePerpMid: number,
): number[] => {
  const { start, end } = timeRange
  const out: number[] = []

  for (const col of columns) {
    if (!columnIntersectsRange(col, start, end)) continue
    if (col.refMid > 0) out.push(col.refMid)
  }

  for (const segments of Object.values(polylines)) {
    for (const seg of segments ?? []) {
      for (const p of seg) {
        if (p.t >= start && p.t <= end && p.mid > 0) out.push(p.mid)
      }
    }
  }

  if (livePerpMid > 0) out.push(livePerpMid)

  return out
}

export const spotWindowRangeBps = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  liveSpotMid?: number,
): number => {
  const extent = inWindowCandleExtent(candles, timeRange, barMs, liveSpotMid)
  if (extent.length === 0) return 0
  let lo = Infinity
  let hi = -Infinity
  for (const p of extent) {
    lo = Math.min(lo, p)
    hi = Math.max(hi, p)
  }
  if (!Number.isFinite(lo) || !(hi > lo)) return 0
  const mid = (lo + hi) / 2
  if (!(mid > 0)) return 0
  return ((hi - lo) / mid) * 10_000
}

/** Calm tape: candle-led axis only; irregular: union with in-window venue mids. */
export const refMidsForAxisPolicy = (
  volatilityBps: number,
  thresholdBps: number,
  fullInWindowRefMids: readonly number[],
): number[] => {
  if (volatilityBps >= thresholdBps) return [...fullInWindowRefMids]
  return []
}

/** Whether calm-window policy omitted venue mids for axis scale. */
export const heatmapAxisCalmWindow = (volatilityBps: number, thresholdBps: number): boolean =>
  volatilityBps < thresholdBps

export const computeHeatmapSessionPriceAxis = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  windowMin: HeatmapTimelineWindowMin,
  columns: readonly HeatmapGridColumn[],
  polylines: HeatmapVenueMidPolylines,
  livePerpMid: number,
  liveSpotMid: number | undefined,
  axisOpts: HeatmapPriceAxisOpts,
): HeatmapPriceAxis => {
  const threshold = volatilityThresholdBpsForWindow(windowMin)
  const candleExtent = inWindowCandleExtent(candles, timeRange, barMs, liveSpotMid)
  const volBps = spotWindowRangeBps(candles, timeRange, barMs, liveSpotMid)
  const fullRefMids = inWindowRefMids(columns, polylines, timeRange, livePerpMid)
  const refMids = refMidsForAxisPolicy(volBps, threshold, fullRefMids)
  return heatmapPriceAxis(candleExtent, refMids, undefined, axisOpts)
}