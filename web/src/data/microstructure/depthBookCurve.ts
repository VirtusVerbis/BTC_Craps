import { DEPTH_BOOK_CHART_MAX_BPS, DEPTH_BOOK_CHART_STRETCH_MAX_BPS } from './depthDisplayConstants'
import type { BookLevel } from './types'

export { DEPTH_BOOK_CHART_MAX_BPS, DEPTH_BOOK_CHART_STRETCH_MAX_BPS }

export interface CumulativeDepthPoint {
  bps: number
  cumulativeBtc: number
}

const bpsFromMid = (mid: number, price: number): number => ((price - mid) / mid) * 10_000

export const buildCumulativeDepth = (
  mid: number,
  bids: readonly BookLevel[],
  asks: readonly BookLevel[],
  maxBps = DEPTH_BOOK_CHART_MAX_BPS,
): { bids: CumulativeDepthPoint[]; asks: CumulativeDepthPoint[] } => {
  if (!(mid > 0)) {
    return { bids: [], asks: [] }
  }

  const bidOut: CumulativeDepthPoint[] = [{ bps: 0, cumulativeBtc: 0 }]
  const bidSorted = [...bids].filter((l) => l.price > 0 && l.size > 0).sort((a, b) => b.price - a.price)
  let bidCum = 0
  for (const l of bidSorted) {
    const bps = bpsFromMid(mid, l.price)
    if (bps > 0) continue
    if (-bps > maxBps) break
    bidCum += l.size
    bidOut.push({ bps, cumulativeBtc: bidCum })
  }

  const askOut: CumulativeDepthPoint[] = [{ bps: 0, cumulativeBtc: 0 }]
  const askSorted = [...asks].filter((l) => l.price > 0 && l.size > 0).sort((a, b) => a.price - b.price)
  let askCum = 0
  for (const l of askSorted) {
    const bps = bpsFromMid(mid, l.price)
    if (bps < 0) continue
    if (bps > maxBps) break
    askCum += l.size
    askOut.push({ bps, cumulativeBtc: askCum })
  }

  return { bids: bidOut, asks: askOut }
}

export interface CurveSideExtents {
  /** Magnitude of deepest bid (positive number, bps below mid). */
  bidExtentBps: number
  /** Furthest ask in bps above mid. */
  askExtentBps: number
}

export const curveSideExtents = (curve: {
  bids: CumulativeDepthPoint[]
  asks: CumulativeDepthPoint[]
}): CurveSideExtents => {
  let bidExtentBps = 0
  let askExtentBps = 0
  for (const p of curve.bids) {
    if (p.bps < 0) bidExtentBps = Math.max(bidExtentBps, -p.bps)
  }
  for (const p of curve.asks) {
    if (p.bps > 0) askExtentBps = Math.max(askExtentBps, p.bps)
  }
  return { bidExtentBps, askExtentBps }
}

export const maxCumulativeBtc = (curves: { bids: CumulativeDepthPoint[]; asks: CumulativeDepthPoint[] }[]): number => {
  let max = 0.01
  for (const c of curves) {
    for (const p of [...c.bids, ...c.asks]) {
      max = Math.max(max, p.cumulativeBtc)
    }
  }
  return max
}

export const maxCumulativeBtcSide = (
  curves: readonly { bids: CumulativeDepthPoint[]; asks: CumulativeDepthPoint[] }[],
  side: 'bid' | 'ask',
): number => {
  let max = 0.01
  const points = side === 'bid' ? 'bids' : 'asks'
  for (const c of curves) {
    for (const p of c[points]) {
      max = Math.max(max, p.cumulativeBtc)
    }
  }
  return max
}

/** Step cumulative on a venue bid/ask curve at a shared bps knot (overlap aggregate). */
export const cumulativeBtcAtSharedBps = (
  points: readonly CumulativeDepthPoint[],
  targetBps: number,
  side: 'bid' | 'ask',
): number => {
  if (points.length === 0) return 0
  if (side === 'bid') {
    let at = 0
    for (const p of points) {
      if (p.bps >= targetBps) at = p.cumulativeBtc
    }
    return at
  }
  let at = 0
  for (const p of points) {
    if (p.bps <= targetBps) at = p.cumulativeBtc
  }
  return at
}

/** Sum venue cumulative curves at each union bps knot (each venue still uses its own mid). */
export const sumVenueCurvesAtSharedBps = (
  curves: readonly { bids: CumulativeDepthPoint[]; asks: CumulativeDepthPoint[] }[],
): { bids: CumulativeDepthPoint[]; asks: CumulativeDepthPoint[] } => {
  const bidBps = new Set<number>([0])
  const askBps = new Set<number>([0])
  for (const c of curves) {
    for (const p of c.bids) bidBps.add(p.bps)
    for (const p of c.asks) askBps.add(p.bps)
  }
  const bidSorted = [...bidBps].sort((a, b) => b - a)
  const askSorted = [...askBps].sort((a, b) => a - b)
  const bids: CumulativeDepthPoint[] = bidSorted.map((bps) => ({
    bps,
    cumulativeBtc: curves.reduce((sum, c) => sum + cumulativeBtcAtSharedBps(c.bids, bps, 'bid'), 0),
  }))
  const asks: CumulativeDepthPoint[] = askSorted.map((bps) => ({
    bps,
    cumulativeBtc: curves.reduce((sum, c) => sum + cumulativeBtcAtSharedBps(c.asks, bps, 'ask'), 0),
  }))
  return { bids, asks }
}