import type { MicrostructureState, VenueId, VenueSnapshot } from './types'

const emptyVenue = (venue: VenueId): VenueSnapshot => ({
  venue,
  status: 'disconnected',
  mid: 0,
  activeWalls: [],
  recentEvents: [],
  taker15m: { buyBtc: 0, sellBtc: 0 },
  depthSamples: [],
  bookBids: [],
  bookAsks: [],
})

export const emptyMicrostructureState = (): MicrostructureState => ({
  sampledAt: 0,
  basisUsd: null,
  venues: {
    binancePerp: emptyVenue('binancePerp'),
    binanceSpot: emptyVenue('binanceSpot'),
    coinbase: emptyVenue('coinbase'),
    hyperliquid: emptyVenue('hyperliquid'),
  },
})