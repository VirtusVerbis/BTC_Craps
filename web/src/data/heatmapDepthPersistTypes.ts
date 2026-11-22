export const HEATMAP_DEPTH_PERSIST_VERSION = 2 as const

/** One wall-clock coarse depth column (merged venues, absolute USD price ticks). */
export type HeatmapDepthPersistedColumn = {
  /** intervalStart */
  t0: number
  /** intervalEnd */
  t1: number
  /** Binance perp ref mid when captured */
  m?: number
  /** Sparse [priceTick, carriedPaintUsd] — paint value after time carry at capture (v2+). */
  b: [number, number][]
}

export type HeatmapDepthPersistedBlob = {
  v: typeof HEATMAP_DEPTH_PERSIST_VERSION
  savedAt: number
  columns: HeatmapDepthPersistedColumn[]
}

/** Rolling wall-clock depth cache (visit segments; gaps empty on chart). */
export const HEATMAP_DEPTH_PERSIST_MAX_MS = 24 * 60 * 60_000
/**
 * FIFO backstop when the tab stays open (~24h at 10s coarse slots).
 * Oldest `t0` dropped after time trim.
 */
export const HEATMAP_DEPTH_PERSIST_MAX_COLUMNS = 10_000
/** Debounced IndexedDB writes while depth is streaming. */
export const HEATMAP_DEPTH_PERSIST_FLUSH_MS = 5_000