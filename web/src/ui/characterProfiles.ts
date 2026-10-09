import type { ChipCharacter, ChipColor, ChipSide } from './chipConstants'
import {
  CAT_PLACE_10_X,
  CAT_PLACE_10_Y,
  CAT_PLACE_4_X,
  CAT_PLACE_4_Y,
  CAT_PLACE_5_X,
  CAT_PLACE_5_Y,
  CAT_PLACE_6_X,
  CAT_PLACE_6_Y,
  CAT_PLACE_8_X,
  CAT_PLACE_8_Y,
  CAT_PLACE_9_X,
  CAT_PLACE_9_Y,
  CAT_PROFILE_ON,
  CHARACTER_GUIDE_COLOR,
  OLD_LADY_INSIDE_5_X,
  OLD_LADY_INSIDE_5_Y,
  OLD_LADY_INSIDE_6_X,
  OLD_LADY_INSIDE_6_Y,
  OLD_LADY_INSIDE_8_X,
  OLD_LADY_INSIDE_8_Y,
  OLD_LADY_INSIDE_9_X,
  OLD_LADY_INSIDE_9_Y,
  OLD_LADY_PROFILE_ON,
  OLD_MAN_FIELD_X,
  OLD_MAN_FIELD_Y,
  OLD_MAN_IRON_5_X,
  OLD_MAN_IRON_5_Y,
  OLD_MAN_IRON_6_X,
  OLD_MAN_IRON_6_Y,
  OLD_MAN_IRON_8_X,
  OLD_MAN_IRON_8_Y,
  OLD_MAN_POINT_10_X,
  OLD_MAN_POINT_10_Y,
  OLD_MAN_POINT_4_X,
  OLD_MAN_POINT_4_Y,
  OLD_MAN_POINT_5_X,
  OLD_MAN_POINT_5_Y,
  OLD_MAN_POINT_6_X,
  OLD_MAN_POINT_6_Y,
  OLD_MAN_POINT_8_X,
  OLD_MAN_POINT_8_Y,
  OLD_MAN_POINT_9_X,
  OLD_MAN_POINT_9_Y,
  OLD_MAN_PROFILE_ON,
  WOLF_ACROSS_10_X,
  WOLF_ACROSS_10_Y,
  WOLF_ACROSS_4_X,
  WOLF_ACROSS_4_Y,
  WOLF_ACROSS_5_X,
  WOLF_ACROSS_5_Y,
  WOLF_ACROSS_6_X,
  WOLF_ACROSS_6_Y,
  WOLF_ACROSS_8_X,
  WOLF_ACROSS_8_Y,
  WOLF_ACROSS_9_X,
  WOLF_ACROSS_9_Y,
  WOLF_LAY_10_X,
  WOLF_LAY_10_Y,
  WOLF_LAY_4_X,
  WOLF_LAY_4_Y,
  WOLF_LAY_5_X,
  WOLF_LAY_5_Y,
  WOLF_LAY_6_X,
  WOLF_LAY_6_Y,
  WOLF_LAY_8_X,
  WOLF_LAY_8_Y,
  WOLF_LAY_9_X,
  WOLF_LAY_9_Y,
  LINE_STACKS_ON,
  WOLF_LAY_ON,
  WOLF_POINT_10_X,
  WOLF_POINT_10_Y,
  WOLF_POINT_4_X,
  WOLF_POINT_4_Y,
  WOLF_POINT_5_X,
  WOLF_POINT_5_Y,
  WOLF_POINT_6_X,
  WOLF_POINT_6_Y,
  WOLF_POINT_8_X,
  WOLF_POINT_8_Y,
  WOLF_POINT_9_X,
  WOLF_POINT_9_Y,
  WOLF_PROFILE_ON,
} from './characterBetConstants'
import { betDollars, chipsForDollars, denominationScale, splitColumns, type ChipBet } from './chipBets'
import { bookDollars, isPointNumber, LAY_ODDS_PAY, PLACE_PAY, type PointNumber } from './crapsPayouts'

/** One red chip. Place 4, 5, 9, 10, the field, and a lay of 4 or 10. */
export const PROFILE_RED = 2_500_000

/** One red plus one white. Place 6 and 8, and a lay of 5, 6, 8, or 9. */
export const PROFILE_SIX = 3_000_000

const MIN_HISTOGRAM_ROLLS = 3
const PLACE_NUMBERS: readonly PointNumber[] = [4, 5, 6, 8, 9, 10]
const CHARACTERS: readonly ChipCharacter[] = ['wolf', 'oldLady', 'cat', 'oldMan']

export type ProfileRole = 'place' | 'inside' | 'iron' | 'field' | 'across' | 'lay' | 'point-place' | 'point-lay'

export interface ProfileBet {
  id: string
  character: ChipCharacter
  role: ProfileRole
  number: PointNumber | null
  dollars: number
  fundedFrom: ChipSide
  label: string
  x: number
  y: number
}

export interface LinePurse {
  pass: number
  dont: number
}

export type CharacterPurses = Record<ChipCharacter, LinePurse>

export interface ProfileAllocation {
  profiles: ProfileBet[]
  remainder: CharacterPurses
  callouts: Partial<Record<ChipCharacter, string>>
}

interface Spot {
  x: number
  y: number
  label: string
}

const catSpot: Record<PointNumber, Spot> = {
  4: { x: CAT_PLACE_4_X, y: CAT_PLACE_4_Y, label: 'CAT_PLACE_4' },
  5: { x: CAT_PLACE_5_X, y: CAT_PLACE_5_Y, label: 'CAT_PLACE_5' },
  6: { x: CAT_PLACE_6_X, y: CAT_PLACE_6_Y, label: 'CAT_PLACE_6' },
  8: { x: CAT_PLACE_8_X, y: CAT_PLACE_8_Y, label: 'CAT_PLACE_8' },
  9: { x: CAT_PLACE_9_X, y: CAT_PLACE_9_Y, label: 'CAT_PLACE_9' },
  10: { x: CAT_PLACE_10_X, y: CAT_PLACE_10_Y, label: 'CAT_PLACE_10' },
}

const insideSpot: Record<5 | 6 | 8 | 9, Spot> = {
  5: { x: OLD_LADY_INSIDE_5_X, y: OLD_LADY_INSIDE_5_Y, label: 'OLD_LADY_INSIDE_5' },
  6: { x: OLD_LADY_INSIDE_6_X, y: OLD_LADY_INSIDE_6_Y, label: 'OLD_LADY_INSIDE_6' },
  8: { x: OLD_LADY_INSIDE_8_X, y: OLD_LADY_INSIDE_8_Y, label: 'OLD_LADY_INSIDE_8' },
  9: { x: OLD_LADY_INSIDE_9_X, y: OLD_LADY_INSIDE_9_Y, label: 'OLD_LADY_INSIDE_9' },
}

const ironSpot: Record<5 | 6 | 8, Spot> = {
  5: { x: OLD_MAN_IRON_5_X, y: OLD_MAN_IRON_5_Y, label: 'OLD_MAN_IRON_5' },
  6: { x: OLD_MAN_IRON_6_X, y: OLD_MAN_IRON_6_Y, label: 'OLD_MAN_IRON_6' },
  8: { x: OLD_MAN_IRON_8_X, y: OLD_MAN_IRON_8_Y, label: 'OLD_MAN_IRON_8' },
}

const acrossSpot: Record<PointNumber, Spot> = {
  4: { x: WOLF_ACROSS_4_X, y: WOLF_ACROSS_4_Y, label: 'WOLF_ACROSS_4' },
  5: { x: WOLF_ACROSS_5_X, y: WOLF_ACROSS_5_Y, label: 'WOLF_ACROSS_5' },
  6: { x: WOLF_ACROSS_6_X, y: WOLF_ACROSS_6_Y, label: 'WOLF_ACROSS_6' },
  8: { x: WOLF_ACROSS_8_X, y: WOLF_ACROSS_8_Y, label: 'WOLF_ACROSS_8' },
  9: { x: WOLF_ACROSS_9_X, y: WOLF_ACROSS_9_Y, label: 'WOLF_ACROSS_9' },
  10: { x: WOLF_ACROSS_10_X, y: WOLF_ACROSS_10_Y, label: 'WOLF_ACROSS_10' },
}

const oldManPointSpot: Record<PointNumber, Spot> = {
  4: { x: OLD_MAN_POINT_4_X, y: OLD_MAN_POINT_4_Y, label: 'OLD_MAN_POINT_4' },
  5: { x: OLD_MAN_POINT_5_X, y: OLD_MAN_POINT_5_Y, label: 'OLD_MAN_POINT_5' },
  6: { x: OLD_MAN_POINT_6_X, y: OLD_MAN_POINT_6_Y, label: 'OLD_MAN_POINT_6' },
  8: { x: OLD_MAN_POINT_8_X, y: OLD_MAN_POINT_8_Y, label: 'OLD_MAN_POINT_8' },
  9: { x: OLD_MAN_POINT_9_X, y: OLD_MAN_POINT_9_Y, label: 'OLD_MAN_POINT_9' },
  10: { x: OLD_MAN_POINT_10_X, y: OLD_MAN_POINT_10_Y, label: 'OLD_MAN_POINT_10' },
}

const wolfPointSpot: Record<PointNumber, Spot> = {
  4: { x: WOLF_POINT_4_X, y: WOLF_POINT_4_Y, label: 'WOLF_POINT_4' },
  5: { x: WOLF_POINT_5_X, y: WOLF_POINT_5_Y, label: 'WOLF_POINT_5' },
  6: { x: WOLF_POINT_6_X, y: WOLF_POINT_6_Y, label: 'WOLF_POINT_6' },
  8: { x: WOLF_POINT_8_X, y: WOLF_POINT_8_Y, label: 'WOLF_POINT_8' },
  9: { x: WOLF_POINT_9_X, y: WOLF_POINT_9_Y, label: 'WOLF_POINT_9' },
  10: { x: WOLF_POINT_10_X, y: WOLF_POINT_10_Y, label: 'WOLF_POINT_10' },
}

const laySpot: Record<PointNumber, Spot> = {
  4: { x: WOLF_LAY_4_X, y: WOLF_LAY_4_Y, label: 'WOLF_LAY_4' },
  5: { x: WOLF_LAY_5_X, y: WOLF_LAY_5_Y, label: 'WOLF_LAY_5' },
  6: { x: WOLF_LAY_6_X, y: WOLF_LAY_6_Y, label: 'WOLF_LAY_6' },
  8: { x: WOLF_LAY_8_X, y: WOLF_LAY_8_Y, label: 'WOLF_LAY_8' },
  9: { x: WOLF_LAY_9_X, y: WOLF_LAY_9_Y, label: 'WOLF_LAY_9' },
  10: { x: WOLF_LAY_10_X, y: WOLF_LAY_10_Y, label: 'WOLF_LAY_10' },
}

export interface ProfileSwitches {
  cat: boolean
  oldLady: boolean
  oldMan: boolean
  wolf: boolean
  wolfLay: boolean
}

export const profileSwitches = (): ProfileSwitches => ({
  cat: CAT_PROFILE_ON,
  oldLady: OLD_LADY_PROFILE_ON,
  oldMan: OLD_MAN_PROFILE_ON,
  wolf: WOLF_PROFILE_ON,
  wolfLay: WOLF_LAY_ON,
})

const emptyPurses = (stakes: CharacterPurses): CharacterPurses => ({
  wolf: { ...stakes.wolf },
  oldLady: { ...stakes.oldLady },
  cat: { ...stakes.cat },
  oldMan: { ...stakes.oldMan },
})

const canAfford = (purse: LinePurse, side: ChipSide, amount: number): boolean => purse[side] + 1e-6 >= amount

const charge = (purse: LinePurse, side: ChipSide, amount: number) => {
  purse[side] = Math.max(0, purse[side] - amount)
}

export const placeUnit = (number: PointNumber): number => (number === 6 || number === 8 ? PROFILE_SIX : PROFILE_RED)

export const layUnit = (number: PointNumber): number => (number === 4 || number === 10 ? PROFILE_RED : PROFILE_SIX)

const placeCounts = (rolls: readonly number[]): Record<PointNumber, number> => {
  const counts = { 4: 0, 5: 0, 6: 0, 8: 0, 9: 0, 10: 0 }
  for (const roll of rolls) {
    if (isPointNumber(roll)) counts[roll] += 1
  }
  return counts
}

/** Place numbers tied for the busiest count, once that count is at least 3. */
export const catExtraNumbers = (rolls: readonly number[], point: PointNumber): PointNumber[] => {
  if (rolls.length < MIN_HISTOGRAM_ROLLS) return []
  const counts = placeCounts(rolls)
  const busiest = Math.max(...PLACE_NUMBERS.map((number) => counts[number]))
  if (busiest < 3) return []
  return PLACE_NUMBERS.filter((number) => counts[number] === busiest && number !== point)
}

/** Coldest place numbers that have still been rolled fewer than 3 times. */
export const wolfLayNumbers = (rolls: readonly number[], point: PointNumber): PointNumber[] => {
  if (rolls.length < MIN_HISTOGRAM_ROLLS) return []
  const counts = placeCounts(rolls)
  const cold = PLACE_NUMBERS.filter((number) => number !== point && counts[number] < 3)
  if (cold.length === 0) return []
  const lowest = Math.min(...cold.map((number) => counts[number]))
  return cold.filter((number) => counts[number] === lowest)
}

const bet = (
  character: ChipCharacter,
  role: ProfileRole,
  number: PointNumber | null,
  dollars: number,
  fundedFrom: ChipSide,
  spot: Spot,
): ProfileBet => ({
  id: `${character}-${role}${number == null ? '' : `-${number}`}`,
  character,
  role,
  number,
  dollars,
  fundedFrom,
  label: spot.label,
  x: spot.x,
  y: spot.y,
})

const exceptPoint = (point: PointNumber, numbers: readonly PointNumber[]): PointNumber[] =>
  numbers.filter((number) => number !== point)

const sumDollars = (bets: readonly ProfileBet[]): number => bets.reduce((sum, item) => sum + item.dollars, 0)

const enabled = (item: ProfileBet, switches: ProfileSwitches): boolean => {
  if (item.character === 'cat') return switches.cat
  if (item.character === 'oldLady') return switches.oldLady
  if (item.character === 'oldMan') return switches.oldMan
  if (item.role === 'lay') return switches.wolfLay
  return switches.wolf
}

const workingPoint = (point: number | null): PointNumber | null => (point != null && isPointNumber(point) ? point : null)

const freshWhilePoint = (
  point: PointNumber,
  rolls: readonly number[],
  purses: CharacterPurses,
  switches: ProfileSwitches,
): ProfileBet[] => {
  const placed: ProfileBet[] = []

  if (switches.cat) {
    const purse = purses.cat
    const base = exceptPoint(point, [6, 8])
    const baseCost = base.reduce((sum, number) => sum + placeUnit(number), 0)
    if (base.length > 0 && canAfford(purse, 'pass', baseCost)) {
      charge(purse, 'pass', baseCost)
      for (const number of base) {
        placed.push(bet('cat', 'place', number, placeUnit(number), 'pass', catSpot[number]))
      }
      for (const number of catExtraNumbers(rolls, point)) {
        const cost = placeUnit(number)
        if (!canAfford(purse, 'pass', cost)) continue
        charge(purse, 'pass', cost)
        const existing = placed.find((item) => item.id === `cat-place-${number}`)
        if (existing) existing.dollars += cost
        else placed.push(bet('cat', 'place', number, cost, 'pass', catSpot[number]))
      }
    }
  }

  if (switches.oldLady) {
    const purse = purses.oldLady
    const numbers = exceptPoint(point, [5, 6, 8, 9])
    const cost = numbers.reduce((sum, number) => sum + placeUnit(number), 0)
    if (numbers.length > 0 && canAfford(purse, 'pass', cost)) {
      charge(purse, 'pass', cost)
      for (const number of numbers) {
        const spot = insideSpot[number as 5 | 6 | 8 | 9]
        placed.push(bet('oldLady', 'inside', number, placeUnit(number), 'pass', spot))
      }
    }
  }

  if (switches.oldMan) {
    const purse = purses.oldMan
    const numbers = exceptPoint(point, [5, 6, 8])
    const cost = numbers.reduce((sum, number) => sum + placeUnit(number), 0) + PROFILE_RED
    if (canAfford(purse, 'pass', cost)) {
      charge(purse, 'pass', cost)
      for (const number of numbers) {
        const spot = ironSpot[number as 5 | 6 | 8]
        placed.push(bet('oldMan', 'iron', number, placeUnit(number), 'pass', spot))
      }
      placed.push(bet('oldMan', 'field', null, PROFILE_RED, 'pass', {
        x: OLD_MAN_FIELD_X,
        y: OLD_MAN_FIELD_Y,
        label: 'OLD_MAN_FIELD',
      }))
    }
  }

  if (switches.wolf) {
    const purse = purses.wolf
    const numbers = exceptPoint(point, PLACE_NUMBERS)
    const cost = numbers.reduce((sum, number) => sum + placeUnit(number), 0)
    if (numbers.length > 0 && canAfford(purse, 'pass', cost)) {
      charge(purse, 'pass', cost)
      for (const number of numbers) {
        placed.push(bet('wolf', 'across', number, placeUnit(number), 'pass', acrossSpot[number]))
      }
    }
  }

  if (switches.wolfLay) {
    const purse = purses.wolf
    const numbers = wolfLayNumbers(rolls, point)
    const cost = numbers.reduce((sum, number) => sum + layUnit(number), 0)
    if (numbers.length > 0 && canAfford(purse, 'dont', cost)) {
      charge(purse, 'dont', cost)
      for (const number of numbers) {
        placed.push(bet('wolf', 'lay', number, layUnit(number), 'dont', laySpot[number]))
      }
    }
  }

  if (switches.oldMan) coverPoint('oldMan', point, purses.oldMan, placed)
  if (switches.wolf) coverPoint('wolf', point, purses.wolf, placed)
  return placed
}

const coverPoint = (character: ChipCharacter, point: PointNumber, purse: LinePurse, placed: ProfileBet[]) => {
  const gap = Math.abs(purse.dont - purse.pass)
  const spot = (character === 'wolf' ? wolfPointSpot : oldManPointSpot)[point]
  if (purse.dont > purse.pass) {
    const booked = bookDollars(gap, PLACE_PAY[point].unit).booked
    if (!(booked > 0) || !canAfford(purse, 'dont', booked)) return
    charge(purse, 'dont', booked)
    placed.push(bet(character, 'point-place', point, booked, 'dont', spot))
    return
  }
  if (purse.pass > purse.dont) {
    const booked = bookDollars(gap, LAY_ODDS_PAY[point].unit).booked
    if (!(booked > 0) || !canAfford(purse, 'pass', booked)) return
    charge(purse, 'pass', booked)
    placed.push(bet(character, 'point-lay', point, booked, 'pass', spot))
  }
}

const KEPT_ROLES: readonly ProfileRole[] = ['place', 'inside', 'iron', 'across', 'lay']

const fitKept = (kept: readonly ProfileBet[], purses: CharacterPurses, switches: ProfileSwitches): ProfileBet[] => {
  const keptOn = kept.filter((item) => KEPT_ROLES.includes(item.role) && enabled(item, switches))
  const placed: ProfileBet[] = []
  for (const character of CHARACTERS) {
    const purse = purses[character]
    const mine = keptOn.filter((item) => item.character === character)
    const take = (role: ProfileRole, shrink?: (items: ProfileBet[]) => ProfileBet[]) => {
      const items = mine.filter((item) => item.role === role)
      if (items.length === 0) return
      const side = items[0].fundedFrom
      if (canAfford(purse, side, sumDollars(items))) {
        charge(purse, side, sumDollars(items))
        placed.push(...items)
        return
      }
      const smaller = shrink?.(items) ?? []
      if (smaller.length > 0 && canAfford(purse, side, sumDollars(smaller))) {
        charge(purse, side, sumDollars(smaller))
        placed.push(...smaller)
      }
    }
    take('place', (items) => items.map((item) => (
      item.number == null ? item : { ...item, dollars: placeUnit(item.number) }
    )))
    take('inside')
    take('iron')
    take('across')
    take('lay')
  }
  return placed
}

const trimAmount = (text: string): string => text.replace(/\.0$/, '')

/** Compact stake for a callout. 13500000 becomes 13.5M. */
export const formatCompactDollars = (dollars: number): string => {
  const abs = Math.abs(dollars)
  if (abs >= 1_000_000_000) return `${trimAmount((abs / 1_000_000_000).toFixed(1))}B`
  if (abs >= 1_000_000) return `${trimAmount((abs / 1_000_000).toFixed(1))}M`
  if (abs >= 1_000) return `${trimAmount((abs / 1_000).toFixed(1))}K`
  return `${Math.round(abs)}`
}

const addedPortion = (previous: readonly ProfileBet[], next: readonly ProfileBet[]): ProfileBet[] => {
  const prior = new Map(previous.map((item) => [item.id, item.dollars]))
  return next.flatMap((item) => {
    const extra = item.dollars - (prior.get(item.id) ?? 0)
    if (!(extra > 0.5)) return []
    return [{ ...item, dollars: extra }]
  })
}

const groupNumbers = (items: readonly ProfileBet[], verb: string): string[] => {
  const byAmount = new Map<number, number[]>()
  for (const item of items) {
    if (item.number == null) continue
    const list = byAmount.get(item.dollars) ?? []
    list.push(item.number)
    byAmount.set(item.dollars, list)
  }
  return [...byAmount.entries()]
    .sort((left, right) => Math.min(...left[1]) - Math.min(...right[1]))
    .map(([dollars, numbers]) => `${verb} ${numbers.sort((a, b) => a - b).join(', ')} for ${formatCompactDollars(dollars)}`)
}

export const calloutText = (added: readonly ProfileBet[]): string => {
  const lines: string[] = []
  const total = (role: ProfileRole) => added.filter((item) => item.role === role).reduce((sum, item) => sum + item.dollars, 0)
  const across = total('across')
  if (across > 0) lines.push(`Across for ${formatCompactDollars(across)}`)
  const inside = total('inside')
  if (inside > 0) lines.push(`Inside for ${formatCompactDollars(inside)}`)
  const iron = total('iron')
  if (iron > 0) lines.push(`Iron cross for ${formatCompactDollars(iron)}`)
  for (const item of added.filter((entry) => entry.role === 'field')) {
    lines.push(`Field for ${formatCompactDollars(item.dollars)}`)
  }
  lines.push(...groupNumbers(added.filter((item) => item.role === 'place'), 'Place'))
  lines.push(...groupNumbers(added.filter((item) => item.role === 'lay'), 'Lay'))
  for (const item of added.filter((entry) => entry.role === 'point-place' && entry.number != null)) {
    lines.push(`Place ${item.number} for ${formatCompactDollars(item.dollars)}`)
  }
  for (const item of added.filter((entry) => entry.role === 'point-lay' && entry.number != null)) {
    lines.push(`Lay ${item.number} for ${formatCompactDollars(item.dollars)}`)
  }
  return lines.join('\n')
}

const calloutsFor = (
  previous: readonly ProfileBet[],
  next: readonly ProfileBet[],
): Partial<Record<ChipCharacter, string>> => {
  const added = addedPortion(previous, next)
  const spoken: Partial<Record<ChipCharacter, string>> = {}
  for (const character of CHARACTERS) {
    const text = calloutText(added.filter((item) => item.character === character))
    if (text) spoken[character] = text
  }
  return spoken
}

export const allocateProfiles = (
  stakes: CharacterPurses,
  rolls: readonly number[],
  point: number | null,
  previous: readonly ProfileBet[],
  sevenOut: boolean,
  switches: ProfileSwitches = profileSwitches(),
): ProfileAllocation => {
  const purses = emptyPurses(stakes)
  const established = workingPoint(point)
  const profiles = sevenOut || established == null
    ? (sevenOut ? [] : fitKept(previous, purses, switches))
    : freshWhilePoint(established, rolls, purses, switches)
  return { profiles, remainder: purses, callouts: calloutsFor(previous, profiles) }
}

const literalColors = (dollars: number): ChipColor[] => {
  const sixes = dollars / PROFILE_SIX
  if (sixes >= 1 && Math.abs(sixes - Math.round(sixes)) < 1e-4) {
    const count = Math.round(sixes)
    return [...Array<ChipColor>(count).fill('red'), ...Array<ChipColor>(count).fill('white')]
  }
  const reds = Math.max(1, Math.round(dollars / PROFILE_RED))
  return Array<ChipColor>(reds).fill('red')
}

export const strategyChipBet = (item: ProfileBet, scale: number): ChipBet => {
  const literal = item.role !== 'point-place' && item.role !== 'point-lay'
  const colors = literal ? literalColors(item.dollars) : chipsForDollars(item.dollars, scale)
  const columns = splitColumns(colors)
  return {
    id: item.id,
    character: item.character,
    side: item.fundedFrom,
    dollars: item.dollars,
    columns: columns.length > 0 ? columns : [colors],
    anchor: { x: item.x, y: item.y },
    guide: { label: item.label, color: CHARACTER_GUIDE_COLOR[item.character] },
  }
}

export interface TableBets {
  bets: ChipBet[]
  profiles: ProfileBet[]
  callouts: Partial<Record<ChipCharacter, string>>
}

/** Line bets after the profile move, plus the strategy stacks. */
export const composeTableBets = (
  notional: number,
  longPct: number,
  shortPct: number,
  rolls: readonly number[],
  point: number | null,
  previous: readonly ProfileBet[],
  sevenOut: boolean,
): TableBets => {
  const stakes = {} as CharacterPurses
  const drafts: Array<{ character: ChipCharacter; side: ChipSide; dollars: number }> = []
  for (const character of CHARACTERS) {
    const pass = betDollars(notional, longPct, shortPct, character, 'pass')
    const dont = betDollars(notional, longPct, shortPct, character, 'dont')
    stakes[character] = { pass, dont }
    drafts.push({ character, side: 'pass', dollars: pass }, { character, side: 'dont', dollars: dont })
  }
  const largest = drafts.reduce((max, item) => Math.max(max, item.dollars), 0)
  const allocated = allocateProfiles(stakes, rolls, point, previous, sevenOut)
  const scale = denominationScale(largest)
  const line = drafts.flatMap((item) => {
    const dollars = allocated.remainder[item.character][item.side]
    const columns = splitColumns(chipsForDollars(dollars, scale))
    if (columns.length === 0) return []
    const betRow: ChipBet = {
      id: `${item.character}-${item.side}`,
      character: item.character,
      side: item.side,
      dollars,
      columns,
    }
    return [betRow]
  })
  const strategy = allocated.profiles
    .map((item) => strategyChipBet(item, scale))
    .filter((item) => item.columns.some((column) => column.length > 0))
  return { bets: [...(LINE_STACKS_ON ? line : []), ...strategy], profiles: allocated.profiles, callouts: allocated.callouts }
}
