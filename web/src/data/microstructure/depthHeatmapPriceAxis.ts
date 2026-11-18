import {
  HEATMAP_PRICE_AXIS_MIN_HALF_BPS,
  HEATMAP_PRICE_AXIS_PAD_PCT,
  HEATMAP_PRICE_MAX_ROWS,
  HEATMAP_PRICE_TICK_USD,
  type PriceBucket,
  snapPriceTick,
} from './depthHeatmapPriceBins'

export type HeatmapPriceAxis = {
  priceMin: number
  priceMax: number
  tick: number
  rows: number
}

export type HeatmapPriceAxisOpts = {
  minHalfBps?: number
}

const snapDown = (price: number, tick: number): number => Math.floor(price / tick) * tick
const snapUp = (price: number, tick: number): number => Math.ceil(price / tick) * tick

/** Y range from depth prices, mids, optional OHLC, and padding (tick-aligned). */
export const heatmapPriceAxis = (
  extentPrices: readonly number[],
  refMids: readonly number[],
  tick = HEATMAP_PRICE_TICK_USD,
  opts?: HeatmapPriceAxisOpts,
): HeatmapPriceAxis => {
  let lo = Infinity
  let hi = -Infinity
  for (const mid of refMids) {
    if (mid > 0) {
      lo = Math.min(lo, mid)
      hi = Math.max(hi, mid)
    }
  }
  for (const p of extentPrices) {
    if (p > 0) {
      lo = Math.min(lo, p)
      hi = Math.max(hi, p)
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    const fallback = 100_000
    lo = fallback - tick * 10
    hi = fallback + tick * 10
  }
  const center = (lo + hi) / 2
  const dataHalf = Math.max(tick, (hi - lo) / 2)
  const minHalfBps = opts?.minHalfBps ?? HEATMAP_PRICE_AXIS_MIN_HALF_BPS
  const minHalf = (center * minHalfBps) / 10_000
  let half = Math.max(dataHalf, minHalf)
  if (extentPrices.length > 0 && dataHalf > tick) {
    const floor = dataHalf * 1.06
    const ceiling = dataHalf * 1.75
    half = Math.max(floor, Math.min(half, ceiling))
  }
  lo = center - half
  hi = center + half
  const span = Math.max(tick, hi - lo)
  const pad = span * HEATMAP_PRICE_AXIS_PAD_PCT + tick * 3
  let priceMin = snapDown(lo - pad, tick)
  let priceMax = snapUp(hi + pad, tick)
  let rows = Math.max(4, Math.round((priceMax - priceMin) / tick))

  let effTick = tick
  if (rows > HEATMAP_PRICE_MAX_ROWS) {
    effTick = tick * Math.ceil(rows / HEATMAP_PRICE_MAX_ROWS)
    priceMin = snapDown(lo - pad, effTick)
    priceMax = snapUp(hi + pad, effTick)
    rows = Math.max(4, Math.round((priceMax - priceMin) / effTick))
    priceMax = priceMin + rows * effTick
  } else {
    priceMax = priceMin + rows * tick
  }

  return { priceMin, priceMax, tick: effTick, rows }
}

export const rowIndexForPrice = (price: number, axis: HeatmapPriceAxis): number => {
  const row = Math.floor((axis.priceMax - price) / axis.tick + 1e-6)
  if (row < 0 || row >= axis.rows) return -1
  return row
}

export const maxUsdInBuckets = (buckets: readonly PriceBucket[]): number => {
  let max = 1
  for (const b of buckets) max = Math.max(max, b.usd)
  return max
}

export const priceAtRowCenter = (row: number, axis: HeatmapPriceAxis): number =>
  snapPriceTick(axis.priceMax - (row + 0.5) * axis.tick, axis.tick)