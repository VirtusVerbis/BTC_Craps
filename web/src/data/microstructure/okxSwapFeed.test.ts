import { describe, expect, it } from 'vitest'
import { OKX_BTC_USDT_SWAP_CT_VAL, parseOkxOrderBookMessage, parseOkxTradeMessage } from './okxSwapFeed'

describe('parseOkxOrderBookMessage', () => {
  it('parses books snapshot and converts contracts to BTC', () => {
    const parsed = parseOkxOrderBookMessage({
      arg: { channel: 'books', instId: 'BTC-USDT-SWAP' },
      action: 'snapshot',
      data: [{ bids: [['65000', '100', '0', '1']], asks: [['65020', '200', '0', '1']] }],
    })
    expect(parsed?.bids[0]?.size).toBe(100 * OKX_BTC_USDT_SWAP_CT_VAL)
    expect(parsed?.asks[0]?.size).toBe(200 * OKX_BTC_USDT_SWAP_CT_VAL)
  })

  it('accepts books5 channel alias', () => {
    const parsed = parseOkxOrderBookMessage({
      arg: { channel: 'books5', instId: 'BTC-USDT-SWAP' },
      action: 'update',
      data: [{ bids: [['65000', '1', '0', '1']], asks: [] }],
    })
    expect(parsed?.bids[0]?.price).toBe(65000)
  })
})

describe('parseOkxTradeMessage', () => {
  it('converts contract sz to BTC', () => {
    const ticks = parseOkxTradeMessage({
      arg: { channel: 'trades', instId: 'BTC-USDT-SWAP' },
      data: [{ sz: '100', side: 'sell', tradeId: '12345' }],
    })
    expect(ticks[0]?.qtyBtc).toBe(100 * OKX_BTC_USDT_SWAP_CT_VAL)
    expect(ticks[0]?.isSell).toBe(true)
  })

  it('skips rows without tradeId', () => {
    const ticks = parseOkxTradeMessage({
      arg: { channel: 'trades', instId: 'BTC-USDT-SWAP' },
      data: [{ sz: '1', side: 'buy' }],
    })
    expect(ticks).toHaveLength(0)
  })
})