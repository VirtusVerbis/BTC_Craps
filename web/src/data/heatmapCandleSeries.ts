import { type Candle, fetchBinanceBtc1mKlines, fetchBinanceBtcKlines } from './candles'

export type HeatmapTimelineWindowMin = 15 | 30 | 60

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
  Math.min(1000, windowMin + 15)

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

/** Load spot candles for the depth heatmap (~60 bars). 60m uses 1m; 15m/30m use 1s→aggregate for bar density. */
export const fetchHeatmapTimelineCandles = async (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
  opts?: { fetchStartMs?: number },
): Promise<Candle[]> => {
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)

  if (windowMin === 60) {
    const start = Math.max(windowStart, opts?.fetchStartMs ?? windowStart)
    const incremental = opts?.fetchStartMs != null && opts.fetchStartMs > windowStart
    const limit = incremental
      ? Math.min(1000, Math.ceil((now - start) / 60_000) + 3)
      : heatmapSpotKlineFetchLimit(windowMin)
    return fetchBinanceBtc1mKlines(limit, start)
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
  if (windowMin === 60) return []
  const windowStart = heatmapSpotWindowStartMs(windowMin, now)
  const start = Math.max(windowStart, fetchStartMs)
  return fetchBinanceBtc1sThrough(start, now + 1000)
}

export const fetchHeatmapSpot1sFullWindow = async (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
): Promise<Candle[]> => {
  if (windowMin === 60) return []
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