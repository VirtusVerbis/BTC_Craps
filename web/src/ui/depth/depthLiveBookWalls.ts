import { WALL_BAND_BPS } from '../../data/microstructure/wallTracker'
import type { BookLevel, MicrostructureState, VenueId, WallRecord } from '../../data/microstructure/types'
import { DEPTH_VENUE_ORDER } from './depthVenueTheme'

const bpsAbsFromMid = (mid: number, price: number): number => {
  if (!(mid > 0)) return Infinity
  return (Math.abs(price - mid) / mid) * 10_000
}

/** Largest notional level within `WALL_BAND_BPS` of mid (no minimum USD). */
export const bestLevelInBand = (mid: number, levels: readonly BookLevel[]): BookLevel | null => {
  let best: BookLevel | null = null
  let bestUsd = 0
  let bestBps = Infinity
  for (const level of levels) {
    if (!(level.price > 0) || !(level.size > 0)) continue
    const bps = bpsAbsFromMid(mid, level.price)
    if (bps > WALL_BAND_BPS) continue
    const usd = level.price * level.size
    if (usd > bestUsd || (usd === bestUsd && bps < bestBps)) {
      best = level
      bestUsd = usd
      bestBps = bps
    }
  }
  return best
}

const displayWallRecord = (
  venue: VenueId,
  side: 'bid' | 'ask',
  level: BookLevel,
  at: number,
): WallRecord => ({
  venue,
  side,
  price: level.price,
  peakBtc: level.size,
  peakUsd: level.price * level.size,
  startedAt: at,
  updatedAt: at,
  reason: 'active',
})

/** Top bid + top ask per venue from current L2 (in band), for Live book depth and Live walls. */
export const buildDisplayWallsFromMicro = (
  micro: MicrostructureState,
): { chartWalls: WallRecord[]; liveBids: WallRecord[]; liveAsks: WallRecord[] } => {
  const liveBids: WallRecord[] = []
  const liveAsks: WallRecord[] = []
  const at = micro.sampledAt
  for (const venue of DEPTH_VENUE_ORDER) {
    const snap = micro.venues[venue]
    const mid = snap.mid
    if (!(mid > 0)) continue
    const bid = bestLevelInBand(mid, snap.bookBids)
    const ask = bestLevelInBand(mid, snap.bookAsks)
    if (bid) liveBids.push(displayWallRecord(venue, 'bid', bid, at))
    if (ask) liveAsks.push(displayWallRecord(venue, 'ask', ask, at))
  }
  return { chartWalls: [...liveBids, ...liveAsks], liveBids, liveAsks }
}