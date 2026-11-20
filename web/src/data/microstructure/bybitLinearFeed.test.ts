import { describe, expect, it } from 'vitest'
import { parseBybitOrderBookMessage, parseBybitTradeMessage } from './bybitLinearFeed'

describe('parseBybitOrderBookMessage', () => {
  it('parses snapshot', () => {
    const parsed = parseBybitOrderBookMessage({
      topic: 'orderbook.50.BTCUSDT',
      type: 'snapshot',
      data: {
        b: [['65000', '1.5']],
        a: [['65010', '0.2']],
      },
    })
    expect(parsed?.kind).toBe('snapshot')
    expect(parsed?.bids[0]).toEqual({ price: 65000, size: 1.5 })
  })
})

describe('parseBybitTradeMessage', () => {
  it('maps sell aggressor', () => {
    const ticks = parseBybitTradeMessage({
      topic: 'publicTrade.BTCUSDT',
      data: [{ v: '0.01', S: 'Sell' }],
    })
    expect(ticks[0]?.isSell).toBe(true)
  })
})