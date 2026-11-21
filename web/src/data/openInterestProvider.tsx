import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  fetchOpenInterest,
  OI_POLL_MS,
  type OpenInterestSnapshot,
} from './openInterest'

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

const OpenInterestContext = createContext<OpenInterestSnapshot | null>(null)

export const OpenInterestProvider = ({ children }: { children: ReactNode }) => {
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

  return <OpenInterestContext.Provider value={snapshot}>{children}</OpenInterestContext.Provider>
}

export const useOpenInterestFromContext = (): OpenInterestSnapshot | null => useContext(OpenInterestContext)