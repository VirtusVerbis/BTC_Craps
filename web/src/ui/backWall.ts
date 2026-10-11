import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../config/constants'
import { DIE_WALL_BOTTOM_FRACTION } from './diceConstants'

/**
 * Averaged left and right felt edge from the back-wall reference, in stage pixels.
 * `z` is felt depth. The last sample is the start of the flat rail.
 */
const LEFT_TRACE: ReadonlyArray<readonly [number, number]> = [
  [0, 1010.6],
  [15, 1028.4],
  [30, 1050],
  [45, 1070.6],
  [60, 1087.5],
  [75, 1100.7],
  [90, 1111],
  [105, 1116.5],
  [120, 1122.2],
  [135, 1126],
  [150, 1130.7],
  [165, 1133.5],
  [180, 1136.2],
  [195, 1136.1],
  [210, 1139],
  [225, 1140.5],
  [240, 1142.8],
  [270, 1144.4],
]

/** Samples already this close to the flat rail are snapped onto it. */
const FLAT_SNAP_PX = 2

interface EdgePoint {
  x: number
  z: number
}

export interface BackRailContact {
  /** How far the circle crosses the rail. Positive means overlap. */
  penetration: number
  /** Positive when the center is on the rail side of the edge. */
  centerSigned: number
  /** Unit normal pointing from the felt into the rail. */
  nx: number
  nz: number
  /** True on the straight span, where the normal is exactly (0, 1). */
  flat: boolean
}

const wallDepth = (): number => REFERENCE_HEIGHT * (1 - DIE_WALL_BOTTOM_FRACTION)

/** Drop samples that fall below the chord so the rail only bends toward the shooter. */
const upperHull = (points: readonly EdgePoint[]): EdgePoint[] => {
  const hull: EdgePoint[] = []
  for (const point of points) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]
      const b = hull[hull.length - 1]
      const cross = (b.x - a.x) * (point.z - a.z) - (b.z - a.z) * (point.x - a.x)
      if (cross >= 0) hull.pop()
      else break
    }
    hull.push(point)
  }
  return hull
}

const buildEdge = (): { points: EdgePoint[]; flatStart: number; flatEnd: number } => {
  const wallZ = wallDepth()
  const half: EdgePoint[] = []
  let prev = 0
  for (const [x, z] of LEFT_TRACE) {
    let depth = Math.max(z, prev)
    prev = depth
    if (wallZ - depth <= FLAT_SNAP_PX) depth = wallZ
    half.push({ x, z: Math.min(depth, wallZ) })
  }
  half[half.length - 1] = { x: half[half.length - 1].x, z: wallZ }
  const flatStart = half[half.length - 1].x
  const flatEnd = REFERENCE_WIDTH - flatStart
  const mirrored: EdgePoint[] = half.map((point) => ({ x: REFERENCE_WIDTH - point.x, z: point.z }))
  mirrored.reverse()
  const points = upperHull([...half, { x: flatEnd, z: wallZ }, ...mirrored.filter((point) => point.x > flatEnd)])
  return { points, flatStart, flatEnd }
}

const EDGE = buildEdge()

/** Felt depth of the back edge at stage x. Both corners share one curve. */
export const backEdgeZ = (x: number): number => {
  const points = EDGE.points
  if (x <= points[0].x) return points[0].z
  const last = points[points.length - 1]
  if (x >= last.x) return last.z
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    if (x > b.x) continue
    const span = b.x - a.x
    const t = span > 0 ? (x - a.x) / span : 0
    return a.z + (b.z - a.z) * t
  }
  return last.z
}

/**
 * Circle against the back edge. The flat span reports a normal of (0, 1).
 * A positive `centerSigned` means the center has crossed into the rail.
 */
export const backRailContact = (x: number, z: number, radius: number): BackRailContact => {
  const points = EDGE.points
  const wallZ = wallDepth()
  let maxLine = -Infinity
  let bestDist = Infinity
  let bestNx = 0
  let bestNz = 1
  let bestQx = x
  let bestQz = z

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]
    const b = points[i + 1]
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len = Math.hypot(dx, dz)
    if (len < 1e-6) continue
    const tx = dx / len
    const tz = dz / len
    const nx = -tz
    const nz = tx
    const line = (x - a.x) * nx + (z - a.z) * nz
    if (line > maxLine) maxLine = line
    const raw = (x - a.x) * tx + (z - a.z) * tz
    const t = Math.min(len, Math.max(0, raw))
    const qx = a.x + tx * t
    const qz = a.z + tz * t
    const dist = Math.hypot(x - qx, z - qz)
    if (dist < bestDist - 1e-4) {
      bestDist = dist
      bestQx = qx
      bestQz = qz
      bestNx = nx
      bestNz = nz
    }
  }

  const onFlat =
    Math.abs(bestQz - wallZ) < 1e-3 && bestQx >= EDGE.flatStart - 1e-4 && bestQx <= EDGE.flatEnd + 1e-4
  if (onFlat) {
    bestNx = 0
    bestNz = 1
  } else {
    const vertex = points.find((point) => Math.hypot(point.x - bestQx, point.z - bestQz) < 1e-3)
    if (vertex && maxLine > 0) {
      const ox = x - vertex.x
      const oz = z - vertex.z
      const mag = Math.hypot(ox, oz)
      if (mag > 1e-6) {
        bestNx = ox / mag
        bestNz = oz / mag
      }
    }
  }

  const outside = maxLine > 1e-6
  const centerSigned = outside ? bestDist : -bestDist
  return {
    penetration: centerSigned + radius,
    centerSigned,
    nx: bestNx,
    nz: bestNz,
    flat: onFlat,
  }
}
