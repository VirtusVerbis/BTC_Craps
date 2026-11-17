import { describe, expect, it } from 'vitest'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { rowIndexForPrice } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import { carriedUsdPerColumnForRow } from './depthHeatmapDragPaint'

describe('carriedUsdPerColumnForRow', () => {
  const axis: HeatmapPriceAxis = { priceMin: 99_900, priceMax: 100_100, tick: 25, rows: 8 }
  const wallPrice = 100_000
  const row = rowIndexForPrice(wallPrice, axis)

  const col = (gap: boolean, buckets: { p: number; usd: number }[]): HeatmapGridColumn => ({
    intervalStart: 0,
    intervalEnd: 1,
    gap,
    refMid: wallPrice,
    buckets,
  })

  it('carries value across gap columns', () => {
    const columns = [
      col(false, [{ p: wallPrice, usd: 5_000_000 }]),
      col(true, []),
      col(true, []),
    ]
    const usd = carriedUsdPerColumnForRow(columns, row, axis)
    expect(usd).toEqual([5_000_000, 5_000_000, 5_000_000])
  })

  it('clears when a sample has no liquidity on that row', () => {
    const columns = [
      col(false, [{ p: wallPrice, usd: 3_000_000 }]),
      col(false, []),
      col(false, [{ p: wallPrice, usd: 1_000_000 }]),
    ]
    const usd = carriedUsdPerColumnForRow(columns, row, axis)
    expect(usd).toEqual([3_000_000, 0, 1_000_000])
  })
})