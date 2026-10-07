/**
 * Samples Coinalyze open interest and the long/short account ratio.
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
}

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

const sample = async (env: Env): Promise<void> => {
  const key = env.COINALYZE_API_KEY
  if (!key) return
  const nowSec = Math.floor(Date.now() / 1000)
  const from = nowSec - 60 * 60
  const oiUrl = `https://api.coinalyze.net/v1/open-interest?symbols=${SYMBOL}&api_key=${encodeURIComponent(key)}`
  const ratioUrl =
    `https://api.coinalyze.net/v1/long-short-ratio-history?symbols=${SYMBOL}` +
    `&interval=5min&from=${from}&to=${nowSec}&api_key=${encodeURIComponent(key)}`
  try {
    const [oiRes, ratioRes] = await Promise.all([
      fetch(oiUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(ratioUrl, { signal: AbortSignal.timeout(8000) }),
    ])
    if (!oiRes.ok || !ratioRes.ok) return
    const openInterest = readOpenInterest(await oiRes.json())
    const ratio = readLatestRatio(await ratioRes.json())
    if (openInterest == null || ratio == null) return
    const snapshot: Snapshot = {
      sampledAt: Date.now(),
      openInterest,
      ratio: ratio.ratio,
      longPct: ratio.longPct,
      shortPct: ratio.shortPct,
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
