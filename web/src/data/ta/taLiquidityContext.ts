import type { HeatmapGridColumn } from '../microstructure/depthSessionHeatmapGrid'
import type { HeatmapPriceAxis } from '../microstructure/depthHeatmapPriceAxis'
import type { OffRangeEdge, OffRangeSummary } from '../../ui/depth/depthHeatmapDepthProfile'
import { taWallProximityBps } from './taConstants'

export type TaWallLine =
  | { tier: 'inView'; usd: number; price: number; bpsFromAnchor: number; label: string }
  | { tier: 'offRange'; direction: 'above' | 'below'; edge: OffRangeEdge; label: string }
  | null

const bpsBetween = (mid: number, a: number, b: number): number =>
  mid > 0 ? Math.round((Math.abs(a - b) / mid) * 10_000) : 0

const findColumnForTime = (columns: readonly HeatmapGridColumn[], openTime: number): HeatmapGridColumn | null => {
  for (const col of columns) {
    if (openTime >= col.intervalStart && openTime < col.intervalEnd) return col
  }
  for (let j = columns.length - 1; j >= 0; j--) {
    const col = columns[j]!
    if (openTime >= col.intervalStart) return col
  }
  return columns.length > 0 ? columns[columns.length - 1]! : null
}

const formatUsd = (usd: number): string => {
  if (usd >= 1_000_000) return `$${Math.round(usd / 1_000_000)}M`
  if (usd >= 1_000) return `$${Math.round(usd / 1_000)}k`
  return `$${Math.round(usd)}`
}

/** Nearest visible resting pool near pattern anchor price. */
export const taLiquidityLineForAnchor = (
  anchorPrice: number,
  anchorOpenTime: number,
  columns: readonly HeatmapGridColumn[],
  _axis: HeatmapPriceAxis,
  offRange: OffRangeSummary,
  minHalfBps: number,
  refMid: number,
): TaWallLine => {
  if (!(anchorPrice > 0)) return null
  const proximityBps = taWallProximityBps(minHalfBps)
  const col = findColumnForTime(columns, anchorOpenTime)
  let bestUsd = 0
  let bestPrice = 0
  let bestBps = Infinity

  const poolFromColumn = (column: HeatmapGridColumn | null) => {
    if (!column) return
    for (const b of column.buckets) {
      const bps = bpsBetween(refMid, anchorPrice, b.p)
      if (bps <= proximityBps && b.usd > bestUsd) {
        bestUsd = b.usd
        bestPrice = b.p
        bestBps = bps
      }
    }
  }

  poolFromColumn(col)
  if (bestUsd >= 500_000) {
    return {
      tier: 'inView',
      usd: bestUsd,
      price: bestPrice,
      bpsFromAnchor: bestBps,
      label: `${formatUsd(bestUsd)} resting on chart (~${bestBps} bps from pattern)`,
    }
  }

  const aboveBps = offRange.above ? bpsBetween(refMid, anchorPrice, offRange.above.price) : Infinity
  const belowBps = offRange.below ? bpsBetween(refMid, anchorPrice, offRange.below.price) : Infinity
  const useAbove = offRange.above && (aboveBps <= belowBps || !offRange.below)
  const useBelow = offRange.below && !useAbove

  if (useAbove && offRange.above) {
    return {
      tier: 'offRange',
      direction: 'above',
      edge: offRange.above,
      label: `Nearest large pool above view: ${formatUsd(offRange.above.usd)} @ $${Math.round(offRange.above.price).toLocaleString()}`,
    }
  }
  if (useBelow && offRange.below) {
    return {
      tier: 'offRange',
      direction: 'below',
      edge: offRange.below,
      label: `Nearest large pool below view: ${formatUsd(offRange.below.usd)} @ $${Math.round(offRange.below.price).toLocaleString()}`,
    }
  }

  return null
}