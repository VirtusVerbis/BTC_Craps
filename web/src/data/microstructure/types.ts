export type VenueId = 'binancePerp' | 'binanceSpot' | 'coinbase' | 'hyperliquid'

export type WallEndReason = 'active' | 'pulled' | 'atTouch' | 'consumed' | 'flipped'

export interface BookLevel {
  price: number
  size: number
}

export interface WallRecord {
  venue: VenueId
  side: 'bid' | 'ask'
  price: number
  peakBtc: number
  peakUsd: number
  startedAt: number
  updatedAt: number
  reason: WallEndReason
}

export interface WallEvent {
  venue: VenueId
  side: 'bid' | 'ask'
  price: number
  peakUsd: number
  reason: WallEndReason
  at: number
}

export interface DepthSample {
  at: number
  mid: number
  bidNotionalNear: number
  askNotionalNear: number
}

export interface TakerRollup {
  buyBtc: number
  sellBtc: number
}

export type FeedStatus = 'connecting' | 'connected' | 'disconnected'

export interface VenueSnapshot {
  venue: VenueId
  status: FeedStatus
  mid: number
  activeWalls: WallRecord[]
  recentEvents: WallEvent[]
  taker15m: TakerRollup
  /** Hyperliquid-only context. */
  openInterestBtc?: number | null
  openInterestDeltaBtc?: number | null
  markPx?: number | null
  fundingRate?: number | null
  depthSamples: DepthSample[]
  bookBids: BookLevel[]
  bookAsks: BookLevel[]
}

export interface MicrostructureState {
  sampledAt: number
  basisUsd: number | null
  venues: Record<VenueId, VenueSnapshot>
}