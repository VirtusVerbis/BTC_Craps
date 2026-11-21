import type { Candle } from '../candles'
import { candleOpenTimeMs } from '../heatmapVenueMidHistory'
import type { HeatmapTimeRange } from '../../ui/depth/depthHeatmapCandles'
import type { HeatmapMidPoint } from './depthHeatmapVenueMids'

export type SpotKlineTip = {
  t: number
  /** Bar high/low mid for the spot mid y-axis tick. */
  mid: number
  close: number
  typical: number
  bullish: boolean
  bar: Candle | null
}

const windowPad = (barMs: number): { pad: number; endSlack: number } => ({
  pad: Math.max(1000, barMs),
  endSlack: Math.max(1000, barMs),
})

const barTimeMs = (c: Candle): number => candleOpenTimeMs(c.openTime)

/** Latest spot bar intersecting the heatmap time window (forming bar eligible). */
export const latestSpotBarInWindow = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
): Candle | null => {
  const { pad, endSlack } = windowPad(barMs)
  let bestT = -Infinity
  let best: Candle | null = null
  for (const c of candles) {
    const t = barTimeMs(c)
    if (t < timeRange.start - pad || t >= timeRange.end + endSlack) continue
    if (!(c.close > 0)) continue
    if (t >= bestT) {
      bestT = t
      best = c
    }
  }
  return best
}

const barsInWindow = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
): Candle[] => {
  const { pad, endSlack } = windowPad(barMs)
  return candles.filter((c) => {
    const t = barTimeMs(c)
    return t >= timeRange.start - pad && t < timeRange.end + endSlack && c.close > 0
  })
}

/** Right-edge spot kline tip for BN-S rail, AVG, and spot mid line. */
export const spotKlineTip = (
  candles: readonly Candle[],
  timeRange: HeatmapTimeRange,
  barMs: number,
  rangeEnd: number,
  liveSpotMid?: number,
): SpotKlineTip | null => {
  const bar = latestSpotBarInWindow(candles, timeRange, barMs)
  if (!bar) return null

  let close = bar.close
  let high = bar.high
  let low = bar.low
  const open = bar.open

  if (liveSpotMid != null && liveSpotMid > 0) {
    close = liveSpotMid
    high = Math.max(high, liveSpotMid)
    low = Math.min(low, liveSpotMid)
  }

  const mid = (high + low) / 2
  const typical = (high + low + close) / 3
  const t = rangeEnd > 0 ? rangeEnd : timeRange.end

  return {
    t,
    mid,
    close,
    typical,
    bullish: close >= open,
    bar,
  }
}

/** Spot close polyline in chart time/price space plus live tip at rangeEnd. */
export const buildSpotKlinePolyline = (
  candles: readonly Candle[],
  barMs: number,
  timeRange: HeatmapTimeRange,
  rangeEnd: number,
  liveSpotMid?: number,
): HeatmapMidPoint[] => {
  const intervalMs = Math.max(1000, barMs)
  const centerOffset = Math.max(500, intervalMs / 2)
  const inWindow = barsInWindow(candles, timeRange, barMs).sort((a, b) => barTimeMs(a) - barTimeMs(b))

  const points: HeatmapMidPoint[] = []
  for (const c of inWindow) {
    points.push({ t: barTimeMs(c) + centerOffset, mid: c.close })
  }

  const tip = spotKlineTip(candles, timeRange, barMs, rangeEnd, liveSpotMid)
  if (!tip) return points.length >= 2 ? points : []

  const endT = tip.t
  if (points.length === 0) {
    return [
      { t: endT - intervalMs, mid: tip.close },
      { t: endT, mid: tip.close },
    ]
  }

  const last = points[points.length - 1]!
  if (endT - last.t < 500) {
    points[points.length - 1] = { t: endT, mid: tip.close }
  } else {
    points.push({ t: endT, mid: tip.close })
  }

  return points.length >= 2 ? points : []
}