import type { PatternCatalogEntry } from '../../data/ta/taTypes'
import type { TaStripPlacement } from './taStripPlacement'

type TaHeatmapStripProps = {
  visible: boolean
  placement?: TaStripPlacement
  entry: PatternCatalogEntry
  hasHits: boolean
  biasLabel: string | null
  wallLine: string | null
  oiLine: string | null
  announceExtra: string | null
}

export const TaHeatmapStrip = ({
  visible,
  placement = 'top-right',
  entry,
  hasHits,
  biasLabel,
  wallLine,
  oiLine,
  announceExtra,
}: TaHeatmapStripProps) => {
  if (!visible) return null
  const liveText = [
    entry.displayName,
    hasHits && biasLabel ? biasLabel : null,
    hasHits ? entry.blurb : null,
    wallLine,
    oiLine,
    announceExtra,
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <div className={`depth-ta-strip depth-ta-strip--${placement}`} role="status" aria-live="polite">
      <p className="depth-ta-strip-name">{entry.displayName}</p>
      {hasHits ? (
        <>
          {biasLabel ? <p className="depth-ta-strip-bias">{biasLabel}</p> : null}
          <p className="depth-ta-strip-blurb">{entry.blurb}</p>
          {wallLine ? <p className="depth-ta-strip-wall">{wallLine}</p> : null}
          {oiLine ? <p className="depth-ta-strip-oi">{oiLine}</p> : null}
        </>
      ) : null}
      <span className="depth-ta-sr-only">{liveText}</span>
    </div>
  )
}