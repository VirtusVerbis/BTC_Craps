import {
  DEPTH_BUCKET_MS,
  DEPTH_TIMELINE_CANVAS_MIN_WIDTH,
  DEPTH_TIMELINE_MIN_COL_PX,
  DEPTH_TIMELINE_TARGET_DISPLAY_COLS,
  DEPTH_WINDOW_15_MIN_BUCKETS,
  DEPTH_WINDOW_30_MIN_BUCKETS,
  DEPTH_WINDOW_60_MIN_BUCKETS,
} from './depthDisplayConstants'
import type { DepthSample, FeedStatus, VenueId } from './types'

export {
  DEPTH_BUCKET_MS,
  DEPTH_WINDOW_15_MIN_BUCKETS,
  DEPTH_WINDOW_30_MIN_BUCKETS,
  DEPTH_WINDOW_60_MIN_BUCKETS,
}

export interface TimelineGridCell {
  bidNotionalNear: number
  askNotionalNear: number
  /** No sample in bucket and no carry-forward. */
  gap: boolean
}

/** Floor clock time to 5s grid so bucket edges do not slide on 2.5s UI emits. */
export const snapTimelineNow = (now: number): number =>
  Math.floor(now / DEPTH_BUCKET_MS) * DEPTH_BUCKET_MS

export type TimelineScaleState = { tick: number; max: number }

/**
 * Y scale ratchets upward only (reset when the timeline window changes in UI).
 * Older columns keep pixel height when a new spike appears elsewhere.
 */
export const advanceTimelineScale = (
  timelineNow: number,
  windowMax: number,
  state: TimelineScaleState,
): { max: number; state: TimelineScaleState } => {
  const safeWindow = Math.max(1, windowMax)
  const max = Math.max(state.max, safeWindow)
  const tick = timelineNow
  return { max, state: { tick, max } }
}

/**
 * Align venue samples to fixed time buckets (newest bucket last).
 * Uses last sample in each bucket; carries forward within the window when empty.
 * @param now — pass {@link snapTimelineNow}(sampledAt) for stable columns between samples.
 */
export const alignDepthSamplesToGrid = (
  samples: readonly DepthSample[],
  bucketCount: number,
  now: number,
  status: FeedStatus,
): TimelineGridCell[] => {
  const timelineEnd = snapTimelineNow(now)
  const windowMs = bucketCount * DEPTH_BUCKET_MS
  const windowStart = timelineEnd - windowMs
  const sorted = [...samples].filter((s) => s.at >= windowStart - DEPTH_BUCKET_MS).sort((a, b) => a.at - b.at)

  const cells: TimelineGridCell[] = []
  let carried: DepthSample | null = null

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = windowStart + i * DEPTH_BUCKET_MS
    const bucketEnd = bucketStart + DEPTH_BUCKET_MS
    let pick: DepthSample | null = null
    for (let j = sorted.length - 1; j >= 0; j--) {
      const s = sorted[j]
      if (s.at >= bucketStart && s.at < bucketEnd) {
        pick = s
        break
      }
    }
    if (pick) {
      carried = pick
      cells.push({
        bidNotionalNear: pick.bidNotionalNear,
        askNotionalNear: pick.askNotionalNear,
        gap: false,
      })
    } else if (carried && carried.at >= windowStart) {
      cells.push({
        bidNotionalNear: carried.bidNotionalNear,
        askNotionalNear: carried.askNotionalNear,
        gap: false,
      })
    } else {
      cells.push({
        bidNotionalNear: 0,
        askNotionalNear: 0,
        gap: status !== 'connected',
      })
    }
  }

  return cells
}

export const timelineDisplayPlan = (
  bucketCount: number,
): { groupSize: number; displayCols: number; canvasWidth: number } => {
  const groupSize = Math.max(1, Math.ceil(bucketCount / DEPTH_TIMELINE_TARGET_DISPLAY_COLS))
  const displayCols = Math.ceil(bucketCount / groupSize)
  const canvasWidth = Math.max(DEPTH_TIMELINE_CANVAS_MIN_WIDTH, displayCols * DEPTH_TIMELINE_MIN_COL_PX)
  return { groupSize, displayCols, canvasWidth }
}

/**
 * Display columns aligned to wall-clock coarse intervals (stable across 5s window slides).
 * Each column = last sample in [rangeStart + c×groupMs, rangeStart + (c+1)×groupMs).
 */
export const buildEpochCoarseTimeline = (
  samples: readonly DepthSample[],
  bucketCount: number,
  timelineEnd: number,
  groupSize: number,
  status: FeedStatus,
): TimelineGridCell[] => {
  const groupMs = groupSize * DEPTH_BUCKET_MS
  const displayCols = Math.ceil(bucketCount / groupSize)
  const spanMs = displayCols * groupMs
  const rangeEnd = snapTimelineNow(timelineEnd)
  let rangeStart = rangeEnd - spanMs
  rangeStart = Math.floor(rangeStart / groupMs) * groupMs

  const sorted = [...samples].filter((s) => s.at >= rangeStart - DEPTH_BUCKET_MS).sort((a, b) => a.at - b.at)
  const out: TimelineGridCell[] = []

  for (let c = 0; c < displayCols; c++) {
    const intervalStart = rangeStart + c * groupMs
    const intervalEnd = intervalStart + groupMs
    let pick: DepthSample | null = null
    for (let j = sorted.length - 1; j >= 0; j--) {
      const s = sorted[j]
      if (s.at >= intervalStart && s.at < intervalEnd) {
        pick = s
        break
      }
    }
    if (!pick) {
      for (let j = sorted.length - 1; j >= 0; j--) {
        const s = sorted[j]
        if (s.at < intervalStart && s.at >= rangeStart) {
          pick = s
          break
        }
      }
    }
    if (pick) {
      out.push({
        bidNotionalNear: pick.bidNotionalNear,
        askNotionalNear: pick.askNotionalNear,
        gap: false,
      })
    } else {
      out.push({
        bidNotionalNear: 0,
        askNotionalNear: 0,
        gap: status !== 'connected',
      })
    }
  }

  return out
}

/** Merge adjacent 5s buckets for display; uses the newest bucket (last) in each group. */
export const coarsenTimelineGrid = (cells: readonly TimelineGridCell[], groupSize: number): TimelineGridCell[] => {
  if (groupSize <= 1) return [...cells]
  const out: TimelineGridCell[] = []
  for (let i = 0; i < cells.length; i += groupSize) {
    const slice = cells.slice(i, i + groupSize)
    let allGap = true
    for (const c of slice) {
      if (!c.gap) allGap = false
    }
    const last = slice[slice.length - 1]!
    out.push({
      bidNotionalNear: last.bidNotionalNear,
      askNotionalNear: last.askNotionalNear,
      gap: allGap,
    })
  }
  return out
}

export const globalTimelineMax = (
  grids: Record<VenueId, TimelineGridCell[]>,
  venues: readonly VenueId[],
): number => {
  let max = 1
  for (const venue of venues) {
    for (const c of grids[venue] ?? []) {
      max = Math.max(max, c.bidNotionalNear, c.askNotionalNear)
    }
  }
  return max
}

export const earliestSampleAt = (sampleLists: readonly (readonly { at: number }[])[]): number | null => {
  let earliest: number | null = null
  for (const samples of sampleLists) {
    for (const s of samples) {
      if (earliest === null || s.at < earliest) earliest = s.at
    }
  }
  return earliest
}

/** Grows from 1 until the selected window is full, then caps at maxDisplayCols. */
export const timelineHistoryLayoutCols = (
  firstSampleAt: number | null,
  timelineNow: number,
  groupSize: number,
  maxDisplayCols: number,
): number => {
  if (firstSampleAt === null) return 1
  const groupMs = groupSize * DEPTH_BUCKET_MS
  const span = Math.max(0, timelineNow - firstSampleAt)
  const cols = Math.floor(span / groupMs) + 1
  return Math.min(maxDisplayCols, Math.max(1, cols))
}

export const sliceTimelineGridTail = (cells: readonly TimelineGridCell[], layoutCols: number): TimelineGridCell[] =>
  cells.length <= layoutCols ? [...cells] : cells.slice(cells.length - layoutCols)

export const timelineCanvasMetrics = (
  layoutCols: number,
  viewWidth: number,
  minColPx = DEPTH_TIMELINE_MIN_COL_PX,
): { width: number; colWidth: number; scrollable: boolean } => {
  const packedW = layoutCols * minColPx
  if (packedW <= viewWidth) {
    return { width: viewWidth, colWidth: viewWidth / layoutCols, scrollable: false }
  }
  return { width: packedW, colWidth: minColPx, scrollable: true }
}

/** Heatmap: always fit viewport width (no horizontal chart scroll). */
export const heatmapCanvasMetricsFit = (
  layoutCols: number,
  viewWidth: number,
): { width: number; colWidth: number } => {
  const cols = Math.max(1, layoutCols)
  const w = Math.max(1, viewWidth)
  return { width: w, colWidth: w / cols }
}

export { DEPTH_TIMELINE_MIN_COL_PX }