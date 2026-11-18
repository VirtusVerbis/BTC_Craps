import type { Candle } from '../../data/candles'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'

const CANDLE_GREEN = '#00c853'
const CANDLE_RED = '#d50000'
const CANDLE_BORDER = 'rgba(0, 0, 0, 0.92)'
const WICK_WIDTH = 1.25
const WICK_BORDER_EXTRA = 1.1
const BODY_BORDER_WIDTH = 1
const MIN_BODY = 1.5

export type HeatmapTimeRange = { start: number; end: number }

export const heatmapTimeToX = (t: number, w: number, range: HeatmapTimeRange): number => {
  const span = Math.max(1, range.end - range.start)
  return ((t - range.start) / span) * w
}

const priceToY = (price: number, h: number, axis: HeatmapPriceAxis): number => {
  const rowH = h / axis.rows
  const row = (axis.priceMax - price) / axis.tick
  return row * rowH
}

const CANDLE_BODY_SLOT_FILL = 0.9
/** vs tight slot fill (`spacing * 0.9 - 0.5`): 0.7 prior, ×0.7 again = ~30% narrower bodies. */
export const HEATMAP_CANDLE_WIDTH_SCALE = 0.49

/** Body width from actual bar center spacing so 15m / 30m / 60m stay aligned with series density. */
export const heatmapCandleBodyWidthPx = (barSpacingPx: number): number => {
  if (!(barSpacingPx > 0)) return 2
  const base = barSpacingPx * CANDLE_BODY_SLOT_FILL - 0.5
  const body = base * HEATMAP_CANDLE_WIDTH_SCALE
  return Math.max(2, Math.min(body, barSpacingPx - 0.75))
}

/** Binance 1m spot klines in the same price/time space as the depth heatmap. */
export const drawHeatmapCandleOverlay = (
  ctx: CanvasRenderingContext2D,
  candles: readonly Candle[],
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  candleIntervalMs: number,
): void => {
  if (candles.length === 0 || w <= 0 || h <= 0) return
  const intervalMs = Math.max(1000, candleIntervalMs)
  const span = Math.max(1, timeRange.end - timeRange.start)
  const barSpacingPx = (intervalMs / span) * w
  const candleW = heatmapCandleBodyWidthPx(barSpacingPx)

  const pad = intervalMs
  const inWindow = candles.filter(
    (c) => c.openTime >= timeRange.start - pad && c.openTime < timeRange.end + pad,
  )
  if (inWindow.length === 0) return

  ctx.save()
  for (const c of inWindow) {
    const xCenter = heatmapTimeToX(c.openTime + intervalMs / 2, w, timeRange)
    if (xCenter < -candleW || xCenter > w + candleW) continue

    const highY = priceToY(c.high, h, axis)
    const lowY = priceToY(c.low, h, axis)
    const openY = priceToY(c.open, h, axis)
    const closeY = priceToY(c.close, h, axis)
    if (!Number.isFinite(highY) || !Number.isFinite(lowY)) continue
    if (lowY > h + 4 || highY < -4) continue

    const color = c.close >= c.open ? CANDLE_GREEN : CANDLE_RED
    const xWick = xCenter + 0.5
    ctx.lineCap = 'butt'
    ctx.strokeStyle = CANDLE_BORDER
    ctx.lineWidth = WICK_WIDTH + WICK_BORDER_EXTRA
    ctx.beginPath()
    ctx.moveTo(xWick, highY)
    ctx.lineTo(xWick, lowY)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = WICK_WIDTH
    ctx.beginPath()
    ctx.moveTo(xWick, highY)
    ctx.lineTo(xWick, lowY)
    ctx.stroke()

    const bodyTop = Math.min(openY, closeY)
    const bodyBottom = Math.max(openY, closeY)
    const bodyHeight = Math.max(MIN_BODY, bodyBottom - bodyTop)
    const bodyX = xCenter - candleW / 2
    ctx.fillStyle = color
    ctx.fillRect(bodyX, bodyTop, candleW, bodyHeight)
    ctx.strokeStyle = CANDLE_BORDER
    ctx.lineWidth = BODY_BORDER_WIDTH
    ctx.strokeRect(bodyX + 0.5, bodyTop + 0.5, candleW - 1, bodyHeight - 1)
  }
  ctx.restore()
}