/**
 * Bonus Craps spots drawn on top of the felt. The printed layout has no
 * All Small, Make 'Em All, or All Tall boxes.
 *
 * `x` and `y` are the center of each square, in stage pixels (1080×1920).
 * The same point is where a chip stack for that bet should sit.
 * Corner radius still scales with the square. The font does not.
 */

/**
 * Edge length of every square. Sized to `A_SML` at `BONUS_FIELD_FONT_PX`
 * with a few pixels of air inside the border.
 */
export const BONUS_FIELD_SIZE_PX = 82

/** Label size, in stage pixels. Stays put when the square changes. */
export const BONUS_FIELD_FONT_PX = 22

/** Corner radius as a fraction of `BONUS_FIELD_SIZE_PX`. */
export const BONUS_FIELD_RADIUS_RATIO = 0.16

/**
 * Lays each square back onto the felt. 0 is flat to the screen.
 * Around 30 matches the table plane in the upper half of the layout.
 */
export const BONUS_FIELD_TILT_DEG =  34

/** Camera distance for the tilt. Lower shrinks the top edge faster. */
export const BONUS_FIELD_PERSPECTIVE_PX = 420

/**
 * Side-edge lean at the left or right rail, in degrees.
 * A square on the right leans its top toward center. One on the left leans the other way.
 * 0 at the middle of the table.
 */
export const BONUS_FIELD_LEAN_DEG = 9

/**
 * Across-table slope at the left or right rail, in degrees.
 * Drops the outer edge so the top and bottom follow the felt lines.
 */
export const BONUS_FIELD_SLOPE_DEG = 0// 7

/** All Tall. Top of the column, upper right of the felt. */
export const BONUS_TALL_X = 977
export const BONUS_TALL_Y = 900

/** Make 'Em All. Directly under All Tall. */
export const BONUS_ALL_X = 990
export const BONUS_ALL_Y = 980

/** All Small. Directly under Make 'Em All. */
export const BONUS_SMALL_X = 1002
export const BONUS_SMALL_Y = 1060
