export interface HyperliquidTradeTick {
  tid: number
  qtyBtc: number
  isSell: boolean
  at: number
}

export const HL_TRADES_SUBSCRIBE = JSON.stringify({
  method: 'subscribe',
  subscription: { type: 'trades', coin: 'BTC' },
})

/** Parse `trades` channel payloads from `wss://api.hyperliquid.xyz/ws`. */
export const parseHyperliquidTradesMessage = (payload: unknown): HyperliquidTradeTick[] => {
  if (!payload || typeof payload !== 'object') return []
  const root = payload as Record<string, unknown>
  if (root.channel !== 'trades') return []
  const data = root.data
  if (!Array.isArray(data)) return []
  const out: HyperliquidTradeTick[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object') continue
    const t = row as Record<string, unknown>
    const coin = t.coin
    if (coin !== undefined && coin !== 'BTC') continue
    const side = t.side
    if (side !== 'A' && side !== 'B') continue
    const qty = Number(t.sz)
    const tid = Number(t.tid)
    const at = Number(t.time)
    if (!(qty > 0) || !Number.isFinite(tid)) continue
    out.push({
      tid,
      qtyBtc: qty,
      isSell: side === 'A',
      at: Number.isFinite(at) ? at : Date.now(),
    })
  }
  return out
}