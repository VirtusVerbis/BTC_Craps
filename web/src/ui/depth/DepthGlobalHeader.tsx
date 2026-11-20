import { useRef } from 'react'
import type { OpenInterestSnapshot } from '../../data/openInterest'
import type { FeedStatus, MicrostructureState, VenueId } from '../../data/microstructure/types'
import { formatLiqBtc, formatLiqUsd } from '../format'
import { FeedGlyph } from '../FeedGlyph'
import { DepthInfoIcon } from './DepthInfoIcon'
import type { DepthGlossaryKey } from './depthGlossary'
import { formatVenueMid } from './depthVenueMidFormat'
import { DEPTH_SCROLL_VISIBLE_ROWS } from './depthUiConstants'
import { DEPTH_VENUE_ORDER, depthVenueColorBid, depthVenueShort } from './depthVenueTheme'
import { useDepthPingPongScroll } from './useDepthPingPongScroll'

const venueGlossary: Record<VenueId, DepthGlossaryKey> = {
  binancePerp: 'venueBinancePerp',
  binanceSpot: 'venueBinanceSpot',
  coinbase: 'venueCoinbase',
  hyperliquid: 'venueHyperliquid',
  bybitPerp: 'venueBybit',
  okxPerp: 'venueOkx',
  krakenSpot: 'venueKraken',
}

const feedStatusLabel: Record<FeedStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting',
  disconnected: 'Disconnected',
}

const venueLabelColor = (venue: VenueId): string =>
  depthVenueColorBid[venue].replace(/,\s*[\d.]+\)$/, ', 0.95)')

const formatTakerBtc = (n: number): string => n.toFixed(1)

const formatTakerNet = (buy: number, sell: number): string => {
  const net = buy - sell
  const sign = net >= 0 ? '+' : ''
  return `${sign}${net.toFixed(1)}`
}

const formatOi = (value: number): string => Math.round(value).toLocaleString('en-US')
const formatPct = (value: number): string => `${Math.round(value)}%`

interface DepthGlobalHeaderProps {
  micro: MicrostructureState
  openInterest: OpenInterestSnapshot | null
}

export const DepthGlobalHeader = ({ micro, openInterest }: DepthGlobalHeaderProps) => {
  const takerScrollRef = useRef<HTMLDivElement>(null)
  useDepthPingPongScroll(takerScrollRef, true)

  const venues = micro.venues
  const basis =
    micro.basisUsd == null ? '—' : `${micro.basisUsd >= 0 ? '+' : ''}$${micro.basisUsd.toFixed(2)}`
  const oi = openInterest ? `${formatOi(openInterest.openInterest)} BTC contracts` : '—'
  const longShort = openInterest
    ? `${formatPct(openInterest.longPct)} long · ${formatPct(openInterest.shortPct)} short`
    : '—'
  const liq =
    openInterest?.longLiqBtc != null
      ? `Long ${formatLiqBtc(openInterest.longLiqBtc)} (${formatLiqUsd(openInterest.longLiqUsd ?? 0)})${
          openInterest.shortLiqBtc != null
            ? ` · Short ${formatLiqBtc(openInterest.shortLiqBtc)} (${formatLiqUsd(openInterest.shortLiqUsd ?? 0)})`
            : ''
        }`
      : '—'

  return (
    <header className="depth-global">
      <div className="depth-global-layout">
        <section className="depth-taker-section">
          <DepthInfoIcon glossaryKey="takerFlow15m" label="Taker 15m (all venues)" />
          <div
            ref={takerScrollRef}
            className="depth-taker-table-scroll"
            style={{ ['--depth-wall-visible-rows' as string]: String(DEPTH_SCROLL_VISIBLE_ROWS) }}
          >
            <table className="depth-taker-table">
              <thead>
                <tr>
                  <th scope="col">Venue</th>
                  <th scope="col">Mid</th>
                  <th scope="col">Buy</th>
                  <th scope="col">Sell</th>
                  <th scope="col">Net</th>
                </tr>
              </thead>
              <tbody>
                {DEPTH_VENUE_ORDER.map((venue) => {
                  const snap = venues[venue]
                  const { buyBtc, sellBtc } = snap.taker15m
                  return (
                    <tr key={venue}>
                      <th scope="row" className="depth-taker-venue" style={{ color: venueLabelColor(venue) }}>
                        <span className="depth-taker-venue-inner">
                          <DepthInfoIcon glossaryKey={venueGlossary[venue]} label={depthVenueShort[venue]} />
                          <FeedGlyph
                            status={snap.status}
                            title={feedStatusLabel[snap.status]}
                            ariaLabel={`${depthVenueShort[venue]}: ${feedStatusLabel[snap.status]}`}
                            className="feed-glyph--depth"
                          />
                        </span>
                      </th>
                      <td className="depth-taker-mid">{formatVenueMid(snap.mid)}</td>
                      <td>{formatTakerBtc(buyBtc)}</td>
                      <td>{formatTakerBtc(sellBtc)}</td>
                      <td>{formatTakerNet(buyBtc, sellBtc)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
        <aside className="depth-global-stats" aria-label="Market summary">
          <p className="depth-row">
            <DepthInfoIcon glossaryKey="basis" label="Basis (BN − CB)" />
            <span>{basis}</span>
          </p>
          <p className="depth-row">
            <DepthInfoIcon glossaryKey="openInterest" label="O/I" />
            <span>{oi}</span>
          </p>
          <p className="depth-row">
            <DepthInfoIcon glossaryKey="longShortRatio" label="Long / Short" />
            <span>{longShort}</span>
          </p>
          <p className="depth-row">
            <DepthInfoIcon glossaryKey="liquidationsBar" label="Last liq bar" />
            <span>{liq}</span>
          </p>
        </aside>
      </div>
    </header>
  )
}