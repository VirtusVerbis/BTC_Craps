import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { DailyMaCross, DailyMaPolylines } from '../../data/heatmapDailySma'
import {
  HEATMAP_DAILY_MA_COLOR_200,
  HEATMAP_DAILY_MA_COLOR_50,
} from '../../data/heatmapDailySma'
import { heatmapPriceToY, heatmapTimeToX, type HeatmapTimeRange } from './depthHeatmapCandles'

const drawDashedPolyline = (
  ctx: CanvasRenderingContext2D,
  points: readonly { t: number; mid: number }[],
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  stroke: string,
  lineWidth: number,
  dash: readonly number[],
): void => {
  if (points.length < 2 || w <= 0 || h <= 0) return
  ctx.save()
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.setLineDash([...dash])
  ctx.beginPath()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const x = heatmapTimeToX(p.t, w, timeRange)
    const y = heatmapPriceToY(p.mid, h, axis) + 0.5
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
  ctx.restore()
}

/** Daily 50D / 200D SMA (dashed); 200D drawn under 50D. */
export const drawHeatmapDailyMaPolylines = (
  ctx: CanvasRenderingContext2D,
  polylines: DailyMaPolylines,
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
): void => {
  drawDashedPolyline(
    ctx,
    polylines.sma200,
    w,
    h,
    axis,
    timeRange,
    HEATMAP_DAILY_MA_COLOR_200,
    2,
    [5, 5],
  )
  drawDashedPolyline(
    ctx,
    polylines.sma50,
    w,
    h,
    axis,
    timeRange,
    HEATMAP_DAILY_MA_COLOR_50,
    2.25,
    [14, 7],
  )
}

const CROSS_GOLDEN = 'rgba(255, 193, 7, 0.85)'
const CROSS_DEATH = 'rgba(244, 67, 54, 0.85)'

/** Vertical accent at the cross UTC day when it intersects the window. */
export const drawHeatmapDailyMaCrossMarker = (
  ctx: CanvasRenderingContext2D,
  cross: DailyMaCross | null,
  w: number,
  h: number,
  timeRange: HeatmapTimeRange,
): void => {
  if (!cross || w <= 0 || h <= 0) return
  const x = heatmapTimeToX(cross.dayOpenMs, w, timeRange)
  if (x < -4 || x > w + 4) return
  ctx.save()
  ctx.strokeStyle = cross.kind === 'golden' ? CROSS_GOLDEN : CROSS_DEATH
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(x + 0.5, 0)
  ctx.lineTo(x + 0.5, h)
  ctx.stroke()
  ctx.restore()
}