import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { MicrostructureState, WallEvent, WallRecord } from '../../data/microstructure/types'
import { DepthBookChart } from './DepthBookChart'
import { DepthSessionHeatmap } from './DepthSessionHeatmap'
import { DepthInfoIcon } from './DepthInfoIcon'
import { buildDisplayWallsFromMicro } from './depthLiveBookWalls'
import { depthVenueShort, depthVenueUiColor } from './depthVenueTheme'
import { DEPTH_WALL_TAPE_MAX_ROWS } from './depthUiConstants'
import { renderWallSize } from './depthWallRowMetrics'
import { wallEventKey, wallStage1Highlight, wallStage2Flash } from './depthWallHighlight'
import { useDepthPanelNarrow } from './useDepthPanelNarrow'

const wallReasonLabel: Record<string, string> = {
  active: 'Active',
  pulled: 'Pulled',
  atTouch: 'At touch',
  consumed: 'Consumed',
  flipped: 'Flipped',
}

const formatAge = (at: number, now: number): string => {
  const sec = Math.max(0, Math.round((now - at) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  return `${min}m ago`
}

const liveWallKey = (w: WallRecord): string => `${w.venue}:${w.side}:${w.price}`

const eventPeakBtc = (e: WallEvent): number =>
  e.peakBtc > 0 ? e.peakBtc : e.price > 0 ? e.peakUsd / e.price : 0

const sortEventsByPeakBtcDesc = (rows: readonly WallEvent[]): WallEvent[] =>
  [...rows].sort((a, b) => eventPeakBtc(b) - eventPeakBtc(a))

interface DepthConsolidatedWallsProps {
  micro: MicrostructureState
  forceChartsGrow?: boolean
  liveWallsOpen: boolean
  setLiveWallsOpen: Dispatch<SetStateAction<boolean>>
  tapeOpen: boolean
  setTapeOpen: Dispatch<SetStateAction<boolean>>
}

export const DepthConsolidatedWalls = ({
  micro,
  forceChartsGrow = false,
  liveWallsOpen,
  setLiveWallsOpen,
  tapeOpen,
  setTapeOpen,
}: DepthConsolidatedWallsProps) => {
  const now = micro.sampledAt
  const prevLivePeaksRef = useRef<Map<string, number>>(new Map())
  const [livePulseKeys, setLivePulseKeys] = useState<Set<string>>(() => new Set())

  const narrowPanel = useDepthPanelNarrow()
  const wallsTapeCollapsed = !liveWallsOpen || !tapeOpen
  /** Snapshot collapsed (desktop grow), or mobile with walls/tape collapsed (scroll panel still has a flex slot). */
  const chartsFlexGrow = wallsTapeCollapsed && (forceChartsGrow || narrowPanel)

  const { chartWalls, liveBids, liveAsks } = useMemo(() => buildDisplayWallsFromMicro(micro), [micro])

  const tapeBids = useMemo(() => {
    const rows: WallEvent[] = []
    for (const venue of Object.values(micro.venues)) {
      rows.push(...venue.recentEvents.filter((e) => e.side === 'bid'))
    }
    return sortEventsByPeakBtcDesc(rows).slice(0, DEPTH_WALL_TAPE_MAX_ROWS)
  }, [micro.venues])

  const tapeAsks = useMemo(() => {
    const rows: WallEvent[] = []
    for (const venue of Object.values(micro.venues)) {
      rows.push(...venue.recentEvents.filter((e) => e.side === 'ask'))
    }
    return sortEventsByPeakBtcDesc(rows).slice(0, DEPTH_WALL_TAPE_MAX_ROWS)
  }, [micro.venues])

  useEffect(() => {
    const nextPulse = new Map<string, number>()
    const pulseNow = new Set<string>()
    for (const w of chartWalls) {
      const key = liveWallKey(w)
      nextPulse.set(key, w.peakUsd)
      const prev = prevLivePeaksRef.current.get(key)
      if (prev != null && prev > 0) {
        const delta = Math.abs(w.peakUsd - prev) / prev
        if (delta >= 0.2) pulseNow.add(key)
      }
    }
    prevLivePeaksRef.current = nextPulse
    setLivePulseKeys(pulseNow)
  }, [chartWalls])

  const renderLiveRow = (w: WallRecord) => {
    const key = liveWallKey(w)
    const highlight = wallStage1Highlight(w.reason, w.peakUsd)
    const pulse = livePulseKeys.has(key)
    const classes = [highlight ? 'depth-wall-row--highlight' : '', pulse ? 'depth-wall-row--live-pulse' : '']
      .filter(Boolean)
      .join(' ')
    return (
      <li key={key} className={classes || undefined}>
        <span className="depth-wall-source" style={{ color: depthVenueUiColor(w.venue, w.side) }}>
          {depthVenueShort[w.venue]}
        </span>{' '}
        {renderWallSize(w.price, w.peakBtc, w.peakUsd)} ·{' '}
        {wallReasonLabel[w.reason] ?? w.reason}
      </li>
    )
  }

  const renderTapeRow = (e: WallEvent) => {
    const key = wallEventKey(e.venue, e.side, e.price, e.at, e.reason)
    const highlight = wallStage1Highlight(e.reason, e.peakUsd)
    const flash = wallStage2Flash(e.reason, e.peakUsd)
    const classes = [highlight ? 'depth-wall-row--highlight' : '', flash ? 'depth-wall-row--flash' : '']
      .filter(Boolean)
      .join(' ')
    const btc = eventPeakBtc(e)
    return (
      <li key={key} className={classes || undefined}>
        <span className="depth-wall-source" style={{ color: depthVenueUiColor(e.venue, e.side) }}>
          {depthVenueShort[e.venue]}
        </span>{' '}
        {renderWallSize(e.price, btc, e.peakUsd)} ·{' '}
        {wallReasonLabel[e.reason] ?? e.reason}{' '}
        <span className="depth-wall-age">{formatAge(e.at, now)}</span>
      </li>
    )
  }

  const toggleLiveWalls = () => setLiveWallsOpen((v) => !v)
  const toggleTape = () => setTapeOpen((v) => !v)

  return (
    <section
      className={
        chartsFlexGrow
          ? 'depth-consolidated-walls depth-consolidated-walls--charts-grow'
          : 'depth-consolidated-walls'
      }
    >
      <DepthBookChart micro={micro} topWalls={chartWalls} fillAvailableHeight={chartsFlexGrow} />

      <h3 className="depth-wall-subhead">
        <button
          type="button"
          className="depth-wall-section-toggle"
          onClick={toggleLiveWalls}
          aria-expanded={liveWallsOpen}
          aria-label={liveWallsOpen ? 'Collapse live walls' : 'Expand live walls'}
        >
          <span aria-hidden>{liveWallsOpen ? '▾' : '▸'}</span>
        </button>
        <DepthInfoIcon glossaryKey="wallLiveSection" label="Live walls" />
      </h3>
      {liveWallsOpen ? (
        liveBids.length === 0 && liveAsks.length === 0 ? (
          <p className="depth-muted depth-wall-split-empty">No resting size within the near-mid band.</p>
        ) : (
          <div className="depth-wall-split">
            <div className="depth-wall-split-col">
              <p className="depth-wall-split-label">BID</p>
              <ul className="depth-wall-list depth-wall-list--split">
                {liveBids.length === 0 ? <li className="depth-muted">—</li> : liveBids.map(renderLiveRow)}
              </ul>
            </div>
            <div className="depth-wall-split-col">
              <p className="depth-wall-split-label">ASK</p>
              <ul className="depth-wall-list depth-wall-list--split">
                {liveAsks.length === 0 ? <li className="depth-muted">—</li> : liveAsks.map(renderLiveRow)}
              </ul>
            </div>
          </div>
        )
      ) : null}

      <h3 className="depth-wall-subhead">
        <button
          type="button"
          className="depth-wall-section-toggle"
          onClick={toggleTape}
          aria-expanded={tapeOpen}
          aria-label={tapeOpen ? 'Collapse wall tape' : 'Expand wall tape'}
        >
          <span aria-hidden>{tapeOpen ? '▾' : '▸'}</span>
        </button>
        <DepthInfoIcon glossaryKey="wallTapeSection" label="Tape" />
      </h3>
      {tapeOpen ? (
        tapeBids.length === 0 && tapeAsks.length === 0 ? (
          <p className="depth-muted depth-wall-split-empty">No recent wall events.</p>
        ) : (
          <div className="depth-wall-split">
            <div className="depth-wall-split-col">
              <p className="depth-wall-split-label">BID</p>
              <ul className="depth-wall-list depth-wall-list--split">
                {tapeBids.length === 0 ? <li className="depth-muted">—</li> : tapeBids.map(renderTapeRow)}
              </ul>
            </div>
            <div className="depth-wall-split-col">
              <p className="depth-wall-split-label">ASK</p>
              <ul className="depth-wall-list depth-wall-list--split">
                {tapeAsks.length === 0 ? <li className="depth-muted">—</li> : tapeAsks.map(renderTapeRow)}
              </ul>
            </div>
          </div>
        )
      ) : null}

      <DepthSessionHeatmap micro={micro} fillAvailableHeight={chartsFlexGrow} />
    </section>
  )
}