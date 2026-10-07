import { describe, expect, it } from 'vitest'
import { CHIP_MAX_BET_CHIPS, CHIP_MAX_COLUMNS, CHIP_MAX_STACK } from './chipConstants'
import {
  CHIP_FACE_VALUE,
  CHIP_WEIGHT_SUM,
  PASS_WEIGHT,
  betDollars,
  buildBets,
  chipsForDollars,
  denominationScale,
  splitColumns,
} from './chipBets'

const notional = 10_000_000_000

describe('felt bets', () => {
  it('gives Pass the long share and Don\'t Pass the short share', () => {
    const bets = buildBets(notional, 57, 43)
    const sum = (side: 'pass' | 'dont') => bets.filter((bet) => bet.side === side).reduce((total, bet) => total + bet.dollars, 0)
    expect(sum('pass') / notional).toBeCloseTo(0.57, 5)
    expect(sum('dont') / notional).toBeCloseTo(0.43, 5)
  })

  it('keeps the character weights inside each side', () => {
    const passPool = notional * 0.57
    const shortPool = notional * 0.43
    expect(betDollars(notional, 57, 43, 'cat', 'pass') / passPool).toBeCloseTo(PASS_WEIGHT.cat / CHIP_WEIGHT_SUM, 5)
    expect(betDollars(notional, 57, 43, 'wolf', 'pass') / passPool).toBeCloseTo(PASS_WEIGHT.wolf / CHIP_WEIGHT_SUM, 5)
    expect(betDollars(notional, 57, 43, 'wolf', 'dont') / shortPool).toBeCloseTo(80 / CHIP_WEIGHT_SUM, 5)
    expect(betDollars(notional, 57, 43, 'cat', 'dont') / shortPool).toBeCloseTo(20 / CHIP_WEIGHT_SUM, 5)
  })

  it('ties Cat Pass with Wolf Don\'t Pass when the ratio is even', () => {
    expect(betDollars(notional, 50, 50, 'cat', 'pass')).toBeCloseTo(betDollars(notional, 50, 50, 'wolf', 'dont'))
    expect(betDollars(notional, 50, 50, 'cat', 'pass') / notional).toBeCloseTo(0.2, 5)
  })

  it('makes Cat Pass the largest bet at 57/43', () => {
    const bets = buildBets(notional, 57, 43)
    const cat = bets.find((bet) => bet.character === 'cat' && bet.side === 'pass')
    const wolf = bets.find((bet) => bet.character === 'wolf' && bet.side === 'dont')
    expect(cat && wolf && cat.dollars).toBeGreaterThan(wolf?.dollars ?? 0)
  })

  it('breaks dollars largest-first', () => {
    expect(chipsForDollars(CHIP_FACE_VALUE.black + CHIP_FACE_VALUE.white, 1)).toEqual(['black', 'white'])
    expect(chipsForDollars(CHIP_FACE_VALUE.red * 2, 1)).toEqual(['red', 'red'])
  })

  it('scales every denomination so the largest bet is 40 chips', () => {
    const huge = 50_000_000_000
    const bets = buildBets(huge, 57, 43)
    const largest = bets.reduce((best, bet) => {
      const count = bet.columns.reduce((sum, column) => sum + column.length, 0)
      return Math.max(best, count)
    }, 0)
    expect(largest).toBeLessThanOrEqual(CHIP_MAX_BET_CHIPS)
    expect(largest).toBe(CHIP_MAX_BET_CHIPS)
    expect(denominationScale(CHIP_FACE_VALUE.black * 40)).toBe(1)
    expect(denominationScale(CHIP_FACE_VALUE.black * 80)).toBeCloseTo(2)
    for (const bet of bets) {
      expect(bet.columns.length).toBeLessThanOrEqual(CHIP_MAX_COLUMNS)
      for (const column of bet.columns) expect(column.length).toBeLessThanOrEqual(CHIP_MAX_STACK)
    }
  })

  it('splits a tall bet into a second column', () => {
    const chips = Array.from({ length: 25 }, () => 'green' as const)
    const columns = splitColumns(chips)
    expect(columns).toHaveLength(2)
    expect(columns[0]).toHaveLength(20)
    expect(columns[1]).toHaveLength(5)
  })
})
