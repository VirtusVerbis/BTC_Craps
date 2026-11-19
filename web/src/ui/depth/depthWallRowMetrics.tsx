const compactUsdUnit = (value: number): string => {
  const abs = Math.abs(value)
  const digits = abs >= 10 ? 0 : 1
  const s = value.toFixed(digits)
  return s.endsWith('.0') ? s.slice(0, -2) : s
}

/** Abbreviated USD for chart labels: $1.4m, $450k, $2.3b. */
export const formatWallUsdCompact = (n: number): string => {
  if (!(n > 0)) return '$0'
  if (n >= 1_000_000_000) return `$${compactUsdUnit(n / 1_000_000_000)}b`
  if (n >= 1_000_000) return `$${compactUsdUnit(n / 1_000_000)}m`
  if (n >= 1_000) return `$${compactUsdUnit(n / 1_000)}k`
  return `$${Math.round(n).toLocaleString('en-US')}`
}

export const formatWallUsd = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`

export const renderWallSize = (price: number, peakBtc: number, peakUsd: number) => (
  <>
    <span className="depth-wall-price">${price.toLocaleString()}</span> ·{' '}
    <span className="depth-wall-btc">
      {peakBtc.toFixed(1)} BTC
    </span>{' '}
    (<span className="depth-wall-usd">{formatWallUsd(peakUsd)}</span>)
  </>
)