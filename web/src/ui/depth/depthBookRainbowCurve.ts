import type { CumulativeDepthPoint, CurveSideExtents } from '../../data/microstructure/depthBookCurve'
import { ROLL_STREAK_COLORS, ROLL_STREAK_COLOR_STEP_MS } from '../rollStreak'
type BookChartXScale = 'fixed' | 'stretch'

const AGGREGATE_DASH_ON_PX = 7
const AGGREGATE_DASH_OFF_PX = 5
const AGGREGATE_LINE_WIDTH = 1.75

type Point = { x: number; y: number }

const curveToScreenPoints = (
  points: readonly CumulativeDepthPoint[],
  midX: number,
  baseY: number,
  chartH: number,
  maxCum: number,
  pointX: (bps: number) => number,
): Point[] =>
  points.map((p) => ({
    x: pointX(p.bps),
    y: baseY - (p.cumulativeBtc / maxCum) * chartH,
  }))

const drawRainbowDashedPolyline = (ctx: CanvasRenderingContext2D, vertices: readonly Point[], timeMs: number): void => {
  if (vertices.length < 2) return
  let dashIndex = 0
  let phaseOn = true
  let remaining = AGGREGATE_DASH_ON_PX

  ctx.lineWidth = AGGREGATE_LINE_WIDTH
  ctx.lineCap = 'butt'

  for (let v = 0; v < vertices.length - 1; v++) {
    const x0 = vertices[v]!.x
    const y0 = vertices[v]!.y
    const x1 = vertices[v + 1]!.x
    const y1 = vertices[v + 1]!.y
    const dx = x1 - x0
    const dy = y1 - y0
    const len = Math.hypot(dx, dy)
    if (!(len > 0)) continue
    let traveled = 0
    while (traveled < len) {
      const step = Math.min(remaining, len - traveled)
      const t0 = traveled / len
      const t1 = (traveled + step) / len
      const sx = x0 + dx * t0
      const sy = y0 + dy * t0
      const ex = x0 + dx * t1
      const ey = y0 + dy * t1
      if (phaseOn) {
        const slot =
          ((Math.floor(timeMs / ROLL_STREAK_COLOR_STEP_MS) + dashIndex) % ROLL_STREAK_COLORS.length +
            ROLL_STREAK_COLORS.length) %
          ROLL_STREAK_COLORS.length
        ctx.strokeStyle = ROLL_STREAK_COLORS[slot]!
        ctx.beginPath()
        ctx.moveTo(sx, sy)
        ctx.lineTo(ex, ey)
        ctx.stroke()
        dashIndex++
      }
      traveled += step
      remaining -= step
      if (remaining <= 0) {
        phaseOn = !phaseOn
        remaining = phaseOn ? AGGREGATE_DASH_ON_PX : AGGREGATE_DASH_OFF_PX
      }
    }
  }
}

export const drawAggregateRainbowCurve = (
  ctx: CanvasRenderingContext2D,
  points: readonly CumulativeDepthPoint[],
  midX: number,
  baseY: number,
  chartH: number,
  halfW: number,
  xScale: BookChartXScale,
  fixedMaxBps: number,
  sideExtents: CurveSideExtents,
  maxCum: number,
  timeMs: number,
  xFromBps: (
    midX: number,
    halfW: number,
    bps: number,
    xScale: BookChartXScale,
    fixedMaxBps: number,
    sideExtents: CurveSideExtents,
  ) => number,
): void => {
  if (points.length < 2) return
  const pointX = (bps: number) => xFromBps(midX, halfW, bps, xScale, fixedMaxBps, sideExtents)
  const vertices = curveToScreenPoints(points, midX, baseY, chartH, maxCum, pointX)
  drawRainbowDashedPolyline(ctx, vertices, timeMs)
}