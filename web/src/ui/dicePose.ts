import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { DIE_BACK_WALL_TILT_DEG, DIE_LAUNCH_SIZE_PX, DIE_LAUNCH_TILT_DEG } from './diceConstants'
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
export const dieOuterTransform = (x: number, y: number, size: number): string => {
  const scale = DIE_LAUNCH_SIZE_PX > 0 ? size / DIE_LAUNCH_SIZE_PX : 1
  return `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`
}

/** Tilt and spin stay on the inner cube, separate from the outer move. */
export const dieSpinTransform = (tiltDeg: number, spin: string): string => `rotateX(${tiltDeg}deg) ${spin}`

export const viewTiltDeg = (depth: number): number =>
  DIE_LAUNCH_TILT_DEG + depth * (DIE_BACK_WALL_TILT_DEG - DIE_LAUNCH_TILT_DEG)

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
): void => {
  if (!el) return
  el.dataset.posed = '1'
  el.style.visibility = ''
  el.style.transform = dieOuterTransform(x, y, size)
  const spinEl = el.querySelector('.die-spin')
  if (spinEl instanceof HTMLElement) spinEl.style.transform = dieSpinTransform(tiltDeg, spin)
}

export const paintDiceFrame = (root: HTMLElement, frame: DicePoseFrame): void => {
  for (const die of frame.dice) {
    const el = root.querySelector(`[data-die-id="${die.id}"]`)
    if (!(el instanceof HTMLElement)) continue
    if (!die.visible) {
      el.style.visibility = 'hidden'
      continue
    }
    paintDie(el, die.x, die.y, die.size, viewTiltDeg(die.depth), die.transform)
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
