import type { BookLevel } from './types'

/** USD price lattice step for the session heatmap (Coinglass-style Y; finer ⇒ thinner full bands). */
export const HEATMAP_PRICE_TICK_USD = 6
/** Default near-mid band at baseline chart height (see heatmapViewportForChartHeight). */
export const HEATMAP_PRICE_BAND_BPS = 180
/** Widest band stored on each depth sample so the heatmap can zoom out when the chart grows. */
export const HEATMAP_PRICE_BAND_BPS_MAX = 400
/** Extra price slack above/below data (depth + candles). */
export const HEATMAP_PRICE_AXIS_PAD_PCT = 0.012
/** Minimum half-span around center when range is tight (~±35 bps at $100k). */
export const HEATMAP_PRICE_AXIS_MIN_HALF_BPS = 35
/** Upper cap for viewport-driven Y minimum half-span (modest; depth band can be wider). */
export const HEATMAP_PRICE_AXIS_MIN_HALF_BPS_MAX = 68
/** Cap before Y tick coarsens; higher ⇒ thinner rows at fixed chart height (Coinglass-style density). */
export const HEATMAP_PRICE_MAX_ROWS = 640
/** Nearest off-view pool labels / edge tint on the session heatmap (merged venues, latest book). */
export const HEATMAP_OFFRANGE_MIN_USD = 1_000_000

export type PriceBucket = { p: number; usd: number }

export const snapPriceTick = (price: number, tick = HEATMAP_PRICE_TICK_USD): number =>
  Math.round(price / tick) * tick

const bpsFromMid = (mid: number, price: number): number => {
  if (!(mid > 0)) return Infinity
  return (Math.abs(price - mid) / mid) * 10_000
}

/** Resting USD at absolute tick-aligned prices (bid + ask combined per level). */
export const binBookToPriceBuckets = (
  mid: number,
  bids: readonly BookLevel[],
  asks: readonly BookLevel[],
  tick = HEATMAP_PRICE_TICK_USD,
  bandBps = HEATMAP_PRICE_BAND_BPS,
): PriceBucket[] => {
  if (!(mid > 0)) return []
  const map = new Map<number, number>()
  const ingest = (levels: readonly BookLevel[]) => {
    for (const l of levels) {
      if (bpsFromMid(mid, l.price) > bandBps) continue
      const p = snapPriceTick(l.price, tick)
      map.set(p, (map.get(p) ?? 0) + l.price * l.size)
    }
  }
  ingest(bids)
  ingest(asks)
  const out: PriceBucket[] = []
  for (const [p, usd] of map) {
    if (usd > 0) out.push({ p, usd })
  }
  out.sort((a, b) => a.p - b.p)
  return out
}

export const mergePriceBuckets = (lists: readonly PriceBucket[][]): PriceBucket[] => {
  const map = new Map<number, number>()
  for (const buckets of lists) {
    for (const b of buckets) {
      map.set(b.p, (map.get(b.p) ?? 0) + b.usd)
    }
  }
  return [...map.entries()]
    .filter(([, usd]) => usd > 0)
    .map(([p, usd]) => ({ p, usd }))
    .sort((a, b) => a.p - b.p)
}