import { env } from '../../config/env'
import { BINANCE_DEPTH_WS_MAX_PAYLOAD_BYTES } from '../exchangeConstants'
import type { MarketDataService } from '../marketData'
import { aggregateCoinbaseTradesVolumes, parseCoinbaseRestBook } from '../schemas'
import { SafeWebSocketClient } from '../websocketClient'
import { OrderBook } from './orderBook'
import { RingBuffer } from './ringBuffer'
import { TakerRollup15m } from './takerRollup'
import type { BookLevel, FeedStatus, MicrostructureState, VenueId, VenueSnapshot } from './types'
import { HL_TRADES_SUBSCRIBE, parseHyperliquidTradesMessage } from './hyperliquidTrades'
import {
  DEPTH_EMIT_MS,
  DEPTH_SAMPLE_CAP,
  DEPTH_SAMPLE_MS,
} from './depthDisplayConstants'
import { binBookToPriceBuckets, HEATMAP_PRICE_BAND_BPS_MAX } from './depthHeatmapPriceBins'
import { WALL_BAND_BPS, WallTracker, bandNotional } from './wallTracker'

const HL_TRADE_TID_CAP = 4_000

const HL_META_MS = 30_000
/** REST level-2 book when WS handshake fails or Strict Mode aborts the socket. */
const COINBASE_BOOK_REST_MS = 10_000

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

const parseBinanceDepth = (
  payload: unknown,
): { bids: { price: number; size: number }[]; asks: { price: number; size: number }[] } | null => {
  const root = payload as Record<string, unknown>
  const inner = (root?.data && typeof root.data === 'object' ? root.data : root) as Record<string, unknown>
  const b = inner.b ?? inner.bids
  const a = inner.a ?? inner.asks
  if (!Array.isArray(b) || !Array.isArray(a)) return null
  const rows = (rows: unknown[]) =>
    rows
      .map((row) => {
        if (!Array.isArray(row) || row.length < 2) return null
        const price = Number(row[0])
        const size = Number(row[1])
        if (!Number.isFinite(price) || !Number.isFinite(size)) return null
        return { price, size }
      })
      .filter((x): x is { price: number; size: number } => x != null)
  return { bids: rows(b), asks: rows(a) }
}

export class MicrostructureService {
  private readonly perpBook = new OrderBook()
  private readonly spotBook = new OrderBook()
  private readonly coinbaseBook = new OrderBook()
  private readonly hlBook = new OrderBook()

  private readonly trackers: Record<VenueId, WallTracker> = {
    binancePerp: new WallTracker('binancePerp'),
    binanceSpot: new WallTracker('binanceSpot'),
    coinbase: new WallTracker('coinbase'),
    hyperliquid: new WallTracker('hyperliquid'),
  }

  private readonly depthSamples: Record<
    VenueId,
    RingBuffer<{
      at: number
      mid: number
      bid: number
      ask: number
      priceBuckets: { p: number; usd: number }[]
    }>
  > = {
    binancePerp: new RingBuffer(DEPTH_SAMPLE_CAP),
    binanceSpot: new RingBuffer(DEPTH_SAMPLE_CAP),
    coinbase: new RingBuffer(DEPTH_SAMPLE_CAP),
    hyperliquid: new RingBuffer(DEPTH_SAMPLE_CAP),
  }

  private readonly takers: Record<VenueId, TakerRollup15m> = {
    binancePerp: new TakerRollup15m(),
    binanceSpot: new TakerRollup15m(),
    coinbase: new TakerRollup15m(),
    hyperliquid: new TakerRollup15m(),
  }

  private status: Record<VenueId, FeedStatus> = {
    binancePerp: 'disconnected',
    binanceSpot: 'disconnected',
    coinbase: 'disconnected',
    hyperliquid: 'disconnected',
  }

  private hlOiBtc: number | null = null
  private hlPrevOiBtc: number | null = null
  private hlMark: number | null = null
  private hlFunding: number | null = null

  /** L2 still updates continuously; chart uses this snapshot to avoid 2.5s flicker. */
  private readonly chartBooks: Record<VenueId, { bids: BookLevel[]; asks: BookLevel[] }> = {
    binancePerp: { bids: [], asks: [] },
    binanceSpot: { bids: [], asks: [] },
    coinbase: { bids: [], asks: [] },
    hyperliquid: { bids: [], asks: [] },
  }

  private basisBinance = 0
  private basisCoinbase = 0

  private sampleTimer: number | null = null
  private emitTimer: number | null = null
  private hlTimer: number | null = null
  private coinbaseBookRestTimer: number | null = null
  private coinbaseWsBookAt = 0
  private readonly hlSeenTids = new Set<number>()
  private readonly hlSeenTidOrder: number[] = []
  private listeners = new Set<(state: MicrostructureState) => void>()
  private state: MicrostructureState = this.buildState()
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      this.perpClient.connect()
      this.spotDepthClient.connect()
      this.hlTradesClient.connect()
    }
  }

  private readonly perpClient = new SafeWebSocketClient({
    url: env.binanceFstreamWsUrl,
    maxPayloadBytes: BINANCE_DEPTH_WS_MAX_PAYLOAD_BYTES,
    onJsonMessage: (payload) => this.onPerpMessage(payload),
    onStatus: (s) => {
      this.status.binancePerp = s
      this.emit()
    },
  })

  private readonly spotDepthClient = new SafeWebSocketClient({
    url: env.binanceSpotDepthWsUrl,
    maxPayloadBytes: BINANCE_DEPTH_WS_MAX_PAYLOAD_BYTES,
    onJsonMessage: (payload) => this.onSpotDepthMessage(payload),
    onStatus: (s) => {
      this.status.binanceSpot = s
      this.emit()
    },
  })

  private readonly hlTradesClient = new SafeWebSocketClient({
    url: env.hyperliquidWsUrl,
    onJsonMessage: (payload) => this.onHyperliquidTradesMessage(payload),
    onOpen: (socket) => {
      socket.send(HL_TRADES_SUBSCRIBE)
    },
    onStatus: (s) => {
      if (s === 'connected') this.status.hyperliquid = 'connected'
      else if (s === 'disconnected' && this.hlBook.mid() <= 0) this.status.hyperliquid = 'disconnected'
      this.emit()
    },
  })

  constructor(private readonly marketData?: MarketDataService) {
    this.bindMarketDataHooks()
  }

  /** Fan-out Coinbase L2 / spot trades from `MarketDataService` (must run before WS `start`). */
  private bindMarketDataHooks(): void {
    this.marketData?.setMicrostructureHooks({
      onCoinbaseBookSnapshot: (bids, asks) => {
        this.coinbaseBook.applySnapshot(bids, asks)
        this.coinbaseWsBookAt = Date.now()
        this.status.coinbase = 'connected'
        this.sampleVenue('coinbase', this.coinbaseBook, Date.now())
        this.emit()
      },
      onCoinbaseL2Change: (side, price, size) => {
        const patch = { price, size }
        if (side === 'buy') this.coinbaseBook.applyDelta([patch], [])
        else this.coinbaseBook.applyDelta([], [patch])
        this.coinbaseWsBookAt = Date.now()
        this.status.coinbase = 'connected'
      },
      onBinanceSpotTrade: (isSell, qty) => {
        this.takers.binanceSpot.add(isSell, qty)
      },
      onCoinbaseTrade: (isSell, qty) => {
        this.takers.coinbase.add(isSell, qty)
      },
    })
  }

  subscribe(listener: (state: MicrostructureState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  getState(): MicrostructureState {
    return this.state
  }

  setBasisPrices(binance: number, coinbase: number): void {
    if (binance > 0) this.basisBinance = binance
    if (coinbase > 0) this.basisCoinbase = coinbase
    this.emit()
  }

  start(): void {
    this.bindMarketDataHooks()

    this.perpClient.connect()
    this.spotDepthClient.connect()
    this.hlTradesClient.connect()
    void this.pollHyperliquid()

    if (this.sampleTimer === null) {
      this.sampleTimer = window.setInterval(() => this.sampleVenues(), DEPTH_SAMPLE_MS)
    }
    if (this.emitTimer === null) {
      this.emitTimer = window.setInterval(() => this.emit(), DEPTH_EMIT_MS)
    }
    if (this.hlTimer === null) {
      this.hlTimer = window.setInterval(() => void this.pollHyperliquid(), HL_META_MS)
    }
    if (this.coinbaseBookRestTimer === null) {
      void this.pollCoinbaseBookRest()
      this.coinbaseBookRestTimer = window.setInterval(
        () => void this.pollCoinbaseBookRest(),
        COINBASE_BOOK_REST_MS,
      )
    }

    document.addEventListener('visibilitychange', this.onVisibility)
  }

  stop(): void {
    document.removeEventListener('visibilitychange', this.onVisibility)
    if (this.sampleTimer !== null) window.clearInterval(this.sampleTimer)
    if (this.emitTimer !== null) window.clearInterval(this.emitTimer)
    if (this.hlTimer !== null) window.clearInterval(this.hlTimer)
    if (this.coinbaseBookRestTimer !== null) window.clearInterval(this.coinbaseBookRestTimer)
    this.sampleTimer = null
    this.emitTimer = null
    this.hlTimer = null
    this.coinbaseBookRestTimer = null
    this.perpClient.disconnect()
    this.spotDepthClient.disconnect()
    this.hlTradesClient.disconnect()
  }

  private rememberHlTradeTid(tid: number): boolean {
    if (this.hlSeenTids.has(tid)) return false
    this.hlSeenTids.add(tid)
    this.hlSeenTidOrder.push(tid)
    if (this.hlSeenTidOrder.length > HL_TRADE_TID_CAP) {
      const drop = this.hlSeenTidOrder.shift()
      if (drop !== undefined) this.hlSeenTids.delete(drop)
    }
    return true
  }

  private onHyperliquidTradesMessage(payload: unknown): void {
    const ticks = parseHyperliquidTradesMessage(payload)
    if (ticks.length === 0) return
    let added = false
    for (const tick of ticks) {
      if (!this.rememberHlTradeTid(tick.tid)) continue
      this.takers.hyperliquid.add(tick.isSell, tick.qtyBtc, tick.at)
      added = true
    }
    if (added) this.emit()
  }

  private onPerpMessage(payload: unknown): void {
    const inner = ((payload as Record<string, unknown>).data ?? payload) as Record<string, unknown>
    const et = inner.e as string | undefined
    if (et === 'aggTrade') {
      const qty = Number(inner.q)
      const isSell = inner.m === true
      if (qty > 0) this.takers.binancePerp.add(isSell, qty)
      return
    }
    const depth = parseBinanceDepth(payload)
    if (!depth) return
    const bidLen = Array.isArray(inner.b) ? inner.b.length : 0
    if (bidLen > 20) this.perpBook.applySnapshot(depth.bids, depth.asks)
    else this.perpBook.applyDelta(depth.bids, depth.asks)
  }

  private onSpotDepthMessage(payload: unknown): void {
    const depth = parseBinanceDepth(payload)
    if (!depth) return
    const inner = ((payload as Record<string, unknown>).data ?? payload) as Record<string, unknown>
    const bidLen = Array.isArray(inner.b) ? inner.b.length : 0
    if (bidLen > 20) {
      this.spotBook.applySnapshot(depth.bids, depth.asks)
    } else {
      this.spotBook.applyDelta(depth.bids, depth.asks)
    }
  }

  private sampleVenues(): void {
    const now = Date.now()
    this.sampleVenue('binancePerp', this.perpBook, now)
    this.sampleVenue('binanceSpot', this.spotBook, now)
    this.sampleVenue('coinbase', this.coinbaseBook, now)
    if (this.hlBook.mid() > 0) this.sampleVenue('hyperliquid', this.hlBook, now)
    this.emit()
  }

  private sampleVenue(venue: VenueId, book: OrderBook, now: number): void {
    const { bids, asks } = book.toLevels()
    const mid = book.mid()
    if (mid <= 0) return
    this.chartBooks[venue] = { bids, asks }
    this.trackers[venue].ingest(mid, bids, asks, now)
    this.depthSamples[venue].push({
      at: now,
      mid,
      bid: bandNotional(mid, bids, WALL_BAND_BPS),
      ask: bandNotional(mid, asks, WALL_BAND_BPS),
      priceBuckets: binBookToPriceBuckets(mid, bids, asks, undefined, HEATMAP_PRICE_BAND_BPS_MAX),
    })
  }

  private coinbaseRestBase(): string {
    return import.meta.env.DEV ? '/coinbase-api' : 'https://api.exchange.coinbase.com'
  }

  private async pollCoinbaseBookRest(): Promise<void> {
    const staleWs = Date.now() - this.coinbaseWsBookAt > COINBASE_BOOK_REST_MS * 1.5
    if (this.coinbaseWsBookAt > 0 && !staleWs) return

    try {
      const base = this.coinbaseRestBase()
      const product = encodeURIComponent(env.coinbaseProductId)
      const [bookRes, tradesRes] = await Promise.all([
        fetch(`${base}/products/${product}/book?level=2`),
        fetch(`${base}/products/${product}/trades?limit=80`),
      ])
      if (bookRes.ok) {
        const parsed = parseCoinbaseRestBook(await bookRes.json())
        if (parsed.success) {
          const toLevels = (rows: [string, string][]) =>
            rows.map(([p, s]) => ({ price: Number(p), size: Number(s) })).filter((l) => l.price > 0 && l.size >= 0)
          this.coinbaseBook.applySnapshot(toLevels(parsed.data.bids), toLevels(parsed.data.asks))
          this.status.coinbase = 'connected'
          this.sampleVenue('coinbase', this.coinbaseBook, Date.now())
        }
      }
      if (tradesRes.ok && this.coinbaseWsBookAt === 0) {
        const tradesJson: unknown = await tradesRes.json()
        const { buyVolume, sellVolume } = aggregateCoinbaseTradesVolumes(tradesJson)
        if (buyVolume + sellVolume > 0) {
          this.takers.coinbase.setRecentTapeApproximation(buyVolume, sellVolume)
        }
      }
      this.emit()
    } catch {
      if (this.coinbaseWsBookAt === 0) this.status.coinbase = 'disconnected'
    }
  }

  private async pollHyperliquid(): Promise<void> {
    try {
      const [metaRes, bookRes] = await Promise.all([
        fetch(env.hyperliquidInfoUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
        }),
        fetch(env.hyperliquidInfoUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type: 'l2Book', coin: 'BTC' }),
        }),
      ])
      if (metaRes.ok) {
        const body = (await metaRes.json()) as [unknown, unknown[]]
        const meta = body[0] as { universe?: { name: string; isDelisted?: boolean }[] }
        const ctxs = body[1] ?? []
        const idx = meta.universe?.findIndex((u) => u.name === 'BTC' && !u.isDelisted) ?? -1
        if (idx >= 0 && ctxs[idx]) {
          const ctx = ctxs[idx] as { openInterest?: string; markPx?: string; funding?: string }
          const oi = Number(ctx.openInterest)
          const mark = Number(ctx.markPx)
          const funding = Number(ctx.funding)
          if (Number.isFinite(oi)) {
            this.hlPrevOiBtc = this.hlOiBtc
            this.hlOiBtc = oi / 2
          }
          if (Number.isFinite(mark)) this.hlMark = mark
          if (Number.isFinite(funding)) this.hlFunding = funding
        }
        this.status.hyperliquid = 'connected'
      }
      if (bookRes.ok) {
        const book = (await bookRes.json()) as { levels?: unknown[] }
        const levels = book.levels
        if (levels && levels.length >= 2) {
          const parseRows = (rows: unknown) =>
            (Array.isArray(rows) ? rows : []).map((row) => {
              if (row && typeof row === 'object' && !Array.isArray(row)) {
                const o = row as { px?: string; sz?: string }
                return { price: Number(o.px), size: Number(o.sz) }
              }
              if (Array.isArray(row) && row.length >= 2) {
                return { price: Number(row[0]), size: Number(row[1]) }
              }
              return { price: 0, size: 0 }
            })
          const bids = parseRows(levels[0])
          const asks = parseRows(levels[1])
          this.hlBook.applySnapshot(
            bids.filter((l) => l.price > 0 && l.size >= 0),
            asks.filter((l) => l.price > 0 && l.size >= 0),
          )
        }
      }
      this.emit()
    } catch {
      this.status.hyperliquid = 'disconnected'
    }
  }

  private buildState(): MicrostructureState {
    const venues = {} as Record<VenueId, VenueSnapshot>
    const ids: VenueId[] = ['binancePerp', 'binanceSpot', 'coinbase', 'hyperliquid']
    for (const venue of ids) {
      const book =
        venue === 'binancePerp'
          ? this.perpBook
          : venue === 'binanceSpot'
            ? this.spotBook
            : venue === 'coinbase'
              ? this.coinbaseBook
              : this.hlBook
      venues[venue] = {
        ...emptyVenue(venue),
        status: this.status[venue],
        mid: book.mid(),
        activeWalls: this.trackers[venue].getActive(),
        recentEvents: [...this.trackers[venue].getEvents()],
        taker15m: this.takers[venue].totals(),
        openInterestBtc: venue === 'hyperliquid' ? this.hlOiBtc : null,
        openInterestDeltaBtc:
          venue === 'hyperliquid' && this.hlOiBtc != null && this.hlPrevOiBtc != null
            ? this.hlOiBtc - this.hlPrevOiBtc
            : null,
        markPx: venue === 'hyperliquid' ? this.hlMark : null,
        fundingRate: venue === 'hyperliquid' ? this.hlFunding : null,
        depthSamples: this.depthSamples[venue].toArray().map((s) => ({
          at: s.at,
          mid: s.mid,
          bidNotionalNear: s.bid,
          askNotionalNear: s.ask,
          priceBuckets: s.priceBuckets,
        })),
        bookBids: this.chartBooks[venue].bids,
        bookAsks: this.chartBooks[venue].asks,
      }
    }
    const basisUsd =
      this.basisBinance > 0 && this.basisCoinbase > 0 ? this.basisBinance - this.basisCoinbase : null
    return { sampledAt: Date.now(), basisUsd, venues }
  }

  private emit(): void {
    this.state = this.buildState()
    for (const listener of this.listeners) listener(this.state)
  }
}