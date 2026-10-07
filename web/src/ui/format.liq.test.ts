import { describe, expect, it } from 'vitest'
import { formatLiqBtc, formatLiqCountdown, formatLiqUsd, liqSwapAtMs } from './format'

describe('liquidation labels', () => {
  it('rounds BTC to a whole number and keeps a fraction of 1 BTC', () => {
    expect(formatLiqBtc(1240.4)).toBe('1,240')
    expect(formatLiqBtc(2.55)).toBe('3')
    expect(formatLiqBtc(0.053)).toBe('0.05')
    expect(formatLiqBtc(0)).toBe('0')
  })

  it('prints millions from $1M and thousands below that', () => {
    expect(formatLiqUsd(84_000_000)).toBe('$84M')
    expect(formatLiqUsd(2_000_000)).toBe('$2M')
    expect(formatLiqUsd(1_200_000)).toBe('$1.2M')
    expect(formatLiqUsd(840_000)).toBe('$840K')
    expect(formatLiqUsd(8_400)).toBe('$8.4K')
  })

  it('counts down as mm:ss and holds the bar for two hours after it starts', () => {
    expect(formatLiqCountdown(58 * 60 * 1000 + 12 * 1000)).toBe('58:12')
    expect(formatLiqCountdown(60 * 60 * 1000)).toBe('60:00')
    expect(formatLiqCountdown(0)).toBe('00:00')
    expect(liqSwapAtMs(1_700_000_000)).toBe((1_700_000_000 + 2 * 60 * 60) * 1000)
  })
})
