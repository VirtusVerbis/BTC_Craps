import { useEffect } from 'react'
import type { MarketDataService } from './marketData'
import type { MicrostructureService } from './microstructure/microstructureService'

/** Push HUD mid prices into microstructure without tying updates to App render. */
export const useMicrostructureBasisSync = (
  marketService: MarketDataService,
  microstructureService: MicrostructureService,
): void => {
  useEffect(() => {
    const sync = () => {
      const { market } = marketService.getSnapshot()
      microstructureService.setBasisPrices(market.binance.price, market.coinbase.price)
    }
    sync()
    return marketService.subscribe(sync)
  }, [marketService, microstructureService])
}