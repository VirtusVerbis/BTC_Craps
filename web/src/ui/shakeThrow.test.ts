import { describe, expect, it } from 'vitest'
import {
  DIE_GRAVITY_PX_PER_S2,
  DIE_MAX_SPIN_RAD_PER_S,
  GESTURE_ARC_SEC,
  GESTURE_MAX_LEAN,
  GESTURE_SPEED_MIN_PX_PER_S,
  GESTURE_SPEED_NO_ROLL_PX_PER_S,
  GESTURE_SPEED_WALL_PX_PER_S,
  SHAKE_BOOK_CLEAR_MPS2,
  SHAKE_BOOK_WALL_MPS2,
  SHAKE_HAMMER_CLEAR_MPS2,
  SHAKE_HAMMER_LEAN_MPS2,
  SHAKE_HAMMER_LIFT_GAIN,
  SHAKE_HAMMER_LIFT_MAX,
  SHAKE_HAMMER_WALL_MPS2,
  SHAKE_ROLL_MAX_RAD_PER_S,
  SHAKE_THRESHOLD_X_MPS2,
  SHAKE_THRESHOLD_Y_MPS2,
  SHAKE_THRESHOLD_Z_MPS2,
} from './diceConstants'
import { leanYawRate } from './dicePhysics'
import {
  createGravityFilter,
  createShakeState,
  finishShake,
  linearFromRaw,
  motionHasNumbers,
  rawShakeTotals,
  scaleSampleToFactory,
  shakeArcUp,
  shakeDebugRead,
  shakeListenEnabled,
  shakeReleaseSpeed,
  shakeRollRate,
  stepShake,
  type LinearSample,
  type ShakeMode,
} from './shakeThrow'

const baseUp = (DIE_GRAVITY_PX_PER_S2 * GESTURE_ARC_SEC) / 2
const fullRoll = SHAKE_ROLL_MAX_RAD_PER_S

const sample = (t: number, x: number, y: number, z: number, gravity?: { gx: number; gy: number; gz: number }): LinearSample => ({
  t,
  x,
  y,
  z,
  gx: gravity?.gx ?? 0,
  gy: gravity?.gy ?? -9.8,
  gz: gravity?.gz ?? 0,
})

/** A pulse above the noise, then a return to rest, so the excursion closes. */
const burst = (
  axis: 'x' | 'z',
  sign: -1 | 1,
  mag: number,
  t: number,
  extra?: { y?: number; side?: number },
): LinearSample[] => {
  const y = extra?.y ?? 0
  const side = extra?.side ?? 0
  const at = (time: number, value: number, lift: number): LinearSample =>
    axis === 'x' ? sample(time, sign * value, lift, side) : sample(time, side, lift, sign * value)
  return [at(t, mag, y), at(t + 20, mag, y), sample(t + 40, 0, 0, 0)]
}

const finish = (samples: LinearSample[], mode: ShakeMode = 'regular') => {
  const state = createShakeState()
  for (const step of samples) stepShake(state, step)
  return finishShake(state, mode)
}

describe('shake throw', () => {
  it('treats an x bump as a hammer throw for either hand', () => {
    const right = finish([burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0, { side: SHAKE_HAMMER_LEAN_MPS2 })].flat())
    const left = finish([burst('x', -1, SHAKE_HAMMER_WALL_MPS2, 0, { side: SHAKE_HAMMER_LEAN_MPS2 })].flat())
    expect(right).toMatchObject({
      kind: 'regular',
      speed: GESTURE_SPEED_WALL_PX_PER_S,
      lean: GESTURE_MAX_LEAN,
      up: baseUp,
      roll: -fullRoll,
    })
    expect(left).toMatchObject({
      kind: 'regular',
      speed: GESTURE_SPEED_WALL_PX_PER_S,
      lean: -GESTURE_MAX_LEAN,
      up: baseUp,
      roll: fullRoll,
    })
  })

  it('adds each bump that clears the noise line and ignores a still hand', () => {
    const added = finish([
      ...burst('x', 1, SHAKE_THRESHOLD_X_MPS2, 0),
      ...burst('x', 1, SHAKE_THRESHOLD_X_MPS2, 80),
    ])
    const quiet = finish([
      ...burst('x', 1, SHAKE_THRESHOLD_X_MPS2 / 2, 0),
      ...burst('x', -1, SHAKE_THRESHOLD_X_MPS2 / 2, 80),
    ])
    expect(added).toMatchObject({
      kind: 'regular',
      speed: shakeReleaseSpeed(
        SHAKE_THRESHOLD_X_MPS2 * 2,
        SHAKE_HAMMER_WALL_MPS2,
        SHAKE_HAMMER_CLEAR_MPS2,
        SHAKE_THRESHOLD_X_MPS2,
      ),
    })
    expect(quiet).toBeNull()
  })

  it('throws a book push forward and a pull backward', () => {
    const push = finish(burst('z', -1, SHAKE_BOOK_CLEAR_MPS2, 0))
    const toward = finish(burst('z', 1, SHAKE_BOOK_CLEAR_MPS2, 0))
    expect(push).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_NO_ROLL_PX_PER_S, roll: fullRoll })
    expect(toward).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_NO_ROLL_PX_PER_S, roll: -fullRoll })
  })

  it('keeps the stronger total when both grips are in one capture', () => {
    const release = finish([...burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0), ...burst('z', -1, SHAKE_BOOK_CLEAR_MPS2, 80)])
    expect(release).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_NO_ROLL_PX_PER_S })
  })

  it('lets a hammer throw win when the face spike is the smaller one', () => {
    const release = finish([
      sample(0, SHAKE_HAMMER_WALL_MPS2, 0, SHAKE_THRESHOLD_Z_MPS2),
      sample(40, 0, 0, 0),
    ])
    expect(release).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_WALL_PX_PER_S, roll: -fullRoll })
  })

  it('lets a louder pull win as a book throw and roll backward', () => {
    const pull = SHAKE_HAMMER_WALL_MPS2 + 6
    const release = finish([
      sample(0, SHAKE_HAMMER_WALL_MPS2, 0, pull),
      sample(40, 0, 0, 0),
    ])
    expect(release).toMatchObject({
      kind: 'regular',
      speed: shakeReleaseSpeed(pull, SHAKE_BOOK_WALL_MPS2, SHAKE_BOOK_CLEAR_MPS2, SHAKE_THRESHOLD_Z_MPS2),
      roll: -fullRoll,
    })
  })

  it('sums opposing snaps for distance and rolls with the louder one', () => {
    const release = finish([...burst('x', 1, 12, 0), ...burst('x', -1, 13, 80)])
    expect(release).toMatchObject({
      kind: 'regular',
      speed: shakeReleaseSpeed(25, SHAKE_HAMMER_WALL_MPS2, SHAKE_HAMMER_CLEAR_MPS2, SHAKE_THRESHOLD_X_MPS2),
      roll: shakeRollRate(13, SHAKE_HAMMER_WALL_MPS2),
    })
  })

  it('scales a soft throw under a full roll', () => {
    const release = finish(burst('x', -1, SHAKE_THRESHOLD_X_MPS2, 0))
    expect(release).toMatchObject({
      kind: 'regular',
      roll: shakeRollRate(SHAKE_THRESHOLD_X_MPS2, SHAKE_HAMMER_WALL_MPS2),
    })
    expect(release && release.kind === 'regular' && release.roll).toBeLessThan(fullRoll)
  })

  it('previews the roll and the rightward yaw while the bump is still open', () => {
    const state = createShakeState()
    stepShake(state, sample(0, -SHAKE_HAMMER_WALL_MPS2, 0, -SHAKE_HAMMER_LEAN_MPS2))
    const read = shakeDebugRead(state, null)
    expect(read.roll).toBeCloseTo(fullRoll)
    expect(read.spin).toBeCloseTo(leanYawRate(GESTURE_MAX_LEAN))
    expect(read.spin).toBeCloseTo(DIE_MAX_SPIN_RAD_PER_S * 0.45)
  })

  it('counts a bump that is still open when the capture ends', () => {
    const release = finish([sample(0, SHAKE_HAMMER_WALL_MPS2, 0, 0)])
    expect(release).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_WALL_PX_PER_S })
  })

  it('keeps the throw when the shake is louder than gravity', () => {
    const launch = burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 40).map((step) =>
      step.x === 0 ? step : { ...step, gx: 40, gy: -9.8, gz: 0 },
    )
    const release = finish([sample(0, 0, 0, 0), ...launch])
    expect(release).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_WALL_PX_PER_S })
  })

  it('stores a shake when gravity is on a side edge', () => {
    const flat = finish(
      burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0).map((step) =>
        sample(step.t, step.x, step.y, step.z, { gx: -9.8, gy: 0, gz: 0 }),
      ),
    )
    expect(flat).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_WALL_PX_PER_S })
  })

  it('raises the arc from upward acceleration and caps it', () => {
    const raised = finish(burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0, { y: SHAKE_THRESHOLD_Y_MPS2 }))
    const capped = finish(burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0, { y: 1000 }))
    expect(raised && raised.kind === 'regular' && raised.up).toBeCloseTo(
      shakeArcUp(SHAKE_THRESHOLD_Y_MPS2, SHAKE_HAMMER_LIFT_GAIN, SHAKE_HAMMER_LIFT_MAX),
    )
    expect(capped).toMatchObject({ kind: 'regular', up: SHAKE_HAMMER_LIFT_MAX })
    expect(shakeArcUp(0, SHAKE_HAMMER_LIFT_GAIN, SHAKE_HAMMER_LIFT_MAX)).toBe(baseUp)
  })

  it('maps a mid peak between a mid-felt flick and the wall', () => {
    const mid = (SHAKE_THRESHOLD_X_MPS2 + SHAKE_HAMMER_WALL_MPS2) / 2
    const speed = shakeReleaseSpeed(mid, SHAKE_HAMMER_WALL_MPS2, SHAKE_HAMMER_CLEAR_MPS2, SHAKE_THRESHOLD_X_MPS2)
    expect(speed).toBeGreaterThan(GESTURE_SPEED_MIN_PX_PER_S)
    expect(speed).toBeLessThan(GESTURE_SPEED_WALL_PX_PER_S)
  })

  it('sends precision the flick speed and lean without a lift', () => {
    const release = finish(burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0, { y: 8, side: SHAKE_HAMMER_LEAN_MPS2 }), 'precision')
    expect(release).toEqual({ kind: 'precision', speed: GESTURE_SPEED_WALL_PX_PER_S, lean: GESTURE_MAX_LEAN })
  })

  it('treats a gravity reading as rest until the phone actually accelerates', () => {
    const filter = createGravityFilter()
    const rest = { t: 0, ax: null, ay: null, az: null, gx: 0, gy: -9.8, gz: 0 }
    expect(linearFromRaw(filter, rest)?.y).toBe(0)
    const still = linearFromRaw(filter, { ...rest, t: 20 })
    expect(still?.x).toBeCloseTo(0)
    expect(still?.y).toBeCloseTo(0)
    const spiked = linearFromRaw(filter, { ...rest, t: 40, gx: 9.7 })
    expect(spiked && Math.abs(spiked.x)).toBeGreaterThan(1)
  })

  it('maps a hotter phone back onto the same wall, clear, and lean throw', () => {
    const gain = { x: 20, y: 20, z: 20 }
    const tune = (steps: LinearSample[]) => steps.map((step) => scaleSampleToFactory(step, gain))
    const wall = finish(tune(burst('x', 1, SHAKE_HAMMER_WALL_MPS2 * 2, 0, { side: SHAKE_HAMMER_LEAN_MPS2 * 2, y: 16 })))
    const clear = finish(tune(burst('x', 1, SHAKE_HAMMER_CLEAR_MPS2 * 2, 0)))
    const factory = finish(burst('x', 1, SHAKE_HAMMER_WALL_MPS2, 0, { side: SHAKE_HAMMER_LEAN_MPS2, y: 8 }))
    expect(wall).toEqual(factory)
    expect(clear).toMatchObject({ kind: 'regular', speed: GESTURE_SPEED_NO_ROLL_PX_PER_S })
    const scaled = scaleSampleToFactory(sample(0, 20, 5, -30), { x: 20, y: 10, z: 15 })
    expect(scaled.x).toBeCloseTo(10)
    expect(scaled.y).toBeCloseTo(5)
    expect(scaled.z).toBeCloseTo(-20)
    expect(rawShakeTotals({ xTotal: 14, pushTotal: 12, yTotal: 10 }, gain)).toEqual({
      xTotal: 28,
      pushTotal: 24,
      yTotal: 20,
    })
  })

  it('listens only while a shot can leave the hand', () => {
    expect(shakeListenEnabled(true, true, true, false, 'target')).toBe(true)
    expect(shakeListenEnabled(true, true, false, false, 'gesture')).toBe(false)
    expect(shakeListenEnabled(false, true, true, false, 'gesture')).toBe(false)
    expect(shakeListenEnabled(true, false, true, false, 'gesture')).toBe(false)
    expect(shakeListenEnabled(true, true, true, true, 'spin')).toBe(false)
    expect(shakeListenEnabled(true, true, true, true, 'gesture')).toBe(true)
  })

  it('accepts whichever acceleration vector actually has numbers', () => {
    const event = {
      acceleration: { x: 0, y: -9.8, z: 0 },
      accelerationIncludingGravity: { x: null, y: null, z: null },
    } as DeviceMotionEvent
    expect(motionHasNumbers(event)).toBe(true)
    expect(
      motionHasNumbers({
        acceleration: null,
        accelerationIncludingGravity: { x: null, y: null, z: null },
      } as DeviceMotionEvent),
    ).toBe(false)
  })
})
