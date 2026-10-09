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

  it('counts down as mm:ss to the next 5-minute boundary', () => {
    expect(formatLiqCountdown(4 * 60 * 1000 + 12 * 1000)).toBe('04:12')
    expect(formatLiqCountdown(5 * 60 * 1000)).toBe('05:00')
    expect(formatLiqCountdown(0)).toBe('00:00')
    const boundary = 1_700_000_100 * 1000
    expect(liqSwapAtMs(boundary)).toBe(boundary + 5 * 60 * 1000)
    expect(liqSwapAtMs(boundary + 90_000)).toBe(boundary + 5 * 60 * 1000)
  })
})
