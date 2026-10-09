import type { ChipCharacter } from './chipConstants'

/** New place, lay, and field bets. Pass and Don't Pass stay up either way. */
export const CAT_PROFILE_ON = true//false
export const OLD_LADY_PROFILE_ON = true//false
export const OLD_MAN_PROFILE_ON = true//false
export const WOLF_PROFILE_ON = false

/** Wolf's cold lays. The across bet does not need this. */
export const WOLF_LAY_ON = false

/** Draw Pass and Don't Pass stacks. Off skips the felt only; those stakes still fund profiles and P/L. */
export const LINE_STACKS_ON = false

/** Outlines and constant captions on strategy stacks. Turn off after positioning. */
export const BET_STACK_GUIDES_ON = true

export const STACK_GUIDE_FONT_PX = 12

export const CHARACTER_GUIDE_COLOR: Record<ChipCharacter, string> = {
  cat: '#ff9800',
  oldLady: '#9c27b0',
  oldMan: '#e53935',
  wolf: '#d0d0d0',
}

/** How long a callout stays up. */
export const SPEECH_SHOW_MS = 3000
export const SPEECH_FONT_PX = 22
export const SPEECH_FONT_MIN_PX = 14
export const SPEECH_MAX_WIDTH_PX = 240
export const SPEECH_MAX_HEIGHT_PX = 72
export const SPEECH_RADIUS_PX = 10
export const SPEECH_PAD_PX = 8

/** Top-left of each character's bubble. */
export const WOLF_SPEECH_X = 40
export const WOLF_SPEECH_Y = 520  
export const OLD_LADY_SPEECH_X = 340
export const OLD_LADY_SPEECH_Y = 520
export const CAT_SPEECH_X = 560
export const CAT_SPEECH_Y = 520
export const OLD_MAN_SPEECH_X = 830
export const OLD_MAN_SPEECH_Y = 520

export const SPEECH_ANCHOR: Record<ChipCharacter, { x: number; y: number }> = {
  wolf: { x: WOLF_SPEECH_X, y: WOLF_SPEECH_Y },
  oldLady: { x: OLD_LADY_SPEECH_X, y: OLD_LADY_SPEECH_Y },
  cat: { x: CAT_SPEECH_X, y: CAT_SPEECH_Y },
  oldMan: { x: OLD_MAN_SPEECH_X, y: OLD_MAN_SPEECH_Y },
}


export const CAT_PLACE_10_X = 280
export const CAT_PLACE_10_Y = 1025
export const CAT_PLACE_9_X = 280
export const CAT_PLACE_9_Y = 1110

export const CAT_PLACE_8_X = 280
export const CAT_PLACE_8_Y = 1250
export const CAT_PLACE_6_X = 280
export const CAT_PLACE_6_Y = 1380

export const CAT_PLACE_5_X = 280
export const CAT_PLACE_5_Y = 1500
export const CAT_PLACE_4_X = 280
export const CAT_PLACE_4_Y = 1660




export const OLD_LADY_INSIDE_9_X = 220
export const OLD_LADY_INSIDE_9_Y = 1110

export const OLD_LADY_INSIDE_8_X = 220
export const OLD_LADY_INSIDE_8_Y = 1250
export const OLD_LADY_INSIDE_6_X = 220
export const OLD_LADY_INSIDE_6_Y = 1380

export const OLD_LADY_INSIDE_5_X = 220
export const OLD_LADY_INSIDE_5_Y = 1500


export const OLD_MAN_POINT_10_X = 310
export const OLD_MAN_POINT_10_Y = 1025
export const OLD_MAN_POINT_9_X = 310
export const OLD_MAN_POINT_9_Y = 1110

export const OLD_MAN_POINT_8_X = 310
export const OLD_MAN_POINT_8_Y = 1250
export const OLD_MAN_POINT_6_X = 310
export const OLD_MAN_POINT_6_Y = 1380

export const OLD_MAN_POINT_5_X = 320
export const OLD_MAN_POINT_5_Y = 1500
export const OLD_MAN_POINT_4_X = 320
export const OLD_MAN_POINT_4_Y = 1660



export const OLD_MAN_IRON_8_X = 980
export const OLD_MAN_IRON_8_Y = 780
export const OLD_MAN_IRON_6_X = 920
export const OLD_MAN_IRON_6_Y = 780
export const OLD_MAN_IRON_5_X = 860
export const OLD_MAN_IRON_5_Y = 820

export const OLD_MAN_FIELD_X = 920
export const OLD_MAN_FIELD_Y = 880


export const WOLF_ACROSS_4_X = 40
export const WOLF_ACROSS_4_Y = 700
export const WOLF_ACROSS_5_X = 90
export const WOLF_ACROSS_5_Y = 700
export const WOLF_ACROSS_6_X = 140
export const WOLF_ACROSS_6_Y = 660
export const WOLF_ACROSS_8_X = 190
export const WOLF_ACROSS_8_Y = 660
export const WOLF_ACROSS_9_X = 240
export const WOLF_ACROSS_9_Y = 700
export const WOLF_ACROSS_10_X = 290
export const WOLF_ACROSS_10_Y = 700

export const WOLF_LAY_4_X = 40
export const WOLF_LAY_4_Y = 780
export const WOLF_LAY_5_X = 90
export const WOLF_LAY_5_Y = 780
export const WOLF_LAY_6_X = 140
export const WOLF_LAY_6_Y = 820
export const WOLF_LAY_8_X = 190
export const WOLF_LAY_8_Y = 820
export const WOLF_LAY_9_X = 240
export const WOLF_LAY_9_Y = 780
export const WOLF_LAY_10_X = 290
export const WOLF_LAY_10_Y = 780

export const WOLF_POINT_4_X = 170
export const WOLF_POINT_4_Y = 600
export const WOLF_POINT_5_X = 170
export const WOLF_POINT_5_Y = 600
export const WOLF_POINT_6_X = 170
export const WOLF_POINT_6_Y = 600
export const WOLF_POINT_8_X = 170
export const WOLF_POINT_8_Y = 600
export const WOLF_POINT_9_X = 170
export const WOLF_POINT_9_Y = 600
export const WOLF_POINT_10_X = 170
export const WOLF_POINT_10_Y = 600
