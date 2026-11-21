import { describe, expect, it } from 'vitest'
import { heatmapPriceAxis } from './depthHeatmapPriceAxis'
import {
  inWindowRefMids,
  refMidsForAxisPolicy,
  spotWindowRangeBps,
  volatilityThresholdBpsForWindow,
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