const BINANCE_STREAMS_PATH = 'stream?streams=btcusdt@trade/btcusdt@ticker/btcusdt@bookTicker'
const BINANCE_SPOT_DEPTH_STREAMS = 'stream?streams=btcusdt@depth@100ms'
const BINANCE_FSTREAM_PATH =
  'stream?streams=btcusdt@depth@100ms/btcusdt@aggTrade'

const resolveBinanceWsUrl = (): string => {
  const override = import.meta.env.VITE_BINANCE_WS_URL as string | undefined
  if (override) return override
  /** Same combined stream as Android `BinanceWebSocketService` (direct WSS, no proxy). */
  return `wss://stream.binance.com:9443/${BINANCE_STREAMS_PATH}`
}

const resolveCoinbaseWsUrl = (): string => {
  const override = import.meta.env.VITE_COINBASE_WS_URL as string | undefined
  if (override) return override
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${wsProto}//${window.location.host}/ws-coinbase`
  }
  return 'wss://ws-feed.exchange.coinbase.com'
}

export const env = {
  get binanceWsUrl() {
    return resolveBinanceWsUrl()
  },
  get coinbaseWsUrl() {
    return resolveCoinbaseWsUrl()
  },
  coinbaseProductId: import.meta.env.VITE_COINBASE_PRODUCT_ID ?? 'BTC-USD',
  mempoolTipUrl:
    import.meta.env.VITE_MEMPOOL_TIP_URL ??
    'https://mempool.space/api/blocks/tip/height',
  /**
   * Binance REST origin for klines (Android `WebSocketRepository` / `CryptoApiService` use production API).
   * Dev: prefer Vite proxy `/binance-api`. Prod: may require same-origin proxy if CORS blocks the browser.
   */
  binanceApiOrigin:
    (import.meta.env.VITE_BINANCE_API_ORIGIN as string | undefined) ?? 'https://api.binance.com',
  get binanceFstreamWsUrl() {
    const override = import.meta.env.VITE_BINANCE_FSTREAM_WS_URL as string | undefined
    if (override) return override
    return `wss://fstream.binance.com/${BINANCE_FSTREAM_PATH}`
  },
  get binanceSpotDepthWsUrl() {
    const override = import.meta.env.VITE_BINANCE_SPOT_DEPTH_WS_URL as string | undefined
    if (override) return override
    return `wss://stream.binance.com:9443/${BINANCE_SPOT_DEPTH_STREAMS}`
  },
  hyperliquidInfoUrl:
    (import.meta.env.VITE_HL_INFO_URL as string | undefined) ??
    'https://api.hyperliquid.xyz/info',
  hyperliquidWsUrl:
    (import.meta.env.VITE_HL_WS_URL as string | undefined) ?? 'wss://api.hyperliquid.xyz/ws',
  binanceFapiOrigin:
    (import.meta.env.VITE_BINANCE_FAPI_ORIGIN as string | undefined) ??
    'https://fapi.binance.com',
  get bybitLinearWsUrl() {
    return (
      (import.meta.env.VITE_BYBIT_LINEAR_WS_URL as string | undefined) ??
      'wss://stream.bybit.com/v5/public/linear'
    )
  },
  get okxPublicWsUrl() {
    return (
      (import.meta.env.VITE_OKX_PUBLIC_WS_URL as string | undefined) ?? 'wss://ws.okx.com:443/ws/v5/public'
    )
  },
  get krakenWsUrl() {
    return (import.meta.env.VITE_KRAKEN_WS_URL as string | undefined) ?? 'wss://ws.kraken.com/v2'
  },
}
