import {
  candleStats,
  instanceOf,
  isDoji,
  isDragonflyDoji,
  isFourPriceDoji,
  isGravestoneDoji,
  isHighWave,
  isLongLegged,
  isSpinningTop,
} from '../taCandleMetrics'
import type { Candle } from '../../candles'
import type { PatternInstance, PatternId } from '../taTypes'

const scanSingle = (
  id: PatternId,
  name: string,
  bias: PatternInstance['bias'],
  arrow: PatternInstance['arrow'],
  candles: readonly Candle[],
  test: (i: number) => boolean,
  feature: (c: Candle, i: number) => PatternInstance['features'],
): PatternInstance[] => {
  const out: PatternInstance[] = []
  for (let i = 0; i < candles.length; i++) {
    if (!test(i)) continue
    const c = candles[i]!
    out.push(instanceOf(id, name, bias, arrow, [i], feature(c, i), candles))
  }
  return out
}

export const detectIndecision = (id: PatternId, candles: readonly Candle[]): PatternInstance[] => {
  switch (id) {
    case 'standardDoji':
      return scanSingle(
        id,
        'Standard doji',
        'neutral',
        'none',
        candles,
        (i) => isDoji(candleStats(candles[i]!)),
        (c, i) => [{ kind: 'body', candleIndex: i, price: (c.open + c.close) / 2 }],
      )
    case 'dragonflyDoji':
      return scanSingle(
        id,
        'Dragonfly doji',
        'bullish',
        'up',
        candles,
        (i) => isDragonflyDoji(candleStats(candles[i]!)),
        (c, i) => [{ kind: 'wickLow', candleIndex: i, price: c.low }],
      )
    case 'gravestoneDoji':
      return scanSingle(
        id,
        'Gravestone doji',
        'bearish',
        'down',
        candles,
        (i) => isGravestoneDoji(candleStats(candles[i]!)),
        (c, i) => [{ kind: 'wickHigh', candleIndex: i, price: c.high }],
      )
    case 'longLeggedDoji':
      return scanSingle(
        id,
        'Long-legged doji',
        'neutral',
        'none',
        candles,
        (i) => isDoji(candleStats(candles[i]!)) && isLongLegged(candleStats(candles[i]!)),
        (c, i) => [{ kind: 'midpoint', candleIndex: i, price: (c.high + c.low) / 2 }],
      )
    case 'fourPriceDoji':
      return scanSingle(
        id,
        'Four-price doji',
        'neutral',
        'none',
        candles,
        (i) => isFourPriceDoji(candleStats(candles[i]!), candles[i]!),
        (c, i) => [{ kind: 'body', candleIndex: i, price: c.close }],
      )
    case 'spinningTop':
      return scanSingle(
        id,
        'Spinning top',
        'neutral',
        'none',
        candles,
        (i) => isSpinningTop(candleStats(candles[i]!)),
        (c, i) => [{ kind: 'body', candleIndex: i, price: (c.open + c.close) / 2 }],
      )
    case 'highWaveCandle':
      return scanSingle(
        id,
        'High-wave candle',
        'neutral',
        'none',
        candles,
        (i) => isHighWave(candleStats(candles[i]!)),
        (c, i) => [{ kind: 'midpoint', candleIndex: i, price: (c.high + c.low) / 2 }],
      )
    default:
      return []
  }
}