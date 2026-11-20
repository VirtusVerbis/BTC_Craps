import { describe, expect, it } from 'vitest'
import {
  buildVenueMidPolylines,
  buildVenueMidPolylinesFromHistory,
  HEATMAP_VENUE_MID_LINE_VENUES,
  resolveVenueMidPolylines,
} from './depthHeatmapVenueMids'
import type { HeatmapGridColumn } from './depthSessionHeatmapGrid'
import type { DepthSample, MicrostructureState, VenueId } from './types'

const col = (start: number, end: number, gap: boolean): HeatmapGridColumn => ({
  intervalStart: start,
  intervalEnd: end,
  buckets: gap ? [] : [{ p: 100_000, usd: 1 }],
  refMid: 100_000,
  gap,
})

const sample = (at: number, mid: number): DepthSample => ({
  at,
  mid,
  bidNotionalNear: 0,
  askNotionalNear: 0,
  priceBuckets: [],
})

describe('buildVenueMidPolylines', () => {
  it('excludes binanceSpot from default venues', () => {
    expect(HEATMAP_VENUE_MID_LINE_VENUES).not.toContain('binanceSpot')
    expect(HEATMAP_VENUE_MID_LINE_VENUES).toContain('binancePerp')
  })

  it('builds history polylines from kline close', () => {
    const micro = { venues: {} } as unknown as MicrostructureState
    const barMs = 60_000
    const base = 1_700_000_000_000
    const lines = buildVenueMidPolylinesFromHistory(
      {
        coinbase: [
          { openTime: base, open: 100, high: 100, low: 100, close: 100 },
          { openTime: base + 60_000, open: 101, high: 101, low: 101, close: 101 },
        ],
      },
      barMs,
      micro,
      base - 60_000,
      base + 120_000,
      ['coinbase'],
    )
    expect(lines.coinbase[0]).toHaveLength(2)
    expect(lines.coinbase[0]![0].mid).toBe(100)
  })

  it('breaks segments on gap columns', () => {
    const columns = [col(0, 60_000, false), col(60_000, 120_000, true), col(120_000, 180_000, false)]
    const samplesByVenue = { coinbase: [sample(30_000, 99_000), sample(150_000, 101_000)] } as Record<
      VenueId,
      DepthSample[]
    >
    const micro = {
      venues: {
        coinbase: {
          venue: 'coinbase',
          status: 'connected',
          mid: 100_500,
          depthSamples: [],
          bookBids: [],
          bookAsks: [],
          activeWalls: [],
          recentEvents: [],
          taker15m: { buyBtc: 0, sellBtc: 0 },
        },
      },
    } as unknown as MicrostructureState
    const lines = buildVenueMidPolylines(columns, samplesByVenue, micro, 0, ['coinbase'])
    expect(lines.coinbase).toHaveLength(2)
    expect(lines.coinbase[0]).toHaveLength(1)
    expect(lines.coinbase[1]).toHaveLength(1)
  })

  it('resolve stitches cached klines to streamed column mids', () => {
    const barMs = 60_000
    const rangeStart = 0
    const rangeEnd = 600_000
    const columns: HeatmapGridColumn[] = []
    for (let i = 0; i < 10; i++) {
      columns.push(col(i * 60_000, (i + 1) * 60_000, false))
    }
    const samplesByVenue = {
      coinbase: Array.from({ length: 4 }, (_, i) => sample(360_000 + i * 60_000 + 30_000, 101_000 + i)),
    } as Record<VenueId, DepthSample[]>
    const micro = {
      venues: {
        coinbase: {
          venue: 'coinbase',
          status: 'connected',
          mid: 105_000,
          depthSamples: [],
          bookBids: [],
          bookAsks: [],
          activeWalls: [],
          recentEvents: [],
          taker15m: { buyBtc: 0, sellBtc: 0 },
        },
      },
    } as unknown as MicrostructureState
    const history = {
      coinbase: Array.from({ length: 6 }, (_, i) => ({
        openTime: (i + 1) * 60_000,
        open: 100,
        high: 100,
        low: 100,
        close: 100 + i,
      })),
    }
    const lines = resolveVenueMidPolylines(
      history,
      barMs,
      columns,
      samplesByVenue,
      micro,
      rangeStart,
      rangeEnd,
      ['coinbase'],
    )
    const seg = lines.coinbase[0]!
    expect(seg.length).toBeGreaterThanOrEqual(5)
    expect(seg[0]!.t).toBe(90_000)
    expect(seg[0]!.mid).toBe(100)
    const last = seg[seg.length - 1]!
    expect(last.mid).toBe(105_000)
    expect(last.t).toBe(570_000)
    expect(seg.some((p) => p.t >= 390_000 && p.mid >= 101_000)).toBe(true)
  })

  it('resolve uses history with live tip when no stream samples yet', () => {
    const barMs = 60_000
    const rangeEnd = 300_000
    const columns = [col(0, 60_000, false), col(60_000, 120_000, false)]
    const micro = {
      venues: {
        coinbase: {
          venue: 'coinbase',
          status: 'connected',
          mid: 99_500,
          depthSamples: [],
          bookBids: [],
          bookAsks: [],
          activeWalls: [],
          recentEvents: [],
          taker15m: { buyBtc: 0, sellBtc: 0 },
        },
      },
    } as unknown as MicrostructureState
    const history = {
      coinbase: [
        { openTime: 0, open: 99, high: 99, low: 99, close: 99 },
        { openTime: 60_000, open: 99.2, high: 99.2, low: 99.2, close: 99.2 },
      ],
    }
    const lines = resolveVenueMidPolylines(
      history,
      barMs,
      columns,
      { coinbase: [] } as Record<VenueId, DepthSample[]>,
      micro,
      0,
      rangeEnd,
      ['coinbase'],
    )
    expect(lines.coinbase[0]).toHaveLength(2)
    expect(lines.coinbase[0]![1]!.t).toBe(rangeEnd)
    expect(lines.coinbase[0]![1]!.mid).toBe(99_500)
  })
})