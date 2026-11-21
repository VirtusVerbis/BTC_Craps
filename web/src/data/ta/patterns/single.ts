import type { Candle } from '../../candles'
import {
  candleStats,
  instanceOf,
  isBearishMarubozu,
  isBullishMarubozu,
  isHammerShape,
  isInvertedHammerShape,
  isLongLegged,
  isShootingStarShape,
} from '../taCandleMetrics'
import type { PatternInstance, TrendContext } from '../taTypes'

export const detectHammerFamily = (
  id: 'hammer' | 'invertedHammer' | 'hangingMan' | 'shootingStar',
  candles: readonly Candle[],
  ctx: TrendContext,
): PatternInstance[] => {
  const out: PatternInstance[] = []
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!
    const s = candleStats(c)
  const trend = ctx.regimeAt(i)
  if (id === 'hammer' && isHammerShape(s)) {
    if (trend === 'down' || trend === 'sideways') {
      out.push(
        instanceOf(
          id,
          'Hammer',
          'bullish',
          'up',
          [i],
          [{ kind: 'wickLow', candleIndex: i, price: c.low }],
          candles,
        ),
      )
    }
  } else if (id === 'hangingMan' && isHammerShape(s) && trend === 'up') {
    out.push(
      instanceOf(
        id,
        'Hanging man',
        'bearish',
        'down',
        [i],
        [{ kind: 'wickLow', candleIndex: i, price: c.low }],
        candles,
      ),
    )
  } else if (id === 'invertedHammer' && isInvertedHammerShape(s) && !isShootingStarShape(s)) {
    if (trend === 'down' || trend === 'sideways') {
      out.push(
        instanceOf(
          id,
          'Inverted hammer',
          'bullish',
          'up',
          [i],
          [{ kind: 'wickHigh', candleIndex: i, price: c.high }],
          candles,
        ),
      )
    }
  } else if (id === 'shootingStar' && isShootingStarShape(s)) {
    out.push(
      instanceOf(
        id,
        'Shooting star',
        'bearish',
        'down',
        [i],
        [{ kind: 'wickHigh', candleIndex: i, price: c.high }],
        candles,
      ),
    )
  }
  }
  return out
}

export const detectMarubozu = (
  bullish: boolean,
  candles: readonly Candle[],
): PatternInstance[] => {
  const out: PatternInstance[] = []
  const id = bullish ? 'bullishMarubozu' : 'bearishMarubozu'
  const name = bullish ? 'Bullish marubozu' : 'Bearish marubozu'
  for (let i = 0; i < candles.length; i++) {
    const s = candleStats(candles[i]!)
    if (bullish ? isBullishMarubozu(s) : isBearishMarubozu(s)) {
      const c = candles[i]!
      out.push(
        instanceOf(
          id,
          name,
          bullish ? 'bullish' : 'bearish',
          bullish ? 'diagonalUp' : 'diagonalDown',
          [i],
          [{ kind: 'body', candleIndex: i, price: (c.open + c.close) / 2 }],
          candles,
        ),
      )
    }
  }
  return out
}

export const detectLongLegged = (candles: readonly Candle[]): PatternInstance[] => {
  const out: PatternInstance[] = []
  for (let i = 0; i < candles.length; i++) {
    if (isLongLegged(candleStats(candles[i]!))) {
      const c = candles[i]!
      out.push(
        instanceOf(
          'longLeggedCandle',
          'Long-legged reversal',
          'neutral',
          'none',
          [i],
          [{ kind: 'midpoint', candleIndex: i, price: (c.high + c.low) / 2 }],
          candles,
        ),
      )
    }
  }
  return out
}

export const detectBeltHold = (bullish: boolean, candles: readonly Candle[]): PatternInstance[] => {
  const out: PatternInstance[] = []
  const id = bullish ? 'bullishBeltHold' : 'bearishBeltHold'
  const name = bullish ? 'Bullish belt hold' : 'Bearish belt hold'
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]!
    const s = candleStats(c)
    const range = c.high - c.low
    if (range <= 0) continue
    if (bullish && s.bullish && s.lowerRatio <= 0.08 && s.bodyRatio >= 0.65) {
      out.push(
        instanceOf(id, name, 'bullish', 'diagonalUp', [i], [{ kind: 'body', candleIndex: i, price: c.close }], candles),
      )
    } else if (!bullish && s.bearish && s.upperRatio <= 0.08 && s.bodyRatio >= 0.65) {
      out.push(
        instanceOf(id, name, 'bearish', 'diagonalDown', [i], [{ kind: 'body', candleIndex: i, price: c.close }], candles),
      )
    }
  }
  return out
}