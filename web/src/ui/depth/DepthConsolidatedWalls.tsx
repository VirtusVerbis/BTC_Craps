import { useEffect, useMemo, useRef, useState } from 'react'
import type { MicrostructureState, WallEvent, WallRecord } from '../../data/microstructure/types'
import { DepthBookChart } from './DepthBookChart'
import { DepthInfoIcon } from './DepthInfoIcon'
import { depthVenueShort } from './depthVenueTheme'
import { DEPTH_WALL_LIVE_VISIBLE_ROWS, DEPTH_WALL_TAPE_MAX_ROWS } from './depthUiConstants'
import { wallEventKey, wallStage1Highlight, wallStage2Flash } from './depthWallHighlight'

const wallReasonLabel: Record<string, string> = {
  active: 'Active',
  pulled: 'Pulled',
  atTouch: 'At touch',
  consumed: 'Consumed',
  flipped: 'Flipped',
}

const formatUsd = (n: number): string =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n).toLocaleString()}`

const formatAge = (at: number, now: number): string => {
  const sec = Math.max(0, Math.round((now - at) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  return `${min}m ago`
}

const liveWallKey = (w: WallRecord): string => `${w.venue}:${w.side}:${w.price}`

interface DepthConsolidatedWallsProps {
  micro: MicrostructureState
}

export const DepthConsolidatedWalls = ({ micro }: DepthConsolidatedWallsProps) => {
  const now = micro.sampledAt
  const prevLivePeaksRef = useRef<Map<string, number>>(new Map())
  const [livePulseKeys, setLivePulseKeys] = useState<Set<string>>(() => new Set())

  const liveWalls = useMemo(() => {
    const rows: WallRecord[] = []
    for (const venue of Object.values(micro.venues)) {
      rows.push(...venue.activeWalls)
    }
    rows.sort((a, b) => b.peakUsd - a.peakUsd)
    return rows
  }, [micro.venues])

  const liveTop = useMemo(() => liveWalls.slice(0, DEPTH_WALL_LIVE_VISIBLE_ROWS), [liveWalls])

  const tapeEvents = useMemo(() => {
    const rows: WallEvent[] = []
    for (const venue of Object.values(micro.venues)) {
      rows.push(...venue.recentEvents)
    }
    rows.sort((a, b) => b.at - a.at)
    return rows.slice(0, DEPTH_WALL_TAPE_MAX_ROWS)
  }, [micro.venues])

  useEffect(() => {
    const nextPulse = new Map<string, number>()
    const pulseNow = new Set<string>()
    for (const w of liveWalls) {
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
  }, [liveWalls])

  return (
    <section className="depth-consolidated-walls">
      <DepthInfoIcon glossaryKey="wallRadar" label="Wall radar" />
      <DepthBookChart micro={micro} topWalls={liveTop} />

      <h3 className="depth-wall-subhead">
        <DepthInfoIcon glossaryKey="wallLiveSection" label="Live walls" />
      </h3>
      <ul className="depth-wall-list">
        {liveTop.length === 0 ? <li className="depth-muted">No active large walls in band.</li> : null}
        {liveTop.map((w) => {
          const key = liveWallKey(w)
          const highlight = wallStage1Highlight(w.reason, w.peakUsd)
          const pulse = livePulseKeys.has(key)
          const classes = [
            highlight ? 'depth-wall-row--highlight' : '',
            pulse ? 'depth-wall-row--live-pulse' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={key} className={classes || undefined}>
              <span className="depth-wall-source">{depthVenueShort[w.venue]}</span>{' '}
              {w.side === 'bid' ? 'BID' : 'ASK'} ${w.price.toLocaleString()} · {w.peakBtc.toFixed(1)} BTC (
              {formatUsd(w.peakUsd)}) · {wallReasonLabel[w.reason] ?? w.reason}
            </li>
          )
        })}
      </ul>

      <h3 className="depth-wall-subhead">
        <DepthInfoIcon glossaryKey="wallTapeSection" label="Tape" />
      </h3>
      <ul className="depth-wall-list">
        {tapeEvents.length === 0 ? <li className="depth-muted">No recent wall events.</li> : null}
        {tapeEvents.map((e) => {
          const key = wallEventKey(e.venue, e.side, e.price, e.at, e.reason)
          const highlight = wallStage1Highlight(e.reason, e.peakUsd)
          const flash = wallStage2Flash(e.reason, e.peakUsd)
          const classes = [
            highlight ? 'depth-wall-row--highlight' : '',
            flash ? 'depth-wall-row--flash' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <li key={key} className={classes || undefined}>
              <span className="depth-wall-source">{depthVenueShort[e.venue]}</span>{' '}
              {e.side === 'bid' ? 'BID' : 'ASK'} ${e.price.toLocaleString()} · {formatUsd(e.peakUsd)} ·{' '}
              {wallReasonLabel[e.reason] ?? e.reason}{' '}
              <span className="depth-wall-age">{formatAge(e.at, now)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}