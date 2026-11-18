import type { VenueId } from '../../data/microstructure/types'

export const DEPTH_VENUE_ORDER: readonly VenueId[] = [
  'binancePerp',
  'binanceSpot',
  'coinbase',
  'hyperliquid',
]

export const depthVenueShort: Record<VenueId, string> = {
  binancePerp: 'BN-P',
  binanceSpot: 'BN-S',
  coinbase: 'CB',
  hyperliquid: 'HL',
}

/** Bid-side base hues; ask uses lighter variant in canvas. */
export const depthVenueColorBid: Record<VenueId, string> = {
  binancePerp: 'rgba(255, 183, 77, 0.72)',
  binanceSpot: 'rgba(255, 235, 59, 0.72)',
  coinbase: 'rgba(100, 181, 246, 0.72)',
  hyperliquid: 'rgba(186, 104, 200, 0.72)',
}

export const depthVenueColorAsk: Record<VenueId, string> = {
  binancePerp: 'rgba(255, 183, 77, 0.45)',
  binanceSpot: 'rgba(255, 235, 59, 0.45)',
  coinbase: 'rgba(100, 181, 246, 0.45)',
  hyperliquid: 'rgba(186, 104, 200, 0.45)',
}

export const depthVenueMissingColor: Record<VenueId, string> = {
  binancePerp: 'rgba(255, 183, 77, 0.35)',
  binanceSpot: 'rgba(255, 235, 59, 0.35)',
  coinbase: 'rgba(100, 181, 246, 0.35)',
  hyperliquid: 'rgba(186, 104, 200, 0.35)',
}

/** Opaque merged-timeline bars (stack/overlap); panel chrome stays translucent in CSS. */
export const depthVenueColorBidTimeline: Record<VenueId, string> = {
  binancePerp: 'rgb(255, 183, 77)',
  binanceSpot: 'rgb(255, 235, 59)',
  coinbase: 'rgb(100, 181, 246)',
  hyperliquid: 'rgb(186, 104, 200)',
}

/** Ask timeline hues lightened vs bid (replaces former lower-alpha ask). */
export const depthVenueColorAskTimeline: Record<VenueId, string> = {
  binancePerp: 'rgb(255, 212, 148)',
  binanceSpot: 'rgb(255, 246, 176)',
  coinbase: 'rgb(153, 206, 250)',
  hyperliquid: 'rgb(212, 153, 218)',
}

export const depthVenueMissingColorTimeline: Record<VenueId, string> = {
  binancePerp: 'rgb(140, 100, 42)',
  binanceSpot: 'rgb(140, 128, 32)',
  coinbase: 'rgb(55, 100, 136)',
  hyperliquid: 'rgb(102, 57, 110)',
}