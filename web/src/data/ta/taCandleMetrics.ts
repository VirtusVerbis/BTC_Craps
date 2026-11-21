import type { Candle } from '../candles'
import {
  DOJI_BODY_RATIO,
  GAP_MIN_BPS,
  LONG_WICK_RATIO,
  MARUBOZU_WICK_MAX,
  SMALL_BODY_RATIO,
} from './taConstants'
import type { ArrowKind, FeaturePoint, PatternInstance, TaBias } from './taTypes'

export interface CandleStats {
  body: number
  range: number
  upperWick: number
  lowerWick: number
  bodyRatio: number
  upperRatio: number
  lowerRatio: number
  bullish: boolean
  bearish: boolean
}

export const candleStats = (c: Candle): CandleStats => {
  const body = Math.abs(c.close - c.open)
  const range = Math.max(c.high - c.low, 1e-9)
  const top = Math.max(c.open, c.close)
  const bottom = Math.min(c.open, c.close)
  const upperWick = c.high - top
  const lowerWick = bottom - c.low
  return {
    body,
    range,
    upperWick,
    lowerWick,
    bodyRatio: body / range,
    upperRatio: upperWick / range,
    lowerRatio: lowerWick / range,
    bullish: c.close >= c.open,
    bearish: c.close < c.open,
  }
}

export const isDoji = (s: CandleStats): boolean => s.bodyRatio <= DOJI_BODY_RATIO

export const isSmallBody = (s: CandleStats): boolean => s.bodyRatio <= SMALL_BODY_RATIO

export const isHammerShape = (s: CandleStats): boolean =>
  s.lowerRatio >= LONG_WICK_RATIO && s.upperRatio <= 0.25 && s.bodyRatio <= SMALL_BODY_RATIO

export const isInvertedHammerShape = (s: CandleStats): boolean =>
  s.upperRatio >= LONG_WICK_RATIO && s.lowerRatio <= 0.25 && s.bodyRatio <= SMALL_BODY_RATIO

export const isShootingStarShape = (s: CandleStats): boolean => isInvertedHammerShape(s)

export const isBullishMarubozu = (s: CandleStats): boolean =>
  s.bullish && s.bodyRatio >= 1 - MARUBOZU_WICK_MAX * 2

export const isBearishMarubozu = (s: CandleStats): boolean =>
  s.bearish && s.bodyRatio >= 1 - MARUBOZU_WICK_MAX * 2

export const isLongLegged = (s: CandleStats): boolean =>
  s.upperRatio >= 0.3 && s.lowerRatio >= 0.3 && s.bodyRatio <= SMALL_BODY_RATIO

export const isSpinningTop = (s: CandleStats): boolean =>
  s.bodyRatio <= SMALL_BODY_RATIO && s.upperRatio >= 0.2 && s.lowerRatio >= 0.2 && !isLongLegged(s)

export const isHighWave = (s: CandleStats): boolean => isLongLegged(s) && s.bodyRatio <= DOJI_BODY_RATIO * 2

export const isDragonflyDoji = (s: CandleStats): boolean =>
  isDoji(s) && s.lowerRatio >= 0.6 && s.upperRatio <= 0.1

export const isGravestoneDoji = (s: CandleStats): boolean =>
  isDoji(s) && s.upperRatio >= 0.6 && s.lowerRatio <= 0.1

export const isFourPriceDoji = (s: CandleStats, c: Candle): boolean =>
  isDoji(s) && Math.abs(c.high - c.low) / Math.max(c.close, 1) < 0.00003

export const bullishEngulfs = (prior: Candle, cur: Candle): boolean =>
  cur.close > cur.open && prior.close < prior.open && cur.open <= prior.close && cur.close >= prior.open

export const bearishEngulfs = (prior: Candle, cur: Candle): boolean =>
  cur.close < cur.open && prior.close > prior.open && cur.open >= prior.close && cur.close <= prior.open

export const bodyInside = (inner: Candle, outer: Candle): boolean => {
  const iLo = Math.min(inner.open, inner.close)
  const iHi = Math.max(inner.open, inner.close)
  const oLo = Math.min(outer.open, outer.close)
  const oHi = Math.max(outer.open, outer.close)
  return iLo >= oLo && iHi <= oHi
}

export const gapUp = (prior: Candle, cur: Candle): boolean => {
  const mid = (prior.close + prior.open) / 2
  const bps = ((cur.open - prior.close) / mid) * 10_000
  return bps >= GAP_MIN_BPS
}

export const gapDown = (prior: Candle, cur: Candle): boolean => {
  const mid = (prior.close + prior.open) / 2
  const bps = ((prior.close - cur.open) / mid) * 10_000
  return bps >= GAP_MIN_BPS
}

export const equalWithinBps = (a: number, b: number, mid: number, bps: number): boolean =>
  Math.abs(a - b) / mid <= bps / 10_000

export const instanceOf = (
  patternId: string,
  displayName: string,
  bias: TaBias,
  arrow: ArrowKind,
  candleIndices: number[],
  features: FeaturePoint[],
  candles: readonly Candle[],
): PatternInstance => {
  const anchorIndex = candleIndices[candleIndices.length - 1]!
  const c = candles[anchorIndex]!
  const anchorPrice = (c.high + c.low) / 2
  return {
    patternId,
    displayName,
    bias,
    arrow,
    candleIndices,
    features,
    anchorIndex,
    anchorPrice,
  }
}