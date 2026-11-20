import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  HEATMAP_VENUE_MID_CACHE_TTL_MS,
  isVenueMidHistoryCacheFresh,
  loadHeatmapVenueMidHistoryWithCache,
  readVenueMidHistoryCache,
  venueMidHistoryHasBars,
  venueMidHistoryHasSeries,
} from './heatmapVenueMidCache'
import type { VenueMidHistory } from './heatmapVenueMidHistory'

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

vi.mock('./heatmapVenueMidHistory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./heatmapVenueMidHistory')>()
  return {
    ...actual,
    fetchHeatmapVenueMidHistory: vi.fn(async (_windowMin, bounds) => {
      const end = bounds?.endMs ?? Date.now()
      return {
        coinbase: [
          { openTime: end - 120_000, open: 1, high: 1, low: 1, close: 100_000 },
          { openTime: end - 60_000, open: 1, high: 1, low: 1, close: 100_100 },
        ],
      }
    }),
  }
})

describe('heatmapVenueMidCache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', storage())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns cached history without refetch when fresh', async () => {
    const now = 1_700_000_000_000
    const first = await loadHeatmapVenueMidHistoryWithCache(15, undefined, now)
    expect(first.coinbase?.length).toBe(2)

    const { fetchHeatmapVenueMidHistory } = await import('./heatmapVenueMidHistory')
    expect(fetchHeatmapVenueMidHistory).toHaveBeenCalledTimes(1)

    expect(isVenueMidHistoryCacheFresh(15, now + HEATMAP_VENUE_MID_CACHE_TTL_MS - 1)).toBe(true)
    const second = await loadHeatmapVenueMidHistoryWithCache(15, undefined, now + 60_000)
    expect(second.coinbase?.[0]?.close).toBe(100_000)
    expect(fetchHeatmapVenueMidHistory).toHaveBeenCalledTimes(1)
  })

  it('refetches after ttl expires', async () => {
    const now = 1_700_000_100_000
    await loadHeatmapVenueMidHistoryWithCache(30, undefined, now)
    const { fetchHeatmapVenueMidHistory } = await import('./heatmapVenueMidHistory')
    expect(fetchHeatmapVenueMidHistory).toHaveBeenCalledTimes(1)

    await loadHeatmapVenueMidHistoryWithCache(30, undefined, now + HEATMAP_VENUE_MID_CACHE_TTL_MS + 1)
    expect(fetchHeatmapVenueMidHistory).toHaveBeenCalledTimes(2)
  })

  it('readVenueMidHistoryCache hits after write via load', async () => {
    await loadHeatmapVenueMidHistoryWithCache(60, undefined, Date.now())
    const hit = readVenueMidHistoryCache(60)
    expect(hit?.coinbase?.length).toBe(2)
  })

  it('venueMidHistoryHasSeries tolerates descending candle order', () => {
    const ref = 1_700_000_000_000
    const history: VenueMidHistory = {
      coinbase: [
        { openTime: ref - 60_000, open: 1, high: 1, low: 1, close: 101 },
        { openTime: ref - 180_000, open: 1, high: 1, low: 1, close: 100 },
      ],
    }
    expect(venueMidHistoryHasBars(history)).toBe(true)
    expect(venueMidHistoryHasSeries(history, ref, 15)).toBe(true)
  })
})