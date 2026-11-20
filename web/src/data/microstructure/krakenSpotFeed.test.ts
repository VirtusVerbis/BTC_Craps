import { describe, expect, it } from 'vitest'
import { parseKrakenOrderBookMessage, parseKrakenTradeMessage } from './krakenSpotFeed'

describe('parseKrakenOrderBookMessage', () => {
  it('parses book snapshot', () => {
    const parsed = parseKrakenOrderBookMessage({
      channel: 'book',
      type: 'snapshot',
      data: [
        {
          symbol: 'BTC/USD',
          bids: [{ price: 65000, qty: 0.5 }],
          asks: [{ price: 65050, qty: 0.1 }],
        },
      ],
    })
    expect(parsed?.bids[0]?.price).toBe(65000)
  })
})

describe('parseKrakenTradeMessage', () => {
  it('parses buy trade', () => {
    const ticks = parseKrakenTradeMessage({
      channel: 'trade',
      data: [{ symbol: 'BTC/USD', qty: 0.01, side: 'buy' }],
    })
    expect(ticks[0]?.isSell).toBe(false)
  })
})