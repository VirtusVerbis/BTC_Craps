import { describe, expect, it } from 'vitest'
import {
  HEATMAP_PRICE_BAND_BPS,
  HEATMAP_PRICE_TICK_USD,
  binBookToPriceBuckets,
  mergePriceBuckets,
  snapPriceTick,
} from './depthHeatmapPriceBins'

describe('binBookToPriceBuckets', () => {
  const mid = 100_000

  it('bins to absolute USD ticks', () => {
    const buckets = binBookToPriceBuckets(
      mid,
      [{ price: 99_950, size: 1 }],
      [{ price: 100_080, size: 2 }],
      HEATMAP_PRICE_TICK_USD,
      HEATMAP_PRICE_BAND_BPS,
    )
    expect(buckets.length).toBeGreaterThanOrEqual(2)
    const bid = buckets.find((b) => b.p === snapPriceTick(99_950))
    const ask = buckets.find((b) => b.p === snapPriceTick(100_080))
    expect(bid?.usd).toBeCloseTo(99_950)
    expect(ask?.usd).toBeCloseTo(100_080 * 2)
  })

  it('merges venues at same price', () => {
    const merged = mergePriceBuckets([
      [{ p: 100_000, usd: 50_000 }],
      [{ p: 100_000, usd: 30_000 }],
    ])
    expect(merged).toEqual([{ p: 100_000, usd: 80_000 }])
  })
})