import { describe, expect, it } from 'vitest'
import {
  buildTimelineStackSegments,
  distanceFromMid,
  layoutTimelineStack,
  scaleStackSegmentsToSpan,
  stackIsContiguous,
} from './depthMergedTimelineStack'
import type { TimelineStackSegment } from './depthMergedTimelineStack'
import type { VenueId } from '../../data/microstructure/types'

const seg = (value: number, h: number, venue: VenueId = 'binancePerp'): TimelineStackSegment => ({
  value,
  h,
  venue,
})

describe('buildTimelineStackSegments', () => {
  it('sizes the column leader to the band and keeps relative notionals', () => {
    const halfH = 48
    const built = buildTimelineStackSegments(
      [
        { venue: 'hyperliquid', value: 400 },
        { venue: 'binancePerp', value: 100 },
        { venue: 'coinbase', value: 200 },
      ],
      halfH,
    )
    const hl = built.find((s) => s.venue === 'hyperliquid')!
    const bp = built.find((s) => s.venue === 'binancePerp')!
    expect(hl.h).toBe(halfH)
    expect(bp.h).toBeCloseTo(12, 0)
  })
})

describe('scaleStackSegmentsToSpan', () => {
  it('fits the stack inside the canvas half without changing sort keys', () => {
    const scaled = scaleStackSegmentsToSpan(
      [
        seg(100, 40, 'binancePerp'),
        seg(300, 120, 'hyperliquid'),
        seg(200, 80, 'coinbase'),
      ],
      100,
    )
    expect(scaled.reduce((s, x) => s + x.h, 0)).toBeLessThanOrEqual(100 + 0.01)
    expect(scaled.map((s) => s.value)).toEqual([100, 300, 200])
  })
})

describe('layoutTimelineStack', () => {
  const midY = 80

  it('orders by notional value and puts largest bid farthest above mid', () => {
    const laid = layoutTimelineStack(
      [seg(12, 12, 'coinbase'), seg(4, 4, 'binanceSpot'), seg(30, 30, 'hyperliquid')],
      midY,
      'bid',
    )
    expect(laid.map((s) => s.value)).toEqual([4, 12, 30])
    expect(laid.map((s) => s.y)).toEqual([midY - 4, midY - 16, midY - 46])
    expect(Math.min(...laid.map((s) => s.y))).toBe(midY - 46)
    expect(stackIsContiguous(laid, midY, 'bid')).toBe(true)
    for (let i = 0; i < laid.length - 1; i++) {
      const a = laid[i]!
      const b = laid[i + 1]!
      expect(a.value).toBeLessThanOrEqual(b.value)
      expect(distanceFromMid(a.y, a.h, midY, 'bid')).toBeLessThanOrEqual(
        distanceFromMid(b.y, b.h, midY, 'bid'),
      )
    }
  })

  it('orders by notional value and puts largest ask farthest below mid', () => {
    const laid = layoutTimelineStack(
      [seg(12, 12, 'coinbase'), seg(4, 4, 'binanceSpot'), seg(30, 30, 'hyperliquid')],
      midY,
      'ask',
    )
    expect(laid.map((s) => s.y)).toEqual([midY, midY + 4, midY + 16])
    const outer = laid[laid.length - 1]!
    expect(outer.value).toBe(30)
    expect(outer.y + outer.h).toBe(midY + 46)
    expect(stackIsContiguous(laid, midY, 'ask')).toBe(true)
    for (let i = 0; i < laid.length - 1; i++) {
      const a = laid[i]!
      const b = laid[i + 1]!
      expect(a.value).toBeLessThanOrEqual(b.value)
      expect(distanceFromMid(a.y, a.h, midY, 'ask')).toBeLessThanOrEqual(
        distanceFromMid(b.y, b.h, midY, 'ask'),
      )
    }
  })

  it('sorts by value when pixel heights would tie', () => {
    const laid = layoutTimelineStack(
      [
        seg(100, 10, 'binancePerp'),
        seg(400, 10, 'hyperliquid'),
        seg(250, 10, 'coinbase'),
      ],
      midY,
      'ask',
    )
    expect(laid.map((s) => s.venue)).toEqual(['binancePerp', 'coinbase', 'hyperliquid'])
    expect(laid[laid.length - 1]!.venue).toBe('hyperliquid')
  })
})