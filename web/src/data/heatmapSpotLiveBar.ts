import type { Candle } from './candles'

const bucketOpenMs = (t: number, barMs: number): number => {
  const intervalMs = Math.max(1000, barMs)
  return Math.floor(t / intervalMs) * intervalMs
}

/**
 * Patch the forming heatmap bar from live Binance spot mid (REST bar must exist).
 * Does not synthesize a new bucket — avoids a fleeting right-edge candle before klines catch up.
 */
export const heatmapSpotCandlesWithLiveMid = (
  candles: readonly Candle[],
  barMs: number,
  timelineNow: number,
  liveSpotMid?: number,
): Candle[] => {
  if (!(liveSpotMid != null && liveSpotMid > 0) || candles.length === 0 || !(timelineNow > 0)) {
    return [...candles]
  }

  const sorted = [...candles].sort((a, b) => a.openTime - b.openTime)
  const formingOpen = bucketOpenMs(timelineNow, barMs)
  const patch = (c: Candle): Candle => ({
    ...c,
    high: Math.max(c.high, liveSpotMid),
    low: Math.min(c.low, liveSpotMid),
    close: liveSpotMid,
  })

  const idx = sorted.findIndex((c) => c.openTime === formingOpen)
  if (idx >= 0) {
    const out = [...sorted]
    out[idx] = patch(out[idx]!)
    return out
  }

  const last = sorted[sorted.length - 1]!
  if (last.openTime === formingOpen) {
    const out = [...sorted]
    out[out.length - 1] = patch(last)
    return out
  }

  return [...sorted]
}