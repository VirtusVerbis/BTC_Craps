import type { Candle } from './candles'
import { fetchBinanceBtcKlines } from './candles'
import { HEATMAP_DAILY_SMA_200 } from './heatmapDailySma'

/** Daily SMA input rarely changes; refresh a few times per day. */
export const HEATMAP_DAILY_SMA_CACHE_TTL_MS = 6 * 60 * 60 * 1000
export const HEATMAP_DAILY_SMA_FETCH_LIMIT = 260

const CACHE_VERSION = 1
const storageKey = (): string => `btc_depth_heatmap_daily_sma_v${CACHE_VERSION}`

type StoredDailySmaCache = {
  v: typeof CACHE_VERSION
  savedAt: number
  candles: Candle[]
}

const readStored = (): StoredDailySmaCache | null => {
  try {
    const raw = localStorage.getItem(storageKey())
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredDailySmaCache
    if (parsed?.v !== CACHE_VERSION || !Array.isArray(parsed.candles)) return null
    if (typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

const writeStored = (candles: Candle[], savedAt: number): void => {
  try {
    localStorage.setItem(storageKey(), JSON.stringify({ v: CACHE_VERSION, savedAt, candles }))
  } catch {
    /* quota */
  }
}

export const readHeatmapDailySmaCache = (): Candle[] | null => {
  const stored = readStored()
  if (!stored || stored.candles.length < HEATMAP_DAILY_SMA_200) return null
  return stored.candles
}

export const isHeatmapDailySmaCacheFresh = (now = Date.now(), ttlMs = HEATMAP_DAILY_SMA_CACHE_TTL_MS): boolean => {
  const stored = readStored()
  if (!stored || stored.candles.length < HEATMAP_DAILY_SMA_200) return false
  return now - stored.savedAt < ttlMs
}

export const loadHeatmapDailySmaWithCacheSWR = async (now = Date.now()): Promise<Candle[]> => {
  const cached = readHeatmapDailySmaCache()
  if (cached && isHeatmapDailySmaCacheFresh(now)) return cached

  const fresh = await fetchBinanceBtcKlines('1d', HEATMAP_DAILY_SMA_FETCH_LIMIT)
  if (fresh.length >= HEATMAP_DAILY_SMA_200) {
    writeStored(fresh, now)
    return fresh
  }
  return cached ?? fresh
}