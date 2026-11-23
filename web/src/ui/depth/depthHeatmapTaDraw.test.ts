import { describe, expect, it } from 'vitest'
import { taPatternPulseWeight } from './depthHeatmapTaDraw'

describe('taPatternPulseWeight', () => {
  it('peaks at quarter cycle and bottoms at three-quarter', () => {
    expect(taPatternPulseWeight(0)).toBeCloseTo(0.5, 5)
    expect(taPatternPulseWeight(0.25)).toBeCloseTo(1, 5)
    expect(taPatternPulseWeight(0.5)).toBeCloseTo(0.5, 5)
    expect(taPatternPulseWeight(0.75)).toBeCloseTo(0, 5)
  })
})