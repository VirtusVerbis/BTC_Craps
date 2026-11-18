import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import {
  HEATMAP_OFFRANGE_MIN_USD,
  HEATMAP_PRICE_BAND_BPS,
} from '../../data/microstructure/depthHeatmapPriceBins'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import { heatmapColor01 } from './depthHeatmapColor'

/** Top/bottom strip height as fraction of rail canvas (rest = in-view band). */
export const HEATMAP_PROFILE_OVERFLOW_FRAC = 0.12

export type OffRangeEdge = { price: number; usd: number }

export type OffRangeSummary = {
  above: OffRangeEdge | null
  below: OffRangeEdge | null
}

export const aggregateMaxUsdByPrice = (columns: readonly HeatmapGridColumn[]): Map<number, number> => {
  const map = new Map<number, number>()
  for (const col of columns) {
    if (col.gap) continue
    for (const b of col.buckets) {
      if (b.usd <= 0) continue
      map.set(b.p, Math.max(map.get(b.p) ?? 0, b.usd))
    }
  }
  return map
}

/** Most recent column that has merged depth buckets. */
export const latestHeatmapColumn = (columns: readonly HeatmapGridColumn[]): HeatmapGridColumn | null => {
  for (let i = columns.length - 1; i >= 0; i--) {
    const col = columns[i]!
    if (!col.gap && col.buckets.length > 0) return col
  }
  return null
}

export const bandPriceBoundsForMid = (refMid: number): { bandTop: number; bandBottom: number } => {
  const k = HEATMAP_PRICE_BAND_BPS / 10_000
  return { bandTop: refMid * (1 + k), bandBottom: refMid * (1 - k) }
}

export const qualifiesOffRangePool = (
  usd: number,
  minUsd: number = HEATMAP_OFFRANGE_MIN_USD,
): boolean => usd >= minUsd

/**
 * Nearest ≥ minUsd resting pool above/below mid that sits outside chart Y (latest merged book).
 */
export const nearestOffRangeLargePools = (
  column: HeatmapGridColumn | null,
  axis: HeatmapPriceAxis,
  refMid: number,
  minUsd: number = HEATMAP_OFFRANGE_MIN_USD,
): OffRangeSummary => {
  if (!column || !(refMid > 0)) return { above: null, below: null }
  const { bandTop, bandBottom } = bandPriceBoundsForMid(refMid)
  let above: OffRangeEdge | null = null
  let below: OffRangeEdge | null = null
  for (const b of column.buckets) {
    if (b.usd < minUsd) continue
    if (b.p > refMid && b.p > axis.priceMax && b.p <= bandTop) {
      if (!above || b.p < above.price) above = { price: b.p, usd: b.usd }
    } else if (b.p < refMid && b.p < axis.priceMin && b.p >= bandBottom) {
      if (!below || b.p > below.price) below = { price: b.p, usd: b.usd }
    }
  }
  return { above, below }
}

const parseRgb = (color: string): [number, number, number] | null => {
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(color)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

/** Thin top/bottom strips on the main heatmap when heavy liquidity sits outside the Y range. */
export const drawHeatmapOffRangeEdgeBleed = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  summary: OffRangeSummary,
  maxVal: number,
): void => {
  const drawStrip = (edge: OffRangeEdge | null, top: boolean) => {
    if (!edge || !qualifiesOffRangePool(edge.usd)) return
    const t = Math.min(1, edge.usd / Math.max(maxVal, edge.usd))
    const stripH = Math.min(12, Math.max(4, Math.round(3 + 7 * t)))
    const y0 = top ? 0 : h - stripH
    const rgb = parseRgb(heatmapColor01(t))
    if (!rgb) return
    const [r, g, b] = rgb
    const grad = ctx.createLinearGradient(0, y0, 0, y0 + stripH)
    if (top) {
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.92)`)
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
    } else {
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`)
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.92)`)
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, y0, w, stripH)
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.55)`
    ctx.lineWidth = 1
    const lineY = top ? y0 + stripH - 0.5 : y0 + 0.5
    ctx.beginPath()
    ctx.moveTo(0, lineY)
    ctx.lineTo(w, lineY)
    ctx.stroke()
  }
  drawStrip(summary.above, true)
  drawStrip(summary.below, false)
}

type PriceRow = { p: number; usd: number }

const splitProfileRows = (
  byPrice: Map<number, number>,
  axis: HeatmapPriceAxis,
): { above: PriceRow[]; inView: PriceRow[]; below: PriceRow[] } => {
  const above: PriceRow[] = []
  const inView: PriceRow[] = []
  const below: PriceRow[] = []
  for (const [p, usd] of byPrice) {
    const row = { p, usd }
    if (p > axis.priceMax) above.push(row)
    else if (p < axis.priceMin) below.push(row)
    else inView.push(row)
  }
  above.sort((a, b) => b.p - a.p)
  below.sort((a, b) => b.p - a.p)
  inView.sort((a, b) => b.p - a.p)
  return { above, inView, below }
}

const priceToYInMain = (price: number, axis: HeatmapPriceAxis, y0: number, bandH: number): number => {
  const span = Math.max(axis.tick, axis.priceMax - axis.priceMin)
  const t = (axis.priceMax - price) / span
  return y0 + t * bandH
}

const priceToYAbove = (price: number, priceMax: number, bandTop: number, y0: number, bandH: number): number => {
  const span = Math.max(1, bandTop - priceMax)
  const t = (bandTop - price) / span
  return y0 + t * bandH
}

const priceToYBelow = (price: number, priceMin: number, bandBottom: number, y0: number, bandH: number): number => {
  const span = Math.max(1, priceMin - bandBottom)
  const t = (priceMin - price) / span
  return y0 + t * bandH
}

const drawProfileBar = (
  ctx: CanvasRenderingContext2D,
  y: number,
  w: number,
  barW: number,
  usd: number,
  maxVal: number,
): void => {
  const intensity = usd / maxVal
  if (intensity <= 0) return
  const h = Math.max(2, Math.min(6, w * 0.35))
  ctx.fillStyle = heatmapColor01(intensity)
  ctx.fillRect(w - barW, y - h / 2, barW, h)
}

/**
 * Price × max resting USD rail: in-view band matches heatmap Y; top/bottom strips show ~180 bps band overflow.
 */
export const drawHeatmapDepthProfile = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  columns: readonly HeatmapGridColumn[],
  axis: HeatmapPriceAxis,
  maxVal: number,
  refMid: number,
  precomputedByPrice?: Map<number, number>,
): void => {
  const overflowFrac = HEATMAP_PROFILE_OVERFLOW_FRAC
  const overflowH = h * overflowFrac
  const mainY0 = overflowH
  const mainH = h - 2 * overflowH

  ctx.fillStyle = '#0a0e17'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(246, 240, 218, 0.14)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, mainY0 + 0.5)
  ctx.lineTo(w, mainY0 + 0.5)
  ctx.moveTo(0, mainY0 + mainH + 0.5)
  ctx.lineTo(w, mainY0 + mainH + 0.5)
  ctx.stroke()

  if (!(refMid > 0) || maxVal <= 0) return

  const { bandTop, bandBottom } = bandPriceBoundsForMid(refMid)
  const byPrice = precomputedByPrice ?? aggregateMaxUsdByPrice(columns)
  const { above, inView, below } = splitProfileRows(byPrice, axis)
  const maxBarW = Math.max(4, w - 2)

  for (const { p, usd } of inView) {
    const y = priceToYInMain(p, axis, mainY0, mainH)
    const barW = Math.max(1, Math.round(maxBarW * Math.min(1, usd / maxVal)))
    drawProfileBar(ctx, y, w, barW, usd, maxVal)
  }

  for (const { p, usd } of above) {
    if (p > bandTop) continue
    const y = priceToYAbove(p, axis.priceMax, bandTop, 0, overflowH)
    const barW = Math.max(1, Math.round(maxBarW * Math.min(1, usd / maxVal)))
    drawProfileBar(ctx, y, w, barW, usd, maxVal)
  }

  for (const { p, usd } of below) {
    if (p < bandBottom) continue
    const y = priceToYBelow(p, axis.priceMin, bandBottom, mainY0 + mainH, overflowH)
    const barW = Math.max(1, Math.round(maxBarW * Math.min(1, usd / maxVal)))
    drawProfileBar(ctx, y, w, barW, usd, maxVal)
  }

  const hasAbove = above.some((r) => r.p <= bandTop)
  const hasBelow = below.some((r) => r.p >= bandBottom)
  if (hasAbove || hasBelow) {
    ctx.fillStyle = 'rgba(246, 240, 218, 0.45)'
    ctx.font = `${Math.max(8, Math.round(w * 0.55))}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (hasAbove) ctx.fillText('↑', w / 2, overflowH * 0.35)
    if (hasBelow) ctx.fillText('↓', w / 2, h - overflowH * 0.35)
  }

  ctx.strokeStyle = 'rgba(246, 240, 218, 0.08)'
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1)
}