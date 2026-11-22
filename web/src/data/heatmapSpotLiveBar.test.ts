import { describe, expect, it } from 'vitest'
import { heatmapSpotCandlesWithLiveMid } from './heatmapSpotLiveBar'

describe('heatmapSpotCandlesWithLiveMid', () => {
  const barMs = 15_000
  const formingOpen = 45_000

  it('patches the forming bucket', () => {
    const out = heatmapSpotCandlesWithLiveMid(
      [{ openTime: formingOpen, open: 100, high: 101, low: 99, close: 100 }],
      barMs,
      formingOpen + 5_000,
      102,
    )
    expect(out[0]!.close).toBe(102)
    expect(out[0]!.high).toBe(102)
    expect(out[0]!.low).toBe(99)
  })

  it('does not add a synthetic bar when REST lags behind the current bucket', () => {
    const out = heatmapSpotCandlesWithLiveMid(
      [{ openTime: 30_000, open: 100, high: 101, low: 99, close: 100.5 }],
      barMs,
      formingOpen + 1_000,
      101.2,
    )
    expect(out).toHaveLength(1)
    expect(out[0]!.openTime).toBe(30_000)
    expect(out[0]!.close).toBe(100.5)
  })
})