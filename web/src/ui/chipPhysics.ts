import { REFERENCE_HEIGHT } from '../config/constants'
import { DIE_GRAVITY_PX_PER_S2, PUCK_COLLISION_HEIGHT_PX, PUCK_IMAGE_WIDTH_PX } from './diceConstants'
import { puckPlacement } from './puckState'
import { dieSize, stageMetrics, type Die, type StageMetrics } from './dicePhysics'
import { SHOOTER_STACK_COLLISION_OFF } from './characterBetConstants'
import { placeBets, type ChipBet, type PlacedColumn } from './chipBets'
import {
  CHIP_COLUMN_GAP_PX,
  CHIP_DEPTH_SCALE,
  CHIP_DIE_RESTITUTION,
  CHIP_FRICTION_PER_S,
  CHIP_HEIGHT_PX,
  CHIP_NUDGE_PX,
  CHIP_RAIL_RESTITUTION,
  CHIP_RESTACK_MS,
  CHIP_SIZE_SCALAR,
  CHIP_THICKNESS_PX,
  CHIP_TOPPLE_SPEED_PX_PER_S,
  CHIP_WEIGHT,
  CHIP_WIDTH_PX,
  chipRotationDeg,
  type ChipColor,
} from './chipConstants'

export interface PuckObstacle {
  x: number
  z: number
  radius: number
}

/** Felt circle for the current OFF or ON puck. The spot itself never changes on a hit. */
export const puckObstacle = (point: number | null): PuckObstacle => {
  const puck = puckPlacement(point)
  return {
    x: puck.x,
    z: REFERENCE_HEIGHT - puck.y,
    radius: (PUCK_IMAGE_WIDTH_PX * puck.scale) / 2,
  }
}

export const chipDiameter = (): number => CHIP_WIDTH_PX * CHIP_SIZE_SCALAR
export const chipRadius = (): number => chipDiameter() / 2
export const chipThickness = (): number => Math.max(1, Math.round(CHIP_THICKNESS_PX * CHIP_SIZE_SCALAR))

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

/** Draw scale at felt depth `z`. 1 at the near rail, `CHIP_DEPTH_SCALE` at the back wall. */
export const chipDepthFactor = (z: number, metrics: StageMetrics = stageMetrics()): number => {
  const depth = clamp(metrics.wallZ > 0 ? z / metrics.wallZ : 0, 0, 1)
  return CHIP_DEPTH_SCALE + (1 - CHIP_DEPTH_SCALE) * (1 - depth)
}

/** Center step to the next column of the same bet. Shrinks with the chips toward the back wall. */
export const chipColumnStep = (z: number, metrics: StageMetrics = stageMetrics()): number =>
  (chipDiameter() + CHIP_COLUMN_GAP_PX) * chipDepthFactor(z, metrics)

export interface ChipOffset {
  x: number
  z: number
}

export interface StandingStack {
  id: string
  x: number
  z: number
  colors: ChipColor[]
  /** Felt shift of each plate. The bottom stays at zero until a bump leans the column. */
  offsets: ChipOffset[]
  pinned?: boolean
  guide?: { label: string; color: string }
}

export interface LooseChip {
  id: string
  color: ChipColor
  x: number
  z: number
  h: number
  vx: number
  vz: number
  vh: number
  spin: number
  /** Column spot at the moment this plate was sheared. */
  homeX?: number
  homeZ?: number
}

export interface RestackChip {
  id: string
  color: ChipColor
  fromX: number
  fromZ: number
  fromH: number
  toX: number
  toZ: number
  toH: number
  spin: number
}

export interface ChipWorld {
  stacks: StandingStack[]
  loose: LooseChip[]
  restack: {
    startedMs: number
    chips: RestackChip[]
    nextStacks: StandingStack[]
  } | null
}

export interface ChipDisc {
  key: string
  color: ChipColor
  x: number
  y: number
  spin: number
  /** Unscaled plate offset, in stage pixels. The renderer multiplies this by `scale`. */
  lift: number
  /** Draw size at this felt depth. 1 at the near rail. */
  scale: number
  face: boolean
  zIndex: number
}

export const emptyChipWorld = (): ChipWorld => ({ stacks: [], loose: [], restack: null })

let looseSerial = 0

const nextLooseId = (stackId: string, index: number): string => {
  looseSerial += 1
  return `${stackId}-loose-${index}-${looseSerial}`
}

export const zeroOffsets = (count: number): ChipOffset[] =>
  Array.from({ length: count }, () => ({ x: 0, z: 0 }))

const fitOffsets = (offsets: readonly ChipOffset[] | undefined, count: number): ChipOffset[] =>
  Array.from({ length: count }, (_, index) => ({
    x: offsets?.[index]?.x ?? 0,
    z: offsets?.[index]?.z ?? 0,
  }))

export const worldFromBets = (bets: readonly ChipBet[], seed: number): ChipWorld => ({
  stacks: placeBets(bets, seed, chipColumnStep).map((column) => ({
    id: column.id,
    x: column.x,
    z: column.z,
    colors: column.colors,
    offsets: zeroOffsets(column.colors.length),
    pinned: column.pinned,
    guide: column.guide,
  })),
  loose: [],
  restack: null,
})

const copyDie = (die: Die): Die => ({ ...die, q: { ...die.q }, w: { ...die.w } })

const stackHeight = (stack: StandingStack): number => stack.colors.length * chipThickness()

const separate = (die: Die, nx: number, nz: number, overlap: number) => {
  die.x += nx * overlap
  die.z += nz * overlap
}

const bounceDie = (die: Die, nx: number, nz: number) => {
  const approach = die.vx * nx + die.vz * nz
  if (approach >= 0) return
  const impulse = -(1 + CHIP_DIE_RESTITUTION) * approach
  die.vx += impulse * nx
  die.vz += impulse * nz
}

const chipMass = (): number => Math.max(CHIP_WEIGHT, 0.25)

/** How many chips above `keep` this hit can pull off. The rest of the column stays. */
export const chipsAHitCanLift = (speed: number, eligible: number): number => {
  if (eligible <= 0 || speed < CHIP_TOPPLE_SPEED_PX_PER_S * chipMass()) return 0
  return Math.min(eligible, Math.ceil(eligible / chipMass()))
}

const shearStack = (
  stack: StandingStack,
  keep: number,
  dirX: number,
  dirZ: number,
  speed: number,
): LooseChip[] => {
  const eligible = stack.colors.length - keep
  const flyingCount = chipsAHitCanLift(speed, eligible)
  if (flyingCount <= 0) return []
  const shearAt = stack.colors.length - flyingCount
  const flying = stack.colors.slice(shearAt)
  stack.colors = stack.colors.slice(0, shearAt)
  stack.offsets = fitOffsets(stack.offsets, shearAt)
  const thickness = chipThickness()
  const radius = chipRadius()
  const mass = chipMass()
  return flying.map((color, offset) => {
    const index = shearAt + offset
    const kick = 0.45 + 0.55 * ((offset + 1) / Math.max(flying.length, 1))
    const hop = radius * 0.2 * (offset + 1)
    return {
      id: nextLooseId(stack.id, index),
      color,
      x: stack.x + dirX * hop,
      z: stack.z + dirZ * hop,
      h: index * thickness,
      vx: (dirX * speed * kick) / mass,
      vz: (dirZ * speed * kick) / mass,
      vh: (70 * kick) / mass,
      spin: chipRotationDeg(index),
      homeX: stack.x,
      homeZ: stack.z,
    }
  })
}

/** Lean the column along the hit. The bottom plate stays put. Higher plates shift farther. */
const nudgeStack = (stack: StandingStack, dirX: number, dirZ: number) => {
  const count = stack.colors.length
  if (count <= 1) return
  stack.offsets = fitOffsets(stack.offsets, count)
  const step = CHIP_NUDGE_PX * 0.25
  for (let index = 1; index < count; index += 1) {
    const scale = index / (count - 1)
    const nextX = stack.offsets[index].x + dirX * step * scale
    const nextZ = stack.offsets[index].z + dirZ * step * scale
    const mag = Math.hypot(nextX, nextZ)
    const limit = CHIP_NUDGE_PX * scale
    if (mag > limit && mag > 0) {
      stack.offsets[index] = { x: (nextX / mag) * limit, z: (nextZ / mag) * limit }
    } else {
      stack.offsets[index] = { x: nextX, z: nextZ }
    }
  }
}

const isShooterStack = (stack: StandingStack): boolean => stack.id.startsWith('shooter-')

/** A die remembers the crossing, so the trip back to the rail still hits the stacks. */
const markFeltMid = (die: Die, metrics: StageMetrics) => {
  if (metrics.wallZ > 0 && die.z >= metrics.wallZ / 2) die.pastFeltMid = true
}

/**
 * Other stacks always collide. Shooter stacks stay clear at launch.
 * `SHOOTER_STACK_COLLISION_OFF` keeps them clear after mid-felt too.
 */
const stackBlocksDie = (stack: StandingStack, die: Die): boolean => {
  if (!isShooterStack(stack)) return true
  if (SHOOTER_STACK_COLLISION_OFF) return false
  return die.pastFeltMid === true
}

const hitStack = (
  die: Die,
  stack: StandingStack,
  metrics: StageMetrics,
): { nx: number; nz: number; dist: number; minDist: number } | null => {
  if (stack.colors.length === 0 || !die.alive || die.leaving) return null
  const dx = die.x - stack.x
  const dz = die.z - stack.z
  const dist = Math.hypot(dx, dz)
  const minDist = dieSize(die.z, metrics) / 2 + chipRadius()
  if (dist >= minDist) return null
  const height = stackHeight(stack)
  const dieTop = die.h + dieSize(die.z, metrics)
  if (die.h >= height || dieTop <= 0) return null
  let nx = dist > 1e-4 ? dx / dist : 0
  let nz = dist > 1e-4 ? dz / dist : 0
  if (dist <= 1e-4) {
    const speed = Math.hypot(die.vx, die.vz)
    nx = speed > 1 ? die.vx / speed : 1
    nz = speed > 1 ? die.vz / speed : 0
  }
  return { nx, nz, dist, minDist }
}

const resolveDieStacks = (world: ChipWorld, dice: [Die, Die], metrics: StageMetrics) => {
  const born: LooseChip[] = []
  for (const die of dice) {
    markFeltMid(die, metrics)
    if (!die.alive || die.leaving || die.resting) continue
    for (const stack of world.stacks) {
      if (!stackBlocksDie(stack, die)) continue
      const hit = hitStack(die, stack, metrics)
      if (!hit) continue
      const approach = die.vx * hit.nx + die.vz * hit.nz
      const deep = hit.dist < hit.minDist * 0.25
      separate(die, hit.nx, hit.nz, hit.minDist - hit.dist)
      if (approach >= -20 && !deep) continue
      const travel = Math.hypot(die.vx, die.vz)
      const dirX = travel > 1 ? die.vx / travel : hit.nx
      const dirZ = travel > 1 ? die.vz / travel : hit.nz
      const keep = Math.max(0, Math.min(stack.colors.length, Math.floor(Math.max(0, die.h) / chipThickness())))
      const lifted = shearStack(stack, keep, dirX, dirZ, travel * 0.45)
      if (lifted.length === 0) nudgeStack(stack, dirX, dirZ)
      else born.push(...lifted)
      bounceDie(die, hit.nx, hit.nz)
    }
  }
  world.loose.push(...born)
  world.stacks = world.stacks.filter((stack) => stack.colors.length > 0)
}

const integrateLoose = (chip: LooseChip, dt: number): LooseChip => {
  const next = { ...chip }
  next.vh -= DIE_GRAVITY_PX_PER_S2 * dt
  next.x += next.vx * dt
  next.z += next.vz * dt
  next.h += next.vh * dt
  next.spin += Math.hypot(next.vx, next.vz) * dt * 6
  return next
}

const constrainLoose = (chip: LooseChip, metrics: StageMetrics, dt: number): LooseChip => {
  const next = { ...chip }
  const radius = chipRadius()
  const bounce = CHIP_RAIL_RESTITUTION
  if (next.x < radius) {
    next.x = radius
    if (next.vx < 0) next.vx = Math.abs(next.vx) * bounce
  } else if (next.x > metrics.width - radius) {
    next.x = metrics.width - radius
    if (next.vx > 0) next.vx = -Math.abs(next.vx) * bounce
  }
  if (next.z < radius) {
    next.z = radius
    if (next.vz < 0) next.vz = Math.abs(next.vz) * bounce
  }
  const wall = metrics.wallZ - radius
  if (next.z > wall) {
    next.z = wall
    if (next.vz > 0) next.vz = -Math.abs(next.vz) * bounce
  }
  if (next.h <= 0) {
    next.h = 0
    if (next.vh < -30) next.vh = -next.vh * 0.25
    else next.vh = 0
    const keep = Math.exp(-CHIP_FRICTION_PER_S * chipMass() * dt)
    next.vx *= keep
    next.vz *= keep
    if (Math.hypot(next.vx, next.vz) < 16) {
      next.vx = 0
      next.vz = 0
    }
  }
  return next
}

const resolveLoosePairs = (chips: LooseChip[]) => {
  const radius = chipRadius()
  const minDist = radius * 2
  for (let i = 0; i < chips.length; i += 1) {
    for (let j = i + 1; j < chips.length; j += 1) {
      const a = chips[i]
      const b = chips[j]
      let dx = b.x - a.x
      let dz = b.z - a.z
      let dist = Math.hypot(dx, dz)
      if (dist >= minDist) continue
      if (dist < 1e-4) {
        dx = minDist
        dz = 0
        dist = minDist
      }
      const nx = dx / dist
      const nz = dz / dist
      const overlap = minDist - dist
      a.x -= nx * overlap * 0.5
      a.z -= nz * overlap * 0.5
      b.x += nx * overlap * 0.5
      b.z += nz * overlap * 0.5
      const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz
      if (rel >= 0) continue
      const impulse = (-(1 + 0.35) * rel) / 2
      a.vx -= impulse * nx
      a.vz -= impulse * nz
      b.vx += impulse * nx
      b.vz += impulse * nz
    }
  }
}

const resolveLooseDice = (chips: LooseChip[], dice: [Die, Die], metrics: StageMetrics) => {
  const radius = chipRadius()
  const thickness = chipThickness()
  for (const chip of chips) {
    for (const die of dice) {
      if (!die.alive || die.leaving) continue
      const dx = chip.x - die.x
      const dz = chip.z - die.z
      const dist = Math.hypot(dx, dz)
      const minDist = radius + dieSize(die.z, metrics) / 2
      if (dist >= minDist) continue
      const chipTop = chip.h + thickness
      const dieTop = die.h + dieSize(die.z, metrics)
      if (chip.h >= dieTop || chipTop <= die.h) continue
      const nx = dist > 1e-4 ? dx / dist : 1
      const nz = dist > 1e-4 ? dz / dist : 0
      const overlap = minDist - dist
      chip.x += nx * overlap
      chip.z += nz * overlap
      const approach = (chip.vx - die.vx) * nx + (chip.vz - die.vz) * nz
      if (approach >= 0) continue
      if (die.resting) {
        chip.vx += -(1 + CHIP_DIE_RESTITUTION) * approach * nx
        chip.vz += -(1 + CHIP_DIE_RESTITUTION) * approach * nz
      } else {
        const impulse = (-(1 + CHIP_DIE_RESTITUTION) * approach) / 2
        chip.vx += impulse * nx
        chip.vz += impulse * nz
        die.vx -= impulse * nx
        die.vz -= impulse * nz
      }
    }
  }
}

const resolveLooseStacks = (world: ChipWorld, shooterLive: boolean) => {
  const radius = chipRadius()
  const born: LooseChip[] = []
  for (const chip of world.loose) {
    const speed = Math.hypot(chip.vx, chip.vz)
    if (chip.h > chipThickness()) continue
    for (const stack of world.stacks) {
      if (isShooterStack(stack) && !shooterLive) continue
      const dx = chip.x - stack.x
      const dz = chip.z - stack.z
      const dist = Math.hypot(dx, dz)
      const minDist = radius * 2
      if (dist >= minDist || stack.colors.length === 0) continue
      const nx = dist > 1e-4 ? dx / dist : 1
      const nz = dist > 1e-4 ? dz / dist : 0
      const keep = Math.max(0, Math.min(stack.colors.length, Math.floor(Math.max(0, chip.h) / chipThickness())))
      if (keep >= stack.colors.length) continue
      const dirX = speed > 1 ? chip.vx / speed : nx
      const dirZ = speed > 1 ? chip.vz / speed : nz
      const lifted = shearStack(stack, keep, dirX, dirZ, speed * 0.7)
      if (lifted.length === 0) {
        if (speed >= CHIP_TOPPLE_SPEED_PX_PER_S) nudgeStack(stack, dirX, dirZ)
      } else born.push(...lifted)
      chip.x += nx * (minDist - dist)
      chip.z += nz * (minDist - dist)
    }
  }
  world.loose.push(...born)
  world.stacks = world.stacks.filter((stack) => stack.colors.length > 0)
}

const bounceOffPuck = (
  x: number,
  z: number,
  vx: number,
  vz: number,
  h: number,
  bodyRadius: number,
  puck: PuckObstacle,
): { x: number; z: number; vx: number; vz: number } | null => {
  if (h >= PUCK_COLLISION_HEIGHT_PX) return null
  let dx = x - puck.x
  let dz = z - puck.z
  let dist = Math.hypot(dx, dz)
  const minDist = bodyRadius + puck.radius
  if (dist >= minDist) return null
  let nx: number
  let nz: number
  if (dist < 1e-4) {
    const speed = Math.hypot(vx, vz)
    nx = speed > 1 ? vx / speed : 1
    nz = speed > 1 ? vz / speed : 0
    dist = 0
  } else {
    nx = dx / dist
    nz = dz / dist
  }
  let nextVx = vx
  let nextVz = vz
  const approach = vx * nx + vz * nz
  if (approach < 0) {
    const impulse = -(1 + CHIP_DIE_RESTITUTION) * approach
    nextVx += impulse * nx
    nextVz += impulse * nz
  }
  const overlap = minDist - dist
  return { x: x + nx * overlap, z: z + nz * overlap, vx: nextVx, vz: nextVz }
}

const resolvePuckDice = (dice: [Die, Die], puck: PuckObstacle | null | undefined, metrics: StageMetrics) => {
  if (!puck) return
  for (const die of dice) {
    if (!die.alive || die.leaving || die.resting) continue
    const hit = bounceOffPuck(die.x, die.z, die.vx, die.vz, die.h, dieSize(die.z, metrics) / 2, puck)
    if (!hit) continue
    die.x = hit.x
    die.z = hit.z
    die.vx = hit.vx
    die.vz = hit.vz
  }
}

const resolvePuckChips = (chips: LooseChip[], puck: PuckObstacle | null | undefined) => {
  if (!puck) return
  for (const chip of chips) {
    const hit = bounceOffPuck(chip.x, chip.z, chip.vx, chip.vz, chip.h, chipRadius(), puck)
    if (!hit) continue
    chip.x = hit.x
    chip.z = hit.z
    chip.vx = hit.vx
    chip.vz = hit.vz
  }
}

/** One felt step. Mutates `world`. Returns dice after stack and chip bumps. */
export const resolveDiceChips = (
  world: ChipWorld,
  dice: readonly [Die, Die],
  dt: number,
  metrics: StageMetrics = stageMetrics(),
  puck?: PuckObstacle | null,
): [Die, Die] => {
  if (world.restack) return [dice[0], dice[1]]
  const next: [Die, Die] = [copyDie(dice[0]), copyDie(dice[1])]
  resolveDieStacks(world, next, metrics)
  resolvePuckDice(next, puck, metrics)
  world.loose = world.loose.map((chip) => constrainLoose(integrateLoose(chip, dt), metrics, dt))
  resolveLoosePairs(world.loose)
  resolveLooseDice(world.loose, next, metrics)
  const stillLaunching = next.some((die) => die.alive && !die.leaving && !die.resting && die.pastFeltMid !== true)
  resolveLooseStacks(world, !SHOOTER_STACK_COLLISION_OFF && !stillLaunching)
  resolvePuckChips(world.loose, puck)
  return next
}

/** Keeps loose chips sliding after the dice have settled. */
export const driftLooseChips = (
  world: ChipWorld,
  dt: number,
  metrics: StageMetrics = stageMetrics(),
  puck?: PuckObstacle | null,
): ChipWorld => {
  if (world.restack || world.loose.length === 0) return world
  const next: ChipWorld = {
    stacks: world.stacks.map((stack) => ({
      ...stack,
      colors: stack.colors.slice(),
      offsets: fitOffsets(stack.offsets, stack.colors.length),
    })),
    loose: world.loose.map((chip) => ({ ...chip })),
    restack: null,
  }
  next.loose = next.loose.map((chip) => constrainLoose(integrateLoose(chip, dt), metrics, dt))
  resolveLoosePairs(next.loose)
  resolveLooseStacks(next, !SHOOTER_STACK_COLLISION_OFF)
  resolvePuckChips(next.loose, puck)
  return next
}

interface ChipPlate {
  color: ChipColor
  x: number
  z: number
  h: number
  spin: number
  stackId: string | null
}

interface RestackSlot {
  color: ChipColor
  x: number
  z: number
  h: number
  spin: number
  from: ChipPlate | null
}

const LOOSE_ID_MARKER = '-loose-'

/** Stack id encoded by `shearStack`. Untagged chips return null. */
const stackIdFromLoose = (id: string): string | null => {
  const at = id.indexOf(LOOSE_ID_MARKER)
  if (at <= 0) return null
  return id.slice(0, at)
}

const nearestStackId = (x: number, z: number, stacks: readonly StandingStack[]): string | null => {
  let bestId: string | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const stack of stacks) {
    const dist = Math.hypot(x - stack.x, z - stack.z)
    if (dist < bestDist) {
      bestDist = dist
      bestId = stack.id
    }
  }
  return bestId
}

const columnPose = (
  column: PlacedColumn,
  existing: StandingStack | undefined,
  loose: readonly LooseChip[],
  useHome: boolean,
): { x: number; z: number } => {
  if (column.pinned) return { x: column.x, z: column.z }
  if (existing) return { x: existing.x, z: existing.z }
  if (useHome) {
    const home = loose.find((chip) => stackIdFromLoose(chip.id) === column.id && chip.homeX != null && chip.homeZ != null)
    if (home?.homeX != null && home.homeZ != null) return { x: home.homeX, z: home.homeZ }
  }
  return { x: column.x, z: column.z }
}

/** Pinned columns snap to the anchor. Others keep their spot and, unless rebuilt, their lean. */
const settleStack = (
  column: PlacedColumn,
  existing: StandingStack | undefined,
  loose: readonly LooseChip[],
  rebuild: boolean,
): StandingStack => {
  const pose = columnPose(column, existing, loose, rebuild)
  return {
    id: column.id,
    x: pose.x,
    z: pose.z,
    colors: column.colors.slice(),
    offsets: rebuild || !existing ? zeroOffsets(column.colors.length) : fitOffsets(existing.offsets, column.colors.length),
    pinned: column.pinned,
    guide: column.guide,
  }
}

const impactedStackIds = (world: ChipWorld): Set<string> => {
  const impacted = new Set<string>()
  for (const chip of world.loose) {
    const parsed = stackIdFromLoose(chip.id)
    if (parsed) {
      impacted.add(parsed)
      continue
    }
    const nearest = nearestStackId(chip.x, chip.z, world.stacks)
    if (nearest) impacted.add(nearest)
  }
  return impacted
}

const looseOwner = (chip: LooseChip, stacks: readonly StandingStack[]): string | null => {
  const parsed = stackIdFromLoose(chip.id)
  if (parsed) return parsed
  return nearestStackId(chip.x, chip.z, stacks)
}

/**
 * Restack only columns that lost a chip. Untouched columns keep their lean and swap colors in place.
 * With no loose chips, every column takes the in-place path.
 */
export const settleColumns = (
  world: ChipWorld,
  bets: readonly ChipBet[],
  nowMs: number,
  seed: number,
): ChipWorld => {
  if (world.loose.length > 0) return beginRestack(world, bets, nowMs, seed)
  const placed = placeBets(bets, seed, chipColumnStep)
  const byId = new Map(world.stacks.map((stack) => [stack.id, stack]))
  return {
    loose: [],
    restack: null,
    stacks: placed.map((column) => settleStack(column, byId.get(column.id), world.loose, false)),
  }
}

export const beginRestack = (world: ChipWorld, bets: readonly ChipBet[], nowMs: number, seed: number): ChipWorld => {
  const placed = placeBets(bets, seed, chipColumnStep)
  const byId = new Map(world.stacks.map((stack) => [stack.id, stack]))
  const impacted = impactedStackIds(world)
  const survivors: StandingStack[] = []
  const nextStacks: StandingStack[] = []
  for (const column of placed) {
    const existing = byId.get(column.id)
    if (impacted.has(column.id)) nextStacks.push(settleStack(column, existing, world.loose, true))
    else survivors.push(settleStack(column, existing, world.loose, false))
  }

  const thickness = chipThickness()
  const sources: ChipPlate[] = []
  for (const stack of world.stacks) {
    if (!impacted.has(stack.id)) continue
    stack.colors.forEach((color, index) => {
      sources.push({
        color,
        x: stack.x + (stack.offsets[index]?.x ?? 0),
        z: stack.z + (stack.offsets[index]?.z ?? 0),
        h: index * thickness,
        spin: chipRotationDeg(index),
        stackId: stack.id,
      })
    })
  }
  for (const chip of world.loose) {
    sources.push({
      color: chip.color,
      x: chip.x,
      z: chip.z,
      h: chip.h,
      spin: chip.spin,
      stackId: looseOwner(chip, world.stacks),
    })
  }

  if (sources.length === 0 || nextStacks.length === 0) {
    return { stacks: [...survivors, ...nextStacks], loose: [], restack: null }
  }

  const slots = new Map<string, RestackSlot[]>()
  for (const stack of nextStacks) {
    slots.set(
      stack.id,
      stack.colors.map((color, index) => ({
        color,
        x: stack.x,
        z: stack.z,
        h: index * thickness,
        spin: chipRotationDeg(index),
        from: null,
      })),
    )
  }

  const extras: ChipPlate[] = []
  for (const source of sources) {
    const columnSlots = source.stackId ? slots.get(source.stackId) : undefined
    const open = columnSlots?.find((slot) => slot.from == null)
    if (open) open.from = source
    else extras.push(source)
  }
  for (const stack of nextStacks) {
    for (const slot of slots.get(stack.id) ?? []) {
      if (slot.from) continue
      const source = extras.shift()
      if (!source) break
      slot.from = source
    }
  }

  const chips: RestackChip[] = []
  const ordered = nextStacks.flatMap((stack) => slots.get(stack.id) ?? [])
  for (const slot of ordered) {
    const from = slot.from ?? slot
    chips.push({
      id: `restack-${chips.length}`,
      color: slot.color,
      fromX: from.x,
      fromZ: from.z,
      fromH: from.h,
      toX: slot.x,
      toZ: slot.z,
      toH: slot.h,
      spin: from.spin,
    })
  }
  const last = ordered[ordered.length - 1]
  if (last) {
    for (const extra of extras) {
      chips.push({
        id: `restack-${chips.length}`,
        color: last.color,
        fromX: extra.x,
        fromZ: extra.z,
        fromH: extra.h,
        toX: last.x,
        toZ: last.z,
        toH: last.h,
        spin: extra.spin,
      })
    }
  }

  return {
    stacks: survivors,
    loose: [],
    restack: { startedMs: nowMs, chips, nextStacks },
  }
}

export const tickRestack = (world: ChipWorld, nowMs: number): ChipWorld => {
  if (!world.restack) return world
  if (nowMs - world.restack.startedMs < CHIP_RESTACK_MS) return world
  return { stacks: [...world.stacks, ...world.restack.nextStacks], loose: [], restack: null }
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

const smooth = (t: number): number => t * t * (3 - 2 * t)

const disc = (
  key: string,
  color: ChipColor,
  x: number,
  z: number,
  spin: number,
  lift: number,
  face: boolean,
  zIndex: number,
  metrics: StageMetrics,
): ChipDisc => ({
  key,
  color,
  x,
  y: metrics.height - z,
  spin,
  lift,
  scale: chipDepthFactor(z, metrics),
  face,
  zIndex,
})

/** One chip, wall slices plus the face, same height as a plate in a standing column. */
const plateDiscs = (
  id: string,
  color: ChipColor,
  x: number,
  z: number,
  spin: number,
  bottom: number,
  zIndex: number,
  metrics: StageMetrics,
): ChipDisc[] => {
  const layers = chipThickness()
  const discs: ChipDisc[] = []
  for (let layer = 0; layer < layers; layer += 1) {
    discs.push(disc(`${id}-${layer}`, color, x, z, spin, -(bottom + layer), layer === layers - 1, zIndex + layer, metrics))
  }
  return discs
}

const standingDiscs = (stack: StandingStack, metrics: StageMetrics): ChipDisc[] => {
  const layers = chipThickness()
  return stack.colors.flatMap((color, index) =>
    plateDiscs(
      `${stack.id}-${index}`,
      color,
      stack.x + (stack.offsets[index]?.x ?? 0),
      stack.z + (stack.offsets[index]?.z ?? 0),
      chipRotationDeg(index),
      index * layers,
      index * layers,
      metrics,
    ),
  )
}

export const presentChips = (world: ChipWorld, nowMs: number, metrics: StageMetrics = stageMetrics()): ChipDisc[] => {
  if (world.restack) {
    const t = smooth(Math.min(1, Math.max(0, (nowMs - world.restack.startedMs) / CHIP_RESTACK_MS)))
    const standing = world.stacks.flatMap((stack) => standingDiscs(stack, metrics))
    const flying = world.restack.chips.flatMap((chip, index) =>
      plateDiscs(
        chip.id,
        chip.color,
        lerp(chip.fromX, chip.toX, t),
        lerp(chip.fromZ, chip.toZ, t),
        chip.spin,
        lerp(chip.fromH, chip.toH, t),
        500 + index * chipThickness(),
        metrics,
      ),
    )
    return [...standing, ...flying]
  }
  const standing = world.stacks.flatMap((stack) => standingDiscs(stack, metrics))
  const loose = world.loose.flatMap((chip, index) =>
    plateDiscs(chip.id, chip.color, chip.x, chip.z, chip.spin, chip.h, 800 + index * chipThickness(), metrics),
  )
  return [...standing, ...loose]
}

/** Chip circle size shared by the renderer. */
export const chipDrawSize = (): { width: number; height: number } => ({
  width: CHIP_WIDTH_PX * CHIP_SIZE_SCALAR,
  height: CHIP_HEIGHT_PX * CHIP_SIZE_SCALAR,
})

export interface StackGuideView {
  label: string
  color: string
  left: number
  top: number
  width: number
  height: number
}

/** One box around every column that shares a strategy label, after the current lean. */
export const guideFrames = (world: ChipWorld, metrics: StageMetrics = stageMetrics()): StackGuideView[] => {
  const stacks = [...world.stacks, ...(world.restack?.nextStacks ?? [])]
  const groups = new Map<string, StandingStack[]>()
  for (const stack of stacks) {
    if (!stack.guide) continue
    const list = groups.get(stack.guide.label) ?? []
    list.push(stack)
    groups.set(stack.guide.label, list)
  }
  const frames: StackGuideView[] = []
  for (const [label, columns] of groups) {
    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minTop = Number.POSITIVE_INFINITY
    let maxBottom = Number.NEGATIVE_INFINITY
    for (const stack of columns) {
      const scale = chipDepthFactor(stack.z, metrics)
      const diameter = chipDiameter() * scale
      const thick = chipThickness() * scale
      const plates = Math.max(1, stack.colors.length)
      for (let index = 0; index < plates; index += 1) {
        const x = stack.x + (stack.offsets[index]?.x ?? 0)
        const y = metrics.height - (stack.z + (stack.offsets[index]?.z ?? 0))
        const top = y - index * thick - diameter / 2
        minX = Math.min(minX, x - diameter / 2)
        maxX = Math.max(maxX, x + diameter / 2)
        minTop = Math.min(minTop, top)
        maxBottom = Math.max(maxBottom, y + diameter / 2)
      }
    }
    frames.push({
      label,
      color: columns[0]?.guide?.color ?? '#ffffff',
      left: minX,
      top: minTop,
      width: Math.max(0, maxX - minX),
      height: Math.max(0, maxBottom - minTop),
    })
  }
  return frames
}
