import type { BookLevel, VenueId, WallEndReason, WallEvent, WallRecord } from './types'

export const WALL_MIN_USD = 500_000
/** Fraction of mid for near-touch band (0.5%). */
export const WALL_BAND_BPS = 50
/** Size drop below this fraction of peak ends the wall. */
export const WALL_END_FRACTION = 0.5
/** More than this many bps from best, a shrink counts as pulled. */
export const WALL_PULL_BPS = 5

const bpsDistance = (mid: number, price: number): number => {
  if (!(mid > 0)) return Infinity
  return (Math.abs(price - mid) / mid) * 10_000
}

const notional = (price: number, size: number): number => price * size

export interface WallTrackerOptions {
  minUsd?: number
  bandBps?: number
}

type ActiveWall = {
  side: 'bid' | 'ask'
  price: number
  peakBtc: number
  peakUsd: number
  startedAt: number
  bestBps: number
}

/**
 * Tracks large resting levels near mid; emits lifecycle events when size collapses.
 */
export class WallTracker {
  private readonly active = new Map<string, ActiveWall>()
  private readonly events: WallEvent[] = []
  private readonly maxEvents: number

  constructor(
    private readonly venue: VenueId,
    options: WallTrackerOptions = {},
    maxEvents = 40,
  ) {
    this.minUsd = options.minUsd ?? WALL_MIN_USD
    this.bandBps = options.bandBps ?? WALL_BAND_BPS
    this.maxEvents = maxEvents
  }

  private readonly minUsd: number
  private readonly bandBps: number

  ingest(mid: number, bids: readonly BookLevel[], asks: readonly BookLevel[], now = Date.now()): void {
    if (!(mid > 0)) return
    const seen = new Set<string>()
    const consider = (side: 'bid' | 'ask', levels: readonly BookLevel[]) => {
      for (const level of levels) {
        if (!(level.price > 0) || !(level.size > 0)) continue
        const bps = bpsDistance(mid, level.price)
        if (bps > this.bandBps) continue
        const usd = notional(level.price, level.size)
        if (usd < this.minUsd) continue
        const key = `${side}:${level.price}`
        seen.add(key)
        const existing = this.active.get(key)
        if (!existing) {
          this.active.set(key, {
            side,
            price: level.price,
            peakBtc: level.size,
            peakUsd: usd,
            startedAt: now,
            bestBps: bps,
          })
        } else {
          existing.peakBtc = Math.max(existing.peakBtc, level.size)
          existing.peakUsd = Math.max(existing.peakUsd, usd)
          existing.bestBps = Math.min(existing.bestBps, bps)
        }
      }
    }
    consider('bid', bids)
    consider('ask', asks)

    for (const [key, wall] of [...this.active.entries()]) {
      if (seen.has(key)) continue
      const level = this.findLevel(wall.side, wall.price, bids, asks)
      const usd = level ? notional(level.price, level.size) : 0
      const reason = this.endReason(wall, usd, mid, bids, asks)
      this.finishWall(key, wall, reason, now)
    }

    for (const [key, wall] of [...this.active.entries()]) {
      const level = this.findLevel(wall.side, wall.price, bids, asks)
      if (!level) continue
      const usd = notional(level.price, level.size)
      if (usd < wall.peakUsd * WALL_END_FRACTION) {
        const reason = this.endReason(wall, usd, mid, bids, asks)
        this.finishWall(key, wall, reason, now)
      }
    }
  }

  private findLevel(
    side: 'bid' | 'ask',
    price: number,
    bids: readonly BookLevel[],
    asks: readonly BookLevel[],
  ): BookLevel | undefined {
    const book = side === 'bid' ? bids : asks
    return book.find((l) => Math.abs(l.price - price) < 1e-8)
  }

  private bestPrice(side: 'bid' | 'ask', bids: readonly BookLevel[], asks: readonly BookLevel[]): number {
    if (side === 'bid') {
      return bids.reduce((best, l) => (l.price > best ? l.price : best), 0)
    }
    const ask = asks.filter((l) => l.price > 0)
    if (ask.length === 0) return 0
    return ask.reduce((best, l) => (best === 0 || l.price < best ? l.price : best), Infinity)
  }

  private endReason(
    wall: ActiveWall,
    remainingUsd: number,
    mid: number,
    bids: readonly BookLevel[],
    asks: readonly BookLevel[],
  ): WallEndReason {
    if (remainingUsd < wall.peakUsd * WALL_END_FRACTION) {
      const best = this.bestPrice(wall.side, bids, asks)
      const distBps = best > 0 ? bpsDistance(mid, wall.price) : WALL_PULL_BPS + 1
      const opposite = wall.side === 'bid' ? 'ask' : 'bid'
      const oppAtPrice = this.findLevel(opposite, wall.price, bids, asks)
      if (oppAtPrice && notional(oppAtPrice.price, oppAtPrice.size) >= this.minUsd * 0.5) {
        return 'flipped'
      }
      if (distBps > WALL_PULL_BPS) return 'pulled'
      if (distBps <= WALL_PULL_BPS) return 'atTouch'
      return 'consumed'
    }
    return 'active'
  }

  private finishWall(key: string, wall: ActiveWall, reason: WallEndReason, at: number): void {
    if (reason === 'active') return
    this.active.delete(key)
    const event: WallEvent = {
      venue: this.venue,
      side: wall.side,
      price: wall.price,
      peakBtc: wall.peakBtc,
      peakUsd: wall.peakUsd,
      reason,
      at,
    }
    this.events.unshift(event)
    if (this.events.length > this.maxEvents) this.events.pop()
  }

  getActive(): WallRecord[] {
    const now = Date.now()
    return [...this.active.values()].map((w) => ({
      venue: this.venue,
      side: w.side,
      price: w.price,
      peakBtc: w.peakBtc,
      peakUsd: w.peakUsd,
      startedAt: w.startedAt,
      updatedAt: now,
      reason: 'active' as const,
    }))
  }

  getEvents(): readonly WallEvent[] {
    return this.events
  }
}

/** Sum notional within band of mid on each side. */
export const bandNotional = (
  mid: number,
  levels: readonly BookLevel[],
  bandBps: number,
): number => {
  if (!(mid > 0)) return 0
  let sum = 0
  for (const l of levels) {
    if (bpsDistance(mid, l.price) <= bandBps) sum += l.price * l.size
  }
  return sum
}