import { describe, expect, it } from 'vitest'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { HEATMAP_OFFRANGE_MIN_USD, HEATMAP_PRICE_TICK_USD } from '../../data/microstructure/depthHeatmapPriceBins'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import {
  aggregateMaxUsdByPrice,
  latestHeatmapColumn,
  nearestOffRangeLargePools,
  qualifiesOffRangePool,
} from './depthHeatmapDepthProfile'

const axis: HeatmapPriceAxis = {
  priceMin: 99_900,
  priceMax: 100_100,
  tick: HEATMAP_PRICE_TICK_USD,
  rows: 8,
}

const col = (buckets: HeatmapGridColumn['buckets']): HeatmapGridColumn => ({
  intervalStart: 0,
  intervalEnd: 1,
  buckets,
  refMid: 100_000,
  gap: false,
})

describe('aggregateMaxUsdByPrice', () => {
  it('takes max USD per tick across columns', () => {
    const map = aggregateMaxUsdByPrice([
      col([{ p: 100_000, usd: 1_000_000 }]),
      col([{ p: 100_000, usd: 2_500_000 }, { p: 100_050, usd: 400_000 }]),
    ])
    expect(map.get(100_000)).toBe(2_500_000)
    expect(map.get(100_050)).toBe(400_000)
  })

  it('ignores gap columns', () => {
    const map = aggregateMaxUsdByPrice([{ ...col([{ p: 100_025, usd: 9_000_000 }]), gap: true }])
    expect(map.size).toBe(0)
  })
})

describe('nearestOffRangeLargePools', () => {
  const mid = 100_000

  it('picks nearest large tick above/below Y, not the largest farther away', () => {
    const summary = nearestOffRangeLargePools(
      col([
        { p: 100_175, usd: 5_000_000 },
        { p: 100_150, usd: 1_200_000 },
        { p: 99_875, usd: 1_100_000 },
        { p: 99_850, usd: 4_000_000 },
      ]),
      axis,
      mid,
    )
    expect(summary.above).toEqual({ price: 100_150, usd: 1_200_000 })
    expect(summary.below).toEqual({ price: 99_875, usd: 1_100_000 })
  })

  it('ignores pools below min USD', () => {
    const summary = nearestOffRangeLargePools(
      col([{ p: 100_150, usd: Math.max(1, HEATMAP_OFFRANGE_MIN_USD - 1) }]),
      axis,
      mid,
    )
    expect(summary.above).toBeNull()
  })

  it('ignores in-view ticks', () => {
    const summary = nearestOffRangeLargePools(col([{ p: 100_000, usd: 2_000_000 }]), axis, mid)
    expect(summary.above).toBeNull()
    expect(summary.below).toBeNull()
  })

  it('qualifiesOffRangePool uses HEATMAP_OFFRANGE_MIN_USD', () => {
    expect(qualifiesOffRangePool(HEATMAP_OFFRANGE_MIN_USD)).toBe(true)
    expect(qualifiesOffRangePool(HEATMAP_OFFRANGE_MIN_USD - 1)).toBe(false)
  })
})

describe('latestHeatmapColumn', () => {
  it('skips trailing gap columns', () => {
    expect(latestHeatmapColumn([col([{ p: 100_000, usd: 1 }]), { ...col([]), gap: true }])).toEqual(
      col([{ p: 100_000, usd: 1 }]),
    )
  })
})