import { useEffect, useState, type PointerEvent } from 'react'
import type { ChipColor } from './chipConstants'
import { chipFaceUrl } from './chips/chipFace'
import { OI_LABEL_X, OI_LABEL_Y } from './overlayConstants'
import { formatLiqUsd } from './format'
import { formatShotClock } from './gestureThrow'
import { SHOOTER_BET_AREAS_ON, SHOOTER_HITS, SHOOTER_ODDS_HITBOX_ON, anchorFor, hitAt, isOddsHit } from './shooterBetGeometry'
import { FELT_LABEL, oddsSpotOpen, type FeltBet } from './shooterSlip'
import type { BetControls } from './useDiceThrow'

const TRAY: readonly ChipColor[] = ['white', 'red', 'green', 'blue', 'black']
const STACK_REACH = 40

interface ShooterBetLayerProps {
  active: boolean
  betClockSec: number | null
  purse: number
  showPurse: boolean
  banked: boolean
  felt: readonly FeltBet[]
  point: number | null
  controlsRef: { current: BetControls | null }
}

const nearestStack = (felt: readonly FeltBet[], x: number, y: number): FeltBet | null => {
  let best: FeltBet | null = null
  let bestDist = STACK_REACH
  for (const bet of felt) {
    const anchor = anchorFor(bet.kind, bet.number, bet.spot)
    const dist = Math.hypot(anchor.x - x, anchor.y - y)
    if (dist <= bestDist) {
      best = bet
      bestDist = dist
    }
  }
  return best
}

export const ShooterBetLayer = ({
  active,
  betClockSec,
  purse,
  showPurse,
  banked,
  felt,
  point,
  controlsRef,
}: ShooterBetLayerProps) => {
  const [color, setColor] = useState<ChipColor>('white')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const betting = betClockSec != null

  useEffect(() => {
    if (!betting) setSelectedId(null)
  }, [betting])

  const showGuides = SHOOTER_BET_AREAS_ON || SHOOTER_ODDS_HITBOX_ON
  if (!active && !showGuides) return null

  const onFelt = (event: PointerEvent<SVGElement>) => {
    const controls = controlsRef.current
    if (!betting || !controls) return
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    if (!(rect.width > 0) || !(rect.height > 0)) return
    const x = ((event.clientX - rect.left) / rect.width) * 1080
    const y = ((event.clientY - rect.top) / rect.height) * 1920
    const stack = nearestStack(felt, x, y)
    if (stack) {
      if (stack.id !== selectedId) {
        setSelectedId(stack.id)
        return
      }
      controls.add(stack.kind, stack.number, stack.spot, color)
      return
    }
    const hit = hitAt({ x, y })
    if (!hit) return
    controls.add(hit.kind, hit.number, hit.spot, color)
    setSelectedId(null)
  }

  const selected = felt.find((bet) => bet.id === selectedId) ?? null

  return (
    <div className="shooter-bet-layer" aria-hidden={!betting && !showGuides}>
      <svg className="shooter-bet-hits" viewBox="0 0 1080 1920">
        {SHOOTER_BET_AREAS_ON
          ? SHOOTER_HITS.map((hit) => (
              <g key={hit.id} className="shooter-bet-preview">
                {hit.rects.map((box, index) => (
                  <rect key={index} x={box.x} y={box.y} width={box.w} height={box.h} />
                ))}
                {hit.polygon ? <polygon points={hit.polygon.map((point) => `${point.x},${point.y}`).join(' ')} /> : null}
                <text x={hit.anchor.x} y={hit.anchor.y}>
                  {hit.id}
                </text>
              </g>
            ))
          : null}
        {SHOOTER_ODDS_HITBOX_ON
          ? SHOOTER_HITS.filter(isOddsHit).map((hit) => (
              <g key={`odds-${hit.id}`} className="shooter-odds-hitbox">
                {hit.rects.map((box, index) => (
                  <rect key={index} x={box.x} y={box.y} width={box.w} height={box.h} />
                ))}
              </g>
            ))
          : null}
        {betting
          ? SHOOTER_HITS.map((hit) => {
              const open = isOddsHit(hit) && oddsSpotOpen(felt, hit.kind, hit.number, point, banked)
              return (
                <g
                  key={`hit-${hit.id}`}
                  className={open ? 'shooter-bet-hit shooter-odds-open' : 'shooter-bet-hit'}
                  onPointerDown={onFelt}
                >
                  {hit.rects.map((box, index) => (
                    <rect key={index} x={box.x} y={box.y} width={box.w} height={box.h} />
                  ))}
                  {hit.polygon ? <polygon points={hit.polygon.map((corner) => `${corner.x},${corner.y}`).join(' ')} /> : null}
                  {open ? <text x={hit.anchor.x} y={hit.anchor.y}>Odds</text> : null}
                </g>
              )
            })
          : null}
        {selected
          ? (() => {
              const anchor = anchorFor(selected.kind, selected.number, selected.spot)
              return <circle className="shooter-bet-ring" cx={anchor.x} cy={anchor.y} r="34" />
            })()
          : null}
      </svg>
      {active && !betting ? (
        <button
          className="shooter-bet-action shooter-bet-place"
          type="button"
          style={{ right: `calc(100% - ${OI_LABEL_X}px)` }}
          onClick={() => controlsRef.current?.placeBet()}
        >
          Place Bet
        </button>
      ) : null}
      {active && betting ? (
        <div
          className="shooter-bet-ui"
          style={{ right: `calc(100% - ${OI_LABEL_X}px)`, bottom: `calc(100% - ${OI_LABEL_Y - 8}px)` }}
        >
          {showPurse ? <p className="shooter-bet-purse">{formatLiqUsd(purse)}</p> : null}
          <p className="shooter-bet-clock">{formatShotClock((betClockSec ?? 0) * 1000)}</p>
          <div className="shooter-chip-tray" role="listbox" aria-label="Chip tray">
            {TRAY.map((chip) => (
              <button
                key={chip}
                type="button"
                role="option"
                aria-selected={color === chip}
                aria-label={chip}
                className={color === chip ? 'shooter-chip is-selected' : 'shooter-chip'}
                onClick={() => setColor(chip)}
              >
                <img src={chipFaceUrl(chip)} alt="" draggable={false} />
              </button>
            ))}
          </div>
          <button className="shooter-bet-action" type="button" onClick={() => controlsRef.current?.undo()}>
            Undo
          </button>
          <button
            className="shooter-bet-action"
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return
              controlsRef.current?.clear(selected.id)
              setSelectedId(null)
            }}
          >
            Clear
          </button>
          <button className="shooter-bet-action shooter-bet-done" type="button" onClick={() => controlsRef.current?.done()}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  )
}

export const feltLabel = (bet: FeltBet): string => {
  const name = FELT_LABEL[bet.kind]
  if (bet.number != null) return `${name} ${bet.number}`
  if (bet.spot) return `${name} ${bet.spot}`
  return name
}
