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