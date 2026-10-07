import { DIE_GRAVITY_PX_PER_S2 } from './diceConstants'
import { dieSize, stageMetrics, type Die, type StageMetrics } from './dicePhysics'
import { placeBets, type ChipBet } from './chipBets'
import {
  CHIP_DIE_RESTITUTION,
  CHIP_FRICTION_PER_S,
  CHIP_HEIGHT_PX,
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

export const chipDiameter = (): number => CHIP_WIDTH_PX * CHIP_SIZE_SCALAR
export const chipRadius = (): number => chipDiameter() / 2
export const chipThickness = (): number => Math.max(1, Math.round(CHIP_THICKNESS_PX * CHIP_SIZE_SCALAR))

export interface StandingStack {
  id: string
  x: number
  z: number
  colors: ChipColor[]
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
  lift: number
  face: boolean
  zIndex: number
}

export const emptyChipWorld = (): ChipWorld => ({ stacks: [], loose: [], restack: null })

let looseSerial = 0

const nextLooseId = (stackId: string, index: number): string => {
  looseSerial += 1
  return `${stackId}-loose-${index}-${looseSerial}`
}

export const worldFromBets = (bets: readonly ChipBet[], seed: number): ChipWorld => ({
  stacks: placeBets(bets, seed, chipDiameter() + 6).map((column) => ({
    id: column.id,
    x: column.x,
    z: column.z,
    colors: column.colors,
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
    }
  })
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
    if (!die.alive || die.leaving || die.resting) continue
    for (const stack of world.stacks) {
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
      born.push(...shearStack(stack, keep, dirX, dirZ, travel * 0.45))
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

const resolveLooseStacks = (world: ChipWorld) => {
  const radius = chipRadius()
  const born: LooseChip[] = []
  for (const chip of world.loose) {
    const speed = Math.hypot(chip.vx, chip.vz)
    if (chip.h > chipThickness()) continue
    for (const stack of world.stacks) {
      const dx = chip.x - stack.x
      const dz = chip.z - stack.z
      const dist = Math.hypot(dx, dz)
      const minDist = radius * 2
      if (dist >= minDist || stack.colors.length === 0) continue
      const nx = dist > 1e-4 ? dx / dist : 1
      const nz = dist > 1e-4 ? dz / dist : 0
      const keep = Math.max(0, Math.min(stack.colors.length, Math.floor(Math.max(0, chip.h) / chipThickness())))
      if (keep >= stack.colors.length) continue
      born.push(...shearStack(stack, keep, chip.vx / speed, chip.vz / speed, speed * 0.7))
      chip.x += nx * (minDist - dist)
      chip.z += nz * (minDist - dist)
    }
  }
  world.loose.push(...born)
  world.stacks = world.stacks.filter((stack) => stack.colors.length > 0)
}

/** One felt step. Mutates `world`. Returns dice after stack and chip bumps. */
export const resolveDiceChips = (
  world: ChipWorld,
  dice: readonly [Die, Die],
  dt: number,
  metrics: StageMetrics = stageMetrics(),
): [Die, Die] => {
  if (world.restack) return [dice[0], dice[1]]
  const next: [Die, Die] = [copyDie(dice[0]), copyDie(dice[1])]
  resolveDieStacks(world, next, metrics)
  world.loose = world.loose.map((chip) => constrainLoose(integrateLoose(chip, dt), metrics, dt))
  resolveLoosePairs(world.loose)
  resolveLooseDice(world.loose, next, metrics)
  resolveLooseStacks(world)
  return next
}

/** Keeps loose chips sliding after the dice have settled. */
export const driftLooseChips = (
  world: ChipWorld,
  dt: number,
  metrics: StageMetrics = stageMetrics(),
): ChipWorld => {
  if (world.restack || world.loose.length === 0) return world
  const next: ChipWorld = {
    stacks: world.stacks.map((stack) => ({ ...stack, colors: stack.colors.slice() })),
    loose: world.loose.map((chip) => ({ ...chip })),
    restack: null,
  }
  next.loose = next.loose.map((chip) => constrainLoose(integrateLoose(chip, dt), metrics, dt))
  resolveLoosePairs(next.loose)
  resolveLooseStacks(next)
  return next
}

interface ChipSource {
  color: ChipColor
  x: number
  z: number
  h: number
  spin: number
}

const collectSources = (world: ChipWorld): ChipSource[] => {
  const thickness = chipThickness()
  const stacked = world.stacks.flatMap((stack) =>
    stack.colors.map((color, index) => ({
      color,
      x: stack.x,
      z: stack.z,
      h: index * thickness,
      spin: chipRotationDeg(index),
    })),
  )
  const loose = world.loose.map((chip) => ({
    color: chip.color,
    x: chip.x,
    z: chip.z,
    h: chip.h,
    spin: chip.spin,
  }))
  return [...stacked, ...loose]
}

const collectTargets = (stacks: readonly StandingStack[]): ChipSource[] => {
  const thickness = chipThickness()
  return stacks.flatMap((stack) =>
    stack.colors.map((color, index) => ({
      color,
      x: stack.x,
      z: stack.z,
      h: index * thickness,
      spin: chipRotationDeg(index),
    })),
  )
}

export const beginRestack = (world: ChipWorld, bets: readonly ChipBet[], nowMs: number, seed: number): ChipWorld => {
  const next = worldFromBets(bets, seed)
  const sources = collectSources(world)
  const targets = collectTargets(next.stacks)
  if (sources.length === 0) return next
  const count = Math.max(sources.length, targets.length)
  const fallback = targets[0] ?? sources[0]
  const chips: RestackChip[] = []
  for (let i = 0; i < count; i += 1) {
    const from = sources[i] ?? targets[i] ?? fallback
    const to = targets[i] ?? targets[targets.length - 1] ?? from
    chips.push({
      id: `restack-${i}`,
      color: to.color,
      fromX: from.x,
      fromZ: from.z,
      fromH: from.h,
      toX: to.x,
      toZ: to.z,
      toH: to.h,
      spin: from.spin,
    })
  }
  return {
    stacks: [],
    loose: [],
    restack: { startedMs: nowMs, chips, nextStacks: next.stacks },
  }
}

export const tickRestack = (world: ChipWorld, nowMs: number): ChipWorld => {
  if (!world.restack) return world
  if (nowMs - world.restack.startedMs < CHIP_RESTACK_MS) return world
  return { stacks: world.restack.nextStacks, loose: [], restack: null }
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
    plateDiscs(`${stack.id}-${index}`, color, stack.x, stack.z, chipRotationDeg(index), index * layers, index * layers, metrics),
  )
}

export const presentChips = (world: ChipWorld, nowMs: number, metrics: StageMetrics = stageMetrics()): ChipDisc[] => {
  if (world.restack) {
    const t = smooth(Math.min(1, Math.max(0, (nowMs - world.restack.startedMs) / CHIP_RESTACK_MS)))
    return world.restack.chips.flatMap((chip, index) =>
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
