import type { OpenInterestSnapshot } from '../../data/openInterest'
import type { MicrostructureState } from '../../data/microstructure/types'
import { formatLiqBtc, formatLiqUsd } from '../format'
import { DepthInfoIcon } from './DepthInfoIcon'

const formatOi = (value: number): string => Math.round(value).toLocaleString('en-US')
const formatPct = (value: number): string => `${Math.round(value)}%`

interface DepthGlobalHeaderProps {
  micro: MicrostructureState
  openInterest: OpenInterestSnapshot | null
}

export const DepthGlobalHeader = ({ micro, openInterest }: DepthGlobalHeaderProps) => {
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
      <div className="depth-global-grid">
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
        <p className="depth-row depth-global-span">
          <DepthInfoIcon glossaryKey="takerFlow15m" label="Taker 15m (all venues)" />
          <span className="depth-taker-strip">
            BN-P {venues.binancePerp.taker15m.buyBtc.toFixed(1)}/{venues.binancePerp.taker15m.sellBtc.toFixed(1)} · S{' '}
            {venues.binanceSpot.taker15m.buyBtc.toFixed(1)}/{venues.binanceSpot.taker15m.sellBtc.toFixed(1)} · CB{' '}
            {venues.coinbase.taker15m.buyBtc.toFixed(1)}/{venues.coinbase.taker15m.sellBtc.toFixed(1)}
          </span>
        </p>
      </div>
    </header>
  )
}