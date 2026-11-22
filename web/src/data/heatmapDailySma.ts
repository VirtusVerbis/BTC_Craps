import type { Candle } from './candles'
import type { HeatmapTimeRange } from '../ui/depth/depthHeatmapCandles'
import type { HeatmapPriceAxis } from './microstructure/depthHeatmapPriceAxis'
import type { HeatmapMidPoint } from './microstructure/depthHeatmapVenueMids'

export const HEATMAP_DAILY_SMA_50 = 50
export const HEATMAP_DAILY_SMA_200 = 200
export const HEATMAP_DAILY_BAR_MS = 86_400_000

export const HEATMAP_DAILY_MA_COLOR_50 = 'rgb(255, 152, 0)'
export const HEATMAP_DAILY_MA_COLOR_200 = 'rgb(240, 98, 146)'

export type DailySmaPoint = {
  dayOpenMs: number
  sma50: number
  sma200: number
}

export type DailyMaCrossKind = 'golden' | 'death'

export type DailyMaCross = {
  kind: DailyMaCrossKind
  dayOpenMs: number
}

export type DailyMaPolylines = {
  sma50: HeatmapMidPoint[]
  sma200: HeatmapMidPoint[]
}

const dayOpenMs = (openTime: number): number =>
  Math.floor(openTime / HEATMAP_DAILY_BAR_MS) * HEATMAP_DAILY_BAR_MS

/** Simple moving average of `closes[0..i]`; returns 0 until enough samples. */
export const smaAtIndex = (closes: readonly number[], period: number, i: number): number => {
  if (period <= 0 || i < period - 1) return 0
  let sum = 0
  for (let j = i - period + 1; j <= i; j++) sum += closes[j]!
  return sum / period
}

/**
 * Daily close SMA(50/200). Uses all returned daily bars (Binance includes the forming day).
 * Cross detection compares consecutive settled relationships on the series.
 */
export const buildDailySmaSeries = (dailyCandles: readonly Candle[]): DailySmaPoint[] => {
  const sorted = [...dailyCandles]
    .filter((c) => c.close > 0)
    .sort((a, b) => dayOpenMs(a.openTime) - dayOpenMs(b.openTime))
  if (sorted.length === 0) return []

  const closes = sorted.map((c) => c.close)
  const out: DailySmaPoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const sma50 = smaAtIndex(closes, HEATMAP_DAILY_SMA_50, i)
    const sma200 = smaAtIndex(closes, HEATMAP_DAILY_SMA_200, i)
    out.push({
      dayOpenMs: dayOpenMs(sorted[i]!.openTime),
      sma50,
      sma200,
    })
  }
  return out
}

export const findDailySmaCrosses = (series: readonly DailySmaPoint[]): DailyMaCross[] => {
  const out: DailyMaCross[] = []
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1]!
    const curr = series[i]!
    if (!(prev.sma50 > 0 && prev.sma200 > 0 && curr.sma50 > 0 && curr.sma200 > 0)) continue
    if (prev.sma50 <= prev.sma200 && curr.sma50 > curr.sma200) {
      out.push({ kind: 'golden', dayOpenMs: curr.dayOpenMs })
    } else if (prev.sma50 >= prev.sma200 && curr.sma50 < curr.sma200) {
      out.push({ kind: 'death', dayOpenMs: curr.dayOpenMs })
    }
  }
  return out
}

export const dailyMaCrossIntersectsRange = (cross: DailyMaCross, timeRange: HeatmapTimeRange): boolean => {
  const dayStart = cross.dayOpenMs
  const dayEnd = dayStart + HEATMAP_DAILY_BAR_MS
  return dayStart < timeRange.end && dayEnd > timeRange.start
}

/** Latest golden/death cross whose UTC day overlaps the heatmap x-range. */
export const latestDailyMaCrossInRange = (
  crosses: readonly DailyMaCross[],
  timeRange: HeatmapTimeRange,
): DailyMaCross | null => {
  let best: DailyMaCross | null = null
  for (const c of crosses) {
    if (!dailyMaCrossIntersectsRange(c, timeRange)) continue
    if (!best || c.dayOpenMs > best.dayOpenMs) best = c
  }
  return best
}

const smaForDay = (
  series: readonly DailySmaPoint[],
  dayMs: number,
): { sma50: number; sma200: number } | null => {
  let match: DailySmaPoint | null = null
  for (const p of series) {
    if (p.dayOpenMs === dayMs) match = p
    else if (p.dayOpenMs > dayMs) break
  }
  if (!match) {
    for (let i = series.length - 1; i >= 0; i--) {
      const p = series[i]!
      if (p.dayOpenMs <= dayMs && (p.sma50 > 0 || p.sma200 > 0)) {
        match = p
        break
      }
    }
  }
  if (!match) return null
  return { sma50: match.sma50, sma200: match.sma200 }
}

const appendStepSegment = (
  points: HeatmapMidPoint[],
  t0: number,
  t1: number,
  value: number,
): void => {
  if (!(value > 0) || t1 <= t0) return
  const last = points.length > 0 ? points[points.length - 1]! : null
  if (last && Math.abs(last.mid - value) < 1e-6 && Math.abs(last.t - t1) < 2) return
  if (last && Math.abs(last.mid - value) < 1e-6 && Math.abs(last.t - t0) < 2) {
    points[points.length - 1] = { t: t1, mid: value }
    return
  }
  points.push({ t: t0, mid: value }, { t: t1, mid: value })
}

/** UTC-day stepped SMA polylines clipped to the heatmap window. */
export const buildDailyMaPolylines = (
  series: readonly DailySmaPoint[],
  timeRange: HeatmapTimeRange,
): DailyMaPolylines => {
  const sma50: HeatmapMidPoint[] = []
  const sma200: HeatmapMidPoint[] = []
  if (series.length === 0) return { sma50, sma200 }

  const startDay = dayOpenMs(timeRange.start)
  const endDay = dayOpenMs(timeRange.end)
  for (let d = startDay; d <= endDay; d += HEATMAP_DAILY_BAR_MS) {
    const vals = smaForDay(series, d)
    if (!vals) continue
    const t0 = Math.max(d, timeRange.start)
    const t1 = Math.min(d + HEATMAP_DAILY_BAR_MS, timeRange.end)
    if (t1 <= t0) continue
    appendStepSegment(sma50, t0, t1, vals.sma50)
    appendStepSegment(sma200, t0, t1, vals.sma200)
  }

  return { sma50, sma200 }
}

/** Distinct SMA price levels that fall inside the heatmap x-window. */
export const inWindowDailySmaPrices = (
  polylines: DailyMaPolylines,
  timeRange: HeatmapTimeRange,
): number[] => {
  const { start, end } = timeRange
  const uniq = new Set<number>()
  for (const p of [...polylines.sma50, ...polylines.sma200]) {
    if (p.t >= start && p.t <= end && p.mid > 0) uniq.add(p.mid)
  }
  return [...uniq]
}

/** True when at least one in-window 50D/200D level lies on the current price axis. */
export const dailySmaVisibleOnAxis = (
  polylines: DailyMaPolylines,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
): boolean => {
  const prices = inWindowDailySmaPrices(polylines, timeRange)
  if (prices.length === 0) return false
  return prices.some((p) => p >= axis.priceMin && p <= axis.priceMax)
}

export type DailySmaRailLine = '50' | '200'

export type DailySmaRailSide = 'above' | 'below'

export type DailySmaRailPlacement = {
  line: DailySmaRailLine
  side: DailySmaRailSide
  price: number
}

const latestInWindowMid = (
  points: readonly HeatmapMidPoint[],
  timeRange: HeatmapTimeRange,
): number => {
  const { start, end } = timeRange
  let bestT = -Infinity
  let best = 0
  for (const p of points) {
    if (p.t < start || p.t > end || !(p.mid > 0)) continue
    if (p.t >= bestT) {
      bestT = p.t
      best = p.mid
    }
  }
  return best
}

/** Latest 50D / 200D levels for the visible heatmap x-window. */
export const inWindowDailySmaLevels = (
  polylines: DailyMaPolylines,
  timeRange: HeatmapTimeRange,
): { sma50: number; sma200: number } => ({
  sma50: latestInWindowMid(polylines.sma50, timeRange),
  sma200: latestInWindowMid(polylines.sma200, timeRange),
})

const placementForLevel = (
  line: DailySmaRailLine,
  price: number,
  axis: HeatmapPriceAxis,
): DailySmaRailPlacement | null => {
  if (!(price > 0)) return null
  if (price > axis.priceMax) return { line, side: 'above', price }
  if (price < axis.priceMin) return { line, side: 'below', price }
  return null
}

/** Off-chart placements when SMA levels sit outside the current Y band. */
export const dailySmaRailPlacements = (
  polylines: DailyMaPolylines,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
): DailySmaRailPlacement[] => {
  const levels = inWindowDailySmaLevels(polylines, timeRange)
  const out: DailySmaRailPlacement[] = []
  const p50 = placementForLevel('50', levels.sma50, axis)
  const p200 = placementForLevel('200', levels.sma200, axis)
  if (p50) out.push(p50)
  if (p200) out.push(p200)
  return out
}

/** One-time daily fetch when cache is empty and Y span is wider than a tight depth band. */
export const shouldBootstrapDailySmaFetch = (
  axis: HeatmapPriceAxis,
  hasFullSeries: boolean,
): boolean => {
  if (hasFullSeries) return false
  const mid = (axis.priceMin + axis.priceMax) / 2
  if (!(mid > 0)) return false
  const spanBps = ((axis.priceMax - axis.priceMin) / mid) * 10_000
  return spanBps >= 400
}

export type DailySmaRegime = 'above' | 'below' | 'unknown'

export const dailySmaRegime = (series: readonly DailySmaPoint[]): DailySmaRegime => {
  if (series.length === 0) return 'unknown'
  const last = series[series.length - 1]!
  if (!(last.sma50 > 0 && last.sma200 > 0)) return 'unknown'
  return last.sma50 > last.sma200 ? 'above' : 'below'
}