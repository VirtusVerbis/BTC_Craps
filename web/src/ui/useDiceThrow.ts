import { useEffect, useRef, useState } from 'react'
import type { MarketSnapshot } from '../game/types'
import { useOpenInterest } from '../data/openInterest'
import { btcPrice, buildBets } from './chipBets'
import {
  settleColumns,
  driftLooseChips,
  emptyChipWorld,
  presentChips,
  puckObstacle,
  resolveDiceChips,
  tickRestack,
  worldFromBets,
  type ChipDisc,
  type ChipWorld,
} from './chipPhysics'
import { DIE_RESULT_HOLD_MS } from './diceConstants'
import {
  advanceThrow,
  createThrowState,
  dieScreenCenter,
  quatToCssMatrix,
  stageMetrics,
  type Die,
  type DicePoseHook,
  type ThrowResult,
  type ThrowState,
} from './dicePhysics'
import { useDiceVolumeWindow } from './useDiceVolumeWindow'

export interface DieView {
  id: 'left' | 'right'
  visible: boolean
  x: number
  y: number
  size: number
  /** 0 at the launch rail, 1 at the back wall. */
  depth: number
  transform: string
}

export interface DicePresentation {
  dice: [DieView, DieView]
  result: ThrowResult | null
  point: number | null
  chips: ChipDisc[]
}

const toView = (die: Die, id: 'left' | 'right'): DieView => {
  const metrics = stageMetrics()
  const screen = dieScreenCenter(die, metrics)
  const depth = metrics.wallZ > 0 ? Math.min(1, Math.max(0, die.z / metrics.wallZ)) : 0
  return {
    id,
    visible: die.alive,
    x: screen.x,
    y: screen.y,
    size: screen.size,
    depth,
    transform: quatToCssMatrix(die.q),
  }
}

const present = (state: ThrowState, chips: readonly ChipDisc[]): DicePresentation => ({
  dice: [toView(state.dice[0], 'left'), toView(state.dice[1], 'right')],
  result: state.phase === 'result' ? state.result : null,
  point: state.point,
  chips: chips.slice(),
})

export const useDiceThrow = (
  market: MarketSnapshot,
  enabled: boolean,
  onCountedRoll?: (result: ThrowResult) => number | void,
): DicePresentation | null => {
  const oi = useOpenInterest()
  const volume = useDiceVolumeWindow(market)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const marketRef = useRef(market)
  marketRef.current = market
  const oiRef = useRef(oi)
  oiRef.current = oi
  const onCountedRollRef = useRef(onCountedRoll)
  onCountedRollRef.current = onCountedRoll
  const stateRef = useRef<ThrowState>(createThrowState(performance.now()))
  const worldRef = useRef<ChipWorld | null>(null)
  const [presentation, setPresentation] = useState<DicePresentation>(() => present(stateRef.current, []))

  useEffect(() => {
    if (!enabled) return undefined
    stateRef.current = createThrowState(performance.now())
    worldRef.current = null
    setPresentation(present(stateRef.current, []))
    let frame = 0
    let last = performance.now()

    const betsNow = () => {
      const snap = oiRef.current
      const price = btcPrice(marketRef.current)
      if (!snap || !(price > 0)) return null
      return buildBets(snap.openInterest * price, snap.longPct, snap.shortPct)
    }

    const poseHook: DicePoseHook = (dice, dt, metrics) => {
      const world = worldRef.current
      if (!world) return dice
      return resolveDiceChips(world, dice, dt, metrics, puckObstacle(stateRef.current.point))
    }

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const metrics = stageMetrics()
      if (!worldRef.current) {
        const bets = betsNow()
        if (bets && bets.length > 0) worldRef.current = worldFromBets(bets, Math.floor(now))
      }
      const phaseBefore = stateRef.current.phase
      stateRef.current = advanceThrow(stateRef.current, dt, now, volumeRef.current, metrics, poseHook)
      if (phaseBefore !== 'result' && stateRef.current.phase === 'result') {
        const result = stateRef.current.result
        const raw = result ? onCountedRollRef.current?.(result) : 0
        const extra = typeof raw === 'number' ? raw : 0
        if (extra > 0) stateRef.current = { ...stateRef.current, resultHoldMs: DIE_RESULT_HOLD_MS + extra }
      }
      if (phaseBefore !== 'holding' && stateRef.current.phase === 'holding') {
        const bets = betsNow()
        if (bets) worldRef.current = settleColumns(worldRef.current ?? emptyChipWorld(), bets, now, Math.floor(now))
      } else if (stateRef.current.phase === 'result' && worldRef.current) {
        worldRef.current = driftLooseChips(worldRef.current, dt, metrics, puckObstacle(stateRef.current.point))
      }
      if (worldRef.current?.restack) worldRef.current = tickRestack(worldRef.current, now)
      const chips = worldRef.current ? presentChips(worldRef.current, now, metrics) : []
      setPresentation(present(stateRef.current, chips))
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [enabled])

  if (!enabled) return null
  return presentation
}
