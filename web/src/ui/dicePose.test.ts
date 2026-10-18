import { describe, expect, it } from 'vitest'
import { DIE_LAUNCH_SIZE_PX } from './diceConstants'
import { diceLaunchPoint, dieOuterTransform } from './dicePose'

describe('dieOuterTransform', () => {
  it('keeps the cube center on the physics point', () => {
    expect(dieOuterTransform(100, 240, DIE_LAUNCH_SIZE_PX)).toBe(
      'translate3d(100px, 240px, 0px) translate(-50%, -50%) scale(1)',
    )
  })

  it('scales around that same center when the die changes size', () => {
    expect(dieOuterTransform(100, 240, DIE_LAUNCH_SIZE_PX / 2)).toBe(
      'translate3d(100px, 240px, 0px) translate(-50%, -50%) scale(0.5)',
    )
    expect(dieOuterTransform(100, 240, DIE_LAUNCH_SIZE_PX, 12)).toBe(
      'translate3d(100px, 240px, 12px) translate(-50%, -50%) scale(1)',
    )
  })
})

describe('diceLaunchPoint', () => {
  it('averages the two visible dice', () => {
    expect(
      diceLaunchPoint([
        { visible: true, x: 40, y: 80 },
        { visible: true, x: 60, y: 100 },
      ]),
    ).toEqual({ x: 50, y: 90 })
  })
})
