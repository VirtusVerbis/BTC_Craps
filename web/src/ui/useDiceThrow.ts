import { useEffect, useRef, useState } from 'react'
import type { MarketSnapshot } from '../game/types'
import {
  advanceThrow,
  createThrowState,
  dieScreenCenter,
  quatToCssMatrix,
  stageMetrics,
  type Die,
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

const present = (state: ThrowState): DicePresentation => ({
  dice: [toView(state.dice[0], 'left'), toView(state.dice[1], 'right')],
  result: state.phase === 'result' ? state.result : null,
  point: state.point,
})

export const useDiceThrow = (market: MarketSnapshot, enabled: boolean): DicePresentation | null => {
  const volume = useDiceVolumeWindow(market)
  const volumeRef = useRef(volume)
  volumeRef.current = volume
  const stateRef = useRef<ThrowState>(createThrowState(performance.now()))
  const [presentation, setPresentation] = useState<DicePresentation>(() => present(stateRef.current))

  useEffect(() => {
    if (!enabled) return undefined
    stateRef.current = createThrowState(performance.now())
    setPresentation(present(stateRef.current))
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      stateRef.current = advanceThrow(stateRef.current, dt, now, volumeRef.current)
      setPresentation(present(stateRef.current))
      frame = window.requestAnimationFrame(loop)
    }
    frame = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(frame)
  }, [enabled])

  if (!enabled) return null
  return presentation
}
