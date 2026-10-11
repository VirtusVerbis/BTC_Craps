import { describe, expect, it } from 'vitest'
import { KV_PUTS_PER_DAY, shouldStoreSnapshot } from './kvBudget'

const MINUTE = 60_000
const MINUTES_PER_DAY = 24 * 60

describe('shouldStoreSnapshot', () => {
  const midnight = Date.UTC(2026, 9, 12, 0, 0, 0)

  it('stores two UTC minutes and skips the third', () => {
    expect(shouldStoreSnapshot(midnight)).toBe(true)
    expect(shouldStoreSnapshot(midnight + MINUTE)).toBe(true)
    expect(shouldStoreSnapshot(midnight + 2 * MINUTE)).toBe(false)
    expect(shouldStoreSnapshot(midnight + 2 * MINUTE + 59_000)).toBe(false)
    expect(shouldStoreSnapshot(midnight + 3 * MINUTE)).toBe(true)
  })

  it('stores 960 times in a UTC day, under the free-tier cap', () => {
    let stores = 0
    for (let i = 0; i < MINUTES_PER_DAY; i++) {
      if (shouldStoreSnapshot(midnight + i * MINUTE)) stores += 1
    }
    expect(stores).toBe(KV_PUTS_PER_DAY)
    expect(stores).toBeLessThanOrEqual(1000)
  })

  it('keeps every gap at one or two minutes, including across midnight', () => {
    let last = -1
    for (let i = 0; i < MINUTES_PER_DAY; i++) {
      if (!shouldStoreSnapshot(midnight + i * MINUTE)) continue
      if (last >= 0) expect(i - last).toBeLessThanOrEqual(2)
      last = i
    }
    const nextMidnight = midnight + MINUTES_PER_DAY * MINUTE
    expect(shouldStoreSnapshot(midnight + 23 * 60 * MINUTE + 58 * MINUTE)).toBe(true)
    expect(shouldStoreSnapshot(nextMidnight)).toBe(true)
    expect(nextMidnight - (midnight + (23 * 60 + 58) * MINUTE)).toBe(2 * MINUTE)
  })
})
