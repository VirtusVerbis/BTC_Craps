import { describe, expect, it } from 'vitest'
import { emptyMicrostructureState } from '../../data/microstructure/emptyState'
import { buildDisplayWallsFromMicro, bestLevelInBand } from './depthLiveBookWalls'

describe('bestLevelInBand', () => {
  it('picks largest notional inside band', () => {
    const mid = 100_000
    const bids = [
      { price: 99_950, size: 1 },
      { price: 99_900, size: 10 },
    ]
    const best = bestLevelInBand(mid, bids)
    expect(best).toEqual({ price: 99_900, size: 10 })
  })

  it('ignores levels outside band', () => {
    const mid = 100_000
    const bids = [{ price: 99_400, size: 100 }]
    expect(bestLevelInBand(mid, bids)).toBeNull()
  })
})

describe('buildDisplayWallsFromMicro', () => {
  it('returns one bid and ask per venue when books have in-band size', () => {
    const micro = emptyMicrostructureState()
    micro.venues.binanceSpot.mid = 65_000
    micro.venues.binanceSpot.bookBids = [{ price: 64_975, size: 2.5 }]
    micro.venues.binanceSpot.bookAsks = [{ price: 65_020, size: 1.2 }]
    micro.venues.coinbase.mid = 65_000
    micro.venues.coinbase.bookBids = [{ price: 64_980, size: 0.8 }]
    micro.venues.coinbase.bookAsks = [{ price: 65_010, size: 0.5 }]
    const { liveBids, liveAsks } = buildDisplayWallsFromMicro(micro)
    expect(liveBids.map((w) => w.venue)).toEqual(['binanceSpot', 'coinbase'])
    expect(liveAsks.map((w) => w.venue)).toEqual(['binanceSpot', 'coinbase'])
    expect(liveBids[0]!.peakUsd).toBeLessThan(500_000)
  })
})