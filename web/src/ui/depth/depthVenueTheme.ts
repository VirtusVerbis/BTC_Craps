import type { VenueId } from '../../data/microstructure/types'
import { DEPTH_VENUE_ORDER as DEPTH_VENUE_ORDER_BASE } from '../../data/microstructure/venueOrder'

export const DEPTH_VENUE_ORDER = DEPTH_VENUE_ORDER_BASE

export const depthVenueShort: Record<VenueId, string> = {
  binancePerp: 'BN-P',
  binanceSpot: 'BN-S',
  coinbase: 'CB',
  hyperliquid: 'HL',
  bybitPerp: 'BY',
  okxPerp: 'OK',
  krakenSpot: 'KR',
}

/** Bid-side base hues; ask uses lighter variant in canvas. */
export const depthVenueColorBid: Record<VenueId, string> = {
  binancePerp: 'rgba(255, 183, 77, 0.72)',
  binanceSpot: 'rgba(255, 235, 59, 0.72)',
  coinbase: 'rgba(100, 181, 246, 0.72)',
  hyperliquid: 'rgba(186, 104, 200, 0.72)',
  bybitPerp: 'rgba(77, 208, 193, 0.72)',
  okxPerp: 'rgba(255, 138, 101, 0.72)',
  krakenSpot: 'rgba(129, 199, 132, 0.72)',
}

export const depthVenueColorAsk: Record<VenueId, string> = {
  binancePerp: 'rgba(255, 183, 77, 0.45)',
  binanceSpot: 'rgba(255, 235, 59, 0.45)',
  coinbase: 'rgba(100, 181, 246, 0.45)',
  hyperliquid: 'rgba(186, 104, 200, 0.45)',
  bybitPerp: 'rgba(77, 208, 193, 0.45)',
  okxPerp: 'rgba(255, 138, 101, 0.45)',
  krakenSpot: 'rgba(129, 199, 132, 0.45)',
}

export const depthVenueMissingColor: Record<VenueId, string> = {
  binancePerp: 'rgba(255, 183, 77, 0.35)',
  binanceSpot: 'rgba(255, 235, 59, 0.35)',
  coinbase: 'rgba(100, 181, 246, 0.35)',
  hyperliquid: 'rgba(186, 104, 200, 0.35)',
  bybitPerp: 'rgba(77, 208, 193, 0.35)',
  okxPerp: 'rgba(255, 138, 101, 0.35)',
  krakenSpot: 'rgba(129, 199, 132, 0.35)',
}

/** Opaque merged-timeline bars (stack/overlap); panel chrome stays translucent in CSS. */
export const depthVenueColorBidTimeline: Record<VenueId, string> = {
  binancePerp: 'rgb(255, 183, 77)',
  binanceSpot: 'rgb(255, 235, 59)',
  coinbase: 'rgb(100, 181, 246)',
  hyperliquid: 'rgb(186, 104, 200)',
  bybitPerp: 'rgb(77, 208, 193)',
  okxPerp: 'rgb(255, 138, 101)',
  krakenSpot: 'rgb(129, 199, 132)',
}

/** Ask timeline hues lightened vs bid (replaces former lower-alpha ask). */
export const depthVenueColorAskTimeline: Record<VenueId, string> = {
  binancePerp: 'rgb(255, 212, 148)',
  binanceSpot: 'rgb(255, 246, 176)',
  coinbase: 'rgb(153, 206, 250)',
  hyperliquid: 'rgb(212, 153, 218)',
  bybitPerp: 'rgb(153, 232, 221)',
  okxPerp: 'rgb(255, 183, 157)',
  krakenSpot: 'rgb(174, 221, 176)',
}

export const depthVenueMissingColorTimeline: Record<VenueId, string> = {
  binancePerp: 'rgb(140, 100, 42)',
  binanceSpot: 'rgb(140, 128, 32)',
  coinbase: 'rgb(55, 100, 136)',
  hyperliquid: 'rgb(102, 57, 110)',
  bybitPerp: 'rgb(42, 112, 105)',
  okxPerp: 'rgb(140, 76, 56)',
  krakenSpot: 'rgb(70, 108, 72)',
}

/** UI text/hues aligned with depth legend chips and live book (bid vs ask). */
export const depthVenueUiColor = (venue: VenueId, side: 'bid' | 'ask'): string =>
  side === 'bid' ? depthVenueColorBidTimeline[venue] : depthVenueColorAskTimeline[venue]