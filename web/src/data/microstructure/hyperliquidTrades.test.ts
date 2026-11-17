import { describe, expect, it } from 'vitest'
import { parseHyperliquidTradesMessage } from './hyperliquidTrades'

describe('parseHyperliquidTradesMessage', () => {
  it('ignores non-trade channels', () => {
    expect(parseHyperliquidTradesMessage({ channel: 'subscriptionResponse' })).toEqual([])
  })

  it('maps B/A to buy/sell taker size', () => {
    const ticks = parseHyperliquidTradesMessage({
      channel: 'trades',
      data: [
        { coin: 'BTC', side: 'B', sz: '1.5', tid: 100, time: 1_700_000_000_000 },
        { coin: 'BTC', side: 'A', sz: '0.25', tid: 101, time: 1_700_000_000_050 },
      ],
    })
    expect(ticks).toEqual([
      { tid: 100, qtyBtc: 1.5, isSell: false, at: 1_700_000_000_000 },
      { tid: 101, qtyBtc: 0.25, isSell: true, at: 1_700_000_000_050 },
    ])
  })
})