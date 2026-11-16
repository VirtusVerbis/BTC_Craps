import type { MicrostructureState } from '../../data/microstructure/types'
import { DepthInfoIcon } from './DepthInfoIcon'
import type { DepthGlossaryKey } from './depthGlossary'
import { depthVenueShort } from './depthVenueTheme'

const venueGlossary: Record<keyof MicrostructureState['venues'], DepthGlossaryKey> = {
  binancePerp: 'venueBinancePerp',
  binanceSpot: 'venueBinanceSpot',
  coinbase: 'venueCoinbase',
  hyperliquid: 'venueHyperliquid',
}

const venueOrder = ['binancePerp', 'binanceSpot', 'coinbase', 'hyperliquid'] as const

interface DepthVenueStripProps {
  micro: MicrostructureState
}

export const DepthVenueStrip = ({ micro }: DepthVenueStripProps) => {
  return (
    <section className="depth-venue-strip" aria-label="Venue feeds">
      {venueOrder.map((venue) => {
        const snap = micro.venues[venue]
        const net = snap.taker15m.buyBtc - snap.taker15m.sellBtc
        return (
          <div key={venue} className="depth-venue-strip-cell">
            <p className="depth-venue-strip-head">
              <DepthInfoIcon glossaryKey={venueGlossary[venue]} label={depthVenueShort[venue]} />
              <span className={`depth-feed-${snap.status}`} title="Feed status">
                ●
              </span>
            </p>
            <p className="depth-venue-strip-line">
              {snap.mid > 0 ? `Mid $${snap.mid.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : 'Mid —'}
            </p>
            <p className="depth-venue-strip-line">
              Taker net {net >= 0 ? '+' : ''}
              {net.toFixed(2)} BTC
            </p>
            {venue === 'hyperliquid' ? (
              <>
                {snap.openInterestBtc != null ? (
                  <p className="depth-venue-strip-line">
                    OI {snap.openInterestBtc.toFixed(0)}
                    {snap.openInterestDeltaBtc != null
                      ? ` (Δ ${snap.openInterestDeltaBtc >= 0 ? '+' : ''}${snap.openInterestDeltaBtc.toFixed(0)})`
                      : ''}
                  </p>
                ) : null}
                {snap.fundingRate != null ? (
                  <p className="depth-venue-strip-line">Fund {(snap.fundingRate * 100).toFixed(4)}%</p>
                ) : null}
              </>
            ) : null}
          </div>
        )
      })}
    </section>
  )
}