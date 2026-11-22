/**
 * Depth panel display tuning — change these to adjust timeline bar width and chart range.
 */

/** Raw depth sample + UI grid alignment interval. */
export const DEPTH_BUCKET_MS = 2_500
export const DEPTH_SAMPLE_MS = DEPTH_BUCKET_MS
/** Slower sampling when depth UI is closed or tab is hidden; timeline grids carry forward gaps. */
export const DEPTH_SAMPLE_IDLE_MS = 10_000
export const DEPTH_EMIT_MS = 1_250

export const DEPTH_WINDOW_15_MIN_BUCKETS = 360
export const DEPTH_WINDOW_30_MIN_BUCKETS = 720
export const DEPTH_WINDOW_60_MIN_BUCKETS = 1440
/** Session heatmap 24h window (depth color still ~60m live tail only). */
export const DEPTH_WINDOW_24H_BUCKETS = 34_560

/** Ring buffer size (60m at {@link DEPTH_SAMPLE_MS}). */
export const DEPTH_SAMPLE_CAP = DEPTH_WINDOW_60_MIN_BUCKETS

/** Fewer columns after merge ⇒ wider bars. */
export const DEPTH_TIMELINE_TARGET_DISPLAY_COLS = 180
/** Minimum bitmap pixels per merged column when timeline scrolls (merged timeline only). */
export const DEPTH_TIMELINE_MIN_COL_PX = 6
export const DEPTH_TIMELINE_CANVAS_MIN_WIDTH = 900

/** Cumulative book chart: ±bps from each venue mid on the X axis (fixed scale). */
export const DEPTH_BOOK_CHART_MAX_BPS = 120

/** Stretch scale: include book levels out to this bps span (or until the book ends). */
export const DEPTH_BOOK_CHART_STRETCH_MAX_BPS = 500

/** Book levels shown on the chart refresh on this cadence (matches depth sampling). */
export const DEPTH_BOOK_CHART_REFRESH_MS = DEPTH_SAMPLE_MS