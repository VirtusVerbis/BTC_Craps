import { DIE_DEPTH_SCALE, DIE_LAUNCH_SIZE_PX } from './diceConstants'

/** Circle diameter at scalar 1. Starts at the back-wall die size (`57 × 0.6`). */
export const CHIP_WIDTH_PX = Math.round(DIE_LAUNCH_SIZE_PX * DIE_DEPTH_SCALE)

/** Circle diameter. Kept equal to `CHIP_WIDTH_PX` so each chip stays a flat circle. */
export const CHIP_HEIGHT_PX = CHIP_WIDTH_PX

/** Multiplier on diameter and chip thickness. */
export const CHIP_SIZE_SCALAR = 1.6//1.2

/**
 * Visible height of each chip's side wall, before the size scalar.
 * The next plate sits on top of this wall, so the stack stays closed.
 */
export const CHIP_THICKNESS_PX = 5

/**
 * Tips the discs onto the felt. 0 faces the camera. 90 lies fully flat.
 * Around 70 matches the far Pass line: a shallow ellipse, stacked as a column.
 */
export const CHIP_FELT_TILT_DEG = 72

/** Stable 0–360 spin so rim spots do not line up. Same index always gets the same angle. */
export const chipRotationDeg = (index: number): number => {
  const x = Math.sin(index * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 360
}

/** How far an anchor may wander, in stage pixels, when a throw resets. */
export const CHIP_ANCHOR_JITTER_PX = 8

/** Farthest a bumped column may lean, in stage pixels. The top chip reaches this. */
export const CHIP_NUDGE_PX = 6

/** Restack length after the dice return to the rail. The launch delay is 3s. */
export const CHIP_RESTACK_MS = 500

/** Die bounce when it meets a stack or a loose chip. */
export const CHIP_DIE_RESTITUTION = 0.5

/** Loose chips sliding on the felt. Heavier chips stop sooner. */
export const CHIP_FRICTION_PER_S = 2.8

/**
 * Chip mass. 1 peels every chip from the contact up and throws it at full speed.
 * Raise it to peel fewer chips and to throw them a shorter distance.
 * A hit also has to be faster, by this same factor, before anything leaves the stack.
 */
export const CHIP_WEIGHT = 4

/** A loose chip slower than this, times `CHIP_WEIGHT`, does not knock another stack over. */
export const CHIP_TOPPLE_SPEED_PX_PER_S = 40

/** Side-rail and back-wall bounce for loose chips. */
export const CHIP_RAIL_RESTITUTION = 0.4

export const CHIP_MAX_STACK = 10//20
export const CHIP_MAX_COLUMNS = 2
export const CHIP_MAX_BET_CHIPS = CHIP_MAX_STACK * CHIP_MAX_COLUMNS

/**
 * Center of the bottom chip, in stage pixels (1080×1920).
 * Wolf, far Pass line, left of the upside-down lettering.
 */
export const WOLF_PASS_X = 170//200//220
export const WOLF_PASS_Y = 835 //860

export type ChipCharacter = 'wolf' | 'oldLady' | 'cat' | 'oldMan'
export type ChipSide = 'pass' | 'dont'

export interface ChipAnchor {
  character: ChipCharacter
  side: ChipSide
  x: number
  y: number
}

/** Pass is the far line under the rail. Don't Pass is the bar just below it. */
export const CHIP_ANCHORS: readonly ChipAnchor[] = [
  { character: 'wolf', side: 'pass', x: WOLF_PASS_X, y: WOLF_PASS_Y },
  { character: 'oldLady', side: 'pass', x: 430, y: 835 },
  { character: 'cat', side: 'pass', x: 740, y: 870 },
  { character: 'oldMan', side: 'pass', x: 880, y: 1000 },
  // donts
  { character: 'wolf', side: 'dont', x: 195, y: 880 },
  { character: 'oldLady', side: 'dont', x: 440, y: 880 },
  { character: 'cat', side: 'dont', x: 765, y: 930 },
  { character: 'oldMan', side: 'dont', x: 815, y: 1050 },
]

export type ChipColor = 'white' | 'red' | 'green' | 'blue' | 'black'

/** Preview column, bottom to top: larger colors under smaller ones. */
export const WOLF_PASS_PREVIEW_STACK: ChipColor[] = [
  'black',
  'black',
  'black',
  'black',
  'black',
  'black',
  'blue',
  'blue',
  'blue',
  'blue',
  'green',
  'green',
  'green',
  'green',
  'red',
  'red',
  'red',
  'white',
  'white',
  'white',
]
