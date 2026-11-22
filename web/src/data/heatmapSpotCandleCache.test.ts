import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Candle } from './candles'
import { heatmapCandleBarMs } from './heatmapCandleSeries'
import {
  HEATMAP_SPOT_CANDLE_CACHE_TTL_MS,
  HEATMAP_SPOT_CANDLE_TAIL_POLL_MS,
  isHeatmapSpotCandleCacheFresh,
  loadHeatmapSpotCandlesWithCacheSWR,
} from './heatmapSpotCandleCache'

const storage = (): Storage => {
  const map = new Map<string, string>()
  return {
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => map.get(k) ?? null,
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => map.delete(k),
    setItem: (k: string, v: string) => map.set(k, v),
  }
}

vi.mock('./heatmapCandleSeries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./heatmapCandleSeries')>()
  return {
    ...actual,
    fetchHeatmapSpot1sFullWindow: vi.fn(async () =>
      Array.from({ length: 900 }, (_, i) => ({
        openTime: 1_700_000_000_000 + i * 1000,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
      })) satisfies Candle[],
    ),
    fetchHeatmapSpot1sSegment: vi.fn(async () => [
      { openTime: 1_700_000_900_000, open: 1, high: 1, low: 1, close: 2 },
    ]),
    fetchHeatmapTimelineCandles: vi.fn(async () => [
      { openTime: 1_000, open: 1, high: 1, low: 1, close: 1 },
      { openTime: 60_000, open: 1, high: 1, low: 1, close: 2 },
    ] satisfies Candle[]),
  }
})

describe('heatmap spot candle cache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', storage())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips network when cache is fresh with raw1s', async () => {
    const { fetchHeatmapSpot1sSegment, fetchHeatmapSpot1sFullWindow } = await import('./heatmapCandleSeries')
    const now = Date.now()
    const barMs = heatmapCandleBarMs(15)
    localStorage.setItem(
      'btc_depth_heatmap_spot_v2_15',
      JSON.stringify({
        v: 2,
        savedAt: now - 5_000,
        windowMin: 15,
        barMs,
        candles: [
          { openTime: now - 120_000, open: 1, high: 1, low: 1, close: 1 },
          { openTime: now - 60_000, open: 1, high: 1, low: 1, close: 2 },
        ],
        raw1s: Array.from({ length: 50 }, (_, i) => ({
          openTime: now - 100_000 + i * 1000,
          open: 1,
          high: 1,
          low: 1,
          close: 1,
        })),
      }),
    )
    expect(isHeatmapSpotCandleCacheFresh(15, now, barMs)).toBe(true)
    await loadHeatmapSpotCandlesWithCacheSWR(15, () => {}, now)
    expect(fetchHeatmapSpot1sFullWindow).not.toHaveBeenCalled()
    expect(fetchHeatmapSpot1sSegment).not.toHaveBeenCalled()
  })

  it('runs tail while full cache is still fresh', async () => {
    const { fetchHeatmapSpot1sSegment } = await import('./heatmapCandleSeries')
    const now = Date.now()
    const barMs = heatmapCandleBarMs(15)
    const savedAt = now - HEATMAP_SPOT_CANDLE_TAIL_POLL_MS - 2_000
    localStorage.setItem(
      'btc_depth_heatmap_spot_v2_15',
      JSON.stringify({
        v: 2,
        savedAt,
        windowMin: 15,
        barMs,
        candles: [
          { openTime: savedAt - 120_000, open: 1, high: 1, low: 1, close: 1 },
          { openTime: savedAt - 60_000, open: 1, high: 1, low: 1, close: 2 },
        ],
        raw1s: Array.from({ length: 50 }, (_, i) => ({
          openTime: savedAt - 100_000 + i * 1000,
          open: 1,
          high: 1,
          low: 1,
          close: 1,
        })),
      }),
    )
    expect(isHeatmapSpotCandleCacheFresh(15, now, barMs)).toBe(true)
    await loadHeatmapSpotCandlesWithCacheSWR(15, () => {}, now)
    expect(fetchHeatmapSpot1sSegment).toHaveBeenCalled()
  })

  it('refetches full window when cache is past TTL', async () => {
    const { fetchHeatmapSpot1sFullWindow } = await import('./heatmapCandleSeries')
    const savedAt = Date.now() - HEATMAP_SPOT_CANDLE_CACHE_TTL_MS - 1_000
    const barMs = heatmapCandleBarMs(30)
    const raw1s = Array.from({ length: 80 }, (_, i) => ({
      openTime: savedAt - 200_000 + i * 1000,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
    }))
    localStorage.setItem(
      'btc_depth_heatmap_spot_v2_30',
      JSON.stringify({
        v: 2,
        savedAt,
        windowMin: 30,
        barMs,
        candles: [
          { openTime: savedAt - 120_000, open: 1, high: 1, low: 1, close: 1 },
          { openTime: savedAt - 60_000, open: 1, high: 1, low: 1, close: 2 },
        ],
        raw1s,
      }),
    )
    await loadHeatmapSpotCandlesWithCacheSWR(30, () => {}, Date.now())
    expect(fetchHeatmapSpot1sFullWindow).toHaveBeenCalled()
  })
})