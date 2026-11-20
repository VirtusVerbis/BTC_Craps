import { env } from '../config/env'
import type { BinanceKlineInterval, Candle } from './candles'
import { exchangeRestBase } from './exchangeRestBase'

const parseKlineRows = (raw: unknown): Candle[] => {
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
    out.push({ openTime: Number(openTime), open: o, high: hi, low: lo, close: c })
  }
  return out
}

/** Binance USDT-M BTC perp klines (fapi). Dev: `/binance-fapi` proxy. */
export const fetchBinanceFuturesBtcKlines = async (
  interval: BinanceKlineInterval = '1m',
  limit = 200,
  startTime?: number,
): Promise<Candle[]> => {
  const base = exchangeRestBase('/binance-fapi', env.binanceFapiOrigin)
  if (!base) return []

  const params = new URLSearchParams({
    symbol: 'BTCUSDT',
    interval,
    limit: String(Math.min(1000, Math.max(1, limit))),
  })
  if (startTime != null && Number.isFinite(startTime) && startTime > 0) {
    params.set('startTime', String(Math.floor(startTime)))
  }
  const res = await fetch(`${base}/fapi/v1/klines?${params}`)
  if (!res.ok) return []
  return parseKlineRows(await res.json())
}

export const fetchBinanceFuturesBtc1mKlines = (limit = 200, startTime?: number): Promise<Candle[]> =>
  fetchBinanceFuturesBtcKlines('1m', limit, startTime)