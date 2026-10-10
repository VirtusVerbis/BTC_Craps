import { describe, expect, it } from 'vitest'
import {
  LAY_ODDS_PAY,
  PLACE_PAY,
  TAKE_ODDS_PAY,
  bookDollars,
  maxOddsDollars,
  settleDontPass,
  settleDontPassOdds,
  HARD_PAY,
  isHardRoll,
  settleField,
  settleHard,
  settleLay,
  settlePassLine,
  settlePassOdds,
  settlePlace,
  type PointNumber,
} from './crapsPayouts'

const POINTS: readonly PointNumber[] = [4, 5, 6, 8, 9, 10]

describe('whole-dollar booking', () => {
  it('books a pass line stake down to the whole dollar', () => {
    expect(bookDollars(10.9, 1)).toEqual({ booked: 10, unbooked: 0.9 })
  })

  it('books place 6 in multiples of $6 and place 4 in multiples of $5', () => {
    expect(bookDollars(14, PLACE_PAY[6].unit)).toEqual({ booked: 12, unbooked: 2 })
    expect(bookDollars(9, PLACE_PAY[4].unit)).toEqual({ booked: 5, unbooked: 4 })
    expect(bookDollars(4, PLACE_PAY[6].unit)).toEqual({ booked: 0, unbooked: 4 })
  })

  it('caps odds at 100 times the whole-dollar line', () => {
    expect(maxOddsDollars(10)).toBe(1_000)
    expect(maxOddsDollars(10.9)).toBe(1_000)
    expect(maxOddsDollars(0.4)).toBe(0)
  })
})

describe('pass line', () => {
  it('pays 1:1 on a come-out 7 or 11 and leaves the bet up', () => {
    expect(settlePassLine(null, 7, 25)).toMatchObject({ outcome: 'win', profit: 25, staysUp: true })
    expect(settlePassLine(null, 11, 25)).toMatchObject({ outcome: 'win', profit: 25, staysUp: true })
  })

  it('loses a come-out 2, 3, or 12', () => {
    for (const total of [2, 3, 12]) {
      expect(settlePassLine(null, total, 25)).toMatchObject({ outcome: 'lose', profit: -25, staysUp: false })
    }
  })

  it('sets a point without paying', () => {
    for (const total of POINTS) {
      expect(settlePassLine(null, total, 25)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 25 })
    }
  })

  it('pays 1:1 when the point returns and loses on a seven out', () => {
    expect(settlePassLine(8, 8, 40)).toMatchObject({ outcome: 'win', profit: 40, staysUp: true })
    expect(settlePassLine(8, 7, 40)).toMatchObject({ outcome: 'lose', profit: -40, staysUp: false })
    expect(settlePassLine(8, 6, 40)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true })
  })
})

describe("don't pass", () => {
  it('pays 1:1 on a come-out 2 or 3', () => {
    expect(settleDontPass(null, 2, 15)).toMatchObject({ outcome: 'win', profit: 15, staysUp: true })
    expect(settleDontPass(null, 3, 15)).toMatchObject({ outcome: 'win', profit: 15, staysUp: true })
  })

  it('pushes a come-out 12 and loses a come-out 7 or 11', () => {
    expect(settleDontPass(null, 12, 15)).toEqual({
      outcome: 'push',
      booked: 15,
      unbooked: 0,
      profit: 0,
      staysUp: true,
    })
    expect(settleDontPass(null, 7, 15)).toMatchObject({ outcome: 'lose', profit: -15, staysUp: false })
    expect(settleDontPass(null, 11, 15)).toMatchObject({ outcome: 'lose', profit: -15, staysUp: false })
  })

  it('wins if a 7 beats the point and loses if the point returns', () => {
    expect(settleDontPass(5, 7, 15)).toMatchObject({ outcome: 'win', profit: 15, staysUp: true })
    expect(settleDontPass(5, 5, 15)).toMatchObject({ outcome: 'lose', profit: -15, staysUp: false })
    expect(settleDontPass(5, 11, 15)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true })
  })
})

describe('place bets', () => {
  it('stays off through a come-out, including a 7 and the place number', () => {
    expect(settlePlace(null, 7, 6, 12)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 12 })
    expect(settlePlace(null, 6, 6, 12)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true })
  })

  it('pays the place price and leaves the bet up', () => {
    expect(settlePlace(9, 4, 4, 5)).toMatchObject({ outcome: 'win', profit: 9, staysUp: true, booked: 5 })
    expect(settlePlace(9, 10, 10, 10)).toMatchObject({ outcome: 'win', profit: 18, staysUp: true })
    expect(settlePlace(4, 5, 5, 5)).toMatchObject({ outcome: 'win', profit: 7, staysUp: true })
    expect(settlePlace(4, 9, 9, 10)).toMatchObject({ outcome: 'win', profit: 14, staysUp: true })
    expect(settlePlace(10, 6, 6, 6)).toMatchObject({ outcome: 'win', profit: 7, staysUp: true })
    expect(settlePlace(10, 8, 8, 12)).toMatchObject({ outcome: 'win', profit: 14, staysUp: true })
  })

  it('loses every working place bet on a seven out', () => {
    expect(settlePlace(6, 7, 8, 18)).toMatchObject({ outcome: 'lose', profit: -18, staysUp: false, unbooked: 0 })
    expect(settlePlace(6, 7, 4, 14)).toMatchObject({ outcome: 'lose', profit: -10, staysUp: false, unbooked: 4 })
  })

  it('ignores a roll of a different number', () => {
    expect(settlePlace(6, 9, 8, 12)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 12 })
  })

  it('drops a stake below one payout unit', () => {
    expect(settlePlace(8, 8, 8, 5)).toMatchObject({ outcome: 'none', booked: 0, profit: 0, staysUp: false })
  })
})

describe('field', () => {
  it('pays even money on 3, 4, 9, 10, and 11, and triple on 2 and 12', () => {
    expect(settleField(6, 4, 10)).toMatchObject({ outcome: 'win', profit: 10, staysUp: false, booked: 10 })
    expect(settleField(6, 9, 10)).toMatchObject({ outcome: 'win', profit: 10, staysUp: false })
    expect(settleField(6, 11, 10)).toMatchObject({ outcome: 'win', profit: 10, staysUp: false })
    expect(settleField(6, 2, 10)).toMatchObject({ outcome: 'win', profit: 30, staysUp: false })
    expect(settleField(6, 12, 10)).toMatchObject({ outcome: 'win', profit: 30, staysUp: false })
  })

  it('loses on 5, 6, 7, and 8', () => {
    for (const total of [5, 6, 7, 8]) {
      expect(settleField(9, total, 10)).toMatchObject({ outcome: 'lose', profit: -10, staysUp: false })
    }
  })

  it('is off on the come-out', () => {
    expect(settleField(null, 2, 10)).toMatchObject({ outcome: 'none', booked: 0, profit: 0, staysUp: false })
  })
})

describe('lay bets', () => {
  it('pays true odds when a 7 beats the number and comes down', () => {
    expect(settleLay(6, 7, 4, 12_500_000)).toMatchObject({ outcome: 'win', profit: 6_250_000, staysUp: false })
    expect(settleLay(6, 7, 10, 2)).toMatchObject({ outcome: 'win', profit: 1, booked: 2 })
    expect(settleLay(6, 7, 5, 13_500_000)).toMatchObject({ outcome: 'win', profit: 9_000_000, booked: 13_500_000 })
    expect(settleLay(6, 7, 9, 3)).toMatchObject({ outcome: 'win', profit: 2, booked: 3 })
    expect(settleLay(6, 7, 6, 13_500_000)).toMatchObject({ outcome: 'win', profit: 11_250_000, booked: 13_500_000 })
    expect(settleLay(6, 7, 8, 6)).toMatchObject({ outcome: 'win', profit: 5, booked: 6 })
  })

  it('loses when its number rolls', () => {
    expect(settleLay(6, 4, 4, 10)).toMatchObject({ outcome: 'lose', profit: -10, staysUp: false })
    expect(settleLay(6, 9, 4, 10)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 10 })
  })

  it('rests off on the come-out', () => {
    expect(settleLay(null, 7, 4, 10)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 10 })
  })
})

describe('odds', () => {
  it('pays true odds on a made point and comes down', () => {
    expect(settlePassOdds(4, 4, 10, 25)).toMatchObject({ outcome: 'win', profit: 50, staysUp: false, booked: 25 })
    expect(settlePassOdds(10, 10, 10, 25)).toMatchObject({ outcome: 'win', profit: 50, booked: 25 })
    expect(settlePassOdds(5, 5, 10, 10)).toMatchObject({ outcome: 'win', profit: 15, booked: 10 })
    expect(settlePassOdds(9, 9, 10, 10)).toMatchObject({ outcome: 'win', profit: 15, booked: 10 })
    expect(settlePassOdds(6, 6, 10, 10)).toMatchObject({ outcome: 'win', profit: 12, booked: 10 })
    expect(settlePassOdds(8, 8, 10, 10)).toMatchObject({ outcome: 'win', profit: 12, booked: 10 })
    expect(TAKE_ODDS_PAY[6]).toEqual({ unit: 5, profit: 6 })
  })

  it('loses when the pass line sevens out', () => {
    expect(settlePassOdds(6, 7, 10, 10)).toMatchObject({ outcome: 'lose', profit: -10, staysUp: false })
    expect(settlePassOdds(6, 9, 10, 10)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 10 })
  })

  it('pays lay odds when a 7 beats the point', () => {
    expect(settleDontPassOdds(4, 7, 10, 20)).toMatchObject({ outcome: 'win', profit: 10, staysUp: false, booked: 20 })
    expect(settleDontPassOdds(10, 7, 10, 20)).toMatchObject({ outcome: 'win', profit: 10, booked: 20 })
    expect(settleDontPassOdds(5, 7, 10, 9)).toMatchObject({ outcome: 'win', profit: 6, booked: 9 })
    expect(settleDontPassOdds(9, 7, 10, 9)).toMatchObject({ outcome: 'win', profit: 6, booked: 9 })
    expect(settleDontPassOdds(6, 7, 10, 12)).toMatchObject({ outcome: 'win', profit: 10, booked: 12 })
    expect(settleDontPassOdds(8, 7, 10, 12)).toMatchObject({ outcome: 'win', profit: 10, booked: 12 })
    expect(LAY_ODDS_PAY[8]).toEqual({ unit: 6, profit: 5 })
  })

  it('loses lay odds when the point returns', () => {
    expect(settleDontPassOdds(9, 9, 10, 9)).toMatchObject({ outcome: 'lose', profit: -9, staysUp: false })
  })

  it('does not pay odds on the come-out', () => {
    expect(settlePassOdds(null, 7, 10, 1_000)).toMatchObject({
      outcome: 'none',
      booked: 0,
      profit: 0,
      staysUp: false,
      unbooked: 1_000,
    })
    expect(settleDontPassOdds(null, 7, 10, 20)).toMatchObject({ outcome: 'none', booked: 0, profit: 0 })
  })

  it('pays a hard way only on the pair', () => {
    expect(HARD_PAY[4]).toEqual({ unit: 1, profit: 7 })
    expect(HARD_PAY[10]).toEqual({ unit: 1, profit: 7 })
    expect(HARD_PAY[6]).toEqual({ unit: 1, profit: 9 })
    expect(HARD_PAY[8]).toEqual({ unit: 1, profit: 9 })
    expect(isHardRoll(3, 3)).toBe(true)
    expect(isHardRoll(4, 2)).toBe(false)
    expect(isHardRoll(null, 3)).toBe(false)

    expect(settleHard(5, 6, 6, 5, true)).toMatchObject({ outcome: 'win', profit: 45, staysUp: true, booked: 5 })
    expect(settleHard(5, 8, 8, 5, true)).toMatchObject({ outcome: 'win', profit: 45, staysUp: true })
    expect(settleHard(5, 4, 4, 5, true)).toMatchObject({ outcome: 'win', profit: 35, staysUp: true })
    expect(settleHard(5, 10, 10, 5, true)).toMatchObject({ outcome: 'win', profit: 35, staysUp: true })
    expect(settleHard(5, 6, 6, 5, false)).toMatchObject({ outcome: 'lose', profit: -5, staysUp: false })
    expect(settleHard(5, 7, 6, 5, false)).toMatchObject({ outcome: 'lose', profit: -5, staysUp: false })
    expect(settleHard(5, 8, 6, 5, true)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 5 })
    expect(settleHard(null, 6, 6, 5, true)).toMatchObject({ outcome: 'none', profit: 0, staysUp: true, booked: 5 })
    expect(settleHard(5, 6, 5, 5, true)).toMatchObject({ outcome: 'none', booked: 0, profit: 0, staysUp: false })
  })

  it('books at most 100x the line and only a legal odds multiple', () => {
    expect(settlePassOdds(4, 4, 10.9, 5_000)).toMatchObject({
      outcome: 'win',
      booked: 1_000,
      unbooked: 4_000,
      profit: 2_000,
    })
    expect(settlePassOdds(6, 6, 10, 100)).toMatchObject({ booked: 100, profit: 120, unbooked: 0 })
    expect(settlePassOdds(6, 6, 10, 104)).toMatchObject({ booked: 100, profit: 120, unbooked: 4 })
    expect(settleDontPassOdds(6, 7, 1, 100)).toMatchObject({ booked: 96, profit: 80, unbooked: 4 })
    expect(settlePassOdds(8, 8, 0, 50)).toMatchObject({ outcome: 'none', booked: 0, profit: 0, unbooked: 50 })
  })
})
