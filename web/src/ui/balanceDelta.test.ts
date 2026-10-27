import { describe, expect, it } from 'vitest'
import {
  balanceDeltaPose,
  balanceDeltaVisible,
  formatBalanceDelta,
  shooterDeltaFadeRate,
  spawnBalanceDeltas,
  spawnShooterBalanceDelta,
  tickBalanceDeltas,
} from './balanceDelta'
import type { CharacterRollDelta } from './characterPnl'
import {
  PL_DELTA_ANCHOR,
  PL_DELTA_FADE_RATE,
  PL_DELTA_RISE_PX_PER_S,
  PL_LOSS_COLOR,
  PL_PROFIT_COLOR,
  SHOOTER_DELTA_CAP_Y,
  SHOOTER_DELTA_X,
  SHOOTER_DELTA_Y,
} from './characterPnlConstants'

const roll = (character: CharacterRollDelta['character'], btc: number, usd: number): CharacterRollDelta => ({
  character,
  btc,
  usd,
  price: btc === 0 ? 0 : usd / btc,
})

describe('balance delta copy', () => {
  it('puts a sign in front and a slash between the amounts', () => {
    expect(formatBalanceDelta(57, 5_000_000)).toBe('+ 57 BTC\n$5M USD')
    expect(formatBalanceDelta(-37, -3_000_000)).toBe('- 37 BTC\n$3M USD')
  })

  it('hides a flat amount, dust, and anything under the minimum', () => {
    expect(balanceDeltaVisible(0)).toBe(false)
    expect(balanceDeltaVisible(0.001)).toBe(false)
    expect(balanceDeltaVisible(57)).toBe(true)
    expect(balanceDeltaVisible(-37)).toBe(true)
    expect(balanceDeltaVisible(1, 2)).toBe(false)
    expect(balanceDeltaVisible(3, 2)).toBe(true)
  })
})

describe('balance delta motion', () => {
  const startY = PL_DELTA_ANCHOR.wolf.y
  const capY = PL_DELTA_ANCHOR.wolf.capY

  it('rises from the start and fades out at the top of the stage', () => {
    const born = spawnBalanceDeltas([], [roll('wolf', 57, 5_000_000)], 0, 1)
    const risen = tickBalanceDeltas(born.deltas, 1000)
    expect(risen.frames[0].y).toBeCloseTo(startY - PL_DELTA_RISE_PX_PER_S)
    expect(risen.frames[0].opacity).toBeCloseTo(risen.frames[0].y / startY)
    expect(risen.frames[0].color).toBe(PL_PROFIT_COLOR)
    expect(risen.frames[0].shooter).toBe(false)

    const atTop = balanceDeltaPose(startY, -1, startY / PL_DELTA_RISE_PX_PER_S)
    expect(atTop.y).toBeCloseTo(0)
    expect(atTop.opacity).toBeCloseTo(0)
    expect(atTop.alive).toBe(false)
  })

  it('disappears when the text reaches the head cap', () => {
    const ageToCap = (startY - capY) / PL_DELTA_RISE_PX_PER_S
    const atCap = balanceDeltaPose(startY, capY, ageToCap)
    expect(atCap.y).toBeCloseTo(capY)
    expect(atCap.alive).toBe(false)

    const born = spawnBalanceDeltas([], [roll('wolf', -37, -3_000_000)], 0, 1)
    const gone = tickBalanceDeltas(born.deltas, ageToCap * 1000)
    expect(gone.frames).toEqual([])
    expect(gone.deltas).toEqual([])
  })

  it('keeps an older floater rising when a new one spawns', () => {
    const first = spawnBalanceDeltas([], [roll('cat', 57, 5_000_000)], 0, 1)
    const both = spawnBalanceDeltas(first.deltas, [roll('cat', -10, -700_000)], 1000, first.nextId)
    const frame = tickBalanceDeltas(both.deltas, 1000)
    expect(frame.frames).toHaveLength(2)
    expect(frame.frames[0].id).toBe(first.deltas[0].id)
    expect(frame.frames[0].y).toBeLessThan(frame.frames[1].y)
    expect(frame.frames[1].y).toBeCloseTo(PL_DELTA_ANCHOR.cat.y)
    expect(frame.frames[0].color).toBe(PL_PROFIT_COLOR)
    expect(frame.frames[1].color).toBe(PL_LOSS_COLOR)
    expect(frame.frames[1].text).toBe('- 10 BTC\n$700K USD')
  })

  it('fades out sooner when the fade rate is higher', () => {
    const halfway = (startY / PL_DELTA_RISE_PX_PER_S) / 2
    const doubled = balanceDeltaPose(startY, -1, halfway, PL_DELTA_RISE_PX_PER_S, PL_DELTA_FADE_RATE * 2)
    expect(doubled.y).toBeCloseTo(startY / 2)
    expect(doubled.opacity).toBeCloseTo(0)
    expect(doubled.alive).toBe(false)
  })

  it('skips a delta that would format as zero', () => {
    const spawned = spawnBalanceDeltas([], [roll('oldMan', 0.001, 70)], 0, 4)
    expect(spawned.deltas).toEqual([])
    expect(spawned.nextId).toBe(4)
  })

  it('starts the shooter floater on the rail and fades it out at the come box', () => {
    const born = spawnShooterBalanceDelta([], 2, 100_000, 0, 7)
    expect(born.nextId).toBe(8)
    const frame = tickBalanceDeltas(born.deltas, 0)
    expect(frame.frames[0].shooter).toBe(true)
    expect(frame.frames[0].x).toBe(SHOOTER_DELTA_X)
    expect(frame.frames[0].y).toBeCloseTo(SHOOTER_DELTA_Y)
    expect(frame.frames[0].opacity).toBeCloseTo(1)

    const ageToCap = (SHOOTER_DELTA_Y - SHOOTER_DELTA_CAP_Y) / PL_DELTA_RISE_PX_PER_S
    const atCap = balanceDeltaPose(
      SHOOTER_DELTA_Y,
      SHOOTER_DELTA_CAP_Y,
      ageToCap,
      PL_DELTA_RISE_PX_PER_S,
      shooterDeltaFadeRate(),
    )
    expect(atCap.y).toBeCloseTo(SHOOTER_DELTA_CAP_Y)
    expect(atCap.opacity).toBeCloseTo(0)
    expect(atCap.alive).toBe(false)
    expect(tickBalanceDeltas(born.deltas, ageToCap * 1000).frames).toEqual([])

    const skipped = spawnShooterBalanceDelta(born.deltas, 0, 0, 1000, born.nextId)
    expect(skipped.deltas).toHaveLength(1)
    expect(skipped.nextId).toBe(born.nextId)
  })
})
