import { describe, expect, it } from 'vitest'
import { HEATMAP_PRICE_TICK_USD } from '../../data/microstructure/depthHeatmapPriceBins'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import {
  buildHeatmapVenueAxisLabels,
  latestKlineCloseInWindow,
  layoutHeatmapVenueAxisLabels,
  type HeatmapVenueAxisLabel,
  venueAxisLabelMinGapPct,
} from './depthHeatmapVenueAxisLabels'

const axis = (min: number, max: number): HeatmapPriceAxis => ({
  priceMin: min,
  priceMax: max,
  tick: HEATMAP_PRICE_TICK_USD,
  rows: Math.round((max - min) / HEATMAP_PRICE_TICK_USD),
})

describe('latestKlineCloseInWindow', () => {
  it('picks the latest bar close inside the window', () => {
    const range = { start: 1_000, end: 10_000 }
    const close = latestKlineCloseInWindow(
      [
        { openTime: 2_000, open: 1, high: 1, low: 1, close: 100 },
        { openTime: 5_000, open: 1, high: 1, low: 1, close: 101 },
        { openTime: 80_000, open: 1, high: 1, low: 1, close: 999 },
      ],
      range,
      60_000,
    )
    expect(close).toBe(101)
  })
})

describe('layoutHeatmapVenueAxisLabels', () => {
  it('keeps higher prices above the fixed mid-axis line', () => {
    const axisMid = { price: 100_400, topPct: 50 }
    const rows = layoutHeatmapVenueAxisLabels(
      [
        {
          venue: 'binanceSpot',
          price: 100_420,
          topPct: 44,
          text: '$100,420',
          color: '#fff',
        },
        {
          venue: 'spotAvg',
          price: 100_425,
          topPct: 42,
          text: '~$100,425',
          color: 'transparent',
        },
      ] satisfies HeatmapVenueAxisLabel[],
      400,
      { priceMin: 100_000, priceMax: 100_800, tick: 6, rows: 134 },
    )
    const avg = rows.find((r) => r.venue === 'spotAvg')!
    const spot = rows.find((r) => r.venue === 'binanceSpot')!
    expect(avg.topPct).toBeLessThan(axisMid.topPct)
    expect(spot.topPct).toBeLessThan(axisMid.topPct)
    expect(avg.topPct).toBeLessThan(spot.topPct)
  })

  it('separates overlapping labels', () => {
    const out = layoutHeatmapVenueAxisLabels(
      [
        { venue: 'coinbase', price: 100, topPct: 28, text: '$100', color: '#fff' },
        { venue: 'binancePerp', price: 100.5, topPct: 28.2, text: '$101', color: '#fff' },
      ],
      400,
    )
    const gap = venueAxisLabelMinGapPct(400)
    expect(out[1]!.topPct - out[0]!.topPct).toBeGreaterThanOrEqual(gap - 0.01)
  })
})

describe('buildHeatmapVenueAxisLabels', () => {
  it('omits venues whose close is outside the Y range', () => {
    const rows = buildHeatmapVenueAxisLabels(
      ['coinbase'],
      {
        coinbase: [{ openTime: 5_000, open: 1, high: 1, low: 1, close: 120_000 }],
      },
      [],
      axis(99_000, 101_000),
      { start: 0, end: 20_000 },
      60_000,
      400,
      20_000,
      undefined,
      undefined,
      false,
    )
    expect(rows).toHaveLength(0)
  })
})