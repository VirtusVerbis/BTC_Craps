import type { Candle } from '../candles'

export type PatternId = string

export type TaBias = 'bullish' | 'bearish' | 'neutral'

export type TrendRegime = 'up' | 'down' | 'sideways'

export type ArrowKind = 'none' | 'up' | 'down' | 'diagonalUp' | 'diagonalDown'

export type FeatureKind = 'wickLow' | 'wickHigh' | 'body' | 'midpoint' | 'engulf'

export interface FeaturePoint {
  kind: FeatureKind
  candleIndex: number
  /** Price at feature (for liquidity anchor). */
  price: number
}

export interface PatternInstance {
  patternId: PatternId
  /** Resolved display name (hammer vs hanging man). */
  displayName: string
  bias: TaBias
  arrow: ArrowKind
  candleIndices: number[]
  features: FeaturePoint[]
  anchorIndex: number
  anchorPrice: number
}

export type TrendContext = {
  regimeAt: (index: number) => TrendRegime
}

export type PatternDetector = (candles: readonly Candle[], ctx: TrendContext) => PatternInstance[]

export interface PatternCatalogEntry {
  id: PatternId
  displayName: string
  /** Default bias when not context-dependent. */
  bias: TaBias
  blurb: string
  arrow: ArrowKind
  contextDependent?: boolean
}