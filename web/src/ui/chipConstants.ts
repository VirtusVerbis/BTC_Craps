import { DIE_DEPTH_SCALE, DIE_LAUNCH_SIZE_PX } from './diceConstants'

/** Circle diameter at scalar 1. Starts at the back-wall die size (`57 × 0.6`). */
export const CHIP_WIDTH_PX = Math.round(DIE_LAUNCH_SIZE_PX * DIE_DEPTH_SCALE)

/** Circle diameter. Kept equal to `CHIP_WIDTH_PX` so each chip stays a flat circle. */
export const CHIP_HEIGHT_PX = CHIP_WIDTH_PX

/** Multiplier on diameter and chip thickness. */
export const CHIP_SIZE_SCALAR = 1.2

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

/**
 * Center of the bottom chip, in stage pixels (1080×1920).
 * Wolf, far Pass line, left of the upside-down lettering.
 */
export const WOLF_PASS_X = 200//220
export const WOLF_PASS_Y = 835 //860

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
