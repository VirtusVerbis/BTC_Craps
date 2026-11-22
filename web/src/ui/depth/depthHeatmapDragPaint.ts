import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { usdInRowForColumn } from '../../data/microstructure/depthHeatmapCarriedPaint'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import { heatmapColor01 } from './depthHeatmapColor'

export { carriedPaintBucketsForColumnIndex, carriedUsdPerColumnForRow } from '../../data/microstructure/depthHeatmapCarriedPaint'

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
    const { y, height: segH } = heatmapRowSegmentPixelSpan(row, axis.rows, h)
    let carriedUsd = 0
    for (let i = 0; i < colCount; i++) {
      const column = columns[i]!
      let paintUsd = 0
      if (column.restoredCarry) {
        const inRow = usdInRowForColumn(column, row, axis)
        paintUsd = inRow != null && inRow > 0 ? inRow : 0
        carriedUsd = 0
      } else if (!column.gap) {
        const inRow = usdInRowForColumn(column, row, axis)
        if (inRow !== null) carriedUsd = inRow
        paintUsd = carriedUsd
      }
      if (paintUsd <= 0) continue
      const { x, width: cellW } = heatmapColumnPixelSpan(i, colCount, w)
      if (x >= w) continue
      ctx.fillStyle = heatmapColor01(paintUsd / maxVal)
      ctx.fillRect(x, y, cellW, segH)
    }
  }
}