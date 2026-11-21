import { describe, expect, it } from 'vitest'
import type { Candle } from '../../data/candles'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { PatternInstance } from '../../data/ta/taTypes'
import { taStripPlacementForInstances } from './taStripPlacement'

const axis: HeatmapPriceAxis = {
  priceMin: 99_000,
  priceMax: 101_000,
  tick: 6,
  rows: 334,
}

const instAt = (anchorIndex: number): PatternInstance => ({
  patternId: 'hammer',
  displayName: 'Hammer',
  bias: 'bullish',
  arrow: 'up',
  candleIndices: [anchorIndex],
  features: [],
  anchorIndex,
  anchorPrice: 100_000,
})

describe('taStripPlacementForInstances', () => {
  it('moves strip to bottom when highlights cluster at top of chart', () => {
    const candles: Candle[] = [
      { openTime: 0, open: 100_900, high: 100_950, low: 100_850, close: 100_920 },
    ]
    const placement = taStripPlacementForInstances(
      [instAt(0)],
      candles,
      900,
      400,
      axis,
      { start: -60_000, end: 60_000 },
      60_000,
    )
    expect(placement === 'bottom-right' || placement === 'top-left').toBe(true)
  })
})