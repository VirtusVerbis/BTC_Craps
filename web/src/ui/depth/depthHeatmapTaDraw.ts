import type { Candle } from '../../data/candles'
import type { PatternInstance } from '../../data/ta/taTypes'
import {
  TA_ANNOTATION_COLOR,
  TA_BEAR_ARROW,
  TA_BULL_ARROW,
  TA_HIGHLIGHT_COLOR,
} from '../../data/ta/taConstants'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import {
  heatmapCandleBodyWidthPx,
  heatmapPriceToY,
  heatmapTimeToX,
  type HeatmapTimeRange,
} from './depthHeatmapCandles'

const CANDLE_GREEN = '#00c853'
const CANDLE_RED = '#d50000'
const WICK_WIDTH = 1
const BODY_BORDER_WIDTH = 0.75
const MIN_BODY = 1

/** ~50% larger than original arrow head / shaft. */
const ARROW_HEAD = 11
const ARROW_LINE = 3
const ARROW_DELTA = 54

const ENVELOPE_PAD_X = 10
const ENVELOPE_PAD_Y = 8

export const highlightedOpenTimes = (instances: readonly PatternInstance[], candles: readonly Candle[]): Set<number> => {
  const out = new Set<number>()
  for (const inst of instances) {
    for (const idx of inst.candleIndices) {
      const c = candles[idx]
      if (c) out.add(c.openTime)
    }
  }
  return out
}

export const drawHeatmapCandlesWithTaHighlights = (
  ctx: CanvasRenderingContext2D,
  candles: readonly Candle[],
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  candleIntervalMs: number,
  highlightOpenTimes: ReadonlySet<number>,
): void => {
  if (candles.length === 0 || w <= 0 || h <= 0) return
  const intervalMs = Math.max(1000, candleIntervalMs)
  const span = Math.max(1, timeRange.end - timeRange.start)
  const barSpacingPx = (intervalMs / span) * w
  const candleW = heatmapCandleBodyWidthPx(barSpacingPx)
  const rowH = h / axis.rows
  const minBodyPx = Math.max(1, Math.min(MIN_BODY, rowH))
  const pad = intervalMs
  const inWindow = candles.filter(
    (c) => c.openTime >= timeRange.start - pad && c.openTime < timeRange.end + pad,
  )

  ctx.save()
  for (const c of inWindow) {
    const xCenter = heatmapTimeToX(c.openTime + intervalMs / 2, w, timeRange)
    if (xCenter < -candleW || xCenter > w + candleW) continue
    const highY = heatmapPriceToY(c.high, h, axis)
    const lowY = heatmapPriceToY(c.low, h, axis)
    const openY = heatmapPriceToY(c.open, h, axis)
    const closeY = heatmapPriceToY(c.close, h, axis)
    if (lowY > h + 4 || highY < -4) continue
    const color = c.close >= c.open ? CANDLE_GREEN : CANDLE_RED
    const highlighted = highlightOpenTimes.has(c.openTime)

    const xWick = xCenter + 0.5
    ctx.lineCap = 'butt'
    ctx.strokeStyle = highlighted ? TA_HIGHLIGHT_COLOR : color
    ctx.lineWidth = highlighted ? 2 : WICK_WIDTH
    ctx.beginPath()
    ctx.moveTo(xWick, highY)
    ctx.lineTo(xWick, lowY)
    ctx.stroke()

    const bodyTop = Math.min(openY, closeY)
    const bodyBottom = Math.max(openY, closeY)
    const bodyHeight = Math.max(bodyBottom - bodyTop, minBodyPx)
    const bodyX = xCenter - candleW / 2
    ctx.fillStyle = color
    ctx.fillRect(bodyX, bodyTop, candleW, bodyHeight)
    ctx.strokeStyle = highlighted ? TA_HIGHLIGHT_COLOR : 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = highlighted ? 1.5 : BODY_BORDER_WIDTH
    ctx.strokeRect(bodyX + 0.5, bodyTop + 0.5, candleW - 1, bodyHeight - 1)
  }
  ctx.restore()
}

const drawArrow = (
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
) => {
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = ARROW_LINE
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  const angle = Math.atan2(y1 - y0, x1 - x0)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x1 - ARROW_HEAD * Math.cos(angle - 0.4), y1 - ARROW_HEAD * Math.sin(angle - 0.4))
  ctx.lineTo(x1 - ARROW_HEAD * Math.cos(angle + 0.4), y1 - ARROW_HEAD * Math.sin(angle + 0.4))
  ctx.closePath()
  ctx.fill()
}

const drawCandleEnvelope = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  highY: number,
  lowY: number,
  candleW: number,
) => {
  const halfH = Math.max((lowY - highY) / 2 + ENVELOPE_PAD_Y, ENVELOPE_PAD_Y)
  const rx = Math.max(candleW / 2 + ENVELOPE_PAD_X, ENVELOPE_PAD_X)
  const cy = (highY + lowY) / 2
  ctx.strokeStyle = TA_ANNOTATION_COLOR
  ctx.lineWidth = 2.25
  ctx.setLineDash([])
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, halfH, 0, 0, Math.PI * 2)
  ctx.stroke()
}

export const drawHeatmapTaAnnotations = (
  ctx: CanvasRenderingContext2D,
  instances: readonly PatternInstance[],
  candles: readonly Candle[],
  w: number,
  h: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  candleIntervalMs: number,
): void => {
  if (instances.length === 0) return
  const intervalMs = Math.max(1000, candleIntervalMs)
  const span = Math.max(1, timeRange.end - timeRange.start)
  const barSpacingPx = (intervalMs / span) * w
  const candleW = heatmapCandleBodyWidthPx(barSpacingPx)
  ctx.save()
  const enveloped = new Set<number>()
  const drawnAnchors = new Set<number>()

  for (const inst of instances) {
    for (const candleIndex of inst.candleIndices) {
      if (enveloped.has(candleIndex)) continue
      enveloped.add(candleIndex)
      const fc = candles[candleIndex]
      if (!fc) continue
      const fx = heatmapTimeToX(fc.openTime + intervalMs / 2, w, timeRange)
      const highY = heatmapPriceToY(fc.high, h, axis)
      const lowY = heatmapPriceToY(fc.low, h, axis)
      if (lowY > h + 8 || highY < -8) continue
      drawCandleEnvelope(ctx, fx, highY, lowY, candleW)
    }

    if (drawnAnchors.has(inst.anchorIndex) && instances.length > 8) continue
    drawnAnchors.add(inst.anchorIndex)
    const c = candles[inst.anchorIndex]
    if (!c) continue
    const x = heatmapTimeToX(c.openTime + intervalMs / 2, w, timeRange)
    const anchorY = heatmapPriceToY(inst.anchorPrice, h, axis)

    for (const f of inst.features) {
      const fc = candles[f.candleIndex]
      if (!fc) continue
      const fx = heatmapTimeToX(fc.openTime + intervalMs / 2, w, timeRange)
      const fy = heatmapPriceToY(f.price, h, axis)
      ctx.strokeStyle = TA_HIGHLIGHT_COLOR
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(fx, fy, 11, 0, Math.PI * 2)
      ctx.stroke()
    }

    let color = TA_ANNOTATION_COLOR
    let x1 = x
    let y1 = anchorY
    if (inst.arrow === 'up') {
      color = TA_BULL_ARROW
      y1 = anchorY - ARROW_DELTA
    } else if (inst.arrow === 'down') {
      color = TA_BEAR_ARROW
      y1 = anchorY + ARROW_DELTA
    } else if (inst.arrow === 'diagonalUp') {
      color = TA_BULL_ARROW
      x1 = x + ARROW_DELTA
      y1 = anchorY - ARROW_DELTA
    } else if (inst.arrow === 'diagonalDown') {
      color = TA_BEAR_ARROW
      x1 = x + ARROW_DELTA
      y1 = anchorY + ARROW_DELTA
    }
    if (inst.arrow !== 'none') {
      drawArrow(ctx, x, anchorY, x1, y1, color)
    }
  }
  ctx.restore()
}