import type { DailyMaCross } from '../../data/heatmapDailySma'

const formatCrossDayUtc = (dayOpenMs: number): string => {
  const d = new Date(dayOpenMs)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) + ' UTC'
}

type HeatmapDailyMaCrossStripProps = {
  cross: DailyMaCross | null
}

export const HeatmapDailyMaCrossStrip = ({ cross }: HeatmapDailyMaCrossStripProps) => {
  if (!cross) return null
  const title = cross.kind === 'golden' ? 'Golden cross' : 'Death cross'
  const date = formatCrossDayUtc(cross.dayOpenMs)
  const cls =
    cross.kind === 'golden'
      ? 'depth-dma-cross-strip depth-dma-cross-strip--golden depth-dma-cross-strip--top-center'
      : 'depth-dma-cross-strip depth-dma-cross-strip--death depth-dma-cross-strip--top-center'

  return (
    <div className={cls} role="status" aria-live="polite">
      <p className="depth-dma-cross-strip-title">{title}</p>
      <p className="depth-dma-cross-strip-date">{date}</p>
      <span className="depth-ta-sr-only">
        {title} on daily 50 and 200 SMA, {date}. Visible while this UTC day is in the chart time range.
      </span>
    </div>
  )
}