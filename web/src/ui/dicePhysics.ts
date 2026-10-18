import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { applyRoll } from './puckState'
import {
  DIE_ARC_LIFT_HEIGHT_PX,
  DIE_ARC_LIFT_SCALE,
  DIE_ARC_SPIN_MIN,
  DIE_BINANCE_BUY_REF,
  DIE_BINANCE_SELL_REF,
  DIE_COINBASE_BUY_REF,
  DIE_COINBASE_SELL_REF,
  DIE_DEPTH_SCALE,
  DIE_FELT_RESTITUTION,
  DIE_FELT_SPEED_KEEP,
  DIE_FORWARD_SPIN_SCALE,
  DIE_FULL_REACH_SEC,
  GESTURE_ARC_SEC,
  GESTURE_BASE_SPIN,
  GESTURE_MAX_LEAN,
  GESTURE_MID_FELT_FRACTION,
  GESTURE_OVERSHOOT_FORWARD_SCALE,
  GESTURE_SPEED_MIN_PX_PER_S,
  GESTURE_SPEED_NO_ROLL_PX_PER_S,
  GESTURE_SPEED_WALL_PX_PER_S,
  DIE_GRAVITY_PX_PER_S2,
  DIE_BACK_WALL_TILT_DEG,
  DIE_LAUNCH_DELAY_MS,
  DIE_LAUNCH_SIZE_PX,
  DIE_LAUNCH_TILT_DEG,
  DIE_MAX_FLIGHT_MS,
  DIE_NEAR_EDGE_CLEARANCE_PX,
  DIE_MAX_SPIN_RAD_PER_S,
  DIE_MIN_REACH_FRACTION,
  DIE_NO_ROLL_PAUSE_MS,
  DIE_REST_SPEED_PX_PER_S,
  DIE_REST_VERTICAL_PX_PER_S,
  DIE_RESULT_HOLD_MS,
  DIE_SLIDE_DAMP_PER_S,
  DIE_SPIN_DAMP,
  DIE_SPIN_KICK,
  DIE_UP_ADD_PX_PER_S,
  DIE_WALL_BOTTOM_FRACTION,
  DIE_WALL_RESTITUTION,
  DIE_WALL_SCATTER_RAD,
  DIE_WALL_SPIN_RAD,
  DIE_WALL_TOP_FRACTION,
} from './diceConstants'
import { backRailContact } from './backWall'
import { clampLaunchX, type GestureStroke } from './gestureThrow'
import { precisionVelocity, type PrecisionThrow } from './precisionAim'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Quat {
  x: number
  y: number
  z: number
  w: number
}

export interface Die {
  alive: boolean
  resting: boolean
  /** Cleared the back wall and is holding still so the exit can be seen. */
  leaving: boolean
  /** Frame time when `leaving` started. Null until advanceThrow stamps it. */
  leftAtMs: number | null
  x: number
  z: number
  h: number
  vx: number
  vz: number
  vh: number
  q: Quat
  w: Vec3
  topFace: number | null
  /** Latched once this die crosses mid-felt. Shooter stacks collide after that. */
  pastFeltMid?: boolean
  /** Latched when this die bounces on the back wall. */
  hitBackWall?: boolean
}

export interface VolumeTotals {
  binanceBuy: number
  binanceSell: number
  coinbaseBuy: number
  coinbaseSell: number
}

export type ThrowResult = { total: number; label: string | null } | { noRoll: true }

export interface ThrowState {
  phase: 'holding' | 'flying' | 'result'
  phaseStartedMs: number
  sharedX: number
  dice: [Die, Die]
  /** Pass-line point. Null is come-out, with the OFF puck in the Don't Come bar. */
  point: number | null
  result: ThrowResult | null
  /** Result-phase length. A bonus win sets this above `DIE_RESULT_HOLD_MS`. */
  resultHoldMs?: number
  flightMs: number
  /**
   * Farthest felt depth each die reached during a tracked flight.
   * A throw that never launched leaves this at zero and skips the short-reach rule.
   */
  reachZ: [number, number]
  /** True after a launch, so a resting test die is not judged as a short throw. */
  reachTracked: boolean
  /** Shooter mode waits at the rail for a flick or an explicit auto launch. */
  manualHold: boolean
  /** The finger chose a rail x, so clear-lane aim stays off for this hold. */
  aimLocked: boolean
  /** Gesture throws count only when both dice bounce on the back wall. */
  requireWallContact: boolean
  /** How the next hold is arranged. Named quats stay fixed. Null quats are random. */
  hold: DiceHold
  /** Set, grip, and phase copied at launch. A later dropdown edit does not change it. */
  controlSnap: DiceControlSnap | null
}

export interface DiceHold {
  setId: string
  stacked: boolean
  quats: [Quat, Quat] | null
}

export interface DiceControlSnap {
  setId: string
  stacked: boolean
  phase: 'come-out' | 'point'
}

export const DEFAULT_DICE_HOLD: DiceHold = { setId: 'random', stacked: false, quats: null }

export interface StageMetrics {
  width: number
  height: number
  wallTop: number
  wallBottom: number
  wallZ: number
  wallHeight: number
}

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 }

export const stageMetrics = (): StageMetrics => {
  const wallTop = DIE_WALL_TOP_FRACTION * REFERENCE_HEIGHT
  const wallBottom = DIE_WALL_BOTTOM_FRACTION * REFERENCE_HEIGHT
  return {
    width: REFERENCE_WIDTH,
    height: REFERENCE_HEIGHT,
    wallTop,
    wallBottom,
    wallZ: REFERENCE_HEIGHT - wallBottom,
    wallHeight: wallBottom - wallTop,
  }
}

export const logUnit = (value: number, ref: number): number => {
  if (!(value > 0) || !(ref > 0)) return 0
  return Math.min(1, Math.log1p(value) / Math.log1p(ref))
}

export const dieSize = (z: number, metrics: StageMetrics = stageMetrics()): number => {
  const depth = clamp(metrics.wallZ > 0 ? z / metrics.wallZ : 0, 0, 1)
  return DIE_LAUNCH_SIZE_PX * (DIE_DEPTH_SCALE + (1 - DIE_DEPTH_SCALE) * (1 - depth))
}

/** Camera lean. 0 is the launch rail, 1 is the back wall. */
export const viewTiltDeg = (depth: number): number =>
  DIE_LAUNCH_TILT_DEG + depth * (DIE_BACK_WALL_TILT_DEG - DIE_LAUNCH_TILT_DEG)

/**
 * How far a cube leaned by `rotateX(tiltDeg)` extends below its center.
 * The near edge is the face toward the shooter.
 */
export const tiltedNearDrop = (half: number, tiltDeg: number): number => {
  const tiltRad = (tiltDeg * Math.PI) / 180
  return half * (Math.abs(Math.cos(tiltRad)) + Math.abs(Math.sin(tiltRad)))
}

/**
 * Screen center of a die. Y grows downward. The felt contact sits on `height - z`.
 * Height follows the camera lean: `cos` up the screen, `-sin` toward the camera.
 * `z` is that toward-camera shift. At the rail, the center rises so the near edge
 * stays inside the stage. Both dice of a pair share that rise.
 */
export const dieScreenCenter = (
  die: Die,
  metrics: StageMetrics = stageMetrics(),
): { x: number; y: number; z: number; size: number } => {
  const size = dieSize(die.z, metrics)
  const depth = clamp(metrics.wallZ > 0 ? die.z / metrics.wallZ : 0, 0, 1)
  const tiltDeg = viewTiltDeg(depth)
  const tiltRad = (tiltDeg * Math.PI) / 180
  const contactY = metrics.height - die.z
  const half = size / 2
  const drop = tiltedNearDrop(half, tiltDeg)
  const railLift = Math.max(0, contactY - half + drop - (metrics.height - DIE_NEAR_EDGE_CLEARANCE_PX))
  return {
    x: die.x,
    y: contactY - half - railLift - die.h * Math.cos(tiltRad),
    z: -die.h * Math.sin(tiltRad),
    size,
  }
}

/** 0 on the felt, 1 at and above the gesture crest. Flat at both ends. */
export const arcLift = (h: number): number => {
  const t = clamp(Math.max(0, h) / DIE_ARC_LIFT_HEIGHT_PX, 0, 1)
  return t * t * (3 - 2 * t)
}

/** Drawn size. Collision and the felt seat stay on `dieSize`. */
export const visualDieSize = (z: number, h: number, metrics: StageMetrics = stageMetrics()): number =>
  dieSize(z, metrics) * (1 + (DIE_ARC_LIFT_SCALE - 1) * arcLift(h))

/**
 * Screen x of each die. Extra visual radius is split outward so a crest
 * does not pull the pair through itself. Height 0 leaves the physics x alone.
 */
export const spreadPairX = (
  left: Die,
  right: Die,
  metrics: StageMetrics = stageMetrics(),
): [number, number] => {
  const extra =
    (visualDieSize(left.z, left.h, metrics) -
      dieSize(left.z, metrics) +
      visualDieSize(right.z, right.h, metrics) -
      dieSize(right.z, metrics)) /
    2
  if (!(extra > 0) || Math.abs(right.x - left.x) < 1) return [left.x, right.x]
  const shift = extra / 2
  const sign = right.x >= left.x ? 1 : -1
  return [left.x - sign * shift, right.x + sign * shift]
}

export const randomSharedX = (random: () => number = Math.random): number => {
  const min = DIE_LAUNCH_SIZE_PX
  const max = REFERENCE_WIDTH - DIE_LAUNCH_SIZE_PX
  return min + random() * (max - min)
}

/** A Pass or Don't Pass column the shooter should not launch into. */
export interface LaunchObstacle {
  x: number
  /** How far a die center must stay from `x` to miss the stack. */
  clearance: number
}

const sharedXRange = (): [number, number] => [DIE_LAUNCH_SIZE_PX, REFERENCE_WIDTH - DIE_LAUNCH_SIZE_PX]

/** Signed room between the closer die and the nearest obstacle. Negative means a hit. */
const pairGap = (sharedX: number, obstacles: readonly LaunchObstacle[]): number => {
  const half = DIE_LAUNCH_SIZE_PX / 2
  let gap = Number.POSITIVE_INFINITY
  for (const obstacle of obstacles) {
    if (!Number.isFinite(obstacle.x) || !(obstacle.clearance >= 0)) continue
    const left = Math.abs(sharedX - half - obstacle.x) - obstacle.clearance
    const right = Math.abs(sharedX + half - obstacle.x) - obstacle.clearance
    gap = Math.min(gap, left, right)
  }
  return gap
}

const sampleSpan = (lanes: readonly [number, number][], random: () => number): number => {
  const weight = lanes.reduce((sum, [start, end]) => sum + (end - start), 0)
  if (!(weight > 0)) return lanes[0]?.[0] ?? DIE_LAUNCH_SIZE_PX
  let pick = Math.min(Math.max(random(), 0), 0.999999) * weight
  for (const [start, end] of lanes) {
    const width = end - start
    if (pick <= width) return start + pick
    pick -= width
  }
  return lanes[lanes.length - 1][1]
}

const leastBadSharedX = (
  min: number,
  max: number,
  obstacles: readonly LaunchObstacle[],
  random: () => number,
): number => {
  const picks: number[] = []
  let best = Number.NEGATIVE_INFINITY
  const consider = (x: number) => {
    const score = pairGap(x, obstacles)
    if (score > best + 0.01) {
      best = score
      picks.length = 0
      picks.push(x)
    } else if (Math.abs(score - best) <= 0.01) {
      picks.push(x)
    }
  }
  for (let x = min; x < max; x += 4) consider(x)
  consider(max)
  const index = Math.min(picks.length - 1, Math.floor(Math.max(0, random()) * picks.length))
  return picks[index] ?? (min + max) / 2
}

/**
 * Launch center for both dice. Open lanes between Pass and Don't Pass stacks
 * are chosen in proportion to their width. A lane thinner than one die is
 * skipped while a wider lane remains. If the stacks cover the rail, the spot
 * with the most room is used.
 */
export const clearSharedX = (
  obstacles: readonly LaunchObstacle[],
  random: () => number = Math.random,
): number => {
  const [min, max] = sharedXRange()
  if (!(max > min)) return min
  const half = DIE_LAUNCH_SIZE_PX / 2
  const blocked: Array<[number, number]> = []
  for (const obstacle of obstacles) {
    if (!Number.isFinite(obstacle.x) || !(obstacle.clearance >= 0)) continue
    const pad = obstacle.clearance + half
    const start = Math.max(min, obstacle.x - pad)
    const end = Math.min(max, obstacle.x + pad)
    if (end > start) blocked.push([start, end])
  }
  blocked.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Array<[number, number]> = []
  for (const interval of blocked) {
    const last = merged[merged.length - 1]
    if (!last || interval[0] > last[1]) merged.push([interval[0], interval[1]])
    else last[1] = Math.max(last[1], interval[1])
  }
  const free: Array<[number, number]> = []
  let cursor = min
  for (const [start, end] of merged) {
    if (start > cursor) free.push([cursor, start])
    cursor = Math.max(cursor, end)
  }
  if (max > cursor) free.push([cursor, max])
  const open = free.filter(([start, end]) => end > start)
  const roomy = open.filter(([start, end]) => end - start >= DIE_LAUNCH_SIZE_PX)
  const lanes = roomy.length > 0 ? roomy : open
  if (lanes.length > 0) return sampleSpan(lanes, random)
  return leastBadSharedX(min, max, obstacles, random)
}

export const createHoldingDice = (
  sharedX: number,
  random: () => number = Math.random,
  hold: DiceHold = DEFAULT_DICE_HOLD,
): [Die, Die] => {
  const leftQ = hold.quats?.[0] ?? randomRestQuat(random)
  const rightQ = hold.quats?.[1] ?? randomRestQuat(random)
  if (hold.stacked) {
    return [restingDie(sharedX, leftQ, 0), restingDie(sharedX, rightQ, dieSize(0))]
  }
  const half = DIE_LAUNCH_SIZE_PX / 2
  return [restingDie(sharedX - half, leftQ), restingDie(sharedX + half, rightQ)]
}

/** Replace a held pair with the current set. In flight, remember the set for the next hold. */
export const reseatHeldDice = (
  state: ThrowState,
  hold: DiceHold,
  random: () => number = Math.random,
): ThrowState => {
  if (state.phase !== 'holding') return { ...state, hold }
  return { ...state, hold, dice: createHoldingDice(state.sharedX, random, hold) }
}

export const createThrowState = (
  nowMs: number,
  sharedX: number = randomSharedX(),
  random: () => number = Math.random,
): ThrowState => ({
  phase: 'holding',
  phaseStartedMs: nowMs,
  sharedX,
  dice: createHoldingDice(sharedX, random),
  point: null,
  result: null,
  flightMs: 0,
  reachZ: [0, 0],
  reachTracked: false,
  manualHold: false,
  aimLocked: false,
  requireWallContact: false,
  hold: DEFAULT_DICE_HOLD,
  controlSnap: null,
})

const FACE_NORMALS: Array<{ v: Vec3; n: number }> = [
  { v: { x: 1, y: 0, z: 0 }, n: 3 },
  { v: { x: -1, y: 0, z: 0 }, n: 4 },
  { v: { x: 0, y: 1, z: 0 }, n: 1 },
  { v: { x: 0, y: -1, z: 0 }, n: 6 },
  { v: { x: 0, y: 0, z: 1 }, n: 2 },
  { v: { x: 0, y: 0, z: -1 }, n: 5 },
]

const faceToward = (q: Quat, dir: Vec3): number => {
  let best = 1
  let bestDot = -Infinity
  for (const face of FACE_NORMALS) {
    const world = rotateVec(q, face.v)
    const dot = world.x * dir.x + world.y * dir.y + world.z * dir.z
    if (dot > bestDot) {
      bestDot = dot
      best = face.n
    }
  }
  return best
}

export const readTopFace = (q: Quat): number => faceToward(q, { x: 0, y: 1, z: 0 })

/** World faces. Front is the face toward the shooter. */
export const readFacing = (
  q: Quat,
): { top: number; front: number; back: number; bottom: number; left: number; right: number } => ({
  top: faceToward(q, { x: 0, y: 1, z: 0 }),
  front: faceToward(q, { x: 0, y: 0, z: -1 }),
  back: faceToward(q, { x: 0, y: 0, z: 1 }),
  bottom: faceToward(q, { x: 0, y: -1, z: 0 }),
  left: faceToward(q, { x: -1, y: 0, z: 0 }),
  right: faceToward(q, { x: 1, y: 0, z: 0 }),
})

/** The one legal orientation with this top and the face toward the shooter. */
export const poseQuat = (top: number, front: number): Quat => {
  for (let face = 0; face < FACE_UP_QUATS.length; face += 1) {
    for (let twist = 0; twist < 4; twist += 1) {
      const q = normalizeQuat(quatMul(yawQuat(twist), FACE_UP_QUATS[face]))
      const facing = readFacing(q)
      if (facing.top === top && facing.front === front) return q
    }
  }
  throw new Error(`No die pose has ${top} on top and ${front} toward the shooter`)
}

export const quatToCssMatrix = (q: Quat): string => {
  const r = quatToMat(normalizeQuat(q))
  // S * R * S with S = diag(1, -1, 1). Physics Y is up; CSS Y is down.
  const m00 = r[0]
  const m01 = -r[1]
  const m02 = r[2]
  const m10 = -r[3]
  const m11 = r[4]
  const m12 = -r[5]
  const m20 = r[6]
  const m21 = -r[7]
  const m22 = r[8]
  const f = (n: number) => n.toFixed(5)
  return `matrix3d(${f(m00)},${f(m10)},${f(m20)},0,${f(m01)},${f(m11)},${f(m21)},0,${f(m02)},${f(m12)},${f(m22)},0,0,0,0,1)`
}

/** Runs after each dice substep, before the next integration. May push the dice back. */
export type DicePoseHook = (dice: [Die, Die], dt: number, metrics: StageMetrics) => [Die, Die]

export const stepDice = (
  dice: readonly [Die, Die],
  dt: number,
  metrics: StageMetrics = stageMetrics(),
  random: () => number = Math.random,
  hook?: DicePoseHook,
): [Die, Die] => {
  const step = Math.min(Math.max(dt, 0), 0.05)
  const sub = step > 0 ? 4 : 1
  const h = step / sub
  let next: [Die, Die] = [cloneDie(dice[0]), cloneDie(dice[1])]
  for (let i = 0; i < sub; i += 1) {
    next = substep(next, h, metrics, random)
    if (hook) next = hook(next, h, metrics)
  }
  return next
}

/** First felt touch of one flicked die, or a clear of the back wall. */
export const probeGestureArc = (
  releaseSpeed: number,
  metrics: StageMetrics = stageMetrics(),
): { firstZ: number | null; cleared: boolean } => {
  const { forward, up } = gestureLaunchSpeeds(releaseSpeed, metrics)
  const [die] = createHoldingDice(metrics.width / 2, () => 0)
  die.resting = false
  die.topFace = null
  die.vz = forward
  die.vh = up
  const idle = createHoldingDice(0, () => 0)[0]
  idle.alive = false
  let pair: [Die, Die] = [die, idle]
  let airborne = false
  let firstZ: number | null = null
  let cleared = false
  const watch: DicePoseHook = (dice) => {
    const probe = dice[0]
    if (probe.leaving || !probe.alive) cleared = true
    if (probe.h > 4) airborne = true
    if (firstZ == null && airborne && probe.h <= 0) firstZ = probe.z
    return dice
  }
  const dt = 1 / 60
  const steps = Math.ceil(4 / dt)
  for (let i = 0; i < steps && !cleared && firstZ == null; i += 1) {
    pair = stepDice(pair, dt, metrics, () => 0.5, watch)
  }
  return { firstZ, cleared }
}

export const advanceThrow = (
  state: ThrowState,
  dtSec: number,
  nowMs: number,
  volume: VolumeTotals,
  metrics: StageMetrics = stageMetrics(),
  poseHook?: DicePoseHook,
): ThrowState => {
  if (state.phase === 'holding') {
    if (state.manualHold) return state
    if (nowMs - state.phaseStartedMs < DIE_LAUNCH_DELAY_MS) return state
    if (!(volume.binanceBuy > 0)) return state
    if (!(volume.coinbaseBuy > 0) && !(DIE_UP_ADD_PX_PER_S > 0)) return state
    return launchHeldAuto(state, nowMs, volume, metrics)
  }

  if (state.phase === 'flying') {
    const flightMs = state.flightMs + dtSec * 1000
    const tracking = state.reachTracked === true
    let peak0 = state.reachZ?.[0] ?? 0
    let peak1 = state.reachZ?.[1] ?? 0
    const wrapped: DicePoseHook | undefined =
      tracking || poseHook
        ? (pair, dt, poseMetrics) => {
            if (tracking) {
              peak0 = Math.max(peak0, pair[0].z)
              peak1 = Math.max(peak1, pair[1].z)
            }
            return poseHook ? poseHook(pair, dt, poseMetrics) : pair
          }
        : undefined
    let dice = stepDice(state.dice, dtSec, metrics, Math.random, wrapped)
    const reachZ: [number, number] = [peak0, peak1]
    if (flightMs >= DIE_MAX_FLIGHT_MS) {
      dice = dice.map((die) => (die.alive && !die.resting && !die.leaving ? forceRest(die) : die)) as [Die, Die]
    }
    dice = dice.map((die) => {
      if (!die.leaving || !die.alive) return die
      if (die.leftAtMs == null) return { ...die, leftAtMs: nowMs }
      if (nowMs - die.leftAtMs >= DIE_NO_ROLL_PAUSE_MS) return { ...die, alive: false }
      return die
    }) as [Die, Die]
    const alive = dice.filter((die) => die.alive)
    const settled = alive.every((die) => die.resting)
    if (!settled) {
      return { ...state, dice, flightMs, reachZ }
    }
    const line = metrics.wallZ * DIE_MIN_REACH_FRACTION
    const short =
      !state.requireWallContact &&
      tracking &&
      dice.some((die, index) => die.alive && !die.hitBackWall && reachZ[index] < line)
    const missedWall = state.requireWallContact && dice.some((die) => die.alive && !die.hitBackWall)
    const noRoll = dice.some((die) => !die.alive) || short || missedWall
    const total = (dice[0].topFace ?? 0) + (dice[1].topFace ?? 0)
    const roll = noRoll ? null : applyRoll(state.point, total)
    return {
      ...state,
      phase: 'result',
      phaseStartedMs: nowMs,
      flightMs,
      reachZ,
      dice,
      point: roll ? roll.point : state.point,
      result: roll ? { total, label: roll.label } : { noRoll: true },
    }
  }

  const resultHoldMs = state.resultHoldMs ?? DIE_RESULT_HOLD_MS
  if (nowMs - state.phaseStartedMs < resultHoldMs) return state
  const sharedX = randomSharedX()
  return {
    phase: 'holding',
    phaseStartedMs: nowMs,
    sharedX,
    dice: createHoldingDice(sharedX, Math.random, state.hold),
    point: state.point,
    result: null,
    flightMs: 0,
    reachZ: [0, 0],
    reachTracked: false,
    manualHold: false,
    aimLocked: false,
    requireWallContact: false,
    hold: state.hold,
    controlSnap: null,
  }
}

/** Binance buy sets forward speed. Coinbase buy sets upward speed, then `DIE_UP_ADD_PX_PER_S` is added. A short throw raises forward speed only. */
export const launchSpeeds = (volume: VolumeTotals, metrics: StageMetrics = stageMetrics()): { forward: number; up: number } => {
  const full = fullStrengthSpeeds(metrics)
  const up = full.up * logUnit(volume.coinbaseBuy, DIE_COINBASE_BUY_REF) + DIE_UP_ADD_PX_PER_S
  const rawForward = full.forward * logUnit(volume.binanceBuy, DIE_BINANCE_BUY_REF)
  const targetZ = metrics.wallZ * DIE_MIN_REACH_FRACTION
  return { forward: forwardForReach(rawForward, up, targetZ, full.forward, metrics), up }
}

const launchDice = (
  dice: readonly [Die, Die],
  volume: VolumeTotals,
  metrics: StageMetrics,
  onAxis: boolean,
): [Die, Die] => {
  const { forward, up } = launchSpeeds(volume, metrics)
  const spinL = DIE_MAX_SPIN_RAD_PER_S * logUnit(volume.binanceSell, DIE_BINANCE_SELL_REF)
  const spinR = DIE_MAX_SPIN_RAD_PER_S * logUnit(volume.coinbaseSell, DIE_COINBASE_SELL_REF)
  const left = cloneDie(dice[0])
  const right = cloneDie(dice[1])
  if (onAxis) {
    const rate = (spinL + spinR) / 2
    const gap = (spinL - spinR) * 0.25
    applyOnAxis(left, forward, up, rate, gap)
    applyOnAxis(right, forward, up, rate, -gap)
  } else {
    applyLaunch(left, forward, up, spinL, 1)
    applyLaunch(right, forward, up, spinR, -1)
  }
  return [left, right]
}

const controlSnapOf = (state: ThrowState): DiceControlSnap => ({
  setId: state.hold.setId,
  stacked: state.hold.stacked,
  phase: state.point == null ? 'come-out' : 'point',
})

const applyLaunch = (die: Die, forward: number, up: number, spin: number, sign: number) => {
  die.resting = false
  die.topFace = null
  die.hitBackWall = false
  die.vx = 0
  die.vz = forward
  die.vh = up
  die.w = {
    x: sign * spin * DIE_FORWARD_SPIN_SCALE,
    y: sign * spin * 0.45,
    z: sign * spin * 0.7,
  }
}

const applyOnAxis = (die: Die, forward: number, up: number, rate: number, gap: number) => {
  die.resting = false
  die.topFace = null
  die.hitBackWall = false
  die.vx = 0
  die.vz = forward
  die.vh = up
  die.w = {
    x: rate * DIE_FORWARD_SPIN_SCALE,
    y: gap * 0.35,
    z: gap * 0.2,
  }
}

const applyGestureLaunch = (die: Die, forward: number, up: number, leanSpin: number) => {
  die.resting = false
  die.topFace = null
  die.hitBackWall = false
  die.vx = 0
  die.vz = forward
  die.vh = up
  die.w = {
    x: GESTURE_BASE_SPIN * DIE_FORWARD_SPIN_SCALE,
    y: leanSpin * 0.45,
    z: leanSpin * 0.7,
  }
}

const applyPrecisionLaunch = (
  die: Die,
  velocity: { vx: number; vz: number; vh: number },
  spin: number,
  leanSpin: number,
) => {
  die.resting = false
  die.topFace = null
  die.hitBackWall = false
  die.vx = velocity.vx
  die.vz = velocity.vz
  die.vh = velocity.vh
  die.w = {
    x: spin * DIE_FORWARD_SPIN_SCALE,
    y: leanSpin * 0.45,
    z: leanSpin * 0.7,
  }
}

/** Auto launch with no rail delay and no positive-volume gate. */
export const launchHeldAuto = (
  state: ThrowState,
  nowMs: number,
  volume: VolumeTotals,
  metrics: StageMetrics = stageMetrics(),
): ThrowState => {
  if (state.phase !== 'holding') return state
  return {
    ...state,
    phase: 'flying',
    phaseStartedMs: nowMs,
    flightMs: 0,
    result: null,
    reachZ: [0, 0],
    reachTracked: true,
    manualHold: false,
    requireWallContact: false,
    controlSnap: controlSnapOf(state),
    dice: launchDice(state.dice, volume, metrics, state.hold.quats != null),
  }
}

/**
 * Forward speed follows flick speed. Lift is the arc that lands a legal flick
 * on the chosen depth. At the no-roll line lift stays put and forward carries the dice over the wall.
 */
export const gestureLaunchSpeeds = (
  releaseSpeed: number,
  metrics: StageMetrics = stageMetrics(),
): { forward: number; up: number } => {
  const up = (DIE_GRAVITY_PX_PER_S2 * GESTURE_ARC_SEC) / 2
  const wallForward = metrics.wallZ / GESTURE_ARC_SEC
  const midForward = wallForward * GESTURE_MID_FELT_FRACTION
  const overForward = wallForward * GESTURE_OVERSHOOT_FORWARD_SCALE
  const speed = Math.max(0, releaseSpeed)
  if (speed <= GESTURE_SPEED_MIN_PX_PER_S) return { forward: midForward, up }
  if (speed >= GESTURE_SPEED_NO_ROLL_PX_PER_S) return { forward: overForward, up }
  if (speed <= GESTURE_SPEED_WALL_PX_PER_S) {
    const span = GESTURE_SPEED_WALL_PX_PER_S - GESTURE_SPEED_MIN_PX_PER_S
    const t = span > 0 ? (speed - GESTURE_SPEED_MIN_PX_PER_S) / span : 1
    return { forward: midForward + (wallForward - midForward) * t, up }
  }
  const span = GESTURE_SPEED_NO_ROLL_PX_PER_S - GESTURE_SPEED_WALL_PX_PER_S
  const t = span > 0 ? (speed - GESTURE_SPEED_WALL_PX_PER_S) / span : 1
  return { forward: wallForward + (overForward - wallForward) * t, up }
}

const gestureLeanSpin = (lean: number): number => {
  const capped = Math.max(-1, Math.min(1, lean / GESTURE_MAX_LEAN))
  return capped * DIE_MAX_SPIN_RAD_PER_S
}

/** Flick launch. Both dice share the lean spin. The pair center is the pointer-down x. */
export const launchGestureThrow = (
  state: ThrowState,
  nowMs: number,
  stroke: GestureStroke,
  metrics: StageMetrics = stageMetrics(),
): ThrowState => {
  if (state.phase !== 'holding') return state
  const sharedX = clampLaunchX(stroke.launchX)
  const half = DIE_LAUNCH_SIZE_PX / 2
  const { forward, up } = gestureLaunchSpeeds(stroke.speed, metrics)
  const leanSpin = gestureLeanSpin(stroke.lean)
  const left = cloneDie(state.dice[0])
  const right = cloneDie(state.dice[1])
  if (state.hold.stacked) {
    left.x = sharedX
    right.x = sharedX
  } else {
    left.x = sharedX - half
    right.x = sharedX + half
    left.h = 0
    right.h = 0
  }
  applyGestureLaunch(left, forward, up, leanSpin)
  applyGestureLaunch(right, forward, up, leanSpin)
  return {
    ...state,
    phase: 'flying',
    phaseStartedMs: nowMs,
    sharedX,
    flightMs: 0,
    result: null,
    reachZ: [0, 0],
    reachTracked: true,
    manualHold: false,
    aimLocked: false,
    requireWallContact: true,
    controlSnap: controlSnapOf(state),
    dice: [left, right],
  }
}

/** Aimed toss. The pair stays on its rail spot. Spin comes from the spin phase, lean from the flick. */
export const launchPrecisionThrow = (
  state: ThrowState,
  nowMs: number,
  shot: PrecisionThrow,
  metrics: StageMetrics = stageMetrics(),
): ThrowState => {
  if (state.phase !== 'holding') return state
  const sharedX = clampLaunchX(state.sharedX)
  const half = DIE_LAUNCH_SIZE_PX / 2
  const velocity = precisionVelocity(sharedX, { x: shot.targetX, y: shot.targetY }, shot.angleDeg, shot.speed, metrics)
  const leanSpin = gestureLeanSpin(shot.lean)
  const left = cloneDie(state.dice[0])
  const right = cloneDie(state.dice[1])
  if (state.hold.stacked) {
    left.x = sharedX
    right.x = sharedX
  } else {
    left.x = sharedX - half
    right.x = sharedX + half
    left.h = 0
    right.h = 0
  }
  applyPrecisionLaunch(left, velocity, shot.spin, leanSpin)
  applyPrecisionLaunch(right, velocity, shot.spin, leanSpin)
  return {
    ...state,
    phase: 'flying',
    phaseStartedMs: nowMs,
    sharedX,
    flightMs: 0,
    result: null,
    reachZ: [0, 0],
    reachTracked: true,
    manualHold: false,
    aimLocked: false,
    requireWallContact: true,
    controlSnap: controlSnapOf(state),
    dice: [left, right],
  }
}

/** Slide a held pair to the finger's x without changing the facing. */
export const aimHeldPair = (state: ThrowState, stageX: number): ThrowState => {
  if (state.phase !== 'holding') return state
  const sharedX = clampLaunchX(stageX)
  const half = DIE_LAUNCH_SIZE_PX / 2
  const left = cloneDie(state.dice[0])
  const right = cloneDie(state.dice[1])
  if (state.hold.stacked) {
    left.x = sharedX
    right.x = sharedX
    left.h = 0
    right.h = dieSize(0)
  } else {
    left.x = sharedX - half
    right.x = sharedX + half
    left.h = 0
    right.h = 0
  }
  return { ...state, sharedX, aimLocked: true, dice: [left, right] }
}

const substep = (dice: [Die, Die], dt: number, metrics: StageMetrics, random: () => number): [Die, Die] => {
  const next: [Die, Die] = [integrate(dice[0], dt), integrate(dice[1], dt)]
  resolvePair(next[0], next[1], metrics)
  next[0] = constrain(next[0], metrics, dt, random)
  next[1] = constrain(next[1], metrics, dt, random)
  return next
}

const integrate = (die: Die, dt: number): Die => {
  if (!die.alive || die.resting || die.leaving) return die
  const next = cloneDie(die)
  next.vh -= DIE_GRAVITY_PX_PER_S2 * dt
  next.x += next.vx * dt
  next.z += next.vz * dt
  next.h += next.vh * dt
  next.q = integrateQuat(next.q, next.w, dt)
  return next
}

const constrain = (die: Die, metrics: StageMetrics, dt: number, random: () => number): Die => {
  if (!die.alive || die.resting || die.leaving) return die
  const next = cloneDie(die)
  const radius = dieSize(next.z, metrics) / 2
  let rail = backRailContact(next.x, next.z, radius)
  const filletOwns = !rail.flat && rail.penetration > 0

  if (!filletOwns) {
    if (next.x < radius) {
      next.x = radius
      if (next.vx < 0) bounceRail(next, 'x', 1, random)
    } else if (next.x > metrics.width - radius) {
      next.x = metrics.width - radius
      if (next.vx > 0) bounceRail(next, 'x', -1, random)
    }
    rail = backRailContact(next.x, next.z, radius)
  }

  if (next.z < 0) {
    next.z = 0
    if (next.vz < 0) bounceRail(next, 'z', 1, random)
  }

  if (rail.centerSigned >= 0 && next.h > metrics.wallHeight) {
    const screen = dieScreenCenter(next, metrics)
    if (screen.y + screen.size / 2 < 0) {
      next.alive = false
      next.resting = false
      next.topFace = null
      return next
    }
    next.leaving = true
    next.alive = true
    next.resting = false
    next.vx = 0
    next.vz = 0
    next.vh = 0
    next.w = { x: 0, y: 0, z: 0 }
    return next
  }

  const intoRail = next.vx * rail.nx + next.vz * rail.nz
  if (rail.penetration > 0 && next.h <= metrics.wallHeight && intoRail > 0) {
    next.x -= rail.nx * rail.penetration
    next.z -= rail.nz * rail.penetration
    next.hitBackWall = true
    if (rail.flat) bounceRail(next, 'z', -1, random)
    else bounceAlongNormal(next, rail.nx, rail.nz, random)
  }

  if (next.h <= 0) {
    next.h = 0
    const hop = (next.vh * next.vh) / (2 * DIE_GRAVITY_PX_PER_S2)
    const slide = Math.hypot(next.vx, next.vz)
    const gentle = hop < 1.5
    if (next.vh <= 0 && gentle && slide < DIE_REST_SPEED_PX_PER_S && Math.abs(next.vh) < DIE_REST_VERTICAL_PX_PER_S) {
      return forceRest(next)
    }
    if (next.vh < 0 && !gentle) {
      const r = dieSize(next.z, metrics) / 2
      next.vx += next.w.z * r * DIE_SPIN_KICK
      next.vz += next.w.x * r * DIE_SPIN_KICK
      next.vh = -next.vh * DIE_FELT_RESTITUTION
      next.vx *= DIE_FELT_SPEED_KEEP
      next.vz *= DIE_FELT_SPEED_KEEP
      dampSpin(next)
    } else {
      next.vh = 0
      const keep = Math.exp(-DIE_SLIDE_DAMP_PER_S * dt)
      next.vx *= keep
      next.vz *= keep
      const size = dieSize(next.z, metrics)
      next.w.y *= DIE_SPIN_DAMP
      next.w.z *= DIE_SPIN_DAMP
      next.w.x = (Math.PI / 2) * next.vz / size
      if (Math.hypot(next.vx, next.vz) < DIE_REST_SPEED_PX_PER_S) return forceRest(next)
    }
  }

  return next
}

const resolvePair = (a: Die, b: Die, metrics: StageMetrics) => {
  if (!a.alive || !b.alive || a.resting || b.resting || a.leaving || b.leaving) return
  const ra = dieSize(a.z, metrics) / 2
  const rb = dieSize(b.z, metrics) / 2
  const minDist = ra + rb
  let dx = b.x - a.x
  let dz = b.z - a.z
  let dh = b.h - a.h
  let dist = Math.hypot(dx, dz, dh)
  if (dist >= minDist - 0.01) return
  if (dist < 1e-4) {
    dx = minDist
    dz = 0
    dh = 0
    dist = minDist
  }
  const nx = dx / dist
  const nz = dz / dist
  const nh = dh / dist
  const overlap = minDist - dist
  a.x -= nx * overlap * 0.5
  a.z -= nz * overlap * 0.5
  a.h -= nh * overlap * 0.5
  b.x += nx * overlap * 0.5
  b.z += nz * overlap * 0.5
  b.h += nh * overlap * 0.5
  const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz + (b.vh - a.vh) * nh
  if (rel >= 0) return
  const impulse = (-(1 + DIE_WALL_RESTITUTION) * rel) / 2
  a.vx -= impulse * nx
  a.vz -= impulse * nz
  a.vh -= impulse * nh
  b.vx += impulse * nx
  b.vz += impulse * nz
  b.vh += impulse * nh
  dampSpin(a)
  dampSpin(b)
}

const reflectAxis = (die: Die, axis: 'x' | 'z', outwardSign: number) => {
  if (axis === 'x') die.vx = Math.abs(die.vx) * DIE_WALL_RESTITUTION * outwardSign
  else die.vz = Math.abs(die.vz) * DIE_WALL_RESTITUTION * outwardSign
  dampSpin(die)
}

const scatterRail = (die: Die, random: () => number) => {
  const speed = Math.hypot(die.vx, die.vz)
  if (speed > 0) {
    const yaw = Math.atan2(die.vz, die.vx) + (random() * 2 - 1) * DIE_WALL_SCATTER_RAD
    die.vx = Math.cos(yaw) * speed
    die.vz = Math.sin(yaw) * speed
  }
  const kick = () => (random() * 2 - 1) * DIE_WALL_SPIN_RAD
  die.w = { x: die.w.x + kick(), y: die.w.y + kick(), z: die.w.z + kick() }
}

const bounceRail = (die: Die, axis: 'x' | 'z', outwardSign: number, random: () => number) => {
  reflectAxis(die, axis, outwardSign)
  scatterRail(die, random)
}

/** Fillet hit. Reflects on the rail normal, then uses the same scatter as a flat rail. */
const bounceAlongNormal = (die: Die, nx: number, nz: number, random: () => number) => {
  const into = die.vx * nx + die.vz * nz
  if (into > 0) {
    die.vx -= (1 + DIE_WALL_RESTITUTION) * into * nx
    die.vz -= (1 + DIE_WALL_RESTITUTION) * into * nz
  }
  dampSpin(die)
  scatterRail(die, random)
  const still = die.vx * nx + die.vz * nz
  if (still > 0) {
    die.vx -= 2 * still * nx
    die.vz -= 2 * still * nz
  }
}

const forceRest = (die: Die): Die => {
  const next = cloneDie(die)
  next.h = 0
  next.vx = 0
  next.vz = 0
  next.vh = 0
  next.w = { x: 0, y: 0, z: 0 }
  next.q = snapQuaternion(next.q)
  next.resting = true
  next.alive = true
  next.leaving = false
  next.leftAtMs = null
  next.topFace = readTopFace(next.q)
  return next
}

const dampSpin = (die: Die) => {
  die.w = { x: die.w.x * DIE_SPIN_DAMP, y: die.w.y * DIE_SPIN_DAMP, z: die.w.z * DIE_SPIN_DAMP }
}

const restingDie = (x: number, q: Quat, h = 0): Die => ({
  alive: true,
  resting: true,
  leaving: false,
  leftAtMs: null,
  x,
  z: 0,
  h,
  vx: 0,
  vz: 0,
  vh: 0,
  q,
  w: { x: 0, y: 0, z: 0 },
  topFace: readTopFace(q),
})

/** Ceiling of the launch search. The 0.62² term is not a required bounce count. */
const fullStrengthSpeeds = (metrics: StageMetrics): { forward: number; up: number } => {
  const bounceKeep = DIE_FELT_SPEED_KEEP * DIE_FELT_SPEED_KEEP
  const forward = metrics.wallZ / DIE_FULL_REACH_SEC / bounceKeep
  const arriveT = metrics.wallZ / Math.max(forward, 1)
  const up = (metrics.wallHeight + 0.5 * DIE_GRAVITY_PX_PER_S2 * arriveT * arriveT) / Math.max(arriveT, 0.05)
  return { forward, up }
}

const simulatedMaxZ = (forward: number, up: number, metrics: StageMetrics): number => {
  const probe = restingDie(metrics.width / 2, IDENTITY)
  probe.resting = false
  probe.topFace = null
  probe.vz = forward
  probe.vh = up
  const idle = restingDie(0, IDENTITY)
  idle.alive = false
  let dice: [Die, Die] = [probe, idle]
  let maxZ = 0
  const dt = 1 / 60
  const steps = Math.ceil(DIE_MAX_FLIGHT_MS / 1000 / dt)
  for (let i = 0; i < steps; i += 1) {
    dice = stepDice(dice, dt, metrics, () => 0.5)
    maxZ = Math.max(maxZ, dice[0].z)
    if (!dice[0].alive || dice[0].resting) break
  }
  return maxZ
}

/** Raises forward speed until the probe reaches `targetZ`. Upward speed stays put. */
const forwardForReach = (
  rawForward: number,
  up: number,
  targetZ: number,
  fullForward: number,
  metrics: StageMetrics,
): number => {
  const reaches = (forward: number) => simulatedMaxZ(forward, up, metrics) >= targetZ - 0.5
  if (reaches(rawForward)) return rawForward
  if (!reaches(fullForward)) return fullForward
  let lo = rawForward
  let hi = fullForward
  for (let i = 0; i < 10; i += 1) {
    const mid = (lo + hi) / 2
    if (reaches(mid)) hi = mid
    else lo = mid
  }
  return hi
}

const HALF_SQRT2 = Math.SQRT1_2

/** Resting orientations whose top faces are 3, 4, 2, 5, 6, then 1. */
const FACE_UP_QUATS: Quat[] = [
  { x: 0, y: 0, z: HALF_SQRT2, w: HALF_SQRT2 },
  { x: 0, y: 0, z: -HALF_SQRT2, w: HALF_SQRT2 },
  { x: -HALF_SQRT2, y: 0, z: 0, w: HALF_SQRT2 },
  { x: HALF_SQRT2, y: 0, z: 0, w: HALF_SQRT2 },
  { x: 0, y: 0, z: 1, w: 0 },
  { x: 0, y: 0, z: 0, w: 1 },
]

const randomRestQuat = (random: () => number): Quat => {
  const face = Math.min(5, Math.floor(random() * 6))
  const twist = Math.min(3, Math.floor(random() * 4))
  return normalizeQuat(quatMul(yawQuat(twist), FACE_UP_QUATS[face]))
}

const yawQuat = (quarterTurns: number): Quat => {
  const half = ((quarterTurns % 4) * Math.PI) / 4
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) }
}

const quatMul = (a: Quat, b: Quat): Quat => ({
  w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
  y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
  z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
})

const cloneDie = (die: Die): Die => ({
  ...die,
  q: { ...die.q },
  w: { ...die.w },
})

const integrateQuat = (q: Quat, w: Vec3, dt: number): Quat => {
  const hx = w.x * dt * 0.5
  const hy = w.y * dt * 0.5
  const hz = w.z * dt * 0.5
  return normalizeQuat({
    x: q.x + q.w * hx + q.z * hy - q.y * hz,
    y: q.y + q.w * hy + q.x * hz - q.z * hx,
    z: q.z + q.w * hz + q.y * hx - q.x * hy,
    w: q.w - q.x * hx - q.y * hy - q.z * hz,
  })
}

export interface ArcDisplay {
  q: Quat
  /** Seconds of tumble the picture has not shown yet. */
  lag: number
}

export const arcDisplayFrom = (die: Die): ArcDisplay => ({ q: { ...die.q }, lag: 0 })

const arcSpinRate = (h: number): number => 1 - (1 - DIE_ARC_SPIN_MIN) * arcLift(h)

/** Seconds until a ballistic die meets the felt. Vertical speed is upward-positive. */
const timeToFelt = (h: number, vh: number): number => {
  const disc = vh * vh + 2 * DIE_GRAVITY_PX_PER_S2 * h
  return Math.max(1e-4, (-vh + Math.sqrt(Math.max(0, disc))) / DIE_GRAVITY_PX_PER_S2)
}

/**
 * Drawing-only tumble. Rising dice follow the lift curve down to `DIE_ARC_SPIN_MIN`.
 * Falling dice add enough rate to spend the unshown time before the felt.
 * Contact, rest, and leaving copy the simulation pose.
 */
export const advanceArcDisplay = (display: ArcDisplay, die: Die, dt: number): ArcDisplay => {
  if (!(dt > 0) || !die.alive || die.resting || die.leaving || die.h <= 0) {
    return { q: { ...die.q }, lag: 0 }
  }
  const artistic = arcSpinRate(die.h)
  let rate = artistic
  if (die.vh < 0 && display.lag > 0) {
    const lift = arcLift(die.h)
    const needed = 1 + display.lag / timeToFelt(die.h, die.vh)
    rate = artistic * lift + needed * (1 - lift)
  }
  const shown = Math.min(Math.max(0, dt * rate), dt + display.lag)
  return {
    q: integrateQuat(display.q, die.w, shown),
    lag: display.lag + dt - shown,
  }
}

export const syncArcDisplay = (
  display: readonly [ArcDisplay, ArcDisplay],
  dice: readonly [Die, Die],
  dt: number,
): [ArcDisplay, ArcDisplay] => [advanceArcDisplay(display[0], dice[0], dt), advanceArcDisplay(display[1], dice[1], dt)]

const rotateVec = (q: Quat, v: Vec3): Vec3 => {
  const n = normalizeQuat(q)
  const tx = 2 * (n.y * v.z - n.z * v.y)
  const ty = 2 * (n.z * v.x - n.x * v.z)
  const tz = 2 * (n.x * v.y - n.y * v.x)
  return {
    x: v.x + n.w * tx + (n.y * tz - n.z * ty),
    y: v.y + n.w * ty + (n.z * tx - n.x * tz),
    z: v.z + n.w * tz + (n.x * ty - n.y * tx),
  }
}

const snapQuaternion = (q: Quat): Quat => {
  const basis = [rotateVec(q, { x: 1, y: 0, z: 0 }), rotateVec(q, { x: 0, y: 1, z: 0 }), rotateVec(q, { x: 0, y: 0, z: 1 })]
  const order = basis
    .map((v, index) => ({ index, v, mag: Math.max(Math.abs(v.x), Math.abs(v.y), Math.abs(v.z)) }))
    .sort((a, b) => b.mag - a.mag)
  const used = new Set<number>()
  const assigned: Vec3[] = new Array(3)
  for (const item of order) {
    const ranking = [0, 1, 2].sort((a, b) => Math.abs(comp(item.v, b)) - Math.abs(comp(item.v, a)))
    const axis = ranking.find((candidate) => !used.has(candidate)) ?? ranking[0]
    used.add(axis)
    const sign = comp(item.v, axis) >= 0 ? 1 : -1
    assigned[item.index] = axisVec(axis, sign)
  }
  const crossed = cross(assigned[0], assigned[1])
  if (dot(crossed, assigned[2]) < 0) assigned[2] = scale(assigned[2], -1)
  return quatFromBasis(assigned[0], assigned[1], assigned[2])
}

const quatFromBasis = (c0: Vec3, c1: Vec3, c2: Vec3): Quat => {
  const m00 = c0.x
  const m10 = c0.y
  const m20 = c0.z
  const m01 = c1.x
  const m11 = c1.y
  const m21 = c1.z
  const m02 = c2.x
  const m12 = c2.y
  const m22 = c2.z
  const trace = m00 + m11 + m22
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    return normalizeQuat({ w: 0.25 * s, x: (m21 - m12) / s, y: (m02 - m20) / s, z: (m10 - m01) / s })
  }
  if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2
    return normalizeQuat({ w: (m21 - m12) / s, x: 0.25 * s, y: (m01 + m10) / s, z: (m02 + m20) / s })
  }
  if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2
    return normalizeQuat({ w: (m02 - m20) / s, x: (m01 + m10) / s, y: 0.25 * s, z: (m12 + m21) / s })
  }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2
  return normalizeQuat({ w: (m10 - m01) / s, x: (m02 + m20) / s, y: (m12 + m21) / s, z: 0.25 * s })
}

const quatToMat = (q: Quat): number[] => {
  const { x, y, z, w } = q
  const xx = x * x
  const yy = y * y
  const zz = z * z
  const xy = x * y
  const xz = x * z
  const yz = y * z
  const wx = w * x
  const wy = w * y
  const wz = w * z
  return [
    1 - 2 * (yy + zz),
    2 * (xy - wz),
    2 * (xz + wy),
    2 * (xy + wz),
    1 - 2 * (xx + zz),
    2 * (yz - wx),
    2 * (xz - wy),
    2 * (yz + wx),
    1 - 2 * (xx + yy),
  ]
}

const normalizeQuat = (q: Quat): Quat => {
  const len = Math.hypot(q.x, q.y, q.z, q.w) || 1
  return { x: q.x / len, y: q.y / len, z: q.z / len, w: q.w / len }
}

const comp = (v: Vec3, axis: number): number => (axis === 0 ? v.x : axis === 1 ? v.y : v.z)

const axisVec = (axis: number, sign: number): Vec3 => ({
  x: axis === 0 ? sign : 0,
  y: axis === 1 ? sign : 0,
  z: axis === 2 ? sign : 0,
})

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z

const scale = (v: Vec3, s: number): Vec3 => ({ x: v.x * s, y: v.y * s, z: v.z * s })

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))
