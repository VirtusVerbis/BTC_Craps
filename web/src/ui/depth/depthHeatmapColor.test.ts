import { describe, expect, it } from 'vitest'
import { heatmapColor01 } from './depthHeatmapColor'

describe('heatmapColor01', () => {
  it('starts at ramp floor color at t=0', () => {
    expect(heatmapColor01(0)).toBe('rgb(22, 40, 66)')
  })

  it('ends at red at t=1', () => {
    expect(heatmapColor01(1)).toBe('rgb(239, 68, 68)')
  })
})