export type DepthGlossaryKey =
  | 'basis'
  | 'openInterest'
  | 'longShortRatio'
  | 'liquidationsBar'
  | 'takerFlow15m'
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
  | 'depthSessionHeatmap'
  | 'wallDepthChart'
  | 'wallChartMode'
  | 'wallChartXScale'

export interface GlossaryItem {
  label: string
  detail: string
}

export interface GlossaryEntry {
  title: string
  body: string
  items?: readonly GlossaryItem[]
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
    title: 'Live feeds',
    body: 'Wifi icon on each venue: green live, amber reconnecting, gray disconnected (same as the main overlay). Mids update with depth sampling; stale feeds may show Mid — or zero taker flow.',
  },
  timelineHeatmap: {
    title: 'Depth timeline',
    body: 'Bid vs ask notional near price over the last hour (~2.5s samples). Bright bands show where size piled up.',
  },
  mergedTimeline: {
    title: 'Merged depth timeline',
    body: 'All venues on one clock: bids above the midline, asks below. Each column is a time slice; bar height is USD notional resting within 50 bps of that venue’s mid (sum of price × size on that side). The left axis shows the session scale max—a full band height in overlap. In stack, venue bands add so a column can exceed one band height. Y only ratchets up during the session so history does not shrink when a new spike appears.',
  },
  timelineLayerMode: {
    title: 'Overlap vs stack',
    body: 'Overlap draws each venue’s bar in the same column (larger size on top; bid/ask use the same alpha as stack). Stack builds one column from the midline with segments that add up.',
  },
  timelineWindow: {
    title: 'Timeline window',
    body: 'Shows the last 15, 30, or 60 minutes of depth samples retained in memory (~2.5s grid).',
  },
  wallDepthChart: {
    title: 'Live book depth',
    body: 'Cumulative resting liquidity near mid from Binance perp/spot, Coinbase, and Hyperliquid. Refreshes about every 2.5 seconds with depth sampling.',
    items: [
      {
        label: 'Curves',
        detail: 'Bid (left) and ask (right) from mid; height is cumulative BTC; colors match the venue legend.',
      },
      {
        label: 'Wall dashes',
        detail:
          'Largest bid (green) and ask (red) within ~50 bps per venue—same as Live walls (no $500k tape minimum).',
      },
      {
        label: 'Dash position',
        detail:
          'Across: bps where that level sits. Up: that venue’s full cumulative depth on that side (top of the colored curve), for visibility.',
      },
      {
        label: 'Labels',
        detail: 'BN-P B / HL A etc. in venue legend colors.',
      },
      {
        label: 'Layout',
        detail: 'Stack, overlap, fixed bps, and stretch are explained by the other i buttons on this chart.',
      },
    ],
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
    body:
      'Largest resting bid and ask within ~50 bps of each venue’s mid—no $500k minimum. Same levels as Live book depth markers; updates every book refresh.',
  },
  depthSessionHeatmap: {
    title: 'Depth heatmap (price × time)',
    body:
      'Session-only Coinglass-style view: time across the bottom, BTC USD price on the side ($25 ticks by default). Resting liquidity within ~180 bps of each venue mid is binned at absolute prices and merged across venues; Binance BTCUSDT 1m candles are drawn on top. Top/bottom chips and edge tint mark the nearest merged pool ≥ $1M outside the visible Y (latest book, distance in bps from Binance perp mid). The profile rail shows session-max resting USD at each price. Brighter color = more resting USD; faint dashed line = Binance perp mid. Color scale max ratchets up during the session.',
  },
  wallTapeSection: {
    title: 'Wall tape',
    body: 'Tape shows finished walls (largest peak size first, BID and ASK columns).',
    items: [
      { label: 'Pulled', detail: 'Quote removed before price hit.' },
      {
        label: 'At touch',
        detail: 'Size collapsed while price was near the wall (fill vs cancel unknown on L2).',
      },
      { label: 'Consumed', detail: 'Liquidity traded or absorbed.' },
      {
        label: 'Flipped',
        detail: 'One side’s wall vanished and a large opposite-side quote appeared at the same price.',
      },
    ],
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