import type { Candle } from '../candles'
import { candleOpenTimeMs } from '../heatmapVenueMidHistory'
import { heatmapWindowUses1mKlines, type HeatmapTimelineWindowMin } from '../heatmapCandleSeries'
import type { HeatmapTimeRange } from '../../ui/depth/depthHeatmapCandles'
import type { HeatmapGridColumn } from './depthSessionHeatmapGrid'
import type { HeatmapVenueMidPolylines } from './depthHeatmapVenueMids'
import { spotKlineTip } from './depthHeatmapSpotKline'
import { heatmapPriceAxis, type HeatmapPriceAxis } from './depthHeatmapPriceAxis'
import type { HeatmapPriceAxisOpts } from './depthHeatmapPriceAxis'

/** Volatility bps threshold at 30m; scales linearly with window length. */
export const volatilityThresholdBpsForWindow = (windowMin: HeatmapTimelineWindowMin): number =>
  windowMin === 1440 ? 60 : 15 * (windowMin / 30)

const columnIntersectsRange = (
  col: HeatmapGridColumn,
  start: number,
  end: number,
): boolean => col.intervalEnd > start && col.intervalStart < end

/** True when the candle bucket has closed at `timelineNow`. */
export const candleBarFinalizedAt = (
  openTime: number,
  barMs: number,
  timelineNow: number,
): boolean => candleOpenTimeMs(openTime) + barMs <= timelineNow

/** Spot high/low for Y-axis: finalized bars; 1m+ windows also include the forming bar OHLC (matches drawn candles). */
export const inWindowCandleExtentForAxis = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  timelineNow: number,
): number[] => {
  const pad = barMs
  const extent: number[] = []
  const includeFormingBar = barMs >= 60_000
  let latestForming: Candle | null = null
  let latestFormingT = -Infinity

  for (const c of candles) {
    const t = candleOpenTimeMs(c.openTime)
    if (t < timeRange.start - pad || t >= timeRange.end + pad) continue
    if (candleBarFinalizedAt(c.openTime, barMs, timelineNow)) {
      if (c.high > 0) extent.push(c.high)
      if (c.low > 0) extent.push(c.low)
      continue
    }
    if (includeFormingBar && t >= latestFormingT) {
      latestFormingT = t
      latestForming = c
    }
  }

  if (latestForming) {
    if (latestForming.high > 0) extent.push(latestForming.high)
    if (latestForming.low > 0) extent.push(latestForming.low)
  }

  return extent
}

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

/** In-window venue mids for axis scale (excludes live perp tick). */
export const inWindowRefMidsForAxis = (
  columns: readonly HeatmapGridColumn[],
  polylines: HeatmapVenueMidPolylines,
  timeRange: HeatmapTimeRange,
): number[] => inWindowRefMids(columns, polylines, timeRange, 0)

export const spotWindowRangeBpsForAxis = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  timelineNow: number,
): number => {
  const extent = inWindowCandleExtentForAxis(candles, timeRange, barMs, timelineNow)
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

export const HEATMAP_AXIS_SHRINK_HOLD_MS = 4000
export const HEATMAP_AXIS_WIDEN_HOLD_MS = 1000

export type HeatmapAxisStabilizeState = {
  tighterSince: number | null
  pendingMin: number | null
  pendingMax: number | null
  widerSince: number | null
  pendingWiderMin: number | null
  pendingWiderMax: number | null
}

const emptyHeatmapAxisStabilizeState = (): HeatmapAxisStabilizeState => ({
  tighterSince: null,
  pendingMin: null,
  pendingMax: null,
  widerSince: null,
  pendingWiderMin: null,
  pendingWiderMax: null,
})

const axisWidens = (prev: HeatmapPriceAxis, next: HeatmapPriceAxis): boolean =>
  next.priceMin < prev.priceMin - 1e-6 || next.priceMax > prev.priceMax + 1e-6

const axisNarrows = (prev: HeatmapPriceAxis, next: HeatmapPriceAxis): boolean =>
  next.priceMin > prev.priceMin + 1e-6 && next.priceMax < prev.priceMax - 1e-6

/** Hold widen/shrink briefly so unsettled inputs do not jerk the price rail. */
export const stabilizeHeatmapPriceAxis = (
  prev: HeatmapPriceAxis,
  next: HeatmapPriceAxis,
  nowMs: number,
  state: HeatmapAxisStabilizeState,
): { axis: HeatmapPriceAxis; state: HeatmapAxisStabilizeState } => {
  if (axisWidens(prev, next)) {
    const samePending =
      state.pendingWiderMin === next.priceMin && state.pendingWiderMax === next.priceMax
    const since = samePending && state.widerSince != null ? state.widerSince : nowMs
    if (samePending && nowMs - since >= HEATMAP_AXIS_WIDEN_HOLD_MS) {
      return { axis: next, state: emptyHeatmapAxisStabilizeState() }
    }
    return {
      axis: prev,
      state: {
        tighterSince: null,
        pendingMin: null,
        pendingMax: null,
        widerSince: since,
        pendingWiderMin: next.priceMin,
        pendingWiderMax: next.priceMax,
      },
    }
  }
  if (axisNarrows(prev, next)) {
    const samePending =
      state.pendingMin === next.priceMin && state.pendingMax === next.priceMax
    const since = samePending && state.tighterSince != null ? state.tighterSince : nowMs
    if (samePending && since != null && nowMs - since >= HEATMAP_AXIS_SHRINK_HOLD_MS) {
      return { axis: next, state: emptyHeatmapAxisStabilizeState() }
    }
    return {
      axis: prev,
      state: {
        tighterSince: since,
        pendingMin: next.priceMin,
        pendingMax: next.priceMax,
        widerSince: null,
        pendingWiderMin: null,
        pendingWiderMax: null,
      },
    }
  }
  return { axis: next, state: emptyHeatmapAxisStabilizeState() }
}

export const computeHeatmapSessionPriceAxis = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  windowMin: HeatmapTimelineWindowMin,
  columns: readonly HeatmapGridColumn[],
  polylines: HeatmapVenueMidPolylines,
  axisOpts: HeatmapPriceAxisOpts,
  timelineNow = timeRange.end,
): HeatmapPriceAxis => {
  const threshold = volatilityThresholdBpsForWindow(windowMin)
  const candleExtent = inWindowCandleExtentForAxis(candles, timeRange, barMs, timelineNow)
  const volBps = spotWindowRangeBpsForAxis(candles, timeRange, barMs, timelineNow)
  const fullRefMids = inWindowRefMidsForAxis(columns, polylines, timeRange)
  const refMids =
    heatmapWindowUses1mKlines(windowMin) ? [...fullRefMids] : refMidsForAxisPolicy(volBps, threshold, fullRefMids)
  return heatmapPriceAxis(candleExtent, refMids, undefined, axisOpts)
}