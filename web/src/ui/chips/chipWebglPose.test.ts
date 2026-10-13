import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { REFERENCE_HEIGHT } from '../../config/constants'
import { CHIP_CAMERA_BOTTOM, CHIP_CAMERA_TOP, chipDiscMatrix } from './chipWebglPose'

const centerOf = (
  disc: { x: number; y: number; zIndex: number; lift: number; scale: number; spin: number },
  radius = 30,
): Vector3 => new Vector3(0, 0, 0).applyMatrix4(chipDiscMatrix(disc, radius, new Matrix4()))

describe('chipWebglPose', () => {
  it('puts y = 0 at the top of the stage', () => {
    expect(CHIP_CAMERA_TOP).toBe(0)
    expect(CHIP_CAMERA_BOTTOM).toBe(REFERENCE_HEIGHT)
  })

  it('moves a stack straight up the screen, with the near edge toward the camera', () => {
    const m = chipDiscMatrix({ x: 100, y: 400, zIndex: 10, lift: -4, scale: 2, spin: 0 }, 30, new Matrix4())
    const center = new Vector3(0, 0, 0).applyMatrix4(m)
    expect(center.x).toBeCloseTo(100)
    expect(center.y).toBeCloseTo(392)

    const screenUp = new Vector3(0, -1, 0).applyMatrix4(m)
    const screenDown = new Vector3(0, 1, 0).applyMatrix4(m)
    expect(screenUp.z).toBeLessThan(center.z)
    expect(screenDown.z).toBeGreaterThan(center.z)
  })

  it('spins clockwise on the felt', () => {
    const m = chipDiscMatrix({ x: 0, y: 0, zIndex: 0, lift: 0, scale: 1, spin: 90 }, 30, new Matrix4())
    const rightRim = new Vector3(1, 0, 0).applyMatrix4(m)
    expect(rightRim.x).toBeCloseTo(0, 4)
    expect(rightRim.y).toBeGreaterThan(0)
  })

  it('keeps a higher slice closer to the camera', () => {
    const low = centerOf({ x: 0, y: 0, zIndex: 1, lift: 0, scale: 1, spin: 0 }, 10)
    const high = centerOf({ x: 0, y: 0, zIndex: 4, lift: 0, scale: 1, spin: 0 }, 10)
    expect(high.z).toBeGreaterThan(low.z)
  })
})
