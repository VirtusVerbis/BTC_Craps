import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import type { MarketSnapshot } from '../game/types'
import {
  CHIP_ANCHORS,
  CHIP_ANCHOR_JITTER_PX,
  CHIP_MAX_BET_CHIPS,
  CHIP_MAX_COLUMNS,
  CHIP_MAX_STACK,
  type ChipCharacter,
  type ChipColor,
  type ChipSide,
} from './chipConstants'

/** Face value of each color before open interest grows past the 40-chip cap. */
export const CHIP_FACE_VALUE: Record<ChipColor, number> = {
  white: 500_000,
  red: 2_500_000,
  green: 12_500_000,
  blue: 25_000_000,
  black: 50_000_000,
}

const DENOM_ORDER: readonly ChipColor[] = ['black', 'blue', 'green', 'red', 'white']

/** Pass-line weights. Don't Pass uses these reversed. They sum to 200. */
export const PASS_WEIGHT: Record<ChipCharacter, number> = {
  wolf: 20,
  oldMan: 40,
  oldLady: 60,
  cat: 80,
}

export const CHIP_WEIGHT_SUM = 200

const CHARACTERS: readonly ChipCharacter[] = ['wolf', 'oldLady', 'cat', 'oldMan']

export interface ChipBet {
  id: string
  /** Shooter is a fixed one-red bettor, not an open-interest character. */
  character: ChipCharacter | 'shooter'
  /** `all` is the shooter's Make 'Em All red. Open-interest bets stay on pass or don't. */
  side: ChipSide | 'all'
  dollars: number
  /** Bottom to top. At most two columns, each at most 20 high. */
  columns: ChipColor[][]
  /** Strategy stacks sit on this point and do not jitter. */
  anchor?: { x: number; y: number }
  /** Testing outline. Absent on Pass and Don't Pass. */
  guide?: { label: string; color: string }
}

export const btcPrice = (market: MarketSnapshot): number => {
  if (market.binance.price > 0) return market.binance.price
  if (market.coinbase.price > 0) return market.coinbase.price
  return 0
}

/** Don't Pass reverses the Pass weights: 20 becomes 80, 40 becomes 60. */
const dontWeight = (character: ChipCharacter): number => 100 - PASS_WEIGHT[character]

export const betDollars = (
  notional: number,
  longPct: number,
  shortPct: number,
  character: ChipCharacter,
  side: ChipSide,
): number => {
  if (!(notional > 0)) return 0
  const pool = side === 'pass' ? longPct : shortPct
  const weight = side === 'pass' ? PASS_WEIGHT[character] : dontWeight(character)
  if (!(pool > 0) || !(weight > 0)) return 0
  return (notional * pool * weight) / (100 * CHIP_WEIGHT_SUM)
}

/** Scale every denomination by the same factor so the largest bet is 40 chips. */
export const denominationScale = (largestDollars: number): number => {
  const cap = CHIP_FACE_VALUE.black * CHIP_MAX_BET_CHIPS
  if (!(largestDollars > cap)) return 1
  return largestDollars / cap
}

export const scaledFaceValues = (scale: number): Array<{ color: ChipColor; value: number }> =>
  DENOM_ORDER.map((color) => ({ color, value: CHIP_FACE_VALUE[color] * scale }))

const CHIP_PROMOTE: ReadonlyArray<readonly [ChipColor, ChipColor, number]> = [
  ['white', 'red', 5],
  ['red', 'green', 5],
  ['green', 'blue', 2],
  ['blue', 'black', 2],
]

/** Five whites become a red, five reds a green, two greens a blue, two blues a black. */
const colorUpChips = (chips: readonly ChipColor[]): ChipColor[] => {
  const counts: Record<ChipColor, number> = { black: 0, blue: 0, green: 0, red: 0, white: 0 }
  for (const color of chips) counts[color] += 1
  for (const [from, to, rate] of CHIP_PROMOTE) {
    const made = Math.floor(counts[from] / rate)
    counts[from] -= made * rate
    counts[to] += made
  }
  const colored: ChipColor[] = []
  for (const color of DENOM_ORDER) {
    const count = Math.min(counts[color], CHIP_MAX_BET_CHIPS - colored.length)
    for (let i = 0; i < count; i += 1) colored.push(color)
  }
  return colored
}

/** Largest-first. A remainder of at least half a white chip becomes one more white, then the stack is colored up. */
export const chipsForDollars = (dollars: number, scale: number): ChipColor[] => {
  if (!(dollars > 0)) return []
  const values = scaledFaceValues(scale)
  const out: ChipColor[] = []
  let left = dollars
  for (const denom of values) {
    if (!(denom.value > 0)) continue
    let count = Math.floor((left + denom.value * 1e-9) / denom.value)
    count = Math.min(count, CHIP_MAX_BET_CHIPS - out.length)
    for (let i = 0; i < count; i += 1) out.push(denom.color)
    left -= count * denom.value
    if (out.length >= CHIP_MAX_BET_CHIPS) return colorUpChips(out)
  }
  const white = values[values.length - 1]
  if (white && out.length < CHIP_MAX_BET_CHIPS && left >= white.value * 0.5) out.push(white.color)
  return colorUpChips(out)
}

export const splitColumns = (chips: readonly ChipColor[]): ChipColor[][] => {
  const columns: ChipColor[][] = []
  for (let i = 0; i < chips.length && columns.length < CHIP_MAX_COLUMNS; i += CHIP_MAX_STACK) {
    columns.push(chips.slice(i, i + CHIP_MAX_STACK))
  }
  return columns
}

export const buildBets = (notional: number, longPct: number, shortPct: number): ChipBet[] => {
  const drafts = CHARACTERS.flatMap((character) =>
    (['pass', 'dont'] as const).map((side) => ({
      id: `${character}-${side}`,
      character,
      side,
      dollars: betDollars(notional, longPct, shortPct, character, side),
    })),
  )
  const largest = drafts.reduce((max, bet) => Math.max(max, bet.dollars), 0)
  const scale = denominationScale(largest)
  return drafts.flatMap((bet) => {
    const columns = splitColumns(chipsForDollars(bet.dollars, scale))
    if (columns.length === 0) return []
    return [{ ...bet, columns }]
  })
}

const unit = (seed: number): number => {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export interface PlacedColumn {
  id: string
  betId: string
  x: number
  /** Felt depth. Screen y is `REFERENCE_HEIGHT - z`. */
  z: number
  colors: ChipColor[]
  /** Snap back to the constant each restack. Pass and Don't Pass keep a nudged spot. */
  pinned?: boolean
  guide?: { label: string; color: string }
}

/** Second column steps sideways by `columnStep(z)`. Stacks near the right rail step left. */
export const placeBets = (
  bets: readonly ChipBet[],
  seed: number,
  columnStep: (z: number) => number,
): PlacedColumn[] => {
  const placed: PlacedColumn[] = []
  for (const bet of bets) {
    const anchored = bet.anchor
    const anchor = anchored ?? CHIP_ANCHORS.find((item) => item.character === bet.character && item.side === bet.side)
    if (!anchor) continue
    const jx = anchored ? 0 : (unit(seed + anchor.x * 0.17 + anchor.y) - 0.5) * 2 * CHIP_ANCHOR_JITTER_PX
    const jy = anchored ? 0 : (unit(seed + anchor.y * 0.13 + anchor.x) - 0.5) * 2 * CHIP_ANCHOR_JITTER_PX
    const x0 = anchor.x + jx
    const y0 = anchor.y + jy
    const sign = x0 > REFERENCE_WIDTH * 0.72 ? -1 : 1
    bet.columns.forEach((colors, index) => {
      const y = Math.min(REFERENCE_HEIGHT, Math.max(0, y0))
      const z = REFERENCE_HEIGHT - y
      const x = Math.min(REFERENCE_WIDTH - 40, Math.max(40, x0 + sign * index * columnStep(z)))
      placed.push({
        id: `${bet.id}-${index}`,
        betId: bet.id,
        x,
        z,
        colors,
        pinned: anchored != null,
        guide: bet.guide,
      })
    })
  }
  return placed
}
