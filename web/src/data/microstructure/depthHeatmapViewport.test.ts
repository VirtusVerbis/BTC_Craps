import { describe, expect, it } from 'vitest'
import { HEATMAP_PRICE_BAND_BPS, HEATMAP_PRICE_BAND_BPS_MAX } from './depthHeatmapPriceBins'
import { heatmapViewportForChartHeight, HEATMAP_VIEWPORT_REF_CHART_H } from './depthHeatmapViewport'

describe('heatmapViewportForChartHeight', () => {
  it('uses baseline band at reference height', () => {
    const v = heatmapViewportForChartHeight(HEATMAP_VIEWPORT_REF_CHART_H)
    expect(v.bandBps).toBe(HEATMAP_PRICE_BAND_BPS)
  })

  it('increases band faster than axis floor at taller heights', () => {
    const tall = heatmapViewportForChartHeight(900)
    expect(tall.bandBps).toBeGreaterThan(HEATMAP_PRICE_BAND_BPS)
    expect(tall.bandBps).toBeLessThanOrEqual(HEATMAP_PRICE_BAND_BPS_MAX)
    expect(tall.minHalfBps).toBeLessThan(tall.bandBps)
  })
})