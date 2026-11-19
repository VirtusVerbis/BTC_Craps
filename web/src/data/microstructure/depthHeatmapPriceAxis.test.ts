import { describe, expect, it } from 'vitest'
import {
  heatmapAxisMidRangePrice,
  heatmapPriceAxis,
  heatmapPriceToTopPercent,
} from './depthHeatmapPriceAxis'

describe('heatmapPriceAxis', () => {
  const mid = 100_000

  it('stays tight to candle range when depth prices are far from mid', () => {
    const candleAxis = heatmapPriceAxis([mid - 80, mid + 120], [mid])
    const wideDepthAxis = heatmapPriceAxis([mid - 80, mid + 120, mid - 1_800, mid + 1_800], [mid])
    expect(candleAxis.priceMax - candleAxis.priceMin).toBeLessThan(wideDepthAxis.priceMax - wideDepthAxis.priceMin)
  })

  it('caps Y span vs OHLC when minHalfBps is large', () => {
    const tight = heatmapPriceAxis([mid - 40, mid + 40], [mid], undefined, { minHalfBps: 120 })
    const span = tight.priceMax - tight.priceMin
    expect(span).toBeLessThan(400)
  })
})

describe('heatmapPriceToTopPercent', () => {
  it('maps range high/mid/low to top/center/bottom of plot', () => {
    const axis = heatmapPriceAxis([100_040, 100_120], [100_000])
    const mid = heatmapAxisMidRangePrice(axis)
    expect(heatmapPriceToTopPercent(axis.priceMax, axis)).toBe(0)
    expect(heatmapPriceToTopPercent(mid, axis)).toBe(50)
    expect(heatmapPriceToTopPercent(axis.priceMin, axis)).toBe(100)
  })
})