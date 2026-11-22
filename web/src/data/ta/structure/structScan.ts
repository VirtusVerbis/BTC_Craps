import type { Candle } from '../../candles'
import { candlesFingerprint } from '../taScan'
import type { PatternId, PatternInstance } from '../taTypes'
import { fractalPivotHighs, fractalPivotLows } from './pivots'
import {
  detectDoubleBottom,
  detectDoubleTop,
  detectHeadAndShoulders,
  detectInverseHeadAndShoulders,
  detectRangeBreakoutBear,
  detectRangeBreakoutBull,
  detectRangeTrapBear,
  detectRangeTrapBull,
  detectStructureBreakBear,
  detectStructureBreakBull,
  detectSwingFailureHigh,
  detectSwingFailureLow,
  detectTripleBottom,
  detectTripleTop,
} from './structDetect'

type PivotBundle = {
  highs: ReturnType<typeof fractalPivotHighs>
  lows: ReturnType<typeof fractalPivotLows>
}

let cachedFingerprint = ''
let cachedPivots: PivotBundle | null = null

const pivotBundle = (candles: readonly Candle[]): PivotBundle => {
  const fp = candlesFingerprint(candles)
  if (fp === cachedFingerprint && cachedPivots) return cachedPivots
  const bundle = { highs: fractalPivotHighs(candles), lows: fractalPivotLows(candles) }
  cachedFingerprint = fp
  cachedPivots = bundle
  return bundle
}

export const detectStructPattern = (id: PatternId, candles: readonly Candle[]): PatternInstance[] => {
  if (candles.length < 12) return []
  const pivots = pivotBundle(candles)

  switch (id) {
    case 'doubleTop':
      return detectDoubleTop(candles, pivots.highs)
    case 'doubleBottom':
      return detectDoubleBottom(candles, pivots.lows)
    case 'tripleTop':
      return detectTripleTop(candles, pivots.highs)
    case 'tripleBottom':
      return detectTripleBottom(candles, pivots.lows)
    case 'rangeBreakoutBull':
      return detectRangeBreakoutBull(candles)
    case 'rangeBreakoutBear':
      return detectRangeBreakoutBear(candles)
    case 'swingFailureHigh':
      return detectSwingFailureHigh(candles, pivots.highs)
    case 'swingFailureLow':
      return detectSwingFailureLow(candles, pivots.lows)
    case 'structureBreakBull':
      return detectStructureBreakBull(candles, pivots.highs)
    case 'structureBreakBear':
      return detectStructureBreakBear(candles, pivots.lows)
    case 'rangeTrapBull':
      return detectRangeTrapBull(candles)
    case 'rangeTrapBear':
      return detectRangeTrapBear(candles)
    case 'headAndShoulders':
      return detectHeadAndShoulders(candles, pivots.highs)
    case 'inverseHeadAndShoulders':
      return detectInverseHeadAndShoulders(candles, pivots.lows)
    default:
      return []
  }
}