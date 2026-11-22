import { describe, expect, it } from 'vitest'
import { heatmapPriceAxis } from './depthHeatmapPriceAxis'
import {
  candleBarFinalizedAt,
  inWindowCandleExtent,
  inWindowCandleExtentForAxis,
  inWindowRefMids,
  refMidsForAxisPolicy,
  spotWindowRangeBps,
  spotWindowRangeBpsForAxis,
  stabilizeHeatmapPriceAxis,
  volatilityThresholdBpsForWindow,
  HEATMAP_AXIS_SHRINK_HOLD_MS,
  HEATMAP_AXIS_WIDEN_HOLD_MS,
} from './depthHeatmapAxisPolicy'
import type { HeatmapGridColumn } from './depthSessionHeatmapGrid'
import type { HeatmapVenueMidPolylines } from './depthHeatmapVenueMids'

const col = (start: number, end: number, refMid: number): HeatmapGridColumn => ({
  intervalStart: start,
  intervalEnd: end,
  buckets: [],
  refMid,
  gap: false,
})

describe('volatilityThresholdBpsForWindow', () => {
  it('scales from 30m baseline', () => {
    expect(volatilityThresholdBpsForWindow(30)).toBe(15)
    expect(volatilityThresholdBpsForWindow(15)).toBe(7.5)
    expect(volatilityThresholdBpsForWindow(1440)).toBe(60)
  })
})

describe('inWindowRefMids', () => {
  it('excludes polyline points before range start', () => {
    const range = { start: 10_000, end: 100_000 }
    const polylines: HeatmapVenueMidPolylines = {
      coinbase: [[{ t: 5_000, mid: 50_000 }, { t: 50_000, mid: 100_000 }]],
    } as HeatmapVenueMidPolylines
    const mids = inWindowRefMids([col(20_000, 30_000, 99_000)], polylines, range, 0)
    expect(mids).not.toContain(50_000)
    expect(mids).toContain(100_000)
    expect(mids).toContain(99_000)
  })
})

describe('refMidsForAxisPolicy', () => {
  const mid = 100_000
  const candleExtent = [mid - 20, mid + 20]

  it('calm window tightens vs wide refMids', () => {
    const calmRefs = refMidsForAxisPolicy(5, 15, [mid - 500, mid + 500])
    const calmAxis = heatmapPriceAxis(candleExtent, calmRefs, undefined, { minHalfBps: 35 })
    const wideAxis = heatmapPriceAxis(candleExtent, [mid - 500, mid + 500], undefined, { minHalfBps: 35 })
    expect(calmAxis.priceMax - calmAxis.priceMin).toBeLessThan(wideAxis.priceMax - wideAxis.priceMin)
  })

  it('irregular window keeps ref mids', () => {
    expect(refMidsForAxisPolicy(20, 15, [mid])).toEqual([mid])
  })
})

describe('spotWindowRangeBps', () => {
  it('measures in-window candle range', () => {
    const range = { start: 0, end: 60_000 }
    const bps = spotWindowRangeBps(
      [
        { openTime: 10_000, open: 100_000, high: 100_050, low: 99_950, close: 100_000 },
        { openTime: 40_000, open: 100_000, high: 100_100, low: 99_900, close: 100_000 },
      ],
      range,
      15_000,
    )
    expect(bps).toBeGreaterThan(0)
  })
})

describe('inWindowCandleExtentForAxis', () => {
  const barMs = 15_000
  const range = { start: 0, end: 60_000 }

  it('ignores live spot on the forming bar', () => {
    const formingOpen = 50_000
    const candles = [
      { openTime: formingOpen, open: 100_000, high: 100_020, low: 99_980, close: 100_000 },
    ]
    const withLive = inWindowCandleExtent(candles, range, barMs, 101_000)
    const axisAt = formingOpen + barMs - 1
    const forAxis = inWindowCandleExtentForAxis(candles, range, barMs, axisAt)
    expect(withLive).toContain(101_000)
    expect(forAxis).toHaveLength(0)
  })

  it('includes a bar after it finalizes', () => {
    const open = 40_000
    const candles = [
      { openTime: open, open: 100_000, high: 100_200, low: 99_800, close: 100_000 },
    ]
    expect(candleBarFinalizedAt(open, barMs, open + barMs)).toBe(true)
    const extent = inWindowCandleExtentForAxis(candles, range, barMs, open + barMs)
    expect(extent).toEqual(expect.arrayContaining([100_200, 99_800]))
    const bps = spotWindowRangeBpsForAxis(candles, range, barMs, open + barMs)
    expect(bps).toBeGreaterThan(0)
  })

  it('includes forming bar on 1m heatmap bars so open candle is not clipped', () => {
    const barMs60 = 60_000
    const formingOpen = 50_000
    const candles = [
      { openTime: formingOpen, open: 100_000, high: 100_150, low: 99_850, close: 100_020 },
    ]
    const extent = inWindowCandleExtentForAxis(candles, range, barMs60, formingOpen + 30_000)
    expect(extent).toEqual(expect.arrayContaining([100_150, 99_850]))
  })
})

describe('stabilizeHeatmapPriceAxis', () => {
  const prev = { priceMin: 99_000, priceMax: 101_000, tick: 6, rows: 40 }
  const nextTight = { priceMin: 99_500, priceMax: 100_500, tick: 6, rows: 40 }

  it('holds tighter axis briefly', () => {
    const t0 = 1_000_000
    const emptyState = {
      tighterSince: null,
      pendingMin: null,
      pendingMax: null,
      widerSince: null,
      pendingWiderMin: null,
      pendingWiderMax: null,
    }
    const first = stabilizeHeatmapPriceAxis(prev, nextTight, t0, emptyState)
    expect(first.axis).toBe(prev)
    const held = stabilizeHeatmapPriceAxis(prev, nextTight, t0 + HEATMAP_AXIS_SHRINK_HOLD_MS - 1, first.state)
    expect(held.axis).toBe(prev)
    const released = stabilizeHeatmapPriceAxis(prev, nextTight, t0 + HEATMAP_AXIS_SHRINK_HOLD_MS, first.state)
    expect(released.axis).toEqual(nextTight)
  })

  it('holds wider axis briefly', () => {
    const wider = { priceMin: 98_000, priceMax: 102_000, tick: 6, rows: 40 }
    const emptyState = {
      tighterSince: null,
      pendingMin: null,
      pendingMax: null,
      widerSince: null,
      pendingWiderMin: null,
      pendingWiderMax: null,
    }
    const t0 = 2_000_000
    const first = stabilizeHeatmapPriceAxis(prev, wider, t0, emptyState)
    expect(first.axis).toBe(prev)
    const held = stabilizeHeatmapPriceAxis(prev, wider, t0 + HEATMAP_AXIS_WIDEN_HOLD_MS - 1, first.state)
    expect(held.axis).toBe(prev)
    const released = stabilizeHeatmapPriceAxis(prev, wider, t0 + HEATMAP_AXIS_WIDEN_HOLD_MS, first.state)
    expect(released.axis).toEqual(wider)
  })
})