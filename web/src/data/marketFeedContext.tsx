import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react'
import { MarketDataService, type MarketFeedUpdate } from './marketData'

const MarketFeedContext = createContext<MarketDataService | null>(null)

export const MarketFeedProvider = ({
  service,
  children,
}: {
  service: MarketDataService
  children: ReactNode
}) => <MarketFeedContext.Provider value={service}>{children}</MarketFeedContext.Provider>

export const useMarketFeedService = (): MarketDataService => {
  const service = useContext(MarketFeedContext)
  if (!service) throw new Error('useMarketFeedService requires MarketFeedProvider')
  return service
}

export const useMarketFeed = (): MarketFeedUpdate => {
  const service = useMarketFeedService()
  return useSyncExternalStore(
    (onStoreChange) => service.subscribe(onStoreChange),
    () => service.getSnapshot(),
    () => service.getSnapshot(),
  )
}