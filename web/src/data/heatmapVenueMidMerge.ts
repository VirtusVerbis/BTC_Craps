import type { Candle } from './candles'
import { heatmapVenueMidHistoryVenues } from './heatmapVenueMidHistory'
import type { VenueMidHistory } from './heatmapVenueMidHistory'
import type { VenueId } from './microstructure/types'

const venueHasPaintableSeries = (candles: Candle[] | undefined): boolean =>
  Boolean(candles && candles.length >= 2)

/**
 * Prefer fresh REST slices when paintable; otherwise keep prior cached venue data
 * so a single exchange rate limit does not wipe localStorage for that venue.
 */
export const mergeVenueMidHistory = (
  prior: VenueMidHistory | null | undefined,
  fresh: VenueMidHistory,
): VenueMidHistory => {
  const out: VenueMidHistory = { ...fresh }
  for (const venue of heatmapVenueMidHistoryVenues) {
    const next = fresh[venue as VenueId]
    if (venueHasPaintableSeries(next)) {
      out[venue as VenueId] = next
      continue
    }
    const prev = prior?.[venue as VenueId]
    if (venueHasPaintableSeries(prev)) {
      out[venue as VenueId] = prev
    } else if (next?.length) {
      out[venue as VenueId] = next
    } else {
      delete out[venue as VenueId]
    }
  }
  return out
}