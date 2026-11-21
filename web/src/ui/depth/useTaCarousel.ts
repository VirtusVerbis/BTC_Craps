import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Candle } from '../../data/candles'
import { TA_CATALOG_ORDER, catalogEntry } from '../../data/ta/taPatternCatalog'
import { TA_CATALOG_STEP_MS, TA_PATTERN_DWELL_MS } from '../../data/ta/taConstants'
import { candlesFingerprint, detectPattern } from '../../data/ta/taScan'
import type { PatternId, PatternInstance } from '../../data/ta/taTypes'

export type TaCarouselState = {
  patternId: PatternId
  instances: PatternInstance[]
  playing: boolean
  paused: boolean
  catalogIndex: number
}

type UseTaCarouselArgs = {
  enabled: boolean
  candles: readonly Candle[]
}

export const useTaCarousel = ({ enabled, candles }: UseTaCarouselArgs) => {
  const [catalogIndex, setCatalogIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false)
  const [forceScan, setForceScan] = useState(0)
  const scanCacheRef = useRef(new Map<string, PatternInstance[]>())

  const patternId = TA_CATALOG_ORDER[catalogIndex % TA_CATALOG_ORDER.length]!

  const fingerprint = useMemo(() => candlesFingerprint(candles), [candles])

  const instances = useMemo(() => {
    if (!enabled) return []
    const key = `${patternId}:${fingerprint}:${forceScan}`
    const cached = scanCacheRef.current.get(key)
    if (cached) return cached
    const found = detectPattern(patternId, candles)
    scanCacheRef.current.set(key, found)
    if (scanCacheRef.current.size > 80) {
      const first = scanCacheRef.current.keys().next().value
      if (first) scanCacheRef.current.delete(first)
    }
    return found
  }, [enabled, patternId, fingerprint, candles, forceScan])

  const advance = useCallback(() => {
    setCatalogIndex((i) => (i + 1) % TA_CATALOG_ORDER.length)
  }, [])

  const prev = useCallback(() => {
    setPaused(true)
    setPlaying(false)
    setCatalogIndex((i) => (i - 1 + TA_CATALOG_ORDER.length) % TA_CATALOG_ORDER.length)
  }, [])

  const next = useCallback(() => {
    setPaused(true)
    setPlaying(false)
    setCatalogIndex((i) => (i + 1) % TA_CATALOG_ORDER.length)
  }, [])

  const togglePlayPause = useCallback(() => {
    setPaused((p) => {
      const nextPaused = !p
      setPlaying(!nextPaused)
      return nextPaused
    })
  }, [])

  const toggleTa = useCallback((on: boolean) => {
    if (!on) {
      setPlaying(false)
      setPaused(false)
      setCatalogIndex(0)
    } else {
      setPlaying(true)
      setPaused(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled || paused || !playing) return undefined
    const delay = instances.length > 0 ? TA_PATTERN_DWELL_MS : TA_CATALOG_STEP_MS
    const id = window.setTimeout(advance, delay)
    return () => window.clearTimeout(id)
  }, [enabled, paused, playing, instances.length, patternId, advance])

  const entry = catalogEntry(patternId)

  const rescan = useCallback(() => {
    scanCacheRef.current.clear()
    setForceScan((n) => n + 1)
  }, [])

  return {
    patternId,
    instances,
    entry,
    playing,
    paused,
    catalogIndex,
    prev,
    next,
    togglePlayPause,
    toggleTa,
    rescan,
    setPlaying: (v: boolean) => {
      setPlaying(v)
      setPaused(!v)
    },
    setPaused: (v: boolean) => {
      setPaused(v)
      if (v) setPlaying(false)
    },
  }
}