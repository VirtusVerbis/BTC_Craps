/** Both dice use this size at the bottom edge of the stage. */
export const DIE_LAUNCH_SIZE_PX = 50

/** Size at the back wall, relative to `DIE_LAUNCH_SIZE_PX`. */
export const DIE_DEPTH_SCALE = 0.50

/** Red face opacity. Pips stay opaque. */
export const DIE_FACE_ALPHA = 0.55

/** Hold on the bottom edge before a throw. */
export const DIE_LAUNCH_DELAY_MS = 3000

/** How long the total or "No Roll!" stays up. */
export const DIE_RESULT_HOLD_MS = 2000

/** Trailing trade window sampled at launch. Independent of the overlay's 5s reset. */
export const DIE_VOLUME_WINDOW_MS = 3000

/**
 * Back-wall rectangle, fractions of the stage height.
 * Measured on `craps-scene-layout_onepiece.png`: dark tufted wall under the chip rack.
 */
export const DIE_WALL_TOP_FRACTION = 0.331
export const DIE_WALL_BOTTOM_FRACTION = 0.403

export const DIE_GRAVITY_PX_PER_S2 = 2400
export const DIE_FELT_RESTITUTION = 0.42
export const DIE_WALL_RESTITUTION = 0.55
/** Horizontal speed kept on a felt bounce. */
export const DIE_FELT_SPEED_KEEP = 0.62
/** Exponential damping while a die is sliding on the felt. */
export const DIE_SLIDE_DAMP_PER_S = 2.2
/** How much spin becomes a sideways kick on contact. */
export const DIE_SPIN_KICK = 0.18
export const DIE_SPIN_DAMP = 0.45

export const DIE_REST_SPEED_PX_PER_S = 70
export const DIE_REST_VERTICAL_PX_PER_S = 80
export const DIE_MAX_FLIGHT_MS = 20_000

/**
 * Time for a full-strength throw to cover the felt. Forward and upward speed are
 * derived from the wall distance so both dice scale together when that distance changes.
 */
export const DIE_FULL_REACH_SEC = 0.45
export const DIE_MAX_SPIN_RAD_PER_S = 12

/** Multiplier on world-X tumble for both dice. 1 matches the sell-volume spin rate. */
export const DIE_FORWARD_SPIN_SCALE = 2

/**
 * Nearest aim for a throw that has already launched, as a fraction of felt depth.
 * Buy volume fills the rest of the way to the back wall.
 */
export const DIE_MIN_REACH_FRACTION = 0.95

/** Log-scale references for one volume window. Tune per exchange. */
export const DIE_BINANCE_BUY_REF = 6
export const DIE_COINBASE_BUY_REF = 1.5
export const DIE_BINANCE_SELL_REF = 6
export const DIE_COINBASE_SELL_REF = 1.5
