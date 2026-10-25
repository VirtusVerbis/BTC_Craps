/** Both dice use this size at the bottom edge of the stage. */
export const DIE_LAUNCH_SIZE_PX = 40//57//45

/**
 * Extra stage pixels kept between either die and a Pass or Don't Pass stack
 * when the shooter picks a launch spot. 0 is a grazing miss.
 */
export const DIE_LAUNCH_STACK_MARGIN_PX = 18

/** Size at the back wall, relative to `DIE_LAUNCH_SIZE_PX`. */
export const DIE_DEPTH_SCALE = 0.6//0.6//0.50

/** Face opacity. Pips stay opaque. Midnight faces ignore this and stay solid. */
export const DIE_FACE_ALPHA = 0.65//0.55

/** Midnight 1-face mark, as a fraction of the face. The mark sits in a square of this size. */
export const DIE_MIDNIGHT_MARK_SCALE = 0.8

/** How far the seam feather reaches in from the edge where two faces meet, as a fraction of the face. */
export const DIE_MIDNIGHT_RIM_FRACTION = 0.03

/** Time for one midnight shimmer sweep. The sweep repeats. Raise it to slow the sweep. */
export const DIE_MIDNIGHT_SHIMMER_MS = 2_400

/**
 * How long one rainbow die color stays before the next.
 * 50 matches the roll streak. Raise it to slow the dice, lower it to speed them up.
 */
export const DIE_RAINBOW_STEP_MS = 50

/** Camera lean at the launch rail. Negative tips the near side up. */
export const DIE_LAUNCH_TILT_DEG = -55

/** Camera lean at the back wall. Positive tips the opposite way from the launch rail. */
export const DIE_BACK_WALL_TILT_DEG = -20

/**
 * Stage pixels between the tilted near edge and the bottom of the table.
 * `.stage` is border-box with a 2px border, so 4px of the 1920-tall space is
 * already past the clip. The rest is air so the face toward the shooter stays visible.
 */
export const DIE_NEAR_EDGE_CLEARANCE_PX = 6

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
export const DIE_SPIN_KICK = 1.4// 0.18
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
export const DIE_MIN_REACH_FRACTION =  0.973//0.983 //0.985

/**
 * Added to Coinbase-buy upward speed, in px/s. Same boost at every volume, including zero.
 * Full Coinbase buy is about 1000 px/s, so a few hundred is a modest extra arc.
 * Above zero, a throw can start with no Coinbase buy. Binance buy must still be positive.
 */
export const DIE_UP_ADD_PX_PER_S = 300

/** Shooter-mode countdown before one auto roll. */
export const SHOT_CLOCK_MS = 60_000

/** Upward travel, in stage pixels, required before a stroke launches. */
export const GESTURE_MIN_DISTANCE_PX = 64

/** Release speed is the upward travel over this tail of the stroke. */
export const GESTURE_RELEASE_WINDOW_MS = 80

/**
 * Stage pixels per second of the finger.
 * Min lands at mid-felt, wall reaches the back wall, and no-roll clears it.
 */
export const GESTURE_SPEED_MIN_PX_PER_S = 3100//1350//450
export const GESTURE_SPEED_WALL_PX_PER_S = 5000//2300//1400
export const GESTURE_SPEED_NO_ROLL_PX_PER_S = 6400//3000//2100

/** First landing of the slowest valid flick, as a fraction of the depth to the back wall. */
export const GESTURE_MID_FELT_FRACTION = 0.5

/** Air time of a legal flick. Forward speed moves the landing; lift stays on this arc. */
export const GESTURE_ARC_SEC = 0.85

/**
 * Drawn size at full lift, relative to the depth size.
 * A steep flick crests near 63px. In the hand the dice stay at `DIE_LAUNCH_SIZE_PX`.
 */
export const DIE_ARC_LIFT_SCALE = 1.75

/** Height that counts as full lift. The gesture crest is about this high. */
export const DIE_ARC_LIFT_HEIGHT_PX = 220

/** Drawn tumble rate at full lift. 1 is the simulation spin. */
export const DIE_ARC_SPIN_MIN = 0.45

/** Forward speed at and above the no-roll line, relative to the speed that lands on the wall. */
export const GESTURE_OVERSHOOT_FORWARD_SCALE = 1.45

/** Lean (sideways / upward) that maps to a full shared side spin. */
export const GESTURE_MAX_LEAN = 0.3//0.65

/** Forward tumble on every flick, including a straight one. Side lean is added on top. */
export const GESTURE_BASE_SPIN = 4

/** Hammer (sideways, x) must peak at least this hard, in m/s², before it is added. */
export const SHAKE_THRESHOLD_X_MPS2 = 10

/** Upward lift (y) must peak at least this hard, in m/s², before it is added. */
export const SHAKE_THRESHOLD_Y_MPS2 = 10

/** Book push away from the face (−z) must peak at least this hard, in m/s², before it is added. */
export const SHAKE_THRESHOLD_Z_MPS2 = 10

/** Quiet time after the last spike before the dice launch. The shot clock is the long listen. */
export const SHAKE_WINDOW_MS = 400//3000

/**
 * While Shake to Roll is on, a finger flick does not throw. The shake window is the only launch.
 * Set this false to let a flick throw again.
 */
export const SHAKE_DISABLE_FLICK = true

/** Center-screen bars for the live axes and the totals that launch. */
export const SHAKE_DEBUG_BARS = false//true

/** After a finger lifts, ignore motion this long so the flick's follow-through cannot launch. */
export const SHAKE_POINTER_TAIL_MS = 280

/** How long a tap waits for a real motion sample before the switch stays off. */
export const SHAKE_PROBE_MS = 2500

/** Hammer launch peak that maps to a back-wall throw. A harder peak clears the wall. */
export const SHAKE_HAMMER_WALL_MPS2 = 14
export const SHAKE_HAMMER_CLEAR_MPS2 = 26

/** Extra upward speed, in px/s, for each m/s² of upward acceleration. Capped. */
export const SHAKE_HAMMER_LIFT_GAIN = 40
export const SHAKE_HAMMER_LIFT_MAX = 1800

/** Sideways acceleration, in m/s², that becomes a full side spin. */
export const SHAKE_HAMMER_LEAN_MPS2 = 10

/** Book launch peak that maps to a back-wall throw. A push reads lower than a hammer flick. */
export const SHAKE_BOOK_WALL_MPS2 = 12
export const SHAKE_BOOK_CLEAR_MPS2 = 24
export const SHAKE_BOOK_LIFT_GAIN = 40
export const SHAKE_BOOK_LIFT_MAX = 1800
export const SHAKE_BOOK_LEAN_MPS2 = 10

/** Yellow used for the precision reticle, arc, and angle ray. */
export const PRECISION_AIM_COLOR = '#FFE566'

/** Constant thickness of the precision aim strip, in stage pixels. */
export const PRECISION_AIM_THICKNESS_PX = 14

/** Loft of today's wall-reaching flick. A refresh starts here. */
export const PRECISION_DEFAULT_ANGLE_DEG = 37

/** Stage pixels of vertical drag that change the loft by one degree. */
export const PRECISION_ANGLE_DRAG_PX = 8

/** Movement below this, in stage pixels, does not commit a phase. */
export const PRECISION_DRAG_MIN_PX = 12

/** On-screen pixels the target reticle sits up-table from a drag. */
export const PRECISION_RETICLE_LEAD_SCREEN_PX = 50//25

/**
 * Over-the-top spin before `DIE_FORWARD_SPIN_SCALE`. Positive rolls the top toward the back wall.
 * Matches `GESTURE_BASE_SPIN`.
 */
export const PRECISION_SPIN_DEFAULT = 4

/** Fastest swipe in either direction, in the same units as `PRECISION_SPIN_DEFAULT`. */
export const PRECISION_SPIN_MAX = 8

/** Up or down travel required before a spin swipe replaces the preset. */
export const PRECISION_SPIN_MIN_DISTANCE_PX = 48

/** Finger speed that reaches `PRECISION_SPIN_MAX`. */
export const PRECISION_SPIN_FULL_PX_PER_S = 1800

/** Drawn size of the spin-phase preview dice. */
export const PRECISION_SPIN_PREVIEW_PX = 100

/** How long one ghost trip from the rail to the reticle takes. */
export const PRECISION_GHOST_LOOP_MS = 1400

/** Gap between the arrow tip and the reticle center. */
export const PRECISION_ARROW_GAP_PX = 36

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
export const PUCK_ON_9_SCALE = 0.34//0.31

export const PUCK_ON_8_X = 190
export const PUCK_ON_8_Y = 1290
export const PUCK_ON_8_SCALE = 0.34//0.34

export const PUCK_ON_6_X = 180
export const PUCK_ON_6_Y = 1420
export const PUCK_ON_6_SCALE = 0.34//0.37

export const PUCK_ON_5_X = 170
export const PUCK_ON_5_Y = 1540
export const PUCK_ON_5_SCALE = 0.36//0.39

export const PUCK_ON_4_X = 150
export const PUCK_ON_4_Y = 1660
export const PUCK_ON_4_SCALE = 0.36 //0.41
