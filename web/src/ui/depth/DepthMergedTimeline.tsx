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
import { DepthInfoIcon } from './DepthInfoIcon'
import {
  DEPTH_VENUE_ORDER,
  depthVenueColorAsk,
  depthVenueColorAskOpaque,
  depthVenueColorBid,
  depthVenueColorBidOpaque,
  depthVenueMissingColor,
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
    return 60
  } catch {
    return 60
  }
}

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
    const color = depthVenueMissingColor[venue]
    const tickH = 2
    const tickY = side === 'bid' ? midY - tickH : midY
    ctx.fillStyle = color
    ctx.fillRect(x, tickY, Math.max(1, colW - 0.5), tickH)
  }

  const plotted = values.filter((v) => !v.gap)
  const sorted = [...plotted].sort((a, b) => a.value - b.value)

  if (mode === 'overlap') {
    for (const { venue, value } of sorted) {
      const h = (value / maxVal) * halfH
      if (h < 0.5) continue
      ctx.fillStyle = side === 'bid' ? depthVenueColorBidOpaque[venue] : depthVenueColorAskOpaque[venue]
      if (side === 'bid') {
        ctx.fillRect(x, midY - h, Math.max(1, colW - 0.5), h)
      } else {
        ctx.fillRect(x, midY, Math.max(1, colW - 0.5), h)
      }
    }
    return
  }

  let stackBase = side === 'bid' ? midY : midY
  for (const { venue, value } of sorted) {
    const h = (value / maxVal) * halfH
    if (h < 0.25) continue
    ctx.fillStyle = side === 'bid' ? depthVenueColorBid[venue] : depthVenueColorAsk[venue]
    if (side === 'bid') {
      stackBase -= h
      ctx.fillRect(x, stackBase, Math.max(1, colW - 0.5), h)
    } else {
      ctx.fillRect(x, stackBase, Math.max(1, colW - 0.5), h)
      stackBase += h
    }
  }
}

interface DepthMergedTimelineProps {
  micro: MicrostructureState
}

export const DepthMergedTimeline = ({ micro }: DepthMergedTimelineProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scaleStateRef = useRef<TimelineScaleState>({ tick: 0, max: 1 })
  const [layerMode, setLayerMode] = useState<DepthTimelineLayerMode>(readMode)
  const [windowMin, setWindowMin] = useState<TimelineWindowMin>(readWindowMin())
  const [viewWidth, setViewWidth] = useState(900)

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
    canvas.width = w
    canvas.style.width = metrics.scrollable ? `${w}px` : '100%'
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    ctx.strokeStyle = 'rgba(246, 240, 218, 0.2)'
    ctx.beginPath()
    ctx.moveTo(0, h / 2)
    ctx.lineTo(w, h / 2)
    ctx.stroke()

    const displayCols = layoutCols
    const colW = metrics.colWidth
    const midY = h / 2
    const halfH = h * 0.48

    for (let col = 0; col < displayCols; col++) {
      const x = col * colW
      drawColumn(ctx, DEPTH_VENUE_ORDER, cellsByVenue, col, x, colW, midY, halfH, maxVal, layerMode, 'bid')
      drawColumn(ctx, DEPTH_VENUE_ORDER, cellsByVenue, col, x, colW, midY, halfH, maxVal, layerMode, 'ask')
    }

    const scrollEl = scrollRef.current
    if (metrics.scrollable && scrollEl && scrollEl.scrollWidth > scrollEl.clientWidth) {
      scrollEl.scrollLeft = scrollEl.scrollWidth - scrollEl.clientWidth
    }
  }, [micro, bucketCount, displayPlan, timelineNow, layerMode, windowMin, viewWidth])

  return (
    <section className="depth-merged-timeline">
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
            className={layerMode === 'overlap' ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setLayerMode('overlap')}
          >
            Overlap
          </button>
          <button
            type="button"
            className={layerMode === 'stack' ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setLayerMode('stack')}
          >
            Stack
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
      <div
        ref={scrollRef}
        className="depth-timeline-scroll"
        tabIndex={0}
        role="region"
        aria-label="Depth timeline chart"
      >
        <canvas ref={canvasRef} className="depth-timeline-canvas depth-timeline-canvas-hero" width={900} height={160} />
      </div>
      <p className="depth-muted depth-timeline-caption">
        Bids above · asks below · columns ≈ {displayPlan.groupSize * 5}s · widens to fit until{' '}
        {DEPTH_TIMELINE_MIN_COL_PX}px cols ·{' '}
        <DepthInfoIcon glossaryKey="timelineLayerMode" label="layer mode" /> ·{' '}
        <DepthInfoIcon glossaryKey="timelineWindow" label="window" />
      </p>
    </section>
  )
}