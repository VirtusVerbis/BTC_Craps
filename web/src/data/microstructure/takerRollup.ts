const FIFTEEN_MIN_MS = 15 * 60 * 1000

interface Bucket {
  at: number
  buy: number
  sell: number
}

/** Rolling taker buy/sell in BTC over the last 15 minutes. */
export class TakerRollup15m {
  private buckets: Bucket[] = []

  add(isSell: boolean, qtyBtc: number, at = Date.now()): void {
    if (!(qtyBtc > 0)) return
    const last = this.buckets[this.buckets.length - 1]
    if (last && at - last.at < 1000) {
      if (isSell) last.sell += qtyBtc
      else last.buy += qtyBtc
    } else {
      this.buckets.push({ at, buy: isSell ? 0 : qtyBtc, sell: isSell ? qtyBtc : 0 })
    }
    this.prune(at)
  }

  private prune(now: number): void {
    const cutoff = now - FIFTEEN_MIN_MS
    this.buckets = this.buckets.filter((b) => b.at >= cutoff)
  }

  totals(now = Date.now()): { buyBtc: number; sellBtc: number } {
    this.prune(now)
    let buyBtc = 0
    let sellBtc = 0
    for (const b of this.buckets) {
      buyBtc += b.buy
      sellBtc += b.sell
    }
    return { buyBtc, sellBtc }
  }

  /** REST recent-trades poll while WS tape is offline — not a true 15m window. */
  setRecentTapeApproximation(buyBtc: number, sellBtc: number, at = Date.now()): void {
    this.buckets = [{ at, buy: buyBtc, sell: sellBtc }]
    this.prune(at)
  }
}