import { heatmapCandleBarMs, type HeatmapTimelineWindowMin } from './heatmapCandleSeries'
import {
  candleOpenTimeMs,
  type HeatmapVenueMidFetchBounds,
  type VenueMidHistory,
} from './heatmapVenueMidHistory'
import { fetchHeatmapVenueMidHistory } from './heatmapVenueMidHistory'

/** How long cached mid-line history is reused before a full REST refetch. */
export const HEATMAP_VENUE_MID_CACHE_TTL_MS = 180_000
/** Background check interval (skips network when cache is still fresh). */
export const HEATMAP_VENUE_MID_POLL_MS = HEATMAP_VENUE_MID_CACHE_TTL_MS

const CACHE_VERSION = 7

/** `localStorage` key for a heatmap window — e.g. `btc_depth_heatmap_mid_v6_15`. */
export const heatmapVenueMidStorageKey = (windowMin: HeatmapTimelineWindowMin): string =>
  `btc_depth_heatmap_mid_v${CACHE_VERSION}_${windowMin}`
const storageKey = heatmapVenueMidStorageKey

/** True when any venue has at least two OHLC bars (write / paint gate). */
export const venueMidHistoryHasBars = (history: VenueMidHistory): boolean => {
  for (const candles of Object.values(history)) {
    if (candles && candles.length >= 2) return true
  }
  return false
}

/** Reject cached series whose bar timestamps are nowhere near `referenceMs`. */
export const venueMidHistoryHasSeries = (
  history: VenueMidHistory,
  referenceMs = Date.now(),
  windowMin: HeatmapTimelineWindowMin = 60,
): boolean => {
  if (!venueMidHistoryHasBars(history)) return false
  const maxSkewAhead = 5 * 60_000
  const maxSeriesAge = windowMin * 60_000 + 15 * 60_000
  const ref = referenceMs > 0 ? referenceMs : Date.now()
  for (const candles of Object.values(history)) {
    if (!candles || candles.length < 2) continue
    const times = candles
      .map((c) => candleOpenTimeMs(c.openTime))
      .filter((t) => t > 0)
      .sort((a, b) => a - b)
    if (times.length < 2) continue
    const newest = times[times.length - 1]!
    const oldest = times[0]!
    if (newest > ref + maxSkewAhead) continue
    if (newest < ref - maxSeriesAge) continue
    if (oldest > ref + maxSkewAhead) continue
    return true
  }
  return false
}

type StoredVenueMidCache = {
  v: typeof CACHE_VERSION
  savedAt: number
  windowMin: HeatmapTimelineWindowMin
  barMs: number
  history: VenueMidHistory
}

const readStored = (windowMin: HeatmapTimelineWindowMin): StoredVenueMidCache | null => {
  try {
    const raw = localStorage.getItem(storageKey(windowMin))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredVenueMidCache
    if (parsed?.v !== CACHE_VERSION || parsed.windowMin !== windowMin) return null
    if (!parsed.history || typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

const writeStored = (windowMin: HeatmapTimelineWindowMin, barMs: number, history: VenueMidHistory, savedAt: number): void => {
  const payload: StoredVenueMidCache = {
    v: CACHE_VERSION,
    savedAt,
    windowMin,
    barMs,
    history,
  }
  try {
    localStorage.setItem(storageKey(windowMin), JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

/** Cached history for instant paint; null if missing or bar size mismatch. */
export const readVenueMidHistoryCache = (
  windowMin: HeatmapTimelineWindowMin,
  barMs = heatmapCandleBarMs(windowMin),
): VenueMidHistory | null => {
  const stored = readStored(windowMin)
  if (!stored || stored.barMs !== barMs) return null
  if (!venueMidHistoryHasSeries(stored.history, stored.savedAt, windowMin)) return null
  return stored.history
}

export const isVenueMidHistoryCacheFresh = (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
  barMs = heatmapCandleBarMs(windowMin),
  ttlMs = HEATMAP_VENUE_MID_CACHE_TTL_MS,
): boolean => {
  const stored = readStored(windowMin)
  if (!stored || stored.barMs !== barMs) return false
  if (!venueMidHistoryHasSeries(stored.history, now, windowMin)) return false
  return now - stored.savedAt < ttlMs
}

/**
 * Use browser localStorage when fresh; otherwise full-window REST backfill and update cache.
 * Live book mids still refresh the right edge on each heatmap draw.
 */
export const loadHeatmapVenueMidHistoryWithCache = async (
  windowMin: HeatmapTimelineWindowMin,
  bounds?: HeatmapVenueMidFetchBounds,
  now = Date.now(),
): Promise<VenueMidHistory> => {
  const barMs = heatmapCandleBarMs(windowMin)
  if (isVenueMidHistoryCacheFresh(windowMin, now, barMs)) {
    const hit = readVenueMidHistoryCache(windowMin, barMs)
    if (hit) return hit
  }

  const fresh = await fetchHeatmapVenueMidHistory(windowMin, bounds ?? { startMs: now - windowMin * 60_000, endMs: now })
  if (venueMidHistoryHasBars(fresh)) {
    writeStored(windowMin, barMs, fresh, now)
  }
  return fresh
}

/** Stale-while-revalidate: may return cached history immediately via `onCached`. */
export const loadHeatmapVenueMidHistoryWithCacheSWR = async (
  windowMin: HeatmapTimelineWindowMin,
  onCached: (history: VenueMidHistory) => void,
  bounds?: HeatmapVenueMidFetchBounds,
  now = Date.now(),
): Promise<VenueMidHistory> => {
  const barMs = heatmapCandleBarMs(windowMin)
  const cached = readVenueMidHistoryCache(windowMin, barMs)
  if (cached) onCached(cached)

  if (isVenueMidHistoryCacheFresh(windowMin, now, barMs) && cached) {
    return cached
  }

  const fetchBounds = bounds ?? { startMs: now - windowMin * 60_000, endMs: now }
  const fresh = await fetchHeatmapVenueMidHistory(windowMin, fetchBounds)
  if (venueMidHistoryHasBars(fresh)) {
    writeStored(windowMin, barMs, fresh, now)
  }
  return fresh
}