import { useEffect, useRef, useState, type RefObject } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { gestureFromStroke, type StrokePoint } from './gestureThrow'
import {
  angleFromDrag,
  defaultPrecisionAngle,
  defaultPrecisionSpin,
  defaultPrecisionTarget,
  dragQualified,
  spinFromSwipe,
  spinFromTravel,
  type PrecisionPhase,
  type PrecisionThrow,
  type StagePoint,
} from './precisionAim'
import type { ShooterControls } from './useDiceThrow'

const blockedTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      '.shooter-mode-button, .shooter-scroll-note, .time-button, .video-overlay-close, .side-panel, .precision-mode-switch, .precision-ok, a',
    ),
  )
}

const stagePoint = (stage: HTMLElement, clientX: number, clientY: number): StagePoint | null => {
  const rect = stage.getBoundingClientRect()
  if (!(rect.width > 0) || !(rect.height > 0)) return null
  const x = ((clientX - rect.left) / rect.width) * REFERENCE_WIDTH
  const y = ((clientY - rect.top) / rect.height) * REFERENCE_HEIGHT
  return {
    x: Math.min(REFERENCE_WIDTH, Math.max(0, x)),
    y: Math.min(REFERENCE_HEIGHT, Math.max(0, y)),
  }
}

/** A press that lands on the table. The timer button is excluded by blockedTarget. */
const onStage = (stage: HTMLElement, clientX: number, clientY: number): boolean => {
  const rect = stage.getBoundingClientRect()
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
}

const nextPhase = (phase: PrecisionPhase): PrecisionPhase => {
  if (phase === 'target') return 'trajectory'
  if (phase === 'trajectory') return 'spin'
  if (phase === 'spin') return 'gesture'
  return phase
}

/** Session aim, loft, and spin. A refresh restores the defaults. Leaving the hold returns to Target. */
export const usePrecisionPhases = (
  enabled: boolean,
  precisionOn: boolean,
  stageRef: RefObject<HTMLElement | null>,
  controlsRef: RefObject<ShooterControls | null>,
  shotRef: { current: Omit<PrecisionThrow, 'speed' | 'lean'> | null },
) => {
  const [phase, setPhase] = useState<PrecisionPhase>('target')
  const [target, setTarget] = useState<StagePoint>(defaultPrecisionTarget)
  const [angle, setAngle] = useState(defaultPrecisionAngle)
  const [spin, setSpin] = useState(defaultPrecisionSpin)
  const phaseRef = useRef(phase)
  const angleRef = useRef(angle)
  const spinRef = useRef(spin)
  phaseRef.current = phase
  angleRef.current = angle
  spinRef.current = spin
  shotRef.current = precisionOn ? { targetX: target.x, targetY: target.y, angleDeg: angle, spin } : null

  useEffect(() => {
    if (!enabled) setPhase('target')
  }, [enabled])

  const accept = () => setPhase((current) => nextPhase(current))

  useEffect(() => {
    if (!enabled) return undefined
    let pointerId: number | null = null
    let originX = 0
    let originY = 0
    let originT = 0
    let qualified = false
    let points: StrokePoint[] = []
    let angleAtDown = 0
    let spinAtDown = 0
    let startedOnStage = false

    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || blockedTarget(event.target)) return
      const stage = stageRef.current
      if (!stage) return
      const point = stagePoint(stage, event.clientX, event.clientY)
      if (!point) return
      pointerId = event.pointerId
      originX = point.x
      originY = point.y
      originT = event.timeStamp
      qualified = false
      startedOnStage = onStage(stage, event.clientX, event.clientY)
      points = [{ ...point, t: event.timeStamp }]
      angleAtDown = angleRef.current
      spinAtDown = spinRef.current
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const stage = stageRef.current
      if (!stage) return
      const point = stagePoint(stage, event.clientX, event.clientY)
      if (!point) return
      points.push({ ...point, t: event.timeStamp })
      const dx = point.x - originX
      const dy = point.y - originY
      const current = phaseRef.current
      if (current === 'spin') {
        const next = spinFromTravel(dy, event.timeStamp - originT)
        if (next != null) setSpin(next)
        return
      }
      if (!dragQualified(dx, dy)) return
      qualified = true
      if (current === 'target') setTarget(point)
      else if (current === 'trajectory') setAngle(angleFromDrag(angleAtDown, dy))
    }

    const finish = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const stage = stageRef.current
      const point = stage ? stagePoint(stage, event.clientX, event.clientY) : null
      if (point) points.push({ ...point, t: event.timeStamp })
      const current = phaseRef.current
      const strokePoints = points
      const tap = event.type !== 'pointercancel' && startedOnStage && !qualified
      pointerId = null
      points = []
      startedOnStage = false
      if (current === 'target') {
        if (!qualified) {
          if (tap) setPhase('trajectory')
          return
        }
        if (point) setTarget(point)
        setPhase('trajectory')
        return
      }
      if (current === 'trajectory') {
        if (!qualified) {
          setAngle(angleAtDown)
          if (tap) setPhase('spin')
          return
        }
        setPhase('spin')
        return
      }
      if (current === 'spin') {
        const next = spinFromSwipe(strokePoints)
        if (next == null) {
          setSpin(spinAtDown)
          if (tap) setPhase('gesture')
          return
        }
        setSpin(next)
        return
      }
      const stroke = gestureFromStroke(strokePoints)
      const shot = shotRef.current
      if (!stroke || !shot) return
      controlsRef.current?.releasePrecision({ ...shot, speed: stroke.speed, lean: stroke.lean })
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [controlsRef, enabled, shotRef, stageRef])

  return { phase, target, angle, spin, accept }
}
