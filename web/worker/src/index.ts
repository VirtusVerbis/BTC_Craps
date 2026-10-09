/**
 * Samples Coinalyze open interest, the long/short account ratio, and the
 * last closed 5-minute bar of long/short liquidations.
 * The API key stays on the worker. The page only reads the KV snapshot.
 */

interface Env {
  OI_SNAPSHOT: {
    get(key: string): Promise<string | null>
    put(key: string, value: string): Promise<void>
  }
  COINALYZE_API_KEY?: string
}

interface Snapshot {
  sampledAt: number
  openInterest: number
  ratio: number
  longPct: number
  shortPct: number
  liqBarStart?: number
  longLiqBtc?: number
  shortLiqBtc?: number
  longLiqUsd?: number
  shortLiqUsd?: number
}

interface LiqFields {
  liqBarStart: number
  longLiqBtc: number
  shortLiqBtc: number
  longLiqUsd: number
  shortLiqUsd: number
}

const HOUR_SEC = 60 * 60
/** Closed liquidation bar length. The page countdown uses the same 5 minutes. */
const LIQ_BAR_SEC = 5 * 60

const SYMBOL = 'BTCUSDT_PERP.A'
const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : value == null ? [] : [value])

const num = (value: unknown): number | null => {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(n) ? n : null
}

const readOpenInterest = (payload: unknown): number | null => {
  for (const item of asList(payload)) {
    const row = asRecord(item)
    const value = num(row?.value)
    if (value != null && value > 0) return value
  }
  return null
}

const readLatestRatio = (payload: unknown): { ratio: number; longPct: number; shortPct: number } | null => {
  let bestT = -Infinity
  let best: { ratio: number; longPct: number; shortPct: number } | null = null
  const consider = (row: Record<string, unknown> | null) => {
    if (!row) return
    const ratio = num(row.r ?? row.ratio)
    const longPct = num(row.l ?? row.longPct ?? row.long)
    const shortPct = num(row.s ?? row.shortPct ?? row.short)
    const t = num(row.t ?? row.timestamp) ?? 0
    if (ratio == null || longPct == null || shortPct == null) return
    if (t >= bestT) {
      bestT = t
      best = { ratio, longPct, shortPct }
    }
  }
  for (const item of asList(payload)) {
    const row = asRecord(item)
    if (!row) continue
    const history = row.history
    if (Array.isArray(history)) {
      for (const bar of history) consider(asRecord(bar))
    } else {
      consider(row)
    }
  }
  return best
}

const walkHistory = (payload: unknown, consider: (row: Record<string, unknown> | null) => void): void => {
  for (const item of asList(payload)) {
    const row = asRecord(item)
    if (!row) continue
    const history = row.history
    if (Array.isArray(history)) {
      for (const bar of history) consider(asRecord(bar))
    } else {
      consider(row)
    }
  }
}

/** Latest bar that has fully closed. `t` is the bar start, in seconds. */
const readClosedLiquidation = (payload: unknown, nowSec: number): { t: number; l: number; s: number } | null => {
  let bestT = -Infinity
  let best: { t: number; l: number; s: number } | null = null
  walkHistory(payload, (row) => {
    if (!row) return
    const t = num(row.t)
    const l = num(row.l)
    const s = num(row.s)
    if (t == null || l == null || s == null || l < 0 || s < 0) return
    if (t + LIQ_BAR_SEC > nowSec) return
    if (t >= bestT) {
      bestT = t
      best = { t, l, s }
    }
  })
  return best
}

const readLiquidationAt = (payload: unknown, barStart: number): { l: number; s: number } | null => {
  let found: { l: number; s: number } | null = null
  walkHistory(payload, (row) => {
    if (!row) return
    const t = num(row.t)
    const l = num(row.l)
    const s = num(row.s)
    if (t !== barStart || l == null || s == null || l < 0 || s < 0) return
    found = { l, s }
  })
  return found
}

const liqFrom = (snapshot: Snapshot | null): LiqFields | null => {
  if (!snapshot) return null
  const { liqBarStart, longLiqBtc, shortLiqBtc, longLiqUsd, shortLiqUsd } = snapshot
  if (
    liqBarStart == null ||
    longLiqBtc == null ||
    shortLiqBtc == null ||
    longLiqUsd == null ||
    shortLiqUsd == null ||
    liqBarStart <= 0 ||
    longLiqBtc < 0 ||
    shortLiqBtc < 0 ||
    longLiqUsd < 0 ||
    shortLiqUsd < 0
  ) {
    return null
  }
  return { liqBarStart, longLiqBtc, shortLiqBtc, longLiqUsd, shortLiqUsd }
}

/** The closed bar stays on screen until the next 5-minute bar ends. */
const liqStillCurrent = (liq: LiqFields | null, nowSec: number): liq is LiqFields =>
  liq != null && nowSec < liq.liqBarStart + 2 * LIQ_BAR_SEC

const fetchLiquidation = async (key: string, nowSec: number): Promise<LiqFields | null> => {
  const from = nowSec - 3 * LIQ_BAR_SEC
  const url = (usd: boolean) =>
    `https://api.coinalyze.net/v1/liquidation-history?symbols=${SYMBOL}` +
    `&interval=5min&from=${from}&to=${nowSec}&convert_to_usd=${usd ? 'true' : 'false'}` +
    `&api_key=${encodeURIComponent(key)}`
  const [btcRes, usdRes] = await Promise.all([
    fetch(url(false), { signal: AbortSignal.timeout(8000) }),
    fetch(url(true), { signal: AbortSignal.timeout(8000) }),
  ])
  if (!btcRes.ok || !usdRes.ok) return null
  const btc = readClosedLiquidation(await btcRes.json(), nowSec)
  if (!btc) return null
  const usd = readLiquidationAt(await usdRes.json(), btc.t)
  if (!usd) return null
  return {
    liqBarStart: btc.t,
    longLiqBtc: btc.l,
    shortLiqBtc: btc.s,
    longLiqUsd: usd.l,
    shortLiqUsd: usd.s,
  }
}

const readStored = (raw: string | null): Snapshot | null => {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    return asRecord(parsed) as Snapshot | null
  } catch {
    return null
  }
}

const sample = async (env: Env): Promise<void> => {
  const key = env.COINALYZE_API_KEY
  if (!key) return
  const nowSec = Math.floor(Date.now() / 1000)
  const from = nowSec - HOUR_SEC
  const oiUrl = `https://api.coinalyze.net/v1/open-interest?symbols=${SYMBOL}&api_key=${encodeURIComponent(key)}`
  const ratioUrl =
    `https://api.coinalyze.net/v1/long-short-ratio-history?symbols=${SYMBOL}` +
    `&interval=5min&from=${from}&to=${nowSec}&api_key=${encodeURIComponent(key)}`
  try {
    const previous = readStored(await env.OI_SNAPSHOT.get('latest'))
    const [oiRes, ratioRes] = await Promise.all([
      fetch(oiUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(ratioUrl, { signal: AbortSignal.timeout(8000) }),
    ])
    if (!oiRes.ok || !ratioRes.ok) return
    const openInterest = readOpenInterest(await oiRes.json())
    const ratio = readLatestRatio(await ratioRes.json())
    if (openInterest == null || ratio == null) return
    let liq = liqFrom(previous)
    if (!liqStillCurrent(liq, nowSec)) {
      liq = (await fetchLiquidation(key, nowSec)) ?? liq
    }
    const snapshot: Snapshot = {
      sampledAt: Date.now(),
      openInterest,
      ratio: ratio.ratio,
      longPct: ratio.longPct,
      shortPct: ratio.shortPct,
      ...(liq ?? {}),
    }
    await env.OI_SNAPSHOT.put('latest', JSON.stringify(snapshot))
  } catch {
    // Keep the previous KV value.
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'GET' || (url.pathname !== '/' && url.pathname !== '/oi')) {
      return new Response('not found', { status: 404 })
    }
    const raw = await env.OI_SNAPSHOT.get('latest')
    return new Response(raw ?? 'null', { headers: JSON_HEADERS })
  },

  async scheduled(_event: unknown, env: Env): Promise<void> {
    await sample(env)
  },
}
