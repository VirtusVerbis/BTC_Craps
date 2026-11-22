/** Pivot high/low must dominate this many bars on each side. */
export const STRUCT_PIVOT_RADIUS = 2

/** Minimum bars between pivot indices when matching multi-peak patterns. */
export const STRUCT_MIN_PIVOT_SPAN = 3

/** Max bps difference for two peaks/troughs at the “same” level. */
export const STRUCTURE_LEVEL_BPS = 8

/** Close must break pivot level by this many bps to count as confirmed. */
export const STRUCTURE_BREAK_BPS = 5

/** Range: second window high-low must be ≤ this fraction of first window. */
export const STRUCT_RANGE_COMPRESSION_MAX = 0.72

/** Each range window is this many bars (half of ~60 bar chart). */
export const STRUCT_RANGE_WINDOW_BARS = 24