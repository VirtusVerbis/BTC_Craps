import type { Candle } from '../candles'
import { detectIndecision } from './patterns/indecision'
import { detectContinuation } from './patterns/continuation'
import { detectThreeCandle } from './patterns/threeCandle'
import { detectTwoCandle } from './patterns/twoCandle'
import { detectBeltHold, detectHammerFamily, detectLongLegged, detectMarubozu } from './patterns/single'
import { buildTrendContext } from './taTrend'
import type { PatternId, PatternInstance } from './taTypes'

const INDECISION: PatternId[] = [
  'standardDoji',
  'dragonflyDoji',
  'gravestoneDoji',
  'longLeggedDoji',
  'fourPriceDoji',
  'spinningTop',
  'highWaveCandle',
]

const TWO: PatternId[] = [
  'bullishEngulfing',
  'bearishEngulfing',
  'piercingLine',
  'darkCloudCover',
  'harami',
  'haramiCross',
  'tweezerBottom',
  'tweezerTop',
  'bullishKicker',
  'bearishKicker',
]

const THREE: PatternId[] = [
  'morningStar',
  'eveningStar',
  'morningDojiStar',
  'eveningDojiStar',
  'threeWhiteSoldiers',
  'threeBlackCrows',
  'threeInsideUp',
  'threeInsideDown',
  'threeOutsideUp',
  'threeOutsideDown',
  'bullishAbandonedBaby',
  'bearishAbandonedBaby',
]

const CONT: PatternId[] = [
  'risingThreeMethods',
  'fallingThreeMethods',
  'bullishFlag',
  'bearishFlag',
  'tasukiGapUp',
  'tasukiGapDown',
  'matHold',
  'sideBySideWhiteLines',
  'bullishSeparatingLines',
  'bearishSeparatingLines',
  'upsideGapTwoCrows',
  'downsideGapThreeMethods',
]

export const detectPattern = (id: PatternId, candles: readonly Candle[]): PatternInstance[] => {
  if (candles.length === 0) return []
  const ctx = buildTrendContext(candles)

  if (id === 'hammer') return detectHammerFamily('hammer', candles, ctx)
  if (id === 'invertedHammer') return detectHammerFamily('invertedHammer', candles, ctx)
  if (id === 'hangingMan') return detectHammerFamily('hangingMan', candles, ctx)
  if (id === 'shootingStar') return detectHammerFamily('shootingStar', candles, ctx)
  if (id === 'bullishMarubozu') return detectMarubozu(true, candles)
  if (id === 'bearishMarubozu') return detectMarubozu(false, candles)
  if (id === 'longLeggedCandle') return detectLongLegged(candles)
  if (id === 'bullishBeltHold') return detectBeltHold(true, candles)
  if (id === 'bearishBeltHold') return detectBeltHold(false, candles)

  if (INDECISION.includes(id)) return detectIndecision(id, candles)
  if (TWO.includes(id)) return detectTwoCandle(id, candles)
  if (THREE.includes(id)) return detectThreeCandle(id, candles)
  if (CONT.includes(id)) return detectContinuation(id, candles, ctx)

  return []
}

export const candlesFingerprint = (candles: readonly Candle[]): string => {
  if (candles.length === 0) return ''
  const last = candles[candles.length - 1]!
  const first = candles[0]!
  return `${candles.length}:${first.openTime}:${last.openTime}:${last.close}`
}