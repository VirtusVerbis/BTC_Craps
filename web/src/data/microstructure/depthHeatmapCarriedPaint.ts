import { priceAtRowCenter, rowIndexForPrice, type HeatmapPriceAxis } from './depthHeatmapPriceAxis'
import type { HeatmapGridColumn } from './depthSessionHeatmapGrid'

/**
 * null = no update (hold carry): empty column, gap handled by caller, or bucketed book with no tick at this row.
 * 0 = tick at this row reports zero resting USD.
 */
export const usdInRowForColumn = (column: HeatmapGridColumn, row: number, axis: HeatmapPriceAxis): number | null => {
  if (column.buckets.length === 0) return null
  let usdInRow = 0
  let any = false
  for (const b of column.buckets) {
    if (rowIndexForPrice(b.p, axis) === row) {
      usdInRow += b.usd
      any = true
    }
  }
  if (!any) return null
  return usdInRow
}

export const carriedUsdPerColumnForRow = (
  columns: readonly HeatmapGridColumn[],
  row: number,
  axis: HeatmapPriceAxis,
): number[] => {
  let carriedUsd = 0
  const out: number[] = []
  for (const column of columns) {
    if (!column.gap) {
      const inRow = usdInRowForColumn(column, row, axis)
      if (inRow !== null) carriedUsd = inRow
    }
    out.push(carriedUsd)
  }
  return out
}

/** Carried paint USD per price row for one column (IndexedDB v2 snapshots). */
export const carriedPaintBucketsForColumnIndex = (
  colIndex: number,
  columns: readonly HeatmapGridColumn[],
  axis: HeatmapPriceAxis,
): { p: number; usd: number }[] => {
  const out: { p: number; usd: number }[] = []
  for (let row = 0; row < axis.rows; row++) {
    const carried = carriedUsdPerColumnForRow(columns, row, axis)
    const usd = carried[colIndex]!
    if (usd <= 0) continue
    out.push({ p: priceAtRowCenter(row, axis), usd })
  }
  return out
}