import { useEffect, type RefObject } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { gestureFromStroke, type StrokePoint } from './gestureThrow'
import type { ShooterControls } from './useDiceThrow'

const blockedTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('.shooter-mode-button, .time-button, .video-overlay-close, a'))
}

const stagePoint = (stage: HTMLElement, clientX: number, clientY: number): { x: number; y: number } | null => {
  const rect = stage.getBoundingClientRect()
  if (!(rect.width > 0) || !(rect.height > 0)) return null
  return {
    x: ((clientX - rect.left) / rect.width) * REFERENCE_WIDTH,
    y: ((clientY - rect.top) / rect.height) * REFERENCE_HEIGHT,
  }
}

/** Pointer and mouse share one path. Active only while Shooter mode is holding the dice. */
export const useShooterGesture = (
  enabled: boolean,
  stageRef: RefObject<HTMLElement | null>,
  controlsRef: RefObject<ShooterControls | null>,
) => {
  useEffect(() => {
    if (!enabled) return undefined
    let pointerId: number | null = null
    let points: StrokePoint[] = []

    const finish = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const stage = stageRef.current
      const point = stage ? stagePoint(stage, event.clientX, event.clientY) : null
      if (point) points.push({ ...point, t: event.timeStamp })
      const stroke = gestureFromStroke(points)
      pointerId = null
      points = []
      if (stroke) controlsRef.current?.releaseGesture(stroke)
    }

    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || blockedTarget(event.target)) return
      const stage = stageRef.current
      if (!stage) return
      const point = stagePoint(stage, event.clientX, event.clientY)
      if (!point) return
      pointerId = event.pointerId
      points = [{ ...point, t: event.timeStamp }]
      controlsRef.current?.aimLaunchX(point.x)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const stage = stageRef.current
      if (!stage) return
      const point = stagePoint(stage, event.clientX, event.clientY)
      if (!point) return
      points.push({ ...point, t: event.timeStamp })
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
  }, [controlsRef, enabled, stageRef])
}

/** Lock page scroll and pinch-zoom while the shot clock or a throw is in progress. */
export const useShooterPageLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return undefined
    const prevent = (event: Event) => {
      event.preventDefault()
    }
    const root = document.documentElement
    root.classList.add('shooter-gesture-lock')
    document.addEventListener('touchmove', prevent, { passive: false })
    document.addEventListener('wheel', prevent, { passive: false })
    document.addEventListener('gesturestart', prevent)
    document.addEventListener('gesturechange', prevent)
    return () => {
      root.classList.remove('shooter-gesture-lock')
      document.removeEventListener('touchmove', prevent)
      document.removeEventListener('wheel', prevent)
      document.removeEventListener('gesturestart', prevent)
      document.removeEventListener('gesturechange', prevent)
    }
  }, [locked])
}
