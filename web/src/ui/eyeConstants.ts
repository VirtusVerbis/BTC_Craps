import type { ChipCharacter } from './chipConstants'

/** How long one betting glance stays on a column before the next spot. */
export const EYE_LOOK_MS = 1000

/** A die must clear a column line by this far before the eyes follow. */
export const EYE_COLUMN_MARGIN_PX = 40

/** Left column is below this x. Center runs up to the right edge. Stage pixels. */
export const EYE_COLUMN_LEFT_PX = 360

/** Right column starts at this x. */
export const EYE_COLUMN_RIGHT_PX = 720

/** Stagger between characters so their glances do not cut on the same frame. */
export const EYE_GLANCE_STAGGER_MS = 250

/** Share of the painting that contains every eye. The felt below it never swaps. */
export const EYE_STRIP_FRACTION = 0.25

export const EYE_IMAGE_WIDTH = 720
export const EYE_IMAGE_HEIGHT = 1280

export interface EyeRect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Pupil bounds on the 720×1280 paintings, padded by 4px.
 * The pixels outside these boxes match across the four table files.
 */
export const EYE_FACE_RECT: Record<ChipCharacter, EyeRect> = {
  wolf: { x: 135, y: 174, width: 50, height: 32 },
  oldLady: { x: 277, y: 184, width: 45, height: 17 },
  cat: { x: 403, y: 209, width: 56, height: 29 },
  oldMan: { x: 546, y: 195, width: 48, height: 26 },
}
