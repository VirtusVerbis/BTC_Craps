import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyBonusRoll, emptyBonusHand } from './bonusCraps'
import {
  SHOOTER_ALL_X,
  SHOOTER_ALL_Y,
  SHOOTER_DONT_X,
  SHOOTER_DONT_Y,
  SHOOTER_PASS_X,
  SHOOTER_PASS_Y,
} from './characterBetConstants'
import { BONUS_ALL_PAYS } from './bonusConstants'
import { BONUS_SMALL_X, BONUS_SMALL_Y, BONUS_TALL_X, BONUS_TALL_Y } from './bonusFieldConstants'
import {
  SHOOTER_RED,
  applyShooterRoll,
  bonusStakeDollars,
  emptyShooterBook,
  formatAllSmall,
  formatAllTall,
  formatBonusStakeLabel,
  formatMakeEmAll,
  formatShooterPnl,
  loadShooterBook,
  saveShooterBook,
  shooterFigureColor,
  shooterLineBets,
} from './shooterProfile'
import type { ChipBet } from './chipBets'
import { PL_LOSS_COLOR, PL_PROFIT_COLOR } from './characterPnlConstants'

const PRICE = 100_000

const almostAll = () => {
  const totals = [8, 9, 10, 11, 12, 2, 3, 4, 5]
  let hand = emptyBonusHand()
  for (const total of totals) hand = applyBonusRoll(hand, total).hand
  return hand
}

describe('shooter profile', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('places one red on Pass, Don\'t Pass, and Make \'Em All', () => {
    const bets = shooterLineBets()
    expect(bets).toEqual([
      expect.objectContaining({
        id: 'shooter-pass',
        character: 'shooter',
        side: 'pass',
        dollars: SHOOTER_RED,
        columns: [['red']],
        anchor: { x: SHOOTER_PASS_X, y: SHOOTER_PASS_Y },
      }),
      expect.objectContaining({
        id: 'shooter-dont',
        character: 'shooter',
        side: 'dont',
        dollars: SHOOTER_RED,
        columns: [['red']],
        anchor: { x: SHOOTER_DONT_X, y: SHOOTER_DONT_Y },
      }),
      expect.objectContaining({
        id: 'shooter-all',
        character: 'shooter',
        side: 'all',
        dollars: SHOOTER_RED,
        columns: [['red']],
        anchor: { x: SHOOTER_ALL_X, y: SHOOTER_ALL_Y },
      }),
    ])
  })

  it('takes the Make \'Em All chip down after it pays', () => {
    const bets = shooterLineBets(false)
    expect(bets.map((bet) => bet.id)).toEqual(['shooter-pass', 'shooter-dont'])
  })

  it('loses Make \'Em All on a come-out 7 and refills it', () => {
    const next = applyShooterRoll(emptyShooterBook(), null, 7, emptyBonusHand(), PRICE)
    expect(next.allWorking).toBe(true)
    expect(next.pnl.usd).toBe(-SHOOTER_RED)
    expect(next.pnl.btc).toBeCloseTo(-SHOOTER_RED / PRICE)
    expect(next.pnl.shown).toBe(true)
  })

  it('loses only Pass on a come-out 12', () => {
    const next = applyShooterRoll(emptyShooterBook(), null, 12, emptyBonusHand(), PRICE)
    expect(next.pnl.usd).toBe(-SHOOTER_RED)
    expect(next.allWorking).toBe(true)
  })

  it('books nothing when the point is set', () => {
    const book = emptyShooterBook()
    expect(applyShooterRoll(book, null, 6, emptyBonusHand(), PRICE)).toBe(book)
  })

  it('washes the line on a 7-out and loses Make \'Em All', () => {
    const next = applyShooterRoll(emptyShooterBook(), 8, 7, emptyBonusHand(), PRICE)
    expect(next.pnl.usd).toBe(-SHOOTER_RED)
    expect(next.allWorking).toBe(true)
  })

  it('pays 150 to 1 and takes Make \'Em All down', () => {
    const hand = almostAll()
    const next = applyShooterRoll(emptyShooterBook(), 4, 6, hand, PRICE)
    expect(next.pnl.usd).toBe(SHOOTER_RED * BONUS_ALL_PAYS)
    expect(next.pnl.btc).toBeCloseTo((SHOOTER_RED * BONUS_ALL_PAYS) / PRICE)
    expect(next.allWorking).toBe(false)
    expect(formatMakeEmAll(false)).toBe("Make 'Em All")
    expect(formatMakeEmAll(false, false)).toBeNull()
  })

  it('does not charge the ending 7 after Make \'Em All has paid', () => {
    const hand = almostAll()
    const won = applyShooterRoll(emptyShooterBook(), 4, 6, hand, PRICE)
    const ended = applyBonusRoll(hand, 6).hand
    const next = applyShooterRoll(won, 4, 7, ended, PRICE)
    expect(next.pnl.usd).toBe(won.pnl.usd)
    expect(next.pnl.btc).toBe(won.pnl.btc)
    expect(next.allWorking).toBe(true)
    expect(formatMakeEmAll(true)).toBe(`Make 'Em All $2.5M`)
  })

  it('shows All Tall and All Small with the same stake wording', () => {
    expect(formatAllTall(0)).toBe('All Tall')
    expect(formatAllSmall(0)).toBe('All Small')
    expect(formatAllTall(SHOOTER_RED)).toBe('All Tall $2.5M')
    expect(formatAllSmall(5_000_000)).toBe('All Small $5M')
    expect(formatBonusStakeLabel('All Tall', 0, false)).toBeNull()
    expect(formatBonusStakeLabel('All Small', 0, false)).toBeNull()
    expect(formatBonusStakeLabel('All Tall', SHOOTER_RED, false)).toBe('All Tall $2.5M')
    expect(formatBonusStakeLabel('All Small', 5_000_000, false)).toBe('All Small $5M')
  })

  it('sums chips on the All Tall and All Small squares', () => {
    const chip = (id: string, side: ChipBet['side'], dollars: number, x: number, y: number): ChipBet => ({
      id,
      character: 'shooter',
      side,
      dollars,
      columns: [['red']],
      anchor: { x, y },
    })
    const stakes = bonusStakeDollars([
      chip('tall', 'pass', 2_500_000, BONUS_TALL_X, BONUS_TALL_Y),
      chip('small', 'small', 1_000_000, 10, 10),
      chip('all', 'all', SHOOTER_RED, 990, 980),
      chip('pass', 'pass', 500_000, 500, 1895),
    ])
    expect(stakes).toEqual({ tall: 2_500_000, small: 1_000_000 })
    expect(bonusStakeDollars([chip('small-square', 'pass', 3_000_000, BONUS_SMALL_X, BONUS_SMALL_Y)])).toEqual({
      tall: 0,
      small: 3_000_000,
    })
  })

  it('does not pay Small or Tall alone', () => {
    let hand = emptyBonusHand()
    let book = emptyShooterBook()
    for (const total of [4, 2, 3, 5]) {
      book = applyShooterRoll(book, 4, total, hand, PRICE)
      hand = applyBonusRoll(hand, total).hand
    }
    const next = applyShooterRoll(book, 4, 6, hand, PRICE)
    expect(next.pnl.shown).toBe(false)
    expect(next.allWorking).toBe(true)
  })

  it('reloads the shooter total from localStorage after a refresh', () => {
    const memory = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memory.set(key, value)
      },
      removeItem: (key: string) => {
        memory.delete(key)
      },
      clear: () => memory.clear(),
      key: () => null,
      length: 0,
    })
    const book = applyShooterRoll(emptyShooterBook(), null, 12, emptyBonusHand(), PRICE)
    saveShooterBook(book)
    expect(loadShooterBook()).toEqual(book)
    memory.set('btc-craps.shooter', '{')
    expect(loadShooterBook()).toEqual(emptyShooterBook())
  })

  it('keeps the P/L prefix separate and colors only the figures', () => {
    const won = applyShooterRoll(emptyShooterBook(), null, 11, emptyBonusHand(), PRICE)
    expect(formatShooterPnl(won)).toBe('0 BTC $0 USD')
    expect(shooterFigureColor(won)).toBe('#ffffff')
    const lost = applyShooterRoll(emptyShooterBook(), null, 12, emptyBonusHand(), PRICE)
    expect(shooterFigureColor(lost)).toBe(PL_LOSS_COLOR)
    const paid = applyShooterRoll(emptyShooterBook(), 4, 6, almostAll(), PRICE)
    expect(shooterFigureColor(paid)).toBe(PL_PROFIT_COLOR)
    expect(formatShooterPnl(paid)).toBe('3.8k BTC $375M USD')
  })
})
