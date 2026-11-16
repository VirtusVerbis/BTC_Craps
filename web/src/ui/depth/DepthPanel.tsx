import type { OpenInterestSnapshot } from '../../data/openInterest'
import type { MicrostructureState } from '../../data/microstructure/types'
import { DEPTH_PANEL_SLIDE_MS } from './depthConstants'
import { DepthConsolidatedWalls } from './DepthConsolidatedWalls'
import { DepthGlobalHeader } from './DepthGlobalHeader'
import { DepthMergedTimeline } from './DepthMergedTimeline'
import { DepthVenueStrip } from './DepthVenueStrip'

interface DepthPanelProps {
  open: boolean
  onClose: () => void
  micro: MicrostructureState
  openInterest: OpenInterestSnapshot | null
}

export const DepthPanel = ({ open, onClose, micro, openInterest }: DepthPanelProps) => {
  return (
    <div
      className={open ? 'depth-panel depth-panel-open' : 'depth-panel'}
      style={{ transitionDuration: `${DEPTH_PANEL_SLIDE_MS}ms` }}
      aria-hidden={!open}
    >
      <div className="depth-panel-toolbar">
        <h2 className="depth-panel-title">Depth</h2>
        <button type="button" className="depth-panel-close" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="depth-panel-scroll" role="region" aria-label="Depth microstructure">
        <DepthGlobalHeader micro={micro} openInterest={openInterest} />
        <DepthMergedTimeline micro={micro} />
        <DepthConsolidatedWalls micro={micro} />
        <DepthVenueStrip micro={micro} />
      </div>
    </div>
  )
}