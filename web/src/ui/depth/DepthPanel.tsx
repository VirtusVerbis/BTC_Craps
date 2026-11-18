import { useEffect, useState } from 'react'
import type { OpenInterestSnapshot } from '../../data/openInterest'
import type { MicrostructureState } from '../../data/microstructure/types'
import { DEPTH_PANEL_SLIDE_MS } from './depthConstants'
import { DepthConsolidatedWalls } from './DepthConsolidatedWalls'
import { DepthGlobalHeader } from './DepthGlobalHeader'
import { DepthMergedTimeline } from './DepthMergedTimeline'
import { persistOverviewOpen, readOverviewOpen } from './depthOverviewToggle'

interface DepthPanelProps {
  open: boolean
  onClose: () => void
  micro: MicrostructureState
  openInterest: OpenInterestSnapshot | null
}

export const DepthPanel = ({ open, onClose, micro, openInterest }: DepthPanelProps) => {
  const [overviewOpen, setOverviewOpen] = useState(readOverviewOpen)

  useEffect(() => {
    persistOverviewOpen(overviewOpen)
  }, [overviewOpen])

  const chartsEqualGrow = !overviewOpen

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
      <div
        className={
          chartsEqualGrow
            ? 'depth-panel-scroll depth-panel-scroll--fill depth-panel-scroll--overview-collapsed'
            : 'depth-panel-scroll depth-panel-scroll--fill'
        }
        role="region"
        aria-label="Depth microstructure"
      >
        <section className="depth-overview-section">
          <h3 className="depth-wall-subhead depth-overview-head">
            <button
              type="button"
              className="depth-wall-section-toggle"
              onClick={() => setOverviewOpen((v) => !v)}
              aria-expanded={overviewOpen}
              aria-label={overviewOpen ? 'Collapse market snapshot' : 'Expand market snapshot'}
            >
              <span aria-hidden>{overviewOpen ? '▾' : '▸'}</span>
            </button>
            <span className="depth-overview-title">Market snapshot</span>
          </h3>
          {overviewOpen ? <DepthGlobalHeader micro={micro} openInterest={openInterest} /> : null}
        </section>
        <div className={chartsEqualGrow ? 'depth-charts-stack depth-charts-stack--equal-grow' : 'depth-charts-stack'}>
          <DepthMergedTimeline micro={micro} />
          <DepthConsolidatedWalls micro={micro} forceChartsGrow={chartsEqualGrow} />
        </div>
      </div>
    </div>
  )
}