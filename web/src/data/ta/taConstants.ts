/** Rotation advance when pattern has no instances in window. */
export const TA_CATALOG_STEP_MS = 1_000

/** Dwell on pattern when one or more instances match. */
export const TA_PATTERN_DWELL_MS = 10_000

/** One full in/out pulse on pattern circles and candle envelopes (ms). */
export const TA_PATTERN_PULSE_PERIOD_MS = 1_500

export const TA_PATTERN_PULSE_ALPHA_MIN = 0.42
export const TA_PATTERN_PULSE_ALPHA_MAX = 1

/** Bars before pattern anchor for trend classification (15/30/60 agnostic). */
export const TREND_LOOKBACK_BARS = 12

/** Min slope magnitude (% of price over lookback) to call up/down vs sideways. */
export const TREND_SLOPE_THRESHOLD_PCT = 0.08

export const TA_HIGHLIGHT_COLOR = '#FFE566'
export const TA_ANNOTATION_COLOR = 'rgba(246, 240, 218, 0.92)'
export const TA_BULL_ARROW = '#00c853'
export const TA_BEAR_ARROW = '#d50000'

export const DOJI_BODY_RATIO = 0.1
export const SMALL_BODY_RATIO = 0.35
export const LONG_WICK_RATIO = 0.55
export const MARUBOZU_WICK_MAX = 0.08
export const TWEEZER_BPS = 8
export const GAP_MIN_BPS = 3

export const taWallProximityBps = (minHalfBps: number): number =>
  Math.max(10, Math.min(35, Math.round(minHalfBps * 0.12)))