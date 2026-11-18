import { useEffect, useMemo, useRef, useState } from 'react'
import {
  advanceTimelineScale,
  buildEpochCoarseTimeline,
  DEPTH_TIMELINE_MIN_COL_PX,
  DEPTH_WINDOW_15_MIN_BUCKETS,
  DEPTH_WINDOW_30_MIN_BUCKETS,
  DEPTH_WINDOW_60_MIN_BUCKETS,
  earliestSampleAt,
  globalTimelineMax,
  sliceTimelineGridTail,
  snapTimelineNow,
  timelineCanvasMetrics,
  timelineDisplayPlan,
  timelineHistoryLayoutCols,
  type TimelineGridCell,
  type TimelineScaleState,
} from '../../data/microstructure/depthTimelineGrid'
import type { MicrostructureState, VenueId } from '../../data/microstructure/types'
import { formatWallUsd } from './depthWallRowMetrics'
import { DepthInfoIcon } from './DepthInfoIcon'
import {
  buildTimelineStackSegments,
  layoutTimelineStack,
  scaleStackSegmentsToSpan,
} from './depthMergedTimelineStack'
import {
  DEPTH_VENUE_ORDER,
  depthVenueColorAskTimeline,
  depthVenueColorBid,
  depthVenueColorBidTimeline,
  depthVenueMissingColorTimeline,
  depthVenueShort,
} from './depthVenueTheme'

const STORAGE_MODE = 'depthTimelineLayerMode'
const STORAGE_WINDOW = 'depthTimelineWindowMin'

export type DepthTimelineLayerMode = 'overlap' | 'stack'

const readMode = (): DepthTimelineLayerMode => {
  try {
    const v = sessionStorage.getItem(STORAGE_MODE)
    return v === 'stack' ? 'stack' : 'overlap'
  } catch {
    return 'overlap'
  }
}

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

const DEPTH_TIMELINE_CHART_H = 160
const TIMELINE_HALF_H_RATIO = 0.48
const TIMELINE_AXIS_BID_TOP_PCT = (0.5 - TIMELINE_HALF_H_RATIO) * 100
const TIMELINE_AXIS_ASK_BOTTOM_PCT = (0.5 + TIMELINE_HALF_H_RATIO) * 100

const bucketCountForWindow = (windowMin: TimelineWindowMin): number => {
  if (windowMin === 15) return DEPTH_WINDOW_15_MIN_BUCKETS
  if (windowMin === 30) return DEPTH_WINDOW_30_MIN_BUCKETS
  return DEPTH_WINDOW_60_MIN_BUCKETS
}

const drawColumn = (
  ctx: CanvasRenderingContext2D,
  venues: readonly VenueId[],
  cellsByVenue: Record<VenueId, TimelineGridCell[]>,
  col: number,
  x: number,
  colW: number,
  midY: number,
  halfH: number,
  maxVal: number,
  chartH: number,
  mode: DepthTimelineLayerMode,
  side: 'bid' | 'ask',
) => {
  const values: { venue: VenueId; value: number; gap: boolean }[] = venues.map((venue) => {
    const cell = cellsByVenue[venue][col]
    const value = side === 'bid' ? cell.bidNotionalNear : cell.askNotionalNear
    return { venue, value, gap: cell.gap && value <= 0 }
  })

  for (const { venue, gap } of values) {
    if (!gap) continue
    const color = depthVenueMissingColorTimeline[venue]
    const tickH = 2
    const tickY = side === 'bid' ? midY - tickH : midY
    ctx.fillStyle = color
    ctx.fillRect(x, tickY, Math.max(1, colW - 0.5), tickH)
  }

  const plotted = values.filter((v) => !v.gap)
  const byNotionalDesc = (a: { value: number }, b: { value: number }) => b.value - a.value
  const colInnerW = Math.max(1, colW - 0.5)

  if (mode === 'overlap') {
    for (const { venue, value } of [...plotted].sort(byNotionalDesc)) {
      const h = (value / maxVal) * halfH
      if (h < 0.5) continue
      ctx.fillStyle = side === 'bid' ? depthVenueColorBidTimeline[venue] : depthVenueColorAskTimeline[venue]
      if (side === 'bid') {
        ctx.fillRect(x, midY - h, colInnerW, h)
      } else {
        ctx.fillRect(x, midY, colInnerW, h)
      }
    }
    return
  }

  const bandSpan = side === 'bid' ? midY : chartH - midY
  const segments = scaleStackSegmentsToSpan(buildTimelineStackSegments(plotted, halfH), bandSpan)
  const fill =
    side === 'bid'
      ? (venue: VenueId) => depthVenueColorBidTimeline[venue]
      : (venue: VenueId) => depthVenueColorAskTimeline[venue]

  for (const { venue, h, y } of layoutTimelineStack(segments, midY, side)) {
    ctx.fillStyle = fill(venue)
    ctx.fillRect(x, y, colInnerW, h)
  }
}

const TIMELINE_CHART_MIN_H = DEPTH_TIMELINE_CHART_H

interface DepthMergedTimelineProps {
  micro: MicrostructureState
  fillAvailableHeight?: boolean
}

export const DepthMergedTimeline = ({ micro, fillAvailableHeight = false }: DepthMergedTimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chartRowRef = useRef<HTMLDivElement>(null)
  const scaleStateRef = useRef<TimelineScaleState>({ tick: 0, max: 1 })
  const [layerMode, setLayerMode] = useState<DepthTimelineLayerMode>(readMode)
  const [windowMin, setWindowMin] = useState<TimelineWindowMin>(readWindowMin())
  const [viewWidth, setViewWidth] = useState(900)
  const [chartHeight, setChartHeight] = useState(DEPTH_TIMELINE_CHART_H)
  const [axisMaxUsd, setAxisMaxUsd] = useState(1)

  const bucketCount = bucketCountForWindow(windowMin)
  const displayPlan = useMemo(() => timelineDisplayPlan(bucketCount), [bucketCount])
  const timelineNow = snapTimelineNow(micro.sampledAt)

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_MODE, layerMode)
    } catch {
      /* ignore */
    }
  }, [layerMode])

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
    const el = scrollRef.current
    if (!el) return
    const measure = () => setViewWidth(Math.max(320, Math.floor(el.clientWidth)))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (!fillAvailableHeight) {
      setChartHeight(DEPTH_TIMELINE_CHART_H)
      return
    }
    const row = chartRowRef.current
    if (!row) return
    const measure = () => {
      const h = Math.max(TIMELINE_CHART_MIN_H, Math.floor(row.clientHeight))
      setChartHeight(h)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    return () => ro.disconnect()
  }, [fillAvailableHeight])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const fullByVenue = {} as Record<VenueId, TimelineGridCell[]>
    for (const venue of DEPTH_VENUE_ORDER) {
      const snap = micro.venues[venue]
      fullByVenue[venue] = buildEpochCoarseTimeline(
        snap.depthSamples,
        bucketCount,
        timelineNow,
        displayPlan.groupSize,
        snap.status,
      )
    }

    const firstAt = earliestSampleAt(DEPTH_VENUE_ORDER.map((v) => micro.venues[v].depthSamples))
    const layoutCols = timelineHistoryLayoutCols(
      firstAt,
      timelineNow,
      displayPlan.groupSize,
      displayPlan.displayCols,
    )
    const cellsByVenue = {} as Record<VenueId, TimelineGridCell[]>
    for (const venue of DEPTH_VENUE_ORDER) {
      cellsByVenue[venue] = sliceTimelineGridTail(fullByVenue[venue], layoutCols)
    }

    const windowMax = globalTimelineMax(cellsByVenue, DEPTH_VENUE_ORDER)
    const scaled = advanceTimelineScale(timelineNow, windowMax, scaleStateRef.current)
    scaleStateRef.current = scaled.state
    const maxVal = scaled.max
    const metrics = timelineCanvasMetrics(layoutCols, viewWidth, DEPTH_TIMELINE_MIN_COL_PX)
    const w = metrics.width
    const h = chartHeight
    canvas.width = w
    canvas.height = h
    canvas.style.width = metrics.scrollable ? `${w}px` : '100%'
    canvas.style.height = fillAvailableHeight ? '100%' : `${h}px`
    ctx.clearRect(0, 0, w, h)

    const displayCols = layoutCols
    const colW = metrics.colWidth
    const midY = h / 2
    const halfH = h * TIMELINE_HALF_H_RATIO

    for (let col = 0; col < displayCols; col++) {
      const x = col * colW
      drawColumn(ctx, DEPTH_VENUE_ORDER, cellsByVenue, col, x, colW, midY, halfH, maxVal, h, layerMode, 'bid')
      drawColumn(ctx, DEPTH_VENUE_ORDER, cellsByVenue, col, x, colW, midY, halfH, maxVal, h, layerMode, 'ask')
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)'
    ctx.lineWidth = 1.25
    ctx.beginPath()
    ctx.moveTo(0, midY + 0.5)
    ctx.lineTo(w, midY + 0.5)
    ctx.stroke()
    ctx.lineWidth = 1

    setAxisMaxUsd(maxVal)

    const scrollEl = scrollRef.current
    if (metrics.scrollable && scrollEl && scrollEl.scrollWidth > scrollEl.clientWidth) {
      scrollEl.scrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth
    }
  }, [micro, bucketCount, displayPlan, timelineNow, layerMode, windowMin, viewWidth, chartHeight, fillAvailableHeight])

  const axisMaxLabel = formatWallUsd(axisMaxUsd)

  return (
    <section className={fillAvailableHeight ? 'depth-merged-timeline depth-merged-timeline--grow' : 'depth-merged-timeline'}>
      <div className="depth-timeline-toolbar">
        <DepthInfoIcon glossaryKey="mergedTimeline" label="Depth timeline" />
        <div className="depth-timeline-legend">
          {DEPTH_VENUE_ORDER.map((venue) => (
            <span key={venue} className="depth-legend-chip" style={{ borderColor: depthVenueColorBid[venue] }}>
              {depthVenueShort[venue]}
            </span>
          ))}
        </div>
        <div className="depth-timeline-actions" role="group" aria-label="Timeline display options">
          <button
            type="button"
            className={layerMode === 'stack' ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setLayerMode('stack')}
          >
            Stack
          </button>
          <button
            type="button"
            className={layerMode === 'overlap' ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setLayerMode('overlap')}
          >
            Overlap
          </button>
          <span className="depth-toggle-sep" aria-hidden />
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
          className={
            fillAvailableHeight
              ? 'depth-timeline-scroll depth-timeline-scroll--chart depth-timeline-scroll--chart-grow'
              : 'depth-timeline-scroll depth-timeline-scroll--chart'
          }
          tabIndex={0}
          role="region"
          aria-label={`Depth timeline chart; scale ${axisMaxLabel} near-mid notional per venue band`}
        >
          <canvas
            ref={canvasRef}
            className="depth-timeline-canvas depth-timeline-canvas-hero"
            width={900}
            height={chartHeight}
          />
        </div>
        <div
          className="depth-timeline-axis"
          style={{ height: chartHeight }}
          aria-hidden
          title="Near-mid resting notional USD (50 bps); full band height"
        >
          <span className="depth-timeline-axis-tick" style={{ top: `${TIMELINE_AXIS_BID_TOP_PCT}%` }}>
            {axisMaxLabel}
          </span>
          <span className="depth-timeline-axis-tick depth-timeline-axis-mid" style={{ top: '50%' }}>
            $0
          </span>
          <span className="depth-timeline-axis-tick" style={{ top: `${TIMELINE_AXIS_ASK_BOTTOM_PCT}%` }}>
            {axisMaxLabel}
          </span>
        </div>
      </div>
    </section>
  )
}