import { describe, expect, it } from 'vitest'
import {
  buildCumulativeDepth,
  cumulativeBtcAtSharedBps,
  curveSideExtents,
  sumVenueCurvesAtSharedBps,
} from './depthBookCurve'

describe('buildCumulativeDepth', () => {
  it('accumulates bids below mid in negative bps', () => {
    const mid = 100_000
    const { bids, asks } = buildCumulativeDepth(
      mid,
      [
        { price: 99_950, size: 1 },
        { price: 99_900, size: 2 },
      ],
      [{ price: 100_050, size: 0.5 }],
      50,
    )
    expect(bids.length).toBeGreaterThan(1)
    expect(bids[bids.length - 1].cumulativeBtc).toBe(3)
    expect(bids[1].bps).toBeLessThan(0)
    expect(asks[asks.length - 1].cumulativeBtc).toBe(0.5)
  })

  it('measures bid and ask side extents separately', () => {
    const { bids, asks } = buildCumulativeDepth(
      100_000,
      [{ price: 99_900, size: 1 }],
      [{ price: 100_050, size: 1 }],
      120,
    )
    const { bidExtentBps, askExtentBps } = curveSideExtents({ bids, asks })
    expect(bidExtentBps).toBeGreaterThan(0)
    expect(askExtentBps).toBeGreaterThan(0)
  })
})

describe('sumVenueCurvesAtSharedBps', () => {
  const mid = 100_000
  const venueA = buildCumulativeDepth(
    mid,
    [
      { price: 99_950, size: 1 },
      { price: 99_900, size: 2 },
    ],
    [{ price: 100_050, size: 0.5 }],
    120,
  )
  const venueB = buildCumulativeDepth(
    mid,
    [{ price: 99_925, size: 4 }],
    [{ price: 100_100, size: 1 }],
    120,
  )

  it('sums cumulative BTC at each union bps knot', () => {
    const { bids, asks } = sumVenueCurvesAtSharedBps([venueA, venueB])
    expect(bids[bids.length - 1].cumulativeBtc).toBe(7)
    expect(asks[asks.length - 1].cumulativeBtc).toBe(1.5)
  })

  it('interpolates steps at a knot between venue breakpoints', () => {
    const knot = venueA.bids[1]!.bps
    const aOnly = cumulativeBtcAtSharedBps(venueA.bids, knot, 'bid')
    const bAt = cumulativeBtcAtSharedBps(venueB.bids, knot, 'bid')
    const row = sumVenueCurvesAtSharedBps([venueA, venueB]).bids.find((p) => p.bps === knot)
    expect(row?.cumulativeBtc).toBe(aOnly + bAt)
  })
})