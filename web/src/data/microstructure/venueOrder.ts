import type { VenueId } from './types'

/** Canonical depth-panel venue list (legends, feeds, sampling). */
export const DEPTH_VENUE_ORDER: readonly VenueId[] = [
  'binancePerp',
  'binanceSpot',
  'coinbase',
  'hyperliquid',
  'bybitPerp',
  'okxPerp',
  'krakenSpot',
]