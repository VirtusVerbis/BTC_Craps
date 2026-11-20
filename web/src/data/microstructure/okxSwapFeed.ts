import type { BookLevel } from './types'

export const OKX_SWAP_INST_ID = 'BTC-USDT-SWAP'

/** BTC face value per contract for BTC-USDT-SWAP (linear). */
export const OKX_BTC_USDT_SWAP_CT_VAL = 0.01

export const okxSwapSubscribePayloads = (): string[] => [
  /** `books50` is not valid for BTC-USDT-SWAP; `books` provides depth + snapshot. */
  JSON.stringify({ op: 'subscribe', args: [{ channel: 'books', instId: OKX_SWAP_INST_ID }] }),
  JSON.stringify({ op: 'subscribe', args: [{ channel: 'trades', instId: OKX_SWAP_INST_ID }] }),
]

export interface OkxTradeTick {
  tradeId: string
  qtyBtc: number
  isSell: boolean
}

const isOkxBooksChannel = (channel: string | undefined): boolean =>
  channel === 'books50' || channel === 'books5' || channel === 'books' || channel === 'books-l2-tbt'

const contractsToBtc = (contracts: number): number => {
  if (!(contracts >= 0) || !Number.isFinite(contracts)) return 0
  return contracts * OKX_BTC_USDT_SWAP_CT_VAL
}

const parseOkxBookRows = (rows: unknown): BookLevel[] => {
  if (!Array.isArray(rows)) return []
  const out: BookLevel[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue
    const price = Number(row[0])
    const contracts = Number(row[1])
    if (!Number.isFinite(price) || !Number.isFinite(contracts)) continue
    out.push({ price, size: contractsToBtc(contracts) })
  }
  return out
}

export type OkxOrderBookParse = { kind: 'snapshot' | 'delta'; bids: BookLevel[]; asks: BookLevel[] } | null

/** Parse OKX v5 `books` / `books5` channel (snapshot/update). */
export const parseOkxOrderBookMessage = (payload: unknown): OkxOrderBookParse => {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>
  const arg = root.arg as { channel?: string; instId?: string } | undefined
  if (!isOkxBooksChannel(arg?.channel) || arg?.instId !== OKX_SWAP_INST_ID) return null
  const action = root.action
  if (action !== 'snapshot' && action !== 'update') return null
  const data = root.data
  if (!Array.isArray(data) || data.length === 0) return null
  const book = data[0] as Record<string, unknown>
  const bids = parseOkxBookRows(book.bids)
  const asks = parseOkxBookRows(book.asks)
  if (bids.length === 0 && asks.length === 0) return null
  return { kind: action === 'snapshot' ? 'snapshot' : 'delta', bids, asks }
}

/** Parse OKX v5 `trades` channel (`sz` is contracts on SWAP). */
export const parseOkxTradeMessage = (payload: unknown): OkxTradeTick[] => {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  const arg = root.arg as { channel?: string; instId?: string } | undefined
  if (arg?.channel !== 'trades' || arg?.instId !== OKX_SWAP_INST_ID) return []
  const data = root.data
  if (!Array.isArray(data)) return []
  const out: OkxTradeTick[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    const t = row as Record<string, unknown>
    const contracts = Number(t.sz)
    if (!(contracts > 0)) continue
    const side = t.side
    if (side !== 'buy' && side !== 'sell') continue
    const tradeId = String(t.tradeId ?? '')
    if (!tradeId) continue
    out.push({
      tradeId,
      qtyBtc: contractsToBtc(contracts),
      isSell: side === 'sell',
    })
  }
  return out
}