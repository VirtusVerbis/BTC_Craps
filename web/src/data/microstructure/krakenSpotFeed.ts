import type { BookLevel } from './types'

export const KRAKEN_SPOT_SYMBOL = 'BTC/USD'

/** Kraken v2 allows 10, 25, 100, 500, 1000 — not 50. */
export const KRAKEN_BOOK_DEPTH = 25

export const krakenSpotSubscribePayloads = (): string[] => [
  JSON.stringify({
    method: 'subscribe',
    params: {
      channel: 'book',
      symbol: [KRAKEN_SPOT_SYMBOL],
      depth: KRAKEN_BOOK_DEPTH,
      snapshot: true,
    },
  }),
  JSON.stringify({
    method: 'subscribe',
    params: { channel: 'trade', symbol: [KRAKEN_SPOT_SYMBOL] },
  }),
]

export interface KrakenTradeTick {
  qtyBtc: number
  isSell: boolean
}

const parseKrakenQty = (row: Record<string, unknown>): number => {
  const qty = Number(row.qty)
  if (qty > 0) return qty
  return Number(row.volume) || 0
}

const parseKrakenBookLevels = (rows: unknown): BookLevel[] => {
  if (!Array.isArray(rows)) return []
  const out: BookLevel[] = []
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const price = Number(o.price)
    const size = parseKrakenQty(o)
    if (!Number.isFinite(price) || !(size >= 0)) continue
    out.push({ price, size })
  }
  return out
}

export type KrakenOrderBookParse = { kind: 'snapshot' | 'delta'; bids: BookLevel[]; asks: BookLevel[] } | null

/** Parse Kraken v2 `book` channel. */
export const parseKrakenOrderBookMessage = (payload: unknown): KrakenOrderBookParse => {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>
  const channel = root.channel
  if (channel !== 'book') return null
  const msgType = root.type
  if (msgType !== 'snapshot' && msgType !== 'update') return null
  const data = root.data
  if (!Array.isArray(data) || data.length === 0) return null
  const book = data[0] as Record<string, unknown>
  const symbol = book.symbol
  if (symbol !== KRAKEN_SPOT_SYMBOL) return null
  const bids = parseKrakenBookLevels(book.bids)
  const asks = parseKrakenBookLevels(book.asks)
  if (bids.length === 0 && asks.length === 0) return null
  return { kind: msgType === 'snapshot' ? 'snapshot' : 'delta', bids, asks }
}

/** Parse Kraken v2 `trade` channel (batched in data array). */
export const parseKrakenTradeMessage = (payload: unknown): KrakenTradeTick[] => {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  if (root.channel !== 'trade') return []
  const data = root.data
  if (!Array.isArray(data)) return []
  const out: KrakenTradeTick[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    const t = row as Record<string, unknown>
    if (t.symbol !== KRAKEN_SPOT_SYMBOL) continue
    const qty = parseKrakenQty(t)
    if (!(qty > 0)) continue
    const side = t.side
    if (side !== 'buy' && side !== 'sell') continue
    out.push({ qtyBtc: qty, isSell: side === 'sell' })
  }
  return out
}