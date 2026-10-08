import type { BonusHand } from './bonusCraps'

/** Dev-only seeds. The next roll of the missing total completes the set. */
export type BonusTestSeed = 'small' | 'tall' | 'both'

declare global {
  interface Window {
    /** Dev-only. `btcCrapsBonus.arm('small' | 'tall' | 'both')` seeds the hand one roll short. */
    btcCrapsBonus?: {
      arm: (seed: BonusTestSeed) => void
    }
  }
}

export const isBonusTestSeed = (value: string | null): value is BonusTestSeed =>
  value === 'small' || value === 'tall' || value === 'both'

/** The total that finishes this seed. 6 and 8 come up more often than 12. */
export const bonusTestMissingTotal = (seed: BonusTestSeed): number => (seed === 'small' ? 6 : 8)

/** One roll short of the labels under test. */
export const bonusTestHand = (seed: BonusTestSeed): BonusHand => {
  if (seed === 'small') {
    return { started: true, hits: [2, 3, 4, 5], wonSmall: false, wonTall: false, wonAll: false }
  }
  if (seed === 'tall') {
    return { started: true, hits: [9, 10, 11, 12], wonSmall: false, wonTall: false, wonAll: false }
  }
  return {
    started: true,
    hits: [2, 3, 4, 5, 6, 9, 10, 11, 12],
    wonSmall: true,
    wonTall: false,
    wonAll: false,
  }
}
