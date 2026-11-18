import { describe, expect, it } from 'vitest'
import type { HeatmapPriceAxis } from '../../data/microstructure/depthHeatmapPriceAxis'
import { rowIndexForPrice } from '../../data/microstructure/depthHeatmapPriceAxis'
import type { HeatmapGridColumn } from '../../data/microstructure/depthSessionHeatmapGrid'
import {
  carriedUsdPerColumnForRow,
  heatmapRowSegmentPixelSpan,
  HEATMAP_ROW_SEGMENT_HEIGHT_FRAC,
} from './depthHeatmapDragPaint'

describe('heatmapRowSegmentPixelSpan', () => {
  it('uses full row band when segment fraction is 1', () => {
    const row = heatmapRowSegmentPixelSpan(0, 10, 100)
    expect(HEATMAP_ROW_SEGMENT_HEIGHT_FRAC).toBe(1)
    expect(row).toEqual({ y: 0, height: 10 })
  })
})

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

  it('holds carry when non-gap column has no bucket snapshot', () => {
    const columns = [
      col(false, [{ p: wallPrice, usd: 3_000_000 }]),
      col(false, []),
      col(false, [{ p: wallPrice, usd: 1_000_000 }]),
    ]
    const usd = carriedUsdPerColumnForRow(columns, row, axis)
    expect(usd).toEqual([3_000_000, 3_000_000, 1_000_000])
  })

  it('holds carry when bucketed sample has liquidity elsewhere but not on that price row', () => {
    const columns = [
      col(false, [{ p: wallPrice, usd: 3_000_000 }]),
      col(false, [{ p: 99_950, usd: 500_000 }]),
      col(false, [{ p: wallPrice, usd: 1_000_000 }]),
    ]
    const usd = carriedUsdPerColumnForRow(columns, row, axis)
    expect(usd).toEqual([3_000_000, 3_000_000, 1_000_000])
  })

  it('clears when snapshot includes the price tick with zero USD', () => {
    const columns = [
      col(false, [{ p: wallPrice, usd: 3_000_000 }]),
      col(false, [{ p: wallPrice, usd: 0 }]),
      col(false, [{ p: wallPrice, usd: 2_000_000 }]),
    ]
    const usd = carriedUsdPerColumnForRow(columns, row, axis)
    expect(usd).toEqual([3_000_000, 0, 2_000_000])
  })
})