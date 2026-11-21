import { useEffect, useState } from 'react'
import type { MicrostructureService } from '../../data/microstructure/microstructureService'
import { DEPTH_PANEL_SLIDE_MS } from './depthConstants'
import { DepthConsolidatedWalls } from './DepthConsolidatedWalls'
import { DepthGlobalHeader } from './DepthGlobalHeader'
import { DepthMergedTimeline } from './DepthMergedTimeline'
import { persistOverviewOpen, readOverviewOpen } from './depthOverviewToggle'
import {
  persistLiveWallsOpen,
  persistTapeOpen,
  readLiveWallsOpen,
  readTapeOpen,
} from './depthWallSectionToggles'
import { useMicrostructure } from './useMicrostructure'

interface DepthPanelProps {
  open: boolean
  onClose: () => void
  microstructureService: MicrostructureService
}

export const DepthPanel = ({
  open,
  onClose,
  microstructureService,
}: DepthPanelProps) => {
  const micro = useMicrostructure(microstructureService, open)
  const [overviewOpen, setOverviewOpen] = useState(readOverviewOpen)
  const [liveWallsOpen, setLiveWallsOpen] = useState(readLiveWallsOpen)
  const [tapeOpen, setTapeOpen] = useState(readTapeOpen)

  useEffect(() => {
    persistOverviewOpen(overviewOpen)
  }, [overviewOpen])

  useEffect(() => {
    persistLiveWallsOpen(liveWallsOpen)
  }, [liveWallsOpen])

  useEffect(() => {
    persistTapeOpen(tapeOpen)
  }, [tapeOpen])

  const allSectionsOpen = overviewOpen && liveWallsOpen && tapeOpen
  const toggleAllSections = () => {
    const next = !allSectionsOpen
    setOverviewOpen(next)
    setLiveWallsOpen(next)
    setTapeOpen(next)
  }

  const chartsEqualGrow = !overviewOpen

  return (
    <div
      className={open ? 'depth-panel depth-panel-open' : 'depth-panel'}
      style={{ transitionDuration: `${DEPTH_PANEL_SLIDE_MS}ms` }}
      aria-hidden={!open}
    >
      <div className="depth-panel-toolbar">
        <h2 className="depth-panel-title">Depth</h2>
        <button
          type="button"
          className="depth-panel-close depth-panel-toolbar-center"
          onClick={toggleAllSections}
          aria-label={allSectionsOpen ? 'Collapse all depth sections' : 'Expand all depth sections'}
        >
          {allSectionsOpen ? 'Collapse All' : 'Expand All'}
        </button>
        <button type="button" className="depth-panel-close" onClick={onClose}>
          Close
        </button>
      </div>
      {open ? (
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
            {overviewOpen ? <DepthGlobalHeader micro={micro} /> : null}
          </section>
          <div
            className={
              chartsEqualGrow ? 'depth-charts-stack depth-charts-stack--equal-grow' : 'depth-charts-stack'
            }
          >
            <DepthMergedTimeline micro={micro} />
            <DepthConsolidatedWalls
              micro={micro}
              forceChartsGrow={chartsEqualGrow}
              liveWallsOpen={liveWallsOpen}
              setLiveWallsOpen={setLiveWallsOpen}
              tapeOpen={tapeOpen}
              setTapeOpen={setTapeOpen}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}