/** @deprecated Live walls use one bid + one ask per venue; see `buildLiveBookWalls`. */
export const DEPTH_WALL_LIVE_VISIBLE_ROWS = 5

/** Tape events per side (BID / ASK), sorted by peak BTC. */
export const DEPTH_WALL_TAPE_MAX_ROWS = 5

/** @deprecated use DEPTH_WALL_LIVE_VISIBLE_ROWS */
export const DEPTH_WALL_LIST_VISIBLE_ROWS = DEPTH_WALL_LIVE_VISIBLE_ROWS