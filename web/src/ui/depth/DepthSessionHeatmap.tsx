import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { type Candle } from '../../data/candles'
import {
  heatmapCandleBarMs,
  heatmapSpotCandlesForChart,
  HEATMAP_WINDOW_24H_MIN,
  type HeatmapTimelineWindowMin,
} from '../../data/heatmapCandleSeries'
import { heatmapSpotCandlesWithLiveMid } from '../../data/heatmapSpotLiveBar'
import {
  HEATMAP_SPOT_CANDLE_TAIL_POLL_MS,
  loadHeatmapSpotCandlesWithCacheSWR,
  readHeatmapSpotCandleCache,
} from '../../data/heatmapSpotCandleCache'
import {
  heatmapAxisMidRangePrice,
  heatmapPriceToTopPercent,
  type HeatmapPriceAxis,
} from '../../data/microstructure/depthHeatmapPriceAxis'
import { HEATMAP_PRICE_TICK_USD } from '../../data/microstructure/depthHeatmapPriceBins'
import {
  applyHeatmapViewportToColumns,
  buildMergedSessionHeatmap,
  heatmapGridMax,
  heatmapWindowTimeRange,
  overlayLiveBooksOnLatestHeatmapColumn,
  type HeatmapGridColumn,
} from '../../data/microstructure/depthSessionHeatmapGrid'
import { heatmapViewportForChartHeight } from '../../data/microstructure/depthHeatmapViewport'
import { DEPTH_WINDOW_24H_BUCKETS } from '../../data/microstructure/depthDisplayConstants'
import {
  advanceTimelineScale,
  heatmapCanvasMetricsFit,
  DEPTH_WINDOW_15_MIN_BUCKETS,
  DEPTH_WINDOW_30_MIN_BUCKETS,
  DEPTH_WINDOW_60_MIN_BUCKETS,
  snapTimelineNow,
  timelineDisplayPlan,
  type TimelineScaleState,
} from '../../data/microstructure/depthTimelineGrid'
import type { MicrostructureState } from '../../data/microstructure/types'
import { DepthInfoIcon } from './DepthInfoIcon'
import { formatWallUsd } from './depthWallRowMetrics'
import { DEPTH_VENUE_ORDER, depthVenueShort } from './depthVenueTheme'
import { resolveVenueMidPolylines } from '../../data/microstructure/depthHeatmapVenueMids'
import {
  HEATMAP_VENUE_MID_POLL_MS,
  loadHeatmapVenueMidHistoryWithCacheSWR,
  readVenueMidHistoryCache,
} from '../../data/heatmapVenueMidCache'
import type { VenueMidHistory } from '../../data/heatmapVenueMidHistory'
import { drawHeatmapCandleOverlay } from './depthHeatmapCandles'
import {
  drawHeatmapCandlesWithTaHighlights,
  drawHeatmapTaAnnotations,
  highlightedOpenTimes,
} from './depthHeatmapTaDraw'
import { taLiquidityLineForAnchor } from '../../data/ta/taLiquidityContext'
import { taOiSnippet } from '../../data/ta/taOiSnippet'
import { useOpenInterest } from '../../data/openInterest'
import { structWindowSupported } from '../../data/ta/structure/structWindow'
import { useStructCarousel } from './useStructCarousel'
import { useTaCarousel } from './useTaCarousel'
import { TaHeatmapStrip } from './TaHeatmapStrip'
import { taStripPlacementForInstances } from './taStripPlacement'
import { TaHeatmapTransport } from './TaHeatmapTransport'
import type { PatternInstance } from '../../data/ta/taTypes'
import { drawDraggedHeatmapDepth } from './depthHeatmapDragPaint'
import { drawHeatmapVenueMidPolylines } from './depthHeatmapVenueMidLines'
import { offRangeChipStyle } from './depthHeatmapOffRangeChip'
import {
  aggregateMaxUsdByPrice,
  drawHeatmapDepthProfile,
  drawHeatmapOffRangeEdgeBleed,
  latestHeatmapColumn,
  nearestOffRangeLargePools,
  qualifiesOffRangePool,
  type OffRangeEdge,
  type OffRangeSummary,
} from './depthHeatmapDepthProfile'
import {
  buildHeatmapVenueAxisLabels,
  HEATMAP_VENUE_AXIS_LABEL_VENUES,
} from './depthHeatmapVenueAxisLabels'
import { buildSpotKlinePolyline } from '../../data/microstructure/depthHeatmapSpotKline'
import {
  computeHeatmapSessionPriceAxis,
  stabilizeHeatmapPriceAxis,
  type HeatmapAxisStabilizeState,
} from '../../data/microstructure/depthHeatmapAxisPolicy'
import { drawHeatmapSpotKlinePolyline } from './depthHeatmapSpotKlineLine'
import { HeatmapSpotAvgAxisLabel } from './HeatmapSpotAvgAxisLabel'
import {
  buildDailyMaPolylines,
  buildDailySmaSeries,
  dailySmaRailPlacements,
  dailySmaVisibleOnAxis,
  findDailySmaCrosses,
  HEATMAP_DAILY_SMA_200,
  latestDailyMaCrossInRange,
  shouldBootstrapDailySmaFetch,
  type DailyMaPolylines,
} from '../../data/heatmapDailySma'
import {
  HEATMAP_DAILY_SMA_CACHE_TTL_MS,
  loadHeatmapDailySmaWithCacheSWR,
  readHeatmapDailySmaCache,
} from '../../data/heatmapDailySmaCache'
import {
  drawHeatmapDailyMaCrossMarker,
  drawHeatmapDailyMaPolylines,
} from './depthHeatmapDailyMaLines'
import { HeatmapDailyMaCrossStrip } from './HeatmapDailyMaCrossStrip'
import { HeatmapDailyMaRailLabels, heatmapDailyMaRailAria } from './HeatmapDailyMaRailLabels'
import {
  flushHeatmapDepthPersistedColumns,
  loadHeatmapDepthPersistedColumns,
} from '../../data/heatmapDepthPersistDb'
import {
  HEATMAP_DEPTH_PERSIST_FLUSH_MS,
  type HeatmapDepthPersistedColumn,
} from '../../data/heatmapDepthPersistTypes'
import {
  heatmapDepthPersistedCarriedFromGrid,
  mergePersistedDepthIntoLiveColumns,
  upsertPersistedDepthColumns,
} from '../../data/heatmapDepthPersistMerge'

/** Poll spot REST on tail cadence; full window backfill throttled in cache layer. */
const HEATMAP_CANDLE_POLL_MS = HEATMAP_SPOT_CANDLE_TAIL_POLL_MS

const STORAGE_HEATMAP_WINDOW = 'depthHeatmapWindowMin'
const STORAGE_TIMELINE_WINDOW_LEGACY = 'depthTimelineWindowMin'
const STORAGE_STRUCT_ENABLED = 'depthHeatmapStructEnabled'

type HeatmapWindowMin = HeatmapTimelineWindowMin

const readStructEnabled = (windowMin: HeatmapWindowMin): boolean => {
  if (!structWindowSupported(windowMin)) return false
  try {
    return sessionStorage.getItem(STORAGE_STRUCT_ENABLED) === '1'
  } catch {
    return false
  }
}

const readWindowMin = (): HeatmapWindowMin => {
  try {
    let v = sessionStorage.getItem(STORAGE_HEATMAP_WINDOW)
    if (v == null) {
      v = sessionStorage.getItem(STORAGE_TIMELINE_WINDOW_LEGACY)
    }
    if (v === '15') return 15
    if (v === '30') return 30
    if (v === '60') return 60
    if (v === '1440') return HEATMAP_WINDOW_24H_MIN
    return 15
  } catch {
    return 15
  }
}

const bucketCountForWindow = (windowMin: HeatmapWindowMin): number => {
  if (windowMin === 15) return DEPTH_WINDOW_15_MIN_BUCKETS
  if (windowMin === 30) return DEPTH_WINDOW_30_MIN_BUCKETS
  if (windowMin === HEATMAP_WINDOW_24H_MIN) return DEPTH_WINDOW_24H_BUCKETS
  return DEPTH_WINDOW_60_MIN_BUCKETS
}

const HEATMAP_CHART_FALLBACK_H = 400
const HEATMAP_CHART_MIN_H = 120
const HEATMAP_PROFILE_RAIL_W = 32

const emptyAxisStabilize = (): HeatmapAxisStabilizeState => ({
  tighterSince: null,
  pendingMin: null,
  pendingMax: null,
  widerSince: null,
  pendingWiderMin: null,
  pendingWiderMax: null,
})

/** Skip Y-axis easing after window change so scale snaps to new candles/polylines. */
const HEATMAP_AXIS_WINDOW_WARMUP_MS = 2_500

/** Canvas height follows the chart row slot; do not inflate above the row (panel uses overflow hidden). */
const heatmapSlotHeightPx = (row: HTMLElement | null, fallbackMin: number): number => {
  if (!row) return fallbackMin
  const rowH = Math.floor(row.getBoundingClientRect().height)
  const clientH = row.clientHeight
  const slot = Math.max(rowH, clientH)
  if (slot <= 0) return fallbackMin
  return Math.max(HEATMAP_CHART_MIN_H, slot)
}

const formatAxisPrice = (price: number): string =>
  `$${Math.round(price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const bpsFromMid = (mid: number, price: number): number => {
  if (!(mid > 0)) return 0
  return Math.round((Math.abs(price - mid) / mid) * 10_000)
}

const formatOffRangeChip = (direction: 'above' | 'below', edge: OffRangeEdge, mid: number): string => {
  const arrow = direction === 'above' ? '↑' : '↓'
  const bps = bpsFromMid(mid, edge.price)
  return `${arrow} +${bps} bps · ${formatWallUsd(edge.usd)} @ ${formatAxisPrice(edge.price)}`
}

const offRangeChipAria = (direction: 'above' | 'below', edge: OffRangeEdge, mid: number): string => {
  const side = direction === 'above' ? 'Above chart' : 'Below chart'
  return `${side}: nearest pool ≥ $1M, ${bpsFromMid(mid, edge.price)} bps from perp mid, ${formatWallUsd(edge.usd)} at ${formatAxisPrice(edge.price)}`
}

type TaDrawOpts = {
  instances: readonly PatternInstance[]
}

const biasLabel = (bias: PatternInstance['bias']): string => {
  if (bias === 'bullish') return 'Bullish bias'
  if (bias === 'bearish') return 'Bearish bias'
  return 'Neutral'
}

const drawHeatmap = (
  ctx: CanvasRenderingContext2D,
  columns: readonly HeatmapGridColumn[],
  w: number,
  h: number,
  maxVal: number,
  axis: HeatmapPriceAxis,
  liveMid: number,
  candles: readonly Candle[],
  timeRange: { start: number; end: number },
  candleIntervalMs: number,
  offRange: OffRangeSummary,
  venueMidPolylines: ReturnType<typeof resolveVenueMidPolylines>,
  liveSpotMid: number,
  rangeEnd: number,
  dailyMa?: { polylines: DailyMaPolylines; cross: ReturnType<typeof latestDailyMaCrossInRange> },
  ta?: TaDrawOpts,
) => {
  const rowH = h / axis.rows
  ctx.fillStyle = '#0a0e17'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = 'rgba(246, 240, 218, 0.06)'
  ctx.lineWidth = 1
  const gridEvery = Math.max(1, Math.floor(axis.rows / 8))
  for (let row = 0; row <= axis.rows; row += gridEvery) {
    const y = row * rowH + 0.5
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }

  drawDraggedHeatmapDepth(ctx, columns, w, h, maxVal, axis, timeRange)
  drawHeatmapOffRangeEdgeBleed(ctx, w, h, offRange, maxVal)

  if (liveMid > axis.priceMin && liveMid < axis.priceMax) {
    const midRow = (axis.priceMax - liveMid) / axis.tick
    const y = midRow * rowH
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(w, y + 0.5)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineWidth = 1
  }

  const spotKline = buildSpotKlinePolyline(
    candles,
    candleIntervalMs,
    timeRange,
    rangeEnd,
    liveSpotMid > 0 ? liveSpotMid : undefined,
  )
  drawHeatmapSpotKlinePolyline(ctx, spotKline, w, h, axis, timeRange)

  drawHeatmapVenueMidPolylines(ctx, venueMidPolylines, w, h, axis, timeRange)
  if (dailyMa) {
    drawHeatmapDailyMaPolylines(ctx, dailyMa.polylines, w, h, axis, timeRange)
    drawHeatmapDailyMaCrossMarker(ctx, dailyMa.cross, w, h, timeRange)
  }
  if (ta && ta.instances.length > 0) {
    const highlights = highlightedOpenTimes(ta.instances, candles)
    drawHeatmapCandlesWithTaHighlights(ctx, candles, w, h, axis, timeRange, candleIntervalMs, highlights)
    drawHeatmapTaAnnotations(ctx, ta.instances, candles, w, h, axis, timeRange, candleIntervalMs)
  } else {
    drawHeatmapCandleOverlay(ctx, candles, w, h, axis, timeRange, candleIntervalMs)
  }
}

interface DepthSessionHeatmapProps {
  micro: MicrostructureState
  fillAvailableHeight?: boolean
}

export const DepthSessionHeatmap = ({ micro, fillAvailableHeight = false }: DepthSessionHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const profileCanvasRef = useRef<HTMLCanvasElement>(null)
  const chartRowRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scaleStateRef = useRef<TimelineScaleState>({ tick: 0, max: 1 })
  const [taEnabled, setTaEnabled] = useState(false)
  const [structEnabled, setStructEnabled] = useState(() => readStructEnabled(readWindowMin()))
  const [frozenTimelineEnd, setFrozenTimelineEnd] = useState<number | null>(null)
  const [taAnnounce, setTaAnnounce] = useState<string | null>(null)
  const openInterest = useOpenInterest()
  const [windowMin, setWindowMin] = useState<HeatmapWindowMin>(readWindowMin())
  const [chartSize, setChartSize] = useState({ w: 900, h: 400 })
  const [axisMaxUsd, setAxisMaxUsd] = useState(1)
  const [candles, setCandles] = useState<Candle[]>([])
  const [dailyCandles, setDailyCandles] = useState<Candle[]>(() => readHeatmapDailySmaCache() ?? [])
  const [venueMidHistory, setVenueMidHistory] = useState<VenueMidHistory | null>(() =>
    readVenueMidHistoryCache(readWindowMin()),
  )
  const [offRangePools, setOffRangePools] = useState<OffRangeSummary>({ above: null, below: null })
  const [priceAxis, setPriceAxis] = useState<HeatmapPriceAxis>(() => ({
    priceMin: 99_000,
    priceMax: 101_000,
    tick: HEATMAP_PRICE_TICK_USD,
    rows: 40,
  }))
  const priceAxisPaintRef = useRef(priceAxis)
  const axisWarmupUntilMsRef = useRef(0)
  const axisStabilizeRef = useRef<HeatmapAxisStabilizeState>({
    tighterSince: null,
    pendingMin: null,
    pendingMax: null,
    widerSince: null,
    pendingWiderMin: null,
    pendingWiderMax: null,
  })
  const depthPersistForPaintRef = useRef<HeatmapDepthPersistedColumn[]>([])
  const depthPersistFlushBatchRef = useRef<HeatmapDepthPersistedColumn[]>([])
  const depthPersistFlushTimerRef = useRef<number | null>(null)
  const [depthPersistHydrated, setDepthPersistHydrated] = useState(0)

  const bucketCount = bucketCountForWindow(windowMin)
  const candleBarMs = heatmapCandleBarMs(windowMin)

  const markHeatmapWindowWarmup = () => {
    axisWarmupUntilMsRef.current = Date.now() + HEATMAP_AXIS_WINDOW_WARMUP_MS
    scaleStateRef.current = { tick: 0, max: 1 }
    axisStabilizeRef.current = emptyAxisStabilize()
    setAxisMaxUsd(1)
  }

  const applyHeatmapWindowChange = (next: HeatmapWindowMin) => {
    markHeatmapWindowWarmup()
    setOffRangePools({ above: null, below: null })
    setCandles(readHeatmapSpotCandleCache(next) ?? [])
    setVenueMidHistory(readVenueMidHistoryCache(next))
    setWindowMin(next)
  }

  useLayoutEffect(() => {
    markHeatmapWindowWarmup()
  }, [windowMin, bucketCount])

  const displayPlan = useMemo(() => timelineDisplayPlan(bucketCount), [bucketCount])
  const timelineNowRef = useRef(0)
  const liveTimelineNow = snapTimelineNow(micro.sampledAt)
  const patternOverlayOn = taEnabled || structEnabled
  const timelineNow =
    patternOverlayOn && frozenTimelineEnd != null ? frozenTimelineEnd : liveTimelineNow
  timelineNowRef.current = timelineNow > 0 ? timelineNow : timelineNowRef.current
  const liveMid = micro.venues.binancePerp.mid
  const liveSpotMid = micro.venues.binanceSpot.mid

  const heatmapChartCandles = useMemo(
    () => heatmapSpotCandlesForChart(windowMin, candles),
    [windowMin, candles],
  )

  const candlesForPaint = useMemo(
    () =>
      heatmapSpotCandlesWithLiveMid(
        heatmapChartCandles,
        candleBarMs,
        timelineNow,
        liveSpotMid > 0 ? liveSpotMid : undefined,
      ),
    [heatmapChartCandles, candleBarMs, timelineNow, liveSpotMid],
  )

  const heatmapViewport = useMemo(() => heatmapViewportForChartHeight(chartSize.h), [chartSize.h])

  const ta = useTaCarousel({ enabled: taEnabled, candles: heatmapChartCandles })
  const struct = useStructCarousel({
    enabled: structEnabled && structWindowSupported(windowMin),
    candles: heatmapChartCandles,
  })
  const activePattern = taEnabled ? ta : struct

  const samplesByVenue = useMemo(() => {
    const out = {} as Record<(typeof DEPTH_VENUE_ORDER)[number], (typeof micro.venues)[keyof typeof micro.venues]['depthSamples']>
    const statuses = {} as Record<(typeof DEPTH_VENUE_ORDER)[number], (typeof micro.venues)[keyof typeof micro.venues]['status']>
    for (const venue of DEPTH_VENUE_ORDER) {
      out[venue] = micro.venues[venue].depthSamples
      statuses[venue] = micro.venues[venue].status
    }
    return { out, statuses }
  }, [micro.venues])

  const flushDepthPersistNow = () => {
    if (depthPersistFlushTimerRef.current != null) {
      window.clearTimeout(depthPersistFlushTimerRef.current)
      depthPersistFlushTimerRef.current = null
    }
    const batch = depthPersistFlushBatchRef.current
    if (batch.length === 0) return
    depthPersistFlushBatchRef.current = []
    void flushHeatmapDepthPersistedColumns(batch).then(() => {
      void loadHeatmapDepthPersistedColumns().then((cols) => {
        depthPersistForPaintRef.current = cols
      })
    })
  }

  const queueDepthPersistFromColumns = (
    liveColumns: readonly HeatmapGridColumn[],
    axis: HeatmapPriceAxis,
  ) => {
    const incoming = heatmapDepthPersistedCarriedFromGrid(liveColumns, axis)
    if (incoming.length === 0) return
    depthPersistForPaintRef.current = upsertPersistedDepthColumns(depthPersistForPaintRef.current, incoming)
    depthPersistFlushBatchRef.current = upsertPersistedDepthColumns(
      depthPersistFlushBatchRef.current,
      incoming,
    )
    if (depthPersistFlushTimerRef.current != null) return
    depthPersistFlushTimerRef.current = window.setTimeout(() => {
      depthPersistFlushTimerRef.current = null
      flushDepthPersistNow()
    }, HEATMAP_DEPTH_PERSIST_FLUSH_MS)
  }

  useEffect(() => {
    void loadHeatmapDepthPersistedColumns().then((cols) => {
      depthPersistForPaintRef.current = cols
      setDepthPersistHydrated((n) => n + 1)
    })
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushDepthPersistNow()
    }
    window.addEventListener('pagehide', flushDepthPersistNow)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      flushDepthPersistNow()
      window.removeEventListener('pagehide', flushDepthPersistNow)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  const taWallLine = useMemo(() => {
    if (!patternOverlayOn || activePattern.instances.length === 0) return null
    const inst = activePattern.instances[0]!
    const anchor = heatmapChartCandles[inst.anchorIndex]
    if (!anchor) return null
    const mergedColumns = buildMergedSessionHeatmap(
      samplesByVenue.out,
      samplesByVenue.statuses,
      DEPTH_VENUE_ORDER,
      bucketCount,
      timelineNow,
      displayPlan.groupSize,
    )
    const withLive = overlayLiveBooksOnLatestHeatmapColumn(
      mergedColumns,
      micro,
      DEPTH_VENUE_ORDER,
      heatmapViewport.bandBps,
    )
    const columns = applyHeatmapViewportToColumns(withLive, heatmapViewport.bandBps)
    const windowRange = heatmapWindowTimeRange(bucketCount, timelineNow, displayPlan.groupSize)
    const timeRangeTa = { start: windowRange.start, end: windowRange.end }
    const venueMidPolylinesTa = resolveVenueMidPolylines(
      venueMidHistory,
      candleBarMs,
      columns,
      samplesByVenue.out,
      micro,
      windowRange.start,
      windowRange.end,
    )
    const axis = computeHeatmapSessionPriceAxis(
      heatmapChartCandles,
      timeRangeTa,
      candleBarMs,
      windowMin,
      columns,
      venueMidPolylinesTa,
      { minHalfBps: heatmapViewport.minHalfBps },
      windowRange.end,
    )
    const latestCol = latestHeatmapColumn(columns)
    const offRange = nearestOffRangeLargePools(latestCol, axis, liveMid > 0 ? liveMid : columns[columns.length - 1]?.refMid ?? 0, undefined, heatmapViewport.bandBps)
    const wall = taLiquidityLineForAnchor(
      inst.anchorPrice,
      anchor.openTime,
      columns,
      axis,
      offRange,
      heatmapViewport.minHalfBps,
      liveMid > 0 ? liveMid : axis.priceMin + (axis.priceMax - axis.priceMin) / 2,
    )
    return wall?.label ?? null
  }, [
    patternOverlayOn,
    activePattern.instances,
    heatmapChartCandles,
    samplesByVenue,
    bucketCount,
    timelineNow,
    displayPlan.groupSize,
    heatmapViewport,
    micro,
    candleBarMs,
    liveMid,
    liveSpotMid,
    venueMidHistory,
    windowMin,
  ])

  const taOiLine = useMemo(() => {
    if (!patternOverlayOn || activePattern.instances.length === 0) return null
    return taOiSnippet(openInterest)
  }, [patternOverlayOn, activePattern.instances.length, openInterest])

  const taStripPlacement = useMemo(() => {
    if (!patternOverlayOn) return 'top-right' as const
    const windowRange = heatmapWindowTimeRange(bucketCount, timelineNow, displayPlan.groupSize)
    const timeRange = { start: windowRange.start, end: windowRange.end }
    return taStripPlacementForInstances(
      activePattern.instances,
      heatmapChartCandles,
      chartSize.w,
      chartSize.h,
      priceAxis,
      timeRange,
      candleBarMs,
    )
  }, [
    patternOverlayOn,
    activePattern.instances,
    heatmapChartCandles,
    chartSize.w,
    chartSize.h,
    priceAxis,
    bucketCount,
    timelineNow,
    displayPlan.groupSize,
    candleBarMs,
  ])

  useEffect(() => {
    if (!structWindowSupported(windowMin)) {
      setStructEnabled(false)
      struct.toggleStruct(false)
      try {
        sessionStorage.removeItem(STORAGE_STRUCT_ENABLED)
      } catch {
        /* ignore */
      }
    }
  }, [windowMin, struct])

  useEffect(() => {
    if (!structWindowSupported(windowMin)) return
    try {
      if (structEnabled) sessionStorage.setItem(STORAGE_STRUCT_ENABLED, '1')
      else sessionStorage.removeItem(STORAGE_STRUCT_ENABLED)
    } catch {
      /* ignore */
    }
  }, [windowMin, structEnabled])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_HEATMAP_WINDOW, String(windowMin))
    } catch {
      /* ignore */
    }
  }, [windowMin])

  useEffect(() => {
    let cancelled = false
    const loadCandles = (forceRefresh: boolean) => {
      void loadHeatmapSpotCandlesWithCacheSWR(
        windowMin,
        (rows) => {
          if (!cancelled && rows.length > 0) setCandles(rows)
        },
        Date.now(),
        { forceRefresh },
      ).then((rows) => {
        if (!cancelled && rows.length > 0) setCandles(rows)
      })
    }
    loadCandles(true)
    const candleId = window.setInterval(() => loadCandles(false), HEATMAP_CANDLE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(candleId)
    }
  }, [windowMin])

  useEffect(() => {
    let cancelled = false
    const loadVenueMids = (forceRefresh: boolean) => {
      const endMs = Date.now()
      const axisEnd = timelineNowRef.current > 0 ? timelineNowRef.current : endMs
      const windowRange = heatmapWindowTimeRange(bucketCount, axisEnd, displayPlan.groupSize)
      const span = Math.max(60_000, windowRange.end - windowRange.start)
      const bounds = {
        startMs: endMs - span - 2 * 60_000,
        endMs,
      }
      void loadHeatmapVenueMidHistoryWithCacheSWR(
        windowMin,
        (cached) => {
          if (!cancelled) setVenueMidHistory(cached)
        },
        bounds,
        endMs,
        { forceRefresh },
      )
        .then((rows) => {
          if (!cancelled) setVenueMidHistory(rows)
        })
        .catch((err) => {
          if (import.meta.env.DEV) console.warn('[DepthSessionHeatmap] venue mid history load failed', err)
        })
    }
    loadVenueMids(true)
    const midId = window.setInterval(() => loadVenueMids(false), HEATMAP_VENUE_MID_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(midId)
    }
  }, [windowMin, bucketCount, displayPlan.groupSize])

  const dailySmaSeries = useMemo(() => buildDailySmaSeries(dailyCandles), [dailyCandles])

  const dailyMaForWindow = useMemo(() => {
    const windowRange = heatmapWindowTimeRange(bucketCount, timelineNow, displayPlan.groupSize)
    const timeRange = { start: windowRange.start, end: windowRange.end }
    const polylines = buildDailyMaPolylines(dailySmaSeries, timeRange)
    const crosses = findDailySmaCrosses(dailySmaSeries)
    const cross = latestDailyMaCrossInRange(crosses, timeRange)
    return { polylines, cross, timeRange }
  }, [dailySmaSeries, bucketCount, timelineNow, displayPlan.groupSize])

  const showDailySma = useMemo(
    () =>
      dailySmaSeries.length > 0 &&
      dailySmaVisibleOnAxis(dailyMaForWindow.polylines, priceAxis, dailyMaForWindow.timeRange),
    [dailySmaSeries, dailyMaForWindow.polylines, dailyMaForWindow.timeRange, priceAxis],
  )

  const dailySmaRails = useMemo(
    () =>
      dailySmaSeries.length > 0
        ? dailySmaRailPlacements(dailyMaForWindow.polylines, priceAxis, dailyMaForWindow.timeRange)
        : [],
    [dailySmaSeries.length, dailyMaForWindow.polylines, dailyMaForWindow.timeRange, priceAxis],
  )

  const showDailySmaRails = dailySmaRails.length > 0 && !showDailySma
  const showDailySmaUi = showDailySma || showDailySmaRails

  const needDailySmaFetch = useMemo(() => {
    if (showDailySmaUi) return true
    return shouldBootstrapDailySmaFetch(priceAxis, dailySmaSeries.length >= HEATMAP_DAILY_SMA_200)
  }, [showDailySmaUi, dailySmaSeries.length, priceAxis])

  useEffect(() => {
    if (!needDailySmaFetch) return
    let cancelled = false
    const loadDaily = () => {
      void loadHeatmapDailySmaWithCacheSWR().then((rows) => {
        if (!cancelled && rows.length > 0) setDailyCandles(rows)
      })
    }
    loadDaily()
    const id = showDailySma ? window.setInterval(loadDaily, HEATMAP_DAILY_SMA_CACHE_TTL_MS) : undefined
    return () => {
      cancelled = true
      if (id != null) window.clearInterval(id)
    }
  }, [needDailySmaFetch, showDailySma])

  useEffect(() => {
    const row = chartRowRef.current
    const scroll = scrollRef.current
    if (!row || !scroll) return
    const inFillPanel = Boolean(row.closest('.depth-panel-scroll--fill'))
    const measure = () => {
      const h = heatmapSlotHeightPx(row, HEATMAP_CHART_FALLBACK_H)
      const w = Math.max(320, Math.floor(scroll.clientWidth))
      setChartSize({ w, h })
    }
    const scheduleMeasure = () => {
      measure()
      requestAnimationFrame(measure)
    }
    scheduleMeasure()
    const ro = new ResizeObserver(scheduleMeasure)
    ro.observe(row)
    ro.observe(scroll)
    if (fillAvailableHeight || inFillPanel) {
      const section = row.closest('.depth-session-heatmap')
      if (section) ro.observe(section)
      const consolidated = row.closest('.depth-consolidated-walls')
      if (consolidated) ro.observe(consolidated)
      const chartsStack = row.closest('.depth-charts-stack')
      if (chartsStack) ro.observe(chartsStack)
    }
    return () => ro.disconnect()
  }, [fillAvailableHeight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const mergedColumns = buildMergedSessionHeatmap(
      samplesByVenue.out,
      samplesByVenue.statuses,
      DEPTH_VENUE_ORDER,
      bucketCount,
      timelineNow,
      displayPlan.groupSize,
    )
    const withLive = overlayLiveBooksOnLatestHeatmapColumn(mergedColumns, micro, DEPTH_VENUE_ORDER, heatmapViewport.bandBps)
    const liveColumns = applyHeatmapViewportToColumns(withLive, heatmapViewport.bandBps)
    const columns = mergePersistedDepthIntoLiveColumns(liveColumns, depthPersistForPaintRef.current)

    const windowRange = heatmapWindowTimeRange(bucketCount, timelineNow, displayPlan.groupSize)
    const timeRange = { start: windowRange.start, end: windowRange.end }
    const venueMidPolylines = resolveVenueMidPolylines(
      venueMidHistory,
      candleBarMs,
      columns,
      samplesByVenue.out,
      micro,
      windowRange.start,
      windowRange.end,
    )
    const layoutCols = displayPlan.displayCols

    const rawAxis = computeHeatmapSessionPriceAxis(
      heatmapChartCandles,
      timeRange,
      candleBarMs,
      windowMin,
      columns,
      venueMidPolylines,
      { minHalfBps: heatmapViewport.minHalfBps },
      windowRange.end,
    )
    const axisWarmup = Date.now() < axisWarmupUntilMsRef.current
    const stabilized = axisWarmup
      ? { axis: rawAxis, state: emptyAxisStabilize() }
      : stabilizeHeatmapPriceAxis(
          priceAxisPaintRef.current,
          rawAxis,
          timelineNow,
          axisStabilizeRef.current,
        )
    axisStabilizeRef.current = stabilized.state
    const axis = stabilized.axis
    priceAxisPaintRef.current = axis
    setPriceAxis(axis)

    queueDepthPersistFromColumns(liveColumns, axis)

    const windowMax = heatmapGridMax(columns)
    const scaled = advanceTimelineScale(timelineNow, windowMax, scaleStateRef.current)
    scaleStateRef.current = scaled.state
    const maxVal = scaled.max

    const metrics = heatmapCanvasMetricsFit(layoutCols, chartSize.w)
    const w = metrics.width
    const h = chartSize.h
    canvas.width = w
    canvas.height = h
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    const refMid =
      liveMid > 0
        ? liveMid
        : columns.length > 0
          ? columns[columns.length - 1]!.refMid
          : 0
    const byPrice = aggregateMaxUsdByPrice(liveColumns)
    const latestCol = latestHeatmapColumn(liveColumns)
    const offRange = nearestOffRangeLargePools(latestCol, axis, refMid, undefined, heatmapViewport.bandBps)
    drawHeatmap(
      ctx,
      columns,
      w,
      h,
      maxVal,
      axis,
      liveMid,
      candlesForPaint,
      timeRange,
      candleBarMs,
      offRange,
      venueMidPolylines,
      liveSpotMid,
      windowRange.end,
      showDailySma
        ? { polylines: dailyMaForWindow.polylines, cross: dailyMaForWindow.cross }
        : undefined,
      patternOverlayOn && activePattern.instances.length > 0 ? { instances: activePattern.instances } : undefined,
    )
    setAxisMaxUsd(maxVal)
    setOffRangePools(offRange)

    const profileCanvas = profileCanvasRef.current
    if (profileCanvas) {
      const pctx = profileCanvas.getContext('2d')
      if (pctx) {
        const pw = HEATMAP_PROFILE_RAIL_W
        profileCanvas.width = pw
        profileCanvas.height = h
        profileCanvas.style.width = `${pw}px`
        profileCanvas.style.height = '100%'
        drawHeatmapDepthProfile(pctx, pw, h, liveColumns, axis, maxVal, refMid, byPrice, heatmapViewport.bandBps)
      }
    }
  }, [
    micro,
    bucketCount,
    displayPlan,
    timelineNow,
    windowMin,
    chartSize,
    samplesByVenue,
    liveMid,
    liveSpotMid,
    candles,
    candlesForPaint,
    venueMidHistory,
    candleBarMs,
    windowMin,
    heatmapViewport,
    fillAvailableHeight,
    patternOverlayOn,
    activePattern.instances,
    dailySmaSeries,
    dailyMaForWindow,
    showDailySma,
    depthPersistHydrated,
  ])

  const axisMaxLabel = formatWallUsd(axisMaxUsd)
  const axisMinLabel = formatWallUsd(0)
  const midRangePrice = heatmapAxisMidRangePrice(priceAxis)
  const axisTop = formatAxisPrice(priceAxis.priceMax)
  const axisMid = formatAxisPrice(midRangePrice)
  const axisBottom = formatAxisPrice(priceAxis.priceMin)
  const axisLabelTopPct = useMemo(
    () => ({
      top: heatmapPriceToTopPercent(priceAxis.priceMax, priceAxis),
      mid: heatmapPriceToTopPercent(midRangePrice, priceAxis),
      bottom: heatmapPriceToTopPercent(priceAxis.priceMin, priceAxis),
    }),
    [priceAxis, midRangePrice],
  )
  const liveVenueMidsForRail = useMemo(() => {
    const out = {} as Partial<Record<(typeof HEATMAP_VENUE_AXIS_LABEL_VENUES)[number], number>>
    for (const venue of HEATMAP_VENUE_AXIS_LABEL_VENUES) {
      if (venue === 'binanceSpot') continue
      const snap = micro.venues[venue]
      if (snap.status === 'connected' && snap.mid > 0) out[venue] = snap.mid
    }
    return out
  }, [micro.venues])

  const venueAxisLabels = useMemo(() => {
    const windowRange = heatmapWindowTimeRange(bucketCount, timelineNow, displayPlan.groupSize)
    const timeRange = { start: windowRange.start, end: windowRange.end }
    return buildHeatmapVenueAxisLabels(
      HEATMAP_VENUE_AXIS_LABEL_VENUES,
      venueMidHistory,
      candlesForPaint,
      priceAxis,
      timeRange,
      candleBarMs,
      chartSize.h,
      windowRange.end,
      liveSpotMid > 0 ? liveSpotMid : undefined,
      liveVenueMidsForRail,
    )
  }, [
    bucketCount,
    timelineNow,
    displayPlan.groupSize,
    venueMidHistory,
    candlesForPaint,
    priceAxis,
    candleBarMs,
    chartSize.h,
    liveSpotMid,
    liveVenueMidsForRail,
  ])
  const chipMid =
    liveMid > 0 ? liveMid : Math.max(0, (priceAxis.priceMax + priceAxis.priceMin) / 2)
  const showOffRangeAbove =
    offRangePools.above != null && qualifiesOffRangePool(offRangePools.above.usd) && chipMid > 0
  const showOffRangeBelow =
    offRangePools.below != null && qualifiesOffRangePool(offRangePools.below.usd) && chipMid > 0
  const offRangeAriaParts: string[] = []
  if (offRangePools.above && qualifiesOffRangePool(offRangePools.above.usd) && chipMid > 0) {
    offRangeAriaParts.push(offRangeChipAria('above', offRangePools.above, chipMid))
  }
  if (offRangePools.below && qualifiesOffRangePool(offRangePools.below.usd) && chipMid > 0) {
    offRangeAriaParts.push(offRangeChipAria('below', offRangePools.below, chipMid))
  }
  const dmaAriaParts = showDailySmaRails ? heatmapDailyMaRailAria(dailySmaRails, chipMid) : []
  const heatmapAriaBase = `Depth heatmap by BTC price; color scale to ${axisMaxLabel} resting USD`
  const heatmapAriaExtra = [...dmaAriaParts, ...offRangeAriaParts].filter(Boolean)
  const heatmapAria =
    heatmapAriaExtra.length > 0 ? `${heatmapAriaBase}. ${heatmapAriaExtra.join('. ')}` : heatmapAriaBase

  return (
    <section
      className={fillAvailableHeight ? 'depth-session-heatmap depth-session-heatmap--grow' : 'depth-session-heatmap'}
    >
      <div className="depth-timeline-toolbar">
        <DepthInfoIcon glossaryKey="depthSessionHeatmap" label="Depth heatmap (price × time)" />
        <div className="depth-heatmap-legend" aria-hidden>
          <span className="depth-heatmap-legend-min">{axisMinLabel}</span>
          <span className="depth-heatmap-legend-ramp" />
          <span className="depth-heatmap-legend-max">{axisMaxLabel}</span>
        </div>
        <button
          type="button"
          className={taEnabled ? 'depth-toggle depth-toggle-active depth-ta-toggle' : 'depth-toggle depth-ta-toggle'}
          aria-pressed={taEnabled}
          onClick={() => {
            const next = !taEnabled
            if (next) {
              setStructEnabled(false)
              struct.toggleStruct(false)
            }
            setTaEnabled(next)
            ta.toggleTa(next)
            setFrozenTimelineEnd(null)
            if (!next) setTaAnnounce(null)
          }}
        >
          TA
        </button>
        <button
          type="button"
          className={
            structEnabled
              ? 'depth-toggle depth-toggle-active depth-struct-toggle'
              : 'depth-toggle depth-struct-toggle'
          }
          aria-pressed={structEnabled}
          disabled={!structWindowSupported(windowMin)}
          aria-hidden={!structWindowSupported(windowMin)}
          tabIndex={structWindowSupported(windowMin) ? 0 : -1}
          onClick={() => {
            if (!structWindowSupported(windowMin)) return
            const next = !structEnabled
            if (next) {
              setTaEnabled(false)
              ta.toggleTa(false)
            }
            setStructEnabled(next)
            struct.toggleStruct(next)
            setFrozenTimelineEnd(null)
            if (!next) setTaAnnounce(null)
          }}
        >
          STRUCT
        </button>
        <div className="depth-timeline-actions" role="group" aria-label="Heatmap window">
          <button
            type="button"
            className={windowMin === 15 ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => applyHeatmapWindowChange(15)}
          >
            15m
          </button>
          <button
            type="button"
            className={windowMin === 30 ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => applyHeatmapWindowChange(30)}
          >
            30m
          </button>
          <button
            type="button"
            className={windowMin === 60 ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => applyHeatmapWindowChange(60)}
          >
            60m
          </button>
          <button
            type="button"
            className={windowMin === HEATMAP_WINDOW_24H_MIN ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => applyHeatmapWindowChange(HEATMAP_WINDOW_24H_MIN)}
          >
            24h
          </button>
        </div>
      </div>
      <div ref={chartRowRef} className="depth-timeline-chart-row">
        <div
          ref={scrollRef}
          className="depth-timeline-scroll depth-timeline-scroll--chart depth-heatmap-scroll-fit"
          tabIndex={0}
          role="img"
          aria-label={heatmapAria}
        >
          <div
            className="depth-heatmap-chart-wrap"
            onClick={() => {
              if (!patternOverlayOn) return
              if (activePattern.playing) {
                setFrozenTimelineEnd(liveTimelineNow > 0 ? liveTimelineNow : Date.now())
                activePattern.setPaused(true)
                setTaAnnounce('Paused')
              } else {
                setFrozenTimelineEnd(null)
                activePattern.setPlaying(true)
                activePattern.rescan()
                setTaAnnounce('Resumed')
              }
            }}
          >
            {showDailySmaUi ? (
              <HeatmapDailyMaRailLabels rails={dailySmaRails} showInBand={showDailySma} chartMid={chipMid} />
            ) : null}
            {showDailySma ? <HeatmapDailyMaCrossStrip cross={dailyMaForWindow.cross} /> : null}
            <TaHeatmapStrip
              visible={patternOverlayOn}
              placement={taStripPlacement}
              entry={activePattern.entry}
              hasHits={activePattern.instances.length > 0}
              biasLabel={
                activePattern.instances.length > 0 ? biasLabel(activePattern.instances[0]!.bias) : null
              }
              wallLine={taWallLine}
              oiLine={taOiLine}
              announceExtra={taAnnounce}
            />
            <TaHeatmapTransport
              visible={patternOverlayOn}
              playing={activePattern.playing}
              toolbarAriaLabel={
                structEnabled ? 'Structure pattern carousel' : 'Technical analysis pattern carousel'
              }
              onPrev={() => {
                activePattern.prev()
                setFrozenTimelineEnd(liveTimelineNow > 0 ? liveTimelineNow : frozenTimelineEnd)
              }}
              onTogglePlayPause={() => {
                if (activePattern.playing) {
                  setFrozenTimelineEnd(liveTimelineNow > 0 ? liveTimelineNow : Date.now())
                  activePattern.setPaused(true)
                  setTaAnnounce('Paused')
                } else {
                  setFrozenTimelineEnd(null)
                  activePattern.setPlaying(true)
                  activePattern.rescan()
                  setTaAnnounce('Resumed')
                }
              }}
              onNext={() => {
                activePattern.next()
                setFrozenTimelineEnd(liveTimelineNow > 0 ? liveTimelineNow : frozenTimelineEnd)
              }}
            />
            <canvas
              ref={canvasRef}
              className="depth-timeline-canvas depth-timeline-canvas-hero depth-heatmap-canvas"
              width={900}
              height={chartSize.h}
            />
            {showOffRangeAbove && offRangePools.above ? (
              <span
                className="depth-heatmap-offrange-chip depth-heatmap-offrange-chip--top"
                style={offRangeChipStyle(offRangePools.above.usd, axisMaxUsd)}
                title="Nearest merged resting pool above chart Y (latest book; color vs scale max)"
              >
                {formatOffRangeChip('above', offRangePools.above, chipMid)}
              </span>
            ) : null}
            {showOffRangeBelow && offRangePools.below ? (
              <span
                className="depth-heatmap-offrange-chip depth-heatmap-offrange-chip--bottom"
                style={offRangeChipStyle(offRangePools.below.usd, axisMaxUsd)}
                title="Nearest merged resting pool below chart Y (latest book; color vs scale max)"
              >
                {formatOffRangeChip('below', offRangePools.below, chipMid)}
              </span>
            ) : null}
          </div>
        </div>
        <canvas
          ref={profileCanvasRef}
          className="depth-heatmap-profile-rail"
          width={HEATMAP_PROFILE_RAIL_W}
          height={chartSize.h}
          role="img"
          aria-label="Session max resting USD by price; top and bottom strips show liquidity outside the main price view"
          title="Depth profile: in-view band matches chart Y; ↑↓ strips = resting size above/below view (within ~180 bps band)"
        />
        <div className="depth-timeline-axis depth-heatmap-price-axis" aria-hidden title="BTC USD price">
          <span
            className="depth-timeline-axis-tick depth-heatmap-axis-tick--range-top"
            style={{ top: `${axisLabelTopPct.top}%` }}
          >
            {axisTop}
          </span>
          <span className="depth-timeline-axis-tick depth-timeline-axis-mid" style={{ top: `${axisLabelTopPct.mid}%` }}>
            {axisMid}
          </span>
          <span
            className="depth-timeline-axis-tick depth-heatmap-axis-tick--range-bottom"
            style={{ top: `${axisLabelTopPct.bottom}%` }}
          >
            {axisBottom}
          </span>
          {venueAxisLabels.map((label) =>
            label.venue === 'spotAvg' ? (
              <HeatmapSpotAvgAxisLabel
                key="spotAvg"
                text={label.text}
                topPct={label.topPct}
              />
            ) : (
              <span
                key={label.venue}
                className="depth-timeline-axis-tick depth-heatmap-venue-axis-label"
                style={{ top: `${label.topPct}%`, color: label.color }}
                title={`${depthVenueShort[label.venue]}: latest kline close`}
              >
                {label.text}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  )
}