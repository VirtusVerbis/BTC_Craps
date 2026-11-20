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
import { mergeVenueMidHistory } from './heatmapVenueMidMerge'

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

let fetchReturnPartial = false

vi.mock('./heatmapVenueMidHistory', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./heatmapVenueMidHistory')>()
  return {
    ...actual,
    fetchHeatmapVenueMidHistory: vi.fn(async (_windowMin, bounds) => {
      const end = bounds?.endMs ?? Date.now()
      const base = {
        coinbase: [
          { openTime: end - 120_000, open: 1, high: 1, low: 1, close: 100_000 },
          { openTime: end - 60_000, open: 1, high: 1, low: 1, close: 100_100 },
        ],
      }
      if (!fetchReturnPartial) {
        return {
          ...base,
          okxPerp: [
            { openTime: end - 120_000, open: 1, high: 1, low: 1, close: 99_000 },
            { openTime: end - 60_000, open: 1, high: 1, low: 1, close: 99_100 },
          ],
        }
      }
      return base
    }),
  }
})

describe('heatmapVenueMidCache', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', storage())
    vi.clearAllMocks()
    fetchReturnPartial = false
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

  it('preserves prior venue slices when refetch omits them', async () => {
    const now = 1_700_000_200_000
    await loadHeatmapVenueMidHistoryWithCache(15, undefined, now)
    let hit = readVenueMidHistoryCache(15)
    expect(hit?.okxPerp?.length).toBe(2)

    fetchReturnPartial = true
    await loadHeatmapVenueMidHistoryWithCache(15, undefined, now + HEATMAP_VENUE_MID_CACHE_TTL_MS + 1)
    hit = readVenueMidHistoryCache(15)
    expect(hit?.okxPerp?.length).toBe(2)
    expect(hit?.okxPerp?.[1]?.close).toBe(99_100)
    expect(hit?.coinbase?.[1]?.close).toBe(100_100)
  })

  it('mergeVenueMidHistory keeps stale okx from prior', () => {
    const end = 1_700_000_000_000
    const merged = mergeVenueMidHistory(
      {
        okxPerp: [
          { openTime: end - 120_000, open: 1, high: 1, low: 1, close: 50 },
          { openTime: end - 60_000, open: 1, high: 1, low: 1, close: 51 },
        ],
      },
      {
        coinbase: [
          { openTime: end - 120_000, open: 1, high: 1, low: 1, close: 100 },
          { openTime: end - 60_000, open: 1, high: 1, low: 1, close: 101 },
        ],
      },
    )
    expect(merged.okxPerp?.[1]?.close).toBe(51)
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