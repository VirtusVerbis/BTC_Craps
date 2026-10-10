import { betDollars } from './chipBets'
import type { ChipCharacter } from './chipConstants'
import type { ProfileBet } from './characterProfiles'
import { PL_FLAT_COLOR, PL_LOSS_COLOR, PL_PROFIT_COLOR } from './characterPnlConstants'
import { settleDontPass, settleField, settleHard, settleLay, settlePassLine, settlePlace } from './crapsPayouts'

/** Left to right along the rack. */
export const PL_CHARACTERS: readonly ChipCharacter[] = ['wolf', 'oldLady', 'cat', 'oldMan']

export interface LineStake {
  pass: number
  dont: number
}

export interface CharacterStakePair {
  btc: LineStake
  usd: LineStake
}

export interface PnlAmount {
  btc: number
  /** Dollar value of `btc` at the price of the latest decision. Flat bitcoin is flat dollars. */
  usd: number
  /** False until this character's first win or loss. */
  shown: boolean
}

export type CharacterStakes = Record<ChipCharacter, CharacterStakePair>
export type CharacterPnlBook = Record<ChipCharacter, PnlAmount>

const emptyAmount = (): PnlAmount => ({ btc: 0, usd: 0, shown: false })

export const emptyCharacterPnl = (): CharacterPnlBook => ({
  wolf: emptyAmount(),
  oldLady: emptyAmount(),
  cat: emptyAmount(),
  oldMan: emptyAmount(),
})

/** Character totals. A refresh reads this back the same way the histogram reads its rolls. */
export const CHARACTER_PNL_KEY = 'btc-craps.character-pnl'

const isAmount = (value: unknown): value is PnlAmount => {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return (
    typeof row.btc === 'number' &&
    Number.isFinite(row.btc) &&
    typeof row.usd === 'number' &&
    Number.isFinite(row.usd) &&
    typeof row.shown === 'boolean'
  )
}

const parseCharacterPnl = (raw: string | null): CharacterPnlBook | null => {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const book = emptyCharacterPnl()
    for (const character of PL_CHARACTERS) {
      const amount = value[character]
      if (!isAmount(amount)) return null
      book[character] = amount
    }
    return book
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

/** Totals saved in this browser. A bad cache entry is dropped. */
export const readStoredPnl = (storage: Storage | null): CharacterPnlBook => {
  if (!storage) return emptyCharacterPnl()
  try {
    return parseCharacterPnl(storage.getItem(CHARACTER_PNL_KEY)) ?? emptyCharacterPnl()
  } catch {
    return emptyCharacterPnl()
  }
}

/** Writes the current totals. A full or blocked store leaves memory as the source of truth. */
export const writeStoredPnl = (storage: Storage | null, book: CharacterPnlBook): void => {
  if (!storage) return
  try {
    storage.setItem(CHARACTER_PNL_KEY, JSON.stringify(book))
  } catch {
    // Private mode or a full quota.
  }
}

const LEGACY_SESSION_KEY = 'btc-craps-character-pnl'

export const loadCharacterPnl = (): CharacterPnlBook => {
  const storage = safeLocalStorage()
  if (storage?.getItem(CHARACTER_PNL_KEY)) return readStoredPnl(storage)
  try {
    const legacy = parseCharacterPnl(globalThis.sessionStorage?.getItem(LEGACY_SESSION_KEY) ?? null)
    if (!legacy) return emptyCharacterPnl()
    writeStoredPnl(storage, legacy)
    return legacy
  } catch {
    return emptyCharacterPnl()
  }
}

export const saveCharacterPnl = (book: CharacterPnlBook): void => {
  writeStoredPnl(safeLocalStorage(), book)
}

/**
 * 1:1 net of the Pass stake and the Don't Pass stake.
 * A made point or come-out 7/11 is Pass minus Don't Pass.
 * A 7-out or come-out 2/3 is Don't Pass minus Pass.
 * Come-out 12 loses Pass and pushes Don't Pass. Setting a point pays nothing.
 * Odds are not included.
 */
export const lineDecisionPnl = (point: number | null, total: number, pass: number, dont: number): number =>
  settlePassLine(point, total, 1).profit * pass + settleDontPass(point, total, 1).profit * dont

/** Open-interest bets already on the felt. Pass uses the long share. Don't Pass uses the short share. */
export const characterStakes = (
  openInterestBtc: number,
  price: number,
  longPct: number,
  shortPct: number,
): CharacterStakes => {
  const usdNotional = openInterestBtc * price
  const stakes = {} as CharacterStakes
  for (const character of PL_CHARACTERS) {
    stakes[character] = {
      btc: {
        pass: betDollars(openInterestBtc, longPct, shortPct, character, 'pass'),
        dont: betDollars(openInterestBtc, longPct, shortPct, character, 'dont'),
      },
      usd: {
        pass: betDollars(usdNotional, longPct, shortPct, character, 'pass'),
        dont: betDollars(usdNotional, longPct, shortPct, character, 'dont'),
      },
    }
  }
  return stakes
}

/** Price implied by this character's dollar bet and bitcoin bet. */
const stakePrice = (stake: CharacterStakePair): number => {
  if (stake.btc.pass > 0) return stake.usd.pass / stake.btc.pass
  if (stake.btc.dont > 0) return stake.usd.dont / stake.btc.dont
  return 0
}

const profileProfit = (point: number | null, total: number, bet: ProfileBet, hard: boolean): number => {
  if (bet.role === 'field') return settleField(point, total, bet.dollars).profit
  if (bet.number == null) return 0
  if (bet.role === 'lay' || bet.role === 'point-lay') return settleLay(point, total, bet.number, bet.dollars).profit
  if (bet.role === 'hard') return settleHard(point, total, bet.number, bet.dollars, hard).profit
  return settlePlace(point, total, bet.number, bet.dollars).profit
}

/**
 * Add this roll's bitcoin result. USD is that bitcoin total at the current price,
 * so a later roll that gives the coins back shows 0 BTC and 0 USD together.
 * Profile stakes are already off the line, so the line uses what is still on Pass and Don't Pass.
 */
export const applyCharacterPnl = (
  book: CharacterPnlBook,
  point: number | null,
  total: number,
  stakes: CharacterStakes,
  profiles: readonly ProfileBet[] = [],
  hard = false,
): CharacterPnlBook => {
  let changed = false
  const next: CharacterPnlBook = { ...book }
  for (const character of PL_CHARACTERS) {
    const stake = stakes[character]
    const price = stakePrice(stake)
    const mine = profiles.filter((bet) => bet.character === character)
    const passUsd = mine.filter((bet) => bet.fundedFrom === 'pass').reduce((sum, bet) => sum + bet.dollars, 0)
    const dontUsd = mine.filter((bet) => bet.fundedFrom === 'dont').reduce((sum, bet) => sum + bet.dollars, 0)
    const passBtc = price > 0 ? Math.max(0, stake.btc.pass - passUsd / price) : stake.btc.pass
    const dontBtc = price > 0 ? Math.max(0, stake.btc.dont - dontUsd / price) : stake.btc.dont
    const profileBtc = price > 0 ? mine.reduce((sum, bet) => sum + profileProfit(point, total, bet, hard), 0) / price : 0
    const btc = lineDecisionPnl(point, total, passBtc, dontBtc) + profileBtc
    if (btc === 0) continue
    changed = true
    const totalBtc = book[character].btc + btc
    next[character] = { btc: totalBtc, usd: totalBtc * price, shown: true }
  }
  return changed ? next : book
}

export const pnlColor = (amount: PnlAmount): string => {
  if (amount.btc > 0) return PL_PROFIT_COLOR
  if (amount.btc < 0) return PL_LOSS_COLOR
  return PL_FLAT_COLOR
}

const trimNumber = (text: string): string => text.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')

/** Absolute compact amount. The label color carries the sign. */
export const formatPnlAmount = (value: number): string => {
  const abs = Math.abs(value)
  if (!Number.isFinite(abs) || abs < 0.005) return '0'
  const scaled = (amount: number, suffix: string): string => {
    const digits = amount >= 10 ? 0 : 1
    return `${trimNumber(amount.toFixed(digits))}${suffix}`
  }
  if (abs >= 1_000_000_000) return scaled(abs / 1_000_000_000, 'b')
  if (abs >= 1_000_000) return scaled(abs / 1_000_000, 'm')
  if (abs >= 1_000) return scaled(abs / 1_000, 'k')
  if (abs >= 100) return trimNumber(abs.toFixed(0))
  if (abs >= 10) return trimNumber(abs.toFixed(1))
  return trimNumber(abs.toFixed(2))
}

export const formatPnlBtc = (btc: number): string => `${formatPnlAmount(btc)} BTC`

export const formatPnlUsd = (usd: number): string => `${formatPnlAmount(usd)} USD`
