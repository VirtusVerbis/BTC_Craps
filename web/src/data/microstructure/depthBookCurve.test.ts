import { describe, expect, it } from 'vitest'
import { buildCumulativeDepth, curveSideExtents } from './depthBookCurve'

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