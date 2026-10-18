import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { DIE_LAUNCH_SIZE_PX } from './diceConstants'
import { FAR_DIE_Z, NEAR_DIE_Z } from './feltDepth'
import { viewTiltDeg } from './dicePhysics'
import { formatShotClock } from './gestureThrow'
import type { DieView } from './useDiceThrow'

export interface DicePoseFrame {
  dice: readonly DieView[]
  shotClockMs: number | null
}

export type DiceFrameApply = (frame: DicePoseFrame) => void

export interface LaunchPoint {
  x: number
  y: number
}

/**
 * Move the outer die so its center sits on `(x, y)`, then scale the base-size cube.
 * `translate(-50%, -50%)` runs before the pixel translate, so the scale stays centered.
 */
export const dieOuterTransform = (x: number, y: number, size: number, z = 0): string => {
  const scale = DIE_LAUNCH_SIZE_PX > 0 ? size / DIE_LAUNCH_SIZE_PX : 1
  return `translate3d(${x}px, ${y}px, ${z}px) translate(-50%, -50%) scale(${scale})`
}

/** Tilt and spin stay on the inner cube, separate from the outer move. */
export const dieSpinTransform = (tiltDeg: number, spin: string): string => `rotateX(${tiltDeg}deg) ${spin}`

export { viewTiltDeg }

export const diceLaunchPoint = (dice: readonly { visible: boolean; x: number; y: number }[]): LaunchPoint => {
  if (dice.length < 2 || !dice[0].visible) {
    return { x: REFERENCE_WIDTH / 2, y: REFERENCE_HEIGHT - 48 }
  }
  return { x: (dice[0].x + dice[1].x) / 2, y: (dice[0].y + dice[1].y) / 2 }
}

export const paintDie = (
  el: HTMLElement | null,
  x: number,
  y: number,
  size: number,
  tiltDeg: number,
  spin = '',
  z = 0,
): void => {
  if (!el) return
  el.dataset.posed = '1'
  el.style.visibility = ''
  el.style.transform = dieOuterTransform(x, y, size, z)
  const spinEl = el.querySelector('.die-spin')
  if (spinEl instanceof HTMLElement) spinEl.style.transform = dieSpinTransform(tiltDeg, spin)
}

export const paintDiceFrame = (root: HTMLElement, frame: DicePoseFrame): void => {
  const ranked = frame.dice.filter((die) => die.visible).sort((a, b) => b.depthKey - a.depthKey)
  const zIndex = new Map<string, string>()
  if (ranked.length >= 1) zIndex.set(ranked[0].id, FAR_DIE_Z)
  if (ranked.length >= 2) zIndex.set(ranked[1].id, NEAR_DIE_Z)
  for (const die of frame.dice) {
    const el = root.querySelector(`[data-die-id="${die.id}"]`)
    if (!(el instanceof HTMLElement)) continue
    if (!die.visible) {
      el.style.visibility = 'hidden'
      continue
    }
    el.style.zIndex = zIndex.get(die.id) ?? FAR_DIE_Z
    paintDie(el, die.x, die.y, die.size, viewTiltDeg(die.depth), die.transform, die.z)
  }
  const clock = root.querySelector('.shot-clock')
  const time = root.querySelector('.shot-clock-time')
  if (clock instanceof HTMLElement && time instanceof HTMLElement) {
    if (frame.shotClockMs == null) {
      clock.hidden = true
    } else {
      clock.hidden = false
      time.textContent = formatShotClock(frame.shotClockMs)
    }
  }
}
