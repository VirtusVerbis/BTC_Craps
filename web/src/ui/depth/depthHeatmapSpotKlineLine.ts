import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { HeatmapMidPoint } from '../../data/microstructure/depthHeatmapVenueMids'
import { depthVenueColorBidTimeline } from './depthVenueTheme'
import { heatmapPriceToY, heatmapTimeToX, type HeatmapTimeRange } from './depthHeatmapCandles'

/** Binance spot close path on the session heatmap. */
export const drawHeatmapSpotKlinePolyline = (
  ctx: CanvasRenderingContext2D,
  points: readonly HeatmapMidPoint[],
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
): void => {
  if (points.length < 2 || w <= 0 || h <= 0) return

  ctx.strokeStyle = depthVenueColorBidTimeline.binanceSpot
  ctx.lineWidth = 1.75
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!
    const x = heatmapTimeToX(p.t, w, timeRange)
    const y = heatmapPriceToY(p.mid, h, axis) + 0.5
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()
}