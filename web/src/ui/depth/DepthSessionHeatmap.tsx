import { useEffect, useMemo, useRef, useState } from 'react'
import { type Candle } from '../../data/candles'
import { fetchHeatmapTimelineCandles, heatmapCandleBarMs } from '../../data/heatmapCandleSeries'
import { heatmapPriceAxis, type HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { HEATMAP_PRICE_TICK_USD } from '../../data/microstructure/depthHeatmapPriceBins'
import {
  buildMergedSessionHeatmap,
  heatmapGridMax,
  heatmapWindowTimeRange,
  type HeatmapGridColumn,
} from '../../data/microstructure/depthSessionHeatmapGrid'
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
import { DEPTH_VENUE_ORDER } from './depthVenueTheme'
import { drawHeatmapCandleOverlay } from './depthHeatmapCandles'
import { drawDraggedHeatmapDepth } from './depthHeatmapDragPaint'
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

const HEATMAP_CANDLE_POLL_MS = 45_000

const STORAGE_WINDOW = 'depthTimelineWindowMin'

type TimelineWindowMin = 15 | 30 | 60

const readWindowMin = (): TimelineWindowMin => {
  try {
    const v = sessionStorage.getItem(STORAGE_WINDOW)
    if (v === '15') return 15
    if (v === '30') return 30
    if (v === '60') return 60
    return 15
  } catch {
    return 15
  }
}

const bucketCountForWindow = (windowMin: TimelineWindowMin): number => {
  if (windowMin === 15) return DEPTH_WINDOW_15_MIN_BUCKETS
  if (windowMin === 30) return DEPTH_WINDOW_30_MIN_BUCKETS
  return DEPTH_WINDOW_60_MIN_BUCKETS
}

const HEATMAP_CHART_MIN_H = 400
const HEATMAP_PROFILE_RAIL_W = 32

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

  drawHeatmapCandleOverlay(ctx, candles, w, h, axis, timeRange, candleIntervalMs)
}

interface DepthSessionHeatmapProps {
  micro: MicrostructureState
}

export const DepthSessionHeatmap = ({ micro }: DepthSessionHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const profileCanvasRef = useRef<HTMLCanvasElement>(null)
  const chartRowRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scaleStateRef = useRef<TimelineScaleState>({ tick: 0, max: 1 })
  const [windowMin, setWindowMin] = useState<TimelineWindowMin>(readWindowMin())
  const [chartSize, setChartSize] = useState({ w: 900, h: 400 })
  const [axisMaxUsd, setAxisMaxUsd] = useState(1)
  const [candles, setCandles] = useState<Candle[]>([])
  const [offRangePools, setOffRangePools] = useState<OffRangeSummary>({ above: null, below: null })
  const [priceAxis, setPriceAxis] = useState<HeatmapPriceAxis>(() => ({
    priceMin: 99_000,
    priceMax: 101_000,
    tick: HEATMAP_PRICE_TICK_USD,
    rows: 40,
  }))

  const bucketCount = bucketCountForWindow(windowMin)
  const candleBarMs = heatmapCandleBarMs(windowMin)
  const displayPlan = useMemo(() => timelineDisplayPlan(bucketCount), [bucketCount])
  const timelineNow = snapTimelineNow(micro.sampledAt)
  const liveMid = micro.venues.binancePerp.mid

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_WINDOW, String(windowMin))
    } catch {
      /* ignore */
    }
  }, [windowMin])

  useEffect(() => {
    scaleStateRef.current = { tick: 0, max: 1 }
  }, [bucketCount])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      void fetchHeatmapTimelineCandles(windowMin).then((rows) => {
        if (!cancelled) setCandles(rows)
      })
    }
    load()
    const id = window.setInterval(load, HEATMAP_CANDLE_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [windowMin])

  useEffect(() => {
    const row = chartRowRef.current
    const scroll = scrollRef.current
    if (!row || !scroll) return
    const measure = () => {
      const h = Math.max(HEATMAP_CHART_MIN_H, Math.floor(row.clientHeight))
      const w = Math.max(320, Math.floor(scroll.clientWidth))
      setChartSize({ w, h })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [])

  const samplesByVenue = useMemo(() => {
    const out = {} as Record<(typeof DEPTH_VENUE_ORDER)[number], (typeof micro.venues)[keyof typeof micro.venues]['depthSamples']>
    const statuses = {} as Record<(typeof DEPTH_VENUE_ORDER)[number], (typeof micro.venues)[keyof typeof micro.venues]['status']>
    for (const venue of DEPTH_VENUE_ORDER) {
      out[venue] = micro.venues[venue].depthSamples
      statuses[venue] = micro.venues[venue].status
    }
    return { out, statuses }
  }, [micro.venues])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const columns = buildMergedSessionHeatmap(
      samplesByVenue.out,
      samplesByVenue.statuses,
      DEPTH_VENUE_ORDER,
      bucketCount,
      timelineNow,
      displayPlan.groupSize,
    )

    const windowRange = heatmapWindowTimeRange(bucketCount, timelineNow, displayPlan.groupSize)
    const timeRange = { start: windowRange.start, end: windowRange.end }
    const layoutCols = displayPlan.displayCols

    const refMids: number[] = []
    for (const col of columns) {
      if (col.refMid > 0) refMids.push(col.refMid)
    }
    if (liveMid > 0) refMids.push(liveMid)

    const candleExtent: number[] = []
    for (const c of candles) {
      if (c.openTime < timeRange.start - candleBarMs || c.openTime >= timeRange.end + candleBarMs) continue
      candleExtent.push(c.high, c.low)
    }

    // Y scale from mids + OHLC only — distant resting depth must not compress candle bodies.
    const axis = heatmapPriceAxis(candleExtent, refMids)
    setPriceAxis(axis)

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
    const byPrice = aggregateMaxUsdByPrice(columns)
    const latestCol = latestHeatmapColumn(columns)
    const offRange = nearestOffRangeLargePools(latestCol, axis, refMid)
    drawHeatmap(ctx, columns, w, h, maxVal, axis, liveMid, candles, timeRange, candleBarMs, offRange)
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
        drawHeatmapDepthProfile(pctx, pw, h, columns, axis, maxVal, refMid, byPrice)
      }
    }
  }, [micro, bucketCount, displayPlan, timelineNow, windowMin, chartSize, samplesByVenue, liveMid, candles])

  const axisMaxLabel = formatWallUsd(axisMaxUsd)
  const axisTop = formatAxisPrice(priceAxis.priceMax)
  const axisMid =
    liveMid > 0 ? formatAxisPrice(liveMid) : formatAxisPrice((priceAxis.priceMax + priceAxis.priceMin) / 2)
  const axisBottom = formatAxisPrice(priceAxis.priceMin)
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
  const heatmapAria =
    offRangeAriaParts.length > 0
      ? `Depth heatmap by BTC price; color scale to ${axisMaxLabel} resting USD. ${offRangeAriaParts.join('. ')}`
      : `Depth heatmap by BTC price; color scale to ${axisMaxLabel} resting USD`

  return (
    <section className="depth-session-heatmap">
      <div className="depth-timeline-toolbar">
        <DepthInfoIcon glossaryKey="depthSessionHeatmap" label="Depth heatmap (price × time)" />
        <div className="depth-heatmap-legend" aria-hidden>
          <span className="depth-heatmap-legend-label">Resting size (USD)</span>
          <span className="depth-heatmap-legend-ramp" />
          <span className="depth-heatmap-legend-max">{axisMaxLabel}</span>
        </div>
        <div className="depth-timeline-actions" role="group" aria-label="Heatmap window">
          <button
            type="button"
            className={windowMin === 15 ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setWindowMin(15)}
          >
            15m
          </button>
          <button
            type="button"
            className={windowMin === 30 ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setWindowMin(30)}
          >
            30m
          </button>
          <button
            type="button"
            className={windowMin === 60 ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setWindowMin(60)}
          >
            60m
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
          <div className="depth-heatmap-chart-wrap">
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
        <div
          className="depth-timeline-axis depth-heatmap-price-axis"
          style={{ height: chartSize.h }}
          aria-hidden
          title="BTC USD price"
        >
          <span className="depth-timeline-axis-tick" style={{ top: '2%' }}>
            {axisTop}
          </span>
          <span className="depth-timeline-axis-tick depth-timeline-axis-mid" style={{ top: '50%' }}>
            {axisMid}
          </span>
          <span className="depth-timeline-axis-tick" style={{ top: '90%' }}>
            {axisBottom}
          </span>
        </div>
      </div>
      <p className="depth-muted depth-timeline-caption">
        Y: BTC USD ({priceAxis.tick.toLocaleString()} grid) · chart labels (top/bottom right): nearest pool outside Y (size/color
        vs scale max) ·
        right rail: session max resting USD per price · X: time · merged depth + Binance spot 1m candles · color: resting USD ·
        scale max {axisMaxLabel}
      </p>
    </section>
  )
}