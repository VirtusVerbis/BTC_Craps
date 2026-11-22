/** One wall-clock coarse depth column (merged venues, absolute USD price ticks). */
export type HeatmapDepthPersistedColumn = {
  /** intervalStart */
  t0: number
  /** intervalEnd */
  t1: number
  /** Binance perp ref mid when captured */
  m?: number
  /** Sparse [snapPriceTick, usd] pairs */
  b: [number, number][]
}

export type HeatmapDepthPersistedBlob = {
  v: 1
  savedAt: number
  columns: HeatmapDepthPersistedColumn[]
}

export const HEATMAP_DEPTH_PERSIST_VERSION = 1 as const
/** Wall-clock retention for scroll-off (no rewrite of older slots). */
export const HEATMAP_DEPTH_PERSIST_MAX_MS = 60 * 60_000
/** Debounced IndexedDB writes while depth is streaming. */
export const HEATMAP_DEPTH_PERSIST_FLUSH_MS = 5_000