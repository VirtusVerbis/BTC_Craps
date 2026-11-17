import type { FeedStatus, MicrostructureState, VenueId } from '../../data/microstructure/types'
import { FeedGlyph } from '../FeedGlyph'
import { DepthInfoIcon } from './DepthInfoIcon'
import type { DepthGlossaryKey } from './depthGlossary'
import { DEPTH_VENUE_ORDER, depthVenueShort } from './depthVenueTheme'

const venueGlossary: Record<VenueId, DepthGlossaryKey> = {
  binancePerp: 'venueBinancePerp',
  binanceSpot: 'venueBinanceSpot',
  coinbase: 'venueCoinbase',
  hyperliquid: 'venueHyperliquid',
}

const feedStatusLabel: Record<FeedStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
}

interface DepthVenueFeedMidsProps {
  venues: MicrostructureState['venues']
}

export const DepthVenueFeedMids = ({ venues }: DepthVenueFeedMidsProps) => {
  return (
    <aside className="depth-venue-mids-rail" aria-label="Venue mids and feed status">
      <div className="depth-venue-mids-grid">
        {DEPTH_VENUE_ORDER.map((venue) => {
          const snap = venues[venue]
          return (
            <div key={venue} className="depth-venue-mids-cell">
              <p className="depth-venue-mids-head">
                <DepthInfoIcon glossaryKey={venueGlossary[venue]} label={depthVenueShort[venue]} />
                <FeedGlyph
                  status={snap.status}
                  title={feedStatusLabel[snap.status]}
                  ariaLabel={`${depthVenueShort[venue]}: ${feedStatusLabel[snap.status]}`}
                  className="feed-glyph--depth"
                />
              </p>
              <p className="depth-venue-mids-line">
                {snap.mid > 0 ? `Mid $${snap.mid.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'Mid —'}
              </p>
            </div>
          )
        })}
      </div>
    </aside>
  )
}