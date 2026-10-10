import { BONUS_ALL_PAYS } from './bonusConstants'
import { applyBonusRoll, emptyBonusHand, type BonusHand } from './bonusCraps'
import { BONUS_FIELD_SIZE_PX, BONUS_SMALL_X, BONUS_SMALL_Y, BONUS_TALL_X, BONUS_TALL_Y } from './bonusFieldConstants'
import {
  BONUS_STAKE_LABELS_ON,
  SHOOTER_ALL_X,
  SHOOTER_ALL_Y,
  SHOOTER_DONT_X,
  SHOOTER_DONT_Y,
  SHOOTER_ON,
  SHOOTER_PASS_X,
  SHOOTER_PASS_Y,
} from './characterBetConstants'
import { PROFILE_RED } from './characterProfiles'
import { PL_LOSS_COLOR, PL_PROFIT_COLOR } from './characterPnlConstants'
import type { ChipBet } from './chipBets'
import { formatLiqUsd } from './format'
import { formatPnlBtc } from './characterPnl'
import { settleDontPass, settlePassLine } from './crapsPayouts'

/** One red chip. The same unit the other profiles call a red. */
export const SHOOTER_RED = PROFILE_RED

export interface ShooterPnl {
  btc: number
  usd: number
  /** False until the first win or loss. */
  shown: boolean
}

export interface ShooterBook {
  /**
   * Make 'Em All is at risk. A win takes it down.
   * The 7 that ends that hand puts a new red up and does not charge again.
   */
  allWorking: boolean
  pnl: ShooterPnl
}

const emptyPnl = (): ShooterPnl => ({ btc: 0, usd: 0, shown: false })

export const emptyShooterBook = (): ShooterBook => ({
  allWorking: true,
  pnl: emptyPnl(),
})

const SHOOTER_KEY = 'btc-craps.shooter'

const isBook = (value: unknown): value is ShooterBook => {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  const pnl = row.pnl
  if (!pnl || typeof pnl !== 'object') return false
  const amount = pnl as Record<string, unknown>
  return (
    (row.allWorking === true || row.allWorking === false) &&
    typeof amount.btc === 'number' &&
    Number.isFinite(amount.btc) &&
    typeof amount.usd === 'number' &&
    Number.isFinite(amount.usd) &&
    (amount.shown === true || amount.shown === false)
  )
}

const parseShooter = (raw: string | null): ShooterBook | null => {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as unknown
    return isBook(value) ? value : null
  } catch {
    return null
  }
}

const safeLocalStorage = (): Storage | null => {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

export const loadShooterBook = (): ShooterBook => {
  const storage = safeLocalStorage()
  if (!storage) return emptyShooterBook()
  try {
    return parseShooter(storage.getItem(SHOOTER_KEY)) ?? emptyShooterBook()
  } catch {
    return emptyShooterBook()
  }
}

export const saveShooterBook = (book: ShooterBook): void => {
  const storage = safeLocalStorage()
  if (!storage) return
  try {
    storage.setItem(SHOOTER_KEY, JSON.stringify(book))
  } catch {
    // Private mode or a full quota.
  }
}

const redChip = (id: string, side: 'pass' | 'dont' | 'all', x: number, y: number, label: string): ChipBet => ({
  id,
  character: 'shooter',
  side,
  dollars: SHOOTER_RED,
  columns: [['red']],
  anchor: { x, y },
  guide: { label, color: '#ffffff' },
})

/**
 * Pass and Don't Pass stay up. Make 'Em All is one red on its square while the bet is working,
 * and comes off the felt after it pays.
 */
export const shooterLineBets = (allWorking = true): ChipBet[] => {
  if (!SHOOTER_ON) return []
  const lines = [
    redChip('shooter-pass', 'pass', SHOOTER_PASS_X, SHOOTER_PASS_Y, 'SHOOTER_PASS'),
    redChip('shooter-dont', 'dont', SHOOTER_DONT_X, SHOOTER_DONT_Y, 'SHOOTER_DONT'),
  ]
  if (allWorking) lines.push(redChip('shooter-all', 'all', SHOOTER_ALL_X, SHOOTER_ALL_Y, 'SHOOTER_ALL'))
  return lines
}

/**
 * Line bets stay one red. A loss is refilled by leaving that red up.
 * Make 'Em All pays 150:1 and comes down. Any 7 while it is up loses the red and rebets it.
 * A 7 after a win only puts the next red up.
 */
export const applyShooterRoll = (
  book: ShooterBook,
  point: number | null,
  total: number,
  hand: BonusHand = emptyBonusHand(),
  price = 0,
): ShooterBook => {
  if (!SHOOTER_ON) return book
  const pass = settlePassLine(point, total, SHOOTER_RED).profit
  const dont = settleDontPass(point, total, SHOOTER_RED).profit
  let allProfit = 0
  let allWorking = book.allWorking
  if (total === 7) {
    if (allWorking) allProfit = -SHOOTER_RED
    else allWorking = true
  } else if (allWorking) {
    const step = applyBonusRoll(hand, total)
    if (!hand.wonAll && step.hand.wonAll) {
      allProfit = SHOOTER_RED * BONUS_ALL_PAYS
      allWorking = false
    }
  }
  const usdDelta = pass + dont + allProfit
  if (usdDelta === 0 && allWorking === book.allWorking) return book
  const pnl = usdDelta === 0
    ? book.pnl
    : {
        btc: book.pnl.btc + (price > 0 ? usdDelta / price : 0),
        usd: book.pnl.usd + usdDelta,
        shown: true,
      }
  return { allWorking, pnl }
}

/** White when flat. Green and red match the character P/L. */
export const shooterFigureColor = (book: ShooterBook): string => {
  const sign = book.pnl.btc !== 0 ? book.pnl.btc : book.pnl.usd
  if (sign > 0) return PL_PROFIT_COLOR
  if (sign < 0) return PL_LOSS_COLOR
  return '#ffffff'
}

/** `4 BTC $15M USD`. The P/L prefix is drawn separately so it stays white. */
export const formatShooterPnl = (book: ShooterBook): string =>
  `${formatPnlBtc(book.pnl.btc)} ${formatLiqUsd(Math.abs(book.pnl.usd))} USD`

/**
 * Stake while the bet is up. After a win the line stays off until the next red,
 * unless `showEmpty` keeps the name on screen for a visibility check.
 */
export const formatMakeEmAll = (working: boolean, showEmpty = BONUS_STAKE_LABELS_ON): string | null => {
  if (working) return `Make 'Em All ${formatLiqUsd(SHOOTER_RED)}`
  if (showEmpty) return "Make 'Em All"
  return null
}

export interface BonusStakes {
  tall: number
  small: number
}

export const emptyBonusStakes = (): BonusStakes => ({ tall: 0, small: 0 })

const onBonusSquare = (bet: ChipBet, x: number, y: number): boolean => {
  const anchor = bet.anchor
  if (!anchor) return false
  const reach = BONUS_FIELD_SIZE_PX / 2
  return Math.abs(anchor.x - x) <= reach && Math.abs(anchor.y - y) <= reach
}

/** Dollars sitting on the All Tall and All Small squares. */
export const bonusStakeDollars = (bets: readonly ChipBet[]): BonusStakes => {
  let tall = 0
  let small = 0
  for (const bet of bets) {
    const onTall = bet.side === 'tall' || onBonusSquare(bet, BONUS_TALL_X, BONUS_TALL_Y)
    const onSmall = bet.side === 'small' || onBonusSquare(bet, BONUS_SMALL_X, BONUS_SMALL_Y)
    if (onTall && !onSmall) tall += bet.dollars
    else if (onSmall && !onTall) small += bet.dollars
    else if (bet.side === 'tall') tall += bet.dollars
    else if (bet.side === 'small') small += bet.dollars
  }
  return { tall, small }
}

/**
 * The dollar amount appears only while something is bet on that square.
 * An empty square is hidden, unless `showEmpty` keeps the name on screen.
 */
export const formatBonusStakeLabel = (
  name: 'All Tall' | 'All Small',
  dollars: number,
  showEmpty = BONUS_STAKE_LABELS_ON,
): string | null => {
  if (Number.isFinite(dollars) && dollars > 0) return `${name} ${formatLiqUsd(dollars)}`
  if (showEmpty) return name
  return null
}

export const formatAllTall = (dollars: number): string | null => formatBonusStakeLabel('All Tall', dollars)

export const formatAllSmall = (dollars: number): string | null => formatBonusStakeLabel('All Small', dollars)
