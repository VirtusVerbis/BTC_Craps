import { HEATMAP_WINDOW_24H_MIN, type HeatmapTimelineWindowMin } from '../../heatmapCandleSeries'

export const structWindowSupported = (windowMin: HeatmapTimelineWindowMin): boolean =>
  windowMin === 60 || windowMin === HEATMAP_WINDOW_24H_MIN