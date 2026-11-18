/** Stack layout: smallest hugging midline, largest farthest from mid (opaque segments). */

import type { VenueId } from '../../data/microstructure/types'

export type TimelineStackSegment = { h: number; value: number; venue: VenueId }

export const sortTimelineStackSegments = <T extends { value: number; h: number }>(
  segments: readonly T[],
): T[] => [...segments].sort((a, b) => a.value - b.value || a.h - b.h)

/** Heights from this column's largest venue on this side (not session scale max). */
export const buildTimelineStackSegments = (
  plotted: readonly { venue: VenueId; value: number }[],
  halfH: number,
): TimelineStackSegment[] => {
  const positives = plotted.filter((p) => p.value > 0)
  if (positives.length === 0) return []
  const columnMax = Math.max(...positives.map((p) => p.value))
  return positives.map(({ venue, value }) => ({
    venue,
    value,
    h: Math.max(1, (value / columnMax) * halfH),
  }))
}

/** Keeps stack contiguous inside the canvas half (avoids clip "floating" slices). */
export const scaleStackSegmentsToSpan = (
  segments: readonly TimelineStackSegment[],
  span: number,
): TimelineStackSegment[] => {
  if (segments.length === 0 || span <= 0) return []
  const total = segments.reduce((sum, seg) => sum + seg.h, 0)
  if (total <= span) return segments.map((seg) => ({ ...seg }))
  const k = span / total
  return segments.map((seg) => ({ ...seg, h: Math.max(1, seg.h * k) }))
}

export type LaidTimelineStackSegment = TimelineStackSegment & { y: number }

/** Single-pass layout: each row's y/h belong to the same venue. */
export const layoutTimelineStack = (
  segments: readonly TimelineStackSegment[],
  midY: number,
  side: 'bid' | 'ask',
): LaidTimelineStackSegment[] => {
  const ordered = sortTimelineStackSegments(segments)
  const laid: LaidTimelineStackSegment[] = []
  if (side === 'bid') {
    let cursor = midY
    for (const seg of ordered) {
      const hPx = Math.max(1, Math.round(seg.h))
      cursor -= hPx
      laid.push({ ...seg, h: hPx, y: Math.round(cursor) })
    }
  } else {
    let cursor = midY
    for (const seg of ordered) {
      const yPx = Math.round(cursor)
      const hPx = Math.max(1, Math.round(seg.h))
      laid.push({ ...seg, h: hPx, y: yPx })
      cursor += hPx
    }
  }
  return laid
}

export const distanceFromMid = (y: number, h: number, midY: number, side: 'bid' | 'ask'): number =>
  side === 'bid' ? midY - y : y + h - midY

export const stackIsContiguous = (laid: readonly LaidTimelineStackSegment[], midY: number, side: 'bid' | 'ask'): boolean => {
  if (laid.length === 0) return true
  if (side === 'bid') {
    if (Math.round(laid[0]!.y + laid[0]!.h) !== Math.round(midY)) return false
    for (let i = 0; i < laid.length - 1; i++) {
      if (Math.round(laid[i]!.y) !== Math.round(laid[i + 1]!.y + laid[i + 1]!.h)) return false
    }
    return true
  }
  if (Math.round(laid[0]!.y) !== Math.round(midY)) return false
  for (let i = 0; i < laid.length - 1; i++) {
    if (Math.round(laid[i]!.y + laid[i]!.h) !== Math.round(laid[i + 1]!.y)) return false
  }
  return true
}