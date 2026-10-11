import { describe, expect, it } from 'vitest'
import { REFERENCE_WIDTH } from '../config/constants'
import { DIE_LAUNCH_SIZE_PX, GESTURE_MIN_DISTANCE_PX, GESTURE_RELEASE_WINDOW_MS } from './diceConstants'
import { clampLaunchX, formatShotClock, gestureFromStroke, type StrokePoint } from './gestureThrow'

const stroke = (points: StrokePoint[]) => gestureFromStroke(points)

describe('gesture stroke', () => {
  it('ignores a short upward stroke and a downward stroke', () => {
    expect(stroke([
      { x: 400, y: 900, t: 0 },
      { x: 400, y: 900 - GESTURE_MIN_DISTANCE_PX + 8, t: 40 },
    ])).toBeNull()
    expect(stroke([
      { x: 400, y: 400, t: 0 },
      { x: 420, y: 700, t: 80 },
    ])).toBeNull()
  })

  it('uses pointer-down x as the pair center and later sideways travel as lean only', () => {
    const launched = stroke([
      { x: 220, y: 1000, t: 0 },
      { x: 260, y: 700, t: 40 },
      { x: 140, y: 1000 - GESTURE_MIN_DISTANCE_PX - 40, t: GESTURE_RELEASE_WINDOW_MS },
    ])
    expect(launched).not.toBeNull()
    expect(launched?.launchX).toBe(220)
    expect(launched?.lean).toBeLessThan(0)
    expect(launched?.speed).toBeGreaterThan(0)
  })

  it('clamps a pointer off the table to the nearer rail end', () => {
    expect(clampLaunchX(-40)).toBe(DIE_LAUNCH_SIZE_PX)
    expect(clampLaunchX(REFERENCE_WIDTH + 80)).toBe(REFERENCE_WIDTH - DIE_LAUNCH_SIZE_PX)
    const offLeft = stroke([
      { x: -20, y: 800, t: 0 },
      { x: -10, y: 800 - GESTURE_MIN_DISTANCE_PX - 10, t: 50 },
    ])
    expect(offLeft?.launchX).toBe(DIE_LAUNCH_SIZE_PX)
  })

  it('measures release speed on the tail of a long drag', () => {
    const launched = stroke([
      { x: 500, y: 1200, t: 0 },
      { x: 500, y: 900, t: 400 },
      { x: 530, y: 900 - GESTURE_MIN_DISTANCE_PX, t: 400 + GESTURE_RELEASE_WINDOW_MS },
    ])
    expect(launched?.speed).toBeCloseTo(GESTURE_MIN_DISTANCE_PX / (GESTURE_RELEASE_WINDOW_MS / 1000))
  })
})

describe('shot clock label', () => {
  it('opens on a full minute and counts down', () => {
    expect(formatShotClock(60_000)).toBe('01:00')
    expect(formatShotClock(59_001)).toBe('01:00')
    expect(formatShotClock(59_000)).toBe('00:59')
    expect(formatShotClock(0)).toBe('00:00')
  })
})
