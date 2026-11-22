import { describe, expect, it } from 'vitest'
import {
  advanceTimelineScale,
  alignDepthSamplesToGrid,
  buildEpochCoarseTimeline,
  coarsenTimelineGrid,
  DEPTH_BUCKET_MS,
  snapTimelineNow,
  heatmapCanvasMetricsFit,
  timelineCanvasMetrics,
  timelineDisplayPlan,
  timelineHistoryLayoutCols,
} from './depthTimelineGrid'

describe('alignDepthSamplesToGrid', () => {
  const now = 1_000_000

  it('places samples into buckets by time', () => {
    const bucketCount = 4
    const t0 = now - bucketCount * DEPTH_BUCKET_MS
    const samples = [
      {
        at: t0 + DEPTH_BUCKET_MS * 0.5,
        mid: 1,
        bidNotionalNear: 100,
        askNotionalNear: 50,
        priceBuckets: [],
      },
    ]
    const grid = alignDepthSamplesToGrid(samples, bucketCount, now, 'connected')
    expect(grid[0].bidNotionalNear).toBe(100)
    expect(grid[0].askNotionalNear).toBe(50)
    expect(grid[0].gap).toBe(false)
  })

  it('carry-forwards after first sample in window', () => {
    const bucketCount = 3
    const samples = [
      {
        at: now - DEPTH_BUCKET_MS * 2.5,
        mid: 1,
        bidNotionalNear: 80,
        askNotionalNear: 40,
        priceBuckets: [],
      },
    ]
    const grid = alignDepthSamplesToGrid(samples, bucketCount, now, 'connected')
    expect(grid[1].bidNotionalNear).toBe(80)
    expect(grid[2].bidNotionalNear).toBe(80)
  })

  it('marks gap when disconnected and no data', () => {
    const grid = alignDepthSamplesToGrid([], 2, now, 'disconnected')
    expect(grid.every((c) => c.gap)).toBe(true)
  })

  it('coarsens groups using the newest bucket in each group', () => {
    const cells = [
      { bidNotionalNear: 10, askNotionalNear: 5, gap: false },
      { bidNotionalNear: 40, askNotionalNear: 8, gap: false },
      { bidNotionalNear: 12, askNotionalNear: 30, gap: false },
    ]
    const merged = coarsenTimelineGrid(cells, 2)
    expect(merged).toHaveLength(2)
    expect(merged[0].bidNotionalNear).toBe(40)
    expect(merged[0].askNotionalNear).toBe(8)
    expect(merged[1].bidNotionalNear).toBe(12)
    expect(merged[1].askNotionalNear).toBe(30)
  })

  it('snaps now to 5s grid', () => {
    expect(snapTimelineNow(1_000_003)).toBe(1_000_000)
    expect(snapTimelineNow(1_000_000)).toBe(1_000_000)
  })

  it('ratchets Y scale up only', () => {
    const state = { tick: 1_000_000, max: 100 }
    const r1 = advanceTimelineScale(1_000_000, 90, state)
    expect(r1.max).toBe(100)
    const r2 = advanceTimelineScale(1_000_000, 150, state)
    expect(r2.max).toBe(150)
    const r3 = advanceTimelineScale(1_000_005, 120, r2.state)
    expect(r3.max).toBe(150)
  })

  it('keeps coarse column value stable when timelineEnd advances within same epoch slot', () => {
    const groupSize = 2
    const bucketCount = 4
    const groupMs = groupSize * DEPTH_BUCKET_MS
    const rangeEnd = 1_000_000
    const rangeStart = Math.floor((rangeEnd - Math.ceil(bucketCount / groupSize) * groupMs) / groupMs) * groupMs
    const midSlot = rangeStart + groupMs + DEPTH_BUCKET_MS * 0.5
    const samples = [{ at: midSlot, mid: 1, bidNotionalNear: 77, askNotionalNear: 33, priceBuckets: [] }]
    const a = buildEpochCoarseTimeline(samples, bucketCount, rangeEnd, groupSize, 'connected')
    const b = buildEpochCoarseTimeline(samples, bucketCount, rangeEnd + DEPTH_BUCKET_MS, groupSize, 'connected')
    const col = 1
    expect(a[col].bidNotionalNear).toBe(77)
    expect(b[col].bidNotionalNear).toBe(77)
  })

  it('grows layout cols with session age then caps', () => {
    const groupSize = 8
    const maxCols = 90
    const now = 1_000_000
    expect(timelineHistoryLayoutCols(null, now, groupSize, maxCols)).toBe(1)
    const first = now - 8 * DEPTH_BUCKET_MS * 2
    expect(timelineHistoryLayoutCols(first, now, groupSize, maxCols)).toBe(3)
    expect(timelineHistoryLayoutCols(now - 8 * DEPTH_BUCKET_MS * maxCols, now, groupSize, maxCols)).toBe(maxCols)
  })

  it('fits timeline to viewport until min column width', () => {
    const fit = timelineCanvasMetrics(10, 400, 8)
    expect(fit.scrollable).toBe(false)
    expect(fit.width).toBe(400)
    expect(fit.colWidth).toBe(40)
    const scroll = timelineCanvasMetrics(100, 400, 8)
    expect(scroll.scrollable).toBe(true)
    expect(scroll.width).toBe(800)
    expect(scroll.colWidth).toBe(8)
  })

  it('reduces 1440 buckets to roughly DEPTH_TIMELINE_TARGET_DISPLAY_COLS columns', () => {
    const plan = timelineDisplayPlan(1440)
    expect(plan.groupSize).toBeGreaterThan(1)
    expect(plan.displayCols).toBeLessThanOrEqual(180)
    expect(plan.canvasWidth).toBeGreaterThanOrEqual(plan.displayCols * 6)
  })

  it('reduces 24h heatmap buckets to ~180 display columns', () => {
    const plan = timelineDisplayPlan(34_560)
    expect(plan.groupSize).toBe(192)
    expect(plan.displayCols).toBe(180)
  })

  it('heatmap canvas metrics always fit viewport', () => {
    const fit = heatmapCanvasMetricsFit(180, 400)
    expect(fit.width).toBe(400)
    expect(fit.colWidth).toBeCloseTo(400 / 180)
  })
})