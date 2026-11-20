import { describe, expect, it } from 'vitest'
import { HEATMAP_PRICE_TICK_USD } from '../../data/microstructure/depthHeatmapPriceBins'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import {
  buildHeatmapVenueAxisLabels,
  latestKlineCloseInWindow,
  layoutHeatmapVenueAxisLabels,
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
  it('separates overlapping labels', () => {
    const out = layoutHeatmapVenueAxisLabels(
      [
        { venue: 'coinbase', price: 100, topPct: 28, text: '$100', color: '#fff' },
        { venue: 'binancePerp', price: 100.5, topPct: 28.2, text: '$101', color: '#fff' },
      ],
      400,
    )
    expect(out[1]!.topPct).toBeGreaterThan(out[0]!.topPct)
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
    )
    expect(rows).toHaveLength(0)
  })
})