import { describe, expect, it } from 'vitest'
import {
  HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM,
  HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM,
  offRangeChipIntensity,
  offRangeChipStyle,
} from './depthHeatmapOffRangeChip'

describe('offRangeChipStyle', () => {
  it('maps intensity to legend color and font between min and max rem', () => {
    const low = offRangeChipStyle(500_000, 10_000_000)
    expect(offRangeChipIntensity(500_000, 10_000_000)).toBeCloseTo(0.05)
    const lowRem = parseFloat(String(low.fontSize))
    expect(lowRem).toBeGreaterThanOrEqual(HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM)
    expect(lowRem).toBeLessThan(HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM)

    const high = offRangeChipStyle(10_000_000, 10_000_000)
    expect(offRangeChipIntensity(10_000_000, 10_000_000)).toBe(1)
    expect(parseFloat(String(high.fontSize))).toBeCloseTo(HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM, 2)
    expect(high.color).toMatch(/^rgb\(/)
    expect(String(low.background)).toMatch(/rgba\(255,\s*255,\s*255/)
    expect(String(high.background)).toMatch(/rgba\(10,\s*14,\s*23/)
  })
})