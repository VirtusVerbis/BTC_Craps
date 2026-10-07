import { useEffect, useState } from 'react'

export interface OpenInterestSnapshot {
  sampledAt: number
  /** Contracts, in BTC for BTCUSDT_PERP.A. */
  openInterest: number
  ratio: number
  longPct: number
  shortPct: number
}

/** How often the page re-reads the worker snapshot. */
export const OI_POLL_MS = 60_000

/**
 * Used when the worker is not running locally, so the felt still has stacks.
 * A live `/oi` response replaces it.
 */
const DEV_SAMPLE: OpenInterestSnapshot = {
  sampledAt: 0,
  openInterest: 96669,
  ratio: 1.3267,
  longPct: 57.02,
  shortPct: 42.98,
}

export const parseOpenInterest = (value: unknown): OpenInterestSnapshot | null => {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const openInterest = Number(row.openInterest)
  const ratio = Number(row.ratio)
  const longPct = Number(row.longPct)
  const shortPct = Number(row.shortPct)
  const sampledAt = Number(row.sampledAt)
  if (!(openInterest > 0) || !(longPct >= 0) || !(shortPct >= 0) || !Number.isFinite(ratio)) return null
  return {
    sampledAt: Number.isFinite(sampledAt) ? sampledAt : 0,
    openInterest,
    ratio,
    longPct,
    shortPct,
  }
}

export const fetchOpenInterest = async (): Promise<OpenInterestSnapshot | null> => {
  try {
    const res = await fetch('/oi')
    if (!res.ok) return null
    return parseOpenInterest(await res.json())
  } catch {
    return null
  }
}

export const useOpenInterest = (): OpenInterestSnapshot | null => {
  const [snapshot, setSnapshot] = useState<OpenInterestSnapshot | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetchOpenInterest().then((next) => {
        if (cancelled) return
        if (next) {
          setSnapshot(next)
          return
        }
        if (import.meta.env.DEV) setSnapshot((current) => current ?? DEV_SAMPLE)
      })
    }
    load()
    const id = window.setInterval(load, OI_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return snapshot
}
