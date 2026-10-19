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
export const OLD_MAN_PL_X = 890
export const OLD_MAN_PL_Y = 470

export const PL_LABEL_ANCHOR: Record<ChipCharacter, { x: number; y: number }> = {
  wolf: { x: WOLF_PL_X, y: WOLF_PL_Y },
  oldLady: { x: OLD_LADY_PL_X, y: OLD_LADY_PL_Y },
  cat: { x: CAT_PL_X, y: CAT_PL_Y },
  oldMan: { x: OLD_MAN_PL_X, y: OLD_MAN_PL_Y },
}

/** How fast a balance delta rises, in stage pixels per second. */
export const PL_DELTA_RISE_PX_PER_S = 70

/**
 * Scales the fade over the trip from the start y to the top of the stage.
 * 1 is fully invisible at y = 0. Higher fades out sooner.
 */
export const PL_DELTA_FADE_RATE = 1

/** Size of the rising delta line, in stage pixels. */
export const PL_DELTA_FONT_PX = PL_LABEL_FONT_PX

/** Hide a floater smaller than this many bitcoin. Zero shows every amount that still formats. */
export const PL_DELTA_MIN_BTC = 0

/** Two text lines above the BTC balance, so the pair starts just clear of it. */
const DELTA_ABOVE_BALANCE_PX = 46

export const WOLF_DELTA_X = WOLF_PL_X
export const WOLF_DELTA_Y = WOLF_PL_Y - DELTA_ABOVE_BALANCE_PX
export const WOLF_DELTA_CAP_Y = 150

export const OLD_LADY_DELTA_X = OLD_LADY_PL_X
export const OLD_LADY_DELTA_Y = OLD_LADY_PL_Y - DELTA_ABOVE_BALANCE_PX
export const OLD_LADY_DELTA_CAP_Y = 150

export const CAT_DELTA_X = CAT_PL_X
export const CAT_DELTA_Y = CAT_PL_Y - DELTA_ABOVE_BALANCE_PX
export const CAT_DELTA_CAP_Y = 150

export const OLD_MAN_DELTA_X = OLD_MAN_PL_X
export const OLD_MAN_DELTA_Y = OLD_MAN_PL_Y - DELTA_ABOVE_BALANCE_PX
export const OLD_MAN_DELTA_CAP_Y = 150

/** Start x,y and the head y where the text disappears. y grows downward. */
export const PL_DELTA_ANCHOR: Record<ChipCharacter, { x: number; y: number; capY: number }> = {
  wolf: { x: WOLF_DELTA_X, y: WOLF_DELTA_Y, capY: WOLF_DELTA_CAP_Y },
  oldLady: { x: OLD_LADY_DELTA_X, y: OLD_LADY_DELTA_Y, capY: OLD_LADY_DELTA_CAP_Y },
  cat: { x: CAT_DELTA_X, y: CAT_DELTA_Y, capY: CAT_DELTA_CAP_Y },
  oldMan: { x: OLD_MAN_DELTA_X, y: OLD_MAN_DELTA_Y, capY: OLD_MAN_DELTA_CAP_Y },
}
