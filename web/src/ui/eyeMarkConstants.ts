import type { ChipCharacter } from './chipConstants'

/**
 * Pins each character's win mark on both eyes so `EYE_MARK_SPOT` can be nudged.
 * Wolf and the old man show the dollar. The cat and the old lady show Bitcoin.
 * Turn this off for play.
 */
export const EYE_MARK_PREVIEW_ON = false

/**
 * Symbols drawn while the preview is on. Turn off to place the cream covers first.
 * Play still draws the symbols when the preview is off.
 */
export const EYE_MARK_PREVIEW_SYMBOLS_ON = false

/**
 * Skull on every character while the preview is on.
 * Off keeps the dollar and Bitcoin win marks. Play is unchanged when the preview is off.
 */
export const EYE_MARK_PREVIEW_SKULL_ON = false//true

/** Square mark on each eye, in stage pixels (1080×1920). */
export const EYE_MARK_PX = 52

/** Cream of the painted eyeballs, so a cover reads as a blank pupil. */
export const EYE_PUPIL_CREAM = '#e4c89e'

export type EyeMark = 'skull' | 'bitcoin' | 'dollar'

export const EYE_MARK_SRC: Record<EyeMark, string> = {
  skull: '/new_skull.png',
  bitcoin: '/bitcoin.png',
  dollar: '/dollar.png',
}

/** A win. A loss is always the skull. */
export const WIN_EYE_MARK: Record<ChipCharacter, Exclude<EyeMark, 'skull'>> = {
  cat: 'bitcoin',
  oldLady: 'bitcoin',
  wolf: 'dollar',
  oldMan: 'dollar',
}

export interface StageBox {
  x: number
  y: number
  width: number
  height: number
}

export interface EyeSpot {
  /** Top-left of the 52×52 symbol, centered on the straight-ahead eye. */
  symbol: { x: number; y: number }
  /** Cream ellipse over the black pupil. */
  pupil: StageBox
}

/**
 * First estimates on the center-gaze painting. Nudge these without touching the rules.
 * `symbol` is the top-left. `pupil` is the black of that eye.
 */
export const EYE_MARK_SPOT: Record<ChipCharacter, { left: EyeSpot; right: EyeSpot }> = {
  wolf: {
    left: { symbol: { x: 199, y: 255 }, pupil: { x: 217, y: 281, width: 18, height: 20 } },
    right: { symbol: { x: 245, y: 269 }, pupil: { x: 258, y: 284, width: 16, height: 18 } },
  },
  oldLady: {
    left: { symbol: { x: 407, y: 266 }, pupil: { x: 424, y: 282, width: 12, height: 12 } },
    right: { symbol: { x: 452, y: 268 }, pupil: { x: 465, y: 284, width: 12, height: 12 } },
  },
  cat: {
    left: { symbol: { x: 591, y: 298 }, pupil: { x: 608, y: 325, width: 18, height: 20 } },
    right: { symbol: { x: 643, y: 306 }, pupil: { x: 657, y: 331, width: 18, height: 20 } },
  },
  oldMan: {
    left: { symbol: { x: 801, y: 278 }, pupil: { x: 818, y: 304, width: 16, height: 18 } },
    right: { symbol: { x: 847, y: 281 }, pupil: { x: 865, y: 309, width: 16, height: 18 } },
  },
}
