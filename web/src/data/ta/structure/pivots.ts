import type { Candle } from '../../candles'
import { STRUCT_PIVOT_RADIUS } from './structConstants'

export type Pivot = {
  index: number
  price: number
}

export const fractalPivotHighs = (candles: readonly Candle[]): Pivot[] => {
  const r = STRUCT_PIVOT_RADIUS
  const out: Pivot[] = []
  for (let i = r; i < candles.length - r; i++) {
    const h = candles[i]!.high
    let isPivot = true
    for (let j = 1; j <= r; j++) {
      if (candles[i - j]!.high > h || candles[i + j]!.high > h) {
        isPivot = false
        break
      }
    }
    if (isPivot) out.push({ index: i, price: h })
  }
  return out
}

export const fractalPivotLows = (candles: readonly Candle[]): Pivot[] => {
  const r = STRUCT_PIVOT_RADIUS
  const out: Pivot[] = []
  for (let i = r; i < candles.length - r; i++) {
    const l = candles[i]!.low
    let isPivot = true
    for (let j = 1; j <= r; j++) {
      if (candles[i - j]!.low < l || candles[i + j]!.low < l) {
        isPivot = false
        break
      }
    }
    if (isPivot) out.push({ index: i, price: l })
  }
  return out
}