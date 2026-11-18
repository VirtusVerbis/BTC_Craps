import {
  HEATMAP_PRICE_AXIS_MIN_HALF_BPS,
  HEATMAP_PRICE_AXIS_MIN_HALF_BPS_MAX,
  HEATMAP_PRICE_BAND_BPS,
  HEATMAP_PRICE_BAND_BPS_MAX,
} from './depthHeatmapPriceBins'

/** Chart height at which the heatmap uses the default band / axis half-span. */
export const HEATMAP_VIEWPORT_REF_CHART_H = 400
/** Chart height at which band and axis reach their maximum viewport span. */
export const HEATMAP_VIEWPORT_MAX_CHART_H = 880

export type HeatmapViewport = {
  bandBps: number
  minHalfBps: number
}

const lerp = (t: number, lo: number, hi: number): number => lo + t * (hi - lo)

/** Map chart pixel height → depth band (bps) and minimum Y-axis half-span (bps). */
export const heatmapViewportForChartHeight = (chartH: number): HeatmapViewport => {
  const h = Math.max(HEATMAP_VIEWPORT_REF_CHART_H, chartH)
  const t =
    HEATMAP_VIEWPORT_MAX_CHART_H <= HEATMAP_VIEWPORT_REF_CHART_H
      ? 1
      : Math.min(1, (h - HEATMAP_VIEWPORT_REF_CHART_H) / (HEATMAP_VIEWPORT_MAX_CHART_H - HEATMAP_VIEWPORT_REF_CHART_H))

  const bandBps = Math.round(lerp(t, HEATMAP_PRICE_BAND_BPS, HEATMAP_PRICE_BAND_BPS_MAX))
  const minHalfBps = Math.round(lerp(t, HEATMAP_PRICE_AXIS_MIN_HALF_BPS, HEATMAP_PRICE_AXIS_MIN_HALF_BPS_MAX))
  return { bandBps, minHalfBps }
}