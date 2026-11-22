import { describe, expect, it } from 'vitest'
import type { Candle } from '../../candles'
import { detectStructPattern } from './structScan'

const c = (open: number, close: number, high: number, low: number, t = 0): Candle => ({
  openTime: t,
  open,
  close,
  high,
  low,
})

/** Build a simple double top: two highs ~100 with middle dip, then break lower. */
const doubleTopSeries = (): Candle[] => {
  const out: Candle[] = []
  let t = 0
  const push = (open: number, close: number, high: number, low: number) => {
    out.push(c(open, close, high, low, t))
    t += 60_000
  }
  for (let i = 0; i < 8; i++) push(95, 96, 96.5, 94.5)
  push(96, 98, 100, 95.5)
  push(99, 97, 99.5, 96)
  push(97, 95, 97.5, 94)
  push(95, 93, 95.5, 92)
  push(94, 96, 100, 93.5)
  push(99, 97, 99.8, 96)
  push(97, 96, 97.5, 95)
  push(96, 94, 96.5, 93)
  push(94, 91, 94.5, 90)
  return out
}

describe('struct double top', () => {
  it('detects confirmed double top when close breaks middle trough', () => {
    const hits = detectStructPattern('doubleTop', doubleTopSeries())
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]!.patternId).toBe('doubleTop')
  })
})

describe('struct window gating', () => {
  it('returns empty for tiny series', () => {
    expect(detectStructPattern('doubleTop', [])).toEqual([])
  })
})