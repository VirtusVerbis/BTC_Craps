import { ROLL_STREAK_COLORS } from '../rollStreak'

/** Stagger between chars on spot AVG rail (slower than Hot Shooter’s 50ms). */
export const HEATMAP_SPOT_AVG_COLOR_STEP_MS = 104

/** One full Hot Shooter color cycle per character (`roll-streak-rainbow`). */
export const HEATMAP_SPOT_AVG_CYCLE_MS = ROLL_STREAK_COLORS.length * HEATMAP_SPOT_AVG_COLOR_STEP_MS

export const formatSpotAvgLabel = (price: number): string =>
  price > 0 ? `~$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'