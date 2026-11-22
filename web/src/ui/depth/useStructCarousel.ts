import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Candle } from '../../data/candles'
import { detectStructPattern } from '../../data/ta/structure/structScan'
import {
  STRUCT_CATALOG_ORDER,
  structCatalogEntry,
} from '../../data/ta/structure/structPatternCatalog'
import { TA_CATALOG_STEP_MS, TA_PATTERN_DWELL_MS } from '../../data/ta/taConstants'
import { candlesFingerprint } from '../../data/ta/taScan'
import type { PatternInstance } from '../../data/ta/taTypes'

type UseStructCarouselArgs = {
  enabled: boolean
  candles: readonly Candle[]
}

export const useStructCarousel = ({ enabled, candles }: UseStructCarouselArgs) => {
  const [catalogIndex, setCatalogIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false)
  const [forceScan, setForceScan] = useState(0)
  const scanCacheRef = useRef(new Map<string, PatternInstance[]>())

  const patternId = STRUCT_CATALOG_ORDER[catalogIndex % STRUCT_CATALOG_ORDER.length]!

  const fingerprint = useMemo(() => candlesFingerprint(candles), [candles])

  const instances = useMemo(() => {
    if (!enabled) return []
    const key = `${patternId}:${fingerprint}:${forceScan}`
    const cached = scanCacheRef.current.get(key)
    if (cached) return cached
    const found = detectStructPattern(patternId, candles)
    scanCacheRef.current.set(key, found)
    if (scanCacheRef.current.size > 80) {
      const first = scanCacheRef.current.keys().next().value
      if (first) scanCacheRef.current.delete(first)
    }
    return found
  }, [enabled, patternId, fingerprint, candles, forceScan])

  const advance = useCallback(() => {
    setCatalogIndex((i) => (i + 1) % STRUCT_CATALOG_ORDER.length)
  }, [])

  const prev = useCallback(() => {
    setPaused(true)
    setPlaying(false)
    setCatalogIndex((i) => (i - 1 + STRUCT_CATALOG_ORDER.length) % STRUCT_CATALOG_ORDER.length)
  }, [])

  const next = useCallback(() => {
    setPaused(true)
    setPlaying(false)
    setCatalogIndex((i) => (i + 1) % STRUCT_CATALOG_ORDER.length)
  }, [])

  const togglePlayPause = useCallback(() => {
    setPaused((p) => {
      const nextPaused = !p
      setPlaying(!nextPaused)
      return nextPaused
    })
  }, [])

  const toggleStruct = useCallback((on: boolean) => {
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

  const entry = structCatalogEntry(patternId)

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
    toggleStruct,
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