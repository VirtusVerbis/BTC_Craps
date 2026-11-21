import type { Candle } from '../../data/candles'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { PatternInstance } from '../../data/ta/taTypes'
import { heatmapPriceToY, heatmapTimeToX, type HeatmapTimeRange } from './depthHeatmapCandles'

export type TaStripPlacement = 'top-right' | 'top-left' | 'bottom-right'

const CORNER: Record<TaStripPlacement, { x: number; y: number }> = {
  'top-right': { x: 0.88, y: 0.12 },
  'top-left': { x: 0.12, y: 0.12 },
  'bottom-right': { x: 0.88, y: 0.88 },
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.hypot(dx, dy)
}

/**
 * Picks a chart corner for the TA placecard farthest from highlighted pattern candles (normalized 0–1).
 */
export const taStripPlacementForInstances = (
  instances: readonly PatternInstance[],
  candles: readonly Candle[],
  chartW: number,
  chartH: number,
  axis: HeatmapPriceAxis,
  timeRange: HeatmapTimeRange,
  candleIntervalMs: number,
): TaStripPlacement => {
  if (instances.length === 0 || chartW <= 0 || chartH <= 0) return 'top-right'

  const intervalMs = Math.max(1000, candleIntervalMs)
  const indices = new Set<number>()
  for (const inst of instances) {
    for (const i of inst.candleIndices) indices.add(i)
  }

  let sumX = 0
  let sumY = 0
  let n = 0
  for (const i of indices) {
    const c = candles[i]
    if (!c) continue
    const x = heatmapTimeToX(c.openTime + intervalMs / 2, chartW, timeRange)
    const highY = heatmapPriceToY(c.high, chartH, axis)
    const lowY = heatmapPriceToY(c.low, chartH, axis)
    sumX += x / chartW
    sumY += (highY + lowY) / 2 / chartH
    n++
  }
  if (n === 0) return 'top-right'

  const mass = { x: sumX / n, y: sumY / n }

  let best: TaStripPlacement = 'top-right'
  let bestScore = -Infinity
  const placements: TaStripPlacement[] = ['top-right', 'top-left', 'bottom-right']
  for (const p of placements) {
    const score = dist(CORNER[p], mass)
    if (score > bestScore) {
      bestScore = score
      best = p
    }
  }
  return best
}