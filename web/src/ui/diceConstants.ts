/** Both dice use this size at the bottom edge of the stage. */
export const DIE_LAUNCH_SIZE_PX = 40//57//45

/** Size at the back wall, relative to `DIE_LAUNCH_SIZE_PX`. */
export const DIE_DEPTH_SCALE = 0.6//0.6//0.50

/** Red face opacity. Pips stay opaque. */
export const DIE_FACE_ALPHA = 0.65//0.55

/** Camera lean at the launch rail. Negative tips the near side up. */
export const DIE_LAUNCH_TILT_DEG = -55

/** Camera lean at the back wall. Positive tips the opposite way from the launch rail. */
export const DIE_BACK_WALL_TILT_DEG = -20 

/** Hold on the bottom edge before a throw. */
export const DIE_LAUNCH_DELAY_MS = 3000

/** How long the total or "No Roll!" stays up. */
export const DIE_RESULT_HOLD_MS = 2000

/** How long a die that cleared the back wall stays visible if it is still on screen. */
export const DIE_NO_ROLL_PAUSE_MS = 800

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
/** Random yaw of a rail bounce, in radians. About 26 degrees. */
export const DIE_WALL_SCATTER_RAD = 0.45
/** Random spin added on each axis when a die hits a rail, in rad/s. */
export const DIE_WALL_SPIN_RAD = 10
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
 * Minimum felt distance for a throw, as a fraction of the depth to the back wall.
 * Forward speed is raised to meet it. Upward speed stays on Coinbase buy volume, plus `DIE_UP_ADD_PX_PER_S`.
 */
export const DIE_MIN_REACH_FRACTION =  0.983 //0.985

/**
 * Added to Coinbase-buy upward speed, in px/s. Same boost at every volume, including zero.
 * Full Coinbase buy is about 1000 px/s, so a few hundred is a modest extra arc.
 * Above zero, a throw can start with no Coinbase buy. Binance buy must still be positive.
 */
export const DIE_UP_ADD_PX_PER_S = 300

/** Log-scale references for one volume window. Tune per exchange. */
export const DIE_BINANCE_BUY_REF = 6
export const DIE_COINBASE_BUY_REF = 1.5
export const DIE_BINANCE_SELL_REF = 6
export const DIE_COINBASE_SELL_REF = 1.5

/** Puck art width. Scale constants multiply this. */
export const PUCK_IMAGE_WIDTH_PX = 291

/** Height of the puck disc above the felt. A die above this flies over it. About two chip walls. */
export const PUCK_COLLISION_HEIGHT_PX = 12

/** OFF puck center, in the dealer-end Don't Come bar. */
export const PUCK_OFF_X = 200
export const PUCK_OFF_Y = 925
export const PUCK_OFF_SCALE = 0.33//0.3

/** ON puck center on each point box. Farther up the felt is slightly smaller. */
export const PUCK_ON_10_X = 230
export const PUCK_ON_10_Y = 1025
export const PUCK_ON_10_SCALE = 0.33//0.3

export const PUCK_ON_9_X = 200
export const PUCK_ON_9_Y = 1150
export const PUCK_ON_9_SCALE = 0.35//0.31

export const PUCK_ON_8_X = 190
export const PUCK_ON_8_Y = 1290
export const PUCK_ON_8_SCALE = 0.37//0.34

export const PUCK_ON_6_X = 180
export const PUCK_ON_6_Y = 1420
export const PUCK_ON_6_SCALE = 0.40//0.37

export const PUCK_ON_5_X = 170
export const PUCK_ON_5_Y = 1540
export const PUCK_ON_5_SCALE = 0.42//0.39

export const PUCK_ON_4_X = 150
export const PUCK_ON_4_Y = 1660
export const PUCK_ON_4_SCALE = 0.45 //0.41
