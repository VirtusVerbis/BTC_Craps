import { WALL_MIN_USD } from '../../data/microstructure/wallTracker'
import type { WallEndReason } from '../../data/microstructure/types'

export const WALL_HIGHLIGHT_PEAK_USD = WALL_MIN_USD * 2
export const WALL_FLASH_PEAK_USD = WALL_MIN_USD * 4

const SIGNIFICANT_REASONS: WallEndReason[] = ['pulled', 'atTouch', 'consumed', 'flipped']

export const wallStage1Highlight = (reason: WallEndReason, peakUsd: number): boolean =>
  SIGNIFICANT_REASONS.includes(reason) || peakUsd >= WALL_HIGHLIGHT_PEAK_USD

export const wallStage2Flash = (reason: WallEndReason, peakUsd: number): boolean =>
  SIGNIFICANT_REASONS.includes(reason) || peakUsd >= WALL_FLASH_PEAK_USD

export const wallEventKey = (venue: string, side: string, price: number, at: number, reason: string): string =>
  `${venue}:${side}:${price}:${at}:${reason}`