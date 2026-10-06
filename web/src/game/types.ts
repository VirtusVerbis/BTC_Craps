export type ExchangeName = 'binance' | 'coinbase'

export interface ExchangeSnapshot {
  exchange: ExchangeName
  price: number
  buyVolume: number
  sellVolume: number
  updatedAt: number
}

export interface MarketSnapshot {
  binance: ExchangeSnapshot
  coinbase: ExchangeSnapshot
}
