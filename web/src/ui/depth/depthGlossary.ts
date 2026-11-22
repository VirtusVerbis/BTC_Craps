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
  | 'venueBybit'
  | 'venueOkx'
  | 'venueKraken'
  | 'mergedTimeline'
  | 'timelineLayerMode'
  | 'timelineWindow'
  | 'wallLiveSection'
  | 'wallTapeSection'
  | 'depthSessionHeatmap'
  | 'depthDailySma'
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
    title: 'Depth timeline (single venue)',
    body:
      'Bid vs ask notional near mid over recent samples (~2.5s). Bright bands show where size piled up.',
    items: [
      {
        label: 'Colors',
        detail: 'Green bids above center, red asks below; taller = more USD near mid at that moment.',
      },
      {
        label: 'Merged chart',
        detail: 'All venues together: main Depth timeline above the consolidated book.',
      },
    ],
  },
  mergedTimeline: {
    title: 'Merged depth timeline',
    body:
      'All venues on one clock: bids above the midline, asks below. Each column is a time slice; bar height is USD notional within 50 bps of that venue’s mid (price × size on that side). Samples on a ~2.5s grid.',
    items: [
      {
        label: 'Session scale (Y)',
        detail:
          'Left axis = session max. A full bar height in overlap matches that max. Y only ratchets up during the session so past spikes don’t shrink when a newer peak appears.',
      },
      {
        label: 'Stack vs overlap',
        detail:
          'In stack, venue bands add in a column, so total height can exceed one band height.',
      },
      {
        label: 'Overlap mode',
        detail:
          'Each venue’s bar from the midline in the same column (opaque colors). Largest painted first, smallest last, so thinner venues stay visible on top.',
      },
      {
        label: 'Stack mode',
        detail:
          'One column from the midline: opaque segments add up, sorted by size, largest farthest from mid (top bids, bottom asks). Slice heights scale to that column’s leader, then fit in the canvas half.',
      },
      {
        label: '15m / 30m / 60m',
        detail: 'Last 15, 30, or 60 minutes of depth samples retained in memory on that grid.',
      },
    ],
  },
  timelineLayerMode: {
    title: 'Overlap vs stack',
    body: 'See Depth timeline — Stack vs overlap, Overlap mode, and Stack mode.',
  },
  timelineWindow: {
    title: 'Timeline window',
    body: 'See Depth timeline — 15m / 30m / 60m.',
  },
  wallDepthChart: {
    title: 'Live book depth',
    body: 'Cumulative resting liquidity near mid from Binance perp/spot, Coinbase, Hyperliquid, Bybit, OKX, and Kraken spot. Refreshes about every 2.5 seconds with depth sampling.',
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
        detail:
          'Wall dashes: resting level ($k / $m / $b compact) in venue legend colors; green/red dash = bid/ask.',
      },
      {
        label: 'Mid prices',
        detail:
          'Each venue’s book mid ($, whole dollars) on the center line in legend color. Overlap: stacked at the top, highest mid on top. Stack: one price per row.',
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
      'BTC resting liquidity over the last 15m, 30m, or 60m: time left to right, USD price on the right. Color is merged resting size near each venue’s mid (~±180 bps), scaled $0 to session max on the toolbar ramp. Binance spot candles on top; yellow line = BN-S close; dashed white = Binance perp live mid.',
    items: [
      {
        label: 'Heatmap color',
        detail: 'Brighter = more resting USD at that price and time (venues merged).',
      },
      {
        label: 'Profile rail',
        detail: 'Right strip: session maximum resting USD at each price in view.',
      },
      {
        label: 'Venue mids',
        detail: 'Colored lines = each exchange mid through the window; price-rail tags show latest closes.',
      },
      {
        label: 'BN-S typical',
        detail: 'Animated ~$ on the latest spot bar = (high + low + close) / 3.',
      },
      {
        label: '50D / 200D SMA',
        detail:
          'Binance spot daily simple moving averages (50 and 200 closes). Dashed orange and pink on-chart when inside the price band; left rail labels with bps when off-screen.',
      },
      {
        label: 'Golden / death cross',
        detail: '50D crosses above or below 200D on daily closes; badge at top when that UTC day is in the time window.',
      },
      {
        label: 'Off-chart walls',
        detail: 'Top-right / bottom-right chips: nearest merged pool ≥ $1M outside the Y band (bps from perp mid).',
      },
      {
        label: 'Price scale (Y)',
        detail: 'Fits in-window spot and depth; open bars don’t jitter the scale; brief widen on real spikes.',
      },
      {
        label: 'TA',
        detail: 'Optional pattern overlay on candles; pause freezes the time cursor.',
      },
    ],
  },
  depthDailySma: {
    title: 'Daily 50 / 200 SMA',
    body: 'See Depth heatmap — 50D / 200D SMA and Golden / death cross.',
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
  venueBybit: {
    title: 'Bybit linear perp',
    body: 'BTCUSDT linear perpetual order book and public trades on Bybit v5.',
  },
  venueOkx: {
    title: 'OKX swap',
    body: 'BTC-USDT-SWAP order book and trades on OKX v5 public WebSocket.',
  },
  venueKraken: {
    title: 'Kraken spot',
    body: 'BTC/USD spot level-2 book and trades from Kraken v2 WebSocket.',
  },
}