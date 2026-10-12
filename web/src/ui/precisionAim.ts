import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import {
  DIE_GRAVITY_PX_PER_S2,
  DIE_WALL_BOTTOM_FRACTION,
  DIE_WALL_TOP_FRACTION,
  GESTURE_ARC_SEC,
  GESTURE_MID_FELT_FRACTION,
  GESTURE_OVERSHOOT_FORWARD_SCALE,
  GESTURE_RELEASE_WINDOW_MS,
  GESTURE_SPEED_MIN_PX_PER_S,
  GESTURE_SPEED_NO_ROLL_PX_PER_S,
  GESTURE_SPEED_WALL_PX_PER_S,
  PRECISION_ANGLE_DRAG_PX,
  PRECISION_ARROW_GAP_PX,
  PRECISION_DEFAULT_ANGLE_DEG,
  PRECISION_DRAG_MIN_PX,
  PRECISION_SPIN_DEFAULT,
  PRECISION_SPIN_FULL_PX_PER_S,
  PRECISION_SPIN_MAX,
  PRECISION_SPIN_MIN_DISTANCE_PX,
} from './diceConstants'
import type { StrokePoint } from './gestureThrow'

export type PrecisionPhase = 'target' | 'trajectory' | 'spin' | 'gesture'

export const PRECISION_PHASE_LABEL: Record<PrecisionPhase, string> = {
  target: 'Set Target Location',
  trajectory: 'Set Trajectory Angle',
  spin: 'Spin Forward/Backward',
  gesture: 'Take the shot Shooter!',
}

export interface StagePoint {
  x: number
  y: number
}

export interface AimMetrics {
  width: number
  height: number
  wallTop: number
  wallBottom: number
  wallZ: number
}

export interface PrecisionThrow {
  targetX: number
  targetY: number
  angleDeg: number
  /** Signed over-the-top spin before `DIE_FORWARD_SPIN_SCALE`. */
  spin: number
  /** Finger speed, in stage pixels per second. Wall speed reaches the aim. */
  speed: number
  lean: number
}

export interface PrecisionVelocity {
  vx: number
  vz: number
  vh: number
}

export const aimMetrics = (): AimMetrics => {
  const wallTop = DIE_WALL_TOP_FRACTION * REFERENCE_HEIGHT
  const wallBottom = DIE_WALL_BOTTOM_FRACTION * REFERENCE_HEIGHT
  return {
    width: REFERENCE_WIDTH,
    height: REFERENCE_HEIGHT,
    wallTop,
    wallBottom,
    wallZ: REFERENCE_HEIGHT - wallBottom,
  }
}

/** Center of the back wall. A refresh and a first shot start here. */
export const defaultPrecisionTarget = (metrics: AimMetrics = aimMetrics()): StagePoint => ({
  x: metrics.width / 2,
  y: (metrics.wallTop + metrics.wallBottom) / 2,
})

export const defaultPrecisionAngle = (): number => PRECISION_DEFAULT_ANGLE_DEG

export const defaultPrecisionSpin = (): number => PRECISION_SPIN_DEFAULT

/**
 * Felt points map to depth. The wall face is the back-wall depth.
 * Above the wall is past it.
 */
export const aimDepth = (targetY: number, metrics: AimMetrics = aimMetrics()): number => {
  if (targetY >= metrics.wallBottom) return Math.max(0, metrics.height - targetY)
  if (targetY >= metrics.wallTop) return metrics.wallZ
  return metrics.wallZ + (metrics.wallTop - targetY)
}

/** 1 reaches the aim. The slowest flick is the mid-felt fraction. A no-roll flick overshoots. */
export const flickScale = (releaseSpeed: number): number => {
  const speed = Math.max(0, releaseSpeed)
  if (speed <= GESTURE_SPEED_MIN_PX_PER_S) return GESTURE_MID_FELT_FRACTION
  if (speed >= GESTURE_SPEED_NO_ROLL_PX_PER_S) return GESTURE_OVERSHOOT_FORWARD_SCALE
  if (speed <= GESTURE_SPEED_WALL_PX_PER_S) {
    const span = GESTURE_SPEED_WALL_PX_PER_S - GESTURE_SPEED_MIN_PX_PER_S
    const t = span > 0 ? (speed - GESTURE_SPEED_MIN_PX_PER_S) / span : 1
    return GESTURE_MID_FELT_FRACTION + (1 - GESTURE_MID_FELT_FRACTION) * t
  }
  const span = GESTURE_SPEED_NO_ROLL_PX_PER_S - GESTURE_SPEED_WALL_PX_PER_S
  const t = span > 0 ? (speed - GESTURE_SPEED_WALL_PX_PER_S) / span : 1
  return 1 + (GESTURE_OVERSHOOT_FORWARD_SCALE - 1) * t
}

const clampAngle = (angleDeg: number): number => Math.min(90, Math.max(0, angleDeg))

/**
 * Velocity that sends the pair center toward the reticle.
 * A wall-speed flick is scale 1. Near 90° the speed is capped and the toss falls short.
 */
export const precisionVelocity = (
  launchX: number,
  target: StagePoint,
  angleDeg: number,
  releaseSpeed: number,
  metrics: AimMetrics = aimMetrics(),
): PrecisionVelocity => {
  const theta = (clampAngle(angleDeg) * Math.PI) / 180
  const zTarget = aimDepth(target.y, metrics)
  const dx = target.x - launchX
  const distance = Math.hypot(dx, zTarget)
  const wallForward = metrics.wallZ / GESTURE_ARC_SEC
  const maxVxz = wallForward * GESTURE_OVERSHOOT_FORWARD_SCALE
  const maxVh = DIE_GRAVITY_PX_PER_S2 * GESTURE_ARC_SEC
  let vxz = 0
  let vh = 0
  if (distance < 1) {
    vh = Math.sin(theta) * (DIE_GRAVITY_PX_PER_S2 * GESTURE_ARC_SEC) / 2
  } else if (theta >= (89 * Math.PI) / 180) {
    vh = maxVh
  } else if (theta < (2 * Math.PI) / 180) {
    vxz = distance / GESTURE_ARC_SEC
  } else {
    const tan = Math.tan(theta)
    vxz = Math.sqrt((distance * DIE_GRAVITY_PX_PER_S2) / (2 * tan))
    vh = vxz * tan
  }
  const cap = Math.max(vxz / Math.max(maxVxz, 1), vh / Math.max(maxVh, 1), 1)
  vxz /= cap
  vh /= cap
  // The loft stays fixed, so distance follows the square of speed. The flick
  // fraction is a landing distance, and the velocity uses its square root.
  const scale = Math.sqrt(flickScale(releaseSpeed))
  const inv = distance > 1 ? 1 / distance : 0
  return {
    vx: dx * inv * vxz * scale,
    vz: zTarget * inv * vxz * scale,
    vh: vh * scale,
  }
}

export interface PrecisionArc {
  start: StagePoint
  control: StagePoint
  end: StagePoint
}

/** Quadratic curve from the pair to the reticle. It leaves the rail at the loft angle. */
export const precisionArc = (
  launch: StagePoint,
  target: StagePoint,
  angleDeg: number,
  metrics: AimMetrics = aimMetrics(),
): PrecisionArc => {
  const theta = (clampAngle(angleDeg) * Math.PI) / 180
  const depth = aimDepth(target.y, metrics)
  const dx = target.x - launch.x
  const distance = Math.hypot(dx, depth) || 1
  const tx = (dx / distance) * Math.cos(theta)
  const ty = -((depth / distance) * Math.cos(theta) + Math.sin(theta))
  const tangent = Math.hypot(tx, ty) || 1
  const chord = Math.hypot(target.x - launch.x, target.y - launch.y)
  const reach = chord * 0.55
  return {
    start: launch,
    control: {
      x: launch.x + (tx / tangent) * reach,
      y: launch.y + (ty / tangent) * reach,
    },
    end: target,
  }
}

export const bezierPoint = (arc: PrecisionArc, t: number): StagePoint => {
  const u = 1 - t
  return {
    x: u * u * arc.start.x + 2 * u * t * arc.control.x + t * t * arc.end.x,
    y: u * u * arc.start.y + 2 * u * t * arc.control.y + t * t * arc.end.y,
  }
}

/** Where the strip stops so the arrow sits short of the reticle center. */
export const arrowTip = (arc: PrecisionArc, gap: number = PRECISION_ARROW_GAP_PX): StagePoint => {
  const tx = arc.end.x - arc.control.x
  const ty = arc.end.y - arc.control.y
  const length = Math.hypot(tx, ty) || 1
  return {
    x: arc.end.x - (tx / length) * gap,
    y: arc.end.y - (ty / length) * gap,
  }
}

export const dragQualified = (dx: number, dy: number): boolean => Math.hypot(dx, dy) >= PRECISION_DRAG_MIN_PX

/** Upward drag raises the loft. The result stays inside 0° to 90°. */
export const angleFromDrag = (startAngle: number, dy: number): number =>
  clampAngle(startAngle - dy / PRECISION_ANGLE_DRAG_PX)

/**
 * Upward travel is forward spin. Downward travel is back spin.
 * A short stroke keeps the preset.
 */
export const spinFromSwipe = (points: readonly StrokePoint[]): number | null => {
  if (points.length < 2) return null
  const start = points[0]
  const end = points[points.length - 1]
  const travel = start.y - end.y
  if (Math.abs(travel) < PRECISION_SPIN_MIN_DISTANCE_PX) return null
  const windowStart = end.t - GESTURE_RELEASE_WINDOW_MS
  let origin = start
  for (const point of points) {
    if (point.t >= windowStart) {
      origin = point
      break
    }
  }
  if (origin === end) origin = points[points.length - 2]
  const dt = (end.t - origin.t) / 1000
  const speed = dt > 0 ? Math.abs(origin.y - end.y) / dt : 0
  const magnitude = PRECISION_SPIN_MAX * Math.min(1, speed / PRECISION_SPIN_FULL_PX_PER_S)
  return travel > 0 ? magnitude : -magnitude
}

/** Live spin while the finger is still down. Uses the whole stroke so far. */
export const spinFromTravel = (dy: number, dtMs: number): number | null => {
  if (Math.abs(dy) < PRECISION_SPIN_MIN_DISTANCE_PX) return null
  const speed = dtMs > 0 ? (Math.abs(dy) / dtMs) * 1000 : 0
  const magnitude = PRECISION_SPIN_MAX * Math.min(1, speed / PRECISION_SPIN_FULL_PX_PER_S)
  return dy < 0 ? magnitude : -magnitude
}
