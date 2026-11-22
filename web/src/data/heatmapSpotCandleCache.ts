import type { Candle } from './candles'
import {
  displayCandlesFrom1s,
  fetchHeatmapSpot1sFullWindow,
  fetchHeatmapSpot1sSegment,
  fetchHeatmapTimelineCandles,
  heatmapCandleBarMs,
  heatmapSpotWindowStartMs,
  mergeHeatmapSpot1sCandles,
  mergeHeatmapSpotCandles,
  type HeatmapTimelineWindowMin,
} from './heatmapCandleSeries'

/** Skip full-window REST while younger than this (15m/30m 1s backfill or cold 60m load). */
export const HEATMAP_SPOT_CANDLE_CACHE_TTL_MS = 45_000
/** Incremental 1s / 1m tail pulls on this cadence even when full cache is fresh (~4/min). */
export const HEATMAP_SPOT_CANDLE_TAIL_POLL_MS = 15_000

const CACHE_VERSION = 2

const storageKey = (windowMin: HeatmapTimelineWindowMin): string =>
  `btc_depth_heatmap_spot_v${CACHE_VERSION}_${windowMin}`

type StoredSpotCache = {
  v: typeof CACHE_VERSION
  savedAt: number
  windowMin: HeatmapTimelineWindowMin
  barMs: number
  candles: Candle[]
  /** 1s source rows for 15m/30m density; omitted on 60m. */
  raw1s?: Candle[]
}

const readStored = (windowMin: HeatmapTimelineWindowMin): StoredSpotCache | null => {
  try {
    const raw = localStorage.getItem(storageKey(windowMin))
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSpotCache
    if (parsed?.v !== CACHE_VERSION || parsed.windowMin !== windowMin) return null
    if (!Array.isArray(parsed.candles) || typeof parsed.savedAt !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

const writeStored = (
  windowMin: HeatmapTimelineWindowMin,
  barMs: number,
  candles: Candle[],
  savedAt: number,
  raw1s?: Candle[],
): void => {
  const payload: StoredSpotCache = { v: CACHE_VERSION, savedAt, windowMin, barMs, candles, raw1s }
  try {
    localStorage.setItem(storageKey(windowMin), JSON.stringify(payload))
  } catch {
    /* quota / private mode */
  }
}

const storedUsable = (stored: StoredSpotCache | null, barMs: number, windowMin: HeatmapTimelineWindowMin): boolean => {
  if (!stored || stored.barMs !== barMs) return false
  if (stored.candles.length < 2) return false
  if (windowMin !== 60 && (!stored.raw1s || stored.raw1s.length < 10)) return false
  return true
}

export const readHeatmapSpotCandleCache = (
  windowMin: HeatmapTimelineWindowMin,
  barMs = heatmapCandleBarMs(windowMin),
): Candle[] | null => {
  const stored = readStored(windowMin)
  if (!storedUsable(stored, barMs, windowMin)) return null
  return stored!.candles
}

export const isHeatmapSpotCandleCacheFresh = (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
  barMs = heatmapCandleBarMs(windowMin),
  ttlMs = HEATMAP_SPOT_CANDLE_CACHE_TTL_MS,
): boolean => {
  const stored = readStored(windowMin)
  if (!storedUsable(stored, barMs, windowMin)) return false
  return now - stored!.savedAt < ttlMs
}

export const isHeatmapSpotTailRefreshDue = (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
  barMs = heatmapCandleBarMs(windowMin),
  tailMs = HEATMAP_SPOT_CANDLE_TAIL_POLL_MS,
): boolean => {
  const stored = readStored(windowMin)
  if (!storedUsable(stored, barMs, windowMin)) return true
  return now - stored!.savedAt >= tailMs
}

const refreshSubHourSpot = async (
  windowMin: HeatmapTimelineWindowMin,
  prior: StoredSpotCache | null,
  now: number,
  forceFullWindow: boolean,
): Promise<{ candles: Candle[]; raw1s: Candle[] }> => {
  const barMs = heatmapCandleBarMs(windowMin)
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)
  const prior1s = prior?.raw1s ?? []

  let raw1s: Candle[]
  const last1s = prior1s[prior1s.length - 1]?.openTime
  if (!forceFullWindow && prior1s.length >= 10 && last1s != null && last1s > windowStart) {
    const tailStart = Math.max(windowStart, last1s - 5_000)
    const segment = await fetchHeatmapSpot1sSegment(windowMin, tailStart, now)
    raw1s = mergeHeatmapSpot1sCandles(windowStart, prior1s, segment, now)
  } else {
    raw1s = await fetchHeatmapSpot1sFullWindow(windowMin, now)
  }

  const candles = displayCandlesFrom1s(windowMin, raw1s, now)
  if (candles.length < 2) {
    const fallback = await fetchHeatmapTimelineCandles(windowMin, now)
    return { candles: fallback, raw1s }
  }
  return { candles, raw1s }
}

const refreshHourSpot = async (
  windowMin: HeatmapTimelineWindowMin,
  prior: StoredSpotCache | null,
  now: number,
): Promise<Candle[]> => {
  const priorCandles = prior?.candles ?? null
  const lastOpen = priorCandles?.[priorCandles.length - 1]?.openTime
  const fetchStartMs = lastOpen != null && lastOpen > 0 ? lastOpen - 60_000 : undefined
  const fresh = await fetchHeatmapTimelineCandles(
    windowMin,
    now,
    fetchStartMs != null ? { fetchStartMs } : undefined,
  )
  return mergeHeatmapSpotCandles(windowMin, priorCandles, fresh, now)
}

/** Stale-while-revalidate: paints cached candles immediately, then tail or full refresh. */
export const loadHeatmapSpotCandlesWithCacheSWR = async (
  windowMin: HeatmapTimelineWindowMin,
  onCached: (candles: Candle[]) => void,
  now = Date.now(),
): Promise<Candle[]> => {
  const barMs = heatmapCandleBarMs(windowMin)
  const stored = readStored(windowMin)
  const cached = stored?.candles ?? null
  if (cached && cached.length > 0) onCached(cached)

  const fullFresh = isHeatmapSpotCandleCacheFresh(windowMin, now, barMs)
  const tailDue = isHeatmapSpotTailRefreshDue(windowMin, now, barMs)

  if (fullFresh && !tailDue && cached) {
    return cached
  }

  const forceFullWindow = !fullFresh

  if (windowMin === 60) {
    const merged = await refreshHourSpot(windowMin, stored, now)
    if (merged.length >= 2) writeStored(windowMin, barMs, merged, now)
    return merged.length >= 2 ? merged : cached ?? merged
  }

  const { candles, raw1s } = await refreshSubHourSpot(windowMin, stored, now, forceFullWindow)
  if (candles.length >= 2) writeStored(windowMin, barMs, candles, now, raw1s)
  return candles.length >= 2 ? candles : cached ?? candles
}