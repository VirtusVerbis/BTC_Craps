import { describe, expect, it } from 'vitest'
import { buildSpotKlinePolyline, latestSpotBarInWindow, spotKlineTip } from './depthHeatmapSpotKline'

const range = { start: 0, end: 100_000 }
const barMs = 15_000

describe('latestSpotBarInWindow', () => {
  it('picks the latest bar in window', () => {
    const bar = latestSpotBarInWindow(
      [
        { openTime: 10_000, open: 1, high: 1, low: 1, close: 100 },
        { openTime: 40_000, open: 1, high: 1, low: 1, close: 101 },
      ],
      range,
      barMs,
    )
    expect(bar?.close).toBe(101)
  })
})

describe('spotKlineTip', () => {
  it('uses live spot mid for close and widens high/low', () => {
    const tip = spotKlineTip(
      [{ openTime: 50_000, open: 100, high: 102, low: 98, close: 100 }],
      range,
      barMs,
      range.end,
      105,
    )
    expect(tip?.close).toBe(105)
    expect(tip?.typical).toBeCloseTo((105 + 98 + 105) / 3)
    expect(tip?.t).toBe(range.end)
  })

  it('marks bullish from open vs close', () => {
    const tip = spotKlineTip(
      [{ openTime: 50_000, open: 99, high: 101, low: 99, close: 100 }],
      range,
      barMs,
      range.end,
    )
    expect(tip?.bullish).toBe(true)
  })
})

describe('buildSpotKlinePolyline', () => {
  it('appends tip at rangeEnd', () => {
    const pts = buildSpotKlinePolyline(
      [
        { openTime: 20_000, open: 1, high: 1, low: 1, close: 100 },
        { openTime: 50_000, open: 1, high: 1, low: 1, close: 101 },
      ],
      barMs,
      range,
      90_000,
      102,
    )
    expect(pts.length).toBeGreaterThanOrEqual(2)
    expect(pts[pts.length - 1]!.t).toBe(90_000)
    expect(pts[pts.length - 1]!.mid).toBe(102)
  })
})