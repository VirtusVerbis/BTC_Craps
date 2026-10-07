import { describe, expect, it } from 'vitest'
import { createHoldingDice, stageMetrics, type Die } from './dicePhysics'
import {
  chipRadius,
  chipThickness,
  chipsAHitCanLift,
  driftLooseChips,
  emptyChipWorld,
  presentChips,
  resolveDiceChips,
  settleColumns,
  worldFromBets,
  zeroOffsets,
  type ChipWorld,
  type StandingStack,
} from './chipPhysics'
import { CHIP_WEIGHT } from './chipConstants'
import { buildBets } from './chipBets'

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
