import type { Candle } from '../../candles'
import { equalWithinBps, instanceOf } from '../taCandleMetrics'
import type { PatternId, PatternInstance } from '../taTypes'
import type { Pivot } from './pivots'
import {
  STRUCT_MIN_PIVOT_SPAN,
  STRUCT_RANGE_COMPRESSION_MAX,
  STRUCT_HEAD_MIN_EXTRA_BPS,
  STRUCT_RANGE_WINDOW_BARS,
  STRUCTURE_BREAK_BPS,
  STRUCTURE_LEVEL_BPS,
} from './structConstants'

const midPrice = (a: number, b: number): number => (a + b) / 2

const breakBelow = (close: number, level: number, ref: number): boolean =>
  close < level * (1 - STRUCTURE_BREAK_BPS / 10_000) && ref > 0

const breakAbove = (close: number, level: number, ref: number): boolean =>
  close > level * (1 + STRUCTURE_BREAK_BPS / 10_000) && ref > 0

const middleTroughBetween = (candles: readonly Candle[], i: number, j: number): number => {
  let low = Number.POSITIVE_INFINITY
  for (let k = i; k <= j; k++) low = Math.min(low, candles[k]!.low)
  return low
}

const middlePeakBetween = (candles: readonly Candle[], i: number, j: number): number => {
  let high = Number.NEGATIVE_INFINITY
  for (let k = i; k <= j; k++) high = Math.max(high, candles[k]!.high)
  return high
}

const levelTightness = (a: number, b: number, ref: number): number => Math.abs(a - b) / ref

type PeakMatch = {
  indices: number[]
  pivotPrices: number[]
  middleLevel: number
  anchorIndex: number
  tightness: number
}

const matchPeaks = (
  candles: readonly Candle[],
  pivots: Pivot[],
  count: 2 | 3,
  bearish: boolean,
): PeakMatch | null => {
  if (pivots.length < count) return null
  const lastClose = candles[candles.length - 1]!.close
  let best: PeakMatch | null = null

  const tryCombo = (picked: Pivot[]) => {
    const ref = picked[0]!.price
    for (const p of picked) {
      if (!equalWithinBps(p.price, ref, ref, STRUCTURE_LEVEL_BPS)) return
    }
    const i0 = picked[0]!.index
    const i1 = picked[picked.length - 1]!.index
    if (i1 - i0 < STRUCT_MIN_PIVOT_SPAN) return
    const middle = bearish ? middleTroughBetween(candles, i0, i1) : middlePeakBetween(candles, i0, i1)
    const refMid = midPrice(picked[0]!.price, picked[picked.length - 1]!.price)
    const confirmed = bearish
      ? breakBelow(lastClose, middle, refMid)
      : breakAbove(lastClose, middle, refMid)
    if (!confirmed) return

    const tightness = picked.reduce((acc, p, idx) => {
      if (idx === 0) return acc
      return acc + levelTightness(p.price, picked[0]!.price, refMid)
    }, 0)

    const candidate: PeakMatch = {
      indices: picked.map((p) => p.index),
      pivotPrices: picked.map((p) => p.price),
      middleLevel: middle,
      anchorIndex: i1,
      tightness,
    }
    if (!best || candidate.anchorIndex > best.anchorIndex || (candidate.anchorIndex === best.anchorIndex && candidate.tightness < best.tightness)) {
      best = candidate
    }
  }

  if (count === 2) {
    for (let a = 0; a < pivots.length - 1; a++) {
      for (let b = a + 1; b < pivots.length; b++) tryCombo([pivots[a]!, pivots[b]!])
    }
  } else {
    for (let a = 0; a < pivots.length - 2; a++) {
      for (let b = a + 1; b < pivots.length - 1; b++) {
        for (let c = b + 1; c < pivots.length; c++) tryCombo([pivots[a]!, pivots[b]!, pivots[c]!])
      }
    }
  }

  return best
}

const peakInstance = (
  id: PatternId,
  entryName: string,
  bearish: boolean,
  match: PeakMatch,
  candles: readonly Candle[],
  pivotIsHigh: boolean,
): PatternInstance => {
  const wickKind = pivotIsHigh ? ('wickHigh' as const) : ('wickLow' as const)
  const features = match.pivotPrices.map((price, idx) => ({
    kind: wickKind,
    candleIndex: match.indices[idx]!,
    price,
  }))
  features.push({
    kind: bearish ? 'wickLow' : 'wickHigh',
    candleIndex: match.anchorIndex,
    price: match.middleLevel,
  })
  return instanceOf(
    id,
    entryName,
    bearish ? 'bearish' : 'bullish',
    bearish ? 'down' : 'up',
    match.indices,
    features,
    candles,
  )
}

export const detectDoubleTop = (candles: readonly Candle[], pivotHighs: Pivot[]): PatternInstance[] => {
  const m = matchPeaks(candles, pivotHighs, 2, true)
  if (!m) return []
  return [peakInstance('doubleTop', 'Double top', true, m, candles, true)]
}

export const detectDoubleBottom = (candles: readonly Candle[], pivotLows: Pivot[]): PatternInstance[] => {
  const m = matchPeaks(candles, pivotLows, 2, false)
  if (!m) return []
  return [peakInstance('doubleBottom', 'Double bottom', false, m, candles, false)]
}

export const detectTripleTop = (candles: readonly Candle[], pivotHighs: Pivot[]): PatternInstance[] => {
  const m = matchPeaks(candles, pivotHighs, 3, true)
  if (!m) return []
  return [peakInstance('tripleTop', 'Triple top', true, m, candles, true)]
}

export const detectTripleBottom = (candles: readonly Candle[], pivotLows: Pivot[]): PatternInstance[] => {
  const m = matchPeaks(candles, pivotLows, 3, false)
  if (!m) return []
  return [peakInstance('tripleBottom', 'Triple bottom', false, m, candles, false)]
}

const rangeBreakout = (id: PatternId, bull: boolean, candles: readonly Candle[]): PatternInstance[] => {
  const w = STRUCT_RANGE_WINDOW_BARS
  if (candles.length < w * 2 + 2) return []

  const prior = candles.slice(candles.length - w * 2 - 1, candles.length - w - 1)
  const recent = candles.slice(candles.length - w - 1, candles.length - 1)
  const last = candles[candles.length - 1]!
  if (prior.length < w || recent.length < w) return []

  const priorHigh = Math.max(...prior.map((c) => c.high))
  const priorLow = Math.min(...prior.map((c) => c.low))
  const recentHigh = Math.max(...recent.map((c) => c.high))
  const recentLow = Math.min(...recent.map((c) => c.low))
  const priorSpan = priorHigh - priorLow
  const recentSpan = recentHigh - recentLow
  if (!(priorSpan > 0) || recentSpan / priorSpan > STRUCT_RANGE_COMPRESSION_MAX) return []

  const ref = midPrice(priorHigh, priorLow)
  if (bull) {
    if (!breakAbove(last.close, recentHigh, ref)) return []
    const startIdx = candles.length - w - 1
    const indices = Array.from({ length: w + 1 }, (_, k) => startIdx + k)
    return [
      instanceOf(
        id,
        'Range breakout (bull)',
        'bullish',
        'diagonalUp',
        indices,
        [
          { kind: 'wickHigh', candleIndex: indices[indices.length - 2]!, price: recentHigh },
          { kind: 'body', candleIndex: candles.length - 1, price: last.close },
        ],
        candles,
      ),
    ]
  }

  if (!breakBelow(last.close, recentLow, ref)) return []
  const startIdx = candles.length - w - 1
  const indices = Array.from({ length: w + 1 }, (_, k) => startIdx + k)
  return [
    instanceOf(
      id,
      'Range breakout (bear)',
      'bearish',
      'diagonalDown',
      indices,
      [
        { kind: 'wickLow', candleIndex: indices[indices.length - 2]!, price: recentLow },
        { kind: 'body', candleIndex: candles.length - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

export const detectRangeBreakoutBull = (candles: readonly Candle[]): PatternInstance[] =>
  rangeBreakout('rangeBreakoutBull', true, candles)

export const detectRangeBreakoutBear = (candles: readonly Candle[]): PatternInstance[] =>
  rangeBreakout('rangeBreakoutBear', false, candles)

const rangeBox = (candles: readonly Candle[]) => {
  const w = STRUCT_RANGE_WINDOW_BARS
  if (candles.length < w * 2 + 2) return null
  const prior = candles.slice(candles.length - w * 2 - 1, candles.length - w - 1)
  const recent = candles.slice(candles.length - w - 1, candles.length - 1)
  if (prior.length < w || recent.length < w) return null
  const priorHigh = Math.max(...prior.map((c) => c.high))
  const priorLow = Math.min(...prior.map((c) => c.low))
  const recentHigh = Math.max(...recent.map((c) => c.high))
  const recentLow = Math.min(...recent.map((c) => c.low))
  const priorSpan = priorHigh - priorLow
  const recentSpan = recentHigh - recentLow
  if (!(priorSpan > 0) || recentSpan / priorSpan > STRUCT_RANGE_COMPRESSION_MAX) return null
  const ref = midPrice(priorHigh, priorLow)
  const startIdx = candles.length - w - 1
  return { recentHigh, recentLow, ref, startIdx, w }
}

export const detectSwingFailureHigh = (candles: readonly Candle[], pivotHighs: Pivot[]): PatternInstance[] => {
  const n = candles.length
  if (n < 5 || pivotHighs.length === 0) return []
  const last = candles[n - 1]!
  const prior = pivotHighs.filter((p) => p.index < n - 1)
  if (prior.length === 0) return []
  const refPivot = prior[prior.length - 1]!
  const level = refPivot.price
  const minSweep = level * (1 + STRUCTURE_BREAK_BPS / 10_000)
  if (last.high < minSweep || last.close >= level) return []
  return [
    instanceOf(
      'swingFailureHigh',
      'Swing failure high',
      'bearish',
      'down',
      [refPivot.index, n - 1],
      [
        { kind: 'wickHigh', candleIndex: refPivot.index, price: level },
        { kind: 'wickHigh', candleIndex: n - 1, price: last.high },
        { kind: 'body', candleIndex: n - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

export const detectSwingFailureLow = (candles: readonly Candle[], pivotLows: Pivot[]): PatternInstance[] => {
  const n = candles.length
  if (n < 5 || pivotLows.length === 0) return []
  const last = candles[n - 1]!
  const prior = pivotLows.filter((p) => p.index < n - 1)
  if (prior.length === 0) return []
  const refPivot = prior[prior.length - 1]!
  const level = refPivot.price
  const minSweep = level * (1 - STRUCTURE_BREAK_BPS / 10_000)
  if (last.low > minSweep || last.close <= level) return []
  return [
    instanceOf(
      'swingFailureLow',
      'Swing failure low',
      'bullish',
      'up',
      [refPivot.index, n - 1],
      [
        { kind: 'wickLow', candleIndex: refPivot.index, price: level },
        { kind: 'wickLow', candleIndex: n - 1, price: last.low },
        { kind: 'body', candleIndex: n - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

export const detectStructureBreakBull = (candles: readonly Candle[], pivotHighs: Pivot[]): PatternInstance[] => {
  const n = candles.length
  const last = candles[n - 1]!
  const prior = pivotHighs.filter((p) => p.index <= n - 1 - STRUCT_MIN_PIVOT_SPAN)
  if (prior.length === 0) return []
  const refPivot = prior[prior.length - 1]!
  if (!breakAbove(last.close, refPivot.price, refPivot.price)) return []
  return [
    instanceOf(
      'structureBreakBull',
      'Structure break (bull)',
      'bullish',
      'up',
      [refPivot.index, n - 1],
      [
        { kind: 'wickHigh', candleIndex: refPivot.index, price: refPivot.price },
        { kind: 'body', candleIndex: n - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

export const detectStructureBreakBear = (candles: readonly Candle[], pivotLows: Pivot[]): PatternInstance[] => {
  const n = candles.length
  const last = candles[n - 1]!
  const prior = pivotLows.filter((p) => p.index <= n - 1 - STRUCT_MIN_PIVOT_SPAN)
  if (prior.length === 0) return []
  const refPivot = prior[prior.length - 1]!
  if (!breakBelow(last.close, refPivot.price, refPivot.price)) return []
  return [
    instanceOf(
      'structureBreakBear',
      'Structure break (bear)',
      'bearish',
      'down',
      [refPivot.index, n - 1],
      [
        { kind: 'wickLow', candleIndex: refPivot.index, price: refPivot.price },
        { kind: 'body', candleIndex: n - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

export const detectRangeTrapBull = (candles: readonly Candle[]): PatternInstance[] => {
  const box = rangeBox(candles)
  if (!box || candles.length < 2) return []
  const prev = candles[candles.length - 2]!
  const last = candles[candles.length - 1]!
  if (!breakBelow(prev.close, box.recentLow, box.ref)) return []
  if (!breakAbove(last.close, box.recentLow, box.ref)) return []
  const startIdx = box.startIdx
  const indices = Array.from({ length: box.w + 1 }, (_, k) => startIdx + k)
  return [
    instanceOf(
      'rangeTrapBull',
      'Range trap (bull)',
      'bullish',
      'up',
      indices,
      [
        { kind: 'wickLow', candleIndex: candles.length - 2, price: prev.low },
        { kind: 'body', candleIndex: candles.length - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

export const detectRangeTrapBear = (candles: readonly Candle[]): PatternInstance[] => {
  const box = rangeBox(candles)
  if (!box || candles.length < 2) return []
  const prev = candles[candles.length - 2]!
  const last = candles[candles.length - 1]!
  if (!breakAbove(prev.close, box.recentHigh, box.ref)) return []
  if (!breakBelow(last.close, box.recentHigh, box.ref)) return []
  const startIdx = box.startIdx
  const indices = Array.from({ length: box.w + 1 }, (_, k) => startIdx + k)
  return [
    instanceOf(
      'rangeTrapBear',
      'Range trap (bear)',
      'bearish',
      'down',
      indices,
      [
        { kind: 'wickHigh', candleIndex: candles.length - 2, price: prev.high },
        { kind: 'body', candleIndex: candles.length - 1, price: last.close },
      ],
      candles,
    ),
  ]
}

const headAboveShoulders = (head: number, shoulder: number): boolean => {
  const extra = ((head - shoulder) / shoulder) * 10_000
  return extra >= STRUCT_HEAD_MIN_EXTRA_BPS
}

const headBelowShoulders = (head: number, shoulder: number): boolean => {
  const extra = ((shoulder - head) / shoulder) * 10_000
  return extra >= STRUCT_HEAD_MIN_EXTRA_BPS
}

const matchHeadShoulders = (
  candles: readonly Candle[],
  pivots: Pivot[],
  inverse: boolean,
): PatternInstance[] => {
  if (pivots.length < 3) return []
  const lastClose = candles[candles.length - 1]!.close
  let best: PeakMatch | null = null

  for (let a = 0; a < pivots.length - 2; a++) {
    for (let b = a + 1; b < pivots.length - 1; b++) {
      for (let c = b + 1; c < pivots.length; c++) {
        const left = pivots[a]!
        const head = pivots[b]!
        const right = pivots[c]!
        if (head.index - left.index < STRUCT_MIN_PIVOT_SPAN || right.index - head.index < STRUCT_MIN_PIVOT_SPAN) {
          continue
        }
        const ref = left.price
        if (!equalWithinBps(left.price, right.price, ref, STRUCTURE_LEVEL_BPS)) continue
        if (inverse) {
          if (head.price >= left.price || head.price >= right.price) continue
          if (!headBelowShoulders(head.price, left.price)) continue
          const middle = middlePeakBetween(candles, left.index, right.index)
          if (!breakAbove(lastClose, middle, ref)) continue
        } else {
          if (head.price <= left.price || head.price <= right.price) continue
          if (!headAboveShoulders(head.price, left.price)) continue
          const middle = middleTroughBetween(candles, left.index, right.index)
          if (!breakBelow(lastClose, middle, ref)) continue
        }
        const tightness = levelTightness(left.price, right.price, ref)
        const match: PeakMatch = {
          indices: [left.index, head.index, right.index],
          pivotPrices: [left.price, head.price, right.price],
          middleLevel: inverse
            ? middlePeakBetween(candles, left.index, right.index)
            : middleTroughBetween(candles, left.index, right.index),
          anchorIndex: right.index,
          tightness,
        }
        if (
          !best ||
          match.anchorIndex > best.anchorIndex ||
          (match.anchorIndex === best.anchorIndex && match.tightness < best.tightness)
        ) {
          best = match
        }
      }
    }
  }

  if (!best) return []
  const id = inverse ? 'inverseHeadAndShoulders' : 'headAndShoulders'
  const name = inverse ? 'Inverse head & shoulders' : 'Head & shoulders'
  return [peakInstance(id, name, !inverse, best, candles, !inverse)]
}

export const detectHeadAndShoulders = (candles: readonly Candle[], pivotHighs: Pivot[]): PatternInstance[] =>
  matchHeadShoulders(candles, pivotHighs, false)

export const detectInverseHeadAndShoulders = (candles: readonly Candle[], pivotLows: Pivot[]): PatternInstance[] =>
  matchHeadShoulders(candles, pivotLows, true)