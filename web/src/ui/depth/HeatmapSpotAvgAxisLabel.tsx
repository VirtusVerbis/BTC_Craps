import { HEATMAP_SPOT_AVG_COLOR_STEP_MS, HEATMAP_SPOT_AVG_CYCLE_MS } from './depthHeatmapSpotAvg'

interface HeatmapSpotAvgAxisLabelProps {
  text: string
  topPct: number
  title?: string
}

export const HeatmapSpotAvgAxisLabel = ({ text, topPct, title }: HeatmapSpotAvgAxisLabelProps) => {
  if (!(text.length > 0) || text === '—') return null

  return (
    <span
      className="depth-timeline-axis-tick depth-heatmap-venue-axis-label depth-heatmap-spot-avg-label"
      style={{ top: `${topPct}%` }}
      title={title ?? 'Spot typical price (latest bar)'}
    >
      {Array.from(text).map((char, index) => (
        <span
          key={index}
          className="rainbow-letter"
          style={{
            animationDelay: `${-index * HEATMAP_SPOT_AVG_COLOR_STEP_MS}ms`,
            animationDuration: `${HEATMAP_SPOT_AVG_CYCLE_MS}ms`,
          }}
        >
          {char}
        </span>
      ))}
    </span>
  )
}