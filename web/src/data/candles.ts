import { env } from '../config/env'

export interface Candle {
  openTime: number
  open: number
  high: number
  low: number
  close: number
}

/** Binance kline REST — in dev, Vite proxies `/binance-api` to `https://api.binance.com`. */
export const fetchBinanceBtc1mKlines = async (limit = 200): Promise<Candle[]> => {
  const devPrefix = import.meta.env.DEV ? '/binance-api' : ''
  const prodOrigin = env.binanceApiOrigin
  const base = import.meta.env.DEV ? devPrefix : prodOrigin
  if (!base) return []

  const url = `${base}/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=${limit}`
  const res = await fetch(url)
  if (!res.ok) return []

  const raw = (await res.json()) as unknown
  if (!Array.isArray(raw)) return []

  const out: Candle[] = []
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 6) continue
    const [openTime, open, high, low, close] = row as [string, string, string, string, string]
    const o = Number(open)
    const h = Number(high)
    const l = Number(low)
    const c = Number(close)
    if (![o, h, l, c].every((v) => Number.isFinite(v)) || o <= 0 || c <= 0) continue
    const hi = Math.max(o, c, h)
    const lo = Math.min(o, c, l)
    if (hi <= 0 || lo <= 0) continue
    out.push({
      openTime: Number(openTime),
      open: o,
      high: hi,
      low: lo,
      close: c,
    })
  }
  return out
}
