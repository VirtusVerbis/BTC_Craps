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
import { DEPTH_VENUE_ORDER, depthVenueColorAsk, depthVenueColorBid, depthVenueShort } from './depthVenueTheme'

const STORAGE_BOOK_MODE = 'depthBookChartMode'
const STORAGE_BOOK_X_SCALE = 'depthBookChartXScale'

export type BookChartMode = 'stack' | 'overlap'
export type BookChartXScale = 'fixed' | 'stretch'

const readBookMode = (): BookChartMode => {
  try {
    return sessionStorage.getItem(STORAGE_BOOK_MODE) === 'overlap' ? 'overlap' : 'stack'
  } catch {
    return 'stack'
  }
}

const readXScale = (): BookChartXScale => {
  try {
    const v = sessionStorage.getItem(STORAGE_BOOK_X_SCALE)
    return v === 'stretch' || v === 'fit' ? 'stretch' : 'fixed'
  } catch {
    return 'fixed'
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
  if (last.cumulativeBtc > 0) {
    ctx.fillStyle = 'rgba(246, 240, 218, 0.75)'
    ctx.font = '11px sans-serif'
    const textX = side === 'bid' ? lastX + 4 : lastX - 52
    ctx.fillText(`${last.cumulativeBtc.toFixed(1)} BTC`, textX, baseY - chartH * 0.5)
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
  )

  if (xScale === 'stretch') {
    drawStretchAxisLabels(ctx, x, w, y + h - 1, sideExtents.bidExtentBps, sideExtents.askExtentBps)
  }
}

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
  venueExtents?: Readonly<Partial<Record<VenueId, CurveSideExtents>>>,
) => {
  const midX = x + w / 2
  const halfW = w / 2 - 4
  const baseY = y + h - 4
  ctx.font = '10px sans-serif'
  for (const wall of walls) {
    const mid = venues[wall.venue].mid
    if (!(mid > 0)) continue
    const bps = bpsFromMid(mid, wall.price)
    if (xScale === 'fixed' && Math.abs(bps) > DEPTH_BOOK_CHART_MAX_BPS) continue
    const extents = venueExtents?.[wall.venue] ?? sideExtents
    const px = xFromBps(midX, halfW, bps, xScale, DEPTH_BOOK_CHART_MAX_BPS, extents)
    ctx.strokeStyle = wall.side === 'bid' ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)'
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(px, y + 16)
    ctx.lineTo(px, baseY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255, 235, 120, 0.95)'
    ctx.fillText(`${depthVenueShort[wall.venue]} ${wall.side === 'bid' ? 'B' : 'A'}`, px + 2, y + 26)
  }
}

interface DepthBookChartProps {
  micro: MicrostructureState
  topWalls: WallRecord[]
}

export const DepthBookChart = ({ micro, topWalls }: DepthBookChartProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<BookChartMode>(readBookMode)
  const [xScale, setXScale] = useState<BookChartXScale>(readXScale)
  const [viewWidth, setViewWidth] = useState(900)

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

    const w = viewWidth
    const stackRowH = 76
    const h = mode === 'stack' ? stackRowH * DEPTH_VENUE_ORDER.length + 8 : 200
    canvas.width = w
    canvas.height = h
    canvas.style.width = '100%'
    ctx.clearRect(0, 0, w, h)

    const padX = 4
    const chartW = w - padX * 2

    if (mode === 'stack') {
      venueCurves.forEach(({ venue, curve, sideExtents }, i) => {
        const y = i * stackRowH + 4
        const rowH = stackRowH - 4
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
          maxCum,
          depthVenueShort[venue],
        )
        const venueWalls = topWalls.filter((wal) => wal.venue === venue)
        drawWallMarkers(ctx, venueWalls, micro.venues, padX, y, chartW, rowH, xScale, extents)
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
        )
      }
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
        xScale === 'stretch' ? venueExtentsById : undefined,
      )
      if (xScale === 'fixed') {
        drawFixedAxisLabels(ctx, padX, chartW, DEPTH_BOOK_CHART_MAX_BPS, h - 6)
      }
    }
  }, [micro, mode, xScale, topWalls, viewWidth, maxCum, venueCurves, venueExtentsById])

  const captionBps =
    xScale === 'stretch'
      ? mode === 'stack'
        ? 'stretch per row (true bps at row edges)'
        : 'stretch per venue (horizontal scale not comparable across colors)'
      : `±${DEPTH_BOOK_CHART_MAX_BPS} bps fixed`

  return (
    <div className="depth-book-chart-wrap">
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
      <div ref={scrollRef} className="depth-timeline-scroll" role="img" aria-label="Cumulative depth chart">
        <canvas ref={canvasRef} className="depth-timeline-canvas depth-book-chart-canvas" width={900} height={200} />
      </div>
      <p className="depth-muted depth-timeline-caption">
        Refreshes ~5s · X = bps from mid ({captionBps}) · Y = cumulative BTC ·{' '}
        <DepthInfoIcon glossaryKey="wallChartXScale" label="X scale" />
      </p>
    </div>
  )
}