import { Matrix4 } from 'three'
import { REFERENCE_HEIGHT, REFERENCE_WIDTH } from '../../config/constants'
import { CHIP_FELT_TILT_DEG } from '../chipConstants'
import type { ChipDisc } from '../chipPhysics'

/**
 * Ortho frustum in stage pixels. Top is 0 and bottom is the rail, so world Y
 * grows downward the same way CSS `top` does.
 */
export const CHIP_CAMERA_LEFT = 0
export const CHIP_CAMERA_RIGHT = REFERENCE_WIDTH
export const CHIP_CAMERA_TOP = 0
export const CHIP_CAMERA_BOTTOM = REFERENCE_HEIGHT

/** Higher `zIndex` is placed closer to the camera. */
export const CHIP_INSTANCE_Z_STEP = 0.05

const tempLift = new Matrix4()
const tempRotX = new Matrix4()
const tempRotZ = new Matrix4()
const tempScale = new Matrix4()

/**
 * Flat disc in stage pixels.
 * CSS applies `rotateZ`, then `rotateX`, then `translateY(lift)`, then the center.
 * The lift stays vertical on the screen so a stack grows up the felt.
 */
export const chipDiscMatrix = (
  disc: Pick<ChipDisc, 'x' | 'y' | 'zIndex' | 'lift' | 'scale' | 'spin'>,
  radius: number,
  target: Matrix4,
): Matrix4 => {
  const tiltRad = (CHIP_FELT_TILT_DEG * Math.PI) / 180
  target.makeTranslation(disc.x, disc.y, disc.zIndex * CHIP_INSTANCE_Z_STEP)
  tempLift.makeTranslation(0, disc.lift * disc.scale, 0)
  tempRotX.makeRotationX(tiltRad)
  tempRotZ.makeRotationZ((disc.spin * Math.PI) / 180)
  tempScale.makeScale(radius, radius, 1)
  target.multiply(tempLift)
  target.multiply(tempRotX)
  target.multiply(tempRotZ)
  target.multiply(tempScale)
  return target
}
