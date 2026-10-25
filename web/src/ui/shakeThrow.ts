import {
  DIE_GRAVITY_PX_PER_S2,
  GESTURE_ARC_SEC,
  GESTURE_MAX_LEAN,
  GESTURE_SPEED_MIN_PX_PER_S,
  GESTURE_SPEED_NO_ROLL_PX_PER_S,
  GESTURE_SPEED_WALL_PX_PER_S,
  SHAKE_BOOK_CLEAR_MPS2,
  SHAKE_BOOK_LEAN_MPS2,
  SHAKE_BOOK_LIFT_GAIN,
  SHAKE_BOOK_LIFT_MAX,
  SHAKE_BOOK_WALL_MPS2,
  SHAKE_HAMMER_CLEAR_MPS2,
  SHAKE_HAMMER_LEAN_MPS2,
  SHAKE_HAMMER_LIFT_GAIN,
  SHAKE_HAMMER_LIFT_MAX,
  SHAKE_HAMMER_WALL_MPS2,
  SHAKE_THRESHOLD_X_MPS2,
  SHAKE_THRESHOLD_Y_MPS2,
  SHAKE_THRESHOLD_Z_MPS2,
} from './diceConstants'
import type { PrecisionPhase } from './precisionAim'

export type ShakeMode = 'regular' | 'precision'

export type ShakeRelease =
  | { kind: 'regular'; speed: number; lean: number; up: number }
  | { kind: 'precision'; speed: number; lean: number }

/** Gravity-removed motion, plus the gravity vector from the sensor. */
export interface LinearSample {
  t: number
  x: number
  y: number
  z: number
  gx: number
  gy: number
  gz: number
}

/** Saved phone readings that should behave like the factory threshold on each axis. */
export interface ShakeAxisGain {
  x: number
  y: number
  z: number
}

/** How many times hotter than the factory line this saved reading is. 10 stays at 1. */
export const shakeAxisScale = (setting: number, factory: number): number => {
  if (!(factory > 0) || !Number.isFinite(setting) || !(setting > 0)) return 1
  return setting / factory
}

/**
 * Divide a phone sample back into factory units.
 * A saved X of 20 means a reading of 20 counts as the factory line of 10, and wall, clear, and lean follow.
 */
export const scaleSampleToFactory = (sample: LinearSample, gain: ShakeAxisGain): LinearSample => ({
  ...sample,
  x: sample.x / shakeAxisScale(gain.x, SHAKE_THRESHOLD_X_MPS2),
  y: sample.y / shakeAxisScale(gain.y, SHAKE_THRESHOLD_Y_MPS2),
  z: sample.z / shakeAxisScale(gain.z, SHAKE_THRESHOLD_Z_MPS2),
})

/** Totals accumulated in factory units, shown again in the phone's own units. */
export const rawShakeTotals = (
  totals: { xTotal: number; pushTotal: number; yTotal: number },
  gain: ShakeAxisGain,
): { xTotal: number; pushTotal: number; yTotal: number } => ({
  xTotal: totals.xTotal * shakeAxisScale(gain.x, SHAKE_THRESHOLD_X_MPS2),
  pushTotal: totals.pushTotal * shakeAxisScale(gain.z, SHAKE_THRESHOLD_Z_MPS2),
  yTotal: totals.yTotal * shakeAxisScale(gain.y, SHAKE_THRESHOLD_Y_MPS2),
})

interface OpenBump {
  sign: -1 | 1
  peak: number
}

export interface ShakeState {
  /** Hammer bump in progress. Peaks add when the bump falls back under the noise line. */
  x: OpenBump | null
  xTotal: number
  xBest: number
  xSign: -1 | 1
  /** Open push away from the face, as a positive magnitude. */
  push: number
  pushTotal: number
  /** Signed z with the greatest magnitude. Hammer english, flipped by the launch sign. */
  zPeak: number
  zAbs: number
  /** Open upward bump. Peaks add into the lift. */
  y: number
  yTotal: number
}

interface GripScale {
  threshold: number
  wall: number
  clear: number
  liftGain: number
  liftMax: number
  leanFull: number
}

const HAMMER: GripScale = {
  threshold: SHAKE_THRESHOLD_X_MPS2,
  wall: SHAKE_HAMMER_WALL_MPS2,
  clear: SHAKE_HAMMER_CLEAR_MPS2,
  liftGain: SHAKE_HAMMER_LIFT_GAIN,
  liftMax: SHAKE_HAMMER_LIFT_MAX,
  leanFull: SHAKE_HAMMER_LEAN_MPS2,
}

const BOOK: GripScale = {
  threshold: SHAKE_THRESHOLD_Z_MPS2,
  wall: SHAKE_BOOK_WALL_MPS2,
  clear: SHAKE_BOOK_CLEAR_MPS2,
  liftGain: SHAKE_BOOK_LIFT_GAIN,
  liftMax: SHAKE_BOOK_LIFT_MAX,
  leanFull: SHAKE_BOOK_LEAN_MPS2,
}

/** Slow blend that peels resting gravity off `accelerationIncludingGravity`. */
const GRAVITY_BLEND = 0.15

export interface GravityFilter {
  x: number
  y: number
  z: number
  primed: boolean
}

export const createShakeState = (): ShakeState => ({
  x: null,
  xTotal: 0,
  xBest: 0,
  xSign: 1,
  push: 0,
  pushTotal: 0,
  zPeak: 0,
  zAbs: 0,
  y: 0,
  yTotal: 0,
})

export const createGravityFilter = (): GravityFilter => ({ x: 0, y: 0, z: 0, primed: false })

export const clearShakeState = (state: ShakeState) => {
  state.x = null
  state.xTotal = 0
  state.xBest = 0
  state.xSign = 1
  state.push = 0
  state.pushTotal = 0
  state.zPeak = 0
  state.zAbs = 0
  state.y = 0
  state.yTotal = 0
}

const finite = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export interface RawAxes {
  t: number
  ax: number | null
  ay: number | null
  az: number | null
  gx: number | null
  gy: number | null
  gz: number | null
}

/**
 * Prefer `acceleration` when the browser filled it in.
 * Otherwise subtract a slow gravity estimate from `accelerationIncludingGravity`.
 */
export const linearFromRaw = (filter: GravityFilter, raw: RawAxes): LinearSample | null => {
  const gravity = finite(raw.gx) && finite(raw.gy) && finite(raw.gz)
  const linear = finite(raw.ax) && finite(raw.ay) && finite(raw.az)
  if (linear && gravity) {
    return { t: raw.t, x: raw.ax, y: raw.ay, z: raw.az, gx: raw.gx, gy: raw.gy, gz: raw.gz }
  }
  if (!gravity) return null
  if (!filter.primed) {
    filter.x = raw.gx
    filter.y = raw.gy
    filter.z = raw.gz
    filter.primed = true
    return { t: raw.t, x: 0, y: 0, z: 0, gx: raw.gx, gy: raw.gy, gz: raw.gz }
  }
  filter.x += GRAVITY_BLEND * (raw.gx - filter.x)
  filter.y += GRAVITY_BLEND * (raw.gy - filter.y)
  filter.z += GRAVITY_BLEND * (raw.gz - filter.z)
  return {
    t: raw.t,
    x: raw.gx - filter.x,
    y: raw.gy - filter.y,
    z: raw.gz - filter.z,
    gx: raw.gx,
    gy: raw.gy,
    gz: raw.gz,
  }
}

const axesHaveNumbers = (axes: DeviceMotionEventAcceleration | null | undefined): boolean =>
  !!axes && finite(axes.x) && finite(axes.y) && finite(axes.z)

/**
 * A motion event that carries numbers, including a phone sitting still.
 * Either vector counts. A present object whose axes are null is not a sensor.
 */
export const motionHasNumbers = (event: DeviceMotionEvent): boolean =>
  axesHaveNumbers(event.acceleration) || axesHaveNumbers(event.accelerationIncludingGravity)

export const sampleFromEvent = (filter: GravityFilter, event: DeviceMotionEvent): LinearSample | null => {
  const acceleration = event.acceleration
  const gravity = event.accelerationIncludingGravity
  return linearFromRaw(filter, {
    t: event.timeStamp,
    ax: acceleration?.x ?? null,
    ay: acceleration?.y ?? null,
    az: acceleration?.z ?? null,
    gx: gravity?.x ?? null,
    gy: gravity?.y ?? null,
    gz: gravity?.z ?? null,
  })
}

/** Launch peak at the wall constant is a back-wall throw. The clear constant and above leaves the table. */
export const shakeReleaseSpeed = (peak: number, wall: number, clear: number, threshold: number): number => {
  const min = GESTURE_SPEED_MIN_PX_PER_S
  const atWall = GESTURE_SPEED_WALL_PX_PER_S
  const noRoll = GESTURE_SPEED_NO_ROLL_PX_PER_S
  if (!(clear > wall) || !(wall > threshold)) return peak >= wall ? atWall : min
  if (peak >= clear) return noRoll
  if (peak >= wall) return atWall + ((noRoll - atWall) * (peak - wall)) / (clear - wall)
  const t = (peak - threshold) / (wall - threshold)
  return min + (atWall - min) * Math.max(0, Math.min(1, t))
}

/** Zero extra upward keeps today's arc. Upward acceleration raises it, up to the cap. */
export const shakeArcUp = (upward: number, gain: number, cap: number): number => {
  const base = (DIE_GRAVITY_PX_PER_S2 * GESTURE_ARC_SEC) / 2
  return Math.min(cap, base + Math.max(0, upward) * gain)
}

const closeX = (state: ShakeState) => {
  const bump = state.x
  if (!bump) return
  state.xTotal += bump.peak
  if (bump.peak >= state.xBest) {
    state.xBest = bump.peak
    state.xSign = bump.sign
  }
  state.x = null
}

const noteX = (state: ShakeState, value: number) => {
  const magnitude = Math.abs(value)
  if (magnitude < SHAKE_THRESHOLD_X_MPS2) {
    closeX(state)
    return
  }
  const sign: -1 | 1 = value >= 0 ? 1 : -1
  if (!state.x || state.x.sign !== sign) {
    closeX(state)
    state.x = { sign, peak: magnitude }
    return
  }
  if (magnitude > state.x.peak) state.x.peak = magnitude
}

/** A push away from the face. A pull toward the face adds nothing. */
const notePush = (state: ShakeState, z: number) => {
  const push = -z
  if (push < SHAKE_THRESHOLD_Z_MPS2) {
    if (state.push > 0) state.pushTotal += state.push
    state.push = 0
    return
  }
  if (push > state.push) state.push = push
}

const noteLift = (state: ShakeState, y: number) => {
  if (y < SHAKE_THRESHOLD_Y_MPS2) {
    if (state.y > 0) state.yTotal += state.y
    state.y = 0
    return
  }
  if (y > state.y) state.y = y
}

const leanOf = (side: number, leanFull: number): number => {
  const fraction = leanFull > 0 ? Math.max(-1, Math.min(1, side / leanFull)) : 0
  return fraction * GESTURE_MAX_LEAN
}

/** Hammer's added x, or book's added push, whichever is larger. */
const releaseOf = (state: ShakeState, mode: ShakeMode): ShakeRelease | null => {
  const bookWins = state.pushTotal > state.xTotal && state.pushTotal >= SHAKE_THRESHOLD_Z_MPS2
  const hammerWins = !bookWins && state.xTotal >= SHAKE_THRESHOLD_X_MPS2
  if (!bookWins && !hammerWins) return null
  const grip = bookWins ? BOOK : HAMMER
  const peak = bookWins ? state.pushTotal : state.xTotal
  const side = bookWins ? state.xSign * state.xBest : state.zPeak * state.xSign
  const speed = shakeReleaseSpeed(peak, grip.wall, grip.clear, grip.threshold)
  const lean = leanOf(side, grip.leanFull)
  if (mode === 'precision') return { kind: 'precision', speed, lean }
  return { kind: 'regular', speed, lean, up: shakeArcUp(state.yTotal, grip.liftGain, grip.liftMax) }
}

/** A sample loud enough to count as a spike. */
export const shakeSampleHot = (sample: LinearSample): boolean =>
  Math.abs(sample.x) >= SHAKE_THRESHOLD_X_MPS2 ||
  Math.abs(sample.z) >= SHAKE_THRESHOLD_Z_MPS2 ||
  sample.y >= SHAKE_THRESHOLD_Y_MPS2

export const stepShake = (state: ShakeState, sample: LinearSample) => {
  noteX(state, sample.x)
  notePush(state, sample.z)
  noteLift(state, sample.y)
  const zAbs = Math.abs(sample.z)
  if (zAbs >= state.zAbs) {
    state.zAbs = zAbs
    state.zPeak = sample.z
  }
}

/** Close any bump still in progress and launch from the totals. A still hand launches nothing. */
export const finishShake = (state: ShakeState, mode: ShakeMode): ShakeRelease | null => {
  closeX(state)
  if (state.push > 0) state.pushTotal += state.push
  state.push = 0
  if (state.y > 0) state.yTotal += state.y
  state.y = 0
  return releaseOf(state, mode)
}

/** Live sample plus the totals a launch would use, including a bump still open. */
export const shakeDebugRead = (state: ShakeState, sample: LinearSample | null) => ({
  x: sample?.x ?? 0,
  y: sample?.y ?? 0,
  z: sample?.z ?? 0,
  xTotal: state.xTotal + (state.x?.peak ?? 0),
  pushTotal: state.pushTotal + state.push,
  yTotal: state.yTotal + state.y,
})

/** Precision listens on the launch phase only. Regular listens for the whole hold. */
export const shakeListenEnabled = (
  shakeOn: boolean,
  sensorLive: boolean,
  shooting: boolean,
  precisionOn: boolean,
  phase: PrecisionPhase,
): boolean => shakeOn && sensorLive && shooting && (!precisionOn || phase === 'gesture')
