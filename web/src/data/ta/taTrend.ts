import type { Candle } from '../candles'
import { TREND_LOOKBACK_BARS, TREND_SLOPE_THRESHOLD_PCT } from './taConstants'
import type { TrendContext, TrendRegime } from './taTypes'

const regimeFromCloses = (closes: number[]): TrendRegime => {
  if (closes.length < 2) return 'sideways'
  const start = closes[0]!
  const end = closes[closes.length - 1]!
  const pct = ((end - start) / start) * 100
  if (pct >= TREND_SLOPE_THRESHOLD_PCT) return 'up'
  if (pct <= -TREND_SLOPE_THRESHOLD_PCT) return 'down'
  return 'sideways'
}

export const buildTrendContext = (candles: readonly Candle[]): TrendContext => {
  const regimeAt = (index: number): TrendRegime => {
    const start = Math.max(0, index - TREND_LOOKBACK_BARS)
    if (index <= start) return 'sideways'
    const slice = candles.slice(start, index)
    const closes = slice.map((c) => c.close).filter((v) => v > 0)
    return regimeFromCloses(closes)
  }
  return { regimeAt }
}