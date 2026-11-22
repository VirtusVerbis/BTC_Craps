import { carriedPaintBucketsForColumnIndex } from './microstructure/depthHeatmapCarriedPaint'
import type { PriceBucket } from './microstructure/depthHeatmapPriceBins'
import type { HeatmapPriceAxis } from './microstructure/depthHeatmapPriceAxis'
import type { HeatmapGridColumn } from './microstructure/depthSessionHeatmapGrid'
import { HEATMAP_DEPTH_PERSIST_MAX_MS } from './heatmapDepthPersistTypes'
import type { HeatmapDepthPersistedColumn } from './heatmapDepthPersistTypes'

const bucketsFromPersisted = (b: HeatmapDepthPersistedColumn): PriceBucket[] =>
  b.b.map(([p, usd]) => ({ p, usd }))

/** Snapshot carried paint values for one column (matches live drag renderer). */
export const heatmapDepthPersistedColumnCarried = (
  colIndex: number,
  columns: readonly HeatmapGridColumn[],
  axis: HeatmapPriceAxis,
): HeatmapDepthPersistedColumn | null => {
  const col = columns[colIndex]
  if (!col || col.gap) return null
  const rows = carriedPaintBucketsForColumnIndex(colIndex, columns, axis)
  if (rows.length === 0) return null
  const b: [number, number][] = rows.map((r) => [r.p, r.usd])
  return {
    t0: col.intervalStart,
    t1: col.intervalEnd,
    m: col.refMid > 0 ? col.refMid : undefined,
    b,
  }
}

export const heatmapDepthPersistedCarriedFromGrid = (
  columns: readonly HeatmapGridColumn[],
  axis: HeatmapPriceAxis,
): HeatmapDepthPersistedColumn[] => {
  const out: HeatmapDepthPersistedColumn[] = []
  for (let i = 0; i < columns.length; i++) {
    const row = heatmapDepthPersistedColumnCarried(i, columns, axis)
    if (row) out.push(row)
  }
  return out
}

export const trimPersistedColumnsWallClock = (
  columns: readonly HeatmapDepthPersistedColumn[],
  now = Date.now(),
  maxAgeMs = HEATMAP_DEPTH_PERSIST_MAX_MS,
): HeatmapDepthPersistedColumn[] => {
  const minT0 = now - maxAgeMs
  return columns.filter((c) => c.t1 > minT0)
}

/** Merge new live captures into prior blob keyed by intervalStart (live overwrites). */
export const upsertPersistedDepthColumns = (
  prior: readonly HeatmapDepthPersistedColumn[],
  incoming: readonly HeatmapDepthPersistedColumn[],
  now = Date.now(),
): HeatmapDepthPersistedColumn[] => {
  const byT0 = new Map<number, HeatmapDepthPersistedColumn>()
  for (const c of prior) {
    if (c.t1 > now - HEATMAP_DEPTH_PERSIST_MAX_MS) byT0.set(c.t0, c)
  }
  for (const c of incoming) {
    if (c.b.length > 0) byT0.set(c.t0, c)
  }
  return [...byT0.values()].sort((a, b) => a.t0 - b.t0)
}

const columnHasLiveDepth = (col: HeatmapGridColumn): boolean => !col.gap && col.buckets.length > 0

const findPersistedForSlot = (
  intervalStart: number,
  intervalEnd: number,
  cached: readonly HeatmapDepthPersistedColumn[],
): HeatmapDepthPersistedColumn | null => {
  for (const c of cached) {
    if (c.t0 === intervalStart) return c
  }
  for (const c of cached) {
    if (c.t0 < intervalEnd && c.t1 > intervalStart && c.b.length > 0) return c
  }
  return null
}

/**
 * Wall-clock fill: live columns win; empty gaps use persisted buckets when times overlap.
 */
export const mergePersistedDepthIntoLiveColumns = (
  liveColumns: readonly HeatmapGridColumn[],
  persisted: readonly HeatmapDepthPersistedColumn[],
): HeatmapGridColumn[] => {
  if (persisted.length === 0) return [...liveColumns]
  return liveColumns.map((col) => {
    if (columnHasLiveDepth(col)) return col
    const hit = findPersistedForSlot(col.intervalStart, col.intervalEnd, persisted)
    if (!hit) return col
    const buckets = bucketsFromPersisted(hit)
    if (buckets.length === 0) return col
    return {
      ...col,
      buckets,
      refMid: hit.m && hit.m > 0 ? hit.m : col.refMid,
      gap: false,
      restoredCarry: true,
    }
  })
}