import { describe, expect, it } from 'vitest'
import type { Candle } from '../candles'
import { buildTrendContext } from './taTrend'
import { detectPattern } from './taScan'

const c = (open: number, close: number, high: number, low: number, t = 0): Candle => ({
  openTime: t,
  open,
  high,
  low,
  close,
})

describe('taTrend', () => {
  it('classifies uptrend', () => {
    const candles = Array.from({ length: 15 }, (_, i) => c(100 + i, 100.5 + i, 101 + i, 99 + i, i * 60_000))
    const ctx = buildTrendContext(candles)
    expect(ctx.regimeAt(14)).toBe('up')
  })
})

describe('detectPattern hammer', () => {
  it('finds hammer shape after decline', () => {
    const decline = Array.from({ length: 12 }, (_, i) => c(105 - i * 0.2, 104.5 - i * 0.2, 105.5 - i * 0.2, 103.5 - i * 0.2, i * 60_000))
    const hammer = c(100, 100.4, 100.5, 98, 12 * 60_000)
    const hits = detectPattern('hammer', [...decline, hammer])
    expect(hits.length).toBeGreaterThan(0)
  })
})