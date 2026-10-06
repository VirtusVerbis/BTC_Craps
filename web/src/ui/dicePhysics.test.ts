import { describe, expect, it } from 'vitest'
import {
  DIE_DEPTH_SCALE,
  DIE_LAUNCH_DELAY_MS,
  DIE_LAUNCH_SIZE_PX,
  DIE_RESULT_HOLD_MS,
} from './diceConstants'
import {
  advanceThrow,
  createHoldingDice,
  createThrowState,
  dieScreenCenter,
  dieSize,
  launchSpeeds,
  readTopFace,
  stageMetrics,
  stepDice,
  type Die,
  type Quat,
  type ThrowState,
} from './dicePhysics'

const metrics = stageMetrics()

const flyingDie = (patch: Partial<Die>): Die => {
  const [base] = createHoldingDice(540)
  return {
    ...base,
    resting: false,
    topFace: null,
    ...patch,
    q: patch.q ?? base.q,
    w: patch.w ?? { x: 0, y: 0, z: 0 },
  }
}

describe('die size', () => {
  it('is the launch size at the bottom and the depth scale at the wall', () => {
    expect(dieSize(0, metrics)).toBe(DIE_LAUNCH_SIZE_PX)
    expect(dieSize(metrics.wallZ, metrics)).toBeCloseTo(DIE_LAUNCH_SIZE_PX * DIE_DEPTH_SCALE)
    const mid = dieSize(metrics.wallZ / 2, metrics)
    expect(mid).toBeGreaterThan(DIE_LAUNCH_SIZE_PX * DIE_DEPTH_SCALE)
    expect(mid).toBeLessThan(DIE_LAUNCH_SIZE_PX)
  })

  it('sits fully above the bottom edge while holding', () => {
    const [left] = createHoldingDice(540)
    const screen = dieScreenCenter(left, metrics)
    expect(screen.y + screen.size / 2).toBeCloseTo(metrics.height)
    expect(screen.y - screen.size / 2).toBeGreaterThan(metrics.wallBottom)
  })
})

describe('faces', () => {
  it('reads 1 on top for the identity pose and 6 after a half turn', () => {
    expect(readTopFace({ x: 0, y: 0, z: 0, w: 1 })).toBe(1)
    const turned: Quat = { x: 1, y: 0, z: 0, w: 0 }
    expect(readTopFace(turned)).toBe(6)
    expect(readTopFace({ x: 0, y: 0, z: 0, w: 1 }) + readTopFace(turned)).toBe(7)
  })

  it('snaps a tilted die onto a flat face', () => {
    const tilted = flyingDie({
      h: 0,
      vh: -10,
      vx: 0,
      vz: 0,
      q: { x: 0.05, y: 0.02, z: 0, w: 0.998 },
    })
    const [settled] = stepDice([tilted, flyingDie({ alive: false })], 1 / 30, metrics)
    expect(settled.resting).toBe(true)
    expect(settled.topFace).toBe(1)
    expect(settled.vx).toBe(0)
    expect(settled.vh).toBe(0)
  })
})

describe('bounces', () => {
  it('keeps forward speed on a felt hit and sends the die back up', () => {
    const die = flyingDie({ h: 0.2, vh: -400, vz: 500, vx: 80 })
    const [next] = stepDice([die, flyingDie({ alive: false })], 1 / 60, metrics)
    expect(next.alive).toBe(true)
    expect(next.h).toBeGreaterThanOrEqual(0)
    expect(next.vh).toBeGreaterThan(0)
    expect(next.vz).toBeGreaterThan(0)
    expect(next.vz).toBeLessThan(500)
  })

  it('bounces off the side and the bottom edge', () => {
    const side = flyingDie({ x: 2, vx: -600, h: 40, vh: 0 })
    const [sided] = stepDice([side, flyingDie({ alive: false })], 1 / 60, metrics)
    expect(sided.x).toBeGreaterThanOrEqual(dieSize(sided.z, metrics) / 2 - 1)
    expect(sided.vx).toBeGreaterThan(0)

    const bottom = flyingDie({ z: -5, vz: -500, h: 30, vh: 200 })
    const [backed] = stepDice([bottom, flyingDie({ alive: false })], 1 / 60, metrics)
    expect(backed.z).toBeGreaterThanOrEqual(0)
    expect(backed.vz).toBeGreaterThan(0)
  })

  it('bounces off the back wall when the die is below the top of the wall', () => {
    const radius = dieSize(metrics.wallZ, metrics) / 2
    const die = flyingDie({ z: metrics.wallZ - radius - 1, vz: 700, h: 20, vh: 0 })
    const [next] = stepDice([die, flyingDie({ alive: false })], 1 / 60, metrics)
    expect(next.alive).toBe(true)
    expect(next.vz).toBeLessThan(0)
  })

  it('removes a die that clears the back wall', () => {
    const die = flyingDie({ z: metrics.wallZ + 4, vz: 400, h: metrics.wallHeight + 30, vh: 50 })
    const [next] = stepDice([die, flyingDie({ alive: false })], 1 / 60, metrics)
    expect(next.alive).toBe(false)
  })

  it('separates two dice that overlap', () => {
    const left = flyingDie({ x: 500, vx: 200, h: 10, vh: 0, z: 200 })
    const right = flyingDie({ x: 530, vx: -200, h: 10, vh: 0, z: 200 })
    const [a, b] = stepDice([left, right], 1 / 60, metrics)
    expect(b.x - a.x).toBeGreaterThan(60)
    expect(a.vx).toBeLessThan(0)
    expect(b.vx).toBeGreaterThan(0)
  })
})

const travel = (binanceBuy: number, coinbaseBuy: number) => {
  const volume = { binanceBuy, coinbaseBuy, binanceSell: 0, coinbaseSell: 0 }
  let state: ThrowState = advanceThrow(createThrowState(0, 540), 0.016, 4000, volume)
  let maxZ = 0
  let cleared = false
  let hitWall = false
  for (let i = 0; i < 900 && state.phase === 'flying'; i += 1) {
    state = advanceThrow(state, 1 / 60, 5000 + i * 20, volume)
    maxZ = Math.max(maxZ, state.dice[0].z, state.dice[1].z)
    if (!state.dice[0].alive || !state.dice[1].alive) cleared = true
    if (state.dice[0].vz < 0 && state.dice[0].z > metrics.wallZ * 0.75) hitWall = true
  }
  return { maxZ, cleared, hitWall, forward: launchSpeeds(volume, metrics).forward, up: launchSpeeds(volume, metrics).up }
}

describe('distance scalar', () => {
  it('sends a full buy sample to the back wall', () => {
    const flight = travel(6, 1.5)
    expect(flight.maxZ).toBeGreaterThan(metrics.wallZ * 0.85)
  })

  it('sends an ordinary buy sample past halfway', () => {
    const flight = travel(1, 0.3)
    expect(flight.maxZ).toBeGreaterThan(metrics.wallZ * 0.5)
  })
})

describe('throw cycle', () => {
  it('waits out the pause and a quiet buy window', () => {
    const state = createThrowState(0, 540)
    const early = advanceThrow(state, 0.016, DIE_LAUNCH_DELAY_MS - 1, {
      binanceBuy: 2,
      coinbaseBuy: 1,
      binanceSell: 0,
      coinbaseSell: 0,
    })
    expect(early.phase).toBe('holding')

    const quiet = advanceThrow(state, 0.016, DIE_LAUNCH_DELAY_MS + 10, {
      binanceBuy: 0,
      coinbaseBuy: 0,
      binanceSell: 1,
      coinbaseSell: 1,
    })
    expect(quiet.phase).toBe('holding')
  })

  it('launches both dice from the same speed once both buys are live', () => {
    const state = createThrowState(0, 540)
    const launched = advanceThrow(state, 0.016, DIE_LAUNCH_DELAY_MS + 10, {
      binanceBuy: 2,
      coinbaseBuy: 0.4,
      binanceSell: 1,
      coinbaseSell: 0.2,
    })
    expect(launched.phase).toBe('flying')
    expect(launched.dice[0].vz).toBeCloseTo(launched.dice[1].vz)
    expect(launched.dice[0].vh).toBeCloseTo(launched.dice[1].vh)
    expect(launched.dice[0].vh).toBeGreaterThan(0)
    expect(launched.dice[0].vz).toBeGreaterThan(0)
    expect(launched.dice[0].w.x).toBeGreaterThan(0)
    expect(launched.dice[1].w.x).toBeLessThan(0)
    expect(launched.dice[1].x - launched.dice[0].x).toBeCloseTo(DIE_LAUNCH_SIZE_PX)
  })

  it('calls No Roll when a die leaves and the other has rested', () => {
    const state = createThrowState(0, 540)
    const left = flyingDie({ alive: false, resting: false })
    const right = flyingDie({ resting: true, topFace: 5, alive: true })
    const next = advanceThrow(
      { ...state, phase: 'flying', dice: [left, right] },
      0.016,
      1000,
      { binanceBuy: 1, coinbaseBuy: 1, binanceSell: 0, coinbaseSell: 0 },
    )
    expect(next.phase).toBe('result')
    expect(next.result).toBe('No Roll!')
  })

  it('shows the face total, then resets after the result hold', () => {
    const state = createThrowState(0, 540)
    const left = flyingDie({ resting: true, topFace: 6, alive: true })
    const right = flyingDie({ resting: true, topFace: 1, alive: true, x: 620 })
    const result = advanceThrow(
      { ...state, phase: 'flying', dice: [left, right] },
      0.016,
      1000,
      { binanceBuy: 1, coinbaseBuy: 1, binanceSell: 0, coinbaseSell: 0 },
    )
    expect(result.result).toBe('7')
    const still = advanceThrow(result, 0.016, 1000 + DIE_RESULT_HOLD_MS - 1, {
      binanceBuy: 1,
      coinbaseBuy: 1,
      binanceSell: 0,
      coinbaseSell: 0,
    })
    expect(still.phase).toBe('result')
    const reset = advanceThrow(result, 0.016, 1000 + DIE_RESULT_HOLD_MS, {
      binanceBuy: 1,
      coinbaseBuy: 1,
      binanceSell: 0,
      coinbaseSell: 0,
    })
    expect(reset.phase).toBe('holding')
    expect(reset.result).toBeNull()
    expect(reset.dice[0].z).toBe(0)
    expect(reset.dice[1].z).toBe(0)
  })
})
