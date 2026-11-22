import { describe, expect, it } from 'vitest'
import type { Candle } from './candles'
import {
  aggregateCandles,
  displayCandlesFrom1s,
  heatmapCandleBarMs,
  heatmapSpotKlineFetchLimit,
  heatmapSpotWindowStartMs,
} from './heatmapCandleSeries'

describe('heatmapCandleBarMs', () => {
  it('targets ~60 bars per window', () => {
    expect(heatmapCandleBarMs(60)).toBe(60_000)
    expect(heatmapCandleBarMs(30)).toBe(30_000)
    expect(heatmapCandleBarMs(15)).toBe(15_000)
  })
})

describe('heatmapSpotKlineFetchLimit', () => {
  it('requests window plus margin bars only', () => {
    expect(heatmapSpotKlineFetchLimit(15)).toBe(30)
    expect(heatmapSpotKlineFetchLimit(60)).toBe(75)
  })
})

describe('aggregateCandles', () => {
  it('merges 1s rows into OHLC buckets', () => {
    const rows: Candle[] = [
      { openTime: 0, open: 100, high: 101, low: 99, close: 100.5 },
      { openTime: 1000, open: 100.5, high: 102, low: 100, close: 101 },
      { openTime: 16_000, open: 101, high: 103, low: 100.5, close: 102 },
    ]
    const out = aggregateCandles(rows, 15_000)
    expect(out).toHaveLength(2)
    expect(out[0]!.openTime).toBe(0)
    expect(out[0]!.open).toBe(100)
    expect(out[0]!.close).toBe(101)
    expect(out[0]!.high).toBe(102)
    expect(out[1]!.openTime).toBe(15_000)
  })
})

describe('displayCandlesFrom1s', () => {
  it('produces more buckets than 1m-sourced rows would on a 15m window', () => {
    const now = 60 * 60_000
    const windowStart = heatmapSpotWindowStartMs(15, now)
    const seconds: Candle[] = []
    for (let t = windowStart; t < now; t += 1000) {
      const px = 100_000 + Math.floor((t - windowStart) / 1000)
      seconds.push({ openTime: t, open: px, high: px + 1, low: px - 1, close: px })
    }
    const display = displayCandlesFrom1s(15, seconds, now)
    expect(display.length).toBeGreaterThanOrEqual(55)
  })
})