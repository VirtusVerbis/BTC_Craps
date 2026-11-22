import { env } from '../config/env'
import type { Candle } from './candles'
import { exchangeRestBase } from './exchangeRestBase'
import { fetchBinanceFuturesBtc1mKlines } from './binanceFuturesCandles'
import {
  aggregateCandles,
  HEATMAP_CANDLE_MARGIN_MS,
  heatmapCandleBarMs,
  type HeatmapTimelineWindowMin,
} from './heatmapCandleSeries'
import {
  HEATMAP_VENUE_MID_QUICK_RETRY_MS,
  HEATMAP_VENUE_MID_STAGGER_MS,
  pauseMs,
  recordVenueMidFetchRateLimited,
  recordVenueMidFetchSuccess,
} from './heatmapVenueMidFetchPolicy'
import { DEPTH_VENUE_ORDER } from './microstructure/venueOrder'
import type { VenueId } from './microstructure/types'

const HEATMAP_VENUE_MID_LINE_VENUES: readonly VenueId[] = DEPTH_VENUE_ORDER.filter(
  (v) => v !== 'binanceSpot',
)

/** Venues used for REST mid-line backfill (excludes binanceSpot). */
export const heatmapVenueMidHistoryVenues: readonly VenueId[] = HEATMAP_VENUE_MID_LINE_VENUES

export type VenueMidFetchResult = { candles: Candle[]; rateLimited: boolean }

export type VenueMidHistory = Partial<Record<VenueId, Candle[]>>

const midHistoryRestBase = (proxyPrefix: string, prodOrigin: string): string =>
  exchangeRestBase(proxyPrefix, prodOrigin)

const emptyFetch = (): VenueMidFetchResult => ({ candles: [], rateLimited: false })

const safeVenueMidFetch = async (fn: () => Promise<VenueMidFetchResult>): Promise<VenueMidFetchResult> => {
  try {
    return await fn()
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[heatmapVenueMidHistory] venue fetch failed', err)
    return emptyFetch()
  }
}

const withQuickRateLimitRetry = async (
  fn: () => Promise<VenueMidFetchResult>,
): Promise<VenueMidFetchResult> => {
  const first = await safeVenueMidFetch(fn)
  if (!first.rateLimited) return first
  await pauseMs(HEATMAP_VENUE_MID_QUICK_RETRY_MS)
  return safeVenueMidFetch(fn)
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

const krakenErrorLooksRateLimited = (errors: readonly string[]): boolean =>
  errors.some((e) => /frequency|rate|limit|throttle|too many/i.test(e))

const fetchKrakenCandlesOnce = async (startMs: number, barMs: number): Promise<VenueMidFetchResult> => {
  const base = midHistoryRestBase('/kraken-api', 'https://api.kraken.com')
  const interval = krakenIntervalMin(barMs)
  const since = Math.floor(startMs / 1000)
  const res = await fetch(`${base}/0/public/OHLC?pair=XBTUSD&interval=${interval}&since=${since}`)
  if (!res.ok) return { candles: [], rateLimited: res.status === 429 }
  const raw = (await res.json()) as { error?: string[]; result?: Record<string, unknown> }
  if (raw.error && raw.error.length > 0) {
    return { candles: [], rateLimited: krakenErrorLooksRateLimited(raw.error) }
  }
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
  return { candles: out.sort((a, b) => a.openTime - b.openTime), rateLimited: false }
}

const fetchKrakenCandles = (startMs: number, barMs: number): Promise<VenueMidFetchResult> =>
  withQuickRateLimitRetry(() => fetchKrakenCandlesOnce(startMs, barMs))

const bybitInterval = (barMs: number): string => {
  if (barMs < 60_000) return '1'
  if (barMs < 5 * 60_000) return '5'
  return '15'
}

const bybitKlineLimit = (startMs: number, endMs: number, barMs: number): number => {
  const barMin = Math.max(1, Math.round(barMs / 60_000))
  const spanBars = Math.ceil(Math.max(60_000, endMs - startMs) / barMs)
  return Math.min(1000, Math.max(10, spanBars + barMin * 2))
}

const fetchBybitCandles = async (startMs: number, endMs: number, barMs: number): Promise<Candle[]> => {
  const base = midHistoryRestBase('/bybit-api', 'https://api.bybit.com')
  const params = new URLSearchParams({
    category: 'linear',
    symbol: 'BTCUSDT',
    interval: bybitInterval(barMs),
    start: String(Math.floor(startMs)),
    limit: String(bybitKlineLimit(startMs, endMs, barMs)),
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

const OKX_RATE_LIMIT_CODES = new Set(['50011', '50026', '50013'])

const fetchOkxCandlesOnce = async (
  _nowMs: number,
  barMs: number,
  windowMin: HeatmapTimelineWindowMin,
): Promise<VenueMidFetchResult> => {
  const base = midHistoryRestBase('/okx-api', 'https://www.okx.com')
  const limit = Math.min(300, windowMin + 20)
  const params = new URLSearchParams({
    instId: 'BTC-USDT-SWAP',
    bar: okxBar(barMs),
    limit: String(limit),
  })
  const res = await fetch(`${base}/api/v5/market/candles?${params}`)
  if (!res.ok) return { candles: [], rateLimited: res.status === 429 }
  const raw = (await res.json()) as { code?: string; data?: string[][]; msg?: string }
  if (raw.code !== undefined && raw.code !== '0') {
    return { candles: [], rateLimited: OKX_RATE_LIMIT_CODES.has(raw.code) }
  }
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
  return { candles: out.sort((a, b) => a.openTime - b.openTime), rateLimited: false }
}

const fetchOkxCandles = (
  nowMs: number,
  barMs: number,
  windowMin: HeatmapTimelineWindowMin,
): Promise<VenueMidFetchResult> => withQuickRateLimitRetry(() => fetchOkxCandlesOnce(nowMs, barMs, windowMin))

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

export type FetchHeatmapVenueMidHistoryOptions = {
  skipVenues?: ReadonlySet<VenueId>
}

/** REST backfill for heatmap venue mid lines (kline close ≈ price path). */
export const fetchHeatmapVenueMidHistory = async (
  windowMin: HeatmapTimelineWindowMin,
  bounds?: HeatmapVenueMidFetchBounds,
  options?: FetchHeatmapVenueMidHistoryOptions,
): Promise<VenueMidHistory> => {
  const barMs = heatmapCandleBarMs(windowMin)
  const windowMs = windowMin * 60_000
  const now = bounds?.endMs ?? Date.now()
  const start = bounds?.startMs ?? now - windowMs - HEATMAP_CANDLE_MARGIN_MS
  const startSec = Math.floor(start / 1000)
  const endSec = Math.ceil(now / 1000)
  const coinbaseGran = barMs >= 60_000 ? 60 : 60
  const skip = options?.skipVenues

  const venueFetchers: { venue: VenueId; fetch: () => Promise<VenueMidFetchResult> }[] = [
    {
      venue: 'binancePerp',
      fetch: () =>
        safeVenueMidFetch(async () => ({
          candles: await binancePerpCandlesForWindow(windowMin, start, barMs),
          rateLimited: false,
        })),
    },
    {
      venue: 'coinbase',
      fetch: () =>
        safeVenueMidFetch(async () => ({
          candles: await fetchCoinbaseCandles(startSec, endSec, coinbaseGran),
          rateLimited: false,
        })),
    },
    {
      venue: 'hyperliquid',
      fetch: () =>
        safeVenueMidFetch(async () => ({
          candles: await fetchHyperliquidCandles(start, now, barMs),
          rateLimited: false,
        })),
    },
    {
      venue: 'bybitPerp',
      fetch: () =>
        safeVenueMidFetch(async () => ({
          candles: await fetchBybitCandles(start, now, barMs),
          rateLimited: false,
        })),
    },
    {
      venue: 'okxPerp',
      fetch: () => fetchOkxCandles(now, barMs, windowMin),
    },
    {
      venue: 'krakenSpot',
      fetch: () => fetchKrakenCandles(start, barMs),
    },
  ]

  const rawCandles: Partial<Record<VenueId, Candle[]>> = {}
  let staggered = false
  for (const { venue, fetch } of venueFetchers) {
    if (skip?.has(venue)) continue
    if (staggered) await pauseMs(HEATMAP_VENUE_MID_STAGGER_MS)
    staggered = true

    const result = await fetch()
    rawCandles[venue] = result.candles
    if (result.rateLimited) {
      recordVenueMidFetchRateLimited(venue, now)
    } else if (result.candles.length >= 2) {
      recordVenueMidFetchSuccess(venue)
    }
  }

  const out: VenueMidHistory = {}
  for (const venue of HEATMAP_VENUE_MID_LINE_VENUES) {
    const rows = rawCandles[venue]
    if (!rows?.length) continue
    const normalized = filterCandlesToWindow(normalizeToBarMs(rows, barMs, windowMin), start, now)
    if (normalized.length) out[venue] = normalized
  }

  for (const venue of HEATMAP_VENUE_MID_LINE_VENUES) {
    if (!out[venue]?.length) delete out[venue]
  }
  return out
}