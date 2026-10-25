import { useEffect, type RefObject } from 'react'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { gestureFromStroke, type StrokePoint } from './gestureThrow'
import type { ShooterControls } from './useDiceThrow'

const blockedTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      '.shooter-mode-button, .shooter-scroll-note, .time-button, .video-overlay-close, .side-panel, .precision-mode-switch, .precision-ok, a',
    ),
  )
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
  shakeListening = false,
  shakeBusyRef?: RefObject<boolean>,
  shakeRestartRef?: RefObject<(() => void) | null>,
  blockFlick = false,
) => {
  useEffect(() => {
    if (!enabled) return undefined
    let pointerId: number | null = null
    let points: StrokePoint[] = []
    let aimed = false

    const finish = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const stage = stageRef.current
      const point = stage ? stagePoint(stage, event.clientX, event.clientY) : null
      if (point) points.push({ ...point, t: event.timeStamp })
      const stroke = gestureFromStroke(points)
      pointerId = null
      points = []
      aimed = false
      if (stroke && !blockFlick) controlsRef.current?.releaseGesture(stroke)
    }

    const onDown = (event: PointerEvent) => {
      if (pointerId !== null || blockedTarget(event.target)) return
      if (shakeListening && shakeBusyRef?.current) return
      const stage = stageRef.current
      if (!stage) return
      const point = stagePoint(stage, event.clientX, event.clientY)
      if (!point) return
      pointerId = event.pointerId
      points = [{ ...point, t: event.timeStamp }]
      aimed = !shakeListening
      if (!shakeListening) controlsRef.current?.aimLaunchX(point.x)
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      const stage = stageRef.current
      if (!stage) return
      const point = stagePoint(stage, event.clientX, event.clientY)
      if (!point) return
      points.push({ ...point, t: event.timeStamp })
      if (!shakeListening || aimed || shakeBusyRef?.current || points.length < 2) return
      const dx = point.x - points[0].x
      const dy = point.y - points[0].y
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) {
        aimed = true
        controlsRef.current?.aimLaunchX(point.x)
        shakeRestartRef?.current?.()
      }
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
  }, [blockFlick, controlsRef, enabled, shakeBusyRef, shakeListening, shakeRestartRef, stageRef])
}

/**
 * A wheel sample, including the legacy `wheelDelta*` fields Chrome and Safari
 * still send. Those fields are how a notch is told apart from a trackpad.
 */
export type WheelSample = {
  deltaMode: number
  deltaX: number
  deltaY: number
  ctrlKey: boolean
  wheelDeltaX?: number
  wheelDeltaY?: number
}

export type WheelLock = { gestureUntil: number }

/** Follow-up events in the same trackpad flick stay blocked this long. */
export const TRACKPAD_GESTURE_MS = 200

const DELTA_PIXEL = 0
const DELTA_LINE = 1
const DELTA_PAGE = 2

const trackpadScaled = (wheelDelta: number | undefined, delta: number): boolean => {
  if (typeof wheelDelta !== 'number' || delta === 0) return false
  // Chrome/Safari trackpads keep wheelDelta at -3× the pixel delta. A mouse
  // notch stays on 120-unit wheelDelta steps (deltaY is often ±100).
  const scaled = -delta * 3
  return Math.abs(wheelDelta - scaled) < 1 || Math.abs(wheelDelta - Math.round(scaled)) <= 1
}

const mouseNotch = (wheelDelta: number | undefined, delta: number): boolean => {
  if (trackpadScaled(wheelDelta, delta)) return false
  if (typeof wheelDelta === 'number' && wheelDelta !== 0 && Math.abs(wheelDelta) % 120 === 0) return true
  return delta !== 0 && Number.isInteger(delta) && Math.abs(delta) >= 100 && Math.abs(delta) % 100 === 0
}

/** A mouse-wheel notch. Line/page mode (Firefox) counts; trackpad pixel steps do not. */
export const isDiscreteMouseWheel = (sample: WheelSample): boolean => {
  if (sample.ctrlKey) return false
  if (sample.deltaMode === DELTA_LINE || sample.deltaMode === DELTA_PAGE) return true
  if (sample.deltaMode !== DELTA_PIXEL) return false
  return mouseNotch(sample.wheelDeltaY, sample.deltaY) || mouseNotch(sample.wheelDeltaX, sample.deltaX)
}

/** Trackpad scroll or pinch-zoom. ctrl+wheel is a pinch on both trackpads and touchpads. */
export const isTrackpadWheel = (sample: WheelSample): boolean => {
  if (sample.ctrlKey) return true
  if (isDiscreteMouseWheel(sample)) return false
  if (sample.deltaMode !== DELTA_PIXEL) return false
  const { deltaX, deltaY, wheelDeltaX, wheelDeltaY } = sample
  if (deltaX === 0 && deltaY === 0) return false
  if (trackpadScaled(wheelDeltaY, deltaY) || trackpadScaled(wheelDeltaX, deltaX)) return true
  if (!Number.isInteger(deltaX) || !Number.isInteger(deltaY)) return true
  return Math.abs(deltaX) + Math.abs(deltaY) < 50
}

export const nextWheelLock = (
  sample: WheelSample,
  timeStamp: number,
  lock: WheelLock,
): { lock: WheelLock; block: boolean } => {
  if (isDiscreteMouseWheel(sample)) return { lock: { gestureUntil: 0 }, block: false }
  if (isTrackpadWheel(sample)) return { lock: { gestureUntil: timeStamp + TRACKPAD_GESTURE_MS }, block: true }
  return { lock, block: timeStamp < lock.gestureUntil }
}

const wheelSampleFromEvent = (event: WheelEvent): WheelSample => {
  const legacy = event as WheelEvent & { wheelDeltaX?: number; wheelDeltaY?: number }
  return {
    deltaMode: event.deltaMode,
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    ctrlKey: event.ctrlKey,
    wheelDeltaX: legacy.wheelDeltaX,
    wheelDeltaY: legacy.wheelDeltaY,
  }
}

/**
 * While Shooter mode is on, block finger scrolling, trackpad scrolling, and pinch-zoom.
 * A discrete mouse-wheel notch still scrolls. Touch-only overflow locking is in CSS.
 */
export const useShooterPageLock = (locked: boolean) => {
  useEffect(() => {
    if (!locked) return undefined
    const prevent = (event: Event) => {
      event.preventDefault()
    }
    let lock: WheelLock = { gestureUntil: 0 }
    const onWheel = (event: WheelEvent) => {
      const next = nextWheelLock(wheelSampleFromEvent(event), event.timeStamp, lock)
      lock = next.lock
      if (next.block) event.preventDefault()
    }
    const root = document.documentElement
    root.classList.add('shooter-gesture-lock')
    document.addEventListener('touchmove', prevent, { passive: false })
    document.addEventListener('wheel', onWheel, { passive: false })
    document.addEventListener('gesturestart', prevent)
    document.addEventListener('gesturechange', prevent)
    return () => {
      root.classList.remove('shooter-gesture-lock')
      document.removeEventListener('touchmove', prevent)
      document.removeEventListener('wheel', onWheel)
      document.removeEventListener('gesturestart', prevent)
      document.removeEventListener('gesturechange', prevent)
    }
  }, [locked])
}
