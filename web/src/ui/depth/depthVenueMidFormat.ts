import type { VenueId } from '../../data/microstructure/types'
import { depthVenueColorBid, depthVenueMissingColor } from './depthVenueTheme'

export const formatVenueMid = (mid: number): string =>
  mid > 0 ? `$${mid.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'

export const venueMidChartLabelColor = (venue: VenueId, mid: number): string =>
  mid > 0 ? depthVenueColorBid[venue].replace(/,\s*[\d.]+\)$/, ', 0.95)') : depthVenueMissingColor[venue]