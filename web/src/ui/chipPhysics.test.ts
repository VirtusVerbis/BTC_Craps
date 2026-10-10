import { describe, expect, it } from 'vitest'
import { REFERENCE_HEIGHT } from '../config/constants'
import { createHoldingDice, stageMetrics, type Die } from './dicePhysics'
import {
  chipColumnStep,
  chipDepthFactor,
  chipDiameter,
  chipRadius,
  chipThickness,
  chipsAHitCanLift,
  driftLooseChips,
  emptyChipWorld,
  guideFrames,
  presentChips,
  puckObstacle,
  resolveDiceChips,
  settleColumns,
  tickRestack,
  worldFromBets,
  zeroOffsets,
  type ChipWorld,
  type StandingStack,
} from './chipPhysics'
import { CHIP_COLUMN_GAP_PX, CHIP_DEPTH_SCALE, CHIP_RESTACK_MS, CHIP_WEIGHT } from './chipConstants'
import { buildBets, placeBets } from './chipBets'
import { PUCK_COLLISION_HEIGHT_PX, PUCK_OFF_X, PUCK_OFF_Y } from './diceConstants'
import { puckPlacement } from './puckState'

const metrics = stageMetrics()

const flyingDie = (patch: Partial<Die>): Die => {
  const [base] = createHoldingDice(540)
  return {
    ...base,
    resting: false,
    topFace: null,
    alive: true,
    ...patch,
    q: patch.q ?? base.q,
    w: patch.w ?? { x: 0, y: 0, z: 0 },
  }
}

const stackOf = (count: number, x: number, z: number): StandingStack => ({
  id: `stack-${x}`,
  x,
  z,
  colors: Array.from({ length: count }, () => 'red' as const),
  offsets: zeroOffsets(count),
})

const worldWith = (stacks: StandingStack[]): ChipWorld => ({ stacks, loose: [], restack: null })

describe('chip topples', () => {
  it('peels fewer chips as weight goes up', () => {
    expect(CHIP_WEIGHT).toBeGreaterThan(1)
    expect(chipsAHitCanLift(2000, 20)).toBe(Math.ceil(20 / CHIP_WEIGHT))
    expect(chipsAHitCanLift(10, 20)).toBe(0)
  })

  it('draws a loose chip with the same wall height as a stacked chip', () => {
    const world = emptyChipWorld()
    world.loose.push({ id: 'one', color: 'red', x: 120, z: 400, h: 18, vx: 0, vz: 0, vh: 0, spin: 12 })
    const discs = presentChips(world, 0, metrics)
    expect(discs).toHaveLength(chipThickness())
    expect(discs.filter((disc) => disc.face)).toHaveLength(1)
    expect(discs.filter((disc) => !disc.face)).toHaveLength(chipThickness() - 1)
  })

  it('leaves the chips below a high clip standing', () => {
    const thickness = chipThickness()
    const stack = stackOf(10, 400, 800)
    const world = worldWith([stack])
    const travel = 800
    const die = flyingDie({ x: 400, z: 800, h: thickness * 7, vx: 0, vz: -travel, vh: 0 })
    resolveDiceChips(world, [die, flyingDie({ alive: false, x: 10, z: 10 })], 1 / 60, metrics)
    const lifted = chipsAHitCanLift(travel * 0.45, 3)
    expect(lifted).toBeGreaterThan(0)
    expect(lifted).toBeLessThan(3)
    expect(world.loose).toHaveLength(lifted)
    expect(world.stacks[0]?.colors.length).toBeGreaterThanOrEqual(7)
    expect(world.loose.every((chip) => chip.homeX === stack.x && chip.homeZ === stack.z)).toBe(true)
  })

  it('lets a launching die pass through a shooter stack before mid-felt', () => {
    const stack = { ...stackOf(1, 200, 40), id: 'shooter-pass-0' }
    const world = worldWith([stack])
    const die = flyingDie({ x: 200, z: 40, h: 0, vx: 0, vz: 400, vh: 0 })
    const [next] = resolveDiceChips(world, [die, flyingDie({ alive: false, x: 10, z: 10 })], 1 / 60, metrics)
    expect(next.pastFeltMid).toBeUndefined()
    expect(next.x).toBe(200)
    expect(next.z).toBe(40)
    expect(next.vz).toBe(400)
    expect(world.loose).toHaveLength(0)
    expect(world.stacks[0]?.colors).toHaveLength(1)
  })

  it('hits a shooter stack once the die has crossed mid-felt', () => {
    const mid = metrics.wallZ / 2
    const stack = { ...stackOf(1, 200, mid), id: 'shooter-dont-0' }
    const world = worldWith([stack])
    const die = flyingDie({ x: 200, z: mid, h: 0, vx: 0, vz: 400, vh: 0 })
    const [next] = resolveDiceChips(world, [die, flyingDie({ alive: false, x: 10, z: 10 })], 1 / 60, metrics)
    expect(next.pastFeltMid).toBe(true)
    expect(next.z === mid && next.vz === 400).toBe(false)
  })

  it('keeps shooter collision on after the die returns to the rail', () => {
    const stack = { ...stackOf(1, 200, 40), id: 'shooter-pass-0' }
    const world = worldWith([stack])
    const die = flyingDie({ x: 200, z: 40, h: 0, vx: 0, vz: -400, vh: 0, pastFeltMid: true })
    const [next] = resolveDiceChips(world, [die, flyingDie({ alive: false, x: 10, z: 10 })], 1 / 60, metrics)
    expect(next.pastFeltMid).toBe(true)
    expect(next.z === 40 && next.vz === -400).toBe(false)
  })

  it('lets a light hit bounce without peeling the stack', () => {
    const stack = stackOf(10, 400, 800)
    const world = worldWith([stack])
    const die = flyingDie({ x: 400, z: 800, h: 0, vx: 0, vz: -80, vh: 0 })
    resolveDiceChips(world, [die, flyingDie({ alive: false, x: 10, z: 10 })], 1 / 60, metrics)
    expect(world.loose).toHaveLength(0)
    expect(world.stacks[0]?.colors).toHaveLength(10)
    const offsets = world.stacks[0]?.offsets ?? []
    const lean = (offset: { x: number; z: number } | undefined) => Math.hypot(offset?.x ?? 0, offset?.z ?? 0)
    expect(lean(offsets[offsets.length - 1])).toBeGreaterThan(lean(offsets[0]))
    expect(lean(offsets[0])).toBe(0)
  })

  it('restacks only after a chip has fallen', () => {
    const bets = buildBets(10_000_000_000, 50, 50)
    const world = worldFromBets(bets, 1)
    const leaned = world.stacks[0]
    leaned.offsets[leaned.offsets.length - 1] = { x: 4, z: 1 }
    const stayed = settleColumns(world, bets, 0, 99)
    const kept = stayed.stacks.find((stack) => stack.id === leaned.id)
    expect(stayed.restack).toBeNull()
    expect(kept?.x).toBe(leaned.x)
    expect(kept?.offsets[kept.offsets.length - 1]).toEqual({ x: 4, z: 1 })

    world.loose.push({
      id: 'fell',
      color: 'white',
      x: leaned.x,
      z: leaned.z,
      h: 0,
      vx: 0,
      vz: 0,
      vh: 0,
      spin: 0,
    })
    const rebuilt = settleColumns(world, bets, 0, 99)
    expect(rebuilt.restack).not.toBeNull()
    const crooked = rebuilt.restack?.nextStacks.some((stack) => stack.offsets.some((offset) => offset.x !== 0 || offset.z !== 0))
    expect(crooked).toBe(false)
  })

  it('rebuilds only the column a loose chip came from', () => {
    const bets = buildBets(10_000_000_000, 50, 50)
    const world = worldFromBets(bets, 1)
    const fallen = world.stacks[0]
    const leaned = world.stacks[1]
    expect(fallen && leaned && fallen.id !== leaned.id).toBeTruthy()
    leaned.offsets[leaned.offsets.length - 1] = { x: 4, z: 1 }
    world.stacks = world.stacks.filter((stack) => stack.id !== fallen.id)
    world.loose.push({
      id: `${fallen.id}-loose-0-1`,
      color: fallen.colors[0] ?? 'white',
      x: fallen.x + 40,
      z: fallen.z + 10,
      h: 0,
      vx: 0,
      vz: 0,
      vh: 0,
      spin: 0,
      homeX: fallen.x,
      homeZ: fallen.z,
    })
    const rebuilt = settleColumns(world, bets, 0, 99)
    expect(rebuilt.restack?.nextStacks.map((stack) => stack.id)).toEqual([fallen.id])
    const straight = rebuilt.restack?.nextStacks[0]
    expect(straight?.offsets.every((offset) => offset.x === 0 && offset.z === 0)).toBe(true)
    expect(straight?.x).toBe(fallen.x)
    expect(straight?.z).toBe(fallen.z)
    const kept = rebuilt.stacks.find((stack) => stack.id === leaned.id)
    expect(kept?.offsets[kept.offsets.length - 1]).toEqual({ x: 4, z: 1 })
    expect(rebuilt.stacks.some((stack) => stack.id === fallen.id)).toBe(false)

    const discs = presentChips(rebuilt, 0, metrics)
    expect(discs.some((disc) => disc.key.startsWith(`${leaned.id}-`))).toBe(true)
    expect(discs.some((disc) => disc.key.startsWith('restack-'))).toBe(true)
    expect(tickRestack(rebuilt, CHIP_RESTACK_MS - 1).restack).not.toBeNull()

    const done = tickRestack(rebuilt, CHIP_RESTACK_MS)
    expect(done.restack).toBeNull()
    const survivor = done.stacks.find((stack) => stack.id === leaned.id)
    expect(survivor?.offsets[survivor.offsets.length - 1]).toEqual({ x: 4, z: 1 })
    const rebuiltColumn = done.stacks.find((stack) => stack.id === fallen.id)
    expect(rebuiltColumn?.offsets.every((offset) => offset.x === 0 && offset.z === 0)).toBe(true)
  })

  it('rebuilds only the column nearest an untagged loose chip', () => {
    const bets = buildBets(10_000_000_000, 50, 50)
    const world = worldFromBets(bets, 1)
    const nearest = world.stacks[0]
    const leaned = world.stacks[1]
    expect(nearest && leaned && nearest.id !== leaned.id).toBeTruthy()
    leaned.offsets[leaned.offsets.length - 1] = { x: 4, z: 1 }
    world.loose.push({
      id: 'fell',
      color: 'white',
      x: nearest.x,
      z: nearest.z,
      h: 0,
      vx: 0,
      vz: 0,
      vh: 0,
      spin: 0,
    })
    const rebuilt = settleColumns(world, bets, 0, 99)
    expect(rebuilt.restack?.nextStacks.map((stack) => stack.id)).toEqual([nearest.id])
    const kept = rebuilt.stacks.find((stack) => stack.id === leaned.id)
    expect(kept?.offsets[kept.offsets.length - 1]).toEqual({ x: 4, z: 1 })
  })

  it('keeps a flying column inside its strategy outline', () => {
    const world: ChipWorld = {
      stacks: [{
        id: 'stay',
        x: 100,
        z: 200,
        colors: ['white'],
        offsets: zeroOffsets(1),
        guide: { label: 'pass', color: '#fff' },
      }],
      loose: [],
      restack: {
        startedMs: 0,
        chips: [],
        nextStacks: [{
          id: 'fly',
          x: 400,
          z: 200,
          colors: ['red'],
          offsets: zeroOffsets(1),
          guide: { label: 'pass', color: '#fff' },
        }],
      },
    }
    const frames = guideFrames(world, metrics)
    expect(frames).toHaveLength(1)
    expect(frames[0]?.left).toBeLessThan(100)
    expect((frames[0]?.left ?? 0) + (frames[0]?.width ?? 0)).toBeGreaterThan(400)
  })

  it('topples a neighbor only while the chip is still moving', () => {
    const radius = chipRadius()
    const neighbor = stackOf(4, 500, 700)
    const moving = worldWith([neighbor])
    moving.loose.push({
      id: 'mover',
      color: 'white',
      x: neighbor.x - radius * 2 + 4,
      z: neighbor.z,
      h: 0,
      vx: 500,
      vz: 0,
      vh: 0,
      spin: 0,
    })
    resolveDiceChips(moving, [flyingDie({ alive: false }), flyingDie({ alive: false, x: 20 })], 1 / 60, metrics)
    expect(moving.stacks.every((stack) => stack.id !== neighbor.id) || moving.loose.length > 1).toBe(true)
    expect(moving.loose.length).toBeGreaterThan(1)

    const stopped = worldWith([stackOf(4, 500, 700)])
    const still = stopped.stacks[0]
    stopped.loose.push({
      id: 'still',
      color: 'white',
      x: still.x,
      z: still.z,
      h: 0,
      vx: 0,
      vz: 0,
      vh: 0,
      spin: 0,
    })
    resolveDiceChips(stopped, [flyingDie({ alive: false }), flyingDie({ alive: false, x: 20 })], 1 / 60, metrics)
    expect(stopped.stacks[0]?.colors).toHaveLength(4)
  })

  it('stops loose chips on the side rails and the back wall', () => {
    const world = emptyChipWorld()
    const radius = chipRadius()
    world.loose.push(
      { id: 'left', color: 'blue', x: -30, z: 200, h: 0, vx: -400, vz: 0, vh: 0, spin: 0 },
      { id: 'back', color: 'black', x: 400, z: metrics.wallZ + 40, h: 0, vx: 0, vz: 500, vh: 0, spin: 0 },
    )
    const next = driftLooseChips(world, 1 / 60, metrics)
    const left = next.loose.find((chip) => chip.id === 'left')
    const back = next.loose.find((chip) => chip.id === 'back')
    expect(left && left.x).toBeGreaterThanOrEqual(radius - 0.01)
    expect(left && left.vx).toBeGreaterThan(0)
    expect(back && back.z).toBeLessThanOrEqual(metrics.wallZ - radius + 0.01)
    expect(back && back.vz).toBeLessThan(0)
  })
})

describe('puck collision', () => {
  const puck = puckObstacle(null)
  const idle = () => flyingDie({ alive: false, x: 20, z: 20 })

  it('bounces a die off the OFF puck and leaves the puck spot alone', () => {
    const before = puckPlacement(null)
    const world = emptyChipWorld()
    const die = flyingDie({ x: puck.x, z: puck.z - puck.radius, h: 0, vx: 0, vz: 500, vh: 0 })
    const [next] = resolveDiceChips(world, [die, idle()], 1 / 60, metrics, puck)
    const dist = Math.hypot(next.x - puck.x, next.z - puck.z)
    expect(dist).toBeGreaterThanOrEqual(puck.radius + 1)
    expect(next.vz).toBeLessThan(0)
    expect(puckPlacement(null)).toEqual(before)
    expect(before).toMatchObject({ x: PUCK_OFF_X, y: PUCK_OFF_Y })
  })

  it('bounces a loose chip off the puck', () => {
    const world = emptyChipWorld()
    world.loose.push({
      id: 'slider',
      color: 'white',
      x: puck.x,
      z: puck.z - puck.radius,
      h: 0,
      vx: 0,
      vz: 400,
      vh: 0,
      spin: 0,
    })
    const next = driftLooseChips(world, 1 / 60, metrics, puck)
    const chip = next.loose[0]
    const dist = Math.hypot(chip.x - puck.x, chip.z - puck.z)
    expect(dist).toBeGreaterThanOrEqual(puck.radius + chipRadius() - 0.5)
    expect(chip.vz).toBeLessThan(0)
    expect(puckObstacle(null)).toEqual(puck)
  })

  it('lets a die above the puck keep its course', () => {
    const world = emptyChipWorld()
    const die = flyingDie({
      x: puck.x,
      z: puck.z - puck.radius,
      h: PUCK_COLLISION_HEIGHT_PX + 4,
      vx: 0,
      vz: 500,
      vh: 0,
    })
    const [next] = resolveDiceChips(world, [die, idle()], 1 / 60, metrics, puck)
    expect(next.z).toBeCloseTo(die.z)
    expect(next.vz).toBe(500)
  })
})

describe('chip depth scale', () => {
  it('is 1 at the rail and CHIP_DEPTH_SCALE at the back wall', () => {
    expect(chipDepthFactor(0, metrics)).toBe(1)
    expect(chipDepthFactor(metrics.wallZ, metrics)).toBe(CHIP_DEPTH_SCALE)
    expect(chipDepthFactor(metrics.wallZ / 2, metrics)).toBeCloseTo((1 + CHIP_DEPTH_SCALE) / 2)
  })

  it('stays on the nearer cap outside the felt', () => {
    expect(chipDepthFactor(-40, metrics)).toBe(1)
    expect(chipDepthFactor(metrics.wallZ + 80, metrics)).toBe(CHIP_DEPTH_SCALE)
  })

  it('scales the column gap with felt depth', () => {
    const bet = {
      id: 'wolf-pass',
      character: 'wolf' as const,
      side: 'pass' as const,
      dollars: 1,
      columns: [['white' as const], ['red' as const]],
    }
    const near = placeBets([{ ...bet, anchor: { x: 200, y: REFERENCE_HEIGHT - 40 } }], 1, chipColumnStep)
    const far = placeBets([{ ...bet, anchor: { x: 200, y: metrics.wallBottom } }], 1, chipColumnStep)
    expect(near[1].x - near[0].x).toBeCloseTo((chipDiameter() + CHIP_COLUMN_GAP_PX) * chipDepthFactor(near[0].z, metrics))
    expect(far[1].x - far[0].x).toBeCloseTo((chipDiameter() + CHIP_COLUMN_GAP_PX) * CHIP_DEPTH_SCALE)
    expect(far[1].x - far[0].x).toBeLessThan(near[1].x - near[0].x)
  })

  it('stores the felt-depth scale on standing and loose discs', () => {
    const stack = stackOf(2, 400, metrics.wallZ)
    const world = worldWith([stack])
    world.loose.push({ id: 'near', color: 'white', x: 200, z: 0, h: 0, vx: 0, vz: 0, vh: 0, spin: 0 })
    const discs = presentChips(world, 0, metrics)
    const standing = discs.filter((disc) => disc.key.startsWith(stack.id))
    const loose = discs.filter((disc) => disc.key.startsWith('near'))
    expect(standing.length).toBeGreaterThan(0)
    expect(loose.length).toBe(chipThickness())
    expect(standing.every((disc) => disc.scale === chipDepthFactor(stack.z, metrics))).toBe(true)
    expect(loose.every((disc) => disc.scale === chipDepthFactor(0, metrics))).toBe(true)
    const face = loose.find((disc) => disc.face)
    expect(face?.lift).toBe(-(chipThickness() - 1))
  })
})
