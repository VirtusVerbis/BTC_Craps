import { describe, expect, it } from 'vitest'
import type { VenueMidHistory } from './heatmapVenueMidHistory'
import { mergeVenueMidHistory } from './heatmapVenueMidMerge'

const bar = (openTime: number, close: number) => ({
  openTime,
  open: close,
  high: close,
  low: close,
  close,
})

describe('mergeVenueMidHistory', () => {
  it('keeps prior okx when fresh fetch is empty', () => {
    const prior: VenueMidHistory = {
      okxPerp: [bar(1_000, 100), bar(2_000, 101)],
      coinbase: [bar(1_000, 100), bar(2_000, 101)],
    }
    const fresh: VenueMidHistory = {
      coinbase: [bar(3_000, 102), bar(4_000, 103)],
    }
    const merged = mergeVenueMidHistory(prior, fresh)
    expect(merged.okxPerp?.length).toBe(2)
    expect(merged.okxPerp?.[0]?.close).toBe(100)
    expect(merged.coinbase?.[1]?.close).toBe(103)
  })

  it('prefers fresh when it has paintable series', () => {
    const prior: VenueMidHistory = {
      krakenSpot: [bar(1_000, 100), bar(2_000, 101)],
    }
    const fresh: VenueMidHistory = {
      krakenSpot: [bar(3_000, 200), bar(4_000, 201)],
    }
    const merged = mergeVenueMidHistory(prior, fresh)
    expect(merged.krakenSpot?.[1]?.close).toBe(201)
  })
})