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

export const fetchBinanceFuturesBtc1mThrough = async (startTime: number, endTime: number): Promise<Candle[]> => {
  const out: Candle[] = []
  let cursor = Math.floor(startTime)
  const end = Math.floor(endTime)
  const maxPages = 4
  for (let guard = 0; guard < maxPages && cursor < end; guard++) {
    const batch = await fetchBinanceFuturesBtc1mKlines(1000, cursor)
    if (batch.length === 0) break
    for (const c of batch) {
      if (c.openTime > end) break
      if (c.openTime >= startTime) out.push(c)
    }
    const last = batch[batch.length - 1]!.openTime
    if (last <= cursor) break
    cursor = last + 60_000
    if (batch.length < 1000) break
  }
  return out
}