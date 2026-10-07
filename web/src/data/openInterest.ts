import { useEffect, useState } from 'react'
import { formatLiqCountdown, liqSwapAtMs } from '../ui/format'

export interface OpenInterestSnapshot {
  sampledAt: number
  /** Contracts, in BTC for BTCUSDT_PERP.A. */
  openInterest: number
  ratio: number
  longPct: number
  shortPct: number
  /** Unix seconds when the displayed liquidation hour began. Null until the worker has a closed bar. */
  liqBarStart: number | null
  longLiqBtc: number | null
  shortLiqBtc: number | null
  longLiqUsd: number | null
  shortLiqUsd: number | null
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
  liqBarStart: null,
  longLiqBtc: null,
  shortLiqBtc: null,
  longLiqUsd: null,
  shortLiqUsd: null,
}

const optionalLiq = (value: unknown): number | null => {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : null
}

const liquidationFields = (
  row: Record<string, unknown>,
): Pick<OpenInterestSnapshot, 'liqBarStart' | 'longLiqBtc' | 'shortLiqBtc' | 'longLiqUsd' | 'shortLiqUsd'> => {
  const empty = {
    liqBarStart: null,
    longLiqBtc: null,
    shortLiqBtc: null,
    longLiqUsd: null,
    shortLiqUsd: null,
  }
  const liqBarStart = optionalLiq(row.liqBarStart)
  const longLiqBtc = optionalLiq(row.longLiqBtc)
  const shortLiqBtc = optionalLiq(row.shortLiqBtc)
  const longLiqUsd = optionalLiq(row.longLiqUsd)
  const shortLiqUsd = optionalLiq(row.shortLiqUsd)
  if (liqBarStart == null || liqBarStart <= 0 || longLiqBtc == null || shortLiqBtc == null || longLiqUsd == null || shortLiqUsd == null) {
    return empty
  }
  return { liqBarStart, longLiqBtc, shortLiqBtc, longLiqUsd, shortLiqUsd }
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
    ...liquidationFields(row),
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

/** Counts down to the next hour swap. The bar time comes from the worker; the tick is local. */
export const useLiqCountdown = (liqBarStart: number | null): string => {
  const [label, setLabel] = useState('—')

  useEffect(() => {
    if (liqBarStart == null) {
      setLabel('—')
      return
    }
    const tick = () => setLabel(formatLiqCountdown(liqSwapAtMs(liqBarStart) - Date.now()))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [liqBarStart])

  return label
}
