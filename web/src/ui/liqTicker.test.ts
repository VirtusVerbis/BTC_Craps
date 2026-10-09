import { describe, expect, it } from 'vitest'
import { liqTickerLine, liqTickerLines, type LiqTickerSource } from './liqTickerLines'

const bar = (patch: Partial<LiqTickerSource> = {}): LiqTickerSource => ({
  liqBarStart: 1_700_000_000,
  longLiqBtc: 45,
  shortLiqBtc: 3,
  longLiqUsd: 155_000_000,
  shortLiqUsd: 2_000_000,
  ...patch,
})

describe('liquidation ticker lines', () => {
  it('names the side and prints BTC then USD', () => {
    expect(liqTickerLine('long', 45, 155_000_000)).toBe('Longs Liquidated! - 45 BTC  $155M')
    expect(liqTickerLine('short', 12, 8_400_000)).toBe('Shorts Liquidated! - 12 BTC  $8.4M')
  })

  it('plays Long before Short when both sides clear the threshold', () => {
    expect(liqTickerLines(bar({ shortLiqUsd: 12_000_000 }), 10_000_000)).toEqual([
      'Longs Liquidated! - 45 BTC  $155M',
      'Shorts Liquidated! - 3 BTC  $12M',
    ])
  })

  it('skips a side under the threshold', () => {
    expect(liqTickerLines(bar(), 10_000_000)).toEqual(['Longs Liquidated! - 45 BTC  $155M'])
  })

  it('stays quiet for a $0 side even when the threshold is $1', () => {
    expect(liqTickerLines(bar({ longLiqUsd: 0, shortLiqUsd: 0, longLiqBtc: 0, shortLiqBtc: 0 }), 1)).toEqual([])
  })

  it('stays quiet when the worker has no bar', () => {
    expect(liqTickerLines(bar({ liqBarStart: null }), 1)).toEqual([])
    expect(liqTickerLines(null, 1)).toEqual([])
  })
})
