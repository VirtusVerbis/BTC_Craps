import type { BookLevel } from './types'

export const BYBIT_LINEAR_SYMBOL = 'BTCUSDT'

export const bybitLinearSubscribePayloads = (): string[] => [
  JSON.stringify({
    op: 'subscribe',
    args: [`orderbook.50.${BYBIT_LINEAR_SYMBOL}`, `publicTrade.${BYBIT_LINEAR_SYMBOL}`],
  }),
]

export interface BybitTradeTick {
  qtyBtc: number
  isSell: boolean
}

const parseBookRows = (rows: unknown): BookLevel[] => {
  if (!Array.isArray(rows)) return []
  const out: BookLevel[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const price = Number(row[0])
    const size = Number(row[1])
    if (!Number.isFinite(price) || !Number.isFinite(size)) continue
    out.push({ price, size })
  }
  return out
}

export type BybitOrderBookParse = { kind: 'snapshot' | 'delta'; bids: BookLevel[]; asks: BookLevel[] } | null

/** Parse Bybit v5 linear `orderbook.50` messages. */
export const parseBybitOrderBookMessage = (payload: unknown): BybitOrderBookParse => {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>
  const topic = root.topic
  if (typeof topic !== 'string' || !topic.startsWith('orderbook.')) return null
  if (!topic.endsWith(BYBIT_LINEAR_SYMBOL)) return null
  const msgType = root.type
  if (msgType !== 'snapshot' && msgType !== 'delta') return null
  const data = root.data as Record<string, unknown> | undefined
  if (!data) return null
  const bids = parseBookRows(data.b)
  const asks = parseBookRows(data.a)
  if (bids.length === 0 && asks.length === 0) return null
  return { kind: msgType, bids, asks }
}

/** Parse Bybit v5 `publicTrade` topic. */
export const parseBybitTradeMessage = (payload: unknown): BybitTradeTick[] => {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  const topic = root.topic
  if (topic !== `publicTrade.${BYBIT_LINEAR_SYMBOL}`) return []
  const data = root.data
  if (!Array.isArray(data)) return []
  const out: BybitTradeTick[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    const t = row as Record<string, unknown>
    const qty = Number(t.v)
    if (!(qty > 0)) continue
    const side = t.S
    const isSell = side === 'Sell'
    if (side !== 'Buy' && side !== 'Sell') continue
    out.push({ qtyBtc: qty, isSell })
  }
  return out
}