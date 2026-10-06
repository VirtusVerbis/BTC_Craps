import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { applyRoll } from './puckState'
import {
  DIE_BINANCE_BUY_REF,
  DIE_BINANCE_SELL_REF,
  DIE_COINBASE_BUY_REF,
  DIE_COINBASE_SELL_REF,
  DIE_DEPTH_SCALE,
  DIE_FELT_RESTITUTION,
  DIE_FELT_SPEED_KEEP,
  DIE_FORWARD_SPIN_SCALE,
  DIE_FULL_REACH_SEC,
  DIE_GRAVITY_PX_PER_S2,
  DIE_LAUNCH_DELAY_MS,
  DIE_LAUNCH_SIZE_PX,
  DIE_MAX_FLIGHT_MS,
  DIE_MAX_SPIN_RAD_PER_S,
  DIE_MIN_REACH_FRACTION,
  DIE_NO_ROLL_PAUSE_MS,
  DIE_REST_SPEED_PX_PER_S,
  DIE_REST_VERTICAL_PX_PER_S,
  DIE_RESULT_HOLD_MS,
  DIE_SLIDE_DAMP_PER_S,
  DIE_SPIN_DAMP,
  DIE_SPIN_KICK,
  DIE_WALL_BOTTOM_FRACTION,
  DIE_WALL_RESTITUTION,
  DIE_WALL_SCATTER_RAD,
  DIE_WALL_SPIN_RAD,
  DIE_WALL_TOP_FRACTION,
} from './diceConstants'

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
  flightMs: number
}

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

/** Screen center of a die. Y grows downward. The felt contact sits on `height - z`. */
export const dieScreenCenter = (die: Die, metrics: StageMetrics = stageMetrics()): { x: number; y: number; size: number } => {
  const size = dieSize(die.z, metrics)
  const contactY = metrics.height - die.z
  return { x: die.x, y: contactY - size / 2 - die.h, size }
}

export const randomSharedX = (random: () => number = Math.random): number => {
  const min = DIE_LAUNCH_SIZE_PX
  const max = REFERENCE_WIDTH - DIE_LAUNCH_SIZE_PX
  return min + random() * (max - min)
}

export const createHoldingDice = (sharedX: number, random: () => number = Math.random): [Die, Die] => {
  const half = DIE_LAUNCH_SIZE_PX / 2
  return [makeDie(sharedX - half, random), makeDie(sharedX + half, random)]
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
})

export const readTopFace = (q: Quat): number => {
  const faces: Array<{ v: Vec3; n: number }> = [
    { v: { x: 1, y: 0, z: 0 }, n: 3 },
    { v: { x: -1, y: 0, z: 0 }, n: 4 },
    { v: { x: 0, y: 1, z: 0 }, n: 1 },
    { v: { x: 0, y: -1, z: 0 }, n: 6 },
    { v: { x: 0, y: 0, z: 1 }, n: 2 },
    { v: { x: 0, y: 0, z: -1 }, n: 5 },
  ]
  let best = 1
  let bestDot = -Infinity
  for (const face of faces) {
    const world = rotateVec(q, face.v)
    if (world.y > bestDot) {
      bestDot = world.y
      best = face.n
    }
  }
  return best
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

export const stepDice = (
  dice: readonly [Die, Die],
  dt: number,
  metrics: StageMetrics = stageMetrics(),
  random: () => number = Math.random,
): [Die, Die] => {
  const step = Math.min(Math.max(dt, 0), 0.05)
  const sub = step > 0 ? 4 : 1
  const h = step / sub
  let next: [Die, Die] = [cloneDie(dice[0]), cloneDie(dice[1])]
  for (let i = 0; i < sub; i += 1) {
    next = substep(next, h, metrics, random)
  }
  return next
}

export const advanceThrow = (
  state: ThrowState,
  dtSec: number,
  nowMs: number,
  volume: VolumeTotals,
  metrics: StageMetrics = stageMetrics(),
): ThrowState => {
  if (state.phase === 'holding') {
    if (nowMs - state.phaseStartedMs < DIE_LAUNCH_DELAY_MS) return state
    if (!(volume.binanceBuy > 0) || !(volume.coinbaseBuy > 0)) return state
    return {
      ...state,
      phase: 'flying',
      phaseStartedMs: nowMs,
      flightMs: 0,
      result: null,
      dice: launchDice(state.dice, volume, metrics),
    }
  }

  if (state.phase === 'flying') {
    const flightMs = state.flightMs + dtSec * 1000
    let dice = stepDice(state.dice, dtSec, metrics)
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
      return { ...state, dice, flightMs }
    }
    const noRoll = dice.some((die) => !die.alive)
    const total = (dice[0].topFace ?? 0) + (dice[1].topFace ?? 0)
    const roll = noRoll ? null : applyRoll(state.point, total)
    return {
      ...state,
      phase: 'result',
      phaseStartedMs: nowMs,
      flightMs,
      dice,
      point: roll ? roll.point : state.point,
      result: roll ? { total, label: roll.label } : { noRoll: true },
    }
  }

  if (nowMs - state.phaseStartedMs < DIE_RESULT_HOLD_MS) return state
  const sharedX = randomSharedX()
  return {
    phase: 'holding',
    phaseStartedMs: nowMs,
    sharedX,
    dice: createHoldingDice(sharedX),
    point: state.point,
    result: null,
    flightMs: 0,
  }
}

/** Shared launch speeds. One buy-volume distance for both dice; felt hits decide how many bounces that takes. */
export const launchSpeeds = (volume: VolumeTotals, metrics: StageMetrics = stageMetrics()): { forward: number; up: number } => {
  const full = fullStrengthSpeeds(metrics)
  const targetZ = metrics.wallZ * reachFraction(volume)
  const scale = launchScale(targetZ, full, metrics)
  return { forward: full.forward * scale, up: full.up * scale }
}

const launchDice = (dice: readonly [Die, Die], volume: VolumeTotals, metrics: StageMetrics): [Die, Die] => {
  const { forward, up } = launchSpeeds(volume, metrics)
  const spinL = DIE_MAX_SPIN_RAD_PER_S * logUnit(volume.binanceSell, DIE_BINANCE_SELL_REF)
  const spinR = DIE_MAX_SPIN_RAD_PER_S * logUnit(volume.coinbaseSell, DIE_COINBASE_SELL_REF)
  const left = cloneDie(dice[0])
  const right = cloneDie(dice[1])
  applyLaunch(left, forward, up, spinL, 1)
  applyLaunch(right, forward, up, spinR, -1)
  return [left, right]
}

const applyLaunch = (die: Die, forward: number, up: number, spin: number, sign: number) => {
  die.resting = false
  die.topFace = null
  die.vx = 0
  die.vz = forward
  die.vh = up
  die.w = {
    x: sign * spin * DIE_FORWARD_SPIN_SCALE,
    y: sign * spin * 0.45,
    z: sign * spin * 0.7,
  }
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

  if (next.x < radius) {
    next.x = radius
    if (next.vx < 0) bounceRail(next, 'x', 1, random)
  } else if (next.x > metrics.width - radius) {
    next.x = metrics.width - radius
    if (next.vx > 0) bounceRail(next, 'x', -1, random)
  }

  if (next.z < 0) {
    next.z = 0
    if (next.vz < 0) bounceRail(next, 'z', 1, random)
  }

  if (next.z >= metrics.wallZ && next.h > metrics.wallHeight) {
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

  const front = next.z + radius
  if (front >= metrics.wallZ && next.vz > 0 && next.h <= metrics.wallHeight) {
    next.z = Math.max(0, metrics.wallZ - radius)
    bounceRail(next, 'z', -1, random)
  }

  if (next.h <= 0) {
    next.h = 0
    const hop = (next.vh * next.vh) / (2 * DIE_GRAVITY_PX_PER_S2)
    const slide = Math.hypot(next.vx, next.vz)
    if (next.vh <= 0 && hop < 1.5 && slide < DIE_REST_SPEED_PX_PER_S && Math.abs(next.vh) < DIE_REST_VERTICAL_PX_PER_S) {
      return forceRest(next)
    }
    if (next.vh < 0) {
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
      dampSpin(next)
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

const bounceRail = (die: Die, axis: 'x' | 'z', outwardSign: number, random: () => number) => {
  reflectAxis(die, axis, outwardSign)
  const speed = Math.hypot(die.vx, die.vz)
  if (speed > 0) {
    const yaw = Math.atan2(die.vz, die.vx) + (random() * 2 - 1) * DIE_WALL_SCATTER_RAD
    die.vx = Math.cos(yaw) * speed
    die.vz = Math.sin(yaw) * speed
  }
  const kick = () => (random() * 2 - 1) * DIE_WALL_SPIN_RAD
  die.w = { x: die.w.x + kick(), y: die.w.y + kick(), z: die.w.z + kick() }
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

const makeDie = (x: number, random: () => number = Math.random): Die => restingDie(x, randomRestQuat(random))

const restingDie = (x: number, q: Quat): Die => ({
  alive: true,
  resting: true,
  leaving: false,
  leftAtMs: null,
  x,
  z: 0,
  h: 0,
  vx: 0,
  vz: 0,
  vh: 0,
  q,
  w: { x: 0, y: 0, z: 0 },
  topFace: readTopFace(q),
})

const buyDistanceUnit = (volume: VolumeTotals): number => {
  const binance = logUnit(volume.binanceBuy, DIE_BINANCE_BUY_REF)
  const coinbase = logUnit(volume.coinbaseBuy, DIE_COINBASE_BUY_REF)
  return 1 - (1 - binance) * (1 - coinbase)
}

const reachFraction = (volume: VolumeTotals): number => {
  const k = buyDistanceUnit(volume)
  return DIE_MIN_REACH_FRACTION + (1 - DIE_MIN_REACH_FRACTION) * k
}

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

const launchScale = (
  targetZ: number,
  full: { forward: number; up: number },
  metrics: StageMetrics,
): number => {
  const reaches = (scale: number) => simulatedMaxZ(full.forward * scale, full.up * scale, metrics) >= targetZ - 0.5
  if (!reaches(1)) return 1
  let lo = 0
  let hi = 1
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
