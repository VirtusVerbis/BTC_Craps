import { REFERENCE_WIDTH } from '../config/constants'

/** Left edge of the plate, in stage pixels. */
export const HISTOGRAM_X = 0

/**
 * Top edge of the plate, in stage pixels.
 * 534 + 240 = 774, the back-wall bottom (`0.403 × 1920`).
 * Raising the height without lowering this grows the plate downward and moves the cut line.
 */
export const HISTOGRAM_Y = 534

/** Plate width, in stage pixels. Full reference stage. */
export const HISTOGRAM_WIDTH = REFERENCE_WIDTH

/** Plate height, in stage pixels. Taller than the tufted wall so the columns can be read. */
export const HISTOGRAM_HEIGHT = 240

/** Darkness of the plate. Columns and numbers stay solid orange on top of this. */
export const HISTOGRAM_PLATE_ALPHA = 0.55

/** Size of the 2–12 labels along the bottom of the plate. */
export const HISTOGRAM_NUMBER_FONT_PX = 36

/** Bar count, as a fraction of `HISTOGRAM_NUMBER_FONT_PX`. */
export const HISTOGRAM_COUNT_FONT_RATIO = 0.75

/** Share of each of the 11 slots taken by that total's column. */
export const HISTOGRAM_COLUMN_WIDTH_FRACTION = 0.5

/** How long the plate takes to rise through the bottom edge. */
export const HISTOGRAM_RISE_MS = 900

/** How long the plate takes to drop back through the bottom edge. */
export const HISTOGRAM_FALL_MS = 900

/** How long the plate stays fully up between the rise and the fall. */
export const HISTOGRAM_VISIBLE_MS = 5 * 60 * 1000

/** How long the plate stays fully down before the next rise. */
export const HISTOGRAM_HIDDEN_MS = 5 * 60 * 1000

/** Trailing count of valid roll totals. */
export const HISTOGRAM_WINDOW = 36

export const HISTOGRAM_ORANGE = '#f7931a'
