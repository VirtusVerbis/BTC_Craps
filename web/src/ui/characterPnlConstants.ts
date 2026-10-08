import type { ChipCharacter } from './chipConstants'

/** Size of both P/L lines, in stage pixels. */
export const PL_LABEL_FONT_PX = 20

export const PL_PROFIT_COLOR = '#4caf50'
export const PL_LOSS_COLOR = '#f44336'
export const PL_FLAT_COLOR = '#f6f0da'

/**
 * The two lines move as one block, in stage pixels (1080×1920).
 * x is the center. y is the top of the BTC line, on the rack in front of that character.
 */
export const WOLF_PL_X = 200
export const WOLF_PL_Y = 470
export const OLD_LADY_PL_X = 440
export const OLD_LADY_PL_Y = 470
export const CAT_PL_X = 650
export const CAT_PL_Y = 470
export const OLD_MAN_PL_X = 920
export const OLD_MAN_PL_Y = 470

export const PL_LABEL_ANCHOR: Record<ChipCharacter, { x: number; y: number }> = {
  wolf: { x: WOLF_PL_X, y: WOLF_PL_Y },
  oldLady: { x: OLD_LADY_PL_X, y: OLD_LADY_PL_Y },
  cat: { x: CAT_PL_X, y: CAT_PL_Y },
  oldMan: { x: OLD_MAN_PL_X, y: OLD_MAN_PL_Y },
}
