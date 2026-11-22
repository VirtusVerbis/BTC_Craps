import {
  HEATMAP_DAILY_MA_COLOR_200,
  HEATMAP_DAILY_MA_COLOR_50,
  type DailySmaRailLine,
  type DailySmaRailPlacement,
  type DailySmaRailSide,
} from '../../data/heatmapDailySma'

const LINE_LABEL: Record<DailySmaRailLine, string> = {
  '50': '50D SMA',
  '200': '200D SMA',
}

const LINE_COLOR: Record<DailySmaRailLine, string> = {
  '50': HEATMAP_DAILY_MA_COLOR_50,
  '200': HEATMAP_DAILY_MA_COLOR_200,
}

const LINE_BORDER: Record<DailySmaRailLine, string> = {
  '50': 'rgba(255, 152, 0, 0.45)',
  '200': 'rgba(240, 98, 146, 0.45)',
}

const LINE_DASH_CLASS: Record<DailySmaRailLine, string> = {
  '50': 'depth-heatmap-dma-chip-dash--50',
  '200': 'depth-heatmap-dma-chip-dash--200',
}

const formatAxisPrice = (price: number): string =>
  `$${Math.round(price).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const bpsFromMid = (mid: number, price: number): number => {
  if (!(mid > 0)) return 0
  return Math.round((Math.abs(price - mid) / mid) * 10_000)
}

const formatRailDetail = (
  placement: DailySmaRailPlacement,
  chartMid: number,
): string => {
  const arrow = placement.side === 'above' ? '↑' : '↓'
  const bps = bpsFromMid(chartMid, placement.price)
  return `${arrow} +${bps} bps · ${formatAxisPrice(placement.price)}`
}

const DmaIdentityChip = ({
  line,
  detail,
}: {
  line: DailySmaRailLine
  detail?: string | null
}) => (
  <span
    className="depth-heatmap-dma-chip depth-heatmap-dma-rail-chip"
    style={{ color: LINE_COLOR[line], borderColor: LINE_BORDER[line] }}
  >
    <span className={`depth-heatmap-dma-chip-dash ${LINE_DASH_CLASS[line]}`} />
    <span className="depth-heatmap-dma-rail-name">{LINE_LABEL[line]}</span>
    {detail ? <span className="depth-heatmap-dma-rail-detail">{detail}</span> : null}
  </span>
)

type HeatmapDailyMaRailLabelsProps = {
  rails: readonly DailySmaRailPlacement[]
  showInBand: boolean
  chartMid: number
}

const railsForSide = (
  rails: readonly DailySmaRailPlacement[],
  side: DailySmaRailSide,
): DailySmaRailPlacement[] =>
  rails
    .filter((r) => r.side === side)
    .sort((a, b) => (a.line === b.line ? 0 : a.line === '50' ? -1 : 1))

export const heatmapDailyMaRailAria = (
  rails: readonly DailySmaRailPlacement[],
  chartMid: number,
): string[] =>
  rails.map((p) => {
    const side = p.side === 'above' ? 'above chart' : 'below chart'
    return `${LINE_LABEL[p.line]} ${side}, ${bpsFromMid(chartMid, p.price)} bps from chart mid, ${formatAxisPrice(p.price)}`
  })

export const HeatmapDailyMaRailLabels = ({ rails, showInBand, chartMid }: HeatmapDailyMaRailLabelsProps) => {
  const topRails = railsForSide(rails, 'above')
  const bottomRails = railsForSide(rails, 'below')

  if (!showInBand && topRails.length === 0 && bottomRails.length === 0) return null

  return (
    <>
      <div className="depth-heatmap-dma-rail-col depth-heatmap-dma-rail-col--top" aria-hidden>
        {showInBand ? (
          <>
            <DmaIdentityChip line="50" detail={null} />
            <DmaIdentityChip line="200" detail={null} />
          </>
        ) : (
          topRails.map((p) => (
            <DmaIdentityChip key={`${p.line}-top`} line={p.line} detail={formatRailDetail(p, chartMid)} />
          ))
        )}
      </div>
      {!showInBand && bottomRails.length > 0 ? (
        <div className="depth-heatmap-dma-rail-col depth-heatmap-dma-rail-col--bottom" aria-hidden>
          {bottomRails.map((p) => (
            <DmaIdentityChip key={`${p.line}-bottom`} line={p.line} detail={formatRailDetail(p, chartMid)} />
          ))}
        </div>
      ) : null}
    </>
  )
}