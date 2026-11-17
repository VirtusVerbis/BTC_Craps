import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { rowIndexForPrice } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import { heatmapColor01 } from './depthHeatmapColor'
import { heatmapTimeToX } from './depthHeatmapCandles'

const usdInRowForColumn = (column: HeatmapGridColumn, row: number, axis: HeatmapPriceAxis): number | null => {
  let usdInRow = 0
  let any = false
  for (const b of column.buckets) {
    if (rowIndexForPrice(b.p, axis) === row) {
      usdInRow += b.usd
      any = true
    }
  }
  return any ? usdInRow : null
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
      carriedUsd = inRow ?? 0
    }
    out.push(carriedUsd)
  }
  return out
}

/** Per price row: carry USD/color left→right; gap columns keep carry; new sample clears row when no liquidity at that tick. */
export const drawDraggedHeatmapDepth = (
  ctx: CanvasRenderingContext2D,
  columns: readonly HeatmapGridColumn[],
  w: number,
  h: number,
  maxVal: number,
  axis: HeatmapPriceAxis,
  timeRange: { start: number; end: number },
): void => {
  const rowH = h / axis.rows

  for (let row = 0; row < axis.rows; row++) {
    const carried = carriedUsdPerColumnForRow(columns, row, axis)
    for (let i = 0; i < columns.length; i++) {
      const carriedUsd = carried[i]!
      if (carriedUsd <= 0) continue
      const column = columns[i]!
      const x0 = heatmapTimeToX(column.intervalStart, w, timeRange)
      const x1 = heatmapTimeToX(column.intervalEnd, w, timeRange)
      const cellW = Math.max(1, x1 - x0)
      if (x1 < 0 || x0 > w) continue
      ctx.fillStyle = heatmapColor01(carriedUsd / maxVal)
      ctx.fillRect(x0, row * rowH, cellW, rowH)
    }
  }
}