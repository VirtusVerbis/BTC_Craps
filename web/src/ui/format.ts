export const formatElapsed = (elapsedMs: number): string => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':')
}

/** Legacy numeric formatter (positive finite only). */
export const formatPrice = (value: number): string =>
  Number.isFinite(value) && value > 0 ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'

/**
 * Display string for an exchange last price.
 * Android `PriceDisplay` keeps showing the last non-null price even if the feed disconnects.
 */
export const formatExchangePriceLabel = (price: number): string => {
  if (!Number.isFinite(price) || price <= 0) return 'Unavailable'
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const compactUsd = (value: number, unit: 'M' | 'K'): string => {
  const digits = value >= 10 ? 0 : 1
  const text = value.toFixed(digits).replace(/\.0$/, '')
  return `$${text}${unit}`
}

/** Liquidation notional. Millions from $1M, thousands below that. */
export const formatLiqUsd = (usd: number): string => {
  if (!Number.isFinite(usd) || usd < 0) return '—'
  if (usd >= 1_000_000) return compactUsd(usd / 1_000_000, 'M')
  if (usd >= 1_000) return compactUsd(usd / 1_000, 'K')
  return `$${Math.round(usd).toLocaleString('en-US')}`
}

/**
 * Whole BTC, matching the O/I figure.
 * A fraction of 1 BTC stays visible so a small hour does not read as 0 next to a dollar amount.
 */
export const formatLiqBtc = (btc: number): string => {
  if (!Number.isFinite(btc) || btc < 0) return '—'
  if (btc > 0 && btc < 1) return btc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return Math.round(btc).toLocaleString('en-US')
}

/** Minutes can exceed 59 at the hour boundary (`60:00`). */
export const formatLiqCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/** The closed hour stays up until the following hour ends. */
export const liqSwapAtMs = (liqBarStartSec: number): number => (liqBarStartSec + 2 * 60 * 60) * 1000
