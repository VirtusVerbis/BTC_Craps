import { describe, expect, it } from 'vitest'
import { heatmapPriceAxis } from './depthHeatmapPriceAxis'

describe('heatmapPriceAxis', () => {
  const mid = 100_000

  it('stays tight to candle range when depth prices are far from mid', () => {
    const candleAxis = heatmapPriceAxis([mid - 80, mid + 120], [mid])
    const wideDepthAxis = heatmapPriceAxis([mid - 80, mid + 120, mid - 1_800, mid + 1_800], [mid])
    expect(candleAxis.priceMax - candleAxis.priceMin).toBeLessThan(wideDepthAxis.priceMax - wideDepthAxis.priceMin)
  })
})