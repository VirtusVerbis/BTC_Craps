/** Whole-dollar craps payouts. Profit only; the stake coming back is separate. */

export const MAX_ODDS_TO_LINE = 100

const POINT_NUMBERS = [4, 5, 6, 8, 9, 10] as const

export type PointNumber = (typeof POINT_NUMBERS)[number]

export type RollOutcome = 'win' | 'lose' | 'push' | 'none'

export interface BetSettlement {
  outcome: RollOutcome
  /** Whole dollars at risk. A place bet keeps this amount while it is off on the come-out. */
  booked: number
  /** Dollars that were not a legal multiple, or odds above the 100x cap. */
  unbooked: number
  /** Positive on a win. A loss is the booked stake, negative. Push and no action are 0. */
  profit: number
  /** A winning place or line bet stays up. Odds come down once the point resolves. */
  staysUp: boolean
}

/** Stake multiple that pays a whole-dollar profit, and that profit per multiple. */
export interface WholeDollarPay {
  unit: number
  profit: number
}

/** Place 4/10 pay 9:5, 5/9 pay 7:5, 6/8 pay 7:6. */
export const PLACE_PAY: Record<PointNumber, WholeDollarPay> = {
  4: { unit: 5, profit: 9 },
  10: { unit: 5, profit: 9 },
  5: { unit: 5, profit: 7 },
  9: { unit: 5, profit: 7 },
  6: { unit: 6, profit: 7 },
  8: { unit: 6, profit: 7 },
}

/** Pass odds: 4/10 pay 2:1, 5/9 pay 3:2, 6/8 pay 6:5. */
export const TAKE_ODDS_PAY: Record<PointNumber, WholeDollarPay> = {
  4: { unit: 1, profit: 2 },
  10: { unit: 1, profit: 2 },
  5: { unit: 2, profit: 3 },
  9: { unit: 2, profit: 3 },
  6: { unit: 5, profit: 6 },
  8: { unit: 5, profit: 6 },
}

/** Don't odds: 4/10 pay 1:2, 5/9 pay 2:3, 6/8 pay 5:6. */
export const LAY_ODDS_PAY: Record<PointNumber, WholeDollarPay> = {
  4: { unit: 2, profit: 1 },
  10: { unit: 2, profit: 1 },
  5: { unit: 3, profit: 2 },
  9: { unit: 3, profit: 2 },
  6: { unit: 6, profit: 5 },
  8: { unit: 6, profit: 5 },
}

const LINE_PAY: WholeDollarPay = { unit: 1, profit: 1 }

export const isPointNumber = (value: number): value is PointNumber =>
  (POINT_NUMBERS as readonly number[]).includes(value)

const nearestCent = (value: number): number => Math.round(value * 100) / 100

/**
 * Book the largest whole-dollar multiple of `unit`.
 * A $4 place-6 wager books nothing. $14 on place 6 books $12 and pays $14 when it hits.
 * The unbooked remainder is rounded to the cent.
 */
export const bookDollars = (stake: number, unit: number): { booked: number; unbooked: number } => {
  if (!(stake > 0) || !(unit >= 1)) return { booked: 0, unbooked: stake > 0 ? nearestCent(stake) : 0 }
  const whole = Math.floor(stake + 1e-6)
  const booked = Math.floor(whole / unit) * unit
  return { booked, unbooked: nearestCent(stake - booked) }
}

/** 100 times the whole dollars actually on the line. */
export const maxOddsDollars = (lineStake: number): number => bookDollars(lineStake, LINE_PAY.unit).booked * MAX_ODDS_TO_LINE

const noBet = (stake: number): BetSettlement => ({
  outcome: 'none',
  booked: 0,
  unbooked: stake > 0 ? nearestCent(stake) : 0,
  profit: 0,
  staysUp: false,
})

const resting = (booked: number, unbooked: number): BetSettlement => ({
  outcome: 'none',
  booked,
  unbooked,
  profit: 0,
  staysUp: booked > 0,
})

const wholeProfit = (booked: number, pay: WholeDollarPay): number => (booked / pay.unit) * pay.profit

const settleBooked = (
  booked: number,
  unbooked: number,
  won: boolean,
  lostBet: boolean,
  push: boolean,
  staysUpOnWin: boolean,
  pay: WholeDollarPay,
): BetSettlement => {
  if (!(booked > 0)) return noBet(unbooked)
  if (push) return { outcome: 'push', booked, unbooked, profit: 0, staysUp: true }
  if (won) {
    return { outcome: 'win', booked, unbooked, profit: wholeProfit(booked, pay), staysUp: staysUpOnWin }
  }
  if (lostBet) return { outcome: 'lose', booked, unbooked, profit: -booked, staysUp: false }
  return resting(booked, unbooked)
}

const settleLine = (
  point: number | null,
  stake: number,
  won: boolean,
  lostBet: boolean,
  push: boolean,
): BetSettlement => {
  const { booked, unbooked } = bookDollars(stake, LINE_PAY.unit)
  if (point != null && !isPointNumber(point)) return resting(booked, unbooked)
  return settleBooked(booked, unbooked, won, lostBet, push, true, LINE_PAY)
}

/** Pass wins on a come-out 7 or 11, loses on 2, 3, or 12, then wins if the point returns before a 7. */
export const settlePassLine = (point: number | null, total: number, stake: number): BetSettlement => {
  const comeOut = point == null
  const pointOn = point != null && isPointNumber(point)
  return settleLine(
    point,
    stake,
    (comeOut && (total === 7 || total === 11)) || (pointOn && total === point),
    (comeOut && (total === 2 || total === 3 || total === 12)) || (pointOn && total === 7),
    false,
  )
}

/** Don't Pass wins on a come-out 2 or 3, pushes on 12, loses on 7 or 11, then wins if a 7 beats the point. */
export const settleDontPass = (point: number | null, total: number, stake: number): BetSettlement => {
  const comeOut = point == null
  const pointOn = point != null && isPointNumber(point)
  return settleLine(
    point,
    stake,
    (comeOut && (total === 2 || total === 3)) || (pointOn && total === 7),
    (comeOut && (total === 7 || total === 11)) || (pointOn && total === point),
    comeOut && total === 12,
  )
}

/**
 * Odds ride behind a line bet only after a point is set.
 * The booked amount cannot exceed 100 times the whole-dollar line stake.
 */
const settleOdds = (
  point: number | null,
  total: number,
  lineStake: number,
  oddsStake: number,
  payFor: Record<PointNumber, WholeDollarPay>,
  won: boolean,
  lostBet: boolean,
): BetSettlement => {
  if (point == null || !isPointNumber(point)) return noBet(oddsStake)
  const pay = payFor[point]
  const offered = Math.min(Math.max(oddsStake, 0), maxOddsDollars(lineStake))
  const { booked, unbooked: belowUnit } = bookDollars(offered, pay.unit)
  const overCap = Math.max(oddsStake, 0) - offered
  const unbooked = nearestCent(belowUnit + overCap)
  const resolves = total === point || total === 7
  return settleBooked(booked, unbooked, resolves && won, resolves && lostBet, false, false, pay)
}

export const settlePassOdds = (
  point: number | null,
  total: number,
  lineStake: number,
  oddsStake: number,
): BetSettlement => settleOdds(point, total, lineStake, oddsStake, TAKE_ODDS_PAY, total === point, total === 7)

export const settleDontPassOdds = (
  point: number | null,
  total: number,
  lineStake: number,
  oddsStake: number,
): BetSettlement => settleOdds(point, total, lineStake, oddsStake, LAY_ODDS_PAY, total === 7, total === point)

/** Hard 4 and 10 pay 7:1. Hard 6 and 8 pay 9:1. */
export const HARD_NUMBERS = [4, 6, 8, 10] as const

export type HardNumber = (typeof HARD_NUMBERS)[number]

export const HARD_PAY: Record<HardNumber, WholeDollarPay> = {
  4: { unit: 1, profit: 7 },
  10: { unit: 1, profit: 7 },
  6: { unit: 1, profit: 9 },
  8: { unit: 1, profit: 9 },
}

export const isHardNumber = (value: number): value is HardNumber =>
  (HARD_NUMBERS as readonly number[]).includes(value)

/** Both dice show the same face. Hard 6 is 3 and 3, hard 8 is 4 and 4. */
export const isHardRoll = (dieA: number | null, dieB: number | null): boolean =>
  dieA != null && dieB != null && dieA === dieB && dieA >= 1 && dieA <= 6

/**
 * Hard ways win only on the pair and stay up. The easy way of that number loses, and any 7 loses.
 * Any other roll is no action. Off on the come-out.
 */
export const settleHard = (
  point: number | null,
  total: number,
  number: number,
  stake: number,
  hard: boolean,
): BetSettlement => {
  if (!isHardNumber(number)) return noBet(stake)
  const { booked, unbooked } = bookDollars(stake, HARD_PAY[number].unit)
  if (point == null || !isPointNumber(point)) return resting(booked, unbooked)
  const hit = total === number
  return settleBooked(booked, unbooked, hit && hard, total === 7 || (hit && !hard), false, true, HARD_PAY[number])
}

/**
 * Place bets are off on the come-out. After a point, the number pays if it rolls before a 7.
 * A winner stays on that number.
 */
export const settlePlace = (
  point: number | null,
  total: number,
  number: number,
  stake: number,
): BetSettlement => {
  if (!isPointNumber(number)) return noBet(stake)
  const { booked, unbooked } = bookDollars(stake, PLACE_PAY[number].unit)
  if (point == null || !isPointNumber(point)) return resting(booked, unbooked)
  return settleBooked(booked, unbooked, total === number, total === 7, false, true, PLACE_PAY[number])
}

const FIELD_PAY: WholeDollarPay = { unit: 1, profit: 1 }
const FIELD_TRIPLE_PAY: WholeDollarPay = { unit: 1, profit: 3 }
const FIELD_WINNERS = new Set([2, 3, 4, 9, 10, 11, 12])

/**
 * One roll on the come-out and while a point is up.
 * Wins on 2, 3, 4, 9, 10, 11, and 12. Loses on 5, 6, 7, and 8.
 * 2 and 12 pay 3:1. The other winners pay 1:1.
 */
export const settleField = (_point: number | null, total: number, stake: number): BetSettlement => {
  const { booked, unbooked } = bookDollars(stake, FIELD_PAY.unit)
  const triple = total === 2 || total === 12
  return settleBooked(
    booked,
    unbooked,
    FIELD_WINNERS.has(total),
    !FIELD_WINNERS.has(total),
    false,
    false,
    triple ? FIELD_TRIPLE_PAY : FIELD_PAY,
  )
}

/** Horn 2 and 12 pay 30:1. Horn 3 and 11 pay 15:1. */
export const HORN_NUMBERS = [2, 3, 11, 12] as const

export type HornNumber = (typeof HORN_NUMBERS)[number]

export const HORN_PAY: Record<HornNumber, WholeDollarPay> = {
  2: { unit: 1, profit: 30 },
  12: { unit: 1, profit: 30 },
  3: { unit: 1, profit: 15 },
  11: { unit: 1, profit: 15 },
}

export const isHornNumber = (value: number): value is HornNumber =>
  (HORN_NUMBERS as readonly number[]).includes(value)

/**
 * One roll on a single horn number. Working on the come-out and while a point is up.
 * The stake comes down whether it wins or loses.
 */
export const settleHorn = (total: number, number: number, stake: number): BetSettlement => {
  if (!isHornNumber(number)) return noBet(stake)
  const { booked, unbooked } = bookDollars(stake, HORN_PAY[number].unit)
  const hit = total === number
  return settleBooked(booked, unbooked, hit, !hit, false, false, HORN_PAY[number])
}

/** Five percent of a winning lay's profit. Charged only when the lay wins. */
export const LAY_WIN_COMMISSION = 0.05

/**
 * A lay wins when a 7 beats the number, and loses when the number rolls.
 * True odds, then 5% of the profit. Off on the come-out. Don't-pass odds stay free.
 */
export const settleLay = (
  point: number | null,
  total: number,
  number: number,
  stake: number,
): BetSettlement => {
  if (!isPointNumber(number)) return noBet(stake)
  const { booked, unbooked } = bookDollars(stake, LAY_ODDS_PAY[number].unit)
  if (point == null || !isPointNumber(point)) return resting(booked, unbooked)
  const settled = settleBooked(booked, unbooked, total === 7, total === number, false, false, LAY_ODDS_PAY[number])
  if (settled.outcome !== 'win') return settled
  const vig = nearestCent(settled.profit * LAY_WIN_COMMISSION)
  return { ...settled, profit: nearestCent(settled.profit - vig) }
}

const ANY_SEVEN_PAY: WholeDollarPay = { unit: 1, profit: 4 }
const ANY_CRAPS_PAY: WholeDollarPay = { unit: 1, profit: 7 }
const ELEVEN_PAY: WholeDollarPay = { unit: 1, profit: 15 }
const CRAPS_TOTALS = new Set([2, 3, 12])

const settleOneRoll = (_total: number, stake: number, hit: boolean, pay: WholeDollarPay): BetSettlement => {
  const { booked, unbooked } = bookDollars(stake, pay.unit)
  return settleBooked(booked, unbooked, hit, !hit, false, false, pay)
}

/** One roll. Any 7 pays 4:1. Working on the come-out and while a point is up. */
export const settleAnySeven = (total: number, stake: number): BetSettlement =>
  settleOneRoll(total, stake, total === 7, ANY_SEVEN_PAY)

/** One roll. 2, 3, or 12 pays 7:1. */
export const settleAnyCraps = (total: number, stake: number): BetSettlement =>
  settleOneRoll(total, stake, CRAPS_TOTALS.has(total), ANY_CRAPS_PAY)

/** One roll. Eleven pays 15:1. */
export const settleEleven = (total: number, stake: number): BetSettlement =>
  settleOneRoll(total, stake, total === 11, ELEVEN_PAY)

/**
 * Four equal units on 2, 3, 11, and 12.
 * A 2 or 12 nets 27 units. A 3 or 11 nets 12. Anything else loses the stake.
 */
export const settleHornBox = (total: number, stake: number): BetSettlement => {
  const { booked, unbooked } = bookDollars(stake, 4)
  if (!(booked > 0)) return noBet(unbooked)
  const unit = booked / 4
  if (total === 2 || total === 12) {
    return { outcome: 'win', booked, unbooked, profit: unit * 27, staysUp: false }
  }
  if (total === 3 || total === 11) {
    return { outcome: 'win', booked, unbooked, profit: unit * 12, staysUp: false }
  }
  return { outcome: 'lose', booked, unbooked, profit: -booked, staysUp: false }
}

export interface TravelSettlement extends BetSettlement {
  /** The point number a flat come or don't-come bet moved onto. */
  traveledTo: PointNumber | null
}

const travel = (settled: BetSettlement, traveledTo: PointNumber | null = null): TravelSettlement => ({
  ...settled,
  traveledTo,
})

/**
 * A flat come bet's next roll wins on 7 or 11, loses on 2, 3, or 12, and otherwise
 * moves to that number. On a number it wins if the number returns before a 7.
 * A resolved come bet comes down.
 */
export const settleCome = (comeNumber: number | null, total: number, stake: number): TravelSettlement => {
  const { booked, unbooked } = bookDollars(stake, LINE_PAY.unit)
  if (comeNumber == null) {
    if (total === 7 || total === 11) return travel(settleBooked(booked, unbooked, true, false, false, false, LINE_PAY))
    if (total === 2 || total === 3 || total === 12) {
      return travel(settleBooked(booked, unbooked, false, true, false, false, LINE_PAY))
    }
    if (isPointNumber(total)) return travel(resting(booked, unbooked), total)
    return travel(resting(booked, unbooked))
  }
  if (!isPointNumber(comeNumber)) return travel(noBet(stake))
  return travel(settleBooked(
    booked,
    unbooked,
    total === comeNumber,
    total === 7,
    false,
    false,
    LINE_PAY,
  ))
}

/**
 * A flat don't-come bet wins on 2 or 3, loses on 7 or 11, and pushes on 12.
 * A point number moves it behind that number, where a 7 wins and the number loses.
 */
export const settleDontCome = (comeNumber: number | null, total: number, stake: number): TravelSettlement => {
  const { booked, unbooked } = bookDollars(stake, LINE_PAY.unit)
  if (comeNumber == null) {
    if (total === 2 || total === 3) return travel(settleBooked(booked, unbooked, true, false, false, false, LINE_PAY))
    if (total === 12) return travel(settleBooked(booked, unbooked, false, false, true, true, LINE_PAY))
    if (total === 7 || total === 11) return travel(settleBooked(booked, unbooked, false, true, false, false, LINE_PAY))
    if (isPointNumber(total)) return travel(resting(booked, unbooked), total)
    return travel(resting(booked, unbooked))
  }
  if (!isPointNumber(comeNumber)) return travel(noBet(stake))
  return travel(settleBooked(
    booked,
    unbooked,
    total === 7,
    total === comeNumber,
    false,
    false,
    LINE_PAY,
  ))
}

/**
 * Come odds are off on the come-out: a 7 or the come number returns them.
 * While a point is up they pay true odds and come down when that come bet resolves.
 */
export const settleComeOdds = (
  comeNumber: number | null,
  tablePoint: number | null,
  total: number,
  flatStake: number,
  oddsStake: number,
): BetSettlement => {
  if (comeNumber == null || !isPointNumber(comeNumber)) return noBet(oddsStake)
  if (tablePoint == null || !isPointNumber(tablePoint)) {
    const offered = Math.min(Math.max(oddsStake, 0), maxOddsDollars(flatStake))
    const { booked, unbooked: belowUnit } = bookDollars(offered, TAKE_ODDS_PAY[comeNumber].unit)
    const unbooked = nearestCent(belowUnit + Math.max(oddsStake, 0) - offered)
    if (total === 7 || total === comeNumber) {
      return { outcome: 'push', booked, unbooked, profit: 0, staysUp: false }
    }
    return resting(booked, unbooked)
  }
  return settleOdds(
    comeNumber,
    total,
    flatStake,
    oddsStake,
    TAKE_ODDS_PAY,
    total === comeNumber,
    total === 7,
  )
}

/** Don't-come odds stay working on the come-out and pay true odds. */
export const settleDontComeOdds = (
  comeNumber: number | null,
  total: number,
  flatStake: number,
  oddsStake: number,
): BetSettlement => {
  if (comeNumber == null || !isPointNumber(comeNumber)) return noBet(oddsStake)
  return settleOdds(comeNumber, total, flatStake, oddsStake, LAY_ODDS_PAY, total === 7, total === comeNumber)
}
