import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildCumulativeDepth,
  curveSideExtents,
  DEPTH_BOOK_CHART_MAX_BPS,
  DEPTH_BOOK_CHART_STRETCH_MAX_BPS,
  maxCumulativeBtc,
  type CurveSideExtents,
} from '../../data/microstructure/depthBookCurve'
import type { MicrostructureState, VenueId, WallRecord } from '../../data/microstructure/types'
import { DepthInfoIcon } from './DepthInfoIcon'
import { formatVenueMid, venueMidChartLabelColor } from './depthVenueMidFormat'
import { formatWallUsdCompact } from './depthWallRowMetrics'
import { DEPTH_VENUE_ORDER, depthVenueColorAsk, depthVenueColorBid, depthVenueShort } from './depthVenueTheme'

const STORAGE_BOOK_MODE = 'depthBookChartMode'
const STORAGE_BOOK_X_SCALE = 'depthBookChartXScale'

export type BookChartMode = 'stack' | 'overlap'
export type BookChartXScale = 'fixed' | 'stretch'

const readBookMode = (): BookChartMode => {
  try {
    const v = sessionStorage.getItem(STORAGE_BOOK_MODE)
    if (v === 'stack') return 'stack'
    return 'overlap'
  } catch {
    return 'overlap'
  }
}

const readXScale = (): BookChartXScale => {
  try {
    const v = sessionStorage.getItem(STORAGE_BOOK_X_SCALE)
    if (v === 'fixed') return 'fixed'
    return 'stretch'
  } catch {
    return 'stretch'
  }
}

const bpsFromMid = (mid: number, price: number): number => ((price - mid) / mid) * 10_000

const spanOrMin = (n: number): number => (n > 0 ? n : 1)

const xFromBps = (
  midX: number,
  halfW: number,
  bps: number,
  xScale: BookChartXScale,
  fixedMaxBps: number,
  sideExtents: CurveSideExtents,
): number => {
  if (xScale === 'fixed') {
    return midX + (bps / fixedMaxBps) * halfW
  }
  if (bps <= 0) {
    return midX + (bps / spanOrMin(sideExtents.bidExtentBps)) * halfW
  }
  return midX + (bps / spanOrMin(sideExtents.askExtentBps)) * halfW
}

const drawStretchAxisLabels = (
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  labelY: number,
  bidExtentBps: number,
  askExtentBps: number,
) => {
  const midX = x + w / 2
  ctx.fillStyle = 'rgba(246, 240, 218, 0.5)'
  ctx.font = '10px sans-serif'
  ctx.fillText('0', midX - 6, labelY)
  if (bidExtentBps > 0) {
    ctx.fillText(`−${Math.round(bidExtentBps)}`, x + 2, labelY)
  }
  if (askExtentBps > 0) {
    ctx.fillText(`+${Math.round(askExtentBps)}`, x + w - 28, labelY)
  }
}

const drawFixedAxisLabels = (
  ctx: CanvasRenderingContext2D,
  x: number,
  w: number,
  maxBps: number,
  labelY: number,
) => {
  const midX = x + w / 2
  ctx.fillStyle = 'rgba(246, 240, 218, 0.5)'
  ctx.font = '10px sans-serif'
  ctx.fillText('0', midX - 6, labelY)
  ctx.fillText(`−${maxBps}`, x + 2, labelY)
  ctx.fillText(`+${maxBps}`, x + w - 26, labelY)
}

const CURVE_LABEL_FONT = '18px sans-serif'
const CURVE_LABEL_LINE_H = 20
const MID_PRICE_FIRST_BASELINE = 18

const venueLabelColor = (venue: VenueId, side: 'bid' | 'ask'): string => {
  const raw = side === 'bid' ? depthVenueColorBid[venue] : depthVenueColorAsk[venue]
  return raw.replace(/,\s*[\d.]+\)$/, ', 0.95)')
}

const venueSideMaxCumulative = (points: readonly { bps: number; cumulativeBtc: number }[]): number =>
  points.length > 0 ? points[points.length - 1].cumulativeBtc : 0

interface CurveLabelSpec {
  venue: VenueId
  side: 'bid' | 'ask'
  text: string
  x: number
  y: number
  color: string
}

const paintVenueMidOnMidline = (
  ctx: CanvasRenderingContext2D,
  midX: number,
  topY: number,
  venue: VenueId,
  mid: number,
): void => {
  ctx.font = CURVE_LABEL_FONT
  ctx.textAlign = 'center'
  ctx.fillStyle = venueMidChartLabelColor(venue, mid)
  ctx.fillText(formatVenueMid(mid), midX, topY + MID_PRICE_FIRST_BASELINE)
  ctx.textAlign = 'start'
}

const paintOverlapMidPriceStack = (
  ctx: CanvasRenderingContext2D,
  midX: number,
  topY: number,
  venues: MicrostructureState['venues'],
): void => {
  const rows = DEPTH_VENUE_ORDER.map((venue) => ({ venue, mid: venues[venue].mid })).sort((a, b) => {
    const am = a.mid > 0 ? a.mid : Number.NEGATIVE_INFINITY
    const bm = b.mid > 0 ? b.mid : Number.NEGATIVE_INFINITY
    return bm - am
  })
  ctx.font = CURVE_LABEL_FONT
  ctx.textAlign = 'center'
  let lineY = topY + MID_PRICE_FIRST_BASELINE
  for (const { venue, mid } of rows) {
    ctx.fillStyle = venueMidChartLabelColor(venue, mid)
    ctx.fillText(formatVenueMid(mid), midX, lineY)
    lineY += CURVE_LABEL_LINE_H
  }
  ctx.textAlign = 'start'
}

const overlapMidPriceStackMinCurveLabelY = (chartTopY: number): number =>
  chartTopY + MID_PRICE_FIRST_BASELINE + DEPTH_VENUE_ORDER.length * CURVE_LABEL_LINE_H + 4

const resolveLabelCollisions = (labels: CurveLabelSpec[], minY: number, maxY: number): void => {
  if (labels.length === 0) return
  labels.sort((a, b) => a.y - b.y)
  for (let i = 1; i < labels.length; i++) {
    const minYNext = labels[i - 1].y + CURVE_LABEL_LINE_H
    if (labels[i].y < minYNext) labels[i].y = minYNext
  }
  if (labels[labels.length - 1].y > maxY) {
    const overflow = labels[labels.length - 1].y - maxY
    for (const label of labels) label.y -= overflow
  }
  if (labels[0].y < minY) {
    const under = minY - labels[0].y
    for (const label of labels) label.y += under
  }
}

const paintCurveLabels = (ctx: CanvasRenderingContext2D, labels: readonly CurveLabelSpec[]) => {
  ctx.font = CURVE_LABEL_FONT
  for (const spec of labels) {
    ctx.fillStyle = spec.color
    ctx.fillText(spec.text, spec.x, spec.y)
  }
}

const drawCurve = (
  ctx: CanvasRenderingContext2D,
  points: { bps: number; cumulativeBtc: number }[],
  midX: number,
  baseY: number,
  chartH: number,
  halfW: number,
  xScale: BookChartXScale,
  fixedMaxBps: number,
  sideExtents: CurveSideExtents,
  maxCum: number,
  fillStyle: string,
  side: 'bid' | 'ask',
  venue?: VenueId,
  labelCollector?: CurveLabelSpec[],
) => {
  if (points.length < 2) return
  const pointX = (bps: number) => xFromBps(midX, halfW, bps, xScale, fixedMaxBps, sideExtents)

  ctx.beginPath()
  ctx.moveTo(midX, baseY)
  for (const p of points) {
    const px = pointX(p.bps)
    const py = baseY - (p.cumulativeBtc / maxCum) * chartH
    ctx.lineTo(px, py)
  }
  const last = points[points.length - 1]
  const lastX = pointX(last.bps)
  ctx.lineTo(lastX, baseY)
  ctx.closePath()
  ctx.fillStyle = fillStyle
  ctx.fill()
  ctx.strokeStyle = fillStyle.replace(/[\d.]+\)$/, '0.95)')
  ctx.lineWidth = 1.25
  ctx.beginPath()
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    const px = pointX(p.bps)
    const py = baseY - (p.cumulativeBtc / maxCum) * chartH
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  if (last.cumulativeBtc > 0 && venue) {
    const labelY = baseY - (last.cumulativeBtc / maxCum) * chartH - 2
    const text = `${depthVenueShort[venue]} ${last.cumulativeBtc.toFixed(1)} BTC`
    const color = venueLabelColor(venue, side)
    ctx.font = CURVE_LABEL_FONT
    const textW = ctx.measureText(text).width
    const textX =
      side === 'bid'
        ? Math.min(lastX + 4, midX - textW - 6)
        : Math.max(lastX - textW - 4, midX + 6)
    const spec: CurveLabelSpec = { venue, side, text, x: textX, y: labelY, color }
    if (labelCollector) labelCollector.push(spec)
    else {
      ctx.fillStyle = color
      ctx.fillText(text, textX, labelY)
    }
  }
}

const drawVenueChart = (
  ctx: CanvasRenderingContext2D,
  snap: MicrostructureState['venues'][VenueId],
  curve: { bids: { bps: number; cumulativeBtc: number }[]; asks: { bps: number; cumulativeBtc: number }[] },
  x: number,
  y: number,
  w: number,
  h: number,
  xScale: BookChartXScale,
  sideExtents: CurveSideExtents,
  maxCum: number,
  label?: string,
) => {
  const midX = x + w / 2
  const baseY = y + h - 4
  const chartH = h - 18
  const halfW = w / 2 - 4

  ctx.fillStyle = 'rgba(246, 240, 218, 0.08)'
  ctx.fillRect(x, y, w, h)

  ctx.strokeStyle = 'rgba(246, 240, 218, 0.25)'
  ctx.beginPath()
  ctx.moveTo(midX, y)
  ctx.lineTo(midX, y + h)
  ctx.stroke()

  paintVenueMidOnMidline(ctx, midX, y, snap.venue, snap.mid)

  if (label) {
    ctx.fillStyle = 'rgba(246, 240, 218, 0.85)'
    ctx.font = 'bold 12px sans-serif'
    ctx.fillText(label, x + 6, y + 14)
  }

  const bidFill = depthVenueColorBid[snap.venue].replace(/[\d.]+\)$/, '0.35)')
  const askFill = depthVenueColorAsk[snap.venue].replace(/[\d.]+\)$/, '0.35)')
  drawCurve(
    ctx,
    curve.bids,
    midX,
    baseY,
    chartH,
    halfW,
    xScale,
    DEPTH_BOOK_CHART_MAX_BPS,
    sideExtents,
    maxCum,
    bidFill,
    'bid',
    snap.venue,
  )
  drawCurve(
    ctx,
    curve.asks,
    midX,
    baseY,
    chartH,
    halfW,
    xScale,
    DEPTH_BOOK_CHART_MAX_BPS,
    sideExtents,
    maxCum,
    askFill,
    'ask',
    snap.venue,
  )

  if (xScale === 'stretch') {
    drawStretchAxisLabels(ctx, x, w, y + h - 1, sideExtents.bidExtentBps, sideExtents.askExtentBps)
  }
}

type VenueCurve = { bids: { bps: number; cumulativeBtc: number }[]; asks: { bps: number; cumulativeBtc: number }[] }

const WALL_MARKER_MIN_PX = 6

const drawWallMarkers = (
  ctx: CanvasRenderingContext2D,
  walls: WallRecord[],
  venues: MicrostructureState['venues'],
  x: number,
  y: number,
  w: number,
  h: number,
  xScale: BookChartXScale,
  sideExtents: CurveSideExtents,
  maxCum: number,
  chartInnerH: number,
  curvesByVenue: Readonly<Partial<Record<VenueId, VenueCurve>>>,
  venueExtents?: Readonly<Partial<Record<VenueId, CurveSideExtents>>>,
) => {
  const midX = x + w / 2
  const halfW = w / 2 - 4
  const baseY = y + h - 4
  ctx.font = '16px sans-serif'
  for (const wall of walls) {
    const mid = venues[wall.venue].mid
    if (!(mid > 0)) continue
    const bps = bpsFromMid(mid, wall.price)
    if (xScale === 'fixed' && Math.abs(bps) > DEPTH_BOOK_CHART_MAX_BPS) continue
    const extents = venueExtents?.[wall.venue] ?? sideExtents
    const px = xFromBps(midX, halfW, bps, xScale, DEPTH_BOOK_CHART_MAX_BPS, extents)
    const curve = curvesByVenue[wall.venue]
    const points = curve ? (wall.side === 'bid' ? curve.bids : curve.asks) : []
    const venueMaxCum = venueSideMaxCumulative(points)
    const topY =
      venueMaxCum > 0
        ? baseY - (venueMaxCum / maxCum) * chartInnerH
        : baseY - WALL_MARKER_MIN_PX
    ctx.strokeStyle = wall.side === 'bid' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(px, topY)
    ctx.lineTo(px, baseY)
    ctx.stroke()
    ctx.setLineDash([])
    const text = formatWallUsdCompact(wall.price)
    ctx.fillStyle = venueLabelColor(wall.venue, wall.side)
    const textW = ctx.measureText(text).width
    const labelY = topY - 2
    const labelX =
      wall.side === 'bid'
        ? Math.min(px + 3, midX - textW - 4)
        : Math.max(px - textW - 3, midX + 4)
    ctx.fillText(text, labelX, labelY)
  }
}

const BOOK_CHART_STACK_ROW_H = 76
/** One height for stack & overlap so toggling mode does not resize the chart block. */
const BOOK_CHART_MIN_DISPLAY_H = BOOK_CHART_STACK_ROW_H * DEPTH_VENUE_ORDER.length + 8
const defaultBookChartHeight = (_mode: BookChartMode): number => BOOK_CHART_MIN_DISPLAY_H

const bookChartToolbarChromePx = (wrap: HTMLElement): number =>
  wrap.querySelector<HTMLElement>('.depth-timeline-toolbar')?.offsetHeight ?? 0

/** Drawable height inside the book flex slot (wrap − toolbar). Row may under-report when scroll is position:absolute. */
const bookChartSlotHeightPx = (chartRow: HTMLElement | null, wrap: HTMLElement | null): number => {
  const fromWrap = wrap
    ? Math.max(0, wrap.clientHeight - bookChartToolbarChromePx(wrap))
    : 0
  const fromRow = chartRow ? Math.floor(chartRow.getBoundingClientRect().height) : 0
  const fromRowClient = chartRow?.clientHeight ?? 0
  const slot = Math.max(fromWrap, fromRow, fromRowClient)
  if (slot <= 0) return BOOK_CHART_MIN_DISPLAY_H
  return Math.max(BOOK_CHART_MIN_DISPLAY_H, slot)
}

interface DepthBookChartProps {
  micro: MicrostructureState
  topWalls: WallRecord[]
  fillAvailableHeight?: boolean
}

export const DepthBookChart = ({ micro, topWalls, fillAvailableHeight = false }: DepthBookChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const chartRowRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<BookChartMode>(readBookMode)
  const [xScale, setXScale] = useState<BookChartXScale>(readXScale)
  const [viewSize, setViewSize] = useState({ w: 900, h: BOOK_CHART_MIN_DISPLAY_H })

  const bookChartMaxBps =
    xScale === 'stretch' ? DEPTH_BOOK_CHART_STRETCH_MAX_BPS : DEPTH_BOOK_CHART_MAX_BPS

  const venueCurves = useMemo(
    () =>
      DEPTH_VENUE_ORDER.map((venue) => {
        const s = micro.venues[venue]
        const curve = buildCumulativeDepth(s.mid, s.bookBids, s.bookAsks, bookChartMaxBps)
        return {
          venue,
          curve,
          sideExtents: curveSideExtents(curve),
        }
      }),
    [micro.venues, bookChartMaxBps],
  )

  const maxCum = useMemo(() => maxCumulativeBtc(venueCurves.map((v) => v.curve)), [venueCurves])

  const venueExtentsById = useMemo((): Partial<Record<VenueId, CurveSideExtents>> => {
    const out: Partial<Record<VenueId, CurveSideExtents>> = {}
    for (const { venue, sideExtents } of venueCurves) {
      out[venue] = sideExtents
    }
    return out
  }, [venueCurves])

  const xScaleButtonLabel =
    xScale === 'fixed' ? `Fixed ±${DEPTH_BOOK_CHART_MAX_BPS} bps` : 'Stretch'

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_BOOK_MODE, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_BOOK_X_SCALE, xScale)
    } catch {
      /* ignore */
    }
  }, [xScale])

  useEffect(() => {
    const scrollEl = scrollRef.current
    const wrapEl = wrapRef.current
    if (!scrollEl) return

    const measure = () => {
      const w = Math.max(320, Math.floor(scrollEl.clientWidth))
      let h = defaultBookChartHeight(mode)
      if (fillAvailableHeight) {
        h = bookChartSlotHeightPx(chartRowRef.current, wrapEl)
      }
      setViewSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }))
    }

    const scheduleMeasure = () => {
      measure()
      requestAnimationFrame(measure)
    }

    scheduleMeasure()
    const ro = new ResizeObserver(scheduleMeasure)
    ro.observe(scrollEl)
    if (fillAvailableHeight) {
      const row = chartRowRef.current
      if (row) ro.observe(row)
      if (wrapEl) {
        ro.observe(wrapEl)
        const parent = wrapEl.parentElement
        if (parent) ro.observe(parent)
        const panel = wrapEl.closest('.depth-panel-scroll')
        if (panel) ro.observe(panel)
        const chartsStack = wrapEl.closest('.depth-charts-stack')
        if (chartsStack) ro.observe(chartsStack)
      }
    }
    return () => ro.disconnect()
  }, [fillAvailableHeight, mode])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = viewSize.w
    const slotH = fillAvailableHeight
      ? bookChartSlotHeightPx(chartRowRef.current, wrapRef.current)
      : viewSize.h
    const h = slotH
    const stackRowH =
      mode === 'stack'
        ? Math.max(BOOK_CHART_STACK_ROW_H, Math.floor((h - 4) / DEPTH_VENUE_ORDER.length))
        : BOOK_CHART_STACK_ROW_H
    canvas.width = w
    canvas.height = h
    canvas.style.width = '100%'
    canvas.style.height = `${h}px`
    canvas.style.maxHeight = ''
    ctx.clearRect(0, 0, w, h)

    const padX = 4
    const chartW = w - padX * 2

    if (mode === 'stack') {
      venueCurves.forEach(({ venue, curve, sideExtents }, i) => {
        const y = i * stackRowH + 4
        const rowH = stackRowH - 4
        const venueMaxCum = maxCumulativeBtc([curve])
        const extents = xScale === 'stretch' ? sideExtents : { bidExtentBps: 0, askExtentBps: 0 }
        drawVenueChart(
          ctx,
          micro.venues[venue],
          curve,
          padX,
          y,
          chartW,
          rowH,
          xScale,
          extents,
          venueMaxCum,
          depthVenueShort[venue],
        )
        const venueWalls = topWalls.filter((wal) => wal.venue === venue)
        drawWallMarkers(
          ctx,
          venueWalls,
          micro.venues,
          padX,
          y,
          chartW,
          rowH,
          xScale,
          extents,
          venueMaxCum,
          rowH - 18,
          { [venue]: curve },
        )
      })
      if (xScale === 'fixed') {
        drawFixedAxisLabels(ctx, padX, chartW, DEPTH_BOOK_CHART_MAX_BPS, h - 2)
      }
    } else {
      const y = 8
      const chartH = h - 16
      const midX = padX + chartW / 2
      const baseY = y + chartH - 4
      const halfW = chartW / 2 - 4
      const chartHInner = chartH - 20
      const fixedExtents = { bidExtentBps: 0, askExtentBps: 0 }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(padX, y, chartW, chartH)

      ctx.strokeStyle = 'rgba(246, 240, 218, 0.25)'
      ctx.beginPath()
      ctx.moveTo(midX, y)
      ctx.lineTo(midX, y + chartH)
      ctx.stroke()

      paintOverlapMidPriceStack(ctx, midX, y, micro.venues)

      const bidLabels: CurveLabelSpec[] = []
      const askLabels: CurveLabelSpec[] = []
      const labelMinY = overlapMidPriceStackMinCurveLabelY(y)
      const labelMaxY = baseY - 4

      for (const { venue, curve, sideExtents } of venueCurves) {
        const bidFill = depthVenueColorBid[venue].replace(/[\d.]+\)$/, '0.22)')
        const askFill = depthVenueColorAsk[venue].replace(/[\d.]+\)$/, '0.22)')
        const extents = xScale === 'stretch' ? sideExtents : fixedExtents
        drawCurve(
          ctx,
          curve.bids,
          midX,
          baseY,
          chartHInner,
          halfW,
          xScale,
          DEPTH_BOOK_CHART_MAX_BPS,
          extents,
          maxCum,
          bidFill,
          'bid',
          venue,
          bidLabels,
        )
        drawCurve(
          ctx,
          curve.asks,
          midX,
          baseY,
          chartHInner,
          halfW,
          xScale,
          DEPTH_BOOK_CHART_MAX_BPS,
          extents,
          maxCum,
          askFill,
          'ask',
          venue,
          askLabels,
        )
      }

      resolveLabelCollisions(bidLabels, labelMinY, labelMaxY)
      resolveLabelCollisions(askLabels, labelMinY, labelMaxY)
      paintCurveLabels(ctx, bidLabels)
      paintCurveLabels(ctx, askLabels)
      const curvesByVenue: Partial<Record<VenueId, VenueCurve>> = {}
      for (const { venue, curve } of venueCurves) curvesByVenue[venue] = curve
      drawWallMarkers(
        ctx,
        topWalls,
        micro.venues,
        padX,
        y,
        chartW,
        chartH,
        xScale,
        fixedExtents,
        maxCum,
        chartHInner,
        curvesByVenue,
        xScale === 'stretch' ? venueExtentsById : undefined,
      )
      if (xScale === 'fixed') {
        drawFixedAxisLabels(ctx, padX, chartW, DEPTH_BOOK_CHART_MAX_BPS, h - 6)
      }
    }
  }, [micro, mode, xScale, topWalls, viewSize, fillAvailableHeight, maxCum, venueCurves, venueExtentsById])

  return (
    <div
      ref={wrapRef}
      className={fillAvailableHeight ? 'depth-book-chart-wrap depth-book-chart-wrap--grow' : 'depth-book-chart-wrap'}
    >
      <div className="depth-timeline-toolbar">
        <DepthInfoIcon glossaryKey="wallDepthChart" label="Live book depth" />
        <div className="depth-timeline-legend">
          {DEPTH_VENUE_ORDER.map((venue) => (
            <span key={venue} className="depth-legend-chip" style={{ borderColor: depthVenueColorBid[venue] }}>
              {depthVenueShort[venue]}
            </span>
          ))}
        </div>
        <div className="depth-timeline-actions" role="group" aria-label="Book chart layout">
          <button
            type="button"
            className={mode === 'stack' ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setMode('stack')}
          >
            Stack
          </button>
          <button
            type="button"
            className={mode === 'overlap' ? 'depth-toggle depth-toggle-active' : 'depth-toggle'}
            onClick={() => setMode('overlap')}
          >
            Overlap
          </button>
          <span className="depth-toggle-sep" aria-hidden />
          <button
            type="button"
            className="depth-toggle depth-toggle-active"
            onClick={() => setXScale((s) => (s === 'fixed' ? 'stretch' : 'fixed'))}
            aria-label="Toggle fixed bps vs stretch"
            title="Toggle fixed bps vs stretch"
          >
            {xScaleButtonLabel}
          </button>
        </div>
      </div>
      <div
        ref={chartRowRef}
        className={fillAvailableHeight ? 'depth-book-chart-row depth-book-chart-row--grow' : 'depth-book-chart-row'}
      >
        <div
          ref={scrollRef}
          className={
            fillAvailableHeight ? 'depth-timeline-scroll depth-book-chart-scroll-grow' : 'depth-timeline-scroll'
          }
          role="img"
          aria-label="Cumulative depth chart"
        >
          <canvas ref={canvasRef} className="depth-timeline-canvas depth-book-chart-canvas" width={900} height={viewSize.h} />
        </div>
      </div>
    </div>
  )
}