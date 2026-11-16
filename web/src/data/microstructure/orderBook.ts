import type { BookLevel } from './types'

const MAX_LEVELS = 120

export class OrderBook {
  private bids = new Map<number, number>()
  private asks = new Map<number, number>()

  applySnapshot(bids: BookLevel[], asks: BookLevel[]): void {
    this.bids.clear()
    this.asks.clear()
    for (const l of bids) this.set(this.bids, l)
    for (const l of asks) this.set(this.asks, l)
  }

  applyDelta(bids: BookLevel[], asks: BookLevel[]): void {
    for (const l of bids) this.patch(this.bids, l)
    for (const l of asks) this.patch(this.asks, l)
  }

  private set(map: Map<number, number>, l: BookLevel): void {
    if (l.size <= 0) map.delete(l.price)
    else map.set(l.price, l.size)
  }

  private patch(map: Map<number, number>, l: BookLevel): void {
    this.set(map, l)
  }

  mid(): number {
    const bestBid = this.bestBid()
    const bestAsk = this.bestAsk()
    if (bestBid > 0 && bestAsk > 0) return (bestBid + bestAsk) / 2
    if (bestBid > 0) return bestBid
    if (bestAsk > 0) return bestAsk
    return 0
  }

  bestBid(): number {
    let best = 0
    for (const p of this.bids.keys()) if (p > best) best = p
    return best
  }

  bestAsk(): number {
    let best = 0
    for (const p of this.asks.keys()) {
      if (best === 0 || p < best) best = p
    }
    return best
  }

  toLevels(): { bids: BookLevel[]; asks: BookLevel[] } {
    const bids = [...this.bids.entries()]
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => b.price - a.price)
      .slice(0, MAX_LEVELS)
    const asks = [...this.asks.entries()]
      .map(([price, size]) => ({ price, size }))
      .sort((a, b) => a.price - b.price)
      .slice(0, MAX_LEVELS)
    return { bids, asks }
  }
}