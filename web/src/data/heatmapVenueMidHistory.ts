import { env } from '../config/env'
import type { Candle } from './candles'
import { exchangeRestBase } from './exchangeRestBase'
import { fetchBinanceFuturesBtc1mKlines } from './binanceFuturesCandles'
import {
  aggregateCandles,
  heatmapCandleBarMs,
  type HeatmapTimelineWindowMin,
} from './heatmapCandleSeries'
import { DEPTH_VENUE_ORDER } from './microstructure/venueOrder'
import type { VenueId } from './microstructure/types'

const HEATMAP_VENUE_MID_LINE_VENUES: readonly VenueId[] = DEPTH_VENUE_ORDER.filter(
  (v) => v !== 'binanceSpot',
)

export type VenueMidHistory = Partial<Record<VenueId, Candle[]>>

const HEATMAP_CANDLE_MARGIN_MS = 2 * 60_000

const midHistoryRestBase = (proxyPrefix: string, prodOrigin: string): string =>
  exchangeRestBase(proxyPrefix, prodOrigin)

const safeVenueCandles = async (fn: () => Promise<Candle[]>): Promise<Candle[]> => {
  try {
    return await fn()
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[heatmapVenueMidHistory] venue fetch failed', err)
    return []
  }
}

/** Values in ~1e9 are unix seconds (API); ~1e12+ are already epoch ms. */
export const candleOpenTimeMs = (openTime: number): number => {
  if (!(openTime > 0)) return 0
  if (openTime >= 1e12) return openTime
  if (openTime >= 1e9) return openTime * 1000
  return openTime
}

const normalizeCandleTimes = (candles: readonly Candle[]): Candle[] =>
  candles.map((c) => {
    const openTime = candleOpenTimeMs(c.openTime)
    return openTime === c.openTime ? c : { ...c, openTime }
  })

const filterCandlesToWindow = (candles: readonly Candle[], start: number, end: number): Candle[] =>
  normalizeCandleTimes(candles).filter((c) => c.openTime >= start - 1 && c.openTime <= end + 60_000)

const binancePerpCandlesForWindow = async (
  windowMin: HeatmapTimelineWindowMin,
  start: number,
  barMs: number,
): Promise<Candle[]> => {
  const limit = Math.min(1000, windowMin + 30)
  let rows = await fetchBinanceFuturesBtc1mKlines(limit, start)
  if (rows.length < 2) rows = await fetchBinanceFuturesBtc1mKlines(limit)
  if (windowMin === 60) return rows
  return aggregateCandles(rows, barMs)
}

const parseCoinbaseCandleRows = (raw: unknown): Candle[] => {
  if (!Array.isArray(raw)) return []
  const out: Candle[] = []
  for (const row of raw) {
    if (!Array.isArray(row) || row.length < 5) continue
    const [t, low, high, open, close] = row as [number, number, number, number, number]
    if (!(close > 0)) continue
    out.push({
      openTime: t * 1000,
      open,
      high: Math.max(open, close, high),
      low: Math.min(open, close, low),
      close,
    })
  }
  return out.sort((a, b) => a.openTime - b.openTime)
}

const fetchCoinbaseCandles = async (startSec: number, endSec: number, granularitySec: number): Promise<Candle[]> => {
  const base = midHistoryRestBase('/coinbase-api', 'https://api.exchange.coinbase.com')
  const product = encodeURIComponent(env.coinbaseProductId)
  try {
    const ranged = new URLSearchParams({
      granularity: String(granularitySec),
      start: new Date(startSec * 1000).toISOString(),
      end: new Date(endSec * 1000).toISOString(),
    })
    const res = await fetch(`${base}/products/${product}/candles?${ranged}`)
    let out = res.ok ? parseCoinbaseCandleRows(await res.json()) : []
    if (out.length < 2) {
      const snapshot = await fetch(`${base}/products/${product}/candles?granularity=${granularitySec}`)
      if (snapshot.ok) {
        const full = parseCoinbaseCandleRows(await snapshot.json())
        const startMs = startSec * 1000
        const endMs = endSec * 1000
        out = full.filter((c) => c.openTime >= startMs - 60_000 && c.openTime <= endMs + 60_000)
      }
    }
    return out
  } catch {
    return []
  }
}

const krakenIntervalMin = (barMs: number): number => {
  if (barMs <= 60_000) return 1
  if (barMs <= 5 * 60_000) return 5
  return 15
}

const krakenOhlcRows = (result: Record<string, unknown> | undefined): number[][] => {
  if (!result) return []
  for (const [key, val] of Object.entries(result)) {
    if (key === 'last') continue
    if (Array.isArray(val)) return val as number[][]
  }
  return []
}

const fetchKrakenCandles = async (startMs: number, barMs: number): Promise<Candle[]> => {
  const base = midHistoryRestBase('/kraken-api', 'https://api.kraken.com')
  const interval = krakenIntervalMin(barMs)
  const since = Math.floor(startMs / 1000)
  const res = await fetch(`${base}/0/public/OHLC?pair=XBTUSD&interval=${interval}&since=${since}`)
  if (!res.ok) return []
  const raw = (await res.json()) as { result?: Record<string, unknown> }
  const rows = krakenOhlcRows(raw.result)
  const out: Candle[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue
    const t = Number(row[0])
    const open = Number(row[1])
    const high = Number(row[2])
    const low = Number(row[3])
    const close = Number(row[4])
    if (!(t > 0 && close > 0)) continue
    out.push({
      openTime: t * 1000,
      open,
      high,
      low,
      close,
    })
  }
  return out.sort((a, b) => a.openTime - b.openTime)
}

const bybitInterval = (barMs: number): string => {
  if (barMs < 60_000) return '1'
  if (barMs < 5 * 60_000) return '5'
  return '15'
}

const fetchBybitCandles = async (startMs: number, barMs: number): Promise<Candle[]> => {
  const base = midHistoryRestBase('/bybit-api', 'https://api.bybit.com')
  const params = new URLSearchParams({
    category: 'linear',
    symbol: 'BTCUSDT',
    interval: bybitInterval(barMs),
    start: String(Math.floor(startMs)),
    limit: '1000',
  })
  const res = await fetch(`${base}/v5/market/kline?${params}`)
  if (!res.ok) return []
  const raw = (await res.json()) as { result?: { list?: string[][] } }
  const list = raw.result?.list ?? []
  const out: Candle[] = []
  for (const row of list) {
    if (!Array.isArray(row) || row.length < 5) continue
    const openTime = Number(row[0])
    const open = Number(row[1])
    const high = Number(row[2])
    const low = Number(row[3])
    const close = Number(row[4])
    if (!(openTime > 0 && close > 0)) continue
    out.push({ openTime, open, high, low, close })
  }
  return out.sort((a, b) => a.openTime - b.openTime)
}

const okxBar = (barMs: number): string => {
  if (barMs < 60_000) return '1m'
  if (barMs < 5 * 60_000) return '5m'
  return '15m'
}

const fetchOkxCandles = async (_nowMs: number, barMs: number, windowMin: HeatmapTimelineWindowMin): Promise<Candle[]> => {
  const base = midHistoryRestBase('/okx-api', 'https://www.okx.com')
  const limit = Math.min(300, windowMin + 20)
  const params = new URLSearchParams({
    instId: 'BTC-USDT-SWAP',
    bar: okxBar(barMs),
    limit: String(limit),
  })
  const res = await fetch(`${base}/api/v5/market/candles?${params}`)
  if (!res.ok) return []
  const raw = (await res.json()) as { data?: string[][] }
  const rows = raw.data ?? []
  const out: Candle[] = []
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 5) continue
    const openTime = Number(row[0])
    const open = Number(row[1])
    const high = Number(row[2])
    const low = Number(row[3])
    const close = Number(row[4])
    if (!(openTime > 0 && close > 0)) continue
    out.push({ openTime, open, high, low, close })
  }
  return out.sort((a, b) => a.openTime - b.openTime)
}

const hyperliquidInterval = (barMs: number): string => {
  if (barMs < 60_000) return '1m'
  if (barMs < 5 * 60_000) return '5m'
  return '15m'
}

const fetchHyperliquidCandles = async (startMs: number, endMs: number, barMs: number): Promise<Candle[]> => {
  const res = await fetch(env.hyperliquidInfoUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'candleSnapshot',
      req: { coin: 'BTC', interval: hyperliquidInterval(barMs), startTime: startMs, endTime: endMs },
    }),
  })
  if (!res.ok) return []
  const body = (await res.json()) as
    | { t?: number | string; o?: number | string; h?: number | string; l?: number | string; c?: number | string }[]
    | { data?: { t?: number | string; o?: number | string; h?: number | string; l?: number | string; c?: number | string }[] }
  const raw = Array.isArray(body) ? body : Array.isArray(body.data) ? body.data : []
  if (raw.length === 0) return []
  const out: Candle[] = []
  for (const row of raw) {
    const t = Number(row.t)
    const c = Number(row.c)
    const o = Number(row.o)
    const h = Number(row.h)
    const l = Number(row.l)
    if (!(t > 0 && c > 0)) continue
    out.push({ openTime: t, open: o, high: h, low: l, close: c })
  }
  return out.sort((a, b) => a.openTime - b.openTime)
}

const normalizeToBarMs = (candles: readonly Candle[], barMs: number, windowMin: HeatmapTimelineWindowMin): Candle[] => {
  if (candles.length === 0) return []
  if (windowMin === 60 && barMs >= 60_000) return normalizeCandleTimes(candles)
  if (barMs < 60_000) return aggregateCandles(normalizeCandleTimes(candles), barMs)
  return aggregateCandles(normalizeCandleTimes(candles), barMs)
}

export type HeatmapVenueMidFetchBounds = { startMs: number; endMs: number }

/** REST backfill for heatmap venue mid lines (kline close ≈ price path). */
export const fetchHeatmapVenueMidHistory = async (
  windowMin: HeatmapTimelineWindowMin,
  bounds?: HeatmapVenueMidFetchBounds,
): Promise<VenueMidHistory> => {
  const barMs = heatmapCandleBarMs(windowMin)
  const windowMs = windowMin * 60_000
  const now = bounds?.endMs ?? Date.now()
  const start = bounds?.startMs ?? now - windowMs - HEATMAP_CANDLE_MARGIN_MS
  const startSec = Math.floor(start / 1000)
  const endSec = Math.ceil(now / 1000)
  const coinbaseGran = barMs >= 60_000 ? 60 : 60

  const [binancePerp, coinbase, hyperliquid, bybitPerp, okxPerp, krakenSpot] = await Promise.all([
    safeVenueCandles(() => binancePerpCandlesForWindow(windowMin, start, barMs)),
    safeVenueCandles(() => fetchCoinbaseCandles(startSec, endSec, coinbaseGran)),
    safeVenueCandles(() => fetchHyperliquidCandles(start, now, barMs)),
    safeVenueCandles(() => fetchBybitCandles(start, barMs)),
    safeVenueCandles(() => fetchOkxCandles(now, barMs, windowMin)),
    safeVenueCandles(() => fetchKrakenCandles(start, barMs)),
  ])

  const out: VenueMidHistory = {
    binancePerp: filterCandlesToWindow(normalizeToBarMs(binancePerp, barMs, windowMin), start, now),
    coinbase: filterCandlesToWindow(normalizeToBarMs(coinbase, barMs, windowMin), start, now),
    hyperliquid: filterCandlesToWindow(normalizeToBarMs(hyperliquid, barMs, windowMin), start, now),
    bybitPerp: filterCandlesToWindow(normalizeToBarMs(bybitPerp, barMs, windowMin), start, now),
    okxPerp: filterCandlesToWindow(normalizeToBarMs(okxPerp, barMs, windowMin), start, now),
    krakenSpot: filterCandlesToWindow(normalizeToBarMs(krakenSpot, barMs, windowMin), start, now),
  }

  for (const venue of HEATMAP_VENUE_MID_LINE_VENUES) {
    if (!out[venue]?.length) delete out[venue]
  }
  return out
}