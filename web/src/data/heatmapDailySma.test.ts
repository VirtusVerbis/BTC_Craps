import { describe, expect, it } from 'vitest'
import type { Candle } from './candles'
import {
  buildDailyMaPolylines,
  buildDailySmaSeries,
  findDailySmaCrosses,
  latestDailyMaCrossInRange,
  dailySmaRailPlacements,
  dailySmaVisibleOnAxis,
  shouldBootstrapDailySmaFetch,
  smaAtIndex,
  HEATMAP_DAILY_BAR_MS,
} from './heatmapDailySma'
import type { HeatmapPriceAxis } from './microstructure/depthHeatmapPriceAxis'

const day = (i: number, close: number): Candle => ({
  openTime: i * HEATMAP_DAILY_BAR_MS,
  open: close,
  high: close,
  low: close,
  close,
})

describe('smaAtIndex', () => {
  it('averages the last N closes', () => {
    const closes = [10, 20, 30, 40]
    expect(smaAtIndex(closes, 2, 1)).toBe(15)
    expect(smaAtIndex(closes, 3, 2)).toBe(20)
    expect(smaAtIndex(closes, 3, 0)).toBe(0)
  })
})

describe('daily SMA crosses', () => {
  it('detects golden and death crosses', () => {
    const series = [
      { dayOpenMs: 0, sma50: 90, sma200: 100 },
      { dayOpenMs: HEATMAP_DAILY_BAR_MS, sma50: 110, sma200: 100 },
      { dayOpenMs: 2 * HEATMAP_DAILY_BAR_MS, sma50: 95, sma200: 100 },
    ]
    const crosses = findDailySmaCrosses(series)
    expect(crosses).toEqual([
      { kind: 'golden', dayOpenMs: HEATMAP_DAILY_BAR_MS },
      { kind: 'death', dayOpenMs: 2 * HEATMAP_DAILY_BAR_MS },
    ])
  })

  it('shows latest in-range cross only while day overlaps window', () => {
    const crosses = [
      { kind: 'golden' as const, dayOpenMs: 5 * HEATMAP_DAILY_BAR_MS },
      { kind: 'death' as const, dayOpenMs: 10 * HEATMAP_DAILY_BAR_MS },
    ]
    const inside = latestDailyMaCrossInRange(crosses, {
      start: 10 * HEATMAP_DAILY_BAR_MS + 1000,
      end: 10 * HEATMAP_DAILY_BAR_MS + HEATMAP_DAILY_BAR_MS - 1000,
    })
    expect(inside?.kind).toBe('death')
    const outside = latestDailyMaCrossInRange(crosses, {
      start: 20 * HEATMAP_DAILY_BAR_MS,
      end: 21 * HEATMAP_DAILY_BAR_MS,
    })
    expect(outside).toBeNull()
  })
})

describe('dailySmaVisibleOnAxis', () => {
  const axis: HeatmapPriceAxis = { priceMin: 60_000, priceMax: 60_500, tick: 6, rows: 84 }

  it('is false when SMA levels sit outside the price band', () => {
    const polylines = {
      sma50: [
        { t: 0, mid: 72_000 },
        { t: 1000, mid: 72_000 },
      ],
      sma200: [
        { t: 0, mid: 70_000 },
        { t: 1000, mid: 70_000 },
      ],
    }
    const timeRange = { start: 0, end: 2000 }
    expect(dailySmaVisibleOnAxis(polylines, axis, timeRange)).toBe(false)
  })

  it('is true when an in-window level is inside axis bounds', () => {
    const polylines = {
      sma50: [
        { t: 0, mid: 60_200 },
        { t: 1000, mid: 60_200 },
      ],
      sma200: [],
    }
    expect(dailySmaVisibleOnAxis(polylines, axis, { start: 0, end: 2000 })).toBe(true)
  })
})

describe('dailySmaRailPlacements', () => {
  const axis: HeatmapPriceAxis = { priceMin: 60_000, priceMax: 60_500, tick: 6, rows: 84 }
  const timeRange = { start: 0, end: 2000 }

  it('returns above placements when both SMAs are above the band', () => {
    const polylines = {
      sma50: [{ t: 100, mid: 72_000 }],
      sma200: [{ t: 100, mid: 70_000 }],
    }
    const rails = dailySmaRailPlacements(polylines, axis, timeRange)
    expect(rails).toHaveLength(2)
    expect(rails.every((r) => r.side === 'above')).toBe(true)
  })

  it('returns empty when levels are inside the band', () => {
    const polylines = {
      sma50: [{ t: 100, mid: 60_200 }],
      sma200: [{ t: 100, mid: 60_100 }],
    }
    expect(dailySmaRailPlacements(polylines, axis, timeRange)).toHaveLength(0)
  })
})

describe('shouldBootstrapDailySmaFetch', () => {
  it('skips when series already loaded', () => {
    const axis: HeatmapPriceAxis = { priceMin: 50_000, priceMax: 70_000, tick: 6, rows: 40 }
    expect(shouldBootstrapDailySmaFetch(axis, true)).toBe(false)
  })
})

describe('buildDailyMaPolylines', () => {
  it('builds flat segments within a single UTC day', () => {
    const candles: Candle[] = []
    for (let i = 0; i < 220; i++) candles.push(day(i, 50_000 + i))
    const series = buildDailySmaSeries(candles)
    const t0 = 215 * HEATMAP_DAILY_BAR_MS + 3_600_000
    const t1 = t0 + 30 * 60_000
    const { sma50, sma200 } = buildDailyMaPolylines(series, { start: t0, end: t1 })
    expect(sma50.length).toBeGreaterThanOrEqual(2)
    expect(sma50.every((p) => p.mid === sma50[0]!.mid)).toBe(true)
    expect(sma200.length).toBeGreaterThanOrEqual(2)
  })
})