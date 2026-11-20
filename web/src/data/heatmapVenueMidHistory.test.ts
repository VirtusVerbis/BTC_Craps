import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchHeatmapVenueMidHistory } from './heatmapVenueMidHistory'
import {
  getVenuesInFetchBackoff,
  recordVenueMidFetchRateLimited,
  resetVenueMidFetchBackoffForTests,
} from './heatmapVenueMidFetchPolicy'

const okxRateLimitBody = { code: '50011', msg: 'Too Many Requests', data: [] as string[][] }

const okxRow = (openTimeMs: number): string[] => [
  String(openTimeMs),
  '100',
  '101',
  '99',
  '100.5',
]

describe('fetchHeatmapVenueMidHistory rate limits', () => {
  beforeEach(() => {
    resetVenueMidFetchBackoffForTests()
    vi.stubGlobal('window', {})
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (typeof url === 'string' && url.includes('/okx-api/')) {
          return {
            ok: true,
            status: 200,
            json: async () => okxRateLimitBody,
          }
        }
        return { ok: false, status: 500, json: async () => ({}) }
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('records okx backoff when OKX returns 50011', async () => {
    vi.useFakeTimers()
    const end = 1_700_000_000_000
    vi.setSystemTime(end)

    const promise = fetchHeatmapVenueMidHistory(15, { startMs: end - 20 * 60_000, endMs: end })
    await vi.runAllTimersAsync()
    const history = await promise

    expect(history.okxPerp).toBeUndefined()
    expect(getVenuesInFetchBackoff(end + 1).has('okxPerp')).toBe(true)
  }, 20_000)

  it('parse OKX success when code is 0', async () => {
    vi.stubGlobal('window', {})
    const end = 1_700_000_010_000
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('/okx-api/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              code: '0',
              data: [okxRow(end - 120_000), okxRow(end - 60_000)],
            }),
          }
        }
        return { ok: false, status: 500, json: async () => ({}) }
      }),
    )
    vi.useFakeTimers()
    vi.setSystemTime(end)
    const promise = fetchHeatmapVenueMidHistory(15, { startMs: end - 20 * 60_000, endMs: end })
    await vi.runAllTimersAsync()
    const history = await promise
    expect(history.okxPerp?.length).toBeGreaterThanOrEqual(2)
  }, 20_000)
})

describe('venue mid fetch backoff', () => {
  beforeEach(() => resetVenueMidFetchBackoffForTests())

  it('skips venues in backoff during fetch', async () => {
    vi.stubGlobal('window', {})
    const end = 1_700_000_020_000
    recordVenueMidFetchRateLimited('okxPerp', end)
    expect(getVenuesInFetchBackoff(end).has('okxPerp')).toBe(true)

    const fetchCalls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        fetchCalls.push(url)
        return { ok: false, status: 500, json: async () => ({}) }
      }),
    )
    vi.useFakeTimers()
    vi.setSystemTime(end)
    const promise = fetchHeatmapVenueMidHistory(
      15,
      { startMs: end - 20 * 60_000, endMs: end },
      { skipVenues: getVenuesInFetchBackoff(end) },
    )
    await vi.runAllTimersAsync()
    await promise

    expect(fetchCalls.some((u) => u.includes('/okx-api/'))).toBe(false)
    vi.unstubAllGlobals()
    vi.useRealTimers()
  }, 20_000)
})