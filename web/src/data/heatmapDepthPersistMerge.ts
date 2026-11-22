import { carriedUsdPerColumnForRow } from './microstructure/depthHeatmapCarriedPaint'
import { priceAtRowCenter, type HeatmapPriceAxis } from './microstructure/depthHeatmapPriceAxis'
import type { PriceBucket } from './microstructure/depthHeatmapPriceBins'
import type { HeatmapGridColumn } from './microstructure/depthSessionHeatmapGrid'
import { HEATMAP_DEPTH_PERSIST_MAX_COLUMNS, HEATMAP_DEPTH_PERSIST_MAX_MS } from './heatmapDepthPersistTypes'
import type { HeatmapDepthPersistedColumn } from './heatmapDepthPersistTypes'

const bucketsFromPersisted = (b: HeatmapDepthPersistedColumn): PriceBucket[] =>
  b.b.map(([p, usd]) => ({ p, usd }))

/** O(columns × rows): one carry pass per row, then fan out to columns. */
export const heatmapDepthPersistedCarriedFromGrid = (
  columns: readonly HeatmapGridColumn[],
  axis: HeatmapPriceAxis,
): HeatmapDepthPersistedColumn[] => {
  const colCount = columns.length
  if (colCount === 0 || axis.rows <= 0) return []
  const sparse: [number, number][][] = Array.from({ length: colCount }, () => [])
  for (let row = 0; row < axis.rows; row++) {
    const carried = carriedUsdPerColumnForRow(columns, row, axis)
    const p = priceAtRowCenter(row, axis)
    for (let i = 0; i < colCount; i++) {
      const usd = carried[i]!
      if (usd <= 0) continue
      sparse[i]!.push([p, usd])
    }
  }
  const out: HeatmapDepthPersistedColumn[] = []
  for (let i = 0; i < colCount; i++) {
    const col = columns[i]!
    const b = sparse[i]!
    if (col.gap || b.length === 0) continue
    out.push({
      t0: col.intervalStart,
      t1: col.intervalEnd,
      m: col.refMid > 0 ? col.refMid : undefined,
      b,
    })
  }
  return out
}

export const syncPersistedDepthByT0 = (
  byT0: Map<number, HeatmapDepthPersistedColumn>,
  columns: readonly HeatmapDepthPersistedColumn[],
): void => {
  byT0.clear()
  for (const c of columns) byT0.set(c.t0, c)
}

/** Persisted columns overlapping the visible chart window (avoids scanning full 24h list per slot). */
export const persistedDepthOverlappingWindow = (
  byT0: ReadonlyMap<number, HeatmapDepthPersistedColumn>,
  rangeStart: number,
  rangeEnd: number,
): HeatmapDepthPersistedColumn[] => {
  const out: HeatmapDepthPersistedColumn[] = []
  for (const c of byT0.values()) {
    if (c.t0 < rangeEnd && c.t1 > rangeStart && c.b.length > 0) out.push(c)
  }
  return out
}

/** Incremental in-memory index update (paint path); trim time + cap. */
export const mergeIncomingPersistedDepthByT0 = (
  byT0: Map<number, HeatmapDepthPersistedColumn>,
  incoming: readonly HeatmapDepthPersistedColumn[],
  now = Date.now(),
): void => {
  const minT1 = now - HEATMAP_DEPTH_PERSIST_MAX_MS
  for (const c of incoming) {
    if (c.b.length > 0) byT0.set(c.t0, c)
  }
  for (const [t0, c] of byT0) {
    if (c.t1 <= minT1) byT0.delete(t0)
  }
  if (byT0.size <= HEATMAP_DEPTH_PERSIST_MAX_COLUMNS) return
  const sortedT0 = [...byT0.keys()].sort((a, b) => a - b)
  const drop = sortedT0.length - HEATMAP_DEPTH_PERSIST_MAX_COLUMNS
  for (let i = 0; i < drop; i++) byT0.delete(sortedT0[i]!)
}

/** Keep newest columns when over {@link HEATMAP_DEPTH_PERSIST_MAX_COLUMNS}. */
export const capPersistedDepthColumns = (
  columns: readonly HeatmapDepthPersistedColumn[],
  maxColumns = HEATMAP_DEPTH_PERSIST_MAX_COLUMNS,
): HeatmapDepthPersistedColumn[] => {
  const sorted = [...columns].sort((a, b) => a.t0 - b.t0)
  if (sorted.length <= maxColumns) return sorted
  return sorted.slice(sorted.length - maxColumns)
}

export const trimPersistedColumnsWallClock = (
  columns: readonly HeatmapDepthPersistedColumn[],
  now = Date.now(),
  maxAgeMs = HEATMAP_DEPTH_PERSIST_MAX_MS,
): HeatmapDepthPersistedColumn[] => {
  const minT0 = now - maxAgeMs
  const inWindow = columns.filter((c) => c.t1 > minT0)
  return capPersistedDepthColumns(inWindow)
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
  return capPersistedDepthColumns([...byT0.values()], HEATMAP_DEPTH_PERSIST_MAX_COLUMNS)
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