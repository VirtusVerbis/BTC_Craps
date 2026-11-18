import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { rowIndexForPrice } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import { heatmapColor01 } from './depthHeatmapColor'

/**
 * null = no update (hold carry): empty column, gap handled by caller, or bucketed book with no tick at this row.
 * 0 = tick at this row reports zero resting USD.
 */
const usdInRowForColumn = (column: HeatmapGridColumn, row: number, axis: HeatmapPriceAxis): number | null => {
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

/** Per price row: carry USD left→right; hold until a snapshot reports USD at this price tick (including 0). */
/** Integer pixel grid so adjacent time/price tiles share edges (no sub-pixel gutters). */
const heatmapColumnPixelSpan = (col: number, colCount: number, w: number): { x: number; width: number } => {
  const x0 = Math.floor((col * w) / colCount)
  const x1 = Math.floor(((col + 1) * w) / colCount)
  return { x: x0, width: Math.max(1, x1 - x0) }
}

const heatmapRowPixelSpan = (row: number, rowCount: number, h: number): { y: number; height: number } => {
  const y0 = Math.floor((row * h) / rowCount)
  const y1 = Math.floor(((row + 1) * h) / rowCount)
  return { y: y0, height: Math.max(1, y1 - y0) }
}

/** 1 = paint full row band (no gutters); use finer Y tick for thinner stripes. */
export const HEATMAP_ROW_SEGMENT_HEIGHT_FRAC = 1

export const heatmapRowSegmentPixelSpan = (
  row: number,
  rowCount: number,
  h: number,
): { y: number; height: number } => {
  const { y, height: rowH } = heatmapRowPixelSpan(row, rowCount, h)
  const segH = Math.max(1, Math.round(rowH * HEATMAP_ROW_SEGMENT_HEIGHT_FRAC))
  const ySeg = y + Math.floor((rowH - segH) / 2)
  return { y: ySeg, height: segH }
}

export const drawDraggedHeatmapDepth = (
  ctx: CanvasRenderingContext2D,
  columns: readonly HeatmapGridColumn[],
  w: number,
  h: number,
  maxVal: number,
  axis: HeatmapPriceAxis,
  _timeRange: { start: number; end: number },
): void => {
  const colCount = columns.length
  if (colCount === 0) return

  for (let row = 0; row < axis.rows; row++) {
    const carried = carriedUsdPerColumnForRow(columns, row, axis)
    const { y, height: segH } = heatmapRowSegmentPixelSpan(row, axis.rows, h)
    for (let i = 0; i < colCount; i++) {
      const carriedUsd = carried[i]!
      if (carriedUsd <= 0) continue
      const { x, width: cellW } = heatmapColumnPixelSpan(i, colCount, w)
      if (x >= w) continue
      ctx.fillStyle = heatmapColor01(carriedUsd / maxVal)
      ctx.fillRect(x, y, cellW, segH)
    }
  }
}