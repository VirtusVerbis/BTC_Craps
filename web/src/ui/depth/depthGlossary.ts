export type DepthGlossaryKey =
  | 'basis'
  | 'openInterest'
  | 'longShortRatio'
  | 'liquidationsBar'
  | 'takerFlow15m'
  | 'wallRadar'
  | 'wallPulled'
  | 'wallAtTouch'
  | 'wallConsumed'
  | 'wallFlipped'
  | 'feedStatus'
  | 'timelineHeatmap'
  | 'hyperliquidOi'
  | 'fundingRate'
  | 'venueBinancePerp'
  | 'venueBinanceSpot'
  | 'venueCoinbase'
  | 'venueHyperliquid'
  | 'mergedTimeline'
  | 'timelineLayerMode'
  | 'timelineWindow'
  | 'wallLiveSection'
  | 'wallTapeSection'
  | 'venueStrip'
  | 'wallDepthChart'
  | 'wallChartMode'
  | 'wallChartXScale'

export interface GlossaryEntry {
  title: string
  body: string
}

export const depthGlossary: Record<DepthGlossaryKey, GlossaryEntry> = {
  basis: {
    title: 'Basis (Binance − Coinbase)',
    body: 'Difference between Binance BTC mid and Coinbase BTC mid in US dollars. Shows which venue’s last traded or quoted price is leading. Not proof of manipulation.',
  },
  openInterest: {
    title: 'Open interest',
    body: 'Total open BTC perpetual contracts (Coinalyze aggregate). Rising OI means new positions are opening; falling OI often means positions are closing or being liquidated.',
  },
  longShortRatio: {
    title: 'Long / short %',
    body: 'Share of accounts leaning long vs short on aggregated BTC perps (Coinalyze). Pass maps to long %, Don’t Pass to short % on the main table.',
  },
  liquidationsBar: {
    title: 'Liquidations',
    body: 'Forced closes on the last closed 5-minute bar from Coinalyze. Long liq is longs wiped; short liq is shorts wiped.',
  },
  takerFlow15m: {
    title: 'Taker flow (15m)',
    body: 'Net aggressive buy vs sell volume over the last 15 minutes on this venue’s tape. Taker buys lift offers; taker sells hit bids.',
  },
  wallRadar: {
    title: 'Wall radar',
    body: 'Large resting limit size near the current price on this order book. Walls can be real liquidity or quotes that disappear before they trade.',
  },
  wallPulled: {
    title: 'Pulled',
    body: 'Size fell before price reached the level—quote was removed, not filled.',
  },
  wallAtTouch: {
    title: 'At touch',
    body: 'Wall shrank while price was very close. Could be a fill or a cancellation; the feed cannot always tell.',
  },
  wallConsumed: {
    title: 'Consumed',
    body: 'Liquidity at this level was traded through.',
  },
  wallFlipped: {
    title: 'Flipped',
    body: 'After a bid (or ask) vanished, a large opposite-side quote appeared at the same price.',
  },
  feedStatus: {
    title: 'Feed status',
    body: 'Whether live data from this venue is connected. Disconnected rows may be stale or empty.',
  },
  timelineHeatmap: {
    title: 'Depth timeline',
    body: 'Bid vs ask notional near price over the last hour (5-second samples). Bright bands show where size piled up.',
  },
  mergedTimeline: {
    title: 'Merged depth timeline',
    body: 'All venues on one clock: bids above the midline, asks below. A bright line marks the bid/ask split at mid. Columns are fixed wall-clock slices (merged 5s samples). Older slices keep the same height until that interval’s sample changes; Y scale only ratchets up during the session so new spikes do not shrink history.',
  },
  timelineLayerMode: {
    title: 'Overlap vs stack',
    body: 'Overlap draws each venue’s bar in the same column (larger size on top; bid/ask use the same alpha as stack). Stack builds one column from the midline with segments that add up.',
  },
  timelineWindow: {
    title: 'Timeline window',
    body: 'Shows the last 15, 30, or 60 minutes of 5-second depth samples retained in memory.',
  },
  wallDepthChart: {
    title: 'Cumulative book depth',
    body: 'Resting size from the L2 book near mid, refreshed about every 5 seconds (same as depth sampling). Under the hood, quotes can change faster on the wire; this view is smoothed for readability. X is bps from mid; Y is cumulative BTC.',
  },
  wallChartMode: {
    title: 'Stack vs overlap (book)',
    body: 'Stack shows one cumulative chart per venue. Overlap draws all venues in one panel with venue colors. In Fixed bps mode, overlap shares one ruler; in Stretch, each venue still fills its own horizontal span (positions are not comparable across colors).',
  },
  wallChartXScale: {
    title: 'Fixed bps vs stretch',
    body: 'Fixed bps uses the same ±120 bps ruler (comparable across venues). Stretch maps each venue’s bid side to the left edge and ask side to the right using that venue’s actual book span (up to 500 bps in the sampled book).',
  },
  wallLiveSection: {
    title: 'Live walls',
    body: 'Large resting size still in the book near each venue’s price, sorted by notional (largest first). Updates as quotes change.',
  },
  wallTapeSection: {
    title: 'Wall tape',
    body: 'Recent wall events across venues, newest first: pulled, at touch, consumed, or flipped.',
  },
  venueStrip: {
    title: 'Venue strip',
    body: 'Compact feed status, mid price, and 15m taker net per venue. Hyperliquid includes OI and funding.',
  },
  hyperliquidOi: {
    title: 'Hyperliquid OI',
    body: 'BTC-denominated open interest on Hyperliquid perps (both sides halved for comparability). Δ is change since the last sample.',
  },
  fundingRate: {
    title: 'Funding',
    body: 'Perpetual funding rate on Hyperliquid BTC. Positive means longs pay shorts.',
  },
  venueBinancePerp: {
    title: 'Binance USDⓈ-M perp',
    body: 'BTCUSDT perpetual order book and aggressive trades on Binance futures.',
  },
  venueBinanceSpot: {
    title: 'Binance spot',
    body: 'BTCUSDT spot order book depth. Spot flow can move index inputs used by perps.',
  },
  venueCoinbase: {
    title: 'Coinbase spot',
    body: 'BTC-USD order book from Coinbase Exchange level-2 feed.',
  },
  venueHyperliquid: {
    title: 'Hyperliquid',
    body: 'BTC perpetual on Hyperliquid: open interest, funding, and L2 book snapshots.',
  },
}