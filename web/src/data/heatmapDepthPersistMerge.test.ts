import { describe, expect, it } from 'vitest'
import type { HeatmapGridColumn } from './microstructure/depthSessionHeatmapGrid'
import {
  mergePersistedDepthIntoLiveColumns,
  trimPersistedColumnsWallClock,
  upsertPersistedDepthColumns,
} from './heatmapDepthPersistMerge'

const col = (t0: number, t1: number, gap: boolean, usd = 0): HeatmapGridColumn => ({
  intervalStart: t0,
  intervalEnd: t1,
  refMid: 100_000,
  gap,
  buckets: gap ? [] : [{ p: 100_000, usd: usd || 500_000 }],
})

describe('mergePersistedDepthIntoLiveColumns', () => {
  it('live depth wins over cache for the same slot', () => {
    const live = [col(0, 10_000, false, 2_000_000)]
    const persisted = [{ t0: 0, t1: 10_000, b: [[100_000, 1_000_000]] }]
    const out = mergePersistedDepthIntoLiveColumns(live, persisted)
    expect(out[0]!.buckets[0]!.usd).toBe(2_000_000)
  })

  it('fills gap slots from persisted wall-clock overlap', () => {
    const live = [col(0, 5_000, true), col(5_000, 10_000, true)]
    const persisted = [{ t0: 0, t1: 10_000, b: [[99_984, 800_000]] }]
    const out = mergePersistedDepthIntoLiveColumns(live, persisted)
    expect(out[0]!.gap).toBe(false)
    expect(out[0]!.buckets[0]!.usd).toBe(800_000)
    expect(out[1]!.gap).toBe(false)
  })
})

describe('trimPersistedColumnsWallClock', () => {
  it('drops columns older than retention window', () => {
    const now = 100_000
    const cols = [
      { t0: 30_000, t1: 40_000, b: [[100_000, 1]] },
      { t0: now - 30_000, t1: now - 20_000, b: [[100_000, 2]] },
    ]
    const out = trimPersistedColumnsWallClock(cols, now, 60_000)
    expect(out).toHaveLength(1)
    expect(out[0]!.t0).toBe(now - 30_000)
  })
})

describe('upsertPersistedDepthColumns', () => {
  it('replaces same t0 and trims by retention', () => {
    const now = 1_000_000
    const prior = [{ t0: now - 50_000, t1: now - 40_000, b: [[100_000, 1]] }]
    const incoming = [{ t0: now - 50_000, t1: now - 40_000, b: [[100_000, 9]] }]
    const out = upsertPersistedDepthColumns(prior, incoming, now)
    expect(out).toHaveLength(1)
    expect(out[0]!.b[0]![1]).toBe(9)
  })
})