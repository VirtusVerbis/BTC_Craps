import { formatLiqBtc, formatLiqUsd } from './format'

export interface LiqTickerSource {
  liqBarStart: number | null
  longLiqBtc: number | null
  shortLiqBtc: number | null
  longLiqUsd: number | null
  shortLiqUsd: number | null
}

/** `Longs Liquidated! - 45 BTC  $155M` */
export const liqTickerLine = (side: 'long' | 'short', btc: number, usd: number): string => {
  const label = side === 'long' ? 'Longs Liquidated!' : 'Shorts Liquidated!'
  return `${label} - ${formatLiqBtc(btc)} BTC  ${formatLiqUsd(usd)}`
}

/**
 * Lines for one closed bar. Long plays before Short.
 * A side at $0 stays quiet even when the threshold is $1.
 */
export const liqTickerLines = (source: LiqTickerSource | null, notableUsd: number): string[] => {
  if (!source || source.liqBarStart == null) return []
  const lines: string[] = []
  const add = (side: 'long' | 'short', btc: number | null, usd: number | null) => {
    if (btc == null || usd == null || !(usd > 0) || usd < notableUsd) return
    lines.push(liqTickerLine(side, btc, usd))
  }
  add('long', source.longLiqBtc, source.longLiqUsd)
  add('short', source.shortLiqBtc, source.shortLiqUsd)
  return lines
}
