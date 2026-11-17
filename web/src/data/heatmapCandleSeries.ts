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

const fetchBinanceBtc1sThrough = async (startTime: number, endTime: number): Promise<Candle[]> => {
  const out: Candle[] = []
  let cursor = Math.floor(startTime)
  const end = Math.floor(endTime)
  for (let guard = 0; guard < 8 && cursor < end; guard++) {
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

const HEATMAP_CANDLE_MARGIN_MS = 2 * 60_000

/** Load spot candles for the depth heatmap timeline (1m on 60m; 1s→aggregate on 15m/30m). */
export const fetchHeatmapTimelineCandles = async (
  windowMin: HeatmapTimelineWindowMin,
  now = Date.now(),
): Promise<Candle[]> => {
  const barMs = heatmapCandleBarMs(windowMin)
  const windowMs = windowMin * 60_000
  const start = now - windowMs - HEATMAP_CANDLE_MARGIN_MS

  if (windowMin === 60) {
    return fetchBinanceBtc1mKlines(Math.min(1000, windowMin + 15), start)
  }

  const secs = await fetchBinanceBtc1sThrough(start, now + 1000)
  return aggregateCandles(secs, barMs)
}