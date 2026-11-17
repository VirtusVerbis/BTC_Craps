import { describe, expect, it } from 'vitest'
import type { Candle } from './candles'
import { aggregateCandles, heatmapCandleBarMs } from './heatmapCandleSeries'

describe('heatmapCandleBarMs', () => {
  it('targets ~60 bars per window', () => {
    expect(heatmapCandleBarMs(60)).toBe(60_000)
    expect(heatmapCandleBarMs(30)).toBe(30_000)
    expect(heatmapCandleBarMs(15)).toBe(15_000)
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