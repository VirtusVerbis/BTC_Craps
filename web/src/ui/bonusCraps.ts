import { BONUS_ALL_PAYS, BONUS_SMALL_PAYS, BONUS_TALL_PAYS } from './bonusConstants'

const POINT_NUMBERS = new Set([4, 5, 6, 8, 9, 10])
const SMALL = [2, 3, 4, 5, 6] as const
const TALL = [8, 9, 10, 11, 12] as const
const COUNTED = new Set<number>([...SMALL, ...TALL])

export type BonusFlash = 'small' | 'tall' | 'all'

export interface BonusHand {
  /** True after the first point number. Stays true through come-outs until a 7. */
  started: boolean
  hits: number[]
  wonSmall: boolean
  wonTall: boolean
  wonAll: boolean
}

export interface BonusStep {
  hand: BonusHand
  /** Solid winner lines for sets newly completed by this roll. */
  lines: string[]
  /** Which circles blink. Make 'Em All replaces a narrower flash. */
  flash: BonusFlash | null
}

export const emptyBonusHand = (): BonusHand => ({
  started: false,
  hits: [],
  wonSmall: false,
  wonTall: false,
  wonAll: false,
})

export const bonusWinnerLine = (flash: BonusFlash): string => {
  if (flash === 'small') return `All Small Winner! ${BONUS_SMALL_PAYS} to 1`
  if (flash === 'tall') return `All Tall Winner! ${BONUS_TALL_PAYS} to 1`
  return `Make 'Em All Winner! ${BONUS_ALL_PAYS} to 1`
}

/** Numbers that blink for this win. Make 'Em All is every bonus total except 7. */
export const bonusFlashTotals = (flash: BonusFlash | null): number[] => {
  if (flash === 'small') return [...SMALL]
  if (flash === 'tall') return [...TALL]
  if (flash === 'all') return [...SMALL, ...TALL]
  return []
}

const hasAll = (hits: readonly number[], totals: readonly number[]): boolean =>
  totals.every((total) => hits.includes(total))

/** One counted total. No Roll never reaches this. A 7 ends the hand, including a come-out 7. */
export const applyBonusRoll = (hand: BonusHand, total: number): BonusStep => {
  if (total === 7) {
    if (!hand.started) return { hand, lines: [], flash: null }
    return { hand: emptyBonusHand(), lines: [], flash: null }
  }

  if (!hand.started) {
    if (!POINT_NUMBERS.has(total)) return { hand, lines: [], flash: null }
    return {
      hand: { started: true, hits: [total], wonSmall: false, wonTall: false, wonAll: false },
      lines: [],
      flash: null,
    }
  }

  if (!COUNTED.has(total) || hand.hits.includes(total)) return { hand, lines: [], flash: null }

  const hits = [...hand.hits, total].sort((a, b) => a - b)
  const wonSmall = hand.wonSmall || hasAll(hits, SMALL)
  const wonTall = hand.wonTall || hasAll(hits, TALL)
  const wonAll = hand.wonAll || (wonSmall && wonTall)
  const lines: string[] = []
  if (!hand.wonSmall && wonSmall) lines.push(bonusWinnerLine('small'))
  if (!hand.wonTall && wonTall) lines.push(bonusWinnerLine('tall'))
  if (!hand.wonAll && wonAll) lines.push(bonusWinnerLine('all'))
  const flash: BonusFlash | null = !hand.wonAll && wonAll ? 'all' : !hand.wonTall && wonTall ? 'tall' : !hand.wonSmall && wonSmall ? 'small' : null

  return {
    hand: { started: true, hits, wonSmall, wonTall, wonAll },
    lines,
    flash,
  }
}
