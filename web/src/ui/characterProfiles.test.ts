import { describe, expect, it } from 'vitest'
import {
  PROFILE_GREEN,
  PROFILE_SIX,
  allocateProfiles,
  calloutText,
  catExtraNumbers,
  strategyChipBet,
  wolfLayNumbers,
  type CharacterPurses,
  type ProfileBet,
  type ProfileSwitches,
} from './characterProfiles'

const on: ProfileSwitches = {
  cat: true,
  oldLady: true,
  oldMan: true,
  wolf: true,
  wolfLay: true,
}

const purses = (pass: number, dont: number = pass): CharacterPurses => ({
  wolf: { pass, dont },
  oldLady: { pass, dont },
  cat: { pass, dont },
  oldMan: { pass, dont },
})

const dollarsOf = (bets: readonly ProfileBet[], character: ProfileBet['character'], side: ProfileBet['fundedFrom']) =>
  bets.filter((bet) => bet.character === character && bet.fundedFrom === side).reduce((sum, bet) => sum + bet.dollars, 0)

describe('histogram gates', () => {
  it('waits until 3 rolls are stored', () => {
    expect(catExtraNumbers([6, 6], 9)).toEqual([])
    expect(wolfLayNumbers([4, 4], 6)).toEqual([])
  })

  it('adds a place number only after it has appeared 3 times', () => {
    expect(catExtraNumbers([6, 6, 8], 9)).toEqual([])
    expect(catExtraNumbers([6, 6, 6], 9)).toEqual([6])
    expect(catExtraNumbers([6, 6, 6, 8, 8, 8], 9)).toEqual([6, 8])
    expect(catExtraNumbers([6, 6, 6], 6)).toEqual([])
  })

  it('lays only the coldest numbers that are still under 3 hits', () => {
    expect(wolfLayNumbers([4, 5, 7], 6)).toEqual([8, 9, 10])
    expect(wolfLayNumbers([4, 4, 4], 9)).toEqual([5, 6, 8, 10])
  })
})

describe('profile allocation', () => {
  it('abstains from a whole strategy that the pass stake cannot cover', () => {
    const result = allocateProfiles(purses(10_000_000), [], 9, [], false, on)
    expect(result.profiles.filter((bet) => bet.character === 'cat')).toEqual([])
    expect(result.profiles.filter((bet) => bet.character === 'oldLady')).toEqual([])
    expect(result.remainder.cat.pass).toBe(10_000_000)
  })

  it('keeps the line plus the strategy equal to the original stake', () => {
    const stakes = purses(500_000_000, 400_000_000)
    const result = allocateProfiles(stakes, [6, 6, 6], 9, [], false, on)
    for (const character of ['wolf', 'oldLady', 'cat', 'oldMan'] as const) {
      expect(dollarsOf(result.profiles, character, 'pass') + result.remainder[character].pass).toBe(stakes[character].pass)
      expect(dollarsOf(result.profiles, character, 'dont') + result.remainder[character].dont).toBe(stakes[character].dont)
    }
  })

  it('leaves the point number off the strategy', () => {
    const result = allocateProfiles(purses(500_000_000), [], 6, [], false, on)
    const numbers = result.profiles.filter((bet) => bet.role !== 'point-place' && bet.role !== 'point-lay').map((bet) => bet.number)
    expect(numbers).not.toContain(6)
    expect(result.profiles.some((bet) => bet.character === 'cat' && bet.number === 8)).toBe(true)
  })

  it('does not press a second across unit when the bet is already up', () => {
    const switches: ProfileSwitches = { ...on, cat: false, oldLady: false, oldMan: false, wolfLay: false }
    const first = allocateProfiles(purses(500_000_000), [], 4, [], false, switches)
    const second = allocateProfiles(purses(500_000_000), [], 4, first.profiles, false, switches)
    const across = (bets: readonly ProfileBet[]) => bets.filter((bet) => bet.role === 'across').map((bet) => bet.dollars)
    expect(across(second.profiles)).toEqual(across(first.profiles))
    expect(second.callouts.wolf).toBeUndefined()
  })

  it('places the point for the dont surplus and lays it for the pass surplus', () => {
    const placed = allocateProfiles(purses(80_000_000, 100_000_000), [], 4, [], false, {
      ...on,
      cat: false,
      oldLady: false,
      wolf: false,
      wolfLay: false,
    })
    expect(placed.profiles.find((bet) => bet.role === 'point-place')).toMatchObject({
      number: 4,
      dollars: 72_000_000,
      fundedFrom: 'dont',
    })
    expect(placed.remainder.oldMan).toEqual({ pass: 28_000_000, dont: 28_000_000 })

    const laid = allocateProfiles(purses(200_000_000, 40_000_000), [], 4, [], false, {
      ...on,
      cat: false,
      oldLady: false,
      wolf: false,
      wolfLay: false,
    })
    expect(laid.profiles.find((bet) => bet.role === 'point-lay')).toMatchObject({
      number: 4,
      dollars: 108_000_000,
      fundedFrom: 'pass',
    })
    expect(laid.remainder.oldMan).toEqual({ pass: 40_000_000, dont: 40_000_000 })
  })

  it('drops place and lay bets after a seven out and keeps them on the come-out', () => {
    const up = allocateProfiles(purses(500_000_000), [], 9, [], false, { ...on, wolfLay: false })
    const comeOut = allocateProfiles(purses(500_000_000), [], null, up.profiles, false, { ...on, wolfLay: false })
    expect(comeOut.profiles.some((bet) => bet.role === 'across')).toBe(true)
    expect(comeOut.profiles.some((bet) => bet.role === 'field')).toBe(false)
    const cleared = allocateProfiles(purses(500_000_000), [], null, up.profiles, true, on)
    expect(cleared.profiles).toEqual([])
  })
})

describe('callouts', () => {
  it('groups equal place prices and totals a new across bet', () => {
    const stakes = purses(500_000_000)
    const cat = allocateProfiles(stakes, [], 9, [], false, { ...on, oldLady: false, oldMan: false, wolf: false, wolfLay: false })
    expect(cat.callouts.cat).toBe(`Place 6, 8 for ${PROFILE_SIX / 1_000_000}M`)
    const wolf = allocateProfiles(stakes, [], 4, [], false, { ...on, cat: false, oldLady: false, oldMan: false, wolfLay: false })
    expect(wolf.callouts.wolf).toContain('Across for 64.5M')
  })

  it('lists a different place price on its own line', () => {
    const place = (number: 6 | 8 | 10, dollars: number): ProfileBet => ({
      id: `cat-place-${number}`,
      character: 'cat',
      role: 'place',
      number,
      dollars,
      fundedFrom: 'pass',
      label: `CAT_PLACE_${number}`,
      x: 0,
      y: 0,
    })
    expect(calloutText([place(6, PROFILE_SIX), place(8, PROFILE_SIX), place(10, PROFILE_GREEN)]))
      .toBe('Place 6, 8 for 13.5M\nPlace 10 for 12.5M')
  })

  it('builds a lay line from the added stake on each number', () => {
    const lay = {
      id: 'wolf-lay-4',
      character: 'wolf',
      role: 'lay',
      number: 4,
      dollars: PROFILE_GREEN,
      fundedFrom: 'dont',
      label: 'WOLF_LAY_4',
      x: 0,
      y: 0,
    } satisfies ProfileBet
    const other = { ...lay, id: 'wolf-lay-10', number: 10, label: 'WOLF_LAY_10' }
    expect(calloutText([lay, other])).toBe('Lay 4, 10 for 12.5M')
  })
})

describe('strategy chips', () => {
  it('stacks one green and two whites on a 6 or 8', () => {
    const placed = allocateProfiles(purses(500_000_000), [], 9, [], false, {
      ...on,
      oldLady: false,
      oldMan: false,
      wolf: false,
      wolfLay: false,
    })
    const six = placed.profiles.find((bet) => bet.id === 'cat-place-6')
    expect(six).toBeDefined()
    expect(strategyChipBet(six!, 1).columns).toEqual([['green', 'white', 'white']])
  })
})
