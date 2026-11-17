import { describe, expect, it } from 'vitest'
import { heatmapCandleBodyWidthPx } from './depthHeatmapCandles'

describe('heatmapCandleBodyWidthPx', () => {
  it('tracks bar spacing and applies narrow fill without exceeding the slot', () => {
    const spacing = 900 / 60
    const legacy = spacing * 0.9 - 0.5
    const body = heatmapCandleBodyWidthPx(spacing)
    expect(body).toBeCloseTo(legacy * 0.49, 5)
    expect(body).toBeLessThanOrEqual(spacing - 0.75)
  })
})