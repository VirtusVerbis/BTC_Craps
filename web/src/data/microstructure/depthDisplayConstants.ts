/**
 * Depth panel display tuning — change these to adjust timeline bar width and chart range.
 */

export const DEPTH_BUCKET_MS = 5_000

export const DEPTH_WINDOW_15_MIN_BUCKETS = 180
export const DEPTH_WINDOW_30_MIN_BUCKETS = 360
export const DEPTH_WINDOW_60_MIN_BUCKETS = 720

/** Fewer columns after merge ⇒ wider bars. */
export const DEPTH_TIMELINE_TARGET_DISPLAY_COLS = 96
/** Minimum bitmap pixels per merged column (also sets scroll width floor). */
export const DEPTH_TIMELINE_MIN_COL_PX = 8
export const DEPTH_TIMELINE_CANVAS_MIN_WIDTH = 900

/** Cumulative book chart: ±bps from each venue mid on the X axis (fixed scale). */
export const DEPTH_BOOK_CHART_MAX_BPS = 120

/** Stretch scale: include book levels out to this bps span (or until the book ends). */
export const DEPTH_BOOK_CHART_STRETCH_MAX_BPS = 500

/** Book levels shown on the chart refresh on this cadence (matches depth sampling). */
export const DEPTH_BOOK_CHART_REFRESH_MS = 5_000