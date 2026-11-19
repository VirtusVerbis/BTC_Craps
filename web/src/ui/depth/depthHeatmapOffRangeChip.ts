import type { CSSProperties } from 'react'
import { heatmapColor01, heatmapColor01Rgb, heatmapRgbRelativeLuminance } from './depthHeatmapColor'

/** Matches `.depth-heatmap-offrange-chip` default min (rem). */
export const HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM = 1.259375
/** Upper cap when pool USD hits session color scale max. */
export const HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM = 1.484375

export const offRangeChipIntensity = (poolUsd: number, scaleMaxUsd: number): number => {
  if (!(scaleMaxUsd > 0) || !(poolUsd > 0)) return 0
  return Math.max(0, Math.min(1, poolUsd / scaleMaxUsd))
}

const CHIP_BG_LIGHT: Readonly<[number, number, number, number]> = [255, 255, 255, 0.92]
const CHIP_BG_DARK: Readonly<[number, number, number, number]> = [10, 14, 23, 0.92]
const CHIP_BORDER = 'rgba(246, 240, 218, 0.28)'

const mix = (lo: number, hi: number, u: number): number => lo + (hi - lo) * u

/** Light pill behind dark text; dark pill behind bright legend colors (teal/amber/red). */
export const offRangeChipBackground = (
  textR: number,
  textG: number,
  textB: number,
  intensityT: number,
): string => {
  const lum = heatmapRgbRelativeLuminance(textR, textG, textB)
  const lumBlend = Math.max(0, Math.min(1, (lum - 0.22) / (0.55 - 0.22)))
  const tBlend = Math.max(0, Math.min(1, (intensityT - 0.35) / 0.5))
  const blend = Math.max(lumBlend, tBlend)
  const r = Math.round(mix(CHIP_BG_LIGHT[0], CHIP_BG_DARK[0], blend))
  const g = Math.round(mix(CHIP_BG_LIGHT[1], CHIP_BG_DARK[1], blend))
  const b = Math.round(mix(CHIP_BG_LIGHT[2], CHIP_BG_DARK[2], blend))
  const a = mix(CHIP_BG_LIGHT[3], CHIP_BG_DARK[3], blend)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** Text color + size track the resting-USD legend (`heatmapColor01`, scale max). */
export const offRangeChipStyle = (poolUsd: number, scaleMaxUsd: number): CSSProperties => {
  const t = offRangeChipIntensity(poolUsd, scaleMaxUsd)
  const fontRem =
    HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM + t * (HEATMAP_OFFRANGE_CHIP_FONT_MAX_REM - HEATMAP_OFFRANGE_CHIP_FONT_MIN_REM)
  const [r, g, b] = heatmapColor01Rgb(t)
  return {
    color: heatmapColor01(t),
    background: offRangeChipBackground(r, g, b, t),
    border: `1px solid ${CHIP_BORDER}`,
    fontSize: `${fontRem}rem`,
  }
}