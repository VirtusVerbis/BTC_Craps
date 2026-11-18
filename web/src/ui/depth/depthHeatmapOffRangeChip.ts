import type { CSSProperties } from 'react'
import { heatmapColor01 } from './depthHeatmapColor'

/** Matches `.depth-heatmap-offrange-chip` default min (rem); 30% above prior 0.62. */
export const HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM = 0.806
/** Upper cap when pool USD hits session color scale max. */
export const HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM = 0.95

export const offRangeChipIntensity = (poolUsd: number, scaleMaxUsd: number): number => {
  if (!(scaleMaxUsd > 0) || !(poolUsd > 0)) return 0
  return Math.max(0, Math.min(1, poolUsd / scaleMaxUsd))
}

/** Text color + size track the resting-USD legend (`heatmapColor01`, scale max). */
export const offRangeChipStyle = (poolUsd: number, scaleMaxUsd: number): CSSProperties => {
  const t = offRangeChipIntensity(poolUsd, scaleMaxUsd)
  const fontRem =
    HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM + t * (HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM - HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM)
  return {
    color: heatmapColor01(t),
    fontSize: `${fontRem}rem`,
  }
}