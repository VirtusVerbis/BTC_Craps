import { describe, expect, it } from 'vitest'
import type { HeatmapDepthPersistedColumn } from './heatmapDepthPersistTypes'
import type { HeatmapGridColumn } from './microstructure/depthSessionHeatmapGrid'
import {
  capPersistedDepthColumns,
  mergeIncomingPersistedDepthByT0,
  mergePersistedDepthIntoLiveColumns,
  persistedDepthOverlappingWindow,
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
    const persisted: HeatmapDepthPersistedColumn[] = [
      { t0: 0, t1: 10_000, b: [[100_000, 1_000_000] as [number, number]] },
    ]
    const out = mergePersistedDepthIntoLiveColumns(live, persisted)
    expect(out[0]!.buckets[0]!.usd).toBe(2_000_000)
  })

  it('fills gap slots from persisted wall-clock overlap', () => {
    const live = [col(0, 5_000, true), col(5_000, 10_000, true)]
    const persisted: HeatmapDepthPersistedColumn[] = [
      { t0: 0, t1: 10_000, b: [[99_984, 800_000] as [number, number]] },
    ]
    const out = mergePersistedDepthIntoLiveColumns(live, persisted)
    expect(out[0]!.gap).toBe(false)
    expect(out[0]!.restoredCarry).toBe(true)
    expect(out[0]!.buckets[0]!.usd).toBe(800_000)
    expect(out[1]!.gap).toBe(false)
    expect(out[1]!.restoredCarry).toBe(true)
  })
})

describe('trimPersistedColumnsWallClock', () => {
  it('drops columns older than retention window', () => {
    const now = 100_000
    const cols: HeatmapDepthPersistedColumn[] = [
      { t0: 30_000, t1: 40_000, b: [[100_000, 1] as [number, number]] },
      { t0: now - 30_000, t1: now - 20_000, b: [[100_000, 2] as [number, number]] },
    ]
    const out = trimPersistedColumnsWallClock(cols, now, 60_000)
    expect(out).toHaveLength(1)
    expect(out[0]!.t0).toBe(now - 30_000)
  })
})

describe('capPersistedDepthColumns', () => {
  it('drops oldest t0 when over max', () => {
    const cols: HeatmapDepthPersistedColumn[] = [
      { t0: 0, t1: 1, b: [[100_000, 1] as [number, number]] },
      { t0: 1, t1: 2, b: [[100_000, 1] as [number, number]] },
      { t0: 2, t1: 3, b: [[100_000, 1] as [number, number]] },
    ]
    const out = capPersistedDepthColumns(cols, 2)
    expect(out).toHaveLength(2)
    expect(out[0]!.t0).toBe(1)
    expect(out[1]!.t0).toBe(2)
  })
})

describe('persistedDepthOverlappingWindow', () => {
  it('returns only columns overlapping the window', () => {
    const byT0 = new Map<number, HeatmapDepthPersistedColumn>([
      [0, { t0: 0, t1: 10_000, b: [[100_000, 1] as [number, number]] }],
      [50_000, { t0: 50_000, t1: 60_000, b: [[100_000, 2] as [number, number]] }],
    ])
    const out = persistedDepthOverlappingWindow(byT0, 5_000, 15_000)
    expect(out).toHaveLength(1)
    expect(out[0]!.t0).toBe(0)
  })
})

describe('mergeIncomingPersistedDepthByT0', () => {
  it('upserts by t0 into the map', () => {
    const map = new Map<number, HeatmapDepthPersistedColumn>()
    const now = 1_000_000
    mergeIncomingPersistedDepthByT0(
      map,
      [{ t0: now - 5_000, t1: now, b: [[100_000, 3] as [number, number]] }],
      now,
    )
    expect(map.get(now - 5_000)?.b[0]![1]).toBe(3)
  })
})

describe('upsertPersistedDepthColumns', () => {
  it('replaces same t0 and trims by retention', () => {
    const now = 1_000_000
    const prior: HeatmapDepthPersistedColumn[] = [
      { t0: now - 50_000, t1: now - 40_000, b: [[100_000, 1] as [number, number]] },
    ]
    const incoming: HeatmapDepthPersistedColumn[] = [
      { t0: now - 50_000, t1: now - 40_000, b: [[100_000, 9] as [number, number]] },
    ]
    const out = upsertPersistedDepthColumns(prior, incoming, now)
    expect(out).toHaveLength(1)
    expect(out[0]!.b[0]![1]).toBe(9)
  })
})