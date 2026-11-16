import type { VenueSnapshot } from '../../data/microstructure/types'
import type { DepthGlossaryKey } from './depthGlossary'
import { DepthInfoIcon } from './DepthInfoIcon'
import { DepthTimeline } from './DepthTimeline'
import { useState } from 'react'

const venueGlossary: Record<VenueSnapshot['venue'], DepthGlossaryKey> = {
  binancePerp: 'venueBinancePerp',
  binanceSpot: 'venueBinanceSpot',
  coinbase: 'venueCoinbase',
  hyperliquid: 'venueHyperliquid',
}

const venueTitle: Record<VenueSnapshot['venue'], string> = {
  binancePerp: 'Binance perp',
  binanceSpot: 'Binance spot',
  coinbase: 'Coinbase',
  hyperliquid: 'Hyperliquid',
}

const wallReasonLabel: Record<string, string> = {
  active: 'Active',
  pulled: 'Pulled',
  atTouch: 'At touch',
  consumed: 'Consumed',
  flipped: 'Flipped',
}

const formatUsd = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`

interface DepthVenueBlockProps {
  snapshot: VenueSnapshot
}

export const DepthVenueBlock = ({ snapshot }: DepthVenueBlockProps) => {
  const [timelineOpen, setTimelineOpen] = useState(false)
  const { taker15m } = snapshot
  const net = taker15m.buyBtc - taker15m.sellBtc

  return (
    <section className="depth-venue-block">
      <DepthInfoIcon glossaryKey={venueGlossary[snapshot.venue]} label={venueTitle[snapshot.venue]} />
      <p className="depth-row">
        <DepthInfoIcon glossaryKey="feedStatus" label="Feed" />
        <span className={`depth-feed-${snapshot.status}`}>{snapshot.status}</span>
        {snapshot.mid > 0 ? <span>Mid ${snapshot.mid.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span> : null}
      </p>

      {snapshot.venue === 'hyperliquid' && snapshot.openInterestBtc != null ? (
        <p className="depth-row">
          <DepthInfoIcon glossaryKey="hyperliquidOi" label="OI (BTC)" />
          <span>
            {snapshot.openInterestBtc.toFixed(0)}
            {snapshot.openInterestDeltaBtc != null
              ? ` (Δ ${snapshot.openInterestDeltaBtc >= 0 ? '+' : ''}${snapshot.openInterestDeltaBtc.toFixed(0)})`
              : ''}
          </span>
          {snapshot.markPx != null ? <span>Mark ${snapshot.markPx.toLocaleString()}</span> : null}
        </p>
      ) : null}

      {snapshot.venue === 'hyperliquid' && snapshot.fundingRate != null ? (
        <p className="depth-row">
          <DepthInfoIcon glossaryKey="fundingRate" label="Funding" />
          <span>{(snapshot.fundingRate * 100).toFixed(4)}%</span>
        </p>
      ) : null}

      <p className="depth-row">
        <DepthInfoIcon glossaryKey="takerFlow15m" label="Taker 15m" />
        <span>
          +{taker15m.buyBtc.toFixed(2)} / −{taker15m.sellBtc.toFixed(2)} BTC (net {net >= 0 ? '+' : ''}
          {net.toFixed(2)})
        </span>
      </p>

      <DepthInfoIcon glossaryKey="wallRadar" label="Wall radar" />
      <ul className="depth-wall-list">
        {snapshot.activeWalls.length === 0 && snapshot.recentEvents.length === 0 ? (
          <li className="depth-muted">No large walls in band.</li>
        ) : null}
        {snapshot.activeWalls.map((w) => (
          <li key={`${w.side}-${w.price}-active`}>
            {w.side === 'bid' ? 'BID' : 'ASK'} ${w.price.toLocaleString()} · {w.peakBtc.toFixed(1)} BTC (
            {formatUsd(w.peakUsd)}) · Active
          </li>
        ))}
        {snapshot.recentEvents.slice(0, 8).map((e) => (
          <li key={`${e.at}-${e.side}-${e.price}`}>
            {e.side === 'bid' ? 'BID' : 'ASK'} ${e.price.toLocaleString()} · {formatUsd(e.peakUsd)} ·{' '}
            {wallReasonLabel[e.reason] ?? e.reason}
          </li>
        ))}
      </ul>

      <div className="depth-timeline-section">
        <button type="button" className="depth-timeline-toggle" onClick={() => setTimelineOpen((v) => !v)}>
          {timelineOpen ? 'Hide' : 'Show'} timeline
        </button>
        {timelineOpen ? (
          <>
            <DepthInfoIcon glossaryKey="timelineHeatmap" label="Depth timeline" />
            <DepthTimeline samples={snapshot.depthSamples} />
          </>
        ) : null}
      </div>
    </section>
  )
}