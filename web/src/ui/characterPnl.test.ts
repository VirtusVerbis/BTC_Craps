import { describe, expect, it } from 'vitest'
import {
  applyCharacterPnl,
  characterStakes,
  emptyCharacterPnl,
  formatPnlBtc,
  formatPnlUsd,
  CHARACTER_PNL_KEY,
  lineDecisionPnl,
  pnlColor,
  readStoredPnl,
  writeStoredPnl,
} from './characterPnl'
import { PL_LOSS_COLOR, PL_PROFIT_COLOR } from './characterPnlConstants'
import { PROFILE_RED } from './characterProfiles'
import type { ProfileBet } from './characterProfiles'

describe('line decision', () => {
  it('pays Pass minus Don\'t Pass on a come-out 7 or 11 and on a made point', () => {
    expect(lineDecisionPnl(null, 7, 40, 10)).toBe(30)
    expect(lineDecisionPnl(null, 11, 40, 10)).toBe(30)
    expect(lineDecisionPnl(8, 8, 40, 10)).toBe(30)
  })

  it('pays Don\'t Pass minus Pass on a come-out 2 or 3 and on a seven out', () => {
    expect(lineDecisionPnl(null, 2, 40, 10)).toBe(-30)
    expect(lineDecisionPnl(null, 3, 40, 10)).toBe(-30)
    expect(lineDecisionPnl(8, 7, 40, 10)).toBe(-30)
  })

  it('loses Pass and pushes Don\'t Pass on a come-out 12', () => {
    expect(lineDecisionPnl(null, 12, 40, 10)).toBe(-40)
  })

  it('pays nothing when a point is set or the roll does not decide', () => {
    expect(lineDecisionPnl(null, 6, 40, 10)).toBe(0)
    expect(lineDecisionPnl(8, 9, 40, 10)).toBe(0)
  })
})

describe('character stakes and running total', () => {
  const stakes = characterStakes(1_000, 60_000, 50, 50)

  it('splits open interest into Pass and Don\'t Pass with the character weights', () => {
    expect(stakes.cat.btc).toEqual({ pass: 200, dont: 50 })
    expect(stakes.cat.usd).toEqual({ pass: 12_000_000, dont: 3_000_000 })
    expect(stakes.wolf.btc).toEqual({ pass: 50, dont: 200 })
    expect(stakes.wolf.usd.pass).toBe(3_000_000)
    expect(stakes.wolf.usd.dont).toBe(12_000_000)
  })

  it('hides every label until the first decision, then keeps a running total', () => {
    const set = applyCharacterPnl(emptyCharacterPnl(), null, 6, stakes)
    expect(set.cat.shown).toBe(false)
    expect(applyCharacterPnl(set, 6, 9, stakes)).toBe(set)

    const won = applyCharacterPnl(set, null, 7, stakes)
    expect(won.cat).toEqual({ btc: 150, usd: 9_000_000, shown: true })
    expect(won.wolf).toEqual({ btc: -150, usd: -9_000_000, shown: true })

    const out = applyCharacterPnl(won, 8, 7, stakes)
    expect(out.cat).toEqual({ btc: 0, usd: 0, shown: true })
    expect(out.wolf.btc).toBe(0)
    expect(out.wolf.shown).toBe(true)
  })

  it('clears the dollar line when the bitcoin total comes back to flat', () => {
    const won = applyCharacterPnl(emptyCharacterPnl(), null, 7, stakes)
    const flat = applyCharacterPnl(won, 8, 7, characterStakes(1_000, 61_000, 50, 50))
    expect(flat.cat).toEqual({ btc: 0, usd: 0, shown: true })
    expect(flat.wolf).toEqual({ btc: 0, usd: 0, shown: true })
  })

  it('prices the remaining bitcoin at the latest decision', () => {
    const won = applyCharacterPnl(emptyCharacterPnl(), null, 7, stakes)
    const smaller = applyCharacterPnl(won, null, 2, characterStakes(500, 70_000, 50, 50))
    expect(smaller.cat.btc).toBe(75)
    expect(smaller.cat.usd).toBe(5_250_000)
  })

  it('leaves the previous total in place when the next roll only sets a point', () => {
    const won = applyCharacterPnl(emptyCharacterPnl(), null, 11, stakes)
    const point = applyCharacterPnl(won, null, 4, stakes)
    expect(point).toBe(won)
  })

  it('pays a working place bet and keeps those dollars off the line', () => {
    const place: ProfileBet = {
      id: 'cat-place-6',
      character: 'cat',
      role: 'place',
      number: 6,
      dollars: 6_000_000,
      fundedFrom: 'pass',
      label: 'CAT_PLACE_6',
      x: 0,
      y: 0,
    }
    const hit = applyCharacterPnl(emptyCharacterPnl(), 9, 6, stakes, [place])
    expect(hit.cat.btc).toBeCloseTo(116.666666)
    expect(hit.cat.usd).toBeCloseTo(7_000_000)

    const out = applyCharacterPnl(emptyCharacterPnl(), 8, 7, stakes, [place])
    expect(out.cat.btc).toBeCloseTo(-150)
  })

  it('pays hard 6 at 9 to 1 and loses it the easy way', () => {
    const hard: ProfileBet = {
      id: 'oldLady-hard-6',
      character: 'oldLady',
      role: 'hard',
      number: 6,
      dollars: PROFILE_RED,
      fundedFrom: 'pass',
      label: 'OLD_LADY_HARD_6',
      x: 0,
      y: 0,
    }
    const won = applyCharacterPnl(emptyCharacterPnl(), 9, 6, stakes, [hard], true)
    expect(won.oldLady.btc).toBeCloseTo(375)
    expect(won.oldLady.usd).toBeCloseTo(22_500_000)

    const easy = applyCharacterPnl(emptyCharacterPnl(), 9, 6, stakes, [hard], false)
    expect(easy.oldLady.btc).toBeCloseTo(-PROFILE_RED / 60_000)
    const comeOut = emptyCharacterPnl()
    expect(applyCharacterPnl(comeOut, null, 6, stakes, [hard], true)).toBe(comeOut)
  })
})

const memoryStorage = (): Storage => {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear() {
      items.clear()
    },
    getItem(key) {
      return items.get(key) ?? null
    },
    key(index) {
      return [...items.keys()][index] ?? null
    },
    removeItem(key) {
      items.delete(key)
    },
    setItem(key, value) {
      items.set(key, value)
    },
  }
}

describe('saved P/L', () => {
  it('reloads the last saved totals', () => {
    const storage = memoryStorage()
    const book = emptyCharacterPnl()
    book.wolf = { btc: 1.5, usd: 120_000, shown: true }
    writeStoredPnl(storage, book)
    expect(readStoredPnl(storage).wolf).toEqual(book.wolf)
    expect(readStoredPnl(storage).cat.shown).toBe(false)
    expect(storage.getItem(CHARACTER_PNL_KEY)).toContain('"btc":1.5')
  })

  it('ignores a missing, corrupt, or partial cache', () => {
    const storage = memoryStorage()
    expect(readStoredPnl(null).wolf).toEqual(emptyCharacterPnl().wolf)
    expect(readStoredPnl(storage).cat.shown).toBe(false)
    storage.setItem(CHARACTER_PNL_KEY, '{')
    expect(readStoredPnl(storage).wolf.shown).toBe(false)
    storage.setItem(CHARACTER_PNL_KEY, '{"wolf":{"btc":1,"usd":1,"shown":true}}')
    expect(readStoredPnl(storage).wolf.shown).toBe(false)
  })

  it('leaves memory alone when the store rejects the write', () => {
    const storage = memoryStorage()
    storage.setItem = () => {
      throw new Error('quota')
    }
    const book = emptyCharacterPnl()
    book.cat = { btc: 2, usd: 80_000, shown: true }
    expect(() => writeStoredPnl(storage, book)).not.toThrow()
    expect(readStoredPnl(storage).cat.shown).toBe(false)
  })
})

describe('P/L labels', () => {
  it('formats the two lines without a minus sign', () => {
    expect(formatPnlBtc(0.5)).toBe('0.5 BTC')
    expect(formatPnlBtc(-0.5)).toBe('0.5 BTC')
    expect(formatPnlUsd(30_000)).toBe('30k USD')
    expect(formatPnlUsd(-9_000_000)).toBe('9m USD')
  })

  it('uses green for a profit and red for a loss', () => {
    expect(pnlColor({ btc: 0.5, usd: 30_000, shown: true })).toBe(PL_PROFIT_COLOR)
    expect(pnlColor({ btc: -0.5, usd: -30_000, shown: true })).toBe(PL_LOSS_COLOR)
  })
})
