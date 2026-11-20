/** Full down-then-up scroll cycle for depth panel auto-scroll (tuner). */
export const DEPTH_PING_PONG_CYCLE_MS = 60_000

/** Visible rows in scroll viewports (taker, walls, tape). */
export const DEPTH_SCROLL_VISIBLE_ROWS = 5

/** Tape events rendered per side (scrollable); viewport still shows {@link DEPTH_SCROLL_VISIBLE_ROWS}. */
export const DEPTH_WALL_TAPE_RENDER_MAX = 24

/** Visible tape rows (legacy name); prefer {@link DEPTH_SCROLL_VISIBLE_ROWS}. */
export const DEPTH_WALL_TAPE_MAX_ROWS = DEPTH_SCROLL_VISIBLE_ROWS

/** Stack mode: fixed pixel height per venue band; canvas scrolls inside viewport. */
export const DEPTH_BOOK_STACK_ROW_MIN_PX = 52

/** @deprecated Live walls use one bid + one ask per venue; see `buildLiveBookWalls`. */
export const DEPTH_WALL_LIVE_VISIBLE_ROWS = DEPTH_SCROLL_VISIBLE_ROWS

/** @deprecated use DEPTH_WALL_LIVE_VISIBLE_ROWS */
export const DEPTH_WALL_LIST_VISIBLE_ROWS = DEPTH_WALL_LIVE_VISIBLE_ROWS