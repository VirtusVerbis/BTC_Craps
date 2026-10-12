import { describe, expect, it } from 'vitest'
import { DIE_GRAVITY_PX_PER_S2, GESTURE_SPEED_MIN_PX_PER_S, GESTURE_SPEED_NO_ROLL_PX_PER_S, GESTURE_SPEED_WALL_PX_PER_S } from './diceConstants'
import {
  aimDepth,
  aimMetrics,
  angleFromDrag,
  defaultPrecisionTarget,
  flickScale,
  precisionArc,
  precisionVelocity,
  spinFromSwipe,
  spinFromTravel,
} from './precisionAim'

describe('precision aim', () => {
  const metrics = aimMetrics()
  const target = defaultPrecisionTarget(metrics)

  it('starts on the center of the back wall', () => {
    expect(target.x).toBe(metrics.width / 2)
    expect(target.y).toBeGreaterThan(metrics.wallTop)
    expect(target.y).toBeLessThan(metrics.wallBottom)
    expect(aimDepth(target.y, metrics)).toBe(metrics.wallZ)
  })

  it('lands a wall-speed toss on the back wall and scales distance with flick speed', () => {
    const flight = (vh: number) => (2 * vh) / DIE_GRAVITY_PX_PER_S2
    const landing = (speed: number) => {
      const velocity = precisionVelocity(metrics.width / 2, target, 37, speed, metrics)
      return velocity.vz * flight(velocity.vh)
    }
    const wall = precisionVelocity(metrics.width / 2, target, 37, GESTURE_SPEED_WALL_PX_PER_S, metrics)
    const wallLanding = landing(GESTURE_SPEED_WALL_PX_PER_S)
    const slowLanding = landing(GESTURE_SPEED_MIN_PX_PER_S)
    const hardLanding = landing(GESTURE_SPEED_NO_ROLL_PX_PER_S)
    expect(Math.abs(wall.vx)).toBeLessThan(1)
    expect(wallLanding).toBeGreaterThan(metrics.wallZ * 0.85)
    expect(wallLanding).toBeLessThan(metrics.wallZ * 1.15)
    expect(slowLanding).toBeGreaterThan(metrics.wallZ * 0.45)
    expect(slowLanding).toBeLessThan(metrics.wallZ * 0.55)
    expect(hardLanding).toBeGreaterThan(metrics.wallZ * 1.35)
    expect(hardLanding).toBeLessThan(metrics.wallZ * 1.55)
    expect(flickScale(GESTURE_SPEED_MIN_PX_PER_S)).toBeLessThan(flickScale(GESTURE_SPEED_WALL_PX_PER_S))
  })

  it('sends a vertical toss up and short of a far reticle', () => {
    const lob = precisionVelocity(metrics.width / 2, target, 90, GESTURE_SPEED_WALL_PX_PER_S, metrics)
    const flight = (2 * lob.vh) / DIE_GRAVITY_PX_PER_S2
    expect(lob.vh).toBeGreaterThan(0)
    expect(lob.vz * flight).toBeLessThan(metrics.wallZ * 0.25)
  })

  it('draws an arc that leaves the rail and ends on the reticle', () => {
    const launch = { x: metrics.width / 2, y: metrics.height - 40 }
    const arc = precisionArc(launch, target, 37, metrics)
    expect(arc.start).toEqual(launch)
    expect(arc.end).toEqual(target)
    expect(arc.control.y).toBeLessThan(launch.y)
  })

  it('raises the loft when the finger moves up and stays inside 0 to 90', () => {
    expect(angleFromDrag(37, -80)).toBe(47)
    expect(angleFromDrag(4, 80)).toBe(0)
    expect(angleFromDrag(86, -80)).toBe(90)
  })

  it('maps an upward swipe to forward spin and a short swipe to no change', () => {
    const up = spinFromSwipe([
      { x: 0, y: 400, t: 0 },
      { x: 0, y: 200, t: 80 },
    ])
    const down = spinFromSwipe([
      { x: 0, y: 200, t: 0 },
      { x: 0, y: 400, t: 80 },
    ])
    const tap = spinFromSwipe([
      { x: 0, y: 200, t: 0 },
      { x: 0, y: 190, t: 40 },
    ])
    expect(up).not.toBeNull()
    expect(up ?? 0).toBeGreaterThan(0)
    expect(down ?? 0).toBeLessThan(0)
    expect(tap).toBeNull()
    expect(spinFromTravel(-200, 80)).toBeGreaterThan(0)
    expect(spinFromTravel(200, 80)).toBeLessThan(0)
  })
})
