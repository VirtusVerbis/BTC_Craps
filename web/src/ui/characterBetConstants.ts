import type { ChipCharacter } from './chipConstants'

/** New place, lay, and field bets. Pass and Don't Pass stay up either way. */
export const CAT_PROFILE_ON = true//false
export const OLD_LADY_PROFILE_ON = true//false
export const OLD_MAN_PROFILE_ON = true//false
export const WOLF_PROFILE_ON = false

/** Fixed one-red Pass, Don't Pass, and Make 'Em All. Off hides the chips and both labels. */
export const SHOOTER_ON = true

/**
 * Forces the shooter's stacks to ignore dice and loose chips for the whole throw.
 * Off is the default: a die passes through at launch, then collides after it crosses mid-felt.
 */
export const SHOOTER_STACK_COLLISION_OFF = false

/** One red on the near Pass line, left of center at the launch rail. Stage pixels (1080×1920). */
export const SHOOTER_PASS_X = 500
export const SHOOTER_PASS_Y = 1895

/** One red on Don't Pass, just inside that Pass chip and still left of center. */
export const SHOOTER_DONT_X = 500
export const SHOOTER_DONT_Y = 1840

/** One red on Make 'Em All. Starts at the center of that square. Stage pixels (1080×1920). */
export const SHOOTER_ALL_X = 990
export const SHOOTER_ALL_Y = 980

/** Wolf's cold lays. The across bet does not need this. */
export const WOLF_LAY_ON = false

/** Draw Pass and Don't Pass stacks. Off skips the felt only; those stakes still fund profiles and P/L. */
export const LINE_STACKS_ON = true//false

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
export const CAT_SPEECH_X = 570
export const CAT_SPEECH_Y = 520
export const OLD_MAN_SPEECH_X = 830
export const OLD_MAN_SPEECH_Y = 520

export const SPEECH_ANCHOR: Record<ChipCharacter, { x: number; y: number }> = {
  wolf: { x: WOLF_SPEECH_X, y: WOLF_SPEECH_Y },
  oldLady: { x: OLD_LADY_SPEECH_X, y: OLD_LADY_SPEECH_Y },
  cat: { x: CAT_SPEECH_X, y: CAT_SPEECH_Y },
  oldMan: { x: OLD_MAN_SPEECH_X, y: OLD_MAN_SPEECH_Y },
}

//CAT

export const CAT_PLACE_10_X = 280
export const CAT_PLACE_10_Y = 1000
export const CAT_PLACE_9_X = 280
export const CAT_PLACE_9_Y = 1110

export const CAT_PLACE_8_X = 280
export const CAT_PLACE_8_Y = 1250
export const CAT_PLACE_6_X = 280
export const CAT_PLACE_6_Y = 1380

export const CAT_PLACE_5_X = 280
export const CAT_PLACE_5_Y = 1500
export const CAT_PLACE_4_X = 280
export const CAT_PLACE_4_Y = 1630

//OLD LADY


export const OLD_LADY_INSIDE_9_X = 220
export const OLD_LADY_INSIDE_9_Y = 1110

export const OLD_LADY_INSIDE_8_X = 220
export const OLD_LADY_INSIDE_8_Y = 1250
export const OLD_LADY_INSIDE_6_X = 220
export const OLD_LADY_INSIDE_6_Y = 1380

export const OLD_LADY_INSIDE_5_X = 220
export const OLD_LADY_INSIDE_5_Y = 1500

// OLD MAN
// If his Don't Pass stake is still larger, he places the point. The bubble says "Place 6 for …".
//If his Pass stake is still larger, he lays the point. The bubble says "Lay 6 for …".

export const OLD_MAN_POINT_10_X = 330
export const OLD_MAN_POINT_10_Y = 1000
export const OLD_MAN_POINT_9_X = 330
export const OLD_MAN_POINT_9_Y = 1110

export const OLD_MAN_POINT_8_X = 330
export const OLD_MAN_POINT_8_Y = 1250
export const OLD_MAN_POINT_6_X = 330
export const OLD_MAN_POINT_6_Y = 1380

export const OLD_MAN_POINT_5_X = 330
export const OLD_MAN_POINT_5_Y = 1500
export const OLD_MAN_POINT_4_X = 330
export const OLD_MAN_POINT_4_Y = 1630

export const OLD_MAN_POINT_LAY_10_X = 140
export const OLD_MAN_POINT_LAY_10_Y = 1000
export const OLD_MAN_POINT_LAY_9_X = 140
export const OLD_MAN_POINT_LAY_9_Y = 1110

export const OLD_MAN_POINT_LAY_8_X = 130
export const OLD_MAN_POINT_LAY_8_Y = 1250
export const OLD_MAN_POINT_LAY_6_X = 120
export const OLD_MAN_POINT_LAY_6_Y = 1380

export const OLD_MAN_POINT_LAY_5_X = 110
export const OLD_MAN_POINT_LAY_5_Y = 1500
export const OLD_MAN_POINT_LAY_4_X = 110
export const OLD_MAN_POINT_LAY_4_Y = 1630



export const OLD_MAN_IRON_8_X = 330
export const OLD_MAN_IRON_8_Y = 1250
export const OLD_MAN_IRON_6_X = 330
export const OLD_MAN_IRON_6_Y = 1380
export const OLD_MAN_IRON_5_X = 330
export const OLD_MAN_IRON_5_Y = 1500

export const OLD_MAN_FIELD_X = 700
export const OLD_MAN_FIELD_Y = 920

//WOLF

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

export const WOLF_POINT_LAY_4_X = 170
export const WOLF_POINT_LAY_4_Y = 600
export const WOLF_POINT_LAY_5_X = 170
export const WOLF_POINT_LAY_5_Y = 600
export const WOLF_POINT_LAY_6_X = 170
export const WOLF_POINT_LAY_6_Y = 600
export const WOLF_POINT_LAY_8_X = 170
export const WOLF_POINT_LAY_8_Y = 600
export const WOLF_POINT_LAY_9_X = 170
export const WOLF_POINT_LAY_9_Y = 600
export const WOLF_POINT_LAY_10_X = 170
export const WOLF_POINT_LAY_10_Y = 600
