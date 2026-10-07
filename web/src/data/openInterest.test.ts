import { describe, expect, it } from 'vitest'
import { parseOpenInterest } from './openInterest'

const base = {
  sampledAt: 10,
  openInterest: 96000,
  ratio: 1.4,
  longPct: 58,
  shortPct: 42,
}

describe('parseOpenInterest', () => {
  it('keeps a closed-hour liquidation beside the open-interest fields', () => {
    const parsed = parseOpenInterest({
      ...base,
      liqBarStart: 1_700_000_000,
      longLiqBtc: 12.4,
      shortLiqBtc: 8,
      longLiqUsd: 840_000,
      shortLiqUsd: 500_000,
    })
    expect(parsed?.liqBarStart).toBe(1_700_000_000)
    expect(parsed?.longLiqBtc).toBe(12.4)
    expect(parsed?.shortLiqUsd).toBe(500_000)
  })

  it('leaves liquidation empty when the worker has not stored a bar yet', () => {
    const parsed = parseOpenInterest(base)
    expect(parsed?.openInterest).toBe(96000)
    expect(parsed?.liqBarStart).toBeNull()
    expect(parsed?.longLiqBtc).toBeNull()
  })
})
