import { describe, expect, it } from 'vitest'
import { WallTracker, WALL_MIN_USD } from './wallTracker'

describe('WallTracker', () => {
  it('starts tracking a large bid near mid', () => {
    const tracker = new WallTracker('binancePerp', { minUsd: 100_000, bandBps: 100 })
    const mid = 100_000
    tracker.ingest(
      mid,
      [{ price: 99_500, size: 2 }],
      [{ price: 100_500, size: 0.1 }],
      1000,
    )
    expect(tracker.getActive().length).toBe(1)
    expect(tracker.getActive()[0]?.peakUsd).toBeGreaterThanOrEqual(199_000)
  })

  it('emits pulled when wall vanishes from book', () => {
    const tracker = new WallTracker('coinbase', { minUsd: WALL_MIN_USD * 0.2, bandBps: 200 })
    const mid = 70_000
    const wall = { price: 69_800, size: 10 }
    tracker.ingest(mid, [wall], [{ price: 70_100, size: 0.01 }], 1000)
    tracker.ingest(mid, [], [{ price: 70_100, size: 0.01 }], 2000)
    const events = tracker.getEvents()
    expect(events.length).toBe(1)
    expect(['pulled', 'atTouch', 'consumed']).toContain(events[0]?.reason)
  })
})