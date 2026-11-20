import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import {
  HEATMAP_VENUE_MID_LINE_VENUES,
  type HeatmapVenueMidPolylines,
} from '../../data/microstructure/depthHeatmapVenueMids'
import type { VenueId } from '../../data/microstructure/types'
import { depthVenueColorBidTimeline } from './depthVenueTheme'
import { heatmapPriceToY, heatmapTimeToX, type HeatmapTimeRange } from './depthHeatmapCandles'

const midLineStroke = (venue: VenueId): string => {
  const raw = depthVenueColorBidTimeline[venue]
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(raw)
  if (!m) return 'rgba(255, 255, 255, 0.75)'
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, 0.92)`
}

/** Venue mid paths over the depth grid (under Binance spot candles). */
export const drawHeatmapVenueMidPolylines = (
  ctx: CanvasRenderingContext2D,
  polylines: HeatmapVenueMidPolylines,
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  venues: readonly VenueId[] = HEATMAP_VENUE_MID_LINE_VENUES,
): void => {
  ctx.lineWidth = 1.75
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  for (const venue of venues) {
    const segments = polylines[venue] ?? []
    if (segments.length === 0) continue
    ctx.strokeStyle = midLineStroke(venue)
    for (const seg of segments) {
      if (seg.length < 2) continue
      ctx.beginPath()
      for (let i = 0; i < seg.length; i++) {
        const p = seg[i]!
        const x = heatmapTimeToX(p.t, w, timeRange)
        const y = heatmapPriceToY(p.mid, h, axis) + 0.5
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }
}