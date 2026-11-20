import { describe, expect, it } from 'vitest'
import { fetchHeatmapVenueMidHistory } from './heatmapVenueMidHistory'

describe.runIf(process.env.VITEST_INTEGRATION === '1')('fetchHeatmapVenueMidHistory live', () => {
  it('returns bar series for at least one venue', async () => {
    const now = Date.now()
    const history = await fetchHeatmapVenueMidHistory(30, {
      startMs: now - 35 * 60_000,
      endMs: now,
    })
    const counts = Object.fromEntries(
      Object.entries(history).map(([v, bars]) => [v, bars?.length ?? 0]),
    )
    // eslint-disable-next-line no-console -- integration visibility
    console.info('[integration] venue mid bar counts', counts)
    const venues = Object.entries(history).filter(([, bars]) => (bars?.length ?? 0) >= 2)
    expect(venues.length).toBeGreaterThan(0)
    expect((counts.coinbase ?? 0) >= 2 || (counts.hyperliquid ?? 0) >= 2).toBe(true)
  }, 45_000)
})