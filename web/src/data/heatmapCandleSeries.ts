import { type Candle, fetchBinanceBtc1mKlines, fetchBinanceBtcKlines } from './candles'

export type HeatmapTimelineWindowMin = 15 | 30 | 60 | 1440

/** 24h session heatmap (`windowMin` = minutes in a day). */
export const HEATMAP_WINDOW_24H_MIN = 1440 as const

/** 60m+ spot paths use 1m Binance klines instead of 1s backfill. */
export const heatmapWindowUses1mKlines = (windowMin: HeatmapTimelineWindowMin): boolean =>
  windowMin === 60 || windowMin === HEATMAP_WINDOW_24H_MIN

/** Bar period so each window fits ~60 candles across the chart (same spacing as 60m × 1m). */
export const heatmapCandleBarMs = (windowMin: HeatmapTimelineWindowMin): number => {
  const windowMs = windowMin * 60_000
  return Math.max(1000, Math.round(windowMs / 60))
}

export const aggregateCandles = (candles: readonly Candle[], bucketMs: number): Candle[] => {
  if (bucketMs <= 1000 || candles.length === 0) return [...candles]
  const byBucket = new Map<number, Candle>()
  const sorted = [...candles].sort((a, b) => a.openTime - b.openTime)
  for (const c of sorted) {
    const t = Math.floor(c.openTime / bucketMs) * bucketMs
    const existing = byBucket.get(t)
    if (!existing) {
      byBucket.set(t, { openTime: t, open: c.open, high: c.high, low: c.low, close: c.close })
    } else {
      byBucket.set(t, {
        openTime: t,
        open: existing.open,
        high: Math.max(existing.high, c.high),
        low: Math.min(existing.low, c.low),
        close: c.close,
      })
    }
  }
  return [...byBucket.values()].sort((a, b) => a.openTime - b.openTime)
}

/** Extra history beyond the visible depth window when requesting klines. */
export const HEATMAP_CANDLE_MARGIN_MS = 2 * 60_000

export const heatmapSpotKlineFetchLimit = (windowMin: HeatmapTimelineWindowMin): number =>
  windowMin === HEATMAP_WINDOW_24H_MIN
    ? Math.min(1500, windowMin + 15)
    : Math.min(1000, windowMin + 15)

export const heatmapSpotWindowStartMs = (windowMin: HeatmapTimelineWindowMin, now = Date.now()): number =>
  now - windowMin * 60_000 - HEATMAP_CANDLE_MARGIN_MS

const fetchBinanceBtc1sThrough = async (startTime: number, endTime: number): Promise<Candle[]> => {
  const out: Candle[] = []
  let cursor = Math.floor(startTime)
  const end = Math.floor(endTime)
  const spanSec = Math.max(1, Math.ceil((end - startTime) / 1000))
  const maxPages = Math.min(8, Math.ceil(spanSec / 1000) + 1)
  for (let guard = 0; guard < maxPages && cursor < end; guard++) {
    const batch = await fetchBinanceBtcKlines('1s', 1000, cursor)
    if (batch.length === 0) break
    for (const c of batch) {
      if (c.openTime > end) break
      if (c.openTime >= startTime) out.push(c)
    }
    const last = batch[batch.length - 1]!.openTime
    if (last <= cursor) break
    cursor = last + 1000
    if (batch.length < 1000) break
  }
  return out
}

export const fetchBinanceBtc1mThrough = async (startTime: number, endTime: number): Promise<Candle[]> => {
  const out: Candle[] = []
  let cursor = Math.floor(startTime)
  const end = Math.floor(endTime)
  const maxPages = 4
  for (let guard = 0; guard < maxPages && cursor < end; guard++) {
    const batch = await fetchBinanceBtc1mKlines(1000, cursor)
    if (batch.length === 0) break
    for (const c of batch) {
      if (c.openTime > end) break
      if (c.openTime >= startTime) out.push(c)
    }
    const last = batch[batch.length - 1]!.openTime
    if (last <= cursor) break
    cursor = last + 60_000
    if (batch.length < 1000) break
  }
  return out
}

export const mergeHeatmapSpot1sCandles = (
  windowStartMs: number,
  prior: readonly Candle[] | null | undefined,
  fresh: readonly Candle[],
  now = Date.now(),
): Candle[] => {
  const cutoff = windowStartMs - 1000
  const maxAge = now + 60_000
  const byTime = new Map<number, Candle>()
  for (const c of prior ?? []) {
    if (c.openTime >= cutoff && c.openTime <= maxAge) byTime.set(c.openTime, c)
  }
  for (const c of fresh) {
    if (c.openTime >= cutoff && c.openTime <= maxAge) byTime.set(c.openTime, c)
  }
  return [...byTime.values()].sort((a, b) => a.openTime - b.openTime)
}

export const displayCandlesFrom1s = (
  windowMin: HeatmapTimelineWindowMin,
  seconds: readonly Candle[],
  now = Date.now(),
): Candle[] => {
  const barMs = heatmapCandleBarMs(windowMin)
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)
  const trimmed = seconds.filter((c) => c.openTime >= windowStart - barMs)
  return aggregateCandles(trimmed, barMs)
}

/** Spot candles aggregated for chart paint (24h stores 1m in cache). */
export const heatmapSpotCandlesForChart = (
  windowMin: HeatmapTimelineWindowMin,
  candles: readonly Candle[],
): Candle[] => {
  if (windowMin !== HEATMAP_WINDOW_24H_MIN || candles.length === 0) return [...candles]
  const barMs = heatmapCandleBarMs(windowMin)
  return aggregateCandles(candles, barMs)
}

/** Load spot candles for the depth heatmap (~60 bars). 60m/24h use 1m; 15m/30m use 1s→aggregate. */
export const fetchHeatmapTimelineCandles = async (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
  opts?: { fetchStartMs?: number },
): Promise<Candle[]> => {
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)

  if (heatmapWindowUses1mKlines(windowMin)) {
    const start = Math.max(windowStart, opts?.fetchStartMs ?? windowStart)
    const incremental = opts?.fetchStartMs != null && opts.fetchStartMs > windowStart
    if (windowMin === 60) {
      const limit = incremental
        ? Math.min(1000, Math.ceil((now - start) / 60_000) + 3)
        : heatmapSpotKlineFetchLimit(windowMin)
      return fetchBinanceBtc1mKlines(limit, start)
    }
    if (incremental) {
      const limit = Math.min(1000, Math.ceil((now - start) / 60_000) + 3)
      return fetchBinanceBtc1mKlines(limit, start)
    }
    return fetchBinanceBtc1mThrough(start, now + 60_000)
  }

  const start = Math.max(windowStart, opts?.fetchStartMs ?? windowStart)
  const seconds = await fetchBinanceBtc1sThrough(start, now + 1000)
  return displayCandlesFrom1s(windowMin, seconds, now)
}

/** Raw 1s rows for cache merge (15m/30m only). */
export const fetchHeatmapSpot1sSegment = async (
  windowMin: HeatmapTimelineWindowMin,
  fetchStartMs: number,
  now = Date.now(),
): Promise<Candle[]> => {
  if (heatmapWindowUses1mKlines(windowMin)) return []
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)
  const start = Math.max(windowStart, fetchStartMs)
  return fetchBinanceBtc1sThrough(start, now + 1000)
}

export const fetchHeatmapSpot1sFullWindow = async (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
): Promise<Candle[]> => {
  if (heatmapWindowUses1mKlines(windowMin)) return []
  const start = heatmapSpotWindowStartMs(windowMin, now)
  return fetchBinanceBtc1sThrough(start, now + 1000)
}

export const mergeHeatmapSpotCandles = (
  windowMin: HeatmapTimelineWindowMin,
  prior: readonly Candle[] | null | undefined,
  fresh: readonly Candle[],
  now = Date.now(),
): Candle[] => {
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)
  const byTime = new Map<number, Candle>()
  for (const c of prior ?? []) {
    if (c.openTime >= windowStart - 60_000) byTime.set(c.openTime, c)
  }
  for (const c of fresh) {
    if (c.openTime >= windowStart - 60_000) byTime.set(c.openTime, c)
  }
  return [...byTime.values()].sort((a, b) => a.openTime - b.openTime)
}